// Die Notch auf diesem Desktop. Nachbau der echten Notch (D:\Dev\notch) für den Browser: gleiche Zustände (idle, compact,
// expanded), gleiche Maße und Federkurven, eine Rangliste bestimmt, was die kleine Notch zeigt. Werte sind Beispieldaten.
// Neue Werte ändern nur ihre Zahl – nichts wird neu gebaut, damit nichts blinkt.
import { I } from "./icons.js";

const SIZE = { idle: { w: 190, h: 30, r: 10, e: 10 }, compact: { w: 320, h: 34, r: 13, e: 10 }, expanded: { w: 520, h: 0, r: 30, e: 22 } };
export const SOURCES = [
  { id: "glucose", name: "Blutzucker", sub: "Wert und Trend, aus Haze" },
  { id: "music", name: "Musik", sub: "Titel und Pegel" },
  { id: "timer", name: "Timer", sub: "Pomodoro aus Kursbuch und Notch" },
  { id: "sport", name: "Spielzeit", sub: "Minute und Stand aus Arena" },
  { id: "pulse", name: "Puls", sub: "Aus Garmin über Haze" },
];

const TRACKS = [
  { t: "Neonlicht", a: "Kleine Wellen", d: 214, c: ["#ff7a59", "#7b2ff7"] },
  { t: "Nachtbus", a: "Hafenstadt", d: 187, c: ["#2dd4bf", "#1d4ed8"] },
  { t: "Zwischen den Zeilen", a: "Mira Sand", d: 241, c: ["#f9d423", "#ff4e50"] },
];
const cover = ([a, b]) => `linear-gradient(145deg,${a},${b})`;
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const q = (el, s) => el.querySelector(s);

export function createNotch(root) {
  const settings = { on: { glucose: true, music: true, timer: true, sport: true, pulse: true }, order: ["glucose", "music", "timer", "sport", "pulse"], fullscreen: "hide" };
  const subs = [];

  const d = {
    playing: true, track: 0, pos: 41,
    bg: 118, hist: Array.from({ length: 28 }, (_, i) => 112 + Math.sin(i / 3) * 14 + (i % 5)), pulse: 72,
    timerLeft: 25 * 60, timerTotal: 25 * 60, timerRun: false,
    min: 63, home: 1, away: 2,
    files: [], tab: "music",
  };

  root.innerHTML = `
    <div id="notch" data-state="idle" aria-label="Notch" role="group">
      <div class="n-ear l"></div><div class="n-ear r"></div>
      <div class="n-shape">
        <div class="n-idle"><i></i></div>
        <div class="n-compact"></div>
        <div class="n-expanded"><div class="n-xin"></div></div>
      </div>
    </div>`;
  const el = q(root, "#notch");
  const compact = q(el, ".n-compact");
  const xin = q(el, ".n-xin");
  let state = "idle", hover = false, pinned = false, dragOver = false, alertUntil = 0, alertData = null, leaveT = 0, alertT = 0, gone = true;

  el.classList.add("gone");

  // ---------- Zustand und Maße ----------
  const active = () => settings.order.filter((id) => settings.on[id] && isLive(id));
  function isLive(id) {
    if (id === "music") return d.playing;
    if (id === "timer") return d.timerRun || d.timerLeft < d.timerTotal;
    return true;
  }
  const want = () => {
    if (hover || pinned || dragOver || Date.now() < alertUntil) return "expanded";
    return active().length ? "compact" : "idle";
  };

  let lastSig = "";
  function setState(s) {
    state = s;
    el.dataset.state = s;
    const z = SIZE[s];
    let w = z.w, hh = z.h;
    if (s === "compact") { w = active().length === 1 ? 230 : 320; hh = 34; }
    if (s === "expanded") hh = Math.ceil(xin.offsetHeight) || 190;
    el.style.setProperty("--w", w + "px");
    el.style.setProperty("--h", hh + "px");
    el.style.setProperty("--r", z.r + "px");
    el.style.setProperty("--e", z.e + "px");
  }
  function refresh() {
    const next = want();
    if (next === "expanded") buildExpanded();
    if (next === "compact") buildCompact();
    setState(next);
  }

  // ---------- Kompakt ----------
  function chip(id) {
    switch (id) {
      case "music": return `<div class="n-chip"><img class="n-cover" data-cover alt="" style="background:${cover(TRACKS[d.track].c)}" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=="><div class="n-eq"><i></i><i></i><i></i><i></i></div></div>`;
      case "glucose": return `<div class="n-chip" data-chip="glucose"><span data-v style="color:#5ee08a"></span><span data-arrow style="color:#5ee08a;font-size:14px"></span><small data-d></small></div>`;
      case "timer": return `<div class="n-chip" data-chip="timer"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13.5" r="7"/><path d="M12 10v3.8l2.2 1.4M9.5 3.5h5"/></svg><span data-v></span></div>`;
      case "sport": return `<div class="n-chip" data-chip="sport"><i style="width:6px;height:6px;border-radius:50%;background:#ff5a6e;box-shadow:0 0 8px #ff5a6e"></i><span data-v></span><small data-s></small></div>`;
      case "pulse": return `<div class="n-chip" data-chip="pulse"><svg width="15" height="15" viewBox="0 0 24 24" fill="#ff5a6e"><path d="M12 20.5s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.8a4.3 4.3 0 0 1 7.5 2.7c0 5.4-7.5 10-7.5 10z"/></svg><span data-v></span></div>`;
    }
    return "";
  }
  function buildCompact() {
    const ids = active().slice(0, 2);
    const sig = ids.join();
    if (sig === lastSig) return;
    lastSig = sig;
    compact.innerHTML = ids.length === 1
      ? `<span></span><span class="in">${chip(ids[0])}</span><span></span>`
      : `<span class="in">${ids[0] ? chip(ids[0]) : ""}</span><span class="in">${ids[1] ? chip(ids[1]) : ""}</span>`;
    compact.querySelectorAll(".in").forEach((n) => (n.style.animation = "card-swap .42s var(--n-ease) both"));
    paintCompact();
  }
  function paintCompact() {
    const set = (c, s, v) => { const n = q(compact, `[data-chip="${c}"] ${s}`); if (n && n.textContent !== v) n.textContent = v; };
    const bgc = d.bg < 70 ? "#ff7971" : d.bg > 180 ? "#edbc56" : "#5ee08a";
    const delta = d.bg - d.prevBg || 0;
    const arrow = Math.abs(delta) < 3 ? "→" : delta > 0 ? (delta > 6 ? "↑" : "↗") : delta < -6 ? "↓" : "↘";
    set("glucose", "[data-v]", String(Math.round(d.bg))); set("glucose", "[data-arrow]", arrow); set("glucose", "[data-d]", `${delta > 0 ? "+" : ""}${Math.round(delta)}`);
    compact.querySelectorAll('[data-chip="glucose"] span').forEach((n) => (n.style.color = bgc));
    set("timer", "[data-v]", mmss(d.timerLeft));
    set("sport", "[data-v]", `${d.min}'`); set("sport", "[data-s]", `${d.home}:${d.away}`);
    set("pulse", "[data-v]", String(Math.round(d.pulse)));
    const cv = q(compact, "[data-cover]"); if (cv) cv.style.background = cover(TRACKS[d.track].c);
    compact.querySelectorAll(".n-eq i").forEach((n) => (n.style.animationPlayState = d.playing ? "running" : "paused"));
  }

  // ---------- Aufgeklappt ----------
  const TABS = () => [
    ...(settings.on.music ? [["music", "Musik"]] : []),
    ...(settings.on.glucose ? [["glucose", "Blutzucker"]] : []),
    ...(settings.on.timer ? [["timer", "Timer"]] : []),
    ...(settings.on.sport ? [["sport", "Spiel"]] : []),
    ["files", "Dateien"],
  ];
  let xSig = "";
  function buildExpanded() {
    if (Date.now() < alertUntil && alertData) {
      const sig = "alert" + alertData.title + alertData.text;
      if (sig === xSig) return;
      xSig = sig;
      xin.innerHTML = `<div class="n-alertbox"><div style="font:650 17px var(--n-font)">${alertData.title}</div><div class="n-sub">${alertData.text}</div></div>`;
      xin.style.padding = "18px 22px 20px";
      return;
    }
    xin.style.padding = "";
    const tabs = TABS();
    if (!tabs.find(([id]) => id === d.tab)) d.tab = tabs[0][0];
    const sig = "x" + tabs.map((t) => t[0]).join() + d.tab;
    if (sig === xSig) return;
    xSig = sig;
    xin.innerHTML = `
      <div class="n-tabs" role="tablist">${tabs.map(([id, n]) => `<button role="tab" data-tab="${id}" aria-selected="${id === d.tab}">${n}</button>`).join("")}</div>
      <div class="n-card on" data-card="${d.tab}">${card(d.tab)}</div>`;
    paintExpanded();
  }
  function card(id) {
    switch (id) {
      case "music": return `<div class="n-music"><div class="n-art" data-art></div><div>
          <div class="n-title" data-t></div><div class="n-artist" data-a></div>
          <div class="n-prog" data-prog><b data-bar></b></div><div class="n-times"><span data-pos></span><span data-dur></span></div>
          <div class="n-ctl"><button data-act="prev" aria-label="Zurück">${I.prev}</button><button class="play" data-act="play" aria-label="Wiedergabe"></button><button data-act="next" aria-label="Weiter">${I.next}</button><span class="n-sub" style="margin-left:8px;font-size:11px">Demo ohne Ton</span></div></div></div>`;
      case "glucose": return `<div class="n-row"><div><div class="n-big"><span data-v></span> <span data-arrow style="font-size:30px"></span></div><div class="n-sub" data-sub></div></div>
          <svg class="n-spark" viewBox="0 0 190 64" preserveAspectRatio="none" aria-hidden="true"><rect x="0" y="14" width="190" height="30" rx="4" fill="rgba(94,224,138,.1)"/><path data-line fill="none" stroke="#5ee08a" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle data-dot r="3.4" fill="#fff"/></svg></div>
          <div class="n-sub" style="margin-top:10px;font-size:11px">Beispielwerte aus der Haze-Demo · kein Medizinprodukt</div>`;
      case "timer": return `<div class="n-row"><div><div class="n-big" data-v></div><div class="n-sub" data-sub></div></div>
          <div class="n-btns" style="margin:0"><button class="pr" data-act="tstart"></button><button data-act="treset">Zurück</button><button data-act="tshort">1 Min.</button></div></div>`;
      case "sport": return `<div class="n-score"><div><div class="crest" style="background:#1f6feb">NOR</div>Nordstadt</div><div><div class="res"><span data-h></span>:<span data-aw></span></div><div class="min" data-m></div></div><div><div class="crest" style="background:#d9480f">HAF</div>Hafenstadt</div></div>
          <div class="n-sub" style="margin-top:12px;text-align:center;font-size:11px">Erfundene Vereine · Spielzeit wie in Arena</div>`;
      case "files": return `<div class="n-drop"><div><b style="color:#fff">Datei hierher ziehen</b><br><span style="font-size:12px">Sie bleibt in deinem Browser – nichts wird hochgeladen.</span></div></div><div class="n-files" data-files></div>`;
    }
    return "";
  }
  function paintExpanded() {
    const T = (s, v) => { const n = q(xin, s); if (n && n.textContent !== v) n.textContent = v; };
    const tr = TRACKS[d.track];
    T("[data-t]", tr.t); T("[data-a]", tr.a); T("[data-pos]", mmss(d.pos)); T("[data-dur]", mmss(tr.d));
    const art = q(xin, "[data-art]"); if (art) art.style.background = cover(tr.c);
    const bar = q(xin, "[data-bar]"); if (bar) bar.style.width = (100 * d.pos / tr.d).toFixed(2) + "%";
    const pl = q(xin, '[data-act="play"]'); if (pl) pl.innerHTML = d.playing ? I.pause : I.play;
    const delta = d.bg - (d.prevBg || d.bg);
    T("[data-v]", xin.querySelector('[data-card="glucose"]') ? String(Math.round(d.bg)) : xin.querySelector('[data-card="timer"]') ? mmss(d.timerLeft) : "");
    T("[data-arrow]", Math.abs(delta) < 3 ? "→" : delta > 0 ? "↗" : "↘");
    T('[data-card="glucose"] [data-sub]', `mg/dl · ${delta > 0 ? "+" : ""}${Math.round(delta)} seit 5 Min.`);
    const line = q(xin, "[data-line]");
    if (line) {
      const h = d.hist, mn = 60, mx = 200;
      const pts = h.map((v, i) => [(i / (h.length - 1)) * 190, 60 - ((Math.min(mx, Math.max(mn, v)) - mn) / (mx - mn)) * 56]);
      line.setAttribute("d", pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(""));
      const dot = q(xin, "[data-dot]"); dot.setAttribute("cx", pts.at(-1)[0]); dot.setAttribute("cy", pts.at(-1)[1]);
    }
    T('[data-card="timer"] [data-sub]', d.timerRun ? "Konzentration läuft" : d.timerLeft === 0 ? "Fertig" : "Bereit");
    const ts = q(xin, '[data-act="tstart"]'); if (ts) ts.textContent = d.timerRun ? "Pause" : "Start";
    T("[data-h]", String(d.home)); T("[data-aw]", String(d.away)); T("[data-m]", `${d.min}'`);
    const files = q(xin, "[data-files]");
    if (files && files.childElementCount !== d.files.length) files.replaceChildren(...d.files.map((n) => Object.assign(document.createElement("span"), { textContent: n })));
  }

  // ---------- Eingaben ----------
  el.addEventListener("pointerenter", (e) => { if (e.pointerType === "touch") return; clearTimeout(leaveT); hover = true; refresh(); });
  el.addEventListener("pointerleave", (e) => { if (e.pointerType === "touch") return; clearTimeout(leaveT); leaveT = setTimeout(() => { hover = false; refresh(); }, 380); });
  el.addEventListener("click", (e) => {
    const tab = e.target.closest("[data-tab]");
    if (tab) { d.tab = tab.dataset.tab; xSig = ""; refresh(); return; }
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act) return doAct(act);
    const prog = e.target.closest("[data-prog]");
    if (prog) { const r = prog.getBoundingClientRect(); d.pos = ((e.clientX - r.left) / r.width) * TRACKS[d.track].d; paintExpanded(); return; }
    if (!e.target.closest(".n-xin")) { pinned = !pinned; refresh(); } // Tippen auf die Form (Touch)
  });
  document.addEventListener("pointerdown", (e) => { if (pinned && !el.contains(e.target)) { pinned = false; refresh(); } });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && pinned) { pinned = false; refresh(); } });

  function doAct(a) {
    if (a === "play") d.playing = !d.playing;
    if (a === "next") { d.track = (d.track + 1) % TRACKS.length; d.pos = 0; d.playing = true; }
    if (a === "prev") { d.track = (d.track + TRACKS.length - 1) % TRACKS.length; d.pos = 0; d.playing = true; }
    if (a === "tstart") { if (d.timerLeft === 0) d.timerLeft = d.timerTotal; d.timerRun = !d.timerRun; }
    if (a === "treset") { d.timerRun = false; d.timerLeft = d.timerTotal = 25 * 60; }
    if (a === "tshort") { d.timerTotal = d.timerLeft = 60; d.timerRun = true; }
    lastSig = ""; paintExpanded(); paintCompact();
  }

  // Dateien über die Notch ziehen
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
  let dragT = 0;
  addEventListener("dragover", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    clearTimeout(dragT); dragT = setTimeout(() => { dragOver = false; el.classList.remove("dragover"); refresh(); }, 200);
    if (!dragOver) { dragOver = true; d.tab = "files"; xSig = ""; refresh(); }
    el.classList.toggle("dragover", el.contains(e.target));
  });
  addEventListener("drop", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    clearTimeout(dragT); dragOver = false; el.classList.remove("dragover");
    if (el.contains(e.target)) {
      for (const f of e.dataTransfer.files) if (!d.files.includes(f.name)) d.files.unshift(f.name);
      d.files = d.files.slice(0, 8);
      d.tab = "files"; hover = true; clearTimeout(leaveT); leaveT = setTimeout(() => { hover = false; refresh(); }, 2400);
    }
    refresh(); paintExpanded();
  });

  // ---------- Alarme und Takt ----------
  function alertNow(title, text, ms = 3800) {
    alertData = { title, text };
    alertUntil = Date.now() + ms;
    xSig = "";
    clearTimeout(alertT);
    alertT = setTimeout(() => { xSig = ""; refresh(); }, ms + 50);
    refresh();
  }

  const rnd = (a, b) => a + Math.random() * (b - a);
  setInterval(() => {
    // jede Sekunde
    if (d.playing) { d.pos += 1; if (d.pos >= TRACKS[d.track].d) { d.track = (d.track + 1) % TRACKS.length; d.pos = 0; paintCompact(); } }
    if (d.timerRun) {
      d.timerLeft -= 1;
      if (d.timerLeft <= 0) { d.timerLeft = 0; d.timerRun = false; alertNow("Timer abgelaufen", "Zeit für eine Pause.", 4500); }
    }
    if (document.hidden) return;
    paintCompact();
    if (state === "expanded") paintExpanded();
  }, 1000);
  setInterval(() => {
    // Blutzucker alle 6 s (echte Sensoren: alle 5 Minuten), Puls, Spiel
    d.prevBg = d.bg;
    d.bg = Math.min(190, Math.max(72, d.bg + rnd(-5, 5.4)));
    d.hist.push(d.bg); d.hist.shift();
    d.pulse = Math.min(96, Math.max(66, d.pulse + rnd(-3, 3)));
    if (state === "expanded") paintExpanded();
    paintCompact();
  }, 6000);
  setInterval(() => {
    // Spiel: jede Spielminute dauert 4 s
    if (d.min >= 90) { d.min = 1; d.home = 0; d.away = 0; }
    d.min += 1;
    if (Math.random() < 0.07) {
      const home = Math.random() < 0.5;
      home ? d.home++ : d.away++;
      alertNow("Tor!", `${home ? "Nordstadt" : "Hafenstadt"} · ${d.home}:${d.away} (${d.min}')`);
    }
    paintCompact();
  }, 4000);

  // ---------- Öffentliche Schnittstelle ----------
  function set(patch) {
    if (patch.on) Object.assign(settings.on, patch.on);
    if (patch.order) settings.order = patch.order.filter((id) => SOURCES.some((s) => s.id === id));
    if (patch.fullscreen) settings.fullscreen = patch.fullscreen;
    lastSig = ""; xSig = "";
    refresh();
    subs.forEach((f) => f(snapshot()));
  }
  const snapshot = () => JSON.parse(JSON.stringify(settings));

  refresh();
  return {
    el,
    alert: alertNow,
    startTimer(sec) { d.timerTotal = d.timerLeft = sec; d.timerRun = true; lastSig = ""; refresh(); paintCompact(); },
    set,
    get: snapshot,
    onChange: (f) => subs.push(f),
    /** Notch fährt aus der Bildschirmkante, wenn der Desktop aufgebaut ist */
    show() {
      el.classList.remove("gone");
      el.animate([{ transform: "translate(-50%,-110%)" }, { transform: "translate(-50%,0)" }], { duration: 900, easing: "cubic-bezier(.22,1.18,.36,1)" });
      gone = false;
      void gone;
    },
  };
}
