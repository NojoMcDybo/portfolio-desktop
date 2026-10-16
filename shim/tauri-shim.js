/* Tauri-Attrappe für die eingebetteten Programme.
 *
 * Die Programme (Arena, Kursbuch, Streamdock, …) sind echte Tauri-Oberflächen: sie sprechen über window.__TAURI_INTERNALS__ mit
 * ihrem Rust-Teil. Hier gibt es keinen Rust-Teil. Diese Datei beantwortet dieselben Aufrufe mit Beispieldaten und leitet
 * Fensterbefehle (schließen, minimieren, ziehen) an den Desktop weiter, in dem das Programm als Fenster steckt.
 *
 * Reihenfolge im <head> der Programmseite:  tauri-shim.js  →  app-<name>.js (setzt window.__PORTFOLIO__.handlers)  →  Programm.
 */
(() => {
  "use strict";
  const inFrame = parent !== window;
  const post = (m) => { if (inFrame) parent.postMessage({ portfolio: 1, ...m }, location.origin); };

  const P = (window.__PORTFOLIO__ = window.__PORTFOLIO__ || {});
  P.handlers = P.handlers || {};
  P.bus = (name, data) => post({ type: "bus", name, data });

  // ---------- Ereignisse (listen/emit) ----------
  const listeners = new Map(); // event -> Map(id -> callbackId)
  let evId = 1;
  P.emit = (event, payload) => {
    const m = listeners.get(event);
    if (!m) return;
    for (const [id, cb] of [...m]) window[`_${cb}`]?.({ event, id, payload });
  };

  // ---------- Rückrufe ----------
  let cbId = 1;
  const transformCallback = (cb, once) => {
    const id = cbId++;
    window[`_${id}`] = (...a) => { if (once) delete window[`_${id}`]; return cb?.(...a); };
    return id;
  };

  // ---------- Fenster ----------
  let maximized = false;
  const winCmd = (cmd, args) => {
    switch (cmd) {
      case "close": case "destroy": post({ type: "win", action: "close" }); return null;
      case "hide": case "minimize": post({ type: "win", action: "minimize" }); return null;
      case "toggle_maximize": case "maximize": case "unmaximize": { const want = cmd === "toggle_maximize" ? !maximized : cmd === "maximize"; if (want !== maximized) { maximized = want; post({ type: "win", action: "toggleMax" }); } return null; }
      case "set_title": post({ type: "title", title: String(args?.value ?? "") }); return null;
      case "start_dragging": return null;
      case "is_maximized": return maximized;
      case "is_fullscreen": case "is_minimized": case "is_decorated": return false;
      case "is_resizable": case "is_visible": case "is_focused": return true;
      case "scale_factor": return 1;
      case "inner_size": case "outer_size": return { width: innerWidth, height: innerHeight };
      case "inner_position": case "outer_position": return { x: 0, y: 0 };
      case "current_monitor": case "primary_monitor": return { name: "Desktop", size: { width: screen.width, height: screen.height }, position: { x: 0, y: 0 }, scaleFactor: 1 };
      case "available_monitors": return [];
      default: return null;
    }
  };

  const invoke = async (cmd, args = {}) => {
    if (cmd === "plugin:event|listen") {
      const id = evId++;
      if (!listeners.has(args.event)) listeners.set(args.event, new Map());
      listeners.get(args.event).set(id, args.handler);
      return id;
    }
    if (cmd === "plugin:event|unlisten") { listeners.get(args.event)?.delete(args.eventId); return null; }
    if (cmd === "plugin:event|emit" || cmd === "plugin:event|emit_to") { P.emit(args.event, args.payload); return null; }
    if (cmd.startsWith("plugin:window|")) return winCmd(cmd.slice(14), args);
    if (cmd.startsWith("plugin:webview|")) return null;
    if (cmd === "plugin:app|version") return P.version || "0.0.0";
    if (cmd === "plugin:app|name") return P.name || "App";
    if (cmd === "plugin:opener|open_url" || cmd === "plugin:shell|open") { window.open(args.url || args.path, "_blank", "noopener"); return null; }
    const h = P.handlers[cmd];
    if (h) return h(args);
    if (cmd.startsWith("plugin:")) return null;
    console.warn("[shim] nicht behandelt:", cmd, args);
    return null;
  };

  window.isTauri = true;
  window.__TAURI_INTERNALS__ = {
    metadata: { currentWindow: { label: "main" }, currentWebview: { windowLabel: "main", label: "main" } },
    transformCallback,
    unregisterCallback: (id) => { delete window[`_${id}`]; },
    convertFileSrc: (p) => p,
    invoke,
  };
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} };

  // Der Desktop kann ein Ereignis ins Programm schicken (z. B. „reveal“ beim zweiten Klick auf denselben Kurs)
  addEventListener("message", (e) => { const d = e.data; if (e.origin === location.origin && d && d.portfolio === 1 && d.type === "emit") P.emit(d.event, d.payload); });

  // ---------- Ziehen über data-tauri-drag-region ----------
  if (inFrame) {
    let drag = null;
    addEventListener("pointerdown", (e) => {
      post({ type: "focus" });
      if (e.button !== 0 || !(e.target instanceof Element) || !e.target.hasAttribute("data-tauri-drag-region")) return;
      if (e.detail === 2) { post({ type: "win", action: "toggleMax" }); return; }
      drag = { x: e.screenX, y: e.screenY, id: e.pointerId, on: false };
    }, true);
    addEventListener("pointermove", (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.screenX - drag.x, dy = e.screenY - drag.y;
      if (!drag.on) {
        if (Math.hypot(dx, dy) < 4) return;
        drag.on = true;
        try { document.documentElement.setPointerCapture(e.pointerId); } catch {}
        post({ type: "win", action: "dragStart" });
      }
      post({ type: "win", action: "dragMove", dx, dy });
    }, true);
    const end = () => { if (drag?.on) post({ type: "win", action: "dragEnd" }); drag = null; };
    addEventListener("pointerup", end, true);
    addEventListener("pointercancel", end, true);
    addEventListener("DOMContentLoaded", () => post({ type: "ready" }));
    addEventListener("load", () => post({ type: "ready" }));
  }

  // Programme öffnen Links gern mit window.open / <a target=_blank>: das bleibt im Browser, nichts weiter nötig.
  // Rechtsklick-Menü des Browsers bleibt aus, wie in der echten App.
  addEventListener("contextmenu", (e) => { if (!(e.target instanceof Element) || !e.target.closest("input, textarea, [contenteditable]")) e.preventDefault(); });
})();
