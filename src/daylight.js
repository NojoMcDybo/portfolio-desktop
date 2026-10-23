// Tageslicht: Sonnen- und Mondstand aus Datum und Uhrzeit, daraus die Farben von Himmel und Licht.
// Reine Rechnung ohne Browserbezug (siehe tools/test-daylight.mjs). Breite: Mitteleuropa; Mittag liegt bei 12 Uhr Sonnenzeit,
// die Sommerzeit wird abgezogen. Das Bild schaut nach Süden: Osten ist links, Westen rechts.
const R = Math.PI / 180;
const LAT = 51 * R;
const SYN = 29.530588853; // Tage von Neumond zu Neumond
const NEW0 = Date.UTC(2000, 0, 6, 18, 14) / 864e5; // ein bekannter Neumond

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const mixv = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

const dayOfYear = (d) => Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5);
const dst = (d) => d.getTimezoneOffset() < Math.max(new Date(d.getFullYear(), 0, 1).getTimezoneOffset(), new Date(d.getFullYear(), 6, 1).getTimezoneOffset());

/** Stand eines Himmelskörpers: el = Höhe über dem Horizont, az = Richtung von Süden nach Westen (beides im Bogenmaß) */
function position(H, dec) {
  const sinEl = Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(H);
  return { el: Math.asin(clamp(sinEl, -1, 1)), az: Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(LAT) - Math.tan(dec) * Math.cos(LAT)) };
}

/** Sonne, Mond und Länge des Tages zu einem Zeitpunkt */
export function sky(d) {
  const hours = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600 + d.getMilliseconds() / 36e5;
  const dec = -23.44 * R * Math.cos(((2 * Math.PI) / 365) * (dayOfYear(d) + 10));
  const H = (hours - (dst(d) ? 1 : 0) - 12) * 15 * R;
  const sun = position(H, dec);
  const half = Math.acos(clamp(-Math.tan(LAT) * Math.tan(dec), -1, 1)) / R / 15; // halbe Tageslänge in Stunden
  // Mond: bleibt gegenüber der Sonne um die Elongation zurück; Deklination wandert mit ihr von gleich (Neumond) zu gegenüber (Vollmond)
  const elong = ((((d.getTime() / 864e5 - NEW0) % SYN) + SYN) % SYN) / SYN * 2 * Math.PI;
  const moon = position(H - elong, dec * Math.cos(elong));
  return { sun, moon, elong, half, hours: hours - (dst(d) ? 1 : 0) };
}

/** Zeitpunkt (am Tag von d) für eine Stimmung; jahreszeitlich passend, die Sonnenzeit wird zurück in die Uhrzeit gerechnet */
export function presetDate(name, d) {
  const half = sky(d).half;
  const x = { morgen: 12 - half + 0.6, mittag: 12, abend: 12 + half - 0.7, daemmerung: 12 + half + 0.55, nacht: 0.5 }[name] + (dst(d) ? 1 : 0);
  const t = new Date(d);
  t.setHours(Math.floor(x), Math.round((x % 1) * 60), 0, 0);
  return t;
}

// Himmel nach Sonnenhöhe in Grad: Zenit, Horizont, Sonnenfarbe
const KEYS = [
  [-18, [0.030, 0.050, 0.130], [0.090, 0.120, 0.260], [1.0, 0.5, 0.3]],
  [-10, [0.050, 0.070, 0.170], [0.220, 0.150, 0.320], [1.0, 0.45, 0.25]],
  [-4, [0.090, 0.130, 0.320], [0.620, 0.330, 0.380], [1.0, 0.42, 0.20]],
  [1, [0.200, 0.300, 0.580], [0.980, 0.520, 0.250], [1.0, 0.50, 0.22]],
  [7, [0.320, 0.520, 0.820], [1.000, 0.740, 0.460], [1.0, 0.70, 0.40]],
  [20, [0.280, 0.550, 0.920], [0.780, 0.880, 0.980], [1.0, 0.88, 0.70]],
  [50, [0.200, 0.480, 0.950], [0.680, 0.840, 1.000], [1.0, 0.96, 0.88]],
];

/**
 * Alle Größen, die die Szene braucht (Farben als [r,g,b] 0..1, Richtungen als Einheitsvektoren: x rechts, y oben, z vom Betrachter weg).
 * Bildposition von Sonne und Mond in "halben Bildhöhen": x aus der Himmelsrichtung, y aus der Höhe.
 */
export function light(d, A = 1.78) {
  const s = sky(d), el = s.sun.el / R, ml = s.moon.el / R;
  let i = 1;
  while (i < KEYS.length - 1 && el > KEYS[i][0]) i++;
  const a = KEYS[i - 1], b = KEYS[i], t = clamp((el - a[0]) / (b[0] - a[0]), 0, 1);
  let zen = mixv(a[1], b[1], t), hor = mixv(a[2], b[2], t), sunCol = mixv(a[3], b[3], t);
  if (s.hours < 12) hor = mixv(hor, [0.95, 0.60, 0.72], 0.22 * smooth(-8, 2, el) * (1 - smooth(8, 22, el))); // Morgen: etwas rosiger als der Abend

  const sunI = smooth(-4, 12, el);
  const illum = (1 - Math.cos(s.elong)) / 2;
  const moonI = smooth(-2, 8, ml) * illum * (1 - sunI * 0.92);
  const dir = (p) => [Math.sin(p.az) * Math.cos(p.el), Math.sin(p.el), Math.cos(p.az) * Math.cos(p.el)];
  const sd = dir(s.sun), md = dir(s.moon);
  // Hauptlicht: Sonne, nachts der Mond
  const kd = [sd[0] * sunI + md[0] * moonI, sd[1] * sunI + md[1] * moonI + 0.001, sd[2] * sunI + md[2] * moonI + 0.001];
  const kl = Math.hypot(...kd);
  const scr = (p) => [clamp(p.az / (100 * R), -1.6, 1.6) * A * 0.95, -0.25 + (p.el / R) * 0.0365]; // Herbstmittag (26°) steht in der Gabelung des Baums
  const day = smooth(-6, 14, el);
  return {
    el, ml, sunI, moonI, hours: s.hours, elong: s.elong, half: s.half,
    zen, hor, sunCol,
    amb: mixv([0.20, 0.27, 0.50], mixv(zen, [0.55, 0.62, 0.78], 0.55), day).map((v) => v * mix(0.9, 0.85, day)),
    key: mixv([0.45, 0.58, 1.0], sunCol, sunI).map((v) => v * Math.max(sunI * (0.95 + 0.55 * (1 - smooth(5, 30, el))), moonI * 1.0)), // tief stehende Sonne leuchtet kräftiger
    keyDir: kd.map((v) => v / kl),
    fog: mixv(zen, hor, 0.7).map((v) => v * 0.9),
    stars: smooth(-6, -16, el),
    sunScr: scr(s.sun), moonScr: scr(s.moon),
    moonLit: [Math.sin(s.elong), 0, Math.cos(s.elong)], // Richtung zum Licht, von der Mondscheibe aus gesehen (Neumond: von hinten, Vollmond: von vorn)
    clouds: 0.2 + 0.4 * ((((Math.sin(dayOfYear(d) * 12.9898) * 43758.5453) % 1) + 1) % 1), // Bewölkung: für jeden Tag ein fester Wert
  };
}
