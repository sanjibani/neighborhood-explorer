// frontend/components.js - all 14 UI components as pure render functions.
//
// Pattern: each component is `export function X(props, state) -> { html, attach(root) }`.
// - `html` is the initial HTML string.
// - `attach(root)` wires event listeners and replaces html with live DOM.
// The two-step (html + attach) keeps the API simple without needing a virtual DOM.
//
// State for interactive components (search dropdown focus, slider drag) is local
// to the closure created in attach(), NOT in the global app state. Global state
// lives in app.js and gets passed down as props.

const escape = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

const cls = (...xs) => xs.filter(Boolean).join(" ");

// ─── 1. Button ─────────────────────────────────────────────────────────
export function Button({ label, variant = "primary", disabled = false, type = "button" }) {
  const styles = variant === "primary"
    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
    : "bg-white hover:bg-slate-50 text-slate-900 border border-slate-200";
  const html = `<button type="${type}" ${disabled ? "disabled" : ""}
    class="${styles} px-5 py-2.5 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed">
    ${escape(label)}
  </button>`;
  return { html };
}

// ─── 2. CounterBadge ───────────────────────────────────────────────────
export function CounterBadge({ current, max = 3 }) {
  const html = `<span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold
    ${current >= 2 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}">
    ${current}/${max}
  </span>`;
  return { html };
}

// ─── 3. EmptyState ─────────────────────────────────────────────────────
export function EmptyState({ title, body }) {
  const html = `<div class="p-6 bg-white border border-dashed border-slate-300 rounded-lg text-center">
    <p class="font-semibold text-slate-900">${escape(title)}</p>
    <p class="text-sm text-slate-500 mt-1">${escape(body)}</p>
  </div>`;
  return { html };
}

// ─── 4. ShortlistCard ──────────────────────────────────────────────────
export function ShortlistCard({ neighborhood }) {
  const html = `<div class="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg"
    data-id="${escape(neighborhood.id)}">
    <div class="flex-1">
      <p class="font-semibold text-slate-900">${escape(neighborhood.name)}</p>
      <p class="text-xs text-slate-500">${escape(neighborhood.city)}, ${escape(neighborhood.state)}</p>
    </div>
    <button data-action="remove"
      class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-red-600 transition"
      aria-label="Remove ${escape(neighborhood.name)}">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M4 4l8 8M12 4l-8 8"/>
      </svg>
    </button>
  </div>`;
  return { html };
}

// ─── 5. SearchInput ────────────────────────────────────────────────────
// Interactive: autocomplete dropdown with keyboard nav + click selection.
export function SearchInput({ onSelect, placeholder = "Type a neighborhood...", minChars = 2 }) {
  let focusedIndex = -1;
  let currentResults = [];

  const html = `<div class="relative flex-1">
    <input type="text" id="search-input"
      placeholder="${escape(placeholder)}"
      autocomplete="off"
      class="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg
        focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100
        placeholder:text-slate-400 transition" />
    <div id="search-dropdown" class="search-dropdown hidden"></div>
  </div>`;

  function attach(root) {
    const input = root.querySelector("#search-input");
    const dropdown = root.querySelector("#search-dropdown");

    let debounceTimer = null;
    async function doSearch(q) {
      if (q.length < minChars) {
        dropdown.classList.add("hidden");
        return;
      }
      try {
        const { results } = await api.search(q, 8);
        currentResults = results;
        renderDropdown(results);
      } catch (err) {
        console.warn("search failed:", err);
        dropdown.classList.add("hidden");
      }
    }

    function renderDropdown(results) {
      if (!results.length) {
        dropdown.innerHTML = `<div class="search-result text-slate-500">No matches</div>`;
      } else {
        dropdown.innerHTML = results.map((r, i) => `
          <div class="search-result ${i === focusedIndex ? "is-focused" : ""}" data-idx="${i}">
            <div class="search-result-name">${escape(r.name)}</div>
            <div class="search-result-meta">${escape(r.city)}, ${escape(r.state)}</div>
          </div>`).join("");
      }
      dropdown.classList.remove("hidden");
    }

    function pick(i) {
      const item = currentResults[i];
      if (!item) return;
      onSelect?.(item);
      input.value = "";
      dropdown.classList.add("hidden");
      focusedIndex = -1;
    }

    input.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => doSearch(e.target.value.trim()), 180);
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusedIndex = Math.min(focusedIndex + 1, currentResults.length - 1);
        renderDropdown(currentResults);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusedIndex = Math.max(focusedIndex - 1, -1);
        renderDropdown(currentResults);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedIndex >= 0) pick(focusedIndex);
      } else if (e.key === "Escape") {
        dropdown.classList.add("hidden");
        focusedIndex = -1;
      }
    });
    input.addEventListener("blur", () => {
      // delay so click on result registers before dropdown hides
      setTimeout(() => dropdown.classList.add("hidden"), 150);
    });
    dropdown.addEventListener("mousedown", (e) => {
      const item = e.target.closest("[data-idx]");
      if (item) pick(Number(item.dataset.idx));
    });
  }

  return { html, attach };
}

// ─── 6. WeightSlider ───────────────────────────────────────────────────
// Interactive: drag updates the weights object, others auto-rebalance.
export function WeightSlider({ label, value, color, onChange }) {
  const html = `<div class="flex items-center gap-4">
    <div class="w-20 text-sm font-semibold" style="color: ${color};">${escape(label)}</div>
    <input type="range" min="0" max="1" step="0.05" value="${value}"
      class="flex-1 accent-emerald-600"
      style="accent-color: ${color};" />
    <span class="weight-value text-sm font-semibold">${value.toFixed(2)}</span>
  </div>`;

  function attach(root) {
    const input = root.querySelector("input[type=range]");
    const display = root.querySelector(".weight-value");
    input.addEventListener("input", (e) => {
      const v = Number(e.target.value);
      display.textContent = v.toFixed(2);
      onChange?.(v);
    });
  }

  return { html, attach };
}

// ─── 7. ScoreBar ───────────────────────────────────────────────────────
export function ScoreBar({ label, value, max = 10, kind }) {
  const pct = Math.max(0, Math.min(1, value / max));
  const html = `<div class="space-y-1">
    <div class="flex justify-between text-xs">
      <span class="font-semibold text-slate-600">${escape(label)}</span>
      <span class="font-semibold text-slate-900">${value.toFixed(1)}/${max}</span>
    </div>
    <div class="score-bar">
      <div class="score-bar-fill ${escape(kind)}" style="width: ${(pct * 100).toFixed(1)}%;"></div>
    </div>
  </div>`;
  return { html };
}

// ─── 8. VibeTag ────────────────────────────────────────────────────────
export function VibeTag({ text, loading = false }) {
  const inner = loading
    ? `<span class="vibe-loading"></span> <span class="text-slate-500 text-xs ml-1">Generating vibe...</span>`
    : escape(text);
  const html = `<p class="text-sm text-slate-700 italic leading-snug min-h-[2.5rem]">${inner}</p>`;
  return { html };
}

// ─── 9. CompareColumn ──────────────────────────────────────────────────
export function CompareColumn({ neighborhood, vibe, rank }) {
  const medalHtml = rank ? `<span class="medal medal-${rank}">${rank}</span>` : "";
  const html = `<div class="bg-white border border-slate-200 rounded-lg p-6 space-y-4 flex flex-col">
    <div class="flex items-center gap-3">
      ${medalHtml}
      <div>
        <h3 class="font-semibold text-lg text-slate-900">${escape(neighborhood.name)}</h3>
        <p class="text-xs text-slate-500">${escape(neighborhood.city)}, ${escape(neighborhood.state)}</p>
      </div>
    </div>
    <div class="space-y-3">
      ${ScoreBar({ label: "Parks",   value: neighborhood.parks_score,   kind: "parks" }).html}
      ${ScoreBar({ label: "Schools", value: neighborhood.schools_score, kind: "schools" }).html}
      ${ScoreBar({ label: "Safety",  value: neighborhood.safety_score,  kind: "safety" }).html}
    </div>
    ${VibeTag({ text: vibe || neighborhood.vibe?.vibe_short, loading: !vibe && !neighborhood.vibe?.vibe_short }).html}
  </div>`;
  return { html };
}

// ─── 10. RankingResult ─────────────────────────────────────────────────
export function RankingResult({ rank, neighborhood, score, explanation }) {
  const html = `<div class="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg">
    <span class="medal medal-${rank}">${rank}</span>
    <div class="flex-1 min-w-0">
      <div class="flex items-baseline justify-between gap-3">
        <h3 class="font-semibold text-slate-900">${escape(neighborhood.name)}</h3>
        <span class="text-sm font-semibold text-slate-600 tabular-nums">${score.toFixed(2)}/10</span>
      </div>
      <p class="text-sm text-slate-600 mt-1 leading-snug">${escape(explanation)}</p>
    </div>
  </div>`;
  return { html };
}

// ─── 11. Tabs ──────────────────────────────────────────────────────────
// Interactive: switches which child panel is shown.
export function Tabs({ tabs, active, onChange }) {
  const html = `<div>
    <div class="tab-nav">
      ${tabs.map((t) => `
        <button class="tab-button ${t.id === active ? "is-active" : ""}" data-tab="${escape(t.id)}">
          ${escape(t.label)}
        </button>
      `).join("")}
    </div>
    <div class="mt-4">${tabs.find((t) => t.id === active)?.render() ?? ""}</div>
  </div>`;

  function attach(root) {
    root.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => onChange?.(btn.dataset.tab));
    });
  }

  return { html, attach };
}

// ─── 12. Select ────────────────────────────────────────────────────────
export function Select({ value, options, onChange }) {
  const html = `<select class="px-3 py-2 bg-white border border-slate-300 rounded-lg
    focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 font-semibold text-sm">
    ${options.map((o) => `<option value="${escape(o.value)}" ${o.value === value ? "selected" : ""}>${escape(o.label)}</option>`).join("")}
  </select>`;

  function attach(root) {
    root.querySelector("select").addEventListener("change", (e) => onChange?.(e.target.value));
  }

  return { html, attach };
}

// ─── 13. MapView (mocked for v0.1) ─────────────────────────────────────
// Renders a stylized "map" with pins positioned by lat/lng (no real tile data).
// Phase 7 will replace this with a real Google Maps embed (user chose "go mock").
export function MapView({ neighborhoods }) {
  // Project lat/lng to a 0-1 box for positioning. Bangalore is ~12.5-13.0 N, 77.4-77.9 E.
  const lats = neighborhoods.map((n) => n.lat);
  const lngs = neighborhoods.map((n) => n.lng);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;
  const project = (n) => ({
    left: `${((n.lng - minLng) / lngRange * 80 + 10).toFixed(1)}%`,
    top:  `${((maxLat - n.lat) / latRange * 70 + 15).toFixed(1)}%`,  // invert Y
  });

  const html = `<div>
    <div class="map-mock">
      ${neighborhoods.map((n) => {
        const pos = project(n);
        return `<div class="map-pin" style="left: ${pos.left}; top: ${pos.top};" data-id="${escape(n.id)}">
          <div class="map-pin-label">${escape(n.name)}</div>
        </div>`;
      }).join("")}
      <div class="map-layer-toggle">
        <button class="map-layer-pill is-active" data-layer="pins">Pins</button>
        <button class="map-layer-pill" data-layer="parks">Parks</button>
        <button class="map-layer-pill" data-layer="schools">Schools</button>
      </div>
    </div>
    <p class="text-xs text-slate-500 mt-2 text-center">
      Map view is a v0.1 mock (Phase 7 wires a real map). Pins positioned by lat/lng.
    </p>
  </div>`;

  function attach(root) {
    // Layer toggle: just visual state for now (no actual layer data).
    root.querySelectorAll("[data-layer]").forEach((btn) => {
      btn.addEventListener("click", () => {
        root.querySelectorAll("[data-layer]").forEach((b) => b.classList.remove("is-active"));
        btn.classList.add("is-active");
      });
    });
  }

  return { html, attach };
}

// ─── 14. NeighborhoodDetail ────────────────────────────────────────────
export function NeighborhoodDetail({ neighborhood, vibeLoading }) {
  if (!neighborhood) {
    return { html: `<p class="text-slate-500">Select a neighborhood above.</p>` };
  }
  const v = neighborhood.vibe || {};
  const parks = (neighborhood.parks_data || []).map((p) =>
    `<li class="flex items-baseline justify-between gap-3 py-2 border-b border-slate-100">
      <span class="font-semibold text-slate-900">${escape(p.name)}</span>
      <span class="text-xs text-slate-500">${p.distance_m}m &middot; ${(p.features || []).map(escape).join(", ")}</span>
    </li>`).join("");
  const schools = (neighborhood.schools_data || []).map((s) =>
    `<li class="flex items-baseline justify-between gap-3 py-2 border-b border-slate-100">
      <span class="font-semibold text-slate-900">${escape(s.name)}</span>
      <span class="text-xs text-slate-500">rating ${s.rating}/10 &middot; ${escape(s.grades_served)} &middot; ${s.distance_m}m</span>
    </li>`).join("");
  const safety = neighborhood.safety_data || {};
  const vibeBlock = vibeLoading
    ? `<p class="text-slate-500"><span class="vibe-loading"></span> Generating full vibe...</p>`
    : `<p class="text-sm text-slate-700 leading-relaxed whitespace-pre-line">${escape(v.vibe_full || v.vibe_short || "No description available.")}</p>`;

  const html = `<div class="space-y-6">
    <div>
      <h3 class="text-xl font-semibold text-slate-900">${escape(neighborhood.name)}</h3>
      <p class="text-sm text-slate-500">${escape(neighborhood.city)}, ${escape(neighborhood.state)} &middot;
        ${neighborhood.lat.toFixed(4)}, ${neighborhood.lng.toFixed(4)}</p>
    </div>
    <div class="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
      <h4 class="text-xs uppercase tracking-wider font-semibold text-slate-500">AI vibe</h4>
      ${vibeBlock}
    </div>
    <div class="grid md:grid-cols-2 gap-4">
      <div class="bg-white border border-slate-200 rounded-lg p-5">
        <h4 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
          Nearby parks (${(neighborhood.parks_data || []).length})
        </h4>
        <ul class="space-y-0">${parks || "<li class='text-slate-500 text-sm'>None recorded.</li>"}</ul>
      </div>
      <div class="bg-white border border-slate-200 rounded-lg p-5">
        <h4 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
          Nearby schools (${(neighborhood.schools_data || []).length})
        </h4>
        <ul class="space-y-0">${schools || "<li class='text-slate-500 text-sm'>None recorded.</li>"}</ul>
      </div>
    </div>
    <div class="bg-white border border-slate-200 rounded-lg p-5">
      <h4 class="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">
        Safety snapshot (${escape(String(safety.year || ""))})
      </h4>
      <dl class="grid grid-cols-3 gap-4 text-sm">
        <div><dt class="text-slate-500 text-xs">Violent / 100k</dt><dd class="font-semibold">${safety.violent_per_100k ?? "-"}</dd></div>
        <div><dt class="text-slate-500 text-xs">Property / 100k</dt><dd class="font-semibold">${safety.property_per_100k ?? "-"}</dd></div>
        <div><dt class="text-slate-500 text-xs">Traffic / year</dt><dd class="font-semibold">${safety.traffic_incidents_per_year ?? "-"}</dd></div>
      </dl>
    </div>
  </div>`;
  return { html };
}