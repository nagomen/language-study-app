// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, $$, escapeHtml } from "../shared.js";
import { bindWordRowAudio } from "./audio.js";
import { CATEGORY_GROUP_META, CATEGORY_GUIDES, CATEGORY_QUIZ_MIN_POOL } from "./config.js";
import { guideById, renderGuideBand, renderMeasureGuide } from "./guide.js";
import { navigate, showView } from "./main.js";
import { startPractice } from "./practice.js";
import { startQuiz } from "./quiz.js";
import { state } from "./state.js";
import { wordHaystack, wordRowHtml } from "./words.js";

export function categoryById(id) {
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

export function renderCategories() {
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

export function openCategory(id) {
  if (!categoryById(id)) return;
  state.selectedCategory = id;
  if (window.location.hash === `#categories/${id}`) showView("categories");
  else window.location.hash = `categories/${id}`;
}

export function closeCategoryDetail() {
  state.selectedCategory = null;
  navigate("categories");
}

export function startCategoryQuiz(id = state.selectedCategory) {
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

export function startCategoryPractice(mode, id = state.selectedCategory) {
  const category = categoryById(id);
  if (!category) return;
  const pool = categoryWords(category.id, { withQuery: true });
  if (!pool.length) return alert("この条件に合う単語がありません。レベルやチェックの絞り込みを外してください。");
  const level = state.categoryFilter === "all" ? 3 : Number(state.categoryFilter);
  startPractice(mode, level, pool, { label: `${category.label}の単語`, categoryId: category.id });
}

export function renderWordCategoryOptions() {
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
