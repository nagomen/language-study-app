// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, escapeHtml, checkButtonHtml } from "../shared.js";
import { bindWordRowAudio, speak } from "./audio.js";
import { categoryById } from "./categories.js";
import { LEVEL_META } from "./config.js";
import { startQuiz } from "./quiz.js";
import { state } from "./state.js";
import { wordLevelLabel } from "./util.js";

export function renderLevels() {
  const grid = $("#level-grid");
  grid.innerHTML = "";
  [1, 2, 3].forEach((level) => {
    const card = $("#level-card-template").content.firstElementChild.cloneNode(true);
    const words = state.words.filter((word) => word.level === level);
    const officialCount = words.filter((word) => !word.legacySupplement).length;
    const supplementCount = words.length - officialCount;
    card.dataset.level = level;
    card.querySelector(".level-number strong").textContent = level;
    card.querySelector(".level-name").textContent = LEVEL_META[level].name;
    card.querySelector("h3").textContent = LEVEL_META[level].title;
    card.querySelector("p").textContent = LEVEL_META[level].description;
    card.querySelector(".word-count").textContent = `${officialCount}語 + 旧版補完${supplementCount}語`;
    card.querySelector(".start-level").addEventListener("click", () => startQuiz(words, level, state.vocabularyDirection));
    grid.append(card);
  });
}

export function renderWords() {
  const filtered = getFilteredWords();
  const quizButton = $("#word-filter-quiz");
  quizButton.disabled = filtered.length === 0;
  quizButton.setAttribute("aria-label", `表示中の${filtered.length}語から単語テストを開始`);
  quizButton.title = filtered.length ? `表示中の${filtered.length}語から最大10問を出題します` : "この条件に合う単語がありません";
  const list = $("#word-list");
  list.classList.toggle("is-quiz-mode", state.wordHideMeaning);
  list.innerHTML = filtered.map((word) => wordCardHtml(word)).join("");
  bindWordRowAudio(list);
  $("#empty-words").classList.toggle("is-hidden", filtered.length > 0);
  $("#word-count-label").textContent = `${filtered.length}語`;
}

export function getFilteredWords() {
  const query = $("#word-search").value.trim().toLowerCase();
  return state.words.filter((word) => {
    const matchesLevel = state.wordFilter === "all" || word.level === Number(state.wordFilter);
    const matchesEdition = state.wordEditionFilter === "all"
      || (state.wordEditionFilter === "new-2026" ? word.newIn2026 : word.legacySupplement);
    const matchesCategory = state.wordCategory === "all" || (word.tags || []).includes(state.wordCategory);
    return matchesLevel && matchesEdition && matchesCategory && wordHaystack(word).includes(query) && (!state.checkedOnly.words || state.checked.has(word.id));
  });
}

// 単語帳は1語1行。左に見出しと意味、右に例文を置く。
function wordCardHtml(word) {
  const tags = (word.tags || []).map((id) => categoryById(id)).filter(Boolean).slice(0, 2);
  const comparisons = comparisonGroupsForWord(word).slice(0, 2);
  return `
    <article class="word-entry" data-level="${word.level}" data-card-id="${escapeHtml(word.id)}">
      <div class="entry-head">
        <div class="entry-word">
          <span class="hanzi">${escapeHtml(word.hanzi)}</span>
          <span class="pinyin">${escapeHtml(word.pinyin)}</span>
        </div>
        <span class="mini-level">${wordLevelLabel(word)}</span>
      </div>
      <div class="entry-body">
        <p class="meaning">${escapeHtml(word.meaning)}</p>
        ${tags.length || comparisons.length ? `<div class="word-tags">${tags.map((category) => `<button class="tag-chip" type="button" data-category-open="${escapeHtml(category.id)}" title="「${escapeHtml(category.label)}」の分類を開く">${escapeHtml(category.label)}</button>`).join("")}${comparisons.map((group) => comparisonTagHtml(group)).join("")}</div>` : ""}
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

export function wordHaystack(word) {
  return `${word.hanzi} ${word.pinyin} ${word.meaning} ${word.example || ""} ${word.examplePinyin || ""} ${word.exampleMeaning || ""}`.toLowerCase();
}

// 毎日30語・分類ページの一覧行。例文つきでも表示できる。
export function wordRowHtml(word, { showExample = false } = {}) {
  const hasExample = showExample && Boolean(word.example);
  return `
    <article class="word-row${hasExample ? " has-example" : ""}">
      <div class="word-main">
        <div class="word-headline">
          <span class="hanzi">${escapeHtml(word.hanzi)}</span>
          <span class="pinyin">${escapeHtml(word.pinyin)}</span>
          <span class="mini-level">${wordLevelLabel(word)}</span>
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
  const comparisons = comparisonGroupsForWord(word).slice(0, 2);
  if (!tags.length && !comparisons.length) return "";
  return `<div class="word-tags">${tags.map((category) => `<button class="tag-chip" type="button" data-category-open="${escapeHtml(category.id)}" title="「${escapeHtml(category.label)}」の分類を開く">${escapeHtml(category.label)}</button>`).join("")}${comparisons.map((group) => comparisonTagHtml(group)).join("")}</div>`;
}

function comparisonGroupsForWord(word) {
  return (state.wordComparisons || []).filter((group) => group.wordIds.includes(word.id));
}

function comparisonTagHtml(group) {
  return `<button class="tag-chip comparison-tag" type="button" data-comparison-open="${escapeHtml(group.id)}" title="「${escapeHtml(group.title)}」で使い分けを見る">近 ${escapeHtml(group.title)}</button>`;
}
