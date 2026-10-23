// QHD-Bühne: Der Desktop ist ein Bildschirm mit 2560 Pixeln Breite (QHD, 2560 × 1440) und wird auf jede Fenstergröße so skaliert, dass
// Symbole, Fenster und Schrift immer gleich proportioniert sind wie auf einem QHD-Monitor. Schrift und Bilder werden erst am Ende in
// Gerätepixeln gezeichnet, nicht vorher kleingerechnet – das Bild ist also auf jedem Bildschirm scharf.
// Der Desktop (#desktop) bekommt dafür die Größe der Bühne (z. B. 2560 × 1300) und wird mit scale() auf das Fenster gezogen; die Höhe
// ergibt sich aus dem Fenster, es gibt keine schwarzen Ränder. Auf schmalen Bildschirmen (bis 760 px) bleibt es beim bisherigen
// Handy-Aufbau ohne Skalierung. Zeigerpositionen (clientX/Y) und getBoundingClientRect() sind in Fensterpixeln: durch S.k teilen.
const QHD = 2560;
const K_MIN = 0.72; // darunter wäre die Schrift auf kleinen Bildschirmen nicht mehr lesbar
const K_MAX = 1.6;

const desktop = document.getElementById("desktop");
export const S = { k: 1, w: innerWidth, h: innerHeight, small: false };

function fit() {
  const small = innerWidth <= 760;
  const k = small ? 1 : Math.min(K_MAX, Math.max(K_MIN, innerWidth / QHD));
  Object.assign(S, { k, w: innerWidth / k, h: innerHeight / k, small });
  const st = desktop.style;
  if (k === 1) { st.width = st.height = st.transform = st.transformOrigin = ""; }
  else { st.width = S.w + "px"; st.height = S.h + "px"; st.transformOrigin = "0 0"; st.transform = `scale(${k})`; }
  // 1 vw / 1 vh der Bühne (die echten vw/vh gelten für das Fenster, nicht für die Bühne)
  st.setProperty("--vw", S.w / 100 + "px");
  st.setProperty("--vh", S.h / 100 + "px");
}
fit();
addEventListener("resize", fit);

/** Fensterpixel -> Bühnenpixel */
export const toStage = (v) => v / S.k;
