/* Die erfundene Fußballwelt der Nordliga – eine reine Funktion der Uhrzeit.
   Notch und Arena (zwei getrennte Fenster) rechnen damit denselben Spielstand, ohne sich abzusprechen, und ein Neuladen setzt nichts zurück.
   Ein Spiel dauert 15 Minuten echte Zeit (eine Spielminute = 8 s, dazu Halbzeitpause und Abpfiff-Anzeige); alle 7,5 Minuten beginnt eines,
   zwei laufen also versetzt gleichzeitig, das nächste steht als Vorschau da. Ergebnisse sind realistisch gedeckelt: 0 bis 5 Tore je Spiel
   (im Mittel 2,4), mindestens 30 s Abstand, kein Tor in der ersten Minute. Danach beginnt ein neues Spiel – nie wächst ein Ergebnis weiter.
   Als klassisches Skript geschrieben, damit auch die Arena-Attrappe (ein Skript im iframe) es synchron laden kann. */
window.SoccerWorld = (() => {
  const MIN_MS = 8000;        // eine Spielminute
  const HT_MS = 40000;        // Halbzeitpause
  const LEN = 900000;         // ein Spiel samt Anzeige nach dem Abpfiff
  const STEP = LEN / 2;       // Abstand der Anstöße
  const GAP = 30000;          // Mindestabstand zweier Tore im selben Spiel

  const TEAMS = ["nor", "haf", "kue", "ste", "ber", "mue"];
  /** Nachnamen, aus denen Torschützen und Karten gezogen werden (Arena übernimmt sie für ihre Kader) */
  const SQUAD = {
    nor: ["Brandt", "Falk", "Kessler", "Engel", "Sander", "Wolff"], haf: ["Vogel", "Lorenz", "Matthes", "Reuter", "Ostermann", "Nolte"],
    kue: ["Keller", "Dreyer", "Jansen", "Holm", "Lindner", "Maurer"], ste: ["Moser", "Berger", "Huber", "Wolter", "Ziegler", "Haas"],
    ber: ["Krause", "Pohl", "Seidel", "Thiel", "Winkler", "Voss"], mue: ["Albrecht", "Fuchs", "Graf", "Herold", "Neumann", "Hartmann"],
  };

  const mulberry = (a) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // Paarungen so ordnen, dass zwei aufeinanderfolgende Spiele (sie laufen zeitgleich) nie dasselbe Team haben
  const order = (ids) => {
    const P = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) P.push([ids[i], ids[j]]);
    const disjoint = (a, b) => !a.some((x) => b.includes(x));
    const seq = [P[0]], used = new Set([0]);
    const go = () => {
      if (seq.length === P.length) return disjoint(seq[seq.length - 1], seq[0]);
      for (let i = 0; i < P.length; i++) {
        if (used.has(i) || !disjoint(seq[seq.length - 1], P[i])) continue;
        used.add(i); seq.push(P[i]);
        if (go()) return true;
        seq.pop(); used.delete(i);
      }
      return false;
    };
    return go() ? seq : P;
  };
  const PAIRS = order(TEAMS);

  const GOALS = [0.09, 0.27, 0.52, 0.76, 0.92, 1]; // Verteilung der Tore je Spiel (kumuliert)

  /**
   * team(id): Team-Objekt der Oberfläche (Name, Wappen …); names: Nachnamen je Team (Standard: SQUAD); source: "espn" schaltet in der Notch das Spielfeld frei.
   */
  function create({ team, names = SQUAD, source = "demo" }) {
    const cache = new Map();
    const pick = (r, id) => { const l = names[id] ?? SQUAD[id]; return l[Math.floor(r() * l.length)]; };

    // Drehbuch eines Spiels: nur von der Spielnummer abhängig
    const plan = (f) => {
      if (cache.has(f)) return cache.get(f);
      const r = mulberry(f * 7919 + 13);
      const k = ((f % PAIRS.length) + PAIRS.length) % PAIRS.length, cycle = Math.floor(f / PAIRS.length);
      const [a, b] = PAIRS[k];
      const [home, away] = (cycle + k) % 2 ? [b, a] : [a, b];
      const e1 = 1 + Math.floor(r() * 3), e2 = 2 + Math.floor(r() * 4); // Nachspielzeit in Minuten
      const D1 = (45 + e1) * MIN_MS, D2 = (45 + e2) * MIN_MS;
      const toAt = (x) => (x < D1 ? x : x + HT_MS); // Spielzeit -> Versatz seit Anstoß (mit Pause)
      const u0 = r();
      const n = GOALS.findIndex((c) => u0 < c);
      const xs = [];
      for (let tries = 0; xs.length < n && tries < 200; tries++) {
        const x = MIN_MS + r() * (D1 + D2 - 2 * MIN_MS);
        if (xs.every((y) => Math.abs(y - x) > GAP)) xs.push(x);
      }
      xs.sort((p, q) => p - q);
      const evs = xs.map((x) => {
        const side = r() < 0.54 ? "home" : "away", id = side === "home" ? home : away;
        const t = r();
        return { at: toAt(x), kind: "goal", side, who: pick(r, id) + (t < 0.08 ? " (Elfmeter)" : t < 0.2 ? " (Kopfball)" : "") };
      });
      const cards = Math.floor(r() * 4);
      for (let i = 0; i < cards; i++) {
        const side = r() < 0.5 ? "home" : "away";
        evs.push({ at: toAt(MIN_MS + r() * (D1 + D2 - 2 * MIN_MS)), kind: "yellow", side, who: pick(r, side === "home" ? home : away) });
      }
      evs.push({ at: D1, kind: "half" }, { at: D1 + HT_MS + D2, kind: "full" });
      evs.sort((p, q) => p.at - q.at);
      const p = { f, home, away, D1, D2, evs, end: D1 + HT_MS + D2 };
      cache.set(f, p);
      if (cache.size > 12) cache.delete(cache.keys().next().value);
      return p;
    };

    const clockAt = (p, u) => {
      if (u < p.D1) { const m = Math.floor(u / MIN_MS) + 1; return m <= 45 ? `${m}'` : `45+${m - 45}'`; }
      if (u < p.D1 + HT_MS) return "HZ";
      const m = Math.floor((u - p.D1 - HT_MS) / MIN_MS) + 1;
      return m <= 45 ? `${45 + m}'` : `90+${m - 45}'`;
    };

    const build = (f, t) => {
      const p = plan(f), start = f * STEP, u = t - start;
      const h = team(p.home), a = team(p.away);
      const m = { key: `soccer/nord:${f}`, league: "bl1", league_name: "Nordliga", sport: "soccer", state: "pre", clock: "", start, fav: p.home === "nor" || p.away === "nor", link: "https://github.com/NojoMcDybo/arena", pitch: true, events: [], source, home: { ...h, score: "" }, away: { ...a, score: "" } };
      if (u < 0) return m;
      let sh = 0, sa = 0;
      p.evs.forEach((e, i) => {
        if (e.at > u) return;
        const label = e.kind === "half" ? "45'" : e.kind === "full" ? "90'" : clockAt(p, e.at);
        const t0 = (k) => (k === "home" ? m.home : m.away);
        if (e.kind === "goal") { if (e.side === "home") sh++; else sa++; m.events.push({ id: `${f}:${i}`, minute: label, kind: "goal", side: e.side, title: `Tor für ${t0(e.side).short}!`, text: e.who, big: 3 }); }
        else if (e.kind === "yellow") m.events.push({ id: `${f}:${i}`, minute: label, kind: "yellow", side: e.side, title: "Gelbe Karte", text: `${e.who} (${t0(e.side).short})`, big: 1 });
        else m.events.push({ id: `${f}:${i}`, minute: label, kind: "half", side: "", title: e.kind === "half" ? "Halbzeit" : "Abpfiff", text: `${m.home.short} ${sh}:${sa} ${m.away.short}`, big: 2 });
      });
      m.home.score = String(sh); m.away.score = String(sa);
      if (u >= p.end) { m.state = "post"; m.clock = ""; } else { m.state = "in"; m.clock = clockAt(p, u); }
      return m;
    };

    return {
      /** Spiele zum Zeitpunkt t: das ältere (läuft noch oder ist gerade aus), das jüngere und die Vorschau auf das nächste */
      at(t = Date.now()) { const f = Math.floor(t / STEP); return { matches: [f - 1, f, f + 1].map((i) => build(i, t)) }; },
    };
  }

  /** Ballverlauf für das Spielfeld: ein Zug nach dem anderen, Ballbesitz wechselt nach Zweikampf, Kopfball und Schuss (Notch und Arena nutzen dasselbe) */
  function playbook() {
    const rnd = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const KINDS = [["pass", 0.66], ["take-on", 0.73], ["cross", 0.78], ["aerial", 0.84], ["tackle", 0.9], ["shot-on-target", 0.95], ["shot-off-target", 1]];
    const ball = { key: "", x: 50, y: 50, side: "home", n: 0 };
    const next = (m, t = Date.now()) => {
      if (ball.key !== m.key) Object.assign(ball, { key: m.key, x: 50, y: 50, side: "home" });
      const dir = ball.side === "home" ? 1 : -1, r = Math.random(), kind = KINDS.find(([, c]) => r < c)[0];
      let { x, y } = ball, x2 = x, y2 = y, flip = false;
      if (kind.startsWith("shot")) { x = dir > 0 ? rnd(74, 90) : rnd(10, 26); y = rnd(24, 50); x2 = dir > 0 ? 100 : 0; y2 = kind === "shot-on-target" ? rnd(41, 59) : Math.random() < 0.5 ? rnd(14, 30) : rnd(70, 86); flip = true; }
      else if (kind === "tackle" || kind === "aerial") flip = true;
      else if (kind === "cross") { x2 = dir > 0 ? rnd(84, 93) : rnd(7, 16); y2 = rnd(34, 48); }
      else { x2 = clamp(x + dir * rnd(-3, 16), 4, 96); y2 = clamp(y + rnd(-18, 18), 6, 94); }
      const list = SQUAD[m[ball.side].id.split(":")[1]];
      const play = { id: "p" + ball.n++, t, minute: m.clock, kind, side: ball.side, jersey: String(2 + Math.floor(rnd(0, 20))), who: list[Math.floor(rnd(0, list.length))], x, y, x2, y2 };
      ball.x = x2; ball.y = y2;
      if (flip) { ball.side = ball.side === "home" ? "away" : "home"; if (kind.startsWith("shot")) { ball.x = dir > 0 ? 94 : 6; ball.y = 50; } }
      return play;
    };
    return {
      next,
      history: (m, t = Date.now()) => Array.from({ length: 18 }, (_, i) => next(m, t - (18 - i) * 2400)),
      goal: (ev, t = Date.now()) => { const dir = ev.side === "home" ? 1 : -1; return { id: "g" + ev.id, t, minute: ev.minute, kind: "goal", side: ev.side, jersey: "9", who: ev.text.replace(/ \(.*\)$/, ""), x: dir > 0 ? rnd(80, 90) : rnd(10, 20), y: rnd(38, 56), x2: dir > 0 ? 100 : 0, y2: rnd(44, 56) }; },
    };
  }

  return { create, playbook, SQUAD, TEAMS };
})();
