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

// 量詞は「数＋量詞＋名詞」の形と、数える対象をセットで見せる。
export function renderMeasureGuide(words) {
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

export function startGuidePractice(id = state.selectedGuide) {
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

export function startMeasurePractice() {
  const questions = measurePracticeQuestions();
  if (!questions.length) return alert("量詞の問題を作れませんでした。");
  startCustomPractice(questions, { label: "量詞（助数詞）", modeLabel: "量詞クイズ", level: 2, guideId: "measure" });
}

export function multiAnswerValue(question, picked) {
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
