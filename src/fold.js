// Aufklapp-Intro: ein Falt-Gerät liegt zugeklappt in der Mitte. Tippen (oder ziehen) schwenkt die rechte Hälfte um die
// Mittelnaht auf, danach zoomt der Bildschirm bis zum Rand und der Desktop darunter wird sichtbar.
// Alles läuft über einen einzigen Fortschrittswert p (0 = zu, 1 = flach) – darum lässt sich das Gerät auch mit dem Finger
// aufziehen. Es werden nur transform und opacity bewegt.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// cubic-bezier wie in CSS (Newton), damit die Kurven dieselben sind wie sonst im Projekt
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t;
  const Y = (t) => ((ay * t + by) * t + cy) * t;
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) { const e = X(t) - x; if (Math.abs(e) < 1e-5) break; const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
    return Y(clamp(t));
  };
}
const SWING = bezier(0.32, 0, 0.16, 1.07); // schwingt leicht über die Flachlage hinaus und federt zurück
const ZOOM = bezier(0.7, 0, 0.18, 1);

function tween(ms, fn) {
  return new Promise((res) => {
    const t0 = performance.now();
    const step = (now) => {
      const t = clamp((now - t0) / ms);
      fn(t);
      t < 1 ? requestAnimationFrame(step) : res();
    };
    requestAnimationFrame(step);
  });
}

export function runIntro({ skip = false } = {}) {
  const stage = document.getElementById("stage");
  const done = () => { stage.remove(); };
  const reveal = () => { document.body.classList.remove("booting"); document.getElementById("desktop").removeAttribute("aria-hidden"); };
  if (skip || matchMedia("(prefers-reduced-motion: reduce)").matches) { reveal(); done(); return Promise.resolve(); }

  return new Promise((resolve) => {
    const device = document.getElementById("device");
    const flap = document.getElementById("flap");
    const bg = stage.querySelector(".stage-bg");
    const ui = document.getElementById("stage-ui");
    let VW = 0, VH = 0, k0 = 0.6, p = 0, k = 0.6, tiltX = 0, tiltY = 0, busy = false, drag = null;

    const layout = () => {
      VW = innerWidth; VH = innerHeight;
      k0 = VH > VW ? 0.72 : 0.6; // hochkant etwas größer, damit die schmale Hälfte nicht verschwindet
      device.style.width = VW + "px";
      device.style.height = VH + "px";
      device.style.setProperty("--vw", VW * k0 + "px");
      device.style.setProperty("--dr", Math.round(30 / k0) + "px");
      if (!busy) { k = k0; apply(p); }
    };

    const apply = (pp) => {
      p = pp;
      const open = Math.min(p, 1);
      const tx = (VW / 4) * k * (1 - open);
      device.style.transform = `translate3d(${tx}px,0,0) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale(${k})`;
      flap.style.transform = `translateZ(1px) rotateY(${-180 * (1 - p)}deg)`;
      device.style.setProperty("--sh", String(clamp(1.15 - p * 1.25)));
      device.style.setProperty("--cr", String(smooth(0.05, 0.5, open) * (1 - smooth(0.9, 1, open) * 0.6)));
    };

    layout();
    addEventListener("resize", layout);
    // zum Testen: ?debug erlaubt, einzelne Bilder der Animation von Hand zu setzen
    if (/[?&]debug\b/.test(location.search)) window.__fold = { set: (pp, kk) => { busy = true; if (kk) k = kk; apply(pp); }, k0: () => k0 };

    // Neigung folgt der Maus, solange das Gerät zu ist
    const tilt = (e) => {
      if (busy || drag) return;
      tiltY = ((e.clientX / innerWidth) - 0.5) * 9;
      tiltX = -((e.clientY / innerHeight) - 0.5) * 6;
      apply(p);
    };
    addEventListener("pointermove", tilt);

    const finish = async () => {
      removeEventListener("pointermove", tilt);
      removeEventListener("resize", layout);
      ui.classList.add("gone");
      // Zoom: Gerät wird zum Vollbild, Ecken werden eckig, der Rand blendet aus
      const dr0 = parseFloat(device.style.getPropertyValue("--dr"));
      await tween(1150, (t) => {
        const z = ZOOM(t);
        k = k0 + (1 - k0) * z;
        tiltX = tiltY = 0;
        device.style.setProperty("--dr", dr0 * (1 - z) + "px");
        device.style.setProperty("--cr", String((1 - smooth(0, 0.7, z)) * 0.4));
        bg.style.opacity = String(1 - smooth(0.35, 1, z));
        apply(1);
      });
      document.body.classList.remove("booting");
      document.getElementById("desktop").removeAttribute("aria-hidden");
      // Überblendung: das Gerät besteht aus einer Kopie des Hintergrunds, darunter liegt der lebendige Desktop
      await tween(450, (t) => { stage.style.opacity = String(1 - t); });
      done();
      resolve();
    };

    const open = async () => {
      if (busy) return;
      busy = true;
      ui.classList.add("gone");
      const from = p;
      const dur = 1500 * (1 - clamp(from, 0, 0.9));
      await tween(Math.max(500, dur), (t) => apply(from + (1 - from) * SWING(t)));
      apply(1);
      await new Promise((r) => setTimeout(r, 260));
      finish();
    };

    // Aufziehen mit dem Finger/der Maus: je weiter nach rechts, desto weiter offen
    device.addEventListener("pointerdown", (e) => {
      if (busy) return;
      drag = { x: e.clientX, moved: false, p0: p };
      try { device.setPointerCapture(e.pointerId); } catch {}
    });
    device.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) drag.moved = true;
      if (drag.moved) apply(clamp(drag.p0 + dx / (VW * k0 * 0.55), 0, 1));
    });
    const release = () => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      if (!moved || p > 0.3) return open();
      // zu wenig aufgezogen: federt zurück
      busy = true;
      const from = p;
      tween(450, (t) => apply(from * (1 - ZOOM(t)))).then(() => { busy = false; });
    };
    device.addEventListener("pointerup", release);
    device.addEventListener("pointercancel", release);

    document.getElementById("open-btn").addEventListener("click", open);
    document.getElementById("skip-btn").addEventListener("click", () => {
      busy = true;
      document.body.classList.remove("booting");
      document.getElementById("desktop").removeAttribute("aria-hidden");
      stage.style.transition = "opacity .3s";
      stage.style.opacity = "0";
      setTimeout(() => { done(); resolve(); }, 320);
    });
    addEventListener("keydown", function key(e) {
      if (!document.getElementById("stage")) return removeEventListener("keydown", key);
      if (["Enter", " ", "ArrowRight", "ArrowDown"].includes(e.key) && document.activeElement?.id !== "skip-btn") { e.preventDefault(); open(); }
    });
    addEventListener("wheel", (e) => { if (!busy && e.deltaY > 12) open(); }, { passive: true });
  });
}
