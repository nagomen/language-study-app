// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, $$ } from "../shared.js";
import { renderProgress, updateSummary } from "./progress.js";
import { state } from "./state.js";

export function getCheckedWords() {
  return state.words.filter((word) => state.checked.has(word.id));
}

export function loadProgress() {
  const empty = {
    answered: 0, correct: 0, weekCount: 0, lastStudyDate: "", studyDates: [], dailyCounts: {}, mistakes: {}, srs: {}, mocks: [],
    byLevel: { 1: { answered: 0, correct: 0 }, 2: { answered: 0, correct: 0 }, 3: { answered: 0, correct: 0 } },
    skills: { vocabulary: { answered: 0, correct: 0 }, listening: { answered: 0, correct: 0 }, reading: { answered: 0, correct: 0 }, writing: { answered: 0, correct: 0 } },
  };
  try {
    const saved = JSON.parse(localStorage.getItem("hsk-study-progress") || "{}");
    return { ...empty, ...saved, byLevel: { ...empty.byLevel, ...(saved.byLevel || {}) }, skills: { ...empty.skills, ...(saved.skills || {}) }, studyDates: saved.studyDates || [], dailyCounts: saved.dailyCounts || {}, srs: saved.srs || {}, mocks: saved.mocks || [] };
  } catch { return empty; }
}

export function saveProgress() { localStorage.setItem("hsk-study-progress", JSON.stringify(state.progress)); }

export function resetProgress() {
  if (!confirm("学習記録をすべてリセットしますか？")) return;
  localStorage.removeItem("hsk-study-progress");
  state.progress = loadProgress();
  renderProgress();
  updateSummary();
}

export function loadAudioSpeed() {
  try {
    const value = Number(localStorage.getItem("hsk-audio-speed") || "1");
    return [.85, 1, 1.15].includes(value) ? value : 1;
  } catch { return 1; }
}

export function loadVocabularyDirection() {
  try {
    return localStorage.getItem("hsk-vocabulary-direction") === "ja-cn" ? "ja-cn" : "cn-ja";
  } catch { return "cn-ja"; }
}

export function setVocabularyDirection(direction) {
  state.vocabularyDirection = direction === "ja-cn" ? "ja-cn" : "cn-ja";
  try { localStorage.setItem("hsk-vocabulary-direction", state.vocabularyDirection); } catch {}
  $$("[data-vocabulary-direction]").forEach((button) => {
    const isActive = button.dataset.vocabularyDirection === state.vocabularyDirection;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  const note = $("#quiz-direction-note");
  if (note) note.textContent = state.vocabularyDirection === "ja-cn"
    ? "日本語を見て、漢字＋ピンインの中国語を選びます。"
    : "中国語を見て、日本語の意味を選びます。";
}
