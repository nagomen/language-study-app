// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, escapeHtml, shuffle, localDateKey } from "../shared.js";
import { bindWordRowAudio } from "./audio.js";
import { DAILY_KEY, DAILY_LEVEL, DAILY_SEED, DAILY_SIZE } from "./config.js";
import { startQuiz } from "./quiz.js";
import { state } from "./state.js";
import { wordRowHtml } from "./words.js";

export function loadDaily() {
  const empty = { day: 1, lastDate: "", pendingReview: [], history: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(DAILY_KEY) || "null");
    if (!saved || typeof saved !== "object") return empty;
    return {
      day: Math.max(1, Number(saved.day) || 1),
      lastDate: String(saved.lastDate || ""),
      pendingReview: Array.isArray(saved.pendingReview) ? saved.pendingReview : [],
      history: Array.isArray(saved.history) ? saved.history : [],
    };
  } catch { return empty; }
}

function saveDaily() {
  try { localStorage.setItem(DAILY_KEY, JSON.stringify(state.daily)); } catch {}
}

// 固定の種から並べ替えるので、何度開いても同じ順番になり、日をまたいで単語が重複しない。
export function buildDailyDays() {
  const pool = state.words.filter((word) => word.level === DAILY_LEVEL);
  let seed = DAILY_SEED;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const ordered = [...pool];
  for (let index = ordered.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [ordered[index], ordered[swap]] = [ordered[swap], ordered[index]];
  }
  const days = [];
  for (let index = 0; index < ordered.length; index += DAILY_SIZE) days.push(ordered.slice(index, index + DAILY_SIZE));
  return days;
}

function dailySnapshot() {
  const days = state.dailyDays;
  const index = state.daily.day - 1;
  const finished = index >= days.length;
  // 今日テストを終えたら、次の20語は翌日まで開かない（1日1セット）。
  const locked = state.daily.lastDate === localDateKey() && !finished;
  const shownIndex = locked ? index - 1 : index;
  return {
    days,
    index,
    finished,
    locked,
    // ロック中は「今日学んだ20語」を見せる。
    shownDay: shownIndex + 1,
    words: finished ? [] : (days[shownIndex] || []),
    review: state.daily.pendingReview.map((id) => state.words.find((word) => word.id === id)).filter(Boolean),
    learned: Math.min(index, days.length) * DAILY_SIZE,
    total: days.reduce((sum, day) => sum + day.length, 0),
  };
}

export function renderDailyBanner() {
  const banner = $("#daily-banner-title");
  if (!banner || !state.dailyDays.length) return;
  const daily = dailySnapshot();
  const bar = $("#daily-progress-bar");
  if (bar) bar.style.width = `${Math.round((daily.learned / daily.total) * 100)}%`;
  $("#daily-progress-label").textContent = daily.finished
    ? `全${daily.total}語を学習しました`
    : `DAY ${state.daily.day} / ${daily.days.length}　（学習済み ${daily.learned}語 / ${daily.total}語）`;
  banner.textContent = daily.finished ? "300語を一周しました" : (daily.locked ? "今日の分は終わりました" : "今日の20語");
  const note = $("#daily-banner-note");
  note.textContent = daily.finished
    ? `まちがえた${daily.review.length}語の復習か、リセットして最初からやり直せます。`
    : (daily.locked ? `次の DAY ${state.daily.day} の20語は明日から始められます。`
      : (daily.review.length ? `今日の${daily.words.length}語に、もう一度出す${daily.review.length}語を加えた${dailySessionPool(daily).length}問です。` : `今日の${daily.words.length}語を1問ずつ出題します。`));
  $("#daily-open").textContent = daily.finished ? "復習ページを開く" : (daily.locked ? "今日の20語を見直す" : "今日の学習を開く");
}

export function renderDaily() {
  if (!state.dailyDays.length) return;
  const daily = dailySnapshot();
  $("#daily-day-label").textContent = daily.finished ? `全${daily.days.length}日 完了` : `DAY ${state.daily.day} / ${daily.days.length}`;
  $("#daily-learned-label").textContent = `学習済み ${daily.learned}語 / ${daily.total}語`;
  $("#daily-page-progress-bar").style.width = `${Math.round((daily.learned / daily.total) * 100)}%`;
  $("#daily-title").textContent = daily.finished ? "300語を一周しました" : (daily.locked ? `DAY ${daily.shownDay} は完了しました` : "今日の20語");
  const status = [];
  if (daily.locked) status.push(`<p class="daily-note"><strong>今日の分は完了しています。</strong>次の DAY ${state.daily.day} の20語は明日から始められます。今日はこのまま見直すか、まちがえた単語を復習しましょう。</p>`);
  if (daily.finished) status.push(`<p class="daily-note"><strong>全${daily.total}語の学習が終わりました。</strong>まちがえた単語の復習を続けるか、下のボタンでリセットして最初から回せます。</p>`);
  const last = state.daily.history[0];
  if (last) status.push(`<p class="daily-note">前回（DAY ${last.day}・${last.date}）は ${last.correct} / ${last.total} 問正解でした。`
    + `${last.wrong ? `まちがえた${last.wrong}語は${daily.locked ? "次回" : "今日"}の出題に入ります。` : "全問正解です。"}</p>`);
  $("#daily-status").innerHTML = status.join("");
  const questionCount = dailySessionPool(daily).length;
  $("#daily-start").classList.toggle("is-hidden", daily.finished || daily.locked);
  $("#daily-start").textContent = `今日のテストを始める（${questionCount}問）`;
  $("#daily-retry").classList.toggle("is-hidden", !daily.locked);
  $("#daily-retry").textContent = `今日の20語をもう一度テストする（${questionCount}問）`;
  $("#daily-review-quiz").classList.toggle("is-hidden", daily.review.length === 0);
  $("#daily-review-quiz").textContent = `もう一度出す${daily.review.length}語だけ復習する`;
  $("#daily-review").classList.toggle("is-hidden", daily.review.length === 0);
  if (daily.review.length) {
    $("#daily-review").innerHTML = `<h2 class="daily-section-title">もう一度出す${daily.review.length}語</h2>
      <p class="daily-review-note">前回まちがえた語と、気になる✓を付けた語です。正解すると次回から外れます。</p>
      <div class="word-list">${daily.review.map((word) => wordRowHtml(word, { showExample: true })).join("")}</div>`;
    bindWordRowAudio($("#daily-review"));
  }
  $("#daily-list-title").textContent = daily.finished ? "" : `DAY ${daily.shownDay} の20語`;
  $("#daily-list-title").classList.toggle("is-hidden", daily.finished);
  $("#daily-word-list").innerHTML = daily.words.map((word) => wordRowHtml(word, { showExample: true })).join("");
  bindWordRowAudio($("#daily-word-list"));
  $("#daily-history").innerHTML = state.daily.history.length
    ? `<h2 class="daily-section-title">これまでの記録</h2><div class="daily-history-list">${state.daily.history.slice(0, 10).map((item) => `
        <div class="daily-history-row"><span>DAY ${item.day}</span><small>${escapeHtml(item.date)}</small><strong>${item.correct} / ${item.total}</strong><small>${item.wrong ? `まちがい${item.wrong}語` : "全問正解"}</small></div>`).join("")}</div>`
    : "";
  renderDailyBanner();
}

// まちがえた単語を先に、そのあと今日の20語。解き直しでは同じ語が二度出ないようにする。
function dailySessionPool(daily) {
  const reviewIds = new Set(daily.review.map((word) => word.id));
  return [...daily.review, ...shuffle(daily.words.filter((word) => !reviewIds.has(word.id)))];
}

export function startDailySession() {
  const daily = dailySnapshot();
  if (daily.finished) return startDailyReview();
  // 今日の分が済んでいるときは、次の20語ではなく同じ20語の解き直しにする。
  if (daily.locked) return startDailyRetry();
  const pool = dailySessionPool(daily);
  if (!pool.length) return;
  // 1語1問なので出題数は絞らない。
  startQuiz(pool, "daily", state.vocabularyDirection, state.words, { limit: pool.length, keepOrder: true });
}

// 解き直しはまちがいの記録には反映するが、日付は進めない。
export function startDailyRetry() {
  const daily = dailySnapshot();
  const pool = dailySessionPool(daily);
  if (!pool.length) return;
  startQuiz(pool, "daily-retry", state.vocabularyDirection, state.words, { limit: pool.length, keepOrder: true });
}

export function startDailyReview() {
  const daily = dailySnapshot();
  if (!daily.review.length) return alert("復習する単語はありません。");
  startQuiz(daily.review, "daily-review", state.vocabularyDirection, state.words, { limit: daily.review.length, keepOrder: true });
}

// テスト終了時に、まちがえた単語を次回へ回す（正解するまで持ち越す）。
export function completeDailySession() {
  const { questions, answers, source } = state.quiz;
  const wrong = questions.filter((word, index) => !answers[index]?.correct).map((word) => word.id);
  const asked = new Set(questions.map((word) => word.id));
  const marked = state.quiz.markedForReview || new Set();
  const daily = state.daily;
  // 出題して正解した語は外す。ただし、まちがえた語と「気になる」を付けた語は残す。
  daily.pendingReview = [...new Set([...daily.pendingReview.filter((id) => !asked.has(id) || wrong.includes(id) || marked.has(id)), ...wrong])];
  if (source === "daily") {
    daily.history.unshift({ day: daily.day, date: localDateKey(), total: questions.length, correct: state.quiz.correct, wrong: wrong.length });
    daily.history = daily.history.slice(0, 30);
    daily.lastDate = localDateKey();
    daily.day = Math.min(daily.day + 1, state.dailyDays.length + 1);
  }
  saveDaily();
  renderDailyBanner();
}

export function resetDaily() {
  if (!window.confirm("毎日20語の進み具合をリセットします。DAY 1 からやり直しますか？")) return;
  state.daily = { day: 1, lastDate: "", pendingReview: [], history: [] };
  saveDaily();
  renderDaily();
}

// 気になるマークを付けた語は、まちがえたときと同じように次回の毎日20語へ回す。
export function markWordForDailyReview(word) {
  if (word.level !== DAILY_LEVEL || !state.dailyDays.length) return;
  const index = state.dailyDays.findIndex((day) => day.some((item) => item.id === word.id));
  // まだ学んでいない先の日の単語は前倒ししない。
  if (index < 0 || index + 1 > state.daily.day) return;
  // テスト中に付けた場合、その回で正解していても出題から外さない。
  if (state.quiz.markedForReview) state.quiz.markedForReview.add(word.id);
  if (state.daily.pendingReview.includes(word.id)) return;
  state.daily.pendingReview.push(word.id);
  saveDaily();
  renderDailyBanner();
  if (state.currentView === "daily") renderDaily();
}
