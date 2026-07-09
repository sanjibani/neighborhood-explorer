// frontend/api.js - thin fetch wrappers for the 3 backend endpoints.
//
// Why a thin wrapper: components shouldn't know about HTTP. They call
// api.search(q) or api.getById(id) and get back parsed JSON or throw.
// The wrapper handles error envelopes (FastAPI returns {detail: ...} on 4xx).
//
// Why no axios/fetch-helpers library: 3 endpoints, ~80 lines, no need.

const BASE = "";  // same-origin (FastAPI serves both API + frontend from one host)

async function request(path, opts = {}) {
  const res = await fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    throw new Error(`Bad JSON from ${path}: ${text.slice(0, 80)}`);
  }
  if (!res.ok) {
    // FastAPI uses {detail: "..."} for HTTPException, or {detail: [{loc,msg},...]} for 422.
    const detail = data?.detail;
    const msg = typeof detail === "string"
      ? detail
      : Array.isArray(detail)
        ? detail.map((d) => `${d.loc?.join(".") || "?"}: ${d.msg}`).join("; ")
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  /** GET /api/neighborhoods/search?q=&limit= */
  search(q, limit = 8) {
    const params = new URLSearchParams({ q, limit: String(limit) });
    return request(`/api/neighborhoods/search?${params}`);
  },

  /** GET /api/neighborhoods/{id} - returns full Neighborhood with vibe (may trigger LLM regen) */
  getById(id) {
    return request(`/api/neighborhoods/${encodeURIComponent(id)}`);
  },

  /** POST /api/compare - body: { shortlist, weights } -> { ranking, weights_used, generated_at } */
  compare(shortlist, weights) {
    return request(`/api/compare`, {
      method: "POST",
      body: JSON.stringify({ shortlist, weights }),
    });
  },
};