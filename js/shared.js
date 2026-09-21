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

export function setMobileMenu(open) {
  $(".sidebar").classList.toggle("is-open", open);
  document.body.classList.toggle("nav-open", open);
  $(".mobile-menu").setAttribute("aria-expanded", String(open));
  $(".mobile-menu").setAttribute("aria-label", open ? "メニューを閉じる" : "メニューを開く");
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
