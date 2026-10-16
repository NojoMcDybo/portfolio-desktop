# Nojo – Desktop-Portfolio

Mein Portfolio ist ein Desktop im Browser. Die Seite klappt sich wie ein Falt-Gerät auf, der Bildschirm zoomt bis zum Rand, und dann liegen dort meine Programme im Dock: **Arena**, **Vantage**, **Notch**, **Haze**, **Streamdock**, **Kursbuch** und der **nebel.-Simulator**, dazu der Ordner **Lernseiten** mit meinen Klausur-Trainern. Oben sitzt die Notch.

Jedes Programm läuft im Fenster mit Beispieldaten und lässt sich ausprobieren. Unten im Fenster steht der Knopf für den **Installer** (Version und Größe kommen live aus dem jeweiligen GitHub-Release).

## Wie es gebaut ist

Kein Framework, keine Laufzeit-Abhängigkeiten: Der Desktop ist handgeschriebenes HTML, CSS und JavaScript (ES-Module). Die Gestaltung stammt aus meiner Designsprache *Nojo UI* (`src/nojo-ui.css`).

| Ordner | Inhalt |
|---|---|
| `index.html`, `src/` | Intro (`fold.js`), Fensterverwaltung (`wm.js`), Dock und Menüleiste (`main.js`), Notch (`notch.js`), Fußzeile und Info-Blatt mit Installer (`chrome.js`, `downloads.js`) |
| `apps/` | die Programme im Fenster (siehe unten) |
| `shim/` | Tauri-Attrappe (`tauri-shim.js`) und je Programm die Beispiel-Antworten (`app-*.js`) |
| `tools/` | `build-apps.mjs` baut die Oberflächen aus den Programm-Repos, `serve.py` ist ein Entwicklungs-Server ohne Cache |

**Echte Oberflächen:** Arena, Kursbuch und Streamdock (Tauri) sowie Haze (Electron) sind die echten Oberflächen der Programme. `tools/build-apps.mjs` baut sie mit ihrem eigenen vite nach `apps/<name>/`. Die Programme sprechen über `window.__TAURI_INTERNALS__` mit ihrem Rust-Teil; hier beantwortet `shim/tauri-shim.js` dieselben Aufrufe mit Beispieldaten und gibt Fensterbefehle (schließen, minimieren, ziehen) an den Desktop weiter. Alle Daten sind erfunden: Vereine, Kurse, Kanäle, Termine.

**Nachbauten:** *Vantage* (Quellcode privat) und die *Notch-Einstellungen* sind von Hand geschrieben (`apps/vantage`, `apps/notch`). Die Notch oben auf dem Desktop ist ein Nachbau der echten Notch für den Browser.

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
