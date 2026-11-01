// 文法（HSK2・3）：ステップと単元の一覧、単元のページ、確認ドリル、進み具合。
// データは data/chinese/grammar.json（単元）と data/source/grammar/hsk-grammar-syllabus.json（公式大綱の項目）。
import { $, escapeHtml, localDateKey, shuffle } from "../shared.js";
import { bindWordRowAudio } from "./audio.js";
import { choicesSoundAlike, filledSentence, grammarAudioFile, readingIndex } from "./grammar-audio.js";
import { authoredQuestion, guideById, guideSectionHtml, judgeQuestion, startCustomPractice } from "./guide.js";
import { showView } from "./main.js";
import { state } from "./state.js";

const PROGRESS_KEY = "hsk-grammar-progress-v1";
const DRILL_SIZE = 5;
const PASS_RATIO = 0.8;   // 5問中4問で合格
const LISTEN_SIZE = 3;    // 聞き取りチェックの問数（合否には使わない）
const STEP_TEST_SIZE = 15;  // ステップのまとめテスト（聞く4・並べる3・残りは選択と○×）
const STEP_TEST_MIX = { listening: 4, reorder: 3 };
const STATUS_LABEL = { new: "未着手", learning: "学習中", passed: "合格", draft: "準備中" };

// 進み具合は学習記録とは別に保存する（学習記録をリセットしても消えない）。
let progress = null;
function grammarProgress() {
  if (progress) return progress;
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
    const object = (value) => (value && typeof value === "object" ? value : {});
    progress = { units: object(saved?.units), steps: object(saved?.steps) };
  } catch { progress = { units: {}, steps: {} }; }
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

const stepPassed = (step) => Boolean(grammarProgress().steps[step.id]?.passed);
const stepUnitsOf = (step) => units().filter((unit) => unit.step === step.id);

/**
 * 「続きから」：ステップの順に見て、未合格の単元があればその単元、
 * 単元はすべて合格したのにまとめテストが未合格ならそのステップ（{ step }）。すべて済んでいれば null。
 */
export function nextAction() {
  for (const step of state.grammar?.steps || []) {
    const unit = stepUnitsOf(step).find((item) => hasContent(item) && unitStatus(item) !== "passed");
    if (unit) return { unit };
    if (!stepPassed(step)) return { step };
  }
  return null;
}

/** 「続きから」を開く：単元ならそのページ、まとめテストなら一覧のそのステップの位置。 */
export function openContinue() {
  const next = nextAction();
  if (next?.unit) openUnit(next.unit.id);
  else openGrammarMap(next?.step?.id || null);
}

const nextActionLabel = (next) => (next?.unit ? next.unit.title : next?.step ? `STEP ${stepNumber(next.step)}（HSK${next.step.level}）のまとめテスト` : "");

export function openUnit(id) {
  if (!unitById(id)) return;
  state.selectedUnit = id;
  if (window.location.hash === `#grammar/${id}`) showView("grammar");
  else window.location.hash = `grammar/${id}`;
}

/** 文法の一覧を開く。stepId を渡すと、そのステップのまとめテストの位置まで移動する。 */
export function openGrammarMap(stepId = null) {
  state.selectedUnit = null;
  focusStep = stepId;
  if (window.location.hash === "#grammar") showView("grammar");
  else window.location.hash = "grammar";
}
let focusStep = null;

/** 改修前の文法ページのURL（#guide/〇〇）の転送先。コラムとして残したページは null（そのまま開く）。 */
export function grammarRedirect(guideId) {
  const target = state.grammar?.redirects?.[guideId];
  if (!target || target.startsWith("column:")) return null;
  return target === "#grammar" ? "grammar" : `grammar/${target}`;
}

/** 一覧・単元のページを描く。まとめテストの位置へ移動したときは true を返す（呼び出し側で先頭へ戻さない）。 */
export function renderGrammar() {
  const unit = state.selectedUnit ? unitById(state.selectedUnit) : null;
  $("#grammar-map").classList.toggle("is-hidden", Boolean(unit));
  $("#grammar-unit").classList.toggle("is-hidden", !unit);
  if (unit) renderGrammarUnit(unit); else renderGrammarMap();
  const target = !unit && focusStep ? document.getElementById(`grammar-test-${focusStep}`) : null;
  focusStep = null;
  target?.scrollIntoView({ block: "center" });
  return Boolean(target);
}

function stepTestHtml(step) {
  const record = grammarProgress().steps[step.id];
  const stepUnits = stepUnitsOf(step);
  const ready = stepUnits.every((unit) => unitStatus(unit) === "passed");
  const chip = record?.passed ? `<span class="grammar-status is-passed">合格</span>` : record?.attempts ? `<span class="grammar-status is-learning">最高 ${Math.round((record.best || 0) * 100)}%</span>` : "";
  return `<div class="grammar-step-test" id="grammar-test-${escapeHtml(step.id)}">
    <div><strong>まとめテスト ${STEP_TEST_SIZE}問</strong>${chip}
      <small>このステップの${stepUnits.length}単元から、聞く・読む・並べるを混ぜて出題。8割以上で合格です。${ready || record?.passed ? "" : "単元を合格してから受けると効果的です（いつでも受けられます）。"}</small></div>
    <button class="${ready && !record?.passed ? "primary-button" : "secondary-button"}" type="button" data-step-test="${escapeHtml(step.id)}">まとめテストを受ける <span>→</span></button>
  </div>`;
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
  const next = nextAction();
  // おすすめ：「続きから」が指すステップ（未合格の単元か、まとめテストが残っているいちばん前のステップ）
  const recommended = next?.step || (next?.unit ? stepById(next.unit.step) : null);
  const levelHtml = [2, 3].map((level) => {
    const syllabusCount = state.grammarSyllabus.filter((item) => item.level === level).length;
    const steps = state.grammar.steps.filter((step) => step.level === level).map((step) => {
      const stepUnits = all.filter((unit) => unit.step === step.id);
      const passedCount = stepUnits.filter((unit) => unitStatus(unit) === "passed").length;
      return `<section class="grammar-step${step === recommended ? " is-recommended" : ""}">
        <header class="grammar-step-head">
          <div><p class="eyebrow">STEP ${stepNumber(step)} · <span class="grammar-stars" aria-label="難易度${step.stars}">${"★".repeat(step.stars)}</span>${step === recommended ? ` <span class="grammar-recommend">おすすめ</span>` : ""}${stepPassed(step) ? ` <span class="grammar-status is-passed">まとめテスト合格</span>` : ""}</p>
            <h3>${escapeHtml(step.title)}</h3><p>${escapeHtml(step.goal)}</p></div>
          <span class="grammar-step-count">合格 <strong>${passedCount}</strong> / ${stepUnits.length}</span>
        </header>
        <ol class="grammar-unit-list">${stepUnits.map((unit) => `<li>
          <button class="grammar-unit-row" type="button" data-grammar-open="${escapeHtml(unit.id)}">
            <span class="grammar-unit-number">${unit.order}</span>
            <span class="grammar-unit-title">${escapeHtml(unit.title)}</span>
            ${statusChip(unit)}
          </button></li>`).join("")}</ol>
        ${stepTestHtml(step)}
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
      ${next ? `<button class="primary-button grammar-continue" type="button" data-grammar-open="continue">続きから：${escapeHtml(nextActionLabel(next))} <span>→</span></button>` : `<p class="grammar-complete">全単元・全ステップのまとめテストに合格しました。</p>`}
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
  container.querySelectorAll("[data-step-test]").forEach((button) => button.addEventListener("click", () => startStepTest(button.dataset.stepTest)));
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
    <div class="grammar-unit-meta">${statusChip(unit)}${record?.attempts ? `<span>確認ドリルの最高 ${Math.round((record.best || 0) * 100)}%（${record.attempts}回）</span>` : ""}${record?.listenAttempts ? `<span>聞き取りの最高 ${Math.round((record.listenBest || 0) * 100)}%（${record.listenAttempts}回）</span>` : ""}</div>
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
    ${listeningQuestions(unit).length ? `<section class="grammar-drill grammar-listen">
      <div><h2>聞き取りチェック ${Math.min(LISTEN_SIZE, listeningQuestions(unit).length)}問</h2><p>この単元の文型を、文字を見ずに音声で聞き取ります。合否には関係しません。</p></div>
      <button id="grammar-listen-start" class="secondary-button" type="button">聞き取りを始める <span>→</span></button>
    </section>` : ""}
    ${columns.length ? `<div class="grammar-related"><span>あわせて読む</span>${columns.map((column) => column.id === "measure"
      ? `<button class="tag-chip" type="button" data-category-open="measure">${escapeHtml(column.title)}</button>`
      : `<button class="tag-chip" type="button" data-guide-open="${escapeHtml(column.id)}">${escapeHtml(column.title)}</button>`).join("")}</div>` : ""}
    <nav class="grammar-unit-nav" aria-label="前後の単元">
      ${previous ? `<button class="secondary-button" type="button" data-grammar-open="${escapeHtml(previous.id)}">← ${previous.order}. ${escapeHtml(previous.title)}</button>` : "<span></span>"}
      ${next ? `<button class="secondary-button" type="button" data-grammar-open="${escapeHtml(next.id)}">${next.order}. ${escapeHtml(next.title)} →</button>` : "<span></span>"}
    </nav>`;
  $("#grammar-drill-start")?.addEventListener("click", () => startUnitPractice(unit.id));
  $("#grammar-listen-start")?.addEventListener("click", () => startUnitListening(unit.id));
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

// 単語データの読み（選択肢が同じ音かどうかの判定に使う。初回に作って使い回す）
let readings = null;
const wordReadings = () => (readings ||= readingIndex(state.words));

/**
 * 聞き取りチェックの候補。形式ごとに1つの配列にまとめ、[会話, 穴埋め, 正誤, 意味] の順で返す。
 * どれも録音済みの文（js/chinese/grammar-audio.js の grammarAudioTexts）だけを使う。
 */
function listeningPools(unit) {
  const pools = [];
  const dialogue = unit.dialogue;
  if (dialogue?.audio) pools.push([{
    source: dialogue.audio, skill: "listening", kind: "audio-dialogue", audioText: dialogue.audio, audioFile: grammarAudioFile(dialogue.audio),
    choices: shuffle([dialogue.answer, ...dialogue.distractors]).map((label) => ({ value: label, label })), correct: dialogue.answer,
    instruction: "会話を聞いて、質問の答えを選んでください", explanation: `${dialogue.prompt} — ${dialogue.answer}（${dialogue.ja}）`,
  }]);
  // 穴埋め：文も訳も見せずに完成した文を聞き、文の中で使われていた語句を選ぶ（読むだけでは解けないように）。
  // 的／得／地 のように選択肢が同じ音になる問題は、耳では区別できないので出さない。
  pools.push(unit.practice.filter((item) => filledSentence(item) && !choicesSoundAlike(item.choices, wordReadings())).map((item) => {
    const text = filledSentence(item);
    return {
      ...authoredQuestion(item), source: item.prompt, skill: "listening", kind: "audio-fill",
      audioText: text, audioMeaning: item.subPrompt, audioFile: grammarAudioFile(text),
      instruction: "音声を聞いて、文の中で使われていた語句を選んでください",
    };
  }));
  // 正誤：よくある間違いの、正しい文か誤った文のどちらかを聞いて判定する。
  pools.push(unit.compare.map((pair) => {
    const showWrong = Math.random() < 0.5;
    const text = showWrong ? pair.wrong : pair.right;
    return {
      source: pair.right, skill: "listening", kind: "audio-judge", audioText: text, audioFile: grammarAudioFile(text), audioMeaning: pair.meaning,
      prompt: pair.meaning ? `「${pair.meaning}」と言いたいとき、聞こえた文は正しいでしょうか。` : "聞こえた文は正しいでしょうか。",
      choices: [{ value: "true", label: "对（正しい）" }, { value: "false", label: "不对（間違い）" }], correct: String(!showWrong),
      instruction: "音声を聞いて、文が正しいかどうかを選んでください", explanation: `${pair.note}正しくは「${pair.right}」。`,
    };
  }));
  // 意味：型カードの例文を聞いて、日本語の意味を選ぶ（選択肢は同じ単元の別の例文の訳）。
  const examples = unit.sections.flatMap((section) => section.patterns || []).map((pattern) => pattern.example).filter((example) => example?.cn && example.ja);
  const meanings = [...new Set(examples.map((example) => example.ja))];
  pools.push(meanings.length < 3 ? [] : examples.map((example) => ({
    source: example.cn, skill: "listening", kind: "audio-sentence", audioText: example.cn, audioPinyin: example.pinyin, audioMeaning: example.ja,
    audioFile: grammarAudioFile(example.cn), correct: example.ja,
    choices: shuffle([example.ja, ...shuffle(meanings.filter((ja) => ja !== example.ja)).slice(0, 3)]).map((label) => ({ value: label, label })),
    instruction: "音声の内容として正しいものを選んでください", explanation: `${example.cn}（${example.ja}）`,
  })));
  return pools.filter((pool) => pool.length);
}
const listeningQuestions = (unit) => listeningPools(unit).flat();

/** 聞き取りチェック：会話を優先し、なるべく違う形式から1問ずつ選ぶ。 */
export function startUnitListening(id = state.selectedUnit) {
  const unit = unitById(id);
  if (!unit) return;
  const pools = listeningPools(unit).map((pool) => shuffle(pool));
  const [first, ...rest] = pools;
  const ordered = [first, ...shuffle(rest)].filter(Boolean);
  const picked = [];
  while (picked.length < LISTEN_SIZE && ordered.some((pool) => pool.length)) {
    for (const pool of ordered) if (picked.length < LISTEN_SIZE && pool.length) picked.push(pool.shift());
  }
  if (!picked.length) return;
  startCustomPractice(picked.map((question) => ({ ...question, audioPlays: 0 })), {
    label: unit.title, modeLabel: "聞き取りチェック", level: stepById(unit.step).level, unitId: unit.id, listening: true,
  });
}

/** 単元ごとの候補を、単元を1つずつ巡って並べる（同じ単元ばかり続かないように）。 */
function roundRobin(lists) {
  const queues = lists.map((list) => [...list]).filter((list) => list.length);
  const out = [];
  while (queues.some((list) => list.length)) queues.forEach((list) => { if (list.length) out.push(list.shift()); });
  return out;
}

/** ドリルの1問に元の単元を添える（間違えたときに戻る単元が分かるように）。unit が null ならステップの復習問題。 */
function withUnit(question, unit) {
  const tag = unit ? `［単元${unit.order}「${unit.title}」］` : "［ステップの復習問題（単元をまたぐ内容）］";
  return { ...question, explanation: `${question.explanation || ""}${tag}` };
}

/**
 * まとめテストの問題：聞く4問（会話2問＋ほかの形式2問）・並べる3問・選択と○×で残り。
 * ステップの復習問題（単元をまたぐ問題）は「単元の1つ」として巡回に混ぜる（毎回同じ問題ばかりにならないように）。同じ文は2回出さない。
 */
export function stepTestQuestions(step) {
  const stepUnits = shuffle(stepUnitsOf(step).filter(hasContent));
  const used = new Set();
  const take = (pool, count, out) => {
    for (const question of pool) {
      if (out.length >= count) break;
      const key = question.source || question.prompt || question.answer;
      if (used.has(key)) continue;
      used.add(key);
      out.push(question);
    }
    return out;
  };
  const listenPools = stepUnits.map((unit) => listeningPools(unit).map((pool) => shuffle(pool).map((question) => withUnit(question, unit))));
  const listening = take(roundRobin(listenPools.map((pools) => pools.filter((pool) => pool[0]?.kind === "audio-dialogue").flat())), 2, []);
  take(roundRobin(listenPools.map((pools) => shuffle(pools.filter((pool) => pool[0]?.kind !== "audio-dialogue").flat()))), STEP_TEST_MIX.listening, listening);
  const review = step.review || { practice: [], compare: [] };
  const fromPractice = (item, unit) => withUnit({ ...authoredQuestion(item), source: item.kind === "reorder" ? item.answer : item.prompt }, unit);
  const fromCompare = (pair, unit) => withUnit({ ...judgeQuestion(pair, Math.random() < 0.5 ? 0 : 1), source: pair.right }, unit);
  const reorderQuestions = (practice, unit) => shuffle(practice.filter((item) => item.kind === "reorder")).map((item) => fromPractice(item, unit));
  const readingQuestions = (practice, compare, unit) => shuffle([
    ...practice.filter((item) => item.kind !== "reorder").map((item) => fromPractice(item, unit)),
    ...compare.map((pair) => fromCompare(pair, unit)),
  ]);
  const reorder = take(roundRobin(shuffle([
    reorderQuestions(review.practice, null),
    ...stepUnits.map((unit) => reorderQuestions(unit.practice, unit)),
  ])), STEP_TEST_MIX.reorder, []);
  const restCount = STEP_TEST_SIZE - listening.length - reorder.length;
  const reading = take(roundRobin(shuffle([
    readingQuestions(review.practice, review.compare, null),
    ...stepUnits.map((unit) => readingQuestions(unit.practice, unit.compare, unit)),
  ])), restCount, []);
  // 聞く → 読む → 並べる の順（試験と同じ並び）
  return [...listening.map((question) => ({ ...question, audioPlays: 0 })), ...shuffle(reading), ...shuffle(reorder)];
}

export function startStepTest(stepId) {
  const step = stepById(stepId);
  if (!step) return;
  const questions = stepTestQuestions(step);
  if (!questions.length) return;
  startCustomPractice(questions, { label: `STEP ${stepNumber(step)} ${step.title}`, modeLabel: "まとめテスト", level: step.level, stepId: step.id });
}

/** まとめテストの結果を記録する。8割以上で合格（一度合格したら取り消さない）。返り値は { passed, next }（next は次のステップ）。 */
export function recordStepResult(stepId, correct, total) {
  const step = stepById(stepId);
  if (!step || !total) return { passed: false, next: null };
  const ratio = correct / total;
  const record = grammarProgress().steps[stepId] ||= { passed: false, attempts: 0, best: 0 };
  record.attempts += 1;
  record.best = Math.max(record.best || 0, ratio);
  record.last = ratio;
  record.lastDate = localDateKey();
  const passed = ratio >= PASS_RATIO;
  if (passed) record.passed = true;
  saveGrammarProgress();
  updateGrammarHome();
  const steps = state.grammar.steps;
  return { passed, next: steps[steps.indexOf(step) + 1] || null };
}

/** 単元に合格して、そのステップの単元がすべて合格になったら、まとめテストのステップを返す。 */
export function stepReadyForTest(unitId) {
  const step = stepById(unitById(unitId)?.step);
  if (!step || stepPassed(step)) return null;
  return stepUnitsOf(step).every((unit) => unitStatus(unit) === "passed") ? step : null;
}

export const stepLabel = (step) => `STEP ${stepNumber(step)}（HSK${step.level}）「${step.title}」`;

/** 聞き取りチェックの結果を記録する（単元の合否には使わない）。 */
export function recordListeningResult(unitId, correct, total) {
  if (!unitById(unitId) || !total) return;
  const record = grammarProgress().units[unitId] ||= { passed: false, attempts: 0, best: 0 };
  record.listenAttempts = (record.listenAttempts || 0) + 1;
  record.listenBest = Math.max(record.listenBest || 0, correct / total);
  record.listenLast = correct / total;
  saveGrammarProgress();
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
  const next = nextAction();
  label.textContent = passed ? `合格 ${passed}/${all.length}単元・続き：${nextActionLabel(next) || "すべて合格"}` : `易しい順に${all.length}単元。最初は「${nextActionLabel(next)}」から`;
}
