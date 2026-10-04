// spanish.js から機能ごとに切り出したモジュール。
import { $, calculateDateStreak, localDateKey, progressRowHtml } from "../shared.js";
import { updateCheckedSummary } from "./checked.js";
import { LEVELS } from "./config.js";
import { state } from "./state.js";
import { saveProgress } from "./storage.js";

export function recordAnswer(word, correct) {
  const progress = state.progress;
  progress.answered += 1;
  if (correct) progress.correct += 1;
  progress.levels[word.level].answered += 1;
  if (correct) progress.levels[word.level].correct += 1;
  const wrong = new Set(progress.wrongIds);
  if (correct) wrong.delete(word.id); else wrong.add(word.id);
  progress.wrongIds = [...wrong];
  const today = localDateKey(new Date());
  progress.daily[today] = (progress.daily[today] || 0) + 1;
  saveProgress();
}

export function renderProgress() {
  const progress = state.progress;
  $("#stat-answered").textContent = progress.answered;
  $("#stat-correct").textContent = progress.correct;
  $("#stat-rate").textContent = progress.answered ? `${Math.round((progress.correct / progress.answered) * 100)}%` : "—";
  const list = $("#level-progress-list");
  list.innerHTML = LEVELS.map((level) => progressRowHtml(level, progress.levels[level])).join("");
}

export function renderHomeStats() {
  const today = new Date();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
  const weekly = Object.entries(state.progress.daily).filter(([date]) => new Date(`${date}T12:00:00`) >= weekStart).reduce((sum, [, count]) => sum + count, 0);
  $("#week-count").textContent = weekly;
  const studyDates = Object.keys(state.progress.daily).filter((date) => state.progress.daily[date] > 0);
  $("#sidebar-streak").textContent = `${calculateDateStreak(studyDates)}日`;
  const count = state.progress.wrongIds.length;
  $("#review-count-label").textContent = count ? `${count}語から最大10問` : "復習する単語はありません";
  $("#review-quiz").disabled = count === 0;
  updateCheckedSummary();
}
