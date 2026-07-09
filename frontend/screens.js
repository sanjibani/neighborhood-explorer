// frontend/screens.js - the two top-level screens.
//
// Screen 1 (Shortlist): search + add up to 3 neighborhoods, Compare CTA.
// Screen 2 (Compare): weights + ranking + tabs (Table / Map / Detail).
//
// Each screen is a render function: (state, actions) -> { html, attach(root) }
// attach() wires events using the actions callback (state mutations are owned by app.js).

import {
  Button, SearchInput, ShortlistCard, CounterBadge, EmptyState,
  WeightSlider, RankingResult, CompareColumn, Tabs, MapView,
  NeighborhoodDetail, Select,
} from "./components.js";

// ─── Screen 1: Shortlist ───────────────────────────────────────────────
export function ShortlistScreen({ state, actions }) {
  const { shortlist } = state;
  const canCompare = shortlist.length >= 2;

  const html = `<div class="max-w-3xl mx-auto p-6 space-y-6">
    <header class="flex items-center justify-between">
      <h1 class="text-3xl font-bold tracking-tight">Neighborhood Explorer</h1>
      ${CounterBadge({ current: shortlist.length, max: 3 }).html}
    </header>

    <section class="space-y-3">
      <p class="text-sm text-slate-600">Find neighborhoods to compare</p>
      <div class="flex gap-3 items-start">
        <div id="search-mount" class="flex-1"></div>
        <div id="add-btn-mount"></div>
      </div>
    </section>

    <section class="space-y-2">
      <h2 class="text-sm uppercase tracking-wider font-semibold text-slate-500">
        Your shortlist
      </h2>
      <div id="shortlist-cards" class="space-y-2">
        ${shortlist.length === 0
          ? EmptyState({
              title: "No neighborhoods yet.",
              body: "Add 2-3 to compare.",
            }).html
          : shortlist.map((n) => ShortlistCard({ neighborhood: n }).html).join("")}
      </div>
    </section>

    <section>
      <div id="compare-cta-mount">
        ${Button({ label: "Compare", disabled: !canCompare }).html}
      </div>
      ${!canCompare ? `<p class="text-xs text-slate-500 mt-2">Add at least 2 neighborhoods to compare.</p>` : ""}
    </section>

    ${state.error ? `<div class="error-banner">${escape(state.error)}</div>` : ""}
  </div>`;

  function attach(root) {
    // Mount SearchInput
    const searchMount = root.querySelector("#search-mount");
    const search = SearchInput({
      onSelect: (nb) => actions.addToShortlist(nb),
      placeholder: "Type a neighborhood (try 'jaya' or 'hsr')...",
    });
    searchMount.innerHTML = search.html;
    search.attach(searchMount);

    // "Add to list" button (same behavior as picking a search result; UI affordance)
    const addBtnMount = root.querySelector("#add-btn-mount");
    const addBtn = Button({ label: "Add to list", disabled: true });
    addBtnMount.innerHTML = addBtn.html;

    // Remove buttons on cards
    root.querySelectorAll('[data-action="remove"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        const card = btn.closest("[data-id]");
        if (card) actions.removeFromShortlist(card.dataset.id);
      });
    });

    // Compare CTA
    const ctaMount = root.querySelector("#compare-cta-mount");
    const cta = Button({ label: "Compare", disabled: !canCompare });
    ctaMount.innerHTML = cta.html;
    const ctaBtn = ctaMount.querySelector("button");
    if (canCompare) ctaBtn.addEventListener("click", () => actions.goCompare());
  }

  return { html, attach };
}

// ─── Screen 2: Compare ─────────────────────────────────────────────────
export function CompareScreen({ state, actions }) {
  const { shortlist, ranking, weights, activeTab, selectedDetailId, vibeLoadingIds } = state;
  const rankByNid = {};
  ranking.forEach((r, i) => { rankByNid[r.neighborhood_id] = i + 1; });
  const shortlistById = Object.fromEntries(shortlist.map((n) => [n.id, n]));

  const html = `<div class="max-w-6xl mx-auto p-6 space-y-6">
    <header class="flex items-center justify-between">
      <h1 class="text-3xl font-bold tracking-tight">Compare</h1>
      <div id="edit-shortlist-mount">
        ${Button({ label: "Edit shortlist", variant: "secondary" }).html}
      </div>
    </header>

    <section class="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h2 class="text-sm uppercase tracking-wider font-semibold text-slate-500">
        Ranking priorities (sliders auto-rebalance to sum to 1.0)
      </h2>
      <div id="sliders-mount" class="space-y-3"></div>
    </section>

    <section class="space-y-2">
      <h2 class="text-sm uppercase tracking-wider font-semibold text-slate-500">
        Best for your priorities
      </h2>
      <div class="space-y-2">
        ${ranking.length === 0
          ? `<div class="skeleton h-20 w-full"></div>`
          : ranking.map((r, i) => RankingResult({
              rank: i + 1,
              neighborhood: shortlistById[r.neighborhood_id] || { name: r.neighborhood_id },
              score: r.score,
              explanation: r.explanation,
            }).html).join("")}
      </div>
    </section>

    <section>
      <div id="tabs-mount"></div>
    </section>

    ${state.error ? `<div class="error-banner">${escape(state.error)}</div>` : ""}
  </div>`;

  function attach(root) {
    // Edit shortlist button
    const editMount = root.querySelector("#edit-shortlist-mount");
    const editBtn = Button({ label: "Edit shortlist", variant: "secondary" });
    editMount.innerHTML = editBtn.html;
    editMount.querySelector("button").addEventListener("click", () => actions.goShortlist());

    // Weight sliders (3 of them, auto-rebalance handled in actions.setWeight)
    const slidersMount = root.querySelector("#sliders-mount");
    const sliderIds = ["parks", "schools", "safety"];
    const sliderMeta = { parks: "#059669", schools: "#0EA5E9", safety: "#F59E0B" };
    sliderIds.forEach((key) => {
      const wrap = document.createElement("div");
      slidersMount.appendChild(wrap);
      const s = WeightSlider({
        label: key.charAt(0).toUpperCase() + key.slice(1),
        value: weights[key],
        color: sliderMeta[key],
        onChange: (v) => actions.setWeight(key, v),
      });
      wrap.innerHTML = s.html;
      s.attach(wrap);
    });

    // Tabs: Table / Map / Detail
    const tabsMount = root.querySelector("#tabs-mount");
    const tablePanel = () => `<div class="grid gap-4 ${shortlist.length === 3 ? "md:grid-cols-3" : "md:grid-cols-2"}">
      ${shortlist.map((n) => CompareColumn({
        neighborhood: n,
        vibe: n.vibe?.vibe_short,
        rank: rankByNid[n.id],
      }).html).join("")}
    </div>`;
    const mapPanel = () => MapView({ neighborhoods: shortlist }).html;
    const detailPanel = () => {
      const opts = shortlist.map((n) => ({ value: n.id, label: n.name }));
      const sel = Select({ value: selectedDetailId, options: opts });
      return `<div class="space-y-4">
        <div class="flex items-center gap-3">
          <label class="text-sm text-slate-500">View:</label>
          <div id="detail-select-mount"></div>
        </div>
        <div id="detail-body"></div>
      </div>`;
    };
    const tabs = Tabs({
      tabs: [
        { id: "table",  label: "Table",  render: tablePanel },
        { id: "map",    label: "Map",    render: mapPanel },
        { id: "detail", label: "Detail", render: detailPanel },
      ],
      active: activeTab,
      onChange: (id) => actions.setTab(id),
    });
    tabsMount.innerHTML = tabs.html;
    tabs.attach(tabsMount);

    // Wire MapView if Map tab is active
    if (activeTab === "map") {
      const mapEl = tabsMount.querySelector(".map-mock");
      if (mapEl) MapView({ neighborhoods: shortlist }).attach?.(mapEl.parentElement.parentElement);
    }
    // Wire Select if Detail tab is active
    if (activeTab === "detail") {
      const selMount = tabsMount.querySelector("#detail-select-mount");
      if (selMount) {
        const opts = shortlist.map((n) => ({ value: n.id, label: n.name }));
        const sel = Select({ value: selectedDetailId, options: opts, onChange: (id) => actions.selectDetail(id) });
        selMount.innerHTML = sel.html;
        sel.attach(selMount);
        const detailBody = tabsMount.querySelector("#detail-body");
        const nb = shortlistById[selectedDetailId];
        if (detailBody) {
          detailBody.innerHTML = NeighborhoodDetail({
            neighborhood: nb,
            vibeLoading: vibeLoadingIds.has(selectedDetailId),
          }).html;
        }
      }
    }
  }

  return { html, attach };
}

function escape(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}