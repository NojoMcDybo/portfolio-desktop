/* Folio: Beispiel-Antworten für die App-Befehle (folio/src-tauri/src/lib.rs, notch.rs) und die Plugins Dialog, Opener, Updater, Webview.
   Die Beispiel-PDFs sind die Steckbriefe der Lernseiten (assets/pdfs, erzeugt von tools/make-lern-pdfs.mjs, Liste in shim/folio-docs.js);
   eigene PDFs lassen sich wählen oder auf das Fenster ziehen und bleiben im Browser. Weitere Fenster (ein Dokument je Fenster) öffnet der
   Desktop. Die geöffnete Seite läuft in die Notch. */
(() => {
  const P = window.__PORTFOLIO__;
  P.version = "0.8.4";
  P.name = "Folio";

  const top = (() => { try { return window.top.document && window.top; } catch { return window; } })();
  const store = (top.__folioFiles ||= new Map()); // Pfad -> Bytes, von allen Folio-Fenstern geteilt
  const toast = (text) => P.bus("toast", { text });

  // ---------- Beispieldokumente: die Steckbriefe der Lernseiten ----------
  const DOCS = (window.__FOLIO_DOCS || []).map((d) => ({ ...d, path: "Lernseiten\\" + d.name + ".pdf" }));
  const bytesOf = async (path) => {
    let b = store.get(path);
    if (b) return b;
    const d = DOCS.find((x) => x.path === path);
    if (!d) return null;
    const r = await fetch(new URL("../../" + d.pdf, location.href)); // apps/folio/ -> Wurzel der Seite
    if (!r.ok) throw new Error("PDF nicht erreichbar: " + d.pdf);
    store.set(path, (b = new Uint8Array(await r.arrayBuffer())));
    return b;
  };

  // Bibliothek beim ersten Besuch füllen (und die Beispiele einer früheren Fassung ersetzen); entfernte Einträge bleiben entfernt
  try {
    if (localStorage.getItem("folio.demo") !== "2") {
      const old = JSON.parse(localStorage.getItem("folio.recents") || "[]").filter((r) => !String(r.path).startsWith("Beispiele\\"));
      const have = new Set(old.map((r) => r.path));
      const seed = DOCS.filter((d) => !have.has(d.path)).map((d, i) => ({ path: d.path, name: d.name + ".pdf", thumb: d.thumb, page: 1, pages: d.pages, at: Date.now() - (i + 1) * 36e5 }));
      localStorage.setItem("folio.recents", JSON.stringify([...old, ...seed].slice(0, 23)));
      localStorage.setItem("folio.demo", "2");
    }
  } catch { /* ohne Speicher startet die Bibliothek leer */ }

  // ---------- eigene PDFs ----------
  const register = async (file) => {
    const path = "Eigene\\" + file.name;
    store.set(path, new Uint8Array(await file.arrayBuffer()));
    return path;
  };
  const isPdf = (f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf";

  // Auswahl statt Windows-Dialog: die Steckbriefe oder eine PDF vom Rechner
  function chooser() {
    return new Promise((resolve) => {
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:fixed;inset:0;z-index:99;display:grid;place-items:center;background:rgba(8,10,14,.6);backdrop-filter:blur(8px);font:14px system-ui,Segoe UI,sans-serif;color:#eef0f5";
      const box = document.createElement("div");
      box.style.cssText = "width:min(440px,88vw);max-height:86vh;overflow:auto;padding:20px;border-radius:18px;background:rgba(30,32,40,.92);border:1px solid rgba(255,255,255,.14);box-shadow:0 20px 60px rgba(0,0,0,.5)";
      box.innerHTML = '<h2 style="margin:0 0 4px;font-size:18px">PDF öffnen</h2><p style="margin:0 0 14px;color:#a9aebb;font-size:12.5px">Einen Steckbrief meiner Lernseiten wählen oder eine PDF von deinem Rechner. Sie bleibt im Browser und wird nirgends hochgeladen.</p>';
      const done = (v) => { wrap.remove(); resolve(v); };
      const btn = (label, fn, sub = "") => {
        const b = document.createElement("button");
        b.type = "button";
        b.style.cssText = "display:block;width:100%;text-align:left;margin:6px 0;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:inherit;font:inherit;cursor:pointer";
        const t = document.createElement("b"); t.style.fontWeight = "600"; t.textContent = label; b.append(t);
        if (sub) { const s = document.createElement("span"); s.style.cssText = "display:block;color:#a9aebb;font-size:12px"; s.textContent = sub; b.append(s); }
        b.addEventListener("click", fn);
        box.append(b);
      };
      DOCS.forEach((d) => btn(d.name, () => done(d.path), `${d.pages} Seiten · Steckbrief der Lernseite`));
      const file = document.createElement("input");
      file.type = "file"; file.accept = "application/pdf,.pdf"; file.hidden = true;
      file.addEventListener("change", async () => { const f = file.files[0]; done(f && isPdf(f) ? await register(f) : null); });
      box.append(file);
      btn("PDF vom Rechner wählen …", () => file.click(), "bleibt lokal im Browser");
      wrap.addEventListener("pointerdown", (e) => { if (e.target === wrap) done(null); });
      addEventListener("keydown", function esc(e) { if (e.key === "Escape") { removeEventListener("keydown", esc); if (wrap.isConnected) done(null); } });
      wrap.append(box);
      document.body.append(wrap);
    });
  }

  // Der erste Klick in ein noch nicht fokussiertes Fenster löst im Browser „focus“ aus; Folio baut die Bibliothek dann neu auf und der
  // Klick ginge verloren (in der echten App hat das Fenster den Fokus schon). Während des Drückens wird dieses Ereignis zurückgehalten.
  let pressed = false;
  const release = () => setTimeout(() => { pressed = false; }, 80);
  addEventListener("pointerdown", () => { pressed = true; }, true);
  addEventListener("pointerup", release, true);
  addEventListener("pointercancel", release, true);
  addEventListener("focus", (e) => { if (pressed) e.stopImmediatePropagation(); }, true);

  // Dateien auf das Fenster ziehen: wie das Ziehen-Ereignis der echten App
  let over = false;
  const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes("Files");
  addEventListener("dragover", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    const position = { x: e.clientX, y: e.clientY };
    if (!over) { over = true; P.emit("tauri://drag-enter", { paths: [], position }); }
    P.emit("tauri://drag-over", { position });
  });
  addEventListener("dragleave", (e) => { if (over && e.relatedTarget === null) { over = false; P.emit("tauri://drag-leave", null); } });
  addEventListener("drop", async (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    over = false;
    const paths = [];
    for (const f of [...e.dataTransfer.files].filter(isPdf)) paths.push(await register(f));
    P.emit("tauri://drag-drop", { paths, position: { x: e.clientX, y: e.clientY } });
  });

  // ---------- Befehle ----------
  let warned = false;
  P.handlers = {
    read_pdf: async ({ path }) => {
      const b = await bytesOf(path);
      if (!b) throw new Error("Datei nicht gefunden: " + path);
      return b.slice().buffer;
    },
    save_pdf: (bytes, options) => {
      const hex = options?.headers?.["x-path"] ?? "";
      const path = new TextDecoder().decode(Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16)));
      store.set(path, new Uint8Array(bytes));
      if (!warned) { warned = true; toast("Gesichert – in dieser Demo bleibt die Datei im Speicher des Browsers."); }
      return null;
    },
    recycle_pdf: ({ path }) => { store.delete(path); return null; },
    startup_file: () => null,
    // Notch: das offene Dokument steht dort mit Seite; Folios Eintrag verschwindet beim Schließen des Fensters
    notch_send: ({ method, path, body }) => {
      const be = top.__notchBackend;
      if (!be) return null;
      if (method === "POST" && path === "/activity") be.activity(JSON.parse(body));
      else if (method === "DELETE" && path.startsWith("/activity/")) be.removeActivity(decodeURIComponent(path.slice(10)));
      return null;
    },
    notch_events: () => null,
    "plugin:dialog|open": () => chooser(),
    "plugin:opener|reveal_item_in_dir": () => { toast("Der Explorer öffnet sich nur in der installierten App."); return null; },
    "plugin:updater|check": () => null,
    // Weitere Fenster öffnet der Desktop; denselben Schlüssel gibt es nur einmal, ein zweiter Aufruf holt das Fenster nach vorn
    "plugin:webview|get_all_webviews": () => [],
    "plugin:webview|create_webview_window": ({ options: o = {} }) => {
      P.bus("window:open", { key: o.label, title: o.title || "Folio", src: o.url, size: [Math.min(o.width || 1000, 1100), Math.min(o.height || 760, 800)] });
      return null;
    },
  };
})();
