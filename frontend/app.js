// frontend/app.js - bootstrap, hash router, global state.
//
// State shape:
//   {
//     route: "shortlist" | "compare",
//     shortlist: [Neighborhood, ...],   // 0-3 items
//     weights: { parks, schools, safety }, // sum to 1.0
//     activeTab: "table" | "map" | "detail",
//     selectedDetailId: string,
//     ranking: [{neighborhood_id, score, explanation}, ...],
//     vibeLoadingIds: Set<string>,
//     error: string | null,
//   }
//
// Mutation rules:
// - All mutations go through actions.* (never mutate state directly from a component).
// - Every mutation triggers a re-render of the current screen.
// - Vibe TTL is handled server-side; we just call api.getById and trust the response.

import { api } from "./api.js";
import { ShortlistScreen, CompareScreen } from "./screens.js";

const state = {
  route: "shortlist",
  shortlist: [],
  weights: { parks: 0.4, schools: 0.3, safety: 0.3 },
  activeTab: "table",
  selectedDetailId: null,
  ranking: [],
  vibeLoadingIds: new Set(),
  error: null,
};

// ─── Actions ───────────────────────────────────────────────────────────

const actions = {
  goShortlist() {
    state.route = "shortlist";
    location.hash = "";
    render();
  },
  goCompare() {
    if (state.shortlist.length < 2) return;
    state.route = "compare";
    state.activeTab = "table";
    if (!state.selectedDetailId && state.shortlist[0]) {
      state.selectedDetailId = state.shortlist[0].id;
    }
    location.hash = "compare";
    // Fetch full neighborhood data (with vibe) in parallel, then run compare.
    actions.refreshCompareData();
  },
  async refreshCompareData() {
    state.error = null;
    state.ranking = [];
    // Mark all shortlist ids as vibe-loading so CompareColumn shows spinners.
    state.shortlist.forEach((n) => state.vibeLoadingIds.add(n.id));
    render();
    try {
      // Fetch each shortlist entry in parallel. The server returns the freshest vibe
      // (regenerates if TTL expired) - we trust that.
      const full = await Promise.all(state.shortlist.map((n) => api.getById(n.id)));
      // Merge full data back into shortlist (replaces stubs).
      state.shortlist = full;
      full.forEach((n) => state.vibeLoadingIds.delete(n.id));
      // Now run compare.
      const { ranking } = await api.compare(
        state.shortlist.map((n) => n.id),
        state.weights,
      );
      state.ranking = ranking;
      render();
    } catch (err) {
      state.shortlist.forEach((n) => state.vibeLoadingIds.delete(n.id));
      state.error = err.message || "Failed to load comparison.";
      render();
    }
  },
  addToShortlist(nb) {
    state.error = null;
    if (state.shortlist.some((n) => n.id === nb.id)) {
      state.error = `${nb.name} is already in your shortlist.`;
      render();
      return;
    }
    if (state.shortlist.length >= 3) {
      state.error = "Maximum 3 neighborhoods. Remove one to add another.";
      render();
      return;
    }
    state.shortlist.push(nb);
    render();
  },
  removeFromShortlist(id) {
    state.shortlist = state.shortlist.filter((n) => n.id !== id);
    // If we drop below 2 while on Compare, auto-redirect to Shortlist.
    if (state.route === "compare" && state.shortlist.length < 2) {
      actions.goShortlist();
      return;
    }
    render();
  },
  setWeight(key, value) {
    // Auto-rebalance: change one weight, scale the others proportionally so they sum to 1.0.
    const others = ["parks", "schools", "safety"].filter((k) => k !== key);
    const oldOthersSum = others.reduce((s, k) => s + state.weights[k], 0) || 0.0001;
    state.weights[key] = value;
    if (oldOthersSum <= 0) {
      // Initial state - distribute evenly.
      others.forEach((k) => { state.weights[k] = (1 - value) / others.length; });
    } else {
      // Scale others to fill the remaining (1 - value).
      const remaining = 1 - value;
      others.forEach((k) => { state.weights[k] = state.weights[k] / oldOthersSum * remaining; });
    }
    // Re-rank live (debounced).
    if (state.route === "compare" && state.shortlist.length >= 2) {
      clearTimeout(window._rerankTimer);
      window._rerankTimer = setTimeout(() => actions.rerank(), 200);
    } else {
      render();
    }
  },
  async rerank() {
    try {
      const { ranking } = await api.compare(
        state.shortlist.map((n) => n.id),
        state.weights,
      );
      state.ranking = ranking;
      render();
    } catch (err) {
      state.error = err.message || "Failed to re-rank.";
      render();
    }
  },
  setTab(tabId) {
    state.activeTab = tabId;
    render();
  },
  selectDetail(id) {
    state.selectedDetailId = id;
    render();
  },
};

// ─── Render loop ───────────────────────────────────────────────────────

function render() {
  const root = document.getElementById("app");
  if (!root) return;
  const screen = state.route === "compare"
    ? CompareScreen({ state, actions })
    : ShortlistScreen({ state, actions });
  root.innerHTML = screen.html;
  if (typeof screen.attach === "function") screen.attach(root);
}

// ─── Router ────────────────────────────────────────────────────────────

function syncRouteFromHash() {
  state.route = location.hash === "#compare" ? "compare" : "shortlist";
  // If user lands on #compare without a shortlist, fall back to shortlist.
  if (state.route === "compare" && state.shortlist.length < 2) {
    state.route = "shortlist";
    location.hash = "";
  }
  // If we navigated to compare but don't have ranking yet (e.g. page refresh),
  // re-fetch.
  if (state.route === "compare" && state.ranking.length === 0 && state.shortlist.length >= 2) {
    actions.refreshCompareData();
  } else {
    render();
  }
}

window.addEventListener("hashchange", syncRouteFromHash);
window.addEventListener("DOMContentLoaded", () => {
  syncRouteFromHash();
  // Health check on load (console-only; proves API is alive).
  fetch("/api/health")
    .then((r) => r.json())
    .then((data) => console.log("health:", data))
    .catch((err) => console.warn("health check failed:", err));
});