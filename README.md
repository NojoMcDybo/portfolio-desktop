# Nojo – Desktop-Portfolio

Mein Portfolio ist ein Desktop im Browser. Die Seite bleibt gerade, liegt aber zuerst hinter einem Diffusor-Glas, das um seine untere Kante aufklappt: Je weiter ein Punkt vom Scharnier entfernt ist, desto stärker wird er gestreut. Ein Balken auf 60 % der Höhe verkleinert den Kippwinkel, bis alles scharf ist. Dann liegen dort meine Programme im Dock: **Arena**, **Vantage**, **Notch**, **Haze**, **Streamdock**, **Kursbuch** und der **nebel.-Simulator**, dazu der Ordner **Lernseiten** mit meinen Klausur-Trainern. Oben sitzt die Notch.

Jedes Programm läuft im Fenster mit Beispieldaten und lässt sich ausprobieren. Unten im Fenster steht der Knopf für den **Installer** (Version und Größe kommen live aus dem jeweiligen GitHub-Release).

## Wie es gebaut ist

Kein Framework: Der Desktop ist handgeschriebenes HTML, CSS und JavaScript (ES-Module). Einzige Bibliothek ist **Motion** ([motion.dev](https://motion.dev), MIT, Version 13.5.0 fest in `vendor/`): Federn, Staffelung und Gesten für Intro, Fenster, Dock, Menüs, Notch und Karten. „Bewegung reduzieren“ im System schaltet alles auf sofort. Die Gestaltung stammt aus meiner Designsprache *Nojo UI* (`src/nojo-ui.css`).

| Ordner | Inhalt |
|---|---|
| `index.html`, `src/` | Intro (`intro.js`: vier Weichzeichner-Ebenen mit Masken nach Abstand × Kippwinkel; Idee aus [lid-plane](https://github.com/jh3y/lid-plane) und [iphone-duo-animation](https://github.com/akashtdev/iphone-duo-animation), kein Code übernommen), Fensterverwaltung (`wm.js`), Dock und Menüleiste (`main.js`), Notch (`notch.js`), Fußzeile und Info-Blatt mit Installer (`chrome.js`, `downloads.js`) |
| `src/motion.js`, `vendor/` | Motion (gepinnt, mit Lizenz) und die gemeinsamen Federn `SPRING`, `POP`, `SOFT` sowie `lift()` und `reveal()` |
| `apps/` | die Programme im Fenster (siehe unten) |
| `shim/` | Tauri-Attrappe (`tauri-shim.js`) und je Programm die Beispiel-Antworten (`app-*.js`) |
| `tools/` | `build-apps.mjs` baut die Oberflächen aus den Programm-Repos, `serve.py` ist ein Entwicklungs-Server ohne Cache |

**Echte Oberflächen:** Arena, Kursbuch und Streamdock (Tauri) sowie Haze (Electron) sind die echten Oberflächen der Programme. `tools/build-apps.mjs` baut sie mit ihrem eigenen vite nach `apps/<name>/`. Die Programme sprechen über `window.__TAURI_INTERNALS__` mit ihrem Rust-Teil; hier beantwortet `shim/tauri-shim.js` dieselben Aufrufe mit Beispieldaten und gibt Fensterbefehle (schließen, minimieren, ziehen) an den Desktop weiter. Alle Daten sind erfunden: Vereine, Kurse, Kanäle, Termine.

**Notch:** Die Notch oben auf dem Desktop und ihr Einstellungsfenster sind die echten Oberflächen aus dem Notch-Repo (`apps/notch`: `index.html` = Notch in einem durchsichtigen Vollbild-iframe, `settings.html` = Einstellungen). Ihre „Rust-Seite“ ist `src/notch-backend.js` (Musik, Blutzucker, Puls, Sport, Timer/Pomodoro, Ablage, Einstellungen mit den Datenformen der echten App), `src/notch-host.js` meldet, ob der Zeiger über der Form liegt (in der echten App fragt Rust die Maus ab). Meldungen anderer Programme (Arena-Tor, Vantage-Ergebnis) erscheinen dort als Activity.

**Nachbau:** Nur *Vantage* (Quellcode privat) ist von Hand geschrieben (`apps/vantage`).

**Lernseiten und Simulator** sind die echten Seiten auf GitHub Pages, eingebettet in ein Fenster; nichts davon ist kopiert.

## Lokal ansehen

```
python tools/serve.py
```

Dann `http://127.0.0.1:4173/` öffnen. Hilfreiche Parameter: `?skip=1` überspringt das Intro, `?open=arena` öffnet ein Programm sofort (`arena`, `vantage`, `notch`, `haze`, `streamdock`, `kursbuch`, `learn`, `nebel`).

Oberflächen neu bauen (setzt die Quell-Repos unter `D:\Dev` voraus, Pfad per `DEV_ROOT` änderbar):

```
node tools/build-apps.mjs            # alle
node tools/build-apps.mjs arena      # eines
```

## Hinweise

- **Haze** ist kein Medizinprodukt; die Demo verbindet keine Gesundheitsdaten.
- **Vantage** steht in keiner Verbindung zu Riot Games; die Demo enthält keine Spielbilder.
- Der Kursbuch-Anmeldedialog speichert und sendet nichts.
- Die Installer sind Windows-Programme (Windows 10/11).
