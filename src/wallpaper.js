// Desktop-Hintergrund: ein riesiger Baum in echter Tiefe (WebGL2), alles in Oberflächen-stabilem Fraktal-Dithering (siehe wallpaper-shaders.js).
// Wind bewegt Äste, Laub und Gras, Vögel sitzen und fliegen, der Himmel folgt Datum und Uhrzeit (daylight.js), und der Blick durchs "Fenster"
// folgt dem Kopf (Webcam) oder der Maus (head.js): ferne Ebenen laufen mit, nahe dagegen.
import { Kopf } from "./head.js";
import { light, presetDate } from "./daylight.js";
import { S } from "./stage.js";
import { SKY, HILL, TREE, LEAF, BIRD, GRASS, MOTE } from "./wallpaper-shaders.js";

const HD0 = 3.4; // Abstand des Betrachters zum Fenster in halben Bildhöhen
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hash1 = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const noise1 = (x) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return mix(hash1(i), hash1(i + 1), u); };
const fbm1 = (x) => noise1(x) * 0.5 + noise1(x * 2.03 + 7.1) * 0.25 + noise1(x * 4.07 + 3.3) * 0.125;

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

// ---------- Szene: Baum ----------
// Koordinaten: x rechts, y oben, halbe Bildhöhe = 1, z = Tiefe hinter dem Bildschirm (negativ: davor). Stamm und Äste sind Bänder
// (Mittellinie + Radius), das Laub sind Haufen an den Zweigspitzen.
function buildTree(seed, keep) {
  const rnd = rng(seed), R = (a, b) => mix(a, b, rnd());
  const ribbons = [], clumps = [], perches = [];
  const TZ = 0.9, FORK = 0.45;

  // Stamm: leicht geschwungen, unten mit Wurzelanlauf, teilt sich oben in zwei Leitäste
  const trunk = [];
  for (let i = 0; i <= 26; i++) {
    const t = i / 26;
    trunk.push({ x: 0.06 * Math.sin(t * 4.2 + 0.5) * t, y: -1.05 + t * (FORK + 1.05), z: TZ, r: 0.42 * (1 - 0.2 * t) + 0.55 * Math.exp(-t * 12), flex: 0.012 * t * t });
  }
  ribbons.push({ pts: trunk, ph: 0.3 });
  const trunkAt = (y) => { const t = clamp((y + 1.05) / (FORK + 1.05), 0, 0.999) * 26, i = Math.floor(t), f = t - i; return { x: mix(trunk[i].x, trunk[i + 1].x, f), r: mix(trunk[i].r, trunk[i + 1].r, f) }; };

  const addClump = (x, y, z, s, flex, ao) => { if (rnd() < keep) clumps.push({ x, y, z, s, flex, ph: rnd() * 6.283, ao, hue: rnd() }); };

  // Ast: Mittellinie mit Krümmung, außen hängt er durch; Kinder zweigen im Winkel zur Wuchsrichtung ab
  function branch(x, y, z, side, angDeg, len, zs, r0, level, flex0, o = {}) {
    const n = Math.max(8, Math.round(len * 10)), step = len / n, pts = [], taper = o.taper ?? 0.82;
    let a = (angDeg * Math.PI) / 180, cx = x, cy = y, cz = z;
    const curve = R(-0.3, 0.3) * (level ? 1.5 : 0.7);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push({ x: cx, y: cy, z: cz, a, r: r0 * (1 - taper * t) * (t > 0.82 ? 1 - ((t - 0.82) / 0.18) * 0.92 : 1) + 0.006, // läuft außen in einer Spitze aus
        flex: flex0 + t * (level === 0 ? 0.5 : 0.8) });
      cx += side * Math.cos(a) * step; cy += Math.sin(a) * step; cz += zs * step;
      a += curve * step - (t > (o.droopFrom ?? 0.5) ? (o.droop ?? 0.45) * step : 0);
      a = clamp(a, -0.5, 1.45);
    }
    ribbons.push({ pts, ph: rnd() * 6.283 });
    if (o.perch) for (const t of o.perch) { const p = pts[Math.round(t * n)]; perches.push({ x: p.x, y: p.y + p.r * 0.85, z: p.z }); }
    // Laub: außen an den Zweigen, an den Hauptästen nur das äußere Drittel
    const from = level === 0 ? (o.leafFrom ?? 0.62) : 0.3, spacing = level === 0 ? 0.32 : 0.24;
    for (let d = from * len; d <= len; d += spacing * (0.8 + 0.4 * rnd())) {
      const p = pts[Math.min(n, Math.round((d / len) * n))], t = d / len;
      addClump(p.x + R(-0.08, 0.08), p.y + R(0, 0.14), p.z + R(-0.3, 0.3), R(0.2, 0.38) * (1 - 0.2 * t), p.flex * 0.9 + 0.3, 0.5 + 0.5 * t);
    }
    if (level < 2) {
      const kids = o.kids ?? (level === 0 ? 5 : 3);
      for (let k = 0; k < kids; k++) {
        const t = 0.25 + ((k + rnd() * 0.6) / kids) * 0.7, p = pts[Math.min(n, Math.round(t * n))];
        const ca = (p.a * 180) / Math.PI + (k % 2 ? 1 : -1) * R(25, 55);
        branch(p.x, p.y, p.z, side, ca, len * R(0.34, 0.5), zs * 0.4 + R(-0.2, 0.2), p.r * 0.62, level + 1, p.flex);
      }
    }
  }
  // Ausladende Äste unter der Gabelung: Höhe am Stamm, Seite, Steigung, Länge, Tiefenrichtung, Dicke, Sitzstangen
  const LIMBS = [
    [-0.42, 1, 16, 2.9, 0.10, 0.10, [0.34, 0.46]], [-0.22, -1, 20, 3.0, 0.12, 0.11, [0.40]], [0.02, 1, 27, 2.6, 0.14, 0.10, [0.38]],
    [0.18, -1, 34, 2.5, 0.10, 0.09], [0.30, 1, 40, 2.3, 0.18, 0.085],
  ];
  for (const [y, side, ang, len, zs, r0, perch] of LIMBS) {
    const tr = trunkAt(y);
    branch(tr.x, y, TZ + 0.14, side, ang, len, zs, r0, 0, 0.02, { perch, droop: 0.28 });
  }
  // zwei Leitäste setzen den Stamm fort und tragen die Krone; zwischen ihnen bleibt der Himmel offen
  const top = trunk[trunk.length - 1];
  branch(top.x - 0.1, FORK - 0.05, TZ - 0.04, -1, 60, 2.9, -0.06, 0.25, 0, 0.02, { taper: 0.7, kids: 7, leafFrom: 0.4, droopFrom: 0.3, droop: 0.32 });
  branch(top.x + 0.1, FORK - 0.05, TZ + 0.04, 1, 57, 2.9, 0.08, 0.24, 0, 0.02, { taper: 0.7, kids: 7, leafFrom: 0.4, droopFrom: 0.3, droop: 0.32 });
  // Kronendach: Haufen links und rechts über den Leitästen, in der Mitte nur wenige
  for (let i = 0; i < 40; i++) {
    const x = (rnd() < 0.5 ? -1 : 1) * R(0.35, 2.6), y = R(0.95, 1.6) - Math.abs(x) * 0.06;
    addClump(x, y, R(-0.1, 1.9), R(0.28, 0.5), R(0.5, 0.9), R(0.35, 0.8));
  }
  // einige große Blätter weit vorn als Rahmen
  for (let i = 0; i < 6; i++) addClump((i % 2 ? 1 : -1) * R(1.7, 2.7), R(0.6, 1.5), R(-1.1, -0.55), R(0.45, 0.7), 0.9, 0.95);
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

// Kammlinie als Streifen (oben die Linie, unten ein Fußpunkt), in Bildschirmeinheiten der Ebene gerechnet
function hillStrip(z, base, amp, freq, ridge, seed, floor = -2.6) {
  const f = HD0 / (HD0 + z), step = 0.02, range = 7.5, v = [];
  for (let u = -range; u <= range; u += step) {
    const y = base + (fbm1(u * freq + seed) - 0.35) * amp + ridge * (noise1(u * 38 + seed) - 0.4) * (0.4 + noise1(u * 3 + seed));
    v.push(u / f, y, z, 0, u / f, floor, z, 1);
  }
  return new Float32Array(v);
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
  const P = { sky: prog(SKY), hill: prog(HILL), tree: prog(TREE), leaf: prog(LEAF), bird: prog(BIRD), grass: prog(GRASS), mote: prog(MOTE) };
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

  // Szene aufbauen; weniger Laub auf kleinen Bildschirmen
  const small = S.small || innerWidth * innerHeight < 700 * 500;
  const tree = buildTree(2026, small ? 0.55 : 1);
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

  const strip = (data) => {
    const vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 16, 0); gl.bindVertexArray(null);
    return { vao, n: data.length / 4 };
  };
  // Ebenen von hinten nach vorn: Kamm, Hügel, Wiese hinter dem Baum, Boden vor dem Stamm
  const HILLS = [
    { g: strip(hillStrip(16, -0.05, 0.22, 0.5, 0.02, 3)), base: [0.20, 0.29, 0.38], base2: [0.27, 0.35, 0.41], detail: 0.6 },
    { g: strip(hillStrip(10, -0.26, 0.26, 0.45, 0.07, 11)), base: [0.09, 0.21, 0.17], base2: [0.14, 0.28, 0.18], detail: 0.9 },
    { g: strip(hillStrip(5.5, -0.46, 0.2, 0.55, 0.04, 23)), base: [0.08, 0.19, 0.10], base2: [0.17, 0.31, 0.12], detail: 1.2 },
    { g: strip(hillStrip(1.8, -0.58, 0.14, 0.6, 0.0, 31)), base: [0.10, 0.25, 0.08], base2: [0.21, 0.40, 0.12], detail: 1.6 },
    { g: strip(hillStrip(0.45, -0.82, 0.07, 0.8, 0.0, 41)), base: [0.06, 0.15, 0.05], base2: [0.13, 0.27, 0.08], detail: 2.0, front: true },
  ];
  const grassData = [];
  const gr = rng(77);
  const blades = (n, z, y0, y1, h0, h1, wid, tilt, dark) => {
    const f = HD0 / (HD0 + z);
    for (let i = 0; i < n; i++) {
      const xs = (gr() * 2 - 1) * 3.4, x = xs / f;
      grassData.push(x, y0 + gr() * (y1 - y0), z, h0 + gr() * (h1 - h0), gr() * 6.283, (gr() - 0.5) * tilt, wid * (0.7 + gr() * 0.6), dark * (0.6 + gr() * 0.6));
    }
  };
  const nb = small ? 0.6 : 1;
  blades(Math.round(160 * nb), 1.7, -0.6, -0.56, 0.1, 0.2, 0.14, 0.5, 0.9);
  blades(Math.round(260 * nb), 0.4, -0.84, -0.8, 0.18, 0.34, 0.15, 0.7, 0.9);
  blades(Math.round(150 * nb), -0.55, -1.02, -0.98, 0.3, 0.6, 0.17, 0.8, 0.6);
  const grass = instanced(new Float32Array(grassData));

  const moteData = [], mr = rng(5);
  for (let i = 0; i < (small ? 40 : 90); i++) moteData.push((mr() * 2 - 1) * 2.6, mr() * 2.2 - 0.9, mr() * 4 + 0.3, 0.008 + mr() * 0.014, i % 3 ? 0 : 1, mr(), 0.5 + mr(), 0.15 + mr() * 0.3);
  const motes = instanced(new Float32Array(moteData));

  // ---------- Vögel ----------
  const birds = [], MAXB = 24, birdData = new Float32Array(MAXB * 8);
  const birdBuf = instanced(birdData, true);
  const br = rng(404);
  const perchTaken = new Set();
  tree.perches.forEach((p, i) => { birds.push({ mode: "perch", perch: i, x: p.x, y: p.y, z: p.z, size: 0.095 + br() * 0.02, dir: br() < 0.5 ? -1 : 1, kind: [0, 2, 3, 0][i % 4], ph: br() * 6.28, look: 3 + br() * 8 }); perchTaken.add(i); });
  for (let i = 0; i < 6; i++) birds.push({ mode: "orbit", cx: br() * 1.2 - 0.6, cy: 0.7 + br() * 0.5, rx: 1.4 + br() * 1.4, ry: 0.15 + br() * 0.3, z: 3 + br() * 4, w: (0.1 + br() * 0.08) * (i % 2 ? 1 : -1), ph0: br() * 6.28, size: 0.05 + br() * 0.02, kind: 1, ph: br() * 6.28, glide: br() });
  let flyby = null, nextFlyby = 20, nextTakeoff = 6;
  const catmull = (p0, p1, p2, p3, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3); };
  const route = (pts, u) => { const n = pts.length - 3, f = clamp(u, 0, 0.9999) * n, i = Math.floor(f), t = f - i; return pts.slice(i, i + 4).length === 4 ? [0, 1, 2].map((k) => catmull(pts[i][k], pts[i + 1][k], pts[i + 2][k], pts[i + 3][k], t)) : pts[pts.length - 2]; };

  function updateBirds(dt, time, dayF) {
    // ein sitzender Vogel fliegt ab: über die Krone, dann zu einer freien Sitzstange
    if ((nextTakeoff -= dt) < 0) {
      nextTakeoff = 16 + br() * 20;
      const cand = birds.filter((b) => b.mode === "perch");
      if (dayF > 0.5 && cand.length) {
        const b = cand[Math.floor(br() * cand.length)];
        const free = tree.perches.map((_, i) => i).filter((i) => !perchTaken.has(i) || i === b.perch);
        const to = tree.perches[free[Math.floor(br() * free.length)]], from = { x: b.x, y: b.y, z: b.z };
        const s = br() < 0.5 ? -1 : 1, up = (x, y, z) => [x, y, z];
        perchTaken.delete(b.perch);
        b.mode = "fly"; b.t = 0; b.dur = 11 + br() * 6; b.target = free.find((i) => tree.perches[i] === to); perchTaken.add(b.target);
        b.route = [up(from.x - 0.3 * s, from.y - 0.1, from.z), up(from.x, from.y, from.z), up(from.x + 0.4 * s, from.y + 0.5, from.z - 0.3), up(s * (0.7 + br() * 1.3), 0.5 + br() * 0.8, 0.3 + br() * 1.2), up(-s * (0.7 + br() * 1.5), 0.2 + br() * 0.9, -0.2 + br() * 1.5), up(to.x - (to.x > 0 ? 0.5 : -0.5), to.y + 0.35, to.z), up(to.x, to.y, to.z), up(to.x, to.y, to.z)];
      }
    }
    if ((nextFlyby -= dt) < 0) { nextFlyby = 35 + br() * 35; if (dayF > 0.5) { const s = br() < 0.5 ? -1 : 1; flyby = { t: 0, dur: 8 + br() * 3, s, y: 0.1 + br() * 0.7, z: -0.35 + br() * 0.4, size: 0.1 + br() * 0.03, ph: 0 }; } }
    let n = 0;
    const put = (x, y, z, size, ph, dir, mode, kind) => { if (n >= MAXB) return; birdData.set([x, y, z, size, ph, dir, mode, kind], n * 8); n++; };
    for (const b of birds) {
      b.ph += dt * (b.mode === "perch" ? 0 : 1);
      if (b.mode === "perch") {
        b.look -= dt; if (b.look < 0) { b.look = 4 + br() * 9; b.dir = -b.dir; }
        put(b.x, b.y + Math.sin(time * 1.4 + b.ph) * 0.002, b.z, b.size, 0, b.dir, 1, b.kind);
      } else if (b.mode === "fly") {
        b.t += dt / b.dur;
        const u = b.t, e = mix(u, u * u * (3 - 2 * u), 0.6);
        const [x, y, z] = route(b.route, e), [x2] = route(b.route, Math.min(1, e + 0.01));
        const slow = u < 0.07 || u > 0.9, rate = slow ? 17 : 11 + 5 * Math.sin(time * 0.7 + b.ph);
        b.fp = (b.fp || 0) + dt * rate;
        if (u >= 1) { b.mode = "perch"; b.perch = b.target; const p = tree.perches[b.perch]; Object.assign(b, { x: p.x, y: p.y, z: p.z, look: 4, dir: x2 >= x ? 1 : -1 }); perchTaken.add(b.perch); put(b.x, b.y, b.z, b.size, 0, b.dir, 1, b.kind); }
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
      else { const u = flyby.t, x = flyby.s * mix(-3.2, 3.2, u), y = flyby.y + Math.sin(u * 6) * 0.12; flyby.ph += dt * 12; put(-x, y, flyby.z, flyby.size, flyby.ph, -flyby.s, 0, 1); }
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

    const dpr = H / innerHeight;
    Object.assign(G, {
      uA: A, uHd: hd, uSc: sc, uTime: time, uWind: st.paused ? 0 : st.wind * (0.85 + 0.3 * Math.sin(time * 0.05)), uPpu0: H / 2, uHead: head,
      uDotPx: (S.small ? 3 : Math.max(2.4, 4.4 * S.k)) * dpr, uSizeVar: 0.55, uContrast: 1, uLevels: 5, uExp: 0.95,
      uAmb: Lt.amb, uKey: Lt.key, uL: Lt.keyDir, uFog: Lt.fog, uSunScr: [Lt.sunScr[0] + head[0] * 0.9, Lt.sunScr[1] + head[1] * 0.9], uSunI: Lt.sunI,
      uZen: Lt.zen, uHor: Lt.hor, uSunCol: Lt.sunCol, uMoonLit: Lt.moonLit, uMoonScr: [Lt.moonScr[0] + head[0] * 0.9, Lt.moonScr[1] + head[1] * 0.9], uMoonI: Lt.moonI, uStars: Lt.stars, uClouds: Lt.clouds,
    });

    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 1); gl.clearDepth(1);
    gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);

    gl.disable(gl.DEPTH_TEST); use(P.sky); gl.bindVertexArray(null); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.enable(gl.DEPTH_TEST);

    use(P.hill);
    for (const h of HILLS.filter((x) => !x.front).slice(0, 4)) { gl.uniform3fv(P.hill.u.uBase, h.base); gl.uniform3fv(P.hill.u.uBase2, h.base2); gl.uniform1f(P.hill.u.uDetail, h.detail); gl.bindVertexArray(h.g.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, h.g.n); }
    use(P.tree); gl.bindVertexArray(treeVao); gl.drawElements(gl.TRIANGLES, mesh.idx.length, gl.UNSIGNED_INT, 0);
    use(P.leaf); drawInst(leaves);
    use(P.bird); drawInst(birdBuf, nB);
    use(P.hill);
    for (const h of HILLS.filter((x) => x.front)) { gl.uniform3fv(P.hill.u.uBase, h.base); gl.uniform3fv(P.hill.u.uBase2, h.base2); gl.uniform1f(P.hill.u.uDetail, h.detail); gl.bindVertexArray(h.g.vao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, h.g.n); }
    use(P.grass); drawInst(grass);
    use(P.mote); drawInst(motes);
    gl.bindVertexArray(null);
  }

  // Schleife mit Leistungsanpassung; ruht, wenn der Tab verdeckt ist
  let ft = 16, slow = 0, fpsN = 0, fpsT = performance.now(), fps = 0;
  let flip = false;
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

  const api = {
    canvas, Kopf,
    get paused() { return st.paused; }, get mode() { return st.mode; }, get wind() { return st.wind; }, get depth() { return st.depth; },
    get fps() { return fps; }, get quality() { return st.quality; }, get light() { return lastLight; },
    setPaused(b) { st.paused = b; b ? drawOnce() : kick(); },
    setCovered(b) { if (st.covered !== b) { st.covered = b; if (!b) kick(); } }, // ein maximiertes Fenster verdeckt alles: nicht rechnen
    setMode(m) { st.mode = m; simAt = performance.now(); drawOnce(); kick(); },
    setWind(v) { st.wind = v; drawOnce(); },
    setDepth(v) { st.depth = v; drawOnce(); },
    get birds() { return birds; },
    step(dt = 1 / 60) { time += dt; frame(dt); }, // zum Testen
  };
  return api;
}
