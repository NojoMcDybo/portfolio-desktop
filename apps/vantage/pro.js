// Pro: Profispiele (erfundene Liga). Live: laufende und anstehende Serien als Kartenreihe, darunter die gewählte Serie mit ihren Spielen;
// das gewählte Spiel mit Anzeigetafel, Goldverlauf, Teams und Ticker. Spielplan, Turnier und Teams wie in der echten App.
// Spoiler-frei (Einstellungen): Ergebnisse bleiben verborgen, bis man sie je Serie aufdeckt.
import { gameView } from "./game.js";
import { LEAGUES, allSeries, gameById, leagueBy, liveSeriesList, seriesById, standingsOf, teamInfo, tournamentsOf } from "./world.js";
import { ROLE } from "./dd.js";
import { card, countdown, dayName, dragScroll, el, faint, img, load, morph, q, sameDay, save, timeOf, toast, DAY } from "./ui.js";

export const DEFAULT_LEAGUES = ["globalcup", "nordcup", "suedliga"];
let settings = { leagues: DEFAULT_LEAGUES, results: true, follow: [], ...load("pro", {}) };
if (!Array.isArray(settings.follow)) settings.follow = [];
let sub = "live";
let live = [], sched = [];
const revealed = new Set();
let focusId = "", focusSeries = null, gameId = "";
let cupLeague = "", tournamentId = "", stages = [], teamSlug = "";
let stripPlaced = false;

const root = () => q('.view[data-view="pro"]');
const inChosen = (s) => settings.leagues.includes(s.league);
const showResult = (id) => settings.results || revealed.has(id);
export const proSettings = () => settings;
export const leagueList = () => LEAGUES;

// ---------- Teams folgen ----------
const follows = (name) => !!name && settings.follow.includes(name);
const followed = (s) => s.teams.some((t) => follows(t.name));
function toggleFollow(t) {
  settings = { ...settings, follow: follows(t.name) ? settings.follow.filter((x) => x !== t.name) : [...settings.follow, t.name] };
  save("pro", settings);
  renderAll();
  if (sub === "teams") renderTeam();
}
function followBtn(t) {
  if (!t?.name || t.name === "TBD") return el("span", "");
  const on = follows(t.name);
  const b = el("button", `follow${on ? " on" : ""}`, on ? "★ Folge ich" : "☆ Folgen");
  b.title = on ? "Nicht mehr folgen" : "Benachrichtigung bei Spielbeginn und in der Notch";
  b.onclick = (e) => { e.stopPropagation(); toggleFollow(t); };
  return b;
}

// ---------- Bausteine ----------
const teamLogo = (t, cls = "logo") => img(t?.image ?? "", cls, t?.name ?? "", t?.code?.slice(0, 3) ?? "?");
const leagueIcon = (slug, name) => img(leagueBy(slug)?.image ?? "", "lg", name, name.slice(0, 3).toUpperCase());

function scoreOf(s, plain = false) {
  if (s.state === "unstarted") return plain ? "vs" : timeOf(s.start);
  if (!showResult(s.id)) return "–:–";
  return `${s.teams[0]?.wins ?? 0}:${s.teams[1]?.wins ?? 0}`;
}
const winnerCls = (s, i) => (s.state !== "completed" || !showResult(s.id) ? "" : s.teams[i]?.outcome === "win" ? "won" : "lost");

function seriesRow(s, cls = "srow", inPlan = false) {
  const b = el("button", `${cls} ${s.state}`);
  b.dataset.key = s.id;
  if (s.id === focusId) b.classList.add("active");
  const [a, z] = [s.teams[0], s.teams[1]];
  const side = (t, i, right = false) => {
    const box = el("span", `sr-team ${winnerCls(s, i)}${right ? " right" : ""}`);
    const code = el("span", "sr-code", t?.code || "TBD");
    if (right !== inPlan) box.append(code, teamLogo(t)); else box.append(teamLogo(t), code);
    return box;
  };
  const mid = el("span", `sr-score n-num ${s.state}`, scoreOf(s, inPlan));
  if (followed(s)) b.classList.add("followed");
  b.append(leagueIcon(s.league, s.league_name), side(a, 0), mid, side(z, 1, true));
  const meta = el("span", "sr-meta");
  if (s.state === "inProgress") meta.append(el("i", "live-dot"), el("span", "", "Live"));
  else if (s.state === "unstarted") meta.append(el("span", "", inPlan ? s.block : sameDay(s.start, Date.now()) ? countdown(s.start) : dayName(s.start)));
  else meta.append(el("span", "", s.block || "Beendet"));
  meta.append(el("span", "faint", `Bo${s.best_of}`));
  b.append(meta);
  b.onclick = () => openSeries(s.id, s);
  return b;
}

/** kleine Karte für die waagrechte Leiste der Live-Seite: Liga und Zustand, darunter beide Teams mit Stand */
function seriesCard(s) {
  const b = el("button", `scard ${s.state}`);
  b.dataset.key = s.id;
  if (s.id === focusId) b.classList.add("active");
  if (followed(s)) b.classList.add("followed");
  const top = el("div", "sc-top");
  const state = el("span", `sc-state ${s.state}`);
  if (s.state === "inProgress") state.append(el("i", "live-dot"), el("span", "", "Live"));
  else if (s.state === "unstarted") state.append(el("span", "", sameDay(s.start, Date.now()) ? timeOf(s.start) : `${dayName(s.start)} ${timeOf(s.start)}`));
  else state.append(el("span", "", "Beendet"));
  top.append(leagueIcon(s.league, s.league_name), state, el("span", "faint sc-bo", `Bo${s.best_of}`));
  b.append(top);
  const shown = s.state !== "unstarted" && showResult(s.id);
  s.teams.slice(0, 2).forEach((t, i) => {
    const r = el("div", `sc-team ${winnerCls(s, i)}`);
    r.append(teamLogo(t), el("span", "sc-code", t?.code || "TBD"), el("b", "sc-score n-num", s.state === "unstarted" ? "" : shown ? String(t?.wins ?? 0) : "–"));
    b.append(r);
  });
  if (s.state === "unstarted" && s.start - Date.now() < 6 * 3_600_000 && s.start > Date.now()) b.append(el("span", "sc-soon faint", countdown(s.start)));
  b.onclick = () => openSeries(s.id, s);
  return b;
}

// ---------- Live ----------
function stripItems() {
  const now = Date.now();
  const all = new Map();
  for (const s of sched.filter(inChosen)) all.set(s.id, s);
  const byStart = (a, b) => a.start - b.start;
  const xs = [...all.values()].filter((s) => s.teams.length === 2);
  const done = xs.filter((s) => s.state === "completed").sort(byStart).slice(-14);
  const running = xs.filter((s) => s.state === "inProgress").sort(byStart);
  let next = xs.filter((s) => s.state === "unstarted" && s.start < now + 7 * DAY).sort(byStart).slice(0, 16);
  if (!next.length) next = xs.filter((s) => s.state === "unstarted").sort(byStart).slice(0, 8);
  return { done, running, next };
}

function renderStrip() {
  const strip = q(".strip", root());
  const { done, running, next } = stripItems();
  const keepLeft = strip.scrollLeft;
  const out = done.map(seriesCard);
  if (done.length && running.length + next.length) {
    const now = el("div", "strip-now");
    now.dataset.key = "now";
    now.append(el("span", "", "Jetzt"));
    out.push(now);
  }
  out.push(...running.map(seriesCard), ...next.map(seriesCard));
  strip.replaceChildren(...(out.length ? out : [faint("Keine Serien in den gewählten Ligen.", "faint pad")]));
  strip.scrollLeft = keepLeft;
  if (!stripPlaced && out.length) {
    const mark = strip.querySelector(".strip-now");
    if (mark) strip.scrollLeft = Math.max(0, mark.offsetLeft - strip.offsetLeft - 2.4 * 186);
    stripPlaced = true;
  }
  const first = running[0] ?? done.at(-1) ?? next[0];
  if ((!focusId || !seriesById(focusId)) && first) openSeries(first.id, first);
}

const toastDemo = (what) => () => toast(`${what} öffnet sich in der echten App – hier ist alles Beispiel.`);
function linkBtn(label, what) { const b = el("button", "n-btn link-btn", label); b.onclick = toastDemo(what); return b; }

function focusHead(s) {
  const h = el("section", "focus-head n-card");
  const [a, z] = [s.teams[0], s.teams[1]];
  const team = (t, i) => {
    const box = el("div", `fh-team ${i ? "right" : "left"} ${winnerCls(s, i)}`);
    const info = el("div", "fh-info");
    const line = el("div", "fh-line");
    if (t?.record && showResult(s.id)) line.append(el("span", "faint n-num", `${t.record[0]}–${t.record[1]}`));
    line.append(followBtn(t));
    info.append(el("b", "", t?.name || "TBD"), line);
    box.append(teamLogo(t, "logo fh-logo"), info);
    return box;
  };
  const mid = el("div", "fh-mid");
  const league = el("div", "fh-league");
  league.append(leagueIcon(s.league, s.league_name), el("span", "", [s.league_name, s.block].filter(Boolean).join(" · ")));
  mid.append(league, el("div", `fh-score n-display ${s.state}`, scoreOf(s)));
  const soon = s.start && s.start - Date.now() < DAY && s.start > Date.now() ? ` · ${countdown(s.start)}` : "";
  const state = s.state === "inProgress" ? "Live" : s.state === "unstarted" ? `${dayName(s.start)}, ${timeOf(s.start)}${soon}` : "Beendet";
  mid.append(el("div", `fh-state ${s.state}`, `${state} · Best of ${s.best_of}`));
  if (!showResult(s.id) && s.state !== "unstarted") {
    const reveal = el("button", "n-btn reveal", "Ergebnis anzeigen");
    reveal.onclick = () => { revealed.add(s.id); renderAll(); };
    mid.append(reveal);
  }
  const links = el("div", "fh-links");
  if (s.state === "inProgress" && s.streams.length) links.append(linkBtn("Stream (Twitch, Deutsch)", "Der Stream"));
  mid.append(links);
  h.append(team(a, 0), mid, team(z, 1));
  return h;
}

function gameTabs(s) {
  const games = s.games.filter((g) => g.state !== "unneeded");
  if (!games.some((g) => g.state !== "unstarted")) return null;
  const seg = el("div", "n-seg game-tabs");
  for (const g of games) {
    const b = el("button", g.id === gameId ? "active" : "", `Spiel ${g.number}`);
    if (g.state === "inProgress") b.prepend(el("i", "live-dot"));
    if (g.state === "unstarted") b.classList.add("later");
    b.onclick = () => { gameId = g.id; renderFocus(); };
    seg.append(b);
  }
  return seg;
}

function renderFocus() {
  const host = q(".focus", root());
  const s = focusSeries;
  if (!s) { host.replaceChildren(faint(focusId ? "Lädt …" : "Wähle eine Serie.")); return; }
  const out = [focusHead(s)];
  const tabs = gameTabs(s);
  const g = s.games.find((x) => x.id === gameId);
  if (tabs || g) {
    const bar = el("div", "game-bar");
    if (tabs) bar.append(tabs);
    if (g && g.state === "completed" && g.vods.length) bar.append(linkBtn("VOD (YouTube)", "Die Aufzeichnung"));
    out.push(bar);
  }
  if (s.state === "unstarted" && !s.games.some((x) => x.state !== "unstarted")) out.push(faint(`Die Serie beginnt ${dayName(s.start).startsWith("Heute") || dayName(s.start).startsWith("Morgen") ? dayName(s.start).toLowerCase() : `am ${dayName(s.start)}`} um ${timeOf(s.start)}.`));
  else if (!g) out.push(faint("Keine Spieldaten."));
  else if (!showResult(s.id) && g.state !== "unstarted") {
    const hid = card("Spoiler-frei", "", "spoiler");
    hid.append(el("p", "faint", "Ergebnisse sind verborgen. Schau das VOD oder decke die Serie oben auf."));
    out.push(hid);
  } else if (g.state === "unstarted") out.push(faint("Dieses Spiel hat noch nicht begonnen."));
  else {
    const data = gameById(g.id);
    out.push(...(data ? gameView(data, s) : [faint("Spieldaten laden …")]));
  }
  const hostKeep = host.scrollTop;
  morph(host, out);
  host.scrollTop = hostKeep;
}

function openSeries(id, hint) {
  const changed = id !== focusId;
  if (changed) {
    focusId = id;
    focusSeries = hint ? { ...hint } : null;
    gameId = "";
    if (sub !== "live") setSub("live");
  }
  refreshSeries();
  if (changed) { renderStrip(); }
}

function refreshSeries() {
  const s = seriesById(focusId);
  if (!s) { focusSeries = null; renderFocus(); return; }
  focusSeries = s;
  if (!gameId || !s.games.some((g) => g.id === gameId && g.state !== "unneeded")) {
    const gs = s.games.filter((g) => g.state !== "unneeded");
    gameId = (gs.find((g) => g.state === "inProgress") ?? [...gs].reverse().find((g) => g.state === "completed") ?? gs[0])?.id ?? "";
  }
  renderFocus();
}

// ---------- Spielplan ----------
function renderPlan() {
  const host = q(".plan", root());
  const out = [];
  const more = (dir, label) => { const b = el("button", "n-btn more", label); b.dataset.key = `more-${dir}`; b.disabled = true; return b; };
  out.push(more("older", "Frühere laden"));
  const days = new Map();
  for (const s of sched.filter(inChosen)) { const k = new Date(s.start).toDateString(); days.set(k, [...(days.get(k) ?? []), s]); }
  for (const [k, list] of days) {
    const day = el("section", "day");
    day.dataset.key = k;
    const t = list[0].start;
    if (sameDay(t, Date.now())) day.classList.add("today");
    const head = el("h3", "day-head n-glass n-liquid", dayName(t));
    const rows = el("div", "day-rows n-card");
    for (const s of list) { const r = seriesRow(s, "srow plan-row", true); r.prepend(el("span", "pr-time n-num", timeOf(s.start))); rows.append(r); }
    day.append(head, rows);
    out.push(day);
  }
  if (!sched.length) out.push(faint("Keine Serien gefunden."));
  out.push(more("newer", "Spätere laden"));
  host.replaceChildren(...out);
}

// ---------- Turnier und Teams ----------
function leagueSeg(host, onPick) {
  const seg = el("div", "chips cup-leagues");
  for (const slug of settings.leagues) {
    const l = leagueBy(slug);
    if (!l) continue;
    const b = el("button", `chip${slug === cupLeague ? " on" : ""}`);
    b.append(img(l.image, "lg", l.name, ""), el("span", "", l.name));
    b.onclick = () => { cupLeague = slug; tournamentId = ""; stages = []; onPick(); };
    seg.append(b);
  }
  host.append(seg);
}
const tName = (t) => t.slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function loadCup() {
  if (!cupLeague) cupLeague = settings.leagues.find((s) => leagueBy(s)) ?? "";
  const l = leagueBy(cupLeague);
  if (!l) return;
  const ts = tournamentsOf(l.id);
  if (!tournamentId || !ts.some((t) => t.id === tournamentId)) tournamentId = ts[0]?.id ?? "";
  stages = tournamentId ? standingsOf(tournamentId) : [];
  renderCup();
  renderTeams();
}

function bracketRow(m) {
  const s = { id: m.id, state: m.state, teams: m.teams };
  const b = el("button", `brow ${m.state}`);
  b.dataset.key = m.id;
  const t = (x, i) => {
    const r = el("span", `br-team ${winnerCls({ ...s, state: m.state }, i)}`);
    r.append(teamLogo(x), el("span", "", x?.code || "TBD"));
    if (m.state !== "unstarted") r.append(el("b", "n-num", showResult(m.id) ? String(x?.wins ?? 0) : "–"));
    return r;
  };
  b.append(t(m.teams[0], 0), t(m.teams[1], 1));
  if (m.teams.every((x) => x.slug !== "tbd") && seriesById(m.id)) b.onclick = () => openSeries(m.id);
  else b.onclick = () => toast("Diese Paarung ist noch nicht gespielt.");
  return b;
}

function renderCup() {
  const host = q(".cup", root());
  const head = el("div", "cup-head");
  leagueSeg(head, () => loadCup());
  const ts = tournamentsOf(leagueBy(cupLeague)?.id ?? "");
  if (ts.length) {
    const sel = el("select", "n-input t-select");
    for (const t of ts) { const o = el("option", "", tName(t)); o.value = t.id; o.selected = t.id === tournamentId; sel.append(o); }
    sel.onchange = () => { tournamentId = sel.value; loadCup(); };
    head.append(sel);
  }
  const out = [head];
  for (const st of stages) {
    const sc = el("section", "stage");
    sc.append(el("h3", "stage-name", st.name));
    for (const sec of st.sections) {
      const c = card(sec.name, sec.rankings.length ? "Tabelle" : `${sec.matches.length} Paarungen`, "section");
      if (sec.rankings.length) {
        const tbl = el("div", "rank");
        for (const r of sec.rankings) for (const t of r.teams) {
          const row = el("button", "rank-row");
          row.append(el("span", "rk-n n-num", r.ordinal), teamLogo(t), el("span", "rk-name", t.name), el("span", "rk-rec n-num", t.record && showResult(tournamentId) ? `${t.record[0]}–${t.record[1]}` : "–"));
          row.onclick = () => { teamSlug = t.slug; setSub("teams"); renderTeams(); };
          tbl.append(row);
        }
        c.append(tbl);
      }
      if (sec.matches.length) { const ms = el("div", "brackets"); for (const m of sec.matches) ms.append(bracketRow(m)); c.append(ms); }
      sc.append(c);
    }
    out.push(sc);
  }
  if (!stages.length) out.push(faint("Für dieses Turnier gibt es noch keine Tabelle."));
  host.replaceChildren(...out);
}

function cupTeams() {
  const seen = new Map();
  for (const st of stages) for (const sec of st.sections) {
    for (const r of sec.rankings) for (const t of r.teams) seen.set(t.slug, t);
    for (const m of sec.matches) for (const t of m.teams) if (t.slug && t.slug !== "tbd") seen.set(t.slug, t);
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function renderTeams() {
  const side = q(".ts-list", root());
  const find = (q(".team-search", root()).value || "").toLowerCase();
  const teams = cupTeams().filter((t) => !find || t.name.toLowerCase().includes(find) || t.code.toLowerCase().includes(find));
  side.replaceChildren(...(teams.length ? teams.map((t) => {
    const b = el("button", `ts-item${t.slug === teamSlug ? " active" : ""}`);
    b.append(teamLogo(t), el("span", "", t.name), el("span", "faint", t.code));
    b.onclick = () => { teamSlug = t.slug; renderTeams(); };
    return b;
  }) : [faint(stages.length ? "Keine Treffer." : "Turnier wählen (Reiter Turnier).", "faint pad")]));
  renderTeam();
}

function renderTeam() {
  const host = q(".teams-main", root());
  const t = teamSlug ? teamInfo(teamSlug) : null;
  if (!t) { host.replaceChildren(faint("Wähle links ein Team.")); return; }
  const head = el("section", "team-head n-card");
  const name = el("div", "th-name");
  name.append(el("h2", "n-display", t.name), el("span", "faint", [t.code, t.league, t.region].filter(Boolean).join(" · ")));
  head.append(img(t.image, "logo huge", t.name, t.code), name, followBtn(t));
  const roster = card("Kader", `${t.players.length} Spieler`, "roster");
  const grid = el("div", "roster-grid");
  for (const p of t.players) {
    const c = el("div", "player");
    const ph = img("", "photo", p.name, p.name.slice(0, 2));
    ph.style.setProperty("--ph", String([...p.name].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 360));
    c.append(ph, el("b", "", p.name), el("span", "faint", [p.first, p.last].filter(Boolean).join(" ")), el("span", `role r-${p.role}`, ROLE[p.role] ?? p.role));
    grid.append(c);
  }
  roster.append(grid);
  const games = card("Im Turnier", "", "team-series");
  const list = el("div", "brackets");
  for (const st of stages) for (const sec of st.sections) for (const m of sec.matches) if (m.teams.some((x) => x.slug === t.slug)) list.append(bracketRow(m));
  if (!list.children.length) list.append(faint("Keine Paarungen in diesem Turnier.", "faint"));
  games.append(list);
  host.replaceChildren(head, roster, games);
}

// ---------- Rahmen ----------
export function setSub(s) {
  sub = s;
  root().querySelectorAll(".sub").forEach((x) => (x.hidden = x.dataset.sub !== s));
  root().querySelectorAll(".pro-sub button").forEach((b) => b.classList.toggle("active", b.dataset.sub === s));
  if (s === "plan") renderPlan();
  if ((s === "cup" || s === "teams") && !stages.length) loadCup();
  if (s === "cup") renderCup();
  if (s === "teams") renderTeams();
}

function renderAll() { renderStrip(); renderFocus(); if (sub === "plan") renderPlan(); if (sub === "cup") renderCup(); if (sub === "teams") renderTeams(); }
export function showPro() { renderAll(); }

export function applySettings(next) {
  const leaguesChanged = next.leagues.join() !== settings.leagues.join();
  settings = next;
  if (leaguesChanged) { if (!settings.leagues.includes(cupLeague)) { cupLeague = ""; stages = []; } focusId = ""; focusSeries = null; }
  renderAll();
}

function tick() {
  live = liveSeriesList();
  sched = allSeries();
  if (!root().hidden) {
    renderStrip();
    if (focusSeries) refreshSeries();
    if (sub === "plan") renderPlan();
  }
}

export function initPro(save2) {
  const r = root();
  r.querySelectorAll(".pro-sub button").forEach((b) => (b.onclick = () => setSub(b.dataset.sub)));
  q(".team-search", r).oninput = () => renderTeams();
  dragScroll(q(".strip", r));
  live = liveSeriesList();
  sched = allSeries();
  renderAll();
  setInterval(tick, 3000);
  void save2;
}
