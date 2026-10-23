# Nojo – Desktop-Portfolio

Mein Portfolio ist ein Desktop im Browser. Die Seite bleibt gerade, liegt aber zuerst hinter einem Diffusor-Glas, das um seine untere Kante aufklappt: Je weiter ein Punkt vom Scharnier entfernt ist, desto stärker wird er gestreut. Ein Balken auf 60 % der Höhe verkleinert den Kippwinkel, bis alles scharf ist. Dann liegen dort meine Programme im Dock: **Arena**, **Vantage**, **Notch**, **Haze**, **Streamdock**, **Kursbuch** und der **nebel.-Simulator**, dazu der Ordner **Lernseiten** mit meinen Klausur-Trainern. Oben sitzt die Notch.

**Hintergrund:** Ein riesiger Baum in echter Tiefe (WebGL 2, `src/wallpaper.js`), gezeichnet im *Surface-Stable Fractal Dithering* von Rune Skovbo Johansen ([Dither3D](https://github.com/runevision/Dither3D), MPL-2.0): Die Rasterpunkte haften an den Oberflächen und bleiben auf dem Bildschirm gleich groß, auch wenn sich Ebenen gegeneinander verschieben. Der Shader (`src/wallpaper-shaders.js`) ist eine eigene Umsetzung des beschriebenen Verfahrens, kein übernommener Code. Wind bewegt Äste, Laub und Gras, Vögel sitzen und fliegen, Sonne, Mond, Sterne und Licht folgen Datum und Uhrzeit (`src/daylight.js`, Mitteleuropa). Der Blick durchs „Fenster“ folgt der Maus oder, nur auf Klick unter *Hintergrund → Kopf folgen (Webcam)*, dem Kopf (`src/head.js`, Gesichtserkennung von [MediaPipe](https://github.com/google-ai-edge/mediapipe), Apache-2.0, lokal im Browser, es wird nichts gesendet; Code und Modell kommen erst beim Einschalten von jsDelivr und Google Storage). Die Idee der Tiefenschichten stammt aus meinem Schichtenwald-Prototyp. Unter *Hintergrund* lassen sich außerdem Tageszeit (live, Morgen bis Nacht, Zeitraffer), Wind und Tiefe wählen. Ohne WebGL 2 bleibt der farbige Verlauf; „Bewegung reduzieren“ im System zeigt ein Standbild.

**Bühne in QHD:** Der Desktop ist auf QHD-Breite (2560 px) ausgelegt und wird (`src/stage.js`) an die Fenstergröße angepasst. Texte, Programme und Dock behalten so auf jedem Bildschirm dieselben Proportionen; auf kleinen Geräten (unter 760 px) gibt es stattdessen Vollbildfenster mit Dock unten.

Jedes Programm läuft im Fenster mit Beispieldaten und lässt sich ausprobieren. Unten im Fenster steht der Knopf für den **Installer** (Version und Größe kommen live aus dem jeweiligen GitHub-Release).

## Wie es gebaut ist

Kein Framework: Der Desktop ist handgeschriebenes HTML, CSS und JavaScript (ES-Module). Einzige Bibliothek ist **Motion** ([motion.dev](https://motion.dev), MIT, Version 13.5.0 fest in `vendor/`): Federn, Staffelung und Gesten für Intro, Fenster, Dock, Menüs, Notch und Karten. „Bewegung reduzieren“ im System schaltet alles auf sofort. Die Gestaltung stammt aus meiner Designsprache *Nojo UI* (`src/nojo-ui.css`).

| Ordner | Inhalt |
|---|---|
| `index.html`, `src/` | Intro (`intro.js`: vier Weichzeichner-Ebenen mit Masken nach Abstand × Kippwinkel; Idee aus [lid-plane](https://github.com/jh3y/lid-plane) und [iphone-duo-animation](https://github.com/akashtdev/iphone-duo-animation), kein Code übernommen), Fensterverwaltung (`wm.js`), Dock und Menüleiste (`main.js`), Notch (`notch.js`), Fußzeile und Info-Blatt mit Installer (`chrome.js`, `downloads.js`) |
| `src/wallpaper.js`, `wallpaper-shaders.js`, `daylight.js`, `head.js` | Hintergrund: Szene und Schleife, GLSL mit Dither-Funktion, Sonnen-/Mondstand und Himmelsfarben (Test: `node tools/test-daylight.mjs`), Kopf- und Mausverfolgung |
| `src/motion.js`, `vendor/` | Motion (gepinnt, mit Lizenz) und die gemeinsamen Federn `SPRING`, `POP`, `SOFT` sowie `lift()` und `reveal()` |
| `apps/` | die Programme im Fenster (siehe unten) |
| `shim/` | Tauri-Attrappe (`tauri-shim.js`) und je Programm die Beispiel-Antworten (`app-*.js`) |
| `tools/` | `build-apps.mjs` baut die Oberflächen aus den Programm-Repos, `serve.py` ist ein Entwicklungs-Server ohne Cache |

**Echte Oberflächen:** Arena, Kursbuch und Streamdock (Tauri) sowie Haze (Electron) sind die echten Oberflächen der Programme. `tools/build-apps.mjs` baut sie mit ihrem eigenen vite nach `apps/<name>/`. Die Programme sprechen über `window.__TAURI_INTERNALS__` mit ihrem Rust-Teil; hier beantwortet `shim/tauri-shim.js` dieselben Aufrufe mit Beispieldaten und gibt Fensterbefehle (schließen, minimieren, ziehen) an den Desktop weiter. Alle Daten sind erfunden: Vereine, Kurse, Kanäle, Termine.

**Notch:** Die Notch oben auf dem Desktop und ihr Einstellungsfenster sind die echten Oberflächen aus dem Notch-Repo (`apps/notch`: `index.html` = Notch in einem durchsichtigen Vollbild-iframe, `settings.html` = Einstellungen). Ihre „Rust-Seite“ ist `src/notch-backend.js` (Musik, Blutzucker, Puls, Sport, Timer/Pomodoro, Ablage, Einstellungen mit den Datenformen der echten App), `src/notch-host.js` meldet, ob der Zeiger über der Form liegt (in der echten App fragt Rust die Maus ab). Sie klappt nur auf, wenn man mit der Maus darüberfährt – nicht beim Öffnen der Seite und nicht bei Toren.

**Fußballwelt:** Notch und Arena rechnen mit derselben erfundenen Nordliga (`shim/soccer-world.js`). Spielstand und Minute hängen nur von der Uhrzeit ab, ein Neuladen setzt nichts zurück. Ergebnisse bleiben realistisch (0–5 Tore, im Mittel 2,4, mindestens 30 s Abstand); ist ein Spiel aus, beginnt ein neues, statt dass ein Ergebnis weiterwächst. Das Spielfeld mit Ballverlauf zeigen beide.

**Nachbau:** Nur *Vantage* (Quellcode privat) ist von Hand geschrieben (`apps/vantage`): eigener Code, der die Oberfläche der App nachzeichnet (Pro mit Live, Spielplan, Pokal, Teams; Ich; Studio mit Clip-Editor) mit erfundener Welt aus Ligen, Teams, Spielern und Ergebnissen (`world.js`). Schriften: Cinzel, Source Sans 3, Saira Semi Condensed (SIL OFL 1.1, Lizenzen in `apps/vantage/fonts/`). Champion- und Item-Bilder lädt die Seite zur Laufzeit aus Riots Data Dragon; fehlen sie, zeigt die Seite Kürzel.

**Lernseiten und Simulator** sind die echten Seiten auf GitHub Pages, eingebettet in ein Fenster; nichts davon ist kopiert.

## Lokal ansehen

```
python tools/serve.py
```

Dann `http://127.0.0.1:4173/` öffnen. Hilfreiche Parameter: `?skip=1` überspringt das Intro, `?open=arena` öffnet ein Programm sofort (`arena`, `vantage`, `notch`, `haze`, `streamdock`, `kursbuch`, `learn`, `nebel`; `open=none` öffnet nichts). Für den Hintergrund: `?zeit=morgen|mittag|abend|daemmerung|nacht|zeitraffer|HH:MM`, `?wind=0..2`, `?head=x,y` (Kopf festhalten, −1..1), `?wp=off` (ohne WebGL-Hintergrund), `?debug` (macht `window.__wp` verfügbar).

Oberflächen neu bauen (setzt die Quell-Repos unter `D:\Dev` voraus, Pfad per `DEV_ROOT` änderbar):

```
node tools/build-apps.mjs            # alle
node tools/build-apps.mjs arena      # eines
```

## Hinweise

- **Haze** ist kein Medizinprodukt; die Demo verbindet keine Gesundheitsdaten.
- **Vantage** isn’t endorsed by Riot Games and doesn’t reflect the views or opinions of Riot Games or anyone officially involved in producing or managing Riot Games properties. Die Demo liefert selbst keine Spielbilder; sie lädt Champion- und Item-Bilder von Riots Data Dragon.
- Der Kursbuch-Anmeldedialog speichert und sendet nichts.
- Die Kamera für „Kopf folgen“ startet nur nach Klick und stoppt, sobald der Tab im Hintergrund ist.
- Die Installer sind Windows-Programme (Windows 10/11).
