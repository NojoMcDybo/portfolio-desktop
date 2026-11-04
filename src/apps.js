// Register aller Programme und Lernseiten. Eine Stelle, damit Dock, Fenster, Willkommen und Info-Blatt dieselben Angaben nutzen.
// Installer: `repo` ist das GitHub-Repo mit den Releases; Version und Größe werden zur Laufzeit von der Release-API geholt
// (siehe downloads.js), `fallback` greift, wenn die API nicht erreichbar ist.

export const OWNER = "NojoMcDybo";

export const APPS = [
  {
    id: "arena",
    name: "Arena",
    tag: "Live-Sport, Spielplan, Tabellen, Teams",
    about:
      "Die große Sportansicht im Nojo-Ökosystem: laufende Spiele mit Ballverlauf oder Wurfbild, Druckphasen, Statistik, Ticker und Aufstellung. Daneben Spielplan, Ligen mit Tabellen und Schlagzeilen, Teamseiten und eine Schnellsuche. Wappen statt Vereinsnamen, ein Kartenaufbau überall.",
    try: [
      "Ein laufendes Spiel links auswählen – Ballverlauf, Druckphasen und Statistik wechseln mit.",
      "Oben zwischen Live, Spielplan, Ligen und Teams wechseln (Strg+1 bis 4).",
      "Strg+K öffnet die Schnellsuche für Teams, Ligen und Ansichten.",
    ],
    demo: "Erfundene Vereine und Spiele – echte Wappen und Ergebnisse sind nur in der installierten App.",
    repo: "arena",
    stack: "Tauri 2 · Rust · TypeScript",
    size: [1080, 760],
    page: "apps/arena/index.html",
    icon: "assets/icons/arena.svg",
    accent: "#30d158",
    fallback: { version: "0.2.7", mb: 2.8, url: "https://github.com/NojoMcDybo/arena/releases/latest" },
  },
  {
    id: "vantage",
    name: "Vantage",
    tag: "Profispiele, eigene Partien, Clips",
    about:
      "Eine eigenständige App für League of Legends: Profispiele live und im Rückblick mit Turnierbaum und Teamseiten, die eigene Partie mit Power-Level- und Meisterschafts-Diagrammen, ein Clip-Studio zum Aufnehmen und Schneiden und ein Replay-Studio mit Regie-Ansicht neben dem Spiel.",
    try: [
      "Unter „Pro“ ein Spiel öffnen – Goldverlauf und Teams im Überblick; im Reiter „Turnier“ den Baum ansehen, ein Klick auf ein Team öffnet seine Seite.",
      "„Ich“ → „Spiele“: ein Spiel wählen, die Power-Level-Grafik zeigt deine Stärke je Minute gegen den Lane-Gegner; „Aktualisieren“ lädt die Liste neu.",
      "Im „Studio“ Clips ansehen und Schnittmarken setzen.",
    ],
    demo: "Beispieldaten ohne Spielbilder. Vantage steht in keiner Verbindung zu Riot Games; der Quellcode ist privat.",
    repo: "vantage-releases",
    sourceRepo: null,
    stack: "Tauri 2 · Rust · TypeScript",
    size: [1240, 820],
    page: "apps/vantage/index.html",
    icon: "assets/icons/vantage.svg",
    accent: "#4da3ff",
    fallback: { version: "0.5.11", mb: 4.8, url: "https://github.com/NojoMcDybo/vantage-releases/releases/latest" },
  },
  {
    id: "notch",
    name: "Notch",
    tag: "Dynamic Island für Windows",
    about:
      "Eine schwarze Form, bündig an der oberen Bildschirmkante: zugeklappt fast unsichtbar, kompakt bei Musik, Timer, Blutzucker oder Spielstand, aufgeklappt mit der Maus oder wenn eine Datei darübergezogen wird. Sie zeigt, was gerade wichtig ist – und verdrängt nichts. Dieses Fenster sind ihre Einstellungen.",
    try: [
      "Die echte Notch oben in der Mitte: Maus darüberfahren, sie klappt auf (Musik, Blutzucker, Spiel, Ablage, Timer).",
      "Hier unter „Anzeige“ die Rangliste ändern oder „Ausprobieren“ wählen – die Notch oben folgt sofort.",
      "Eine Datei von deinem Rechner auf die Notch ziehen, oder die Form mit gedrückter Maus an den linken oder rechten Rand ziehen.",
    ],
    demo: "Dies ist die echte Oberfläche der Notch. Musik (ohne Ton), Blutzucker, Puls und Spielstand sind Beispieldaten; Systemfunktionen wie Lautstärke oder Medienfenster gibt es nur in der installierten App.",
    repo: "notch",
    stack: "Tauri 2 · Rust · TypeScript",
    size: [560, 780],
    page: "apps/notch/settings.html",
    icon: "assets/icons/notch.png",
    accent: "#ffffff",
    fallback: { version: "0.2.27", mb: 10.7, url: "https://github.com/NojoMcDybo/notch/releases/latest" },
  },
  {
    id: "haze",
    name: "Haze",
    tag: "Glukose im Blick",
    about:
      "Persönliches Dashboard und Widget für eine vorhandene Nightscout-Instanz: Wert, Trend und Alter der Messung, dazu Auswertung über Wochen und Monate, Muster, Vergleich mit Sport und eine ehrliche Prognose. Haze ist kein Medizinprodukt.",
    try: [
      "Zwischen den Seiten blättern – sie legen sich wie Blätter übereinander.",
      "Profil „Arbeit“ oder „Gaming“ wechseln.",
      "Einstellungen öffnen und Einheit oder Darstellung ändern.",
    ],
    demo: "Nur Demodaten – es werden keine Gesundheitsdaten verbunden. Kein Medizinprodukt, nicht für Therapieentscheidungen.",
    repo: "Haze",
    stack: "Electron · React · TypeScript",
    size: [1100, 820],
    page: "apps/haze/index.html?preview=1",
    bar: true,
    icon: "assets/icons/haze.png",
    accent: "#75b8ff",
    fallback: { version: "1.15.0", mb: 117.6, url: "https://github.com/NojoMcDybo/Haze/releases/latest" },
  },
  {
    id: "streamdock",
    name: "Streamdock",
    tag: "Twitch-Player und Chat, frei andockbar",
    about:
      "Player und Chat als zwei freie Fenster, die aneinander andocken. Beim Start zeigt ein Menü, welche gefolgten Kanäle live sind, die Favoriten nach Schauzeit zuerst.",
    try: [
      "Einen Kanal anklicken: Player und Chat öffnen sich als zwei Fenster.",
      "Den Chat nah an eine Kante des Players ziehen – er rastet ein und folgt dem Player.",
      "Mehr als 30 Pixel wegziehen löst ihn wieder.",
    ],
    demo: "Erfundene Kanäle, Bilder sind Farbverläufe. Die echte App meldet sich bei Twitch an.",
    repo: "streamdock",
    stack: "Tauri 2 · Rust · TypeScript",
    size: [960, 700],
    page: "apps/streamdock/index.html",
    icon: "assets/icons/streamdock.svg",
    accent: "#9146ff",
    fallback: { version: "0.2.1", mb: 2.9, url: "https://github.com/NojoMcDybo/streamdock/releases/latest" },
  },
  {
    id: "kursbuch",
    name: "Kursbuch",
    tag: "Das Studium aus LearnWeb",
    about:
      "Zeigt das Studium aus LearnWeb: Zeitstrahl mit Fristen, Wochenansicht mit Stundenplan, Kurse mit eigenen Fenstern, Volltextsuche über alle Inhalte, ein Fokus-Modus mit Pomodoro. Die Fristen laufen auch in die Notch.",
    try: [
      "Im Wochenkalender einen Termin anklicken.",
      "Strg+K startet die Suche – Schnell oder Tief.",
      "Einen Kurs öffnen, um Ankündigungen, Abgaben und Dozenten zu sehen.",
    ],
    demo: "Erfundene Kurse und Termine. Die echte App liest dein eigenes LearnWeb-Konto.",
    repo: "kursbuch",
    stack: "Tauri 2 · Rust · Python · TypeScript",
    size: [1080, 760],
    page: "apps/kursbuch/index.html",
    icon: "assets/icons/kursbuch.svg",
    accent: "#75b8ff",
    fallback: { version: "0.4.0", mb: 24.7, url: "https://github.com/NojoMcDybo/kursbuch/releases/latest" },
  },
  {
    id: "folio",
    name: "Folio",
    tag: "PDF-Reader und Werkstatt in Glas",
    about:
      "Ein PDF-Reader für Windows: jedes Dokument in einem eigenen Fenster, die Bedienung schwebt in Glas über der Seite. Suche mit Trefferzähler, Inhaltsverzeichnis, Textmarker, Stift und Textfeld als echte PDF-Anmerkungen, Invertierung für den Abend. Dazu eine kleine Werkstatt: Seiten umsortieren, löschen, drehen, zuschneiden und herauslösen, PDFs zusammenführen, Texterkennung, Unterschrift per Handy, Verkleinern und Schwarzweiß. Die geöffnete Seite läuft in die Notch.",
    try: [
      "Einen Steckbrief meiner Lernseiten öffnen, mit Strg+F suchen und mit Strg+B die Seitenleiste herausziehen.",
      "In der Seitenleiste Miniaturen ziehen, um Seiten umzusortieren; Entf löscht, Strg+Z nimmt zurück, K zeigt den Kontaktbogen.",
      "Taste M drücken und einen Satz markieren; mit Strg+Umschalt+U unterschreiben („Hier zeichnen“).",
    ],
    demo: "Als Beispiele dienen PDF-Steckbriefe meiner Lernseiten. Eigene PDFs bleiben im Browser, „Sichern“ gilt hier nur im Speicher. Drehen, Zuschneiden, Texterkennung, Unterschrift am Handy und Verkleinern rechnet die installierte App.",
    repo: "folio",
    stack: "Tauri 2 · Rust · TypeScript · PDF.js",
    size: [840, 540],
    page: "apps/folio/index.html",
    icon: "assets/icons/folio.png",
    accent: "#9ac8ff",
    fallback: { version: "0.13.0", mb: 222.2, url: "https://github.com/NojoMcDybo/folio/releases/latest" },
  },
  {
    id: "icastico",
    name: "Icastico",
    tag: "Notensatz als individuelle Workstation",
    about:
      "Notensatz zum schnellen Schreiben statt Suchen – für Gesang, Gitarre und Klavier, angelehnt an Finale, aber neu gedacht. Noten wie in Finale Simple Entry eingeben oder mit der Maus ziehen, neue Partitur mit Titel, Instrumenten, Tonart und Taktart, eigene Bibliothek mit Sammlungen und Papierkorb, Tastenbelegung Finale oder Logic Pro und Wiedergabe mit Instrumentenklängen. Open Source unter der GPL-3.0.",
    try: [
      "Strg+N legt eine neue Partitur an: Titel, Instrumente, Tonart, Taktart.",
      "Enter startet die Eingabe: Zifferntasten wählen den Notenwert, C D E F G A H die Töne, 0 eine Pause. F1 zeigt alle Tasten.",
      "Noten mit der Maus ziehen und mit der Transportleiste abspielen, das Tempo lässt sich ändern.",
    ],
    demo: "Die Bibliothek liegt hier nur im Speicher des Browsers: Dateien öffnest du per Auswahl und sicherst sie als Download. Die echte App legt sie in Dokumente/Icastico an und aktualisiert sich selbst. Klänge: MuseScore General (MIT).",
    repo: "Icastico",
    stack: "Tauri 2 · Rust · TypeScript · SoundFont",
    size: [1300, 820],
    page: "apps/icastico/index.html",
    bar: true,
    icon: "assets/icons/icastico.png",
    accent: "#9ac8ff",
    os: "Windows 10/11 und macOS (Apple Silicon)",
    warn: "Die Installer sind noch nicht signiert: Windows zeigt SmartScreen („Weitere Informationen“ → „Trotzdem ausführen“), auf dem Mac öffnet man die App per Rechtsklick → „Öffnen“.",
    fallback: { version: "0.9.0", mb: 39.5, url: "https://github.com/NojoMcDybo/Icastico/releases/latest", mac: { mb: 39.8, url: "https://github.com/NojoMcDybo/Icastico/releases/latest" } },
  },
  {
    id: "english-daily",
    name: "English Daily",
    tag: "Englisch üben als Overlay auf dem Desktop",
    about:
      "Kleine tägliche Englisch-Aufgaben, die als schwebende Panels über dem ganzen Bildschirm liegen: durchsichtig, immer obenauf, und alles außerhalb der Panels bleibt klickbar. Die Panels lassen sich verschieben, docken aneinander an und klappen zu. Strg+Alt+E blendet das Overlay ein und aus; es läuft den ganzen Tag, ohne etwas zu kosten.",
    try: [
      "Eine Aufgabe im Panel „Task“ starten und beantworten.",
      "Die Kopfzeile eines Panels ziehen: Panels, die sich berühren, docken an und bewegen sich gemeinsam. Doppelklick auf die Kopfzeile klappt es ein.",
      "Strg+Alt+E blendet das Overlay aus und ein, auch bei geöffneten Fenstern.",
    ],
    demo: "Dies ist die echte Oberfläche des Overlays. Fenster und Tray, der Wechsel des Bildschirms und der Start mit Windows gibt es nur in der installierten App; Fortschritte bleiben hier im Browser.",
    overlay: true,
    sourceRepo: null,
    stack: "Tauri 2 · Rust · JavaScript",
    page: "apps/english-daily/index.html",
    icon: "assets/icons/english-daily.png",
    accent: "#0767d3",
  },
];

// Lernseiten laufen schon auf GitHub Pages: das Fenster zeigt die echte Seite, nichts ist nachgebaut.
export const LEARN = [
  { id: "trainingswissenschaften", name: "Trainingswissenschaften", sub: "Klausur-Trainer · 16 Module, 779 Lernkarten, 584 Prüfungsfragen", hue: 205, icon: "assets/icons/trainingswissenschaften.png" },
  { id: "LitCultLingu", name: "LitCult & Linguistik", sub: "Study Coach · Literary and Cultural Studies, Linguistics", hue: 330 },
  { id: "Sportpsychologie", name: "Sportpsychologie", sub: "MAP-3-Trainer", hue: 160 },
  { id: "Ringvorlesung_Inklusion", name: "Inklusion im Sport", sub: "Klausur-Trainer zur Ringvorlesung", hue: 28 },
  { id: "tennis-plus-lernwebsite", name: "Tennis Plus", sub: "Prüfungsvorbereitung SoSe 2026", hue: 95 },
  { id: "Basketball", name: "Basketball-Lernguide", sub: "Prüfungsvorbereitung nach Kolb 2025", hue: 18 },
  { id: "Helfen-Sichern-Turnen-Uni-M-nster", name: "Helfen & Sichern", sub: "Videosammlung zum Turnseminar", hue: 260 },
].map((s) => ({ ...s, url: `https://nojomcdybo.github.io/${s.id}/`, repo: s.id, size: [1100, 780] }));

export const MORE = [
  { id: "nebel", name: "nebel.", sub: "Diabetes-Alltagssimulator für Angehörige · Bildungsprojekt, kein Medizinprodukt", hue: 215 },
  { id: "gedichte-galaxie", name: "Gedichte-Galaxie", sub: "321 Gedichte als begehbare Galaxie", hue: 285 },
  { id: "courtflow", name: "CourtFlow", sub: "Übungsbibliothek Jugendbasketball U8–U18", hue: 35 },
  { id: "Hooptrack", name: "HoopTrack", sub: "Basketball-Tracking im Browser", hue: 12 },
].map((s) => ({ ...s, url: `https://nojomcdybo.github.io/${s.id}/`, repo: s.id, size: [1100, 780] }));

export const byId = (id) => APPS.find((a) => a.id === id);
