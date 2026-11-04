// English Daily als Overlay über dem Desktop: wie in der echten App ein durchsichtiges Fenster über dem ganzen Bildschirm, in dem nur die
// Panels die Maus fangen. Die Seite meldet ihre Panel-Rechtecke (set_regions); hier werden sie zum Ausschnitt (clip-path) des Rahmens,
// alles außerhalb gehört dem Desktop darunter. Das Dock-Symbol und Strg+Alt+E blenden das Overlay ein und aus.
export function createOverlayHost({ toast, onChange }) {
  let frame = null, on = false, told = false;
  const NONE = "inset(0 100% 100% 0)"; // bis zur ersten Meldung der Seite fängt der Rahmen nichts

  const make = () => {
    frame = document.createElement("iframe");
    frame.className = "ed-overlay";
    frame.title = "English Daily";
    frame.setAttribute("aria-label", "English Daily");
    frame.style.clipPath = NONE;
    frame.addEventListener("load", scheme);
    frame.src = "apps/english-daily/index.html";
    document.getElementById("desktop").append(frame);
  };
  // Ein durchsichtiger Rahmen bleibt nur durchsichtig, wenn sein Farbschema dem der Seite darin entspricht
  function scheme() {
    try { frame.style.colorScheme = getComputedStyle(frame.contentDocument.documentElement).colorScheme; } catch { /* anderer Ursprung */ }
  }
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => setTimeout(scheme, 60));

  const region = (r) => {
    if (!frame) return;
    if (r?.full) { frame.style.clipPath = "none"; return; } // beim Ziehen eines Panels ist alles fest, damit die Maus nicht durchfällt
    const rects = r?.rects ?? [];
    frame.style.clipPath = rects.length ? `path("${rects.map(([x, y, w, h]) => `M${x} ${y}h${w}v${h}h${-w}z`).join("")}")` : NONE;
  };
  const show = () => {
    if (!frame) make();
    frame.hidden = false;
    on = true;
    onChange?.(on);
    if (!told) { told = true; toast("English Daily liegt als Overlay über dem Desktop (Strg+Alt+E blendet es aus und ein). Die Aufgaben sind Beispiele, die Fortschritte bleiben im Browser. Installer und Quellcode: Rechtsklick auf das Dock-Symbol."); }
  };
  const hide = () => { if (frame) frame.hidden = true; on = false; onChange?.(on); };
  const toggle = () => (on ? hide() : show());

  addEventListener("message", (e) => {
    const d = e.data;
    if (!frame || e.origin !== location.origin || e.source !== frame.contentWindow || !d || d.ed !== 1) return;
    if (d.cmd === "set_regions") region(d.args?.regions);
    else if (d.cmd === "hide" || d.cmd === "quit") hide();
    else if (d.cmd === "toggle") toggle();
  });
  addEventListener("keydown", (e) => { if (e.ctrlKey && e.altKey && !e.shiftKey && e.key.toLowerCase() === "e") { e.preventDefault(); toggle(); } }, true);

  return { show, hide, toggle, get on() { return on; } };
}
