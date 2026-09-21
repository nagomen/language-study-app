const LEVEL_META = {
  1: { name: "BEGINNER", title: "はじめの中国語", description: "あいさつや数字など、基本の単語からスタート。" },
  2: { name: "ELEMENTARY", title: "日常会話の基礎", description: "身近な話題を表現する語彙を身につけよう。" },
  3: { name: "INTERMEDIATE", title: "表現を広げる", description: "より豊かな会話につながる単語を学ぼう。" },
};

const EXAM_CONFIG = {
  1: { listening: 20, reading: 20, writing: 0, minutes: 35, sectionMinutes: { listening: 18, reading: 17 }, maxScore: 200, passScore: 120 },
  2: { listening: 35, reading: 25, writing: 0, minutes: 50, sectionMinutes: { listening: 28, reading: 22 }, maxScore: 200, passScore: 120 },
  3: { listening: 40, reading: 30, writing: 10, minutes: 85, sectionMinutes: { listening: 40, reading: 30, writing: 15 }, maxScore: 300, passScore: 180 },
};

const SKILL_LABELS = { vocabulary: "単語", listening: "聴解", reading: "読解", writing: "作文" };

const REVIEW_SUB_LABELS = { "reading-comprehension": "設問", "reading-judge": "★の文", meaning: "ピンイン", fill: "訳", grammar: "訳" };
const reviewSessions = { quiz: { entries: [], scope: "all" }, practice: { entries: [], scope: "all" } };
const CHECKED_KEY = "hsk-checked-words";

// HSK3を毎日20語ずつ。並び順は固定の種から作るので、日ごとの20語は毎回同じで重複もしない。
const DAILY_KEY = "hsk3-daily-v1";
const DAILY_LEVEL = 3;
const DAILY_SIZE = 20;
const DAILY_SEED = 20260913;

// 分類ページのグループ見出し。data/word-tags.json の group と対応する。
const CATEGORY_GROUP_META = {
  pos: { eyebrow: "PARTS OF SPEECH", label: "品詞でさがす", description: "数詞・量詞・形容詞など、ことばの種類ごとにまとめています。" },
  topic: { eyebrow: "TOPICS & SCENES", label: "場面・テーマでさがす", description: "旅行・食事・仕事など、使う場面ごとにまとめています。" },
};
// この語数以上の分類は、まぎらわしい選択肢を同じ分類の中から作る。
const CATEGORY_QUIZ_MIN_POOL = 10;
// 分類ページから開ける解説ページ。分類ID → ガイドID。
const CATEGORY_GUIDES = { particle: "de", degree: "bi", preposition: "ba", conjunction: "conjunction", direction: "complement", verb: "complement" };


const state = {
  words: [],
  categories: [],
  guides: [],
  measure: null,
  // 作文・聴解の問題文（data/practice-banks.json）。配列の順番が音声ファイルの連番に対応する。
  banks: { writing: [], listeningResponses: [], listeningDialogues: [] },
  selectedGuide: null,
  mockForms: {},
  audioSpeed: loadAudioSpeed(),
  vocabularyDirection: loadVocabularyDirection(),
  currentView: "home",
  wordFilter: "all",
  wordCategory: "all",
  wordHideMeaning: false,
  categoryFilter: "all",
  selectedCategory: null,
  checked: loadCheckedIds(CHECKED_KEY),
  checkedOnly: { words: false, categories: false },
  daily: loadDaily(),
  dailyDays: [],
  quiz: { questions: [], index: 0, correct: 0, answered: false, source: null, direction: "cn-ja", answers: [] },
  practice: emptyPractice(),
  progress: loadProgress(),
};

let activeAudio = null;
let speechRunId = 0;


document.addEventListener("DOMContentLoaded", init);

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

function navigate(view) {
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

function showView(view) {
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


function renderLevels() {
  const grid = $("#level-grid");
  grid.innerHTML = "";
  [1, 2, 3].forEach((level) => {
    const card = $("#level-card-template").content.firstElementChild.cloneNode(true);
    const words = state.words.filter((word) => word.level === level);
    card.dataset.level = level;
    card.querySelector(".level-number strong").textContent = level;
    card.querySelector(".level-name").textContent = LEVEL_META[level].name;
    card.querySelector("h3").textContent = LEVEL_META[level].title;
    card.querySelector("p").textContent = LEVEL_META[level].description;
    card.querySelector(".word-count").textContent = `${words.length}語を収録`;
    card.querySelector(".start-level").addEventListener("click", () => startQuiz(words, level, state.vocabularyDirection));
    grid.append(card);
  });
}

function startQuiz(pool, source, direction = "cn-ja", distractorPool = null, options = {}) {
  if (!pool.length) {
    alert("このレベルにはまだ単語が登録されていません。");
    return;
  }
  // 出題数が少ない復習・チェックでは、選択肢が足りなくならないよう全単語から誤答を作る。
  const choicePool = distractorPool?.length ? [...distractorPool] : [...pool];
  // 毎日20語は順番（復習→新出）を保ったまま全問出す。ふだんの単語テストは10問までランダム。
  const ordered = options.keepOrder ? [...pool] : shuffle([...pool]);
  const questions = ordered.slice(0, Math.min(options.limit || 10, pool.length));
  state.quiz = { questions, choicePool, index: 0, correct: 0, answered: false, source, direction, answers: [], markedForReview: new Set() };
  showView("quiz");
  renderQuestion();
}

function startReviewQuiz(direction = state.vocabularyDirection) {
  const ids = Object.entries(state.progress.mistakes).filter(([, count]) => count > 0).map(([id]) => id);
  startQuiz(state.words.filter((word) => ids.includes(word.id)), "review", direction, state.words);
}

function renderQuestion() {
  const { questions, index } = state.quiz;
  const word = questions[index];
  if (!word) return finishQuiz();
  const isReverse = state.quiz.direction === "ja-cn";
  state.quiz.answered = false;
  $("#quiz-level").textContent = `HSK ${word.level}`;
  $("#quiz-step").textContent = `${index + 1} / ${questions.length}`;
  $("#quiz-progress-bar").style.width = `${(index / questions.length) * 100}%`;
  $("#quiz-kind").textContent = isReverse ? "中国語を選んでください" : "意味を選んでください";
  $("#question-label").textContent = isReverse ? "この日本語に合う中国語は？" : "この単語の意味は？";
  $(".question-card").classList.toggle("is-reverse", isReverse);
  $("#quiz-hanzi").textContent = isReverse ? word.meaning : word.hanzi;
  $("#quiz-pinyin").textContent = isReverse ? "" : word.pinyin;
  $("#quiz-pinyin").classList.toggle("is-hidden", isReverse);
  $("#speak-button").classList.toggle("is-hidden", isReverse);
  $("#answer-feedback").textContent = "";
  $("#answer-feedback").className = "answer-feedback";
  $("#quiz-example").classList.add("is-hidden");
  $("#next-question").classList.add("is-hidden");

  const distractors = shuffle((state.quiz.choicePool || state.words).filter((item) => item.id !== word.id && (isReverse ? item.hanzi !== word.hanzi : item.meaning !== word.meaning))).slice(0, 3);
  const choices = shuffle([word, ...distractors]);
  const answerList = $("#answer-list");
  answerList.innerHTML = "";
  choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.className = "answer-button";
    button.type = "button";
    button.dataset.key = String.fromCharCode(65 + index);
    button.dataset.wordId = choice.id;
    if (isReverse) {
      button.classList.add("reverse-choice");
      button.innerHTML = `<span class="choice-main">${escapeHtml(choice.hanzi)}</span><small class="choice-pinyin">${escapeHtml(choice.pinyin)}</small>`;
      button.setAttribute("aria-label", `${choice.hanzi}、${choice.pinyin}`);
    } else {
      button.textContent = choice.meaning;
    }
    button.addEventListener("click", () => submitAnswer(button, choice));
    answerList.append(button);
  });
}

function submitAnswer(selectedButton, choice) {
  if (state.quiz.answered) return;
  state.quiz.answered = true;
  const word = state.quiz.questions[state.quiz.index];
  const isCorrect = choice.id === word.id;
  const isReverse = state.quiz.direction === "ja-cn";
  state.quiz.answers[state.quiz.index] = { choice, correct: isCorrect };
  const buttons = $$(".answer-button");
  buttons.forEach((button) => {
    button.disabled = true;
    if (button.dataset.wordId === word.id) button.classList.add("is-correct");
  });
  if (isCorrect) {
    state.quiz.correct += 1;
    state.progress.correct += 1;
    state.progress.byLevel[word.level].correct += 1;
    state.progress.mistakes[word.id] = Math.max(0, (state.progress.mistakes[word.id] || 0) - 1);
    $("#answer-feedback").textContent = isReverse
      ? `正解！「${word.meaning}」は「${word.hanzi}（${word.pinyin}）」です。`
      : `正解！「${word.hanzi}」は「${word.meaning}」です。`;
    $("#answer-feedback").classList.add("correct");
  } else {
    selectedButton.classList.add("is-wrong");
    state.progress.mistakes[word.id] = (state.progress.mistakes[word.id] || 0) + 1;
    $("#answer-feedback").textContent = isReverse
      ? `正解は「${word.hanzi}（${word.pinyin}）」です。`
      : `正解は「${word.meaning}」です。`;
    $("#answer-feedback").classList.add("wrong");
  }
  state.progress.answered += 1;
  state.progress.byLevel[word.level].answered += 1;
  recordStudy(word, isCorrect, "vocabulary");
  saveProgress();
  showQuizExample(word);
  $("#next-question").classList.remove("is-hidden");
  $("#next-question").focus();
}

function showQuizExample(word) {
  const panel = $("#quiz-example");
  if (!panel) return;
  const hasExample = Boolean(word.example && word.exampleMeaning);
  // 日→中モードでは、まず和訳だけ見せて中国語の例文はボタンで開く。
  const hideTarget = hasExample && state.quiz.direction === "ja-cn";
  panel.classList.remove("is-hidden");
  panel.classList.toggle("is-empty", !hasExample);
  panel.classList.toggle("is-reverse", hideTarget);
  $("#quiz-example-target").classList.toggle("is-hidden", hideTarget);
  $("#quiz-example-reveal").classList.toggle("is-hidden", !hideTarget);
  $("#quiz-example-chinese").innerHTML = hasExample ? highlightWord(word.example, word.hanzi) : "";
  $("#quiz-example-pinyin").textContent = hasExample ? word.examplePinyin || "" : "";
  $("#quiz-example-pinyin").classList.toggle("is-hidden", !hasExample || !word.examplePinyin);
  $("#quiz-example-japanese").textContent = hasExample ? word.exampleMeaning : "";
  $("#quiz-example-japanese").classList.toggle("is-hidden", !hasExample);
  $("#quiz-example-empty").classList.toggle("is-hidden", hasExample);
  $("#quiz-example-audio").classList.toggle("is-hidden", !hasExample);
  // 正解でも「気になる」を付けられるように、答え合わせの画面にもマークを出す。
  const check = $("#quiz-check");
  const isChecked = state.checked.has(word.id);
  const label = isChecked ? "チェックを外す" : "チェックを付ける";
  check.dataset.checkId = word.id;
  check.classList.toggle("is-checked", isChecked);
  check.setAttribute("aria-pressed", String(isChecked));
  check.setAttribute("aria-label", `${word.hanzi}に${label}`);
  check.title = label;
}

function revealQuizExample() {
  $("#quiz-example-target").classList.remove("is-hidden");
  $("#quiz-example-reveal").classList.add("is-hidden");
}

function highlightWord(sentence, hanzi) {
  const escaped = escapeHtml(sentence);
  if (!hanzi) return escaped;
  return escaped.split(escapeHtml(hanzi)).join(`<b class="example-target">${escapeHtml(hanzi)}</b>`);
}

function nextQuestion() {
  state.quiz.index += 1;
  if (state.quiz.index >= state.quiz.questions.length) finishQuiz(); else renderQuestion();
}

function finishQuiz() {
  const isDaily = String(state.quiz.source).startsWith("daily");
  if (isDaily) completeDailySession();
  // 毎日20語は終えると次の日に進むので、「もう一度」ではなく次に進むボタンにする。
  $("#retry-quiz").textContent = isDaily
    ? (state.quiz.source === "daily-review" ? "もう一度復習する" : "今日の20語をもう一度")
    : "もう一度挑戦";
  $("#result-correct").textContent = state.quiz.correct;
  $("#result-total").textContent = state.quiz.questions.length;
  const rate = state.quiz.questions.length ? state.quiz.correct / state.quiz.questions.length : 0;
  $("#result-message").textContent = rate === 1 ? "全問正解、太棒了！" : rate >= .7 ? "いい調子です。このまま続けましょう！" : "復習すれば、もっと確実に身につきます。";
  setReview("quiz", buildQuizReview());
  showView("result");
  updateSummary();
}

function retryQuiz() {
  const source = state.quiz.source;
  const direction = state.quiz.direction || "cn-ja";
  if (source === "review") return startReviewQuiz(direction);
  if (source === "checked") return startCheckedQuiz();
  if (source === "daily") return startDailySession();
  if (source === "daily-retry") return startDailyRetry();
  if (source === "daily-review") return startDailyReview();
  if (typeof source === "string" && source.startsWith("category:")) return startCategoryQuiz(source.slice("category:".length));
  const pool = source === "all" ? state.words : state.words.filter((word) => word.level === Number(source));
  startQuiz(pool, source, direction);
}

function renderWords() {
  const query = $("#word-search").value.trim().toLowerCase();
  const filtered = state.words.filter((word) => {
    const matchesLevel = state.wordFilter === "all" || word.level === Number(state.wordFilter);
    const matchesCategory = state.wordCategory === "all" || (word.tags || []).includes(state.wordCategory);
    return matchesLevel && matchesCategory && wordHaystack(word).includes(query) && (!state.checkedOnly.words || state.checked.has(word.id));
  });
  const list = $("#word-list");
  list.classList.toggle("is-quiz-mode", state.wordHideMeaning);
  list.innerHTML = filtered.map((word) => wordCardHtml(word)).join("");
  bindWordRowAudio(list);
  $("#empty-words").classList.toggle("is-hidden", filtered.length > 0);
  $("#word-count-label").textContent = `${filtered.length}語`;
}

// 単語帳は1語1行。左に見出しと意味、右に例文を置く。
function wordCardHtml(word) {
  const tags = (word.tags || []).map((id) => categoryById(id)).filter(Boolean).slice(0, 2);
  return `
    <article class="word-entry" data-level="${word.level}" data-card-id="${escapeHtml(word.id)}">
      <div class="entry-head">
        <div class="entry-word">
          <span class="hanzi">${escapeHtml(word.hanzi)}</span>
          <span class="pinyin">${escapeHtml(word.pinyin)}</span>
        </div>
        <span class="mini-level">HSK ${word.level}</span>
      </div>
      <div class="entry-body">
        <p class="meaning">${escapeHtml(word.meaning)}</p>
        ${tags.length ? `<div class="word-tags">${tags.map((category) => `<button class="tag-chip" type="button" data-category-open="${escapeHtml(category.id)}" title="「${escapeHtml(category.label)}」の分類を開く">${escapeHtml(category.label)}</button>`).join("")}</div>` : ""}
      </div>
      ${word.example ? `<div class="entry-example">
        <div>
          <p class="example-chinese">${escapeHtml(word.example)}</p>
          ${word.examplePinyin ? `<p class="example-pinyin">${escapeHtml(word.examplePinyin)}</p>` : ""}
          <p class="example-japanese">${escapeHtml(word.exampleMeaning || "")}</p>
        </div>
        <button class="speak-mini example-mini" type="button" data-example-id="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の例文を聞く"><span aria-hidden="true">▶</span></button>
      </div>` : `<div class="entry-example is-empty"></div>`}
      <p class="entry-cover">タップして意味と例文を見る</p>
      <div class="entry-actions">
        ${checkButtonHtml(word.id, state.checked.has(word.id))}
        <button class="speak-mini" type="button" data-word-id="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の中国語発音を聞く"><span aria-hidden="true">声</span></button>
      </div>
    </article>`;
}

function wordHaystack(word) {
  return `${word.hanzi} ${word.pinyin} ${word.meaning} ${word.example || ""} ${word.examplePinyin || ""} ${word.exampleMeaning || ""}`.toLowerCase();
}

// 毎日20語・分類ページの一覧行。例文つきでも表示できる。
function wordRowHtml(word, { showExample = false } = {}) {
  const hasExample = showExample && Boolean(word.example);
  return `
    <article class="word-row${hasExample ? " has-example" : ""}">
      <div class="word-main">
        <div class="word-headline">
          <span class="hanzi">${escapeHtml(word.hanzi)}</span>
          <span class="pinyin">${escapeHtml(word.pinyin)}</span>
          <span class="mini-level">HSK ${word.level}</span>
        </div>
        <p class="meaning">${escapeHtml(word.meaning)}</p>
        ${wordTagsHtml(word)}
      </div>
      <div class="row-actions">
        ${checkButtonHtml(word.id, state.checked.has(word.id))}
        <button class="speak-mini" type="button" data-word-id="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の中国語発音を聞く"><span aria-hidden="true">声</span></button>
      </div>
      ${hasExample ? `<div class="word-example">
        <div><p class="example-chinese">${escapeHtml(word.example)}</p>${word.exampleMeaning ? `<p class="example-japanese">${escapeHtml(word.exampleMeaning)}</p>` : ""}</div>
        <button class="speak-mini example-mini" type="button" data-example-id="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の例文を聞く"><span aria-hidden="true">▶</span></button>
      </div>` : ""}
    </article>`;
}

function wordTagsHtml(word) {
  const tags = (word.tags || []).map((id) => categoryById(id)).filter(Boolean);
  if (!tags.length) return "";
  return `<div class="word-tags">${tags.map((category) => `<button class="tag-chip" type="button" data-category-open="${escapeHtml(category.id)}" title="「${escapeHtml(category.label)}」の分類を開く">${escapeHtml(category.label)}</button>`).join("")}</div>`;
}

function bindWordRowAudio(container) {
  if (!container) return;
  container.querySelectorAll("[data-word-id]").forEach((button) => button.addEventListener("click", () => {
    speak(state.words.find((item) => item.id === button.dataset.wordId), button);
  }));
  container.querySelectorAll("[data-example-id]").forEach((button) => button.addEventListener("click", () => {
    const word = state.words.find((item) => item.id === button.dataset.exampleId);
    playAudioFile(exampleAudioFile(word), button, { fallbackText: word?.example, role: "female" });
  }));
}

function categoryById(id) {
  return state.categories.find((category) => category.id === id) || null;
}

// 分類ページのレベル・チェックの絞り込みを通した単語。withQuery で検索語も反映する。
function categoryWords(id, { withQuery = false } = {}) {
  const query = withQuery ? $("#category-search").value.trim().toLowerCase() : "";
  return state.words.filter((word) => (word.tags || []).includes(id)
    && (state.categoryFilter === "all" || word.level === Number(state.categoryFilter))
    && (!state.checkedOnly.categories || state.checked.has(word.id))
    && (!query || wordHaystack(word).includes(query)));
}

function renderCategories() {
  const detail = state.selectedCategory ? categoryById(state.selectedCategory) : null;
  $("#category-detail").classList.toggle("is-hidden", !detail);
  $("#category-groups").classList.toggle("is-hidden", Boolean(detail));
  $("#guide-band").classList.toggle("is-hidden", Boolean(detail));
  $("#category-page-heading").classList.toggle("is-hidden", Boolean(detail));
  $("#category-detail-head").classList.toggle("is-hidden", !detail);
  if (detail) {
    $("#empty-categories").classList.add("is-hidden");
    renderCategoryDetail(detail);
  } else {
    renderGuideBand();
    renderCategoryGrid();
  }
}

function renderCategoryGrid() {
  const query = $("#category-search").value.trim().toLowerCase();
  let visible = 0;
  const html = Object.entries(CATEGORY_GROUP_META).map(([group, meta]) => {
    const cards = state.categories.filter((category) => category.group === group).map((category) => {
      const words = categoryWords(category.id);
      const matchesName = `${category.label} ${category.description}`.toLowerCase().includes(query);
      if (!words.length) return "";
      if (query && !matchesName && !words.some((word) => wordHaystack(word).includes(query))) return "";
      visible += 1;
      const preview = words.slice(0, 4).map((word) => word.hanzi).join("・");
      return `
        <button class="category-card" type="button" data-category-open="${escapeHtml(category.id)}">
          <span class="category-count"><strong>${words.length}</strong><small>語</small></span>
          <span class="category-card-body">
            <strong>${escapeHtml(category.label)}</strong>
            <small>${escapeHtml(category.description)}</small>
            <em>${escapeHtml(preview)}${words.length > 4 ? " …" : ""}</em>
          </span>
          <span class="category-card-go" aria-hidden="true">→</span>
        </button>`;
    }).join("");
    if (!cards) return "";
    return `
      <section class="category-group">
        <header class="category-group-head"><p class="eyebrow">${meta.eyebrow}</p><h2>${meta.label}</h2><p>${meta.description}</p></header>
        <div class="category-grid">${cards}</div>
      </section>`;
  }).join("");
  $("#category-groups").innerHTML = html;
  $("#category-total-count").textContent = visible;
  $("#empty-categories").classList.toggle("is-hidden", visible > 0);
}

function renderCategoryDetail(category) {
  const words = categoryWords(category.id, { withQuery: true });
  $("#category-detail-group").textContent = CATEGORY_GROUP_META[category.group]?.label || "CATEGORY";
  $("#category-detail-title").textContent = category.label;
  $("#category-detail-description").textContent = category.description;
  $("#category-detail-count").textContent = words.length;
  $("#category-total-count").textContent = state.categories.length;
  // 量詞は単語を並べるより、数え方ごとにまとめたほうが覚えやすいので専用の表示にする。
  const isMeasure = category.id === "measure" && Boolean(state.measure);
  $("#measure-guide").classList.toggle("is-hidden", !isMeasure);
  $("#measure-quiz").classList.toggle("is-hidden", !isMeasure);
  $("#category-word-list").classList.toggle("is-hidden", isMeasure);
  // その分類に対応する解説ページがあれば、一覧の上から直接開けるようにする。
  const guide = guideById(CATEGORY_GUIDES[category.id]);
  const guideLink = $("#category-guide-link");
  guideLink.classList.toggle("is-hidden", !guide);
  if (guide) {
    guideLink.dataset.guideOpen = guide.id;
    guideLink.innerHTML = `<span class="guide-card-mark">${escapeHtml(guide.mark || "文")}</span>
      <span class="guide-card-body"><strong>解説ページ：${escapeHtml(guide.title)}</strong><small>${escapeHtml(guide.blurb || "")}</small></span>
      <span class="guide-card-go" aria-hidden="true">→</span>`;
  }
  if (isMeasure) renderMeasureGuide(words);
  else {
    $("#category-word-list").innerHTML = words.map((word) => wordRowHtml(word, { showExample: true })).join("");
    bindWordRowAudio($("#category-word-list"));
  }
  $("#empty-category-words").classList.toggle("is-hidden", words.length > 0);
  $$("#category-quiz, #measure-quiz, [data-category-practice]").forEach((button) => { button.disabled = words.length === 0; });
}

function openCategory(id) {
  if (!categoryById(id)) return;
  state.selectedCategory = id;
  if (window.location.hash === `#categories/${id}`) showView("categories");
  else window.location.hash = `categories/${id}`;
}

function closeCategoryDetail() {
  state.selectedCategory = null;
  navigate("categories");
}

function startCategoryQuiz(id = state.selectedCategory) {
  const category = categoryById(id);
  if (!category) return;
  const pool = categoryWords(category.id, { withQuery: true });
  if (!pool.length) {
    alert("この条件に合う単語がありません。レベルやチェックの絞り込みを外してください。");
    return;
  }
  // 語数が十分な分類は同じ分類の中から、少ない分類は全単語から誤答の選択肢を作る。
  const distractorPool = pool.length >= CATEGORY_QUIZ_MIN_POOL ? pool : state.words;
  startQuiz(pool, `category:${category.id}`, state.vocabularyDirection, distractorPool);
}

function guideById(id) {
  return state.guides.find((guide) => guide.id === id) || null;
}

function openGuide(id) {
  if (!guideById(id)) return;
  state.selectedGuide = id;
  if (window.location.hash === `#guide/${id}`) showView("guide");
  else window.location.hash = `guide/${id}`;
}

// 解説ページのカード。分類ページ上部の帯と、まとめページの目次で共通に使う。
function guideCardHtml({ attr, mark, title, note }) {
  return `<button class="guide-card" type="button" ${attr}>
    <span class="guide-card-mark">${escapeHtml(mark || "文")}</span>
    <span class="guide-card-body"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(note || "")}</small></span>
    <span class="guide-card-go" aria-hidden="true">→</span>
  </button>`;
}

const MEASURE_CARD = { attr: 'data-category-open="measure"', mark: "量", title: "量詞（助数詞）の使い分け", note: "「数＋量詞＋名詞」で覚える特設ページ。量詞クイズつき" };

// 帯にはまとめのページだけを出す（トピック別はまとめのページの中から開く）。
function renderGuideBand() {
  const band = $("#guide-band");
  if (!band) return;
  const cards = state.guides.filter((guide) => !guide.parent)
    .map((guide) => guideCardHtml({ attr: `data-guide-open="${escapeHtml(guide.id)}"`, mark: guide.mark, title: guide.title, note: guide.blurb || guide.summary }));
  band.innerHTML = [...cards, guideCardHtml(MEASURE_CARD)].join("");
}

function renderGuide() {
  const guide = guideById(state.selectedGuide) || state.guides[0];
  if (!guide) return;
  state.selectedGuide = guide.id;
  $("#guide-back").textContent = guide.parent ? `← ${guideById(guide.parent)?.title || "まとめ"}へ戻る` : "← 分類の一覧へ戻る";
  $("#guide-eyebrow").textContent = guide.eyebrow || "GRAMMAR GUIDE";
  $("#guide-title").textContent = guide.title;
  $("#guide-summary").textContent = guide.summary;
  $("#guide-level").textContent = guide.level || "HSK";
  $("#guide-related").innerHTML = (guide.relatedCategories || []).map((id) => categoryById(id)).filter(Boolean)
    .map((category) => `<button class="tag-chip" type="button" data-category-open="${escapeHtml(category.id)}">${escapeHtml(category.label)}の単語を見る</button>`).join("");
  $("#guide-sections").innerHTML = (guide.sections || []).map(guideSectionHtml).join("");
  bindWordRowAudio($("#guide-sections"));
}

function guideSectionHtml(section) {
  const parts = [];
  if (section.body) parts.push(`<p class="guide-body">${escapeHtml(section.body)}</p>`);
  if (section.links) parts.push(`<div class="guide-band guide-links">${section.links.map((link) => guideCardHtml({
    attr: link.guideId ? `data-guide-open="${escapeHtml(link.guideId)}"` : `data-category-open="${escapeHtml(link.categoryId)}"`,
    mark: link.mark, title: link.label, note: link.note,
  })).join("")}</div>`);
  if (section.table) {
    const head = section.table.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
    const rows = section.table.rows.map((row) => `<tr>${row.map((cell, index) => `<td${index === 0 ? ' class="guide-table-key"' : ""}>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
    parts.push(`<div class="guide-table-wrap"><table class="guide-table"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`);
  }
  if (section.patterns) parts.push(`<div class="pattern-list">${section.patterns.map((pattern) => `
    <article class="pattern-card">
      <p class="pattern-formula">${escapeHtml(pattern.formula)}</p>
      ${phraseBlockHtml(pattern.example)}
      ${pattern.note ? `<p class="pattern-note">${escapeHtml(pattern.note)}</p>` : ""}
    </article>`).join("")}</div>`);
  if (section.wordExamples) parts.push(`<div class="guide-word-grid">${section.wordExamples.map((entry) => {
    const word = state.words.find((item) => item.id === entry.wordId);
    if (!word) return "";
    return `<article class="guide-word">
      <header class="guide-word-head">
        <div><strong>${escapeHtml(word.hanzi)}</strong><span>${escapeHtml(word.pinyin)}</span><small>${escapeHtml(word.meaning)}</small></div>
        <div class="row-actions">${checkButtonHtml(word.id, state.checked.has(word.id))}<button class="speak-mini" type="button" data-word-id="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の発音を聞く"><span aria-hidden="true">声</span></button></div>
      </header>
      ${phraseBlockHtml(entry.phrase)}
    </article>`;
  }).join("")}</div>`);
  if (section.compare) parts.push(`<div class="compare-list">${section.compare.map((pair) => `
    <article class="compare-card">
      <p class="compare-wrong"><span aria-hidden="true">×</span>${escapeHtml(pair.wrong)}</p>
      <p class="compare-right"><span aria-hidden="true">○</span>${escapeHtml(pair.right)}${speakButtonHtml(pair.right, "正しい文を聞く")}</p>
      <p class="compare-note">${escapeHtml(pair.meaning ? `「${pair.meaning}」と言いたいとき。${pair.note}` : pair.note)}</p>
    </article>`).join("")}</div>`);
  return `<section class="guide-section"><h2>${escapeHtml(section.heading)}</h2>${parts.join("")}</section>`;
}

function phraseBlockHtml(phrase) {
  if (!phrase) return "";
  return `<div class="phrase-block">
    <div><p class="example-chinese">${escapeHtml(phrase.cn)}</p><p class="example-pinyin">${escapeHtml(phrase.pinyin)}</p><p class="example-japanese">${escapeHtml(phrase.ja)}</p></div>
    ${speakButtonHtml(phrase.cn, `${phrase.cn}を聞く`)}
  </div>`;
}

function speakButtonHtml(text, label) {
  return `<button class="phrase-audio" type="button" data-speak="${escapeHtml(text)}" aria-label="${escapeHtml(label)}"><span aria-hidden="true">▶</span></button>`;
}

// 量詞は「数＋量詞＋名詞」の形と、数える対象をセットで見せる。
function renderMeasureGuide(words) {
  const data = state.measure;
  const container = $("#measure-guide");
  const visible = new Set(words.map((word) => word.id));
  const slot = `<section class="measure-slot">
    <h2>${escapeHtml(data.slot.title)}</h2>
    <div class="slot-row">${data.slot.cells.map((cell, index) => `
      <div class="slot-cell"><small>${escapeHtml(cell.label)}</small><strong>${escapeHtml(cell.value)}</strong><span>${escapeHtml(cell.pinyin)}</span></div>
      ${index < data.slot.cells.length - 1 ? `<span class="slot-plus" aria-hidden="true">＋</span>` : ""}`).join("")}</div>
    <p class="slot-reading">${escapeHtml(data.slot.reading)}<span>${escapeHtml(data.slot.meaning)}</span>${speakButtonHtml(data.slot.cells.map((cell) => cell.value).join(""), "例を聞く")}</p>
  </section>`;
  const rules = `<section class="measure-rules">
    <h2>使うときの4つのきまり</h2>
    <div class="measure-rule-grid">${data.rules.map((rule) => `
      <article class="measure-rule">
        <strong>${escapeHtml(rule.title)}</strong>
        <p>${escapeHtml(rule.body)}</p>
        <p class="measure-rule-example"><b>${escapeHtml(rule.example.cn)}</b><span>${escapeHtml(rule.example.pinyin)}</span><span>${escapeHtml(rule.example.ja)}</span>${speakButtonHtml(rule.example.cn, `${rule.example.cn}を聞く`)}</p>
      </article>`).join("")}</div>
  </section>`;
  const groups = data.groups.map((group) => {
    const items = data.items.filter((item) => item.group === group.id && visible.has(item.wordId));
    if (!items.length) return "";
    return `<section class="measure-group">
      <header class="measure-group-head"><h2>${escapeHtml(group.label)}<small>${items.length}語</small></h2><p>${escapeHtml(group.description)}</p></header>
      <div class="measure-grid">${items.map(measureCardHtml).join("")}</div>
    </section>`;
  }).join("");
  container.innerHTML = slot + rules + groups;
  bindWordRowAudio(container);
}

function measureCardHtml(item) {
  const word = state.words.find((entry) => entry.id === item.wordId);
  if (!word) return "";
  const nouns = (item.nouns || []).map((id) => state.words.find((entry) => entry.id === id)).filter(Boolean);
  return `<article class="measure-card">
    <header class="measure-card-head">
      <div class="measure-hanzi"><strong>${escapeHtml(word.hanzi)}</strong><span>${escapeHtml(word.pinyin)}</span></div>
      <span class="mini-level">HSK ${word.level}</span>
      <div class="row-actions">${checkButtonHtml(word.id, state.checked.has(word.id))}<button class="speak-mini" type="button" data-word-id="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の発音を聞く"><span aria-hidden="true">声</span></button></div>
    </header>
    <p class="measure-use">${escapeHtml(item.use)}</p>
    <p class="measure-phrase"><b>${escapeHtml(item.phrase.cn)}</b><span>${escapeHtml(item.phrase.pinyin)}</span><span>${escapeHtml(item.phrase.ja)}</span>${speakButtonHtml(item.phrase.cn, `${item.phrase.cn}を聞く`)}</p>
    ${nouns.length ? `<div class="measure-nouns"><small>よく数えるもの</small><div class="word-tags">${nouns.map((noun) => `<button class="tag-chip" type="button" data-word-id="${escapeHtml(noun.id)}" title="${escapeHtml(noun.meaning)}">${escapeHtml(noun.hanzi)}<small>${escapeHtml(noun.meaning)}</small></button>`).join("")}</div></div>` : ""}
    ${word.example ? `<div class="measure-example"><div><p class="example-chinese">${escapeHtml(word.example)}</p><p class="example-pinyin">${escapeHtml(word.examplePinyin || "")}</p><p class="example-japanese">${escapeHtml(word.exampleMeaning || "")}</p></div><button class="speak-mini example-mini" type="button" data-example-id="${escapeHtml(word.id)}" aria-label="例文を聞く"><span aria-hidden="true">▶</span></button></div>` : ""}
    <p class="measure-tip"><span aria-hidden="true">◎</span>${escapeHtml(item.tip)}</p>
  </article>`;
}

// 的・得・地は「どこに置くか」を問うドリル、語順は組み立て、間違いやすい形は○×で確かめる。
const DE_NOTES = { 的: "名詞の前", 地: "動詞の前", 得: "動詞のあと" };

function startGuidePractice(id = state.selectedGuide) {
  const guide = guideById(id);
  if (!guide) return;
  const authored = guide.practice.map((item) => {
    if (item.kind === "reorder") {
      return { skill: "writing", kind: "reorder", wordId: item.wordId, tokens: [...item.tokens], slots: item.slots, answer: item.answer, meaning: item.meaning, instruction: item.instruction || "語句を並べ替えて文を作ってください", explanation: item.explanation };
    }
    const isDeDrill = item.choices.every((label) => label.length <= 2 && /[的得地]$/.test(label));
    return {
      skill: "reading", kind: isDeDrill ? "slot-de" : "grammar", wordId: item.wordId,
      prompt: item.prompt, subPrompt: item.subPrompt,
      choices: shuffle(item.choices.map((label) => ({ value: label, label, ...(DE_NOTES[label] ? { note: DE_NOTES[label] } : {}) }))),
      correct: item.correct, instruction: item.instruction || (isDeDrill ? "空いているところに入るのはどれでしょう" : "正しいものを選んでください"),
      explanation: item.explanation,
    };
  });
  // 「よくある間違い」は、正しい文と間違った文を交互に見せて○×で判断させる。
  const compare = guide.sections.flatMap((section) => section.compare || []);
  const judges = shuffle(compare).slice(0, 3).map((pair, index) => {
    const showWrong = index % 2 === 0;
    return {
      skill: "reading", kind: "grammar",
      prompt: showWrong ? pair.wrong : pair.right,
      subPrompt: `「${pair.meaning}」と言いたいとき、この言い方は正しいでしょうか。`,
      choices: [{ value: "true", label: "对（正しい）" }, { value: "false", label: "不对（間違い）" }],
      correct: String(!showWrong),
      instruction: "文が正しいかどうかを選んでください",
      explanation: `${pair.note}正しくは「${pair.right}」。`,
    };
  });
  // 3つの形式が必ず混ざるようにする（de選び5・語順2・○×3）。
  const reorders = authored.filter((question) => question.kind === "reorder");
  const rest = authored.filter((question) => question.kind !== "reorder");
  const orderCount = Math.min(2, reorders.length);
  const questions = [...shuffle(rest).slice(0, 10 - judges.length - orderCount), ...shuffle(reorders).slice(0, orderCount), ...judges];
  startCustomPractice(shuffle(questions), { label: guide.title, modeLabel: "文法ドリル", level: 3, guideId: guide.id });
}

function startMeasurePractice() {
  const questions = measurePracticeQuestions();
  if (!questions.length) return alert("量詞の問題を作れませんでした。");
  startCustomPractice(questions, { label: "量詞（助数詞）", modeLabel: "量詞クイズ", level: 2, guideId: "measure" });
}

function multiAnswerValue(question, picked) {
  const order = question.choices.map((choice) => choice.value);
  return [...new Set(picked)].sort((left, right) => order.indexOf(left) - order.indexOf(right)).join("、");
}

// 量詞クイズは「数詞＋量詞＋名詞」の形に合わせて3種類を混ぜる。
//   スロット穴埋め … 三＋□＋书 の□を選ぶ
//   仕分け … その量詞で数えるものを全部選ぶ
//   時間・お金 … 引っかかりやすい手作りの問題
function measurePracticeQuestions(count = 10) {
  const data = state.measure;
  if (!data) return [];
  const wordOf = (id) => state.words.find((word) => word.id === id);
  const nounOwners = new Map();
  data.items.forEach((item) => (item.nouns || []).forEach((nounId) => {
    if (!nounOwners.has(nounId)) nounOwners.set(nounId, new Set());
    nounOwners.get(nounId).add(item.wordId);
  }));
  const drills = data.items.filter((item) => item.drill && item.nouns?.length);
  const explain = (item, measureWord) => `${measureWord.hanzi}（${measureWord.pinyin}）は${item.use}。${item.phrase.cn}＝${item.phrase.ja}`;

  // 数詞は声調が変わらない「三」にそろえ、量詞だけを考えさせる。
  const slots = shuffle(drills.flatMap((item) => item.nouns.map((nounId) => ({ item, nounId })))).flatMap(({ item, nounId }) => {
    const measureWord = wordOf(item.wordId);
    const noun = wordOf(nounId);
    if (!measureWord || !noun) return [];
    const distractors = shuffle(drills.filter((other) => other.wordId !== item.wordId && !nounOwners.get(nounId).has(other.wordId)))
      .slice(0, 3).map((other) => wordOf(other.wordId)).filter(Boolean);
    if (distractors.length < 3) return [];
    return [{
      skill: "reading", kind: "slot", wordId: item.wordId,
      slot: { number: "三", numberPinyin: "sān", noun: noun.hanzi, nounPinyin: noun.pinyin, meaning: `${noun.meaning}を3つ` },
      choices: shuffle([measureWord, ...distractors].map((word) => ({ value: word.hanzi, label: word.hanzi, pinyin: word.pinyin }))),
      correct: measureWord.hanzi, instruction: "空いているところに入る量詞を選んでください",
      explanation: explain(item, measureWord),
    }];
  });

  const multis = shuffle(drills.filter((item) => (item.nouns || []).length >= 3)).flatMap((item) => {
    const measureWord = wordOf(item.wordId);
    const answers = item.nouns.map((id) => wordOf(id)).filter(Boolean).slice(0, 3);
    const others = [...new Set(data.items.filter((other) => other.wordId !== item.wordId).flatMap((other) => other.nouns || []))]
      .filter((id) => !nounOwners.get(id)?.has(item.wordId));
    const distractors = shuffle(others).slice(0, 6 - answers.length).map((id) => wordOf(id)).filter(Boolean);
    if (!measureWord || answers.length < 2 || distractors.length < 2) return [];
    const choices = shuffle([...answers, ...distractors]).map((word) => ({ value: word.hanzi, label: word.hanzi, pinyin: word.pinyin, meaning: word.meaning }));
    const question = {
      skill: "reading", kind: "multi", wordId: item.wordId,
      prompt: measureWord.hanzi, promptPinyin: measureWord.pinyin, subPrompt: item.use,
      choices, correctCount: answers.length,
      instruction: `「${measureWord.hanzi}」で数えるものをすべて選んでください`,
      explanation: explain(item, measureWord),
    };
    question.correct = multiAnswerValue(question, answers.map((word) => word.hanzi));
    return [question];
  });

  const authored = shuffle([...(data.quiz || [])]).map((item) => ({
    skill: "reading", kind: "grammar", wordId: item.wordId,
    prompt: item.prompt, subPrompt: item.subPrompt,
    choices: shuffle(item.choices.map((label) => ({ value: label, label, pinyin: state.words.find((word) => word.hanzi === label)?.pinyin }))),
    correct: item.correct, instruction: "空欄に入る量詞を選んでください", explanation: item.explanation,
  }));

  const picked = [...slots.slice(0, 5), ...multis.slice(0, 2), ...authored.slice(0, 3)];
  return shuffle(picked).slice(0, count);
}

function startCustomPractice(questions, { label, modeLabel, level, guideId }) {
  clearPracticeTimer();
  if (!questions.length) return;
  state.practice = {
    ...emptyPractice(),
    mode: "guide",
    level,
    questions,
    sourceLabel: label,
    modeLabel,
    lastStart: { mode: "guide", level, isMock: false, guideId },
    sectionStats: {},
  };
  showView("practice");
  renderPracticeQuestion();
}

function startCategoryPractice(mode, id = state.selectedCategory) {
  const category = categoryById(id);
  if (!category) return;
  const pool = categoryWords(category.id, { withQuery: true });
  if (!pool.length) return alert("この条件に合う単語がありません。レベルやチェックの絞り込みを外してください。");
  const level = state.categoryFilter === "all" ? 3 : Number(state.categoryFilter);
  startPractice(mode, level, pool, { label: `${category.label}の単語`, categoryId: category.id });
}

function renderWordCategoryOptions() {
  const select = $("#word-category");
  if (!select) return;
  const groups = Object.entries(CATEGORY_GROUP_META).map(([group, meta]) => {
    const options = state.categories.filter((category) => category.group === group).map((category) => {
      const count = state.words.filter((word) => (word.tags || []).includes(category.id)).length;
      return `<option value="${escapeHtml(category.id)}">${escapeHtml(category.label)}（${count}）</option>`;
    }).join("");
    return options ? `<optgroup label="${escapeHtml(meta.label)}">${options}</optgroup>` : "";
  }).join("");
  select.innerHTML = `<option value="all">すべての分類</option>${groups}`;
  select.value = state.wordCategory;
  const label = $("#category-count-label");
  if (label && state.categories.length) label.textContent = `数詞・形容詞・旅行など${state.categories.length}分類から出題`;
}

function loadDaily() {
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
function buildDailyDays() {
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

function renderDailyBanner() {
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

function renderDaily() {
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

function startDailySession() {
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
function startDailyRetry() {
  const daily = dailySnapshot();
  const pool = dailySessionPool(daily);
  if (!pool.length) return;
  startQuiz(pool, "daily-retry", state.vocabularyDirection, state.words, { limit: pool.length, keepOrder: true });
}

function startDailyReview() {
  const daily = dailySnapshot();
  if (!daily.review.length) return alert("復習する単語はありません。");
  startQuiz(daily.review, "daily-review", state.vocabularyDirection, state.words, { limit: daily.review.length, keepOrder: true });
}

// テスト終了時に、まちがえた単語を次回へ回す（正解するまで持ち越す）。
function completeDailySession() {
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

function resetDaily() {
  if (!window.confirm("毎日20語の進み具合をリセットします。DAY 1 からやり直しますか？")) return;
  state.daily = { day: 1, lastDate: "", pendingReview: [], history: [] };
  saveDaily();
  renderDaily();
}




function toggleChecked(id) {
  const word = state.words.find((item) => item.id === id);
  if (!word) return;
  if (state.checked.has(id)) state.checked.delete(id); else state.checked.add(id);
  saveCheckedIds(CHECKED_KEY, state.checked);
  const checked = state.checked.has(id);
  const label = checked ? "チェックを外す" : "チェックを付ける";
  $$(`[data-check-id="${id}"]`).forEach((button) => {
    button.classList.toggle("is-checked", checked);
    button.setAttribute("aria-pressed", String(checked));
    button.setAttribute("aria-label", label);
    button.title = label;
  });
  if (checked) markWordForDailyReview(word);
  updateCheckedSummary();
  if (state.currentView === "checked") renderChecked();
  if (state.currentView === "words" && state.checkedOnly.words) renderWords();
  if (state.currentView === "categories" && state.checkedOnly.categories) renderCategories();
}

// 気になるマークを付けた語は、まちがえたときと同じように次回の毎日20語へ回す。
function markWordForDailyReview(word) {
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

function getCheckedWords() {
  return state.words.filter((word) => state.checked.has(word.id));
}

function renderChecked() {
  const list = $("#checked-list");
  if (!list) return;
  const words = getCheckedWords();
  $("#checked-total-count").textContent = words.length;
  list.innerHTML = words.map((word) => {
    const srs = state.progress.srs[word.id];
    const stats = [];
    if (srs && (srs.correct || srs.wrong)) stats.push(`正解 ${srs.correct || 0}回 · まちがい ${srs.wrong || 0}回`);
    if (state.progress.mistakes[word.id] > 0) stats.push("まちがい復習に登録中");
    if (srs?.due) stats.push(`次の復習 ${srs.due}`);
    return `<article class="checked-card">
      <header class="example-card-head">
        <span class="mini-level">HSK ${word.level}</span>
        <div class="example-word"><strong>${escapeHtml(word.hanzi)}</strong><span>${escapeHtml(word.pinyin)}</span><small>${escapeHtml(word.meaning)}</small></div>
        <div class="row-actions">
          ${checkButtonHtml(word.id, state.checked.has(word.id))}
          <button class="checked-speak" type="button" data-checked-audio="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の発音を聞く"><span aria-hidden="true">声</span></button>
        </div>
      </header>
      <div class="checked-body">
        <p class="checked-stats">${stats.length ? escapeHtml(stats.join(" · ")) : "まだ出題されていません"}</p>
        ${word.example ? `<div class="checked-example"><div><p class="example-chinese">${escapeHtml(word.example)}</p>${word.examplePinyin ? `<p class="example-pinyin">${escapeHtml(word.examplePinyin)}</p>` : ""}<p class="example-japanese">${escapeHtml(word.exampleMeaning)}</p></div><button class="checked-sentence" type="button" data-checked-audio="${escapeHtml(word.id)}" data-checked-kind="sentence"><span aria-hidden="true">▶</span> 例文を聞く</button></div>` : ""}
      </div>
    </article>`;
  }).join("");
  $("#empty-checked").classList.toggle("is-hidden", words.length > 0);
  $("#clear-checked").classList.toggle("is-hidden", words.length === 0);
  $("#export-checked").classList.toggle("is-hidden", words.length === 0);
  $$("#checked-view [data-checked-action]").forEach((button) => { button.disabled = words.length === 0; });
}





function clearChecked() {
  if (!state.checked.size || !confirm("チェックをすべて解除しますか？")) return;
  state.checked.clear();
  saveCheckedIds(CHECKED_KEY, state.checked);
  resetCheckButtons();
  renderChecked();
  updateCheckedSummary();
}

function updateCheckedSummary() {
  updateCheckedBadge(state.checked.size, "気になる単語に✓を付けましょう", (count) => `${count}語をまとめて復習`);
}

function exportChecked() {
  const ids = getCheckedWords().map((word) => word.id);
  if (!ids.length) return alert("チェックした単語がありません。");
  downloadCheckedFile("chinese", ids);
}

function importCheckedFile(file) {
  readCheckedFile(file, (ids) => {
    if (!ids) return alert("チェックの書き出しファイルとして読み込めませんでした。");
    const known = ids.filter((id) => state.words.some((word) => word.id === id));
    if (!known.length) return alert("この単語データに一致するIDがありませんでした。中国語用の書き出しファイルか確認してください。");
    const added = known.filter((id) => !state.checked.has(id));
    const ignored = ids.length - known.length;
    const message = `${known.length}語のチェックを読み込みます。\n新しく追加: ${added.length}語（現在のチェック${state.checked.size}語はそのまま残ります）`
      + (ignored ? `\n一致しないID ${ignored}件は無視します。` : "");
    if (!confirm(message)) return;
    added.forEach((id) => state.checked.add(id));
    saveCheckedIds(CHECKED_KEY, state.checked);
    renderChecked();
    updateCheckedSummary();
    alert(added.length ? `${added.length}語を追加しました。` : "すべて登録済みでした。");
  });
}

function startCheckedQuiz() {
  const words = getCheckedWords();
  if (!words.length) return alert("チェックした単語がありません。");
  startQuiz(words, "checked", state.vocabularyDirection, state.words);
}

function startCheckedPractice(mode) {
  const words = getCheckedWords();
  if (!words.length) return alert("チェックした単語がありません。");
  startPractice(mode, 3, words);
}

function renderProgress() {
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

function updateSummary() {
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

function loadProgress() {
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

function saveProgress() { localStorage.setItem("hsk-study-progress", JSON.stringify(state.progress)); }

function resetProgress() {
  if (!confirm("学習記録をすべてリセットしますか？")) return;
  localStorage.removeItem("hsk-study-progress");
  state.progress = loadProgress();
  renderProgress();
  updateSummary();
}

function emptyPractice() {
  return { mode: null, level: 1, questions: [], index: 0, correct: 0, answered: false, isMock: false, remainingSeconds: 0, timerId: null, currentSection: null, timedOutSections: [], sectionStats: {}, lastStart: null };
}

function renderExamHub() {
  $("#due-word-count").textContent = getDueWords().length;
  // セクション別練習のボタンは、模試の構成（問数・持ち時間）から作る。
  $$("[data-mock-sections]").forEach((container) => {
    const level = Number(container.dataset.mockSections);
    const config = EXAM_CONFIG[level];
    container.innerHTML = ["listening", "reading", "writing"].filter((skill) => config[skill] > 0).map((skill) => {
      const poolSize = state.mockForms[level]?.questions?.filter((question) => question.skill === skill).length || config[skill];
      const poolLabel = poolSize > config[skill] ? `・全${poolSize}問から抽選` : "";
      return `<button class="mock-section-button" type="button" data-mock-level="${level}" data-mock-section="${skill}">${SKILL_LABELS[skill]}だけ<small>${config[skill]}問・${config.sectionMinutes[skill]}分${poolLabel}</small></button>`;
    }).join("");
  });
}

function getLevelPool(level) {
  return state.words.filter((word) => word.level <= level);
}

// 練習の出題語は、選んだ級の語を7割、下の級を復習として3割にし、1回の中では同じ語を出さない。
const PRACTICE_TARGET_RATIO = 0.7;

function drawPracticeWords(level, count, source = null) {
  if (count <= 0) return [];
  if (source?.length) return repeatToCount(shuffle([...source]), count);
  const target = shuffle(state.words.filter((word) => word.level === level));
  const review = shuffle(state.words.filter((word) => word.level < level));
  const targetCount = review.length ? Math.min(target.length, Math.round(count * PRACTICE_TARGET_RATIO)) : count;
  const picked = [...target.slice(0, targetCount), ...review.slice(0, count - targetCount)];
  return shuffle(repeatToCount([...picked, ...target.slice(targetCount), ...review.slice(count - targetCount)], count));
}

// 分類やチェックのように語数が問題数より少ないときだけ、ひと通り出し切ってから繰り返す。
function repeatToCount(words, count) {
  if (!words.length) return [];
  const result = [...words];
  while (result.length < count) result.push(...shuffle([...words]));
  return result.slice(0, count);
}

// 誤答の選択肢は正解と同じ級の語から作る（足りないときだけ全体から補う）。
function sameLevelDistractors(word, pool) {
  const same = pool.filter((item) => item.level === word.level && item.id !== word.id);
  return same.length >= 8 ? same : pool.filter((item) => item.id !== word.id);
}

// 出題形式の比率。級が上がるほど、1語の聞き取りから例文・対話へ比重を移す。
function mixedKinds(mix, count) {
  const total = Object.values(mix).reduce((sum, share) => sum + share, 0);
  const kinds = Object.entries(mix).flatMap(([kind, share]) => Array(Math.round(count * share / total)).fill(kind));
  const fallback = Object.keys(mix)[0];
  while (kinds.length < count) kinds.push(fallback);
  return shuffle(kinds.slice(0, count));
}

function startPractice(mode, level, source = null, sourceMeta = null) {
  clearPracticeTimer();
  let questions = [];
  let actualLevel = level;
  if (mode === "writing") {
    actualLevel = 3;
    $("#practice-level").value = "3";
    questions = makeWritingQuestions(10);
  } else if (mode === "listening") {
    questions = makeListeningQuestions(actualLevel, 10, source);
  } else if (mode === "reading") {
    questions = makeReadingQuestions(actualLevel, 10, source);
  } else if (mode === "srs") {
    const due = getDueWords();
    const reviewPool = due.length ? due : shuffle([...getLevelPool(actualLevel)]).sort((a, b) => masteryScore(a) - masteryScore(b)).slice(0, 10);
    const readingKinds = ["meaning", "pinyin", "fill"];
    questions = reviewPool.slice(0, 10).map((word, index) => index % 2
      ? makeReadingQuestion(word, word.level, readingKinds[Math.floor(index / 2) % readingKinds.length])
      : makeListeningQuestion(word, word.level, index % 4 ? "sentence" : "word"));
  }
  if (!questions.length) return alert("出題できる問題がありません。");
  const categoryId = sourceMeta?.categoryId || null;
  state.practice = {
    ...emptyPractice(),
    mode,
    level: actualLevel,
    questions,
    sourceLabel: source ? sourceMeta?.label || "チェックした単語" : "",
    lastStart: { mode, level: actualLevel, isMock: false, checked: Boolean(source) && !categoryId, categoryId },
    sectionStats: {},
  };
  showView("practice");
  renderPracticeQuestion();
}

function drawMockQuestions(form, section = null) {
  const skills = section ? [section] : ["listening", "reading", "writing"];
  return skills.flatMap((skill) => {
    const skillQuestions = form.questions.filter((question) => question.skill === skill);
    const partSelection = form.questionSelection?.[skill];
    if (!partSelection) return skillQuestions;
    return Object.entries(partSelection)
      .sort(([partA], [partB]) => Number(partA) - Number(partB))
      .flatMap(([part, count]) => shuffle(skillQuestions.filter((question) => question.part === Number(part))).slice(0, count));
  });
}

function startMockExam(level, section = null) {
  const form = state.mockForms[level];
  const sourceQuestions = form?.questions?.length ? drawMockQuestions(form, section) : [];
  if (!sourceQuestions?.length) return alert("模試データを読み込めませんでした。");
  // 模試データは正解を先頭に持つため、受けるたびに選択肢を並べ替える（对／不对は順序を保つ）。
  const questions = JSON.parse(JSON.stringify(sourceQuestions)).map((question) => ({
    ...question,
    choices: question.choices && !isJudgeChoices(question.choices) ? shuffle([...question.choices]) : question.choices,
    mockFormat: question.skill === "writing",
    selected: [],
  }));
  state.practice = {
    ...emptyPractice(), mode: "mock", level, questions, isMock: true, section,
    lastStart: { mode: "mock", level, isMock: true, section }, sectionStats: {},
  };
  showView("practice");
  $("#practice-timer").classList.remove("is-hidden");
  renderPracticeQuestion();
}

function isJudgeChoices(choices) {
  return choices.every((choice) => choice.value === "true" || choice.value === "false");
}

const LISTENING_MIX = {
  1: { word: 7, sentence: 3 },
  2: { word: 5, sentence: 4, dialogue: 1 },
  3: { word: 3, sentence: 5, dialogue: 2 },
};

function makeListeningQuestions(level, count, source = null) {
  const banked = state.banks.listeningDialogues
    .map((item, index) => ({ ...item, audioFile: `audio/sentences/mock-dialogue-${String(index + 1).padStart(3, "0")}.m4a` }))
    .filter((item) => item.level <= level);
  // 対話も選んだ級のものを先に使い、足りないときだけ下の級から出す。
  const dialogues = [...shuffle(banked.filter((item) => item.level === level)), ...shuffle(banked.filter((item) => item.level < level))];
  // 分類・チェックの練習では、その語と関係のない対話は出さない。
  const canUseDialogue = dialogues.length > 0 && !source?.length;
  const kinds = mixedKinds(LISTENING_MIX[level] || LISTENING_MIX[3], count)
    .map((kind) => (kind === "dialogue" && !canUseDialogue ? "sentence" : kind));
  const words = drawPracticeWords(level, kinds.filter((kind) => kind !== "dialogue").length, source);
  if (!words.length) return [];
  let wordIndex = 0;
  let dialogueIndex = 0;
  return kinds.map((kind) => {
    if (kind === "dialogue") return makeListeningDialogueQuestion(dialogues[dialogueIndex++ % dialogues.length]);
    return makeListeningQuestion(words[wordIndex++], level, kind);
  });
}

function makeListeningDialogueQuestion(item) {
  return {
    skill: "listening", kind: "audio-dialogue", audioText: item.audio, audioFile: item.audioFile,
    choices: shuffle([item.answer, ...item.distractors]).map((label) => ({ value: label, label })), correct: item.answer,
    instruction: "対話を聞いて、質問の答えを選んでください", explanation: `${item.prompt} — ${item.answer}`, audioPlays: 0,
  };
}

function makeListeningQuestion(word, level, kind = "word") {
  const pool = sameLevelDistractors(word, getLevelPool(level));
  if (kind === "sentence" && word.example) {
    const candidates = pool.filter((item) => item.exampleMeaning && item.id !== word.id);
    const choices = uniqueChoices([{ value: word.id, label: word.exampleMeaning }, ...shuffle(candidates).slice(0, 3).map((item) => ({ value: item.id, label: item.exampleMeaning }))]);
    return { skill: "listening", kind: "audio-sentence", wordId: word.id, audioText: word.example, audioFile: exampleAudioFile(word), choices: shuffle(choices), correct: word.id, instruction: "音声の内容として正しいものを選んでください", explanation: `${word.example}（${word.exampleMeaning}）`, audioPlays: 0 };
  }
  const choices = uniqueChoices([{ value: word.id, label: word.meaning }, ...shuffle(pool.filter((item) => item.id !== word.id && item.meaning !== word.meaning)).slice(0, 3).map((item) => ({ value: item.id, label: item.meaning }))]);
  return { skill: "listening", kind: "audio-word", wordId: word.id, audioWord: word, choices: shuffle(choices), correct: word.id, instruction: "音声で聞こえた単語の意味を選んでください", explanation: `${word.hanzi}（${word.pinyin}）— ${word.meaning}`, audioPlays: 0 };
}

const READING_MIX = {
  1: { meaning: 4, pinyin: 4, fill: 2 },
  2: { meaning: 4, pinyin: 3, fill: 3 },
  3: { meaning: 3, pinyin: 2, fill: 5 },
};

function makeReadingQuestions(level, count, source = null) {
  const kinds = mixedKinds(READING_MIX[level] || READING_MIX[3], count);
  const words = drawPracticeWords(level, count, source);
  if (!words.length) return [];
  return words.map((word, index) => makeReadingQuestion(word, level, kinds[index]));
}

function makeReadingQuestion(word, level, kind = "meaning") {
  const pool = sameLevelDistractors(word, getLevelPool(level));
  if (kind === "pinyin") {
    const choices = uniqueChoices([{ value: word.id, label: word.pinyin }, ...shuffle(pool.filter((item) => item.id !== word.id && item.pinyin !== word.pinyin)).slice(0, 3).map((item) => ({ value: item.id, label: item.pinyin }))]);
    return { skill: "reading", kind: "pinyin", wordId: word.id, prompt: word.hanzi, choices: shuffle(choices), correct: word.id, instruction: "正しいピンインを選んでください", explanation: `${word.hanzi} — ${word.pinyin} — ${word.meaning}` };
  }
  if (kind === "fill" && word.example?.includes(word.hanzi)) {
    const choices = uniqueChoices([{ value: word.id, label: word.hanzi }, ...shuffle(pool.filter((item) => item.id !== word.id && item.hanzi !== word.hanzi)).slice(0, 3).map((item) => ({ value: item.id, label: item.hanzi }))]);
    return { skill: "reading", kind: "fill", wordId: word.id, prompt: word.example.replace(word.hanzi, "＿＿＿"), subPrompt: word.exampleMeaning, choices: shuffle(choices), correct: word.id, instruction: "空欄に入る単語を選んでください", explanation: `${word.example}（${word.exampleMeaning}）` };
  }
  const choices = uniqueChoices([{ value: word.id, label: word.meaning }, ...shuffle(pool.filter((item) => item.id !== word.id && item.meaning !== word.meaning)).slice(0, 3).map((item) => ({ value: item.id, label: item.meaning }))]);
  return { skill: "reading", kind: "meaning", wordId: word.id, prompt: word.hanzi, subPrompt: word.pinyin, choices: shuffle(choices), correct: word.id, instruction: "単語の意味を選んでください", explanation: `${word.hanzi}（${word.pinyin}）— ${word.meaning}` };
}

function makeWritingQuestions(count, isMock = false) {
  // 正解音声のファイル名は元の並び順の番号で決まるので、絞り込む前に付ける。
  const items = state.banks.writing.map((item, index) => ({ ...item, answerAudioFile: `audio/sentences/writing-bank-${String(index + 1).padStart(3, "0")}.m4a` }));
  const reorder = shuffle(items.filter((item) => item.type === "reorder"));
  const input = shuffle(items.filter((item) => item.type === "input"));
  const half = Math.ceil(count / 2);
  return [...reorder.slice(0, half), ...input.slice(0, count - half)].map((item) => ({
    ...item, skill: "writing", kind: item.type, mockFormat: isMock,
    instruction: isMock ? (item.type === "reorder" ? "请把下面的词语排列成正确的句子。" : "请根据拼音在空格上写汉字。") : (item.type === "reorder" ? "単語を正しい語順に並べてください" : "ピンインを漢字で書いてください"),
    selected: [],
  }));
}

function uniqueChoices(choices) {
  const seen = new Set();
  return choices.filter((choice) => !seen.has(choice.label) && seen.add(choice.label)).slice(0, 4);
}

function renderPracticeQuestion() {
  const session = state.practice;
  const question = session.questions[session.index];
  if (!question) return finishPractice();
  if (session.isMock && session.currentSection !== question.skill) startMockSectionTimer(question.skill);
  session.answered = false;
  stopAudio();
  $("#practice-level-label").textContent = session.sourceLabel || `HSK ${session.level}`;
  $("#practice-mode-label").textContent = session.isMock
    ? `${session.section ? "セクション練習" : "写真なし模試"} · ${SKILL_LABELS[question.skill]} 第${question.part || 1}部分`
    : (session.modeLabel || (session.mode === "srs" ? `間隔反復 · ${SKILL_LABELS[question.skill]}` : SKILL_LABELS[question.skill]));
  $("#practice-step").textContent = `${session.index + 1} / ${session.questions.length}`;
  $("#practice-progress-bar").style.width = `${(session.index / session.questions.length) * 100}%`;
  $("#practice-instruction").textContent = question.instruction;
  // 模試は指示が中国語だけなので、日本語の補足を添える。
  const hint = $("#practice-hint");
  const showHint = Boolean(session.isMock && question.hint);
  hint.textContent = showHint ? question.hint : "";
  hint.classList.toggle("is-hidden", !showHint);
  $("#practice-feedback").textContent = "";
  $("#practice-feedback").className = "answer-feedback";
  $("#practice-script").classList.add("is-hidden");
  $("#practice-script").classList.remove("writing-result-panel");
  $("#practice-script-title").textContent = "音声のスクリプト";
  $("#practice-script-audio-label").textContent = "もう一度聞く";
  $("#practice-next").classList.add("is-hidden");
  $("#practice-next").innerHTML = `次の問題へ <span>→</span>`;
  const audioButton = $("#practice-audio");
  audioButton.classList.toggle("is-hidden", question.skill !== "listening");
  audioButton.disabled = session.isMock;
  $("#practice-audio-label").textContent = session.isMock ? "自动播放" : "音声を再生";
  const isAudioQuestion = question.skill === "listening";
  $("#audio-play-count").textContent = isAudioQuestion ? (session.isMock ? "自动播放两次" : `残り${2 - (question.audioPlays || 0)}回`) : "";
  const prompt = $("#practice-prompt");
  if (question.kind === "visual-judge") prompt.innerHTML = `<div class="mock-visual" role="img" aria-label="${escapeHtml(question.visual.alt)}">${escapeHtml(question.visual.symbol)}</div>`;
  else if (question.kind === "visual-choice") prompt.innerHTML = `<div class="listening-symbol" aria-hidden="true">听</div><p class="hidden-prompt">请听录音后选择图示</p>`;
  else if (question.kind === "reading-visual-judge") prompt.innerHTML = `<h2 class="mock-reading-prompt">${escapeHtml(question.prompt)}</h2>${question.promptPinyin ? `<p class="mock-pinyin">${escapeHtml(question.promptPinyin)}</p>` : ""}<div class="mock-visual" role="img" aria-label="${escapeHtml(question.visual.alt)}">${escapeHtml(question.visual.symbol)}</div>`;
  else if (question.kind === "reading-visual-choice") prompt.innerHTML = `<h2 class="mock-reading-prompt">${escapeHtml(question.prompt)}</h2>${question.promptPinyin ? `<p class="mock-pinyin">${escapeHtml(question.promptPinyin)}</p>` : ""}`;
  else if (question.kind === "audio-judge") prompt.innerHTML = `<div class="listening-symbol" aria-hidden="true">听</div><p class="audio-judge-prompt">${escapeHtml(question.prompt)}</p>`;
  else if (question.skill === "listening") prompt.innerHTML = `<div class="listening-symbol" aria-hidden="true">听</div><p class="hidden-prompt">${session.isMock ? "请听录音后选择答案" : "文字を見ずに聞き取りましょう"}</p>`;
  else if (question.kind === "input") prompt.innerHTML = question.mockFormat
    ? `<h2 class="mock-writing-sentence">${escapeHtml(question.sentence)}</h2>`
    : `<p class="writing-hint">${escapeHtml(question.meaning)}</p><h2 class="pinyin-prompt">${escapeHtml(question.pinyin)}</h2>`;
  else if (question.kind === "reorder") prompt.innerHTML = `${question.mockFormat ? "" : `<p class="writing-hint">${escapeHtml(question.meaning)}</p>`}${question.slots ? `<div class="slot-guide">${question.slots.map((label) => `<span>${escapeHtml(label)}</span>`).join(`<b aria-hidden="true">＋</b>`)}</div>` : ""}<div id="ordered-answer" class="ordered-answer" aria-label="並べた語句" aria-live="polite"><span class="ordered-placeholder">${question.mockFormat ? "请在这里排列句子" : "ここに語順を作ります"}</span></div>`;
  // 量詞は「数詞＋量詞＋名詞」の形のまま、空いたところを埋めさせる。
  else if (question.kind === "slot") prompt.innerHTML = `
    <div class="quiz-slot-row">
      <span class="quiz-slot"><strong>${escapeHtml(question.slot.number)}</strong><small>${escapeHtml(question.slot.numberPinyin)}</small></span>
      <b aria-hidden="true">＋</b>
      <span class="quiz-slot is-blank"><strong>？</strong><small>量詞</small></span>
      <b aria-hidden="true">＋</b>
      <span class="quiz-slot"><strong>${escapeHtml(question.slot.noun)}</strong><small>${escapeHtml(question.slot.nounPinyin)}</small></span>
    </div>
    <p class="quiz-slot-meaning">${escapeHtml(question.slot.meaning)}</p>`;
  // 量詞は「何を数えるか」がまとまりなので、当てはまるものを全部選ばせる。
  else if (question.kind === "multi") prompt.innerHTML = `
    <div class="quiz-measure-head"><strong>${escapeHtml(question.prompt)}</strong><span>${escapeHtml(question.promptPinyin || "")}</span></div>
    <p class="reading-subprompt">${escapeHtml(question.subPrompt || "")}</p>`;
  else {
    const subPinyin = question.subPromptPinyin ? `<p class="mock-pinyin">${escapeHtml(question.subPromptPinyin)}</p>` : "";
    // 判断对错では、判定する文を★付きの枠に入れて本文と区別する。
    const subBlock = !question.subPrompt ? ""
      : question.kind === "reading-judge"
        ? `<div class="judge-statement"><span class="judge-star" aria-hidden="true">★</span><div><p class="reading-subprompt">${escapeHtml(question.subPrompt)}</p>${subPinyin}</div></div>`
        : `<p class="reading-subprompt">${escapeHtml(question.subPrompt)}</p>${subPinyin}`;
    prompt.innerHTML = `<h2 class="${question.kind.startsWith("reading-") ? "mock-reading-prompt" : "reading-prompt"}">${escapeHtml(question.prompt)}</h2>${question.promptPinyin ? `<p class="mock-pinyin">${escapeHtml(question.promptPinyin)}</p>` : ""}${subBlock}`;
  }
  renderPracticeAnswers(question);
  if (session.isMock && isAudioQuestion && !(question.audioPlays > 0)) window.setTimeout(() => {
    if (state.practice === session && state.practice.questions[state.practice.index]?.id === question.id && !(question.audioPlays > 0)) playPracticeAudio(true);
  }, 450);
}

function renderPracticeAnswers(question) {
  const area = $("#practice-answer-area");
  if (question.kind === "multi") {
    // 複数選択。選んでから「解答する」で答え合わせする。
    area.innerHTML = `<div class="answer-list multi-list">${question.choices.map((choice, index) => `<button class="answer-button practice-choice multi-choice" type="button" data-value="${escapeHtml(choice.value)}" data-key="${String.fromCharCode(65 + index)}"><span class="choice-main">${escapeHtml(choice.label)}</span>${choice.pinyin ? `<small class="choice-pinyin">${escapeHtml(choice.pinyin)}</small>` : ""}${choice.meaning ? `<small class="choice-meaning">${escapeHtml(choice.meaning)}</small>` : ""}</button>`).join("")}</div>
      <div class="writing-actions"><button id="multi-submit" class="primary-button" type="button">解答する（${question.correctCount}つ）</button></div>`;
    $$(".multi-choice").forEach((button) => button.addEventListener("click", () => {
      if (state.practice.answered) return;
      button.classList.toggle("is-selected");
      button.setAttribute("aria-pressed", String(button.classList.contains("is-selected")));
    }));
    $("#multi-submit").addEventListener("click", () => {
      const picked = $$(".multi-choice.is-selected").map((button) => button.dataset.value);
      if (!picked.length) return;
      answerPractice(multiAnswerValue(question, picked), $("#multi-submit"));
    });
  } else if (question.choices) {
    const kindClass = { slot: " slot-choice", "slot-de": " de-choice" }[question.kind] || "";
    area.innerHTML = `<div class="answer-list${kindClass ? " chip-list" : ""}">${question.choices.map((choice, index) => `<button class="answer-button practice-choice${kindClass}${/^\p{Extended_Pictographic}/u.test(choice.label) ? " visual-choice-button" : ""}" type="button" data-value="${escapeHtml(choice.value)}" data-key="${String.fromCharCode(65 + index)}"${choice.ariaLabel ? ` aria-label="${escapeHtml(choice.ariaLabel)}"` : ""}><span class="choice-main">${escapeHtml(choice.label)}</span>${choice.pinyin ? `<small class="choice-pinyin">${escapeHtml(choice.pinyin)}</small>` : ""}${choice.note ? `<small class="choice-note">${escapeHtml(choice.note)}</small>` : ""}</button>`).join("")}</div>`;
    $$(".practice-choice").forEach((button) => button.addEventListener("click", () => answerPractice(button.dataset.value, button)));
  } else if (question.kind === "reorder") {
    question.selected = [];
    const shuffledTokens = shuffle(question.tokens.map((token, index) => ({ token, index })));
    area.innerHTML = `<div class="token-bank" aria-label="並べ替える語句">${shuffledTokens.map((item) => `<button type="button" class="word-token" draggable="true" data-token-index="${item.index}">${escapeHtml(item.token)}</button>`).join("")}</div><p class="drag-help">クリックで追加／ドラッグで順番を入れ替え</p><div class="writing-actions"><button id="reset-order" class="secondary-button" type="button">${question.mockFormat ? "重新排列" : "やり直す"}</button><button id="submit-order" class="primary-button" type="button">${question.mockFormat ? "提交答案" : "解答する"}</button></div>`;
    setupReorderInteraction(question);
    $("#reset-order").addEventListener("click", () => renderPracticeQuestion());
    $("#submit-order").addEventListener("click", () => {
      if (!question.selected.length) return;
      answerPractice(reorderAnswer(question), $("#submit-order"));
    });
  } else {
    area.innerHTML = `<form id="writing-form" class="writing-form"><label for="writing-input">${question.mockFormat ? "请写一个汉字" : "漢字で入力"}</label><input id="writing-input" type="text" lang="zh-CN" autocomplete="off" placeholder="${question.mockFormat ? "输入汉字" : "答えを入力"}" /><button class="primary-button" type="submit">${question.mockFormat ? "提交答案" : "解答する"}</button></form>`;
    $("#writing-form").addEventListener("submit", (event) => { event.preventDefault(); answerPractice($("#writing-input").value, $("#writing-form button")); });
    $("#writing-input").focus();
  }
}

function reorderAnswer(question) {
  return question.selected.map((index) => question.tokens[index]).join("");
}

function setupReorderInteraction(question) {
  const bank = $(".token-bank");
  const answer = $("#ordered-answer");
  if (!bank || !answer) return;
  let draggedElement = null;

  const render = () => {
    const selected = new Set(question.selected);
    bank.querySelectorAll(".word-token").forEach((button) => {
      button.disabled = selected.has(Number(button.dataset.tokenIndex));
    });
    answer.classList.toggle("has-tokens", question.selected.length > 0);
    answer.innerHTML = question.selected.length
      ? question.selected.map((index) => `<button type="button" class="word-token selected-token" draggable="true" data-token-index="${index}" aria-label="${escapeHtml(question.tokens[index])}を移動または候補に戻す">${escapeHtml(question.tokens[index])}</button>`).join("")
      : `<span class="ordered-placeholder">${question.mockFormat ? "请在这里排列句子" : "ここに語順を作ります"}</span>`;
  };

  const addToken = (index) => {
    if (!question.selected.includes(index)) question.selected.push(index);
    render();
  };
  const removeToken = (index) => {
    question.selected = question.selected.filter((selectedIndex) => selectedIndex !== index);
    render();
  };
  const moveToken = (index, beforeIndex = null) => {
    if (index === beforeIndex) return;
    const next = question.selected.filter((selectedIndex) => selectedIndex !== index);
    const position = beforeIndex === null ? next.length : next.indexOf(beforeIndex);
    next.splice(position < 0 ? next.length : position, 0, index);
    question.selected = next;
    render();
  };
  const clearDragState = () => {
    draggedElement?.classList.remove("is-dragging");
    draggedElement = null;
    bank.classList.remove("is-drag-over");
    answer.classList.remove("is-drag-over");
  };
  const beginDrag = (event) => {
    const token = event.target.closest(".word-token");
    if (!token || token.disabled || state.practice.answered) return;
    draggedElement = token;
    token.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", token.dataset.tokenIndex);
  };

  bank.addEventListener("click", (event) => {
    const token = event.target.closest(".word-token");
    if (token && !token.disabled && !state.practice.answered) addToken(Number(token.dataset.tokenIndex));
  });
  answer.addEventListener("click", (event) => {
    const token = event.target.closest(".selected-token");
    if (token && !state.practice.answered) removeToken(Number(token.dataset.tokenIndex));
  });
  bank.addEventListener("dragstart", beginDrag);
  answer.addEventListener("dragstart", beginDrag);
  [bank, answer].forEach((container) => container.addEventListener("dragend", clearDragState));
  answer.addEventListener("dragover", (event) => {
    if (state.practice.answered) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    answer.classList.add("is-drag-over");
  });
  answer.addEventListener("drop", (event) => {
    event.preventDefault();
    const index = Number(event.dataTransfer.getData("text/plain"));
    const target = event.target.closest(".selected-token");
    const beforeIndex = target ? Number(target.dataset.tokenIndex) : null;
    if (Number.isInteger(index)) moveToken(index, beforeIndex);
    clearDragState();
  });
  bank.addEventListener("dragover", (event) => {
    if (state.practice.answered) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    bank.classList.add("is-drag-over");
  });
  bank.addEventListener("drop", (event) => {
    event.preventDefault();
    const index = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(index)) removeToken(index);
    clearDragState();
  });
  render();
}

function answerPractice(value, selectedButton) {
  const session = state.practice;
  if (session.answered) return;
  const question = session.questions[session.index];
  const correct = normalizeAnswer(value) === normalizeAnswer(question.correct ?? question.answer);
  session.answered = true;
  question.userAnswer = value;
  question.isCorrect = correct;
  session.correct += correct ? 1 : 0;
  session.sectionStats[question.skill] ||= { answered: 0, correct: 0 };
  session.sectionStats[question.skill].answered += 1;
  session.sectionStats[question.skill].correct += correct ? 1 : 0;
  const word = findQuestionWord(question);
  const level = word?.level || session.level;
  state.progress.answered += 1;
  state.progress.correct += correct ? 1 : 0;
  state.progress.byLevel[level].answered += 1;
  state.progress.byLevel[level].correct += correct ? 1 : 0;
  if (word) state.progress.mistakes[word.id] = correct ? Math.max(0, (state.progress.mistakes[word.id] || 0) - 1) : (state.progress.mistakes[word.id] || 0) + 1;
  recordStudy(word, correct, question.skill);
  if (question.kind === "multi") {
    const answers = new Set(String(question.correct).split("、"));
    $$(".multi-choice").forEach((button) => {
      button.disabled = true;
      if (answers.has(button.dataset.value)) button.classList.add("is-correct");
      else if (button.classList.contains("is-selected")) button.classList.add("is-wrong");
    });
    $("#multi-submit").disabled = true;
  } else if (question.choices) {
    $$(".practice-choice").forEach((button) => {
      button.disabled = true;
      if (normalizeAnswer(button.dataset.value) === normalizeAnswer(question.correct)) button.classList.add("is-correct");
    });
    if (!correct) selectedButton?.classList.add("is-wrong");
  } else {
    $$(".practice-answer-area button, .practice-answer-area input").forEach((element) => { element.disabled = true; });
    if (question.kind === "reorder") {
      $$("#ordered-answer .word-token").forEach((element) => { element.disabled = true; });
      $("#ordered-answer")?.classList.add("is-locked");
    }
  }
  if (question.skill === "writing") {
    // 正解の文と訳はパネルに出すので、ここには解説（文法ドリルのみ）を添える。
    const detail = !session.isMock && question.explanation ? ` ${question.explanation}` : "";
    $("#practice-feedback").textContent = `${correct ? "正解！" : "正解を確認しましょう。"}${detail}`;
    $("#practice-feedback").classList.add(correct ? "correct" : "wrong");
    revealWritingAnswer(question);
  } else if (!session.isMock) {
    $("#practice-feedback").textContent = correct ? `正解！ ${question.explanation || question.answer}` : `正解：${question.explanation || question.answer}`;
    $("#practice-feedback").classList.add(correct ? "correct" : "wrong");
    if (question.skill === "listening") enableListeningReplay(question);
  } else if (question.skill === "listening") {
    revealListeningScript(question);
  }
  saveProgress();
  const next = session.questions[session.index + 1];
  if (session.isMock && next && next.skill !== question.skill) $("#practice-next").innerHTML = `${SKILL_LABELS[next.skill]}へ進む <span>→</span>`;
  $("#practice-next").classList.remove("is-hidden");
  $("#practice-next").focus();
}

// 解答が済んだ聴解問題は、回数制限なしで聞き直せるようにする。
function enableListeningReplay(question) {
  question.scriptRevealed = true;
  $("#practice-audio").disabled = false;
  $("#practice-audio-label").textContent = "もう一度聞く";
  $("#audio-play-count").textContent = "";
}

// 模試は解説を出さないので、答えたあとに原文を見せて勉強できるようにする。
function revealListeningScript(question) {
  const panel = $("#practice-script");
  const body = $("#practice-script-body");
  if (!panel || !body) return;
  body.innerHTML = question.audioWord
    ? `<p class="script-line"><span class="script-role">単</span>${escapeHtml(question.audioWord.hanzi)}（${escapeHtml(question.audioWord.pinyin)}）</p>`
    : scriptLinesHtml(question.audioText || "");
  panel.classList.remove("is-hidden");
  enableListeningReplay(question);
}

function writingAnswerSentence(question) {
  if (question.kind === "input") return String(question.sentence || "").replace(/（[^）]+）/, question.answer || "");
  return question.answer || "";
}

function revealWritingAnswer(question) {
  const panel = $("#practice-script");
  const body = $("#practice-script-body");
  if (!panel || !body) return;
  $("#practice-script-title").textContent = "正解と日本語の意味";
  $("#practice-script-audio-label").textContent = "正解を聞く";
  body.innerHTML = `<div class="writing-result-answer"><span>正解</span><strong lang="zh-CN">${escapeHtml(writingAnswerSentence(question))}</strong></div>
    <div class="writing-result-meaning"><span>意味</span><p>${escapeHtml(question.meaning || "日本語訳はありません")}</p></div>`;
  panel.classList.add("writing-result-panel");
  panel.classList.remove("is-hidden");
}

function playPracticeReviewAudio() {
  const question = state.practice.questions[state.practice.index];
  const button = $("#practice-script-audio");
  if (!question || !button) return;
  if (question.skill !== "writing") return playPracticeAudio(false);
  const text = writingAnswerSentence(question);
  if (question.answerAudioFile) playAudioFile(question.answerAudioFile, button, { fallbackText: text, role: "female", fallbackRate: .86, baseRate: 1 });
  else {
    stopAudio();
    speakWithBrowser(text, button, { rate: .86, role: "female" });
  }
}

function scriptLinesHtml(text) {
  const roles = { 男: "男", 女: "女", 问: "問" };
  const parts = [...String(text).matchAll(/([男女问])：([\s\S]*?)(?=(?:男|女|问)：|$)/g)];
  if (!parts.length) return `<p class="script-line">${escapeHtml(text)}</p>`;
  return parts.map(([, role, line]) => `<p class="script-line"><span class="script-role">${roles[role] || role}</span>${escapeHtml(line.trim())}</p>`).join("");
}

function nextPracticeQuestion() {
  state.practice.index += 1;
  if (state.practice.index >= state.practice.questions.length) finishPractice(); else renderPracticeQuestion();
}

function playPracticeAudio(autoRepeat = false) {
  const question = state.practice.questions[state.practice.index];
  if (!question || (question.audioPlays >= 2 && !question.scriptRevealed)) return;
  question.audioPlays = (question.audioPlays || 0) + 1;
  const button = $("#practice-audio");
  if (question.audioWord) {
    speak(question.audioWord, button);
  } else if (question.audioFile) {
    const rate = state.practice.isMock ? 1 : 1;
    const shouldRepeat = autoRepeat && question.audioPlays < 2;
    playAudioFile(question.audioFile, button, { fallbackText: question.audioText, dialogue: question.kind.includes("dialogue"), role: "narrator", fallbackRate: rate, baseRate: rate, lockRate: state.practice.isMock, onEnded: shouldRepeat ? () => window.setTimeout(() => playPracticeAudio(false), 420) : null });
  } else {
    stopAudio();
    const rate = state.practice.isMock ? ({ 1: .72, 2: .78, 3: .84 }[state.practice.level] || .78) : .76;
    if (question.kind === "audio-dialogue") speakDialogue(question.audioText, button, rate);
    else speakWithBrowser(question.audioText, button, { rate, role: "narrator" });
  }
  if (question.scriptRevealed) {
    $("#audio-play-count").textContent = "";
    return;
  }
  $("#audio-play-count").textContent = state.practice.isMock ? (question.audioPlays < 2 ? "正在按考试速度播放" : "已播放两次") : `残り${2 - question.audioPlays}回`;
  // 解答済み・次の問題へ進んだあとにこのタイマーが効いてボタンを塞がないようにする。
  if (question.audioPlays >= 2) window.setTimeout(() => {
    if (question.scriptRevealed || state.practice.questions[state.practice.index] !== question) return;
    button.disabled = true;
  }, 100);
}

function finishPractice(timedOut = Boolean(state.practice.timedOutSections?.length)) {
  const session = state.practice;
  clearPracticeTimer();
  stopAudio();
  $("#practice-timer").classList.add("is-hidden");
  const attempted = Object.values(session.sectionStats).reduce((sum, item) => sum + item.answered, 0);
  $("#practice-result-mark").textContent = timedOut ? "時" : (session.isMock ? "試" : "成");
  $("#practice-result-title").textContent = "トレーニング完了";
  if (session.isMock) {
    const config = EXAM_CONFIG[session.level];
    const skills = session.section ? [session.section] : ["listening", "reading", ...(session.level === 3 ? ["writing"] : [])];
    // 模試では未回答も不正解として扱い、各技能を100点満点に換算する。
    const scores = skills.map((skill) => Math.round(((session.sectionStats[skill]?.correct || 0) / config[skill]) * 100));
    const total = scores.reduce((sum, score) => sum + score, 0);
    const maxScore = skills.length * 100;
    // 合格基準は全体で6割。セクション別練習も同じ6割を目安にする。
    const passMark = session.section ? 60 : config.passScore;
    const passed = total >= passMark;
    $("#practice-result-title").textContent = session.section ? `HSK ${session.level} ${SKILL_LABELS[session.section]}の結果` : `HSK ${session.level} 模試結果`;
    $("#practice-result-score").textContent = total;
    $("#practice-result-unit").textContent = `/ ${maxScore} 点`;
    $("#practice-result-subtitle").textContent = passed ? "合格ライン到達" : "合格まであと少し";
    $("#practice-result-message").textContent = timedOut ? "時間切れです。振り返りから復習しましょう。" : (passed ? "合格ラインです。太棒了！" : `目安は${passMark}点です。振り返りで弱いところを確認しましょう。`);
    $("#practice-breakdown").innerHTML = skills.map((skill, index) => `<div><span>${SKILL_LABELS[skill]}</span><strong>${scores[index]}</strong><small>/ 100</small></div>`).join("");
    state.progress.mocks.unshift({ date: localDateKey(), level: session.level, score: total, maxScore, passed, ...(session.section ? { section: session.section } : {}) });
    state.progress.mocks = state.progress.mocks.slice(0, 10);
    saveProgress();
  } else {
    $("#practice-result-score").textContent = session.correct;
    $("#practice-result-unit").textContent = `/ ${attempted} 問`;
    $("#practice-result-subtitle").textContent = "今回の結果";
    $("#practice-result-message").textContent = attempted && session.correct / attempted >= .8 ? "よくできました！次の技能にも挑戦しましょう。" : "間違えた単語は間隔反復に追加しました。";
    $("#practice-breakdown").innerHTML = Object.entries(session.sectionStats).map(([skill, data]) => `<div><span>${SKILL_LABELS[skill]}</span><strong>${data.correct}</strong><small>/ ${data.answered}</small></div>`).join("");
  }
  setReview("practice", buildPracticeReview(session));
  showView("practice-result");
  updateSummary();
}

function retryPractice() {
  const last = state.practice.lastStart;
  if (!last) return navigate("exam");
  if (last.isMock) startMockExam(last.level, last.section);
  else if (last.guideId === "measure") startMeasurePractice();
  else if (last.guideId) startGuidePractice(last.guideId);
  else if (last.categoryId) startCategoryPractice(last.mode, last.categoryId);
  else if (last.checked) startCheckedPractice(last.mode);
  else startPractice(last.mode, last.level);
}

function closePractice() {
  clearPracticeTimer();
  stopAudio();
  navigate("exam");
}

function clearPracticeTimer() {
  if (state.practice.timerId) window.clearInterval(state.practice.timerId);
  state.practice.timerId = null;
}

function setReview(key, entries) {
  reviewSessions[key] = { entries, scope: "all" };
  renderReview(key);
}

function renderReview(key) {
  const panel = $(`#${key}-review`);
  const session = reviewSessions[key];
  if (!panel || !session) return;
  const { entries, scope } = session;
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
  panel.querySelector(".review-list").innerHTML = shown.map((entry) => reviewItemHtml(entry, entries.indexOf(entry))).join("");
  const empty = panel.querySelector(".review-empty");
  empty.textContent = "まちがいはありません。全問正解です。";
  empty.classList.toggle("is-hidden", shown.length > 0);
  panel.querySelectorAll("[data-review-audio]").forEach((button) => {
    button.addEventListener("click", () => playReviewAudio(entries[Number(button.dataset.reviewAudio)], button));
  });
}

function reviewItemHtml(entry, index) {
  const marks = { correct: "正解", wrong: "まちがい", skipped: "未回答" };
  const yourClass = entry.status === "correct" ? " is-correct" : entry.status === "wrong" ? " is-wrong" : "";
  return `<li class="review-item is-${entry.status}">
    <div class="review-item-head"><span class="review-index">${entry.number}</span><span class="review-tag">${escapeHtml(entry.tag)}</span><span class="review-mark">${marks[entry.status]}</span>${entry.wordId ? checkButtonHtml(entry.wordId, state.checked.has(entry.wordId)) : ""}</div>
    ${entry.lines.filter((line) => line.text).map((line) => `<p class="review-line"><span>${escapeHtml(line.label)}</span><b>${escapeHtml(line.text)}</b></p>`).join("")}
    <div class="review-answers">
      <div class="review-answer${yourClass}"><span>あなたの回答</span><strong>${escapeHtml(entry.your || "未回答")}</strong></div>
      <div class="review-answer is-correct"><span>正解</span><strong>${escapeHtml(entry.answer || "—")}</strong></div>
    </div>
    ${entry.note ? `<p class="review-note">${escapeHtml(entry.note)}</p>` : ""}
    ${entry.audio ? `<button class="review-audio" type="button" data-review-audio="${index}"><span aria-hidden="true">▶</span> 音声をもう一度聞く</button>` : ""}
  </li>`;
}

function playReviewAudio(entry, button) {
  const audio = entry?.audio;
  if (!audio) return;
  if (audio.word) return speak(audio.word, button);
  playAudioFile(audio.file, button, { fallbackText: audio.text, dialogue: Boolean(audio.dialogue), role: "narrator" });
}

function buildQuizReview() {
  const { questions, answers, direction } = state.quiz;
  const isReverse = direction === "ja-cn";
  return questions.map((word, index) => {
    const answer = answers[index];
    const chosen = answer?.choice;
    return {
      number: index + 1,
      status: !answer ? "skipped" : answer.correct ? "correct" : "wrong",
      tag: `HSK ${word.level} · 単語（${isReverse ? "日 → 中" : "中 → 日"}）`,
      lines: [{ label: "問題", text: isReverse ? word.meaning : `${word.hanzi}（${word.pinyin}）` }],
      your: chosen ? (isReverse ? `${chosen.hanzi}（${chosen.pinyin}）` : chosen.meaning) : "",
      answer: isReverse ? `${word.hanzi}（${word.pinyin}）` : word.meaning,
      note: word.example && word.exampleMeaning ? `${word.example}（${word.exampleMeaning}）` : "",
      audio: { word },
      wordId: word.id,
    };
  });
}

function buildPracticeReview(session) {
  return session.questions.map((question, index) => {
    const answered = question.userAnswer !== undefined;
    const answerLabel = reviewChoiceLabel(question, question.correct ?? question.answer);
    const lines = reviewLines(question);
    return {
      number: index + 1,
      status: !answered ? "skipped" : question.isCorrect ? "correct" : "wrong",
      tag: session.isMock ? `${SKILL_LABELS[question.skill]} · 第${question.part || 1}部分` : SKILL_LABELS[question.skill],
      lines,
      your: answered ? reviewChoiceLabel(question, question.userAnswer) || "（空欄）" : "",
      answer: answerLabel,
      note: reviewNote(question, lines, answerLabel),
      audio: question.skill === "listening" ? { file: question.audioFile, text: question.audioText, word: question.audioWord, dialogue: String(question.kind).includes("dialogue") } : null,
      wordId: findQuestionWord(question)?.id || "",
    };
  });
}

function reviewLines(question) {
  const lines = [];
  if (question.audioText) lines.push({ label: "音声原文", text: question.audioText });
  else if (question.audioWord) lines.push({ label: "音声", text: `${question.audioWord.hanzi}（${question.audioWord.pinyin}）` });
  if (question.kind === "slot") lines.push({ label: "問題", text: `${question.slot.number} ＋ ？ ＋ ${question.slot.noun}（${question.slot.meaning}）` });
  if (question.kind === "reorder") lines.push({ label: "語句", text: question.tokens.join(" / ") });
  if (question.kind === "input" && question.sentence) lines.push({ label: "問題", text: question.sentence });
  if (question.kind === "input" && question.pinyin) lines.push({ label: "ピンイン", text: question.pinyin });
  if (question.meaning && (question.kind === "reorder" || question.kind === "input")) lines.push({ label: "意味", text: question.meaning });
  if (question.prompt) lines.push({ label: question.skill === "listening" ? "設問" : "問題", text: question.prompt });
  if (question.promptPinyin) lines.push({ label: "ピンイン", text: question.promptPinyin });
  if (question.subPrompt) lines.push({ label: REVIEW_SUB_LABELS[question.kind] || "補足", text: question.subPrompt });
  if (question.subPromptPinyin) lines.push({ label: "ピンイン", text: question.subPromptPinyin });
  if (question.visual) lines.push({ label: "図示", text: `${question.visual.symbol} ${question.visual.alt}` });
  return lines;
}

function reviewNote(question, lines, answerLabel) {
  const note = question.explanation;
  if (!note) return "";
  // 問題文と正解の並べ替えでしかない解説は、繰り返しになるので表示しない。
  const parts = [answerLabel, String(question.correct ?? question.answer ?? ""), ...lines.map((line) => line.text)].filter(Boolean).sort((a, b) => b.length - a.length);
  const rest = parts.reduce((text, part) => text.split(part).join(""), note);
  return /[^\s—、。（）()・·-]/.test(rest) ? note : "";
}

function findQuestionWord(question) {
  return state.words.find((item) => item.id === question.wordId || item.id === question.audioWord?.id || item.hanzi === question.answer);
}

function reviewChoiceLabel(question, value) {
  if (value === undefined || value === null || value === "") return "";
  const choice = question.choices?.find((item) => normalizeAnswer(item.value) === normalizeAnswer(value));
  if (!choice) return String(value);
  const pinyin = choice.pinyin ? `（${choice.pinyin}）` : "";
  const description = choice.ariaLabel && choice.ariaLabel !== choice.label ? `（${choice.ariaLabel}）` : "";
  return `${choice.label}${pinyin}${description}`;
}

function startMockSectionTimer(skill) {
  const session = state.practice;
  clearPracticeTimer();
  session.currentSection = skill;
  session.remainingSeconds = (EXAM_CONFIG[session.level].sectionMinutes[skill] || 1) * 60;
  updatePracticeTimer();
  session.timerId = window.setInterval(() => {
    session.remainingSeconds -= 1;
    updatePracticeTimer();
    if (session.remainingSeconds <= 0) expireMockSection();
  }, 1000);
}

function expireMockSection() {
  const session = state.practice;
  const expiredSkill = session.currentSection;
  clearPracticeTimer();
  if (!session.timedOutSections.includes(expiredSkill)) session.timedOutSections.push(expiredSkill);
  const nextIndex = session.questions.findIndex((question, index) => index > session.index && question.skill !== expiredSkill);
  if (nextIndex < 0) return finishPractice(true);
  session.index = nextIndex;
  session.answered = false;
  renderPracticeQuestion();
}

function updatePracticeTimer() {
  const seconds = Math.max(0, state.practice.remainingSeconds);
  const minutes = Math.floor(seconds / 60);
  const prefix = state.practice.isMock && state.practice.currentSection ? `${SKILL_LABELS[state.practice.currentSection]} ` : "";
  $("#practice-timer").textContent = `${prefix}${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  $("#practice-timer").classList.toggle("is-warning", seconds <= 300);
}

function recordStudy(word, isCorrect, skill) {
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

function getDueWords() {
  const today = localDateKey();
  return state.words.filter((word) => state.progress.srs[word.id] && state.progress.srs[word.id].due <= today);
}

function masteryScore(word) { return state.progress.srs[word.id]?.repetitions || 0; }
function startOfCurrentWeek() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return localDateKey(date);
}
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
function addDays(dateString, days) { const date = new Date(`${dateString}T12:00:00`); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function normalizeAnswer(value) { return String(value || "").replace(/[\s。！？,.，?!]/g, "").toLowerCase(); }
function exampleAudioFile(word) { return word?.id ? `audio/sentences/example-${word.id}.m4a` : ""; }
function loadAudioSpeed() {
  try {
    const value = Number(localStorage.getItem("hsk-audio-speed") || "1");
    return [.85, 1, 1.15].includes(value) ? value : 1;
  } catch { return 1; }
}

function loadVocabularyDirection() {
  try {
    return localStorage.getItem("hsk-vocabulary-direction") === "ja-cn" ? "ja-cn" : "cn-ja";
  } catch { return "cn-ja"; }
}

function setVocabularyDirection(direction) {
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

function speak(word, button) {
  if (!word?.hanzi) return;
  playAudioFile(`audio/${encodeURIComponent(word.id)}.m4a`, button, { fallbackText: word.hanzi, role: "female" });
}

function playAudioFile(file, button, options = {}) {
  if (!file) return speakWithBrowser(options.fallbackText, button, { rate: options.fallbackRate || .78, role: options.role || "female" });
  stopAudio();
  button?.classList.add("is-playing");
  const audio = new Audio(`${file}?v=aac48`);
  const playbackRate = options.lockRate ? (options.baseRate || 1) : Math.max(.7, Math.min(1.3, (options.baseRate || 1) * state.audioSpeed));
  audio.playbackRate = playbackRate;
  audio.preservesPitch = true;
  activeAudio = audio;
  audio.addEventListener("ended", () => {
    finishAudioButton(button);
    if (typeof options.onEnded === "function") options.onEnded();
  }, { once: true });
  let fallbackStarted = false;
  const startFallback = () => {
    if (fallbackStarted) return;
    fallbackStarted = true;
    finishAudioButton(button);
    if (options.dialogue) speakDialogue(options.fallbackText, button, (options.fallbackRate || .78) * state.audioSpeed);
    else speakWithBrowser(options.fallbackText, button, { rate: (options.fallbackRate || .78) * state.audioSpeed, role: options.role || "female" });
  };
  audio.addEventListener("error", startFallback, { once: true });
  audio.play().catch(startFallback);
}

function stopAudio() {
  speechRunId += 1;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  $$(".is-playing").forEach((button) => button.classList.remove("is-playing"));
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function finishAudioButton(button) {
  button?.classList.remove("is-playing");
  activeAudio = null;
}

function speakWithBrowser(text, button, options = {}) {
  speakSegments([{ text, role: options.role || "female" }], button, options.rate || .78);
}

function speakDialogue(text, button, rate = .78) {
  const segments = [];
  const pattern = /([男女问])：([\s\S]*?)(?=(?:男|女|问)：|$)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match[1] === "问") segments.push({ text: "Question", role: "cue" });
    segments.push({ text: match[2].trim(), role: match[1] === "男" ? "male" : (match[1] === "女" ? "female" : "narrator") });
  }
  speakSegments(segments.length ? segments : [{ text, role: "narrator" }], button, rate);
}

function speakSegments(segments, button, rate = .78) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const runId = ++speechRunId;
  button?.classList.add("is-playing");
  let index = 0;
  const playNext = () => {
    if (runId !== speechRunId) return;
    const segment = segments[index];
    if (!segment) return finishAudioButton(button);
    const utterance = new SpeechSynthesisUtterance(cleanSpeechText(segment.text));
    utterance.lang = segment.role === "cue" ? "en-US" : "zh-CN";
    utterance.rate = segment.role === "cue" ? Math.max(.8, rate) : rate;
    utterance.pitch = segment.role === "male" ? .92 : (segment.role === "female" ? 1.04 : 1);
    utterance.volume = 1;
    utterance.voice = segment.role === "cue" ? selectEnglishVoice() : selectChineseVoice(segment.role);
    utterance.onend = () => {
      if (runId !== speechRunId) return;
      index += 1;
      if (index >= segments.length) return finishAudioButton(button);
      const nextRole = segments[index].role;
      window.setTimeout(playNext, nextRole === "cue" ? 1200 : 450);
    };
    utterance.onerror = () => { if (runId === speechRunId) finishAudioButton(button); };
    window.speechSynthesis.speak(utterance);
  };
  playNext();
}

function selectEnglishVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.name.includes("Samantha")) || voices.find((voice) => /^en[-_]US$/i.test(voice.lang)) || null;
}

function selectChineseVoice(role) {
  const voices = window.speechSynthesis.getVoices();
  const mainland = voices.filter((voice) => /^zh[-_]CN$/i.test(voice.lang));
  const chinese = mainland.length ? mainland : voices.filter((voice) => /^zh/i.test(voice.lang));
  // 収録済み音声と同じ Tingting を優先する（Sandyは音声データ未取得の端末で低品質になる）。
  const preferred = role === "male" ? ["Reed", "Eddy", "Rocko"] : (role === "female" ? ["Tingting", "Ting-Ting", "Flo", "Shelley"] : ["Tingting", "Ting-Ting", "Flo"]);
  return preferred.map((name) => chinese.find((voice) => voice.name.includes(name))).find(Boolean) || chinese[0] || null;
}

function cleanSpeechText(text) {
  return String(text || "").replace(/^[男女问]：/, "").replace(/＿＿＿/g, "什么").trim();
}


