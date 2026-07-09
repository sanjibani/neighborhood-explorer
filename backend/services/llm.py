"""
MiniMax LLM client.

API base URL: https://api.minimax.io/v1  (NOT api.minimax.chat - that's the Chinese service).
OpenAI-compatible SDK. Default model: MiniMax-Text-01.

Coding-plan keys are scoped to development use; respect rate limits.
"""
import os
from functools import lru_cache

import structlog
from openai import OpenAI

log = structlog.get_logger(__name__)


@lru_cache(maxsize=1)
def _get_client() -> OpenAI:
    api_key = os.getenv("LLM_API_KEY")
    if not api_key:
        raise RuntimeError(
            "LLM_API_KEY not set. Add it to .env (local) or Render env vars (prod)."
        )
    base_url = os.getenv("LLM_BASE_URL", "https://api.minimax.io/v1")
    return OpenAI(api_key=api_key, base_url=base_url)


def complete(
    prompt: str,
    *,
    model: str | None = None,
    max_tokens: int = 1024,
    temperature: float = 0.7,
) -> str:
    """Single-turn completion. Returns the model's text reply."""
    client = _get_client()
    model = model or os.getenv("LLM_MODEL", "MiniMax-Text-01")

    log.info("llm.call.start", model=model, prompt_chars=len(prompt))

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=max_tokens,
        temperature=temperature,
    )

    text = response.choices[0].message.content or ""
    log.info("llm.call.end", model=model, completion_chars=len(text))
    return text


# ──────────────────────────────────────────────────────────────────────
# Higher-level: vibe generation + ranking explanations
# ──────────────────────────────────────────────────────────────────────
# These are the SDD move: we pass the LLM the actual data via the prompt,
# then forbid it from inventing anything beyond what's passed in. This is
# the anti-hallucination pattern documented in docs/api.md.
#
# Cost model (rough, for budget alerts):
#   - vibe generation: ~1.0K tokens (prompt + completion)
#   - ranking explanation: ~1.2K tokens
#   - 10 neighborhoods × weekly regen = ~10K tokens / 7 days
#   - per /api/compare call: 3 explanations = ~3.6K tokens
#   - budget: well under MAX_LLM_CALLS_PER_DAY=100 at expected traffic

# Default output token budgets
_VIBE_SHORT_MAX_TOKENS = 80      # ~15 words
_VIBE_FULL_MAX_TOKENS = 700      # ~3 paragraphs
_EXPLANATION_MAX_TOKENS = 250    # ~1-2 sentences


def _build_vibe_short_prompt(neighborhood) -> str:
    """Build the prompt for the short (~15 word) tagline.

    The prompt has 3 sections:
      1. ROLE / task description
      2. DATA passed in (ground truth: what the model can use)
      3. CONSTRAINTS (anti-hallucination rules)
    """
    return (
        f"Generate a ~15-word tagline for {neighborhood.name}, {neighborhood.city}, "
        f"optimized for a 35-year-old parent comparing family-friendly neighborhoods.\n\n"
        f"SCORES (cite truthfully, do not invent facts):\n"
        f"- Parks: {neighborhood.parks_score}/10\n"
        f"- Schools: {neighborhood.schools_score}/10\n"
        f"- Safety: {neighborhood.safety_score}/10\n\n"
        f"Constraints:\n"
        f"- Maximum 15 words\n"
        f"- Tone: trustworthy, calm\n"
        f"- DO NOT invent specific facts (no park names, no school names, no crime stats)\n"
        f"- A strength or balanced summary is fine\n"
        f"- Return only the tagline, no preamble\n"
    )


def _build_vibe_full_prompt(neighborhood) -> str:
    """Build the prompt for the full 3-paragraph description."""
    parks_csv = ", ".join(
        f"{p.name} ({p.distance_m}m)" for p in neighborhood.parks_data
    ) or "no specific parks in seed data"
    schools_csv = ", ".join(
        f"{s.name} ({s.distance_m}m, rated {s.rating}/10)"
        for s in neighborhood.schools_data
    ) or "no specific schools in seed data"
    sd = neighborhood.safety_data
    return (
        f"Write a 3-paragraph description of {neighborhood.name}, {neighborhood.city}, "
        f"optimized for a 35-year-old parent evaluating it for their family.\n\n"
        f"DATA (cite only what's here, do not invent beyond):\n"
        f"- Neighborhood: {neighborhood.name}, {neighborhood.city}, {neighborhood.state}\n"
        f"- Coordinates: ({neighborhood.lat}, {neighborhood.lng})\n"
        f"- Parks ({neighborhood.parks_score}/10): {parks_csv}\n"
        f"- Schools ({neighborhood.schools_score}/10): {schools_csv}\n"
        f"- Safety ({neighborhood.safety_score}/10): "
        f"violent {sd.violent_per_100k}/100k, property {sd.property_per_100k}/100k, "
        f"{sd.traffic_incidents_per_year} traffic incidents/year ({sd.year})\n\n"
        f"Constraints:\n"
        f"- Exactly 3 paragraphs (separate with blank lines)\n"
        f"- All claims grounded in the data above\n"
        f"- Persona: 35-year-old parent comparing family-friendly areas\n"
        f"- Tone: informative, slightly warm, no marketing fluff\n"
        f"- DO NOT invent specific facts not in the data\n"
        f"- Return only the description, no preamble\n"
    )


def _build_explanation_prompt(target, weights, computed_score, others) -> str:
    """Build the prompt for ranking explanation.

    This is called once per neighborhood in a comparison.
    The LLM is told:
      - The winning neighborhood's scores (truth)
      - The user's weights (math they did)
      - The other neighborhoods' scores (for comparison)
    Forbidden: making up any data not listed.
    """
    others_str = ", ".join(
        f"{o.name} (parks {o.parks_score}, schools {o.schools_score}, safety {o.safety_score})"
        for o in others
        if o.id != target.id
    ) or "no other neighborhoods in comparison"
    return (
        f"You are explaining a neighborhood ranking to a 35-year-old parent "
        f"evaluating family-friendly areas.\n\n"
        f"THIS NEIGHBORHOOD (the one being explained): {target.name}\n"
        f"- Parks: {target.parks_score}/10\n"
        f"- Schools: {target.schools_score}/10\n"
        f"- Safety: {target.safety_score}/10\n"
        f"- Computed weighted score: {computed_score:.1f}/10\n\n"
        f"USER'S WEIGHTS (must sum to 1.0): "
        f"parks × {weights.parks:.2f}, schools × {weights.schools:.2f}, safety × {weights.safety:.2f}\n\n"
        f"OTHER NEIGHBORHOODS IN COMPARISON: {others_str}\n\n"
        f"TASK: Write a 1-2 sentence explanation of why {target.name} ranks here.\n\n"
        f"Constraints:\n"
        f"- 1-2 sentences, max 60 words\n"
        f"- Cite this neighborhood's specific scores (e.g. 'parks 9.1 and schools 8.5')\n"
        f"- Reference the weight distribution chosen (e.g. 'with parks+schools combined at 0.75')\n"
        f"- Compare to at least one other neighborhood when 2+ are in comparison\n"
        f"- DO NOT invent specific facts (no fake park names, no fake school names)\n"
        f"- Persona: 35-year-old parent, prefers calm/trustworthy tone\n"
        f"- Return only the explanation, no preamble\n"
    )


def generate_neighborhood_vibe(neighborhood) -> tuple[str, str]:
    """Generate (short, full) vibe descriptions for a neighborhood.

    The routes layer calls this when the cached vibe is stale (TTL passed,
    per docs/api.md). Returns a tuple of (vibe_short, vibe_full). Both strings
    are stripped. Falls back to defaults if the LLM call fails.

    Cost: ~1.0K tokens per call. Called at most once per neighborhood per 7 days
    (cache TTL), plus once per initial seed run.
    """
    try:
        short = complete(
            _build_vibe_short_prompt(neighborhood),
            max_tokens=_VIBE_SHORT_MAX_TOKENS,
            temperature=0.7,
        ).strip().strip('"\'')
        full = complete(
            _build_vibe_full_prompt(neighborhood),
            max_tokens=_VIBE_FULL_MAX_TOKENS,
            temperature=0.7,
        ).strip()
        log.info(
            "llm.vibe.generated",
            id=neighborhood.id,
            short_len=len(short),
            full_len=len(full),
        )
        return short, full
    except Exception as exc:
        log.warning("llm.vibe.failed", id=neighborhood.id, error=str(exc))
        # Honest fallback: generic, no fabricated facts
        short = f"Family-friendly area in {neighborhood.city}."
        full = (
            f"{neighborhood.name} is a neighborhood in {neighborhood.city}. "
            f"Family-friendliness details are temporarily unavailable. "
            f"Scores: parks {neighborhood.parks_score}/10, schools {neighborhood.schools_score}/10, "
            f"safety {neighborhood.safety_score}/10."
        )
        return short, full


def generate_ranking_explanation(
    target, weights, computed_score: float, others: list
) -> str:
    """Generate explanation for why `target` ranked where it did.

    Called once per neighborhood in a POST /api/compare response.

    Args:
        target: The Neighborhood being explained.
        weights: UserPrefs.weights (used by user; reflects their priority).
        computed_score: Pre-calculated deterministic weighted composite.
        others: Other neighborhoods in the comparison (for context).

    Returns: 1-2 sentence explanation string. Falls back to a generic line
    that cites the pre-computed score (no hallucination) if the LLM fails.
    """
    try:
        text = complete(
            _build_explanation_prompt(target, weights, computed_score, others),
            max_tokens=_EXPLANATION_MAX_TOKENS,
            temperature=0.5,  # lower temp for factual ranking summaries
        ).strip()
        log.info(
            "llm.explanation.generated",
            id=target.id,
            score=computed_score,
            explanation_len=len(text),
        )
        return text
    except Exception as exc:
        log.warning("llm.explanation.failed", id=target.id, error=str(exc))
        # Deterministic fallback: just cite the score (no LLM guesswork)
        return (
            f"{target.name} received a weighted score of {computed_score:.1f}/10 "
            f"based on the user's weight distribution (parks × {weights.parks:.2f}, "
            f"schools × {weights.schools:.2f}, safety × {weights.safety:.2f})."
        )