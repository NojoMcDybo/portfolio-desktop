// Kleine Helfer für alle Ansichten (eigene Umsetzung, Aufbau wie in der echten App).

export const q = (s, root = document) => root.querySelector(s);

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = String(text);
  return e;
}

/** Bild, das bei Fehler verschwindet (oder einem Kürzel Platz macht) */
export function img(src, cls = "", alt = "", fallback = "") {
  const box = el("span", `img ${cls}`.trim());
  if (alt) box.title = alt;
  if (!src) { box.classList.add("mono"); box.textContent = fallback; return box; }
  const i = new Image();
  i.alt = "";
  i.draggable = false;
  i.loading = "lazy";
  i.decoding = "async";
  i.src = src;
  i.onerror = () => { i.remove(); box.classList.add("mono"); box.textContent = fallback; };
  box.append(i);
  return box;
}

export const faint = (text, cls = "faint pad") => el("p", cls, text);

export function card(eyebrow, meta, cls = "") {
  const c = el("section", `card n-card ${cls}`.trim());
  const h = el("div", "c-head");
  h.append(el("span", "n-eyebrow", eyebrow));
  if (meta) h.append(typeof meta === "string" ? el("span", "c-meta", meta) : meta);
  c.append(h);
  return c;
}

export const DAY = 86_400_000;
export const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
export const timeOf = (t) => new Date(t).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });

export function dayName(t) {
  const now = Date.now();
  if (sameDay(t, now)) return "Heute";
  if (sameDay(t, now + DAY)) return "Morgen";
  if (sameDay(t, now - DAY)) return "Gestern";
  return new Date(t).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });
}

/** „in 12 Min“, „in 3 Std 20 Min“, „in 2 Tagen“ */
export function countdown(t) {
  const d = t - Date.now();
  if (d <= 0) return "gleich";
  const min = Math.round(d / 60_000);
  if (min < 60) return `in ${min} Min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `in ${h} Std${min % 60 ? ` ${min % 60} Min` : ""}`;
  const days = Math.round(d / DAY);
  return days === 1 ? "morgen" : `in ${days} Tagen`;
}

/** Spielzeit in s -> „14:05“ */
export const clock = (s) => (s < 0 ? `-${clock(-s)}` : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`);
/** 12345 -> „12,3k“ */
export const kilo = (n) => (n >= 1000 ? `${(n / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1, minimumFractionDigits: 1 })}k` : String(n));
export const pct = (x) => `${Math.round(x * 100)} %`;
export const nf = (n) => n.toLocaleString("de-DE");

/** lokale Einstellungen; Speicher kann fehlen (privater Modus, Vorschau) */
export function load(key, fallback) {
  try { const raw = localStorage.getItem(`portfolio.vantage.${key}`); return raw ? { ...fallback, ...JSON.parse(raw) } : fallback; } catch { return fallback; }
}
export function save(key, value) {
  try { localStorage.setItem(`portfolio.vantage.${key}`, JSON.stringify(value)); } catch { /* ohne Speicher */ }
}

/** Seitenblatt rechts (Einstellungen, Aufnahme-Menü): Titel und Inhalt; Esc oder Klick daneben schließt */
export function openSheet(title, nodes, wide = false) {
  q(".sheet").classList.toggle("wide", wide);
  q(".sheet-title").textContent = title;
  q(".sheet-body").replaceChildren(...nodes);
  const bd = q(".backdrop");
  bd.hidden = false;
  requestAnimationFrame(() => bd.classList.add("show"));
}
export function closeSheet() {
  const bd = q(".backdrop");
  if (bd.hidden) return;
  bd.classList.remove("show");
  setTimeout(() => (bd.hidden = true), 250);
}

/** kurze Meldung unten in der Mitte (Glas), verschwindet nach ein paar Sekunden */
export function toast(text, kind = "ok") {
  let box = document.querySelector(".toasts");
  if (!box) { box = el("div", "toasts"); document.body.append(box); }
  const t = el("div", `toast n-glass n-liquid ${kind}`, text);
  box.append(t);
  setTimeout(() => t.classList.add("out"), 4200);
  setTimeout(() => t.remove(), 4700);
}

/** Waagrechte Leiste mit der Maus ziehen (mit Schwung) und mit dem Mausrad blättern; ein Klick bleibt ein Klick (erst ab 6 px wird gezogen) */
export function dragScroll(box) {
  let startX = 0, startLeft = 0, lastX = 0, lastT = 0, v = 0, id = -1, dragging = false, glide = 0;
  const stop = () => cancelAnimationFrame(glide);
  box.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.pointerType === "touch") return;
    stop(); id = e.pointerId; startX = lastX = e.clientX; startLeft = box.scrollLeft; lastT = performance.now(); v = 0; dragging = false;
  });
  box.addEventListener("pointermove", (e) => {
    if (e.pointerId !== id) return;
    const dx = e.clientX - startX;
    if (!dragging && Math.abs(dx) > 6) { dragging = true; try { box.setPointerCapture(id); } catch {} box.classList.add("dragging"); }
    if (!dragging) return;
    box.scrollLeft = startLeft - dx;
    const now = performance.now(), dt = Math.max(1, now - lastT);
    v = 0.8 * ((lastX - e.clientX) / dt) + 0.2 * v; lastX = e.clientX; lastT = now;
  });
  const up = (e) => {
    if (e.pointerId !== id) return;
    id = -1;
    if (!dragging) return;
    box.classList.remove("dragging");
    box.addEventListener("click", (c) => { c.stopPropagation(); c.preventDefault(); }, { capture: true, once: true });
    setTimeout(() => (dragging = false), 0);
    let last = performance.now();
    const step = (now) => { const dt = now - last; last = now; box.scrollLeft += v * dt; v *= Math.pow(0.94, dt / 16); if (Math.abs(v) > 0.02) glide = requestAnimationFrame(step); };
    if (performance.now() - lastT < 80) glide = requestAnimationFrame(step);
  };
  box.addEventListener("pointerup", up);
  box.addEventListener("pointercancel", up);
  box.addEventListener("wheel", (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || box.scrollWidth <= box.clientWidth) return;
    e.preventDefault(); stop(); box.scrollBy({ left: e.deltaY, behavior: "smooth" });
  }, { passive: false });
}

/** Kinder eines Containers durch neue ersetzen; Elemente mit data-keep und gleichem data-key bleiben bestehen (z. B. Diagramme mit eigenem Zustand) */
export function morph(host, nodes) {
  const keep = new Map([...host.children].filter((c) => c.dataset.keep != null && c.dataset.key).map((c) => [c.dataset.key, c]));
  host.replaceChildren(...nodes.map((n) => (n.dataset?.keep != null && keep.has(n.dataset.key) ? keep.get(n.dataset.key) : n)));
}
