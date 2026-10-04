#!/usr/bin/env node
// HSK単語データの例文を検証する。
//   node scripts/check_hsk_examples.mjs
// 例文・ピンイン・和訳が揃っているか、例文に見出し語が含まれるか、
// ピンインの音節数が漢字数と一致するか、例文が重複していないかを確認する。
// HSK1〜3の語彙に無い漢字は警告として一覧表示する（エラーにはしない）。

import { countHanzi, countPinyinSyllables, HANZI, loadChineseData, PINYIN_VOWELS } from "./chinese-data-utils.mjs";

const LEVELS = [1, 2, 3];
const SENTENCE_END = { "。": ".", "？": "?", "！": "!" };

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
  if (duplicate) warnings.push(`${label}: 例文が ${duplicate} と重複 → ${example}`);
  else seenExamples.set(example, label);

  const outside = [...new Set([...example].filter((char) => HANZI.test(char) && !vocabularyChars.has(char)))];
  if (outside.length) warnings.push(`${label}: HSK1〜3の語彙にない漢字 ${outside.join("")} → ${example}`);
}

const withExample = words.filter((word) => word.example && word.exampleMeaning).length;
console.log(`単語 ${words.length}語（2026年版公式1,000語: HSK1 ${groups[0].length} / HSK2 ${groups[1].length} / HSK3 ${groups[2].length}、旧版補完 ${supplement.length}語）`);
console.log(`例文あり ${withExample}語 / 例文なし ${words.length - withExample}語`);

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
