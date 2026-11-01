// 文法（HSK2・3）：ステップと単元の一覧、単元のページ、確認ドリル、進み具合。
// データは data/chinese/grammar.json（単元）と data/source/grammar/hsk-grammar-syllabus.json（公式大綱の項目）。
import { $, escapeHtml, localDateKey, shuffle } from "../shared.js";
import { bindWordRowAudio } from "./audio.js";
import { authoredQuestion, guideById, guideSectionHtml, judgeQuestion, startCustomPractice } from "./guide.js";
import { showView } from "./main.js";
import { state } from "./state.js";

const PROGRESS_KEY = "hsk-grammar-progress-v1";
const DRILL_SIZE = 5;
const PASS_RATIO = 0.8;   // 5問中4問で合格
const STATUS_LABEL = { new: "未着手", learning: "学習中", passed: "合格", draft: "準備中" };

// 進み具合は学習記録とは別に保存する（学習記録をリセットしても消えない）。
let progress = null;
function grammarProgress() {
  if (progress) return progress;
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    progress = { units: saved && typeof saved.units === "object" && saved.units ? saved.units : {} };
  } catch { progress = { units: {} }; }
  return progress;
}
function saveGrammarProgress() {
  try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(grammarProgress())); } catch {}
}

const units = () => state.grammar?.units || [];
export const unitById = (id) => units().find((unit) => unit.id === id) || null;
const stepById = (id) => state.grammar?.steps.find((step) => step.id === id) || null;
const stepNumber = (step) => state.grammar.steps.filter((item) => item.level === step.level).indexOf(step) + 1;
const hasContent = (unit) => unit.sections.length > 0 || unit.practice.length > 0;
const drillCount = (unit) => Math.min(DRILL_SIZE, unit.practice.length + unit.compare.length);

export function unitStatus(unit) {
  if (!hasContent(unit)) return "draft";
  const record = grammarProgress().units[unit.id];
  if (record?.passed) return "passed";
  return record ? "learning" : "new";
}

/** 「続きから」の単元：解説のある単元のうち、順番がいちばん早い未合格の単元。 */
export function continueUnit() {
  return units().find((unit) => hasContent(unit) && unitStatus(unit) !== "passed")
    || units().find((unit) => unitStatus(unit) !== "passed") || units()[0] || null;
}

export function openUnit(id) {
  if (!unitById(id)) return;
  state.selectedUnit = id;
  if (window.location.hash === `#grammar/${id}`) showView("grammar");
  else window.location.hash = `grammar/${id}`;
}

export function openGrammarMap() {
  state.selectedUnit = null;
  if (window.location.hash === "#grammar") showView("grammar");
  else window.location.hash = "grammar";
}

/** 改修前の文法ページのURL（#guide/〇〇）の転送先。コラムとして残したページは null（そのまま開く）。 */
export function grammarRedirect(guideId) {
  const target = state.grammar?.redirects?.[guideId];
  if (!target || target.startsWith("column:")) return null;
  return target === "#grammar" ? "grammar" : `grammar/${target}`;
}

export function renderGrammar() {
  const unit = state.selectedUnit ? unitById(state.selectedUnit) : null;
  $("#grammar-map").classList.toggle("is-hidden", Boolean(unit));
  $("#grammar-unit").classList.toggle("is-hidden", !unit);
  if (unit) renderGrammarUnit(unit); else renderGrammarMap();
}

function statusChip(unit) {
  const status = unitStatus(unit);
  return `<span class="grammar-status is-${status}">${STATUS_LABEL[status]}</span>`;
}

function renderGrammarMap() {
  const container = $("#grammar-map");
  if (!state.grammar) {
    container.innerHTML = `<p class="empty-state">文法のデータを読み込めませんでした。</p>`;
    return;
  }
  const all = units();
  const passed = all.filter((unit) => unitStatus(unit) === "passed").length;
  const next = continueUnit();
  const levelHtml = [2, 3].map((level) => {
    const syllabusCount = state.grammarSyllabus.filter((item) => item.level === level).length;
    const steps = state.grammar.steps.filter((step) => step.level === level).map((step) => {
      const stepUnits = all.filter((unit) => unit.step === step.id);
      const stepPassed = stepUnits.filter((unit) => unitStatus(unit) === "passed").length;
      return `<section class="grammar-step">
        <header class="grammar-step-head">
          <div><p class="eyebrow">STEP ${stepNumber(step)} · <span class="grammar-stars" aria-label="難易度${step.stars}">${"★".repeat(step.stars)}</span></p>
            <h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.goal)}</p></div>
          <span class="grammar-step-count">合格 <strong>${stepPassed}</strong> / ${stepUnits.length}</span>
        </header>
        <ol class="grammar-unit-list">${stepUnits.map((unit) => `<li>
          <button class="grammar-unit-row" type="button" data-grammar-open="${escapeHtml(unit.id)}">
            <span class="grammar-unit-number">${unit.order}</span>
            <span class="grammar-unit-title">${escapeHtml(unit.title)}</span>
            ${statusChip(unit)}
          </button></li>`).join("")}</ol>
      </section>`;
    }).join("");
    return `<section class="grammar-level">
      <header class="grammar-level-head"><h2>HSK ${level}</h2><span>公式大綱の文法 ${syllabusCount}項目</span></header>
      ${steps}
    </section>`;
  }).join("");
  const columns = state.grammar.columns.map((column) => {
    const guide = guideById(column.id);
    const attr = column.id === "measure" ? 'data-category-open="measure"' : `data-guide-open="${escapeHtml(column.id)}"`;
    return `<button class="guide-card" type="button" ${attr}>
      <span class="guide-card-mark">${escapeHtml(guide?.mark || (column.id === "measure" ? "量" : "文"))}</span>
      <span class="guide-card-body"><strong>${escapeHtml(column.title)}</strong><small>${escapeHtml(guide?.blurb || column.note || "")}</small></span>
      <span class="guide-card-go" aria-hidden="true">→</span></button>`;
  }).join("");
  container.innerHTML = `
    <div class="page-heading examples-heading">
      <div><p class="eyebrow">GRAMMAR · HSK 2–3</p><h1 id="grammar-title">文法</h1>
        <p>新版HSK考试大纲の文法（HSK2・HSK3）を、易しい順に${state.grammar.steps.length}ステップ・${all.length}単元にまとめました。単元ごとに解説を読み、確認ドリル${DRILL_SIZE}問で8割取れたら合格です。どの単元からでも始められます。</p></div>
    </div>
    <div class="grammar-progress-card">
      <div><strong>合格 ${passed} / ${all.length}単元</strong>
        <div class="daily-progress"><span style="width:${all.length ? Math.round((passed / all.length) * 100) : 0}%"></span></div>
        ${all.some((unit) => !hasContent(unit)) ? `<small>解説のある単元 ${all.filter(hasContent).length} / ${all.length}（準備中の単元は順次追加します）</small>` : `<small>全${all.length}単元に解説と確認ドリルがあります</small>`}</div>
      ${next ? `<button class="primary-button grammar-continue" type="button" data-grammar-open="${escapeHtml(next.id)}">続きから：${escapeHtml(next.title)} <span>→</span></button>` : ""}
    </div>
    ${levelHtml}
    <section class="grammar-level">
      <header class="grammar-level-head"><h2>コラム</h2><span>単元とは別に、まとめて読める解説</span></header>
      <div class="guide-band grammar-columns">${columns}</div>
    </section>
    ${(state.grammar.top?.sections || []).length ? `<section class="grammar-level">
      <header class="grammar-level-head"><h2>見取り図</h2><span>単元をまたいで使う文の骨組み</span></header>
      <div class="guide-sections">${state.grammar.top.sections.map(guideSectionHtml).join("")}</div>
    </section>` : ""}`;
}

function renderGrammarUnit(unit) {
  const container = $("#grammar-unit");
  const step = stepById(unit.step);
  const all = units();
  const index = all.indexOf(unit);
  const previous = all[index - 1];
  const next = all[index + 1];
  const status = unitStatus(unit);
  // 開いた時点で「学習中」にする（解説のある単元だけ）。
  if (status === "new") {
    grammarProgress().units[unit.id] = { passed: false, attempts: 0, best: 0, opened: localDateKey() };
    saveGrammarProgress();
  }
  const record = grammarProgress().units[unit.id];
  const syllabus = unit.syllabus.map((id) => state.grammarSyllabus.find((item) => item.id === id)).filter(Boolean);
  const requires = (unit.requires || []).map(unitById).filter(Boolean);
  const columns = (unit.columns || []).map((id) => state.grammar.columns.find((column) => column.id === id)).filter(Boolean);
  const count = drillCount(unit);
  const compareSection = unit.compare.length ? guideSectionHtml({ heading: "よくある間違い", compare: unit.compare }) : "";
  container.innerHTML = `
    <button class="text-button" type="button" data-grammar-open="">← 文法の一覧へ戻る</button>
    <div class="page-heading examples-heading grammar-unit-heading">
      <div><p class="eyebrow">HSK ${step.level} · STEP ${stepNumber(step)} ${"★".repeat(step.stars)} · ${escapeHtml(step.title)}</p>
        <h1 id="grammar-unit-title">${escapeHtml(unit.title)}</h1>
        <p class="grammar-goal"><span>できるようになること</span>${escapeHtml(unit.goal)}</p></div>
      <div class="example-total level-total"><strong>${unit.order}</strong><span>/ ${all.length}単元</span></div>
    </div>
    <div class="grammar-unit-meta">${statusChip(unit)}${record?.attempts ? `<span>確認ドリルの最高 ${Math.round((record.best || 0) * 100)}%（${record.attempts}回）</span>` : ""}</div>
    ${requires.length ? `<div class="grammar-requires"><span>先に学ぶ単元</span>${requires.map((item) => `<button class="tag-chip" type="button" data-grammar-open="${escapeHtml(item.id)}">${item.order}. ${escapeHtml(item.title)}（${STATUS_LABEL[unitStatus(item)]}）</button>`).join("")}</div>` : ""}
    <section class="grammar-syllabus">
      <h2>この単元で学ぶ文法（公式大綱）</h2>
      <ul>${syllabus.map((item) => `<li><b lang="zh-CN">${escapeHtml(item.source)}</b><span>${escapeHtml(item.ja)}</span></li>`).join("")}</ul>
    </section>
    ${status === "draft" ? `<p class="daily-note"><strong>この単元の解説は準備中です。</strong>上の文法項目を扱う解説と確認ドリルを、順次追加します。</p>` : ""}
    <div class="guide-sections">${unit.sections.map(guideSectionHtml).join("")}${compareSection}</div>
    ${count ? `<section class="grammar-drill">
      <div><h2>確認ドリル ${count}問</h2><p>8割以上の正解で合格です。${status === "passed" ? "この単元は合格済みです。" : ""}</p></div>
      <button id="grammar-drill-start" class="primary-button" type="button">確認ドリルを始める <span>→</span></button>
    </section>` : ""}
    ${columns.length ? `<div class="grammar-related"><span>あわせて読む</span>${columns.map((column) => column.id === "measure"
      ? `<button class="tag-chip" type="button" data-category-open="measure">${escapeHtml(column.title)}</button>`
      : `<button class="tag-chip" type="button" data-guide-open="${escapeHtml(column.id)}">${escapeHtml(column.title)}</button>`).join("")}</div>` : ""}
    <nav class="grammar-unit-nav" aria-label="前後の単元">
      ${previous ? `<button class="secondary-button" type="button" data-grammar-open="${escapeHtml(previous.id)}">← ${previous.order}. ${escapeHtml(previous.title)}</button>` : "<span></span>"}
      ${next ? `<button class="secondary-button" type="button" data-grammar-open="${escapeHtml(next.id)}">${next.order}. ${escapeHtml(next.title)} →</button>` : "<span></span>"}
    </nav>`;
  $("#grammar-drill-start")?.addEventListener("click", () => startUnitPractice(unit.id));
  bindWordRowAudio(container);
}

/** 確認ドリル：語順問題1問・○×1問を入れ、残りを選択問題で埋める（足りなければある分だけ）。 */
export function startUnitPractice(id = state.selectedUnit) {
  const unit = unitById(id);
  if (!unit) return;
  const authored = unit.practice.map(authoredQuestion);
  const reorders = shuffle(authored.filter((question) => question.kind === "reorder"));
  const choices = shuffle(authored.filter((question) => question.kind !== "reorder"));
  const judges = shuffle(unit.compare).map((pair) => judgeQuestion(pair, Math.random() < 0.5 ? 0 : 1));
  const picked = [...reorders.splice(0, 1), ...judges.splice(0, 1)];
  for (const pool of [choices, reorders, judges]) while (picked.length < DRILL_SIZE && pool.length) picked.push(pool.shift());
  if (!picked.length) return alert("この単元の確認ドリルは準備中です。");
  startCustomPractice(shuffle(picked), { label: unit.title, modeLabel: "確認ドリル", level: stepById(unit.step).level, unitId: unit.id });
}

/** 確認ドリルの結果を記録する。8割以上で合格（一度合格したら、その後の結果で取り消さない）。 */
export function recordUnitResult(unitId, correct, total) {
  if (!unitById(unitId) || !total) return false;
  const ratio = correct / total;
  const record = grammarProgress().units[unitId] ||= { passed: false, attempts: 0, best: 0 };
  record.attempts = (record.attempts || 0) + 1;
  record.best = Math.max(record.best || 0, ratio);
  record.last = ratio;
  record.lastDate = localDateKey();
  const passedNow = ratio >= PASS_RATIO;
  if (passedNow) record.passed = true;
  saveGrammarProgress();
  updateGrammarHome();
  return passedNow;
}

export function updateGrammarHome() {
  const label = $("#grammar-home-label");
  if (!label || !state.grammar) return;
  const all = units();
  const passed = all.filter((unit) => unitStatus(unit) === "passed").length;
  const next = continueUnit();
  label.textContent = passed ? `合格 ${passed}/${all.length}単元・続き：${next?.title || "すべて合格"}` : `易しい順に${all.length}単元。最初は「${next?.title || ""}」から`;
}
