#!/usr/bin/env node
// HSK単語データの例文を検証する。
//   node scripts/check_hsk_examples.mjs
// 例文・ピンイン・和訳が揃っているか、例文に見出し語が含まれるか、
// ピンインの音節数が漢字数と一致するか、例文が重複していないかを確認する。
// HSK1〜3の語彙に無い漢字は警告として一覧表示する（エラーにはしない）。

import { countHanzi, countPinyinSyllables, HANZI, loadChineseData, PINYIN_VOWELS } from "./chinese-data-utils.mjs";

const LEVELS = [1, 2, 3];
const SENTENCE_END = { "。": ".", "？": "?", "！": "!" };
const FORBIDDEN_NEW_EXAMPLES = [
  /^我今天学了“/,
  /^我第一次听说/,
  /^我昨天买了/,
  /^他已经.*了。$/,
  /^我们明天要/,
  /^请你先/,
  /^他是一位/,
  /^我们.*再见。$/,
  /^这件事很/,
  /^我们今天去/,
];

const errors = [];
const warnings = [];

const groups = await Promise.all(LEVELS.map((level) => loadChineseData(`hsk${level}.json`)));
const officialWords = groups.flatMap((group, index) => group.map((word) => ({ ...word, level: LEVELS[index] })));
const supplement = await loadChineseData("hsk-legacy-supplement.json");
const words = [...officialWords, ...supplement];

const vocabularyChars = new Set(words.flatMap((word) => [...word.hanzi]));
const seenExamples = new Map();

for (const word of words) {
  const label = `${word.id} ${word.hanzi}`;
  const { example, examplePinyin, exampleMeaning } = word;
  if (!example || !examplePinyin || !exampleMeaning) {
    errors.push(`${label}: 例文・ピンイン・和訳のいずれかが未設定`);
    continue;
  }
  if (word.newIn2026) {
    if (!["authored", "context"].includes(word.exampleKind)) errors.push(`${label}: 新出語の例文が個別作成ではありません`);
    if (FORBIDDEN_NEW_EXAMPLES.some((pattern) => pattern.test(example))) errors.push(`${label}: 雑な定型例文が残っています → ${example}`);
  }
  // 見出し語が「哪（哪儿）」のように別形を持つ場合は、どちらか一方が含まれていればよい。
  const variants = [word.hanzi.replace(/（[^）]*）/g, ""), ...[...word.hanzi.matchAll(/（([^）]*)）/g)].map((match) => match[1])].filter(Boolean);
  if (!variants.some((variant) => example.includes(variant))) errors.push(`${label}: 例文に見出し語が含まれていない → ${example}`);

  const lastChar = example.slice(-1);
  const expectedTail = SENTENCE_END[lastChar];
  if (!expectedTail) errors.push(`${label}: 例文が 。？！ で終わっていない → ${example}`);
  else if (!examplePinyin.endsWith(expectedTail)) errors.push(`${label}: ピンインの文末が例文と一致しない → ${examplePinyin}`);

  const erhua = (example.match(/儿/g) || []).length;
  const hanziCount = countHanzi(example);
  const syllables = countPinyinSyllables(examplePinyin);
  if (syllables > hanziCount || syllables < hanziCount - erhua) {
    errors.push(`${label}: 漢字${hanziCount}字に対しピンインが${syllables}音節 → ${example} / ${examplePinyin}`);
  }

  const strayPinyin = examplePinyin.replace(new RegExp(`[a-z${PINYIN_VOWELS}ńňǹ'’,.?! “”-]`, "gi"), "");
  if (strayPinyin) errors.push(`${label}: ピンインに使えない文字 "${strayPinyin}" → ${examplePinyin}`);

  if (!/[。！？]$/.test(exampleMeaning)) errors.push(`${label}: 和訳が 。！？ で終わっていない → ${exampleMeaning}`);

  // 同じ文が2語の例文になっていても誤りではないため、重複は警告に留める。
  const duplicate = seenExamples.get(example);
  if (duplicate && (word.newIn2026 || duplicate.newIn2026)) errors.push(`${label}: 新出語の例文が ${duplicate.label} と重複 → ${example}`);
  else if (duplicate) warnings.push(`${label}: 例文が ${duplicate.label} と重複 → ${example}`);
  else seenExamples.set(example, { label, newIn2026: Boolean(word.newIn2026) });

  const outside = [...new Set([...example].filter((char) => HANZI.test(char) && !vocabularyChars.has(char)))];
  if (outside.length) warnings.push(`${label}: HSK1〜3の語彙にない漢字 ${outside.join("")} → ${example}`);
}

const withExample = words.filter((word) => word.example && word.exampleMeaning).length;
const newWords = officialWords.filter((word) => word.newIn2026);
console.log(`単語 ${words.length}語（2026年版公式1,000語: HSK1 ${groups[0].length} / HSK2 ${groups[1].length} / HSK3 ${groups[2].length}、旧版補完 ${supplement.length}語）`);
console.log(`例文あり ${withExample}語 / 例文なし ${words.length - withExample}語`);
console.log(`2026年新出語の個別例文 ${newWords.length}語 / 定型仮文 ${newWords.filter((word) => FORBIDDEN_NEW_EXAMPLES.some((pattern) => pattern.test(word.example || ""))).length}語`);

if (warnings.length) {
  console.log(`\n警告 ${warnings.length}件`);
  warnings.forEach((warning) => console.log(`  ${warning}`));
}

if (errors.length) {
  console.error(`\nエラー ${errors.length}件`);
  errors.forEach((error) => console.error(`  ${error}`));
  process.exit(1);
}

console.log("\n検証に成功しました。");
