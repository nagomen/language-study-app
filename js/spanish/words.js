// spanish.js から機能ごとに切り出したモジュール。
import { $, escapeHtml, checkButtonHtml } from "../shared.js";
import { LEVELS, LEVEL_META } from "./config.js";
import { startQuiz } from "./quiz.js";
import { state } from "./state.js";
import { normalize } from "./util.js";

export function renderLevels() {
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

export function renderWords() {
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
    actions.innerHTML = checkButtonHtml(word.id, state.checked.has(word.id));
    actions.append(speak);
    row.append(term, meaning, pos, category, actions);
    list.append(row);
  });
}
