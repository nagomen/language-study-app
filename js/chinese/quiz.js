// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, $$, escapeHtml, shuffle } from "../shared.js";
import { speak } from "./audio.js";
import { startCategoryQuiz } from "./categories.js";
import { startCheckedQuiz } from "./checked.js";
import { completeDailySession, startDailyRetry, startDailyReview, startDailySession } from "./daily.js";
import { showView } from "./main.js";
import { recordStudy, updateSummary } from "./progress.js";
import { buildQuizReview, setReview } from "./review.js";
import { state } from "./state.js";
import { saveProgress } from "./storage.js";

export function startQuiz(pool, source, direction = "cn-ja", distractorPool = null, options = {}) {
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

export function startReviewQuiz(direction = state.vocabularyDirection) {
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

export function revealQuizExample() {
  $("#quiz-example-target").classList.remove("is-hidden");
  $("#quiz-example-reveal").classList.add("is-hidden");
}

function highlightWord(sentence, hanzi) {
  const escaped = escapeHtml(sentence);
  if (!hanzi) return escaped;
  return escaped.split(escapeHtml(hanzi)).join(`<b class="example-target">${escapeHtml(hanzi)}</b>`);
}

export function nextQuestion() {
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

export function retryQuiz() {
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
