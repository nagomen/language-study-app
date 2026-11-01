#!/usr/bin/env node
// 文法セクション改修の単元構成を、公式大綱の項目一覧と突き合わせて検証する。
//   node scripts/check_grammar_plan.mjs
// 大綱の全項目（HSK2・HSK3）がちょうど1つの単元またはコラムに割り当てられているか、
// 単元の級とステップの級が一致するか、1単元が5項目以内か、先に学ぶ単元（requires）が前に並んでいるか、
// 改修前のページの内容を移す先がすべて決まっているか、旧URLの転送先が実在するかを確認する。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

const errors = [];
const syllabus = read("data/source/grammar/hsk-grammar-syllabus.json").items;
const plan = read("data/source/grammar/unit-plan.json");
const guides = read("data/chinese/guides.json").guides;

const items = new Map();
for (const item of syllabus) {
  if (items.has(item.id)) errors.push(`大綱の項目IDが重複: ${item.id}`);
  items.set(item.id, item);
  if (![2, 3].includes(item.level)) errors.push(`${item.id}: 級は2か3`);
  if (!item.source || !item.ja) errors.push(`${item.id}: source・ja のいずれかが未設定`);
  if (!["full", "partial", "none"].includes(item.current?.status)) errors.push(`${item.id}: current.status が不正`);
}

const steps = new Map(plan.steps.map((step) => [step.id, step]));
const guideIds = new Set([...guides.map((guide) => guide.id), "measure"]);
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
  for (const page of unit.from || []) if (!guideIds.has(page)) errors.push(`${unit.id}: 移行元のページ ${page} がない`);
}
for (const column of plan.columns) {
  for (const id of column.syllabus || []) assign(id, `コラム:${column.id}`);
  for (const page of column.from || []) if (!guideIds.has(page)) errors.push(`コラム ${column.id}: 移行元のページ ${page} がない`);
}

const unassigned = [...items.keys()].filter((id) => !owner.has(id));
if (unassigned.length) errors.push(`どの単元にも割り当てられていない項目: ${unassigned.join("、")}`);

// 改修前のページは、すべて移行先か転送先が決まっていること（内容を置き去りにしない）。
const moved = new Set([...plan.units, ...plan.columns, plan.top || {}].flatMap((entry) => entry.from || []));
for (const guide of guides) {
  if (!plan.redirects[guide.id]) errors.push(`改修前のページ ${guide.id} の転送先がない`);
  if (!moved.has(guide.id)) errors.push(`改修前のページ ${guide.id} の内容の移し先がない`);
}
const columnIds = new Set(plan.columns.map((column) => column.id));
for (const [from, to] of Object.entries(plan.redirects)) {
  const ok = to === "#grammar" || unitIds.has(to) || (to.startsWith("column:") && columnIds.has(to.slice(7)));
  if (!ok) errors.push(`転送先が実在しない: ${from} → ${to}`);
}

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
console.log(`単元${plan.units.length}・コラム${plan.columns.length}・旧URLの転送${Object.keys(plan.redirects).length}件`);
console.log("検証に成功しました。");
