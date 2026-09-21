// spanish.js から機能ごとに切り出したモジュール。
import { STORAGE_KEY } from "./config.js";
import { state } from "./state.js";

export function getCheckedWords() {
  return state.words.filter((word) => state.checked.has(word.id));
}

export function defaultProgress() {
  return { answered: 0, correct: 0, wrongIds: [], daily: {}, levels: { A1: { answered: 0, correct: 0 }, A2: { answered: 0, correct: 0 }, B1: { answered: 0, correct: 0 } } };
}

export function loadProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const base = defaultProgress();
    if (!stored || typeof stored !== "object") return base;
    return { ...base, ...stored, levels: { ...base.levels, ...(stored.levels || {}) }, wrongIds: Array.isArray(stored.wrongIds) ? stored.wrongIds : [], daily: stored.daily || {} };
  } catch { return defaultProgress(); }
}

export function saveProgress() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
