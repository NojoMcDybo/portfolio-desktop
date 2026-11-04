// Power-Level: Goldwert der eigenen Werte je Minute als gestapelte Flächen nach Gruppen (Angriffsschaden, Tempo und Krit, Leben, Resistenzen,
// Fähigkeitsstärke, Sonstiges); die Oberkante ist die eigene Stärke, gestrichelt die des Lane-Gegners. Gruppen in der Legende ein- und
// ausblenden (gilt für beide Linien), Ult-Stufen als R1–R3 oben, Zeigen liest eine Minute ab wie im Goldverlauf. Eigene Umsetzung mit erfundenen Kurven.
import { champName } from "./dd.js";
import { POWER_GROUPS } from "./world.js";
import { card, clock, el, kilo, load, save } from "./ui.js";

const W = 1000, H = 200, NS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const signed = (n) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${kilo(Math.abs(Math.round(n)))}`;
const hidden = new Set(load("power", { hidden: [] }).hidden);

export function powerCard(p) {
  const { me, opp } = p;
  const maxT = Math.max(p.dur, 1);
  const total = (line, i) => line.frames[i].gold.reduce((a, v, k) => a + (hidden.has(POWER_GROUPS[k][0]) ? 0 : v), 0);
  const meta = el("span", "c-meta");
  const c = card("Power-Level", meta, "pf-power");

  const plot = svg("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", class: "gold-svg" });
  const areas = svg("g");
  const top = svg("path", { class: "pw-me", "vector-effect": "non-scaling-stroke" });
  const foe = svg("path", { class: "pw-opp", "vector-effect": "non-scaling-stroke" });
  plot.append(areas, foe, top);
  const scale = el("span", "gold-scale hi");
  const grid = el("div", "gold-grid"), axis = el("div", "gold-axis"), ults = el("div", "pw-ults");
  const cursor = el("div", "gold-cursor"), pill = el("div", "gold-pill pw-pill n-glass n-liquid");
  cursor.hidden = pill.hidden = true;
  const box = el("div", "gold-box");
  box.append(grid, plot, ults, cursor, pill, scale);
  const legend = el("div", "pw-legend");
  const root = el("div", "pw");
  root.append(legend, box, axis);

  const x = (t) => (t / maxT) * W;
  function draw() {
    const n = me.frames.length;
    const mine = me.frames.map((_, i) => total(me, i)), foes = opp.frames.map((_, i) => total(opp, i));
    const maxY = Math.max(1000, ...mine, ...foes) * 1.1, y = (v) => H - (v / maxY) * H;
    // gestapelt von unten nach oben, nur sichtbare Gruppen
    const base = Array(n).fill(0), paths = [];
    POWER_GROUPS.forEach(([key, , color], k) => {
      if (hidden.has(key)) return;
      const lo = base.slice();
      me.frames.forEach((f, i) => { base[i] += f.gold[k]; });
      const up = base.map((v, i) => `${i ? "L" : "M"}${x(me.frames[i].t).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
      const down = lo.map((_, i) => `L${x(me.frames[n - 1 - i].t).toFixed(1)} ${y(lo[n - 1 - i]).toFixed(1)}`).join(" ");
      const a = svg("path", { d: `${up} ${down} Z`, fill: color, "fill-opacity": 0.78 });
      paths.push(a);
    });
    areas.replaceChildren(...paths);
    top.setAttribute("d", mine.map((v, i) => `${i ? "L" : "M"}${x(me.frames[i].t).toFixed(1)} ${y(v).toFixed(1)}`).join(" "));
    foe.setAttribute("d", foes.map((v, i) => `${i ? "L" : "M"}${x(opp.frames[i].t).toFixed(1)} ${y(v).toFixed(1)}`).join(" "));
    scale.textContent = kilo(Math.round(maxY));
    // stärkste und schwächste Minute gegenüber dem Lane-Gegner
    let best = [0, -Infinity], worst = [0, Infinity];
    mine.forEach((v, i) => { const d = v - foes[i]; if (i > 1 && d > best[1]) best = [i, d]; if (i > 1 && d < worst[1]) worst = [i, d]; });
    meta.textContent = `stärkste Minute ${clock(best[0] * 60)} (${signed(best[1])}) · schwächste ${clock(worst[0] * 60)} (${signed(worst[1])})`;
    return { mine, foes };
  }
  let data = draw();

  for (const [key, label, color] of POWER_GROUPS) {
    const b = el("button", `pw-key${hidden.has(key) ? " off" : ""}`);
    b.type = "button";
    b.append(el("i", ""), el("span", "", label));
    b.firstChild.style.background = color;
    b.onclick = () => { hidden.has(key) ? hidden.delete(key) : hidden.add(key); save("power", { hidden: [...hidden] }); b.classList.toggle("off", hidden.has(key)); data = draw(); };
    legend.append(b);
  }
  legend.append(el("span", "pw-vs faint", `${champName(me.champion)} (durchgezogen) gegen ${champName(opp.champion)} (gestrichelt)`));
  me.ults.forEach((t, i) => { const s = el("span", "pw-ult", `R${i + 1}`); s.style.left = `${(t / maxT) * 100}%`; s.title = `Ult-Stufe ${i + 1} ab Minute ${t}`; ults.append(s); });
  const step = maxT > 30 ? 10 : 5;
  for (let t = step; t < maxT; t += step) { const s = el("span", "", String(t)); s.style.left = `${(t / maxT) * 100}%`; axis.append(s); const g = el("i", ""); g.style.left = s.style.left; grid.append(g); }

  box.addEventListener("pointermove", (e) => {
    const r = box.getBoundingClientRect();
    const i = Math.min(Math.max(Math.round(((e.clientX - r.left) / r.width) * maxT), 0), me.frames.length - 1);
    const fx = i / maxT, d = data.mine[i] - data.foes[i];
    cursor.hidden = pill.hidden = false;
    cursor.style.left = `${fx * 100}%`;
    pill.replaceChildren(el("b", "n-num", clock(i * 60)), el("span", `lead ${d >= 0 ? "blue" : "red"}`, `${signed(d)} gegen den Lane-Gegner`), el("span", "faint n-num", `${kilo(data.mine[i])} : ${kilo(data.foes[i])}`));
    const pw = pill.offsetWidth || 190;
    pill.style.left = `${Math.min(Math.max(fx * r.width - pw / 2, 4), r.width - pw - 4)}px`;
  });
  box.addEventListener("pointerleave", () => { cursor.hidden = pill.hidden = true; });

  c.append(root, el("p", "faint fine", "Jeder Wert deines Champions mit seinem Goldwert gewichtet, je Minute – hier erfundene Kurven. „Schwach“ heißt erst im Vergleich zum Lane-Gegner etwas."));
  return c;
}
