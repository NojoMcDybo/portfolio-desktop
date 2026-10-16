// Fensterverwaltung: öffnen, verschieben, Größe ändern, maximieren, minimieren, schließen.
// Programmfenster (mode "app") sind rahmenlos wie die echten Tauri-Fenster: Ziehen, Minimieren und Schließen kommen aus dem
// Programm selbst (shim/tauri-shim.js leitet sie per postMessage an hier weiter). Lernseiten (mode "bar") bekommen eine Leiste.
import { I } from "./icons.js";

const MENUBAR = 30;
const DOCK_GAP = 104; // so viel Platz unten lassen (Dock + Rand)
const isSmall = () => innerWidth <= 760;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function h(tag, cls = "", html = "") {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export class WM {
  constructor(layer) {
    this.layer = layer;
    this.wins = new Map();
    this.z = 20;
    this.subs = {};
    this.dockRect = () => null;
    addEventListener("message", (e) => this.#message(e));
    addEventListener("resize", () => this.#refit());
  }

  on(name, fn) { (this.subs[name] ??= []).push(fn); }
  #emit(name, ...a) { (this.subs[name] ?? []).forEach((f) => f(...a)); }
  get(key) { return this.wins.get(key); }
  all() { return [...this.wins.values()]; }
  area() { return { x: 0, y: MENUBAR, w: innerWidth, h: Math.max(240, innerHeight - MENUBAR - DOCK_GAP) }; }

  /** spec: { key, title, mode: "app"|"bar", icon, src, size:[w,h], min:[w,h], bg, footer:Element, build(body, win), sandbox, appId } */
  open(spec) {
    const ex = this.wins.get(spec.key);
    if (ex) { ex.min ? this.restore(ex) : this.focus(ex); return ex; }

    const el = h("section", "win opening");
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", spec.title);
    el.style.setProperty("--bg", spec.bg || "var(--n-bg)");
    const body = h("div", "win-body");
    const win = { key: spec.key, spec, el, body, frame: null, x: 0, y: 0, w: 0, h: 0, max: false, min: false, prev: null, title: spec.title };

    if (spec.mode === "bar") {
      const bar = h("div", "win-bar");
      const lead = h("div", "lead");
      if (spec.icon) lead.append(Object.assign(h("img"), { src: spec.icon, width: 18, height: 18, alt: "" }));
      lead.firstChild && (lead.firstChild.style.borderRadius = "5px");
      const title = h("div", "title"); title.textContent = spec.title;
      const wc = h("div", "wc");
      wc.innerHTML = `<button class="m" aria-label="Minimieren" title="Minimieren">${I.min}</button><button class="z" aria-label="Maximieren" title="Maximieren">${I.max}</button><button class="x" aria-label="Schließen" title="Schließen">${I.close}</button>`;
      bar.append(lead, title, wc);
      el.append(bar);
      wc.querySelector(".m").onclick = () => this.minimize(win);
      wc.querySelector(".z").onclick = () => this.toggleMax(win);
      wc.querySelector(".x").onclick = () => this.close(win);
      bar.addEventListener("dblclick", (e) => { if (!e.target.closest(".wc")) this.toggleMax(win); });
    }

    el.append(body);
    const foot = typeof spec.footer === "function" ? spec.footer(win) : spec.footer;
    if (foot) el.append(foot);

    const loader = h("div", "win-load", "<span></span>");
    if (spec.src) {
      const f = h("iframe", "win-frame");
      f.title = spec.title;
      f.loading = "eager";
      f.setAttribute("allow", "fullscreen; autoplay; clipboard-write");
      if (spec.sandbox) f.setAttribute("sandbox", "allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-downloads allow-modals allow-presentation");
      f.referrerPolicy = "no-referrer";
      f.addEventListener("load", () => loader.classList.add("done"));
      f.src = spec.src;
      win.frame = f;
      body.append(f, loader);
      setTimeout(() => loader.classList.add("done"), 6000);
      if (!spec.sandbox) this.#observeScale(win);
    }
    spec.build?.(body, win);

    const curtain = h("div", "win-curtain");
    body.append(curtain);
    win.curtain = curtain;
    for (const d of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
      const g = h("i", `rz ${d}`);
      this.#resize(win, g, d);
      el.append(g);
    }
    el.addEventListener("pointerdown", () => this.focus(win), true);
    this.#barDrag(win, el);

    // Größe und Lage: Mitte, leicht versetzt, nie größer als die freie Fläche
    const a = this.area();
    const [sw, sh] = spec.size || [900, 640];
    win.w = Math.min(sw, a.w - 24);
    win.h = Math.min(sh + (spec.pad ?? 40), a.h - 6); // +40: Fußzeile/Leiste
    const n = this.wins.size % 6;
    win.x = clamp(Math.round((a.w - win.w) / 2 + (n - 2) * 26), 8, Math.max(8, a.w - win.w - 8));
    win.y = Math.round(a.y + Math.max(8, (a.h - win.h) / 2 + (n - 2) * 20));
    this.wins.set(spec.key, win);
    this.layer.append(el);
    this.#apply(win);
    el.addEventListener("animationend", () => el.classList.remove("opening"), { once: true });
    this.focus(win);
    this.#emit("change");
    return win;
  }

  // Kleine Bildschirme: Programme sind für Fenster ab ca. 900 px gebaut. Statt sie zu quetschen, zeigt das Fenster sie verkleinert.
  #observeScale(w) {
    const fit = () => {
      const f = w.frame;
      if (!isSmall()) { f.removeAttribute("style"); return; }
      const BW = 900, s = Math.min(1, w.body.clientWidth / BW);
      Object.assign(f.style, { width: BW + "px", height: w.body.clientHeight / s + "px", right: "auto", bottom: "auto", transformOrigin: "0 0", transform: `scale(${s})` });
    };
    new ResizeObserver(fit).observe(w.body);
  }

  #apply(w) {
    w.el.style.translate = `${w.x}px ${w.y}px`;
    w.el.style.width = w.w + "px";
    w.el.style.height = w.h + "px";
  }

  focus(w) {
    if (this.front === w && !w.min) return;
    this.front = w;
    w.el.style.zIndex = ++this.z;
    for (const o of this.wins.values()) {
      const on = o === w;
      o.el.classList.toggle("focused", on);
      o.curtain.classList.toggle("on", !on);
    }
    this.#emit("focus", w);
  }

  #refit() {
    for (const w of this.wins.values()) {
      if (w.max) { Object.assign(w, this.#maxRect()); }
      else {
        const a = this.area();
        w.w = Math.min(w.w, a.w - 8); w.h = Math.min(w.h, a.h);
        w.x = clamp(w.x, -(w.w - 140), a.w - 140);
        w.y = clamp(w.y, MENUBAR, Math.max(MENUBAR, innerHeight - 80));
      }
      this.#apply(w);
    }
  }

  #maxRect() { const a = this.area(); return { x: 0, y: a.y, w: a.w, h: a.h + 16 }; }

  #anim(w) { w.el.style.transition = "translate .38s var(--n-ease), width .38s var(--n-ease), height .38s var(--n-ease)"; setTimeout(() => (w.el.style.transition = ""), 420); }

  toggleMax(w) {
    this.#anim(w);
    if (w.max) { Object.assign(w, w.prev); w.max = false; w.prev = null; }
    else { w.prev = { x: w.x, y: w.y, w: w.w, h: w.h }; Object.assign(w, this.#maxRect()); w.max = true; }
    w.el.classList.toggle("max", w.max);
    const z = w.el.querySelector(".wc .z");
    if (z) z.innerHTML = w.max ? I.restore : I.max;
    this.#apply(w);
  }

  minimize(w) {
    if (w.min) return;
    w.min = true;
    const t = this.dockRect(w.key);
    const dx = t ? t.x + t.width / 2 - (w.x + w.w / 2) : 0;
    const dy = t ? t.y + t.height / 2 - (w.y + w.h / 2) : 200;
    const anim = w.el.animate([{ transform: "none", opacity: 1 }, { transform: `translate(${dx}px,${dy}px) scale(.08)`, opacity: 0 }], { duration: 420, easing: "cubic-bezier(.5,0,.75,.4)" });
    anim.onfinish = () => { if (!w.min) return; w.el.hidden = true; w.el.style.display = "none"; };
    if (this.front === w) { this.front = null; this.#emit("focus", null); }
    this.#emit("change");
  }

  restore(w) {
    if (!w.min) return this.focus(w);
    w.min = false;
    w.el.hidden = false; w.el.style.display = "";
    const t = this.dockRect(w.key);
    const dx = t ? t.x + t.width / 2 - (w.x + w.w / 2) : 0;
    const dy = t ? t.y + t.height / 2 - (w.y + w.h / 2) : 200;
    w.el.animate([{ transform: `translate(${dx}px,${dy}px) scale(.08)`, opacity: 0 }, { transform: "none", opacity: 1 }], { duration: 520, easing: "cubic-bezier(.22,1.1,.36,1)" });
    this.focus(w);
    this.#emit("change");
  }

  close(w) {
    if (!this.wins.has(w.key)) return;
    this.wins.delete(w.key);
    w.spec.cleanup?.(w);
    w.spec.onClose?.(w);
    const a = w.el.animate([{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.94)" }], { duration: 170, easing: "ease-in" });
    a.onfinish = () => { if (w.frame) w.frame.src = "about:blank"; w.el.remove(); };
    if (this.front === w) { this.front = null; this.#emit("focus", null); }
    this.#emit("change");
  }

  closeAll() { this.all().forEach((w) => this.close(w)); }
  minimizeAll() { this.all().forEach((w) => this.minimize(w)); }

  // ---- Ziehen ----
  #move(w, x, y) {
    if (w.max) return;
    const a = this.area();
    w.x = clamp(x, -(w.w - 140), innerWidth - 140);
    w.y = clamp(y, MENUBAR, innerHeight - 70);
    w.el.style.translate = `${w.x}px ${w.y}px`;
    void a;
    this.#emit("move", w);
  }

  /** Lage von außen setzen (z. B. Andocken), ohne Ereignisse auszulösen */
  setRect(w, r) { Object.assign(w, r); this.#apply(w); }

  #barDrag(w, root) {
    root.addEventListener("pointerdown", (e) => {
      const bar = e.target.closest(".win-bar, [data-drag]");
      if (!bar || e.button !== 0 || e.target.closest(".wc, button, a, input, textarea, select") || isSmall()) return;
      let sx = e.clientX, sy = e.clientY, ox = w.x, oy = w.y;
      let moved = false;
      try { bar.setPointerCapture(e.pointerId); } catch {}
      const mv = (ev) => {
        if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 4) return;
        if (!moved) {
          moved = true;
          document.body.classList.add("dragging");
          // aus „maximiert“ heraus ziehen: Größe zurück, Fenster hängt unter der Maus
          if (w.max) {
            const ratio = (sx - w.x) / w.w;
            Object.assign(w, w.prev); w.max = false; w.prev = null; w.el.classList.remove("max");
            const z = w.el.querySelector(".wc .z"); if (z) z.innerHTML = I.max;
            w.x = ev.clientX - w.w * ratio; w.y = MENUBAR;
            this.#apply(w);
            sx = ev.clientX; sy = ev.clientY; ox = w.x; oy = w.y;
          }
        }
        this.#move(w, ox + ev.clientX - sx, oy + ev.clientY - sy);
      };
      const up = () => { document.body.classList.remove("dragging"); this.#emit("moveend", w); bar.removeEventListener("pointermove", mv); bar.removeEventListener("pointerup", up); bar.removeEventListener("pointercancel", up); };
      bar.addEventListener("pointermove", mv);
      bar.addEventListener("pointerup", up);
      bar.addEventListener("pointercancel", up);
    });
  }

  // ---- Größe ändern ----
  #resize(w, g, dir) {
    g.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || w.max) return;
      e.preventDefault();
      try { g.setPointerCapture(e.pointerId); } catch {}
      document.body.classList.add("dragging");
      const sx = e.clientX, sy = e.clientY, o = { x: w.x, y: w.y, w: w.w, h: w.h };
      const [mw, mh] = w.spec.min || [420, 300];
      const mv = (ev) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        let { x, y, w: ww, h: hh } = o;
        if (dir.includes("e")) ww = Math.max(mw, o.w + dx);
        if (dir.includes("s")) hh = Math.max(mh, o.h + dy);
        if (dir.includes("w")) { ww = Math.max(mw, o.w - dx); x = o.x + (o.w - ww); }
        if (dir.includes("n")) { hh = Math.max(mh, o.h - dy); y = o.y + (o.h - hh); }
        Object.assign(w, { x, y: Math.max(MENUBAR, y), w: ww, h: hh });
        this.#apply(w);
        this.#emit("move", w);
      };
      const up = () => { document.body.classList.remove("dragging"); this.#emit("moveend", w); g.removeEventListener("pointermove", mv); g.removeEventListener("pointerup", up); g.removeEventListener("pointercancel", up); };
      g.addEventListener("pointermove", mv);
      g.addEventListener("pointerup", up);
      g.addEventListener("pointercancel", up);
    });
  }

  // ---- Nachrichten aus den eingebetteten Programmen ----
  #message(e) {
    if (e.origin !== location.origin) return;
    const d = e.data;
    if (!d || d.portfolio !== 1) return;
    const w = this.all().find((x) => x.frame && x.frame.contentWindow === e.source);
    if (d.type === "bus") return this.#emit("bus", d.name, d.data, w);
    if (!w) return;
    switch (d.type) {
      case "ready": w.el.querySelector(".win-load")?.classList.add("done"); break;
      case "focus": this.focus(w); break;
      case "title": w.title = d.title; break;
      case "win":
        switch (d.action) {
          case "close": this.close(w); break;
          case "minimize": this.minimize(w); break;
          case "toggleMax": this.toggleMax(w); break;
          case "dragStart": this.focus(w); w.drag = { x: w.x, y: w.y }; document.body.classList.add("dragging"); break;
          case "dragMove": if (w.drag) this.#move(w, w.drag.x + d.dx, w.drag.y + d.dy); break;
          case "dragEnd": w.drag = null; document.body.classList.remove("dragging"); this.#emit("moveend", w); break;
        }
        break;
    }
  }
}
