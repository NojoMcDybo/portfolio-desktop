// Ich: das eigene Konto (Beispielkonto). Kopf mit Symbol, Riot-ID, Spielphase und Rängen; Unterseiten Übersicht, Spiele, Mastery und Notizen.
// Mastery: Kennzahlen, Blasen (antippen), Verteilung nach Klasse, Fortschritt zum nächsten Level, Verlauf. Spiele: Bilanz, Spielverlauf und die Spielansicht.
import { champByKey, champImg, champName, champTags, CLASS, iconImg, itemImg, itemName } from "./dd.js";
import { gameView } from "./game.js";
import { ME, MASTERY, MASTERY_HISTORY, MY_GAMES, myGameDetail } from "./world.js";
import { card, clock, dayName, el, faint, img, kilo, load, nf, pct, q, save, timeOf, toast, DAY } from "./ui.js";

const TIER = { IRON: "Eisen", BRONZE: "Bronze", SILVER: "Silber", GOLD: "Gold", PLATINUM: "Platin", EMERALD: "Smaragd", DIAMOND: "Diamant", MASTER: "Meister", GRANDMASTER: "Großmeister", CHALLENGER: "Herausforderer" };
const TIER_COLOR = { IRON: "#8d8079", BRONZE: "#b5764f", SILVER: "#a9b4bd", GOLD: "#e3bd6d", PLATINUM: "#4fc7b8", EMERALD: "#3ddc84", DIAMOND: "#7aa8ff", MASTER: "#c77dff", GRANDMASTER: "#ff6b6b", CHALLENGER: "#ffd56b" };
const PANES = [["over", "Übersicht"], ["games", "Spiele"], ["mastery", "Mastery"], ["notes", "Notizen"]];
const QUEUES = [["all", "Alle"], ["Solo/Duo", "Solo/Duo"], ["Flex", "Flex"], ["Normal", "Normal"]];
let pane = load("me", { pane: "over" }).pane;
let queue = "all", openId = "";
let notes = load("notes", { list: [{ champ: "Ahri", text: "Gegen Zed: Zauberschild nach seinem R, nicht davor. Früh Wellen schieben und Jungle-Wege merken." }] }).list;
let draft = { champ: "Ahri", text: "" };

const root = () => q('.view[data-view="me"]');
const ago = (t) => { const d = Date.now() - t; if (d < 3_600_000) return "gerade"; if (d < DAY) return `vor ${Math.round(d / 3_600_000)} Std`; const days = Math.round(d / DAY); return days < 45 ? (days === 1 ? "gestern" : `vor ${days} Tagen`) : `vor ${Math.round(days / 30)} Monaten`; };

function setPane(p) { pane = p; save("me", { pane }); render(); }

function meBar() {
  const bar = el("div", "subbar me-bar");
  const seg = el("div", "n-seg me-sub");
  for (const [p, label] of PANES) { const b = el("button", p === pane ? "active" : "", label); b.onclick = () => setPane(p); seg.append(b); }
  const s = el("div", "subbar pf-search");
  const inp = el("input", "n-input pf-q");
  inp.placeholder = "Riot-ID suchen: Name#Tag";
  const reg = el("select", "n-input pf-region");
  for (const r of ["EUW", "EUNE", "NA", "KR"]) reg.append(new Option(r, r));
  const go = el("button", "n-btn primary", "Suchen");
  const search = () => toast(inp.value.includes("#") ? "Fremde Profile lädt die echte App über die Riot-API – hier ist alles Beispiel." : "Riot-ID bitte als Name#Tag eingeben.", inp.value.includes("#") ? "ok" : "err");
  go.onclick = search; inp.onkeydown = (e) => { if (e.key === "Enter") search(); };
  s.append(inp, reg, go);
  bar.append(seg, s);
  return bar;
}

// ---------- Kopf ----------
export function rankBoxes(list) {
  const ranks = el("div", "me-ranks");
  for (const r of list) {
    const box = el("div", "rank-box");
    box.style.setProperty("--tc", TIER_COLOR[r.tier] ?? "var(--n-dim)");
    const games = r.wins + r.losses;
    box.append(
      el("span", "n-eyebrow", r.queue === "RANKED_SOLO_5x5" ? "Solo/Duo" : "Flex"),
      el("b", "rank-tier", `${TIER[r.tier] ?? r.tier}${["MASTER", "GRANDMASTER", "CHALLENGER"].includes(r.tier) ? "" : ` ${r.division}`}`),
      el("span", "n-num", `${r.lp} LP · ${r.wins} S – ${r.losses} N${games ? ` · ${Math.round((r.wins / games) * 100)} %` : ""}`),
    );
    ranks.append(box);
  }
  return ranks;
}

function head() {
  const h = el("section", "me-head n-card");
  const icon = img(iconImg(ME.account.icon), "me-icon", "", "");
  icon.append(el("span", "me-lvl n-num", ME.account.level));
  const who = el("div", "me-who");
  const name = el("h2", "n-display");
  name.append(el("span", "", ME.account.name), el("span", "me-tag", `#${ME.account.tag}`));
  const st = el("div", "me-status");
  st.append(el("i", "ok-dot"), el("span", "", "Im Client"));
  who.append(name, st);
  h.append(icon, who, rankBoxes(ME.ranks));
  return h;
}

// ---------- Mastery ----------
function kpis() {
  const box = el("div", "kpis");
  const total = MASTERY.reduce((s, m) => s + m.points, 0);
  const k = (label, value, sub = "") => { const d = el("div", "kpi n-card"); d.append(el("span", "n-eyebrow", label), el("b", "n-display", value)); if (sub) d.append(el("span", "faint", sub)); box.append(d); };
  const top = MASTERY[0];
  k("Mastery gesamt", nf(total), `${MASTERY.length} Champions gespielt`);
  k("Bester Champion", champName(top.id), `${nf(top.points)} Punkte · Level ${top.level}`);
  k("Level 10 und mehr", String(MASTERY.filter((m) => m.level >= 10).length), `${MASTERY.filter((m) => m.level >= 5).length} ab Level 5`);
  k("Zuletzt gespielt", String(MASTERY.filter((m) => Date.now() - m.last_play < 14 * DAY).length), "Champions in 14 Tagen");
  return box;
}

/** Blasen: Größe nach Punkten, locker gepackt; Zeigen = Name und Punkte als Glaspille */
function bubbleCard() {
  const c = card("Mastery-Blasen", "antippen", "bubble-card");
  const box = el("div", "bubbles");
  const pill = el("div", "bub-pill n-glass n-liquid");
  pill.hidden = true;
  c.append(box);
  box.append(pill);
  const place = () => {
    const W = box.clientWidth || 640, Hh = box.clientHeight || 440;
    const max = Math.max(...MASTERY.map((m) => m.points));
    const items = MASTERY.map((m) => ({ m, r: 18 + 58 * Math.sqrt(m.points / max) }));
    const placed = [];
    // einfache Spirale um die Mitte, bis keine Blase mehr überlappt
    for (const it of items) {
      for (let a = 0, rad = 0; ; a += 0.5, rad += 0.9) {
        const x = W / 2 + Math.cos(a) * rad * 1.45, y = Hh / 2 + Math.sin(a) * rad;
        if (x - it.r < 4 || x + it.r > W - 4 || y - it.r < 4 || y + it.r > Hh - 4) { if (rad > Math.max(W, Hh)) { it.x = W / 2; it.y = Hh / 2; placed.push(it); break; } continue; }
        if (placed.every((p) => Math.hypot(p.x - x, p.y - y) > p.r + it.r + 3)) { it.x = x; it.y = y; placed.push(it); break; }
      }
    }
    box.querySelectorAll(".bub").forEach((b) => b.remove());
    placed.forEach((it, i) => {
      const b = el("button", `bub${it.m.level <= 2 ? " tiny" : ""}`);
      b.style.cssText = `width:${it.r * 2}px;height:${it.r * 2}px;transform:translate(${it.x - it.r}px,${it.y - it.r}px);background-image:url("${champImg(it.m.id)}")`;
      b.style.animation = `bob ${5 + (i % 5)}s ease-in-out ${-(i * 0.7)}s infinite alternate`;
      b.onpointerenter = () => {
        pill.replaceChildren(el("b", "", champName(it.m.id)), el("span", "faint n-num", `Level ${it.m.level} · ${nf(it.m.points)} Punkte`));
        pill.hidden = false;
        const pw = pill.offsetWidth || 160;
        pill.style.left = `${Math.min(Math.max(it.x - pw / 2, 4), W - pw - 4)}px`;
        pill.style.top = `${Math.max(it.y - it.r - 40, 4)}px`;
      };
      b.onpointerleave = () => { pill.hidden = true; };
      box.append(b);
    });
  };
  requestAnimationFrame(place);
  new ResizeObserver(() => place()).observe(box);
  return c;
}

function classCard() {
  const c = card("Nach Klasse", "Anteil deiner Punkte", "class-card");
  const sums = new Map();
  let total = 0;
  for (const m of MASTERY) {
    const tags = champTags(m.id);
    tags.forEach((t, i) => sums.set(t, (sums.get(t) ?? 0) + m.points * (i === 0 ? 1 : 0.5)));
    total += m.points * (1 + (tags.length > 1 ? 0.5 : 0));
  }
  const rows = [...sums.entries()].sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] ?? 1;
  for (const [tag, v] of rows) {
    const r = el("div", "cls-row");
    const bar = el("i", "cls-bar");
    bar.style.setProperty("--w", String(v / max));
    r.append(el("span", "", CLASS[tag] ?? tag), bar, el("span", "n-num faint", `${Math.round((v / Math.max(total, 1)) * 100)} %`));
    c.append(r);
  }
  return c;
}

function progressCard() {
  const c = card("Fortschritt", "nächstes Level", "progress-card");
  const list = el("div", "prog-list");
  for (const m of MASTERY.slice(0, 12)) {
    const r = el("div", "prog-row");
    const bar = el("i", "prog-bar");
    bar.style.setProperty("--w", String(m.until > 0 ? m.since / (m.since + m.until) : 1));
    const who = el("div", "prog-who");
    who.append(el("b", "", champName(m.id)), el("span", "faint", `${nf(m.points)} · ${ago(m.last_play)}`));
    const meta = el("span", "faint n-num", m.until > 0 ? `noch ${nf(m.until)}` : m.marks ? `${m.tokens}/${m.marks} Marken` : "");
    const grades = el("span", "grades");
    for (const g of m.grades) grades.append(el("span", `grade ${g.startsWith("S") ? "s" : ""}`, g));
    r.append(img(champImg(m.id), "champ sm", champName(m.id), ""), who, el("span", "prog-lvl n-num", m.level), bar, meta, grades);
    list.append(r);
  }
  c.append(list);
  return c;
}

function historyCard() {
  const c = card("Verlauf", `seit ${new Date(MASTERY_HISTORY.since).toLocaleDateString("de-DE")}`, "history-card");
  const days = MASTERY_HISTORY.days;
  const W = 600, H = 90;
  const min = Math.min(...days.map((d) => d.points)), max = Math.max(...days.map((d) => d.points));
  const x = (i) => (i / (days.length - 1)) * W, y = (p) => H - 6 - ((p - min) / Math.max(1, max - min)) * (H - 12);
  c.insertAdjacentHTML("beforeend", `<svg class="hist-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path d="${days.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.points).toFixed(1)}`).join(" ")}" vector-effect="non-scaling-stroke"/></svg>`);
  const gains = el("div", "gains");
  for (const g of MASTERY_HISTORY.gains) {
    const b = el("div", "gain");
    b.append(img(champImg(g.id), "champ sm", champName(g.id), ""), el("span", "", champName(g.id)), el("b", "n-num", `+${nf(g.points)}`));
    gains.append(b);
  }
  c.append(gains);
  return c;
}

// ---------- Spiele ----------
const POS = { top: "Top", jungle: "Jungle", mid: "Mid", bottom: "Bot", support: "Support" };
const kdaOf = (k, d, a) => ((k + a) / Math.max(1, d)).toFixed(1).replace(".", ",");

function summary() {
  const list = MY_GAMES;
  const c = card("Bilanz", `${list.length} Spiele`, "pf-sum");
  const wins = list.filter((g) => g.win).length;
  const sum = (f) => list.reduce((a, g) => a + f(g), 0);
  const [k, d, a] = [sum((g) => g.k), sum((g) => g.d), sum((g) => g.a)];
  const kpis = el("div", "pf-kpis");
  const kpi = (label, value, sub = "") => { const b = el("div", "pf-kpi"); b.append(el("span", "n-eyebrow", label), el("b", "n-num n-display", value), el("span", "faint", sub)); return b; };
  kpis.append(
    kpi("Siege", pct(wins / list.length), `${wins} S – ${list.length - wins} N`),
    kpi("KDA", kdaOf(k, d, a), `${(k / list.length).toFixed(1)} / ${(d / list.length).toFixed(1)} / ${(a / list.length).toFixed(1)}`.replace(/\./g, ",")),
    kpi("Leistung", "6,4", `${list.filter((g) => g.score).length}× MVP/ACE`),
    kpi("Kill-Beteiligung", "58 %", `Ø ${(sum((g) => g.cs) / sum((g) => g.min)).toFixed(1).replace(".", ",")} CS/min`),
  );
  c.append(kpis);
  const by = new Map();
  for (const g of list) by.set(g.champ, [...(by.get(g.champ) ?? []), g]);
  const champs = el("div", "pf-champs");
  for (const [id, gs] of [...by].sort((x, y) => y[1].length - x[1].length).slice(0, 4)) {
    const w = gs.filter((g) => g.win).length;
    const line = el("div", "pf-champ"), t = el("div", "pf-ct");
    t.append(el("b", "", champName(id)), el("span", "faint n-num", `${gs.length} Spiele · ${pct(w / gs.length)} · KDA ${kdaOf(gs.reduce((x, g) => x + g.k, 0), gs.reduce((x, g) => x + g.d, 0), gs.reduce((x, g) => x + g.a, 0))}`));
    line.append(img(champImg(id), "champ md", champName(id), ""), t);
    champs.append(line);
  }
  const roles = el("div", "pf-roles");
  for (const [pos, label] of Object.entries(POS)) {
    const n = list.filter((g) => g.role === pos).length;
    if (!n) continue;
    const r = el("div", "pf-role");
    r.style.setProperty("--w", String(n / list.length));
    r.append(el("span", "", label), el("i", ""), el("span", "faint n-num", String(n)));
    roles.append(r);
  }
  const cols = el("div", "pf-sum-cols");
  cols.append(champs, roles);
  c.append(cols);
  return c;
}

function goalsCard() {
  const c = card("Ziele", "letzte 10 Spiele", "pf-goals");
  const goals = [["CS pro Minute ≥ 7,0", (g) => g.cs / g.min >= 7, (g) => (g.cs / g.min).toFixed(1).replace(".", ",")], ["Tode ≤ 5", (g) => g.d <= 5, (g) => String(g.d)], ["Kill-Beteiligung ≥ 50 %", (g) => (g.k + g.a) / Math.max(1, g.k + g.a + 4) >= 0.5, (g) => `${Math.round(((g.k + g.a) / Math.max(1, g.k + g.a + 4)) * 100)} %`]];
  for (const [label, ok, val] of goals) {
    const games = MY_GAMES.slice(0, 10);
    const hits = games.filter(ok).length;
    const row = el("div", "goal"), t = el("div", "goal-t"), dots = el("div", "goal-dots");
    t.append(el("b", "", label), el("span", "faint n-num", `${hits} von ${games.length} erreicht`));
    for (const g of [...games].reverse()) { const d = el("i", ok(g) ? "ok" : "miss"); d.title = `${dayName(g.when)}: ${val(g)}`; dots.append(d); }
    row.append(t, dots, el("span", `goal-rate n-num ${hits / games.length >= 0.7 ? "good" : ""}`, `${hits}/${games.length}`), el("span", ""));
    c.append(row);
  }
  return c;
}

function matchRow(g) {
  const b = el("button", `pf-row ${g.win ? "win" : "loss"}${openId === g.id ? " active" : ""}`);
  b.onclick = () => { openId = g.id; render(); };
  const c = img(champImg(g.champ), "champ md", champName(g.champ), "");
  c.append(el("span", "pf-lvl n-num", 14 + (g.k % 5)));
  const mid = el("div", "pf-mid"), top = el("div", "pf-line"), sub = el("div", "pf-line faint");
  top.append(el("b", "n-num", `${g.k} / ${g.d} / ${g.a}`), el("span", "faint n-num", `${kdaOf(g.k, g.d, g.a)} KDA · ${g.cs} CS`));
  if (g.score) top.append(el("span", `score-badge ${g.score.toLowerCase()}`, `${g.score} 8,${g.k % 10}`));
  else top.append(el("span", "score-badge", `5,${(g.k + g.a) % 10}`));
  sub.append(el("span", "", `${g.win ? "Sieg" : "Niederlage"} · ${g.mode} · ${clock(g.min * 60)}`));
  mid.append(top, sub);
  const when = el("div", "pf-when faint");
  when.append(el("span", "", dayName(g.when)), el("span", "n-num", timeOf(g.when)));
  b.append(c, mid, when);
  return b;
}

function historyList() {
  const c = card("Spielverlauf", "", "pf-hist");
  const f = el("div", "n-seg small pf-filter");
  for (const [v, label] of QUEUES) { const b = el("button", v === queue ? "active" : "", label); b.onclick = () => { queue = v; render(); }; f.append(b); }
  c.append(f);
  const list = el("div", "pf-list");
  const rows = MY_GAMES.filter((g) => queue === "all" || g.mode === queue);
  for (const g of rows) list.append(matchRow(g));
  if (!rows.length) list.append(faint("Keine Spiele gefunden.", "faint pad"));
  c.append(list);
  return c;
}

function teamTable(d, side) {
  const g = d.state, t = side === "blue" ? g.blue_totals : g.red_totals;
  const box = el("div", `pf-team ${side}`);
  const h = el("div", "pf-team-head");
  const won = g.winner === side;
  h.append(el("b", "", `${side === "blue" ? "Dein Team" : "Gegner"} · ${won ? "Sieg" : "Niederlage"}`), el("span", "faint n-num", `${t.kills} Kills · ${kilo(t.gold)} Gold · ${t.towers} Türme · ${t.dragons.length} Drachen · ${t.barons} Baron`));
  box.append(h);
  const players = (side === "blue" ? g.blue : g.red).players;
  for (const m of players) {
    const st = g.players.find((p) => p.pid === m.pid);
    const row = el("div", `pf-p${m.pid === d.mePid ? " me" : ""}`);
    const ch = img(champImg(m.champion), "champ md", champName(m.champion), "");
    ch.append(el("span", "pf-lvl n-num", st.level));
    const items = el("div", "pl-items");
    for (const id of st.items) items.append(img(itemImg(id), "item", itemName(id), ""));
    const dmg = el("div", "pf-dmg");
    const bar = el("i", ""); bar.style.setProperty("--w", String(st.dmg * 3));
    dmg.append(bar, el("span", "faint n-num", pct(st.dmg)));
    const nm = el("div", "pf-name"); nm.append(el("span", "", m.name), el("span", "faint", champName(m.champion)));
    row.append(ch, el("span", ""), nm, el("div", "pf-k n-num", `${st.kills}/${st.deaths}/${st.assists}`), el("span", "pf-cs faint n-num", `${st.cs} CS`), items, dmg, el("span", "score-badge", (4 + ((st.kills * 3 + st.assists) % 6)).toFixed(1).replace(".", ",")));
    box.append(row);
  }
  return box;
}

function detailView() {
  const d = myGameDetail(openId);
  if (!d) return [];
  const s = { teams: [{ id: d.blue.id, name: "Dein Team", code: "Dein Team", image: "" }, { id: d.red.id, name: "Gegner", code: "Gegner", image: "" }], league_name: "", league_image: "" };
  const out = [...gameView(d.state, s)];
  const h = card(d.game.win ? "Sieg" : "Niederlage", "Alle Werte", `pf-detail ${d.game.win ? "win" : "loss"}`);
  h.append(teamTable(d, "blue"), teamTable(d, "red"));
  out.push(h);
  return out;
}

// ---------- Notizen ----------
function notesCard() {
  const c = card("Notizen", notes.length ? String(notes.length) : "", "notes-card");
  const list = el("div", "notes-list");
  notes.forEach((n, i) => {
    const row = el("div", "note-row"), headRow = el("div", "note-head");
    headRow.append(img(champImg(n.champ), "champ sm", champName(n.champ), ""), el("b", "", champName(n.champ)));
    const del = el("button", "imp danger", "×");
    del.title = "Notiz löschen";
    del.onclick = () => { notes.splice(i, 1); save("notes", { list: notes }); render(); };
    headRow.append(del);
    row.append(headRow, el("div", "note-text", n.text));
    list.append(row);
  });
  if (!notes.length) list.append(faint("Noch keine Notizen – unten eine hinzufügen.", "faint"));
  c.append(list);
  const ed = el("div", "note-ed");
  const sel = el("select", "n-input");
  for (const id of [...new Set(MASTERY.map((m) => m.id))]) sel.append(new Option(champName(id), id));
  sel.value = draft.champ;
  sel.onchange = () => { draft.champ = sel.value; };
  const ta = el("textarea", "n-input note-ta");
  ta.placeholder = "Matchup, Timer, Runen – was dir beim nächsten Mal hilft";
  ta.value = draft.text;
  ta.oninput = () => { draft.text = ta.value; };
  const add = el("button", "n-btn primary", "Notiz speichern");
  add.onclick = () => { if (!draft.text.trim()) return; notes = [{ champ: draft.champ, text: draft.text.trim() }, ...notes]; draft.text = ""; save("notes", { list: notes }); render(); };
  ed.append(sel, ta, add);
  c.append(ed);
  return c;
}

// ---------- Rahmen ----------
function render() {
  const out = [head(), meBar()];
  if (pane === "over") {
    out.push(kpis());
    const grid = el("div", "me-grid"), a = el("div", "me-col"), b = el("div", "me-col");
    a.append(summary()); b.append(goalsCard());
    grid.append(a, b);
    out.push(grid);
  } else if (pane === "games") {
    const host = el("div", "pf-host");
    const grid = el("div", "pf-grid"), left = el("div", "pf-col"), right = el("div", "pf-col");
    left.append(summary(), goalsCard(), historyList());
    if (!openId) openId = MY_GAMES[0].id;
    right.append(...detailView());
    grid.append(left, right);
    host.append(grid);
    out.push(host);
  } else if (pane === "mastery") {
    out.push(kpis());
    const grid = el("div", "me-grid"), left = el("div", "me-col"), right = el("div", "me-col");
    left.append(bubbleCard(), historyCard());
    right.append(classCard(), progressCard());
    grid.append(left, right);
    out.push(grid);
  } else out.push(notesCard());
  const r = root(), top = q("main").scrollTop;
  r.replaceChildren(...out);
  q("main").scrollTop = top;
}

export function showMe() { render(); }
export function initMe() { /* gezeichnet wird beim Öffnen des Reiters */ }
void champByKey;
