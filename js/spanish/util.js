// spanish.js から機能ごとに切り出したモジュール。
import { $, shuffle } from "../shared.js";

export function checkResponse(response) {
  if (!response.ok) throw new Error(`Vocabulary load failed: ${response.status}`);
  return response;
}

export function sample(items, count) { return shuffle(items).slice(0, count); }

export function uniqueBy(items, key) { const seen = new Set(); return items.filter((item) => { const value = key(item); if (seen.has(value)) return false; seen.add(value); return true; }); }

export function normalize(value) { return value.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
