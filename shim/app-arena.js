/* Arena: Beispiel-Antworten für die App-Befehle (arena/src/main.ts). Eine erfundene Welt: zehn Fußballvereine der „Nordliga“,
   sechs Basketballteams der „Metro-Liga“, Spieler, Statistiken und Stadien sind erzeugt; Wappen sind gezeichnet. Nichts
   stammt von ESPN. Spiele laufen weiter (Minute, Tore), der Ballverlauf wird laufend neu erzeugt. */
(() => {
  const P = window.__PORTFOLIO__;
  P.version = "0.2.7";
  P.name = "Arena";

  const now = Date.now(), H = 3600e3, D = 24 * H;
  // deterministisches Zufallsgeld, damit dieselben Spieler immer dieselben Werte haben
  const rng = (seed) => { let s = [...String(seed)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };

  const crest = (abbr, color, round = true) =>
    "data:image/svg+xml," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="#0b0b0d" stop-opacity=".55"/></linearGradient></defs>` +
      (round ? `<circle cx="50" cy="50" r="46" fill="url(#g)"/><circle cx="50" cy="50" r="40" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3"/>` : `<path d="M14 12h72v44c0 20-20 30-36 36C34 86 14 76 14 56z" fill="url(#g)" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`) +
      `<text x="50" y="${round ? 58 : 54}" text-anchor="middle" font-family="Segoe UI,Arial,sans-serif" font-weight="800" font-size="${abbr.length > 3 ? 24 : 30}" fill="#fff">${abbr}</text></svg>`);

  // ---------- Vereine ----------
  const SOC = [
    ["nor", "FC Nordstadt", "Nordstadt", "NOR", "#1f6feb"], ["haf", "Hafenstadt SV", "Hafenstadt", "HAF", "#e8590c"],
    ["kue", "Küstenwacht 04", "Küstenwacht", "KÜW", "#12b5b0"], ["ste", "SC Steinbruch", "Steinbruch", "STE", "#8b5cf6"],
    ["ber", "Bergwerk Union", "Bergwerk", "BER", "#f5c518"], ["mue", "Mühlental FC", "Mühlental", "MÜH", "#22a455"],
    ["sch", "Schlossberg 09", "Schlossberg", "SCH", "#e03131"], ["fel", "Feldmark Kickers", "Feldmark", "FEL", "#e64980"],
    ["tal", "Talsperre United", "Talsperre", "TAL", "#38bdf8"], ["wei", "Weidenau SC", "Weidenau", "WEI", "#82c91e"],
  ];
  const BAS = [
    ["riv", "Rivertown Rockets", "Rockets", "RIV", "#e8590c"], ["har", "Harbor Hawks", "Hawks", "HAR", "#1c7ed6"],
    ["sum", "Summit Wolves", "Wolves", "SUM", "#7048e8"], ["del", "Delta Foxes", "Foxes", "DEL", "#f08c00"],
    ["can", "Canyon Kings", "Kings", "CAN", "#c92a2a"], ["lak", "Lakeshore Owls", "Owls", "LAK", "#0c8599"],
  ];
  const teams = {};
  for (const [k, name, short, abbr, color] of SOC) teams[k] = { id: `soccer:${k}`, name, short, abbr, logo: crest(abbr, color), color, score: "" };
  for (const [k, name, short, abbr, color] of BAS) teams[k] = { id: `basketball:${k}`, name, short, abbr, logo: crest(abbr, color, false), color, score: "" };
  const T = (k, score = "") => ({ ...teams[k], score });
  const FAV = "nor";

  // ---------- Spieler ----------
  const FIRST = ["Jonas", "Luca", "Matteo", "Felix", "Noah", "Elias", "Paul", "Anton", "Leon", "Emil", "Jan", "Tim", "Niklas", "Ben", "Finn", "Marlon", "Yannik", "Kilian", "Mats", "Arne"];
  const LAST = ["Brandt", "Kessler", "Vogel", "Lorenz", "Hartmann", "Keller", "Sander", "Wolff", "Reuter", "Falk", "Engel", "Nolte", "Berger", "Maurer", "Lindner", "Jansen", "Albrecht", "Thiel", "Haas", "Voss"];
  const POS = ["G", "D", "D", "D", "D", "M", "M", "M", "M", "F", "F", "F", "G", "D", "M", "F", "D", "M"];
  const squad = (k) => {
    const r = rng("squad" + k);
    const used = new Set();
    const list = POS.map((pos, i) => {
      let n;
      do { n = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`; } while (used.has(n));
      used.add(n);
      return { id: `${k}-${i}`, jersey: String([1, 2, 3, 4, 5, 6, 8, 10, 14, 9, 11, 7, 12, 15, 16, 19, 20, 21][i]), name: n, pos, pos_name: pos, age: 19 + Math.floor(r() * 16), nation: "Deutschland", flag: "", injury: i === 13 && k === FAV ? "Out" : "" };
    });
    // Torschützen der Spielwelt (soccer-world.js) stehen auch im Kader: Sturm und Mittelfeld tragen deren Nachnamen
    const sw = window.SoccerWorld.SQUAD[k];
    if (sw) [9, 10, 11, 7, 8, 5].forEach((slot, j) => { list[slot].name = `${list[slot].name.split(" ")[0]} ${sw[j]}`; });
    return list;
  };
  const squads = Object.fromEntries(SOC.map(([k]) => [k, squad(k)]));
  const statsOf = (k) => squads[k].map((p) => {
    const r = rng("st" + p.id);
    const g = p.pos === "G", f = p.pos === "F", m = p.pos === "M", d = p.pos === "D";
    const apps = 4 + Math.floor(r() * 3), minutes = apps * (55 + Math.floor(r() * 35));
    const po = (a, b) => Math.round(a + r() * (b - a));
    const passes = po(d ? 160 : m ? 200 : f ? 70 : g ? 90 : 100, d ? 330 : m ? 380 : f ? 140 : g ? 160 : 200);
    return {
      id: p.id, name: p.name, jersey: p.jersey, pos: p.pos, apps, minutes,
      goals: f ? po(0, 6) : m ? po(0, 3) : d ? po(0, 1) : 0, assists: f ? po(0, 3) : m ? po(0, 4) : d ? po(0, 2) : 0,
      shots: f ? po(8, 26) : m ? po(4, 14) : d ? po(0, 6) : 0, shots_on: f ? po(4, 14) : m ? po(1, 7) : d ? po(0, 2) : 0, shot_assists: f ? po(2, 10) : m ? po(4, 16) : d ? po(1, 6) : 0,
      passes_ok: Math.round(passes * (0.72 + r() * 0.2)), passes_bad: Math.round(passes * (0.1 + r() * 0.2)),
      duels_won: d ? po(20, 44) : m ? po(14, 36) : f ? po(8, 24) : po(0, 4), duels: d ? po(46, 80) : m ? po(34, 70) : f ? po(18, 50) : po(1, 8),
      tackles: d ? po(8, 22) : m ? po(5, 16) : f ? po(1, 6) : 0, interceptions: d ? po(6, 18) : m ? po(3, 12) : f ? po(0, 3) : 0, recoveries: d ? po(26, 54) : m ? po(22, 50) : f ? po(8, 24) : po(4, 16),
      saves: g ? po(10, 30) : 0, conceded: g ? po(4, 11) : 0, clean_sheets: g ? po(0, 3) : 0,
    };
  });

  // ---------- Spiele ----------
  const M = (key, h, a, state, start, extra = {}) => ({ key, league: "bl1", league_name: "Nordliga", sport: "soccer", state, clock: "", start, fav: h === FAV || a === FAV, link: "https://github.com/NojoMcDybo/arena", pitch: true, events: [], source: "demo", home: T(h), away: T(a), ...extra });
  // Live-Fußball: dieselbe Welt wie in der Notch (soccer-world.js) – hängt nur von der Uhrzeit ab, Ergebnisse bleiben realistisch, Tore sind selten
  const world = window.SoccerWorld.create({ team: (k) => T(k), source: "espn" }); // "espn" schaltet in der Oberfläche den Ballverlauf frei
  const book = window.SoccerWorld.playbook();
  const soccerNow = () => world.at(Date.now()).matches;
  const nba1 = {
    key: "basketball/metro:1", league: "nba", league_name: "Metro-Liga", sport: "basketball", state: "in", clock: "3. 5:12", start: now - 90 * 60000, fav: false,
    link: "https://github.com/NojoMcDybo/arena", pitch: false, court: true, events: [], source: "demo", home: T("riv", "71"), away: T("har", "68"),
  };
  const sched = []; // feste Spiele um die Live-Spiele herum
  [["sch", "fel"], ["tal", "wei"], ["nor", "kue"], ["mue", "haf"], ["ste", "ber"], ["fel", "nor"], ["wei", "sch"]].forEach((p, i) => {
    const st = now + (i - 3) * D + 2 * H;
    const m = M(`soccer/nord:s${i}`, p[0], p[1], st < now ? "post" : "pre", st, { clock: st < now ? "Ende" : "" });
    if (st < now) { m.home.score = String(i % 3); m.away.score = String((i + 1) % 2); }
    sched.push(m);
  });
  [[0, "riv", "del"], [1, "sum", "can"], [-1, "har", "lak"]].forEach(([dd, h, a], i) => {
    const st = now + dd * D + 6 * H;
    sched.push({ key: `basketball/metro:s${i}`, league: "nba", league_name: "Metro-Liga", sport: "basketball", state: st < now ? "post" : "pre", clock: st < now ? "Ende" : "", start: st, fav: false, link: "https://github.com/NojoMcDybo/arena", pitch: false, court: true, events: [], source: "demo", home: T(h, st < now ? "112" : ""), away: T(a, st < now ? "104" : "") });
  });
  { const t = M("soccer/club.friendly:f1", "nor", "wei", "pre", now + 2 * D + 4 * H); t.league = "test"; t.league_name = "Testspiele"; sched.push(t); }
  const allSched = () => [...sched, ...soccerNow(), nba1].sort((a, b) => a.start - b.start);
  const state = { updated: now, error: "", matches: [...soccerNow(), nba1] };

  // Live: Spielstände und Minuten aus der Welt übernehmen, sobald sich etwas ändert
  let liveSig = "";
  setInterval(() => {
    const ms = soccerNow();
    const sig = ms.map((m) => [m.key, m.state, m.clock, m.home.score, m.away.score, m.events.length].join("|")).join(";");
    if (sig === liveSig) return;
    liveSig = sig;
    state.updated = Date.now(); state.matches = [...ms, nba1];
    P.emit("sport", { ...state, matches: [...state.matches] });
  }, 1000);

  let watched = "";
  const seenGoals = new Set(soccerNow().flatMap((m) => m.events.map((e) => e.id)));
  setInterval(() => {
    for (const m of soccerNow()) {
      for (const ev of m.events) {
        if (seenGoals.has(ev.id)) continue;
        seenGoals.add(ev.id);
        if (ev.kind === "goal" && m.key === watched) P.emit("sport-plays", { key: m.key, reset: false, plays: [book.goal(ev)] });
      }
      if (m.key === watched && m.state === "in" && m.clock !== "HZ") P.emit("sport-plays", { key: m.key, reset: false, plays: [book.next(m)] });
    }
  }, 2400);

  // ---------- Tabellen ----------
  const row = (rank, t, pts, note = "", color = "") => ({ rank, team: T(t), played: "6", won: String(Math.floor(pts / 3)), draw: String(pts % 3), lost: String(6 - Math.floor(pts / 3) - (pts % 3)), goals: `${pts}:${12 - rank}`, diff: `${pts - 12 + rank > 0 ? "+" : ""}${pts - 12 + rank}`, points: String(pts), pct: "", behind: "", note, color, fav: t === FAV });
  const table = [{ name: "", rows: [
    row(1, "ber", 16, "Europapokal", "#81d6ac"), row(2, "sch", 15, "Europapokal", "#81d6ac"), row(3, "kue", 13, "Europapokal", "#81d6ac"),
    row(4, "tal", 12, "Europapokal", "#81d6ac"), row(5, "fel", 10, "Qualifikation", "#b2d6ff"), row(6, "mue", 9, "Qualifikation", "#ffd6a5"),
    row(7, "haf", 8), row(8, "nor", 7), row(9, "ste", 5, "Relegation", "#ffb2b2"), row(10, "wei", 3, "Abstieg", "#ff7f7f"),
  ] }];
  const nbaTable = [{ name: "", rows: ["riv", "har", "sum", "del", "can", "lak"].map((k, i) => ({ rank: i + 1, team: T(k), played: "10", won: String(8 - i), draw: "", lost: String(2 + i), goals: "", diff: "", points: "", pct: (0.8 - i * 0.12).toFixed(3).replace(/^0/, ""), behind: i ? String(i * 1.0) : "–", note: "", color: i < 4 ? "#81d6ac" : "", fav: false })) }];

  // ---------- Einstellungen ----------
  const toPick = (t) => ({ key: t.id, name: t.name, logo: t.logo });
  const settings = { sport: { on: true, leagues: ["bl1", "nba"], teams: [toPick(teams.nor), toPick(teams.haf)], scope: "all", expand: "off", center: true, pitch: true, fullscreen: true }, notch: true, pending: false };
  const leagues = [["bl1", "Nordliga", "Deutschland"], ["dfb", "Küstenpokal", "Deutschland"], ["nba", "Metro-Liga", "US-Sport"], ["test", "Testspiele", "Vereine"]]
    .map(([id, name, group]) => ({ id, name, group, sport: id === "nba" ? "basketball" : "soccer", source: "Demo", auto: id === "test" }));
  const leagueMeta = [{ id: "bl1", logo: crest("NL", "#1f6feb"), dark: "" }, { id: "dfb", logo: crest("KP", "#e8590c"), dark: "" }, { id: "nba", logo: crest("ML", "#c92a2a", false), dark: "" }];

  // ---------- Ballverlauf und Wurfbild ----------
  const plays = (key) => { const m = soccerNow().find((x) => x.key === key); return m && m.state !== "pre" ? book.history(m) : []; };
  const shots = (n) => {
    const out = [];
    for (let i = 0; i < n; i++) {
      const side = i % 2 ? "home" : "away", three = i % 3 === 0, ft = i % 7 === 6;
      const ang = ((i * 47) % 180) * Math.PI / 180, r = ft ? 0 : three ? 23.9 + (i % 3) : 2 + ((i * 13) % 18);
      out.push({ id: "s" + i, t: now - (200 - i) * 20000, minute: `${1 + Math.floor(i / 22)}. ${11 - (i % 11)}:${String((i * 7) % 60).padStart(2, "0")}`, kind: ft ? "ft" : three ? "3" : "2", side, jersey: "", who: ["Okafor", "Lindqvist", "Marlow", "Deniz", "Kovač"][i % 5],
        x: ft ? -1 : 25 + Math.cos(ang) * r, y: ft ? -1 : 1 + Math.sin(ang) * r, made: (i * 7) % 5 < 2, pts: ft ? 1 : three ? 3 : 2 });
    }
    return out;
  };

  // ---------- Spieldetails ----------
  const lu = (k, f) => ({ formation: f, players: squads[k].slice(0, 12).map((p, i) => ({ id: p.id, jersey: p.jersey, name: p.name, pos: (f === "4-2-3-1" ? ["G", "RB", "CD-R", "CD-L", "LB", "RM", "LM", "AM-R", "AM", "AM-L", "F", "F"] : ["G", "CD-R", "CD", "CD-L", "RM", "CM-R", "CM-L", "LM", "AM-R", "AM-L", "F", "F"])[i], starter: i < 11, sub_in: i === 11, sub_out: i === 7, place: i + 1 })) });
  const form = (r) => r.split("").map((x, i) => ({ r: x, score: x === "s" ? "2:1" : x === "n" ? "0:1" : "1:1", opp: SOC[(i * 3 + 2) % 10][1], home: i % 2 === 0, date: now - (i + 1) * 7 * D, comp: "Nordliga" }));
  const detail = (key) => {
    const all = soccerNow();
    const m = all.find((x) => x.key === key) ?? all[1];
    const pre = m.state === "pre";
    const hk = m.home.id.split(":")[1], ak = m.away.id.split(":")[1];
    const st = (label, h, a, unit = "") => ({ label, home: h + unit, away: a + unit, h, a });
    const r = rng("pulse" + m.key);
    const min = m.state === "post" ? 90 : Math.max(1, parseInt(m.clock, 10) || 46); // bisherige Spielminute
    const pulse = [];
    for (let i = 0; i < Math.round(min * 0.6); i++) pulse.push({ minute: Math.floor(r() * min), side: r() < 0.55 ? "home" : "away", w: [1, 2, 2, 3][i % 4] });
    for (const e of m.events) if (e.kind === "goal") pulse.push({ minute: parseInt(e.minute, 10), side: e.side, w: 5 });
    pulse.sort((a, b) => a.minute - b.minute);
    const hg = +m.home.score || 0, ag = +m.away.score || 0, cards = (s) => m.events.filter((e) => e.kind === "yellow" && e.side === s).length;
    return {
      stats: pre ? [st("Tore (Saison)", 9, 8), st("Gegentore (Saison)", 2, 8)] : [st("Ballbesitz", 58, 42, " %"), st("Schüsse", 9 + hg * 2, 7 + ag * 2), st("Aufs Tor", 3 + hg, 3 + ag), st("Ecken", 7, 3), st("Passquote", 86, 79, " %"), st("Zweikampfquote", 52, 48, " %"), st("Fouls", 9, 12), st("Gelbe Karten", cards("home"), cards("away"))],
      pulse: pre ? [] : pulse, lineup_home: lu(hk, "4-2-3-1"), lineup_away: lu(ak, "3-4-2-1"),
      venue: m.home.short + "-Arena", city: m.home.short, referee: "Mara Lindgren", attendance: pre ? 0 : 41230,
      odds: pre ? [0.5, 0.27, 0.23] : [], odds_by: "Demo", form_home: form("ssuns"), form_away: form("nsuun"),
      h2h: pre ? [{ date: now - 140 * D, home: T(hk, "0"), away: T(ak, "2") }, { date: now - 320 * D, home: T(ak, "3"), away: T(hk, "3") }] : [],
    };
  };

  const stadium = (name, city) => {
    const pitch = [[0, 0], [0.00105, 0], [0.00105, 0.00068], [0, 0.00068]].map(([a, b]) => [53.55 + a, 9.99 + b]);
    const outline = Array.from({ length: 48 }, (_, i) => { const t = (i / 48) * Math.PI * 2; return [53.55 + 0.00034 + Math.sin(t) * 0.00135, 9.99 + 0.00034 + Math.cos(t) * 0.0014]; });
    return { name, city, capacity: 41200, opened: "1998", lat: 53.55, lon: 9.99, outline, pitch, wikidata: "", photo: "", photo_page: "", architect: "Büro Hellwig & Partner", cost_eur: 96_000_000, about: "Erfundenes Stadion für die Demo. Die echte App zeichnet den Grundriss aus OpenStreetMap und liest Daten aus Wikidata.", wiki_url: "", features: { track: false, retractable: false, slide_pitch: false, standing: 12000, lit_facade: true, record: "Größte Heimkulisse: 41.230" } };
  };

  const career = (id) => { const r = rng("c" + id); return [["Jugend FC Nordstadt", "2012", "2016"], ["SC Steinbruch", "2016", "2020"], ["Küstenwacht 04", "2020", "2023"], ["FC Nordstadt", "2023", ""]].map(([club, from, to], i) => ({ club, from, to, apps: i < 3 ? 20 + Math.floor(r() * 60) : null, goals: i < 3 ? Math.floor(r() * 15) : null, loan: i === 2 && r() < 0.5, national: false })); };

  P.handlers = {
    settings_get: () => settings,
    settings_set: ({ sport }) => { settings.sport = sport; return settings; },
    sport_leagues: () => leagues,
    league_meta: () => leagueMeta,
    notch_rect: () => ({ dock: "top", x: innerWidth / 2 - 170, y: 0, w: 340, h: 34 }),
    sport_teams: ({ league } = {}) => Object.values(teams).filter((t) => (league === "nba" ? t.id.startsWith("basketball") : t.id.startsWith("soccer"))).map(toPick),
    schedule: async () => { await new Promise((r) => setTimeout(r, 250)); return allSched(); },
    standings: ({ league }) => (league === "nba" ? nbaTable : table),
    team_view: ({ key }) => { const all = allSched(); return { next: all.filter((m) => m.state === "pre" && (m.home.id === key || m.away.id === key)), last: all.filter((m) => m.state === "post" && (m.home.id === key || m.away.id === key)).reverse() }; },
    match_detail: ({ key }) => ({ ...detail(key), clips: [] }),
    match_plays: ({ key }) => (String(key).startsWith("basketball") ? shots(60) : plays(key)),
    sport_watch: ({ key }) => {
      if (key) setTimeout(() => P.emit("sport-plays", { key, reset: true, plays: String(key).startsWith("basketball") ? shots(60) : plays(key) }), 200);
      watched = key || "";
      return null;
    },
    league_pool: async () => { await new Promise((r) => setTimeout(r, 500)); return { league: "Nordliga", players: SOC.flatMap(([k]) => statsOf(k).map((s) => ({ ...s, team: T(k) }))) }; },
    squad_stats: ({ key }) => statsOf(String(key).split(":")[1]),
    team_roster: ({ key }) => squads[String(key).split(":")[1]] ?? [],
    player_info: ({ id, name }) => {
      const r = rng("pi" + id); const pos = squads[String(id).split("-")[0]]?.find((p) => p.id === id)?.pos ?? "M";
      return { name, age: 19 + Math.floor(r() * 16), born: "1999-04-12", height_cm: 172 + Math.floor(r() * 22), weight_kg: 66 + Math.floor(r() * 20), nation: "Deutschland", flag: "", position: { G: "Torwart", D: "Abwehr", M: "Mittelfeld", F: "Sturm" }[pos], headshot: "", photo: "", photo_page: "", career: career(id), transfermarkt: "", wikidata: "" };
    },
    recent_lineups: ({ team }) => {
      const k = String(team).split(":")[1];
      return [0, 1, 2, 3, 4].map((i) => { const opp = SOC[(i * 2 + 3) % 10]; return { event: `soccer/nord:r${i}`, date: now - (i + 1) * 7 * D, home: i % 2 === 0, opp: T(opp[0], ""), score: ["2:1", "0:0", "1:3", "2:0", "1:1"][i], result: ["s", "u", "n", "s", "u"][i], comp: "Nordliga", lineup: lu(k, i % 2 ? "4-3-3" : "4-2-3-1") }; });
    },
    venue_info: ({ name, city }) => stadium(name, city),
    league_news: ({ league }) => ({
      news: [
        { headline: "Nordstadt eyes move for Mühlental midfielder", text: "", at: now - 2 * H, link: "https://github.com/NojoMcDybo/arena", image: "", transfer: true },
        { headline: "Talking points: Hafenstadt stun Nordstadt late on", text: "", at: now - 5 * H, link: "https://github.com/NojoMcDybo/arena", image: "", transfer: false },
        { headline: "Bergwerk sign academy striker to a long-term contract", text: "", at: now - 26 * H, link: "https://github.com/NojoMcDybo/arena", image: "", transfer: true },
        { headline: "Coach: 'We have to defend as a team'", text: "", at: now - 50 * H, link: "https://github.com/NojoMcDybo/arena", image: "", transfer: false },
      ],
      moves: league === "nba" ? [{ at: now - D, text: "Re-signed C Marlow to a contract.", team: T("riv") }] : [],
    }),
    export_ics: ({ name, ics }) => {
      // Kalenderdatei wirklich zum Download anbieten
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
      a.download = `${name} – Spiele.ics`;
      document.body.append(a); a.click(); a.remove();
      return `Downloads/${name} – Spiele.ics`;
    },
    open_link: ({ url }) => { window.open(url, "_blank", "noopener"); return null; },
    laya_status: () => ({ want: false, state: "off", done: 0, total: 307_000_000, message: "", dir: "" }),
    laya_install: () => ({ want: false, state: "off", done: 0, total: 307_000_000, message: "Das lokale Modell gibt es nur in der installierten App.", dir: "" }),
    laya_uninstall: () => ({ want: false, state: "off", done: 0, total: 307_000_000, message: "", dir: "" }),
    take_pending: () => null,
    update_state: () => ({ status: "current", current: "0.2.7" }),
    update_check: () => ({ status: "current", current: "0.2.7" }),
    update_install: () => null,
  };

  // beim Start einmal den Spielstand schicken
  setTimeout(() => P.emit("sport", state), 400);
  addEventListener("load", () => setTimeout(() => P.emit("sport", state), 700));
})();
