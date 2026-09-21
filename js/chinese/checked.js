// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, $$, escapeHtml, saveCheckedIds, checkButtonHtml, resetCheckButtons, updateCheckedBadge, downloadCheckedFile, readCheckedFile } from "../shared.js";
import { speak } from "./audio.js";
import { renderCategories } from "./categories.js";
import { CHECKED_KEY } from "./config.js";
import { markWordForDailyReview } from "./daily.js";
import { startPractice } from "./practice.js";
import { startQuiz } from "./quiz.js";
import { state } from "./state.js";
import { getCheckedWords } from "./storage.js";
import { renderWords } from "./words.js";

export function toggleChecked(id) {
  const word = state.words.find((item) => item.id === id);
  if (!word) return;
  if (state.checked.has(id)) state.checked.delete(id); else state.checked.add(id);
  saveCheckedIds(CHECKED_KEY, state.checked);
  const checked = state.checked.has(id);
  const label = checked ? "チェックを外す" : "チェックを付ける";
  $$(`[data-check-id="${id}"]`).forEach((button) => {
    button.classList.toggle("is-checked", checked);
    button.setAttribute("aria-pressed", String(checked));
    button.setAttribute("aria-label", label);
    button.title = label;
  });
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
  $("#checked-total-count").textContent = words.length;
  list.innerHTML = words.map((word) => {
    const srs = state.progress.srs[word.id];
    const stats = [];
    if (srs && (srs.correct || srs.wrong)) stats.push(`正解 ${srs.correct || 0}回 · まちがい ${srs.wrong || 0}回`);
    if (state.progress.mistakes[word.id] > 0) stats.push("まちがい復習に登録中");
    if (srs?.due) stats.push(`次の復習 ${srs.due}`);
    return `<article class="checked-card">
      <header class="example-card-head">
        <span class="mini-level">HSK ${word.level}</span>
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
  $("#empty-checked").classList.toggle("is-hidden", words.length > 0);
  $("#clear-checked").classList.toggle("is-hidden", words.length === 0);
  $("#export-checked").classList.toggle("is-hidden", words.length === 0);
  $$("#checked-view [data-checked-action]").forEach((button) => { button.disabled = words.length === 0; });
}

export function clearChecked() {
  if (!state.checked.size || !confirm("チェックをすべて解除しますか？")) return;
  state.checked.clear();
  saveCheckedIds(CHECKED_KEY, state.checked);
  resetCheckButtons();
  renderChecked();
  updateCheckedSummary();
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
  readCheckedFile(file, (ids) => {
    if (!ids) return alert("チェックの書き出しファイルとして読み込めませんでした。");
    const known = ids.filter((id) => state.words.some((word) => word.id === id));
    if (!known.length) return alert("この単語データに一致するIDがありませんでした。中国語用の書き出しファイルか確認してください。");
    const added = known.filter((id) => !state.checked.has(id));
    const ignored = ids.length - known.length;
    const message = `${known.length}語のチェックを読み込みます。\n新しく追加: ${added.length}語（現在のチェック${state.checked.size}語はそのまま残ります）`
      + (ignored ? `\n一致しないID ${ignored}件は無視します。` : "");
    if (!confirm(message)) return;
    added.forEach((id) => state.checked.add(id));
    saveCheckedIds(CHECKED_KEY, state.checked);
    renderChecked();
    updateCheckedSummary();
    alert(added.length ? `${added.length}語を追加しました。` : "すべて登録済みでした。");
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
