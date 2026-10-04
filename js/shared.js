// 中国語ページ（app.js）とスペイン語ページ（spanish.js）で共通の処理。
// どちらのページからも同じ動きをしてほしいものだけを置く。
// このファイルは言語ごとの state を知らない。必要な値は引数で受け取る。
// ESモジュール。chinese.html は js/chinese/main.js から、spanish.html は spanish.js から読み込む。

export const $ = (selector) => document.querySelector(selector);
export const $$ = (selector) => [...document.querySelectorAll(selector)];

export function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

// 元の配列は変えずに、並べ替えた新しい配列を返す。
export function shuffle(items) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 学習記録の日付キー。UTCではなく端末の日付で数える。
export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function calculateDateStreak(dateKeys) {
  const dates = new Set(dateKeys);
  if (!dates.size) return 0;
  const cursor = new Date();
  if (!dates.has(localDateKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (dates.has(localDateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function setMobileMenu(open) {
  $(".sidebar").classList.toggle("is-open", open);
  document.body.classList.toggle("nav-open", open);
  $(".mobile-menu").setAttribute("aria-expanded", String(open));
  $(".mobile-menu").setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
}

export function bindMobileNavigation(navigate) {
  $$(".nav-item").forEach((button) => button.addEventListener("click", () => navigate(button.dataset.view)));
  $(".mobile-menu").addEventListener("click", () => setMobileMenu(!$(".sidebar").classList.contains("is-open")));
  $(".mobile-backdrop").addEventListener("click", () => setMobileMenu(false));
  window.addEventListener("keydown", (event) => { if (event.key === "Escape") setMobileMenu(false); });
}

export function activateView(view) {
  $$(".view").forEach((section) => section.classList.toggle("is-visible", section.id === `${view}-view`));
  $$(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.view === view));
  setMobileMenu(false);
}

// --- チェック（気になる単語） ---

export function loadCheckedIds(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return new Set(Array.isArray(saved) ? saved : []);
  } catch { return new Set(); }
}

export function saveCheckedIds(storageKey, ids) {
  try { localStorage.setItem(storageKey, JSON.stringify([...ids])); } catch {}
}

export function toggleCheckedState(id, { words, checkedIds, storageKey }) {
  const word = words.find((item) => item.id === id);
  if (!word) return null;
  if (checkedIds.has(id)) checkedIds.delete(id); else checkedIds.add(id);
  saveCheckedIds(storageKey, checkedIds);
  const checked = checkedIds.has(id);
  const label = checked ? "チェックを外す" : "チェックを付ける";
  $$(`[data-check-id="${id}"]`).forEach((button) => {
    button.classList.toggle("is-checked", checked);
    button.setAttribute("aria-pressed", String(checked));
    button.setAttribute("aria-label", label);
    button.title = label;
  });
  return { word, checked };
}

export function filterCheckedWords(words, checkedIds) {
  return words.filter((word) => checkedIds.has(word.id));
}

export function renderCheckedControls(count, actionSelector) {
  $("#checked-total-count").textContent = count;
  $("#empty-checked").classList.toggle("is-hidden", count > 0);
  $("#clear-checked").classList.toggle("is-hidden", count === 0);
  $("#export-checked").classList.toggle("is-hidden", count === 0);
  $$(actionSelector).forEach((button) => { button.disabled = count === 0; });
}

export function clearCheckedState(checkedIds, storageKey, confirmMessage, onChange) {
  if (!checkedIds.size || !window.confirm(confirmMessage)) return;
  checkedIds.clear();
  saveCheckedIds(storageKey, checkedIds);
  resetCheckButtons();
  onChange();
}

export function importCheckedIds(file, { words, checkedIds, storageKey, languageLabel, onChange }) {
  readCheckedFile(file, (ids) => {
    if (!ids) return window.alert("チェックの書き出しファイルとして読み込めませんでした。");
    const known = ids.filter((id) => words.some((word) => word.id === id));
    if (!known.length) return window.alert(`この単語データに一致するIDがありませんでした。${languageLabel}用の書き出しファイルか確認してください。`);
    const added = known.filter((id) => !checkedIds.has(id));
    const ignored = ids.length - known.length;
    const message = `${known.length}語のチェックを読み込みます。\n新しく追加: ${added.length}語（現在のチェック${checkedIds.size}語はそのまま残ります）`
      + (ignored ? `\n一致しないID ${ignored}件は無視します。` : "");
    if (!window.confirm(message)) return;
    added.forEach((id) => checkedIds.add(id));
    saveCheckedIds(storageKey, checkedIds);
    onChange();
    window.alert(added.length ? `${added.length}語を追加しました。` : "すべて登録済みでした。");
  });
}

export function checkButtonHtml(id, checked) {
  const label = checked ? "チェックを外す" : "チェックを付ける";
  return `<button class="check-toggle${checked ? " is-checked" : ""}" type="button" data-check-id="${escapeHtml(id)}" aria-pressed="${checked}" aria-label="${label}" title="${label}"><span aria-hidden="true">✓</span></button>`;
}

// 一括解除のあと、画面に残っているボタンの見た目を戻す。
export function resetCheckButtons() {
  $$("[data-check-id]").forEach((button) => {
    button.classList.remove("is-checked");
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", "チェックを付ける");
    button.title = "チェックを付ける";
  });
}

export function updateCheckedBadge(count, emptyLabel, countLabel) {
  const label = $("#checked-count-label");
  if (label) label.textContent = count ? countLabel(count) : emptyLabel;
  const badge = $("#checked-nav-count");
  if (badge) {
    badge.textContent = count;
    badge.classList.toggle("is-hidden", count === 0);
  }
}

export function renderReviewPanel(panel, session, options) {
  if (!panel || !session) return;
  const { itemHtml, emptyText, audioSelector, onAudio } = options;
  if (!panel.querySelector(".review-list")) {
    panel.innerHTML = `
      <div class="review-head">
        <div><p class="eyebrow">REVIEW</p><h2>振り返り</h2></div>
        <div class="review-filter" role="group" aria-label="振り返りの表示切り替え">
          <button class="review-chip is-active" type="button" data-review-scope="all" aria-pressed="true">すべて <b class="review-count-total">0</b></button>
          <button class="review-chip" type="button" data-review-scope="wrong" aria-pressed="false">まちがい <b class="review-count-missed">0</b></button>
        </div>
      </div>
      <ol class="review-list"></ol>
      <p class="review-empty empty-inline is-hidden"></p>`;
  }
  const { entries, scope } = session;
  panel.classList.toggle("is-hidden", !entries.length);
  if (!entries.length) return;
  const missed = entries.filter((entry) => entry.status !== "correct");
  panel.querySelector(".review-count-total").textContent = entries.length;
  panel.querySelector(".review-count-missed").textContent = missed.length;
  panel.querySelectorAll("[data-review-scope]").forEach((button) => {
    const isActive = button.dataset.reviewScope === scope;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
    button.onclick = () => {
      session.scope = button.dataset.reviewScope;
      renderReviewPanel(panel, session, options);
    };
  });
  const shown = scope === "wrong" ? missed : entries;
  panel.querySelector(".review-list").innerHTML = shown.map((entry) => itemHtml(entry, entries.indexOf(entry))).join("");
  const empty = panel.querySelector(".review-empty");
  empty.textContent = emptyText;
  empty.classList.toggle("is-hidden", shown.length > 0);
  panel.querySelectorAll(audioSelector).forEach((button) => button.addEventListener("click", () => onAudio(button, entries)));
}

export function reviewEntryHtml(entry, { checkedIds, audioHtml = "" } = {}) {
  const marks = { correct: "正解", wrong: "まちがい", skipped: "未回答" };
  const yourClass = entry.status === "correct" ? " is-correct" : entry.status === "wrong" ? " is-wrong" : "";
  const check = entry.wordId && checkedIds ? checkButtonHtml(entry.wordId, checkedIds.has(entry.wordId)) : "";
  return `<li class="review-item is-${entry.status}">
    <div class="review-item-head"><span class="review-index">${entry.number}</span><span class="review-tag">${escapeHtml(entry.tag)}</span><span class="review-mark">${marks[entry.status]}</span>${check}</div>
    ${entry.lines.filter((line) => line.text).map((line) => `<p class="review-line"><span>${escapeHtml(line.label)}</span><b>${escapeHtml(line.text)}</b></p>`).join("")}
    <div class="review-answers">
      <div class="review-answer${yourClass}"><span>あなたの回答</span><strong>${escapeHtml(entry.your || "未回答")}</strong></div>
      <div class="review-answer is-correct"><span>正解</span><strong>${escapeHtml(entry.answer || "—")}</strong></div>
    </div>
    ${entry.note ? `<p class="review-note">${escapeHtml(entry.note)}</p>` : ""}
    ${audioHtml}
  </li>`;
}

export function progressRowHtml(label, data) {
  const rate = data.answered ? Math.round(data.correct / data.answered * 100) : 0;
  return `<div class="progress-row"><strong>${escapeHtml(label)}</strong><div class="progress-bar"><span style="width:${rate}%"></span></div><span>${data.answered ? `${rate}%` : "—"}</span></div>`;
}

export function createAnswerButton(index) {
  const button = document.createElement("button");
  button.className = "answer-button";
  button.type = "button";
  button.dataset.key = String.fromCharCode(65 + index);
  return button;
}

// 書き出したJSONは他の端末・他のURLの同じ言語のページで読み込める。
export function downloadCheckedFile(language, ids) {
  const payload = { app: "language-study-app", type: "checked", language, exportedAt: new Date().toISOString(), ids };
  const blob = new Blob([`${JSON.stringify(payload, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `checked-${language}-${localDateKey()}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseCheckedFile(text) {
  try {
    const parsed = JSON.parse(text);
    const ids = Array.isArray(parsed) ? parsed : parsed?.ids;
    return Array.isArray(ids) ? [...new Set(ids.filter((id) => typeof id === "string"))] : null;
  } catch { return null; }
}

// 読み込めたIDの配列を onIds に渡す。読めなければ onIds(null) を呼ぶ。
export function readCheckedFile(file, onIds) {
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => onIds(null);
  reader.onload = () => onIds(parseCheckedFile(String(reader.result)));
  reader.readAsText(file);
}

export function bindCheckedFileActions({ clearChecked, exportChecked, importCheckedFile }) {
  const host = $(".checked-file-tools");
  if (host) host.innerHTML = `
    <div class="checked-tools">
      <button id="export-checked" class="text-button is-hidden" type="button">チェックを書き出す（JSON）</button>
      <button id="import-checked" class="text-button" type="button">チェックを読み込む</button>
      <button id="clear-checked" class="text-button is-hidden" type="button">チェックをすべて解除</button>
      <input id="import-checked-file" class="is-hidden" type="file" accept="application/json,.json" aria-label="チェックの書き出しファイルを選ぶ" />
    </div>
    <p class="checked-tools-note">別の端末やGitHub Pages版とチェックを共有するときは、書き出したJSONを読み込んでください。読み込みは追加なので、今あるチェックは消えません。</p>`;
  $("#clear-checked").addEventListener("click", clearChecked);
  $("#export-checked").addEventListener("click", exportChecked);
  $("#import-checked").addEventListener("click", () => $("#import-checked-file").click());
  $("#import-checked-file").addEventListener("change", (event) => {
    importCheckedFile(event.target.files[0]);
    event.target.value = "";
  });
}
