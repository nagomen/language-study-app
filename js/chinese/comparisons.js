// 日本語訳が近い語を、目的語・場面・強さの違いで比べる専用ページ。
import { $, checkButtonHtml, escapeHtml, shuffle } from "../shared.js";
import { bindWordRowAudio, speakButtonHtml } from "./audio.js";
import { startCustomPractice } from "./guide.js";
import { state } from "./state.js";
import { wordLevelLabel } from "./util.js";

export function comparisonById(id) {
  return state.wordComparisons.find((group) => group.id === id) || null;
}

export function openComparison(id) {
  if (!comparisonById(id)) return;
  state.selectedComparison = id;
  if (window.location.hash === `#comparisons/${id}`) renderComparisons();
  else window.location.hash = `comparisons/${id}`;
}

export function closeComparison() {
  state.selectedComparison = null;
  if (window.location.hash === "#comparisons") renderComparisons();
  else window.location.hash = "comparisons";
}

function wordById(id) {
  return state.words.find((word) => word.id === id) || null;
}

function groupWords(group) {
  return group.wordIds.map(wordById).filter(Boolean);
}

export function renderComparisons() {
  const group = comparisonById(state.selectedComparison);
  $("#comparisons-map").classList.toggle("is-hidden", Boolean(group));
  $("#comparison-detail").classList.toggle("is-hidden", !group);
  if (group) renderComparisonDetail(group); else renderComparisonMap();
}

function renderComparisonMap() {
  const container = $("#comparisons-map");
  const totalWords = new Set(state.wordComparisons.flatMap((group) => group.wordIds)).size;
  container.innerHTML = `<div class="page-heading examples-heading nuance-heading">
      <div><p class="eyebrow">SIMILAR WORDS</p><h1 id="comparisons-title">似た語の使い分け</h1><p>日本語では同じ訳になりやすい語を、何を指すか・どこに置くか・どれくらい強いかで見分けます。</p></div>
      <div class="example-total"><strong>${totalWords}</strong><span>収録語</span></div>
    </div>
    <div class="nuance-map-intro"><strong>訳ではなく「選ぶ基準」を覚える</strong><p>すべて現在のHSK 1〜3級単語帳にある語です。比較表を読んだら、その語群だけの文脈問題で確認できます。</p></div>
    <div class="nuance-grid">${state.wordComparisons.map((item, index) => {
      const words = groupWords(item);
      return `<button class="nuance-card" type="button" data-comparison-open="${escapeHtml(item.id)}">
        <span class="nuance-card-number">${String(index + 1).padStart(2, "0")}</span>
        <span class="nuance-card-mark">${escapeHtml(item.mark)}</span>
        <span class="nuance-card-copy"><small>${escapeHtml(item.eyebrow)}</small><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.blurb)}</p><em>${words.slice(0, 7).map((word) => escapeHtml(word.hanzi)).join("・")}${words.length > 7 ? "…" : ""}</em></span>
        <span class="nuance-card-count"><b>${words.length}</b>語</span>
      </button>`;
    }).join("")}</div>`;
}

function renderComparisonDetail(group) {
  const container = $("#comparison-detail");
  const words = groupWords(group);
  const levelCounts = [1, 2, 3].map((level) => words.filter((word) => word.level === level).length);
  const sets = group.sets.map((set, setIndex) => `<section class="nuance-set">
    <header class="nuance-set-head"><span>${String(setIndex + 1).padStart(2, "0")}</span><div><h2>${escapeHtml(set.title)}</h2><p>${escapeHtml(set.summary)}</p></div></header>
    <div class="nuance-word-grid">${set.rows.map((row) => nuanceWordHtml(row)).join("")}</div>
    ${set.tip ? `<p class="nuance-tip"><span aria-hidden="true">◎</span>${escapeHtml(set.tip)}</p>` : ""}
  </section>`).join("");
  const mistakes = (group.mistakes || []).length ? `<section class="nuance-mistakes">
    <div class="category-section-heading"><div><p class="eyebrow">COMMON MISTAKES</p><h2>よくある取り違え</h2><p>同じ日本語訳をそのまま当てはめると、不自然になる例です。</p></div></div>
    <div class="compare-list">${group.mistakes.map((pair) => `<article class="compare-card"><p class="compare-wrong"><span aria-hidden="true">×</span>${escapeHtml(pair.wrong)}</p><p class="compare-right"><span aria-hidden="true">○</span>${escapeHtml(pair.right)}${speakButtonHtml(pair.right, "正しい文を聞く")}</p><p class="compare-note">${escapeHtml(pair.note)}</p></article>`).join("")}</div>
  </section>` : "";
  container.innerHTML = `<button class="text-button" type="button" data-comparison-back>← 使い分けの一覧へ戻る</button>
    <section class="nuance-hero" data-mark="${escapeHtml(group.mark)}">
      <div><p class="eyebrow">${escapeHtml(group.eyebrow)}</p><h1 id="comparison-detail-title">${escapeHtml(group.title)}</h1><p>${escapeHtml(group.summary)}</p></div>
      <div class="nuance-hero-stats"><span><strong>${words.length}</strong>語</span><span><strong>${group.sets.length}</strong>比較</span><span><strong>${group.quiz.length}</strong>問</span></div>
    </section>
    <div class="nuance-levels"><span>収録レベル</span>${levelCounts.map((count, index) => `<b>HSK ${index + 1}<small>${count}語</small></b>`).join("")}</div>
    ${group.guideId ? `<button class="guide-link nuance-guide-link" type="button" data-guide-open="${escapeHtml(group.guideId)}"><span class="guide-card-mark">詳</span><span class="guide-card-body"><strong>詳しい解説：${escapeHtml(group.title)}</strong><small>既存の解説・よくある間違い・文法ドリルも確認できます</small></span><span class="guide-card-go" aria-hidden="true">→</span></button>` : ""}
    <div class="nuance-actions"><button class="primary-button" type="button" data-comparison-test="${escapeHtml(group.id)}">この語群で使い分けテスト <span>→</span></button><span>空欄の文脈に最も自然な語を選ぶ${group.quiz.length}問</span></div>
    <div class="nuance-sets">${sets}</div>${mistakes}
    <section class="nuance-all-words"><div class="category-section-heading"><div><p class="eyebrow">ALL WORDS</p><h2>この章の収録語</h2></div></div><div class="nuance-word-index">${words.map((word) => `<span><b>${escapeHtml(word.hanzi)}</b><small>${escapeHtml(word.pinyin)} · ${escapeHtml(word.meaning)}</small></span>`).join("")}</div></section>`;
  bindWordRowAudio(container);
}

function nuanceWordHtml(row) {
  const word = wordById(row.wordId);
  if (!word) return "";
  return `<article class="nuance-word">
    <header><div><strong>${escapeHtml(word.hanzi)}</strong><span>${escapeHtml(word.pinyin)}</span></div><span class="mini-level">${wordLevelLabel(word)}</span><div class="row-actions">${checkButtonHtml(word.id, state.checked.has(word.id))}<button class="speak-mini" type="button" data-word-id="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の発音を聞く"><span aria-hidden="true">声</span></button></div></header>
    <p class="nuance-core">${escapeHtml(row.core)}</p>
    <dl><div><dt>選ぶ基準</dt><dd>${escapeHtml(row.cue)}</dd></div><div><dt>よく使う形</dt><dd>${escapeHtml(row.pattern)}</dd></div></dl>
    <div class="nuance-example"><div><strong>${escapeHtml(row.example.cn)}</strong><small>${escapeHtml(row.example.pinyin)}</small><p>${escapeHtml(row.example.ja)}</p></div>${speakButtonHtml(row.example.cn, `${word.hanzi}の例文を聞く`)}</div>
  </article>`;
}

export function startComparisonPractice(id = state.selectedComparison) {
  const group = comparisonById(id);
  if (!group?.quiz?.length) return;
  const questions = shuffle(group.quiz).map((item) => {
    const answerWord = wordsByHanzi(group, item.correct)[0];
    return {
      skill: "reading", kind: "grammar", ...(answerWord ? { wordId: answerWord.id } : {}),
      prompt: item.prompt, subPrompt: item.subPrompt,
      choices: shuffle(item.choices.map((label) => {
        const word = wordsByHanzi(group, label)[0];
        return { value: label, label, pinyin: word?.pinyin };
      })),
      correct: item.correct, instruction: "空欄に最も自然な語を選んでください", explanation: item.explanation,
    };
  });
  startCustomPractice(questions, { label: group.title, modeLabel: "使い分けテスト", level: 3, comparisonId: group.id });
}

function wordsByHanzi(group, hanzi) {
  return groupWords(group).filter((word) => word.hanzi === hanzi);
}
