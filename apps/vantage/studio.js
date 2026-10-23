// Studio: Aufnahme, ganze Spiele, Clips und Schnitt. Die „Aufnahmen“ sind erzeugte Bilder (kein echtes Video): ein Platzhalter-Bild mit
// Minikarte, dazu Zeitleiste mit Marken für Kills, Tode, Drachen und mehr. Momente anklicken, Bereich ziehen, als Clip speichern.
import { champImg, champName, tileImg } from "./dd.js";
import { MY_GAMES, myGameDetail } from "./world.js";
import { clock, dayName, el, faint, load, openSheet, q, save, timeOf, toast, DAY } from "./ui.js";
import { icon } from "./icons.js";

const KIND = { multikill: "Multikill", ace: "Ace", steal: "Steal", scene: "Szene", cut: "Schnitt" };
const NOW = Date.now();
let tab = load("studio", { tab: "games" }).tab;
let gameId = MY_GAMES[0].id, clipId = 0, query = "", filter = "all";
let status = { state: "idle", since: 0 };
let rs = load("rec", { auto: true, auto_clips: true, full_match: true, audio: true, before: 25, after: 6, fps: 60, bitrate: 16, target: "game", keep_matches: 10 });
let deleted = [];
const markCache = new Map();
let ed = { t: 0, playing: false, speed: 1, a: 0, b: 0, timer: 0 };
let clips = [];

const games = () => MY_GAMES.slice(0, 6);
const gameOf = (id) => MY_GAMES.find((g) => g.id === id);
const root = () => q('.view[data-view="studio"]');

// ---------- Marken eines Spiels ----------
function marksOf(id) {
  if (markCache.has(id)) return markCache.get(id);
  const d = myGameDetail(id), sc = d.script, role = d.mePid - 1;
  const out = [];
  const mine = sc.kills.filter((k) => k.side === "blue" && k.k === role);
  let i = 0;
  while (i < mine.length) {
    let j = i;
    while (j + 1 < mine.length && mine[j + 1].t - mine[j].t <= 14) j++;
    const n = j - i + 1;
    if (n >= 2) out.push({ t: mine[i].t, t2: mine[j].t, kind: "multi", n, label: ["", "", "Doppelkill", "Triple Kill", "Quadra Kill", "Pentakill"][Math.min(n, 5)] });
    else out.push({ t: mine[i].t, kind: "kill", label: "Kill" });
    i = j + 1;
  }
  for (const k of sc.kills) {
    if (k.side === "blue" && k.asst.includes(role)) out.push({ t: k.t, kind: "assist", label: "Assist" });
    if (k.side === "red" && k.v === role) out.push({ t: k.t, kind: "death", label: "Tod" });
  }
  for (const e of sc.evs) {
    const ally = e.side === "blue";
    const lab = { dragon: "Drache", baron: "Baron", tower: "Turm", inhibitor: "Inhibitor", end: "Nexus" }[e.kind];
    if (lab) out.push({ t: e.t, kind: e.kind === "inhibitor" ? "inhib" : e.kind, side: ally ? "ally" : "enemy", label: `${lab} (${ally ? "dein Team" : "Gegner"})` });
  }
  out.sort((a, b) => a.t - b.t);
  const r = { marks: out, len: sc.L + 12 };
  markCache.set(id, r);
  return r;
}

function seedClips() {
  const out = [];
  let id = 1;
  for (const g of MY_GAMES.slice(0, 5)) {
    const { marks } = marksOf(g.id);
    const picks = marks.filter((m) => m.kind === "multi").slice(0, 1).concat(marks.filter((m) => m.kind === "kill").slice(0, 1));
    for (const m of picks) out.push({ id: id++, game: g.id, a: Math.max(0, m.t - 20), b: m.t + 8, title: m.kind === "multi" ? `${m.label} mit ${champName(g.champ)}` : `Schöner Kill mit ${champName(g.champ)}`, kind: m.kind === "multi" ? "multikill" : "scene", champ: g.champ, created: g.when + 40 * 60e3 });
  }
  return out.sort((x, y) => y.created - x.created);
}
const persist = () => save("clips", { list: clips });
clips = load("clips", { list: null }).list ?? seedClips();

// ---------- Kopf ----------
function head() {
  const bar = el("div", "st-head");
  const tabs = el("div", "n-seg st-tabs");
  const t = (k, label, n, hint) => {
    const b = el("button", `st-tab-${k}${tab === k ? " active" : ""}`);
    b.title = hint;
    b.append(el("span", "", label), el("span", "st-count n-num", String(n)));
    b.onclick = () => { if (k === "clips" && tab === "clips" && clipId) clipId = 0; tab = k; save("studio", { tab }); stop(); render(); };
    return b;
  };
  tabs.append(t("games", "Spiele", games().length, "Ganze Spielaufnahmen – hier Momente finden und als Clips speichern"), t("clips", "Clips", clips.length, "Deine Clips – schneiden und exportieren"));
  const pill = el("div", `rec-pill ${status.state}`);
  pill.append(el("i", "rec-dot"), el("span", "", status.state === "recording" ? "Nimmt das Spiel auf" : rs.auto ? "Bereit" : "Aufnahme aus"));
  if (status.state === "recording") pill.append(el("span", "faint n-num", clock((Date.now() - status.since) / 1000)));
  const saveBtn = el("button", "n-btn primary", "Clip · Alt+F10");
  saveBtn.title = "Die letzten Sekunden als Clip speichern";
  saveBtn.disabled = status.state !== "recording";
  saveBtn.onclick = () => { const g = gameOf(gameId); clips = [{ id: Date.now(), game: g.id, a: 40, b: 40 + rs.before, title: `Clip aus der Aufnahme (${rs.before} s)`, kind: "scene", champ: g.champ, created: Date.now() }, ...clips]; persist(); toast("Clip gespeichert."); render(); };
  const toggle = el("button", "n-btn", status.state === "recording" ? "Anhalten" : "Starten");
  toggle.onclick = () => { status = status.state === "recording" ? { state: "idle", since: 0 } : { state: "recording", since: Date.now() }; render(); };
  const menu = el("button", "n-btn", "Aufnahme ⚙");
  menu.onclick = openRecSettings;
  const right = el("div", "st-bar-btns");
  right.append(saveBtn, toggle, menu);
  bar.append(tabs, pill, right);
  return bar;
}
setInterval(() => { if (status.state === "recording" && !root().hidden) { const p = root().querySelector(".rec-pill .n-num"); if (p) p.textContent = clock((Date.now() - status.since) / 1000); } }, 1000);

function openRecSettings() {
  const commit = (next) => { rs = next; save("rec", rs); openRecSettings(); render(); };
  const sw = (label, hint, key) => {
    const row = el("label", "set-row"), box = el("input", "sr");
    box.type = "checkbox"; box.setAttribute("role", "switch"); box.checked = rs[key]; box.onchange = () => commit({ ...rs, [key]: box.checked });
    const t = el("span", "set-txt"); t.append(el("b", "", label), el("span", "faint", hint));
    row.append(t, box, el("span", "n-switch"));
    return row;
  };
  const seg = (label, key, opts) => {
    const row = el("div", "set-row"); row.append(el("span", "set-txt", label));
    const g = el("div", "n-seg small");
    for (const [v, t] of opts) { const b = el("button", rs[key] === v ? "active" : "", t); b.onclick = () => commit({ ...rs, [key]: v }); g.append(b); }
    row.append(g);
    return row;
  };
  const c = (title, ...rows) => { const s = el("section", "card n-card set-card"), h = el("div", "c-head"); h.append(el("span", "n-eyebrow", title)); s.append(h, ...rows); return s; };
  openSheet("Aufnahme", [
    c("Spiele", sw("Im Spiel automatisch aufnehmen", "Startet mit dem Spiel, hält 10 s nach dem Ende an.", "auto"), sw("Ganzes Spiel speichern", "Mit Marken für Kills, Tode, Drachen … – etwa 7 GB je 30 Minuten.", "full_match"), seg("Ganze Spiele behalten", "keep_matches", [[5, "5"], [10, "10"], [20, "20"], [0, "Alle"]]), el("p", "faint fine", "Ältere ganze Spiele werden endgültig gelöscht. Clips daraus bleiben.")),
    c("Clips", sw("Automatische Clips", "Multikills, Aces und Steals werden von selbst gespeichert.", "auto_clips"), seg("Sekunden davor", "before", [[15, "15"], [25, "25"], [45, "45"], [60, "60"]]), seg("Sekunden danach (automatisch)", "after", [[3, "3"], [6, "6"], [10, "10"]])),
    c("Bild und Ton", seg("Bildrate", "fps", [[30, "30"], [60, "60"]]), seg("Qualität (Mbit/s)", "bitrate", [[8, "8"], [16, "16"], [30, "30"], [50, "50"]]), seg("Aufnehmen", "target", [["game", "Spielfenster"], ["screen", "Bildschirm"]]), sw("Spielton aufnehmen", "Vom Standard-Ausgabegerät (Kopfhörer, Lautsprecher).", "audio"), el("p", "faint fine", "Encoder: Demo (in der echten App: Hardware-Encoder deiner Grafikkarte)")),
  ]);
}

// ---------- Karten ----------
function gameCard(g, active) {
  const b = el("button", `st-game${active ? " active" : ""}`);
  b.style.backgroundImage = `url("${tileImg(g.champ)}")`;
  const top = el("div", "st-game-top");
  top.append(el("span", `st-game-kind`, g.win ? "Sieg" : "Niederlage"), el("span", "faint n-num", clock(g.min * 60)));
  const bottom = el("div", "st-game-bottom");
  bottom.append(el("b", "", champName(g.champ)), el("span", "n-num", `${g.k}/${g.d}/${g.a} · ${dayName(g.when)}, ${timeOf(g.when)}`));
  b.append(top, bottom);
  b.onclick = () => { gameId = g.id; stop(); ed.t = 0; render(); };
  return b;
}

function clipCard(c, small = false) {
  const g = gameOf(c.game);
  const k = el("button", `clip n-card${small ? " small" : ""}`);
  const th = el("span", "clip-thumb");
  th.style.backgroundImage = `url("${tileImg(c.champ)}")`;
  th.append(el("span", `clip-kind ${c.kind}`, KIND[c.kind] ?? c.kind), el("span", "clip-len n-num", clock(c.b - c.a)));
  const meta = el("span", "clip-meta");
  const sub = el("span", "clip-sub");
  const ch = el("span", "img champ xs"); const im = new Image(); im.src = champImg(c.champ); im.alt = ""; ch.append(im);
  sub.append(ch, el("span", "faint", `${champName(c.champ)} · ${dayName(c.created)}`));
  meta.append(el("b", "clip-title", c.title), sub);
  const acts = el("span", "clip-acts");
  const del = el("span", "imp danger", "Löschen");
  del.onclick = (e) => { e.stopPropagation(); clips = clips.filter((x) => x.id !== c.id); deleted.unshift(c); persist(); toast("Clip gelöscht – unter „Zuletzt gelöscht“ wiederherstellbar."); render(); };
  acts.append(del);
  k.append(th, meta, acts);
  k.onclick = () => { clipId = c.id; tab = "clips"; stop(); ed.t = 0; render(); };
  void g;
  return k;
}

// ---------- Editor ----------
const stop = () => { clearInterval(ed.timer); ed.playing = false; };
const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>', PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';

function editorView({ game, a, b, mode, title, onSave }) {
  const { marks, len } = marksOf(game.id);
  const span = b - a;
  const box = el("section", `card n-card editor ${mode}`);
  // Kopf
  const top = el("div", "ed-top");
  const nm = el("div", "ed-name");
  nm.append(el("b", "ed-title n-display", title), el("span", "faint", `${champName(game.champ)} · ${dayName(game.when)}, ${timeOf(game.when)} · ${game.win ? "Sieg" : "Niederlage"} · ${game.k}/${game.d}/${game.a}`));
  const acts = el("div", "ed-acts");
  if (mode === "edit") {
    const ex = el("button", "n-btn primary", "Exportieren");
    ex.onclick = () => toast("Der Export schreibt ein Video in deinen Clip-Ordner – in der Demo gibt es keine Datei.");
    const folder = el("button", "n-btn", "Ordner öffnen");
    folder.onclick = () => toast("Der Explorer öffnet sich nur in der echten App.");
    acts.append(folder, ex);
  }
  top.append(nm, acts);
  // Bühne
  const main = el("div", "ed-main");
  const viewer = el("div", "ed-viewer");
  const stage = el("div", "ed-stage");
  const scene = el("div", "ed-scene");
  scene.style.backgroundImage = `url("${tileImg(game.champ)}")`;
  scene.innerHTML = `<div class="ed-vig"></div><div class="ed-hud"><div class="ed-mini"><i></i><i></i><i></i><i></i><i></i><i></i><b></b></div><div class="ed-bar"><span class="ed-ch"></span><span class="ed-hp"><i></i></span><span class="ed-lv n-num"></span></div><div class="ed-score n-num"></div></div><div class="ed-note">Platzhalter-Aufnahme · in der echten App steht hier dein Video</div>`;
  const chImg = scene.querySelector(".ed-ch"); chImg.style.backgroundImage = `url("${champImg(game.champ)}")`;
  const big = el("div", "ed-bigplay"); big.innerHTML = PLAY;
  stage.append(scene, big);
  const tp = el("div", "ed-transport");
  const bt = (cls, html, title, fn) => { const x = el("button", `tp ${cls}`); x.innerHTML = html; x.title = title; x.onclick = fn; return x; };
  const play = bt("tp-play", PLAY, "Abspielen (Leertaste)", () => toggle());
  const time = el("span", "tp-time n-num");
  const gm = el("span", "tp-game", `/ ${clock(mode === "edit" ? span : len)}`);
  const speed = el("div", "tp-speed");
  for (const s of [1, 2, 4]) { const x = el("button", `tp${ed.speed === s ? " on" : ""}`, `${s}×`); x.onclick = () => { ed.speed = s; speed.querySelectorAll("button").forEach((y) => y.classList.toggle("on", y === x)); }; speed.append(x); }
  tp.append(bt("", "−10", "10 s zurück", () => seek(ed.t - 10)), play, bt("", "+10", "10 s vor", () => seek(ed.t + 10)), time, gm, el("span", "tp-gap"), speed);
  viewer.append(stage, tp);
  // Seitenleiste
  const side = el("div", "ed-side");
  const sel = el("div", "sd-head");
  const range = el("b", "sd-range n-num");
  sel.append(el("span", "n-eyebrow", mode === "find" ? "Auswahl" : "Clip-Länge"), range);
  side.append(sel);
  if (mode === "find") {
    const nw = el("div", "sd-new");
    const inp = el("input", "n-input sd-title");
    inp.placeholder = "Titel (optional)";
    const go = el("button", "n-btn primary sd-go");
    go.innerHTML = "Als Clip speichern <kbd>Alt+F10</kbd>";
    go.onclick = () => onSave(ed.a, ed.b, inp.value.trim());
    nw.append(el("p", "sd-hint faint", "Ziehe in der Zeitleiste einen Bereich auf oder wähle unten einen Moment."), inp, go);
    side.append(nw);
    const hd = el("div", "sd-head row");
    hd.append(el("span", "n-eyebrow", "Momente"), el("span", "faint n-num", String(marks.filter((m) => ["multi", "kill", "death", "dragon", "baron"].includes(m.kind)).length)));
    side.append(hd);
    const list = el("div", "sd-list mo-list");
    for (const m of marks.filter((x) => ["multi", "kill", "death", "dragon", "baron"].includes(x.kind)).slice(0, 40)) {
      const row = el("div", `mo${m.kind === "multi" ? " multi" : ""}`);
      const main2 = el("button", "mo-main");
      const ic = el("span", "mo-icons");
      ic.append(m.kind === "dragon" || m.kind === "baron" ? icon(m.kind === "baron" ? "baron" : "dragon") : markDot(m.kind));
      const txt = el("span", "mo-txt");
      txt.append(el("b", `sd-l ${m.kind}`, m.label), el("span", "faint n-num mo-sub", clock(m.t)));
      main2.append(ic, txt);
      main2.onclick = () => { seek(m.t); ed.a = Math.max(0, m.t - rs.before); ed.b = Math.min(len, (m.t2 ?? m.t) + rs.after); paint(); };
      const add = el("button", "mo-act", "+");
      add.title = "Als Clip speichern";
      add.onclick = () => onSave(Math.max(0, m.t - rs.before), Math.min(len, (m.t2 ?? m.t) + rs.after), m.label === "Kill" ? "" : m.label);
      row.append(main2, add);
      list.append(row);
    }
    side.append(list);
  } else {
    side.append(el("p", "sd-hint faint", "Der Clip umfasst die Marke und ein paar Sekunden davor und danach. Schneiden, 3D-Ebene und Hochskalieren gibt es in der echten App."));
    const ev = el("div", "sd-list");
    for (const m of marks.filter((x) => x.t >= a && x.t <= b)) { const row = el("button", "sd-ev"); row.append(markDot(m.kind), el("span", "sd-t", clock(m.t - a)), el("span", `sd-l ${m.kind}`, m.label)); row.onclick = () => seek(m.t); ev.append(row); }
    side.append(el("div", "sd-head row"), ev);
  }
  main.append(viewer, side);
  // Zeitleiste
  const tl = el("div", `tl2 ${mode}`);
  const body = el("div", "tl2-body");
  const labels = el("div", "tl2-labels");
  labels.append(el("div", "tl2-lab ruler", "Zeit"), el("div", "tl2-lab ev", mode === "find" ? "Ereignisse" : "Marken"));
  const content = el("div", "tl2-content");
  const scroll = el("div", "tl2-scroll"); scroll.append(content);
  const ruler = el("div", "tl2-ruler");
  const evrow = el("div", "tl2-row ev");
  const t0 = mode === "find" ? 0 : a, t1 = mode === "find" ? len : b, T = t1 - t0;
  const pos = (t) => `${((t - t0) / T) * 100}%`;
  const stepR = T > 900 ? 300 : T > 240 ? 60 : 10;
  for (let t = Math.ceil(t0 / stepR) * stepR; t < t1; t += stepR) { const s = el("span", "", clock(t)); s.style.left = pos(t); ruler.append(s); }
  for (const m of marks.filter((x) => x.t >= t0 && x.t <= t1)) { const mk = el("button", `tl2-mk ${m.kind}${m.kind === "assist" ? " assist" : ""}`); mk.style.left = pos(m.t); mk.title = `${clock(m.t)} · ${m.label}`; mk.append(["dragon", "baron", "tower", "inhib", "end"].includes(m.kind) ? icon(m.kind === "end" ? "nexus" : m.kind, m.side === "enemy" ? "red" : "blue") : markDot(m.kind)); mk.onclick = (e) => { e.stopPropagation(); seek(m.t); }; evrow.append(mk); }
  const selBox = el("div", "tl2-sel");
  const ga = el("i", "tl2-grip a"), gb = el("i", "tl2-grip b");
  selBox.append(ga, gb);
  const headEl = el("div", "tl2-head");
  content.append(ruler, evrow, selBox, headEl);
  body.append(labels, scroll);
  tl.append(body);
  box.append(top, main, tl);

  // Zustand zeichnen
  if (mode === "edit") { ed.a = a; ed.b = b; } else if (!(ed.b > ed.a)) { ed.a = 0; ed.b = 0; }
  const ctxId = `${mode}:${game.id}:${a}`;
  if (ed.ctx !== ctxId) { ed.ctx = ctxId; ed.t = mode === "edit" ? a : ed.t; if (mode === "find") { ed.a = 0; ed.b = 0; } }
  function paint() {
    const t = ed.t;
    time.textContent = clock(mode === "edit" ? t - a : t);
    headEl.style.left = pos(Math.min(Math.max(t, t0), t1));
    if (mode === "find") { selBox.hidden = !(ed.b > ed.a); selBox.style.left = pos(ed.a); selBox.style.width = `${((ed.b - ed.a) / T) * 100}%`; range.textContent = ed.b > ed.a ? `${clock(ed.a)} – ${clock(ed.b)} · ${clock(ed.b - ed.a)}` : "noch nichts gewählt"; }
    else { selBox.hidden = true; range.textContent = clock(span); }
    play.innerHTML = ed.playing ? PAUSE : PLAY;
    stage.classList.toggle("playing", ed.playing);
    // Platzhalter-Bild: Minikarte und Werte laufen mit
    const f = (t - 0) / len;
    scene.querySelectorAll(".ed-mini i").forEach((p, i) => { p.style.left = `${18 + ((i * 37 + t * (i % 2 ? 0.7 : -0.6)) % 64)}%`; p.style.top = `${20 + ((i * 53 + t * (i % 3 ? 0.5 : 0.9)) % 60)}%`; });
    scene.querySelector(".ed-lv").textContent = String(Math.min(18, 1 + Math.floor(f * 17)));
    scene.querySelector(".ed-hp i").style.width = `${55 + 40 * Math.abs(Math.sin(t / 9))}%`;
    const kd = marks.filter((m) => (m.kind === "kill" || m.kind === "multi") && m.t <= t).reduce((s2, m) => s2 + (m.n ?? 1), 0);
    scene.querySelector(".ed-score").textContent = `${kd} Kills · ${clock(t)}`;
  }
  function seek(t) { ed.t = Math.min(Math.max(t, t0), t1); paint(); }
  function toggle() {
    if (ed.playing) { stop(); paint(); return; }
    if (ed.t >= t1 - 0.5) seek(t0);
    ed.playing = true;
    let last = performance.now();
    ed.timer = setInterval(() => { const n = performance.now(); ed.t = Math.min(t1, ed.t + ((n - last) / 1000) * ed.speed); last = n; if (ed.t >= t1) stop(); paint(); }, 100);
    paint();
  }
  stage.onclick = toggle;
  // Zeitleiste: Klick/Ziehen auf Lineal und Ereignisse bewegt den Abspielkopf; im Finden-Modus zieht man einen Bereich auf
  const at = (e) => { const r = content.getBoundingClientRect(); return t0 + Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * T; };
  let drag = null;
  content.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".tl2-mk")) return;
    try { content.setPointerCapture(e.pointerId); } catch {}
    const grip = e.target.closest(".tl2-grip");
    drag = grip ? { kind: grip.classList.contains("a") ? "a" : "b" } : { kind: e.shiftKey || e.target.closest(".tl2-row") ? "range" : "head", from: at(e) };
    if (drag.kind === "head") seek(at(e));
    if (drag.kind === "range" && mode === "find") { ed.a = ed.b = drag.from; }
    paint();
  });
  content.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const t = at(e);
    if (drag.kind === "head") seek(t);
    else if (mode === "find") { if (drag.kind === "a") ed.a = Math.min(t, ed.b - 1); else if (drag.kind === "b") ed.b = Math.max(t, ed.a + 1); else { ed.a = Math.min(drag.from, t); ed.b = Math.max(drag.from, t); } paint(); }
  });
  content.addEventListener("pointerup", () => { if (drag?.kind === "range" && mode === "find" && ed.b - ed.a < 2) { seek(ed.a); ed.a = ed.b = 0; paint(); } drag = null; });
  paint();
  return box;
}
const markDot = (kind) => { const d = el("i", `sd-dot ${kind}`); return d; };

// ---------- Seiten ----------
function gamesPage() {
  const g = gameOf(gameId);
  const strip = el("div", "st-strip");
  for (const x of games()) strip.append(gameCard(x, x.id === g.id));
  const save1 = (a, b, title) => { clips = [{ id: Date.now(), game: g.id, a: Math.round(a), b: Math.round(b), title: title || `Clip mit ${champName(g.champ)} (${clock(a)})`, kind: "scene", champ: g.champ, created: Date.now() }, ...clips]; persist(); toast("Clip gespeichert – im Reiter „Clips“."); render(); };
  const out = [strip, editorView({ game: g, a: 0, b: marksOf(g.id).len, mode: "find", title: `Ganzes Spiel – ${champName(g.champ)}`, onSave: save1 })];
  const mine = clips.filter((c) => c.game === g.id);
  const shelf = el("section", "card n-card st-shelf");
  const h = el("div", "c-head"); h.append(el("span", "n-eyebrow", "Clips aus diesem Spiel"), el("span", "c-meta", String(mine.length)));
  const row = el("div", "st-shelf-row");
  if (mine.length) for (const c of mine) row.append(clipCard(c, true));
  else row.append(el("div", "st-shelf-empty", "Noch keine Clips aus diesem Spiel. Wähle oben einen Moment oder ziehe in der Zeitleiste einen Bereich auf."));
  shelf.append(h, row);
  out.push(shelf);
  return out;
}

const FILTERS = [["all", "Alle", () => true], ["multikill", "Multikills", (c) => c.kind === "multikill" || c.kind === "ace"], ["scene", "Szenen", (c) => c.kind === "scene"]];
function clipsPage() {
  const bar = el("div", "st-page-bar");
  const search = el("input", "n-input st-search");
  search.type = "search"; search.placeholder = "Clips suchen – Champion, Kill, Drache …"; search.value = query;
  search.oninput = () => { query = search.value; render(); q("input.st-search", root())?.focus(); };
  const seg = el("div", "n-seg small");
  for (const [k, label, f] of FILTERS) { const n = clips.filter(f).length; if (k !== "all" && !n) continue; const b = el("button", filter === k ? "active" : "", `${label} ${n}`); b.onclick = () => { filter = k; render(); }; seg.append(b); }
  if (deleted.length) { const b = el("button", filter === "deleted" ? "active" : "", `Zuletzt gelöscht ${deleted.length}`); b.onclick = () => { filter = "deleted"; render(); }; seg.append(b); }
  const folder = el("button", "n-btn", "Ordner öffnen");
  folder.onclick = () => toast("Der Explorer öffnet sich nur in der echten App.");
  bar.append(search, seg, folder);
  if (filter === "deleted") {
    const sec = el("section", "st-group"), h = el("div", "st-group-head"), list = el("div", "st-deleted");
    h.append(el("b", "", "Zuletzt gelöscht"), el("span", "faint", "Clips bleiben 30 Tage, dann löscht Vantage sie endgültig."));
    for (const c of deleted) {
      const row = el("div", "st-del-row"), th = el("span", "clip-thumb"), meta = el("span", "clip-meta");
      th.style.backgroundImage = `url("${tileImg(c.champ)}")`;
      meta.append(el("b", "clip-title", c.title), el("span", "faint", `${KIND[c.kind] ?? c.kind} · noch 30 Tage`));
      const back = el("button", "imp", "Wiederherstellen");
      back.onclick = () => { deleted = deleted.filter((x) => x.id !== c.id); clips = [c, ...clips]; persist(); render(); };
      row.append(th, meta, back, el("span", ""));
      list.append(row);
    }
    if (!deleted.length) { filter = "all"; return [bar, faint("Nichts gelöscht.", "faint pad")]; }
    sec.append(h, list);
    return [bar, sec];
  }
  const f = FILTERS.find((x) => x[0] === filter)?.[2] ?? (() => true);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = (c) => `${c.title} ${KIND[c.kind] ?? ""} ${champName(c.champ)} ${c.champ}`.toLowerCase();
  const list = clips.filter(f).filter((c) => words.every((w) => hay(c).includes(w)));
  const out = [bar];
  if (!clips.length) {
    const e = el("section", "card n-card st-empty");
    e.append(el("h2", "n-display", "Noch keine Clips"), el("p", "faint", "Clips entstehen im Spiel mit Alt+F10, automatisch bei Multikills und Aces – oder aus ganzen Spielaufnahmen im Reiter „Spiele“."));
    const b = el("button", "n-btn primary", "Zu den Spielen");
    b.onclick = () => { tab = "games"; render(); };
    e.append(b);
    return [bar, e];
  }
  if (!list.length) return [bar, faint("Nichts gefunden.", "faint pad")];
  const groups = new Map();
  for (const c of list) groups.set(c.game, [...(groups.get(c.game) ?? []), c]);
  for (const [gid, cs] of groups) {
    const g = gameOf(gid);
    cs.sort((p, q2) => p.a - q2.a);
    const sec = el("section", "st-group"), h = el("div", "st-group-head");
    const ch = el("span", "img champ sm"); const im = new Image(); im.src = champImg(g.champ); im.alt = ""; ch.append(im);
    h.append(ch, el("b", "", `Spiel mit ${champName(g.champ)}`), el("span", "faint", `${dayName(g.when)}, ${timeOf(g.when)} · ${cs.length} Clip${cs.length === 1 ? "" : "s"}`));
    const open = el("button", "sd-link", "Ganzes Spiel →");
    open.onclick = () => { tab = "games"; gameId = gid; render(); q("main").scrollTo({ top: 0 }); };
    h.append(open);
    const grid = el("div", "clip-grid");
    for (const c of cs) grid.append(clipCard(c));
    sec.append(h, grid);
    out.push(sec);
  }
  return out;
}

function clipPage(c) {
  const bar = el("div", "st-page-bar");
  const back = el("button", "n-btn", "← Alle Clips");
  back.onclick = () => { clipId = 0; stop(); render(); };
  const g = gameOf(c.game);
  const inGame = el("button", "n-btn", "Im ganzen Spiel zeigen");
  inGame.onclick = () => { tab = "games"; gameId = c.game; stop(); render(); };
  bar.append(back, inGame);
  const out = [bar, editorView({ game: g, a: c.a, b: c.b, mode: "edit", title: c.title })];
  const rel = clips.filter((x) => x.game === c.game && x.id !== c.id);
  if (rel.length) {
    const box = el("section", "card n-card st-related"), h = el("div", "c-head"), row = el("div", "st-shelf-row");
    h.append(el("span", "n-eyebrow", "Aus diesem Spiel"), el("span", "c-meta", String(rel.length)));
    for (const x of rel) row.append(clipCard(x, true));
    box.append(h, row);
    out.push(box);
  }
  return out;
}

function render() {
  const r = root();
  const c = clipId ? clips.find((x) => x.id === clipId) : null;
  const out = [head()];
  if (tab === "games") out.push(...gamesPage());
  else if (c) out.push(...clipPage(c));
  else out.push(...clipsPage());
  const top = q("main").scrollTop;
  r.replaceChildren(...out);
  q("main").scrollTop = top;
}

export function showStudio() { render(); }
export function initStudio() {}
void NOW; void DAY;
