// Hintergrund: weicher Nebel hinter den grauen Glasflächen. Drei Schichten verwirbelter Schwaden (hinten groß und langsam, vorn feiner),
// leicht bläulich bis violett getönt. Läuft auf der Grafikkarte (WebGL) in halber Auflösung mit 30 Bildern/s, hält an, wenn die Seite
// verborgen ist, und steht bei „Bewegung reduzieren“ still. Ohne WebGL bleibt ein Farbverlauf.
const VERT = "attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }";
const FRAG = `
precision highp float;
uniform vec2 res;
uniform float t;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
const mat2 R = mat2(0.80, 0.60, -0.60, 0.80);
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p = R * p * 2.02 + vec2(1.7, 9.2); a *= 0.5; } return v; }
vec2 layer(vec2 p, float time, float seed) {
  vec2 q = vec2(fbm(p + vec2(0.0, time) + seed), fbm(p + vec2(5.2, 1.3) - vec2(time * 0.8, 0.0) + seed));
  vec2 w = p + 1.9 * q;
  float d = fbm(w), l = fbm(w + vec2(0.09, 0.07));
  return vec2(d, clamp(0.5 + (d - l) * 4.0, 0.0, 1.0));
}
void main() {
  vec2 uv = gl_FragCoord.xy / res;
  vec2 p = (gl_FragCoord.xy - 0.5 * res) / res.y;
  float time = t * 0.02;
  vec3 col = mix(vec3(0.020, 0.024, 0.032), vec3(0.008, 0.010, 0.014), smoothstep(0.25, 1.0, uv.y));
  // Farbe wandert langsam über die Fläche: kühles Blau links unten, Violett rechts oben
  vec2 wob = vec2(fbm(p * 1.4 + time * 0.7), fbm(p * 1.4 - time * 0.5 + 7.3)) - 0.5;
  float k = clamp(uv.x * 0.6 + uv.y * 0.5 + wob.x * 0.6, 0.0, 1.0);
  vec3 tint = mix(vec3(0.20, 0.42, 0.62), vec3(0.42, 0.28, 0.62), k);
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float scale = 0.75 + fi * 0.7;
    vec2 drift = vec2(time * (0.5 + fi * 0.45), -time * (0.15 + fi * 0.1));
    vec2 dl = layer(p * scale + drift, time * (1.0 + fi * 0.5), fi * 13.7);
    float dens = smoothstep(0.30, 0.78, dl.x);
    vec3 lit = tint * (0.45 + 1.1 * dl.y) + vec3(0.06, 0.07, 0.09) * dl.y * dl.y;
    vec3 shade = tint * 0.14 + vec3(0.012, 0.014, 0.020);
    vec3 fogc = mix(shade, lit, smoothstep(0.15, 0.95, dl.y)) * (0.75 + 0.5 * dens);
    col = mix(col, fogc * (0.40 + fi * 0.16), dens * (0.62 + fi * 0.14));
  }
  col += tint * exp(-length((uv - vec2(0.82, 1.05)) * vec2(1.2, 1.6)) * 2.4) * 0.10;
  col *= mix(0.78, 1.0, smoothstep(1.6, 0.45, length(p * vec2(0.75, 1.0))));
  col += (hash(gl_FragCoord.xy + fract(t) * 91.0) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

export function startBackground() {
  const canvas = document.createElement("canvas");
  canvas.className = "bg-shader";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);
  const fail = () => { canvas.remove(); document.body.classList.add("no-shader"); };
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) return fail();
  const shader = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return fail();
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const uRes = gl.getUniformLocation(prog, "res"), uT = gl.getUniformLocation(prog, "t");
  const still = matchMedia("(prefers-reduced-motion: reduce)");
  const t0 = performance.now() - 60_000; // das erste Bild steht schon „mittendrin“
  const draw = () => {
    const w = Math.max(1, Math.round(innerWidth * devicePixelRatio * 0.5)), h = Math.max(1, Math.round(innerHeight * devicePixelRatio * 0.5));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    gl.uniform2f(uRes, w, h);
    gl.uniform1f(uT, still.matches ? 60 : (performance.now() - t0) / 1000);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  let last = 0;
  const loop = (now) => { if (!document.hidden && !still.matches && now - last >= 33) { last = now; draw(); } requestAnimationFrame(loop); };
  addEventListener("resize", draw);
  draw();
  requestAnimationFrame(loop);
}
