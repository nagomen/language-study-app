// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, $$, setMobileMenu } from "../shared.js";
import { activeAudio, exampleAudioFile, playAudioFile, speak, speakWithBrowser, stopAudio } from "./audio.js";
import { categoryById, closeCategoryDetail, openCategory, renderCategories, renderWordCategoryOptions, startCategoryPractice, startCategoryQuiz } from "./categories.js";
import { clearChecked, exportChecked, importCheckedFile, renderChecked, startCheckedPractice, startCheckedQuiz, toggleChecked } from "./checked.js";
import { buildDailyDays, renderDaily, resetDaily, startDailyRetry, startDailyReview, startDailySession } from "./daily.js";
import { guideById, openGuide, renderGuide, startGuidePractice, startMeasurePractice } from "./guide.js";
import { renderExamHub, startMockExam } from "./mock.js";
import { closePractice, nextPracticeQuestion, playPracticeAudio, playPracticeReviewAudio, retryPractice, startPractice } from "./practice.js";
import { renderProgress, updateSummary } from "./progress.js";
import { nextQuestion, retryQuiz, revealQuizExample, startQuiz, startReviewQuiz } from "./quiz.js";
import { renderReview } from "./review.js";
import { reviewSessions, state } from "./state.js";
import { resetProgress, setVocabularyDirection } from "./storage.js";
import { renderLevels, renderWords } from "./words.js";

async function init() {
  bindEvents();
  await loadWords();
  state.dailyDays = buildDailyDays();
  renderLevels();
  renderWordCategoryOptions();
  renderWords();
  renderCategories();
  renderChecked();
  renderDaily();
  renderProgress();
  updateSummary();
  routeFromHash();
}

async function loadWords() {
  try {
    const responses = await Promise.all([1, 2, 3].map((level) => fetch(`data/hsk${level}.json`)));
    const [tagResponse, guideResponse, measureResponse, bankResponse, ...mockResponses] = await Promise.all([
      fetch("data/word-tags.json"),
      fetch("data/guides.json"),
      fetch("data/measure-words.json"),
      fetch("data/practice-banks.json"),
      ...[1, 2, 3].map((level) => fetch(`data/mock-hsk${level}.json`)),
    ]);
    if (responses.some((response) => !response.ok)) throw new Error("JSONの読み込みに失敗しました");
    if (mockResponses.some((response) => !response.ok)) throw new Error("模試データの読み込みに失敗しました");
    if (!tagResponse.ok) throw new Error("分類データの読み込みに失敗しました");
    if (!guideResponse.ok || !measureResponse.ok) throw new Error("解説データの読み込みに失敗しました");
    if (!bankResponse.ok) throw new Error("練習問題データの読み込みに失敗しました");
    const groups = await Promise.all(responses.map((response) => response.json()));
    const mockGroups = await Promise.all(mockResponses.map((response) => response.json()));
    const tagData = await tagResponse.json();
    state.categories = tagData.categories || [];
    state.guides = (await guideResponse.json()).guides || [];
    state.measure = await measureResponse.json();
    state.banks = await bankResponse.json();
    state.words = groups.flatMap((group, index) => group.map((word, wordIndex) => {
      const id = word.id || `hsk${index + 1}-${wordIndex + 1}`;
      return { ...word, level: index + 1, id, tags: tagData.words?.[id] || [] };
    }));
    mockGroups.forEach((form) => { state.mockForms[form.level] = form; });
  } catch (error) {
    $("#level-grid").innerHTML = `<p class="empty-state">単語データを読み込めませんでした。<br><code>スタート.command</code> から起動してください。</p>`;
    console.error(error);
  }
}

function bindEvents() {
  window.addEventListener("hashchange", routeFromHash);
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
  $(".mobile-menu").addEventListener("click", () => setMobileMenu(!$(".sidebar").classList.contains("is-open")));
  $(".mobile-backdrop").addEventListener("click", () => setMobileMenu(false));
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMobileMenu(false);
  });
  $$("[data-vocabulary-direction]").forEach((button) => button.addEventListener("click", () => setVocabularyDirection(button.dataset.vocabularyDirection)));
  setVocabularyDirection(state.vocabularyDirection);
  $("#random-quiz").addEventListener("click", () => startQuiz(state.words, "all", state.vocabularyDirection));
  $("#review-quiz").addEventListener("click", () => startReviewQuiz(state.vocabularyDirection));
  $("#open-categories").addEventListener("click", () => closeCategoryDetail());
  $("#daily-open").addEventListener("click", () => navigate("daily"));
  $("#daily-start").addEventListener("click", startDailySession);
  $("#daily-retry").addEventListener("click", startDailyRetry);
  $("#daily-review-quiz").addEventListener("click", startDailyReview);
  $("#daily-reset").addEventListener("click", resetDaily);
  $("#open-exam").addEventListener("click", () => navigate("exam"));
  $("#audio-speed").value = String(state.audioSpeed);
  $("#audio-speed").addEventListener("change", (event) => {
    state.audioSpeed = Number(event.target.value) || 1;
    localStorage.setItem("hsk-audio-speed", String(state.audioSpeed));
    if (activeAudio) activeAudio.playbackRate = state.audioSpeed;
  });
  $$('[data-practice]').forEach((button) => button.addEventListener("click", () => startPractice(button.dataset.practice, Number($("#practice-level").value))));
  $(".mock-grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mock-level]");
    if (button) startMockExam(Number(button.dataset.mockLevel), button.dataset.mockSection || null);
  });
  $("#practice-close").addEventListener("click", closePractice);
  $("#practice-next").addEventListener("click", nextPracticeQuestion);
  $("#practice-audio").addEventListener("click", () => playPracticeAudio(false));
  $("#practice-script-audio").addEventListener("click", playPracticeReviewAudio);
  $("#practice-retry").addEventListener("click", retryPractice);
  $("#practice-home").addEventListener("click", () => {
    // 分類・解説から始めた練習は、元のページへ戻れるほうが続けやすい。
    const last = state.practice.lastStart;
    if (last?.guideId === "measure") openCategory("measure");
    else if (last?.guideId) openGuide(last.guideId);
    else if (last?.categoryId) openCategory(last.categoryId);
    else navigate("exam");
  });
  $("#quiz-close").addEventListener("click", () => {
    const { source, questions, answers } = state.quiz;
    const isDaily = String(source).startsWith("daily");
    const answered = answers.filter(Boolean).length;
    // 途中でやめた回は完了にせず、同じ問題をもう一度出す。先に知らせてから閉じる。
    if (isDaily && answered > 0 && answered < questions.length
      && !window.confirm(`まだ${questions.length - answered}問残っています。途中でやめると今日の分は完了にならず、同じ${questions.length}問をもう一度出題します。やめますか？`)) return;
    navigate(isDaily ? "daily" : "home");
  });
  $("#next-question").addEventListener("click", nextQuestion);
  $("#speak-button").addEventListener("click", () => speak(state.quiz.questions[state.quiz.index], $("#speak-button")));
  $("#quiz-example-reveal").addEventListener("click", revealQuizExample);
  $("#quiz-example-audio").addEventListener("click", () => {
    const word = state.quiz.questions[state.quiz.index];
    if (!word?.example) return;
    revealQuizExample();
    playAudioFile(exampleAudioFile(word), $("#quiz-example-audio"), { fallbackText: word.example, role: "female" });
  });
  $("#retry-quiz").addEventListener("click", retryQuiz);
  $("#back-home").addEventListener("click", () => navigate("home"));
  $("#word-search").addEventListener("input", renderWords);
  $("#category-search").addEventListener("input", renderCategories);
  $("#word-hide-meaning").addEventListener("click", () => {
    state.wordHideMeaning = !state.wordHideMeaning;
    $("#word-hide-meaning").classList.toggle("is-checked", state.wordHideMeaning);
    $("#word-hide-meaning").setAttribute("aria-pressed", String(state.wordHideMeaning));
    renderWords();
  });
  $("#word-list").addEventListener("click", (event) => {
    if (!state.wordHideMeaning || event.target.closest("button")) return;
    const card = event.target.closest(".word-entry");
    if (card) card.classList.toggle("is-open");
  });
  $("#word-category").addEventListener("change", (event) => {
    state.wordCategory = event.target.value;
    renderWords();
  });
  $$(".category-filter-chip").forEach((button) => button.addEventListener("click", () => {
    state.categoryFilter = button.dataset.categoryLevel;
    $$(".category-filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
    renderCategories();
  }));
  $("#category-back").addEventListener("click", closeCategoryDetail);
  // トピックのページからは、まとめのページへ戻る。
  $("#guide-back").addEventListener("click", () => {
    const parent = guideById(state.selectedGuide)?.parent;
    if (parent && guideById(parent)) openGuide(parent);
    else closeCategoryDetail();
  });
  $("#guide-practice").addEventListener("click", () => startGuidePractice());
  $("#measure-quiz").addEventListener("click", startMeasurePractice);
  $("#category-quiz").addEventListener("click", () => startCategoryQuiz());
  $$("[data-category-practice]").forEach((button) => button.addEventListener("click", () => startCategoryPractice(button.dataset.categoryPractice)));
  $("#category-open-words").addEventListener("click", () => {
    state.wordCategory = state.selectedCategory || "all";
    $("#word-category").value = state.wordCategory;
    navigate("words");
  });
  $$(".filter-chip").forEach((button) => button.addEventListener("click", () => {
    if (!button.dataset.level) return;
    state.wordFilter = button.dataset.level;
    $$(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
    renderWords();
  }));
  $("#reset-progress").addEventListener("click", resetProgress);
  document.addEventListener("click", (event) => {
    const checkButton = event.target.closest("[data-check-id]");
    if (checkButton) toggleChecked(checkButton.dataset.checkId);
    const categoryButton = event.target.closest("[data-category-open]");
    if (categoryButton) openCategory(categoryButton.dataset.categoryOpen);
    const guideButton = event.target.closest("[data-guide-open]");
    if (guideButton) openGuide(guideButton.dataset.guideOpen);
    // 解説・量詞ページの短いフレーズには録音がないので、ブラウザの音声で読み上げる。
    const speakButton = event.target.closest("[data-speak]");
    if (speakButton) {
      stopAudio();
      speakWithBrowser(speakButton.dataset.speak, speakButton, { rate: Math.max(.6, .75 * state.audioSpeed) });
    }
  });
  $("#open-checked").addEventListener("click", () => navigate("checked"));
  $$("[data-check-filter]").forEach((button) => button.addEventListener("click", () => {
    const target = button.dataset.checkFilter;
    state.checkedOnly[target] = !state.checkedOnly[target];
    button.classList.toggle("is-active", state.checkedOnly[target]);
    button.setAttribute("aria-pressed", String(state.checkedOnly[target]));
    if (target === "categories") renderCategories(); else renderWords();
  }));
  $("#checked-list").addEventListener("click", (event) => {
    const button = event.target.closest("[data-checked-audio]");
    if (!button) return;
    const word = state.words.find((item) => item.id === button.dataset.checkedAudio);
    if (button.dataset.checkedKind === "sentence") playAudioFile(exampleAudioFile(word), button, { fallbackText: word?.example, role: "female" });
    else speak(word, button);
  });
  $$("[data-checked-action]").forEach((button) => button.addEventListener("click", () => {
    const action = button.dataset.checkedAction;
    if (action === "quiz") startCheckedQuiz(); else startCheckedPractice(action);
  }));
  $("#clear-checked").addEventListener("click", clearChecked);
  $("#export-checked").addEventListener("click", exportChecked);
  $("#import-checked").addEventListener("click", () => $("#import-checked-file").click());
  $("#import-checked-file").addEventListener("change", (event) => {
    importCheckedFile(event.target.files[0]);
    event.target.value = "";
  });
  $$("[data-review-scope]").forEach((button) => button.addEventListener("click", () => {
    const key = button.closest(".review-panel")?.dataset.reviewKey;
    if (!reviewSessions[key]) return;
    reviewSessions[key].scope = button.dataset.reviewScope;
    renderReview(key);
  }));
}

export function navigate(view) {
  window.location.hash = view;
  if (window.location.hash === `#${view}`) showView(view);
}

function routeFromHash() {
  const [requested, param] = (window.location.hash.replace("#", "") || "home").split("/");
  const publicViews = ["home", "daily", "words", "categories", "guide", "checked", "exam", "progress"];
  if (!publicViews.includes(requested)) return showView(state.currentView);
  // 分類ページは #categories/travel、解説ページは #guide/de の形で、開いている内容まで復元する。
  if (requested === "categories") state.selectedCategory = param && categoryById(param) ? param : null;
  if (requested === "guide") {
    const guide = guideById(param) || guideById(state.selectedGuide) || state.guides[0];
    if (!guide) return showView(state.currentView);
    state.selectedGuide = guide.id;
  }
  showView(requested);
}

export function showView(view) {
  state.currentView = view;
  $$(".view").forEach((section) => section.classList.toggle("is-visible", section.id === `${view}-view`));
  $$(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
  setMobileMenu(false);
  if (view === "daily") renderDaily();
  if (view === "words") renderWords();
  if (view === "categories") renderCategories();
  if (view === "guide") renderGuide();
  if (view === "checked") renderChecked();
  if (view === "exam") renderExamHub();
  if (view === "progress") renderProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", init);
