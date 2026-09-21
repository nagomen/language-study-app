// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, escapeHtml, localDateKey } from "../shared.js";
import { updateCheckedSummary } from "./checked.js";
import { SKILL_LABELS } from "./config.js";
import { renderDailyBanner } from "./daily.js";
import { state } from "./state.js";
import { addDays, startOfCurrentWeek } from "./util.js";

export function renderProgress() {
  const { answered, correct, byLevel } = state.progress;
  $("#stat-answered").textContent = answered;
  $("#stat-correct").textContent = correct;
  $("#stat-rate").textContent = answered ? `${Math.round(correct / answered * 100)}%` : "—";
  $("#level-progress-list").innerHTML = [1, 2, 3].map((level) => {
    const data = byLevel[level];
    const rate = data.answered ? Math.round(data.correct / data.answered * 100) : 0;
    return `<div class="progress-row"><strong>HSK ${level}</strong><div class="progress-bar"><span style="width:${rate}%"></span></div><span>${data.answered ? `${rate}%` : "—"}</span></div>`;
  }).join("");
  const mastery = Object.values(state.progress.srs || {});
  $("#stat-due").textContent = getDueWords().length;
  $("#stat-learning").textContent = mastery.filter((item) => item.repetitions > 0 && item.repetitions < 5).length;
  $("#stat-mastered").textContent = mastery.filter((item) => item.repetitions >= 5).length;
  $("#skill-progress-list").innerHTML = ["vocabulary", "listening", "reading", "writing"].map((skill) => {
    const data = state.progress.skills[skill];
    const rate = data.answered ? Math.round(data.correct / data.answered * 100) : 0;
    return `<div class="progress-row"><strong>${SKILL_LABELS[skill]}</strong><div class="progress-bar"><span style="width:${rate}%"></span></div><span>${data.answered ? `${rate}%` : "—"}</span></div>`;
  }).join("");
  $("#mock-history-list").innerHTML = state.progress.mocks.length
    ? state.progress.mocks.map((mock) => `<div class="mock-history-row"><span>${escapeHtml(mock.date)} · HSK ${mock.level}${mock.section ? ` ${SKILL_LABELS[mock.section]}` : ""}</span><strong>${mock.score}<small> / ${mock.maxScore}</small></strong><b class="${mock.passed ? "is-pass" : "is-retry"}">${mock.section ? (mock.passed ? "達成" : "再挑戦") : (mock.passed ? "合格" : "再挑戦")}</b></div>`).join("")
    : '<p class="empty-inline">模試を受けると、ここに直近10回の結果が表示されます。</p>';
}

export function updateSummary() {
  $("#total-words-label").textContent = `全${state.words.length}語`;
  const start = startOfCurrentWeek();
  const weeklyCount = Object.entries(state.progress.dailyCounts).reduce((sum, [date, count]) => date >= start ? sum + count : sum, 0);
  $("#week-count").textContent = Object.keys(state.progress.dailyCounts).length ? weeklyCount : state.progress.weekCount;
  $("#sidebar-streak").textContent = `${calculateStreak()}日`;
  const reviewCount = Object.values(state.progress.mistakes).filter((count) => count > 0).length;
  $("#review-count-label").textContent = reviewCount ? `${reviewCount}語をもう一度チェック` : "復習する単語はありません";
  const dueLabel = $("#due-word-count");
  if (dueLabel) dueLabel.textContent = getDueWords().length;
  updateCheckedSummary();
  renderDailyBanner();
}

export function recordStudy(word, isCorrect, skill) {
  const today = localDateKey();
  state.progress.lastStudyDate = today;
  state.progress.weekCount += 1;
  state.progress.dailyCounts[today] = (state.progress.dailyCounts[today] || 0) + 1;
  if (!state.progress.studyDates.includes(today)) state.progress.studyDates.push(today);
  state.progress.skills[skill] ||= { answered: 0, correct: 0 };
  state.progress.skills[skill].answered += 1;
  state.progress.skills[skill].correct += isCorrect ? 1 : 0;
  if (!word) return;
  const current = state.progress.srs[word.id] || { repetitions: 0, interval: 0, due: today, correct: 0, wrong: 0 };
  const intervals = [1, 3, 7, 14, 30, 60, 120];
  current.repetitions = isCorrect ? Math.min(current.repetitions + 1, intervals.length) : 0;
  current.interval = isCorrect ? intervals[Math.max(0, current.repetitions - 1)] : 1;
  current.correct += isCorrect ? 1 : 0;
  current.wrong += isCorrect ? 0 : 1;
  current.due = addDays(today, current.interval);
  state.progress.srs[word.id] = current;
}

export function getDueWords() {
  const today = localDateKey();
  return state.words.filter((word) => state.progress.srs[word.id] && state.progress.srs[word.id].due <= today);
}

export function masteryScore(word) { return state.progress.srs[word.id]?.repetitions || 0; }

function calculateStreak() {
  const dates = new Set(state.progress.studyDates || []);
  if (!dates.size) return 0;
  const cursor = new Date();
  if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
