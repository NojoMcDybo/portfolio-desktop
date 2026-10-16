// Aufklapp-Intro: ein Falt-Gerät liegt zugeklappt in der Mitte. Tippen (oder ziehen) schwenkt die rechte Hälfte um die
// Mittelnaht auf, danach zoomt der Bildschirm bis zum Rand und der Desktop darunter wird sichtbar.
// Alles läuft über einen einzigen Fortschrittswert p (0 = zu, 1 = flach) – darum lässt sich das Gerät auch mit dem Finger
// aufziehen. Bewegt werden nur transform und opacity; Zeitverläufe, Federn und Mitnahme der Wischgeschwindigkeit kommen von Motion.
import { animate, motionValue, EASE } from "./motion.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

const SWING = [0.32, 0, 0.16, 1.07]; // schwingt leicht über die Flachlage hinaus und federt zurück
const ZOOM = [0.7, 0, 0.18, 1];

export function runIntro({ skip = false, onReveal = () => {} } = {}) {
  const stage = document.getElementById("stage");
  const done = () => { stage.remove(); };
  const reveal = () => { document.body.classList.remove("booting"); document.getElementById("desktop").removeAttribute("aria-hidden"); onReveal(); };
  if (skip || matchMedia("(prefers-reduced-motion: reduce)").matches) { reveal(); done(); return Promise.resolve(); }

  return new Promise((resolve) => {
    const device = document.getElementById("device");
    const flap = document.getElementById("flap");
    const bg = stage.querySelector(".stage-bg");
    const ui = document.getElementById("stage-ui");
    let VW = 0, VH = 0, k0 = 0.6, p = 0, k = 0.6, busy = false, drag = null;
    // Neigung folgt der Maus – als Feder, nicht als Sprung
    const tiltX = motionValue(0), tiltY = motionValue(0);

    const layout = () => {
      VW = innerWidth; VH = innerHeight;
      k0 = VH > VW ? 0.72 : 0.6; // hochkant etwas größer, damit die schmale Hälfte nicht verschwindet
      device.style.width = VW + "px";
      device.style.height = VH + "px";
      device.style.setProperty("--vw", VW * k0 + "px");
      device.style.setProperty("--dr", Math.round(30 / k0) + "px");
      if (!busy) { k = k0; apply(p); }
    };

    const apply = (pp = p) => {
      p = pp;
      const open = Math.min(p, 1);
      const tx = (VW / 4) * k * (1 - open);
      device.style.transform = `translate3d(${tx}px,0,0) rotateX(${tiltX.get()}deg) rotateY(${tiltY.get()}deg) scale(${k})`;
      flap.style.transform = `translateZ(1px) rotateY(${-180 * (1 - p)}deg)`;
      device.style.setProperty("--sh", String(clamp(1.15 - p * 1.25)));
      device.style.setProperty("--cr", String(smooth(0.05, 0.5, open) * (1 - smooth(0.9, 1, open) * 0.6)));
    };

    layout();
    addEventListener("resize", layout);
    tiltX.on("change", () => { if (!busy) apply(); });
    tiltY.on("change", () => { if (!busy) apply(); });
    // zum Testen: ?debug erlaubt, einzelne Bilder der Animation von Hand zu setzen
    if (/[?&]debug\b/.test(location.search)) window.__fold = { set: (pp, kk) => { busy = true; if (kk) k = kk; apply(pp); }, k0: () => k0 };

    const tilt = (e) => {
      if (busy || drag) return;
      const spring = { type: "spring", stiffness: 70, damping: 14 };
      animate(tiltY, ((e.clientX / innerWidth) - 0.5) * 9, spring);
      animate(tiltX, -((e.clientY / innerHeight) - 0.5) * 6, spring);
    };
    addEventListener("pointermove", tilt);
    const onWheel = (e) => { if (!busy && e.deltaY > 12) open(); };
    addEventListener("wheel", onWheel, { passive: true });

    const detach = () => {
      removeEventListener("pointermove", tilt);
      removeEventListener("resize", layout);
      removeEventListener("wheel", onWheel);
    };

    const finish = async () => {
      detach();
      ui.classList.add("gone");
      // Zoom: Gerät wird zum Vollbild, Ecken werden eckig, der Rand blendet aus
      const dr0 = parseFloat(device.style.getPropertyValue("--dr"));
      animate(tiltX, 0, { duration: 0.3 });
      animate(tiltY, 0, { duration: 0.3 });
      await animate(0, 1, {
        duration: 1.15, ease: ZOOM,
        onUpdate: (z) => {
          k = k0 + (1 - k0) * z;
          device.style.setProperty("--dr", dr0 * (1 - z) + "px");
          device.style.setProperty("--cr", String((1 - smooth(0, 0.7, z)) * 0.4));
          bg.style.opacity = String(1 - smooth(0.35, 1, z));
          apply(1);
        },
      });
      reveal();
      // Überblendung: das Gerät besteht aus einer Kopie des Hintergrunds, darunter liegt der lebendige Desktop
      await animate(stage, { opacity: 0 }, { duration: 0.45, ease: "linear" });
      done();
      resolve();
    };

    const open = async () => {
      if (busy) return;
      busy = true;
      ui.classList.add("gone");
      const from = p;
      await animate(from, 1, { duration: Math.max(0.5, 1.5 * (1 - clamp(from, 0, 0.9))), ease: SWING, onUpdate: apply });
      apply(1);
      await new Promise((r) => setTimeout(r, 260));
      finish();
    };

    // Aufziehen mit dem Finger/der Maus: je weiter nach rechts, desto weiter offen; beim Loslassen übernimmt eine Feder die Wischgeschwindigkeit
    device.addEventListener("pointerdown", (e) => {
      if (busy) return;
      drag = { x: e.clientX, moved: false, p0: p, last: p, lastT: performance.now(), v: 0 };
      try { device.setPointerCapture(e.pointerId); } catch {}
    });
    device.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) drag.moved = true;
      if (!drag.moved) return;
      const np = clamp(drag.p0 + dx / (VW * k0 * 0.55), 0, 1), now = performance.now();
      drag.v = ((np - drag.last) / Math.max(1, now - drag.lastT)) * 1000;
      drag.last = np; drag.lastT = now;
      apply(np);
    });
    const release = async () => {
      if (!drag) return;
      const { moved, v } = drag;
      drag = null;
      if (!moved) return open();
      busy = true;
      ui.classList.add("gone");
      const opening = p > 0.3 || v > 1.2;
      await animate(p, opening ? 1 : 0, { type: "spring", stiffness: opening ? 80 : 260, damping: opening ? 13 : 26, velocity: v, onUpdate: (x) => apply(clamp(x, 0, 1.06)) });
      if (opening) { apply(1); await new Promise((r) => setTimeout(r, 200)); finish(); }
      else { ui.classList.remove("gone"); busy = false; }
    };
    device.addEventListener("pointerup", release);
    device.addEventListener("pointercancel", release);

    document.getElementById("open-btn").addEventListener("click", open);
    document.getElementById("skip-btn").addEventListener("click", () => {
      busy = true;
      detach();
      reveal();
      animate(stage, { opacity: 0 }, { duration: 0.3 }).then(() => { done(); resolve(); });
    });
    addEventListener("keydown", function key(e) {
      if (!document.getElementById("stage")) return removeEventListener("keydown", key);
      if (["Enter", " ", "ArrowRight", "ArrowDown"].includes(e.key) && document.activeElement?.id !== "skip-btn") { e.preventDefault(); open(); }
    });

    // Auftritt: Gerät blendet ein, der Knopf folgt mit einer Feder
    animate(device, { opacity: [0, 1] }, { duration: 0.6, ease: EASE });
    animate(ui, { opacity: [0, 1], y: [16, 0] }, { delay: 0.5, type: "spring", stiffness: 200, damping: 22 });
  });
}
