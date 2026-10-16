// Fußzeile mit Installer-Knopf, Info-Blatt, Willkommen-Fenster und Lernseiten-Übersicht.
import { APPS, LEARN, MORE, OWNER, byId } from "./apps.js";
import { release, fmtMb } from "./downloads.js";
import { I } from "./icons.js";
import { h } from "./wm.js";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** Fußzeile eines Programmfensters: Name · Info · Quellcode · Installer (mit Version und Größe) */
export function appFooter(app, win) {
  const f = h("footer", "win-foot");
  const pub = app.sourceRepo !== null;
  f.innerHTML = `
    <div class="wf-id"><img src="${app.icon}" alt=""><b>${esc(app.name)}</b><span>${esc(app.tag)}</span></div>
    <button class="wf-btn" data-act="info" type="button">${I.info}<span>Info</span></button>
    ${pub ? `<a class="wf-btn" href="https://github.com/${OWNER}/${app.repo}" target="_blank" rel="noopener">${I.code}<span>Quellcode</span></a>` : ""}
    <a class="wf-btn primary" data-act="dl" href="${app.fallback.url}" target="_blank" rel="noopener">${I.download}<span>Installer <small>v${app.fallback.version}</small></span></a>`;
  const dl = f.querySelector('[data-act="dl"]');
  release(app).then((r) => {
    dl.href = r.url;
    dl.querySelector("span").innerHTML = `Installer <small>v${esc(r.version)} · ${fmtMb(r.mb)}</small>`;
    dl.title = `${app.name} ${r.version} für Windows herunterladen`;
  });
  f.querySelector('[data-act="info"]').onclick = () => toggleSheet(win, app);
  return f;
}

function toggleSheet(win, app) {
  const ex = win.body.querySelector(".sheet");
  if (ex) { ex.hidden = !ex.hidden; return; }
  const pub = app.sourceRepo !== null;
  const s = h("div", "sheet");
  s.innerHTML = `
    <div class="sheet-card" role="document">
      <div class="sheet-head"><img src="${app.icon}" alt=""><div><h2>${esc(app.name)}</h2><p>${esc(app.tag)}</p></div></div>
      <p>${esc(app.about)}</p>
      <h3>In der Demo ausprobieren</h3>
      <ul>${app.try.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>
      <div class="demo">${esc(app.demo)}</div>
      <div class="sheet-actions">
        <a class="wf-btn primary" data-dl href="${app.fallback.url}" target="_blank" rel="noopener">${I.download}<span>Installer für Windows</span></a>
        ${pub ? `<a class="wf-btn" href="https://github.com/${OWNER}/${app.repo}" target="_blank" rel="noopener">${I.code}<span>Quellcode</span></a>` : ""}
        <a class="wf-btn" data-rel href="${app.fallback.url}" target="_blank" rel="noopener">${I.external}<span>Alle Versionen</span></a>
        <button class="wf-btn" data-close type="button"><span>Schließen</span></button>
      </div>
      <div class="sheet-meta" data-meta>${esc(app.stack)} · nur Windows 10/11. Bei neuen Installern kann SmartScreen warnen („Weitere Informationen“ → „Trotzdem ausführen“).</div>
    </div>`;
  s.addEventListener("click", (e) => { if (e.target === s || e.target.closest("[data-close]")) s.hidden = true; });
  s.addEventListener("keydown", (e) => { if (e.key === "Escape") s.hidden = true; });
  win.body.append(s);
  release(app).then((r) => {
    s.querySelector("[data-dl]").href = r.url;
    s.querySelector("[data-dl] span").textContent = `Installer v${r.version} · ${fmtMb(r.mb)}`;
    s.querySelector("[data-rel]").href = r.page;
  });
  s.querySelector("[data-close]").focus();
}

/** Fußzeile einer Lernseite: nur Link in den eigenen Tab (die Seite ist die echte, nichts ist nachgebaut) */
export function siteFooter(site) {
  const f = h("footer", "win-foot");
  f.innerHTML = `
    <div class="wf-id"><b>${esc(site.name)}</b><span>${esc(site.sub)}</span></div>
    <a class="wf-btn" href="https://github.com/${OWNER}/${site.repo}" target="_blank" rel="noopener">${I.code}<span>Quellcode</span></a>
    <a class="wf-btn primary" href="${site.url}" target="_blank" rel="noopener">${I.external}<span>In eigenem Tab öffnen</span></a>`;
  return f;
}

const tile = (hue) => `background:linear-gradient(145deg,hsl(${hue} 70% 62%),hsl(${(hue + 40) % 360} 62% 34%))`;

/** Inhalt des Lernseiten-Fensters: Karten, Klick öffnet die echte Seite in einem eigenen Fenster */
export function buildLearn(body, openSite) {
  body.style.overflow = "auto";
  body.innerHTML = `
    <div class="learn" style="padding:24px 26px 28px;user-select:none">
      <h2 style="margin:0 0 4px;font:650 22px var(--n-font-display)">Lernseiten</h2>
      <p style="margin:0 0 20px;color:var(--n-dim);max-width:60ch;line-height:1.5">Für meine Klausuren gebaut: Lernkarten, Prüfungsfragen, Videos. Ein Klick öffnet die echte Seite – alles darin funktioniert wie im eigenen Tab.</p>
      <div class="lgrid">${LEARN.map(card).join("")}</div>
      <h3 style="margin:30px 0 12px;font:650 11px var(--n-font);letter-spacing:.1em;text-transform:uppercase;color:var(--n-faint)">Weitere Seiten</h3>
      <div class="lgrid">${MORE.map(card).join("")}</div>
    </div>
    <style>
      .lgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}
      .lcard{display:grid;grid-template-columns:48px 1fr;gap:14px;align-items:center;text-align:left;padding:14px;border-radius:16px;background:var(--n-surface);box-shadow:inset 0 0 0 1px var(--n-line);transition:background .2s,transform .35s var(--spring),box-shadow .2s}
      .lcard:hover{background:var(--n-surface-2);transform:translateY(-2px);box-shadow:inset 0 0 0 1px var(--n-line-2),0 10px 24px rgba(0,0,0,.28)}
      .lcard:active{transform:scale(.98)}
      .lcard .lt{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;font:800 19px var(--n-font-display);color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.35);box-shadow:inset 0 1px 0 rgba(255,255,255,.35)}
      .lcard b{display:block;font-weight:650;margin-bottom:2px}
      .lcard span{color:var(--n-dim);font-size:12px;line-height:1.35;display:block}
      .lcard i{display:block;font-style:normal;color:var(--n-faint);font-size:11px;margin-top:3px}
    </style>`;
  body.addEventListener("click", (e) => {
    const c = e.target.closest("[data-site]");
    if (!c) return;
    const all = [...LEARN, ...MORE];
    openSite(all.find((s) => s.id === c.dataset.site));
  });
}
const card = (s) => `<button class="lcard" type="button" data-site="${esc(s.id)}"><div class="lt" style="${tile(s.hue)}">${esc(s.name.replace(/[^A-Za-zÄÖÜäöü]/g, "").slice(0, 2).toUpperCase())}</div><div><b>${esc(s.name)}</b><span>${esc(s.sub)}</span>${s.note ? `<i>${esc(s.note)}</i>` : ""}</div></button>`;

/** Willkommen: kurze Einführung und alle Programme als Kacheln */
export function buildWelcome(body, openApp, openLearn) {
  body.style.overflow = "auto";
  body.innerHTML = `
    <div class="welcome">
      <div class="w-hero">
        <p class="w-eye">Nojo · Desktop</p>
        <h1>Das ist mein Desktop.</h1>
        <p class="w-lead">Alles, was du hier siehst, habe ich selbst gebaut. Jedes Programm läuft hier mit Beispieldaten direkt im Browser – anklicken, ausprobieren, und wenn es gefällt, unten im Fenster den Installer laden.</p>
      </div>
      <div class="w-grid">
        ${APPS.map((a) => `<button class="w-app" data-app="${a.id}" type="button"><img src="${a.icon}" alt=""><div><b>${esc(a.name)}</b><span>${esc(a.tag)}</span></div></button>`).join("")}
        <button class="w-app" data-learn type="button"><div class="wl" style="${tile(205)}">${I.book}</div><div><b>Lernseiten</b><span>Klausur-Trainer, Videos, Lernkarten</span></div></button>
      </div>
      <p class="w-note">Tipp: Fahr mit der Maus an den oberen Rand – dort sitzt die Notch. Fenster lassen sich ziehen, in der Größe ändern und minimieren.</p>
    </div>
    <style>
      .welcome{padding:34px 34px 30px;max-width:860px;margin:0 auto}
      .w-eye{margin:0 0 10px;font:650 11px var(--n-font);letter-spacing:.14em;text-transform:uppercase;color:var(--n-accent)}
      .w-hero h1{margin:0 0 12px;font:700 clamp(30px,5vw,44px)/1.05 var(--n-font-display);letter-spacing:-.02em}
      .w-lead{margin:0 0 26px;max-width:58ch;color:var(--n-dim);font-size:15px;line-height:1.6}
      .w-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px}
      .w-app{display:grid;grid-template-columns:52px 1fr;gap:14px;align-items:center;text-align:left;padding:14px;border-radius:18px;background:var(--n-surface);box-shadow:inset 0 0 0 1px var(--n-line);transition:background .2s,transform .35s var(--spring)}
      .w-app:hover{background:var(--n-surface-2);transform:translateY(-2px)}
      .w-app:active{transform:scale(.98)}
      .w-app img,.w-app .wl{width:52px;height:52px;border-radius:14px;display:grid;place-items:center;color:#fff}
      .w-app .wl svg{width:26px;height:26px}
      .w-app b{display:block;font:650 14.5px var(--n-font)}
      .w-app span{color:var(--n-dim);font-size:12px;line-height:1.35}
      .w-note{margin:22px 0 0;color:var(--n-faint);font-size:12.5px}
    </style>`;
  body.addEventListener("click", (e) => {
    const a = e.target.closest("[data-app]");
    if (a) return openApp(byId(a.dataset.app));
    if (e.target.closest("[data-learn]")) openLearn();
  });
}
