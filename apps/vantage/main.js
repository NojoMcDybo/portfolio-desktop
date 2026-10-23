// Vantage (Nachbau für den Browser): Pro, Ich, Studio und das Seitenblatt mit den Einstellungen. Der Quellcode der echten App ist privat;
// das hier ist eine eigene Umsetzung derselben Oberfläche mit erfundenen Teams, Spielern und Konten (Champions und Items: Data Dragon).
import { glassLight, ICONS, lightScroller, liquid, segments, windowControls } from "./nojo-ui.js";
import { startBackground } from "./bg.js";
import { applySettings, DEFAULT_LEAGUES, initPro, leagueList, proSettings, showPro } from "./pro.js";
import { showMe } from "./me.js";
import { showStudio } from "./studio.js";
import { card, closeSheet, el, load, openSheet, q, save } from "./ui.js";

const win = (c) => window.__TAURI_INTERNALS__?.invoke(`plugin:window|${c}`, { label: "main" });
const VIEWS = ["pro", "me", "studio"];
let view = "pro";

function setView(v) {
  view = v;
  document.querySelectorAll(".view").forEach((s) => (s.hidden = s.dataset.view !== v));
  document.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("active", b.dataset.view === v));
  q("main").scrollTop = 0;
  if (v === "me") showMe();
  if (v === "studio") showStudio();
  if (v === "pro") showPro();
}

// ---------- Einstellungen ----------
const REGION = { INTERNATIONAL: "International", EMEA: "Europa", EUROPE: "Europa", KOREA: "Korea", CHINA: "China", "NORTH AMERICA": "Nordamerika", AMERICAS: "Amerika" };
let prefs = load("prefs", { tray: true, autostart: false, notify: true, notch: true, cs_goal: 7 });

function openSettings() {
  const s = proSettings();
  const out = [];
  const sw = (label, hint, checked, on) => {
    const row = el("label", "set-row"), box = el("input", "sr");
    box.type = "checkbox"; box.setAttribute("role", "switch"); box.checked = checked; box.onchange = () => on(box.checked);
    const txt = el("span", "set-txt"); txt.append(el("b", "", label), el("span", "faint", hint));
    row.append(txt, box, el("span", "n-switch"));
    return row;
  };
  const upd = el("div", "set-row upd-row"), ut = el("span", "set-txt");
  ut.append(el("b", "", "Vantage 0.5.10"), el("span", "faint", "Aktuell. (Demo: die echte App sucht beim Start und alle 6 Stunden nach Updates.)"));
  const ub = el("button", "n-btn", "Nach Updates suchen");
  ub.onclick = () => { ub.textContent = "Aktuell."; ub.disabled = true; };
  upd.append(ut, ub);
  const setPref = (k) => (v) => { prefs = { ...prefs, [k]: v }; save("prefs", prefs); };
  const app = card("App", "", "set-card");
  const goal = el("label", "set-row"), gt = el("span", "set-txt"), gi = el("input", "n-input set-num");
  gt.append(el("b", "", "CS-Ziel im Spiel"), el("span", "faint", "CS pro Minute – die Notch zeigt live, ob du im Plan liegst, und die Meilensteine alle 5 Minuten. 0 = aus, nicht als Support."));
  gi.type = "number"; gi.min = "0"; gi.max = "12"; gi.step = "0.5"; gi.value = String(prefs.cs_goal);
  gi.onchange = () => setPref("cs_goal")(Math.max(0, Math.min(12, parseFloat(gi.value) || 0)));
  goal.append(gt, gi);
  app.append(upd,
    sw("Im Infobereich weiterlaufen", "Schließen legt Vantage unten rechts ab – Aufnahme und Benachrichtigungen bleiben an.", prefs.tray, setPref("tray")),
    sw("Mit Windows starten", "Unsichtbar im Infobereich, damit die Aufnahme bei jedem Spiel bereit ist.", prefs.autostart, setPref("autostart")),
    sw("Benachrichtigungen", "Gefolgte Teams: 15 Minuten vorher, beim Start und am Ende.", prefs.notify, setPref("notify")),
    sw("Notch", "Eigenes Spiel, Clips, Rendern und gefolgte Teams in der Notch (wenn sie läuft).", prefs.notch, setPref("notch")),
    goal);
  out.push(app);

  const res = card("Ergebnisse", "", "set-card");
  res.append(sw("Ergebnisse zeigen", "Aus = spoiler-frei: Stände bleiben verborgen, bis du eine Serie aufdeckst.", s.results, (v) => commit({ ...proSettings(), results: v })));
  out.push(res);

  if (s.follow.length) {
    const fl = card("Gefolgte Teams", "Benachrichtigung und Notch", "set-card"), chips = el("div", "chips");
    for (const name of s.follow) {
      const b = el("button", "chip on"); b.append(el("span", "", `${name} ×`)); b.title = "Nicht mehr folgen";
      b.onclick = () => { commit({ ...proSettings(), follow: proSettings().follow.filter((x) => x !== name) }); openSettings(); };
      chips.append(b);
    }
    fl.append(chips);
    out.push(fl);
  }

  const lg = card("Ligen", "für Live und Spielplan", "set-card");
  const groups = new Map();
  for (const l of leagueList()) {
    const g = REGION[l.region.toUpperCase()] ?? (l.region || "Weitere");
    if (!groups.has(g)) { const box = el("div", "set-group"); box.append(el("span", "n-eyebrow", g), el("div", "chips")); groups.set(g, box); }
    const b = el("button", `chip${s.leagues.includes(l.slug) ? " on" : ""}`);
    b.append(el("span", "", l.name));
    b.onclick = () => { const cur = proSettings().leagues; const next = cur.includes(l.slug) ? cur.filter((x) => x !== l.slug) : [...cur, l.slug]; b.classList.toggle("on", next.includes(l.slug)); commit({ ...proSettings(), leagues: next }); };
    q(".chips", groups.get(g)).append(b);
  }
  lg.append(...groups.values());
  const reset = el("button", "n-btn", "Standard");
  reset.onclick = () => { commit({ ...proSettings(), leagues: DEFAULT_LEAGUES }); openSettings(); };
  lg.append(reset);
  out.push(lg);

  const about = card("Quellen", "", "set-card");
  about.append(el("p", "faint fine", "In dieser Demo sind Ligen, Teams, Wappen, Spieler, Konten und Ergebnisse erfunden. Die echte App zeigt Profispiele (Esports-API und Live-Stats von lolesports.com, inoffiziell) und deine Profile über die Riot-API mit deinem eigenen Schlüssel. Champions und Items kommen aus Data Dragon. Vantage isn't endorsed by Riot Games and doesn't reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties."));
  out.push(about);
  openSheet("Einstellungen", out);
}

function commit(next) { save("pro", next); applySettings(next); }

// ---------- Start ----------
function main() {
  startBackground();
  windowControls({ minimize: () => win("minimize"), toggleMaximize: () => win("toggle_maximize"), close: () => win("close") });
  q(".gear").innerHTML = ICONS.settings;
  q(".sheet-x").innerHTML = ICONS.close;
  glassLight();
  liquid();
  segments(document, ".n-seg");
  lightScroller(q("main"), { insetTop: 74 });
  document.querySelectorAll(".tabs button").forEach((b) => (b.onclick = () => setView(b.dataset.view)));
  q(".gear").onclick = openSettings;
  q(".sheet-x").onclick = closeSheet;
  q(".backdrop").onclick = (e) => { if (e.target === e.currentTarget) closeSheet(); };
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSheet();
    if (e.ctrlKey && ["1", "2", "3"].includes(e.key)) setView(VIEWS[Number(e.key) - 1]);
  });
  initPro(commit);
  setView(view);
}

main();
