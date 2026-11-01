// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, escapeHtml, shuffle, checkButtonHtml } from "../shared.js";
import { bindWordRowAudio, speak, speakButtonHtml } from "./audio.js";
import { categoryById } from "./categories.js";
import { DE_NOTES, MEASURE_CARD } from "./config.js";
import { showView } from "./main.js";
import { clearPracticeTimer, renderPracticeQuestion } from "./practice.js";
import { emptyPractice, state } from "./state.js";

export function guideById(id) {
  return state.guides.find((guide) => guide.id === id) || null;
}

export function openGuide(id) {
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

// 帯にはまとめのページだけを出す（トピック別はまとめのページの中から開く）。
export function renderGuideBand() {
  const band = $("#guide-band");
  if (!band) return;
  const cards = state.guides.filter((guide) => !guide.parent)
    .map((guide) => guideCardHtml({ attr: `data-guide-open="${escapeHtml(guide.id)}"`, mark: guide.mark, title: guide.title, note: guide.blurb || guide.summary }));
  band.innerHTML = [...cards, guideCardHtml(MEASURE_CARD)].join("");
}

export function renderGuide() {
  const guide = guideById(state.selectedGuide) || state.guides[0];
  if (!guide) return;
  state.selectedGuide = guide.id;
  $("#guide-back").textContent = guide.parent ? `← ${guideById(guide.parent)?.title || "まとめ"}へ戻る` : "← 分類の一覧へ戻る";
  $("#guide-eyebrow").textContent = guide.eyebrow || "GRAMMAR GUIDE";
  $("#guide-title").textContent = guide.title;
  $("#guide-summary").textContent = guide.summary;
  $("#guide-level").textContent = guide.level || "HSK";
  $("#guide-practice").innerHTML = `文法ドリル${guidePracticeCount(guide)}問 <span>→</span>`;
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

function measureHeadword(item) {
  const word = item.wordId ? state.words.find((entry) => entry.id === item.wordId) : null;
  return word || { id: "", hanzi: item.hanzi, pinyin: item.pinyin, level: item.level, meaning: item.use };
}

function measureNouns(item) {
  const linked = (item.nouns || []).map((id) => state.words.find((entry) => entry.id === id)).filter(Boolean);
  return [...linked, ...(item.nounExamples || [])];
}

function measureItemHaystack(item) {
  const word = measureHeadword(item);
  return [word.hanzi, word.pinyin, item.use, item.tip, item.phrase?.cn, item.phrase?.pinyin, item.phrase?.ja,
    ...measureNouns(item).flatMap((noun) => [noun.hanzi, noun.pinyin, noun.meaning])].filter(Boolean).join(" ").toLowerCase();
}

function visibleMeasureItems() {
  const query = $("#category-search").value.trim().toLowerCase();
  return state.measure.items.filter((item) => {
    const word = measureHeadword(item);
    if (state.categoryFilter !== "all" && word.level !== Number(state.categoryFilter)) return false;
    if (state.checkedOnly.categories && (!word.id || !state.checked.has(word.id))) return false;
    return !query || measureItemHaystack(item).includes(query);
  });
}

// 数の作り方、使い分け、名詞からの逆引き、量詞カードを1ページにまとめる。
export function renderMeasureGuide() {
  const data = state.measure;
  const container = $("#measure-guide");
  const items = visibleMeasureItems();
  const nounPairs = items.flatMap((item) => {
    const measure = measureHeadword(item);
    return measureNouns(item).map((noun) => ({ noun, measure }));
  }).sort((a, b) => String(a.noun.pinyin || a.noun.hanzi).localeCompare(String(b.noun.pinyin || b.noun.hanzi)));
  const overview = `<section class="measure-overview">
    <div><p class="eyebrow">NUMBERS &amp; MEASURE WORDS</p><h2>数量詞を「数・量詞・名詞」でつなげる</h2><p>数の組み立てから、ものに合う量詞の選び方まで、HSK 1〜3級で使う形をひとつにまとめました。</p></div>
    <div class="measure-overview-stats"><span><strong>${data.items.length}</strong>量詞</span><span><strong>${data.numberPatterns?.length || 0}</strong>数の型</span><span><strong>20</strong>練習問</span></div>
    <nav class="measure-jump" aria-label="数量詞ページの目次"><a href="#measure-number-patterns">数の作り方</a><a href="#measure-comparisons">似た量詞</a><a href="#measure-noun-index">名詞から探す</a><a href="#measure-list">量詞一覧</a></nav>
  </section>`;
  const slot = `<section class="measure-slot">
    <h2>${escapeHtml(data.slot.title)}</h2>
    <div class="slot-row">${data.slot.cells.map((cell, index) => `
      <div class="slot-cell"><small>${escapeHtml(cell.label)}</small><strong>${escapeHtml(cell.value)}</strong><span>${escapeHtml(cell.pinyin)}</span></div>
      ${index < data.slot.cells.length - 1 ? `<span class="slot-plus" aria-hidden="true">＋</span>` : ""}`).join("")}</div>
    <p class="slot-reading">${escapeHtml(data.slot.reading)}<span>${escapeHtml(data.slot.meaning)}</span>${speakButtonHtml(data.slot.cells.map((cell) => cell.value).join(""), "例を聞く")}</p>
  </section>`;
  const numberPatterns = `<section id="measure-number-patterns" class="measure-number-patterns">
    <header class="measure-group-head"><h2>数の作り方<small>${data.numberPatterns?.length || 0}つの型</small></h2><p>数自体の読み方と、数量詞で間違えやすい形を先に整理します。</p></header>
    <div class="measure-pattern-grid">${(data.numberPatterns || []).map((pattern) => `<article class="measure-pattern-card">
      <span class="mini-level">${escapeHtml(pattern.level || "HSK 1–3")}</span><h3>${escapeHtml(pattern.title)}</h3><p class="pattern-formula">${escapeHtml(pattern.formula)}</p>
      ${phraseBlockHtml(pattern.example)}<p class="measure-tip"><span aria-hidden="true">◎</span>${escapeHtml(pattern.note)}</p>
    </article>`).join("")}</div>
  </section>`;
  const rules = `<section class="measure-rules">
    <h2>量詞を使う5つのきまり</h2>
    <div class="measure-rule-grid">${data.rules.map((rule) => `
      <article class="measure-rule"><strong>${escapeHtml(rule.title)}</strong><p>${escapeHtml(rule.body)}</p>
        <p class="measure-rule-example"><b>${escapeHtml(rule.example.cn)}</b><span>${escapeHtml(rule.example.pinyin)}</span><span>${escapeHtml(rule.example.ja)}</span>${speakButtonHtml(rule.example.cn, `${rule.example.cn}を聞く`)}</p></article>`).join("")}</div>
  </section>`;
  const comparisons = `<section id="measure-comparisons" class="measure-comparisons">
    <header class="measure-group-head"><h2>似た量詞の使い分け<small>${data.comparisons?.length || 0}セット</small></h2><p>意味の近い量詞を、対象と例を並べて見分けます。</p></header>
    <div class="measure-compare-grid">${(data.comparisons || []).map((comparison) => `<article class="measure-compare-card"><h3>${escapeHtml(comparison.title)}</h3>
      ${comparison.rows.map((row) => `<div class="measure-compare-row"><b>${escapeHtml(row.word)}</b><span>${escapeHtml(row.pinyin)}</span><p>${escapeHtml(row.use)}<small>${escapeHtml(row.example)}</small></p></div>`).join("")}
      <p class="measure-tip"><span aria-hidden="true">◎</span>${escapeHtml(comparison.tip)}</p></article>`).join("")}</div>
  </section>`;
  const nounIndex = `<section id="measure-noun-index" class="measure-noun-index">
    <header class="measure-group-head"><h2>名詞から量詞を探す<small>${nounPairs.length}組</small></h2><p>数えたい名詞を先に見つけ、右側の量詞とセットで覚えます。</p></header>
    <div class="measure-noun-grid">${nounPairs.map(({ noun, measure }) => `<div class="measure-noun-pair"><span><b>${escapeHtml(noun.hanzi)}</b><small>${escapeHtml(noun.pinyin || "")} · ${escapeHtml(noun.meaning || "")}</small></span><strong>${escapeHtml(measure.hanzi)}</strong></div>`).join("")}</div>
  </section>`;
  const groups = data.groups.map((group) => {
    const groupItems = items.filter((item) => item.group === group.id);
    if (!groupItems.length) return "";
    return `<section class="measure-group"><header class="measure-group-head"><h2>${escapeHtml(group.label)}<small>${groupItems.length}語</small></h2><p>${escapeHtml(group.description)}</p></header>
      <div class="measure-grid">${groupItems.map(measureCardHtml).join("")}</div></section>`;
  }).join("");
  container.innerHTML = overview + slot + numberPatterns + rules + comparisons + nounIndex + `<div id="measure-list" class="measure-groups">${groups}</div>`;
  bindWordRowAudio(container);
  return items.length;
}

function measureCardHtml(item) {
  const word = measureHeadword(item);
  if (!word?.hanzi) return "";
  const nouns = measureNouns(item);
  const actions = word.id
    ? `${checkButtonHtml(word.id, state.checked.has(word.id))}<button class="speak-mini" type="button" data-word-id="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の発音を聞く"><span aria-hidden="true">声</span></button>`
    : speakButtonHtml(word.hanzi, `${word.hanzi}の発音を聞く`);
  return `<article class="measure-card"><header class="measure-card-head">
      <div class="measure-hanzi"><strong>${escapeHtml(word.hanzi)}</strong><span>${escapeHtml(word.pinyin)}</span></div>
      <span class="mini-level">HSK ${word.level}</span><div class="row-actions">${actions}</div></header>
    <p class="measure-use">${escapeHtml(item.use)}</p>
    <p class="measure-phrase"><b>${escapeHtml(item.phrase.cn)}</b><span>${escapeHtml(item.phrase.pinyin)}</span><span>${escapeHtml(item.phrase.ja)}</span>${speakButtonHtml(item.phrase.cn, `${item.phrase.cn}を聞く`)}</p>
    ${nouns.length ? `<div class="measure-nouns"><small>よく数えるもの</small><div class="word-tags">${nouns.map((noun) => noun.id
      ? `<button class="tag-chip" type="button" data-word-id="${escapeHtml(noun.id)}" title="${escapeHtml(noun.meaning)}">${escapeHtml(noun.hanzi)}<small>${escapeHtml(noun.meaning)}</small></button>`
      : `<button class="tag-chip" type="button" data-speak="${escapeHtml(noun.hanzi)}" title="${escapeHtml(noun.meaning || "")}">${escapeHtml(noun.hanzi)}<small>${escapeHtml(noun.meaning || "")}</small></button>`).join("")}</div></div>` : ""}
    ${word.example ? `<div class="measure-example"><div><p class="example-chinese">${escapeHtml(word.example)}</p><p class="example-pinyin">${escapeHtml(word.examplePinyin || "")}</p><p class="example-japanese">${escapeHtml(word.exampleMeaning || "")}</p></div><button class="speak-mini example-mini" type="button" data-example-id="${escapeHtml(word.id)}" aria-label="例文を聞く"><span aria-hidden="true">▶</span></button></div>` : ""}
    <p class="measure-tip"><span aria-hidden="true">◎</span>${escapeHtml(item.tip)}</p></article>`;
}

// ボタンに出す問数＝実際に出題できる問数（作問が目標に足りない解説では少なくなる）。
function guidePracticeCount(guide) {
  const target = Math.max(10, Number(guide.practiceCount) || 10);
  const judges = Math.min(3, (guide.sections || []).flatMap((section) => section.compare || []).length);
  return Math.min(target, (guide.practice || []).length + judges);
}

export function startGuidePractice(id = state.selectedGuide) {
  const guide = guideById(id);
  if (!guide) return;
  const targetCount = guidePracticeCount(guide);
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
      subPrompt: pair.meaning ? `「${pair.meaning}」と言いたいとき、この言い方は正しいでしょうか。` : "この言い方は正しいでしょうか。",
      choices: [{ value: "true", label: "对（正しい）" }, { value: "false", label: "不对（間違い）" }],
      correct: String(!showWrong),
      instruction: "文が正しいかどうかを選んでください",
      explanation: `${pair.note}正しくは「${pair.right}」。`,
    };
  });
  // 3つの形式が必ず混ざるようにする。まとめページだけは語順問題を4問入れる。
  const reorders = authored.filter((question) => question.kind === "reorder");
  const rest = authored.filter((question) => question.kind !== "reorder");
  const orderCount = Math.min(guide.id === "hsk3-grammar" ? 4 : 2, reorders.length);
  const restPicked = shuffle(rest);
  const ordersPicked = shuffle(reorders);
  const restCount = targetCount - judges.length - orderCount;
  const questions = [...restPicked.slice(0, restCount), ...ordersPicked.slice(0, orderCount), ...judges];
  // 選択問題が足りない解説では、残りの語順問題で目標の問数まで埋める。
  const leftovers = [...restPicked.slice(restCount), ...ordersPicked.slice(orderCount)];
  while (questions.length < targetCount && leftovers.length) questions.push(leftovers.shift());
  startCustomPractice(shuffle(questions), { label: guide.title, modeLabel: "文法ドリル", level: 3, guideId: guide.id });
}

export function startMeasurePractice() {
  const questions = measurePracticeQuestions(20);
  if (!questions.length) return alert("量詞の問題を作れませんでした。");
  startCustomPractice(questions, { label: "数量詞・量詞", modeLabel: "数量詞トレーニング", level: 3, guideId: "measure" });
}

export function multiAnswerValue(question, picked) {
  const order = question.choices.map((choice) => choice.value);
  return [...new Set(picked)].sort((left, right) => order.indexOf(left) - order.indexOf(right)).join("、");
}

// 20問の中に「名詞→量詞」「量詞→名詞」「数の型」を必ず混ぜる。
function measurePracticeQuestions(count = 20) {
  const data = state.measure;
  if (!data) return [];
  const level = state.categoryFilter === "all" ? null : Number(state.categoryFilter);
  const practiceItems = data.items.filter((item) => {
    const word = measureHeadword(item);
    return item.practice !== false && measureNouns(item).length && (!level || word.level === level);
  });
  const nounOwners = new Map();
  practiceItems.forEach((item) => measureNouns(item).forEach((noun) => {
    if (!nounOwners.has(noun.hanzi)) nounOwners.set(noun.hanzi, new Set());
    nounOwners.get(noun.hanzi).add(measureHeadword(item).hanzi);
  }));
  const explain = (item, measureWord) => `${measureWord.hanzi}（${measureWord.pinyin}）は${item.use}。${item.phrase.cn}＝${item.phrase.ja}`;

  const slots = shuffle(practiceItems.flatMap((item) => measureNouns(item).map((noun) => ({ item, noun })))).flatMap(({ item, noun }) => {
    const measureWord = measureHeadword(item);
    const distractors = shuffle(practiceItems.filter((other) => {
      const otherWord = measureHeadword(other);
      return otherWord.hanzi !== measureWord.hanzi && !nounOwners.get(noun.hanzi)?.has(otherWord.hanzi);
    })).slice(0, 3).map(measureHeadword).filter(Boolean);
    if (distractors.length < 3) return [];
    return [{
      skill: "reading", kind: "slot", ...(measureWord.id ? { wordId: measureWord.id } : {}),
      slot: { number: "三", numberPinyin: "sān", noun: noun.hanzi, nounPinyin: noun.pinyin, meaning: `${noun.meaning}を3つ` },
      choices: shuffle([measureWord, ...distractors].map((word) => ({ value: word.hanzi, label: word.hanzi, pinyin: word.pinyin }))),
      correct: measureWord.hanzi, instruction: "空いているところに入る量詞を選んでください",
      explanation: explain(item, measureWord),
    }];
  });

  const multis = shuffle(practiceItems.filter((item) => measureNouns(item).length >= 3)).flatMap((item) => {
    const measureWord = measureHeadword(item);
    const answers = measureNouns(item).slice(0, 3);
    const others = practiceItems.filter((other) => measureHeadword(other).hanzi !== measureWord.hanzi).flatMap(measureNouns)
      .filter((noun, index, all) => all.findIndex((itemNoun) => itemNoun.hanzi === noun.hanzi) === index)
      .filter((noun) => !nounOwners.get(noun.hanzi)?.has(measureWord.hanzi));
    const distractors = shuffle(others).slice(0, 6 - answers.length);
    if (answers.length < 2 || distractors.length < 2) return [];
    const choices = shuffle([...answers, ...distractors]).map((word) => ({ value: word.hanzi, label: word.hanzi, pinyin: word.pinyin, meaning: word.meaning }));
    const question = {
      skill: "reading", kind: "multi", ...(measureWord.id ? { wordId: measureWord.id } : {}),
      prompt: measureWord.hanzi, promptPinyin: measureWord.pinyin, subPrompt: item.use,
      choices, correctCount: answers.length,
      instruction: `「${measureWord.hanzi}」で数えるものをすべて選んでください`,
      explanation: explain(item, measureWord),
    };
    question.correct = multiAnswerValue(question, answers.map((word) => word.hanzi));
    return [question];
  });

  const authored = shuffle((data.quiz || []).filter((item) => !level || item.level === level)).map((item) => ({
    skill: "reading", kind: "grammar", ...(item.wordId ? { wordId: item.wordId } : {}),
    prompt: item.prompt, subPrompt: item.subPrompt,
    choices: shuffle(item.choices.map((label) => ({ value: label, label, pinyin: state.words.find((word) => word.hanzi === label)?.pinyin }))),
    correct: item.correct, instruction: "空欄に入る量詞を選んでください", explanation: item.explanation,
  }));

  const picked = [...slots.slice(0, 10), ...multis.slice(0, 5), ...authored.slice(0, 5)];
  return shuffle(picked).slice(0, count);
}

function startCustomPractice(questions, { label, modeLabel, level, guideId }) {
  clearPracticeTimer();
  if (!questions.length) return;
  $("#practice-home").textContent = guideId === "measure" ? "量詞のページへ" : "解説ページへ";
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
