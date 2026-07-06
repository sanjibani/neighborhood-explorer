"""
MiniMax LLM client.

API base URL: https://api.minimax.io/v1  (NOT api.minimax.chat — that's the Chinese service).
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