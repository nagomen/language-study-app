// spanish.js から機能ごとに切り出したモジュール。
import { $, $$, setMobileMenu } from "../shared.js";
import { speakSpanish } from "./audio.js";
import { clearChecked, exportChecked, importCheckedFile, renderChecked, toggleChecked } from "./checked.js";
import { LEVELS, STORAGE_KEY } from "./config.js";
import { renderHomeStats, renderProgress } from "./progress.js";
import { nextQuestion, retryQuiz, startCheckedQuiz, startQuiz, startReviewQuiz } from "./quiz.js";
import { renderReview } from "./review.js";
import { state } from "./state.js";
import { defaultProgress } from "./storage.js";
import { checkResponse } from "./util.js";
import { renderLevels, renderWords } from "./words.js";

async function init() {
  try {
    // データを更新したときに古いJSONを掴まないよう、毎回サーバーに確認させる。
    const lists = await Promise.all(LEVELS.map((level) => fetch(`data/spanish/dele-${level.toLowerCase()}.json`, { cache: "no-cache" }).then(checkResponse).then((response) => response.json())));
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

export function showView(view) {
  state.currentView = view;
  $$(".view").forEach((section) => section.classList.toggle("is-visible", section.id === `${view}-view`));
  $$(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  setMobileMenu(false);
  if (view === "progress") renderProgress();
  if (view === "checked") renderChecked();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.addEventListener("DOMContentLoaded", init);
