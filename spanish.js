"use strict";

const LEVELS = ["A1", "A2", "B1"];
const LEVEL_META = {
  A1: { name: "Acceso", title: "最初の一歩", description: "あいさつ、家族、数字、食事など毎日の基本語彙。" },
  A2: { name: "Plataforma", title: "暮らしを話す", description: "旅行、買い物、健康、仕事など身近な場面の語彙。" },
  B1: { name: "Umbral", title: "自分の考えを伝える", description: "意見、社会、文化、感情など会話を広げる語彙。" },
};
const STORAGE_KEY = "language-app-spanish-progress-v1";
const CHECKED_KEY = "language-app-spanish-checked-v1";
const QUIZ_SIZE = 10;
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const state = {
  words: [],
  byLevel: {},
  currentView: "home",
  filter: "all",
  checked: loadChecked(),
  checkedOnly: false,
  quiz: [],
  quizIndex: 0,
  quizCorrect: 0,
  quizAnswers: [],
  review: { entries: [], scope: "all" },
  lastQuizSource: null,
  answeredCurrent: false,
  progress: loadProgress(),
};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  try {
    const lists = await Promise.all(LEVELS.map((level) => fetch(`data/dele-${level.toLowerCase()}.json`).then(checkResponse).then((response) => response.json())));
    LEVELS.forEach((level, index) => { state.byLevel[level] = lists[index]; });
    state.words = lists.flat();
    bindEvents();
    renderLevels();
    renderWords();
    renderChecked();
    renderProgress();
    renderHomeStats();
    routeFromHash();
  } catch (error) {
    console.error(error);
    $("#total-words-label").textContent = "語彙を読み込めませんでした";
    $("#level-grid").innerHTML = '<p class="empty-state">サーバーから起動し直してください。</p>';
  }
}

function checkResponse(response) {
  if (!response.ok) throw new Error(`Vocabulary load failed: ${response.status}`);
  return response;
}

function bindEvents() {
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
  $(".mobile-menu").addEventListener("click", () => setMobileMenu(!$(".sidebar").classList.contains("is-open")));
  $(".mobile-backdrop").addEventListener("click", () => setMobileMenu(false));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMobileMenu(false);
  });
  $("#random-quiz").addEventListener("click", () => startQuiz(state.words, "all"));
  $("#review-quiz").addEventListener("click", startReviewQuiz);
  $("#quiz-close").addEventListener("click", () => navigate("home"));
  $("#next-question").addEventListener("click", nextQuestion);
  $("#speak-button").addEventListener("click", () => speakSpanish(state.quiz[state.quizIndex]?.word, $("#speak-button")));
  $("#retry-quiz").addEventListener("click", retryQuiz);
  $("#back-home").addEventListener("click", () => navigate("home"));
  $("#word-search").addEventListener("input", renderWords);
  $$(".filter-chip").forEach((button) => button.addEventListener("click", () => {
    state.filter = button.dataset.level;
    $$(".filter-chip").forEach((item) => item.classList.toggle("is-active", item === button));
    renderWords();
  }));
  $("#word-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-speak-id]");
    if (!button) return;
    speakSpanish(state.words.find((word) => word.id === button.dataset.speakId)?.word, button);
  });
  $("#reset-progress").addEventListener("click", () => {
    if (!window.confirm("スペイン語の学習記録をリセットしますか？")) return;
    localStorage.removeItem(STORAGE_KEY);
    state.progress = defaultProgress();
    renderProgress();
    renderHomeStats();
  });
  $$("[data-review-scope]").forEach((button) => button.addEventListener("click", () => {
    state.review.scope = button.dataset.reviewScope;
    renderReview();
  }));
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-check-id]");
    if (button) toggleChecked(button.dataset.checkId);
  });
  $("#open-checked").addEventListener("click", () => navigate("checked"));
  $("#check-filter").addEventListener("click", () => {
    state.checkedOnly = !state.checkedOnly;
    $("#check-filter").classList.toggle("is-active", state.checkedOnly);
    $("#check-filter").setAttribute("aria-pressed", String(state.checkedOnly));
    renderWords();
  });
  $("#checked-quiz").addEventListener("click", startCheckedQuiz);
  $("#clear-checked").addEventListener("click", clearChecked);
  $("#export-checked").addEventListener("click", exportChecked);
  $("#import-checked").addEventListener("click", () => $("#import-checked-file").click());
  $("#import-checked-file").addEventListener("change", (event) => {
    importCheckedFile(event.target.files[0]);
    event.target.value = "";
  });
  $("#checked-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-checked-audio]");
    if (!button) return;
    speakSpanish(state.words.find((word) => word.id === button.dataset.checkedAudio)?.word, button);
  });
  window.addEventListener("hashchange", routeFromHash);
}

function navigate(view) {
  if (window.location.hash === `#${view}`) showView(view);
  else window.location.hash = view;
}

function routeFromHash() {
  const requested = window.location.hash.replace("#", "") || "home";
  const publicViews = ["home", "words", "checked", "progress"];
  showView(publicViews.includes(requested) ? requested : state.currentView);
}

function showView(view) {
  state.currentView = view;
  $$(".view").forEach((section) => section.classList.toggle("is-visible", section.id === `${view}-view`));
  $$(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  setMobileMenu(false);
  if (view === "progress") renderProgress();
  if (view === "checked") renderChecked();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setMobileMenu(open) {
  $(".sidebar").classList.toggle("is-open", open);
  document.body.classList.toggle("nav-open", open);
  $(".mobile-menu").setAttribute("aria-expanded", String(open));
  $(".mobile-menu").setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
}

function renderLevels() {
  const grid = $("#level-grid");
  grid.innerHTML = "";
  LEVELS.forEach((level) => {
    const fragment = $("#level-card-template").content.cloneNode(true);
    fragment.querySelector(".level-number strong").textContent = level;
    fragment.querySelector(".level-name").textContent = LEVEL_META[level].name;
    fragment.querySelector("h3").textContent = LEVEL_META[level].title;
    fragment.querySelector("p").textContent = LEVEL_META[level].description;
    fragment.querySelector(".word-count").textContent = `${state.byLevel[level].length}語`;
    fragment.querySelector(".start-level").addEventListener("click", () => startQuiz(state.byLevel[level], level));
    grid.append(fragment);
  });
  $("#total-words-label").textContent = `全${state.words.length}語を収録`;
}

function startQuiz(pool, source) {
  if (!pool.length) return;
  state.quiz = sample(pool, Math.min(QUIZ_SIZE, pool.length));
  state.quizIndex = 0;
  state.quizCorrect = 0;
  state.quizAnswers = [];
  state.lastQuizSource = source;
  showView("quiz");
  renderQuestion();
}

function startReviewQuiz() {
  const wrong = new Set(state.progress.wrongIds);
  const pool = state.words.filter((word) => wrong.has(word.id));
  if (pool.length) startQuiz(pool, "review");
}

function retryQuiz() {
  if (state.lastQuizSource === "checked") startCheckedQuiz();
  else if (state.lastQuizSource === "review") startReviewQuiz();
  else if (LEVELS.includes(state.lastQuizSource)) startQuiz(state.byLevel[state.lastQuizSource], state.lastQuizSource);
  else startQuiz(state.words, "all");
}

function renderQuestion() {
  const word = state.quiz[state.quizIndex];
  if (!word) return finishQuiz();
  state.answeredCurrent = false;
  $("#quiz-step").textContent = `${state.quizIndex + 1} / ${state.quiz.length}`;
  $("#quiz-progress-bar").style.width = `${(state.quizIndex / state.quiz.length) * 100}%`;
  $("#quiz-level").textContent = word.level;
  $("#quiz-word").textContent = word.word;
  $("#quiz-category").textContent = `${word.pos} · ${word.category}`;
  $("#answer-feedback").textContent = "";
  $("#answer-feedback").className = "answer-feedback";
  $("#next-question").classList.add("is-hidden");

  const distractors = uniqueBy(state.words.filter((item) => item.id !== word.id && item.meaning !== word.meaning), (item) => item.meaning);
  const options = shuffle([word, ...sample(distractors, 3)]);
  const list = $("#answer-list");
  list.innerHTML = "";
  options.forEach((option, index) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.dataset.key = String.fromCharCode(65 + index);
    button.dataset.id = option.id;
    button.textContent = option.meaning;
    button.addEventListener("click", () => answerQuestion(button, option));
    list.append(button);
  });
}

function answerQuestion(button, choice) {
  if (state.answeredCurrent) return;
  state.answeredCurrent = true;
  const word = state.quiz[state.quizIndex];
  const correct = choice.id === word.id;
  state.quizAnswers[state.quizIndex] = { choice, correct };
  const buttons = $$("#answer-list .answer-button");
  buttons.forEach((item) => {
    item.disabled = true;
    if (item.dataset.id === word.id) item.classList.add("is-correct");
  });
  if (!correct) button.classList.add("is-wrong");
  else state.quizCorrect += 1;
  recordAnswer(word, correct);
  const feedback = $("#answer-feedback");
  feedback.className = `answer-feedback ${correct ? "correct" : "wrong"}`;
  feedback.textContent = correct ? `¡Correcto! 「${word.meaning}」` : `正解は「${word.meaning}」です。`;
  $("#next-question").textContent = state.quizIndex + 1 === state.quiz.length ? "結果を見る →" : "次の問題へ →";
  $("#next-question").classList.remove("is-hidden");
}

function nextQuestion() {
  state.quizIndex += 1;
  renderQuestion();
}

function finishQuiz() {
  $("#result-correct").textContent = state.quizCorrect;
  $("#result-total").textContent = state.quiz.length;
  const rate = state.quiz.length ? state.quizCorrect / state.quiz.length : 0;
  $("#result-message").textContent = rate === 1 ? "¡Perfecto! 全問正解です。" : rate >= 0.8 ? "¡Muy bien! かなり身についています。" : rate >= 0.6 ? "¡Bien! 間違えた単語を復習しましょう。" : "少しずつで大丈夫。音も聞きながら繰り返しましょう。";
  $("#quiz-progress-bar").style.width = "100%";
  setReview(buildQuizReview());
  showView("result");
  renderHomeStats();
}

function buildQuizReview() {
  return state.quiz.map((word, index) => {
    const answer = state.quizAnswers[index];
    return {
      number: index + 1,
      status: !answer ? "skipped" : answer.correct ? "correct" : "wrong",
      tag: `${word.level} · ${word.pos}`,
      lines: [{ label: "問題", text: word.word }, { label: "分野", text: word.category }],
      your: answer ? answer.choice.meaning : "",
      answer: word.meaning,
      speakText: word.word,
      wordId: word.id,
    };
  });
}

function setReview(entries) {
  state.review = { entries, scope: "all" };
  renderReview();
}

function renderReview() {
  const panel = $("#quiz-review");
  const { entries, scope } = state.review;
  panel.classList.toggle("is-hidden", !entries.length);
  if (!entries.length) return;
  const missed = entries.filter((entry) => entry.status !== "correct");
  panel.querySelector(".review-count-total").textContent = entries.length;
  panel.querySelector(".review-count-missed").textContent = missed.length;
  panel.querySelectorAll("[data-review-scope]").forEach((button) => {
    const isActive = button.dataset.reviewScope === scope;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  const shown = scope === "wrong" ? missed : entries;
  panel.querySelector(".review-list").innerHTML = shown.map((entry) => reviewItemHtml(entry)).join("");
  const empty = panel.querySelector(".review-empty");
  empty.textContent = "まちがいはありません。¡Perfecto!";
  empty.classList.toggle("is-hidden", shown.length > 0);
  panel.querySelectorAll("[data-review-speak]").forEach((button) => {
    button.addEventListener("click", () => speakSpanish(button.dataset.reviewSpeak, button));
  });
}

function reviewItemHtml(entry) {
  const marks = { correct: "正解", wrong: "まちがい", skipped: "未回答" };
  const yourClass = entry.status === "correct" ? " is-correct" : entry.status === "wrong" ? " is-wrong" : "";
  return `<li class="review-item is-${entry.status}">
    <div class="review-item-head"><span class="review-index">${entry.number}</span><span class="review-tag">${escapeHtml(entry.tag)}</span><span class="review-mark">${marks[entry.status]}</span>${checkButtonHtml(entry.wordId)}</div>
    ${entry.lines.filter((line) => line.text).map((line) => `<p class="review-line"><span>${escapeHtml(line.label)}</span><b>${escapeHtml(line.text)}</b></p>`).join("")}
    <div class="review-answers">
      <div class="review-answer${yourClass}"><span>あなたの回答</span><strong>${escapeHtml(entry.your || "未回答")}</strong></div>
      <div class="review-answer is-correct"><span>正解</span><strong>${escapeHtml(entry.answer)}</strong></div>
    </div>
    <button class="review-audio" type="button" data-review-speak="${escapeHtml(entry.speakText)}"><span aria-hidden="true">▶</span> 発音をもう一度聞く</button>
  </li>`;
}

function recordAnswer(word, correct) {
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

function renderWords() {
  if (!state.words.length) return;
  const query = normalize($("#word-search").value.trim());
  const filtered = state.words.filter((word) => {
    const matchesLevel = state.filter === "all" || word.level === state.filter;
    const haystack = normalize(`${word.word} ${word.meaning} ${word.pos} ${word.category}`);
    return matchesLevel && haystack.includes(query) && (!state.checkedOnly || state.checked.has(word.id));
  });
  $("#word-count").textContent = `${filtered.length}語を表示`;
  $("#empty-words").classList.toggle("is-hidden", filtered.length > 0);
  const list = $("#word-list");
  list.innerHTML = "";
  filtered.forEach((word) => {
    const row = document.createElement("article");
    row.className = "word-row";
    const term = document.createElement("div");
    term.className = "spanish-term";
    term.innerHTML = `<strong>${escapeHtml(word.word)}</strong><small>${word.level}</small>`;
    const meaning = document.createElement("div"); meaning.className = "meaning"; meaning.textContent = word.meaning;
    const pos = document.createElement("div"); pos.className = "word-pos"; pos.textContent = word.pos;
    const category = document.createElement("div"); category.className = "word-category"; category.textContent = word.category;
    const speak = document.createElement("button"); speak.className = "speak-mini"; speak.type = "button"; speak.dataset.speakId = word.id; speak.setAttribute("aria-label", `${word.word}の発音を聞く`); speak.textContent = "▶";
    const actions = document.createElement("div"); actions.className = "row-actions";
    actions.innerHTML = checkButtonHtml(word.id);
    actions.append(speak);
    row.append(term, meaning, pos, category, actions);
    list.append(row);
  });
}

function loadChecked() {
  try {
    const saved = JSON.parse(localStorage.getItem(CHECKED_KEY) || "[]");
    return new Set(Array.isArray(saved) ? saved : []);
  } catch { return new Set(); }
}

function saveChecked() {
  try { localStorage.setItem(CHECKED_KEY, JSON.stringify([...state.checked])); } catch {}
}

function checkButtonHtml(id) {
  const checked = state.checked.has(id);
  const label = checked ? "チェックを外す" : "チェックを付ける";
  return `<button class="check-toggle${checked ? " is-checked" : ""}" type="button" data-check-id="${escapeHtml(id)}" aria-pressed="${checked}" aria-label="${label}" title="${label}"><span aria-hidden="true">✓</span></button>`;
}

function toggleChecked(id) {
  if (!state.words.some((word) => word.id === id)) return;
  if (state.checked.has(id)) state.checked.delete(id); else state.checked.add(id);
  saveChecked();
  const checked = state.checked.has(id);
  const label = checked ? "チェックを外す" : "チェックを付ける";
  $$(`[data-check-id="${id}"]`).forEach((button) => {
    button.classList.toggle("is-checked", checked);
    button.setAttribute("aria-pressed", String(checked));
    button.setAttribute("aria-label", label);
    button.title = label;
  });
  updateCheckedSummary();
  if (state.currentView === "checked") renderChecked();
  if (state.currentView === "words" && state.checkedOnly) renderWords();
}

function getCheckedWords() {
  return state.words.filter((word) => state.checked.has(word.id));
}

function renderChecked() {
  const list = $("#checked-list");
  if (!list) return;
  const words = getCheckedWords();
  const wrong = new Set(state.progress.wrongIds);
  $("#checked-total-count").textContent = words.length;
  list.innerHTML = words.map((word) => `
    <article class="checked-card">
      <header class="example-card-head">
        <span class="mini-level">${escapeHtml(word.level)}</span>
        <div class="example-word"><strong>${escapeHtml(word.word)}</strong><span>${escapeHtml(word.pos)} · ${escapeHtml(word.category)}</span><small>${escapeHtml(word.meaning)}</small></div>
        <div class="row-actions">
          ${checkButtonHtml(word.id)}
          <button class="checked-speak" type="button" data-checked-audio="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.word)}の発音を聞く">▶</button>
        </div>
      </header>
      <div class="checked-body"><p class="checked-stats">${wrong.has(word.id) ? "まちがい復習に登録中" : "まちがい記録なし"}</p></div>
    </article>`).join("");
  $("#empty-checked").classList.toggle("is-hidden", words.length > 0);
  $("#clear-checked").classList.toggle("is-hidden", words.length === 0);
  $("#export-checked").classList.toggle("is-hidden", words.length === 0);
  $("#checked-quiz").disabled = words.length === 0;
}

function updateCheckedSummary() {
  const count = state.checked.size;
  const label = $("#checked-count-label");
  if (label) label.textContent = count ? `${count}語からテスト` : "気になる単語に✓を付けましょう";
  const badge = $("#checked-nav-count");
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle("is-hidden", count === 0);
  }
}

function startCheckedQuiz() {
  const words = getCheckedWords();
  if (!words.length) return;
  startQuiz(words, "checked");
}

function exportChecked() {
  const ids = getCheckedWords().map((word) => word.id);
  if (!ids.length) return;
  const payload = { app: "language-study-app", type: "checked", language: "spanish", exportedAt: new Date().toISOString(), ids };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `checked-spanish-${localDateKey(new Date())}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function importCheckedFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => window.alert("ファイルを読み込めませんでした。");
  reader.onload = () => {
    const ids = parseCheckedFile(String(reader.result));
    if (!ids) return window.alert("チェックの書き出しファイルとして読み込めませんでした。");
    const known = ids.filter((id) => state.words.some((word) => word.id === id));
    if (!known.length) return window.alert("この単語データに一致するIDがありませんでした。スペイン語用の書き出しファイルか確認してください。");
    const added = known.filter((id) => !state.checked.has(id));
    const ignored = ids.length - known.length;
    const message = `${known.length}語のチェックを読み込みます。\n新しく追加: ${added.length}語（現在のチェック${state.checked.size}語はそのまま残ります）`
      + (ignored ? `\n一致しないID ${ignored}件は無視します。` : "");
    if (!window.confirm(message)) return;
    added.forEach((id) => state.checked.add(id));
    saveChecked();
    renderChecked();
    updateCheckedSummary();
    window.alert(added.length ? `${added.length}語を追加しました。` : "すべて登録済みでした。");
  };
  reader.readAsText(file);
}

function parseCheckedFile(text) {
  try {
    const parsed = JSON.parse(text);
    const ids = Array.isArray(parsed) ? parsed : parsed?.ids;
    return Array.isArray(ids) ? [...new Set(ids.filter((id) => typeof id === "string"))] : null;
  } catch { return null; }
}

function clearChecked() {
  if (!state.checked.size || !window.confirm("チェックをすべて解除しますか？")) return;
  state.checked.clear();
  saveChecked();
  $$("[data-check-id]").forEach((button) => {
    button.classList.remove("is-checked");
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "チェックを付ける");
    button.title = "チェックを付ける";
  });
  renderChecked();
  updateCheckedSummary();
}

function renderProgress() {
  const progress = state.progress;
  $("#stat-answered").textContent = progress.answered;
  $("#stat-correct").textContent = progress.correct;
  $("#stat-rate").textContent = progress.answered ? `${Math.round((progress.correct / progress.answered) * 100)}%` : "—";
  const list = $("#level-progress-list");
  list.innerHTML = "";
  LEVELS.forEach((level) => {
    const item = progress.levels[level];
    const rate = item.answered ? Math.round((item.correct / item.answered) * 100) : 0;
    const row = document.createElement("div");
    row.className = "progress-row";
    row.innerHTML = `<strong>${level}</strong><div class="progress-bar"><span style="width:${rate}%"></span></div><span>${item.answered ? `${rate}%` : "—"}</span>`;
    list.append(row);
  });
}

function renderHomeStats() {
  const today = new Date();
  const weekStart = new Date(today); weekStart.setDate(today.getDate() - 6);
  const weekly = Object.entries(state.progress.daily).filter(([date]) => new Date(`${date}T12:00:00`) >= weekStart).reduce((sum, [, count]) => sum + count, 0);
  $("#week-count").textContent = weekly;
  $("#sidebar-streak").textContent = `${calculateStreak()}日`;
  const count = state.progress.wrongIds.length;
  $("#review-count-label").textContent = count ? `${count}語から最大10問` : "復習する単語はありません";
  $("#review-quiz").disabled = count === 0;
  updateCheckedSummary();
}

function calculateStreak() {
  const days = new Set(Object.keys(state.progress.daily).filter((date) => state.progress.daily[date] > 0));
  let cursor = new Date();
  if (!days.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDateKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  return streak;
}

function speakSpanish(text, button) {
  if (!text || !("speechSynthesis" in window)) {
    window.alert("このブラウザでは音声読み上げを利用できません。");
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  const preferredNames = ["Mónica", "Monica", "Jorge", "Paulina", "Marisol"];
  utterance.voice = preferredNames.map((name) => voices.find((voice) => voice.name.includes(name) && voice.lang.startsWith("es"))).find(Boolean)
    || voices.find((voice) => voice.lang.toLowerCase() === "es-es")
    || voices.find((voice) => voice.lang.toLowerCase().startsWith("es"))
    || null;
  utterance.lang = utterance.voice?.lang || "es-ES";
  utterance.rate = 0.88;
  button?.classList.add("is-playing");
  utterance.onend = utterance.onerror = () => button?.classList.remove("is-playing");
  window.speechSynthesis.speak(utterance);
}

function defaultProgress() {
  return { answered: 0, correct: 0, wrongIds: [], daily: {}, levels: { A1: { answered: 0, correct: 0 }, A2: { answered: 0, correct: 0 }, B1: { answered: 0, correct: 0 } } };
}

function loadProgress() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const base = defaultProgress();
    if (!stored || typeof stored !== "object") return base;
    return { ...base, ...stored, levels: { ...base.levels, ...(stored.levels || {}) }, wrongIds: Array.isArray(stored.wrongIds) ? stored.wrongIds : [], daily: stored.daily || {} };
  } catch { return defaultProgress(); }
}

function saveProgress() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
function localDateKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }
function shuffle(items) { const result = [...items]; for (let i = result.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
function sample(items, count) { return shuffle(items).slice(0, count); }
function uniqueBy(items, key) { const seen = new Set(); return items.filter((item) => { const value = key(item); if (seen.has(value)) return false; seen.add(value); return true; }); }
function normalize(value) { return value.toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
function escapeHtml(value) { return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]); }
