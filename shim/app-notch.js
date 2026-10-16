/* Notch (echte Oberfläche aus dem Notch-Repo): Die Befehle der Rust-Seite beantwortet der Desktop (src/notch-backend.js, window.__notchBackend im
   Hauptfenster), die Ereignisse kommen von dort. Notch selbst (index.html) und Einstellungsfenster (settings.html) teilen sich dieses Backend. */
(() => {
  const P = window.__PORTFOLIO__;
  P.version = "0.2.23";
  P.name = "Notch";
  const top = window.top;
  const be = () => top.__notchBackend;
  const overlay = !/settings\.html/.test(location.pathname);

  // jeder Befehl geht an das Backend (unbekannte meldet es in der Konsole)
  P.handlers = new Proxy({}, { get: (_, cmd) => (args) => be().invoke(String(cmd), args) });

  const names = ["media", "media-cover", "activities", "sport", "sport-news", "sport-plays", "shelf", "level", "settings", "dock", "dock-preview", "activity-alert", "hover"];
  for (const n of names) be().on(n, (p) => P.emit(n, p));
  // Dateien von außen: Tauri meldet sie als tauri://drag-* (der Desktop leitet die Browser-Ereignisse weiter)
  be().on("drag", (d) => P.emit(`tauri://drag-${d.phase}`, { paths: d.paths ?? [], position: { x: d.x ?? 0, y: d.y ?? 0 } }));

  if (overlay) {
    // Rust prüft per Mausabfrage, ob der Zeiger über der Form liegt; hier gibt der Desktop die Bewegungen innerhalb des Fensters weiter
    const host = () => top.__notchHost;
    addEventListener("pointermove", (e) => host()?.pointer(e.clientX, e.clientY, e.pointerType), true);
    addEventListener("pointerdown", (e) => host()?.pointerDown(e.clientX, e.clientY, e.pointerType), true);
    addEventListener("pointerup", () => host()?.pointerUp(), true);
  }
})();
