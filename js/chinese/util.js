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

export function normalizeAnswer(value) { return String(value || "").replace(/[\s。！？,.，?!]/g, "").toLowerCase(); }
