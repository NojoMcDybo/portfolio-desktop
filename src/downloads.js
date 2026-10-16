// Version, Größe und Link des aktuellen Installers von der GitHub-Release-API. Ohne Netz oder bei Rate-Limit greifen die
// Angaben aus apps.js (fallback). Ergebnis wird eine Stunde in sessionStorage gehalten.
import { OWNER } from "./apps.js";

const TTL = 3600_000;
const memo = new Map();

export function release(app) {
  if (memo.has(app.repo)) return memo.get(app.repo);
  const p = load(app);
  memo.set(app.repo, p);
  return p;
}

async function load(app) {
  const key = `rel:${app.repo}`;
  try {
    const c = JSON.parse(sessionStorage.getItem(key) || "null");
    if (c && Date.now() - c.at < TTL) return c.v;
  } catch {}
  try {
    const r = await fetch(`https://api.github.com/repos/${OWNER}/${app.repo}/releases/latest`, { headers: { Accept: "application/vnd.github+json" } });
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    // der Installer: eine .exe mit „setup“ im Namen (keine .blockmap, keine latest.json)
    const a = (j.assets || []).find((x) => /setup.*\.exe$/i.test(x.name));
    if (!a) throw new Error("kein Installer im Release");
    const v = { version: String(j.tag_name).replace(/^v/, ""), mb: a.size / 1e6, url: a.browser_download_url, page: j.html_url, date: j.published_at, live: true };
    try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), v })); } catch {}
    return v;
  } catch {
    const f = app.fallback;
    return { version: f.version, mb: f.mb, url: f.url, page: f.url, live: false };
  }
}

export const fmtMb = (mb) => `${mb >= 100 ? Math.round(mb) : mb.toFixed(1).replace(".", ",")} MB`;
