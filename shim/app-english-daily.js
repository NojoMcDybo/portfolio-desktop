/* English Daily: Attrappe für den Host der Overlay-Seite (english-daily-overlay/src-tauri/src/lib.rs). Die Seite spricht über window.__TAURI__
   mit Rust: Panel-Rechtecke melden (set_regions), Bildschirm wechseln, Autostart, Verstecken und Beenden. Hier geht das, was den Desktop
   betrifft (Rechtecke, Verstecken, Ein- und Ausblenden), per Nachricht an src/overlay-host.js; der Rest wird nur gemerkt. */
(() => {
  const to = (cmd, args) => { try { parent.postMessage({ ed: 1, cmd, args }, location.origin); } catch { /* ohne Desktop */ } };
  const status = { shortcut: true, monitor: 0, monitors: 1 };
  let auto = false;
  const invoke = async (cmd, args = {}) => {
    switch (cmd) {
      case "status": case "monitor_next": return status;
      case "autostart_get": return auto;
      case "autostart_set": auto = !!args.on; return auto;
      case "set_regions": case "hide": case "quit": to(cmd, args); return null;
      default: return null; // ready: das Overlay ist schon da
    }
  };
  window.__TAURI__ = { core: { invoke }, event: { listen: () => Promise.resolve(() => {}) } };
  addEventListener("keydown", (e) => { if (e.ctrlKey && e.altKey && !e.shiftKey && e.key.toLowerCase() === "e") { e.preventDefault(); to("toggle"); } }, true);
})();
