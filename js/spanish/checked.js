// spanish.js から機能ごとに切り出したモジュール。
import { $, $$, escapeHtml, saveCheckedIds, checkButtonHtml, resetCheckButtons, updateCheckedBadge, downloadCheckedFile, readCheckedFile } from "../shared.js";
import { CHECKED_KEY } from "./config.js";
import { state } from "./state.js";
import { getCheckedWords } from "./storage.js";
import { renderWords } from "./words.js";

export function toggleChecked(id) {
  if (!state.words.some((word) => word.id === id)) return;
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
  updateCheckedSummary();
  if (state.currentView === "checked") renderChecked();
  if (state.currentView === "words" && state.checkedOnly) renderWords();
}

export function renderChecked() {
  const list = $("#checked-list");
  if (!list) return;
  const words = getCheckedWords();
  const wrong = new Set(state.progress.wrongIds);
  $("#checked-total-count").textContent = words.length;
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
  $("#empty-checked").classList.toggle("is-hidden", words.length > 0);
  $("#clear-checked").classList.toggle("is-hidden", words.length === 0);
  $("#export-checked").classList.toggle("is-hidden", words.length === 0);
  $("#checked-quiz").disabled = words.length === 0;
}

export function clearChecked() {
  if (!state.checked.size || !window.confirm("チェックをすべて解除しますか？")) return;
  state.checked.clear();
  saveCheckedIds(CHECKED_KEY, state.checked);
  resetCheckButtons();
  renderChecked();
  updateCheckedSummary();
}

export function updateCheckedSummary() {
  updateCheckedBadge(state.checked.size, "気になる単語に✓を付けましょう", (count) => `${count}語からテスト`);
}

export function exportChecked() {
  const ids = getCheckedWords().map((word) => word.id);
  if (ids.length) downloadCheckedFile("spanish", ids);
}

export function importCheckedFile(file) {
  readCheckedFile(file, (ids) => {
    if (!ids) return window.alert("チェックの書き出しファイルとして読み込めませんでした。");
    const known = ids.filter((id) => state.words.some((word) => word.id === id));
    if (!known.length) return window.alert("この単語データに一致するIDがありませんでした。スペイン語用の書き出しファイルか確認してください。");
    const added = known.filter((id) => !state.checked.has(id));
    const ignored = ids.length - known.length;
    const message = `${known.length}語のチェックを読み込みます。\n新しく追加: ${added.length}語（現在のチェック${state.checked.size}語はそのまま残ります）`
      + (ignored ? `\n一致しないID ${ignored}件は無視します。` : "");
    if (!window.confirm(message)) return;
    added.forEach((id) => state.checked.add(id));
    saveCheckedIds(CHECKED_KEY, state.checked);
    renderChecked();
    updateCheckedSummary();
    window.alert(added.length ? `${added.length}語を追加しました。` : "すべて登録済みでした。");
  });
}
