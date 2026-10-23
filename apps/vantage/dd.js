// Data Dragon (Riot Games): Bilder und deutsche Namen für Champions und Items. Die Bilder kommen zur Laufzeit von
// ddragon.leagueoflegends.com (feste Version, damit sie erreichbar bleiben); fehlen sie, zeigt die Seite Kürzel.
import { VERSION, CHAMPS, ITEMS } from "./data.js";

const CDN = "https://ddragon.leagueoflegends.com/cdn";
export const ddVersion = () => VERSION;
export const champName = (id) => CHAMPS[id]?.name ?? id;
export const champImg = (id) => (id ? `${CDN}/${VERSION}/img/champion/${id}.png` : "");
export const itemName = (id) => ITEMS[id] ?? "";
export const itemImg = (id) => (id ? `${CDN}/${VERSION}/img/item/${id}.png` : "");
export const iconImg = (id) => `${CDN}/${VERSION}/img/profileicon/${id}.png`;
/** quadratischer Ausschnitt aus dem Splash-Art (Lane-Zeilen der Spielanalyse) */
export const tileImg = (id) => (id ? `${CDN}/img/champion/tiles/${id}_0.jpg` : "");
export const champTags = (id) => CHAMPS[id]?.tags ?? [];
export const champByKey = (key) => Object.keys(CHAMPS).find((id) => CHAMPS[id].key === key) ?? "";
export const champKey = (id) => CHAMPS[id]?.key ?? 0;

export const CLASS = { Fighter: "Kämpfer", Tank: "Tank", Mage: "Magier", Assassin: "Assassine", Marksman: "Schütze", Support: "Unterstützer" };
export const ROLE = { top: "Top", jungle: "Jungle", mid: "Mid", bottom: "Bot", support: "Support", none: "Ersatz" };

export const DRAGON = {
  ocean: { name: "Ozeandrache", acc: "den Ozeandrachen", color: "#4fc3f7" },
  infernal: { name: "Höllendrache", acc: "den Höllendrachen", color: "#ff7043" },
  mountain: { name: "Bergdrache", acc: "den Bergdrachen", color: "#c8a27a" },
  cloud: { name: "Wolkendrache", acc: "den Wolkendrachen", color: "#c9d6df" },
  hextech: { name: "Hextech-Drache", acc: "den Hextech-Drachen", color: "#3fd0e0" },
  chemtech: { name: "Chemtech-Drache", acc: "den Chemtech-Drachen", color: "#9ccc65" },
  elder: { name: "Ältester Drache", acc: "den Ältesten Drachen", color: "#ffd54f" },
};
