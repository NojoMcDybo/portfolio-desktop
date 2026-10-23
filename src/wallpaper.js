// Desktop-Hintergrund: eine hohe Marmorhalle mit Oberlicht und einem riesigen Baum in echter Tiefe (WebGL2), alles in Oberflächen-stabilem
// Fraktal-Dithering (siehe wallpaper-shaders.js). Licht fällt durchs Oberlicht, bildet Strahlen und vom Laub gefleckte Lichtflecken auf dem
// Boden. Wind bewegt Äste und Laub, Vögel sitzen und fliegen, Himmel und Licht folgen Datum und Uhrzeit (daylight.js), und der Blick durchs
// "Fenster" folgt dem Kopf (Webcam) oder der Maus (head.js): ferne Ebenen laufen mit, nahe dagegen.
import { Kopf } from "./head.js";
import { light, presetDate } from "./daylight.js";
import { S } from "./stage.js";
import { P_SKY, P_HALL, P_TREE, P_LEAF, P_BIRD, P_MOTE } from "./wallpaper-shaders.js";

const HD0 = 3.4; // Abstand des Betrachters zum Fenster in halben Bildhöhen
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const mixv = (a, b, t) => a.map((v, i) => mix(v, b[i], t));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// Halle (Weltmaße; Bildschirm bei z = 0, halbe Bildhöhe = 1, z wächst in die Tiefe)
const YF = -1.9, YC = 2.9, ZB = 8, ZN = -2, ZT = 6.7; // Boden, Decke, Rückwand, nahes Ende, Standort des Baums
const STEPS = [[ZN, 2.2, 4.3], [2.2, 4.3, 3.5], [4.3, 6.2, 2.95], [6.2, ZB, 2.5]]; // Wandabschnitte: von z, bis z, halbe Breite (nach hinten schmaler)
const SKYLIGHT = [0, 6.2, 2.3, 1.8]; // Oberlicht: Mitte x, Mitte z, halbe Breite, halbe Tiefe
const CROWN = [0, 0.7, ZT, 2.1]; // Baumkrone für die Laubschatten

// ---------- Dither-Muster (3D-Textur) ----------
// 4 × 4 Bayer-Punkte; Schicht k enthält die ersten k+1 Punkte als runde Verläufe, Z wächst also mit der Punktzahl
function makePattern(gl) {
  const size = 64, layers = 16;
  const base = [[0, 0], [0.5, 0.5], [0.5, 0], [0, 0.5]], pts = base.slice();
  for (let i = 1; i < 4; i++) for (let j = 0; j < 4; j++) pts.push([base[j][0] + base[i][0] * 0.5, base[j][1] + base[i][1] * 0.5]);
  const data = new Uint8Array(size * size * layers), buckets = new Float64Array(256);
  for (let z = 0; z < layers; z++) {
    const n = z + 1, r = Math.sqrt(0.5 / n / Math.PI) * 2.4;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const px = (x + 0.5) / size, py = (y + 0.5) / size;
      let dist = Infinity;
      for (let i = 0; i < n; i++) {
        const dx = ((px - pts[i][0] + 1.5) % 1) - 0.5, dy = ((py - pts[i][1] + 1.5) % 1) - 0.5;
        dist = Math.min(dist, Math.hypot(dx, dy));
      }
      const v = clamp(1 - dist / r, 0, 1);
      data[x + y * size + z * size * size] = Math.round(v * 255);
      buckets[Math.min(255, Math.floor(v * 256))]++;
    }
  }
  // Helligkeitskurve: wie viel Schwelle (von oben) braucht es, damit der Anteil heller Texel der gewünschten Helligkeit entspricht
  const total = size * size * layers, cum = new Float64Array(257);
  for (let i = 0; i < 256; i++) cum[i + 1] = cum[i] + buckets[255 - i] / total;
  const ramp = new Uint8Array(64);
  for (let i = 0, hi = 1; i < 64; i++) {
    const want = i / 63;
    while (hi < 256 && cum[hi] < want) hi++;
    const t = cum[hi] > cum[hi - 1] ? (want - cum[hi - 1]) / (cum[hi] - cum[hi - 1]) : 0;
    ramp[i] = Math.round(clamp((hi - 1 + t) / 256, 0, 1) * 255);
  }
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const pat = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_3D, pat);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.R8, size, size, layers, 0, gl.RED, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.REPEAT); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  const rt = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, rt);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 64, 1, 0, gl.RED, gl.UNSIGNED_BYTE, ramp);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

// ---------- Szene: Halle ----------
function hallMesh() {
  const v = [];
  const quad = (a, b, c, d, n, m) => { for (const p of [a, b, c, a, c, d]) v.push(...p, ...n, m); };
  const w0 = STEPS[0][2];
  quad([-w0, YF, ZN], [w0, YF, ZN], [w0, YF, ZB], [-w0, YF, ZB], [0, 1, 0], 0);
  quad([-w0, YC, ZN], [w0, YC, ZN], [w0, YC, ZB], [-w0, YC, ZB], [0, -1, 0], 3);
  STEPS.forEach(([z0, z1, w], k) => {
    quad([-w, YF, z0], [-w, YF, z1], [-w, YC, z1], [-w, YC, z0], [1, 0, 0], 1);
    quad([w, YF, z0], [w, YF, z1], [w, YC, z1], [w, YC, z0], [-1, 0, 0], 1);
    const nw = STEPS[k + 1]?.[2];
    if (nw) { // Stufe zum nächsten, schmaleren Abschnitt: die Fläche zeigt zum Betrachter
      quad([-w, YF, z1], [-nw, YF, z1], [-nw, YC, z1], [-w, YC, z1], [0, 0, -1], 2);
      quad([w, YF, z1], [nw, YF, z1], [nw, YC, z1], [w, YC, z1], [0, 0, -1], 2);
    }
  });
  const wb = STEPS[STEPS.length - 1][2];
  quad([-wb, YF, ZB], [wb, YF, ZB], [wb, YC, ZB], [-wb, YC, ZB], [0, 0, -1], 2);
  return new Float32Array(v);
}

// ---------- Szene: Baum ----------
// Stamm mit breitem Wurzelanlauf, Wurzeln auf dem Boden, Äste in vier Stufen als Bänder (Mittellinie + Radius), Laub als Haufen an den
// Zweigen und als Hülle der runden Krone.
function buildTree(seed, keep) {
  const rnd = rng(seed), R = (a, b) => mix(a, b, rnd());
  const ribbons = [], clumps = [], perches = [];
  const TH = 2.0; // Stammhöhe bis zur Krone

  const trunk = [];
  for (let i = 0; i <= 28; i++) {
    const t = i / 28;
    trunk.push({ x: 0.07 * Math.sin(t * 5 + 0.4) * t, y: YF - 0.15 + t * (TH + 0.15), z: ZT, r: 0.4 * (1 - 0.2 * t) + 0.95 * Math.exp(-t * 9), flex: 0.01 * t * t });
  }
  ribbons.push({ pts: trunk, ph: 0.3 });
  const trunkX = (y) => { const t = clamp((y - YF + 0.15) / (TH + 0.15), 0, 0.999) * 28, i = Math.floor(t); return mix(trunk[i].x, trunk[i + 1].x, t - i); };

  // Wurzeln: steigen am Stamm an und laufen in einem Bogen zum Boden, einige zum Betrachter hin oder von ihm weg
  for (let i = 0; i < 11; i++) {
    const side = i % 2 ? 1 : -1, len = R(0.9, 2.1) * (i < 4 ? 1.25 : 0.85), r0 = R(0.26, 0.4), dz = R(-0.9, 0.9), h0 = R(0.35, 1.0), ph = R(0, 6), pts = [], n = 14;
    for (let k = 0; k <= n; k++) {
      const t = k / n, r = r0 * (1 - 0.86 * t) + 0.018;
      pts.push({ x: side * (0.3 + len * t), y: YF + r * 0.5 + h0 * Math.exp(-t * 4.2) + 0.04 * Math.sin(t * 7 + ph) * (1 - t), z: ZT + dz * t * 0.6, r, flex: 0 });
    }
    ribbons.push({ pts, ph });
  }

  const addClump = (x, y, z, s, flex, ao) => { if (rnd() < keep) clumps.push({ x, y, z, s, flex, ph: rnd() * 6.283, ao, hue: rnd() }); };

  // Ast: Mittellinie mit Krümmung, außen hängt er durch; Kinder zweigen im Winkel zur Wuchsrichtung ab
  function branch(x, y, z, side, angDeg, len, zs, r0, level, flex0, o = {}) {
    const n = Math.max(8, Math.round(len * 10)), step = len / n, pts = [];
    let a = (angDeg * Math.PI) / 180, cx = x, cy = y, cz = z;
    const curve = R(-0.3, 0.3) * (level ? 1.5 : 0.7);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push({ x: cx, y: cy, z: cz, a, r: r0 * (1 - 0.82 * t) * (t > 0.82 ? 1 - ((t - 0.82) / 0.18) * 0.92 : 1) + 0.006, flex: flex0 + t * (level === 0 ? 0.5 : 0.8) }); // läuft außen in einer Spitze aus
      cx += side * Math.cos(a) * step; cy += Math.sin(a) * step; cz += zs * step;
      a += curve * step - (t > 0.5 ? (o.droop ?? 0.4) * step : 0);
      a = clamp(a, -0.5, 1.45);
    }
    ribbons.push({ pts, ph: rnd() * 6.283 });
    if (o.perch) for (const t of o.perch) { const p = pts[Math.round(t * n)]; perches.push({ x: p.x, y: p.y + p.r * 0.85, z: p.z }); }
    // Laub: außen an den Zweigen; an den Hauptästen nur das äußere Drittel, an den feinsten Zweigen nur die Spitze
    const from = [0.62, 0.3, 0.35, 0.7][level], spacing = [0.34, 0.26, 0.22, 1][level];
    for (let d = from * len; d <= len; d += spacing * (0.8 + 0.4 * rnd())) {
      if (level === 3 && rnd() < 0.4) continue;
      const p = pts[Math.min(n, Math.round((d / len) * n))], t = d / len;
      addClump(p.x + R(-0.08, 0.08), p.y + R(0, 0.12), p.z + R(-0.35, 0.35), R(0.2, 0.36) * (1 - 0.2 * t), p.flex * 0.9 + 0.3, 0.5 + 0.5 * t);
    }
    if (level < 3) {
      const kids = [5, 4, 3][level];
      for (let k = 0; k < kids; k++) {
        const t = 0.22 + ((k + rnd() * 0.6) / kids) * 0.72, p = pts[Math.min(n, Math.round(t * n))];
        const ca = (p.a * 180) / Math.PI + (k % 2 ? 1 : -1) * R(25, 55);
        branch(p.x, p.y, p.z, side, ca, len * R(0.36, 0.5), zs * 0.4 + R(-0.25, 0.25), p.r * 0.62, level + 1, p.flex);
      }
    }
  }
  // Hauptäste am oberen Stamm: Höhe, Seite, Steigung, Länge, Tiefenrichtung, Dicke, Sitzstangen (Anteil der Länge)
  const LIMBS = [
    [-0.30, 1, 24, 2.7, 0.15, 0.16, [0.28, 0.38]], [-0.12, -1, 30, 2.3, -0.12, 0.16, [0.32]], [0.04, 1, 40, 2.0, 0.2, 0.14, [0.3]],
    [0.16, -1, 48, 2.5, 0.1, 0.14], [0.28, 1, 58, 1.7, -0.15, 0.12], [0.34, -1, 64, 1.5, 0.18, 0.12], [0.4, 1, 78, 1.3, 0, 0.11], [0.4, -1, 82, 1.4, 0, 0.11],
  ];
  for (const [y, side, ang, len, zs, r0, perch] of LIMBS) branch(trunkX(YF + TH * 0.5 + y), YF + TH + y, ZT + R(-0.1, 0.2), side, ang, len, zs, r0, 0, 0.02, { perch });
  // Hülle der Krone: Haufen in einer Halbkugel-Schale, innen bleibt es licht
  for (let i = 0; i < 70; i++) {
    const u = R(-1, 1), v = R(0, 1), r = R(0.75, 1), c = Math.sqrt(1 - u * u);
    addClump(u * 2.4 * r, CROWN[1] - 0.3 + v * 1.2 * r * c, ZT + R(-1.4, 1.4) * c, R(0.25, 0.4), R(0.5, 0.9), R(0.4, 0.9));
  }
  return { ribbons, clumps, perches };
}

// Bänder in Dreiecke umsetzen: je Punkt zwei Eckpunkte (links/rechts der Mittellinie)
function ribbonMesh(ribbons) {
  const v = [], idx = [];
  for (const { pts, ph } of ribbons) {
    const base = v.length / 9;
    let len = 0;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let tx = b.x - a.x, ty = b.y - a.y; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      if (i) len += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
      const px = -ty, py = tx;
      v.push(p.x + px * p.r, p.y + py * p.r, p.z, px, py, 1, len, p.flex, ph);
      v.push(p.x - px * p.r, p.y - py * p.r, p.z, px, py, -1, len, p.flex, ph);
    }
    for (let i = 0; i < pts.length - 1; i++) { const k = base + i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  return { verts: new Float32Array(v), idx: new Uint32Array(idx) };
}

// ---------- Hauptprogramm ----------
export function startWallpaper(canvas) {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "high-performance" });
  if (!gl) throw new Error("WebGL 2 fehlt");
  const params = new URLSearchParams(location.search);

  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + "\n" + src.split("\n").slice(0, 3).join("\n")); return s; };
  const prog = ({ vs, fs }) => {
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    for (let i = 0, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    gl.useProgram(p);
    u.uPat && gl.uniform1i(u.uPat, 0); u.uRamp && gl.uniform1i(u.uRamp, 1);
    return { p, u };
  };
  const P = { sky: prog(P_SKY), hall: prog(P_HALL), tree: prog(P_TREE), leaf: prog(P_LEAF), bird: prog(P_BIRD), mote: prog(P_MOTE) };
  makePattern(gl);

  const G = {}; // gemeinsame Uniforms (Name -> Zahl oder Vektor)
  const setU = (loc, v) => { if (typeof v === "number") gl.uniform1f(loc, v); else if (v.length === 2) gl.uniform2fv(loc, v); else if (v.length === 3) gl.uniform3fv(loc, v); else gl.uniform4fv(loc, v); };
  const use = (pr) => { gl.useProgram(pr.p); for (const k in pr.u) if (k in G) setU(pr.u[k], G[k]); };

  // Geometrie
  const quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const instanced = (data, dynamic) => {
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    for (let a = 0; a < 2; a++) { gl.enableVertexAttribArray(1 + a); gl.vertexAttribPointer(1 + a, 4, gl.FLOAT, false, 32, a * 16); gl.vertexAttribDivisor(1 + a, 1); }
    gl.bindVertexArray(null);
    return { vao, buf, count: data.length / 8 };
  };
  const drawInst = (g, count = g.count) => { if (!count) return; gl.bindVertexArray(g.vao); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count); };

  const hallData = hallMesh();
  const hallVao = gl.createVertexArray(), hallBuf = gl.createBuffer();
  gl.bindVertexArray(hallVao); gl.bindBuffer(gl.ARRAY_BUFFER, hallBuf); gl.bufferData(gl.ARRAY_BUFFER, hallData, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 28, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 28, 24);
  gl.bindVertexArray(null);

  // weniger Laub auf kleinen Bildschirmen
  const small = S.small || innerWidth * innerHeight < 700 * 500;
  const tree = buildTree(2026, small ? 0.45 : 0.75);
  const mesh = ribbonMesh(tree.ribbons);
  const treeVao = gl.createVertexArray(), treeBuf = gl.createBuffer(), treeIdx = gl.createBuffer();
  gl.bindVertexArray(treeVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, treeBuf); gl.bufferData(gl.ARRAY_BUFFER, mesh.verts, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 36, 0);
  gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 36, 12);
  gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 36, 20);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, treeIdx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);

  const leaves = instanced(new Float32Array(tree.clumps.flatMap((c) => [c.x, c.y, c.z, c.s, c.flex, c.ph, c.ao, c.hue])));

  const moteData = [], mr = rng(5);
  for (let i = 0; i < (small ? 40 : 90); i++) moteData.push((mr() * 2 - 1) * 3, mr() * 4 - 1.6, 3 + mr() * 4.6, 0.012 + mr() * 0.014, i % 3 ? 0 : 1, mr(), 0.5 + mr(), 0.2 + mr() * 0.4);
  const motes = instanced(new Float32Array(moteData));

  // ---------- Vögel ----------
  const birds = [], MAXB = 24, birdData = new Float32Array(MAXB * 8);
  const birdBuf = instanced(birdData, true);
  const br = rng(404);
  const perchTaken = new Set();
  tree.perches.forEach((p, i) => { birds.push({ mode: "perch", perch: i, x: p.x, y: p.y, z: p.z, size: 0.2 + br() * 0.04, dir: br() < 0.5 ? -1 : 1, kind: [0, 2, 3, 0][i % 4], ph: br() * 6.28, look: 3 + br() * 8 }); perchTaken.add(i); });
  for (let i = 0; i < 6; i++) birds.push({ mode: "orbit", cx: br() * 1.6 - 0.8, cy: 1.2 + br() * 0.8, rx: 2.7 + br() * 1.2, ry: 0.35 + br() * 0.5, z: 4.8 + br() * 2.6, w: (0.1 + br() * 0.08) * (i % 2 ? 1 : -1), ph0: br() * 6.28, size: 0.09 + br() * 0.04, kind: 1, ph: br() * 6.28, glide: br() });
  let flyby = null, nextFlyby = 20, nextTakeoff = 6;
  const catmull = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
  const route = (pts, u) => { const n = pts.length - 3, f = clamp(u, 0, 0.9999) * n, i = Math.floor(f), t = f - i; return [0, 1, 2].map((k) => catmull(pts[i][k], pts[i + 1][k], pts[i + 2][k], pts[i + 3][k], t)); };

  function updateBirds(dt, time, dayF) {
    // ein sitzender Vogel fliegt ab: durch die Krone und die Halle, dann zu einer freien Sitzstange
    if ((nextTakeoff -= dt) < 0) {
      nextTakeoff = 16 + br() * 20;
      const cand = birds.filter((b) => b.mode === "perch");
      if (dayF > 0.5 && cand.length) {
        const b = cand[Math.floor(br() * cand.length)];
        const free = tree.perches.map((_, i) => i).filter((i) => !perchTaken.has(i) || i === b.perch);
        const target = free[Math.floor(br() * free.length)], to = tree.perches[target], s = br() < 0.5 ? -1 : 1;
        perchTaken.delete(b.perch); perchTaken.add(target);
        b.mode = "fly"; b.t = 0; b.dur = 11 + br() * 6; b.target = target;
        b.route = [[b.x - 0.5 * s, b.y - 0.2, b.z], [b.x, b.y, b.z], [b.x + 0.8 * s, b.y + 1, b.z - 0.4], [s * (1.6 + br() * 1.8), 0.6 + br() * 1.8, ZT + (br() - 0.5) * 2.4], [-s * (1.6 + br() * 1.8), 0.2 + br() * 1.8, ZT + (br() - 0.5) * 2.4],
          [to.x - Math.sign(to.x || 1) * 0.9, to.y + 0.7, to.z], [to.x, to.y, to.z], [to.x, to.y, to.z]];
      }
    }
    if ((nextFlyby -= dt) < 0) { nextFlyby = 35 + br() * 35; if (dayF > 0.5) { const s = br() < 0.5 ? -1 : 1; flyby = { t: 0, dur: 8 + br() * 3, s, y: br() * 1.4, z: 2.2 + br(), size: 0.26 + br() * 0.08, ph: 0 }; } }
    let n = 0;
    const put = (x, y, z, size, ph, dir, mode, kind) => { if (n >= MAXB) return; birdData.set([x, y, z, size, ph, dir, mode, kind], n * 8); n++; };
    for (const b of birds) {
      if (b.mode === "perch") {
        b.look -= dt; if (b.look < 0) { b.look = 4 + br() * 9; b.dir = -b.dir; }
        put(b.x, b.y + Math.sin(time * 1.4 + b.ph) * 0.005, b.z, b.size, 0, b.dir, 1, b.kind);
      } else if (b.mode === "fly") {
        b.t += dt / b.dur;
        const u = b.t, e = mix(u, u * u * (3 - 2 * u), 0.6);
        const [x, y, z] = route(b.route, e), [x2] = route(b.route, Math.min(1, e + 0.01));
        const slow = u < 0.07 || u > 0.9, rate = slow ? 17 : 11 + 5 * Math.sin(time * 0.7 + b.ph);
        b.fp = (b.fp || 0) + dt * rate;
        if (u >= 1) { b.mode = "perch"; b.perch = b.target; const p = tree.perches[b.perch]; Object.assign(b, { x: p.x, y: p.y, z: p.z, look: 4, dir: x2 >= x ? 1 : -1 }); put(b.x, b.y, b.z, b.size, 0, b.dir, 1, b.kind); }
        else put(x, y, z, b.size * (slow ? 1.05 : 1), b.fp, x2 >= x ? 1 : -1, 0, b.kind);
      } else if (b.mode === "orbit" && dayF > 0.2) {
        const a = b.ph0 + time * b.w, glide = Math.sin(time * 0.3 + b.glide * 9) > 0.35;
        b.fp = (b.fp || 0) + dt * (glide ? 0 : 9 + b.glide * 3);
        put(b.cx + Math.cos(a) * b.rx, b.cy + Math.sin(a * 1.3) * b.ry, b.z, b.size * dayF, glide ? 0.5 : b.fp, b.w * Math.sin(a) > 0 ? 1 : -1, 0, b.kind);
      }
    }
    if (flyby) {
      flyby.t += dt / flyby.dur;
      if (flyby.t >= 1) flyby = null;
      else { const u = flyby.t, x = flyby.s * mix(-5, 5, u), y = flyby.y + Math.sin(u * 6) * 0.2; flyby.ph += dt * 12; put(-x, y, flyby.z, flyby.size, flyby.ph, -flyby.s, 0, 1); }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, birdBuf.buf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, birdData, 0, n * 8);
    return n;
  }

  // ---------- Zustand ----------
  const reduced = Kopf.reduced;
  const st = { mode: params.get("zeit") || "live", wind: +(params.get("wind") ?? 1), depth: 1, paused: reduced, covered: false, quality: 1, speed: 960 };
  let simAt = performance.now();
  const timeDate = () => {
    const now = new Date();
    if (st.mode === "live") return now;
    if (st.mode === "zeitraffer") return new Date(now.getTime() + ((performance.now() - simAt) * st.speed));
    if (/^\d{1,2}:\d{2}$/.test(st.mode)) { const [h, m] = st.mode.split(":"); const d = new Date(now); d.setHours(+h, +m, 0, 0); return d; }
    return presetDate(st.mode, now);
  };
  const headFix = params.get("head")?.split(",").map(Number);

  let W = 1, H = 1, A = 1, time = 0, last = performance.now(), raf = 0;
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2) * st.quality;
    const cap = Math.min(1, Math.sqrt(5.2e6 / (innerWidth * dpr * innerHeight * dpr))); // höchstens ca. 5 Megapixel, auch auf 5K-Bildschirmen
    W = Math.max(2, Math.round(innerWidth * dpr * cap)); H = Math.max(2, Math.round(innerHeight * dpr * cap));
    canvas.width = W; canvas.height = H; A = W / H;
  }
  resize();
  let rT; addEventListener("resize", () => { clearTimeout(rT); rT = setTimeout(() => { resize(); drawOnce(); }, 100); });

  let lastLight = null;
  function frame(dt) {
    const d = timeDate();
    const Lt = light(d, A);
    lastLight = Lt;
    const hs = headFix ? { x: headFix[0], y: headFix[1] ?? 0, z: 60, source: "fest" } : Kopf.update(dt);
    const cam = hs.source === "kamera";
    const k = (cam ? 0.55 : 0.4) * st.depth * (reduced && !cam ? 0 : 1);
    const hd = cam ? clamp(HD0 * (hs.z / 60), 2.4, 6) : HD0;
    const head = [hs.x * k, hs.y * k * 0.75];
    const sc = clamp(A / 1.75, 0.62, 1);
    const dayF = smooth(-8, 4, Lt.el);
    const nB = updateBirds(dt, time, dayF);

    // Licht: aus der Richtung von Sonne/Mond, aber zum Oberlicht hin aufgerichtet, damit die Strahlen schräg durch die Halle fallen
    const kd = Lt.keyDir, lx = kd[0] * 0.9, ly = 0.55 + 0.45 * Math.max(kd[1], 0), lz = kd[2] * 0.25 - 0.05, ll = Math.hypot(lx, ly, lz);
    const day = smooth(-6, 14, Lt.el);
    const amb = mixv([0.07, 0.09, 0.17], mixv([0.86, 0.80, 0.68], Lt.hor, 0.22), day).map((v) => v * mix(0.5, 0.95, day)); // warmes Hauslicht
    const proj = (x, y, z) => { const f = hd / (hd + z); return [head[0] * (1 - f) + x * sc * f, head[1] * (1 - f) + ((y + 0.9) * sc - 0.9) * f]; };
    const dpr = H / innerHeight;
    Object.assign(G, {
      uA: A, uHd: hd, uSc: sc, uTime: time, uWind: st.paused ? 0 : st.wind * (0.85 + 0.3 * Math.sin(time * 0.05)), uPpu0: H / 2, uHead: head, uFogK: 0.35,
      uDotPx: (S.small ? 3 : Math.max(2.4, 4.4 * S.k)) * dpr, uSizeVar: 0.55, uContrast: 1, uLevels: 5, uExp: 1.0,
      uLh: [lx / ll, ly / ll, lz / ll], uSky: SKYLIGHT, uCrown: CROWN,
      uAmb: amb, uKey: Lt.key, uFog: amb.map((v) => v * 1.2), uLightScr: proj(SKYLIGHT[0], YC, SKYLIGHT[1]), uLightI: Math.min(1.4, Math.max(...Lt.key)),
      uSunScr: [Lt.sunScr[0] + head[0] * 0.9, Lt.sunScr[1] + head[1] * 0.9], uSunI: Lt.sunI,
      uZen: Lt.zen, uHor: Lt.hor, uSunCol: Lt.sunCol, uMoonLit: Lt.moonLit, uMoonScr: [Lt.moonScr[0] + head[0] * 0.9, Lt.moonScr[1] + head[1] * 0.9], uMoonI: Lt.moonI, uStars: Lt.stars, uClouds: Lt.clouds,
    });

    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1); gl.clearDepth(1);
    gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST); use(P.sky); gl.bindVertexArray(null); gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);

    use(P.hall); gl.bindVertexArray(hallVao); gl.drawArrays(gl.TRIANGLES, 0, hallData.length / 7);
    use(P.tree); gl.bindVertexArray(treeVao); gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_INT, 0);
    use(P.leaf); drawInst(leaves);
    use(P.bird); drawInst(birdBuf, nB);
    use(P.mote); drawInst(motes);
    gl.bindVertexArray(null);
  }

  // Schleife mit Leistungsanpassung; ruht, wenn der Tab verdeckt ist
  let ft = 16, slow = 0, fpsN = 0, fpsT = performance.now(), fps = 0, flip = false;
  function loop(now) {
    raf = 0;
    // ohne Kopf- oder Mausbewegung genügt die halbe Bildrate (Wind und Vögel sind langsam)
    if (Kopf.state.source === "ruhe" && (flip = !flip)) { raf = requestAnimationFrame(loop); return; }
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (!st.paused) time += dt;
    frame(dt);
    ft += (dt * 1000 - ft) * 0.05;
    if (ft > 24 && st.quality > 0.5) { if ((slow += dt) > 2) { st.quality = Math.max(0.5, st.quality - 0.125); slow = 0; resize(); } } else slow = 0;
    fpsN++; if (now - fpsT > 1000) { fps = fpsN; fpsN = 0; fpsT = now; }
    if (!document.hidden && !st.covered && (!st.paused || (Kopf.state.source !== "ruhe" && !reduced))) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf && !document.hidden && !st.covered) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const drawOnce = () => { if (!raf) frame(0); };
  document.addEventListener("visibilitychange", () => { if (!document.hidden) kick(); });
  addEventListener("pointermove", kick, { passive: true });
  kick();

  return {
    canvas, Kopf,
    get paused() { return st.paused; }, get mode() { return st.mode; }, get wind() { return st.wind; }, get depth() { return st.depth; },
    get fps() { return fps; }, get quality() { return st.quality; }, get light() { return lastLight; }, get birds() { return birds; },
    setPaused(b) { st.paused = b; b ? drawOnce() : kick(); },
    setCovered(b) { if (st.covered !== b) { st.covered = b; if (!b) kick(); } }, // ein maximiertes Fenster verdeckt alles: nicht rechnen
    setMode(m) { st.mode = m; simAt = performance.now(); drawOnce(); kick(); },
    setWind(v) { st.wind = v; drawOnce(); },
    setDepth(v) { st.depth = v; drawOnce(); },
    step(dt = 1 / 60) { time += dt; frame(dt); }, // zum Testen
  };
}
