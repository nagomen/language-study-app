// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, localDateKey } from "../shared.js";

export function uniqueChoices(choices) {
  const seen = new Set();
  return choices.filter((choice) => !seen.has(choice.label) && seen.add(choice.label)).slice(0, 4);
}

export function startOfCurrentWeek() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return localDateKey(date);
}

export function addDays(dateString, days) { const date = new Date(`${dateString}T12:00:00`); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }

/**
 * 誤答の選択肢に使ってよい語か。正解と同じ漢字の別語（会＝できる／会＝集まり）や
 * 同じ意味の語（会・能＝できる）を混ぜると正解が2つになるので外す。
 * sameSound: 音声で出す問題では、ピンインが同じ語（聞き分けられない）も外す。
 */
export function canBeDistractor(word, item, { sameSound = false } = {}) {
  if (!item || !word || item.id === word.id) return false;
  if (item.hanzi === word.hanzi || item.meaning === word.meaning) return false;
  if (sameSound && plainPinyin(item.pinyin) === plainPinyin(word.pinyin)) return false;
  return true;
}

function plainPinyin(value) { return String(value || "").replace(/\s+/g, "").toLowerCase(); }

export function normalizeAnswer(value) { return String(value || "").replace(/[\s。！？,.，?!]/g, "").toLowerCase(); }

export function wordLevelLabel(word) {
  if (word?.legacySupplement) return `旧HSK ${word.level}補完`;
  return `HSK ${word?.level || ""}${word?.newIn2026 ? " · 2026新出" : ""}`;
}
