// Einstieg: Intro abspielen, Desktop aufbauen (Menüleiste, Dock, Symbole), Fenster und Notch verdrahten.
import { APPS, LEARN, MORE, byId } from "./apps.js";
import { runIntro } from "./intro.js";
import { WM, h } from "./wm.js";
import { appFooter, siteFooter, buildLearn, buildWelcome } from "./chrome.js";
import { createNotchHost } from "./notch-host.js";
import { initStreamdock } from "./streamdock-demo.js";
import { I } from "./icons.js";
import { S } from "./stage.js";
import { animate, stagger, springValue, lift, POP, SPRING } from "./motion.js";

const $ = (s) => document.querySelector(s);
const REPO = "https://github.com/NojoMcDybo/portfolio-desktop";
const NEBEL = { ...MORE.find((m) => m.id === "fogylation"), name: "nebel. Simulator", icon: "assets/icons/nebel.svg" };

const wm = new WM($("#windows"));
// Notch: die echte Oberfläche in einem durchsichtigen Fenster über dem Desktop; „Einstellungen“ in der Notch öffnet das Notch-Fenster
const notch = createNotchHost({
  toast: (t) => toast(t),
  openSettings: (tab) => {
    const w = wm.get("notch");
    if (w) return w.min ? wm.restore(w) : wm.focus(w);
    const a = byId("notch");
    openApp({ ...a, page: a.page + (tab ? "#" + tab : "") });
  },
});

// ---------- Fenster öffnen ----------
function openApp(app) {
  return wm.open({
    // Programme mit eigener Fensterleiste (Tauri, rahmenlos) zeichnen sie selbst; Haze (Electron) bekommt hier eine
    key: app.id, title: app.name, mode: app.bar ? "bar" : "app", pad: app.bar ? 80 : 40, icon: app.icon, src: app.page, size: app.size, min: [560, 420], noScale: app.id === "notch",
    bg: app.bg, footer: (w) => appFooter(app, w),
  });
}
function openSite(site, key = "site:" + site.id) {
  wm.open({
    key, title: site.name, mode: "bar", icon: site.icon, src: site.url, size: site.size, min: [520, 380], sandbox: true,
    bg: "#101012", footer: () => siteFooter(site),
  });
}
const openLearn = () => wm.open({ key: "learn", title: "Lernseiten", mode: "bar", icon: "assets/icons/learn.svg", size: [940, 640], min: [520, 380], build: (b) => buildLearn(b, openSite) });
const openWelcome = () => wm.open({ key: "welcome", title: "Willkommen", mode: "bar", icon: "assets/icons/notch.png", size: [900, 640], min: [520, 400], build: (b) => buildWelcome(b, openApp, openLearn) });
const openNebel = () => openSite(NEBEL, "nebel");

// ---------- Dock ----------
const DOCK = [
  ...APPS.map((a) => ({ key: a.id, name: a.name, icon: a.icon, open: () => openApp(a), app: a })),
  { sep: true },
  { key: "nebel", name: "nebel. Simulator", icon: NEBEL.icon, open: openNebel },
  { key: "learn", name: "Lernseiten", icon: "assets/icons/learn.svg", open: openLearn },
];
const dockKey = (k) => (k === "nebel" ? "nebel" : k.startsWith("site:") || k === "learn" ? "learn" : k);
const bar = $("#dock-bar");
const items = new Map();
for (const d of DOCK) {
  if (d.sep) { bar.append(h("i", "dk-sep")); continue; }
  const b = h("button", "dk");
  b.type = "button";
  b.dataset.key = d.key;
  b.setAttribute("aria-label", d.name);
  b.innerHTML = `<span class="dk-in"><img src="${d.icon}" alt="" draggable="false"></span><span class="dk-label">${d.name}</span>`;
  b.addEventListener("click", () => {
    const w = wm.get(d.key);
    if (!w) animate(b.querySelector("img"), { y: [0, -26, 0, -13, 0] }, { duration: 0.85, ease: "easeOut", times: [0, 0.32, 0.58, 0.8, 1] });
    // Lernseiten-Ordner: ist ein Seitenfenster offen, bringt der Klick es nach vorn, sonst die Übersicht
    if (d.key === "learn" && !wm.get("learn")) {
      const sites = wm.all().filter((x) => x.key.startsWith("site:"));
      if (sites.length) { const s = sites.at(-1); return s.min ? wm.restore(s) : wm.focus(s); }
    }
    d.open();
  });
  b.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    const m = [{ label: d.name, dis: true }, { label: "Öffnen", fn: d.open }];
    if (d.app) m.push({ label: "Installer herunterladen", href: d.app.fallback.url }, ...(d.app.sourceRepo !== null ? [{ label: "Quellcode", href: `https://github.com/NojoMcDybo/${d.app.repo}` }] : []));
    const w = wm.get(d.key);
    if (w) m.push({ sep: true }, { label: "Schließen", fn: () => wm.close(w) });
    menu(e.clientX / S.k, S.h - 90, m, true);
  });
  // Beschriftung federt herein; Druck drückt das Symbol (nicht das Dock-Element selbst: das trägt die Vergrößerung)
  const lab = b.querySelector(".dk-label"), img = b.querySelector("img");
  const showLab = () => animate(lab, { opacity: [0, 1], y: [8, 0] }, { type: "spring", stiffness: 520, damping: 30 });
  const hideLab = () => animate(lab, { opacity: 0, y: 4 }, { duration: 0.12 });
  b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") showLab(); });
  b.addEventListener("pointerleave", () => hideLab());
  b.addEventListener("focus", () => { if (b.matches(":focus-visible")) showLab(); });
  b.addEventListener("blur", () => hideLab());
  b.addEventListener("pointerdown", () => animate(img, { scale: 0.88 }, POP));
  for (const ev of ["pointerup", "pointerleave", "pointercancel"]) b.addEventListener(ev, () => animate(img, { scale: 1 }, POP));
  // Vergrößerung: jedes Symbol folgt seinem Zielwert auf einer Feder (Größe und seitlicher Versatz, das Dock bleibt mittig)
  const sv = { s: springValue(1, { stiffness: 520, damping: 30, mass: 0.7 }), o: springValue(0, { stiffness: 520, damping: 30, mass: 0.7 }) };
  // Nur das Symbol wächst (scale auf .dk-in, ohne will-change: so wird es in der vergrößerten Größe gezeichnet, nicht hochgezogen); Beschriftung und Punkt bleiben scharf
  const inner = b.querySelector(".dk-in");
  const paint = () => { const s = sv.s.get(); b.style.transform = `translateX(${sv.o.get()}px)`; inner.style.transform = `scale(${s})`; b.style.setProperty("--s", s); };
  sv.s.on("change", paint); sv.o.on("change", paint);
  b._sv = sv;
  items.set(d.key, b);
  bar.append(b);
}
wm.dockRect = (key) => { const r = items.get(dockKey(key))?.getBoundingClientRect(); return r ? { x: r.x / S.k, y: r.y / S.k, width: r.width / S.k, height: r.height / S.k } : null; };
function paintDock() {
  const run = new Set(wm.all().map((w) => dockKey(w.key)));
  items.forEach((b, k) => b.classList.toggle("run", run.has(k)));
}
wm.on("change", () => { paintDock(); });
wm.on("focus", (w) => { $("#mb-app").textContent = w ? w.title : "Desktop"; });

// Vergrößerung beim Drüberfahren (Nähe zur Maus), Nachbarn rücken mit
const fine = matchMedia("(hover: hover) and (pointer: fine)");
bar.addEventListener("pointermove", (e) => {
  if (!fine.matches) return;
  const list = [...items.values()];
  const w0 = 56 + 8;
  const sc = list.map((b) => { const r = b.getBoundingClientRect(); const dist = Math.abs(e.clientX - (r.left + r.width / 2) + b._sv.o.get() * S.k) / S.k; return 1 + 0.62 * Math.max(0, 1 - dist / 130) ** 2; });
  const total = sc.reduce((a, s) => a + (s - 1) * w0, 0);
  let acc = 0;
  list.forEach((b, i) => {
    b._sv.o.set(acc + ((sc[i] - 1) * w0) / 2 - total / 2);
    acc += (sc[i] - 1) * w0;
    b._sv.s.set(sc[i]);
  });
});
bar.addEventListener("pointerleave", () => items.forEach((b) => { b._sv.s.set(1); b._sv.o.set(0); }));

// ---------- Hintergrund: Baum in Dithering (WebGL), Himmel nach Uhrzeit, Blick folgt Kopf oder Maus ----------
let wp = null;
{
  const q = new URLSearchParams(location.search);
  if (q.get("wp") !== "off") {
    import("./wallpaper.js")
      .then((mod) => {
        wp = mod.startWallpaper(document.getElementById("wp-canvas"));
        document.querySelector(".wallpaper").classList.add("gl");
        if (q.has("debug")) window.__wp = wp;
        setInterval(() => wp.setCovered(wm.all().some((w) => !w.min && (w.max || S.small))), 500);
        wp.Kopf.onCamera((s, detail) => {
          if (detail) toast(detail);
          else if (s === "lädt") toast("Die Kamera wird nur hier im Browser ausgewertet – nichts wird gesendet.");
          else if (s === "aktiv") toast("Kopf erkannt: der Hintergrund folgt deinem Blick.");
        });
      })
      .catch((e) => { console.warn("Hintergrund: Ersatzbild", e); document.getElementById("wp-canvas")?.remove(); });
  }
}

// ---------- Desktop-Symbole ----------
const ICONS = [
  { name: "Willkommen", glyph: I.hello, hue: 215, open: openWelcome },
  { name: "Lernseiten", glyph: I.folder, hue: 28, open: openLearn },
  { name: "Trainings-wissenschaften", icon: LEARN[0].icon, hue: 205, open: () => openSite(LEARN[0]) },
  { name: "LitCult & Linguistik", glyph: "LC", hue: 330, open: () => openSite(LEARN[1]) },
];
const icons = $("#icons");
for (const i of ICONS) {
  const b = h("button", "dicon");
  b.type = "button";
  b.innerHTML = i.icon
    ? `<div class="di" style="background:none"><img src="${i.icon}" alt="" draggable="false" style="width:100%;height:100%;border-radius:inherit;display:block;pointer-events:none"></div><span>${i.name}</span>`
    : `<div class="di" style="background:linear-gradient(145deg,hsl(${i.hue} 70% 60%),hsl(${(i.hue + 40) % 360} 62% 34%));color:#fff;font:800 20px var(--n-font-display)">${i.glyph.startsWith("<") ? i.glyph.replace("<svg", '<svg width="28" height="28"') : i.glyph}</div><span>${i.name}</span>`;
  b.addEventListener("click", i.open);
  icons.append(b);
}
lift(icons.querySelectorAll(".dicon"), { y: 0, scale: 1.04, target: ".di" });

// ---------- Menüleiste ----------
const menuEl = $("#menu");
let menuFor = null;
function menu(x, y, list, above = false) {
  menuEl.replaceChildren();
  for (const m of list) {
    if (m.sep) { menuEl.append(h("hr")); continue; }
    const e = m.href ? h("a") : h("button");
    if (m.href) { e.href = m.href; e.target = "_blank"; e.rel = "noopener"; }
    else e.type = "button";
    e.innerHTML = `<span>${m.label}</span>${m.hint ? `<small>${m.hint}</small>` : ""}`;
    if (m.dis) e.classList.add("dis");
    e.setAttribute("role", "menuitem");
    e.addEventListener("click", () => { closeMenu(); m.fn?.(); });
    menuEl.append(e);
  }
  menuEl.hidden = false;
  menuEl.style.left = Math.min(x, S.w - 240) + "px";
  menuEl.style.top = "0px";
  const hgt = menuEl.offsetHeight;
  menuEl.style.top = (above ? Math.max(40, y - hgt) : y) + "px";
  menuEl.style.transformOrigin = above ? "bottom left" : "top left";
  menuEl.querySelector("button:not(.dis), a")?.focus({ preventScroll: true });
  animate(menuEl, { opacity: [0, 1], scale: [0.94, 1] }, { type: "spring", stiffness: 520, damping: 32 });
  animate(menuEl.children, { opacity: [0, 1], x: [-8, 0] }, { delay: stagger(0.018, { startDelay: 0.04 }), duration: 0.28, ease: "easeOut" });
}
function closeMenu() { menuEl.hidden = true; document.querySelectorAll("[aria-expanded=true]").forEach((b) => b.setAttribute("aria-expanded", "false")); menuFor = null; }
addEventListener("pointerdown", (e) => { if (!menuEl.hidden && !menuEl.contains(e.target) && !e.target.closest("[aria-haspopup]")) closeMenu(); }, true);
addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });

function menubarMenu(btn, list) {
  if (menuFor === btn) return closeMenu();
  closeMenu();
  menuFor = btn;
  btn.setAttribute("aria-expanded", "true");
  const r = btn.getBoundingClientRect();
  menu(r.left / S.k, r.bottom / S.k + 4, list);
}
$("#mb-logo").addEventListener("click", (e) =>
  menubarMenu(e.currentTarget, [
    { label: "Über diesen Desktop", fn: openWelcome },
    { label: "Intro erneut abspielen", fn: () => location.assign(location.pathname) },
    { sep: true },
    { label: "Quellcode dieses Portfolios", href: REPO },
    { label: "Alle Projekte auf GitHub", href: "https://github.com/NojoMcDybo?tab=repositories" },
    { sep: true },
    { label: "Alle Fenster schließen", fn: () => wm.closeAll() },
  ]));
document.querySelector('[data-menu="fenster"]').addEventListener("click", (e) => {
  const ws = wm.all();
  menubarMenu(e.currentTarget, [
    ...(ws.length ? ws.map((w) => ({ label: w.title, hint: w.min ? "minimiert" : "", fn: () => (w.min ? wm.restore(w) : wm.focus(w)) })) : [{ label: "Keine Fenster offen", dis: true }]),
    { sep: true },
    { label: "Alle minimieren", fn: () => wm.minimizeAll() },
    { label: "Alle schließen", fn: () => wm.closeAll() },
  ]);
});
document.querySelector('[data-menu="hilfe"]').addEventListener("click", (e) =>
  menubarMenu(e.currentTarget, [
    { label: "Fenster ziehen: oben anfassen", dis: true },
    { label: "Größe ändern: an Rand oder Ecke ziehen", dis: true },
    { label: "Notch: Maus an den oberen Rand, Ränder zum Andocken", dis: true },
    { label: "Installer: unten in jedem Programmfenster", dis: true },
    { sep: true },
    { label: "Willkommen öffnen", fn: openWelcome },
  ]));

const TIMES = [["live", "Live (nach der Uhr)"], ["morgen", "Morgen"], ["mittag", "Mittag"], ["abend", "Abend"], ["daemmerung", "Dämmerung"], ["nacht", "Nacht"], ["zeitraffer", "Ein Tag im Zeitraffer"]];
const WINDS = [[0.35, "sanft"], [1, "normal"], [1.8, "stürmisch"]], DEPTHS = [[0.5, "wenig"], [1, "normal"], [1.6, "stark"]];
const nextOf = (list, v) => list[(list.findIndex(([x]) => x === v) + 1) % list.length][0];
const nameOf = (list, v) => list.find(([x]) => x === v)?.[1] ?? "";
document.querySelector('[data-menu="hintergrund"]').addEventListener("click", (e) => {
  if (!wp) return menubarMenu(e.currentTarget, [{ label: "Der Hintergrund lädt noch oder wird hier nicht unterstützt", dis: true }]);
  const cam = wp.Kopf.state.camera, camOn = ["fragt", "lädt", "sucht", "aktiv"].includes(cam);
  menubarMenu(e.currentTarget, [
    { label: camOn ? "Kopf folgen beenden" : "Kopf folgen (Webcam)", hint: camOn ? { fragt: "fragt …", lädt: "lädt …", sucht: "sucht Gesicht …", aktiv: "aktiv" }[cam] : "", fn: () => (camOn ? wp.Kopf.stopCamera() : wp.Kopf.startCamera()) },
    { label: wp.paused ? "Bewegung fortsetzen" : "Bewegung anhalten", fn: () => wp.setPaused(!wp.paused) },
    { sep: true },
    ...TIMES.map(([id, label]) => ({ label, hint: wp.mode === id ? "✓" : "", fn: () => wp.setMode(id) })),
    { sep: true },
    { label: "Wind", hint: nameOf(WINDS, wp.wind), fn: () => wp.setWind(nextOf(WINDS, wp.wind)) },
    { label: "Tiefe", hint: nameOf(DEPTHS, wp.depth), fn: () => wp.setDepth(nextOf(DEPTHS, wp.depth)) },
  ]);
});

const clock = $("#mb-clock");
const tick = () => { clock.textContent = new Date().toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };
tick(); setInterval(tick, 15000);

// ---------- Nachrichten der Programme ----------
wm.on("bus", (name, data, win) => {
  if (name === "notch:alert") notch.alert({ title: data.title, text: data.text, ms: data.ms, app: win?.title ?? "Desktop" });
  else if (name === "open") { const a = byId(data.app); a ? openApp(a) : data.app === "nebel" && openNebel(); }
  else if (name === "toast") toast(data.text);
  else if (name === "window:open") openFromApp(data, win);
  else if (name === "window:close") { const w = wm.get(data.key); if (w) wm.close(w); }
});

/** Ein Programm öffnet ein weiteres Fenster (Kursbuch: Kursfenster, Pomodoro-Widget) – dieselbe Seite mit anderer Adresse */
function openFromApp(d, from) {
  const ex = wm.get(d.key);
  if (ex) {
    ex.min ? wm.restore(ex) : wm.focus(ex);
    ex.frame?.contentWindow?.postMessage({ portfolio: 1, type: "emit", event: "reveal", payload: { cmid: d.cmid ?? null, section: d.section ?? null } }, location.origin);
    return;
  }
  const base = from?.frame?.src || location.href;
  const w = wm.open({ key: d.key, title: d.title, mode: "app", pad: 0, src: new URL(d.src, base).href, size: d.size || [900, 640], noScale: !!d.bare, min: d.bare ? [200, 80] : [520, 380], bg: d.bare ? "transparent" : undefined });
  if (d.bare) w.el.classList.add("bare");
  if (d.max) wm.toggleMax(w);
}
initStreamdock(wm);

let toastT = 0, toastA = null;
function toast(text) {
  const t = $("#toast");
  t.textContent = text;
  toastA?.stop();
  toastA = animate(t, { opacity: [0, 1], y: [16, 0] }, SPRING);
  clearTimeout(toastT);
  toastT = setTimeout(() => { toastA = animate(t, { opacity: 0, y: 8 }, { duration: 0.25 }); }, 2800);
}

// ---------- Start ----------
// Der Desktop steht schon fertig hinter dem Intro (src/intro.js); das Hochziehen des Balkens macht ihn scharf
const skip = /[?&#]skip\b/.test(location.search + location.hash);
document.body.classList.add("booting");
// zum Testen: ?open=arena öffnet ein Programm sofort
const params = new URLSearchParams(location.search);
if (params.has("debug")) window.__wm = wm; // nur zum Testen im Browser
runIntro({ skip }).then(() => {
  setTimeout(() => notch.show(), 250);
  setTimeout(() => {
    const first = params.get("open");
    if (first === "none") return;
    if (first) { const a = byId(first); a ? openApp(a) : first === "learn" ? openLearn() : first === "nebel" ? openNebel() : openWelcome(); }
    else openWelcome();
  }, 1100);
});
