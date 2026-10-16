// Einstieg: Intro abspielen, Desktop aufbauen (Menüleiste, Dock, Symbole), Fenster und Notch verdrahten.
import { APPS, LEARN, MORE, byId } from "./apps.js";
import { runIntro } from "./fold.js";
import { WM, h } from "./wm.js";
import { appFooter, siteFooter, buildLearn, buildWelcome } from "./chrome.js";
import { createNotch } from "./notch.js";
import { initStreamdock } from "./streamdock-demo.js";
import { I } from "./icons.js";

const $ = (s) => document.querySelector(s);
const REPO = "https://github.com/NojoMcDybo/portfolio-desktop";
const NEBEL = { ...MORE.find((m) => m.id === "fogylation"), name: "nebel. Simulator", icon: "assets/icons/nebel.svg" };

const wm = new WM($("#windows"));
const notch = createNotch($("#notch-root"));

// ---------- Fenster öffnen ----------
function openApp(app) {
  return wm.open({
    // Programme mit eigener Fensterleiste (Tauri, rahmenlos) zeichnen sie selbst; Haze (Electron) bekommt hier eine
    key: app.id, title: app.name, mode: app.bar ? "bar" : "app", pad: app.bar ? 80 : 40, icon: app.icon, src: app.page, size: app.size, min: [560, 420],
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
  b.innerHTML = `<img src="${d.icon}" alt="" draggable="false"><span class="dk-label">${d.name}</span>`;
  b.addEventListener("click", () => {
    const w = wm.get(d.key);
    if (!w) { b.classList.remove("bounce"); void b.offsetWidth; b.classList.add("bounce"); }
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
    menu(e.clientX, innerHeight - 90, m, true);
  });
  items.set(d.key, b);
  bar.append(b);
}
wm.dockRect = (key) => items.get(dockKey(key))?.getBoundingClientRect() ?? null;
function paintDock() {
  const run = new Set(wm.all().map((w) => dockKey(w.key)));
  items.forEach((b, k) => b.classList.toggle("run", run.has(k)));
}
wm.on("change", () => { paintDock(); });
wm.on("focus", (w) => { $("#mb-app").textContent = w ? w.title : "Desktop"; });

// Vergrößerung beim Drüberfahren (Nähe zur Maus), Nachbarn rücken mit, das Dock bleibt mittig
const fine = matchMedia("(hover: hover) and (pointer: fine)");
let magRaf = 0;
bar.addEventListener("pointermove", (e) => {
  if (!fine.matches || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  cancelAnimationFrame(magRaf);
  magRaf = requestAnimationFrame(() => {
    const list = [...items.values()];
    const w0 = 56 + 8;
    const sc = list.map((b) => { const r = b.getBoundingClientRect(); const dist = Math.abs(e.clientX - (r.left + r.width / 2) + (b._off || 0)); return 1 + 0.62 * Math.max(0, 1 - dist / 130) ** 2; });
    const total = sc.reduce((a, s) => a + (s - 1) * w0, 0);
    let acc = 0;
    list.forEach((b, i) => {
      const off = acc + ((sc[i] - 1) * w0) / 2 - total / 2;
      acc += (sc[i] - 1) * w0;
      b._off = off;
      b.style.transform = `translateX(${off.toFixed(1)}px) scale(${sc[i].toFixed(3)})`;
    });
  });
});
bar.addEventListener("pointerleave", () => { cancelAnimationFrame(magRaf); items.forEach((b) => { b._off = 0; b.style.transform = ""; }); });

// ---------- Desktop-Symbole ----------
const ICONS = [
  { name: "Willkommen", glyph: I.hello, hue: 215, open: openWelcome },
  { name: "Lernseiten", glyph: I.folder, hue: 28, open: openLearn },
  { name: "Trainings-wissenschaften", glyph: "TW", hue: 205, open: () => openSite(LEARN[0]) },
  { name: "LitCult & Linguistik", glyph: "LC", hue: 330, open: () => openSite(LEARN[1]) },
];
const icons = $("#icons");
for (const i of ICONS) {
  const b = h("button", "dicon");
  b.type = "button";
  b.innerHTML = `<div class="di" style="background:linear-gradient(145deg,hsl(${i.hue} 70% 60%),hsl(${(i.hue + 40) % 360} 62% 34%));color:#fff;font:800 20px var(--n-font-display)">${i.glyph.startsWith("<") ? i.glyph.replace("<svg", '<svg width="28" height="28"') : i.glyph}</div><span>${i.name}</span>`;
  b.addEventListener("click", i.open);
  icons.append(b);
}

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
  menuEl.style.left = Math.min(x, innerWidth - 240) + "px";
  menuEl.style.top = "0px";
  const hgt = menuEl.offsetHeight;
  menuEl.style.top = (above ? Math.max(40, y - hgt) : y) + "px";
  menuEl.style.transformOrigin = above ? "bottom left" : "top left";
  menuEl.querySelector("button:not(.dis), a")?.focus({ preventScroll: true });
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
  menu(r.left, r.bottom + 4, list);
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
    { label: "Notch: Maus an den oberen Rand", dis: true },
    { label: "Installer: unten in jedem Programmfenster", dis: true },
    { sep: true },
    { label: "Willkommen öffnen", fn: openWelcome },
  ]));

const clock = $("#mb-clock");
const tick = () => { clock.textContent = new Date().toLocaleString("de-DE", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); };
tick(); setInterval(tick, 15000);

// ---------- Nachrichten der Programme ----------
const settingsReply = (win) => win?.frame?.contentWindow?.postMessage({ portfolio: 1, type: "notch-settings", settings: notch.get() }, location.origin);
wm.on("bus", (name, data, win) => {
  if (name === "notch:alert") notch.alert(data.title, data.text, data.ms);
  else if (name === "notch:get") settingsReply(win);
  else if (name === "notch:set") notch.set(data);
  else if (name === "notch:timer") notch.startTimer(data.sec);
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
  const w = wm.open({ key: d.key, title: d.title, mode: "app", pad: 0, src: new URL(d.src, base).href, size: d.size || [900, 640], min: d.bare ? [200, 80] : [520, 380], bg: d.bare ? "transparent" : undefined });
  if (d.bare) w.el.classList.add("bare");
  if (d.max) wm.toggleMax(w);
}
notch.onChange(() => settingsReply(wm.get("notch")));
initStreamdock(wm, { h });

let toastT = 0;
function toast(text) {
  const t = $("#toast");
  t.textContent = text; t.classList.add("on");
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2800);
}

// ---------- Start ----------
const skip = /[?&#]skip\b/.test(location.search + location.hash);
document.body.classList.add("booting");
// zum Testen: ?open=arena öffnet ein Programm sofort
const params = new URLSearchParams(location.search);
if (params.has("debug")) window.__wm = wm; // nur zum Testen im Browser
runIntro({ skip }).then(() => {
  setTimeout(() => notch.show(), 250);
  setTimeout(() => {
    const first = params.get("open");
    if (first) { const a = byId(first); a ? openApp(a) : first === "learn" ? openLearn() : first === "nebel" ? openNebel() : openWelcome(); }
    else openWelcome();
    if (!first) notch.alert("Willkommen", "Fahr mit der Maus über mich – ich zeige, was gerade läuft.", 4200);
  }, 1100);
});
