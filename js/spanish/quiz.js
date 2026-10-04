// spanish.js から機能ごとに切り出したモジュール。
import { $, $$, createAnswerButton, shuffle } from "../shared.js";
import { LEVELS, QUIZ_SIZE } from "./config.js";
import { showView } from "./main.js";
import { recordAnswer, renderHomeStats } from "./progress.js";
import { buildQuizReview, setReview } from "./review.js";
import { state } from "./state.js";
import { getCheckedWords } from "./storage.js";
import { sample, uniqueBy } from "./util.js";

export function startQuiz(pool, source) {
  if (!pool.length) return;
  state.quiz = sample(pool, Math.min(QUIZ_SIZE, pool.length));
  state.quizIndex = 0;
  state.quizCorrect = 0;
  state.quizAnswers = [];
  state.lastQuizSource = source;
  showView("quiz");
  renderQuestion();
}

export function startReviewQuiz() {
  const wrong = new Set(state.progress.wrongIds);
  const pool = state.words.filter((word) => wrong.has(word.id));
  if (pool.length) startQuiz(pool, "review");
}

export function retryQuiz() {
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
    const button = createAnswerButton(index);
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

export function nextQuestion() {
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

export function startCheckedQuiz() {
  const words = getCheckedWords();
  if (!words.length) return;
  startQuiz(words, "checked");
}
