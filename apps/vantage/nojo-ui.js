//#region src/nojo/nojo-icons.ts
const NOJO_ICONS = {
	"min": {
		"kind": "line",
		"body": "<path d=\"M6 12h12\"/>",
		"label": "Minimieren"
	},
	"max": {
		"kind": "line",
		"body": "<rect x=\"6.5\" y=\"6.5\" width=\"11\" height=\"11\" rx=\"2\"/>",
		"label": "Maximieren"
	},
	"close": {
		"kind": "line",
		"body": "<path d=\"M7 7l10 10\"/><path d=\"M17 7 7 17\"/>",
		"label": "Schließen"
	},
	"back": {
		"kind": "line",
		"body": "<path d=\"M14.5 5 8 12l6.5 7\"/>",
		"label": "Zurück"
	},
	"prev": {
		"kind": "line",
		"body": "<path d=\"M14.5 6 8.5 12l6 6\"/>",
		"label": "Vorheriges"
	},
	"next": {
		"kind": "line",
		"body": "<path d=\"m9.5 6 6 6-6 6\"/>",
		"label": "Nächstes"
	},
	"up": {
		"kind": "line",
		"body": "<path d=\"m7 14 5-5 5 5\"/>",
		"label": "Nach oben"
	},
	"down": {
		"kind": "line",
		"body": "<path d=\"m7 10 5 5 5-5\"/>",
		"label": "Nach unten, aufklappen"
	},
	"fullscreen": {
		"kind": "line",
		"body": "<path d=\"M4.5 9V5.5a1 1 0 0 1 1-1H9\"/><path d=\"M15 4.5h3.5a1 1 0 0 1 1 1V9\"/><path d=\"M19.5 15v3.5a1 1 0 0 1-1 1H15\"/><path d=\"M9 19.5H5.5a1 1 0 0 1-1-1V15\"/>",
		"label": "Vollbild"
	},
	"fullscreen-exit": {
		"kind": "line",
		"body": "<path d=\"M9 4.5V8a1 1 0 0 1-1 1H4.5\"/><path d=\"M15 4.5V8a1 1 0 0 0 1 1h3.5\"/><path d=\"M19.5 15H16a1 1 0 0 0-1 1v3.5\"/><path d=\"M4.5 15H8a1 1 0 0 1 1 1v3.5\"/>",
		"label": "Vollbild verlassen"
	},
	"plus": {
		"kind": "line",
		"body": "<path d=\"M12 5v14\"/><path d=\"M5 12h14\"/>",
		"label": "Hinzufügen"
	},
	"check": {
		"kind": "line",
		"body": "<path d=\"m5 12.5 4.5 4.5L19 7.5\"/>",
		"label": "Fertig, übernehmen"
	},
	"search": {
		"kind": "line",
		"body": "<circle cx=\"11\" cy=\"11\" r=\"6.5\"/><path d=\"m16 16 4.5 4.5\"/>",
		"label": "Suchen"
	},
	"open": {
		"kind": "line",
		"body": "<path d=\"M9 6h9v9\"/><path d=\"M18 6 6 18\"/>",
		"label": "Öffnen (anderswo)"
	},
	"external": {
		"kind": "line",
		"body": "<path d=\"M14 4.5h5.5V10\"/><path d=\"m19.5 4.5-8.5 8.5\"/><path d=\"M17.5 13.5v4a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h4\"/>",
		"label": "Im Browser öffnen"
	},
	"download": {
		"kind": "line",
		"body": "<path d=\"M12 4v11\"/><path d=\"m7.5 10.5 4.5 4.5 4.5-4.5\"/><path d=\"M5 19h14\"/>",
		"label": "Laden, sichern"
	},
	"share": {
		"kind": "line",
		"body": "<path d=\"M12 15V4\"/><path d=\"M7.5 8.5 12 4l4.5 4.5\"/><path d=\"M6 12.5V18a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5.5\"/>",
		"label": "Senden, teilen"
	},
	"refresh": {
		"kind": "line",
		"body": "<path d=\"M19.5 11A7.5 7.5 0 0 0 6.2 7.2L4.5 9\"/><path d=\"M4.5 4.5V9H9\"/><path d=\"M4.5 13a7.5 7.5 0 0 0 13.3 3.8l1.7-1.8\"/><path d=\"M19.5 19.5V15H15\"/>",
		"label": "Aktualisieren, prüfen"
	},
	"restart": {
		"kind": "line",
		"body": "<path d=\"M4.5 4.5V9H9\"/><path d=\"M5.2 14.5A7.5 7.5 0 1 0 6.6 6.8L4.5 9\"/>",
		"label": "Zurücksetzen, nochmal"
	},
	"trash": {
		"kind": "line",
		"body": "<path d=\"M4.5 7h15\"/><path d=\"M9.5 7V5h5v2\"/><path d=\"m6.5 7 .9 11.2A2 2 0 0 0 9.4 20h5.2a2 2 0 0 0 2-1.8L17.5 7\"/><path d=\"M10.5 11v5\"/><path d=\"M13.5 11v5\"/>",
		"label": "Leeren, löschen"
	},
	"lock": {
		"kind": "line",
		"body": "<rect x=\"5\" y=\"11\" width=\"14\" height=\"9\" rx=\"2\"/><path d=\"M8 11V8a4 4 0 0 1 8 0v3\"/>",
		"label": "Gesperrt"
	},
	"unlock": {
		"kind": "line",
		"body": "<rect x=\"5\" y=\"11\" width=\"14\" height=\"9\" rx=\"2\"/><path d=\"M8 11V8a4 4 0 0 1 7.7-1.5\"/>",
		"label": "Frei"
	},
	"move": {
		"kind": "line",
		"body": "<path d=\"M12 4v16\"/><path d=\"M4 12h16\"/><path d=\"m9.5 6.5 2.5-2.5 2.5 2.5\"/><path d=\"m9.5 17.5 2.5 2.5 2.5-2.5\"/><path d=\"M6.5 9.5 4 12l2.5 2.5\"/><path d=\"M17.5 9.5 20 12l-2.5 2.5\"/>",
		"label": "Verschieben"
	},
	"pointer": {
		"kind": "line",
		"body": "<path d=\"m6 4 12 7.2-5.3 1.3L10 18z\"/>",
		"label": "Zeiger, durchklicken"
	},
	"settings": {
		"kind": "line",
		"body": "<path d=\"M9.75 5.37L10.49 2.92L13.51 2.92L14.25 5.37L15.10 5.72L17.35 4.51L19.49 6.65L18.28 8.90L18.63 9.75L21.08 10.49L21.08 13.51L18.63 14.25L18.28 15.10L19.49 17.35L17.35 19.49L15.10 18.28L14.25 18.63L13.51 21.08L10.49 21.08L9.75 18.63L8.90 18.28L6.65 19.49L4.51 17.35L5.72 15.10L5.37 14.25L2.92 13.51L2.92 10.49L5.37 9.75L5.72 8.90L4.51 6.65L6.65 4.51L8.90 5.72z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
		"label": "Einstellungen"
	},
	"sliders": {
		"kind": "line",
		"body": "<path d=\"M4 7h9\"/><path d=\"M17 7h3\"/><circle cx=\"15\" cy=\"7\" r=\"2\"/><path d=\"M4 17h3\"/><path d=\"M11 17h9\"/><circle cx=\"9\" cy=\"17\" r=\"2\"/>",
		"label": "Feineinstellungen"
	},
	"widget": {
		"kind": "line",
		"body": "<rect x=\"4\" y=\"6\" width=\"16\" height=\"12\" rx=\"4\"/><path d=\"M8 12h5\"/>",
		"label": "Widget"
	},
	"layout": {
		"kind": "line",
		"body": "<rect x=\"3.5\" y=\"4.5\" width=\"10\" height=\"9\" rx=\"2\"/><rect x=\"3.5\" y=\"15.5\" width=\"10\" height=\"4\" rx=\"1.5\"/><rect x=\"15.5\" y=\"4.5\" width=\"5\" height=\"5\" rx=\"1.5\"/><rect x=\"15.5\" y=\"11.5\" width=\"5\" height=\"8\" rx=\"1.5\"/>",
		"label": "Anordnung (Karten)"
	},
	"eye": {
		"kind": "line",
		"body": "<path d=\"M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
		"label": "Anzeigen, sichtbar"
	},
	"eye-off": {
		"kind": "line",
		"body": "<path d=\"M6.6 6.9C4 8.7 2.5 12 2.5 12s3.5 6.5 9.5 6.5c1.9 0 3.5-.6 4.9-1.5\"/><path d=\"M10 5.7c.6-.1 1.3-.2 2-.2 6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.3 3.2\"/><path d=\"M9.9 9.9a3 3 0 0 0 4.2 4.2\"/><path d=\"m3.5 3.5 17 17\"/>",
		"label": "Ausblenden, verborgen"
	},
	"sun": {
		"kind": "line",
		"body": "<circle cx=\"12\" cy=\"12\" r=\"3.6\"/><path d=\"M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M6 18l1.4-1.4M16.6 7.4 18 6\"/>",
		"label": "Hell"
	},
	"moon": {
		"kind": "line",
		"body": "<path d=\"M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5z\"/>",
		"label": "Dunkel"
	},
	"auto": {
		"kind": "line",
		"body": "<rect x=\"4\" y=\"5\" width=\"16\" height=\"11\" rx=\"2\"/><path d=\"M9 20h6M12 16v4\"/>",
		"label": "Wie System, Bildschirm"
	},
	"wifi-off": {
		"kind": "line",
		"body": "<path d=\"m3.5 3.5 17 17\"/><path d=\"M9 16.5a4.5 4.5 0 0 1 6 0\"/><path d=\"M5.5 12.8a9.5 9.5 0 0 1 4-2.2\"/><path d=\"M14.6 10.6a9.5 9.5 0 0 1 3.9 2.2\"/><path d=\"M2.5 9.3a14 14 0 0 1 3.7-2.6\"/><path d=\"M10.4 5.6A14 14 0 0 1 21.5 9.3\"/><path d=\"M12 19.6v.1\"/>",
		"label": "Keine Verbindung"
	},
	"disc": {
		"kind": "line",
		"body": "<circle cx=\"12\" cy=\"12\" r=\"8.5\"/><circle cx=\"12\" cy=\"12\" r=\"3\"/>",
		"label": "Wiedergabe (Bereich)"
	},
	"tray": {
		"kind": "line",
		"body": "<path d=\"M4 13.5 6.2 6.3A2 2 0 0 1 8.1 4.8h7.8a2 2 0 0 1 1.9 1.5L20 13.5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z\"/><path d=\"M4 13.5h4.5a3.5 3.5 0 0 0 7 0H20\"/>",
		"label": "Ablage"
	},
	"timer": {
		"kind": "line",
		"body": "<circle cx=\"12\" cy=\"13.5\" r=\"7\"/><path d=\"M12 10v3.5l2.2 1.4\"/><path d=\"M10 3.5h4\"/><path d=\"m18.3 6.7 1.2-1.2\"/>",
		"label": "Timer"
	},
	"folder": {
		"kind": "line",
		"body": "<path d=\"M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z\"/>",
		"label": "Ordner"
	},
	"phone": {
		"kind": "line",
		"body": "<rect x=\"7\" y=\"3\" width=\"10\" height=\"18\" rx=\"2.5\"/><path d=\"M11 18h2\"/>",
		"label": "iPhone"
	},
	"qr": {
		"kind": "line",
		"body": "<rect x=\"4\" y=\"4\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"14\" y=\"4\" width=\"6\" height=\"6\" rx=\"1\"/><rect x=\"4\" y=\"14\" width=\"6\" height=\"6\" rx=\"1\"/><path d=\"M14 14h2v2\"/><path d=\"M20 14v6h-4\"/><path d=\"M14 18v2\"/>",
		"label": "QR-Code"
	},
	"mic": {
		"kind": "line",
		"body": "<rect x=\"9\" y=\"3.5\" width=\"6\" height=\"11\" rx=\"3\"/><path d=\"M6 11.5a6 6 0 0 0 12 0\"/><path d=\"M12 17.5v3\"/>",
		"label": "Sprachassistent"
	},
	"volume": {
		"kind": "line",
		"body": "<path class=\"spk\" d=\"M4 9.5h3.5L12 6v12l-4.5-3.5H4z\"/><path class=\"w1\" d=\"M15.5 9.5a3.5 3.5 0 0 1 0 5\"/><path class=\"w2\" d=\"M18 7a7 7 0 0 1 0 10\"/><path class=\"mx\" d=\"m16 10 4 4m0-4-4 4\"/>",
		"label": "Lautstärke (w1/w2/mx schaltbar)"
	},
	"arena": {
		"kind": "line",
		"body": "<rect x=\"3\" y=\"5.5\" width=\"18\" height=\"13\" rx=\"2\"/><path d=\"M12 5.5v13\"/><circle cx=\"12\" cy=\"12\" r=\"2.6\"/>",
		"label": "Arena, Spielfeld"
	},
	"play": {
		"kind": "glyph",
		"body": "<path d=\"M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5A.8.8 0 0 0 8 5.2z\"/>",
		"label": "Abspielen"
	},
	"pause": {
		"kind": "glyph",
		"body": "<rect x=\"6.5\" y=\"5\" width=\"4\" height=\"14\" rx=\"1.2\"/><rect x=\"13.5\" y=\"5\" width=\"4\" height=\"14\" rx=\"1.2\"/>",
		"label": "Pause"
	},
	"stop": {
		"kind": "glyph",
		"body": "<rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2\"/>",
		"label": "Stopp"
	},
	"track-prev": {
		"kind": "glyph",
		"body": "<rect x=\"5.5\" y=\"6\" width=\"2.4\" height=\"12\" rx=\"1\"/><path d=\"M19 6.9v10.2a.8.8 0 0 1-1.2.7l-8-5.1a.8.8 0 0 1 0-1.4l8-5.1a.8.8 0 0 1 1.2.7z\"/>",
		"label": "Zurück (Titel)"
	},
	"track-next": {
		"kind": "glyph",
		"body": "<rect x=\"16.1\" y=\"6\" width=\"2.4\" height=\"12\" rx=\"1\"/><path d=\"M5 6.9v10.2a.8.8 0 0 0 1.2.7l8-5.1a.8.8 0 0 0 0-1.4l-8-5.1A.8.8 0 0 0 5 6.9z\"/>",
		"label": "Weiter (Titel)"
	},
	"grip": {
		"kind": "glyph",
		"body": "<circle cx=\"9\" cy=\"6\" r=\"1.5\"/><circle cx=\"15\" cy=\"6\" r=\"1.5\"/><circle cx=\"9\" cy=\"12\" r=\"1.5\"/><circle cx=\"15\" cy=\"12\" r=\"1.5\"/><circle cx=\"9\" cy=\"18\" r=\"1.5\"/><circle cx=\"15\" cy=\"18\" r=\"1.5\"/>",
		"label": "Ziehen (senkrecht)"
	},
	"grip-h": {
		"kind": "glyph",
		"body": "<circle cx=\"6\" cy=\"9\" r=\"1.5\"/><circle cx=\"12\" cy=\"9\" r=\"1.5\"/><circle cx=\"18\" cy=\"9\" r=\"1.5\"/><circle cx=\"6\" cy=\"15\" r=\"1.5\"/><circle cx=\"12\" cy=\"15\" r=\"1.5\"/><circle cx=\"18\" cy=\"15\" r=\"1.5\"/>",
		"label": "Ziehen (waagerecht)"
	},
	"more": {
		"kind": "glyph",
		"body": "<circle cx=\"6\" cy=\"12\" r=\"1.6\"/><circle cx=\"12\" cy=\"12\" r=\"1.6\"/><circle cx=\"18\" cy=\"12\" r=\"1.6\"/>",
		"label": "Mehr"
	},
	"heart": {
		"kind": "glyph",
		"body": "<path d=\"M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.8 4.5c2.1 0 3.6 1.1 5.2 3 1.6-1.9 3.1-3 5.2-3 3.8 0 5.9 3.9 4.4 7.3C19.5 16.4 12 21 12 21z\"/>",
		"label": "Puls (Helio, Garmin)"
	},
	"drop": {
		"kind": "glyph",
		"body": "<path d=\"M12 2.6c3.7 4.5 6.6 8.3 6.6 11.7a6.6 6.6 0 0 1-13.2 0c0-3.4 2.9-7.2 6.6-11.7z\"/>",
		"label": "Blutzucker (Haze)"
	},
	"music": {
		"kind": "glyph",
		"body": "<path d=\"M19 3v12.2a3 3 0 1 1-2-2.83V7.3l-8 1.6v8.3a3 3 0 1 1-2-2.83V5.4z\"/>",
		"label": "Musik"
	},
	"document": {
		"kind": "glyph",
		"body": "<path d=\"M6 2h8.6L20 7.4V20a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm8 1.8V8h4.2zM8 12v1.6h8V12zm0 3.4V17h6v-1.6z\"/>",
		"label": "Dokument (Folio)"
	},
	"apps": {
		"kind": "glyph",
		"body": "<rect x=\"4\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13\" y=\"4\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"4\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"/><rect x=\"13\" y=\"13\" width=\"7\" height=\"7\" rx=\"1.5\"/>",
		"label": "Andere Apps"
	},
	"timer-fill": {
		"kind": "glyph",
		"body": "<path d=\"M10 2h4v2h-4zm2 4a8 8 0 1 1 0 16 8 8 0 0 1 0-16zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm-1 2h2v4.6l2.7 1.6-1 1.7L11 15.7z\"/>",
		"label": "Timer (Quelle)"
	},
	"ball": {
		"kind": "color",
		"body": "<circle cx=\"12\" cy=\"12\" r=\"10\" fill=\"#fff\"/><path fill=\"#111\" d=\"m12 7.2 3.4 2.5-1.3 4h-4.2l-1.3-4zM12 2.2v3l-3.3 2.4-2.9-.9a10 10 0 0 1 6.2-4.5zm0 0a10 10 0 0 1 6.2 4.5l-2.9.9L12 5.2zM2.3 10.4l2.8.9 1.3 3.9-1.8 2.4a9.9 9.9 0 0 1-2.3-7.2zm19.4 0a9.9 9.9 0 0 1-2.3 7.2l-1.8-2.4 1.3-3.9zM8.6 21.4l.1-3h6.6l.1 3a10 10 0 0 1-6.8 0z\"/>",
		"label": "Tor, Fußball"
	}
};
/** Farbe je Quelle (Herz = Puls, Tropfen = Blutzucker …) — gleiche Quelle, gleiche Farbe in jeder App */
const SOURCE_COLORS = {
	"heart": "#ff5a6e",
	"drop": "#ff7971",
	"music": "#30d158",
	"timer-fill": "#ffb340",
	"document": "#f5f5f7",
	"apps": "#64d2ff",
	"live": "#ff453a"
};
const ATTR = {
	"line": "fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"",
	"glyph": "fill=\"currentColor\"",
	"color": ""
};
/** Symbol als SVG-Text (fuer innerHTML) */
function icon(name, o = {}) {
	const i = NOJO_ICONS[name];
	const size = o.size ? ` width="${o.size}" height="${o.size}" style="width:${o.size}px;height:${o.size}px"` : "";
	const a11y = o.label ? ` role="img" aria-label="${o.label.replace(/"/g, "&quot;")}"` : " aria-hidden=\"true\"";
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="n-i n-i-${i.kind}${o.cls ? " " + o.cls : ""}" ${ATTR[i.kind]}${size}${a11y}>${i.body}</svg>`;
}
/** Symbol als Element (zum Anhaengen) */
function iconNode(name, o = {}) {
	const t = document.createElement("template");
	t.innerHTML = icon(name, o);
	return t.content.firstElementChild;
}
/** Symbol als Bild-Adresse in einer festen Farbe (z. B. fuer <img> oder Live Activities der Notch) */
function iconUrl(name, color = "#ffffff") {
	const i = NOJO_ICONS[name];
	const s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" ${ATTR[i.kind]}>${i.body}</svg>`.replace(/currentColor/g, color);
	return "data:image/svg+xml;utf8," + encodeURIComponent(s);
}
//#endregion
//#region src/nojo/nojo-ui.ts
/**
* Nojo UI — Verhalten zur gemeinsamen Designsprache (nojo-ui.css).
* Quelle: D:\Dev\nojo-design (dort aendern, dann tools\sync.ps1); in den Apps nur eine Kopie unter src/nojo/.
*
* - glassLight():       Licht auf Glasflaechen folgt der Maus
* - segments():         die helle Glasperle gleitet unter das gewaehlte Segment
* - windowControls():   Fensterknoepfe als Glaspille oben rechts (wie Folio)
* - lightScroller():    Lichtleiste statt Bildlaufleiste — duenner Leuchtstab, zeigt den Ort, laesst sich ziehen
*                       (die breite Sprungleiste gibt es nur in Folio)
* - ICONS / icon():     Symbole aus der Bibliothek (nojo-icons.ts, generiert aus assets/icons.mjs)
* - liquid():           echtes Liquid Glass fuer .n-liquid — Folios Optik (Brechung am Rand, klare Mitte,
*                       Lichtkante von oben links) als SVG-Filter im backdrop-filter
*/
/** Feine Liniensymbole wie in Folio (24er Raster, Strich 1,6) — nur noch fuer Uebergaenge; neue Symbole in die Bibliothek */
const svgIcon = (d) => `<svg viewBox="0 0 24 24" class="n-i n-i-line" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
/** Haeufige Symbole als fertiger SVG-Text (aus der Bibliothek) */
const pick = (...names) => Object.fromEntries(names.map((n) => [n, icon(n)]));
const ICONS = pick("min", "max", "close", "back", "prev", "next", "settings", "widget", "sun", "moon", "auto", "fullscreen", "plus", "check", "search", "open");
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let lightOn = false;
/** Einmal aufrufen: jede .n-glass-Flaeche bekommt ein Licht, das der Maus folgt. */
function glassLight() {
	if (lightOn) return;
	lightOn = true;
	let lit = null;
	document.addEventListener("pointermove", (e) => {
		const g = e.target?.closest?.(".n-glass");
		if (lit && lit !== g) lit.classList.remove("lit");
		lit = g;
		if (!g || reduced()) return;
		const r = g.getBoundingClientRect();
		g.style.setProperty("--lx", `${e.clientX - r.left}px`);
		g.style.setProperty("--ly", `${e.clientY - r.top}px`);
		g.classList.add("lit");
	}, { passive: true });
	document.addEventListener("pointerleave", () => {
		lit?.classList.remove("lit");
		lit = null;
	});
}
/** Haelt in jedem .n-seg (oder `sel`) eine Glasperle unter dem gewaehlten Knopf (.active, aria-pressed, aria-selected). */
function segments(root = document, sel = ".n-seg") {
	const seen = /* @__PURE__ */ new WeakSet();
	const place = (seg) => {
		let thumb = seg.querySelector(":scope > .n-seg-thumb");
		if (!thumb) {
			thumb = document.createElement("span");
			thumb.className = "n-seg-thumb";
			seg.prepend(thumb);
		}
		if (!seen.has(seg)) {
			seen.add(seg);
			ro.observe(seg);
		}
		const jump = !thumb.offsetWidth || thumb.style.width === "0px" || !thumb.style.width;
		const on = seg.querySelector(":scope > button.active, :scope > button[aria-pressed='true'], :scope > button[aria-selected='true']");
		if (!on) {
			thumb.style.width = "0";
			return;
		}
		if (jump) thumb.style.transition = "none";
		else if (thumb.style.left && thumb.style.left !== `${on.offsetLeft}px` && !reduced()) {
			thumb.classList.remove("moving");
			thumb.offsetWidth;
			thumb.classList.add("moving");
			clearTimeout(Number(thumb.dataset.t));
			thumb.dataset.t = String(window.setTimeout(() => thumb.classList.remove("moving"), 260));
		}
		thumb.style.left = `${on.offsetLeft}px`;
		thumb.style.width = `${on.offsetWidth}px`;
		if (jump) {
			thumb.offsetWidth;
			thumb.style.transition = "";
		}
	};
	const all = () => root.querySelectorAll(sel).forEach(place);
	let queued = false;
	const later = () => {
		if (queued) return;
		queued = true;
		requestAnimationFrame(() => {
			queued = false;
			all();
		});
	};
	const touches = (r) => {
		const t = r.target;
		if (t.classList?.contains("n-glass") || t.classList?.contains("n-seg-thumb")) return false;
		if (t.closest?.(sel)) return true;
		if (r.type === "attributes") return r.attributeName === "hidden";
		for (const n of r.addedNodes) if (n.nodeType === 1 && (n.matches(sel) || n.querySelector(sel))) return true;
		return false;
	};
	const ro = new ResizeObserver(later);
	const mo = new MutationObserver((list) => {
		if (list.some(touches)) later();
	});
	mo.observe(root instanceof Document ? root.body : root, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: [
			"class",
			"aria-pressed",
			"aria-selected",
			"hidden"
		]
	});
	ro.observe(root instanceof Document ? root.body : root);
	all();
	document.fonts?.ready.then(all);
	return () => {
		mo.disconnect();
		ro.disconnect();
	};
}
/** Glaspille oben rechts mit Minimieren, Maximieren, Schliessen (fehlende Aktionen = kein Knopf). */
function windowControls(a, host = document.body) {
	const wc = document.createElement("div");
	wc.className = "n-wc n-glass n-liquid";
	const add = (icon, title, fn, cls = "") => {
		const b = document.createElement("button");
		b.className = `n-ico sm ${cls}`.trim();
		b.title = title;
		b.setAttribute("aria-label", title);
		b.innerHTML = icon;
		b.addEventListener("click", (e) => {
			e.stopPropagation();
			fn();
		});
		wc.append(b);
	};
	if (a.minimize) add(ICONS.min, "Minimieren", a.minimize);
	if (a.toggleMaximize) add(ICONS.max, "Maximieren", a.toggleMaximize);
	add(ICONS.close, a.closeTitle ?? "Schließen", a.close, "danger");
	host.append(wc);
	return wc;
}
/** Ersetzt die Bildlaufleiste von `sc` (ein scrollendes Element oder document.scrollingElement). */
function lightScroller(sc, opts = {}) {
	const doc = sc === document.scrollingElement || sc === document.documentElement || sc === document.body;
	const target = doc ? document.scrollingElement : sc;
	(doc ? document.documentElement : sc).classList.add("n-scroll");
	if (doc) document.body.classList.add("n-scroll");
	const bar = document.createElement("div");
	bar.className = "n-scroller";
	bar.setAttribute("aria-hidden", "true");
	bar.dataset.scope = doc ? "page" : "box";
	document.body.append(bar);
	const insetTop = opts.insetTop ?? 14;
	const insetBottom = opts.insetBottom ?? 14;
	const edge = opts.edge ?? 5;
	let glowTimer = 0;
	const metrics = () => {
		const r = doc ? new DOMRect(0, 0, innerWidth, innerHeight) : sc.getBoundingClientRect();
		const sh = target.scrollHeight;
		const ch = doc ? innerHeight : sc.clientHeight;
		const st = target.scrollTop;
		const trackH = Math.max(40, r.height - insetTop - insetBottom);
		const ph = clamp(ch / Math.max(1, sh) * trackH, 34, 110);
		return {
			r,
			sh,
			ch,
			st,
			max: Math.max(1, sh - ch),
			trackH,
			ph
		};
	};
	let placed = false;
	const layout = () => {
		const m = metrics();
		const overflow = m.sh > m.ch + 4;
		bar.classList.toggle("show", overflow);
		if (!overflow) return;
		if (!placed) {
			placed = true;
			bar.style.transition = "none";
			requestAnimationFrame(() => requestAnimationFrame(() => {
				bar.style.transition = "";
			}));
		}
		const top = m.r.top + insetTop + m.st / m.max * (m.trackH - m.ph);
		Object.assign(bar.style, {
			top: `${top}px`,
			height: `${m.ph}px`,
			left: `${m.r.right - 6 - edge}px`
		});
	};
	bar.addEventListener("pointerdown", (e) => {
		if (e.button !== 0) return;
		e.preventDefault();
		bar.classList.add("dragging");
		bar.setPointerCapture(e.pointerId);
		const y0 = e.clientY, s0 = metrics().st;
		const move = (ev) => {
			const m = metrics();
			target.scrollTop = s0 + (ev.clientY - y0) * m.max / Math.max(1, m.trackH - m.ph);
		};
		const up = () => {
			bar.classList.remove("dragging");
			bar.removeEventListener("pointermove", move);
			bar.removeEventListener("pointerup", up);
			bar.removeEventListener("pointercancel", up);
		};
		bar.addEventListener("pointermove", move);
		bar.addEventListener("pointerup", up);
		bar.addEventListener("pointercancel", up);
	});
	const onScroll = () => {
		requestAnimationFrame(layout);
		bar.classList.add("moving");
		clearTimeout(glowTimer);
		glowTimer = window.setTimeout(() => bar.classList.remove("moving"), 700);
	};
	const onResize = () => layout();
	(doc ? window : sc).addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("resize", onResize);
	let pending = 0;
	const later = () => {
		cancelAnimationFrame(pending);
		pending = requestAnimationFrame(layout);
	};
	const ro = new ResizeObserver(later);
	ro.observe(doc ? document.body : sc);
	for (const c of (doc ? document.body : sc).children) ro.observe(c);
	const mo = new MutationObserver((list) => {
		if (list.some((r) => r.target !== bar && !(r.type === "attributes" && r.target.classList?.contains("n-glass")))) later();
	});
	mo.observe(doc ? document.body : sc, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: [
			"hidden",
			"open",
			"class"
		]
	});
	layout();
	return {
		layout,
		/** Leiste entfernen (Bereich wird geschlossen) */
		dispose: () => {
			clearTimeout(glowTimer);
			mo.disconnect();
			ro.disconnect();
			(doc ? window : sc).removeEventListener("scroll", onScroll);
			window.removeEventListener("resize", onResize);
			bar.remove();
		}
	};
}
const LIGHT_DIR = (() => {
	const l = Math.hypot(.45, .9);
	return [-.45 / l, -.9 / l];
})();
const smooth = (a, b, x) => {
	const t = clamp((x - a) / (b - a), 0, 1);
	return t * t * (3 - 2 * t);
};
const liquidFilters = /* @__PURE__ */ new Map();
let liquidDefs = null;
let liquidSeq = 0;
/** Kann dieser Browser SVG-Filter als backdrop-filter? (Chromium ja, Safari und Firefox nicht) */
const liquidSupported = () => typeof CSS !== "undefined" && CSS.supports("backdrop-filter", "url(#n)") && /Chrome\/\d+/.test(navigator.userAgent);
function liquidMaps(w, h, r, refract, dpr) {
	const W = Math.max(1, Math.round(w * dpr)), H = Math.max(1, Math.round(h * dpr));
	const disp = new ImageData(W, H), spec = new ImageData(W, H);
	const hw = w / 2, hh = h / 2, rr = Math.min(r, hw, hh);
	const edgeW = Math.max(1, Math.min(12, Math.min(hw, hh) * .65));
	const S = refract * 2 + 2;
	const aa = .6 / dpr + .25;
	for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
		const x = (i + .5) / dpr - hw, y = (j + .5) / dpr - hh;
		const qx = Math.abs(x) - hw + rr, qy = Math.abs(y) - hh + rr;
		const d = Math.min(Math.max(qx, qy), 0) + Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - rr;
		let nx, ny;
		if (qx > 0 && qy > 0) {
			const l = Math.hypot(qx, qy);
			nx = qx / l;
			ny = qy / l;
		} else if (qx > qy) {
			nx = 1;
			ny = 0;
		} else {
			nx = 0;
			ny = 1;
		}
		if (x < 0) nx = -nx;
		if (y < 0) ny = -ny;
		const depth = Math.max(-d, 0);
		const edge = 1 - smooth(0, edgeW, depth);
		const off = edge * edge * refract;
		const k = (j * W + i) * 4;
		disp.data[k] = clamp(Math.round(128 - nx * off / S * 255), 0, 255);
		disp.data[k + 1] = clamp(Math.round(128 - ny * off / S * 255), 0, 255);
		disp.data[k + 2] = 128;
		disp.data[k + 3] = 255;
		const facing = Math.max(nx * LIGHT_DIR[0] + ny * LIGHT_DIR[1], 0) ** 3;
		const rim = Math.exp(-(((depth - .7) / .65) ** 2));
		const cover = 1 - smooth(-aa, aa, d);
		const a = (rim * (.12 + .36 * facing) + .03 * edge * facing) * cover;
		spec.data[k] = spec.data[k + 1] = spec.data[k + 2] = 255;
		spec.data[k + 3] = clamp(Math.round(a * 255), 0, 255);
	}
	const url = (img) => {
		const c = document.createElement("canvas");
		c.width = W;
		c.height = H;
		c.getContext("2d").putImageData(img, 0, 0);
		return c.toDataURL("image/png");
	};
	return {
		disp: url(disp),
		rim: url(spec),
		scale: S
	};
}
function liquidFilter(w, h, r, refract) {
	const dpr = Math.min(3, Math.max(1, devicePixelRatio || 1));
	const key = `${w}x${h}r${r}f${refract}d${dpr}`;
	let f = liquidFilters.get(key);
	if (f) {
		f.refs++;
		return {
			key,
			f
		};
	}
	if (!liquidDefs) {
		liquidDefs = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		liquidDefs.setAttribute("aria-hidden", "true");
		liquidDefs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden;pointer-events:none";
		document.body.append(liquidDefs);
	}
	const m = liquidMaps(w, h, r, refract, dpr);
	const id = `n-lq-${++liquidSeq}`;
	liquidDefs.insertAdjacentHTML("beforeend", `<filter id="${id}" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB"><feImage href="${m.disp}" x="0" y="0" width="${w}" height="${h}" preserveAspectRatio="none" result="m"/><feDisplacementMap in="SourceGraphic" in2="m" scale="${m.scale}" xChannelSelector="R" yChannelSelector="G"/></filter>`);
	f = {
		id,
		rim: m.rim,
		refs: 1
	};
	liquidFilters.set(key, f);
	return {
		key,
		f
	};
}
function liquidRelease(key) {
	if (!key) return;
	const f = liquidFilters.get(key);
	if (!f || --f.refs > 0) return;
	liquidFilters.delete(key);
	liquidDefs?.querySelector(`#${f.id}`)?.remove();
}
let liquidOn = false;
/**
* Einmal aufrufen: jedes .n-liquid (auch spaeter eingefuegte) bekommt Brechung und Lichtkante passend zu seiner
* Groesse und Rundung. Aendert sich die Groesse laufend (Aufklappen), bleibt kurz der alte Filter stehen.
*/
function liquid() {
	if (liquidOn || !liquidSupported()) return;
	liquidOn = true;
	const keys = /* @__PURE__ */ new Map();
	const timers = /* @__PURE__ */ new WeakMap();
	const drop = (el) => {
		liquidRelease(keys.get(el));
		keys.delete(el);
		ro.unobserve(el);
	};
	const apply = (el) => {
		if (!el.isConnected || !el.classList.contains("n-liquid")) {
			drop(el);
			return;
		}
		const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
		if (w < 4 || h < 4) return;
		const rt = getComputedStyle(el).borderTopLeftRadius.split(" ")[0];
		const r = Math.round(rt.endsWith("%") ? parseFloat(rt) / 100 * Math.min(w, h) : parseFloat(rt) || 0);
		const panel = el.classList.contains("panel");
		const refract = Number(el.dataset.refract) || (panel ? 7 : 4.5);
		const before = keys.get(el);
		const { key, f } = liquidFilter(w, h, Math.min(r, Math.floor(Math.min(w, h) / 2)), refract);
		if (before === key) {
			f.refs--;
			return;
		}
		keys.set(el, key);
		el.style.setProperty("--n-lq", `url(#${f.id})`);
		el.style.setProperty("--n-lq-rim", `url("${f.rim}")`);
		el.dataset.lq = "";
		liquidRelease(before);
	};
	const later = (el, wait = 90) => {
		clearTimeout(timers.get(el));
		timers.set(el, window.setTimeout(() => apply(el), keys.has(el) ? wait : 0));
	};
	const ro = new ResizeObserver((list) => list.forEach((e) => later(e.target)));
	const scan = () => {
		document.querySelectorAll(".n-liquid").forEach((el) => {
			if (keys.has(el) || timers.has(el)) return;
			ro.observe(el);
			later(el, 0);
		});
		for (const el of [...keys.keys()]) if (!el.isConnected || !el.classList.contains("n-liquid")) drop(el);
	};
	let pending = 0;
	new MutationObserver(() => {
		cancelAnimationFrame(pending);
		pending = requestAnimationFrame(scan);
	}).observe(document.body, {
		subtree: true,
		childList: true,
		attributes: true,
		attributeFilter: ["class"]
	});
	scan();
}
//#endregion
export { ICONS, NOJO_ICONS, SOURCE_COLORS, glassLight, icon, iconNode, iconUrl, lightScroller, liquid, liquidSupported, segments, svgIcon, windowControls };
