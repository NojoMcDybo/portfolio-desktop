// Eigene Symbole für Objectives, Gebäude und Wellen (einfache Vektoren, keine Spieldateien). `icon(key, cls)` liefert ein <span class="vi">;
// "blue"/"red" in cls färbt Gebäude und Monster in der Teamfarbe, die Drachen tragen ihre Elementfarbe.
import { DRAGON } from "./dd.js";

const svg = (body, vb = "0 0 24 24") => `<svg viewBox="${vb}" aria-hidden="true">${body}</svg>`;
const fill = (d, extra = "") => `<path d="${d}" fill="currentColor" ${extra}/>`;
const gem = (c) => svg(`<path d="M12 2.5 20 9 12 21.5 4 9z" fill="${c}" stroke="#07090d" stroke-width="1.2" stroke-linejoin="round"/><path d="M4 9h16M12 2.5 9 9l3 12.5L15 9z" fill="none" stroke="#07090d" stroke-opacity=".45" stroke-width="1"/>`);

const SHAPES = {
  tower: svg(fill("M7 21V10H5V4h3v2h2V4h4v2h2V4h3v6h-2v11zm3-6v6h4v-6a2 2 0 0 0-4 0z", 'fill-rule="evenodd"')),
  inhib: svg(fill("M12 2 18.5 8 16 22H8L5.5 8zM12 6 9.5 9 11 18h2l1.5-9z", 'fill-rule="evenodd"')),
  nexus: svg(fill("M12 2l3 5 5-1-1 5 3 3-5 2-1 6-4-4-4 4-1-6-5-2 3-3-1-5 5 1z")),
  baron: svg(fill("M12 3c-4 0-8 3-9 8 2-1 3-2 4-4 1 3 3 4 5 4s4-1 5-4c1 2 2 3 4 4-1-5-5-8-9-8zm-5 13 2 5 3-2 3 2 2-5-5 2z")),
  herald: svg(fill("M12 4c-5 0-9 3-9 8h3l2 5 4-3 4 3 2-5h3c0-5-4-8-9-8zm-3 6a1.5 1.5 0 1 0 0 .01zm6 0a1.5 1.5 0 1 0 0 .01z", 'fill-rule="evenodd"')),
  grubs: svg(fill("M4 12c0-4 3-6 6-6s5 2 5 4c2 0 5 1 5 4s-3 4-6 4H9c-3 0-5-2-5-6z")),
  kills: svg('<path d="M5 19 17 7m0 0h-4m4 0v4M19 19 7 7m0 0h4M7 7v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),
  death: svg(fill("M12 3c-4.4 0-8 3.1-8 7.5 0 2.4 1 4.3 3 5.5V20h3v-2h4v2h3v-4c2-1.2 3-3.100 3-5.500C20 6.100 16.400 3 12 3zM8.500 12a1.700 1.700 0 1 1 0 .01zm7 0a1.700 1.700 0 1 1 0 .01z", 'fill-rule="evenodd"')),
  gold: svg('<circle cx="12" cy="12" r="8" fill="currentColor"/><circle cx="12" cy="12" r="5.200" fill="none" stroke="#07090d" stroke-opacity=".5" stroke-width="1.400"/>'),
  ward: svg('<path d="M2.500 12S6 5.500 12 5.500 21.500 12 21.500 12 18 18.500 12 18.500 2.500 12 2.500 12z" fill="none" stroke="currentColor" stroke-width="1.800"/><circle cx="12" cy="12" r="3" fill="currentColor"/>'),
  wave: svg('<circle cx="12" cy="12" r="7.500" fill="currentColor"/>'),
  dragon: gem("#c8a27a"),
};
for (const [k, d] of Object.entries(DRAGON)) SHAPES[`dragon-${k}`] = gem(d.color);

const OWN = { baron: "#b48cff", herald: "#c9a2ff", grubs: "#a58cff" };

/** Drachenart (infernal, ocean …) -> Symbolschlüssel */
export const dragonIcon = (kind) => (SHAPES[`dragon-${kind}`] ? `dragon-${kind}` : "dragon");

export function icon(key, cls = "", title = "") {
  const s = document.createElement("span");
  s.className = `vi ${key} ${cls}`.trim();
  if (title) s.title = title;
  s.classList.add("svg");
  s.innerHTML = SHAPES[key] ?? "";
  if (!/\b(blue|red|gold)\b/.test(cls) && OWN[key]) s.style.color = OWN[key];
  return s;
}
