// GLSL des Hintergrunds (WebGL2). Alles wird zuletzt durch ditherCol() gedithert: Oberflächen-stabiles Fraktal-Dithering nach dem
// Verfahren von Rune Skovbo Johansen (github.com/runevision/Dither3D, MPL-2.0). Der Shader hier ist eine eigene Umsetzung des
// beschriebenen Verfahrens, kein übernommener Code: ein 3D-Muster aus Bayer-Punkten (je Schicht ein Punkt mehr), die Stufe (Zweierpotenz)
// wird aus der Punktgröße auf dem Bildschirm gewählt, so bleiben die Punkte an der Oberfläche haften und gleich groß.

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler3D;
uniform float uA, uHd, uSc, uTime, uWind, uPpu0;
uniform vec2 uHead;
const vec2 PIV = vec2(0., -.9);
float hash11(float p){ p = fract(p*.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p){ vec3 q = fract(vec3(p.xyx)*.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y)*q.z); }
vec2 hash22(vec2 p){ vec3 q = fract(vec3(p.xyx)*vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz)*q.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; for (int i = 0; i < 4; i++){ s += a*vnoise(p); p = p*2.03 + vec2(1.7, 9.2); a *= .5; } return s; }
`;

// ---------- Vertex-Teil: Wind und Fensterblick ----------
const VS_LIB = `
float gustAt(float x){ return pow(.5 + .5*sin(uTime*.37 - x*.9 + 1.7), 3.); }
// Wind weht nach rechts: gleichmäßiges Wiegen plus Böen, die über die Szene laufen
vec2 windDisp(vec3 P, float flex, float ph){
  float g = gustAt(P.x);
  float s = sin(uTime*1.05 + ph + P.x*1.3) + .45*sin(uTime*2.55 + ph*1.9 + P.y*1.7);
  float bend = uWind*flex*(.32*s + 1.05*g*(.65 + .35*s));
  return vec2(bend, -abs(bend)*.18);
}
// Szene um den Fußpunkt skalieren, dann den Blick durchs "Fenster" (Bildschirm bei z = 0) projizieren:
// f ist der Maßstab der Ebene auf dem Bildschirm, ferne Ebenen folgen dem Kopf, nahe laufen gegen ihn
vec4 project(vec3 P, out float f, out vec2 scr){
  P.xy = (P.xy - PIV)*uSc + PIV;
  f = uHd/max(uHd + P.z, .3);
  scr = uHead*(1. - f) + P.xy*f;
  return vec4(scr.x/uA, scr.y, clamp((P.z + 4.)/64., 0., 1.)*2. - 1., 1.);
}
float fogAt(float z){ return 1. - exp(-max(z, 0.)*.075); }
`;

// ---------- Fragment-Teil: Dithering ----------
const FS_LIB = `
uniform sampler3D uPat;
uniform sampler2D uRamp;
uniform float uDotPx, uSizeVar, uContrast, uLevels, uExp;
uniform vec3 uAmb, uKey, uL, uFog;
uniform vec2 uSunScr;
uniform float uSunI;

// Schwarz-weiß-Dithering für eine Helligkeit b in 0..1. uv: Koordinaten auf der Oberfläche, uvPerPx: Oberflächeneinheiten je Bildschirmpixel
float dither3D(vec2 uv, float uvPerPx, float b){
  float bc = texture(uRamp, vec2(.5/64. + (1. - 1./64.)*b, .5)).r;       // Helligkeitskurve: wie viele Texel über der Schwelle liegen
  float scaleExp = 8.*uDotPx;                                              // 2^Skala: Punktabstand in Pixeln = scaleExp/8
  float spacing = uvPerPx*scaleExp*.5;                                     // 4 Punkte je Seite * 0.125
  float mult = pow(bc*2. + .001, -(1. - uSizeVar));                        // 0: Helligkeit ändert die Punktzahl, 1: die Punktgröße
  spacing *= mult;
  float sl = log2(spacing), lvl = floor(sl), f = sl - lvl;                 // Stufe (Zweierpotenz) und Anteil darin
  vec2 uvl = uv/exp2(lvl);
  float n = mix(4., 16., 1. - f);                                          // Punkte je Kachel: von 1/4 bis alle; eine Stufe weiter sind es wieder alle
  float pat = texture(uPat, vec3(uvl, (n - .5)/16.)).r;
  float contrast = uContrast*scaleExp*mult*.1;                             // schärft die runden Punkte, 1 = ein Pixel Weichzeichnung
  float baseVal = mix(.5, b, clamp(1.05/(1. + contrast), 0., 1.));
  float bw = clamp((pat - (1. - bc))*contrast + baseVal, 0., 1.);
  return mix(bw*smoothstep(0., .03, b), 1., smoothstep(.97, 1., b));      // reines Schwarz und Weiß ohne Restpunkte
}
// Farbe dithern: die Helligkeit wird auf uLevels Stufen verteilt, zwischen zwei Stufen entscheiden die Punkte; der Farbton bleibt
vec3 ditherCol(vec3 col, vec2 uv, float uvPerPx){
  float Y = dot(col, vec3(.299, .587, .114));
  float q = clamp(Y, 0., 1.)*uLevels;
  float i = min(floor(q), uLevels - 1.);
  float bw = dither3D(uv, uvPerPx, q - i);
  float m = ((i + bw)/uLevels)/max(Y, 1e-3);
  return col*min(m, 1./max(max(col.r, col.g), max(col.b, 1e-3)));
}
`;

const V = (body) => HEAD + VS_LIB + body;
const F = (body) => HEAD + FS_LIB + body;

// ---------- Himmel: Verlauf, Sonne, Mond, Sterne, Wolken ----------
export const SKY = {
  vs: `#version 300 es
out vec2 vUV;
void main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); vUV = p; gl_Position = vec4(p*2. - 1., 1., 1.); }`,
  fs: F(`
in vec2 vUV; out vec4 o;
uniform vec3 uZen, uHor, uSunCol, uMoonLit;
uniform vec2 uMoonScr;
uniform float uMoonI, uStars, uClouds;
void main(){
  vec2 p = (vUV*2. - 1.)*vec2(uA, 1.);
  vec2 sp = p - uHead*.9;                                  // der Himmel liegt fast im Unendlichen und folgt dem Kopf
  float g = clamp((sp.y + .45)/1.9, 0., 1.);
  vec3 col = mix(uHor, uZen, pow(g, .6));
  // Sonne
  float ds = length(p - uSunScr);
  col += uSunCol*uSunI*((exp(-ds*2.4)*.55 + exp(-ds*7.)*.55)*(.55 + .45*(1. - g)) + smoothstep(.085, .068, ds)*1.5);
  // Sterne
  vec2 sg = sp*48.;
  vec2 cell = floor(sg);
  float h = hash21(cell);
  if (h > .972 && uStars > .01) {
    vec2 c = fract(sg) - (.28 + .44*hash22(cell + 3.));
    float tw = .55 + .45*sin(uTime*(.8 + h*3.) + h*60.);
    col += vec3(1., .94, .82)*smoothstep(.5, .05, length(c))*tw*(.8 + (h - .972)*30.)*uStars*smoothstep(-.15, .35, sp.y);
  }
  // Mond mit Phase
  vec2 mp = (p - uMoonScr)/.078;
  float mr = length(mp);
  col += vec3(.45, .55, .85)*exp(-mr*.16)*.16*uMoonI;
  if (mr < 1.) {
    vec3 n = vec3(mp, -sqrt(1. - mr*mr));
    float lit = smoothstep(-.06, .12, dot(n, uMoonLit));
    float tex = .78 + .22*vnoise(mp*3.5 + 4.) + .12*vnoise(mp*9.);
    col = mix(col, vec3(.95, .95, 1.)*tex*(.10 + .9*lit), smoothstep(1., .9, mr)*(.3 + .7*(1. - uSunI)));
  }
  // Wolken
  vec2 cp = sp*vec2(.85, 2.1) + vec2(uTime*.011*(.5 + .5*uWind), 0.);
  float cn = fbm(cp*1.25 + fbm(cp*.6)*1.2);
  float c = smoothstep(.55 - .12*uClouds, .84, cn)*smoothstep(-.2, .5, sp.y)*uClouds;
  vec3 lit = mix(vec3(.50, .55, .68), uSunCol*1.15 + .25, uSunI);
  vec3 shade = mix(uHor, uZen, .4)*.62 + vec3(.02, .03, .05);
  vec3 cc = mix(shade, lit, clamp(.38 + .9*exp(-ds*1.05)*uSunI + .25*g, 0., 1.));
  cc = mix(cc*.5, cc, max(uSunI, .35)) + vec3(.55, .62, .85)*exp(-length(p - uMoonScr)*1.6)*.22*uMoonI;
  col = mix(col, cc, c*.82);
  col = mix(col, uFog, smoothstep(-.1, -.5, sp.y)*.6);   // Dunst am Horizont
  o = vec4(ditherCol(col*uExp, sp, 1./uPpu0), 1.);
}`),
};

// ---------- Hügel und Wiese: Streifen unter einer Kammlinie ----------
export const HILL = {
  vs: V(`
layout(location=0) in vec4 aH;   // x, y, z, t (0 am Kamm, 1 unten)
out vec2 vPlane, vScr;
out float vT, vF, vFog;
void main(){
  float f; vec2 scr;
  gl_Position = project(aH.xyz, f, scr);
  vPlane = aH.xy; vT = aH.w; vScr = scr;
  vF = 1./(uPpu0*f*uSc); vFog = fogAt(aH.z);
}`),
  fs: F(`
in vec2 vPlane, vScr;
in float vT, vF, vFog;
out vec4 o;
uniform vec3 uBase, uBase2;
uniform float uDetail;
void main(){
  float n = fbm(vPlane*vec2(4.2, 7.)*uDetail + 3.);
  float top = 1. - vT;
  float glow = exp(-length(vScr - uSunScr)*.95)*uSunI;
  float s = .22 + .42*top*top + (n - .5)*.5 + .38*glow;
  vec3 alb = mix(uBase, uBase2, smoothstep(.3, .75, n));
  vec3 col = alb*(uAmb + uKey*s);
  col = mix(col, uFog, vFog);
  o = vec4(ditherCol(col*uExp, vPlane, vF), 1.);
}`),
};

// ---------- Stamm und Äste: Bänder mit Zylinder-Normale ----------
export const TREE = {
  vs: V(`
layout(location=0) in vec3 aP;
layout(location=1) in vec2 aPerp;
layout(location=2) in vec4 aM;   // u (quer, -1..1), v (längs), flex, Phase
out vec2 vPlane, vPerp, vScr;
out vec4 vM;
out float vF, vFog;
void main(){
  vec3 P = aP;
  P.xy += windDisp(P, aM.z, aM.w)*.06;
  float f; vec2 scr;
  gl_Position = project(P, f, scr);
  vPlane = P.xy; vPerp = aPerp; vM = aM; vScr = scr;
  vF = 1./(uPpu0*f*uSc); vFog = fogAt(P.z);
}`),
  fs: F(`
in vec2 vPlane, vPerp, vScr;
in vec4 vM;
in float vF, vFog;
out vec4 o;
void main(){
  float u = vM.x;
  float nz = sqrt(max(0., 1. - u*u));
  float streak = fbm(vec2(u*5.5, vM.y*2.3));
  float crack = smoothstep(.58, .78, vnoise(vec2(u*9. + vM.w, vM.y*3.4)));
  vec3 n = normalize(vec3(vPerp*u + (streak - .5)*.35, -nz));
  float dif = max(0., dot(n, uL));
  float fill = max(0., dot(n, normalize(vec3(-.45, .6, -.7))));
  float rim = pow(1. - nz, 2.2)*max(uL.z, 0.);
  float glow = exp(-length(vScr - uSunScr)*1.0)*uSunI;
  float s = (.16 + .55*fill + .60*dif + .55*rim + .35*glow)*(.72 + .55*streak)*(1. - .5*crack);
  vec3 alb = mix(vec3(.40, .30, .21), vec3(.52, .44, .32), streak*.55);
  alb = mix(alb, vec3(.22, .30, .18), smoothstep(.45, .1, u)*smoothstep(.55, .75, fbm(vec2(u*3., vM.y*1.2) + 7.))*.7);   // etwas Moos auf der Schattenseite
  vec3 col = alb*(uAmb + uKey*s);
  col = mix(col, uFog, vFog);
  o = vec4(ditherCol(col*uExp, vPlane, vF), 1.);
}`),
};

// ---------- Laubhaufen: Karte aus vielen Blättern, Wind bewegt Haufen und Blätter ----------
export const LEAF = {
  vs: V(`
layout(location=0) in vec2 aQ;
layout(location=1) in vec4 iA;   // x, y, z, Größe
layout(location=2) in vec4 iB;   // flex, Phase, Dunkelheit im Kroneninneren, Farbvariante
out vec2 vQ, vPlane, vScr;
out vec4 vB;
out float vF, vFog;
void main(){
  vec3 P = iA.xyz;
  P.xy += windDisp(P, iB.x, iB.y)*.08;
  vec3 W = vec3(P.xy + aQ*iA.w, P.z);
  float f; vec2 scr;
  gl_Position = project(W, f, scr);
  vQ = aQ; vB = iB; vPlane = W.xy; vScr = scr;
  vF = 1./(uPpu0*f*uSc); vFog = fogAt(P.z);
}`),
  fs: F(`
in vec2 vQ, vPlane, vScr;
in vec4 vB;
in float vF, vFog;
out vec4 o;
void main(){
  if (length(vQ) > .5 + .5*vnoise(vQ*2.6 + vB.y*5.)) discard;
  float flut = clamp(uWind, 0., 2.);
  vec2 p = vQ + .05*flut*vec2(sin(uTime*2.3 + vB.y*3. + vQ.y*4.), cos(uTime*1.9 + vB.y*2. + vQ.x*4.));
  vec2 g = p*3.5 + vB.y*7.;
  vec2 ci = floor(g);
  vec2 sg = step(.5, fract(g))*2. - 1.;
  float best = 9., bid = 0.;
  vec2 bh = vec2(0.), bd = vec2(0.);
  for (int k = 0; k < 4; k++){
    vec2 c = ci + vec2(k & 1, k >> 1)*sg;
    vec2 h = hash22(c);
    float a = h.x*6.2831;
    vec2 d = g - (c + .5 + (h - .5)*.7);
    d = vec2(cos(a)*d.x + sin(a)*d.y, -sin(a)*d.x + cos(a)*d.y);
    float e = length(d/vec2(.9, .48));
    if (e < best){ best = e; bh = h; bid = hash21(c + 7.); bd = d; }
  }
  if (best > 1.) discard;
  vec3 nd = normalize(vec3(p*.5, -sqrt(max(.05, 1. - .25*dot(p, p)))));
  vec3 n = normalize(nd + vec3((bh - .5)*.9, -.2));
  float dif = max(0., dot(n, uL));
  float fill = max(0., dot(n, normalize(vec3(-.45, .6, -.7))));
  float thin = .45 + .55*bid;
  float glow = exp(-length(vScr - uSunScr)*1.1)*uSunI;
  float trans = max(uL.z, 0.)*thin*(.45 + .55*vB.z) + glow*thin*.7;     // Sonne hinter dem Laub: das Licht scheint durch die Blätter
  float vein = smoothstep(.07, 0., abs(bd.y))*.5;
  float edge = smoothstep(.72, 1., best);
  float s = (.14 + .26*fill + .55*dif + .95*trans)*(.45 + .55*vB.z)*(1. - vein*.35)*(1. - .5*edge);
  float hv = fract(vB.w*7.13 + bid*.6);
  vec3 alb = mix(vec3(.12, .30, .10), vec3(.40, .60, .17), smoothstep(.1, .8, hv));
  alb = mix(alb, vec3(.72, .62, .17), smoothstep(.88, 1., hv)*.85);
  vec3 col = alb*(uAmb + uKey*s);
  col = mix(col, uFog, vFog);
  o = vec4(ditherCol(col*uExp, vPlane, vF), 1.);
}`),
};

// ---------- Vögel: Umriss aus Entfernungsfunktionen, Flügelschlag aus der Phase ----------
export const BIRD = {
  vs: V(`
layout(location=0) in vec2 aQ;
layout(location=1) in vec4 iA;   // x, y, z, Größe
layout(location=2) in vec4 iB;   // Flügelphase, Blickrichtung, 0 Flug / 1 sitzend, Gefieder
out vec2 vQ, vPlane, vScr;
out vec4 vB;
out float vF, vFog;
void main(){
  vec3 W = vec3(iA.xy + aQ*iA.w, iA.z);
  float f; vec2 scr;
  gl_Position = project(W, f, scr);
  vQ = aQ; vB = iB; vPlane = W.xy; vScr = scr;
  vF = 1./(uPpu0*f*uSc); vFog = fogAt(iA.z)*.8;
}`),
  fs: F(`
in vec2 vQ, vPlane, vScr;
in vec4 vB;
in float vF, vFog;
out vec4 o;
float seg(vec2 p, vec2 a, vec2 b, out float h){ vec2 pa = p - a, ba = b - a; h = clamp(dot(pa, ba)/dot(ba, ba), 0., 1.); return length(pa - ba*h); }
float ell(vec2 p, vec2 r){ return (length(p/r) - 1.)*min(r.x, r.y); }
void main(){
  vec2 p = vec2(vQ.x*vB.y, vQ.y);
  float d, h1, h2, belly = smoothstep(.04, -.12, p.y);
  if (vB.z < .5){
    float fl = sin(vB.x);                                  // Flügelschlag: oben (+1) bis unten (-1)
    vec2 q = vec2(abs(p.x), p.y);
    vec2 mid = vec2(.5, .08 + fl*.30);
    float d1 = seg(q, vec2(0., .04), mid, h1) - mix(.12, .08, h1);
    float d2 = seg(q, mid, vec2(.98, -.05 + fl*.70), h2) - mix(.08, .022, h2);
    d = min(min(d1, d2), ell(p - vec2(0., -.02), vec2(.2, .14)));
  } else {
    float c = cos(-.18), sn = sin(-.18);
    vec2 b = vec2(c*p.x - sn*p.y, sn*p.x + c*p.y);
    float body = ell(b, vec2(.56, .36));
    float head = length(p - vec2(.50, .30)) - .25;
    float tail = seg(p, vec2(-.42, -.02), vec2(-1., -.36), h1) - mix(.14, .05, h1);
    float beak = seg(p, vec2(.70, .30), vec2(.92, .23), h2) - .045;
    d = min(min(body, head), min(tail, beak));
  }
  if (d > 0.) discard;
  float kind = vB.w;
  vec3 back = kind < .5 ? vec3(.20, .13, .09) : kind < 1.5 ? vec3(.07, .07, .08) : kind < 2.5 ? vec3(.18, .34, .62) : vec3(.30, .20, .13);
  vec3 front = kind < .5 ? vec3(.58, .48, .38) : kind < 1.5 ? vec3(.12, .12, .14) : kind < 2.5 ? vec3(.92, .82, .28) : vec3(.92, .42, .16);
  vec3 alb = mix(back, front, belly*step(.5, vB.z)*.9 + (1. - step(.5, vB.z))*smoothstep(.0, -.2, p.y)*.5);
  float glow = exp(-length(vScr - uSunScr)*1.1)*uSunI;
  float s = .26 + .38*smoothstep(-.1, .5, p.y) + .45*glow;
  vec3 col = alb*(uAmb + uKey*s);
  col = mix(col, uFog, vFog);
  o = vec4(ditherCol(col*uExp, vPlane, vF), 1.);
}`),
};

// ---------- Gras: einzelne Halme als gebogene Spitzen ----------
export const GRASS = {
  vs: V(`
layout(location=0) in vec2 aQ;
layout(location=1) in vec4 iA;   // x, y (Fuß), z, Höhe
layout(location=2) in vec4 iB;   // Phase, Neigung, Breite, Helligkeit
out vec2 vQ, vPlane, vScr;
out vec4 vB;
out float vF, vFog, vBend;
void main(){
  float wq = iA.w*.42;
  vec3 W = vec3(iA.x + aQ.x*wq, iA.y + (aQ.y*.5 + .5)*iA.w, iA.z);
  vBend = windDisp(vec3(iA.xy, iA.z), 1., iB.x).x*.55 + iB.y;
  float f; vec2 scr;
  gl_Position = project(W, f, scr);
  vQ = vec2(aQ.x, aQ.y*.5 + .5); vB = iB; vPlane = W.xy; vScr = scr;
  vF = 1./(uPpu0*f*uSc); vFog = fogAt(iA.z);
}`),
  fs: F(`
in vec2 vQ, vPlane, vScr;
in vec4 vB;
in float vF, vFog, vBend;
out vec4 o;
void main(){
  float y = vQ.y;
  float cx = vBend*y*y;
  float w = vB.z*(1. - y)*(1. + .6*(1. - y));
  if (abs(vQ.x - cx) > w) discard;
  float glow = exp(-length(vScr - uSunScr)*1.1)*uSunI;
  float s = .10 + .55*y*vB.w + .6*glow*y;
  vec3 alb = mix(vec3(.07, .17, .06), vec3(.36, .55, .15), y*(.4 + .6*vB.w));
  vec3 col = alb*(uAmb + uKey*s);
  col = mix(col, uFog, vFog);
  o = vec4(ditherCol(col*uExp, vPlane, vF), 1.);
}`),
};

// ---------- Staubkörner im Licht und Glühwürmchen ----------
export const MOTE = {
  vs: V(`
layout(location=0) in vec2 aQ;
layout(location=1) in vec4 iA;   // x, y, z, Größe
layout(location=2) in vec4 iB;   // 0 Pollen / 1 Glühwürmchen, Phase, Tempo, Streuung
out vec2 vQ, vPlane, vScr;
out vec4 vB;
out float vF, vFog;
void main(){
  float t = uTime*iB.z;
  vec2 off = vec2(sin(t*.23 + iB.y*6.28) + .6*sin(t*.51 + iB.y*11.), cos(t*.19 + iB.y*9.) + .5*sin(t*.43 + iB.y*5.))*iB.w;
  off.x += (hash11(iB.y*17.) - .3)*uTime*.01*uWind;
  vec3 W = vec3(iA.xy + off + aQ*iA.w, iA.z);
  float f; vec2 scr;
  gl_Position = project(W, f, scr);
  vQ = aQ; vB = iB; vPlane = W.xy; vScr = scr;
  vF = 1./(uPpu0*f*uSc); vFog = fogAt(iA.z);
}`),
  fs: F(`
in vec2 vQ, vPlane, vScr;
in vec4 vB;
in float vF, vFog;
out vec4 o;
uniform float uStars;
void main(){
  float r = length(vQ);
  if (r > 1.) discard;
  float core = smoothstep(1., .0, r);
  float glow = exp(-length(vScr - uSunScr)*1.2)*uSunI;
  vec3 col;
  float a;
  if (vB.x < .5){ a = (1. - uStars)*glow*1.6; col = uKey*.9 + .25; }
  else { a = uStars*smoothstep(.3, 1., sin(uTime*(.7 + vB.y*.6) + vB.y*40.)); col = vec3(.80, 1., .30); }
  col *= core*a*1.6;
  if (dot(col, vec3(.3, .6, .1)) < .14) discard;
  o = vec4(ditherCol(mix(col, uFog*core*a, vFog*.5)*uExp, vPlane, vF), 1.);
}`),
};
