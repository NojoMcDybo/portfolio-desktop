// Die Notch auf dem Desktop: die echte Oberfläche (apps/notch/index.html) in einem durchsichtigen Vollbild-iframe, genau wie das
// durchsichtige Fenster der echten App. Nur über der Form fängt das Fenster die Maus; ob der Zeiger darüber liegt, meldet dieses
// Modul der Oberfläche als „hover“-Ereignis (in der echten App fragt Rust dafür die Mausposition ab).
import { createNotchBackend } from "./notch-backend.js";
import { animate } from "./motion.js";
import { S } from "./stage.js";

export function createNotchHost({ toast, openSettings }) {
  const backend = createNotchBackend({ toast });
  window.__notchBackend = backend;
  const frame = document.createElement("iframe");
  frame.className = "notch-frame";
  frame.title = "Notch";
  frame.setAttribute("aria-label", "Notch");
  frame.style.opacity = "0"; // bis zum Auftritt unsichtbar (nicht hidden: die Oberfläche braucht ihre Größe)
  frame.src = "apps/notch/index.html";
  document.getElementById("notch-root").append(frame);

  // Schmale Bildschirme: die Notch braucht ca. 640 px Breite; darunter zeigt der iframe sie verkleinert (wie die Programmfenster)
  const MIN = 640;
  let k = 1;
  const fit = () => {
    k = Math.min(1, innerWidth / MIN);
    if (k < 1) Object.assign(frame.style, { width: MIN + "px", height: innerHeight / k + "px", right: "auto", bottom: "auto", transformOrigin: "0 0", transform: `scale(${k})` });
    else for (const p of ["width", "height", "right", "bottom", "transformOrigin", "transform"]) frame.style[p] = "";
  };
  fit();
  addEventListener("resize", fit);
  const inside = (x, y) => { const r = backend.hit; return r.w > 0 && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; };
  const f = () => k * S.k; // Fensterpixel -> Pixel der Notch-Oberfläche (Bühne und ggf. verkleinerter iframe)
  const insideP = (x, y) => inside(x / f(), y / f()); // Zeigerpositionen des Fensters in die Koordinaten der Notch-Oberfläche
  let dockDrag = null, touchOn = false;
  const set = (v) => { backend.setHover(v); frame.style.pointerEvents = v ? "auto" : "none"; };

  addEventListener("pointermove", (e) => { if (!dockDrag && e.pointerType !== "touch") set(insideP(e.clientX, e.clientY)); }, true);
  // Touch: Tippen auf die Form hält sie offen, Tippen daneben schließt sie
  addEventListener("pointerdown", (e) => { if (e.pointerType === "touch" && !dockDrag) { touchOn = insideP(e.clientX, e.clientY); set(touchOn); } }, true);

  // Andocken: Form mit gedrückter Maus ziehen, nahe der linken/rechten Kante loslassen (wie die echte Notch)
  const edge = (x) => { const W = frame.clientWidth; return x < W * 0.18 ? "left" : x > W * 0.82 ? "right" : "top"; };
  backend.onDockDrag = () => { dockDrag = { cur: backend.dock }; frame.style.pointerEvents = "auto"; };
  const host = {
    pointer(x, y, type) {
      if (dockDrag) { const d = edge(x); if (d !== dockDrag.cur) { dockDrag.cur = d; backend.emit("dock-preview", d === backend.dock ? null : d); } return; }
      if (type !== "touch") set(inside(x, y));
    },
    pointerDown(x, y, type) { if (type === "touch" && !dockDrag && !inside(x, y)) set(false); },
    pointerUp() {
      if (!dockDrag) return;
      const d = dockDrag.cur; dockDrag = null;
      backend.emit("dock-preview", null);
      if (d !== backend.dock) backend.invoke("dock_set", { dock: d });
    },
  };
  window.__notchHost = host;
  backend.onOpenSettings = openSettings;

  // Dateien aus dem Betriebssystem über die Notch ziehen (nur über der Form gilt der Abwurf)
  const hasFiles = (e) => [...(e.dataTransfer?.types || [])].includes("Files");
  let over = false, leaveT = 0;
  addEventListener("dragover", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    clearTimeout(leaveT);
    leaveT = setTimeout(() => { if (over) { over = false; backend.emit("drag", { phase: "leave" }); } }, 250);
    if (!over) { over = true; backend.emit("drag", { phase: "enter", x: e.clientX / f(), y: e.clientY / f() }); }
    else backend.emit("drag", { phase: "over", x: e.clientX / f(), y: e.clientY / f() });
  });
  addEventListener("drop", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    clearTimeout(leaveT);
    over = false;
    if (!insideP(e.clientX, e.clientY)) return backend.emit("drag", { phase: "leave" });
    const paths = [];
    for (const f of e.dataTransfer.files) { backend.files.set(f.name, f); paths.push(f.name); }
    backend.emit("drag", { phase: "drop", paths, x: e.clientX / f(), y: e.clientY / f() });
  });

  return {
    backend,
    alert: (o) => backend.alert(o),
    /** Auftritt: die Notch fährt aus der Bildschirmkante */
    show() { animate(frame, k < 1 ? { opacity: [0, 1] } : { y: [-48, 0], opacity: [0, 1] }, { type: "spring", stiffness: 170, damping: 15 }); },
  };
}
