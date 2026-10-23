// Ein Profispiel: Anzeigetafel wie im Stream (Türme, Gold, Kills, Drachen, Barone, Inhibitoren), beide Teams als Lane-Paare mit Items,
// K/D/A, CS, Gold und Schadensanteil, daneben Vergleich und Ticker, unten der Goldverlauf. Gefärbt in den Wappenfarben beider Teams.
// Eigene Umsetzung derselben Ansicht wie in der echten App (dort viz.ts, game.ts, goldchart.ts).
import { champImg, champName, DRAGON, itemImg, itemName, ROLE, tileImg } from "./dd.js";
import { dragonIcon, icon } from "./icons.js";
import { card, clock, el, faint, img, kilo, pct } from "./ui.js";
import { teamBy } from "./world.js";

// ---------- Seitenfarben aus den Wappen ----------
const BLUE = "#5aa9ff", RED = "#ff5f66";
const toHsl = (hex) => {
  const n = parseInt(hex.slice(1), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const toHex = ([h, s, l]) => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return `#${[r, g, b].map((v) => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("")}`;
};
const cl = (v, a, b) => Math.min(b, Math.max(a, v));
const legible = (hex) => { const [h, s, l] = toHsl(hex); return toHex([h, cl(s, 0.55, 0.95), cl(l, 0.56, 0.7)]); };
const hueDist = (a, b) => { const d = Math.abs(toHsl(a)[0] - toHsl(b)[0]) % 360; return Math.min(d, 360 - d); };
function sidePair(ta, tb) {
  let a = ta ? legible(ta.c1) : "", b = tb ? legible(tb.c1) : "";
  if (a && b && hueDist(a, b) < 40) { const b2 = legible(tb.c2); const a2 = legible(ta.c2); if (hueDist(a, b2) >= 40) b = b2; else if (hueDist(a2, b) >= 40) a = a2; else b = ""; }
  const fallback = (other, pref) => (!other ? pref : hueDist(other, BLUE) >= hueDist(other, RED) ? BLUE : RED);
  if (!a) a = fallback(b, BLUE);
  if (!b) b = fallback(a, RED);
  if (a === b) b = a === BLUE ? RED : BLUE;
  return { a, b };
}

// ---------- Anzeigetafel ----------
function scoreHeader(a, b, time, state, meta, center) {
  const box = el("section", "sh n-card");
  const band = el("div", "sh-band");
  const team = (t, s) => {
    const d = el("div", `sh-team ${s}${t.result ? ` ${t.result}` : ""}`);
    if (t.logo) d.append(img(t.logo, "logo sh-logo", t.name, t.code));
    const id = el("div", "sh-id");
    id.append(el("b", "sh-code", t.code || t.name));
    if (t.result) id.append(el("span", "sh-res", t.result === "win" ? "Sieg" : "Niederlage"));
    else if (t.name && t.name !== t.code) id.append(el("span", "sh-name", t.name));
    d.append(id);
    return d;
  };
  const stat = (key, v, lead, s, title) => { const d = el("span", `sh-stat ${s}${lead ? " lead" : ""}`); d.title = title; d.append(icon(key, s), el("b", "n-num", v)); return d; };
  const stats = (t, o, s) => { const d = el("div", `sh-stats ${s}`); d.append(stat("tower", String(t.towers), t.towers > o.towers, s, "Türme"), stat("gold", kilo(t.gold), t.gold > o.gold, s, "Gold")); return d; };
  const kills = el("div", "sh-kills");
  const k = (t, o, s) => el("b", `sh-k n-num ${s}${t.kills > o.kills ? " lead" : ""}`, t.kills);
  const mid = el("span", "sh-center");
  mid.append(center ?? icon("kills"));
  kills.append(k(a, b, "blue"), mid, k(b, a, "red"));
  band.append(team(a, "blue"), stats(a, b, "blue"), kills, stats(b, a, "red"), team(b, "red"));

  const sub = el("div", "sh-sub");
  const objs = (t, s) => {
    const d = el("div", `sh-objs ${s}`);
    const add = (key, v, title) => { if (v == null) return; const o = el("span", `sh-obj${v ? "" : " none"}`); o.title = title; o.append(icon(key, s), el("b", "n-num", v)); d.append(o); };
    add("baron", t.barons, "Baron Nashor");
    add("inhib", t.inhibs, "Inhibitoren");
    return d;
  };
  const drakes = (t, s) => {
    const d = el("div", `sh-drakes ${s}`);
    for (const x of t.dragons) d.append(icon(dragonIcon(x)));
    if (!t.dragons.length) d.append(el("span", "sh-none", "–"));
    return d;
  };
  const time_ = el("div", "sh-time");
  time_.append(el("b", "sh-clock n-num", clock(time)));
  if (state) time_.append(el("span", `sh-state ${state}`, state === "live" ? "Live" : state === "paused" ? "Pause" : ""));
  const center_ = el("div", "sh-mid");
  center_.append(drakes(a, "blue"), time_, drakes(b, "red"));
  sub.append(objs(a, "blue"), center_, objs(b, "red"));
  box.append(band, sub);
  if (meta) box.append(el("div", "sh-meta", meta));
  return box;
}

// ---------- Vergleich ----------
function compareTable(title, rows) {
  const box = el("section", "card n-card cmp");
  const h = el("div", "c-head");
  h.append(el("span", "n-eyebrow", title));
  box.append(h);
  for (const r of rows) {
    const lead = r.av == null || r.bv == null || r.av === r.bv ? "" : r.av > r.bv ? "blue" : "red";
    const row = el("div", `cmp-row${lead ? ` lead-${lead}` : ""}`);
    const val = (v, s) => { const d = el("div", `cmp-v ${s}`); d.append(el("b", "n-num", v)); return d; };
    const lab = el("div", "cmp-l");
    if (r.icon) lab.append(typeof r.icon === "string" ? icon(r.icon) : r.icon);
    lab.append(el("span", "", r.label));
    row.append(val(r.a, "blue"), lab, val(r.b, "red"));
    if (r.av != null && r.bv != null && r.av + r.bv > 0) { const bar = el("div", "cmp-bar"); bar.style.setProperty("--a", String(r.av / (r.av + r.bv))); row.append(bar); }
    box.append(row);
  }
  return box;
}

// ---------- Lane-Paare ----------
function laneRows(title, pairs, opts = {}) {
  const box = el("section", "card n-card lanes");
  const h = el("div", "c-head ln-head");
  h.append(el("span", "n-eyebrow blue", opts.labels[0]), el("span", "n-eyebrow", title), el("span", "n-eyebrow red", opts.labels[1]));
  box.append(h);
  const maxDmg = Math.max(1, ...pairs.flatMap(([a, b]) => [a?.dmg ?? 0, b?.dmg ?? 0]));
  pairs.forEach(([a, b], i) => {
    const row = el("div", "ln-row");
    row.dataset.key = `ln${i}`;
    const half = (x, s) => {
      const d = el("div", `ln-half ${s}${x?.dead ? " dead" : ""}`);
      if (!x) return d;
      const items = el("div", "ln-items");
      for (let k = 0; k < 6; k++) { const id = x.items[k]; items.append(id ? img(itemImg(id), "item", itemName(id), "") : el("i", "item empty")); }
      const who = el("div", "ln-who");
      who.append(el("b", "ln-name", x.name), el("span", "ln-line n-num", `${x.kda} · ${x.cs} CS · ${kilo(x.gold)}`));
      const bar = el("div", "ln-dmg");
      bar.title = `Schaden an Champions: ${x.dmgLabel}`;
      const fill = el("i", "");
      fill.style.setProperty("--w", String(x.dmg / maxDmg));
      bar.append(fill);
      who.append(bar);
      const ch = el("div", "ln-slice");
      ch.style.backgroundImage = `url("${tileImg(x.champion)}")`;
      ch.title = champName(x.champion);
      if (x.level) ch.append(el("span", "ln-lvl n-num", x.level));
      d.append(items, who, ch);
      return d;
    };
    const diff = (a?.gold ?? 0) - (b?.gold ?? 0);
    const mid = el("div", `ln-mid ${diff > 0 ? "blue" : diff < 0 ? "red" : ""}`);
    mid.append(el("b", "n-num", `${diff > 0 ? "◂ " : ""}${diff ? kilo(Math.abs(diff)) : "±0"}${diff < 0 ? " ▸" : ""}`));
    if (opts.roles?.[i]) mid.append(el("span", "ln-role", opts.roles[i]));
    row.append(half(a, "blue"), mid, half(b, "red"));
    box.append(row);
  });
  return box;
}

/** Tafel oben, Spieler links, Vergleich und Ticker rechts, Goldverlauf unten über die Breite */
function analysis(parts, colors, key) {
  const box = el("div", "ga");
  box.dataset.key = key;
  box.style.setProperty("--blue", colors.a);
  box.style.setProperty("--red", colors.b);
  const grid = el("div", "ga-in");
  const side = el("div", "ga-side");
  side.append(...parts.side);
  parts.head.classList.add("ga-head");
  parts.lanes.classList.add("ga-lanes");
  grid.append(parts.head, parts.lanes, side);
  if (parts.chart) { parts.chart.classList.add("ga-chart"); grid.append(parts.chart); }
  box.append(grid);
  return box;
}

// ---------- Goldverlauf ----------
const W = 1000, HH = 200, NS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v)); return e; };

export class GoldChart {
  constructor() {
    this.names = { blue: "Blau", red: "Rot" };
    this.points = []; this.maxT = 1; this.maxAbs = 3000;
    this.root = el("div", "gold");
    this.plot = svg("svg", { viewBox: `0 0 ${W} ${HH}`, preserveAspectRatio: "none", class: "gold-svg" });
    this.areaB = svg("path", { class: "gold-area blue", "clip-path": "url(#gold-top)" });
    this.areaR = svg("path", { class: "gold-area red", "clip-path": "url(#gold-bottom)" });
    this.line = svg("path", { class: "gold-line", "vector-effect": "non-scaling-stroke" });
    this.marks = el("div", "gold-marks");
    this.axis = el("div", "gold-axis");
    this.grid = el("div", "gold-grid");
    this.scaleTop = el("span", "gold-scale hi");
    this.scaleBottom = el("span", "gold-scale lo");
    this.cursor = el("div", "gold-cursor");
    this.pill = el("div", "gold-pill n-glass n-liquid");
    this.root.dataset.keep = "";
    const defs = svg("defs");
    const clip = (id, y) => { const c = svg("clipPath", { id }); c.append(svg("rect", { x: 0, y, width: W, height: HH / 2 })); return c; };
    defs.append(clip("gold-top", 0), clip("gold-bottom", HH / 2));
    this.plot.append(defs, svg("line", { x1: 0, x2: W, y1: HH / 2, y2: HH / 2, class: "gold-zero", "vector-effect": "non-scaling-stroke" }), this.areaB, this.areaR, this.line);
    this.cursor.hidden = this.pill.hidden = true;
    const box = el("div", "gold-box");
    box.append(this.grid, this.plot, this.marks, this.cursor, this.pill, this.scaleTop, this.scaleBottom);
    this.root.append(box, this.axis);
    box.addEventListener("pointermove", (e) => this.hover(e, box));
    box.addEventListener("pointerleave", () => { this.cursor.hidden = this.pill.hidden = true; });
  }

  setNames(blue, red) { this.names = { blue, red }; }

  update(points, events, clockS) {
    this.points = points;
    this.maxT = Math.max(clockS, points.at(-1)?.t ?? 0, 60);
    const diffs = points.map((p) => p.blue - p.red);
    this.maxAbs = Math.max(3000, ...diffs.map((d) => Math.abs(d) * 1.15));
    const x = (t) => (t / this.maxT) * W, y = (d) => HH / 2 - (d / this.maxAbs) * (HH / 2);
    if (points.length < 2) { for (const p of [this.line, this.areaB, this.areaR]) p.setAttribute("d", ""); }
    else {
      const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.blue - p.red).toFixed(1)}`).join(" ");
      const area = `${line} L${x(points.at(-1).t).toFixed(1)} ${HH / 2} L${x(points[0].t).toFixed(1)} ${HH / 2} Z`;
      this.line.setAttribute("d", line); this.areaB.setAttribute("d", area); this.areaR.setAttribute("d", area);
    }
    this.scaleTop.textContent = `${this.names.blue} +${kilo(Math.round(this.maxAbs))}`;
    this.scaleBottom.textContent = `${this.names.red} +${kilo(Math.round(this.maxAbs))}`;
    this.marks.replaceChildren(...events.filter((e) => ["dragon", "baron", "inhibitor", "end"].includes(e.kind)).map((e) => {
      const m = el("span", `gold-mark ic ${e.kind} ${e.side}`);
      m.style.left = `${(e.t / this.maxT) * 100}%`;
      const key = e.kind === "dragon" ? dragonIcon(e.detail) : e.kind === "inhibitor" ? "inhib" : e.kind === "end" ? "nexus" : e.kind;
      m.append(icon(key, e.side === "red" ? "red" : "blue"));
      const who = e.side === "blue" ? this.names.blue : this.names.red;
      m.title = `${clock(e.t)} · ${who}: ${e.kind === "dragon" ? DRAGON[e.detail]?.name ?? "Drache" : e.kind === "baron" ? "Baron Nashor" : e.kind === "inhibitor" ? "Inhibitor" : "Sieg"}`;
      return m;
    }));
    const step = this.maxT > 45 * 60 ? 600 : 300;
    const ticks = [];
    for (let t = step; t < this.maxT; t += step) { const s = el("span", "", `${t / 60}`); s.style.left = `${(t / this.maxT) * 100}%`; ticks.push(s); }
    this.axis.replaceChildren(...ticks);
    this.grid.replaceChildren(...ticks.map((t) => { const g = el("i", ""); g.style.left = t.style.left; return g; }));
  }

  hover(e, box) {
    if (this.points.length < 2) return;
    const r = box.getBoundingClientRect();
    const t = ((e.clientX - r.left) / r.width) * this.maxT;
    let best = this.points[0];
    for (const p of this.points) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
    const fx = best.t / this.maxT, d = best.blue - best.red;
    this.cursor.hidden = this.pill.hidden = false;
    this.cursor.style.left = `${fx * 100}%`;
    const lead = d === 0 ? "ausgeglichen" : `${d > 0 ? this.names.blue : this.names.red} +${kilo(Math.abs(d))}`;
    this.pill.replaceChildren(el("b", "n-num", clock(best.t)), el("span", `lead ${d >= 0 ? "blue" : "red"}`, lead), el("span", "faint n-num", `${kilo(best.blue)} : ${kilo(best.red)}`));
    const pw = this.pill.offsetWidth || 160;
    this.pill.style.left = `${Math.min(Math.max(fx * r.width - pw / 2, 4), r.width - pw - 4)}px`;
  }
}

const charts = new Map();
export function chartFor(id) {
  let c = charts.get(id);
  if (!c) { if (charts.size > 6) charts.clear(); c = new GoldChart(); charts.set(id, c); }
  return c;
}

// ---------- Ticker ----------
const MULTI = ["", "Kill", "Doppelkill", "Triple Kill", "Quadra Kill", "Pentakill"];
function evText(c, e, firstKill) {
  const who = c.code(e.side);
  switch (e.kind) {
    case "kill": {
      const m = c.meta(e.pid);
      const name = m ? `${m.name.replace(/^\S+\s/, "")} (${champName(m.champion)})` : who;
      if (firstKill) return `Erster Kill: ${name}`;
      if (e.precise && e.count >= 2 && e.count <= 5) return `${MULTI[e.count]}: ${name}`;
      return e.count > 1 ? `${name}: ${e.count} Kills` : `Kill: ${name}`;
    }
    case "tower": return `${who} zerstört ${e.count > 1 ? `${e.count} Türme` : "einen Turm"}`;
    case "inhibitor": return `${who} zerstört ${e.count > 1 ? `${e.count} Inhibitoren` : "einen Inhibitor"}`;
    case "dragon": return `${who} erlegt ${DRAGON[e.detail]?.acc ?? "einen Drachen"}`;
    case "baron": return `${who} erlegt Baron Nashor`;
    case "end": return `${who} gewinnt das Spiel`;
    default: return e.kind;
  }
}

const seenTk = new Map(); // je Spiel: schon gezeigte Zeilen (nur neue blenden ein)
function ticker(c) {
  const seen = seenTk.get(c.g.id) ?? new Set(), first = !seenTk.has(c.g.id);
  seenTk.set(c.g.id, seen);
  const box = card("Ticker", `${c.g.events.length} Ereignisse`, "ticker");
  const list = el("ol", "tk-list");
  const firstKill = c.g.events.find((e) => e.kind === "kill");
  const evs = [...c.g.events].reverse();
  for (const e of evs) {
    const li = el("li", `tk ${e.kind} ${e.side}`);
    li.dataset.key = `${e.t}-${e.kind}-${e.side}-${e.pid}-${e.detail}`;
    if (!first && !seen.has(li.dataset.key)) li.classList.add("new");
    seen.add(li.dataset.key);
    const key = e.kind === "dragon" ? dragonIcon(e.detail) : { baron: "baron", tower: "tower", inhibitor: "inhib", end: "nexus" }[e.kind];
    const dot = key ? icon(key, e.side === "red" ? "red" : "blue") : el("i", "tk-dot");
    li.append(el("span", "tk-t n-num", clock(e.t)), dot);
    const m = e.kind === "kill" ? c.meta(e.pid) : undefined;
    if (m) li.append(img(champImg(m.champion), "tk-champ", champName(m.champion), ""));
    li.append(el("span", "tk-x", evText(c, e, e === firstKill)));
    list.append(li);
  }
  if (!evs.length) list.append(el("li", "faint", "Noch nichts passiert."));
  box.append(list);
  return box;
}

/** Inhalt des Spiels: Anzeigetafel, Spieler, Vergleich und Ticker, Goldverlauf — in Wappenfarben */
export function gameView(g, s) {
  const byId = new Map(s.teams.map((t) => [t.id, t]));
  const teamOf = (side) => byId.get(side === "blue" ? g.blue.team_id : g.red.team_id);
  const all = [...g.blue.players, ...g.red.players];
  const [bt, rt] = [teamOf("blue"), teamOf("red")];
  const code = (side) => (side === "blue" ? bt : rt)?.code || (side === "red" ? "Rot" : "Blau");
  const c = { g, code: (sd) => code(sd === "red" ? "red" : "blue"), meta: (pid) => all.find((m) => m.pid === pid) };
  const stat = (pid) => g.players.find((p) => p.pid === pid);
  const short = (n) => n.replace(/^\S+\s/, "");
  const colors = sidePair(bt && teamBy(bt.slug), rt && teamBy(rt.slug));

  const lead = g.blue_totals.gold - g.red_totals.gold;
  const res = (side) => (g.winner ? (g.winner === side ? "win" : "loss") : "");
  const [B, R] = [g.blue_totals, g.red_totals];
  const side = (t, x, sd) => ({ name: t?.name ?? (sd === "blue" ? "Blau" : "Rot"), code: code(sd), logo: t?.image, result: res(sd), kills: x.kills, gold: x.gold, towers: x.towers, dragons: x.dragons, barons: x.barons, inhibs: x.inhibitors });
  const center = s.league_image ? img(s.league_image, "logo sh-league", s.league_name, "") : undefined;
  const head = scoreHeader(side(bt, B, "blue"), side(rt, R, "red"), g.clock, g.state === "in_game" ? "live" : "",
    `${lead === 0 ? "Gold ausgeglichen" : `${code(lead > 0 ? "blue" : "red")} +${kilo(Math.abs(lead))} Gold`}${g.patch ? ` · Patch ${g.patch}` : ""}`, center);

  const chart = chartFor(g.id);
  chart.setNames(code("blue"), code("red"));
  chart.update(g.points, g.events, g.clock);
  const gold = card("Goldvorsprung und Ereignisse", `${code("blue")} oben · ${code("red")} unten`, "gold-card");
  gold.append(chart.root);

  const sum = (sd, f) => (sd === "blue" ? g.blue : g.red).players.reduce((acc, m) => { const st = stat(m.pid); return acc + (st ? f(st) : 0); }, 0);
  const kda = (sd) => `${sum(sd, (p) => p.kills)}/${sum(sd, (p) => p.deaths)}/${sum(sd, (p) => p.assists)}`;
  const cmp = compareTable("Vergleich", [
    { label: "K/D/A", icon: "kills", a: kda("blue"), b: kda("red"), av: B.kills, bv: R.kills },
    { label: "Gold", icon: "gold", a: kilo(B.gold), b: kilo(R.gold), av: B.gold, bv: R.gold },
    { label: "CS", icon: "wave", a: String(sum("blue", (p) => p.cs)), b: String(sum("red", (p) => p.cs)), av: sum("blue", (p) => p.cs), bv: sum("red", (p) => p.cs) },
    { label: "Türme", icon: icon("tower"), a: String(B.towers), b: String(R.towers), av: B.towers, bv: R.towers },
    { label: "Drachen", icon: "dragon", a: String(B.dragons.length), b: String(R.dragons.length), av: B.dragons.length, bv: R.dragons.length },
    { label: "Barone", icon: "baron", a: String(B.barons), b: String(R.barons), av: B.barons, bv: R.barons },
    { label: "Wards", icon: "ward", a: String(sum("blue", (p) => p.wards)), b: String(sum("red", (p) => p.wards)), av: sum("blue", (p) => p.wards), bv: sum("red", (p) => p.wards) },
  ]);

  const lane = (m) => {
    if (!m) return undefined;
    const st = stat(m.pid);
    return { champion: m.champion, name: short(m.name), level: st?.level, kda: st ? `${st.kills}/${st.deaths}/${st.assists}` : "–", cs: st?.cs ?? 0, gold: st?.gold ?? 0, items: st?.items ?? [], dmg: st?.dmg ?? 0, dmgLabel: pct(st?.dmg ?? 0), dead: !!st && st.hp_max > 0 && st.hp <= 0 && g.state === "in_game" };
  };
  const pairs = Array.from({ length: 5 }, (_, i) => [lane(g.blue.players[i]), lane(g.red.players[i])]);
  const roles = Array.from({ length: 5 }, (_, i) => ROLE[g.blue.players[i]?.role ?? ""] ?? "");
  const lanes = laneRows("Gold je Lane", pairs, { labels: [bt?.name ?? code("blue"), rt?.name ?? code("red")], roles });
  return [analysis({ head, lanes, side: [cmp, ticker(c)], chart: gold }, colors, `ga-${g.id}`)];
}

export { faint };
