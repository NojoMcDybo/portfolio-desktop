// Die „Rust-Seite“ der Notch, nachgebaut im Browser. Die Notch-Oberfläche (apps/notch, gebaut aus dem Notch-Repo) fragt hier
// dieselben Befehle ab und hört dieselben Ereignisse wie in der echten App (src-tauri: media.rs, activities.rs, timer.rs, sport.rs,
// shelf.rs …). Alles ist Beispieldaten: Musik ohne Ton, Blutzucker und Puls erzeugt, Spiele erfunden. Die Datenformen sind die der
// echten App (Media, Activity, PomoInfo, SportState …), damit die Oberfläche unverändert läuft.
// Die Notch-Oberfläche und das Einstellungsfenster (zwei iframes) teilen sich dieses eine Objekt: window.__notchBackend.

const now = () => Date.now();
const svgUrl = (svg) => "data:image/svg+xml," + encodeURIComponent(svg);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const LSK = "portfolio.notch.";
const lsGet = (k, d = null) => { try { const v = localStorage.getItem(LSK + k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(LSK + k, JSON.stringify(v)); } catch {} };

export function createNotchBackend({ toast = () => {} } = {}) {
  const subs = {};
  const on = (name, fn) => { (subs[name] ??= new Set()).add(fn); return () => subs[name].delete(fn); };
  const emit = (name, payload) => subs[name]?.forEach((f) => f(payload));

  // ---------- Musik ----------
  const TRACKS = [
    { title: "Neonlicht", artist: "Kleine Wellen", album: "Nachtfahrt", dur: 214, c: ["#ff7a59", "#7b2ff7"] },
    { title: "Nachtbus", artist: "Hafenstadt", album: "Linie 7", dur: 187, c: ["#2dd4bf", "#1d4ed8"] },
    { title: "Zwischen den Zeilen", artist: "Mira Sand", album: "Randnotizen", dur: 241, c: ["#f9d423", "#ff4e50"] },
  ];
  const coverOf = (t) => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.c[0]}"/><stop offset="1" stop-color="${t.c[1]}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/><circle cx="100" cy="100" r="46" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="6"/><circle cx="100" cy="100" r="10" fill="rgba(255,255,255,.85)"/></svg>`);
  let ti = 0, playing = true, pos = 41, posAt = now();
  const position = () => pos + (playing ? (now() - posAt) / 1000 : 0);
  const media = () => ({ title: TRACKS[ti].title, artist: TRACKS[ti].artist, album: TRACKS[ti].album, source: "Spotify", playing, position: position(), duration: TRACKS[ti].dur, can_seek: true, can_next: true, can_prev: true, sessions: 1, key: "demo:" + ti });
  const pushMedia = () => { emit("media", media()); emit("media-cover", { key: "demo:" + ti, src: coverOf(TRACKS[ti]) }); };
  let volume = lsGet("volume", { level: 0.45, muted: false, device: "Lautsprecher (Demo)", follows_player: true });

  // ---------- Aktivitäten ----------
  const acts = new Map();
  const publish = () => emit("activities", [...acts.values()].sort((a, b) => b.priority - a.priority));
  const upsert = (a, { alert = false, ttl = 0 } = {}) => {
    const rec = { actions: [], priority: 0, ...a, alert, updated: now() };
    acts.set(a.id, rec);
    publish();
    if (alert) emit("activity-alert", a.id);
    if (ttl) setTimeout(() => { if (acts.get(a.id)?.updated === rec.updated) remove(a.id); }, ttl * 1000);
  };
  const remove = (id) => { if (acts.delete(id)) publish(); };
  const icon = (d, c, extra = "") => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${d}</svg>`);
  const dropIcon = (c) => icon('<path d="M12 3.5s6 6.2 6 10.6a6 6 0 0 1-12 0C6 9.700 12 3.500 12 3.500z"/>', c);
  const heartIcon = (c) => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${c}"><path d="M12 20.5s-7.500-4.600-7.500-10A4.300 4.300 0 0 1 12 7.800a4.300 4.300 0 0 1 7.500 2.700c0 5.400-7.500 10-7.500 10z"/></svg>`);

  // Blutzucker (Haze): Verlaufs-Activity mit Graph; Werte erzeugt, alle 45 s kommt eine neue Messung (echt: alle 5 Minuten)
  const BG = { v: 118, readings: [] };
  { let v = 112, t = now() - 5 * 60e3; for (let i = 0; i < 288; i++) { v = clamp(v + rnd(-5, 5.4) + (125 - v) * 0.03, 78, 178); BG.readings.unshift([t - i * 5 * 60e3, Math.round(v)]); } BG.v = BG.readings.at(-1)[1]; }
  const bgAct = () => {
    const r = BG.readings, last = r.at(-1), prev = r.at(-2), v = last[1], d = prev ? v - prev[1] : 0, a = Math.abs(d);
    const trend = a < 2 ? "flat" : a < 4 ? (d > 0 ? "up45" : "down45") : a < 7 ? (d > 0 ? "up" : "down") : d > 0 ? "up2" : "down2";
    const color = v > 180 ? "#EDBC56" : v < 70 ? "#FF7971" : "#E8EFEF";
    return { id: "haze:bg", app: "Haze", title: "Blutzucker (Demo)", subtitle: "Beispielwerte · kein Medizinprodukt", value: v, unit: "mg/dl", color, icon: dropIcon(color), priority: 10, trend, delta: d, pid: 1, chart: { low: 70, high: 180, points: r.slice(-288), ranges: [3, 6, 12, 24], range: 3 } };
  };
  const bgTick = () => { const l = BG.readings.at(-1)[1]; BG.readings.push([now(), Math.round(clamp(l + rnd(-6, 6.5) + (125 - l) * 0.04, 72, 190))]); if (BG.readings.length > 400) BG.readings.shift(); upsert(bgAct()); };
  let bpm = 74;
  const hrTick = () => { bpm = clamp(bpm + rnd(-3, 3.2) + (76 - bpm) * 0.05, 62, 128); upsert({ id: "haze:hr", app: "Haze", title: "Puls", subtitle: "Garmin · live (Demo)", value: Math.round(bpm), unit: "bpm", pulse: Math.round(bpm), color: "#FF5A6E", icon: heartIcon("#FF5A6E"), priority: 1 }, { ttl: 15 }); };

  // ---------- Timer und Pomodoro (timer.rs) ----------
  const TIMER_ID = "notch:timer";
  let T = null; // { total, ends, left, done, shown, pomo }
  const fmt = (s) => { s = Math.max(0, Math.ceil(s)); return s >= 3600 ? `${Math.floor(s / 3600)}:${String(Math.floor(s % 3600 / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const fmtUp = (s) => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  const left = (t) => (t.ends != null ? Math.max(0, (t.ends - now()) / 1000) : t.left);
  const A = (id, label, ic = "") => ({ id, label, icon: ic });
  const timerIcon = () => icon('<circle cx="12" cy="13.5" r="7.500"/><path d="M12 13.500V9.500M9.500 3.500h5"/>', "#ffb340");
  const pomoIcon = (phase) => { const c = phase === "work" ? "#ffb09b" : "#8fdcbc"; return svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="none" stroke="${c}" stroke-width="2.4" opacity=".35"/><path d="M12 4a8 8 0 0 1 8 8" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/></svg>`); };
  function publishTimer(alert = false) {
    const t = T; if (!t) return;
    const l = left(t), running = t.ends != null;
    if (t.pomo) {
      const p = t.pomo, work = p.phase === "work", over = p.over;
      const title = work ? (over ? "Fokus geschafft" : "Fokus") : over ? "Pause vorbei" : "Pause";
      const nextLabel = work ? (over ? "Pause starten" : "Überspringen") : over ? "Weiter fokussieren" : "Überspringen";
      const sub = over ? "Extrazeit" : !running ? "pausiert" : work ? `Runde ${p.round}` : "durchatmen";
      const actions = [];
      if (!over) actions.push(running ? A("pause", "Anhalten", "pause") : A("resume", "Weiter", "play"));
      actions.push(A("next", nextLabel, over ? "play" : "next"), A("stop", "Beenden", "stop"));
      const endsAt = running ? now() + l * 1000 : null;
      upsert({ id: TIMER_ID, app: "Pomodoro", title, subtitle: sub, value: over ? "+" + fmtUp((now() - over) / 1000) : fmt(l), icon: pomoIcon(over ? (work ? "break" : "work") : p.phase), color: work ? "#ffb09b" : "#8fdcbc", progress: over ? 0 : t.total > 0 ? l / t.total : 0, ends_at: endsAt, priority: 5, actions, pomo: { phase: p.phase, over_since: over, total: t.total, left: l, running, round: p.round, work: p.work, brk: p.brk, ends_at: endsAt } }, { alert });
      return;
    }
    const actions = t.done ? [A("restart", "Nochmal", "restart"), A("stop", "OK", "check")] : [running ? A("pause", "Pause", "pause") : A("resume", "Weiter", "play"), A("plus", "+1 min"), A("stop", "Stopp", "stop")];
    upsert({ id: TIMER_ID, app: "Timer", title: t.done ? "Timer abgelaufen" : "Timer", subtitle: !t.done && !running ? "pausiert" : undefined, value: fmt(l), icon: timerIcon(), color: t.done ? "#ff453a" : "#ffb340", progress: t.total > 0 ? l / t.total : 0, ends_at: running ? now() + l * 1000 : null, priority: 5, alert, actions }, { alert });
  }
  const phaseTimer = (phase, work, brk, round) => { const s = phase === "work" ? work : brk; return { total: s, ends: now() + s * 1000, left: s, done: false, shown: Math.ceil(s), pomo: { phase, work, brk, round, over: null } }; };
  setInterval(() => {
    const t = T; if (!t) return;
    if (t.pomo?.over) { const s = Math.floor((now() - t.pomo.over) / 1000); if (s !== t.shown) { t.shown = s; publishTimer(); } return; }
    if (t.done || t.ends == null) return;
    const l = left(t);
    if (l <= 0) { t.ends = null; t.left = 0; if (t.pomo) { t.pomo.over = now(); t.shown = 0; } else t.done = true; publishTimer(true); }
    else if (Math.ceil(l) !== t.shown) { t.shown = Math.ceil(l); publishTimer(); }
  }, 200);
  function timerAction(action) {
    if (action === "stop") { T = null; remove(TIMER_ID); return; }
    if (action === "restart") { const total = T?.total ?? 60; T = { total, ends: now() + total * 1000, left: total, done: false, shown: Math.ceil(total), pomo: null }; publishTimer(); return; }
    if (action === "next") { const p = T?.pomo; if (!p) return; T = p.phase === "work" ? phaseTimer("break", p.work, p.brk, p.round) : phaseTimer("work", p.work, p.brk, p.round + 1); publishTimer(); return; }
    const t = T; if (!t || t.pomo?.over) return;
    if (action === "pause") { t.left = left(t); t.ends = null; }
    else if (action === "resume") t.ends = now() + t.left * 1000;
    else if (action === "plus") { t.total += 60; if (t.ends != null) t.ends += 60000; else t.left += 60; }
    else return;
    publishTimer();
  }

  // ---------- Live-Sport (sport.rs; gleiche Formen wie in Arena) ----------
  const crest = (abbr, color) => svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#0b0b0d" stop-opacity=".55"/></linearGradient></defs><circle cx="50" cy="50" r="46" fill="url(#g)"/><circle cx="50" cy="50" r="40" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/><text x="50" y="58" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-weight="800" font-size="${abbr.length > 3 ? 24 : 30}" fill="#fff">${abbr}</text></svg>`);
  const SOC = [["nor", "FC Nordstadt", "Nordstadt", "NOR", "#1f6feb"], ["haf", "Hafenstadt SV", "Hafenstadt", "HAF", "#e8590c"], ["kue", "Küstenwacht 04", "Küstenwacht", "KÜW", "#12b5b0"], ["ste", "SC Steinbruch", "Steinbruch", "STE", "#8b5cf6"], ["ber", "Bergwerk Union", "Bergwerk", "BER", "#f5c518"], ["mue", "Mühlental FC", "Mühlental", "MÜH", "#22a455"]];
  const logos = new Map();
  const team = (k) => { const [id, name, short, abbr, color] = SOC.find((s) => s[0] === k); if (!logos.has(k)) logos.set(k, crest(abbr, color)); return { id: `soccer:${id}`, name, short, abbr, logo: logos.get(k), color, score: "" }; };

  // Dieselbe Welt wie in der Arena (shim/soccer-world.js): sie hängt nur von der Uhrzeit ab, Ergebnisse bleiben realistisch, Tore sind selten,
  // danach beginnt ein neues Spiel. source "espn" schaltet in der Oberfläche das Spielfeld (Ballverlauf) frei.
  const SW = window.SoccerWorld;
  const world = SW.create({ team, source: "espn" });
  let sportState = { updated: now(), error: "", matches: world.at(now()).matches };
  const seen = new Set(sportState.matches.flatMap((m) => m.events.map((e) => e.id))); // schon Geschehenes löst nichts mehr aus
  let sportSig = "", watched = "";

  const book = SW.playbook(); // Ballverlauf fürs Spielfeld (shim/soccer-world.js)

  setInterval(() => {
    const ms = world.at(now()).matches;
    for (const m of ms) for (const ev of m.events) {
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      emit("sport-news", { key: m.key, ev, score: `${m.home.score}:${m.away.score}`, at: now() });
      if (ev.kind === "goal" && m.key === watched) emit("sport-plays", { key: m.key, reset: false, plays: [book.goal(ev, now())] });
    }
    const sig = ms.map((m) => [m.key, m.state, m.clock, m.home.score, m.away.score, m.events.length].join("|")).join(";");
    if (sig !== sportSig) { sportSig = sig; sportState = { updated: now(), error: "", matches: ms }; emit("sport", { ...sportState }); }
  }, 1000);
  // solange man das Spielfeld sieht, kommt alle paar Sekunden eine Aktion dazu
  setInterval(() => {
    const m = watched && sportState.matches.find((x) => x.key === watched);
    if (m && m.state === "in" && m.clock !== "HZ") emit("sport-plays", { key: m.key, reset: false, plays: [book.next(m, now())] });
  }, 2400);

  // ---------- Ablage ----------
  let shelf = [];
  const kindOf = (name) => { const e = (name.split(".").pop() || "").toLowerCase(); return /^(png|jpe?g|gif|webp|bmp|svg)$/.test(e) ? "image" : /^(mp3|wav|flac|m4a|ogg)$/.test(e) ? "audio" : /^(mp4|mov|mkv|webm|avi)$/.test(e) ? "video" : /^(pdf|docx?|txt|md|pptx?|xlsx?)$/.test(e) ? "doc" : "file"; };
  const files = new Map(); // Name -> File (vom Desktop beim Ablegen mitgegeben)

  // ---------- Befehle ----------
  // Ohne eigene Wahl klappt die Notch bei Toren nicht auf (der Spielstand in der Mitte läuft trotzdem weiter); wer will, stellt es in den Einstellungen um
  let settings = lsGet("settings", null) ?? { sport: { expand: "off" } }, cards = lsGet("cards", null), dock = lsGet("dock", "top");
  let hit = { x: 0, y: 0, w: 0, h: 0 }, hover = false;
  const LEAGUES = [["bl1", "Nordliga", "Deutschland"], ["dfb", "Küstenpokal", "Deutschland"], ["test", "Testspiele", "Vereine"]].map(([id, name, group]) => ({ id, name, group, sport: "soccer", source: "Demo", auto: id === "test" }));
  const laya = { want: false, state: "off", done: 0, total: 307_000_000, message: "", dir: "" };
  const handlers = {
    snapshot: () => ({ media: media(), cover: coverOf(TRACKS[ti]), activities: [...acts.values()].sort((a, b) => b.priority - a.priority), shelf, clips: [], fullscreen: false, peek: false, hover, dock, voice_key: "Strg+Alt+Leertaste", sport: { ...sportState } }),
    settings_get: () => settings,
    settings_set: ({ settings: s }) => { settings = s; lsSet("settings", s); emit("settings", s); return null; },
    cards_get: () => cards,
    cards_set: ({ cards: c }) => { cards = c; lsSet("cards", c); return null; },
    set_hit_rect: ({ rect }) => { hit = rect || hit; return null; },
    dock_set: ({ dock: d }) => { dock = d; lsSet("dock", d); emit("dock", d); return null; },
    media_control: ({ action }) => {
      if (action === "toggle") { pos = position(); posAt = now(); playing = !playing; }
      else if (action === "next" || action === "prev") { ti = (ti + (action === "next" ? 1 : TRACKS.length - 1)) % TRACKS.length; pos = 0; posAt = now(); playing = true; }
      pushMedia(); return null;
    },
    media_seek: ({ seconds }) => { pos = clamp(seconds, 0, TRACKS[ti].dur); posAt = now(); pushMedia(); return true; },
    media_focus: () => { toast("Hier würde der Player aufgehen (Demo ohne Ton)."); return null; },
    media_next_source: () => null,
    volume_get: () => volume,
    volume_set: ({ level }) => { volume = { ...volume, level, muted: level < 0.01 }; lsSet("volume", volume); return volume; },
    volume_mute: () => { volume = { ...volume, muted: !volume.muted }; return volume; },
    timer_start: ({ seconds }) => { const s = clamp(seconds, 1, 86400); T = { total: s, ends: now() + s * 1000, left: s, done: false, shown: Math.ceil(s), pomo: null }; publishTimer(); return null; },
    pomo_start: ({ work, brk }) => { T = phaseTimer("work", clamp(work, 1, 180) * 60, clamp(brk, 1, 60) * 60, 1); publishTimer(); return null; },
    activity_action: ({ id, action }) => { if (id === TIMER_ID) timerAction(action); else if (action === "widget") toast("In der echten App schaltet das das Haze-Widget."); return null; },
    dismiss_activity: ({ id }) => { remove(id); return null; },
    activity_open: ({ id }) => { toast(`„${acts.get(id)?.title ?? id}“ öffnet in der echten App das zugehörige Programm.`); return null; },
    activity_focus_app: () => null,
    activity_input: () => null,
    sport_watch: ({ key }) => {
      if (key && key !== watched) { watched = key; const m = sportState.matches.find((x) => x.key === key); setTimeout(() => emit("sport-plays", { key, reset: true, plays: m && m.state !== "pre" ? book.history(m, now()) : [] }), 200); }
      else if (!key) watched = "";
      return null;
    },
    sport_leagues: () => LEAGUES,
    sport_teams: () => SOC.map(([id, name, , abbr, color]) => ({ key: `soccer:${id}`, name, logo: crest(abbr, color) })),
    arena_installed: () => true,
    shelf_add: ({ paths }) => { for (const p of paths) { const f = files.get(p); if (shelf.some((i) => i.path === p)) continue; shelf = [{ path: p, name: p, ext: (p.split(".").pop() || "").toLowerCase(), size: f?.size ?? 0, kind: kindOf(p), added: now() }, ...shelf]; } emit("shelf", shelf); return null; },
    shelf_remove: ({ path, paths }) => { const rm = new Set(paths ?? [path]); shelf = shelf.filter((i) => !rm.has(i.path)); emit("shelf", shelf); return null; },
    shelf_clear: () => { shelf = []; emit("shelf", shelf); return null; },
    thumb: ({ path }) => { const f = files.get(path); return f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null; },
    drag_icon: () => "",
    reveal: () => { toast("Der Explorer öffnet sich nur in der installierten App."); return null; },
    open: ({ target }) => { if (/^https?:/.test(target || "")) window.open(target, "_blank", "noopener"); else toast("Das öffnet sich nur in der installierten App."); return null; },
    open_settings: (a) => { backend.onOpenSettings?.(a?.tab); return null; },
    share_status: () => ({ on: false }),
    share_qr: () => { throw "Der iPhone-Austausch gibt es nur in der installierten App."; },
    laya_status: () => laya,
    laya_install: () => laya,
    laya_uninstall: () => laya,
    ffmpeg_available: () => false,
    convert_targets: () => [],
    spotify_status: () => ({ configured: false, connected: false, user: "" }),
    voice_token: () => { throw "Der Sprachassistent läuft nur in der installierten App."; },
    voice_ready: () => false,
    shortcut_set: ({ key }) => key || "",
    shortcut_pause: () => null,
    pad_capture: () => null,
    dock_drag_start: () => { backend.onDockDrag?.(); return null; },
  };
  const invoke = (cmd, args = {}) => { const h = handlers[cmd]; if (!h) { console.warn("[notch] nicht behandelt:", cmd, args); return null; } return h(args); };

  // ---------- Start ----------
  const backend = { on, emit, invoke, handlers, files, get hit() { return hit; }, get dock() { return dock; }, setHover(v) { if (v !== hover) { hover = v; emit("hover", v); } }, get hover() { return hover; },
    /** Meldung eines Programms (Arena-Tor, Kursbuch-Frist …): erscheint als Activity mit Alarm, die Notch klappt kurz auf */
    alert({ title, text, icon: ic, color = "#75b8ff", app = "Desktop", ms = 12000 }) {
      upsert({ id: "desk:" + now(), app, title, subtitle: text, icon: ic ?? icon('<circle cx="12" cy="12" r="8"/><path d="M12 8v5M12 16v.01"/>', color), color, priority: 20 }, { alert: true, ttl: Math.round(ms / 1000) });
    },
    /** Dauerhafte Anzeige eines Programms (Folio: geöffnete PDF mit Seite) und ihr Ende */
    activity(a) { upsert({ priority: 0, ...a }, { ttl: 180 }); },
    removeActivity(id) { remove(id); },
    onOpenSettings: null, onDockDrag: null };
  upsert(bgAct()); hrTick();
  setInterval(bgTick, 45000);
  setInterval(hrTick, 3000);
  setInterval(() => { if (playing) { if (position() >= TRACKS[ti].dur) { ti = (ti + 1) % TRACKS.length; pos = 0; posAt = now(); pushMedia(); } emit("level", clamp(0.35 + Math.random() * 0.6, 0, 1)); } }, 120);
  return backend;
}
