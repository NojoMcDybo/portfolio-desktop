/* Streamdock: Beispiel-Antworten für die 11 App-Befehle (src/api.ts). Kanäle, Titel und Zahlen sind erfunden;
   die Vorschaubilder sind erzeugte Farbverläufe. Anmelden/Abmelden durchläuft die Einrichtung wirklich. */
(() => {
  const P = window.__PORTFOLIO__;
  P.version = "0.2.1";
  P.name = "Streamdock";

  const svg = (c1, c2, label = "") =>
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 248"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="440" height="248" fill="url(#g)"/><text x="50%" y="54%" text-anchor="middle" font-family="Segoe UI, sans-serif" font-size="64" font-weight="700" fill="rgba(255,255,255,.35)">${label}</text></svg>`,
    );

  const people = [
    ["kleinwelle", "Kleinwelle", "Strategiespiele", "Turnier-Viertelfinale – Tag 3, danach Ranglistenspiele", 12345],
    ["schachfuchs", "Schachfuchs", "Schach", "Titel mit Umlauten: äöü – und ein ziemlich langer Rest, der umbrechen muss", 800],
    ["lumi", "Lumi", "Just Chatting", "", 7],
    ["alpha", "Alpha", "Taktik-Shooter", "Ranked Grind bis Diamant", 4300],
    ["bravo", "Bravo", "Sandbox", "Hardcore-Welt, Tag 112", 2210],
    ["charlie", "Charlie", "Rollenspiel", "Blind Run, kein Leveln", 1530],
    ["delta", "Delta", "Software und Spieleentwicklung", "Eine Tauri-App bauen", 310],
    ["echo", "Echo", "IRL", "Spaziergang durch die Altstadt", 95],
  ];
  const hues = [265, 205, 20, 145, 40, 345, 285, 190];
  const col = (h, l = 50) => `hsl(${h} 70% ${l}%)`;
  const streams = people
    .map(([login, name, game, title, viewers], i) => ({
      login, name, game, title, viewers,
      thumbnail: svg(col(hues[i]), "#1c1c1e", name[0]),
      avatar: svg(col(hues[(i + 3) % 8]), col(hues[i]), name[0]),
      startedAt: new Date(Date.now() - (i + 1) * 3600e3 * 1.3).toISOString(),
      watched: [43200, 9000, 0, 2400, 0, 0, 0, 0][i] ?? 0,
    }))
    .sort((a, b) => b.watched - a.watched || b.viewers - a.viewers); // wie im Backend: Favoriten zuerst

  const st = { clientId: true, loggedIn: true };
  let authT = 0;

  P.handlers = {
    twitch_state: () => ({ clientId: st.clientId, loggedIn: st.loggedIn }),
    set_client_id: () => { st.clientId = true; return null; },
    auth_start: () => {
      clearTimeout(authT);
      authT = setTimeout(() => { st.loggedIn = true; P.emit("auth", { ok: true, message: "" }); }, 3500);
      return { userCode: "KDMHPQRS", verificationUri: "https://www.twitch.tv/activate" };
    },
    auth_cancel: () => { clearTimeout(authT); return null; },
    logout: () => { st.loggedIn = false; return null; },
    live_streams: async () => { await new Promise((r) => setTimeout(r, 450)); return streams; },
    start_stream: ({ channel }) => {
      const c = String(channel || "").toLowerCase().replace(/^https?:\/\/(www\.)?twitch\.tv\//, "").replace(/\/.*$/, "");
      const s = streams.find((x) => x.login === c);
      const i = s ? people.findIndex((p) => p[0] === s.login) : Math.floor(Math.random() * 8);
      P.bus("streamdock:start", { channel: c, name: s?.name || c, game: s?.game || "Eigener Kanal", title: s?.title || "", viewers: s?.viewers || 0, hues: [hues[i % 8], hues[(i + 4) % 8]] });
      return null;
    },
    open_console: () => { P.bus("toast", { text: "Die Twitch-Konsole öffnet sich in der echten App." }); return null; },
    update_state: () => ({ status: "current", current: "0.2.1" }),
    update_check: () => ({ status: "current", current: "0.2.1" }),
    update_install: () => null,
  };
})();
