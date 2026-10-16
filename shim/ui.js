// Kleine Bausteine für die von Hand geschriebenen Nachbauten (Vantage, Notch-Fenster): Fensterknöpfe als Glaspille,
// gleitende Segmente, Helfer. Die gebauten Programme (Arena, Kursbuch, …) bringen nojo-ui.ts selbst mit.
const invoke = (c) => window.__TAURI_INTERNALS__?.invoke(c, { label: "main" });
const ico = {
  min: '<path d="M6 12h12"/>',
  max: '<rect x="6.5" y="6.5" width="11" height="11" rx="2.2"/>',
  close: '<path d="m7 7 10 10M17 7 7 17"/>',
};
const svg = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;

export function windowControls() {
  const w = document.createElement("div");
  w.className = "n-wc n-glass";
  w.innerHTML = `<button class="n-ico sm" data-c="minimize" aria-label="Minimieren" title="Minimieren">${svg(ico.min)}</button><button class="n-ico sm" data-c="toggle_maximize" aria-label="Maximieren" title="Maximieren">${svg(ico.max)}</button><button class="n-ico sm danger" data-c="close" aria-label="Schließen" title="Schließen">${svg(ico.close)}</button>`;
  w.addEventListener("click", (e) => { const c = e.target.closest("[data-c]")?.dataset.c; if (c) invoke("plugin:window|" + c); });
  document.body.append(w);
  return w;
}

/** Segmente mit gleitender Glasperle (wie nojo-ui segments()) */
export function segments(root, onPick) {
  const thumb = document.createElement("i");
  thumb.className = "n-seg-thumb";
  root.prepend(thumb);
  const M = window.Motion;
  const place = (animateIt) => {
    const b = root.querySelector("button.active");
    if (!b) return;
    // Perle gleitet auf einer Feder und wird dabei flacher wie ein Tropfen (Motion); ohne Motion springt sie
    thumb.style.transition = "none";
    thumb.style.left = "0";
    thumb.style.width = b.offsetWidth + "px";
    if (animateIt && M) {
      M.animate(thumb, { x: b.offsetLeft }, { type: "spring", stiffness: 430, damping: 30 });
      M.animate(thumb, { scaleY: [1, 0.78, 1], scaleX: [1, 1.05, 1] }, { duration: 0.38, ease: "easeInOut" });
    } else thumb.style.transform = `translateX(${b.offsetLeft}px)`;
  };
  root.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b || !root.contains(b)) return;
    root.querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    place(true);
    onPick?.(b);
  });
  requestAnimationFrame(() => place(false));
  addEventListener("resize", () => place(false));
  return { refresh: () => place(false) };
}

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const h = (tag, cls = "", html = "") => { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; };
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
export const rng = (seed) => { let s = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
export const bus = (name, data) => window.__PORTFOLIO__?.bus(name, data);
