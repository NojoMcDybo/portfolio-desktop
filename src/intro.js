// Intro: Die Seite bleibt gerade und liegt hinter einem Diffusor-Glas, das um seine untere Kante aufklappt. Je weiter ein Punkt der Seite
// vom Scharnier entfernt ist, desto weiter ist er vom Glas weg und desto stärker wird er gestreut; je flacher das Glas liegt, desto weniger.
// Ein Balken auf 60 % Höhe ist der Griff: Wer ihn hochzieht, verkleinert den Kippwinkel, bis alles scharf ist.
// Idee: jh3y/lid-plane (Deckelwinkel -> Progressive Blur, Seite bleibt in festem Winkel) und iphone-duo-animation (ein Fortschrittswert);
// beide sind GPL/MIT-lizenziert, hier ist nichts davon übernommen. Umsetzung: vier Weichzeichner-Ebenen mit Masken statt Shader.
// Zeitverläufe, Federn und die Wischgeschwindigkeit beim Loslassen kommen von Motion.
import { animate } from "./motion.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

const TILT0 = 75;                 // Kippwinkel zu Beginn (Grad); 0 = Glas liegt flach auf der Seite
const BAR_AT = 0.6, BAR_TO = 0.07; // Ruhelage und Endlage des Balkens (Anteil der Höhe)
const SIG = [3, 9, 22, 48];       // gesamte Unschärfe der Ebenen 1..4 (px je 1000 px Fensterhöhe); passt zu .v1–.v4 in shell.css
const RMAX = 48;                  // Unschärfe ganz oben bei senkrechtem Glas (gleiche Einheit)
const M = 16;                     // Stützstellen der Masken von oben nach unten

export function runIntro({ skip = false } = {}) {
  const stage = document.getElementById("stage");
  const desktop = document.getElementById("desktop");
  const reveal = () => { document.body.classList.remove("booting"); desktop.removeAttribute("aria-hidden"); };
  if (skip || matchMedia("(prefers-reduced-motion: reduce)").matches) { reveal(); stage.remove(); return Promise.resolve(); }

  return new Promise((resolve) => {
    const $ = (id) => document.getElementById(id);
    const veils = [...stage.querySelectorAll(".veil")];
    const [dim, hero, pull, nudge, hint, ui] = ["veil-dim", "hero", "pull", "pull-nudge", "pull-hint", "stage-ui"].map($);
    let VH = 0, p = 0, busy = false, drag = null, bob = null;
    const span = () => VH * (BAR_AT - BAR_TO);

    const apply = (pp) => {
      p = pp;
      const q = clamp(p);
      const tilt = TILT0 * (1 - q);                // aktueller Kippwinkel
      const sinA = Math.sin((tilt * Math.PI) / 180);
      // Unschärfe-Radius entlang der Höhe: wächst mit dem Abstand zum Scharnier (unten), erst ab etwas Abstand, und mit sin(Winkel)
      const radius = Array.from({ length: M + 1 }, (_, i) => RMAX * sinA * smooth(0.08, 1, 1 - i / M));
      veils.forEach((el, n) => {
        const lo = n ? SIG[n - 1] : 0, hi = SIG[n];
        let any = false;
        const stops = radius.map((r, i) => {
          const a = clamp((r - lo) / (hi - lo));
          if (a > 0.002) any = true;
          return `rgba(0,0,0,${a.toFixed(3)}) ${((i / M) * 100).toFixed(1)}%`;
        });
        el.style.visibility = any ? "visible" : "hidden"; // ungenutzte Ebenen kosten nichts
        if (any) el.style.webkitMaskImage = el.style.maskImage = `linear-gradient(180deg,${stops.join(",")})`;
      });
      dim.style.opacity = String(sinA);
      hero.style.opacity = String(1 - smooth(0.82, 1, q)); // erst wenn er scharf geworden ist, weicht der Schriftzug dem Desktop
      pull.style.transform = `translate3d(0,${-p * span()}px,0)`;
      pull.style.opacity = String(1 - smooth(0.78, 0.97, q));
      hint.textContent = drag?.moved || p > 0.02 ? `Kippwinkel ${Math.round(tilt)}°` : "Zum Öffnen nach oben ziehen";
      hint.style.opacity = String(1 - smooth(0.7, 0.95, q));
      ui.style.opacity = String(1 - smooth(0, 0.25, q)); // "Überspringen" soll das aufgehende Dock nicht verdecken
    };
    const layout = () => { VH = stage.clientHeight; stage.style.setProperty("--k", String(VH / 1000)); apply(p); };

    const finish = () => {
      removeEventListener("resize", layout);
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      reveal();
      stage.remove();
      resolve();
    };
    const run = async (opts) => {
      busy = true;
      ui.classList.add("gone");
      bob?.stop();
      await animate(p, 1, { ...opts, onUpdate: apply });
      apply(1);
      finish();
    };
    const open = () => !busy && run({ duration: Math.max(0.6, 1.6 * (1 - clamp(p))), ease: [0.4, 0, 0.2, 1] });

    // Ziehen: der Balken folgt dem Finger/der Maus 1:1 (egal wo man greift), nach unten zäh; beim Loslassen übernimmt eine Feder die Wischgeschwindigkeit
    stage.addEventListener("pointerdown", (e) => {
      if (busy || e.target.closest(".skip-btn")) return;
      drag = { y: e.clientY, p0: p, moved: false, last: p, lastT: performance.now(), v: 0 };
      stage.classList.add("drag");
      try { stage.setPointerCapture(e.pointerId); } catch {}
      bob?.stop();
      animate(nudge, { y: 0 }, { duration: 0.2 });
    });
    stage.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dy = drag.y - e.clientY;
      if (Math.abs(dy) > 6) drag.moved = true;
      if (!drag.moved) return;
      const raw = drag.p0 + dy / span();
      const np = raw < 0 ? raw * 0.15 : Math.min(raw, 1);
      const now = performance.now();
      drag.v = ((np - drag.last) / Math.max(1, now - drag.lastT)) * 1000;
      drag.last = np; drag.lastT = now;
      apply(np);
    });
    const release = () => {
      if (!drag) return;
      const { moved, v, lastT } = drag;
      drag = null;
      stage.classList.remove("drag");
      if (!moved) return open();
      const vel = performance.now() - lastT > 90 ? 0 : v; // wer vor dem Loslassen innehält, wirft nicht
      if (p > 0.32 || vel > 1.3) return run({ type: "spring", stiffness: 90, damping: 15, velocity: vel });
      busy = true;
      animate(p, 0, { type: "spring", stiffness: 260, damping: 26, velocity: vel, onUpdate: apply }).then(() => { busy = false; });
    };
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);

    const onWheel = (e) => { if (Math.abs(e.deltaY) > 12) open(); };
    const onKey = (e) => {
      if (["Enter", " ", "ArrowUp", "ArrowRight", "ArrowDown"].includes(e.key) && document.activeElement?.id !== "skip-btn") { e.preventDefault(); open(); }
    };
    addEventListener("wheel", onWheel, { passive: true });
    addEventListener("keydown", onKey);
    addEventListener("resize", layout);
    $("skip-btn").addEventListener("click", () => !busy && run({ duration: 0.5, ease: "easeOut" }));

    layout();
    // zum Testen: ?debug erlaubt, einzelne Bilder der Animation von Hand zu setzen
    if (/[?&]debug\b/.test(location.search)) window.__intro = { set: (pp) => { busy = true; apply(pp); } };

    // Auftritt: der Balken federt ein und nickt danach in Abständen nach oben, bis jemand zugreift
    animate(nudge, { opacity: [0, 1], y: [28, 0] }, { delay: 0.7, type: "spring", stiffness: 200, damping: 22 }).then(() => {
      if (!drag && !busy) bob = animate(nudge, { y: [0, -12, 0] }, { duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.6 });
    });
  });
}
