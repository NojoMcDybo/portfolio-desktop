// Intro: ein Laptop-Deckel. Die Seite ist sein Bildschirm; der Deckel liegt zu, vorn glüht der Griffbalken (60 % der Höhe).
// Wer ihn hochzieht, klappt den Deckel um das Scharnier (untere Mitte) auf: erst sieht man die Außenseite, dann – wenn der Deckel
// senkrecht steht – den Bildschirm, der unscharf und dunkel angeht, während die Kamera heranfährt, bis er das Fenster füllt.
// Alles hängt an einem Wert p (0 = zu, 1 = offen), wie im iPhone-Duo-Vorbild (github.com/akashtdev/iphone-duo-animation).
// Gedreht wird mit CSS-Transformationen; die Vorderkante des Deckels wird mitgerechnet, damit der Balken dem Finger exakt folgt.
// Zeitverläufe, Federn und die Wischgeschwindigkeit beim Loslassen kommen von Motion.
import { animate } from "./motion.js";

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const RAD = Math.PI / 180;

const TH0 = 89;     // Öffnungswinkel zu Beginn: Deckel fast flach (Grad zur Senkrechten)
const TILT = 26;    // Kamera schaut zu Beginn von oben auf das geschlossene Gerät (Grad)
const ZOOM0 = 0.62; // Größe des geschlossenen Geräts im Fenster
const LIP_AT = 0.6; // Vorderkante (der Balken) in Ruhe, Anteil der Höhe
const N = 240;      // Stützstellen der Tabelle „Fortschritt → Höhe des Balkens“

export function runIntro({ skip = false } = {}) {
  const stage = document.getElementById("stage");
  const desktop = document.getElementById("desktop");
  const reveal = () => {
    document.body.classList.remove("booting");
    desktop.removeAttribute("aria-hidden");
    for (const k of ["transform", "filter", "borderRadius", "visibility"]) desktop.style[k] = "";
  };
  if (skip || matchMedia("(prefers-reduced-motion: reduce)").matches) { reveal(); stage.remove(); return Promise.resolve(); }

  return new Promise((resolve) => {
    const $ = (id) => document.getElementById(id);
    const [frame, cover, base, sheen, shadow, hint, ui] = ["lid-frame", "lid-cover", "lid-base", "cover-sheen", "lid-shadow", "pull-hint", "stage-ui"].map($);
    let VW = 0, VH = 0, P = 0, h = 0, ty0 = 0, lut = [], p = 0, busy = false, drag = null;

    // Haltung des Geräts bei Fortschritt p: Deckelwinkel, Kameraneigung, Zoom, Verschiebung
    const pose = (pp) => ({
      th: TH0 * (1 - pp), // p > 1 (Feder) lehnt den Deckel kurz nach hinten
      e: TILT * (1 - smooth(0.12, 0.95, pp)),
      s: ZOOM0 + (1 - ZOOM0) * smooth(0.3, 1, pp),
      ty: ty0 * (1 - smooth(0, 1, pp)),
    });
    const rotX = (y, z, deg) => { const a = deg * RAD, c = Math.cos(a), s = Math.sin(a); return [y * c - z * s, y * s + z * c]; };
    // Höhe der Deckel-Vorderkante im Fenster (und der Perspektivfaktor dort)
    const lip = (pp) => {
      const { th, e, s, ty } = pose(pp);
      let [y, z] = rotX(-VH, 0, -th);
      [y, z] = rotX(y, z, -e);
      const k = P / (P - z * s);
      return [VH + (y * s + ty + h) * k - h, k];
    };
    const layout = () => {
      VW = stage.clientWidth; VH = stage.clientHeight;
      P = 2.4 * Math.max(VW, VH); // Brennweite der Kamera
      h = VH * 0.5;                // Fluchtpunkt in Fenstermitte
      ty0 = 0;
      const [y0, k0] = lip(0);
      ty0 = (LIP_AT * VH - y0) / k0; // Ruhelage: Vorderkante bei 60 %
      lut = Array.from({ length: N + 1 }, (_, i) => lip(i / N)[0]);
      for (let i = 1; i <= N; i++) lut[i] = Math.min(lut[i], lut[i - 1]); // am Ende schwingt die Kante kurz über den Rand: Tabelle bleibt fallend
      stage.style.setProperty("--depth", VH + "px");
      apply(p);
    };
    // Gegenstück zu lip(): welcher Fortschritt gehört zu einer Höhe des Balkens?
    const pAtY = (y) => {
      if (y >= lut[0]) return -((y - lut[0]) / VH) * 0.4; // nach unten zäh
      if (y <= lut[N]) return 1;
      let lo = 0, hi = N;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (lut[mid] > y) lo = mid; else hi = mid; }
      return (lo + (lut[lo] - y) / (lut[lo] - lut[hi] || 1)) / N;
    };

    const apply = (pp) => {
      p = pp;
      const q = clamp(p);
      const { th, e, s, ty } = pose(Math.max(p, 0));
      const cam = `translate3d(0,${-h}px,0) perspective(${P}px) translate3d(0,${h + ty}px,0) scale3d(${s},${s},${s}) rotateX(${-e}deg)`;
      const lid = `${cam} rotateX(${-th}deg)`;
      desktop.style.transform = lid;
      frame.style.transform = lid;
      cover.style.transform = `${lid} rotateY(180deg)`;
      base.style.transform = `${cam} rotateX(90deg)`;
      // Bildschirm geht an: dunkel und unscharf, dann klar
      desktop.style.filter = `blur(${(26 * (1 - smooth(0.28, 0.96, q))).toFixed(2)}px) brightness(${(0.3 + 0.7 * smooth(0.25, 0.9, q)).toFixed(3)})`;
      desktop.style.borderRadius = `${(16 * (1 - smooth(0.75, 1, q))).toFixed(1)}px`;
      sheen.style.transform = `translate3d(${-70 + q * 140}%,0,0)`;
      shadow.style.opacity = String(1 - smooth(0.2, 0.8, q));
      hint.style.transform = `translate3d(-50%,${lip(Math.max(p, 0))[0] + 22}px,0)`;
      hint.style.opacity = String(1 - smooth(0, 0.1, q));
      ui.style.opacity = String(1 - smooth(0, 0.25, q)); // "Überspringen" soll das aufgehende Dock nicht verdecken
      desktop.style.visibility = "visible";
    };

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
      await animate(p, 1, { ...opts, onUpdate: apply });
      apply(1);
      finish();
    };
    const open = () => !busy && run({ duration: Math.max(0.6, 1.8 * (1 - clamp(p))), ease: [0.4, 0, 0.2, 1] });

    // Ziehen: die Vorderkante folgt dem Finger/der Maus 1:1 (egal wo man greift); beim Loslassen übernimmt eine Feder die Wischgeschwindigkeit
    stage.addEventListener("pointerdown", (e) => {
      if (busy || e.target.closest(".skip-btn")) return;
      drag = { y: e.clientY, y0: lip(Math.max(p, 0))[0], moved: false, last: p, lastT: performance.now(), v: 0 };
      stage.classList.add("drag");
      try { stage.setPointerCapture(e.pointerId); } catch {}
    });
    stage.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const dy = e.clientY - drag.y;
      if (Math.abs(dy) > 6) drag.moved = true;
      if (!drag.moved) return;
      const np = pAtY(drag.y0 + dy);
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
      if (p > 0.3 || vel > 1.3) return run({ type: "spring", stiffness: 70, damping: 13, velocity: vel });
      busy = true;
      animate(p, 0, { type: "spring", stiffness: 160, damping: 20, velocity: vel, onUpdate: apply }).then(() => { busy = false; });
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
    if (/[?&]debug\b/.test(location.search)) window.__intro = { set: (pp) => { busy = true; apply(pp); }, lut: () => lut, lip: (pp) => lip(pp)[0] };
  });
}
