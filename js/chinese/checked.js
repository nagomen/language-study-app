// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, checkButtonHtml, clearCheckedState, downloadCheckedFile, escapeHtml, importCheckedIds, renderCheckedControls, toggleCheckedState, updateCheckedBadge } from "../shared.js";
import { speak } from "./audio.js";
import { renderCategories } from "./categories.js";
import { CHECKED_KEY } from "./config.js";
import { markWordForDailyReview } from "./daily.js";
import { startPractice } from "./practice.js";
import { startQuiz } from "./quiz.js";
import { state } from "./state.js";
import { getCheckedWords } from "./storage.js";
import { wordLevelLabel } from "./util.js";
import { renderWords } from "./words.js";

export function toggleChecked(id) {
  const result = toggleCheckedState(id, { words: state.words, checkedIds: state.checked, storageKey: CHECKED_KEY });
  if (!result) return;
  const { word, checked } = result;
  if (checked) markWordForDailyReview(word);
  updateCheckedSummary();
  if (state.currentView === "checked") renderChecked();
  if (state.currentView === "words" && state.checkedOnly.words) renderWords();
  if (state.currentView === "categories" && state.checkedOnly.categories) renderCategories();
}

export function renderChecked() {
  const list = $("#checked-list");
  if (!list) return;
  const words = getCheckedWords();
  list.innerHTML = words.map((word) => {
    const srs = state.progress.srs[word.id];
    const stats = [];
    if (srs && (srs.correct || srs.wrong)) stats.push(`正解 ${srs.correct || 0}回 · まちがい ${srs.wrong || 0}回`);
    if (state.progress.mistakes[word.id] > 0) stats.push("まちがい復習に登録中");
    if (srs?.due) stats.push(`次の復習 ${srs.due}`);
    return `<article class="checked-card">
      <header class="example-card-head">
        <span class="mini-level">${wordLevelLabel(word)}</span>
        <div class="example-word"><strong>${escapeHtml(word.hanzi)}</strong><span>${escapeHtml(word.pinyin)}</span><small>${escapeHtml(word.meaning)}</small></div>
        <div class="row-actions">
          ${checkButtonHtml(word.id, state.checked.has(word.id))}
          <button class="checked-speak" type="button" data-checked-audio="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.hanzi)}の発音を聞く"><span aria-hidden="true">声</span></button>
        </div>
      </header>
      <div class="checked-body">
        <p class="checked-stats">${stats.length ? escapeHtml(stats.join(" · ")) : "まだ出題されていません"}</p>
        ${word.example ? `<div class="checked-example"><div><p class="example-chinese">${escapeHtml(word.example)}</p>${word.examplePinyin ? `<p class="example-pinyin">${escapeHtml(word.examplePinyin)}</p>` : ""}<p class="example-japanese">${escapeHtml(word.exampleMeaning)}</p></div><button class="checked-sentence" type="button" data-checked-audio="${escapeHtml(word.id)}" data-checked-kind="sentence"><span aria-hidden="true">▶</span> 例文を聞く</button></div>` : ""}
      </div>
    </article>`;
  }).join("");
  renderCheckedControls(words.length, "#checked-view [data-checked-action]");
}

export function clearChecked() {
  clearCheckedState(state.checked, CHECKED_KEY, "チェックをすべて解除しますか？", () => { renderChecked(); updateCheckedSummary(); });
}

export function updateCheckedSummary() {
  updateCheckedBadge(state.checked.size, "気になる単語に✓を付けましょう", (count) => `${count}語をまとめて復習`);
}

export function exportChecked() {
  const ids = getCheckedWords().map((word) => word.id);
  if (!ids.length) return alert("チェックした単語がありません。");
  downloadCheckedFile("chinese", ids);
}

export function importCheckedFile(file) {
  importCheckedIds(file, {
    words: state.words,
    checkedIds: state.checked,
    storageKey: CHECKED_KEY,
    languageLabel: "中国語",
    onChange: () => { renderChecked(); updateCheckedSummary(); },
  });
}

export function startCheckedQuiz() {
  const words = getCheckedWords();
  if (!words.length) return alert("チェックした単語がありません。");
  startQuiz(words, "checked", state.vocabularyDirection, state.words);
}

export function startCheckedPractice(mode) {
  const words = getCheckedWords();
  if (!words.length) return alert("チェックした単語がありません。");
  startPractice(mode, 3, words);
}
