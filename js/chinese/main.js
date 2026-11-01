// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, $$, activateView, bindCheckedFileActions, bindMobileNavigation } from "../shared.js";
import { grammarAudioFile, grammarAudioTexts } from "./grammar-audio.js";
import { activeAudio, exampleAudioFile, playAudioFile, speak, speakWithBrowser, stopAudio } from "./audio.js";
import { categoryById, closeCategoryDetail, openCategory, renderCategories, renderWordCategoryOptions, startCategoryPractice, startCategoryQuiz } from "./categories.js";
import { clearChecked, exportChecked, importCheckedFile, renderChecked, startCheckedPractice, startCheckedQuiz, toggleChecked } from "./checked.js";
import { buildDailyDays, getDailyListeningSet, renderDaily, resetDaily, startDailyNextSet, startDailyRetry, startDailyReview, startDailySession } from "./daily.js";
import { continueUnit, grammarRedirect, openGrammarMap, openUnit, renderGrammar, unitById, updateGrammarHome } from "./grammar.js";
import { guideById, openGuide, renderGuide, startGuidePractice, startMeasurePractice } from "./guide.js";
import { renderExamHub, startMockExam } from "./mock.js";
import { clearPracticeTimer, closePractice, nextPracticeQuestion, playPracticeAudio, playPracticeReviewAudio, retryPractice, startPractice } from "./practice.js";
import { renderProgress, updateSummary } from "./progress.js";
import { nextQuestion, retryQuiz, revealQuizExample, startNewWordsQuiz, startQuiz, startReviewQuiz } from "./quiz.js";
import { state } from "./state.js";
import { resetProgress, setVocabularyDirection } from "./storage.js";
import { getFilteredWords, renderLevels, renderWords } from "./words.js";

// 録音のある文法の文（初回に作って使い回す）
let grammarTextSet = null;
function recordedGrammarTexts() {
  if (!grammarTextSet && state.grammar) grammarTextSet = new Set(grammarAudioTexts(state.grammar, state.guides).map((item) => item.text));
  return grammarTextSet || new Set();
}

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
  updateGrammarHome();
  const newWordsCount = state.words.filter((word) => word.newIn2026).length;
  $("#new-words-count-label").textContent = `2026年版で加わった${newWordsCount}語から10問`;
  routeFromHash();
}

async function loadWords() {
  try {
    // データを更新したときに古いJSONを掴まないよう、毎回サーバーに確認させる
    // （変わっていなければ304で返るので通信量はほとんど増えない）。
    const loadJson = (file) => fetch(`${file}?v=20261004-hsk3-full`, { cache: "no-store" });
    const vocabularyResponses = await Promise.all([
      ...[1, 2, 3].map((level) => loadJson(`data/chinese/hsk${level}.json`)),
      loadJson("data/chinese/hsk-legacy-supplement.json"),
    ]);
    const responses = vocabularyResponses.slice(0, 3);
    const supplementResponse = vocabularyResponses[3];
    const [tagResponse, categoryGuideResponse, guideResponse, grammarResponse, syllabusResponse, measureResponse, bankResponse, ...mockResponses] = await Promise.all([
      loadJson("data/chinese/word-tags.json"),
      loadJson("data/chinese/category-guides.json"),
      loadJson("data/chinese/guides.json"),
      loadJson("data/chinese/grammar.json"),
      loadJson("data/source/grammar/hsk-grammar-syllabus.json"),
      loadJson("data/chinese/measure-words.json"),
      loadJson("data/chinese/practice-banks.json"),
      ...[1, 2, 3].map((level) => loadJson(`data/chinese/mock-hsk${level}.json`)),
      loadJson("data/chinese/mock-hsk3-v3.json"),
    ]);
    if (responses.some((response) => !response.ok) || !supplementResponse.ok) throw new Error("JSONの読み込みに失敗しました");
    if (mockResponses.some((response) => !response.ok)) throw new Error("模試データの読み込みに失敗しました");
    if (!tagResponse.ok) throw new Error("分類データの読み込みに失敗しました");
    if (!categoryGuideResponse.ok) throw new Error("分類別学習データの読み込みに失敗しました");
    if (!guideResponse.ok || !measureResponse.ok || !grammarResponse.ok || !syllabusResponse.ok) throw new Error("解説データの読み込みに失敗しました");
    if (!bankResponse.ok) throw new Error("練習問題データの読み込みに失敗しました");
    const groups = await Promise.all(responses.map((response) => response.json()));
    const supplement = await supplementResponse.json();
    const mockGroups = await Promise.all(mockResponses.map((response) => response.json()));
    const tagData = await tagResponse.json();
    state.categories = tagData.categories || [];
    state.categoryGuides = (await categoryGuideResponse.json()).guides || {};
    state.guides = (await guideResponse.json()).guides || [];
    state.grammar = await grammarResponse.json();
    state.grammarSyllabus = (await syllabusResponse.json()).items || [];
    state.measure = await measureResponse.json();
    state.banks = await bankResponse.json();
    const officialWords = groups.flatMap((group, index) => group.map((word, wordIndex) => {
      const id = word.id || `hsk${index + 1}-${wordIndex + 1}`;
      return { ...word, level: index + 1, id, tags: tagData.words?.[id] || [] };
    }));
    state.words = [...officialWords, ...supplement.map((word) => ({
      ...word,
      legacySupplement: true,
      tags: tagData.words?.[word.id] || word.tags || [],
    }))];
    mockGroups.forEach((form) => { state.mockForms[form.key || form.level] = form; });
  } catch (error) {
    $("#level-grid").innerHTML = `<p class="empty-state">単語データを読み込めませんでした。<br><code>スタート.command</code> から起動してください。</p>`;
    console.error(error);
  }
}

function bindEvents() {
  window.addEventListener("hashchange", routeFromHash);
  bindMobileNavigation(navigate);
  $$("[data-vocabulary-direction]").forEach((button) => button.addEventListener("click", () => setVocabularyDirection(button.dataset.vocabularyDirection)));
  setVocabularyDirection(state.vocabularyDirection);
  $("#random-quiz").addEventListener("click", () => startQuiz(state.words, "all", state.vocabularyDirection));
  $("#new-words-quiz").addEventListener("click", () => startNewWordsQuiz(state.vocabularyDirection));
  $("#word-filter-quiz").addEventListener("click", () => {
    const pool = getFilteredWords();
    const distractorPool = pool.length >= 4 ? pool : state.words;
    startQuiz(pool, "word-filter", state.vocabularyDirection, distractorPool);
  });
  $("#review-quiz").addEventListener("click", () => startReviewQuiz(state.vocabularyDirection));
  $("#open-categories").addEventListener("click", () => closeCategoryDetail());
  $("#daily-open").addEventListener("click", () => navigate("daily"));
  $("#daily-listening-open").addEventListener("click", startDailyListening);
  $("#daily-listening-start").addEventListener("click", startDailyListening);
  $("#daily-start").addEventListener("click", startDailySession);
  $("#daily-next-set").addEventListener("click", startDailyNextSet);
  $("#daily-retry").addEventListener("click", startDailyRetry);
  $("#daily-review-quiz").addEventListener("click", startDailyReview);
  $("#daily-reset").addEventListener("click", resetDaily);
  $("#open-exam").addEventListener("click", () => navigate("exam"));
  $("#audio-speed").value = String(state.audioSpeed);
  $("#audio-speed").addEventListener("change", (event) => {
    state.audioSpeed = Number(event.target.value) || 1;
    try { localStorage.setItem("hsk-audio-speed", String(state.audioSpeed)); } catch {}
    if (activeAudio) activeAudio.playbackRate = state.audioSpeed;
  });
  $$('[data-practice]').forEach((button) => button.addEventListener("click", () => startPractice(button.dataset.practice, Number($("#practice-level").value))));
  $(".mock-grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mock-level]");
    if (button) startMockExam(Number(button.dataset.mockLevel), button.dataset.mockSection || null, button.dataset.mockVersion || "2.0");
  });
  $("#practice-close").addEventListener("click", closePractice);
  $("#practice-next").addEventListener("click", nextPracticeQuestion);
  $("#practice-audio").addEventListener("click", () => playPracticeAudio(false));
  $("#practice-script-audio").addEventListener("click", playPracticeReviewAudio);
  $("#practice-retry").addEventListener("click", retryPractice);
  $("#practice-home").addEventListener("click", () => {
    // 分類・解説から始めた練習は、元のページへ戻れるほうが続けやすい。
    const last = state.practice.lastStart;
    if (last?.returnView === "daily") navigate("daily");
    else if (last?.unitId) openUnit(last.unitId);
    else if (last?.guideId === "measure") openCategory("measure");
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
  // コラムのページからは文法の一覧へ戻る（コラムは文法の一覧に並んでいる）。
  $("#guide-back").addEventListener("click", () => openGrammarMap());
  $("#guide-practice").addEventListener("click", () => startGuidePractice());
  $("#measure-quiz").addEventListener("click", startMeasurePractice);
  $("#category-quiz").addEventListener("click", () => startCategoryQuiz());
  $$("[data-category-practice]").forEach((button) => button.addEventListener("click", () => startCategoryPractice(button.dataset.categoryPractice)));
  $("#category-open-words").addEventListener("click", () => {
    state.wordCategory = state.selectedCategory || "all";
    $("#word-category").value = state.wordCategory;
    navigate("words");
  });
  $$('[data-word-level]').forEach((button) => button.addEventListener("click", () => {
    state.wordFilter = button.dataset.wordLevel;
    $$('[data-word-level]').forEach((chip) => {
      const active = chip === button;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });
    renderWords();
  }));
  $$('[data-word-edition]').forEach((button) => button.addEventListener("click", () => {
    state.wordEditionFilter = button.dataset.wordEdition;
    $$('[data-word-edition]').forEach((chip) => {
      const active = chip === button;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });
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
    // 文法：値が空なら一覧、"continue" なら続きの単元、それ以外は単元ID
    const grammarButton = event.target.closest("[data-grammar-open]");
    if (grammarButton) {
      const target = grammarButton.dataset.grammarOpen;
      if (!target) openGrammarMap();
      else openUnit(target === "continue" ? continueUnit()?.id : target);
    }
    // 文法の例文は録音を再生する。録音のない短いフレーズ（量詞ページなど）はブラウザの音声で読み上げる。
    const speakButton = event.target.closest("[data-speak]");
    if (speakButton) {
      const text = speakButton.dataset.speak;
      if (recordedGrammarTexts().has(text)) playAudioFile(grammarAudioFile(text), speakButton, { fallbackText: text, role: "female" });
      else {
        stopAudio();
        speakWithBrowser(text, speakButton, { rate: Math.max(.6, .75 * state.audioSpeed) });
      }
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
  bindCheckedFileActions({ clearChecked, exportChecked, importCheckedFile });
}

function startDailyListening() {
  const listening = getDailyListeningSet();
  if (!listening.words.length) return alert("今日のリスニングに出題できる例文がありません。");
  startPractice("listening", 3, listening.words, {
    label: `DAY ${listening.day} · 今日の${listening.words.length}リスニング`,
    modeLabel: `今日の${listening.words.length}リスニング`,
    count: listening.words.length,
    sentenceOnly: true,
    dailyListening: true,
    returnView: "daily",
    returnLabel: `今日の${listening.words.length}語へ`,
  });
}

export function navigate(view) {
  window.location.hash = view;
  if (window.location.hash === `#${view}`) showView(view);
}

function routeFromHash() {
  const [requested, param] = (window.location.hash.replace("#", "") || "home").split("/");
  const publicViews = ["home", "daily", "words", "categories", "grammar", "guide", "checked", "exam", "progress"];
  if (!publicViews.includes(requested)) return showView(state.currentView);
  // 改修前の文法ページ（#guide/bi など）は、対応する新しい単元へ転送する（コラムはそのまま開く）。
  if (requested === "guide" && grammarRedirect(param)) return window.location.replace(`#${grammarRedirect(param)}`);
  if (requested === "grammar") state.selectedUnit = param && unitById(param) ? param : null;
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
  // 模試の途中でほかの画面へ移ったら、裏でタイマーが進んで結果画面に切り替わらないよう止める。
  if (view !== "practice" && state.practice.timerId) {
    clearPracticeTimer();
    stopAudio();
  }
  state.currentView = view;
  activateView(view);
  if (view === "daily") renderDaily();
  if (view === "words") renderWords();
  if (view === "categories") renderCategories();
  if (view === "grammar") renderGrammar();
  if (view === "guide") renderGuide();
  if (view === "checked") renderChecked();
  if (view === "exam") renderExamHub();
  if (view === "progress") renderProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 何かの拍子にこのモジュールが2回読まれても、初期化は1回だけにする。
// （2回走るとイベントの登録も倍になり、チェックの付け外しが打ち消し合う）
document.addEventListener("DOMContentLoaded", () => {
  if (window.__chineseAppStarted) return;
  window.__chineseAppStarted = true;
  init();
});
