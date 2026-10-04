// spanish.js から機能ごとに切り出したモジュール。
import { $, checkButtonHtml, clearCheckedState, downloadCheckedFile, escapeHtml, importCheckedIds, renderCheckedControls, toggleCheckedState, updateCheckedBadge } from "../shared.js";
import { CHECKED_KEY } from "./config.js";
import { state } from "./state.js";
import { getCheckedWords } from "./storage.js";
import { renderWords } from "./words.js";

export function toggleChecked(id) {
  if (!toggleCheckedState(id, { words: state.words, checkedIds: state.checked, storageKey: CHECKED_KEY })) return;
  updateCheckedSummary();
  if (state.currentView === "checked") renderChecked();
  if (state.currentView === "words" && state.checkedOnly) renderWords();
}

export function renderChecked() {
  const list = $("#checked-list");
  if (!list) return;
  const words = getCheckedWords();
  const wrong = new Set(state.progress.wrongIds);
  list.innerHTML = words.map((word) => `
    <article class="checked-card">
      <header class="example-card-head">
        <span class="mini-level">${escapeHtml(word.level)}</span>
        <div class="example-word"><strong>${escapeHtml(word.word)}</strong><span>${escapeHtml(word.pos)} · ${escapeHtml(word.category)}</span><small>${escapeHtml(word.meaning)}</small></div>
        <div class="row-actions">
          ${checkButtonHtml(word.id, state.checked.has(word.id))}
          <button class="checked-speak" type="button" data-checked-audio="${escapeHtml(word.id)}" aria-label="${escapeHtml(word.word)}の発音を聞く">▶</button>
        </div>
      </header>
      <div class="checked-body"><p class="checked-stats">${wrong.has(word.id) ? "まちがい復習に登録中" : "まちがい記録なし"}</p></div>
    </article>`).join("");
  renderCheckedControls(words.length, "#checked-quiz");
}

export function clearChecked() {
  clearCheckedState(state.checked, CHECKED_KEY, "チェックをすべて解除しますか？", () => { renderChecked(); updateCheckedSummary(); });
}

export function updateCheckedSummary() {
  updateCheckedBadge(state.checked.size, "気になる単語に✓を付けましょう", (count) => `${count}語からテスト`);
}

export function exportChecked() {
  const ids = getCheckedWords().map((word) => word.id);
  if (ids.length) downloadCheckedFile("spanish", ids);
}

export function importCheckedFile(file) {
  importCheckedIds(file, {
    words: state.words,
    checkedIds: state.checked,
    storageKey: CHECKED_KEY,
    languageLabel: "スペイン語",
    onChange: () => { renderChecked(); updateCheckedSummary(); },
  });
}
