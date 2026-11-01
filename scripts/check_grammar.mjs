#!/usr/bin/env node
// 文法セクション（data/chinese/grammar.json）の構成を、公式大綱の項目一覧と突き合わせて検証する。
//   node scripts/check_grammar.mjs
// 解説・ドリルの中身（ピンイン・選択肢など）は scripts/check_guides.mjs で確認する。
// 大綱の全項目（HSK2・HSK3）がちょうど1つの単元またはコラムに割り当てられているか、
// 単元の級とステップの級が一致するか、1単元が5項目以内か、先に学ぶ単元（requires）が前に並んでいるか、
// 改修前のページの旧URLがすべて転送され、転送先が実在するかを確認する。
// 網羅：大綱の各項目に、その項目の印（syllabus）が付いた型カードとドリル（○×にする「よくある間違い」を含む）が
// 1つ以上あるか、各単元に確認ドリル5問ぶんの問題があるか、大綱の2文字以上の語がその級の例文に出てくるかも確認する。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { filledSentence, grammarAudioId, grammarAudioTexts } from "../js/chinese/grammar-audio.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

const errors = [];
const syllabus = read("data/source/grammar/hsk-grammar-syllabus.json").items;
const plan = read("data/chinese/grammar.json");
const columnGuides = new Set(read("data/chinese/guides.json").guides.map((guide) => guide.id));
// 改修前の文法ページのID。旧URL（#guide/〇〇）はすべてどこかへ転送する。
const OLD_GUIDE_IDS = ["hsk3-grammar", "le", "bi", "ba", "complement", "shi-de", "conjunction", "cognition", "de", "de-functions",
  "aspect", "passive-causative", "adverb-order", "verb-patterns", "fixed-patterns", "official-patterns", "pronouns-order"];

const items = new Map();
for (const item of syllabus) {
  if (items.has(item.id)) errors.push(`大綱の項目IDが重複: ${item.id}`);
  items.set(item.id, item);
  if (![2, 3].includes(item.level)) errors.push(`${item.id}: 級は2か3`);
  if (!item.source || !item.ja) errors.push(`${item.id}: source・ja のいずれかが未設定`);
  if (!["full", "partial", "none"].includes(item.current?.status)) errors.push(`${item.id}: current.status が不正`);
}

const steps = new Map(plan.steps.map((step) => [step.id, step]));
const owner = new Map();
const assign = (id, where) => {
  if (!items.has(id)) return errors.push(`${where}: 大綱にない項目ID ${id}`);
  if (owner.has(id)) errors.push(`${id}: ${owner.get(id)} と ${where} の両方に割り当てられている`);
  owner.set(id, where);
};

const MAX_ITEMS_PER_UNIT = 5;   // 1単元5〜10分で学べる量に抑える
const unitIds = new Set();
const unitIndex = new Map(plan.units.map((unit, index) => [unit.id, index]));
plan.steps.forEach((step, index) => {
  const previous = plan.steps[index - 1];
  if (previous && (step.level < previous.level || (step.level === previous.level && step.stars !== previous.stars + 1)))
    errors.push(`ステップ ${step.id}: 級の中で★が1つずつ増える順に並んでいない`);
});
for (const unit of plan.units) {
  if (unitIds.has(unit.id)) errors.push(`単元IDが重複: ${unit.id}`);
  unitIds.add(unit.id);
  const step = steps.get(unit.step);
  if (!step) { errors.push(`${unit.id}: ステップ ${unit.step} がない`); continue; }
  if (!unit.syllabus?.length) errors.push(`${unit.id}: 扱う大綱の項目がない`);
  if ((unit.syllabus || []).length > MAX_ITEMS_PER_UNIT) errors.push(`${unit.id}: 項目が${unit.syllabus.length}個（${MAX_ITEMS_PER_UNIT}個まで）`);
  for (const required of unit.requires || []) {
    if (!unitIndex.has(required)) errors.push(`${unit.id}: 先に学ぶ単元 ${required} がない`);
    else if (unitIndex.get(required) >= unitIndex.get(unit.id)) errors.push(`${unit.id}: 先に学ぶ単元 ${required} が後ろに並んでいる`);
  }
  if (plan.steps.findIndex((item) => item.id === unit.step) < plan.steps.findIndex((item) => item.id === plan.units[unitIndex.get(unit.id) - 1]?.step))
    errors.push(`${unit.id}: ステップの順に並んでいない`);
  for (const id of unit.syllabus || []) {
    assign(id, unit.id);
    if (items.get(id) && items.get(id).level !== step.level) errors.push(`${unit.id}（HSK${step.level}）に HSK${items.get(id).level} の項目 ${id} が入っている`);
  }
  if (!unit.goal) errors.push(`${unit.id}: できるようになること（goal）が未設定`);
  for (const column of unit.columns || []) if (!plan.columns.some((item) => item.id === column)) errors.push(`${unit.id}: 関連コラム ${column} がない`);
}
for (const column of plan.columns) {
  for (const id of column.syllabus || []) assign(id, `コラム:${column.id}`);
  if (column.id !== "measure" && !columnGuides.has(column.id)) errors.push(`コラム ${column.id} のページが guides.json にない`);
}

// --- 網羅 ---
const DRILL_SIZE = 5;
const sentence = (entry) => entry.example?.cn || entry.answer || entry.right
  || String(entry.prompt || "").replace(/＿+/, String(entry.correct || "").split("／")[0]);
const examplesByLevel = { 2: [], 3: [] };
const gaps = [];
for (const unit of plan.units) {
  const step = steps.get(unit.step);
  const patterns = unit.sections.flatMap((section) => section.patterns || []);
  const drills = [...unit.practice, ...unit.compare];
  for (const entry of [...patterns, ...drills]) {
    for (const id of entry.syllabus || []) if (!unit.syllabus.includes(id)) errors.push(`${unit.id}: 単元の項目にない印 ${id} → ${sentence(entry)}`);
    if (step) examplesByLevel[step.level].push(sentence(entry));
  }
  if (drills.length < DRILL_SIZE) gaps.push(`${unit.id}: 確認ドリルの問題が${drills.length}問（${DRILL_SIZE}問必要）`);
  // 聞き取りチェック：会話・空欄・○×・意味の4形式のうち3つ以上を出題できること
  const listening = [Boolean(unit.dialogue), unit.practice.some((question) => filledSentence(question)), unit.compare.length > 0, patterns.length >= 3];
  if (!unit.dialogue) gaps.push(`${unit.id}: 聞き取りチェックの会話がない`);
  if (listening.filter(Boolean).length < 3) gaps.push(`${unit.id}: 聞き取りチェックの形式が${listening.filter(Boolean).length}種類（3種類必要）`);
  for (const id of unit.dialogue?.syllabus || []) if (!unit.syllabus.includes(id)) errors.push(`${unit.id}: 会話に単元の項目にない印 ${id}`);
  if (step && unit.dialogue) examplesByLevel[step.level].push(unit.dialogue.audio);
  for (const id of unit.syllabus) {
    const hasPattern = patterns.some((entry) => (entry.syllabus || []).includes(id));
    const hasDrill = drills.some((entry) => (entry.syllabus || []).includes(id));
    if (!hasPattern || !hasDrill) gaps.push(`${unit.id} ${id}「${items.get(id)?.category}」: ${[!hasPattern && "型カード", !hasDrill && "ドリル"].filter(Boolean).join("・")}がない`);
  }
}
for (const item of syllabus) {
  if (!item.terms || owner.get(item.id)?.startsWith("コラム")) continue;
  const text = examplesByLevel[item.level].join("");
  const missing = item.terms.filter((term) => !text.includes(term));
  if (missing.length) gaps.push(`${item.id}「${item.category}」: HSK${item.level}の例文に出てこない語 ${missing.join("・")}`);
}
for (const gap of gaps) errors.push(`網羅: ${gap}`);

const unassigned = [...items.keys()].filter((id) => !owner.has(id));
if (unassigned.length) errors.push(`どの単元にも割り当てられていない項目: ${unassigned.join("、")}`);

for (const id of OLD_GUIDE_IDS) if (!plan.redirects[id]) errors.push(`改修前のページ ${id} の転送先がない`);
const columnIds = new Set(plan.columns.map((column) => column.id));
for (const [from, to] of Object.entries(plan.redirects)) {
  const ok = to === "#grammar" || unitIds.has(to) || (to.startsWith("column:") && columnIds.has(to.slice(7)));
  if (!ok) errors.push(`転送先が実在しない: ${from} → ${to}`);
}

// まとめテスト（15問：聞く4・並べる3・選択と○×で残り）を、ステップごとに作れるだけの問題があること。
for (const step of plan.steps) {
  const stepUnits = plan.units.filter((unit) => unit.step === step.id);
  const practice = [...stepUnits.flatMap((unit) => unit.practice || []), ...(step.review?.practice || [])];
  const reorders = practice.filter((item) => item.kind === "reorder").length;
  const reading = practice.length - reorders + stepUnits.reduce((sum, unit) => sum + (unit.compare || []).length, 0) + (step.review?.compare || []).length;
  const dialogues = stepUnits.filter((unit) => unit.dialogue).length;
  if (reorders < 3) errors.push(`ステップ ${step.id}: まとめテストの語順問題が${reorders}問（3問必要）`);
  if (dialogues < 2) errors.push(`ステップ ${step.id}: まとめテストの会話が${dialogues}件（2件必要）`);
  if (reading < 8) errors.push(`ステップ ${step.id}: まとめテストの選択・○×問題が${reading}問（8問必要）`);
}

// 録音：文法の例文・聞き取り問題の文は、すべて録音済みであること（scripts/generate_sentence_audio.mjs で作る）。
const audioManifest = read("audio/manifest.json").items || {};
const recorded = grammarAudioTexts(plan, read("data/chinese/guides.json").guides || []);
const unrecorded = recorded.filter((item) => {
  const id = grammarAudioId(item.text);
  return audioManifest[id]?.text !== item.text || !fs.existsSync(path.join(root, "audio", "sentences", `${id}.m4a`));
});
if (unrecorded.length) errors.push(`録音のない文法の文が${unrecorded.length}件（HSK_SENTENCE_ONLY=grammar node scripts/generate_sentence_audio.mjs で作る）: ${unrecorded.slice(0, 3).map((item) => item.text).join(" / ")}`);

if (errors.length) {
  for (const error of errors) console.error(`エラー: ${error}`);
  console.error(`\n${errors.length}件のエラーがあります。`);
  process.exit(1);
}

for (const level of [2, 3]) {
  const list = syllabus.filter((item) => item.level === level);
  const count = (status) => list.filter((item) => item.current.status === status).length;
  const levelSteps = plan.steps.filter((step) => step.level === level);
  const unitCounts = levelSteps.map((step) => `${"★".repeat(step.stars)}${step.title} ${plan.units.filter((unit) => unit.step === step.id).length}`).join("・");
  console.log(`HSK${level}: 大綱${list.length}項目（改修前 扱い済み${count("full")}・一部${count("partial")}・未収録${count("none")}） / 単元 ${unitCounts}`);
}
const empty = plan.units.filter((unit) => !unit.sections?.length && !unit.practice?.length);
console.log(`単元${plan.units.length}・コラム${plan.columns.length}・旧URLの転送${Object.keys(plan.redirects).length}件`);
if (empty.length) console.log(`解説がまだない単元（準備中）: ${empty.length}件（${empty.map((unit) => unit.id).join("・")}）`);
console.log("検証に成功しました。");
