// Die erfundene Welt des Nachbaus: Ligen, Teams, Spieler, Serien und Spiele. Nichts davon ist echt: Teams, Wappen und Spieler sind
// ausgedacht; nur die Champions und Items sind echte Data-Dragon-Bilder (wie in der echten App). Laufende Spiele sind eine reine
// Funktion der Uhrzeit (4 Spielsekunden je Sekunde), Serien wiederholen sich in Schleifen mit wechselnden Paarungen.
import { CHAMPS } from "./data.js";

export const rng = (seed) => { let s = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const pickFrom = (r, a) => a[Math.floor(r() * a.length)];
const shuffled = (r, a) => a.map((x) => [r(), x]).sort((p, q) => p[0] - q[0]).map((p) => p[1]);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const H = 3600e3, DAYMS = 24 * H;
const T0 = Date.now();

// ---------- Wappen ----------
const shield = (code, c1, c2) => "data:image/svg+xml," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
  `<path d="M14 10h72v42c0 22-20 33-36 40C34 85 14 74 14 52z" fill="url(#g)" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>` +
  `<text x="50" y="58" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-weight="800" font-size="${code.length > 3 ? 22 : 28}" fill="#fff">${code}</text></svg>`);
const round = (code, c1, c2) => "data:image/svg+xml," + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
  `<circle cx="50" cy="50" r="46" fill="url(#g)"/><circle cx="50" cy="50" r="39" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>` +
  `<text x="50" y="58" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-weight="800" font-size="${code.length > 2 ? 22 : 28}" fill="#fff">${code}</text></svg>`);

// ---------- Ligen und Teams ----------
export const LEAGUES = [
  ["globalcup", "Globalcup", "INTERNATIONAL", "GC", "#e3bd6d", "#6b4f12"],
  ["nordcup", "Nordcup", "EUROPE", "NC", "#5aa9ff", "#173a66"],
  ["suedliga", "Südliga", "EUROPE", "SL", "#ff7a45", "#5a2410"],
  ["praeriecup", "Präriecup", "NORTH AMERICA", "PC", "#8bd450", "#2a4a12"],
  ["ostliga", "Ostliga", "KOREA", "OL", "#c084fc", "#3b1d63"],
  ["mittelreich", "Mittelreich-Liga", "CHINA", "MR", "#ff5f66", "#5c1a1d"],
].map(([slug, name, region, ab, c1, c2]) => ({ id: `lg-${slug}`, slug, name, region, image: round(ab, c1, c2) }));
export const leagueBy = (slug) => LEAGUES.find((l) => l.slug === slug);

const TEAM_DEFS = [
  ["aet", "Aether Esports", "AET", "#4da3ff", "#1b3a66", "nordcup"], ["blw", "Blackwater", "BLW", "#8795a8", "#2a3340", "nordcup"],
  ["emb", "Emberforge", "EMB", "#f43f5e", "#5c1624", "nordcup"], ["gal", "Gale Syndicate", "GAL", "#a3e635", "#2f4a0a", "nordcup"],
  ["irv", "Ironvale", "IRV", "#d9a441", "#3f2c0b", "nordcup"], ["krk", "Krakenwatch", "KRK", "#2dd4bf", "#0e4a43", "nordcup"],
  ["cin", "Cinder Crown", "CIN", "#ff7a45", "#5a2410", "suedliga"], ["drf", "Driftline", "DRF", "#38bdf8", "#0c3b57", "suedliga"],
  ["frb", "Frostbyte", "FRB", "#67e8f9", "#164e63", "suedliga"], ["how", "Hollow Wolves", "HOW", "#c084fc", "#3b1d63", "suedliga"],
  ["jdc", "Jadeclaw", "JDC", "#34d399", "#0f4a38", "suedliga"], ["lmu", "Lumen Union", "LMU", "#fbbf24", "#5a4208", "suedliga"],
];
export const TEAMS = TEAM_DEFS.map(([id, name, code, c1, c2, league]) => ({ id: `t-${id}`, key: id, slug: id, name, code, image: shield(code, c1, c2), c1, c2, league }));
export const teamBy = (key) => TEAMS.find((t) => t.key === key || t.slug === key || t.id === key);

const FIRST = ["Jonas", "Luca", "Matteo", "Felix", "Noah", "Elias", "Paul", "Anton", "Leon", "Emil", "Jan", "Tim", "Niklas", "Ben", "Finn", "Marlon", "Yannik", "Kilian", "Mats", "Arne"];
const LAST = ["Brandt", "Kessler", "Vogel", "Lorenz", "Hartmann", "Keller", "Sander", "Wolff", "Reuter", "Falk", "Engel", "Nolte", "Berger", "Maurer", "Lindner", "Jansen", "Albrecht", "Thiel", "Haas", "Voss"];
const HANDLES = ["Nova", "Kestrel", "Mako", "Ruin", "Sable", "Tamsin", "Voss", "Lyra", "Quill", "Brisk", "Onyx", "Fenn", "Halo", "Rook", "Pike", "Dune", "Wren", "Ash", "Jory", "Cato", "Ember", "Silt", "Moss", "Reef", "Tarn", "Yarrow", "Kite", "Lark", "Gale", "Slate", "Brae", "Orrin", "Pax", "Rime", "Vale", "Wick", "Zed", "Hale", "Isk", "Nix", "Cairn", "Drift", "Echo", "Flint", "Gust", "Haze", "Iris", "Jett", "Knox", "Lumen", "Mire", "Nero", "Opal", "Pyre", "Quartz", "Riven", "Sol", "Thorn", "Umber", "Vex"];
export const ROLES = ["top", "jungle", "mid", "bottom", "support"];
export const ROSTER = Object.fromEntries(TEAMS.map((t, ti) => {
  const r = rng("roster" + t.key);
  return [t.key, ROLES.map((role, i) => ({ id: `p-${t.key}-${i}`, name: HANDLES[(ti * 5 + i) % HANDLES.length], first: pickFrom(r, FIRST), last: pickFrom(r, LAST), image: "", role }))];
}));

const mkTeam = (key, wins = 0, outcome = "", record = null) => { const t = teamBy(key); return { id: t.id, slug: t.slug, name: t.name, code: t.code, image: t.image, wins, outcome, record }; };

// ---------- Spielverlauf ----------
const W_KILL = [0.17, 0.2, 0.26, 0.29, 0.08];
const W_ASSIST = [0.15, 0.24, 0.2, 0.18, 0.23];
const DPM = [560, 430, 650, 720, 260];
const CSR = [7.9, 6.2, 8.4, 9.0, 1.1];
const GOLDW = [0.2, 0.19, 0.215, 0.235, 0.16];
const POOL = {
  top: ["Aatrox", "Camille", "Jax", "Ornn", "Gnar", "Sett", "KSante", "Renekton", "Fiora", "Gwen", "Garen", "Darius", "Riven"],
  jungle: ["LeeSin", "Viego", "Vi", "Sejuani", "Nocturne", "Elise", "Maokai", "Kindred", "JarvanIV", "XinZhao", "Pyke"],
  mid: ["Ahri", "Syndra", "Azir", "Orianna", "Viktor", "Taliyah", "Corki", "Sylas", "Akali", "Yone", "Zed", "Yasuo", "Lux"],
  bottom: ["Jinx", "Kaisa", "Ezreal", "Aphelios", "Caitlyn", "Varus", "Xayah", "Lucian", "Zeri", "Ashe", "Vayne", "Jhin"],
  support: ["Lulu", "Nautilus", "Rakan", "Alistar", "Thresh", "Braum", "Leona", "Karma", "Renata", "Milio", "Pyke"],
};
const ITEM_POOL = {
  top: [6672, 3153, 3071, 3053, 6694, 3161],
  jungle: [3742, 6655, 3157, 3181, 3071, 3068],
  mid: [6655, 3089, 3157, 3135, 3020, 3165],
  bottom: [3031, 3006, 3094, 3085, 3046, 3036],
  support: [3190, 3050, 3107, 3109, 3504, 3158],
};
const DRAKES = ["ocean", "infernal", "mountain", "cloud", "hextech", "chemtech"];
const SPEED = 4;
const scripts = new Map();

/** Drehbuch eines Spiels: alles, was darin geschieht, steht von Anfang an fest */
export function gameScript(seed, forced) {
  const key = `${seed}|${forced ?? ""}`;
  if (scripts.has(key)) return scripts.get(key);
  const r = rng(seed);
  const L = 1560 + Math.floor(r() * 420);
  const winner = forced ?? (r() < 0.5 ? "blue" : "red");
  const dir = winner === "blue" ? 1 : -1;
  const steps = Math.ceil(L / 30);
  const early = (r() - 0.5) * 1800;
  let d = 0;
  const walk = [0];
  for (let i = 1; i <= steps; i++) {
    const tt = i * 30;
    d += dir * (tt < 600 ? 30 : 115) + (r() - 0.5) * 380 + (r() < 0.08 ? (r() - 0.5) * 1500 : 0);
    walk.push(d + early * Math.max(0, 1 - tt / 900));
  }
  if (Math.sign(walk[steps]) !== dir) for (let i = 0; i <= steps; i++) walk[i] += dir * (i / steps) * (Math.abs(walk[steps]) + 2500);
  const diffAt = (t) => walk[Math.min(steps, Math.floor(t / 30))];
  const side = (t) => ((diffAt(t) >= 0) === (r() < 0.6) ? "blue" : "red");
  const wpick = (w) => { let x = r() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { x -= w[i]; if (x <= 0) return i; } return w.length - 1; };

  const evs = [];
  const push = (t, kind, sd, o = {}) => evs.push({ t: Math.round(t), side: sd, kind, pid: 0, count: 1, detail: "", precise: true, ...o });
  // Kills (mit Opfer und Helfern für die Statistik)
  const kills = [];
  const nk = 11 + Math.floor(r() * 13);
  for (let i = 0; i < nk; i++) {
    const t = 150 + r() * (L - 190);
    const sd = side(t);
    const burst = r() < 0.25 ? 2 : 1;
    for (let b = 0; b < burst; b++) {
      const tt = Math.min(L - 20, t + b * (3 + r() * 9));
      const ksd = sd;
      const k = wpick(W_KILL), v = Math.floor(r() * 5);
      const asst = []; const na = Math.floor(r() * 3.4);
      while (asst.length < na) { const a = wpick(W_ASSIST); if (a !== k && !asst.includes(a)) asst.push(a); }
      kills.push({ t: Math.round(tt), side: ksd, k, v, asst });
    }
  }
  kills.sort((a, b) => a.t - b.t);
  // Objectives
  const have = { blue: [], red: [] };
  const drakes = shuffled(r, DRAKES).slice(0, 4);
  for (let i = 0, t = 330 + r() * 40; t < L - 60; i++, t += 290 + r() * 70) {
    const sd = side(t);
    let type = drakes[Math.min(i, 3)];
    if (have[sd].length >= 4 && t > 1500) type = "elder";
    have[sd].push(type);
    push(t, "dragon", sd, { detail: type });
  }
  const nt = 8 + Math.floor(r() * 6);
  for (let i = 0; i < nt; i++) { const t = 600 + r() * 120 + (i / nt) * (L - 760); push(Math.min(L - 30, t), "tower", side(t)); }
  const ni = 2 + Math.floor(r() * 2);
  for (let i = 0; i < ni; i++) { const t = L * 0.78 + r() * (L * 0.2 - 60); push(Math.min(L - 15, t), "inhibitor", r() < 0.8 ? winner : side(t)); }
  if (L > 1700) push(1500 + r() * (L - 1620), "baron", side(1700));
  push(L, "end", winner);
  for (const k of kills) push(k.t, "kill", k.side, { pid: k.k + 1 + (k.side === "red" ? 5 : 0) });
  evs.sort((a, b) => a.t - b.t || (a.kind === "end") - (b.kind === "end"));
  const mult = Array.from({ length: 10 }, () => 0.9 + r() * 0.18);
  const noise = Array.from({ length: 10 }, () => (r() - 0.5) * 0.04);
  const dmult = Array.from({ length: 10 }, () => 0.85 + r() * 0.3);
  const s = { seed, L, winner, walk, steps, evs, kills, mult, noise, dmult };
  scripts.set(key, s);
  return s;
}

const baseGold = (t) => 2500 + t * 33;
const respawn = (lvl) => Math.min(60, 7 + lvl * 2.6);

/** Spielstand zum Spielzeitpunkt t (Sekunden) — Form wie der Spieldatensatz der echten App */
export function gameState(script, blue, red, t, id, start, finished, picks = {}) {
  t = Math.min(t, script.L);
  const done = finished || t >= script.L;
  const pid = (sd, i) => i + 1 + (sd === "red" ? 5 : 0);
  // Teams ohne Kürzel (eigene Spiele) tragen nur den Spielernamen
  const rows = (tm, sd) => ROSTER[tm.slug].map((p, i) => {
    const r = rng(`${script.seed}${sd}${i}`);
    const pool = POOL[ROLES[i]];
    const champ = pool[Math.floor(r() * pool.length)];
    return { pid: pid(sd, i), player_id: p.id, name: tm.code ? `${tm.code} ${p.name}` : p.name, champion: picks[pid(sd, i)] ?? champ, role: ROLES[i] };
  });
  const bm = rows(blue, "blue"), rm = rows(red, "red");
  // doppelte Champions vermeiden (gewählte bleiben)
  const used = new Set(Object.values(picks));
  for (const m of [...bm, ...rm]) { if (picks[m.pid]) continue; let c = m.champion; const pool = POOL[m.role]; let n = 0; while (used.has(c) && n++ < pool.length) c = pool[(pool.indexOf(c) + 1) % pool.length]; m.champion = c; used.add(c); }
  const meta = [...bm, ...rm];
  const upto = script.kills.filter((k) => k.t <= t);
  const evs = script.evs.filter((e) => e.t <= t && (e.kind !== "end" || done));
  const diff = script.walk[Math.min(script.steps, Math.floor(t / 30))] ?? 0;
  const gold = { blue: Math.round(baseGold(t) + diff / 2), red: Math.round(baseGold(t) - diff / 2) };
  const stats = [];
  for (const [sd] of [["blue"], ["red"]]) {
    const ws = [], dw = [];
    for (let i = 0; i < 5; i++) {
      const g = pid(sd, i) - 1;
      const k = upto.filter((x) => x.side === sd && x.k === i).length;
      const dth = upto.filter((x) => x.side !== sd && x.v === i).length;
      ws.push(Math.max(0.05, GOLDW[i] + 0.012 * k - 0.004 * dth + script.noise[g]));
      dw.push(DPM[i] * (1 + 0.06 * k) * script.dmult[g]);
    }
    const sw = ws.reduce((a, b) => a + b, 0), sdm = dw.reduce((a, b) => a + b, 0);
    for (let i = 0; i < 5; i++) {
      const g = pid(sd, i) - 1;
      const own = upto.filter((x) => x.side === sd);
      const k = own.filter((x) => x.k === i).length;
      const a = own.filter((x) => x.asst.includes(i)).length;
      const dth = upto.filter((x) => x.side !== sd && x.v === i);
      const lvl = Math.min(18, 1 + Math.floor(17 * Math.min(1, (t / (script.L * 0.92)) ** 0.85)));
      const pg = Math.round(gold[sd] * (ws[i] / sw));
      const n = clamp(Math.floor((pg - 500) / 2600), 0, 6);
      const lastDeath = dth.length ? dth[dth.length - 1].t : -1e9;
      const dead = !done && t - lastDeath < respawn(lvl);
      const hpMax = 1500 + lvl * 105;
      stats.push({
        pid: g + 1, level: lvl, kills: k, deaths: dth.length, assists: a, cs: Math.round(CSR[i] * (t / 60) * script.mult[g]), gold: pg, hp: dead ? 0 : Math.round(hpMax * (0.6 + 0.4 * (0.5 + script.noise[g] * 10))), hp_max: hpMax,
        items: ITEM_POOL[ROLES[i]].slice(0, n), style: 8100, sub_style: 8300, perks: [], kp: 0, dmg: dw[i] / sdm, wards: Math.round((i === 4 ? 1.3 : 0.45) * (t / 60)), wards_killed: Math.round((i === 4 ? 0.35 : 0.1) * (t / 60)),
      });
    }
  }
  const totals = (sd) => {
    const mine = evs.filter((e) => e.side === sd);
    return { gold: gold[sd], kills: upto.filter((x) => x.side === sd).length, towers: mine.filter((e) => e.kind === "tower").length, inhibitors: mine.filter((e) => e.kind === "inhibitor").length, barons: mine.filter((e) => e.kind === "baron").length, dragons: mine.filter((e) => e.kind === "dragon").map((e) => e.detail) };
  };
  const points = [];
  for (let i = 0; i * 30 <= t; i++) { const df = script.walk[i]; points.push({ t: i * 30, blue: Math.round(baseGold(i * 30) + df / 2), red: Math.round(baseGold(i * 30) - df / 2) }); }
  points.push({ t, blue: gold.blue, red: gold.red });
  return {
    id, patch: "16.21", state: done ? "finished" : "in_game", start, clock: t, blue: { team_id: blue.id, players: bm }, red: { team_id: red.id, players: rm },
    blue_totals: totals("blue"), red_totals: totals("red"), points, players: stats, events: evs, winner: done ? script.winner : "",
  };
}

// ---------- Serien ----------
const GSLOT = 540_000;   // so viel Zeit ist für jedes Spiel einer Serie reserviert (Spiel dauert real höchstens 8,5 Min)
const HOLD = 150_000;    // fertige Serie bleibt so lange stehen, dann beginnt die nächste Paarung
const EPOCH = Date.UTC(2026, 0, 1);
const LIVE_DEFS = [
  { id: "L1", league: "nordcup", block: "Playoffs · Runde 2", bo: 3, pairs: [["aet", "blw"], ["gal", "emb"], ["irv", "krk"], ["blw", "gal"]], t0: 0, stream: "nordcast" },
  { id: "L2", league: "suedliga", block: "Woche 4", bo: 1, pairs: [["cin", "drf"], ["frb", "how"], ["jdc", "lmu"], ["how", "cin"]], t0: 190_000, hold: 100_000, stream: "suedliga_live" },
];

function liveSeries(def, now) {
  const slot = def.bo * GSLOT + (def.hold ?? HOLD);
  const el = now - EPOCH - def.t0;
  const k = Math.floor(el / slot), rel = el - k * slot, start = EPOCH + def.t0 + k * slot;
  const pr = def.pairs[((k % def.pairs.length) + def.pairs.length) % def.pairs.length];
  const need = Math.floor(def.bo / 2) + 1;
  const teams = [pr[0], pr[1]];
  let wins = [0, 0], decidedAt = -1;
  const games = [];
  for (let i = 0; i < def.bo; i++) {
    const blueIdx = i % 2, bk = teams[blueIdx], rk = teams[1 - blueIdx];
    const gid = `${def.id}.${k}.${i}`;
    const sc = gameScript(gid);
    const gStart = i * GSLOT, gEnd = gStart + (sc.L / SPEED) * 1000;
    const over = decidedAt >= 0;
    let state = over ? "unneeded" : rel < gStart ? "unstarted" : rel < gEnd ? "inProgress" : "completed";
    if (state === "completed") {
      const wk = sc.winner === "blue" ? bk : rk;
      wins[teams.indexOf(wk)]++;
      if (wins[teams.indexOf(wk)] >= need) decidedAt = gEnd;
    }
    games.push({ number: i + 1, id: gid, state, blue: teamBy(bk).id, red: teamBy(rk).id, vods: [] });
  }
  const done = decidedAt >= 0 && rel >= decidedAt;
  return {
    id: `${def.id}-${k}`, start, state: done ? "completed" : "inProgress", block: def.block, league: def.league, league_name: leagueBy(def.league).name, league_image: leagueBy(def.league).image,
    teams: [mkTeam(teams[0], wins[0], done ? (wins[0] > wins[1] ? "win" : "loss") : ""), mkTeam(teams[1], wins[1], done ? (wins[1] > wins[0] ? "win" : "loss") : "")],
    best_of: def.bo, vod: false, games, streams: done ? [] : [{ provider: "twitch", parameter: def.stream, locale: "de-DE" }], tournament: "",
  };
}

// feste Serien: vor und nach „jetzt“, relativ zum Öffnen der Seite
const S = (id, league, block, dt, bo, a, b, res) => ({ id, league, block, start: T0 + dt, bo, a, b, res });
const STATIC = [
  S("p1", "nordcup", "Playoffs · Runde 1", -52 * H, 3, "irv", "krk", ["a", "a"]),
  S("p2", "suedliga", "Woche 3", -49 * H, 3, "cin", "frb", ["b", "a", "b"]),
  S("p3", "nordcup", "Playoffs · Runde 1", -28 * H, 3, "emb", "gal", ["b", "b"]),
  S("p4", "suedliga", "Woche 3", -26 * H, 1, "drf", "jdc", ["a"]),
  S("p5", "nordcup", "Playoffs · Runde 1", -9 * H, 3, "blw", "irv", ["a", "b", "a"]),
  S("p6", "suedliga", "Woche 3", -6 * H, 1, "lmu", "how", ["b"]),
  S("u1", "suedliga", "Woche 4", 2 * H, 3, "frb", "how"), S("u2", "nordcup", "Playoffs · Runde 2", 4.5 * H, 3, "emb", "krk"),
  S("u3", "nordcup", "Playoffs · Runde 2", 26 * H, 5, "aet", "gal"), S("u4", "suedliga", "Woche 4", 29 * H, 1, "drf", "lmu"),
  S("u5", "suedliga", "Woche 5", 50 * H, 3, "jdc", "cin"), S("u6", "nordcup", "Halbfinale", 74 * H, 5, "blw", "emb"),
  S("u7", "globalcup", "Gruppenphase", 98 * H, 3, "aet", "cin"), S("u8", "globalcup", "Gruppenphase", 100 * H, 3, "how", "gal"),
];
function staticSeries(d) {
  const a = [0, 0];
  const games = (d.res ?? []).map((w, i) => { a[w === "a" ? 0 : 1]++; return { number: i + 1, id: `${d.id}.s.${i}`, state: "completed", blue: teamBy(i % 2 ? d.b : d.a).id, red: teamBy(i % 2 ? d.a : d.b).id, vods: [{ provider: "youtube", parameter: "demo", locale: "de-DE", start: 0 }] }; });
  const done = !!d.res;
  for (let i = (d.res ?? []).length; i < d.bo; i++) games.push({ number: i + 1, id: `${d.id}.s.${i}`, state: done ? "unneeded" : "unstarted", blue: teamBy(d.a).id, red: teamBy(d.b).id, vods: [] });
  return {
    id: d.id, start: d.start, state: done ? "completed" : "unstarted", block: d.block, league: d.league, league_name: leagueBy(d.league).name, league_image: leagueBy(d.league).image,
    teams: [mkTeam(d.a, a[0], done ? (a[0] > a[1] ? "win" : "loss") : "", RECORDS[d.a]), mkTeam(d.b, a[1], done ? (a[1] > a[0] ? "win" : "loss") : "", RECORDS[d.b])],
    best_of: d.bo, vod: done, games: games.map((g) => ({ ...g, state: g.state })), streams: [], tournament: "",
  };
}
const RECORDS = Object.fromEntries(TEAMS.map((t, i) => { const r = rng("rec" + t.key); const w = 3 + Math.floor(r() * 7); return [t.key, [w, 10 - w]]; }));

export const liveSeriesList = (now = Date.now()) => LIVE_DEFS.map((d) => liveSeries(d, now));
export const allSeries = (now = Date.now()) => [...STATIC.map(staticSeries), ...liveSeriesList(now)].sort((a, b) => a.start - b.start);
export const seriesById = (id, now = Date.now()) => allSeries(now).find((s) => s.id === id) ?? null;

/** Spieldatensatz zu einer Spiel-ID: „L1.3.0“ (laufende Serien) oder „p1.s.0“ (feste Serien) */
export function gameById(id, now = Date.now()) {
  const m = /^(L\d)\.(\d+)\.(\d+)$/.exec(id);
  if (m) {
    const def = LIVE_DEFS.find((d) => d.id === m[1]);
    const k = +m[2], i = +m[3];
    const s = liveSeries(def, now);
    if (s.id !== `${def.id}-${k}`) return null;
    const g = s.games[i];
    if (!g || g.state === "unstarted" || g.state === "unneeded") return null;
    const sc = gameScript(id);
    const rel = now - s.start - i * GSLOT;
    const blue = TEAMS.find((t) => t.id === g.blue), red = TEAMS.find((t) => t.id === g.red);
    return gameState(sc, blue, red, g.state === "completed" ? sc.L : (rel / 1000) * SPEED, id, now - Math.max(0, rel), g.state === "completed");
  }
  const p = /^([pu]\d)\.s\.(\d+)$/.exec(id);
  if (p) {
    const d = STATIC.find((x) => x.id === p[1]);
    const i = +p[2];
    if (!d?.res || !d.res[i]) return null;
    const blueKey = i % 2 ? d.b : d.a, redKey = i % 2 ? d.a : d.b;
    const winKey = d.res[i] === "a" ? d.a : d.b;
    const sc = gameScript(`${d.id}:${i}`, winKey === blueKey ? "blue" : "red");
    return gameState(sc, teamBy(blueKey), teamBy(redKey), sc.L, id, d.start + i * 45 * 60e3, true);
  }
  return null;
}

// ---------- Turnier und Teams ----------
export const tournamentsOf = (leagueId) => { const l = LEAGUES.find((x) => x.id === leagueId); return l ? [{ id: `${l.slug}-t2`, slug: "herbst_saison", start: "2026-08-01", end: "2026-12-31" }, { id: `${l.slug}-t1`, slug: "fruehjahrs_saison", start: "2026-01-10", end: "2026-06-30" }] : []; };
export function standingsOf(tournamentId) {
  const slug = tournamentId.split("-")[0];
  const teams = TEAMS.filter((t) => (slug === "globalcup" ? ["aet", "blw", "cin", "drf", "gal", "how", "emb", "frb"].includes(t.key) : t.league === slug || ["nordcup", "suedliga"].includes(slug) && t.league === slug)).slice(0, 8);
  const list = teams.length ? teams : TEAMS.slice(0, 6);
  const ranked = [...list].sort((a, b) => RECORDS[b.key][0] - RECORDS[a.key][0] || a.name.localeCompare(b.name));
  const rankings = ranked.map((t, i) => ({ ordinal: i + 1, teams: [mkTeam(t.key, 0, "", RECORDS[t.key])] }));
  const q = ranked.slice(0, 4);
  const mk = (id, a, b, state, wa, wb) => ({ id, state, teams: [mkTeam(a.key, wa, state === "completed" ? (wa > wb ? "win" : "loss") : ""), mkTeam(b.key, wb, state === "completed" ? (wb > wa ? "win" : "loss") : "")], previous: [] });
  const tbd = () => ({ ...mkTeam(q[0].key), name: "TBD", code: "TBD", slug: "tbd", image: "", wins: 0 });
  const final = { id: "final", state: "unstarted", teams: [tbd(), tbd()], previous: ["sf1", "sf2"] };
  return [
    { name: "Hauptrunde", slug: "regular", sections: [{ name: "Tabelle", rankings, matches: [] }] },
    { name: "Playoffs", slug: "playoffs", sections: [{ name: "Halbfinale und Finale", rankings: [], matches: [mk("sf1", q[0], q[3], "completed", 2, 1), mk("sf2", q[1], q[2], "inProgress", 1, 1), final] }] },
  ];
}
export function teamInfo(slug) {
  const t = teamBy(slug);
  if (!t) return null;
  const l = leagueBy(t.league);
  return { id: t.id, slug: t.slug, name: t.name, code: t.code, image: t.image, alt_image: "", league: l.name, region: { EUROPE: "Europa" }[l.region] ?? l.region, players: ROSTER[t.key] };
}

// ---------- Ich (Konto, Mastery) ----------
export const ME = {
  account: { name: "Nova", tag: "NORD", level: 412, icon: 4568 },
  phase: "None",
  ranks: [
    { queue: "RANKED_SOLO_5x5", tier: "EMERALD", division: "II", lp: 47, wins: 138, losses: 121 },
    { queue: "RANKED_FLEX_SR", tier: "PLATINUM", division: "I", lp: 82, wins: 41, losses: 33 },
  ],
};
const MP = [["Ahri", 7, 238400], ["LeeSin", 7, 191750], ["Jinx", 7, 164200], ["Lulu", 6, 118900], ["Orianna", 6, 97300], ["Viego", 6, 88100], ["Kaisa", 5, 61400], ["Syndra", 5, 52800], ["Thresh", 5, 47200], ["Aatrox", 4, 31700], ["Ezreal", 4, 28900], ["Camille", 4, 24100], ["Nautilus", 3, 17800], ["Sejuani", 3, 14200], ["Azir", 3, 11900], ["Karma", 2, 8600], ["Zed", 2, 7300], ["Yone", 2, 6100], ["Vi", 1, 3900], ["Ashe", 1, 3100]];
export const MASTERY = MP.map(([id, level, points], i) => {
  const r = rng("mp" + id);
  const since = Math.round(r() * 3000 + 600), until = level >= 7 ? 0 : Math.round(r() * 5200 + 900);
  return { champion: CHAMPS[id].key, id, level, points, since, until, marks: level >= 6 ? 2 : 0, tokens: level >= 6 ? Math.floor(r() * 3) : 0, last_play: Date.now() - Math.round(r() * (i < 6 ? 10 : 90)) * DAYMS, grades: ["B+", "A-", "S-", "A", "S", "B", "A+", "S+"].sort(() => r() - 0.5).slice(0, 3), best: "S+" };
});
export const MASTERY_HISTORY = (() => {
  const r = rng("hist");
  let acc = 905000; const days = [];
  for (let i = 0; i < 30; i++) { acc += Math.round(2600 * (0.4 + r() * 1.3) * (i % 6 === 5 ? 0.15 : 1)); days.push({ day: new Date(Date.now() - (29 - i) * DAYMS).toISOString().slice(0, 10), points: acc }); }
  return { days, since: days[0].day, gains: MASTERY.slice(0, 6).map((m, i) => ({ champion: m.champion, id: m.id, points: Math.round(9800 / (i + 1.4)) })) };
})();

// eigene Spiele (Profil → Spiele)
export const MY_GAMES = Array.from({ length: 14 }, (_, i) => {
  const r = rng("my" + i);
  const win = [true, true, false, true, false, true, true, false, true, false, true, true, false, true][i];
  const champ = ["Ahri", "LeeSin", "Jinx", "Orianna", "Viego", "Kaisa", "Ahri", "Lulu", "Jinx", "Syndra", "Viego", "Orianna", "Kaisa", "Ahri"][i];
  const role = { Ahri: "mid", Orianna: "mid", Syndra: "mid", LeeSin: "jungle", Viego: "jungle", Jinx: "bottom", Kaisa: "bottom", Lulu: "support" }[champ];
  const k = Math.floor(r() * 12), dth = Math.floor(r() * 9), a = Math.floor(r() * 16);
  return { id: `m${i}`, champ, role, win, k, d: dth, a, cs: Math.round(150 + r() * 120), min: 22 + Math.floor(r() * 16), when: Date.now() - (i * 5 + 2 + Math.round(r() * 3)) * H, mode: pickFrom(r, ["Solo/Duo", "Solo/Duo", "Flex", "Normal"]), score: ["MVP", "ACE", "", "", ""][i % 5] };
});

/** Spielverlauf eines eigenen Spiels: dein Team (blau, du in deiner Rolle) gegen ein erfundenes Gegnerteam */
export function myGameDetail(id) {
  const g = MY_GAMES.find((x) => x.id === id);
  if (!g) return null;
  const r = rng("mg" + id);
  const role = ROLES.indexOf(g.role);
  const names = shuffled(r, HANDLES).slice(0, 9);
  const mine = ROLES.map((ro, i) => ({ id: `me-${id}-${i}`, name: i === role ? ME.account.name : names[i > role ? i - 1 : i], role: ro }));
  const foes = ROLES.map((ro, i) => ({ id: `foe-${id}-${i}`, name: names[4 + i], role: ro }));
  ROSTER[`__me${id}`] = mine; ROSTER[`__foe${id}`] = foes;
  const blue = { id: "t-me", slug: `__me${id}`, code: "", name: "Dein Team" }, red = { id: "t-foe", slug: `__foe${id}`, code: "", name: "Gegner" };
  const sc = gameScript(`my:${id}`, g.win ? "blue" : "red");
  const state = gameState(sc, blue, red, sc.L, id, g.when, true, { [role + 1]: g.champ });
  return { game: g, state, script: sc, blue, red, mePid: role + 1 };
}

