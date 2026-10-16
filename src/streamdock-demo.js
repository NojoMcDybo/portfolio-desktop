// Streamdock-Demo: Ein Klick auf einen Kanal in der Streamdock-Oberfläche öffnet hier Player und Chat als zwei freie Fenster.
// Das Andocken ist die Logik der echten App (Rust, src-tauri): näher als 20 px an eine Playerkante loslassen → rastet ein,
// angedockt folgt der Chat dem Player (Lage und Quermaß), mehr als 30 px wegziehen → löst sich, ein Fenster schließen
// schließt das andere mit. Der „Stream“ ist ein erzeugtes Bild, kein Video.
import { I } from "./icons.js";

const SNAP = 20, BREAK = 30, CHAT_W = 340;
const esc = (v) => String(v).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const NAMES = ["lumi", "kaito_77", "fuchsbau", "NullEins", "mira.k", "TobiB", "sunnyside", "pixelhans", "ElsaF", "d4rkm0de", "Rosi", "quokka"];
const LINES = ["das war sauber 👏", "wie lange läuft der Stream schon?", "GG", "hallo aus Münster!", "kann man das nachbauen?", "lag?", "👀", "nächste Runde bitte", "mega Spielzug", "Chat ist heute ruhig", "wo gibt's die Einstellungen?", "KEKW", "ich bin wegen des Titels hier", "Klasse Bildqualität"];

export function initStreamdock(wm) {
  let docked = null;
  let timer = 0;

  wm.on("bus", (name, data) => { if (name === "streamdock:start") start(data); });

  function stop() { clearInterval(timer); docked = null; }

  function start(s) {
    const existing = wm.get("sd-player");
    if (existing) { // Stream wechseln: Fenster bleiben, Inhalt wechselt
      existing.title = s.name;
      paintPlayer(existing.body.querySelector(".sd-stage"), s);
      wm.get("sd-chat")?.body.querySelector("[data-ch]")?.replaceChildren(document.createTextNode(s.name));
      wm.focus(existing);
      return;
    }
    const player = wm.open({
      key: "sd-player", title: s.name, mode: "app", pad: 0, size: [820, 470], min: [420, 260], bg: "#000",
      build: (b, w) => buildPlayer(b, w, s),
      onClose: () => { const c = wm.get("sd-chat"); stop(); if (c) wm.close(c); },
    });
    const a = wm.area();
    // links neben die Mitte, damit rechts Platz für den Chat bleibt
    wm.setRect(player, { x: Math.max(12, Math.round((a.w - player.w - CHAT_W) / 2)), y: Math.round(a.y + 24), w: player.w, h: player.h });
    const chat = wm.open({
      key: "sd-chat", title: "Chat · " + s.name, mode: "app", pad: 0, size: [CHAT_W, player.h], min: [260, 240], bg: "#18181b",
      build: (b, w) => buildChat(b, w, s),
      onClose: () => { const p = wm.get("sd-player"); stop(); if (p) wm.close(p); },
    });
    docked = "right";
    place(player, chat);
    wm.focus(player);
  }

  // ---------- Andocken ----------
  const P = () => wm.get("sd-player");
  const C = () => wm.get("sd-chat");

  function place(p, c) {
    switch (docked) {
      case "right": wm.setRect(c, { x: p.x + p.w, y: p.y, h: p.h }); break;
      case "left": wm.setRect(c, { x: p.x - c.w, y: p.y, h: p.h }); break;
      case "bottom": wm.setRect(c, { x: p.x, y: p.y + p.h, w: p.w }); break;
      case "top": wm.setRect(c, { x: p.x, y: p.y - c.h, w: p.w }); break;
    }
  }
  const overlapY = (p, c) => c.y < p.y + p.h && c.y + c.h > p.y;
  const overlapX = (p, c) => c.x < p.x + p.w && c.x + c.w > p.x;
  const gaps = (p, c) => ({
    right: overlapY(p, c) ? Math.abs(c.x - (p.x + p.w)) : 1e9,
    left: overlapY(p, c) ? Math.abs(c.x + c.w - p.x) : 1e9,
    bottom: overlapX(p, c) ? Math.abs(c.y - (p.y + p.h)) : 1e9,
    top: overlapX(p, c) ? Math.abs(c.y + c.h - p.y) : 1e9,
  });

  let guard = false;
  wm.on("move", (w) => {
    if (guard) return;
    const p = P(), c = C();
    if (!p || !c) return;
    guard = true;
    if (w === p) { if (docked) place(p, c); }
    else if (w === c && docked) {
      const g = gaps(p, c)[docked];
      if (g > BREAK) { docked = null; c.el.classList.remove("sd-docked"); }
      else place(p, c); // innerhalb der Haftstrecke bleibt er kleben
    }
    guard = false;
  });
  wm.on("moveend", (w) => {
    const p = P(), c = C();
    if (!p || !c || w !== c || docked) return;
    const g = gaps(p, c);
    const side = Object.keys(g).reduce((a, k) => (g[k] < g[a] ? k : a));
    if (g[side] <= SNAP) { docked = side; guard = true; place(p, c); guard = false; c.el.classList.add("sd-docked"); }
  });

  // ---------- Player ----------
  function buildPlayer(b, w, s) {
    b.style.background = "#000";
    b.innerHTML = `
      <div class="sd-stage"></div>
      <div class="sd-pill" data-drag>
        <div class="sd-pill-in n-glass n-liquid panel">
          <button data-a="back" title="Zurück zur Auswahl" aria-label="Zurück zur Auswahl"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m14 6-6 6 6 6"/></svg></button>
          <span class="sd-t" data-drag>Streamdock · <b data-ch>${esc(s.name)}</b></span>
          <button data-a="pin" title="Immer im Vordergrund" aria-label="Immer im Vordergrund"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m15 4 5 5-3 1-3.5 3.5.5 4-1.5 1.5-3.5-3.5L5 20l-1-1 4.5-4.5L5 11l1.5-1.5 4 .5L14 6.5z"/></svg></button>
          <button data-a="full" title="Vollbild" aria-label="Vollbild">${I.max}</button>
          <button data-a="min" title="Minimieren" aria-label="Minimieren">${I.min}</button>
          <button data-a="x" title="Schließen" aria-label="Schließen">${I.close}</button>
        </div>
      </div>
      <div class="sd-ad">Werbung · stumm</div>
      <style>
        .sd-stage{position:absolute;inset:0;overflow:hidden;background:#07070a}
        .sd-stage i{position:absolute;border-radius:50%;filter:blur(46px);opacity:.75;will-change:transform}
        .sd-stage .sd-live{position:absolute;left:18px;bottom:16px;display:flex;gap:10px;align-items:center;padding:8px 14px;border-radius:12px;background:rgba(0,0,0,.45);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);color:#fff}
        .sd-stage .sd-live em{font:700 11px var(--n-font);font-style:normal;background:#e91916;border-radius:5px;padding:2px 6px;letter-spacing:.05em}
        .sd-stage .sd-live div{font:600 13px var(--n-font);line-height:1.25}.sd-stage .sd-live small{display:block;font-weight:400;opacity:.7;font-size:11.5px}
        .sd-stage .sd-big{position:absolute;inset:0;display:grid;place-items:center;font:800 clamp(40px,12vw,150px)/1 var(--n-font-display);letter-spacing:-.04em;color:rgba(255,255,255,.1);text-transform:uppercase;white-space:nowrap}
        .sd-stage .sd-note{position:absolute;right:16px;bottom:14px;color:rgba(255,255,255,.4);font-size:11px}
        .sd-pill{position:absolute;left:0;right:0;top:0;height:60px;display:flex;justify-content:center;padding-top:8px;z-index:4}
        .sd-pill-in{display:flex;align-items:center;gap:2px;padding:4px 6px;border-radius:99px;transform:translateY(-120%);transition:transform .45s var(--spring);height:40px}
        .win:hover .sd-pill-in,.sd-pill:focus-within .sd-pill-in{transform:none}
        .sd-pill-in button{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;color:var(--n-ink);transition:background .2s}
        .sd-pill-in button:hover{background:rgba(255,255,255,.14)}
        .sd-pill-in button.on{background:rgba(145,70,255,.55)}
        .sd-pill-in svg{width:16px;height:16px}
        .sd-t{padding:0 10px;font-size:12px;color:var(--n-dim);white-space:nowrap}.sd-t b{color:var(--n-ink);font-weight:600}
        .sd-ad{position:absolute;left:50%;top:70px;transform:translate(-50%,-10px);padding:6px 14px;border-radius:99px;background:rgba(0,0,0,.6);color:#fff;font-size:12px;opacity:0;transition:opacity .3s,transform .4s var(--spring);z-index:3;pointer-events:none}
        .sd-ad.on{opacity:1;transform:translate(-50%,0)}
      </style>`;
    paintPlayer(b.querySelector(".sd-stage"), s);
    const ad = b.querySelector(".sd-ad");
    // Werbung wird erkannt und stumm geschaltet – hier alle 40 s kurz gezeigt
    const adT = setInterval(() => { ad.classList.add("on"); setTimeout(() => ad.classList.remove("on"), 3200); }, 40000);
    w.spec.cleanup = () => clearInterval(adT);
    const pin = b.querySelector('[data-a="pin"]');
    b.querySelector(".sd-pill-in").addEventListener("click", (e) => {
      const a = e.target.closest("[data-a]")?.dataset.a;
      if (a === "x") wm.close(w);
      if (a === "min") { wm.minimize(w); const c = C(); c && wm.minimize(c); }
      if (a === "full") wm.toggleMax(w);
      if (a === "pin") { pin.classList.toggle("on"); w.el.style.zIndex = pin.classList.contains("on") ? 800 : ""; }
      if (a === "back") { wm.close(w); wm.get("streamdock") && wm.focus(wm.get("streamdock")); }
    });
  }
  function paintPlayer(stage, s) {
    const hues = s.hues || [265, 205];
    stage.innerHTML = `
      <i style="width:60%;height:70%;left:-8%;top:-14%;background:hsl(${hues[0]} 80% 50%);animation:sd1 14s ease-in-out infinite alternate"></i>
      <i style="width:55%;height:60%;right:-8%;bottom:-18%;background:hsl(${hues[1]} 80% 48%);animation:sd2 17s ease-in-out infinite alternate"></i>
      <i style="width:35%;height:40%;left:36%;top:30%;background:hsl(${(hues[0] + 120) % 360} 70% 45%);opacity:.45;animation:sd1 11s ease-in-out infinite alternate-reverse"></i>
      <div class="sd-big">${esc(s.name)}</div>
      <div class="sd-live"><em>LIVE</em><div>${esc(s.title || s.game)}<small>${esc(s.name)} · ${Number(s.viewers).toLocaleString("de")} Zuschauer · Demo-Bild, kein echtes Video</small></div></div>
      <style>@keyframes sd1{to{transform:translate3d(18%,12%,0) scale(1.15)}}@keyframes sd2{to{transform:translate3d(-16%,-14%,0) scale(.9)}}</style>`;
  }

  // ---------- Chat ----------
  function buildChat(b, w, s) {
    b.style.background = "#18181b";
    b.innerHTML = `
      <div class="sd-ch-top" data-drag><b>Stream-Chat</b><span data-ch>${esc(s.name)}</span><div class="sd-ch-x"><button data-a="x" aria-label="Schließen">${I.close}</button></div></div>
      <div class="sd-msgs" data-msgs></div>
      <form class="sd-in" autocomplete="off"><input placeholder="Nachricht senden" aria-label="Nachricht senden" maxlength="200"><button type="submit">Chatten</button></form>
      <style>
        .sd-ch-top{position:absolute;left:0;right:0;top:0;height:40px;display:flex;align-items:center;gap:8px;padding:0 6px 0 14px;background:#1f1f23;box-shadow:inset 0 -1px 0 rgba(255,255,255,.07);cursor:grab;z-index:2}
        .sd-ch-top b{font-size:12.5px;font-weight:650}.sd-ch-top span{flex:1;color:var(--n-faint);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .sd-ch-x button{width:28px;height:28px;border-radius:8px;display:grid;place-items:center;color:var(--n-dim)}.sd-ch-x button:hover{background:#e5484d;color:#fff}.sd-ch-x svg{width:14px;height:14px}
        .sd-msgs{position:absolute;inset:40px 0 56px 0;overflow:auto;padding:8px 12px;display:flex;flex-direction:column;gap:5px;font-size:13px;line-height:1.4;user-select:text}
        .sd-msgs p{margin:0;word-break:break-word}.sd-msgs p b{font-weight:650;margin-right:6px}
        .sd-in{position:absolute;left:0;right:0;bottom:0;height:56px;display:flex;gap:8px;align-items:center;padding:0 10px;background:#18181b}
        .sd-in input{flex:1;min-width:0;height:36px;border-radius:9px;border:0;padding:0 12px;background:#2a2a2e;color:var(--n-ink);font:inherit;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
        .sd-in input:focus{outline:2px solid #9146ff;outline-offset:0}
        .sd-in button{height:36px;padding:0 14px;border-radius:9px;background:#9146ff;color:#fff;font-weight:650}.sd-in button:hover{background:#a25bff}
        .win.sd-docked{box-shadow:0 0 0 1px rgba(145,70,255,.45),0 30px 80px rgba(0,0,0,.55)}
      </style>`;
    const list = b.querySelector("[data-msgs]");
    const add = (name, text, color) => {
      const p = document.createElement("p");
      const nb = document.createElement("b"); nb.textContent = name; nb.style.color = color;
      p.append(nb, document.createTextNode(text));
      list.append(p);
      while (list.childElementCount > 80) list.firstChild.remove();
      list.scrollTop = list.scrollHeight;
    };
    const col = (n) => `hsl(${[...n].reduce((a, c) => a + c.charCodeAt(0), 0) * 47 % 360} 75% 66%)`;
    for (let i = 0; i < 8; i++) { const n = NAMES[(i * 5) % NAMES.length]; add(n, LINES[(i * 3) % LINES.length], col(n)); }
    timer = setInterval(() => { if (document.hidden) return; const n = NAMES[Math.floor(Math.random() * NAMES.length)]; add(n, LINES[Math.floor(Math.random() * LINES.length)], col(n)); }, 2300);
    b.querySelector(".sd-in").addEventListener("submit", (e) => {
      e.preventDefault();
      const inp = e.target.querySelector("input");
      const t = inp.value.trim();
      if (!t) return;
      add("du", t, "#9146ff");
      inp.value = "";
    });
    b.querySelector('[data-a="x"]').addEventListener("click", () => wm.close(w));
  }
}
