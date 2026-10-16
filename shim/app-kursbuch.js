/* Kursbuch: Beispiel-Antworten für die App-Befehle (kursbuch/src/api.ts). Sechs erfundene Kurse im „WiSe 2026/27“, Termine
   relativ zu heute, ein kleiner Suchbestand, Stundenplan, Fokus-Modus. Zugangsdaten werden nirgends gespeichert oder gesendet. */
(() => {
  const P = window.__PORTFOLIO__;
  P.version = "0.3.1";
  P.name = "Kursbuch";

  const SEM = "WiSe 2026/27";
  const now = Math.floor(Date.now() / 1000), DAY = 86400;
  const midnight = (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return Math.floor(d / 1000); })();
  const toast = (text) => P.bus("toast", { text });

  // ---------- Kurse ----------
  const COURSES = [
    { id: 101, title: "Einführung in die Bewegungswissenschaft", kind: "vorlesung", teacher: "Prof. Dr. Hanna Lorenz", hue: 205 },
    { id: 102, title: "Seminar: Sportpsychologie im Leistungssport", kind: "seminar", teacher: "Dr. Jonas Brandt", hue: 160 },
    { id: 103, title: "Übung: Trainingslehre", kind: "uebung", teacher: "M. Sc. Mira Sander", hue: 28 },
    { id: 104, title: "Literature and Culture II", kind: "vorlesung", teacher: "Prof. Dr. Elias Wolff", hue: 330 },
    { id: 105, title: "Seminar: Syntax und Semantik", kind: "seminar", teacher: "Dr. Paul Keller", hue: 262 },
    { id: 106, title: "Übung: Statistik für Sportwissenschaft", kind: "uebung", teacher: "M. Sc. Finn Vogel", hue: 95 },
  ];
  const TOPICS = {
    101: ["Grundbegriffe und Modelle", "Motorisches Lernen", "Biomechanik der Bewegung", "Koordination und Fertigkeiten", "Klausurvorbereitung"],
    102: ["Motivation und Volition", "Stress und Leistung", "Teamdynamik", "Mentales Training", "Beratung im Sport"],
    103: ["Belastung und Beanspruchung", "Superkompensation", "Periodisierung", "Kraft und Schnellkraft", "Planen und Dokumentieren"],
    104: ["Postkoloniale Literatur", "Kulturtheorien", "Close Reading", "Medien und Erzählung", "Exam Preparation"],
    105: ["Phrasenstruktur", "Satzglieder und Rollen", "Bedeutung und Kontext", "Pragmatik", "Korpusarbeit"],
    106: ["Deskriptive Statistik", "Wahrscheinlichkeit", "Hypothesentests", "Korrelation und Regression", "Auswertung in R"],
  };
  const files = (c, s, n) => Array.from({ length: n }, (_, i) => ({ idx: i, name: `${TOPICS[c][s].split(" ")[0]}_${i + 1}`, ext: ["pdf", "pptx", "docx"][(c + s + i) % 3] }));
  const course = (c) => ({
    ...c, semester: SEM, web: true, note: c.id % 2 === 0,
    sections: TOPICS[c.id].map((t, s) => ({
      title: `${s + 1}. ${t}`,
      items: [
        { cmid: c.id * 100 + s * 10 + 1, name: s === 0 ? "Willkommen und Ablauf" : `Folien: ${t}`, typ: s === 0 ? "label" : "resource", files: s === 0 ? [] : files(c.id, s, 1), skipped_mb: [], error: false, web: false },
        ...(s % 2 === 0 ? [{ cmid: c.id * 100 + s * 10 + 2, name: `Literatur und Aufgaben: ${t}`, typ: "folder", files: files(c.id, s, 3), skipped_mb: [], error: false, web: false }] : []),
        ...(s === 1 ? [{ cmid: c.id * 100 + s * 10 + 3, name: "Diskussionsforum", typ: "forum", files: [], skipped_mb: [], error: false, web: true }] : []),
        ...(s === 2 ? [{ cmid: c.id * 100 + s * 10 + 4, name: "Abgabe: Kurzbericht", typ: "assign", files: [], skipped_mb: [], error: false, web: true }] : []),
      ],
    })),
  });
  const card = (c) => { const v = course(c); const items = v.sections.flatMap((s) => s.items); return { id: c.id, title: c.title, semester: SEM, teacher: c.teacher, kind: c.kind, hue: c.hue, activities: items.length, files: items.reduce((a, i) => a + i.files.length, 0), skipped: 0, errors: 0 }; };

  // ---------- Termine ----------
  const at = (dayOffset, h, m = 0) => midnight + dayOffset * DAY + h * 3600 + m * 60;
  const weekStart = (() => { const d = new Date(); const wd = (d.getDay() + 6) % 7; return -wd; })();
  const PLAN = [ // Wochenplan: Tag (Mo = 0), Beginn, Ende, Raum, Kurs
    [0, 10 * 60, 12 * 60, "HS 4", 101], [0, 14 * 60, 16 * 60, "S 12", 105], [1, 8 * 60, 10 * 60, "Labor 2", 103], [1, 12 * 60, 14 * 60, "S 3", 102],
    [2, 10 * 60, 12 * 60, "HS 4", 104], [3, 14 * 60, 16 * 60, "PC-Pool", 106], [4, 10 * 60, 12 * 60, "S 12", 105],
  ];
  const events = () => {
    const out = [];
    for (const [day, s, , , cid] of PLAN) {
      const c = COURSES.find((x) => x.id === cid);
      for (let w = -1; w < 6; w++) {
        const ts = midnight + (weekStart + w * 7 + day) * DAY + s * 60;
        out.push({ id: `s${cid}-${w}`, ts, allDay: false, kind: "sitzung", title: c.title, short: c.title.split(":").pop().trim().split(" ").slice(0, 2).join(" "), course: cid, source: "lernweb", overdue: false });
      }
    }
    const dl = (id, d, h, title, short, cid, kind = "frist") => out.push({ id, ts: at(d, h), allDay: h === 0, kind, title, short, course: cid, source: "abschnitt", overdue: d < 0 });
    dl("f1", 2, 23, "Abgabe: Kurzbericht Trainingslehre", "Kurzbericht", 103);
    dl("f2", 5, 12, "Abgabe: Essay zu Close Reading", "Essay", 104);
    dl("f3", 9, 23, "Abgabe: Auswertung in R", "Auswertung", 106);
    dl("f4", 13, 0, "Referat Sportpsychologie (Gruppe B)", "Referat", 102, "termin");
    dl("f5", 27, 10, "Klausur Bewegungswissenschaft", "Klausur", 101, "pruefung");
    dl("f6", -2, 18, "Abgabe: Reflexion Mentales Training", "Reflexion", 102);
    return out.sort((a, b) => a.ts - b.ts);
  };

  // ---------- Neu ----------
  const NEWS = [
    { course: 103, cmid: 10300, name: "Folien: Superkompensation", typ: "resource", file: 0, ts: now - 3 * 3600, updated: false },
    { course: 104, cmid: 10400, name: "Reading: Cultural Memory", typ: "resource", file: 0, ts: now - 20 * 3600, updated: false },
    { course: 106, cmid: 10600, name: "Datensatz für die Auswertung", typ: "resource", file: 0, ts: now - 30 * 3600, updated: true },
  ];

  // ---------- Suche: kleiner Bestand ----------
  const CORPUS = [
    [101, "Folien: Motorisches Lernen", "pptx", ["Motorisches Lernen beschreibt die relativ dauerhafte Veränderung von Bewegungsmustern durch Übung.", "Die Phasenmodelle nach Meinel und Schnabel unterscheiden Grob-, Fein- und Feinstkoordination.", "Frist: Abgabe der Lernkarten bis Freitag."]],
    [101, "Skript Biomechanik", "pdf", ["Drehmoment, Hebelarm und Trägheit bestimmen die Wurfbewegung.", "Die Klausur umfasst Aufgaben zu Kraftstoß und Impulserhaltung."]],
    [102, "Text: Motivation im Sport", "pdf", ["Die Selbstbestimmungstheorie unterscheidet intrinsische und extrinsische Motivation.", "Referat: Gruppe B präsentiert am 29. Oktober."]],
    [102, "Handout Mentales Training", "docx", ["Mentales Training nutzt Vorstellung, Entspannung und Zielsetzung.", "Abgabe der Reflexion bis Montag, 18 Uhr."]],
    [103, "Folien: Superkompensation", "pptx", ["Nach einer Belastung fällt die Leistungsfähigkeit ab und steigt über das Ausgangsniveau (Superkompensation).", "Der richtige Zeitpunkt der nächsten Belastung entscheidet über den Trainingseffekt."]],
    [103, "Aufgabenblatt Periodisierung", "pdf", ["Plane einen Mesozyklus mit drei Belastungswochen und einer Entlastungswoche.", "Abgabe: Kurzbericht bis Mittwoch 23:59."]],
    [104, "Reading: Cultural Memory", "pdf", ["Cultural memory shapes how communities remember and narrate their past.", "Essay deadline: Close Reading of a short passage, due next week."]],
    [104, "Slides: Postcolonial Literature", "pptx", ["Key terms: hybridity, mimicry, the subaltern.", "Exam preparation: bring two example passages."]],
    [105, "Folien: Phrasenstruktur", "pptx", ["Eine Phrase besteht aus einem Kopf und seinen Abhängigen.", "Das Konstituententeststrategie-Blatt hilft beim Erkennen von Phrasen."]],
    [105, "Übungsblatt Satzglieder", "pdf", ["Bestimme Subjekt, Prädikat und Objekte in den folgenden Sätzen.", "Lösungen in der nächsten Sitzung."]],
    [106, "Skript Hypothesentests", "pdf", ["Der p-Wert gibt an, wie wahrscheinlich die Daten unter der Nullhypothese sind.", "Auswertung in R: t-Test, Wilcoxon-Test, Effektstärke."]],
    [106, "Datensatz Sprungkraft", "docx", ["Variablen: Alter, Geschlecht, Sprunghöhe, Trainingsumfang.", "Abgabe der Auswertung am Ende der Woche."]],
  ];
  const mark = (t, words) => words.reduce((s, w) => s.replace(new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\p{L}]*)`, "giu"), "\u0001$1\u0002"), t);
  const search = ({ q, deep, courses }) => {
    const t0 = performance.now();
    const words = String(q).toLowerCase().split(/\s+/).filter((w) => w.length > 1);
    const stems = deep ? words.map((w) => (w.length > 5 ? w.slice(0, -2) : w)) : words;
    const hits = [];
    CORPUS.forEach(([cid, title, ext, paras], i) => {
      if (courses.length && !courses.includes(cid)) return;
      const score = paras.map((p) => stems.filter((w) => p.toLowerCase().includes(w)).length);
      const all = stems.every((w) => (title + " " + paras.join(" ")).toLowerCase().includes(w));
      const any = stems.some((w) => (title + " " + paras.join(" ")).toLowerCase().includes(w));
      if (!(deep ? any : all)) return;
      const best = score.indexOf(Math.max(...score));
      hits.push({ kind: ext, course: cid, cmid: cid * 100 + i, path: `${COURSES.find((c) => c.id === cid).title}/${title}.${ext}`, title, pages: [2 + best * 3, 7 + best], snippet: mark(paras[best], stems), file: 0, count: Math.max(...score) + 1 });
    });
    COURSES.forEach((c) => { if ((!courses.length || courses.includes(c.id)) && stems.some((w) => c.title.toLowerCase().includes(w)) && words.length) hits.unshift({ kind: "course", course: c.id, cmid: null, path: c.title, title: c.title, pages: [], snippet: mark(c.title, stems), file: null, count: 1 }); });
    hits.sort((a, b) => b.count - a.count);
    return { hits: hits.slice(0, 30), ms: Math.max(1, Math.round(performance.now() - t0)), indexed: true, words };
  };

  // ---------- Stundenplan ----------
  let plans = { [SEM]: PLAN.map(([day, start, end, room, cid], i) => ({ id: `e${i}`, title: COURSES.find((c) => c.id === cid).title.replace(/^(Seminar|Übung): /, ""), day, start, end, room, course: cid })) };

  // ---------- Fokus ----------
  const todayDay = Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000);
  const focus = {
    lists: [{ id: "l1", name: "Diese Woche", items: [{ id: "t1", text: "Kurzbericht Trainingslehre schreiben", done: false }, { id: "t2", text: "Folien Motorisches Lernen wiederholen", done: false }, { id: "t3", text: "Essay-Gliederung abschicken", done: true }] }],
    settings: { focus: 25, pause: 5 },
    stats: { current: 4, best: 11, today: 2, today_minutes: 50, total: 63, days: Array.from({ length: 84 }, (_, i) => [todayDay - 83 + i, [0, 1, 2, 3, 0, 2, 4, 1, 0, 3][i % 10]]).filter(([, n]) => n > 0), today_day: todayDay },
  };

  // ---------- Kursdetails ----------
  const extras = (id) => {
    const c = COURSES.find((x) => x.id === id);
    return {
      news: [
        { id: 1, forum: 1, forum_name: "Ankündigungen", title: "Raumänderung nächste Woche", author: c.teacher, ts: now - 2 * DAY, text: "Die Sitzung findet nächste Woche in einem anderen Raum statt. Bitte rechtzeitig kommen.", links: [], files: [], url: null },
        { id: 2, forum: 1, forum_name: "Ankündigungen", title: "Material zur Sitzung online", author: c.teacher, ts: now - 6 * DAY, text: "Die Folien und das Aufgabenblatt sind jetzt im Kurs.", links: [{ text: "Hinweise zur Klausur", url: "https://example.org" }], files: [], url: null },
      ],
      assignments: id % 2 === 1 ? [{ cmid: id * 100 + 24, name: "Abgabe: Kurzbericht", url: null, intro: "Fasse die Ergebnisse der Übung auf zwei Seiten zusammen.", links: [], due: "Mittwoch, 21. Oktober 2026, 23:59", status: "Noch nicht abgegeben", grading: "Nicht bewertet", remaining: "5 Tage 7 Stunden", due_ts: at(5, 23) }] : [],
      teachers: [{ id: id, name: c.teacher, role: "Dozent*in", email: null, profile: null, fields: {}, source: "demo", checked: now }],
      contacts: [],
    };
  };

  let syncing = false;
  const SYNC_STEPS = ["content", "events", "schedule", "index"];
  const outline = (cid, withText) => {
    const list = cid ? COURSES.filter((c) => c.id === cid) : COURSES;
    const text = `# Verzeichnis – ${SEM}\n\n` + list.map((c) => `## ${c.title}\n${c.teacher}\n\n` + course(c).sections.map((s) => `### ${s.title}\n` + s.items.map((i) => `- ${i.name}${i.files.length ? ` (${i.files.map((f) => f.ext).join(", ")})` : ""}`).join("\n")).join("\n\n") + (withText ? "\n\n" + CORPUS.filter((x) => x[0] === c.id).map((x) => `#### ${x[1]}\n${x[3].join("\n")}`).join("\n\n") : "")).join("\n\n");
    return { text, chars: text.length, truncated: false };
  };

  const account = { saved: true, user: "demo", running: false };

  P.handlers = {
    overview: () => ({ status: "ok", error: null, last_run: now - 3 * 3600, courses: COURSES.map(card) }),
    course: ({ id }) => course(COURSES.find((c) => c.id === id) ?? COURSES[0]),
    events: () => events(),
    news: () => NEWS,
    mark_read: () => null,
    notch_rect: () => null,
    open_file: () => { toast("Dateien öffnen sich in der installierten App – hier gibt es nur Beispiele."); return null; },
    open_web: () => { toast("Hier würde die Seite in LearnWeb aufgehen."); return null; },
    open_note: () => { toast("Notizen öffnen sich in Obsidian – nur in der echten App."); return null; },
    open_folder: () => { toast("Der Kursordner öffnet sich im Explorer – nur in der echten App."); return null; },
    open_directory: () => { toast("Das Verzeichnis öffnet sich in Obsidian – nur in der echten App."); return null; },
    search: (a) => search(a),
    for_ai: ({ course: c, withText }) => outline(c, withText),
    copy_file: () => { toast("Datei in die Zwischenablage kopiert (Demo)."); return null; },
    fetch: async () => { await new Promise((r) => setTimeout(r, 700)); return { files: 1, skipped: 0 }; },
    open_course: ({ course: id, cmid, section }) => {
      const c = COURSES.find((x) => x.id === id);
      if (!c) return null;
      const q = new URLSearchParams({ kurs: String(id) });
      if (cmid) q.set("cmid", String(cmid));
      if (section) q.set("section", section);
      P.bus("window:open", { key: `kursbuch:${id}`, title: c.title, src: `index.html?${q}`, size: [980, 700], max: false });
      return null;
    },
    timetable_get: () => plans,
    timetable_save: ({ semester, entries }) => { plans = { ...plans, [semester]: entries }; return null; },
    timetable_import: ({ text }) => {
      const events = String(text).split("BEGIN:VEVENT").slice(1);
      const entries = [];
      for (const e of events) {
        const s = /SUMMARY:(.*)/.exec(e)?.[1]?.trim(); const d = /DTSTART[^:]*:(\d{8})T(\d{2})(\d{2})/.exec(e); const f = /DTEND[^:]*:(\d{8})T(\d{2})(\d{2})/.exec(e);
        if (!s || !d || !f) continue;
        const dt = new Date(`${d[1].slice(0, 4)}-${d[1].slice(4, 6)}-${d[1].slice(6, 8)}T00:00`);
        entries.push({ id: "i" + entries.length + Date.now(), title: s, day: (dt.getDay() + 6) % 7, start: +d[2] * 60 + +d[3], end: +f[2] * 60 + +f[3], room: /LOCATION:(.*)/.exec(e)?.[1]?.trim() ?? "", course: null });
      }
      return { entries, skipped: events.length - entries.length };
    },
    timetable_export: ({ semester }) => {
      const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kursbuch Demo//DE", ...(plans[semester] ?? []).flatMap((e, i) => ["BEGIN:VEVENT", `UID:demo-${i}@kursbuch`, `SUMMARY:${e.title}`, `LOCATION:${e.room}`, "END:VEVENT"]), "END:VCALENDAR"].join("\r\n");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
      a.download = `Stundenplan ${semester}.ics`;
      document.body.append(a); a.click(); a.remove();
      return `Downloads/Stundenplan ${semester}.ics`;
    },
    account_status: () => account,
    account_login: ({ user }) => { account.saved = true; account.user = "demo"; toast("Demo: Zugangsdaten werden nirgends gespeichert oder gesendet."); void user; return null; },
    account_logout: () => { account.saved = false; account.user = null; return null; },
    focus_get: () => focus,
    focus_save: ({ lists, settings }) => { focus.lists = lists; focus.settings = settings; return null; },
    focus_log: ({ minutes }) => { const s = focus.stats; s.today += 1; s.today_minutes += minutes; s.total += 1; s.current = Math.max(s.current, 1); return s; },
    pomodoro_notch: () => null,
    pomodoro_widget: ({ show }) => {
      if (show) P.bus("window:open", { key: "kursbuch:widget", title: "Pomodoro", src: "index.html?widget=pomodoro", size: [260, 120], bare: true });
      else P.bus("window:close", { key: "kursbuch:widget" });
      return null;
    },
    course_extras: ({ course: id }) => extras(id),
    open_url: ({ url }) => { window.open(url, "_blank", "noopener"); return null; },
    update_state: () => ({ status: "current", current: "0.3.1" }),
    update_check: () => ({ status: "current", current: "0.3.1" }),
    update_install: () => null,
    schedule_get: () => [
      { key: "104:2", course: 104, title: "Literature and Culture II", semester: SEM, weekday: 2, start: 10 * 60, end: 12 * 60, room: "HS 4", confidence: "hoch", source: "Sitzungstermine", sessions: 6 },
      { key: "106:3", course: 106, title: "Übung: Statistik für Sportwissenschaft", semester: SEM, weekday: 3, start: null, end: null, room: null, confidence: "mittel", source: "Sitzungstermine", sessions: 4 },
    ],
    schedule_dismiss: () => null,
    sync_start: () => {
      if (syncing) return false;
      syncing = true;
      const ev = (e) => P.emit("sync-event", e);
      ev({ event: "begin", courses: COURSES.length });
      COURSES.forEach((c, i) => setTimeout(() => ev({ event: "course", index: i + 1, total: COURSES.length, name: c.title }), 500 + i * 650));
      SYNC_STEPS.forEach((s, i) => setTimeout(() => ev({ event: s }), 500 + COURSES.length * 650 + i * 450));
      setTimeout(() => { ev({ event: "end" }); syncing = false; }, 700 + COURSES.length * 650 + SYNC_STEPS.length * 450);
      return true;
    },
    sync_running: () => syncing,
    take_pending: () => null,
  };
})();
