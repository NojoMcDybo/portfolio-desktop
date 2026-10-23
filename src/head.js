// Kopf: Blickposition des Betrachters für den 3D-Effekt des Hintergrunds (aus dem Schichtenwald-Prototyp übernommen).
// Liefert pro Frame eine geglättete Position: state.x, state.y in [-1, 1] (+x = rechts, +y = oben), state.z = Abstand zum Bildschirm in cm
// (Schätzung, nur mit Kamera, sonst 60), state.source = 'kamera' | 'zeiger' | 'ruhe'.
// Quellen nach Vorrang: Kamera (Gesicht gefunden) > Zeiger (zuletzt bewegt) > Ruhedrift. Die Kamera startet nur auf Klick; das Bild wird
// ausschließlich im Browser ausgewertet (MediaPipe Gesichtserkennung, Modell von Google Storage), nichts wird gesendet.
const MP_VER = "1.0.1";
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VER}`;
const MODEL = "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite";
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

// One-Euro-Filter (Casiez, Roussel, Vogel 2012): wenig Zittern in Ruhe, wenig Verzögerung bei schneller Bewegung
function OneEuro(minCutoff = 1.0, beta = 1.2, dCutoff = 1.0) {
  let xPrev = null, dxPrev = 0, tPrev = null;
  const alpha = (cutoff, dt) => { const r = 2 * Math.PI * cutoff * dt; return r / (r + 1); };
  return (x, t) => {
    if (xPrev === null) { xPrev = x; tPrev = t; return x; }
    const dt = Math.max(1e-3, (t - tPrev) / 1000); tPrev = t;
    const aD = alpha(dCutoff, dt); dxPrev = aD * ((x - xPrev) / dt) + (1 - aD) * dxPrev;
    const a = alpha(minCutoff + beta * Math.abs(dxPrev), dt); xPrev = a * x + (1 - a) * xPrev;
    return xPrev;
  };
}

const state = { x: 0, y: 0, z: 60, source: "ruhe", camera: "aus", fps: 0 };
const target = { x: 0, y: 0, z: 60 };
const pointer = { x: 0, y: 0, t: -1e9 };
const cam = { x: 0, y: 0, z: 60, t: -1e9, on: false, center: null, samples: [] };
const listeners = new Set();
const setCam = (s, detail) => { state.camera = s; listeners.forEach((fn) => fn(s, detail)); };

addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -((e.clientY / innerHeight) * 2 - 1);
  pointer.t = performance.now();
}, { passive: true });

let video = null, detector = null, stream = null, loopId = 0, lastVideoTime = -1, frames = 0, fpsT = performance.now();
const fx = OneEuro(1.0, 1.4), fy = OneEuro(1.0, 1.4), fz = OneEuro(0.6, 0.3);
const HFOV = (60 * Math.PI) / 180; // typische Laptop-Webcam, horizontales Sichtfeld (Annahme)
const FACE_CM = 15; // Breite der Gesichtsbox im echten Gesicht (Annahme)

async function loadDetector() {
  const vision = await import(`${MP_BASE}/vision_bundle.mjs`);
  const fileset = await vision.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
  let det, lastErr;
  for (const delegate of ["GPU", "CPU"]) {
    try { det = await vision.FaceDetector.createFromOptions(fileset, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: "VIDEO", minDetectionConfidence: 0.5 }); break; }
    catch (e) { lastErr = e; }
  }
  if (!det) throw lastErr;
  return (v, now) => {
    const d = det.detectForVideo(v, now).detections[0];
    if (!d) return null;
    const b = d.boundingBox;
    return { cx: (b.originX + b.width / 2) / v.videoWidth, cy: (b.originY + b.height * 0.42) / v.videoHeight, fw: b.width / v.videoWidth };
  };
}

async function startCamera() {
  if (cam.on) return true;
  if (!navigator.mediaDevices?.getUserMedia) { setCam("nicht verfügbar", "Dieser Browser erlaubt keinen Kamerazugriff."); return false; }
  setCam("fragt");
  try { stream = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }, audio: false }); }
  catch (e) { setCam("verweigert", e.name === "NotAllowedError" ? "Kamera nicht erlaubt. Die Maus funktioniert weiter." : `Kamera nicht verfügbar (${e.name}).`); return false; }
  setCam("lädt");
  video = document.createElement("video");
  video.playsInline = true; video.muted = true; video.srcObject = stream;
  await video.play().catch(() => {});
  try { detector = detector || (await loadDetector()); }
  catch (e) { stopCamera(); setCam("fehler", "Die Gesichtserkennung konnte nicht geladen werden."); console.warn(e); return false; }
  cam.on = true; cam.center = null; cam.samples = [];
  setCam("sucht");
  const id = ++loopId;
  const tick = () => {
    if (id !== loopId) return;
    if (video && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
      lastVideoTime = video.currentTime;
      const now = performance.now();
      let r = null;
      try { r = detector(video, now); } catch (e) { console.warn(e); }
      if (r) {
        const dist = FACE_CM / (2 * Math.tan(HFOV / 2) * r.fw);
        // Kamerabild ist nicht gespiegelt: geht der Betrachter nach rechts, wandert das Gesicht im Bild nach links
        const rawX = (0.5 - r.cx) * 2, rawY = (0.5 - r.cy) * 2;
        if (!cam.center) { cam.samples.push([rawX, rawY]); if (cam.samples.length >= 12) cam.center = cam.samples.reduce((a, s) => [a[0] + s[0] / cam.samples.length, a[1] + s[1] / cam.samples.length], [0, 0]); }
        const ox = cam.center ? cam.center[0] : rawX, oy = cam.center ? cam.center[1] : rawY;
        cam.x = fx(Math.max(-1, Math.min(1, (rawX - ox) * 1.6)), now);
        cam.y = fy(Math.max(-1, Math.min(1, (rawY - oy) * 1.6)), now);
        cam.z = fz(Math.max(25, Math.min(150, dist)), now);
        cam.t = now;
        if (state.camera !== "aktiv") setCam("aktiv");
      } else if (state.camera === "aktiv" && now - cam.t > 800) setCam("sucht");
      frames++;
      if (now - fpsT > 1000) { state.fps = frames; frames = 0; fpsT = now; }
    }
    if (!video) return;
    video.requestVideoFrameCallback ? video.requestVideoFrameCallback(tick) : requestAnimationFrame(tick);
  };
  tick();
  return true;
}

function stopCamera(detail) {
  loopId++;
  cam.on = false;
  if (stream) stream.getTracks().forEach((t) => t.stop());
  if (video) video.srcObject = null;
  stream = null; video = null;
  setCam("aus", detail);
}
// Die Kamera läuft nie im Hintergrund weiter
document.addEventListener("visibilitychange", () => { if (document.hidden && cam.on) stopCamera("pausiert"); });

/** Pro Frame aufrufen (dt in Sekunden); liefert den geglätteten Zustand */
function update(dt) {
  const now = performance.now();
  let src;
  if (cam.on && now - cam.t < 2000) { src = "kamera"; target.x = cam.x; target.y = cam.y; target.z = cam.z; }
  else if (now - pointer.t < 4000) { src = "zeiger"; target.x = pointer.x; target.y = pointer.y; target.z = 60; }
  else {
    src = "ruhe";
    const s = now / 1000, amp = reduced ? 0 : 0.28;
    target.x = Math.sin(s * 0.13) * amp + Math.sin(s * 0.051) * amp * 0.5;
    target.y = Math.sin(s * 0.09 + 1.3) * amp * 0.45;
    target.z = 60;
  }
  state.source = src;
  const k = src === "kamera" ? 1 - Math.exp(-dt * 30) : 1 - Math.exp(-dt * (src === "zeiger" ? 5 : 2.2)); // Kamera ist schon gefiltert, der Rest wird weich nachgeführt
  state.x += (target.x - state.x) * k;
  state.y += (target.y - state.y) * k;
  state.z += (target.z - state.z) * k;
  return state;
}

export const Kopf = { state, update, startCamera, stopCamera, reduced, onCamera: (fn) => listeners.add(fn), recenter: () => { cam.center = null; cam.samples = []; } };
