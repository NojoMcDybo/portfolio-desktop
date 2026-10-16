// Notch-Einstellungen (Nachbau): schaltet die Quellen der Notch auf diesem Desktop und ordnet ihre Rangliste.
// Die Notch sitzt im Desktop (src/notch.js); dieses Fenster spricht mit ihr über den Bus des Desktops.
import { windowControls, segments, $, bus } from "../../shim/ui.js";

windowControls();
const NAMES = {
  glucose: ["Blutzucker", "Wert und Trend, aus Haze"], music: ["Musik", "Titel, Cover und Pegel"], timer: ["Timer", "Pomodoro aus Kursbuch und Notch"],
  sport: ["Spielzeit", "Minute und Stand aus Arena"], pulse: ["Puls", "Aus Garmin über Haze"],
};
const up = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 6-6 6 6"/></svg>';
const down = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 10 6 6 6-6"/></svg>';

let st = { on: { glucose: true, music: true, timer: true, sport: true, pulse: true }, order: ["glucose", "music", "timer", "sport", "pulse"], fullscreen: "hide" };
const seg = segments($("#fs"), (b) => { st.fullscreen = b.dataset.v; bus("notch:set", { fullscreen: st.fullscreen }); });

function paint() {
  const live = (id) => st.on[id] && id !== "timer"; // Timer zählt erst, wenn er läuft; die Notch oben zeigt das live
  const top2 = st.order.filter(live).slice(0, 2);
  $("#src").innerHTML = st.order.map((id, i) => `<li class="${st.on[id] ? "" : "off"}"><span><b>${NAMES[id][0]}</b>${top2.includes(id) ? `<span class="slot">PLATZ ${top2.indexOf(id) + 1}</span>` : ""}<small>${NAMES[id][1]}</small></span>
    <span class="mv"><button data-up="${id}" aria-label="Nach oben" ${i === 0 ? "disabled" : ""}>${up}</button><button data-down="${id}" aria-label="Nach unten" ${i === st.order.length - 1 ? "disabled" : ""}>${down}</button></span>
    <span class="n-switch" role="switch" tabindex="0" aria-checked="${st.on[id]}" aria-label="${NAMES[id][0]}" data-id="${id}"></span></li>`).join("");
  const label = { glucose: '<span style="color:#5ee08a">118 →</span>', music: '<span class="eq"><i></i><i></i><i></i></span>', timer: "24:31", sport: '<span><span style="color:#ff5a6e">●</span> 67\' <small>1:2</small></span>', pulse: '<span style="color:#ff5a6e">♥</span> 72' };
  $("#pill").innerHTML = top2.length ? top2.map((id) => `<span>${label[id]}</span>`).join("") : '<small style="font-size:18px;line-height:1">•</small>';
  $("#pill").style.minWidth = top2.length ? "230px" : "110px";
  $("#why").textContent = top2.length ? `Platz 1 und 2 sind ${top2.map((id) => NAMES[id][0]).join(" und ")}.` : "Nichts eingeschaltet: die Notch bleibt als kleine schwarze Form stehen.";
  $("#fs").querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.v === st.fullscreen));
  seg.refresh();
}
const push = () => { bus("notch:set", { on: st.on, order: st.order }); paint(); };
$("#src").addEventListener("click", (e) => {
  const sw = e.target.closest("[data-id]"); if (sw) { st.on[sw.dataset.id] = !st.on[sw.dataset.id]; return push(); }
  const u = e.target.closest("[data-up]"), d = e.target.closest("[data-down]");
  const id = (u || d)?.dataset.up ?? (u || d)?.dataset.down; if (!id) return;
  const i = st.order.indexOf(id), j = u ? i - 1 : i + 1;
  [st.order[i], st.order[j]] = [st.order[j], st.order[i]]; push();
});
$("#src").addEventListener("keydown", (e) => { if ((e.key === " " || e.key === "Enter") && e.target.dataset.id) { e.preventDefault(); e.target.click(); } });
document.querySelector("main").addEventListener("click", (e) => {
  const t = e.target.closest("[data-test]")?.dataset.test; if (!t) return;
  if (t === "alert") bus("notch:alert", { title: "Hallo aus den Einstellungen", text: "So meldet sich die Notch, wenn etwas wichtig ist." });
  if (t === "goal") bus("notch:alert", { title: "Tor!", text: "Nordstadt 2:2 Hafenstadt (71')" });
  if (t === "timer") { st.on.timer = true; bus("notch:set", { on: st.on }); bus("notch:timer", { sec: 60 }); bus("notch:alert", { title: "Timer gestartet", text: "Eine Minute läuft – die Notch zeigt sie, sobald sie zugeklappt ist." }); paint(); }
});
// Stand der Notch vom Desktop holen und bei Änderungen nachführen
addEventListener("message", (e) => { if (e.origin === location.origin && e.data?.type === "notch-settings") { st = { ...st, ...e.data.settings }; paint(); } });
bus("notch:get", {});
paint();
