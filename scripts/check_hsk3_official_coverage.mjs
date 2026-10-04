#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));
const errors = [];

const levels = [1, 2, 3].map((level) => read(`data/chinese/hsk${level}.json`));
const official = levels.flat();
const supplement = read("data/chinese/hsk-legacy-supplement.json");
const newWords = levels.map((words) => words.filter((word) => word.newIn2026));
const expectedNewWords = [86, 88, 256];
if (levels[0].length !== 300 || levels[1].length !== 200 || levels[2].length !== 500) errors.push(`公式語彙数が300/200/500ではありません`);
if (official.some((word, index) => word.officialNumber !== index + 1)) errors.push("公式語彙番号1〜1000が連続していません");
if (supplement.length !== 33) errors.push(`旧HSK補完語が33語ではありません: ${supplement.length}`);
for (const [index, words] of newWords.entries()) {
  if (words.length !== expectedNewWords[index]) errors.push(`HSK${index + 1}の2026年新出語: ${words.length}語（期待値${expectedNewWords[index]}語）`);
}

const hsk3 = levels[2];
const generic = hsk3.filter((word) => word.exampleKind === "glossary" || /^我今天学了“/.test(word.example || ""));
if (generic.length) errors.push(`HSK3に仮置き例文が${generic.length}語残っています`);
for (const word of hsk3) {
  if (!word.example || !word.examplePinyin || !word.exampleMeaning) errors.push(`${word.id} ${word.hanzi}: 例文・ピンイン・和訳が不足`);
  const ext = word.exampleKind === "context" ? "wav" : "m4a";
  for (const file of [`audio/${word.id}.${ext}`, `audio/sentences/example-${word.id}.${ext}`]) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || fs.statSync(absolute).size < 256) errors.push(`${word.id} ${word.hanzi}: 音声がありません ${file}`);
  }
}

const measure = read("data/chinese/measure-words.json");
const wordsById = new Map([...official, ...supplement].map((word) => [word.id, word]));
const measureHeads = new Set(measure.items.map((item) => item.hanzi || wordsById.get(item.wordId)?.hanzi));
const officialMeasures = "把 双 张 种 层 封 页 辆 节 所 班 段 头 句 公斤 斤 角 毛 刻 米 碗 盘 口 回 遍 声".split(" ");
const missingMeasures = officialMeasures.filter((head) => !measureHeads.has(head));
if (missingMeasures.length) errors.push(`公式HSK3の量詞・単位が不足: ${missingMeasures.join("、")}`);

const guides = read("data/chinese/guides.json").guides;
const grammarText = JSON.stringify(guides.filter((guide) => guide.id !== "de"));
const requiredGrammar = ["不 A 不 B", "不一会儿", "看来", "在我看来", "看起来", "看上去", "一般来说", "不怎么样", "一会儿 A，一会儿 B", "或者 A，或者 B", "先 A，再／然后 B", "在 …… 上／下／中", "動詞／形容詞 ＋ 什么", "两三", "个个", "得很／极了／坏了", "不比", "多／少／早／晚", "说下去", "写下来", "记住", "拿走", "穿上"];
const missingGrammar = requiredGrammar.filter((term) => !grammarText.includes(term));
if (missingGrammar.length) errors.push(`公式HSK3の文法項目が不足: ${missingGrammar.join("、")}`);
const hub = guides.find((guide) => guide.id === "hsk3-grammar");
if (!hub?.sections?.some((section) => section.links?.some((link) => link.guideId === "official-patterns"))) errors.push("HSK3文法ハブから追加パターンを開けません");

const mock = read("data/chinese/mock-hsk3-v3.json");
const expected = { listening: 30, reading: 30, writing: 10 };
for (const [skill, count] of Object.entries(expected)) {
  const actual = mock.questions.filter((question) => question.skill === skill).length;
  if (actual !== count) errors.push(`HSK3.0模試 ${skill}: ${actual}問（期待値${count}問）`);
}
if (mock.questions.filter((question) => question.kind === "compose").length !== 5) errors.push("図＋指定語の作文問題が5問ではありません");

if (errors.length) {
  for (const error of errors) console.error(`エラー: ${error}`);
  console.error(`\n公式カバレッジ監査に失敗（${errors.length}件）`);
  process.exit(1);
}
console.log(`公式カバレッジ監査に成功`);
console.log(`  語彙: 公式1,000語（300/200/500）＋旧版補完${supplement.length}語`);
console.log(`  2026年新出語: ${newWords.flat().length}語（${newWords.map((items) => items.length).join("/")}）`);
console.log(`  HSK3例文: ${hsk3.length}/500・仮文0・単語音声${hsk3.length}/500・例文音声${hsk3.length}/500`);
console.log(`  数量詞: 公式${officialMeasures.length}/${officialMeasures.length}用法（ページ全体${measure.items.length}項目）`);
console.log(`  文法: 追加監査${requiredGrammar.length}/${requiredGrammar.length}項目・ハブ接続済み`);
console.log(`  HSK3.0模試: 70問（聴解30・読解30・作文10）`);
