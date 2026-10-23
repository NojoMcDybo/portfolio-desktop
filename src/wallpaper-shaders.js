// GLSL des Hintergrunds (WebGL2): eine Marmorhalle mit Oberlicht und einem großen Baum. Alles wird zuletzt durch ditherCol() gedithert:
// Oberflächen-stabiles Fraktal-Dithering nach dem Verfahren von Rune Skovbo Johansen (github.com/runevision/Dither3D, MPL-2.0).
// Der Shader hier ist eine eigene Umsetzung des beschriebenen Verfahrens, kein übernommener Code: ein 3D-Muster aus Bayer-Punkten
// (je Schicht ein Punkt mehr), die Stufe (Zweierpotenz) wird aus der Punktgröße auf dem Bildschirm gewählt, so bleiben die Punkte
// an der Oberfläche haften und gleich groß – auch auf dem Boden, der in die Tiefe läuft.

const HEAD = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler3D;
uniform float uA, uHd, uSc, uTime, uWind, uPpu0, uFogK;
uniform vec2 uHead;
uniform vec3 uLh;        // Richtung zum Licht (zum Oberlicht hin geneigt)
uniform vec4 uSky;       // Oberlicht in der Decke: Mitte x, Mitte z, halbe Breite, halbe Tiefe
uniform vec4 uCrown;     // Baumkrone: Mittelpunkt und Radius
const vec2 PIV = vec2(0., -.9);
const float YC = 2.9;    // Höhe der Decke
float hash11(float p){ p = fract(p*.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p){ vec3 q = fract(vec3(p.xyx)*.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y)*q.z); }
vec2 hash22(vec2 p){ vec3 q = fract(vec3(p.xyx)*vec3(.1031, .1030, .0973)); q += dot(q, q.yzx + 33.33); return fract((q.xx + q.yz)*q.zy); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3. - 2.*f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), f.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), f.x), f.y); }
float fogAt(float z){ return (1. - exp(-max(z, 0.)*.075))*uFogK; }
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
// f ist der Maßstab der Ebene auf dem Bildschirm, ferne Ebenen folgen dem Kopf, nahe laufen gegen ihn.
// w = 1/f macht die Interpolation perspektivisch richtig (Boden und Wände laufen in die Tiefe), die Tiefe ist linear in f
vec4 project(vec3 P, out float f, out vec2 scr){
  P.xy = (P.xy - PIV)*uSc + PIV;
  f = uHd/max(uHd + P.z, .3);
  scr = uHead*(1. - f) + P.xy*f;
  float w = 1./f;
  return vec4(scr.x/uA*w, scr.y*w, clamp(1. - f*.5, -.99, .99)*w, w);
}
`;

// ---------- Fragment-Teil: Dithering und Licht ----------
const FS_LIB = `
uniform sampler3D uPat;
uniform sampler2D uRamp;
uniform float uDotPx, uSizeVar, uContrast, uLevels, uExp, uSunI, uLightI;
uniform vec3 uAmb, uKey, uFog;
uniform vec2 uSunScr, uLightScr;

// Schwarz-weiß-Dithering für eine Helligkeit b in 0..1. uv: Koordinaten auf der Oberfläche; fmin: Oberflächeneinheiten je Pixel in der
// Richtung, in der die Oberfläche am weitesten gestreckt ist; ratio: kleinste/größte Änderung (schräg gesehene Flächen)
float dither3D(vec2 uv, float fmin, float ratio, float b){
  float bc = texture(uRamp, vec2(.5/64. + (1. - 1./64.)*b, .5)).r;       // Helligkeitskurve: wie viele Texel über der Schwelle liegen
  float scaleExp = 8.*uDotPx;                                              // 2^Skala: Punktabstand in Pixeln = scaleExp/8
  float spacing = fmin*scaleExp*.5;                                        // 4 Punkte je Seite * 0.125
  float mult = pow(bc*2. + .001, -(1. - uSizeVar));                        // 0: Helligkeit ändert die Punktzahl, 1: die Punktgröße
  spacing *= mult;
  float sl = log2(spacing), lvl = floor(sl), f = sl - lvl;                 // Stufe (Zweierpotenz) und Anteil darin
  vec2 uvl = uv/exp2(lvl);
  float n = mix(4., 16., 1. - f);                                          // Punkte je Kachel: von 1/4 bis alle; eine Stufe weiter sind es wieder alle
  float pat = texture(uPat, vec3(uvl, (n - .5)/16.)).r;
  float contrast = uContrast*scaleExp*mult*.1*ratio;                       // schärft die runden Punkte, 1 = ein Pixel Weichzeichnung
  float baseVal = mix(.5, b, clamp(1.05/(1. + contrast), 0., 1.));
  float bw = clamp((pat - (1. - bc))*contrast + baseVal, 0., 1.);
  return mix(bw*smoothstep(0., .03, b), 1., smoothstep(.97, 1., b));      // reines Schwarz und Weiß ohne Restpunkte
}
// Farbe dithern: die Helligkeit wird auf uLevels Stufen verteilt, zwischen zwei Stufen entscheiden die Punkte; der Farbton bleibt
vec3 stepCol(vec3 col, float bw0, float i){ float m = ((i + bw0)/uLevels)/max(dot(col, vec3(.299, .587, .114)), 1e-3); return col*min(m, 1./max(max(col.r, col.g), max(col.b, 1e-3))); }
vec3 ditherCol(vec3 col, vec2 uv, float fmin){
  float q = clamp(dot(col, vec3(.299, .587, .114)), 0., 1.)*uLevels;
  float i = min(floor(q), uLevels - 1.);
  return stepCol(col, dither3D(uv, fmin, 1., q - i), i);
}
// für schräge Flächen: Streckung aus den Bildschirmableitungen (kleinster und größter Singulärwert)
vec3 ditherColA(vec3 col, vec2 uv, vec2 dx, vec2 dy){
  float Q = dot(dx, dx) + dot(dy, dy), R = dx.x*dy.y - dx.y*dy.x, D = sqrt(max(0., Q*Q - 4.*R*R));
  vec2 fr = sqrt(vec2(Q + D, Q - D)*.5);
  float q = clamp(dot(col, vec3(.299, .587, .114)), 0., 1.)*uLevels;
  float i = min(floor(q), uLevels - 1.);
  return stepCol(col, dither3D(uv, max(fr.y, 1e-6), clamp(fr.y/max(fr.x, 1e-6), .05, 1.), q - i), i);
}

// Fällt das Licht (aus Richtung uLh) durch das Oberlicht auf den Punkt P?
float skyMask(vec3 P){
  if (uLh.y < .05) return 0.;
  vec2 q = P.xz + uLh.xz*((YC - P.y)/uLh.y) - uSky.xy;
  vec2 d = abs(q) - uSky.zw;
  return smoothstep(.45, -.1, max(d.x, d.y));
}
// Laubschatten: der Strahl zum Licht läuft durch die Krone; wo ein Blatt im Weg ist, bleibt es dunkel, dazwischen Lichtflecken
float canopyShadow(vec3 P){
  float t = dot(uCrown.xyz - P, uLh);
  if (t < 0.) return 1.;
  vec3 c = P + uLh*t - uCrown.xyz;
  float d = length(c)/uCrown.w;
  if (d > 1.) return 1.;
  vec3 a = normalize(cross(uLh, vec3(0., 0., 1.)));
  vec2 q = vec2(dot(c, a), dot(c, cross(uLh, a)))*3.3 + vec2(sin(uTime*.35), cos(uTime*.3))*.07*uWind + uTime*.02*uWind;
  float n = fbm(q) + .22*vnoise(q*3.);
  float thr = 1. - sqrt(1. - d*d)*.9;                                       // dichter in der Mitte der Krone
  return 1. - smoothstep(thr - .05, thr + .05, n*.95);
}
// Lichtstrahlen in der Luft: das Licht entlang des Sehstrahls vom Auge zum Punkt aufsummieren; die Dichte ist in Streifen parallel zum Licht
// verteilt (Staub) und nimmt vom Oberlicht nach unten ab
float shaftSum(vec3 P, float jit, int n){
  vec3 E = vec3(uHead, -uHd);
  vec3 a = normalize(cross(uLh, vec3(0., 0., 1.)));
  float s = 0.;
  for (int i = 0; i < 12; i++){
    if (i >= n) break;
    vec3 S = mix(E, P, (float(i) + jit)/float(n));
    float m = skyMask(S);
    if (m < .001) continue;
    float qa = dot(S, a);                       // Lichtvorhänge parallel zur Blickrichtung: Strahlen fächern vom Oberlicht auf
    float k = vnoise(vec2(qa*2.2, 7.))*.7 + vnoise(vec2(qa*6., 3.))*.3;
    s += m*(.04 + 2.6*k*k*k)*exp(-(YC - S.y)*.2);
  }
  return s/float(n)*length(P - E)*.4;
}
float shaft12(vec3 P, float jit){ return shaftSum(P, jit, 10); }
float shaft4(vec3 P, float jit){ return shaftSum(P, jit, 4); }
`;

const V = (body) => HEAD + VS_LIB + body;
const F = (body) => HEAD + FS_LIB + body;

// ---------- Himmel: nur durchs Oberlicht zu sehen (Verlauf, Sonne, Mond, Sterne, Wolken) ----------
export const P_SKY = {
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
  float ds = length(p - uSunScr);
  col += uSunCol*uSunI*((exp(-ds*2.4)*.55 + exp(-ds*7.)*.55)*(.55 + .45*(1. - g)) + smoothstep(.085, .068, ds)*1.5);
  vec2 sg = sp*48.;
  vec2 cell = floor(sg);
  float h = hash21(cell);
  if (h > .972 && uStars > .01) {
    vec2 c = fract(sg) - (.28 + .44*hash22(cell + 3.));
    float tw = .55 + .45*sin(uTime*(.8 + h*3.) + h*60.);
    col += vec3(1., .94, .82)*smoothstep(.5, .05, length(c))*tw*(.8 + (h - .972)*30.)*uStars;
  }
  vec2 mp = (p - uMoonScr)/.078;
  float mr = length(mp);
  col += vec3(.45, .55, .85)*exp(-mr*.16)*.16*uMoonI;
  if (mr < 1.) {
    vec3 n = vec3(mp, -sqrt(1. - mr*mr));
    float lit = smoothstep(-.06, .12, dot(n, uMoonLit));
    float tex = .78 + .22*vnoise(mp*3.5 + 4.) + .12*vnoise(mp*9.);
    col = mix(col, vec3(.95, .95, 1.)*tex*(.10 + .9*lit), smoothstep(1., .9, mr)*(.3 + .7*(1. - uSunI)));
  }
  vec2 cp = sp*vec2(.85, 2.1) + vec2(uTime*.011*(.5 + .5*uWind), 0.);
  float cn = fbm(cp*1.25 + fbm(cp*.6)*1.2);
  float c = smoothstep(.55 - .12*uClouds, .84, cn)*uClouds;
  vec3 lit = mix(vec3(.50, .55, .68), uSunCol*1.15 + .25, uSunI);
  vec3 shade = mix(uHor, uZen, .4)*.62 + vec3(.02, .03, .05);
  vec3 cc = mix(shade, lit, clamp(.38 + .9*exp(-ds*1.05)*uSunI + .25*g, 0., 1.));
  cc = mix(cc*.5, cc, max(uSunI, .35)) + vec3(.55, .62, .85)*exp(-length(p - uMoonScr)*1.6)*.22*uMoonI;
  col = mix(col, cc, c*.82);
  o = vec4(ditherCol(col*uExp*1.15, sp, 1./uPpu0), 1.);
}`),
};

// ---------- Halle: Boden, Wände, Decke aus Marmor ----------
export const P_HALL = {
  vs: V(`
layout(location=0) in vec3 aP;
layout(location=1) in vec3 aN;
layout(location=2) in float aM;   // 0 Boden, 1 Seitenwand, 2 Wand zum Betrachter, 3 Decke
out vec3 vW, vN;
out float vM;
void main(){
  float f; vec2 scr;
  gl_Position = project(aP, f, scr);
  vW = aP; vN = aN; vM = aM;
}`),
  fs: F(`
in vec3 vW, vN;
in float vM;
out vec4 o;
void main(){
  vec3 P = vW, n = normalize(vN);
  vec2 uv = vM < .5 ? P.xz : vM < 1.5 ? P.zy : vM < 2.5 ? P.xy : P.xz;     // Koordinaten auf der Fläche
  vec2 dx = dFdx(uv), dy = dFdy(uv);
  if (vM > 2.5 && abs(P.x - uSky.x) < uSky.z && abs(P.z - uSky.y) < uSky.w) discard;   // Oberlicht: hier sieht man den Himmel
  // Marmor: Wolken, Adern, Plattenfugen
  float m = fbm(uv*vec2(.55, .8) + vM*5.);
  float vein = smoothstep(.07, 0., abs(sin(uv.x*2.2 + uv.y*1.3 + vnoise(uv*1.4)*7.)))*.35;
  vec3 stone = mix(vec3(.86, .80, .69), vec3(.76, .69, .57), m);
  stone = mix(stone, vec3(.60, .53, .42), vein*smoothstep(.3, .8, m));
  vec2 gp = vM < .5 ? P.xz*.5 : vM < 1.5 ? vec2(P.z*.5, 0.) : vec2(P.x*.5, 0.);
  vec2 gf = abs(fract(gp) - .5);
  stone *= 1. - .2*smoothstep(.488, .5, max(gf.x, gf.y));
  // Licht: durchs Oberlicht, vom Laub gefleckt, dazu Strahlen in der Luft
  float lit = skyMask(P);
  float sh = lit > .001 ? canopyShadow(P) : 1.;
  float dif = max(0., dot(n, uLh));
  float jit = hash21(gl_FragCoord.xy);
  float amb = vM < .5 ? 1. : vM < 2.5 ? .78 + .3*smoothstep(-1.9, 2.5, P.y) : .45;
  vec3 col = stone*(uAmb*amb + uKey*.55*lit*sh*dif) + uKey*shaft12(P, jit)*.5;
  col += uAmb*pow(1. - abs(normalize(P - vec3(uHead, -uHd)).y), 3.)*.18*step(vM, .5);   // Boden glänzt zum Horizont hin
  col = mix(col, uFog, fogAt(P.z));
  o = vec4(ditherColA(col*uExp, uv, dx, dy), 1.);
}`),
};

// ---------- Stamm, Wurzeln, Äste: Bänder mit Zylinder-Normale ----------
export const P_TREE = {
  vs: V(`
layout(location=0) in vec3 aP;
layout(location=1) in vec2 aPerp;
layout(location=2) in vec4 aM;   // u (quer, -1..1), v (längs), flex, Phase
out vec3 vW;
out vec2 vPerp, vScr;
out vec4 vM;
out float vF;
void main(){
  vec3 P = aP;
  P.xy += windDisp(P, aM.z, aM.w)*.12;
  float f; vec2 scr;
  gl_Position = project(P, f, scr);
  vW = P; vPerp = aPerp; vM = aM; vScr = scr;
  vF = 1./(uPpu0*f*uSc);
}`),
  fs: F(`
in vec3 vW;
in vec2 vPerp, vScr;
in vec4 vM;
in float vF;
out vec4 o;
void main(){
  float u = vM.x;
  float nz = sqrt(max(0., 1. - u*u));
  float twist = vM.y*.9;                                               // gedrehter Wuchs: die Rindenstreifen laufen schräg
  float streak = fbm(vec2(u*5.5 + twist, vM.y*2.3 - u*1.5));
  float crack = smoothstep(.58, .78, vnoise(vec2(u*9. + vM.w + twist*2., vM.y*3.4)));
  vec3 n = normalize(vec3(vPerp*u + (streak - .5)*.35, -nz));
  float lit = skyMask(vW);
  float dif = max(0., dot(n, uLh));
  float fill = max(0., dot(n, normalize(vec3(-.45, .6, -.7))));
  float rim = pow(1. - nz, 2.2);
  float glow = exp(-length(vScr - uLightScr)*.8)*uLightI;
  float s = (.18 + .5*fill + .5*dif*(.4 + .6*lit) + .5*rim*(.3 + .7*lit) + .3*glow)*(.72 + .55*streak)*(1. - .5*crack);
  vec3 alb = mix(vec3(.50, .40, .29), vec3(.66, .57, .43), streak*.6);
  alb = mix(alb, vec3(.34, .40, .22), smoothstep(.45, .1, u)*smoothstep(.55, .75, fbm(vec2(u*3., vM.y*1.2) + 7.))*.7);   // Moos auf der Schattenseite
  vec3 col = alb*(uAmb*.5 + uKey*.6*s) + uKey*shaft4(vW, hash21(gl_FragCoord.xy))*.4;
  col = mix(col, uFog, fogAt(vW.z));
  o = vec4(ditherCol(col*uExp, vW.xy, vF), 1.);
}`),
};

// ---------- Laubhaufen: Karte aus vielen Blättern, Wind bewegt Haufen und Blätter ----------
export const P_LEAF = {
  vs: V(`
layout(location=0) in vec2 aQ;
layout(location=1) in vec4 iA;   // x, y, z, Größe
layout(location=2) in vec4 iB;   // flex, Phase, Dunkelheit im Kroneninneren, Farbvariante
out vec2 vQ, vScr;
out vec3 vW;
out vec4 vB;
out float vF;
void main(){
  vec3 P = iA.xyz;
  P.xy += windDisp(P, iB.x, iB.y)*.16;
  vec3 W = vec3(P.xy + aQ*iA.w, P.z);
  float f; vec2 scr;
  gl_Position = project(W, f, scr);
  vQ = aQ; vB = iB; vW = W; vScr = scr;
  vF = 1./(uPpu0*f*uSc);
}`),
  fs: F(`
in vec2 vQ, vScr;
in vec3 vW;
in vec4 vB;
in float vF;
out vec4 o;
void main(){
  if (length(vQ) > .5 + .5*vnoise(vQ*2.6 + vB.y*5.)) discard;
  float flut = clamp(uWind, 0., 2.);
  vec2 p = vQ + .05*flut*vec2(sin(uTime*2.3 + vB.y*3. + vQ.y*4.), cos(uTime*1.9 + vB.y*2. + vQ.x*4.));
  vec2 g = p*4.2 + vB.y*7.;
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
  float lit = skyMask(vW);
  float dif = dot(n, uLh)*.5 + .5;
  float fill = max(0., dot(n, normalize(vec3(-.45, .6, -.7))));
  float thin = .45 + .55*bid;
  float glow = exp(-length(vScr - uLightScr)*.8)*uLightI;
  float trans = (lit*.7 + glow*.6)*thin*(.45 + .55*vB.z);                 // das Licht scheint durch die Blätter, die Krone leuchtet
  float vein = smoothstep(.07, 0., abs(bd.y))*.5;
  float edge = smoothstep(.72, 1., best);
  float s = (.16 + .26*fill + .4*dif*(.35 + .65*lit) + .9*trans)*(.5 + .5*vB.z)*(1. - vein*.3)*(1. - .45*edge);
  float hv = fract(vB.w*7.13 + bid*.6);
  vec3 alb = mix(vec3(.20, .36, .12), vec3(.52, .66, .22), smoothstep(.1, .8, hv));
  alb = mix(alb, vec3(.82, .74, .26), smoothstep(.88, 1., hv)*.85);
  vec3 col = alb*(uAmb*.5 + uKey*.6*s) + uKey*shaft4(vW, hash21(gl_FragCoord.xy))*.4;
  col = mix(col, uFog, fogAt(vW.z));
  o = vec4(ditherCol(col*uExp, vW.xy, vF), 1.);
}`),
};

// ---------- Vögel: Umriss aus Entfernungsfunktionen, Flügelschlag aus der Phase ----------
export const P_BIRD = {
  vs: V(`
layout(location=0) in vec2 aQ;
layout(location=1) in vec4 iA;   // x, y, z, Größe
layout(location=2) in vec4 iB;   // Flügelphase, Blickrichtung, 0 Flug / 1 sitzend, Gefieder
out vec2 vQ, vScr;
out vec3 vW;
out vec4 vB;
out float vF;
void main(){
  vec3 W = vec3(iA.xy + aQ*iA.w, iA.z);
  float f; vec2 scr;
  gl_Position = project(W, f, scr);
  vQ = aQ; vB = iB; vW = W; vScr = scr;
  vF = 1./(uPpu0*f*uSc);
}`),
  fs: F(`
in vec2 vQ, vScr;
in vec3 vW;
in vec4 vB;
in float vF;
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
  vec3 back = kind < .5 ? vec3(.20, .13, .09) : kind < 1.5 ? vec3(.10, .10, .11) : kind < 2.5 ? vec3(.18, .34, .62) : vec3(.30, .20, .13);
  vec3 front = kind < .5 ? vec3(.58, .48, .38) : kind < 1.5 ? vec3(.16, .16, .18) : kind < 2.5 ? vec3(.92, .82, .28) : vec3(.92, .42, .16);
  vec3 alb = mix(back, front, belly*step(.5, vB.z)*.9 + (1. - step(.5, vB.z))*smoothstep(.0, -.2, p.y)*.5);
  float glow = exp(-length(vScr - uLightScr)*.8)*uLightI;
  float s = .26 + .38*smoothstep(-.1, .5, p.y) + .45*glow + .5*skyMask(vW);
  vec3 col = alb*(uAmb*.5 + uKey*.6*s);
  col = mix(col, uFog, fogAt(vW.z)*.8);
  o = vec4(ditherCol(col*uExp, vW.xy, vF), 1.);
}`),
};

// ---------- Staubkörner in den Lichtstrahlen und Glühwürmchen ----------
export const P_MOTE = {
  vs: V(`
layout(location=0) in vec2 aQ;
layout(location=1) in vec4 iA;   // x, y, z, Größe
layout(location=2) in vec4 iB;   // 0 Staub / 1 Glühwürmchen, Phase, Tempo, Streuung
out vec2 vQ;
out vec3 vW;
out vec4 vB;
out float vF;
void main(){
  float t = uTime*iB.z;
  vec2 off = vec2(sin(t*.23 + iB.y*6.28) + .6*sin(t*.51 + iB.y*11.), cos(t*.19 + iB.y*9.) + .5*sin(t*.43 + iB.y*5.))*iB.w;
  off.x += (hash11(iB.y*17.) - .3)*uTime*.01*uWind;
  vec3 W = vec3(iA.xy + off + aQ*iA.w, iA.z);
  float f; vec2 scr;
  gl_Position = project(W, f, scr);
  vQ = aQ; vB = iB; vW = W;
  vF = 1./(uPpu0*f*uSc);
}`),
  fs: F(`
in vec2 vQ;
in vec3 vW;
in vec4 vB;
in float vF;
out vec4 o;
uniform float uStars;
void main(){
  float r = length(vQ);
  if (r > 1.) discard;
  float core = smoothstep(1., .0, r);
  vec3 col;
  float a;
  if (vB.x < .5){ a = skyMask(vW)*(1. - .6*uStars); col = uKey*.9 + .3; }       // Staub leuchtet nur im Lichtstrahl
  else { a = uStars*smoothstep(.3, 1., sin(uTime*(.7 + vB.y*.6) + vB.y*40.)); col = vec3(.80, 1., .30); }
  col *= core*a*1.7;
  if (dot(col, vec3(.3, .6, .1)) < .12) discard;
  o = vec4(ditherCol(mix(col, uFog*core*a, fogAt(vW.z)*.5)*uExp, vW.xy, vF), 1.);
}`),
};
