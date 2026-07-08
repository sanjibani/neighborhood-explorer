/**
 * Phase 2 design build — Penpot MCP execute_code payloads.
 *
 * Each export below is the JavaScript code Mavis sent to Penpot via the
 * execute_code MCP tool to build Screen 1 (Shortlist) and Screen 2 (Compare).
 * Stored in repo so the design is reproducible from spec without re-running
 * the agent loop.
 *
 * To rerun: copy a function into a `mavis mcp call penpot execute_code '{"code": "..."}'`
 * command, OR use the MCP UI from a Penpot-connected agent.
 */

// =============================================================
// SCREEN 1: SHORTLIST
// =============================================================
// Build sequence (8 MCP calls, all run against the same Penpot page)

/*
 * Call 1 — Board + header + tagline
 */
function buildScreen1Base() {
  const board = penpot.createBoard();
  board.name = "Screen 1 - Shortlist";
  board.x = 100;
  board.y = 100;
  board.resize(800, 850);
  board.fills = [{ fillColor: "#F8FAFC", fillOpacity: 1 }];
  penpotUtils.addFlexLayout(board, "column");
  board.flex.paddingTop = 64;
  board.flex.paddingBottom = 64;
  board.flex.paddingLeft = 64;
  board.flex.paddingRight = 64;
  board.flex.rowGap = 24;

  const header = penpot.createText("Neighborhood Explorer");
  header.fontSize = 36;
  header.fontWeight = "700";
  header.fills = [{ fillColor: "#0F172A", fillOpacity: 1 }];
  board.appendChild(header);

  const tagline = penpot.createText("Compare family-friendly Bangalore areas — parks, schools, safety.");
  tagline.fontSize = 16;
  tagline.fills = [{ fillColor: "#475569", fillOpacity: 1 }];
  board.appendChild(tagline);

  return board;
}

/*
 * Call 2 — Search row with input + Add button
 */
function buildSearchRow(board) {
  const searchRow = penpot.createBoard();
  searchRow.name = "Search Row";
  searchRow.fills = [];
  searchRow.resize(672, 56);
  penpotUtils.addFlexLayout(searchRow, "row");
  searchRow.flex.columnGap = 12;
  searchRow.flex.alignItems = "center";
  board.appendChild(searchRow);
  searchRow.layoutChild.horizontalSizing = "fill";

  const searchInput = penpot.createRectangle();
  searchInput.name = "Search input";
  searchInput.resize(520, 56);
  searchInput.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  searchInput.strokes = [{ strokeColor: "#CBD5E1", strokeOpacity: 1, strokeStyle: "solid" }];
  searchInput.borderRadius = 10;
  searchRow.appendChild(searchInput);

  // Add button (group: bg + text overlay)
  const addBtnGroup = penpot.createBoard();
  addBtnGroup.name = "Add to list button";
  addBtnGroup.fills = [];
  addBtnGroup.resize(140, 56);
  searchRow.appendChild(addBtnGroup);

  const addBtnBg = penpot.createRectangle();
  addBtnBg.name = "Add to list bg";
  addBtnBg.resize(140, 56);
  addBtnBg.fills = [{ fillColor: "#059669", fillOpacity: 1 }];
  addBtnBg.borderRadius = 10;
  addBtnGroup.appendChild(addBtnBg);

  const addBtnText = penpot.createText("Add to list");
  addBtnText.name = "Add to list label";
  addBtnText.fontSize = 16;
  addBtnText.fontWeight = "700";
  addBtnText.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  addBtnGroup.appendChild(addBtnText);
  penpotUtils.setParentXY(addBtnText, 27, 19);
}

/*
 * Call 3 — Section label "Your shortlist · 3 of 3"
 */
function buildSectionLabel(board) {
  const label = penpot.createText("Your shortlist · 3 of 3");
  label.fontSize = 14;
  label.fontWeight = "700";
  label.fills = [{ fillColor: "#64748B", fillOpacity: 1 }];
  board.appendChild(label);
}

/*
 * Calls 4-5 — 3 neighborhood cards (factored as makeCard)
 */
function makeCard(parent, name, city) {
  const card = penpot.createBoard();
  card.name = `Card - ${name}`;
  card.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  card.strokes = [{ strokeColor: "#E2E8F0", strokeOpacity: 1, strokeStyle: "solid" }];
  card.borderRadius = 12;
  card.resize(672, 104);
  penpotUtils.addFlexLayout(card, "row");
  card.flex.paddingTop = 20;
  card.flex.paddingBottom = 20;
  card.flex.paddingLeft = 24;
  card.flex.paddingRight = 24;
  card.flex.columnGap = 20;
  card.flex.counterAlign = "center";
  card.flex.alignItems = "center";
  parent.appendChild(card);
  card.layoutChild.horizontalSizing = "fill";

  const mapThumb = penpot.createRectangle();
  mapThumb.name = "Map thumb";
  mapThumb.resize(64, 64);
  mapThumb.fills = [{ fillColor: "#E2E8F0", fillOpacity: 1 }];
  mapThumb.borderRadius = 10;
  card.appendChild(mapThumb);

  const textCol = penpot.createBoard();
  textCol.fills = [];
  textCol.resize(500, 64);
  card.appendChild(textCol);
  textCol.layoutChild.horizontalSizing = "fill";

  const nameText = penpot.createText(name);
  nameText.fontSize = 18;
  nameText.fontWeight = "700";
  nameText.fills = [{ fillColor: "#0F172A", fillOpacity: 1 }];
  textCol.appendChild(nameText);
  penpotUtils.setParentXY(nameText, 0, 8);

  const cityText = penpot.createText(city);
  cityText.fontSize = 14;
  cityText.fills = [{ fillColor: "#64748B", fillOpacity: 1 }];
  textCol.appendChild(cityText);
  penpotUtils.setParentXY(cityText, 0, 36);

  const xBtn = penpot.createRectangle();
  xBtn.resize(40, 40);
  xBtn.fills = [{ fillColor: "#E2E8F0", fillOpacity: 1 }];
  xBtn.borderRadius = 20;
  card.appendChild(xBtn);
}

/*
 * Call 6 — Compare button at bottom (group: bg + text)
 */
function buildCompareButton(board) {
  const compareGroup = penpot.createBoard();
  compareGroup.name = "Compare button";
  compareGroup.fills = [];
  compareGroup.resize(672, 56);
  board.appendChild(compareGroup);
  compareGroup.layoutChild.horizontalSizing = "fill";

  const compareBg = penpot.createRectangle();
  compareBg.resize(672, 56);
  compareBg.fills = [{ fillColor: "#059669", fillOpacity: 1 }];
  compareBg.borderRadius = 10;
  compareGroup.appendChild(compareBg);

  const compareText = penpot.createText("Compare 3 neighborhoods");
  compareText.fontSize = 16;
  compareText.fontWeight = "700";
  compareText.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  compareGroup.appendChild(compareText);
  penpotUtils.setParentXY(compareText, 247, 19);
}

/* ── Run sequence to rebuild Screen 1 ──
// const board = buildScreen1Base();
// buildSearchRow(board);
// buildSectionLabel(board);
// makeCard(board, "Indiranagar", "Bangalore, KA");
// makeCard(board, "Koramangala", "Bangalore, KA");
// makeCard(board, "Whitefield", "Bangalore, KA");
// buildCompareButton(board);
*/


// =============================================================
// SCREEN 2: COMPARE
// =============================================================

/*
 * Call 1 — Board + header bar with title + Edit shortlist button
 */
function buildScreen2Base() {
  const board = penpot.createBoard();
  board.name = "Screen 2 - Compare";
  board.x = 1000;
  board.y = 100;
  board.resize(900, 1654);
  board.fills = [{ fillColor: "#F8FAFC", fillOpacity: 1 }];
  penpotUtils.addFlexLayout(board, "column");
  board.flex.paddingTop = 32;
  board.flex.paddingBottom = 32;
  board.flex.paddingLeft = 32;
  board.flex.paddingRight = 32;
  board.flex.rowGap = 24;

  const headerRow = penpot.createBoard();
  headerRow.name = "Header Row";
  headerRow.fills = [];
  headerRow.resize(836, 56);
  penpotUtils.addFlexLayout(headerRow, "row");
  headerRow.flex.columnGap = 16;
  headerRow.flex.counterAlign = "center";
  headerRow.flex.alignItems = "center";
  board.appendChild(headerRow);
  headerRow.layoutChild.horizontalSizing = "fill";

  const title = penpot.createText("Compare neighborhoods");
  title.fontSize = 28;
  title.fontWeight = "700";
  title.fills = [{ fillColor: "#0F172A", fillOpacity: 1 }];
  headerRow.appendChild(title);

  const spacer = penpot.createBoard();
  spacer.fills = [];
  spacer.resize(400, 40);
  headerRow.appendChild(spacer);
  spacer.layoutChild.horizontalSizing = "fill";

  const editBtn = penpot.createBoard();
  editBtn.name = "Edit shortlist";
  editBtn.fills = [];
  editBtn.resize(140, 40);
  headerRow.appendChild(editBtn);
  const editBg = penpot.createRectangle();
  editBg.resize(140, 40);
  editBg.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  editBg.strokes = [{ strokeColor: "#CBD5E1", strokeOpacity: 1, strokeStyle: "solid" }];
  editBg.borderRadius = 8;
  editBtn.appendChild(editBg);
  const editText = penpot.createText("Edit shortlist");
  editText.fontSize = 14;
  editText.fontWeight = "700";
  editText.fills = [{ fillColor: "#475569", fillOpacity: 1 }];
  editBtn.appendChild(editText);
  penpotUtils.setParentXY(editText, 20, 11);

  return board;
}

/*
 * Call 2 — Weight sliders card (Parks, Schools, Safety)
 */
function makeSliderRow(parent, label, value, color, indent = 0) {
  const row = penpot.createBoard();
  row.fills = [];
  row.resize(788 - indent, 24);
  penpotUtils.addFlexLayout(row, "row");
  row.flex.columnGap = 16;
  row.flex.counterAlign = "center";
  row.flex.alignItems = "center";
  parent.appendChild(row);
  row.layoutChild.horizontalSizing = "fill";

  const lbl = penpot.createText(label);
  lbl.fontSize = 13;
  lbl.fontWeight = "700";
  lbl.fills = [{ fillColor: "#475569", fillOpacity: 1 }];
  row.appendChild(lbl);

  const track = penpot.createBoard();
  track.fills = [{ fillColor: "#E2E8F0", fillOpacity: 1 }];
  track.resize(500, 8);
  track.borderRadius = 4;
  row.appendChild(track);
  track.layoutChild.horizontalSizing = "fill";

  const fillBar = penpot.createRectangle();
  fillBar.resize(Math.round(500 * value), 8);
  fillBar.fills = [{ fillColor: color, fillOpacity: 1 }];
  fillBar.borderRadius = 4;
  track.appendChild(fillBar);
  penpotUtils.setParentXY(fillBar, 0, 0);

  const valText = penpot.createText(value.toFixed(2));
  valText.fontSize = 13;
  valText.fontWeight = "700";
  valText.fills = [{ fillColor: "#0F172A", fillOpacity: 1 }];
  row.appendChild(valText);

  return row;
}

function buildWeightsCard(board) {
  const slidersCard = penpot.createBoard();
  slidersCard.name = "Weights Card";
  slidersCard.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  slidersCard.strokes = [{ strokeColor: "#E2E8F0", strokeOpacity: 1, strokeStyle: "solid" }];
  slidersCard.borderRadius = 12;
  slidersCard.resize(836, 210);
  penpotUtils.addFlexLayout(slidersCard, "column");
  slidersCard.flex.paddingTop = 20;
  slidersCard.flex.paddingBottom = 20;
  slidersCard.flex.paddingLeft = 24;
  slidersCard.flex.paddingRight = 24;
  slidersCard.flex.rowGap = 12;
  board.appendChild(slidersCard);
  slidersCard.layoutChild.horizontalSizing = "fill";

  const title = penpot.createText("Ranking priorities (auto-rebalance to sum 1.0)");
  title.fontSize = 14;
  title.fontWeight = "700";
  title.fills = [{ fillColor: "#0F172A", fillOpacity: 1 }];
  slidersCard.appendChild(title);

  makeSliderRow(slidersCard, "Parks", 0.40, "#059669");
  makeSliderRow(slidersCard, "Schools", 0.35, "#0EA5E9");
  makeSliderRow(slidersCard, "Safety", 0.25, "#F59E0B");
}

/*
 * Call 3 — Ranking card with medals + score badges
 */
function buildRankingCard(board) {
  const rankingCard = penpot.createBoard();
  rankingCard.name = "Ranking Card";
  rankingCard.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  rankingCard.strokes = [{ strokeColor: "#E2E8F0", strokeOpacity: 1, strokeStyle: "solid" }];
  rankingCard.borderRadius = 12;
  rankingCard.resize(836, 200);
  penpotUtils.addFlexLayout(rankingCard, "column");
  rankingCard.flex.paddingTop = 20;
  rankingCard.flex.paddingBottom = 20;
  rankingCard.flex.paddingLeft = 24;
  rankingCard.flex.paddingRight = 24;
  rankingCard.flex.rowGap = 12;
  board.appendChild(rankingCard);
  rankingCard.layoutChild.horizontalSizing = "fill";

  const title = penpot.createText("Best for your priorities");
  title.fontSize = 14;
  title.fontWeight = "700";
  title.fills = [{ fillColor: "#0F172A", fillOpacity: 1 }];
  rankingCard.appendChild(title);

  function makeRank(medal, name, score, color) {
    const row = penpot.createBoard();
    row.fills = [];
    row.resize(788, 40);
    penpotUtils.addFlexLayout(row, "row");
    row.flex.columnGap = 16;
    row.flex.counterAlign = "center";
    row.flex.alignItems = "center";
    rankingCard.appendChild(row);
    row.layoutChild.horizontalSizing = "fill";

    const med = penpot.createText(medal);
    med.fontSize = 28;
    row.appendChild(med);

    const nm = penpot.createText(name);
    nm.fontSize = 18;
    nm.fontWeight = "700";
    nm.fills = [{ fillColor: "#0F172A", fillOpacity: 1 }];
    row.appendChild(nm);

    const sp = penpot.createBoard();
    sp.fills = [];
    sp.resize(80, 20);  // narrower spacer
    row.appendChild(sp);

    const sc = penpot.createBoard();
    sc.fills = [{ fillColor: color, fillOpacity: 1 }];
    sc.resize(88, 32);
    sc.borderRadius = 16;
    row.appendChild(sc);
    const scText = penpot.createText(score);
    scText.fontSize = 14;
    scText.fontWeight = "700";
    scText.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
    sc.appendChild(scText);
    penpotUtils.setParentXY(scText, 18, 8);
  }

  makeRank("🥇", "Indiranagar", "8.7 / 10", "#059669");
  makeRank("🥈", "Koramangala", "8.2 / 10", "#0EA5E9");
  makeRank("🥉", "Whitefield", "7.5 / 10", "#F59E0B");
}

/*
 * Call 4 — Tabs nav (Table / Map / Detail, Table active)
 */
function makeTab(parent, label, active) {
  const tab = penpot.createBoard();
  tab.name = active ? `Tab - ${label} (active)` : `Tab - ${label}`;
  tab.fills = [{ fillColor: active ? "#FFFFFF" : "#F1F5F9", fillOpacity: 1 }];
  tab.strokes = [{ strokeColor: "#E2E8F0", strokeOpacity: 1, strokeStyle: "solid" }];
  tab.resize(140, 48);
  tab.borderRadius = 8;
  penpotUtils.addFlexLayout(tab, "column");
  tab.flex.counterAlign = "center";
  tab.flex.alignItems = "center";
  tab.flex.justifyContent = "center";
  parent.appendChild(tab);
  const txt = penpot.createText(label);
  txt.fontSize = 14;
  txt.fontWeight = "700";
  txt.fills = [{ fillColor: active ? "#059669" : "#64748B", fillOpacity: 1 }];
  tab.appendChild(txt);
  return tab;
}

function buildTabsNav(board) {
  const tabsNav = penpot.createBoard();
  tabsNav.name = "Tabs Nav";
  tabsNav.fills = [];
  tabsNav.resize(836, 48);
  penpotUtils.addFlexLayout(tabsNav, "row");
  tabsNav.flex.columnGap = 0;
  board.appendChild(tabsNav);
  tabsNav.layoutChild.horizontalSizing = "fill";

  makeTab(tabsNav, "Table", true);
  makeTab(tabsNav, "Map", false);
  makeTab(tabsNav, "Detail", false);
}

/*
 * Call 5 — Table tab content with 3 compare columns
 */
function makeBar(parent, label, value, color) {
  const wrap = penpot.createBoard();
  wrap.fills = [];
  wrap.resize(254, 36);
  penpotUtils.addFlexLayout(wrap, "column");
  wrap.flex.rowGap = 6;
  parent.appendChild(wrap);
  wrap.layoutChild.horizontalSizing = "fill";

  const lblRow = penpot.createBoard();
  lblRow.fills = [];
  lblRow.resize(254, 16);
  penpotUtils.addFlexLayout(lblRow, "row");
  wrap.appendChild(lblRow);
  lblRow.layoutChild.horizontalSizing = "fill";
  const lbl = penpot.createText(label);
  lbl.fontSize = 12;
  lbl.fills = [{ fillColor: "#475569", fillOpacity: 1 }];
  lblRow.appendChild(lbl);
  const sp = penpot.createBoard();
  sp.fills = [];
  sp.resize(20, 12);
  lblRow.appendChild(sp);
  sp.layoutChild.horizontalSizing = "fill";
  const val = penpot.createText(value.toFixed(1));
  val.fontSize = 12;
  val.fontWeight = "700";
  val.fills = [{ fillColor: "#0F172A", fillOpacity: 1 }];
  lblRow.appendChild(val);

  const track = penpot.createBoard();
  track.fills = [{ fillColor: "#E2E8F0", fillOpacity: 1 }];
  track.resize(254, 8);
  track.borderRadius = 4;
  wrap.appendChild(track);
  track.layoutChild.horizontalSizing = "fill";
  const fill = penpot.createRectangle();
  fill.resize(Math.round(254 * (value / 10)), 8);
  fill.fills = [{ fillColor: color, fillOpacity: 1 }];
  fill.borderRadius = 4;
  track.appendChild(fill);
  penpotUtils.setParentXY(fill, 0, 0);
}

function buildTableContent(board) {
  const tableCard = penpot.createBoard();
  tableCard.name = "Table Tab Content";
  tableCard.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  tableCard.strokes = [{ strokeColor: "#E2E8F0", strokeOpacity: 1, strokeStyle: "solid" }];
  tableCard.borderRadius = 12;
  tableCard.resize(836, 480);
  penpotUtils.addFlexLayout(tableCard, "row");
  tableCard.flex.paddingTop = 20;
  tableCard.flex.paddingBottom = 20;
  tableCard.flex.paddingLeft = 20;
  tableCard.flex.paddingRight = 20;
  tableCard.flex.columnGap = 16;
  tableCard.flex.counterAlign = "stretch";  // CHANGED: was "center", caused empty space
  tableCard.flex.alignItems = "stretch";    // CHANGED: was default, caused vertical compression
  board.appendChild(tableCard);
  tableCard.layoutChild.horizontalSizing = "fill";

  const scores = [
    { name: "Indiranagar", parks: 9.1, schools: 8.5, safety: 8.3, vibe: "Quiet, leafy, strong schools." },
    { name: "Koramangala", parks: 8.5, schools: 8.0, safety: 8.0, vibe: "Walkable, diverse, central." },
    { name: "Whitefield", parks: 7.8, schools: 7.2, safety: 8.6, vibe: "Newer, gated, quieter." }
  ];

  for (const s of scores) {
    const col = penpot.createBoard();
    col.fills = [];
    penpotUtils.addFlexLayout(col, "column");
    col.flex.rowGap = 12;
    tableCard.appendChild(col);
    col.layoutChild.horizontalSizing = "fill";   // CHANGED: was fixed 254 width, caused empty space
    col.layoutChild.verticalSizing = "fill";

    const nm = penpot.createText(s.name);
    nm.fontSize = 18;
    nm.fontWeight = "700";
    nm.fills = [{ fillColor: "#0F172A", fillOpacity: 1 }];
    col.appendChild(nm);

    makeBar(col, "Parks", s.parks, "#059669");
    makeBar(col, "Schools", s.schools, "#0EA5E9");
    makeBar(col, "Safety", s.safety, "#F59E0B");

    const vibeLabel = penpot.createText("Vibe");
    vibeLabel.fontSize = 12;
    vibeLabel.fills = [{ fillColor: "#475569", fillOpacity: 1 }];
    col.appendChild(vibeLabel);

    const vibe = penpot.createText(s.vibe);
    vibe.fontSize = 13;
    vibe.fills = [{ fillColor: "#0F172A", fillOpacity: 1 }];
    col.appendChild(vibe);
    vibe.layoutChild.horizontalSizing = "fill";
  }
}

/*
 * Calls 6-7 — Map + Detail tab placeholders
 */
function buildTabPlaceholder(board, label, content) {
  const card = penpot.createBoard();
  card.name = `${label} Tab Placeholder`;
  card.fills = [{ fillColor: "#FFFFFF", fillOpacity: 1 }];
  card.strokes = [{ strokeColor: "#E2E8F0", strokeOpacity: 1, strokeStyle: "solid" }];
  card.borderRadius = 12;
  card.resize(836, 200);
  penpotUtils.addFlexLayout(card, "column");
  card.flex.paddingTop = 24;
  card.flex.paddingBottom = 24;
  card.flex.paddingLeft = 32;
  card.flex.paddingRight = 32;
  card.flex.rowGap = 8;
  board.appendChild(card);
  card.layoutChild.horizontalSizing = "fill";

  const title = penpot.createText(`${label.toUpperCase()} VIEW (inactive tab)`);
  title.fontSize = 12;
  title.fontWeight = "700";
  title.fills = [{ fillColor: "#94A3B8", fillOpacity: 1 }];
  card.appendChild(title);

  const desc = penpot.createText(content);
  desc.fontSize = 14;
  desc.fills = [{ fillColor: "#64748B", fillOpacity: 1 }];
  card.appendChild(desc);
  desc.layoutChild.horizontalSizing = "fill";
}

/* ── Run sequence to rebuild Screen 2 ──
// const board = buildScreen2Base();
// buildWeightsCard(board);
// buildRankingCard(board);
// buildTabsNav(board);
// buildTableContent(board);
// buildTabPlaceholder(board, "Map", "Full-width Google Map with 3 pinned neighborhoods...");
// buildTabPlaceholder(board, "Detail", "Deep neighborhood profile...");
*/


// =============================================================
// PRODUCTION NOTES (from this build's failures)
// =============================================================
//
// 1. Penpot API uses `topPadding`, `leftPadding`, `bottomPadding`, `rightPadding`
//    — NOT `paddingTop`, `paddingLeft`, etc. Wrong names are silent no-ops.
//
// 2. Use `penpotUtils.addFlexLayout(board, dir)` (not `board.addFlexLayout`) when
//    the board already has children — preserves their visual order.
//
// 3. For text on top of buttons/rectangles:
//    - Create a parent board (group)
//    - Add rectangle as child
//    - Add text as child
//    - Use `penpotUtils.setParentXY(text, x, y)` for relative positioning
//    Flex layout will split them into separate flex items; group keeps them
//    visually together.
//
// 4. Long execute_code calls (8+ shapes, nested layouts) can wedge the plugin.
//    Break into smaller calls of 2-3 shapes each. If plugin gets stuck,
//    refresh the Penpot browser tab to reset.
//
// 5. `layoutChild` only exists after a shape is added to a flex container.
//    Setting it before appendChild throws "Cannot set properties of null".
//
// 6. `countSizing = "fill"` requires the parent flex container to have been
//    set up first. Set parent's addFlexLayout before children's layoutChild.
//
// 7. For visual mockups of "inactive" tabs, build them all visibly with a
//    small label like "MAP VIEW (inactive tab)" so reviewers see them in
//    screenshots. Hiding them defeats the design review purpose.
//
// 8. Only font weights `300`, `400`, `700` are reliably available in Penpot's
//    font set. Avoid 500, 600, 800, or "bold" string — they error or are
//    silently dropped.
//
// 9. For dashed strokes, set `strokeStyle: "dashed"` on the Stroke object —
//    not `dashPattern` on the Rectangle. `dashPattern` is read-only on
//    standard Rectangle shapes (Ppt throws "object is not extensible").
//
