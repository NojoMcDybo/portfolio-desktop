// Baut die Oberflächen der Programme aus den Quell-Repos (D:\Dev\<name>) nach apps/<id>/ und setzt die Tauri-Attrappe davor.
// Aufruf:  node tools/build-apps.mjs [streamdock arena …]   (ohne Argument: alle)
// Die Quell-Repos bleiben unverändert; gebaut wird mit ihrem eigenen vite und --outDir hierher.
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEV = process.env.DEV_ROOT || "D:/Dev";

// Vantage steht nicht hier: sein Quellcode ist privat, apps/vantage ist ein von Hand geschriebener Nachbau.
// html: Seite im Repo; shim: braucht die Tauri-Attrappe; extra: weitere Skripte vor dem Programm
const APPS = {
  streamdock: { src: "streamdock", shim: true },
  arena: { src: "arena", shim: true, extra: ["soccer-world"] }, // soccer-world: gemeinsame Spielwelt mit der Notch
  kursbuch: { src: "kursbuch", shim: true },
  folio: { src: "folio", shim: true, extra: ["folio-docs"] }, // PDF.js und die Glas-Oberfläche; die Beispiel-PDFs sind die Lernseiten-Steckbriefe (tools/make-lern-pdfs.mjs)
  // Notch: echte Oberfläche (Notch selbst = index.html, Einstellungen = settings.html); die schwere Wake-Word-Laufzeit entfällt
  notch: { src: "notch", shim: true, pages: ["index.html", "settings.html"], prune: /ort-wasm|\.onnx$/, dropDirs: ["wakeword"] },
  haze: { src: "haze", shim: false },
};

const want = process.argv.slice(2);
const list = want.length ? want : Object.keys(APPS);

for (const id of list) {
  const a = APPS[id];
  if (!a) { console.error("unbekannt:", id); process.exitCode = 1; continue; }
  const src = `${DEV}/${a.src}`;
  const out = `${root.replace(/\\/g, "/")}/apps/${id}`;
  console.log(`\n== ${id}: vite build  ${src} -> ${out}`);
  const r = spawnSync("npx", ["--no-install", "vite", "build", "--base", "./", "--outDir", out, "--emptyOutDir", "--logLevel", "warn"], { cwd: src, stdio: "inherit", shell: true });
  if (r.status !== 0) { console.error(`${id}: Build fehlgeschlagen`); process.exitCode = 1; continue; }
  for (const d of a.dropDirs ?? []) rmSync(`${out}/${d}`, { recursive: true, force: true });
  if (a.prune) for (const f of readdirSync(`${out}/assets`)) if (a.prune.test(f)) { rmSync(`${out}/assets/${f}`); console.log("  entfernt:", f); }
  if (a.shim) {
    const extra = (a.extra ?? []).map((x) => `<script src="../../shim/${x}.js"></script>\n    `).join("");
    const tags = `<script src="../../shim/tauri-shim.js"></script>\n    ${extra}<script src="../../shim/app-${id}.js"></script>\n    `;
    if (!existsSync(`${root}/shim/app-${id}.js`)) console.warn(`  (Hinweis: shim/app-${id}.js fehlt noch)`);
    for (const page of a.pages ?? ["index.html"]) {
      const html = `${out}/${page}`;
      writeFileSync(html, readFileSync(html, "utf8").replace(/<head>/i, `<head>\n    ${tags}`));
    }
  }
}
