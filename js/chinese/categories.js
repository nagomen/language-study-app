// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, $$, checkButtonHtml, escapeHtml } from "../shared.js";
import { bindWordRowAudio, speakButtonHtml } from "./audio.js";
import { CATEGORY_GROUP_META, CATEGORY_GUIDES, CATEGORY_QUIZ_MIN_POOL } from "./config.js";
import { unitById } from "./grammar.js";
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
  renderCategoryFeature(category, words, { hidden: isMeasure });
  // その分類に対応する解説（文法の単元かコラム）があれば、一覧の上から直接開けるようにする。
  const target = CATEGORY_GUIDES[category.id] || "";
  const guide = target.startsWith("column:") ? guideById(target.slice(7)) : null;
  const unit = target.startsWith("column:") ? null : unitById(target);
  const guideLink = $("#category-guide-link");
  guideLink.classList.toggle("is-hidden", !guide && !unit);
  guideLink.removeAttribute("data-guide-open");
  guideLink.removeAttribute("data-grammar-open");
  if (guide) {
    guideLink.dataset.guideOpen = guide.id;
    guideLink.innerHTML = `<span class="guide-card-mark">${escapeHtml(guide.mark || "文")}</span>
      <span class="guide-card-body"><strong>解説：${escapeHtml(guide.title)}</strong><small>${escapeHtml(guide.blurb || "")}</small></span>
      <span class="guide-card-go" aria-hidden="true">→</span>`;
  } else if (unit) {
    guideLink.dataset.grammarOpen = unit.id;
    guideLink.innerHTML = `<span class="guide-card-mark">法</span>
      <span class="guide-card-body"><strong>文法の単元：${escapeHtml(unit.title)}</strong><small>${escapeHtml(unit.goal)}</small></span>
      <span class="guide-card-go" aria-hidden="true">→</span>`;
  }
  if (isMeasure) {
    const visibleCount = renderMeasureGuide();
    $("#category-detail-count").textContent = visibleCount;
    $("#category-detail-count").nextElementSibling.textContent = "量詞";
    $("#empty-category-words").classList.toggle("is-hidden", visibleCount > 0);
    $("#measure-quiz").disabled = visibleCount === 0;
    $$("#category-quiz, [data-category-practice]").forEach((button) => { button.disabled = words.length === 0; });
    return;
  } else {
    $("#category-detail-count").nextElementSibling.textContent = "単語";
    $("#category-word-list").innerHTML = words.map((word) => wordRowHtml(word, { showExample: true })).join("");
    bindWordRowAudio($("#category-word-list"));
  }
  $("#empty-category-words").classList.toggle("is-hidden", words.length > 0);
  $$("#category-quiz, #measure-quiz, [data-category-practice]").forEach((button) => { button.disabled = words.length === 0; });
}

// 単語一覧の前に、分類内の語を「まとまり・文型・会話」に組み直した学習ページを表示する。
// データがある分類だけを拡張できるようにし、通常の分類ページはこれまでどおり軽量に保つ。
function renderCategoryFeature(category, visibleWords, { hidden = false } = {}) {
  const container = $("#category-feature");
  const guide = state.categoryGuides[category.id];
  container.classList.toggle("is-hidden", hidden || !guide);
  if (hidden || !guide) {
    container.innerHTML = "";
    return;
  }

  const visibleIds = new Set(visibleWords.map((word) => word.id));
  const findWord = (id) => state.words.find((word) => word.id === id);
  const groups = (guide.groups || []).map((group) => {
    const words = group.wordIds.map(findWord).filter((word) => word && visibleIds.has(word.id));
    if (!words.length) return "";
    return `<section class="category-feature-section category-vocabulary-group">
      <header><div><h4>${escapeHtml(group.title)}</h4><p>${escapeHtml(group.description || "")}</p></div><span>${words.length}語</span></header>
      <div class="category-word-map">${words.map((word) => `<article class="category-word-chip">
        <div class="category-word-chip-copy"><strong>${escapeHtml(word.hanzi)}</strong><span>${escapeHtml(word.pinyin)}</span><p>${escapeHtml(word.meaning)}</p></div>
        <div class="category-word-chip-actions">
          ${checkButtonHtml(word.id, state.checked.has(word.id))}
          <button class="speak-mini" type="button" data-word-id="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の中国語発音を聞く"><span aria-hidden="true">声</span></button>
        </div>
      </article>`).join("")}</div>
    </section>`;
  }).join("");

  const patterns = (guide.patterns || []).map((pattern) => `<article class="category-pattern-card">
    <div class="category-pattern-head"><span>${escapeHtml(pattern.label)}</span><code>${escapeHtml(pattern.formula)}</code></div>
    <div class="category-pattern-example">
      <div><strong>${escapeHtml(pattern.example.cn)}</strong><small>${escapeHtml(pattern.example.pinyin)}</small><p>${escapeHtml(pattern.example.ja)}</p></div>
      ${speakButtonHtml(pattern.example.cn, `${pattern.label}の例文を聞く`)}
    </div>
    <p class="category-pattern-tip">${escapeHtml(pattern.tip)}</p>
  </article>`).join("");

  const comparisons = (guide.comparisons || []).map((comparison) => `<article class="category-comparison-card">
    <h4>${escapeHtml(comparison.title)}</h4>
    <div class="category-comparison-rows">${comparison.rows.map((row) => {
      const word = findWord(row.wordId);
      if (!word) return "";
      return `<div class="category-comparison-row">
        <div><strong>${escapeHtml(word.hanzi)}</strong><small>${escapeHtml(word.pinyin)}</small></div>
        <p>${escapeHtml(row.use)}</p><em>${escapeHtml(row.example)}</em>
      </div>`;
    }).join("")}</div>
    <p class="category-comparison-tip">${escapeHtml(comparison.tip)}</p>
  </article>`).join("");

  const dialogueText = (guide.dialogue?.lines || []).map((line) => `${line.speaker}：${line.cn}`).join(" ");
  const dialogue = guide.dialogue ? `<section class="category-feature-section">
    <div class="category-section-heading"><div><p class="eyebrow">MINI DIALOGUE</p><h3>${escapeHtml(guide.dialogue.title)}</h3><p>${escapeHtml(guide.dialogue.intro || "")}</p></div>${speakButtonHtml(dialogueText, "会話を続けて聞く")}</div>
    <div class="category-dialogue">${guide.dialogue.lines.map((line) => `<article class="category-dialogue-line">
      <span>${escapeHtml(line.speaker)}</span><div><strong>${escapeHtml(line.cn)}</strong><small>${escapeHtml(line.pinyin)}</small><p>${escapeHtml(line.ja)}</p></div>
      ${speakButtonHtml(line.cn, `${line.speaker}の発話を聞く`)}
    </article>`).join("")}</div>
  </section>` : "";

  const routine = (guide.routine || []).map((item) => `<article class="category-routine-card">
    <span>${escapeHtml(item.step)}</span><div><small>${escapeHtml(item.title)}</small><strong>${escapeHtml(item.cn)}</strong><em>${escapeHtml(item.pinyin)}</em><p>${escapeHtml(item.ja)}</p></div>
    ${speakButtonHtml(item.cn, `${item.title}の例文を聞く`)}
  </article>`).join("");

  container.innerHTML = `<section class="category-feature-hero" data-mark="${escapeHtml(guide.mark || category.label.slice(0, 1))}">
      <div><p class="eyebrow">${escapeHtml(guide.eyebrow || "CATEGORY STUDY")}</p><h3>${escapeHtml(guide.title)}</h3><p>${escapeHtml(guide.summary)}</p></div>
      <div class="category-feature-stat"><strong>${visibleWords.length}</strong><span>表示中の語</span><small>全${(guide.groups || []).reduce((sum, group) => sum + group.wordIds.length, 0)}語</small></div>
    </section>
    <section class="category-feature-block">
      <div class="category-section-heading"><div><p class="eyebrow">${escapeHtml(guide.groupsEyebrow || "WORD MAP")}</p><h3>${escapeHtml(guide.groupsTitle || "働きごとに覚える")}</h3><p>${escapeHtml(guide.groupsDescription || "関連する語をまとめました。レベル・チェック・検索の絞り込みも反映されます。")}</p></div></div>
      <div class="category-vocabulary-groups">${groups || `<p class="category-feature-empty">この条件で表示できる単語はありません。</p>`}</div>
    </section>
    <section class="category-feature-block">
      <div class="category-section-heading"><div><p class="eyebrow">${escapeHtml(guide.patternsEyebrow || "SENTENCE PATTERNS")}</p><h3>${escapeHtml(guide.patternsTitle || `${guide.patterns?.length || 0}つの基本文型`)}</h3><p>${escapeHtml(guide.patternsDescription || "語を入れ替えながら、文の型を身につけます。")}</p></div></div>
      <div class="category-pattern-grid">${patterns}</div>
    </section>
    <section class="category-feature-block">
      <div class="category-section-heading"><div><p class="eyebrow">${escapeHtml(guide.comparisonsEyebrow || "WORD CHOICE")}</p><h3>${escapeHtml(guide.comparisonsTitle || "似た語を使い分ける")}</h3><p>${escapeHtml(guide.comparisonsDescription || "日本語訳だけでは区別しにくい語を、使う場面と例で整理します。")}</p></div></div>
      <div class="category-comparison-grid">${comparisons}</div>
    </section>
    ${dialogue}
    <section class="category-feature-section">
      <div class="category-section-heading"><div><p class="eyebrow">${escapeHtml(guide.routineEyebrow || "QUICK PRACTICE")}</p><h3>${escapeHtml(guide.routineTitle || "短文で仕上げる")}</h3><p>${escapeHtml(guide.routineDescription || "短い文を順に音読し、使い方を定着させます。")}</p></div></div>
      <div class="category-routine-grid">${routine}</div>
    </section>
    <div class="category-list-heading"><p class="eyebrow">ALL WORDS & EXAMPLES</p><h3>全単語と例文</h3><p>見出し語だけでなく、実際に使える一文まで確認できます。</p></div>`;
  bindWordRowAudio(container);
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
