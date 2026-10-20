// Intro: Die Seite liegt fertig hinter Milchglas. Ein Balken auf 60 % der Höhe – wer ihn hochzieht, löst die Unschärfe auf.
// Wie im iPhone-Duo-Vorbild (github.com/akashtdev/iphone-duo-animation, "wipe") hängt alles an einem einzigen Wert p
// (0 = zu, 1 = offen): Am Balken wird die Seite zuerst scharf, die Schärfe wandert von dort nach außen, dazu hellt sich alles auf.
// Das Milchglas besteht aus drei Ebenen mit wachsender Unschärfe, deren Masken sich pro Bild neu ausrichten.
// Zeitverläufe, Federn und die Wischgeschwindigkeit beim Loslassen kommen von Motion.
import { animate } from "./motion.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };

const BAR_AT = 0.6;  // Ruhelage des Balkens (Anteil der Höhe)
const BAR_TO = 0.07; // Endlage oben
const REACH = 0.3;   // Breite des Übergangs von scharf zu unscharf (Anteil der Höhe)

export function runIntro({ skip = false } = {}) {
  const stage = document.getElementById("stage");
  const desktop = document.getElementById("desktop");
  const reveal = () => { document.body.classList.remove("booting"); desktop.removeAttribute("aria-hidden"); desktop.style.transform = ""; };
  if (skip || matchMedia("(prefers-reduced-motion: reduce)").matches) { reveal(); stage.remove(); return Promise.resolve(); }

  return new Promise((resolve) => {
    const $ = (id) => document.getElementById(id);
    const veils = [...stage.querySelectorAll(".veil")];
    const [dim, glint, hero, pull, nudge, hint, ui] = ["veil-dim", "veil-glint", "hero", "pull", "pull-nudge", "pull-hint", "stage-ui"].map($);
    let VH = 0, p = 0, busy = false, drag = null, bob = null;
    const span = () => VH * (BAR_AT - BAR_TO);

    const apply = (pp) => {
      p = pp;
      const q = clamp(p);
      const y = VH * BAR_AT - p * span(); // Mitte des Balkens
      pull.style.transform = `translate3d(0,${y - VH * BAR_AT}px,0)`;
      pull.style.opacity = String(1 - smooth(0.78, 0.97, q));
      hint.style.opacity = String(1 - smooth(0, 0.1, q));
      ui.style.opacity = String(1 - smooth(0, 0.25, q)); // "Überspringen" soll das aufgehende Dock nicht verdecken
      // R = Radius um den Balken, in dem alles scharf ist; er wächst von −REACH (alles unscharf) bis über die Seite hinaus.
      // Ebene i wird erst jenseits von R + i/3·REACH voll wirksam – so steigt die Unschärfe mit dem Abstand stufenlos an.
      const S = REACH * VH, R = -S + q * (S + 1.15 * VH);
      veils.forEach((el, i) => {
        const a0 = R + (S * i) / 3, a1 = R + (S * (i + 1)) / 3;
        const m = clamp(-a0 / (a1 - a0)); // Deckung genau auf der Balkenlinie (1, solange der Radius negativ ist)
        const lo = Math.max(a0, 0), hi = Math.max(a1, 0);
        el.style.webkitMaskImage = el.style.maskImage =
          `linear-gradient(180deg,#000 ${y - hi}px,rgba(0,0,0,${m}) ${y - lo}px,rgba(0,0,0,${m}) ${y + lo}px,#000 ${y + hi}px)`;
      });
      dim.style.opacity = String(1 - smooth(0.1, 1, q));
      glint.style.opacity = String(Math.sin(Math.PI * q) * 0.6);
      glint.style.transform = `translate3d(${-60 + 120 * q}%,0,0)`;
      hero.style.opacity = String(1 - smooth(0.05, 0.6, q));
      hero.style.filter = `blur(${(q * 22).toFixed(1)}px)`;
      hero.style.transform = `translate3d(0,${-q * 0.08 * VH}px,0) scale(${1 + q * 0.07})`;
      desktop.style.transform = `scale(${1 + 0.06 * (1 - smooth(0, 1, q))})`; // die Seite setzt sich beim Öffnen auf ihre Größe
    };
    const layout = () => { VH = stage.clientHeight; apply(p); };

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
    const open = () => !busy && run({ duration: Math.max(0.5, 1.4 * (1 - clamp(p))), ease: [0.4, 0, 0.2, 1] });

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
    $("skip-btn").addEventListener("click", () => !busy && run({ duration: 0.4, ease: "easeOut" }));

    layout();
    // zum Testen: ?debug erlaubt, einzelne Bilder der Animation von Hand zu setzen
    if (/[?&]debug\b/.test(location.search)) window.__intro = { set: (pp) => { busy = true; apply(pp); } };

    // Auftritt: der Balken federt ein und nickt danach in Abständen nach oben, bis jemand zugreift
    animate(nudge, { opacity: [0, 1], y: [28, 0] }, { delay: 0.7, type: "spring", stiffness: 200, damping: 22 }).then(() => {
      if (!drag && !busy) bob = animate(nudge, { y: [0, -12, 0] }, { duration: 1.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 1.6 });
    });
  });
}
