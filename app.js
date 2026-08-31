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

const REVIEW_SUB_LABELS = { "reading-comprehension": "設問", "reading-judge": "比較する文", meaning: "ピンイン", fill: "訳" };
const reviewSessions = { quiz: { entries: [], scope: "all" }, practice: { entries: [], scope: "all" } };
const CHECKED_KEY = "hsk-checked-words";

const WRITING_BANK = [
  { type: "reorder", tokens: ["我", "每天", "学习", "汉语"], answer: "我每天学习汉语。", meaning: "私は毎日中国語を勉強します。" },
  { type: "reorder", tokens: ["他", "正在", "看", "报纸"], answer: "他正在看报纸。", meaning: "彼は新聞を読んでいます。" },
  { type: "reorder", tokens: ["明天", "可能", "下雨"], answer: "明天可能下雨。", meaning: "明日は雨かもしれません。" },
  { type: "reorder", tokens: ["我家", "离", "学校", "很近"], answer: "我家离学校很近。", meaning: "私の家は学校から近いです。" },
  { type: "reorder", tokens: ["她", "比", "我", "高"], answer: "她比我高。", meaning: "彼女は私より背が高いです。" },
  { type: "reorder", tokens: ["我们", "一起", "去", "公园", "吧"], answer: "我们一起去公园吧。", meaning: "一緒に公園へ行きましょう。" },
  { type: "reorder", tokens: ["你", "为什么", "迟到"], answer: "你为什么迟到？", meaning: "なぜ遅刻したのですか？" },
  { type: "reorder", tokens: ["这件", "衣服", "太贵", "了"], answer: "这件衣服太贵了。", meaning: "この服は高すぎます。" },
  { type: "reorder", tokens: ["我", "已经", "完成", "作业", "了"], answer: "我已经完成作业了。", meaning: "私はもう宿題を終えました。" },
  { type: "reorder", tokens: ["妈妈", "在", "厨房", "做饭"], answer: "妈妈在厨房做饭。", meaning: "母は台所で料理しています。" },
  { type: "input", pinyin: "qǐ", answer: "起", meaning: "起きる", sentence: "我每天七点（qǐ）床。" },
  { type: "input", pinyin: "rè", answer: "热", meaning: "暑い", sentence: "今天天气很（rè）。" },
  { type: "input", pinyin: "shū", answer: "书", meaning: "本", sentence: "我想买一本（shū）。" },
  { type: "input", pinyin: "bēi", answer: "杯", meaning: "杯", sentence: "请喝一（bēi）茶。" },
  { type: "input", pinyin: "yǒu", answer: "友", meaning: "友", sentence: "他是我的好朋（yǒu）。" },
  { type: "input", pinyin: "suì", answer: "岁", meaning: "歳", sentence: "她今年二十（suì）。" },
  { type: "input", pinyin: "chē", answer: "车", meaning: "車", sentence: "我们坐公共汽（chē）去。" },
  { type: "input", pinyin: "chī", answer: "吃", meaning: "食べる", sentence: "妹妹喜欢（chī）苹果。" },
  { type: "input", pinyin: "mén", answer: "门", meaning: "ドア", sentence: "请打开（mén）。" },
  { type: "input", pinyin: "yǔ", answer: "雨", meaning: "雨", sentence: "外面下（yǔ）了。" },
];

const MOCK_RESPONSE_BANK = [
  { level: 1, prompt: "你好吗？", answer: "我很好。" },
  { level: 1, prompt: "你叫什么名字？", answer: "我叫王明。" },
  { level: 1, prompt: "你是哪国人？", answer: "我是日本人。" },
  { level: 1, prompt: "你家有几口人？", answer: "我家有三口人。" },
  { level: 1, prompt: "现在几点？", answer: "现在三点。" },
  { level: 1, prompt: "今天天气怎么样？", answer: "今天天气很好。" },
  { level: 1, prompt: "你想喝什么？", answer: "我想喝茶。" },
  { level: 1, prompt: "你在哪儿工作？", answer: "我在学校工作。" },
  { level: 1, prompt: "这是谁的书？", answer: "这是我的书。" },
  { level: 1, prompt: "你会说汉语吗？", answer: "我会说一点儿。" },
  { level: 1, prompt: "谢谢你。", answer: "不客气。" },
  { level: 2, prompt: "你为什么迟到了？", answer: "因为路上很堵。" },
  { level: 2, prompt: "你怎么去公司？", answer: "我坐地铁去。" },
  { level: 2, prompt: "这件衣服怎么样？", answer: "很好看，就是有点儿贵。" },
  { level: 2, prompt: "你什么时候回来？", answer: "我晚上八点回来。" },
  { level: 2, prompt: "你觉得这本书怎么样？", answer: "很有意思。" },
  { level: 2, prompt: "请问，洗手间在哪儿？", answer: "在前面左边。" },
  { level: 2, prompt: "你最喜欢什么运动？", answer: "我最喜欢游泳。" },
  { level: 2, prompt: "你身体不舒服吗？", answer: "我有点儿头疼。" },
  { level: 2, prompt: "周末你打算做什么？", answer: "我打算和朋友一起看电影。" },
  { level: 3, prompt: "你为什么换工作？", answer: "因为我想有更多的发展机会。" },
  { level: 3, prompt: "会议什么时候开始？", answer: "还有十分钟就开始。" },
  { level: 3, prompt: "这次考试你准备得怎么样？", answer: "我已经复习得差不多了。" },
  { level: 3, prompt: "你对这个城市的印象怎么样？", answer: "这里很方便，人也很热情。" },
  { level: 3, prompt: "你的护照找到了吗？", answer: "找到了，在书包里。" },
  { level: 3, prompt: "你能帮我打印这份材料吗？", answer: "没问题，我现在就去。" },
  { level: 3, prompt: "医生怎么说？", answer: "他说我要多休息。" },
  { level: 3, prompt: "你习惯这里的生活了吗？", answer: "基本上已经习惯了。" },
];

const MOCK_DIALOGUE_BANK = [
  { level: 1, audio: "男：你喝茶吗？女：不，我喝水。问：女的喝什么？", prompt: "女的喝什么？", answer: "水", distractors: ["茶", "咖啡"] },
  { level: 1, audio: "女：现在几点？男：三点。问：现在几点？", prompt: "现在几点？", answer: "三点", distractors: ["两点", "四点"] },
  { level: 1, audio: "男：你去哪儿？女：我去学校。问：女的去哪儿？", prompt: "女的去哪儿？", answer: "学校", distractors: ["医院", "商店"] },
  { level: 1, audio: "女：这是谁的猫？男：是小王的。问：猫是谁的？", prompt: "猫是谁的？", answer: "小王的", distractors: ["小李的", "老师的"] },
  { level: 1, audio: "男：你会做饭吗？女：不会。问：女的会做饭吗？", prompt: "女的会做饭吗？", answer: "不会", distractors: ["会", "不知道"] },
  { level: 2, audio: "男：今天冷吗？女：不冷，但是下雨了。问：今天天气怎么样？", prompt: "今天天气怎么样？", answer: "下雨了", distractors: ["很冷", "下雪了"] },
  { level: 2, audio: "女：你怎么还没吃饭？男：我刚下班。问：男的为什么没吃饭？", prompt: "男的为什么没吃饭？", answer: "他刚下班", distractors: ["他不饿", "他在等朋友"] },
  { level: 2, audio: "男：这件红色的怎么样？女：颜色不错，但是太大了。问：女的觉得衣服怎么样？", prompt: "女的觉得衣服怎么样？", answer: "太大了", distractors: ["太小了", "颜色不好"] },
  { level: 2, audio: "女：明天一起去跑步吧。男：好，早上七点见。问：他们明天做什么？", prompt: "他们明天做什么？", answer: "跑步", distractors: ["游泳", "打篮球"] },
  { level: 2, audio: "男：去机场坐出租车要多久？女：大概四十分钟。问：去机场要多长时间？", prompt: "去机场要多长时间？", answer: "四十分钟", distractors: ["十四分钟", "一个小时"] },
  { level: 3, audio: "女：你的自行车修好了吗？男：还没有，师傅说明天下午才能修好。问：自行车什么时候能修好？", prompt: "自行车什么时候能修好？", answer: "明天下午", distractors: ["今天下午", "明天上午"] },
  { level: 3, audio: "男：你怎么不坐电梯？女：我住三楼，走楼梯还能锻炼身体。问：女的为什么走楼梯？", prompt: "女的为什么走楼梯？", answer: "想锻炼身体", distractors: ["电梯坏了", "她住一楼"] },
  { level: 3, audio: "女：这家饭店的菜怎么样？男：味道不错，就是服务有点儿慢。问：男的对什么不满意？", prompt: "男的对什么不满意？", answer: "服务", distractors: ["味道", "环境"] },
  { level: 3, audio: "男：听说你要搬家？女：对，新家离公司更近。问：女的为什么搬家？", prompt: "女的为什么搬家？", answer: "新家离公司近", distractors: ["现在的房子太小", "她换了公司"] },
  { level: 3, audio: "女：报告写完了吗？男：内容写完了，还要检查一下。问：男的接下来要做什么？", prompt: "男的接下来要做什么？", answer: "检查报告", distractors: ["开始写报告", "把报告打印出来"] },
];

const state = {
  words: [],
  mockForms: {},
  audioSpeed: loadAudioSpeed(),
  vocabularyDirection: loadVocabularyDirection(),
  currentView: "home",
  wordFilter: "all",
  exampleFilter: "all",
  checked: loadChecked(),
  checkedOnly: { words: false, examples: false },
  quiz: { questions: [], index: 0, correct: 0, answered: false, source: null, direction: "cn-ja", answers: [] },
  practice: emptyPractice(),
  progress: loadProgress(),
};

let activeAudio = null;
let speechRunId = 0;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  await loadWords();
  renderLevels();
  renderWords();
  renderExamples();
  renderChecked();
  renderProgress();
  updateSummary();
  routeFromHash();
}

async function loadWords() {
  try {
    const responses = await Promise.all([1, 2, 3].map((level) => fetch(`data/hsk${level}.json`)));
    const mockResponses = await Promise.all([1, 2, 3].map((level) => fetch(`data/mock-hsk${level}.json`)));
    if (responses.some((response) => !response.ok)) throw new Error("JSONの読み込みに失敗しました");
    if (mockResponses.some((response) => !response.ok)) throw new Error("模試データの読み込みに失敗しました");
    const groups = await Promise.all(responses.map((response) => response.json()));
    const mockGroups = await Promise.all(mockResponses.map((response) => response.json()));
    state.words = groups.flatMap((group, index) => group.map((word, wordIndex) => ({ ...word, level: index + 1, id: word.id || `hsk${index + 1}-${wordIndex + 1}` })));
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
  $("#open-examples").addEventListener("click", () => navigate("examples"));
  $("#open-exam").addEventListener("click", () => navigate("exam"));
  $("#audio-speed").value = String(state.audioSpeed);
  $("#audio-speed").addEventListener("change", (event) => {
    state.audioSpeed = Number(event.target.value) || 1;
    localStorage.setItem("hsk-audio-speed", String(state.audioSpeed));
    if (activeAudio) activeAudio.playbackRate = state.audioSpeed;
  });
  $$('[data-practice]').forEach((button) => button.addEventListener("click", () => startPractice(button.dataset.practice, Number($("#practice-level").value))));
  $$('[data-mock-level]').forEach((button) => button.addEventListener("click", () => startMockExam(Number(button.dataset.mockLevel))));
  $("#practice-close").addEventListener("click", closePractice);
  $("#practice-next").addEventListener("click", nextPracticeQuestion);
  $("#practice-audio").addEventListener("click", () => playPracticeAudio(false));
  $("#practice-retry").addEventListener("click", retryPractice);
  $("#practice-home").addEventListener("click", () => navigate("exam"));
  $("#quiz-close").addEventListener("click", () => navigate("home"));
  $("#next-question").addEventListener("click", nextQuestion);
  $("#speak-button").addEventListener("click", () => speak(state.quiz.questions[state.quiz.index], $("#speak-button")));
  $("#quiz-example-audio").addEventListener("click", () => {
    const word = state.quiz.questions[state.quiz.index];
    if (word?.example) playAudioFile(exampleAudioFile(word), $("#quiz-example-audio"), { fallbackText: word.example, role: "female" });
  });
  $("#retry-quiz").addEventListener("click", retryQuiz);
  $("#back-home").addEventListener("click", () => navigate("home"));
  $("#word-search").addEventListener("input", renderWords);
  $("#example-search").addEventListener("input", renderExamples);
  $$(".filter-chip").forEach((button) => button.addEventListener("click", () => {
    if (!button.dataset.level) return;
    state.wordFilter = button.dataset.level;
    $$(".filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
    renderWords();
  }));
  $$(".example-filter-chip").forEach((button) => button.addEventListener("click", () => {
    state.exampleFilter = button.dataset.exampleLevel;
    $$(".example-filter-chip").forEach((chip) => chip.classList.toggle("is-active", chip === button));
    renderExamples();
  }));
  $("#reset-progress").addEventListener("click", resetProgress);
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-check-id]");
    if (button) toggleChecked(button.dataset.checkId);
  });
  $("#open-checked").addEventListener("click", () => navigate("checked"));
  $$("[data-check-filter]").forEach((button) => button.addEventListener("click", () => {
    const target = button.dataset.checkFilter;
    state.checkedOnly[target] = !state.checkedOnly[target];
    button.classList.toggle("is-active", state.checkedOnly[target]);
    button.setAttribute("aria-pressed", String(state.checkedOnly[target]));
    if (target === "words") renderWords(); else renderExamples();
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
  const requested = window.location.hash.replace("#", "") || "home";
  const publicViews = ["home", "words", "examples", "checked", "exam", "progress"];
  showView(publicViews.includes(requested) ? requested : state.currentView);
}

function showView(view) {
  state.currentView = view;
  $$(".view").forEach((section) => section.classList.toggle("is-visible", section.id === `${view}-view`));
  $$(".nav-item").forEach((item) => item.classList.toggle("is-active", item.dataset.view === view));
  setMobileMenu(false);
  if (view === "words") renderWords();
  if (view === "examples") renderExamples();
  if (view === "checked") renderChecked();
  if (view === "exam") renderExamHub();
  if (view === "progress") renderProgress();
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

function startQuiz(pool, source, direction = "cn-ja", distractorPool = null) {
  if (!pool.length) {
    alert("このレベルにはまだ単語が登録されていません。");
    return;
  }
  // 出題数が少ない復習・チェックでは、選択肢が足りなくならないよう全単語から誤答を作る。
  const choicePool = distractorPool?.length ? [...distractorPool] : [...pool];
  state.quiz = { questions: shuffle([...pool]).slice(0, Math.min(10, pool.length)), choicePool, index: 0, correct: 0, answered: false, source, direction, answers: [] };
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
  panel.classList.remove("is-hidden");
  panel.classList.toggle("is-empty", !hasExample);
  $("#quiz-example-chinese").innerHTML = hasExample ? highlightWord(word.example, word.hanzi) : "";
  $("#quiz-example-pinyin").textContent = hasExample ? word.examplePinyin || "" : "";
  $("#quiz-example-pinyin").classList.toggle("is-hidden", !hasExample || !word.examplePinyin);
  $("#quiz-example-japanese").textContent = hasExample ? word.exampleMeaning : "";
  $("#quiz-example-japanese").classList.toggle("is-hidden", !hasExample);
  $("#quiz-example-empty").classList.toggle("is-hidden", hasExample);
  $("#quiz-example-audio").classList.toggle("is-hidden", !hasExample);
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
  const pool = source === "all" ? state.words : state.words.filter((word) => word.level === Number(source));
  startQuiz(pool, source, direction);
}

function renderWords() {
  const query = $("#word-search").value.trim().toLowerCase();
  const filtered = state.words.filter((word) => {
    const matchesLevel = state.wordFilter === "all" || word.level === Number(state.wordFilter);
    const haystack = `${word.hanzi} ${word.pinyin} ${word.meaning}`.toLowerCase();
    return matchesLevel && haystack.includes(query) && (!state.checkedOnly.words || state.checked.has(word.id));
  });
  $("#word-list").innerHTML = filtered.map((word) => `
    <article class="word-row">
      <span class="mini-level">HSK ${word.level}</span>
      <div><div class="hanzi">${escapeHtml(word.hanzi)}</div><div class="pinyin">${escapeHtml(word.pinyin)}</div></div>
      <div class="meaning">${escapeHtml(word.meaning)}</div>
      <div class="row-actions">
        ${checkButtonHtml(word.id)}
        <button class="speak-mini" type="button" data-word-id="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の中国語発音を聞く"><span aria-hidden="true">声</span></button>
      </div>
    </article>`).join("");
  $$("#word-list .speak-mini").forEach((button) => button.addEventListener("click", () => {
    const word = state.words.find((item) => item.id === button.dataset.wordId);
    speak(word, button);
  }));
  $("#empty-words").classList.toggle("is-hidden", filtered.length > 0);
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
  const word = state.words.find((item) => item.id === id);
  if (!word) return;
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
  if (state.currentView === "words" && state.checkedOnly.words) renderWords();
  if (state.currentView === "examples" && state.checkedOnly.examples) renderExamples();
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
          ${checkButtonHtml(word.id)}
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
  $$("#checked-view [data-checked-action]").forEach((button) => { button.disabled = words.length === 0; });
}

function updateCheckedSummary() {
  const count = state.checked.size;
  const label = $("#checked-count-label");
  if (label) label.textContent = count ? `${count}語をまとめて復習` : "気になる単語に✓を付けましょう";
  const badge = $("#checked-nav-count");
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle("is-hidden", count === 0);
  }
}

function clearChecked() {
  if (!state.checked.size || !confirm("チェックをすべて解除しますか？")) return;
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

function renderExamples() {
  const input = $("#example-search");
  if (!input) return;
  const query = input.value.trim().toLowerCase();
  const withExamples = state.words.filter((word) => word.example && word.exampleMeaning);
  const filtered = withExamples.filter((word) => {
    const matchesLevel = state.exampleFilter === "all" || word.level === Number(state.exampleFilter);
    const haystack = `${word.hanzi} ${word.pinyin} ${word.meaning} ${word.example} ${word.examplePinyin || ""} ${word.exampleMeaning}`.toLowerCase();
    return matchesLevel && haystack.includes(query) && (!state.checkedOnly.examples || state.checked.has(word.id));
  });
  $("#example-total-count").textContent = state.exampleFilter === "all" ? withExamples.length : filtered.length;
  $("#example-list").innerHTML = filtered.map((word) => `
    <article class="example-card">
      <header class="example-card-head">
        <span class="mini-level">HSK ${word.level}</span>
        <div class="example-word"><strong>${escapeHtml(word.hanzi)}</strong><span>${escapeHtml(word.pinyin)}</span><small>${escapeHtml(word.meaning)}</small></div>
        <div class="row-actions">
          ${checkButtonHtml(word.id)}
          <button class="speak-mini example-word-audio" type="button" data-word-id="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の発音を聞く"><span aria-hidden="true">声</span></button>
        </div>
      </header>
      <div class="example-sentence">
        <div><p class="example-chinese">${escapeHtml(word.example)}</p>${word.examplePinyin ? `<p class="example-pinyin">${escapeHtml(word.examplePinyin)}</p>` : ""}<p class="example-japanese">${escapeHtml(word.exampleMeaning)}</p></div>
        <button class="sentence-audio" type="button" data-example-id="${escapeHtml(word.id)}" aria-label="例文を中国語で聞く"><span aria-hidden="true">▶</span> 例文を聞く</button>
      </div>
    </article>`).join("");
  $$(".example-word-audio").forEach((button) => button.addEventListener("click", () => {
    const word = state.words.find((item) => item.id === button.dataset.wordId);
    speak(word, button);
  }));
  $$(".sentence-audio").forEach((button) => button.addEventListener("click", () => {
    const word = state.words.find((item) => item.id === button.dataset.exampleId);
    playAudioFile(exampleAudioFile(word), button, { fallbackText: word?.example, role: "female" });
  }));
  $("#empty-examples").classList.toggle("is-hidden", filtered.length > 0);
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
    ? state.progress.mocks.map((mock) => `<div class="mock-history-row"><span>${escapeHtml(mock.date)} · HSK ${mock.level}</span><strong>${mock.score}<small> / ${mock.maxScore}</small></strong><b class="${mock.passed ? "is-pass" : "is-retry"}">${mock.passed ? "合格" : "再挑戦"}</b></div>`).join("")
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
}

function getLevelPool(level) {
  return state.words.filter((word) => word.level <= level);
}

function startPractice(mode, level, source = null) {
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
    questions = reviewPool.slice(0, 10).map((word, index) => index % 2 ? makeReadingQuestion(word, actualLevel, index) : makeListeningQuestion(word, actualLevel, index));
  }
  if (!questions.length) return alert("出題できる問題がありません。");
  state.practice = { ...emptyPractice(), mode, level: actualLevel, questions, sourceLabel: source ? "チェックした単語" : "", lastStart: { mode, level: actualLevel, isMock: false, checked: Boolean(source) }, sectionStats: {} };
  showView("practice");
  renderPracticeQuestion();
}

function startMockExam(level) {
  const config = EXAM_CONFIG[level];
  const sourceQuestions = state.mockForms[level]?.questions;
  if (!sourceQuestions?.length) return alert("模試データを読み込めませんでした。");
  const questions = JSON.parse(JSON.stringify(sourceQuestions)).map((question) => ({ ...question, mockFormat: question.skill === "writing", selected: [] }));
  state.practice = {
    ...emptyPractice(), mode: "mock", level, questions, isMock: true,
    lastStart: { mode: "mock", level, isMock: true }, sectionStats: {},
  };
  showView("practice");
  $("#practice-timer").classList.remove("is-hidden");
  renderPracticeQuestion();
}

function makeListeningQuestions(level, count, source = null) {
  const pool = source?.length ? source : getLevelPool(level);
  const examplePool = pool.filter((word) => word.example && word.exampleMeaning);
  return Array.from({ length: count }, (_, index) => {
    const source = index % 2 && examplePool.length ? examplePool : pool;
    return makeListeningQuestion(shuffle([...source])[0], level, index);
  });
}

function makeMockListeningQuestions(level, count) {
  const responsePool = MOCK_RESPONSE_BANK.map((item, index) => ({ ...item, audioFile: `audio/sentences/mock-response-${String(index + 1).padStart(3, "0")}.wav` })).filter((item) => item.level <= level);
  const dialoguePool = MOCK_DIALOGUE_BANK.map((item, index) => ({ ...item, audioFile: `audio/sentences/mock-dialogue-${String(index + 1).padStart(3, "0")}.wav` })).filter((item) => item.level <= level);
  const examplePool = getLevelPool(level).filter((word) => word.example);
  const responseItems = shuffle([...responsePool]);
  const dialogueItems = shuffle([...dialoguePool]);
  const exampleItems = shuffle([...examplePool]);
  return Array.from({ length: count }, (_, index) => {
    const type = level === 3 ? (index < 10 ? 2 : 1) : (level === 2 ? (index % 5 === 0 ? 0 : 1) : index % 2);
    if (type === 0) {
      const item = responseItems[index % responseItems.length];
      const otherAnswers = shuffle(responsePool.filter((candidate) => candidate.answer !== item.answer)).slice(0, 2).map((candidate) => candidate.answer);
      return {
        skill: "listening", kind: "audio-response", audioText: item.prompt, audioFile: item.audioFile,
        choices: shuffle([item.answer, ...otherAnswers]).map((label) => ({ value: label, label })), correct: item.answer,
        instruction: "请听问题，选择正确的回答。", explanation: `${item.prompt} — ${item.answer}`, audioPlays: 0,
      };
    }
    if (type === 1) {
      const item = dialogueItems[index % dialogueItems.length];
      const choices = shuffle([item.answer, ...item.distractors]).map((label) => ({ value: label, label }));
      return {
        skill: "listening", kind: "audio-dialogue", audioText: item.audio, audioFile: item.audioFile,
        choices, correct: item.answer, instruction: "请听对话，选择正确答案。",
        explanation: `${item.prompt} — ${item.answer}`, audioPlays: 0,
      };
    }
    const word = exampleItems[index % exampleItems.length];
    const isCorrect = index % 2 === 0;
    const printed = isCorrect ? word : exampleItems[(index + 7) % exampleItems.length];
    return {
      skill: "listening", kind: "audio-judge", wordId: word.id, audioText: word.example, audioFile: exampleAudioFile(word), prompt: printed.example,
      choices: [{ value: "true", label: "对" }, { value: "false", label: "不对" }], correct: String(isCorrect),
      instruction: "请听录音，判断内容是否与句子一致。", explanation: isCorrect ? "对" : "不对", audioPlays: 0,
    };
  });
}

function makeListeningQuestion(word, level, index) {
  const pool = getLevelPool(level);
  if (index % 2 && word.example) {
    const candidates = pool.filter((item) => item.exampleMeaning && item.id !== word.id);
    const choices = uniqueChoices([{ value: word.id, label: word.exampleMeaning }, ...shuffle(candidates).slice(0, 3).map((item) => ({ value: item.id, label: item.exampleMeaning }))]);
    return { skill: "listening", kind: "audio-sentence", wordId: word.id, audioText: word.example, audioFile: exampleAudioFile(word), choices: shuffle(choices), correct: word.id, instruction: "音声の内容として正しいものを選んでください", explanation: `${word.example}（${word.exampleMeaning}）`, audioPlays: 0 };
  }
  const choices = uniqueChoices([{ value: word.id, label: word.meaning }, ...shuffle(pool.filter((item) => item.id !== word.id && item.meaning !== word.meaning)).slice(0, 3).map((item) => ({ value: item.id, label: item.meaning }))]);
  return { skill: "listening", kind: "audio-word", wordId: word.id, audioWord: word, choices: shuffle(choices), correct: word.id, instruction: "音声で聞こえた単語の意味を選んでください", explanation: `${word.hanzi}（${word.pinyin}）— ${word.meaning}`, audioPlays: 0 };
}

function makeReadingQuestions(level, count, source = null) {
  const pool = source?.length ? source : getLevelPool(level);
  return Array.from({ length: count }, (_, index) => makeReadingQuestion(shuffle([...pool])[0], level, index));
}

function makeMockReadingQuestions(level, count) {
  const responsePool = MOCK_RESPONSE_BANK.filter((item) => item.level <= level);
  const dialoguePool = MOCK_DIALOGUE_BANK.filter((item) => item.level <= level);
  const examplePool = getLevelPool(level).filter((word) => word.example?.includes(word.hanzi));
  const responseItems = shuffle([...responsePool]);
  const dialogueItems = shuffle([...dialoguePool]);
  const exampleItems = shuffle([...examplePool]);
  return Array.from({ length: count }, (_, index) => {
    const pattern = level === 1 ? [0, 1] : (level === 2 ? [0, 0, 0, 1, 2] : [0, 1, 3]);
    const type = pattern[index % pattern.length];
    if (type === 0) {
      const item = responseItems[index % responseItems.length];
      const otherAnswers = shuffle(responsePool.filter((candidate) => candidate.answer !== item.answer)).slice(0, 2).map((candidate) => candidate.answer);
      return {
        skill: "reading", kind: "reading-response", prompt: item.prompt,
        choices: shuffle([item.answer, ...otherAnswers]).map((label) => ({ value: label, label })), correct: item.answer,
        instruction: "请选择与问句相对应的回答。", explanation: `${item.prompt} — ${item.answer}`,
      };
    }
    if (type === 1) {
      const word = exampleItems[index % exampleItems.length];
      const candidates = shuffle(examplePool.filter((item) => item.id !== word.id && item.hanzi !== word.hanzi)).slice(0, 2);
      return {
        skill: "reading", kind: "reading-cloze", wordId: word.id, prompt: word.example.replace(word.hanzi, "＿＿＿"),
        choices: shuffle([{ value: word.id, label: word.hanzi }, ...candidates.map((item) => ({ value: item.id, label: item.hanzi }))]),
        correct: word.id, instruction: "请选择合适的词语填空。", explanation: word.example,
      };
    }
    if (type === 2) {
      const first = exampleItems[index % exampleItems.length];
      const isCorrect = index % 8 === 2;
      const second = isCorrect ? first : exampleItems[(index + 5) % exampleItems.length];
      return {
        skill: "reading", kind: "reading-judge", wordId: first.id, prompt: first.example,
        subPrompt: second.example, choices: [{ value: "true", label: "对" }, { value: "false", label: "不对" }],
        correct: String(isCorrect), instruction: "请判断下面两句话的意思是否一致。", explanation: isCorrect ? "对" : "不对",
      };
    }
    const item = dialogueItems[index % dialogueItems.length];
    return {
      skill: "reading", kind: "reading-comprehension", prompt: item.audio.replace(/问：.*$/, ""), subPrompt: item.prompt,
      choices: shuffle([item.answer, ...item.distractors]).map((label) => ({ value: label, label })), correct: item.answer,
      instruction: "请阅读短文，选择正确答案。", explanation: `${item.prompt} — ${item.answer}`,
    };
  });
}

function makeReadingQuestion(word, level, index) {
  const pool = getLevelPool(level);
  const type = index % 3;
  if (type === 1) {
    const choices = uniqueChoices([{ value: word.id, label: word.pinyin }, ...shuffle(pool.filter((item) => item.id !== word.id && item.pinyin !== word.pinyin)).slice(0, 3).map((item) => ({ value: item.id, label: item.pinyin }))]);
    return { skill: "reading", kind: "pinyin", wordId: word.id, prompt: word.hanzi, choices: shuffle(choices), correct: word.id, instruction: "正しいピンインを選んでください", explanation: `${word.hanzi} — ${word.pinyin} — ${word.meaning}` };
  }
  if (type === 2 && word.example?.includes(word.hanzi)) {
    const choices = uniqueChoices([{ value: word.id, label: word.hanzi }, ...shuffle(pool.filter((item) => item.id !== word.id && item.hanzi !== word.hanzi)).slice(0, 3).map((item) => ({ value: item.id, label: item.hanzi }))]);
    return { skill: "reading", kind: "fill", wordId: word.id, prompt: word.example.replace(word.hanzi, "＿＿＿"), subPrompt: word.exampleMeaning, choices: shuffle(choices), correct: word.id, instruction: "空欄に入る単語を選んでください", explanation: `${word.example}（${word.exampleMeaning}）` };
  }
  const choices = uniqueChoices([{ value: word.id, label: word.meaning }, ...shuffle(pool.filter((item) => item.id !== word.id && item.meaning !== word.meaning)).slice(0, 3).map((item) => ({ value: item.id, label: item.meaning }))]);
  return { skill: "reading", kind: "meaning", wordId: word.id, prompt: word.hanzi, subPrompt: word.pinyin, choices: shuffle(choices), correct: word.id, instruction: "単語の意味を選んでください", explanation: `${word.hanzi}（${word.pinyin}）— ${word.meaning}` };
}

function makeWritingQuestions(count, isMock = false) {
  const reorder = shuffle(WRITING_BANK.filter((item) => item.type === "reorder"));
  const input = shuffle(WRITING_BANK.filter((item) => item.type === "input"));
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
  $("#practice-mode-label").textContent = session.isMock ? `写真なし模試 · ${SKILL_LABELS[question.skill]} 第${question.part || 1}部分` : (session.mode === "srs" ? `間隔反復 · ${SKILL_LABELS[question.skill]}` : SKILL_LABELS[question.skill]);
  $("#practice-step").textContent = `${session.index + 1} / ${session.questions.length}`;
  $("#practice-progress-bar").style.width = `${(session.index / session.questions.length) * 100}%`;
  $("#practice-instruction").textContent = question.instruction;
  $("#practice-feedback").textContent = "";
  $("#practice-feedback").className = "answer-feedback";
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
  else if (question.kind === "reorder") prompt.innerHTML = `${question.mockFormat ? "" : `<p class="writing-hint">${escapeHtml(question.meaning)}</p>`}<div id="ordered-answer" class="ordered-answer">${question.mockFormat ? "请在这里排列句子" : "ここに語順を作ります"}</div>`;
  else prompt.innerHTML = `<h2 class="${question.kind.startsWith("reading-") ? "mock-reading-prompt" : "reading-prompt"}">${escapeHtml(question.prompt)}</h2>${question.promptPinyin ? `<p class="mock-pinyin">${escapeHtml(question.promptPinyin)}</p>` : ""}${question.subPrompt ? `<p class="reading-subprompt">${escapeHtml(question.subPrompt)}</p>` : ""}${question.subPromptPinyin ? `<p class="mock-pinyin">${escapeHtml(question.subPromptPinyin)}</p>` : ""}`;
  renderPracticeAnswers(question);
  if (session.isMock && isAudioQuestion && !(question.audioPlays > 0)) window.setTimeout(() => {
    if (state.practice === session && state.practice.questions[state.practice.index]?.id === question.id && !(question.audioPlays > 0)) playPracticeAudio(true);
  }, 450);
}

function renderPracticeAnswers(question) {
  const area = $("#practice-answer-area");
  if (question.choices) {
    area.innerHTML = `<div class="answer-list">${question.choices.map((choice, index) => `<button class="answer-button practice-choice${/^\p{Extended_Pictographic}/u.test(choice.label) ? " visual-choice-button" : ""}" type="button" data-value="${escapeHtml(choice.value)}" data-key="${String.fromCharCode(65 + index)}"${choice.ariaLabel ? ` aria-label="${escapeHtml(choice.ariaLabel)}"` : ""}><span class="choice-main">${escapeHtml(choice.label)}</span>${choice.pinyin ? `<small class="choice-pinyin">${escapeHtml(choice.pinyin)}</small>` : ""}</button>`).join("")}</div>`;
    $$(".practice-choice").forEach((button) => button.addEventListener("click", () => answerPractice(button.dataset.value, button)));
  } else if (question.kind === "reorder") {
    question.selected = [];
    area.innerHTML = `<div class="token-bank">${shuffle(question.tokens.map((token, index) => ({ token, index }))).map((item) => `<button type="button" class="word-token" data-token-index="${item.index}">${escapeHtml(item.token)}</button>`).join("")}</div><div class="writing-actions"><button id="reset-order" class="secondary-button" type="button">${question.mockFormat ? "重新排列" : "やり直す"}</button><button id="submit-order" class="primary-button" type="button">${question.mockFormat ? "提交答案" : "解答する"}</button></div>`;
    $$(".word-token").forEach((button) => button.addEventListener("click", () => {
      if (button.disabled) return;
      question.selected.push(question.tokens[Number(button.dataset.tokenIndex)]);
      button.disabled = true;
      $("#ordered-answer").textContent = question.selected.join("");
    }));
    $("#reset-order").addEventListener("click", () => renderPracticeQuestion());
    $("#submit-order").addEventListener("click", () => answerPractice(question.selected.join(""), $("#submit-order")));
  } else {
    area.innerHTML = `<form id="writing-form" class="writing-form"><label for="writing-input">${question.mockFormat ? "请写一个汉字" : "漢字で入力"}</label><input id="writing-input" type="text" lang="zh-CN" autocomplete="off" placeholder="${question.mockFormat ? "输入汉字" : "答えを入力"}" /><button class="primary-button" type="submit">${question.mockFormat ? "提交答案" : "解答する"}</button></form>`;
    $("#writing-form").addEventListener("submit", (event) => { event.preventDefault(); answerPractice($("#writing-input").value, $("#writing-form button")); });
    $("#writing-input").focus();
  }
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
  if (question.choices) {
    $$(".practice-choice").forEach((button) => {
      button.disabled = true;
      if (normalizeAnswer(button.dataset.value) === normalizeAnswer(question.correct)) button.classList.add("is-correct");
    });
    if (!correct) selectedButton?.classList.add("is-wrong");
  } else {
    $$(".practice-answer-area button, .practice-answer-area input").forEach((element) => { element.disabled = true; });
  }
  if (!session.isMock) {
    $("#practice-feedback").textContent = correct ? `正解！ ${question.explanation || question.answer}` : `正解：${question.explanation || question.answer}`;
    $("#practice-feedback").classList.add(correct ? "correct" : "wrong");
  }
  saveProgress();
  const next = session.questions[session.index + 1];
  if (session.isMock && next && next.skill !== question.skill) $("#practice-next").innerHTML = `${SKILL_LABELS[next.skill]}へ進む <span>→</span>`;
  $("#practice-next").classList.remove("is-hidden");
  $("#practice-next").focus();
}

function nextPracticeQuestion() {
  state.practice.index += 1;
  if (state.practice.index >= state.practice.questions.length) finishPractice(); else renderPracticeQuestion();
}

function playPracticeAudio(autoRepeat = false) {
  const question = state.practice.questions[state.practice.index];
  if (!question || question.audioPlays >= 2) return;
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
  $("#audio-play-count").textContent = state.practice.isMock ? (question.audioPlays < 2 ? "正在按考试速度播放" : "已播放两次") : `残り${2 - question.audioPlays}回`;
  if (question.audioPlays >= 2) window.setTimeout(() => { button.disabled = true; }, 100);
}

function finishPractice(timedOut = Boolean(state.practice.timedOutSections?.length)) {
  const session = state.practice;
  clearPracticeTimer();
  stopAudio();
  $("#practice-timer").classList.add("is-hidden");
  const attempted = Object.values(session.sectionStats).reduce((sum, item) => sum + item.answered, 0);
  $("#practice-result-mark").textContent = timedOut ? "時" : (session.isMock ? "試" : "成");
  $("#practice-result-title").textContent = session.isMock ? `HSK ${session.level} 模試結果` : "トレーニング完了";
  if (session.isMock) {
    const config = EXAM_CONFIG[session.level];
    const skills = ["listening", "reading", ...(session.level === 3 ? ["writing"] : [])];
    // 模試では未回答も不正解として扱い、各技能を100点満点に換算する。
    const scores = skills.map((skill) => Math.round(((session.sectionStats[skill]?.correct || 0) / config[skill]) * 100));
    const total = scores.reduce((sum, score) => sum + score, 0);
    const passed = total >= config.passScore;
    $("#practice-result-score").textContent = total;
    $("#practice-result-unit").textContent = `/ ${config.maxScore} 点`;
    $("#practice-result-subtitle").textContent = passed ? "合格ライン到達" : "合格まであと少し";
    $("#practice-result-message").textContent = timedOut ? "時間切れです。技能別結果から復習しましょう。" : (passed ? "合格です。太棒了！" : `合格点は${config.passScore}点です。苦手技能を練習しましょう。`);
    $("#practice-breakdown").innerHTML = skills.map((skill, index) => `<div><span>${SKILL_LABELS[skill]}</span><strong>${scores[index]}</strong><small>/ 100</small></div>`).join("");
    state.progress.mocks.unshift({ date: todayString(), level: session.level, score: total, maxScore: config.maxScore, passed });
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
  if (last.isMock) startMockExam(last.level);
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
    <div class="review-item-head"><span class="review-index">${entry.number}</span><span class="review-tag">${escapeHtml(entry.tag)}</span><span class="review-mark">${marks[entry.status]}</span>${entry.wordId ? checkButtonHtml(entry.wordId) : ""}</div>
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
  const today = todayString();
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
  const today = todayString();
  return state.words.filter((word) => state.progress.srs[word.id] && state.progress.srs[word.id].due <= today);
}

function masteryScore(word) { return state.progress.srs[word.id]?.repetitions || 0; }
function todayString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function startOfCurrentWeek() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return todayString(date);
}
function calculateStreak() {
  const dates = new Set(state.progress.studyDates || []);
  if (!dates.size) return 0;
  const cursor = new Date();
  if (!dates.has(todayString(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(todayString(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
function addDays(dateString, days) { const date = new Date(`${dateString}T12:00:00`); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10); }
function normalizeAnswer(value) { return String(value || "").replace(/[\s。！？,.，?!]/g, "").toLowerCase(); }
function exampleAudioFile(word) { return word?.id ? `audio/sentences/example-${word.id}.wav` : ""; }
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
  playAudioFile(`audio/${encodeURIComponent(word.id)}.wav`, button, { fallbackText: word.hanzi, role: "female" });
}

function playAudioFile(file, button, options = {}) {
  if (!file) return speakWithBrowser(options.fallbackText, button, { rate: options.fallbackRate || .78, role: options.role || "female" });
  stopAudio();
  button?.classList.add("is-playing");
  const audio = new Audio(`${file}?v=prerendered-2`);
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
    utterance.lang = "zh-CN";
    utterance.rate = rate;
    utterance.pitch = segment.role === "male" ? .92 : (segment.role === "female" ? 1.04 : 1);
    utterance.volume = 1;
    utterance.voice = selectChineseVoice(segment.role);
    utterance.onend = () => {
      if (runId !== speechRunId) return;
      index += 1;
      if (index >= segments.length) finishAudioButton(button);
      else window.setTimeout(playNext, 230);
    };
    utterance.onerror = () => { if (runId === speechRunId) finishAudioButton(button); };
    window.speechSynthesis.speak(utterance);
  };
  playNext();
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

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}
