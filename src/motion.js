// Motion (motion.dev, MIT, Version fest: vendor/motion-13.5.0.js) als einzige Animations-Bibliothek des Desktops.
// Federn, Staffelung, Hover und Druck kommen von hier; „Bewegung reduzieren“ springt alles sofort ans Ende.
const M = window.Motion;
if (!M) throw new Error("Motion fehlt: vendor/motion-13.5.0.js nicht geladen");

export const { animate, stagger, hover, press, springValue, motionValue } = M;
export const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const sync = () => { M.MotionGlobalConfig.skipAnimations = reduced.matches; };
sync();
reduced.addEventListener("change", sync);

/** Federn: kurz und straff für Bedienelemente, weicher für große Flächen */
export const SPRING = { type: "spring", stiffness: 420, damping: 32, mass: 0.9 };
export const SOFT = { type: "spring", stiffness: 190, damping: 24, mass: 1 };
export const POP = { type: "spring", stiffness: 520, damping: 26, mass: 0.8 };
export const EASE = [0.22, 1, 0.36, 1];

/** Karten und Symbole: heben sich beim Drüberfahren, drücken sich beim Klicken (Federn statt CSS-Übergang; hover() ignoriert Touch) */
export function lift(els, { y = -3, scale = 1.012, target } = {}) {
  const t = (el) => (target ? el.querySelector(target) : el);
  hover(els, (el) => { animate(t(el), { y, scale }, POP); return () => animate(t(el), { y: 0, scale: 1 }, POP); });
  press(els, (el) => { animate(t(el), { scale: scale * 0.95 }, POP); return () => animate(t(el), { scale }, POP); });
}

/** Elemente nacheinander einfedern */
export function reveal(els, { y = 16, gap = 0.045, start = 0.15 } = {}) {
  return animate(els, { opacity: [0, 1], y: [y, 0] }, { delay: stagger(gap, { startDelay: start }), type: "spring", stiffness: 300, damping: 28 });
}
