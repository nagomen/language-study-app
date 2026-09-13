#!/usr/bin/env node
// 文法ガイド（data/guides.json）と量詞ページ（data/measure-words.json）を検証する。
//   node scripts/check_guides.mjs
// 参照している単語IDが実在するか、量詞ページが measure ラベルの語を漏れなく扱っているか、
// 例文のピンインの音節数が漢字数と一致するか、練習問題の正解が選択肢に含まれるかを確認する。
// HSK1〜3の語彙にない漢字は警告として一覧表示する（エラーにはしない）。

import { readFile } from "node:fs/promises";

const VOWELS = "aāáǎàeēéěèiīíǐìoōóǒòuūúǔùüǖǘǚǜ";
const HANZI = /[一-鿿]/u;
const errors = [];
const warnings = [];

const load = async (file) => JSON.parse(await readFile(new URL(`../data/${file}`, import.meta.url), "utf8"));
const groups = await Promise.all([1, 2, 3].map((level) => load(`hsk${level}.json`)));
const words = new Map(groups.flatMap((group, index) => group.map((word) => [word.id, { ...word, level: index + 1 }])));
const vocabularyChars = new Set([...words.values()].flatMap((word) => [...word.hanzi]));
const tagData = await load("word-tags.json");
const measureIds = Object.entries(tagData.words).filter(([, tags]) => tags.includes("measure")).map(([id]) => id);

const countSyllables = (pinyin) => (pinyin.match(new RegExp(`[${VOWELS}]+`, "gi")) || []).length;
const countHanzi = (text) => [...text].filter((char) => HANZI.test(char)).length;

function checkPhrase(label, phrase) {
  if (!phrase?.cn || !phrase?.pinyin || !phrase?.ja) return errors.push(`${label}: cn・pinyin・ja のいずれかが未設定`);
  const erhua = (phrase.cn.match(/儿/g) || []).length;
  const hanziCount = countHanzi(phrase.cn);
  const syllables = countSyllables(phrase.pinyin);
  if (syllables > hanziCount || syllables < hanziCount - erhua) errors.push(`${label}: 漢字${hanziCount}字に対しピンインが${syllables}音節 → ${phrase.cn} / ${phrase.pinyin}`);
  const stray = [...phrase.cn].filter((char) => HANZI.test(char) && !vocabularyChars.has(char));
  if (stray.length) warnings.push(`${label}: HSK1〜3の語彙にない漢字 ${[...new Set(stray)].join("・")} → ${phrase.cn}`);
}

function checkWordId(label, id) {
  if (!words.has(id)) errors.push(`${label}: 単語ID ${id} が見つかりません`);
}

// --- 量詞ページ ---
const measure = await load("measure-words.json");
const groupIds = new Set(measure.groups.map((group) => group.id));
checkPhrase("量詞ページ: スロット例", { cn: measure.slot.cells.map((cell) => cell.value).join(""), pinyin: measure.slot.reading, ja: measure.slot.meaning });
measure.rules.forEach((rule, index) => {
  if (!rule.title || !rule.body) errors.push(`量詞ルール${index + 1}: title か body が未設定`);
  checkPhrase(`量詞ルール${index + 1}「${rule.title}」`, rule.example);
});

const seenItems = new Set();
for (const item of measure.items) {
  const word = words.get(item.wordId);
  const label = `量詞 ${item.wordId}${word ? ` ${word.hanzi}` : ""}`;
  checkWordId(label, item.wordId);
  if (seenItems.has(item.wordId)) errors.push(`${label}: 量詞が重複しています`);
  seenItems.add(item.wordId);
  if (!groupIds.has(item.group)) errors.push(`${label}: グループ ${item.group} は groups にありません`);
  if (!item.use || !item.tip) errors.push(`${label}: use か tip が未設定`);
  checkPhrase(label, item.phrase);
  // 量詞ページの例フレーズには、その量詞そのものが入っていてほしい。
  if (word && item.phrase?.cn && !item.phrase.cn.includes(word.hanzi)) errors.push(`${label}: 例フレーズに見出しの量詞が含まれていません → ${item.phrase.cn}`);
  (item.nouns || []).forEach((nounId) => checkWordId(`${label} の名詞`, nounId));
}
measure.quiz.forEach((question, index) => {
  const label = `量詞クイズ${index + 1}`;
  checkWordId(label, question.wordId);
  if (!question.prompt?.includes("＿")) errors.push(`${label}: 問題文に空欄（＿）がありません`);
  if (!question.subPrompt || !question.explanation) errors.push(`${label}: 訳か解説が未設定`);
  if ((question.choices || []).length < 3) errors.push(`${label}: 選択肢は3つ以上にしてください`);
  if (new Set(question.choices).size !== question.choices.length) errors.push(`${label}: 選択肢が重複しています`);
  if (!question.choices?.includes(question.correct)) errors.push(`${label}: 正解「${question.correct}」が選択肢にありません`);
  // 選択肢は量詞ページに載っている量詞から作る。
  const measureHanzi = new Set(measure.items.map((item) => words.get(item.wordId)?.hanzi).filter(Boolean));
  const unknown = (question.choices || []).filter((choice) => !measureHanzi.has(choice));
  if (unknown.length) errors.push(`${label}: 量詞ページにない選択肢 ${unknown.join("・")}`);
  if (words.get(question.wordId)?.hanzi !== question.correct) errors.push(`${label}: wordId と正解「${question.correct}」が一致しません`);
});

const missing = measureIds.filter((id) => !seenItems.has(id));
const extra = [...seenItems].filter((id) => !measureIds.includes(id));
if (missing.length) errors.push(`量詞ページに未掲載の量詞: ${missing.map((id) => `${id} ${words.get(id)?.hanzi || ""}`).join(", ")}`);
if (extra.length) errors.push(`measure ラベルが付いていない語が量詞ページにあります: ${extra.join(", ")}`);
for (const group of measure.groups) {
  if (!measure.items.some((item) => item.group === group.id)) errors.push(`量詞グループ「${group.label}」に項目がありません`);
}

// --- 文法ガイド ---
const { guides } = await load("guides.json");
const guideIds = new Set();
for (const guide of guides) {
  const label = `ガイド ${guide.id}`;
  if (guideIds.has(guide.id)) errors.push(`${label}: IDが重複しています`);
  guideIds.add(guide.id);
  if (!guide.title || !guide.summary) errors.push(`${label}: title か summary が未設定`);
  if (!guide.sections?.length) errors.push(`${label}: セクションがありません`);
  for (const section of guide.sections || []) {
    const sectionLabel = `${label} / ${section.heading}`;
    if (!section.heading) errors.push(`${label}: 見出しのないセクションがあります`);
    for (const pattern of section.patterns || []) {
      if (!pattern.formula) errors.push(`${sectionLabel}: formula が未設定`);
      checkPhrase(sectionLabel, pattern.example);
    }
    for (const entry of section.wordExamples || []) {
      checkWordId(sectionLabel, entry.wordId);
      checkPhrase(`${sectionLabel} ${entry.wordId}`, entry.phrase);
      const word = words.get(entry.wordId);
      if (word && !entry.phrase?.cn?.includes(word.hanzi)) errors.push(`${sectionLabel}: ${word.hanzi} が例文に含まれていません → ${entry.phrase?.cn}`);
    }
    for (const pair of section.compare || []) {
      if (!pair.wrong || !pair.right || !pair.note || !pair.meaning) errors.push(`${sectionLabel}: wrong・right・note・meaning のいずれかが未設定`);
    }
    for (const row of section.table?.rows || []) {
      if (row.length !== section.table.columns.length) errors.push(`${sectionLabel}: 表の列数が揃っていません → ${row.join(" / ")}`);
    }
  }

  if (!guide.practice?.length) errors.push(`${label}: 練習問題がありません`);
  guide.practice?.forEach((question, index) => {
    const questionLabel = `${label} 練習${index + 1}`;
    if (question.wordId) checkWordId(questionLabel, question.wordId);
    if (!question.explanation) errors.push(`${questionLabel}: 解説が未設定`);
    if (question.kind === "choice") {
      if (!question.prompt) errors.push(`${questionLabel}: 問題文が未設定`);
      if ((question.choices || []).length < 3) errors.push(`${questionLabel}: 選択肢は3つ以上にしてください`);
      if (new Set(question.choices).size !== question.choices.length) errors.push(`${questionLabel}: 選択肢が重複しています`);
      if (!question.choices?.includes(question.correct)) errors.push(`${questionLabel}: 正解「${question.correct}」が選択肢にありません`);
    } else if (question.kind === "reorder") {
      if (!question.meaning) errors.push(`${questionLabel}: 意味が未設定`);
      const answerChars = [...String(question.answer).replace(/[。！？]/g, "")].sort().join("");
      const tokenChars = [...(question.tokens || []).join("")].sort().join("");
      if (answerChars !== tokenChars) errors.push(`${questionLabel}: 語句を並べ替えても答えになりません → ${question.tokens?.join(" / ")} → ${question.answer}`);
      if (!/[。！？]$/.test(String(question.answer))) errors.push(`${questionLabel}: 答えが 。！？ で終わっていません → ${question.answer}`);
      if (question.slots && question.slots.length !== question.tokens.length) errors.push(`${questionLabel}: スロットの数（${question.slots.length}）が語句の数（${question.tokens.length}）と合いません`);
    } else {
      errors.push(`${questionLabel}: 未対応の kind「${question.kind}」`);
    }
    // 設問文は日本語で書くこともあるので、中国語部分（空欄付きの問題文・選択肢・答え）だけ字種を見る。
    const prompt = String(question.prompt || "").includes("＿") ? question.prompt : "";
    const text = `${prompt}${question.choices?.join("") || ""}${question.answer || ""}`;
    const stray = [...text].filter((char) => HANZI.test(char) && !vocabularyChars.has(char) && char !== "＿");
    if (stray.length) warnings.push(`${questionLabel}: HSK1〜3の語彙にない漢字 ${[...new Set(stray)].join("・")}`);
  });
}

for (const warning of warnings) console.warn(`警告: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`エラー: ${error}`);
  console.error(`\n${errors.length}件のエラーがあります。`);
  process.exit(1);
}
console.log(`量詞 ${measure.items.length}語 / ガイド ${guides.length}件（練習 ${guides.reduce((sum, guide) => sum + guide.practice.length, 0)}問）`);
console.log(warnings.length ? `検証に成功しました（警告 ${warnings.length}件）。` : "検証に成功しました。");
