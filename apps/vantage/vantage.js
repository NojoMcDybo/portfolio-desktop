// Vantage (Nachbau für den Browser): Pro (Live, Spielplan, Tabelle, Teams, Spieldetail mit Golddiagramm),
// Ich (Konto, Meisterschaft, Verlauf) und Studio (Aufnahme, Clips, Schnitt). Der Quellcode der echten App ist privat; das hier
// ist eine eigene, kleine Umsetzung derselben Oberfläche mit erfundenen Teams, Spielern und Champions.
import { windowControls, segments, $, $$, esc, rng, bus } from "../../shim/ui.js";

windowControls();
const toast = (t) => { const e = $("#toast"); e.textContent = t; e.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove("on"), 2600); };

// ---------- Welt ----------
const TEAMS = [
  ["aet", "Aether Esports", "AET", "#4da3ff", "nord"], ["blw", "Blackwater", "BLW", "#8795a8", "nord"], ["cin", "Cinder Crown", "CIN", "#ff7a45", "sued"], ["drf", "Driftline", "DRF", "#2dd4bf", "sued"],
  ["emb", "Emberforge", "EMB", "#f43f5e", "nord"], ["frb", "Frostbyte", "FRB", "#67e8f9", "sued"], ["gal", "Gale Syndicate", "GAL", "#a3e635", "nord"], ["how", "Hollow Wolves", "HOW", "#c084fc", "sued"],
].map(([id, name, a, c, lg]) => ({ id, name, a, c, lg }));
const LEAGUES = { nord: "Nordcup", sued: "Südliga" };
const T = Object.fromEntries(TEAMS.map((t) => [t.id, t]));
const ROLES = ["Top", "Jgl", "Mid", "ADC", "Sup"];
const HANDLES = ["Nova", "Kestrel", "Mako", "Ruin", "Sable", "Tamsin", "Voss", "Lyra", "Quill", "Brisk", "Onyx", "Fenn", "Halo", "Rook", "Pike", "Dune", "Wren", "Ash", "Jory", "Cato", "Ember", "Silt", "Moss", "Reef", "Tarn", "Yarrow", "Kite", "Lark", "Gale", "Slate", "Brae", "Orrin", "Pax", "Rime", "Vale", "Wick", "Zed", "Hale", "Isk", "Nix"];
const CHAMPS = [["Vorrik", "Brannoch", "Tharn"], ["Sylra", "Kaelis", "Ixelle"], ["Vexa", "Zephra", "Orlund"], ["Quill", "Mirel", "Dorun"], ["Halvar", "Nimue", "Pell"]];
const players = (tid) => { const r = rng("pl" + tid); return ROLES.map((role, i) => ({ role, name: HANDLES[Math.floor(r() * 40)], champs: CHAMPS[i], i })); };
const ROSTER = Object.fromEntries(TEAMS.map((t) => [t.id, players(t.id)]));
const crest = (t, cls = "") => `<span class="crest ${cls}" style="background:linear-gradient(145deg,${t.c},#0b0c10 135%)">${t.a}</span>`;

const NOW = Date.now(), H = 3600e3, D = 24 * H;
const kfmt = (v) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${(Math.abs(v) / 1000).toFixed(1).replace(".", ",")}k`;
const clock = (m) => `${String(Math.floor(m)).padStart(2, "0")}:${String(Math.floor((m % 1) * 60)).padStart(2, "0")}`;

// ---------- Spiele erzeugen ----------
function genGame(seed, win, minutes) {
  const r = rng(seed);
  const diff = [0]; let d = 0;
  const drift = (win === "a" ? 1 : -1) * (90 + r() * 80);
  for (let m = 1; m <= minutes; m++) { d += drift * (m < 8 ? 0.35 : 1) + (r() - 0.5) * 900 + (r() < 0.12 ? (r() - 0.5) * 2600 : 0); diff.push(Math.round(d)); }
  const end = diff[minutes];
  if (Math.sign(end) !== (win === "a" ? 1 : -1)) for (let m = 0; m <= minutes; m++) diff[m] += (win === "a" ? 1 : -1) * Math.round((m / minutes) * (Math.abs(end) + 2500));
  const events = [];
  const side = (t) => (r() < 0.5 + Math.sign(diff[Math.min(minutes, Math.floor(t))]) * 0.18 ? "a" : "b");
  [["dragon", 5.1], ["herald", 8.4], ["dragon", 10.7], ["tower", 11.5], ["dragon", 16.2], ["tower", 14.3], ["herald", 15.0], ["dragon", 21.8], ["tower", 19.9], ["baron", 24.6], ["tower", 26.1], ["dragon", 28.4], ["baron", 31.2], ["tower", 30.3]]
    .forEach(([k, t]) => { if (t < minutes) events.push({ t, kind: k, side: side(t) }); });
  for (let i = 0; i < Math.floor(minutes * 0.9); i++) events.push({ t: 2 + r() * (minutes - 2), kind: "kill", side: side(minutes * r()) });
  events.sort((x, y) => x.t - y.t);
  return { seed, minutes, diff, events, win };
}
const pstats = (g, aId, bId, upto) => {
  const f = Math.min(1, upto / g.minutes);
  const out = [];
  for (const [sd, tid] of [["a", aId], ["b", bId]]) {
    const r = rng(g.seed + sd), won = sd === g.win;
    ROSTER[tid].forEach((p, i) => {
      const kills = Math.round((won ? 4 : 2) * (0.4 + r() * (i === 2 || i === 3 ? 2.4 : 1.4)) * f), deaths = Math.round((won ? 1.8 : 3.8) * (0.4 + r() * 1.5) * f), asst = Math.round((i === 4 ? 12 : i === 1 ? 8 : 5) * (0.4 + r() * 1.2) * (won ? 1.2 : 0.9) * f);
      out.push({ side: sd, tid, role: p.role, name: p.name, champ: p.champs[Math.floor(r() * 3)], k: kills, d: deaths, a: asst, cs: Math.round((i === 4 ? 30 : 7.2 * upto) * (0.8 + r() * 0.3) * (i === 4 ? f : 1)), gold: Math.round((3200 + upto * 420) * (0.75 + r() * 0.5) * (i === 4 ? 0.7 : 1) * (won ? 1.06 : 0.96)) });
    });
  }
  return out;
};

const mk = (id, lg, a, b, bo, state, start, scoreA, scoreB) => ({ id, lg, a, b, bo, state, start, games: [], sa: scoreA, sb: scoreB });
const SERIES = [
  mk("s1", "nord", "aet", "blw", 3, "live", NOW - 70 * 60e3, 1, 0),
  mk("s2", "sued", "cin", "drf", 1, "live", NOW - 25 * 60e3, 0, 0),
  mk("s3", "sued", "frb", "how", 3, "up", NOW + 2 * H, 0, 0),
  mk("s4", "nord", "emb", "gal", 3, "up", NOW + 4 * H + 30 * 60e3, 0, 0),
  mk("s5", "nord", "aet", "gal", 5, "up", NOW + D + 3 * H, 0, 0),
  mk("s6", "sued", "drf", "frb", 1, "up", NOW + D + 5 * H, 0, 0),
  mk("s7", "nord", "blw", "emb", 3, "done", NOW - D + 2 * H, 2, 1), mk("s8", "sued", "how", "cin", 3, "done", NOW - D + 5 * H, 0, 2),
  mk("s9", "nord", "gal", "aet", 3, "done", NOW - 2 * D + 3 * H, 1, 2),
];
// Spiele der Serien
function seedGames() {
  const done = { s7: ["a", "b", "a"], s8: ["b", "b"], s9: ["b", "a", "b"] };
  for (const s of SERIES) {
    if (done[s.id]) s.games = done[s.id].map((w, i) => ({ n: i + 1, state: "done", ...genGame(s.id + i, w, 26 + ((i * 5 + s.id.charCodeAt(1)) % 11)) }));
  }
  const s1 = SERIES[0];
  s1.games = [{ n: 1, state: "done", ...genGame("s1g1", "a", 32) }, { n: 2, state: "live", t: 14.4, ...genGame("s1g2", "a", 34) }];
  const s2 = SERIES[1];
  s2.games = [{ n: 1, state: "live", t: 21.3, ...genGame("s2g1", "b", 33) }];
}
seedGames();

// Live: eine Spielminute dauert 3 Sekunden
setInterval(() => {
  for (const s of SERIES.filter((x) => x.state === "live")) {
    const g = s.games.at(-1);
    if (g.state !== "live") continue;
    g.t += 1;
    if (g.t >= g.minutes) {
      g.t = g.minutes; g.state = "done";
      g.win = Math.sign(g.diff[g.minutes]) >= 0 ? "a" : "b";
      g.win === "a" ? s.sa++ : s.sb++;
      const need = Math.ceil(s.bo / 2);
      const won = s.sa >= need ? "a" : s.sb >= need ? "b" : null;
      if (settings.notch) bus("notch:alert", { title: won ? `${T[s[won === "a" ? "a" : "b"]].name} gewinnt` : "Spiel beendet", text: `${T[s.a].a} ${s.sa}:${s.sb} ${T[s.b].a} · ${LEAGUES[s.lg]}` });
      if (won) s.state = "done";
      else setTimeout(() => { s.games.push({ n: s.games.length + 1, state: "live", t: 0, ...genGame(s.id + "g" + (s.games.length + 1), Math.random() < 0.5 ? "a" : "b", 28 + Math.floor(Math.random() * 8)) }); render(true); }, 5000);
    }
  }
  render(true);
}, 3000);

// ---------- Zustand ----------
const settings = { notch: true, notify: false };
const S = { tab: "pro", sub: "live", leagues: new Set(["nord", "sued"]), open: null, game: 0, meSel: null, clipSel: 0, rec: null };
const main = $("#main");
segments($("#tabs"), (b) => { S.tab = b.dataset.view; render(); });

// ---------- Pro ----------
const inLg = (s) => S.leagues.has(s.lg);
const card = (s) => {
  const g = s.games.at(-1), a = T[s.a], b = T[s.b];
  const pips = s.bo > 1 ? `<div class="pips" style="--ca:${a.c};--cb:${b.c}">${Array.from({ length: s.bo }, (_, i) => { const gm = s.games[i]; return `<i class="${gm?.state === "done" ? gm.win : gm?.state === "live" ? "run" : ""}"></i>`; }).join("")}</div>` : "";
  return `<button class="serie" data-s="${s.id}"><div class="meta"><span>${LEAGUES[s.lg]} · Best of ${s.bo}</span>${s.state === "live" ? `<span class="live">LIVE ${g ? clock(g.t) : ""}</span>` : s.state === "up" ? `<span>${when(s.start)}</span>` : "<span>Beendet</span>"}</div>
    <div class="vs"><div class="tm">${crest(a)}<span>${a.name}</span></div><div class="score"><span class="${s.sa >= s.sb ? "w" : "l"}">${s.sa}</span><em>:</em><span class="${s.sb >= s.sa ? "w" : "l"}">${s.sb}</span></div><div class="tm">${crest(b)}<span>${b.name}</span></div></div>${pips}</button>`;
};
const when = (t) => { const d = new Date(t), td = new Date(); const day = Math.round((new Date(d).setHours(0, 0, 0, 0) - td.setHours(0, 0, 0, 0)) / D); return `${day === 0 ? "Heute" : day === 1 ? "Morgen" : day === -1 ? "Gestern" : d.toLocaleDateString("de-DE", { weekday: "short" })}, ${d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`; };
const subbar = () => `<div class="subbar"><nav class="n-seg n-glass" id="sub">${[["live", "Live"], ["plan", "Spielplan"], ["tab", "Tabelle"], ["teams", "Teams"]].map(([k, l]) => `<button class="${S.sub === k ? "active" : ""}" data-k="${k}">${l}</button>`).join("")}</nav>
  <div class="chips">${Object.entries(LEAGUES).map(([k, l]) => `<button class="chip" aria-pressed="${S.leagues.has(k)}" data-lg="${k}">${l}</button>`).join("")}</div></div>`;
const foot = `<p class="foot">Vantage ist ein unabhängiges Projekt und steht in keiner Verbindung zu Riot Games. Teams, Spieler, Champions und Ergebnisse in dieser Demo sind erfunden; die echte App zeigt Profispiele, die eigene Partie und Clips.</p>`;

function proView() {
  if (S.open) return detailView();
  let body = "";
  if (S.sub === "live") {
    const live = SERIES.filter((s) => s.state === "live" && inLg(s));
    const next = SERIES.filter((s) => s.state === "up" && inLg(s)).sort((x, y) => x.start - y.start).slice(0, 3);
    body = `<h2 class="sec">Läuft gerade</h2>${live.length ? `<div class="cards">${live.map(card).join("")}</div>` : `<div class="empty">Gerade läuft nichts in den gewählten Ligen.</div>`}
      <h2 class="sec">Als Nächstes</h2><div class="cards">${next.map(card).join("")}</div>`;
  } else if (S.sub === "plan") {
    const list = SERIES.filter(inLg).sort((x, y) => x.start - y.start);
    const days = {};
    list.forEach((s) => { const k = when(s.start).split(",")[0]; (days[k] ??= []).push(s); });
    body = Object.entries(days).map(([d, ss]) => `<h3 class="day">${d}</h3><div class="rows">${ss.map((s) => { const a = T[s.a], b = T[s.b]; return `<button class="row" data-s="${s.id}"><span class="t">${new Date(s.start).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</span><span class="tm">${crest(a)}${a.name}</span><span class="score" style="font-size:16px">${s.state === "up" ? "–" : `${s.sa}<em>:</em>${s.sb}`}</span><span class="tm">${crest(b)}${b.name}</span><span class="st">${s.state === "live" ? '<span class="live">LIVE</span>' : LEAGUES[s.lg]}</span></button>`; }).join("")}</div>`).join("");
  } else if (S.sub === "tab") {
    body = Object.entries(LEAGUES).filter(([k]) => S.leagues.has(k)).map(([k, l]) => {
      const rows = TEAMS.filter((t) => t.lg === k).map((t, i) => { const r = rng("tb" + t.id); const w = 7 - i * 1 + Math.floor(r() * 2), lo = 3 + i; return { t, w, l: lo, gd: Math.round((w - lo) * 3 + r() * 4) }; }).sort((x, y) => y.w - x.w || y.gd - x.gd);
      return `<h2 class="sec">${l} · Gruppenphase</h2><table class="tb"><tr><th>#</th><th>Team</th><th class="n">Siege</th><th class="n">Niederlagen</th><th class="n">Spieldifferenz</th></tr>${rows.map((r, i) => `<tr class="${i < 2 ? "top" : ""}"><td>${i + 1}</td><td><div class="tm">${crest(r.t)}${r.t.name}</div></td><td class="n">${r.w}</td><td class="n">${r.l}</td><td class="n">${r.gd > 0 ? "+" : ""}${r.gd}</td></tr>`).join("")}</table>`;
    }).join("");
  } else {
    body = `<div class="teams">${TEAMS.filter((t) => S.leagues.has(t.lg)).map((t) => `<div class="team"><div style="display:flex;gap:12px;align-items:center">${crest(t, "lg")}<div><h3>${t.name}</h3><p>${LEAGUES[t.lg]}</p></div></div><div class="roster">${ROSTER[t.id].map((p) => `<div><span>${p.role}</span><b>${p.name}</b></div>`).join("")}</div></div>`).join("")}</div>`;
  }
  return subbar() + body + foot;
}

// ---------- Spieldetail ----------
function detailView() {
  const s = SERIES.find((x) => x.id === S.open), a = T[s.a], b = T[s.b];
  if (S.game >= s.games.length) S.game = Math.max(0, s.games.length - 1);
  const g = s.games[S.game];
  return `<div style="--ca:${a.c};--cb:${b.c}"><button class="back" id="back"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6-6 6 6 6"/></svg>Zurück</button>
    <div class="head"><div class="tm">${crest(a, "lg")}${a.name}</div><div class="mid"><div class="score"><span>${s.sa}</span><em>:</em><span>${s.sb}</span></div><small>${LEAGUES[s.lg]} · Best of ${s.bo}${s.state === "live" ? ' · <span class="live">LIVE</span>' : ""}</small></div><div class="tm">${crest(b, "lg")}${b.name}</div></div>
    <div class="games" id="gtabs">${s.games.map((x, i) => `<button aria-pressed="${i === S.game}" data-g="${i}">Spiel ${x.n}${x.state === "live" ? '<span class="live">LIVE</span>' : ""}</button>`).join("") || '<span class="hint">Noch kein Spiel gestartet.</span>'}</div>
    <div id="gdet">${g ? gameBody(s, g) : ""}</div></div>${foot}`;
}
function gameBody(s, g) {
  const a = T[s.a], b = T[s.b], upto = g.state === "live" ? g.t : g.minutes;
  const ps = pstats(g, s.a, s.b, upto);
  const tbl = (sd, t) => `<table class="pl"><tr><th>${t.name}</th><th>K/D/A</th><th>CS</th><th>Gold</th></tr>${ps.filter((p) => p.side === sd).map((p) => `<tr><td><div class="who"><span class="role">${p.role}</span><span><span class="pn">${p.name}</span> <span class="ch">${p.champ}</span></span></div></td><td>${p.k}/${p.d}/${p.a}</td><td>${p.cs}</td><td>${(p.gold / 1000).toFixed(1).replace(".", ",")}k</td></tr>`).join("")}</table>`;
  const ev = g.events.filter((e) => e.t <= upto).slice(-40).reverse();
  const KIND = { dragon: ["Drache", "#f59e0b"], baron: ["Baron", "#c084fc"], tower: ["Turm", "#60a5fa"], herald: ["Herold", "#2dd4bf"], kill: ["Kill", "#ff6b6b"] };
  const cur = g.diff[Math.floor(upto)];
  return `<div class="panel"><h4>Golddifferenz <span>${g.state === "live" ? `<span class="live">LIVE ${clock(g.t)}</span> · ` : `Spielzeit ${clock(g.minutes)} · `}${cur >= 0 ? a.a : b.a} ${kfmt(Math.abs(cur)).replace("+", "")} vorn</span></h4><div class="chart" id="chart">${chart(g, upto, a, b)}<div class="tip" id="tip"></div></div></div>
    <div class="two"><div class="panel">${tbl("a", a)}</div><div class="panel">${tbl("b", b)}</div></div>
    <div class="panel"><h4>Ereignisse <span>${ev.length} bis ${clock(upto)}</span></h4><div class="ev">${ev.map((e) => `<div><time>${clock(e.t)}</time><span class="dot" style="--c:${KIND[e.kind][1]}"></span><span><b style="color:${e.side === "a" ? a.c : b.c}">${T[e.side === "a" ? s.a : s.b].a}</b> · ${KIND[e.kind][0]}</span></div>`).join("") || '<span class="hint">Noch nichts passiert.</span>'}</div></div>`;
}
function chart(g, upto, a, b) {
  const W = 800, Hh = 230, L = 40, B = 22, R = 6, Tt = 22, n = Math.floor(upto);
  const mx = Math.max(3000, ...g.diff.slice(0, n + 1).map(Math.abs)) * 1.12, tot = g.minutes;
  const x = (m) => L + (m / tot) * (W - L - R), y = (v) => Tt + (1 - (v / mx + 1) / 2) * (Hh - Tt - B), z = y(0);
  const pts = g.diff.slice(0, n + 1).map((v, i) => [x(i), y(v)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join("");
  const area = `${line}L${pts.at(-1)[0].toFixed(1)} ${z}L${x(0)} ${z}Z`;
  const ticks = [-1, -0.5, 0, 0.5, 1].map((f) => `<line x1="${L}" x2="${W - R}" y1="${y(f * mx)}" y2="${y(f * mx)}" stroke="rgba(255,255,255,${f === 0 ? 0.22 : 0.06})"/><text x="${L - 6}" y="${y(f * mx) + 4}" text-anchor="end" font-size="10" fill="#6e6e73">${f === 0 ? "0" : kfmt(f * mx).replace("+", "")}</text>`).join("");
  const xt = Array.from({ length: Math.floor(tot / 5) + 1 }, (_, i) => `<text x="${x(i * 5)}" y="${Hh - 6}" text-anchor="middle" font-size="10" fill="#6e6e73">${i * 5}'</text>`).join("");
  const KC = { dragon: "#f59e0b", baron: "#c084fc", tower: "#60a5fa", herald: "#2dd4bf" };
  const marks = g.events.filter((e) => e.kind !== "kill" && e.t <= upto).map((e) => `<circle cx="${x(e.t)}" cy="9" r="5.5" fill="${KC[e.kind]}" stroke="${e.side === "a" ? a.c : b.c}" stroke-width="2"><title>${e.kind}</title></circle>`).join("");
  const id = "c" + g.seed;
  return `<svg viewBox="0 0 ${W} ${Hh}" data-tot="${tot}" data-l="${L}" data-w="${W}" data-r="${R}"><defs><clipPath id="${id}u"><rect x="0" y="0" width="${W}" height="${z}"/></clipPath><clipPath id="${id}d"><rect x="0" y="${z}" width="${W}" height="${Hh}"/></clipPath></defs>${ticks}${xt}
    <path d="${area}" fill="${a.c}" fill-opacity=".3" clip-path="url(#${id}u)"/><path d="${area}" fill="${b.c}" fill-opacity=".3" clip-path="url(#${id}d)"/>
    <path d="${line}" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${marks}<line class="vl" y1="${Tt}" y2="${Hh - B}" stroke="rgba(255,255,255,.5)" opacity="0"/>
    <circle cx="${pts.at(-1)[0]}" cy="${pts.at(-1)[1]}" r="4" fill="#fff"/></svg>`;
}
function bindChart(s, g) {
  const box = $("#chart"); if (!box) return;
  const svg = box.querySelector("svg"), tip = $("#tip"), vl = svg.querySelector(".vl"), a = T[s.a], b = T[s.b];
  const upto = g.state === "live" ? g.t : g.minutes;
  box.onpointermove = (e) => {
    const r = svg.getBoundingClientRect(), k = 800 / r.width, tot = +svg.dataset.tot;
    const m = Math.max(0, Math.min(Math.floor(upto), Math.round((((e.clientX - r.left) * k - 40) / (800 - 46)) * tot)));
    const v = g.diff[m], px = 40 + (m / tot) * (800 - 46);
    vl.setAttribute("x1", px); vl.setAttribute("x2", px); vl.setAttribute("opacity", "1");
    tip.innerHTML = `Minute ${m} · <b style="color:${v >= 0 ? a.c : b.c}">${v >= 0 ? a.a : b.a}</b> ${kfmt(Math.abs(v)).replace("+", "")}`;
    tip.style.left = px / k + "px"; tip.style.top = e.clientY - r.top - 4 + "px"; tip.classList.add("on");
  };
  box.onpointerleave = () => { tip.classList.remove("on"); vl.setAttribute("opacity", "0"); };
}

// ---------- Ich ----------
const MAST = [["Vexa", "Mid", 7, 214500], ["Sylra", "Jgl", 7, 168200], ["Quill", "ADC", 6, 96400], ["Brannoch", "Top", 6, 74800], ["Nimue", "Sup", 5, 51900], ["Kaelis", "Jgl", 5, 38200], ["Zephra", "Mid", 4, 21600], ["Mirel", "ADC", 3, 9800]]
  .map(([n, r, l, p], i) => ({ n, r, l, p, hue: [210, 150, 30, 340, 265, 95, 190, 15][i] }));
function meView() {
  const sel = MAST.find((m) => m.n === S.meSel);
  const r = rng(sel?.n ?? "all");
  const days = Array.from({ length: 30 }, (_, i) => Math.round((sel ? sel.p * 0.06 : 3800) * (0.6 + r() * 0.8) * (i % 6 === 5 ? 0.2 : 1)));
  let acc = 0; const cum = days.map((d) => (acc += d));
  const mx = acc, W = 640, Hh = 150, x = (i) => 8 + (i / 29) * (W - 16), y = (v) => Hh - 12 - (v / mx) * (Hh - 28);
  const line = cum.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join("");
  return `<div class="me"><div class="acc"><div class="panel"><div class="id"><div class="avatar">D</div><div><h3>Demo <small>#EUW</small></h3><span class="hint">Stufe 312 · Client verbunden (Demo)</span></div></div>
    <div class="rank" style="margin-top:14px"><div><b>Smaragd II</b><br><span>Solo/Duo · 47 LP</span></div><span>118 S · 104 N</span></div><div class="bar"><i style="width:47%"></i></div></div>
    <div class="panel"><h4>Spielphase</h4><p class="hint" style="margin:0">In der echten App erkennt Vantage den Client, zeigt die Champion-Auswahl und kann Runen und Items importieren. Hier läuft kein Client.</p></div></div>
    <div><div class="panel"><h4>Meisterschaft <span>${MAST.reduce((a, m) => a + m.p, 0).toLocaleString("de")} Punkte gesamt</span></h4><div class="mast">${MAST.map((m) => `<button aria-pressed="${S.meSel === m.n}" data-m="${m.n}"><span class="cm" style="background:linear-gradient(145deg,hsl(${m.hue} 70% 55%),hsl(${m.hue + 30} 60% 28%))">${m.n[0]}</span><span><b>${m.n}</b><span class="lvl">Stufe ${m.l}</span><small>${m.r} · zuletzt vor ${1 + MAST.indexOf(m) * 2} Tagen</small><div class="bar"><i style="width:${Math.round((m.p / MAST[0].p) * 100)}%"></i></div></span><span class="pts">${m.p.toLocaleString("de")}</span></button>`).join("")}</div></div>
    <div class="panel"><h4>Verlauf · 30 Tage <span>${sel ? sel.n : "alle Champions"} · +${acc.toLocaleString("de")}</span></h4><div class="chart" id="mchart"><svg viewBox="0 0 ${W} ${Hh}"><path d="${line}L${x(29)} ${Hh - 12}L${x(0)} ${Hh - 12}Z" fill="#4da3ff" fill-opacity=".18"/><path d="${line}" fill="none" stroke="#4da3ff" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><line class="vl" y1="6" y2="${Hh - 12}" stroke="rgba(255,255,255,.4)" opacity="0"/></svg><div class="tip" id="mtip"></div></div>
    <p class="hint" style="margin:8px 0 0">${sel ? "Klick auf den Champion noch einmal zeigt wieder alle." : "Einen Champion anklicken, um nur seinen Verlauf zu sehen."}</p></div></div></div>${foot}`;
}
function bindMe() {
  const box = $("#mchart"); if (!box) return;
  const svg = box.querySelector("svg"), tip = $("#mtip"), vl = svg.querySelector(".vl");
  const sel = MAST.find((m) => m.n === S.meSel), r = rng(sel?.n ?? "all");
  let acc = 0; const cum = Array.from({ length: 30 }, (_, i) => (acc += Math.round((sel ? sel.p * 0.06 : 3800) * (0.6 + r() * 0.8) * (i % 6 === 5 ? 0.2 : 1))));
  box.onpointermove = (e) => { const b = svg.getBoundingClientRect(), k = 640 / b.width, i = Math.max(0, Math.min(29, Math.round((((e.clientX - b.left) * k - 8) / 624) * 29))); const px = 8 + (i / 29) * 624; vl.setAttribute("x1", px); vl.setAttribute("x2", px); vl.setAttribute("opacity", "1"); const d = new Date(Date.now() - (29 - i) * D); tip.textContent = `${d.toLocaleDateString("de-DE", { day: "numeric", month: "short" })} · ${cum[i].toLocaleString("de")} Punkte`; tip.style.left = px / k + "px"; tip.style.top = "30px"; tip.classList.add("on"); };
  box.onpointerleave = () => { tip.classList.remove("on"); vl.setAttribute("opacity", "0"); };
}

// ---------- Studio ----------
const EVK = { kill: ["Kill", "#ff6b6b"], dragon: ["Drache", "#f59e0b"], tower: ["Turm", "#60a5fa"], team: ["Teamkampf", "#c084fc"] };
const mkClip = (id, title, dur, hue, ago, marks) => ({ id, title, dur, hue, date: NOW - ago, marks });
let clipId = 10;
const CLIPS = [
  mkClip(1, "Pentakill auf Vexa", 42, 210, 3 * H, [[8, "kill"], [14, "kill"], [19, "kill"], [27, "kill"], [33, "kill"]]),
  mkClip(2, "Baron-Steal", 28, 280, 28 * H, [[11, "dragon"], [20, "team"]]),
  mkClip(3, "Lane-Phase gegen Brannoch", 65, 150, 3 * D, [[9, "kill"], [31, "tower"], [52, "kill"]]),
];
const ed = { t: 0, playing: false, a: 0, b: 0, raf: 0, last: 0 };
function studioView() {
  const c = CLIPS[S.clipSel];
  const rec = S.rec;
  return `<div class="studio"><div class="sl"><div class="rec"><div class="st"><span class="recdot ${rec ? "on" : ""}"></span><span>${rec ? `Aufnahme läuft · <b id="rtime">0:00</b>` : "Bereit · Hotkey Alt+F10"}</span></div>
    <div style="display:flex;gap:8px"><button class="btn ${rec ? "red" : "pri"}" id="rec" style="flex:1">${rec ? "Aufnahme beenden" : "Aufnahme starten"}</button><button class="btn" id="save" ${rec ? "" : "disabled"} title="Die letzten 30 Sekunden als Clip sichern">Clip sichern</button></div>
    <span class="hint">Nimmt das Spiel auf; „Clip sichern“ speichert die letzten 30 Sekunden. Die Demo zeichnet nur ein erfundenes Bild auf.</span></div>
    <div class="clips" id="clips">${CLIPS.map((x, i) => `<button class="clip" aria-pressed="${i === S.clipSel}" data-c="${i}"><canvas data-th="${i}" width="168" height="96"></canvas><span><b>${esc(x.title)}</b><small>${fmtT(x.dur)} · ${new Date(x.date).toLocaleDateString("de-DE", { day: "numeric", month: "short" })}</small></span></button>`).join("")}</div></div>
    <div class="ed">${c ? `<div class="screen"><canvas id="scr" width="960" height="444"></canvas><span class="ov" id="ov"></span></div>
      <div class="tl" id="tl"><canvas class="strip" id="strip" width="960" height="148" style="width:100%;height:100%"></canvas><div class="sel" id="sel"></div>${c.marks.map(([t, k]) => `<span class="mk" data-t="${t}" title="${EVK[k][0]}" style="left:${(t / c.dur) * 100}%;--c:${EVK[k][1]}"></span>`).join("")}<div class="ph" id="ph"></div><span class="time" id="tt"></span></div>
      <div class="tools"><button class="btn" id="play">Abspielen</button><button class="btn" id="in" title="Taste I">Anfang setzen</button><button class="btn" id="out" title="Taste O">Ende setzen</button><button class="btn pri" id="cut">Schneiden</button><span class="sp"></span><button class="btn" id="ren">Umbenennen</button><button class="btn" id="del">Löschen</button></div>
      <span class="hint">Klick in die Zeitleiste springt, die Punkte sind Ereignisse (Kill, Drache …). Leertaste spielt ab, I und O setzen Anfang und Ende. „Schneiden“ legt aus dem Bereich einen neuen Clip an.</span>` : `<div class="empty">Noch keine Clips. Starte eine Aufnahme und sichere einen Clip.</div>`}</div></div>${foot}`;
}
const fmtT = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
function scene(ctx, w, h, t, hue, marks = []) {
  const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, `hsl(${hue} 45% 14%)`); g.addColorStop(1, `hsl(${hue + 30} 50% 6%)`); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) { ctx.fillStyle = `hsla(${hue + i * 12} 55% ${22 + i * 4}% / .5)`; ctx.beginPath(); ctx.moveTo(0, h); for (let x = 0; x <= w; x += 20) ctx.lineTo(x, h * (0.55 + i * 0.07) + Math.sin(x / 90 + i + t * (0.2 + i * 0.05)) * 14); ctx.lineTo(w, h); ctx.fill(); }
  const flash = marks.some(([mt]) => Math.abs(mt - t) < 0.5);
  for (let i = 0; i < 10; i++) { const side = i < 5, px = w * (side ? 0.2 : 0.8) + Math.sin(t * 0.9 + i) * w * 0.12, py = h * 0.55 + Math.cos(t * 0.7 + i * 1.7) * h * 0.18; ctx.fillStyle = side ? "#4da3ff" : "#ff6b6b"; ctx.beginPath(); ctx.arc(px, py, h * 0.03, 0, 7); ctx.fill(); ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fillRect(px - h * 0.04, py - h * 0.07, h * 0.08 * (0.4 + 0.6 * ((Math.sin(t + i) + 1) / 2)), h * 0.012); }
  if (flash) { ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.fillRect(0, 0, w, h); }
}
function paintStudio() {
  const c = CLIPS[S.clipSel]; if (!c) return;
  const cv = $("#scr"); if (!cv) return;
  scene(cv.getContext("2d"), cv.width, cv.height, ed.t, c.hue, c.marks);
  $("#ph").style.left = (ed.t / c.dur) * 100 + "%";
  $("#sel").style.left = (ed.a / c.dur) * 100 + "%"; $("#sel").style.width = ((ed.b - ed.a) / c.dur) * 100 + "%";
  $("#tt").textContent = `${fmtT(ed.t)} / ${fmtT(c.dur)} · Bereich ${fmtT(ed.a)}–${fmtT(ed.b)} (${Math.round(ed.b - ed.a)} s)`;
  $("#ov").textContent = `${c.title} · ${fmtT(ed.t)}`;
}
function loop(now) {
  const dt = (now - ed.last) / 1000; ed.last = now;
  if (ed.playing && S.tab === "studio") { ed.t += dt; const c = CLIPS[S.clipSel]; if (ed.t >= ed.b) ed.t = ed.a; paintStudio(); void c; }
  ed.raf = requestAnimationFrame(loop);
}
function selectClip(i) { S.clipSel = i; const c = CLIPS[i]; ed.t = 0; ed.a = 0; ed.b = c ? c.dur : 0; ed.playing = false; }
function bindStudio() {
  $$("canvas[data-th]").forEach((cv) => scene(cv.getContext("2d"), cv.width, cv.height, 3, CLIPS[+cv.dataset.th].hue, []));
  const c = CLIPS[S.clipSel];
  const strip = $("#strip"); if (strip && c) { const x = strip.getContext("2d"); for (let i = 0; i < 40; i++) { scene(x, strip.width / 40, strip.height, (i / 40) * c.dur, c.hue, []); /* Streifen aus kleinen Bildern */ } x.clearRect(0, 0, 0, 0); const sx = strip.getContext("2d"); sx.globalCompositeOperation = "source-over"; for (let i = 0; i < 40; i++) { sx.save(); sx.translate((strip.width / 40) * i, 0); sx.beginPath(); sx.rect(0, 0, strip.width / 40, strip.height); sx.clip(); scene(sx, strip.width / 40, strip.height, (i / 40) * c.dur, c.hue, []); sx.restore(); } }
  $("#rec").onclick = () => {
    if (S.rec) { const secs = Math.round((Date.now() - S.rec) / 1000); S.rec = null; toast(`Aufnahme beendet (${fmtT(secs)})`); }
    else { S.rec = Date.now(); toast("Aufnahme gestartet (Demo)"); }
    render();
  };
  $("#save").onclick = () => { const secs = Math.min(30, Math.round((Date.now() - S.rec) / 1000) + 12); CLIPS.unshift(mkClip(clipId++, `Aufnahme ${new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`, secs, Math.floor(Math.random() * 360), 0, [[Math.round(secs * 0.4), "kill"], [Math.round(secs * 0.75), "team"]])); selectClip(0); toast("Clip gesichert"); render(); };
  $("#clips").onclick = (e) => { const b = e.target.closest("[data-c]"); if (b) { selectClip(+b.dataset.c); render(); } };
  if (!c) return;
  const tl = $("#tl");
  const seek = (e) => { const r = tl.getBoundingClientRect(); ed.t = Math.max(0, Math.min(c.dur, ((e.clientX - r.left) / r.width) * c.dur)); paintStudio(); };
  tl.onpointerdown = (e) => { const m = e.target.closest(".mk"); if (m) { ed.t = +m.dataset.t; paintStudio(); return; } tl.setPointerCapture(e.pointerId); seek(e); tl.onpointermove = seek; };
  tl.onpointerup = () => { tl.onpointermove = null; };
  $("#play").onclick = () => { ed.playing = !ed.playing; $("#play").textContent = ed.playing ? "Pause" : "Abspielen"; };
  $("#in").onclick = () => { ed.a = Math.min(ed.t, ed.b - 1); paintStudio(); };
  $("#out").onclick = () => { ed.b = Math.max(ed.t, ed.a + 1); paintStudio(); };
  $("#cut").onclick = () => {
    const len = Math.round(ed.b - ed.a);
    if (len >= c.dur) return toast("Erst Anfang oder Ende verschieben, dann schneiden.");
    CLIPS.unshift(mkClip(clipId++, c.title + " (Schnitt)", len, c.hue, 0, c.marks.filter(([t]) => t >= ed.a && t <= ed.b).map(([t, k]) => [t - ed.a, k])));
    selectClip(0); toast(`Neuer Clip: ${fmtT(len)}`); render();
  };
  $("#del").onclick = () => { CLIPS.splice(S.clipSel, 1); selectClip(0); toast("Clip gelöscht"); render(); };
  $("#ren").onclick = () => {
    const b = $(`[data-c="${S.clipSel}"] b`); const inp = Object.assign(document.createElement("input"), { className: "n-input", value: c.title }); inp.style.cssText = "height:26px;width:100%;font-size:12.5px";
    b.replaceWith(inp); inp.focus(); inp.select();
    const done = (ok) => { if (ok && inp.value.trim()) c.title = inp.value.trim(); render(); };
    inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === "Enter") done(true); if (e.key === "Escape") done(false); };
    inp.onblur = () => done(true);
  };
}
addEventListener("keydown", (e) => {
  if (S.tab !== "studio" || e.target.closest("input")) return;
  if (e.key === " ") { e.preventDefault(); $("#play")?.click(); } else if (e.key.toLowerCase() === "i") $("#in")?.click(); else if (e.key.toLowerCase() === "o") $("#out")?.click();
});
setInterval(() => { if (S.rec) { const t = $("#rtime"); if (t) t.textContent = fmtT((Date.now() - S.rec) / 1000); } }, 500);

// ---------- Rahmen ----------
let drawing = false;
function render(soft = false) {
  if (soft) {
    // Live-Takt: nur ändern, was sich ändert
    if (S.tab === "pro" && S.open) {
      const s = SERIES.find((x) => x.id === S.open), g = s.games[S.game];
      if (!g) return;
      if (g.state === "live" || $("#gdet")?.dataset.done !== "1") { const det = $("#gdet"); if (det && !det.matches(":hover")) { det.innerHTML = gameBody(s, g); det.dataset.done = g.state === "live" ? "" : "1"; bindChart(s, g); } else if (det) { /* Maus darüber: Diagramm nicht verwerfen */ } }
      return;
    }
    if (S.tab === "pro" && (S.sub === "live" || S.sub === "plan")) return paintPro();
    return;
  }
  if (drawing) return;
  drawing = true;
  const view = S.tab === "pro" ? proView() : S.tab === "me" ? meView() : studioView();
  main.innerHTML = `<div class="view" id="view">${view}</div>`;
  drawing = false;
  if (S.tab === "pro") bindPro(); else if (S.tab === "me") bindMe(); else bindStudio();
  if (S.tab === "studio") paintStudio();
}
function paintPro() {
  const v = $("#view"); if (!v || S.open) return;
  const y = v.scrollTop; v.innerHTML = proView(); v.scrollTop = y; v.style.animation = "none"; bindPro();
}
function bindPro() {
  const v = $("#view");
  const sub = $("#sub"); if (sub) segments(sub, (b) => { S.sub = b.dataset.k; render(); });
  v.onclick = (e) => {
    const lg = e.target.closest("[data-lg]"); if (lg) { const k = lg.dataset.lg; S.leagues.has(k) ? (S.leagues.size > 1 && S.leagues.delete(k)) : S.leagues.add(k); return render(); }
    const s = e.target.closest("[data-s]"); if (s) { S.open = s.dataset.s; const sr = SERIES.find((x) => x.id === S.open); S.game = Math.max(0, sr.games.length - 1); return render(); }
    if (e.target.closest("#back")) { S.open = null; return render(); }
    const g = e.target.closest("[data-g]"); if (g) { S.game = +g.dataset.g; return render(); }
  };
  if (S.open) { const s = SERIES.find((x) => x.id === S.open); if (s.games[S.game]) bindChart(s, s.games[S.game]); }
}
main.addEventListener("click", (e) => { const m = e.target.closest("[data-m]"); if (m && S.tab === "me") { S.meSel = S.meSel === m.dataset.m ? null : m.dataset.m; render(); } });

// Tabs
new MutationObserver(() => {}).observe(main, { childList: true });
$("#tabs").addEventListener("click", () => { S.open = null; });
const pop = $("#pop");
$("#gear").onclick = () => {
  pop.hidden = !pop.hidden;
  pop.innerHTML = `<label><span>Ergebnisse in der Notch<small>Spielende erscheint oben in der Notch</small></span><span class="n-switch" role="switch" aria-checked="${settings.notch}" tabindex="0" data-set="notch"></span></label><label><span>Benachrichtigung bei Spielbeginn<small>Nur in der installierten App</small></span><span class="n-switch" role="switch" aria-checked="${settings.notify}" tabindex="0" data-set="notify"></span></label>`;
};
pop.addEventListener("click", (e) => { const sw = e.target.closest("[data-set]"); if (!sw) return; const k = sw.dataset.set; settings[k] = !settings[k]; sw.setAttribute("aria-checked", settings[k]); if (k === "notify" && settings[k]) toast("In der echten App kommt jetzt eine Windows-Meldung."); });
addEventListener("pointerdown", (e) => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest("#gear")) pop.hidden = true; });

selectClip(0);
render();
ed.raf = requestAnimationFrame((t) => { ed.last = t; loop(t); });
