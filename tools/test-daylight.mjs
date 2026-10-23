// node tools/test-daylight.mjs – prüft die Sonnen- und Mondrechnung gegen bekannte Werte
import assert from "node:assert/strict";
import { sky, light, presetDate } from "../src/daylight.js";

const at = (iso) => new Date(iso);
const deg = (r) => (r * 180) / Math.PI;

// Mittag am 23. Oktober (Sommerzeit endet am 25.): Sonne steht um 26° (90° − 51° − 12°)
const noon = sky(at("2026-10-23T13:00:00"));
assert.ok(Math.abs(deg(noon.sun.el) - 26.4) < 1.5, `Mittagshöhe ${deg(noon.sun.el)}`);
assert.ok(Math.abs(deg(noon.sun.az)) < 3, "Mittag: Sonne im Süden");

// Mittsommer: Mittagshöhe ≈ 62°, Mittwinter ≈ 15°
assert.ok(Math.abs(deg(sky(at("2026-06-21T13:00:00")).sun.el) - 62.5) < 1.5);
assert.ok(Math.abs(deg(sky(at("2026-12-21T12:00:00")).sun.el) - 15.5) < 1.5);

// Tageslänge im Oktober ≈ 10 h, im Juni ≈ 16,5 h
assert.ok(Math.abs(noon.half * 2 - 10) < 0.8, `Tageslänge ${noon.half * 2}`);
assert.ok(Math.abs(sky(at("2026-06-21T13:00:00")).half * 2 - 16.5) < 0.8);

// Morgens im Osten (links, negativ), abends im Westen (rechts, positiv); nachts unter dem Horizont
assert.ok(sky(at("2026-10-23T09:00:00")).sun.az < 0 && sky(at("2026-10-23T17:00:00")).sun.az > 0);
assert.ok(sky(at("2026-10-23T00:30:00")).sun.el < 0);

// Mond: Neumond am 10.10.2026 (≈ 15:50 UTC) hat Elongation nahe 0, zwei Wochen später ≈ Vollmond (π)
const nm = sky(new Date(Date.UTC(2026, 9, 10, 15, 50))).elong;
assert.ok(Math.min(nm, 2 * Math.PI - nm) < 0.25, `Neumond ${nm}`);
assert.ok(Math.abs(sky(new Date(Date.UTC(2026, 9, 26, 5, 0))).elong - Math.PI) < 0.35, "Vollmond um den 26.10.");

// Stimmungen liegen in der richtigen Tagesphase
const d = at("2026-10-23T12:00:00");
const h = (n) => light(presetDate(n, d));
assert.ok(h("mittag").sunI > 0.95 && h("nacht").sunI === 0 && h("nacht").stars > 0.9);
assert.ok(h("abend").el > 0 && h("abend").el < 14 && h("morgen").el > 0 && h("morgen").el < 14);
assert.ok(h("daemmerung").el < 0 && h("daemmerung").el > -12);
for (const k of ["zen", "hor", "amb", "key", "fog", "keyDir"]) assert.ok(h("mittag")[k].every(Number.isFinite), k);
console.log("daylight: ok");
