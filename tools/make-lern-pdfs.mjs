// Erzeugt für jede Lernseite einen PDF-Steckbrief (assets/pdfs/<id>.pdf) und die Vorschau-Liste für Folio (shim/folio-docs.js).
// Aufruf:  node tools/make-lern-pdfs.mjs [id …]   (ohne Argument: alle)
// Die Live-Seiten werden mit Chrome geöffnet (playwright-core aus D:\Dev\haze), fotografiert und mit ihrer Gliederung (Navigation,
// Abschnitte) in ein A4-Dokument gesetzt; Chromes PDF-Druck liefert Lesezeichen und eingebettete Schrift. Inhalte der Lernseiten
// (Lernkarten, Fragen, Folien) werden nicht übernommen, nur Titel, Aufbau und Bilder der Oberfläche.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEV = process.env.DEV_ROOT || "D:/Dev";
const { chromium } = createRequire(`file:///${DEV}/haze/`)("playwright-core");

// Dieselben Angaben wie LEARN in src/apps.js (id, Name, Untertitel, Farbton)
const SITES = [
  { id: "trainingswissenschaften", name: "Trainingswissenschaften", sub: "Klausur-Trainer · 16 Module, 779 Lernkarten, 584 Prüfungsfragen", hue: 205 },
  { id: "LitCultLingu", name: "LitCult & Linguistik", sub: "Study Coach · Literary and Cultural Studies, Linguistics", hue: 330 },
  { id: "Sportpsychologie", name: "Sportpsychologie", sub: "MAP-3-Trainer", hue: 160 },
  { id: "Ringvorlesung_Inklusion", name: "Inklusion im Sport", sub: "Klausur-Trainer zur Ringvorlesung", hue: 28 },
  { id: "tennis-plus-lernwebsite", name: "Tennis Plus", sub: "Prüfungsvorbereitung SoSe 2026", hue: 95 },
  { id: "Basketball", name: "Basketball-Lernguide", sub: "Prüfungsvorbereitung nach Kolb 2025", hue: 18 },
  { id: "Helfen-Sichern-Turnen-Uni-M-nster", name: "Helfen & Sichern", sub: "Videosammlung zum Turnseminar", hue: 260 },
];
const want = process.argv.slice(2);
const list = want.length ? SITES.filter((s) => want.includes(s.id)) : SITES;
mkdirSync(`${root}/assets/pdfs`, { recursive: true });

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const jpg = (buf) => `data:image/jpeg;base64,${buf.toString("base64")}`;

// Schwebende Teile (Player, Hinweis, Chat) stören das Bild: feste Elemente am unteren oder rechten Rand ausblenden
async function clean(page) {
  await page.addStyleTag({ content: "*{animation:none!important;transition:none!important}" });
  await page.evaluate(() => {
    for (const e of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(e);
      if (cs.position !== "fixed") continue;
      const r = e.getBoundingClientRect();
      if ((r.bottom > innerHeight - 60 && r.height < 220 && r.top > innerHeight * 0.5) || (r.right > innerWidth - 40 && r.left > innerWidth * 0.55 && r.top > innerHeight * 0.4 && r.width < 520)) e.style.visibility = "hidden";
    }
  });
}

async function scrape(browser, s) {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
  await page.goto(`https://nojomcdybo.github.io/${s.id}/`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(4000);
  await clean(page);
  const info = await page.evaluate(() => {
    const clip = (e) => e.textContent.replace(/\s+/g, " ").replace(/\u00ad/g, "").trim();
    const uniq = (a) => [...new Set(a)].filter(Boolean);
    const label = (e) => {
      const lines = (e.innerText || "").split("\n").map((l) => l.replace(/\u00ad/g, "").trim()).filter(Boolean);
      return lines.filter((l) => !/^\d+$/.test(l) || lines.length === 1).join(" ").replace(/^[^\p{L}\p{N}]+/u, "").trim();
    };
    return {
      title: document.title.replace(/\u00ad/g, ""),
      desc: (document.querySelector('meta[name="description"]')?.content?.replace(/ Vollständige Inhaltsübersicht.*$/, "") || "").replace(/,?s*Prof.?s*Dr.?[^:;,)]*/g, ""), // keine Personennamen
      nav: uniq([...document.querySelectorAll("nav a, nav button, [role=tab], .nav a, aside a, aside button")].map(label)).filter((t) => t.length > 1 && t.length < 60 && !/theme|suchen|termin|menü/i.test(t)).slice(0, 24),
      h2: uniq([...document.querySelectorAll("h2")].map(clip)).filter((t) => t.length > 2 && t.length < 80 && !/übersicht|tastaturk|quellen/i.test(t)).slice(0, 14),
      height: document.documentElement.scrollHeight,
    };
  });
  const shot = async (y) => { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(700); await clean(page); return page.screenshot({ type: "jpeg", quality: 74 }); };
  const hero = await page.screenshot({ type: "jpeg", quality: 78 });
  const h = info.height, step = Math.max(900, Math.min(h - 900, h * 0.33));
  const a = await shot(Math.round(step)), b = await shot(Math.round(Math.min(h - 900, step * 2)));
  await page.close();
  return { ...info, hero, a, b };
}

const html = (s, d) => {
  const acc = `hsl(${s.hue} 65% 46%)`, soft = `hsl(${s.hue} 60% 94%)`, deep = `hsl(${s.hue} 55% 22%)`;
  const items = (arr) => arr.map((t) => `<li>${esc(t)}</li>`).join("");
  return `<!doctype html><html lang="de"><meta charset="utf-8"><style>
    @page { size: A4; margin: 0 }
    * { box-sizing: border-box }
    body { margin: 0; font: 11pt/1.5 "Segoe UI", Arial, sans-serif; color: #1c1e26 }
    .page { width: 210mm; height: 297mm; position: relative; overflow: hidden; page-break-after: always; padding: 18mm }
    .cover { background: ${soft}; padding: 0 }
    .band { background: linear-gradient(135deg, ${acc}, ${deep}); color: #fff; padding: 26mm 18mm 16mm; height: 92mm }
    .band small { display: block; letter-spacing: .14em; text-transform: uppercase; font-size: 9pt; opacity: .8; margin-bottom: 6mm }
    .band .title { font-size: 36pt; line-height: 1.05; margin: 0 0 5mm; font-weight: 700; color: #fff; border: 0; padding: 0 } /* h2: so stehen Titel, Aufbau und Ausschnitte gleichrangig im Inhaltsverzeichnis */
    .band p { font-size: 13pt; margin: 0; opacity: .92; max-width: 150mm }
    .frame { margin: -14mm 18mm 0; border-radius: 4mm; overflow: hidden; box-shadow: 0 4mm 12mm rgba(0,0,0,.28); border: .3mm solid rgba(0,0,0,.15); background: #000 }
    .frame img { display: block; width: 100% }
    .facts { display: flex; gap: 6mm; margin: 12mm 18mm 0 }
    .facts div { flex: 1; background: #fff; border-radius: 3mm; padding: 5mm 6mm; border: .3mm solid hsl(${s.hue} 30% 84%) }
    .facts b { display: block; font-size: 24pt; line-height: 1.1; color: ${acc} }
    .facts span { font-size: 9.5pt; color: #555a68 }
    .cap { margin: 5mm 18mm 0; color: #555a68; font-size: 9.5pt }
    .foot { position: absolute; left: 18mm; right: 18mm; bottom: 12mm; display: flex; justify-content: space-between; font-size: 9pt; color: #6b7080; border-top: .3mm solid #d8dbe3; padding-top: 3mm }
    h2 { font-size: 20pt; margin: 0 0 4mm; color: ${deep}; border-bottom: .6mm solid ${acc}; padding-bottom: 2mm }
    h3 { font-size: 11pt; margin: 8mm 0 2mm; color: ${acc}; text-transform: uppercase; letter-spacing: .08em }
    ul { margin: 0; padding-left: 5mm; columns: 2; column-gap: 10mm }
    li { margin: 0 0 1.5mm; break-inside: avoid }
    .shots img { width: 100%; display: block; border-radius: 2.5mm; border: .3mm solid #cfd3dc; margin: 0 0 2mm }
    .shots p { margin: 0 0 8mm; color: #555a68; font-size: 9.5pt }
  </style>
  <section class="page cover">
    <div class="band"><small>Lernseite · Steckbrief</small><h2 class="title">${esc(s.name)}</h2><p>${esc(s.sub)}</p></div>
    <div class="frame"><img src="${jpg(d.hero)}"></div>
    <p class="cap">Startseite der Lernseite, aufgenommen am ${new Date().toLocaleDateString("de-DE")}.</p>
    <p class="cap" style="margin-top:10mm"><b>Auf einen Blick</b></p>
    <div class="facts" style="margin-top:3mm"><div><b>${d.nav.length || d.h2.length}</b><span>Bereiche</span></div><div><b>${d.h2.length}</b><span>Abschnitte auf der Startseite</span></div><div><b>Browser</b><span>ohne Anmeldung, Fortschritt lokal</span></div></div>
    <div class="foot"><span>nojomcdybo.github.io/${esc(s.id)}</span><span>Beispieldokument der Demo</span></div>
  </section>
  <section class="page">
    <h2>Aufbau</h2>
    <p>${esc(d.desc || `${s.name}: ${s.sub}.`)}</p>
    <h3>Bereiche</h3><ul>${items(d.nav.length ? d.nav : d.h2)}</ul>
    ${d.h2.length ? `<h3>Abschnitte auf der Startseite</h3><ul>${items(d.h2)}</ul>` : ""}
    <h3>So arbeitest du damit</h3>
    <p>Die Seite läuft im Browser, ohne Anmeldung. Der Lernfortschritt bleibt auf deinem Gerät. Alles ist für die Prüfungsvorbereitung gebaut: erst den Überblick lesen, dann üben, was noch nicht sitzt.</p>
    <div class="foot"><span>${esc(d.title)}</span><span>Seite 2</span></div>
  </section>
  <section class="page">
    <h2>Ausschnitte</h2>
    <div class="shots"><img src="${jpg(d.a)}"><p>Weiter unten auf der Seite.</p><img src="${jpg(d.b)}"><p>Noch weiter unten.</p></div>
    <div class="foot"><span>${esc(s.name)}</span><span>Seite 3</span></div>
  </section></html>`;
};

const browser = await chromium.launch({ channel: "chrome", headless: true });
const meta = existsSync(`${root}/shim/folio-docs.json`) ? JSON.parse(readFileSync(`${root}/shim/folio-docs.json`, "utf8")) : {};
for (const s of list) {
  console.log("==", s.id);
  const d = await scrape(browser, s);
  const page = await (await browser.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 340 / 794 })).newPage();
  await page.setContent(html(s, d), { waitUntil: "load" });
  await page.pdf({ path: `${root}/assets/pdfs/${s.id}.pdf`, preferCSSPageSize: true, printBackground: true, outline: true, tagged: true });
  const thumb = await page.screenshot({ type: "jpeg", quality: 82, clip: { x: 0, y: 0, width: 794, height: 1123 } });
  meta[s.id] = { id: s.id, name: s.name, pdf: `assets/pdfs/${s.id}.pdf`, pages: 3, thumb: jpg(thumb) };
  await page.close();
}
await browser.close();
// Vorschau-Liste für Folio (klassisches Skript, wird vor shim/app-folio.js geladen)
writeFileSync(`${root}/shim/folio-docs.json`, JSON.stringify(meta));
const ordered = SITES.map((s) => meta[s.id]).filter(Boolean);
writeFileSync(`${root}/shim/folio-docs.js`, `/* Erzeugt von tools/make-lern-pdfs.mjs: die Beispiel-PDFs (Steckbriefe der Lernseiten) mit Vorschaubild */\nwindow.__FOLIO_DOCS = ${JSON.stringify(ordered)};\n`);
console.log("fertig:", ordered.length, "PDFs");
