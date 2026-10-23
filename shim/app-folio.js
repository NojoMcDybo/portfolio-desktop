/* Folio: Beispiel-Antworten für die App-Befehle (folio/src-tauri/src/lib.rs, notch.rs) und die Plugins Dialog, Opener, Updater, Webview.
   Die drei Beispiel-PDFs erzeugt ein kleiner PDF-Schreiber hier selbst (Text, Formen, Lesezeichen); eigene PDFs lassen sich wählen oder auf das
   Fenster ziehen und bleiben im Browser. Weitere Fenster (ein Dokument je Fenster) öffnet der Desktop. Die geöffnete Seite läuft in die Notch. */
(() => {
  const P = window.__PORTFOLIO__;
  P.version = "0.8.4";
  P.name = "Folio";

  const top = (() => { try { return window.top.document && window.top; } catch { return window; } })();
  const store = (top.__folioFiles ||= new Map()); // Pfad -> Bytes, von allen Folio-Fenstern geteilt
  const toast = (text) => P.bus("toast", { text });

  // ---------- kleiner PDF-Schreiber ----------
  const WIN = { "–": 0x96, "—": 0x97, "„": 0x84, "“": 0x93, "”": 0x94, "‚": 0x82, "‘": 0x91, "’": 0x92, "•": 0x95, "…": 0x85, "€": 0x80 };
  const pstr = (s) => "(" + [...String(s)].map((ch) => {
    let c = WIN[ch] ?? ch.charCodeAt(0);
    if (c > 255) c = 63;
    if (ch === "(" || ch === ")" || ch === "\\") return "\\" + ch;
    return c < 32 || c > 126 ? "\\" + c.toString(8).padStart(3, "0") : String.fromCharCode(c);
  }).join("") + ")";
  const num = (n) => String(Math.round(n * 100) / 100);
  const INK = [36, 38, 46], GREY = [110, 114, 124], SOFT = [236, 238, 242];

  function page() {
    const o = [];
    const col = (c, op) => o.push(c.map((v) => num(v / 255)).join(" ") + " " + op);
    const p = {
      rect(x, y, w, h, c) { col(c, "rg"); o.push(`${num(x)} ${num(y)} ${num(w)} ${num(h)} re f`); return p; },
      frame(x, y, w, h, c, lw = 1) { col(c, "RG"); o.push(`${lw} w ${num(x)} ${num(y)} ${num(w)} ${num(h)} re S`); return p; },
      line(x1, y1, x2, y2, c, lw = 1) { col(c, "RG"); o.push(`${lw} w ${num(x1)} ${num(y1)} m ${num(x2)} ${num(y2)} l S`); return p; },
      circle(cx, cy, r, c, lw = 1, fill = false) {
        const k = 0.5523 * r, q = (a, b) => `${num(a)} ${num(b)}`;
        col(c, fill ? "rg" : "RG");
        o.push(`${lw} w ${q(cx + r, cy)} m ${q(cx + r, cy + k)} ${q(cx + k, cy + r)} ${q(cx, cy + r)} c ${q(cx - k, cy + r)} ${q(cx - r, cy + k)} ${q(cx - r, cy)} c ${q(cx - r, cy - k)} ${q(cx - k, cy - r)} ${q(cx, cy - r)} c ${q(cx + k, cy - r)} ${q(cx + r, cy - k)} ${q(cx + r, cy)} c ${fill ? "f" : "S"}`);
        return p;
      },
      text(x, y, s, size = 11, c = INK, bold = false) { col(c, "rg"); o.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${num(x)} ${num(y)} Td ${pstr(s)} Tj ET`); return p; },
      // Absatz mit einfachem Zeilenumbruch (Näherung der Zeichenbreite); gibt die nächste freie Höhe zurück
      para(x, y, w, s, size = 11, c = INK, lead = 1.5) {
        const max = Math.floor(w / (size * 0.52)); let line = "";
        for (const word of String(s).split(" ")) {
          if ((line + " " + word).trim().length > max) { p.text(x, y, line, size, c); y -= size * lead; line = word; } else line = (line + " " + word).trim();
        }
        if (line) { p.text(x, y, line, size, c); y -= size * lead; }
        return y;
      },
      ops: () => o.join("\n"),
    };
    return p;
  }

  function makePdf({ title, pages, outline }) {
    const objs = new Array(6); // 1 Katalog, 2 Seiten, 3 Gliederung, 4/5 Schriften, 6 Info
    const add = (s) => (objs.push(s), objs.length);
    const nums = pages.map((draw) => {
      const p = page(); draw(p);
      const c = p.ops();
      const cn = add(`<< /Length ${c.length} >>\nstream\n${c}\nendstream`);
      return add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents ${cn} 0 R >>`);
    });
    const first = objs.length + 1;
    outline.forEach(([t, pg], i) => add(`<< /Title ${pstr(t)} /Parent 3 0 R ${i ? `/Prev ${first + i - 1} 0 R ` : ""}${i < outline.length - 1 ? `/Next ${first + i + 1} 0 R ` : ""}/Dest [${nums[pg]} 0 R /XYZ 0 842 0] >>`));
    objs[0] = "<< /Type /Catalog /Pages 2 0 R /Outlines 3 0 R /PageMode /UseOutlines >>";
    objs[1] = `<< /Type /Pages /Kids [${nums.map((n) => n + " 0 R").join(" ")}] /Count ${nums.length} >>`;
    objs[2] = `<< /Type /Outlines /First ${first} 0 R /Last ${first + outline.length - 1} 0 R /Count ${outline.length} >>`;
    objs[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
    objs[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
    objs[5] = `<< /Title ${pstr(title)} /Producer (Folio-Demo) >>`;
    let out = "%PDF-1.4\n";
    const offs = [];
    objs.forEach((s, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${s}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}trailer\n<< /Size ${objs.length + 1} /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return Uint8Array.from(out, (ch) => ch.charCodeAt(0));
  }

  // ---------- die drei Beispieldokumente (erfundene Inhalte) ----------
  const head = (p, acc, kicker, title) => p.rect(0, 770, 595, 72, acc).text(48, 800, kicker, 10, [255, 255, 255]).text(48, 782, title, 20, [255, 255, 255], true);
  const table = (p, x, y, rows, widths, acc) => rows.forEach((r, i) => {
    const yy = y - i * 26;
    p.rect(x, yy - 8, widths.reduce((a, b) => a + b, 0), 26, i === 0 ? acc : i % 2 ? [255, 255, 255] : SOFT);
    let xx = x + 10;
    r.forEach((cell, k) => { p.text(xx, yy, cell, i === 0 ? 10 : 10.5, i === 0 ? [255, 255, 255] : INK, i === 0); xx += widths[k]; });
  });

  const DOCS = [
    {
      path: "Beispiele\\Folio-Kurzanleitung.pdf", title: "Folio – Kurzanleitung", acc: [64, 123, 255],
      outline: [["Folio", 0], ["Lesen und Navigieren", 1], ["Anmerkungen", 2], ["Invertieren und Glas", 3]],
      pages: [
        (p) => {
          p.rect(0, 0, 595, 842, [248, 249, 252]).rect(0, 520, 595, 322, [64, 123, 255]).text(56, 700, "Folio", 64, [255, 255, 255], true).text(58, 656, "Kurzanleitung", 24, [225, 235, 255]);
          let y = p.para(56, 470, 470, "Folio ist ein PDF-Reader für Windows. Die Bedienung schwebt in Glas über der Seite und lässt sich frei verschieben, Anmerkungen bleiben echte PDF-Anmerkungen.", 14, INK, 1.6);
          y = p.para(56, y - 14, 470, "Dieses Dokument ist ein Beispiel: Du kannst darin suchen, markieren, zeichnen und ein Textfeld setzen – alles bleibt in deinem Browser.", 12, GREY, 1.6);
          p.text(56, 70, "Beispieldokument der Demo", 10, GREY);
        },
        (p) => {
          head(p, [64, 123, 255], "KAPITEL 1", "Lesen und Navigieren");
          let y = p.para(48, 730, 500, "Die Seiten laufen fortlaufend, nur der sichtbare Bereich wird gezeichnet. Mit Strg und Mausrad wird gezoomt, der Punkt unter dem Zeiger bleibt dabei stehen. Das Inhaltsverzeichnis stammt aus den Lesezeichen der Datei.", 12);
          y = p.para(48, y - 8, 500, "Die Suche (Strg+F) zählt Treffer und springt mit F3 zum nächsten. Die Leiste lässt sich überall hinschieben.", 12);
          table(p, 48, y - 40, [["Taste", "Wirkung"], ["Strg+O", "PDF öffnen"], ["Strg+F", "Suchen"], ["Strg + Rad", "Zoomen"], ["Strg+0", "Ausgangsbreite"], ["F3", "nächster Treffer"], ["F11", "Bedienung ausblenden"]], [140, 360], [64, 123, 255]);
        },
        (p) => {
          head(p, [64, 123, 255], "KAPITEL 2", "Anmerkungen");
          let y = p.para(48, 730, 500, "Textmarker (M), Stift (Z) und Textfeld (T) schreiben echte Anmerkungen in die PDF. Ein Doppelklick auf eine Anmerkung öffnet ihr Menü: Farbe, Stärke, Text, Löschen.", 12);
          p.rect(40, y - 90, 515, 62, [255, 247, 200]);
          p.para(52, y - 52, 490, "Probiere es aus: markiere diesen Satz mit dem Textmarker (Taste M) und ziehe über die Wörter.", 15, INK, 1.5);
          p.text(48, y - 130, "Notiz:", 11, GREY, true).frame(48, y - 250, 500, 100, [160, 166, 180], 1);
          p.para(48, y - 280, 500, "Gesichert wird in diese Datei, ohne eine flache Seitenkopie zu erzeugen. In dieser Demo bleibt das Ergebnis im Speicher des Browsers.", 11, GREY);
        },
        (p) => {
          head(p, [64, 123, 255], "KAPITEL 3", "Invertieren und Glas");
          p.para(48, 730, 500, "Strg+I kehrt die Seite um – gut für lange Texte am Abend. Das Glas bricht den Seiteninhalt, statt ihn abzudunkeln, und passt sich dem Gerät an: ohne WebGL zeichnet Folio den Glanz in 2D.", 12);
          p.rect(48, 540, 230, 120, [255, 255, 255]).frame(48, 540, 230, 120, [190, 194, 204]).text(64, 630, "Hell", 14, INK, true).para(64, 606, 200, "So sieht Text auf Papier aus.", 11, INK);
          p.rect(300, 540, 230, 120, [22, 24, 30]).text(316, 630, "Dunkel", 14, [235, 238, 245], true).para(316, 606, 200, "So liest es sich nachts.", 11, [200, 204, 214]);
        },
      ],
    },
    {
      path: "Beispiele\\Trainingsplan-Jugendbasketball-U14.pdf", title: "Trainingsplan Jugendbasketball U14", acc: [236, 126, 40],
      outline: [["Wochenplan", 0], ["Übungen", 1], ["Kompetenzraster", 2]],
      pages: [
        (p) => {
          head(p, [236, 126, 40], "SAISON 2026/27", "Trainingsplan U14");
          let y = p.para(48, 730, 500, "Drei Einheiten pro Woche mit je einem Schwerpunkt. Jede Einheit beginnt mit Ballgefühl und endet mit einem Spiel in kleiner Gruppe.", 12);
          table(p, 48, y - 40, [["Tag", "Zeit", "Schwerpunkt", "Halle"], ["Montag", "17:00", "Dribbling und Passen", "A"], ["Mittwoch", "17:30", "Wurf aus der Bewegung", "B"], ["Freitag", "16:30", "3-gegen-3, Verteidigung", "A"]], [90, 80, 250, 60], [236, 126, 40]);
          p.para(48, y - 190, 500, "Regel für alle Einheiten: Jede Übung hat ein Ziel, das die Spielerinnen und Spieler selbst benennen können.", 12, GREY);
        },
        (p) => {
          head(p, [236, 126, 40], "SCHWERPUNKT", "Übungen");
          p.para(48, 730, 500, "1. Passdreieck: drei Gruppen, Pass und Laufen in die Lücke, danach Abschluss. 2. Zwei-Ball-Dribbling durch Pylonen. 3. Wurfserie aus vier Zonen, 5 Treffer pro Zone.", 12);
          const x0 = 120, y0 = 330, W = 360, H = 330; // Halbfeld
          p.rect(x0, y0, W, H, [240, 226, 200]).frame(x0, y0, W, H, [120, 90, 50], 2);
          p.frame(x0 + 110, y0 + H - 160, 140, 160, [120, 90, 50], 2).circle(x0 + 180, y0 + H - 160, 55, [120, 90, 50], 2);
          p.circle(x0 + 180, y0 + H - 30, 12, [200, 80, 30], 3).line(x0 + 150, y0 + H - 14, x0 + 210, y0 + H - 14, [90, 60, 30], 3);
          p.circle(x0 + 180, y0 + H - 22, 190, [150, 120, 80], 1).circle(x0 + 90, y0 + 120, 9, [236, 126, 40], 2, true).circle(x0 + 270, y0 + 110, 9, [236, 126, 40], 2, true);
          p.line(x0 + 98, y0 + 128, x0 + 170, y0 + 210, [236, 126, 40], 2).line(x0 + 262, y0 + 118, x0 + 200, y0 + 205, [236, 126, 40], 2);
          p.text(x0, y0 - 24, "Skizze: Passdreieck und Abschluss am Korb", 10, GREY);
        },
        (p) => {
          head(p, [236, 126, 40], "KOMPETENZRASTER", "Wahrnehmen, Entscheiden, Ausführen");
          p.para(48, 730, 500, "Jede Übung gehört zu einem Feld des Rasters. Stufe 1: mit Anleitung, Stufe 2: im Spiel, Stufe 3: unter Druck.", 12);
          const rows = ["Wahrnehmen", "Entscheiden", "Ausführen"], tone = [[255, 224, 190], [250, 190, 130], [236, 126, 40]];
          p.text(190, 640, "Stufe 1", 11, GREY, true).text(330, 640, "Stufe 2", 11, GREY, true).text(470, 640, "Stufe 3", 11, GREY, true);
          rows.forEach((r, i) => { p.text(48, 600 - i * 90, r, 12, INK, true); tone.forEach((t, k) => p.rect(180 + k * 140, 570 - i * 90, 126, 64, t).text(192 + k * 140, 596 - i * 90, ["Pass", "Lücke", "Abschluss"][(i + k) % 3], 11, k === 2 ? [255, 255, 255] : INK)); });
        },
      ],
    },
    {
      path: "Beispiele\\Studienplan-Sport-und-Englisch.pdf", title: "Studienplan Sport und Englisch", acc: [48, 170, 120],
      outline: [["Überblick", 0], ["Module", 1], ["Arbeitsaufwand", 2]],
      pages: [
        (p) => {
          head(p, [48, 170, 120], "LEHRAMT", "Studienplan Sport und Englisch");
          let y = p.para(48, 730, 500, "Zwei Fächer, ein Ziel: Unterricht, der Bewegung und Sprache verbindet. Der Plan zeigt sechs Semester mit Modulen, Leistungspunkten und Wochenaufwand.", 12);
          y = p.para(48, y - 8, 500, "Schwerpunkte: Trainingslehre und Bewegungswissenschaft, Literatur- und Kulturwissenschaft, Sprachpraxis und Fachdidaktik.", 12, GREY);
        },
        (p) => {
          head(p, [48, 170, 120], "SEMESTER 1 BIS 3", "Module");
          table(p, 48, 700, [["Modul", "Fach", "LP"], ["Einführung Bewegungswissenschaft", "Sport", "6"], ["Trainingslehre", "Sport", "6"], ["Literature and Culture", "Englisch", "6"], ["Syntax und Semantik", "Englisch", "6"], ["Statistik für Sportwissenschaft", "Sport", "3"], ["Sportpsychologie", "Sport", "6"]], [330, 120, 50], [48, 170, 120]);
        },
        (p) => {
          head(p, [48, 170, 120], "WOCHENAUFWAND", "Arbeitsaufwand");
          p.para(48, 730, 500, "Stunden pro Woche im Semester: Lehrveranstaltung und Selbststudium.", 12);
          const data = [["Vorlesung", 8], ["Seminar", 6], ["Übung", 5], ["Selbststudium", 14], ["Praxis", 4]];
          data.forEach(([l, v], i) => { p.text(48, 660 - i * 48, l, 11, INK).rect(160, 650 - i * 48, v * 22, 24, [48, 170, 120]).text(168 + v * 22, 658 - i * 48, v + " h", 11, GREY); });
        },
      ],
    },
  ];
  const docOf = (path) => DOCS.find((d) => d.path === path);
  const bytesOf = (path) => {
    let b = store.get(path);
    if (!b && docOf(path)) store.set(path, (b = makePdf(docOf(path))));
    return b;
  };

  // ---------- Vorschaubilder und Bibliothek ----------
  function thumb(d) {
    const c = document.createElement("canvas");
    c.width = 340; c.height = 481;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, 340, 481);
    g.fillStyle = `rgb(${d.acc.join(",")})`; g.fillRect(0, 0, 340, 120);
    g.fillStyle = "#fff"; g.font = "700 25px Segoe UI, sans-serif";
    d.title.split(/ (?=[A-ZÄÖÜ])/).slice(0, 3).forEach((l, i) => g.fillText(l, 22, 54 + i * 30));
    g.fillStyle = "#d9dce3";
    [0, 1, 2, 3, 4, 5, 6].forEach((i) => g.fillRect(22, 160 + i * 30, 296 - (i % 3) * 60, 9));
    g.fillStyle = `rgba(${d.acc.join(",")},.35)`; g.fillRect(22, 380, 120, 36);
    return c.toDataURL("image/jpeg", 0.8);
  }
  try {
    if (localStorage.getItem("folio.recents") === null) {
      localStorage.setItem("folio.recents", JSON.stringify(DOCS.map((d, i) => ({ path: d.path, name: d.path.split("\\").pop(), thumb: thumb(d), page: 1, pages: d.pages.length, at: Date.now() - i * 36e5 }))));
    }
  } catch { /* ohne Speicher startet die Bibliothek leer */ }

  // ---------- eigene PDFs ----------
  const register = async (file) => {
    const path = "Eigene\\" + file.name;
    store.set(path, new Uint8Array(await file.arrayBuffer()));
    return path;
  };
  const isPdf = (f) => /\.pdf$/i.test(f.name) || f.type === "application/pdf";

  // Auswahl statt Windows-Dialog: die Beispiele oder eine PDF vom Rechner
  function chooser() {
    return new Promise((resolve) => {
      const wrap = document.createElement("div");
      wrap.style.cssText = "position:fixed;inset:0;z-index:99;display:grid;place-items:center;background:rgba(8,10,14,.6);backdrop-filter:blur(8px);font:14px system-ui,Segoe UI,sans-serif;color:#eef0f5";
      const box = document.createElement("div");
      box.style.cssText = "width:min(420px,88vw);padding:20px;border-radius:18px;background:rgba(30,32,40,.92);border:1px solid rgba(255,255,255,.14);box-shadow:0 20px 60px rgba(0,0,0,.5)";
      box.innerHTML = '<h2 style="margin:0 0 4px;font-size:18px">PDF öffnen</h2><p style="margin:0 0 14px;color:#a9aebb;font-size:12.5px">Ein Beispiel wählen oder eine PDF von deinem Rechner. Sie bleibt im Browser und wird nirgends hochgeladen.</p>';
      const done = (v) => { wrap.remove(); resolve(v); };
      const btn = (label, fn, sub = "") => {
        const b = document.createElement("button");
        b.type = "button";
        b.style.cssText = "display:block;width:100%;text-align:left;margin:6px 0;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.06);color:inherit;font:inherit;cursor:pointer";
        b.innerHTML = `<b style="font-weight:600">${label}</b>${sub ? `<span style="display:block;color:#a9aebb;font-size:12px">${sub}</span>` : ""}`;
        b.addEventListener("click", fn);
        box.append(b);
      };
      DOCS.forEach((d) => btn(d.title, () => done(d.path), `${d.pages.length} Seiten · Beispiel`));
      const file = document.createElement("input");
      file.type = "file"; file.accept = "application/pdf,.pdf"; file.hidden = true;
      file.addEventListener("change", async () => { const f = file.files[0]; done(f && isPdf(f) ? await register(f) : null); });
      box.append(file);
      btn("PDF vom Rechner wählen …", () => file.click(), "bleibt lokal im Browser");
      wrap.addEventListener("pointerdown", (e) => { if (e.target === wrap) done(null); });
      addEventListener("keydown", function esc(e) { if (e.key === "Escape") { removeEventListener("keydown", esc); if (wrap.isConnected) done(null); } });
      wrap.append(box);
      document.body.append(wrap);
    });
  }

  // Der erste Klick in ein noch nicht fokussiertes Fenster löst im Browser „focus“ aus; Folio baut die Bibliothek dann neu auf und der
  // Klick ginge verloren (in der echten App hat das Fenster den Fokus schon). Während des Drückens wird dieses Ereignis zurückgehalten.
  let pressed = false;
  const release = () => setTimeout(() => { pressed = false; }, 80);
  addEventListener("pointerdown", () => { pressed = true; }, true);
  addEventListener("pointerup", release, true);
  addEventListener("pointercancel", release, true);
  addEventListener("focus", (e) => { if (pressed) e.stopImmediatePropagation(); }, true);

  // Dateien auf das Fenster ziehen: wie das Ziehen-Ereignis der echten App
  let over = false;
  const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes("Files");
  addEventListener("dragover", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    const position = { x: e.clientX, y: e.clientY };
    if (!over) { over = true; P.emit("tauri://drag-enter", { paths: [], position }); }
    P.emit("tauri://drag-over", { position });
  });
  addEventListener("dragleave", (e) => { if (over && e.relatedTarget === null) { over = false; P.emit("tauri://drag-leave", null); } });
  addEventListener("drop", async (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    over = false;
    const paths = [];
    for (const f of [...e.dataTransfer.files].filter(isPdf)) paths.push(await register(f));
    P.emit("tauri://drag-drop", { paths, position: { x: e.clientX, y: e.clientY } });
  });

  // ---------- Befehle ----------
  let warned = false;
  P.handlers = {
    read_pdf: ({ path }) => {
      const b = bytesOf(path);
      if (!b) throw new Error("Datei nicht gefunden: " + path);
      return b.slice().buffer;
    },
    save_pdf: (bytes, options) => {
      const hex = options?.headers?.["x-path"] ?? "";
      const path = new TextDecoder().decode(Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16)));
      store.set(path, new Uint8Array(bytes));
      if (!warned) { warned = true; toast("Gesichert – in dieser Demo bleibt die Datei im Speicher des Browsers."); }
      return null;
    },
    recycle_pdf: ({ path }) => { store.delete(path); return null; },
    startup_file: () => null,
    // Notch: das offene Dokument steht dort mit Seite; Folios Eintrag verschwindet beim Schließen des Fensters
    notch_send: ({ method, path, body }) => {
      const be = top.__notchBackend;
      if (!be) return null;
      if (method === "POST" && path === "/activity") be.activity(JSON.parse(body));
      else if (method === "DELETE" && path.startsWith("/activity/")) be.removeActivity(decodeURIComponent(path.slice(10)));
      return null;
    },
    notch_events: () => null,
    "plugin:dialog|open": () => chooser(),
    "plugin:opener|reveal_item_in_dir": () => { toast("Der Explorer öffnet sich nur in der installierten App."); return null; },
    "plugin:updater|check": () => null,
    // Weitere Fenster öffnet der Desktop; denselben Schlüssel gibt es nur einmal, ein zweiter Aufruf holt das Fenster nach vorn
    "plugin:webview|get_all_webviews": () => [],
    "plugin:webview|create_webview_window": ({ options: o = {} }) => {
      P.bus("window:open", { key: o.label, title: o.title || "Folio", src: o.url, size: [Math.min(o.width || 1000, 1100), Math.min(o.height || 760, 800)] });
      return null;
    },
  };
})();
