#!/usr/bin/env node
// 文法（コラムと単元）・分類別学習ページ・量詞ページのデータを検証する。
//   node scripts/check_guides.mjs
// 参照している単語IDが実在するか、量詞ページが measure ラベルの語を漏れなく扱っているか、
// 語彙表外の実用量詞に見出し・ピンイン・レベルがあるか、
// 例文のピンインの音節数が漢字数と一致するか、練習問題の正解が選択肢に含まれるかを確認する。
// HSK1〜3の語彙にない漢字は警告として一覧表示する（エラーにはしない）。

import { countHanzi, countPinyinSyllables, HANZI, loadChineseData } from "./chinese-data-utils.mjs";

const errors = [];
const warnings = [];

const groups = await Promise.all([1, 2, 3].map((level) => loadChineseData(`hsk${level}.json`)));
const supplement = await loadChineseData("hsk-legacy-supplement.json");
const words = new Map([
  ...groups.flatMap((group, index) => group.map((word) => [word.id, { ...word, level: index + 1 }])),
  ...supplement.map((word) => [word.id, word]),
]);
const vocabularyChars = new Set([...words.values()].flatMap((word) => [...word.hanzi]));
const tagData = await loadChineseData("word-tags.json");
const measureIds = Object.entries(tagData.words).filter(([, tags]) => tags.includes("measure")).map(([id]) => id);

function checkPhrase(label, phrase, { allowOutsideVocabulary = false } = {}) {
  if (!phrase?.cn || !phrase?.pinyin || !phrase?.ja) return errors.push(`${label}: cn・pinyin・ja のいずれかが未設定`);
  const erhua = (phrase.cn.match(/儿/g) || []).length;
  const hanziCount = countHanzi(phrase.cn);
  const syllables = countPinyinSyllables(phrase.pinyin);
  if (syllables > hanziCount || syllables < hanziCount - erhua) errors.push(`${label}: 漢字${hanziCount}字に対しピンインが${syllables}音節 → ${phrase.cn} / ${phrase.pinyin}`);
  const stray = [...phrase.cn].filter((char) => HANZI.test(char) && !vocabularyChars.has(char));
  if (!allowOutsideVocabulary && stray.length) warnings.push(`${label}: HSK1〜3の語彙にない漢字 ${[...new Set(stray)].join("・")} → ${phrase.cn}`);
}

function checkWordId(label, id) {
  if (!words.has(id)) errors.push(`${label}: 単語ID ${id} が見つかりません`);
}

// --- 量詞ページ ---
const measure = await loadChineseData("measure-words.json");
const groupIds = new Set(measure.groups.map((group) => group.id));
checkPhrase("量詞ページ: スロット例", { cn: measure.slot.cells.map((cell) => cell.value).join(""), pinyin: measure.slot.reading, ja: measure.slot.meaning });
measure.rules.forEach((rule, index) => {
  if (!rule.title || !rule.body) errors.push(`量詞ルール${index + 1}: title か body が未設定`);
  checkPhrase(`量詞ルール${index + 1}「${rule.title}」`, rule.example);
});
(measure.numberPatterns || []).forEach((pattern, index) => {
  const label = `数の型${index + 1}「${pattern.title || ""}」`;
  if (!pattern.title || !pattern.formula || !pattern.note || !pattern.level) errors.push(`${label}: title・formula・note・level のいずれかが未設定`);
  checkPhrase(label, pattern.example, { allowOutsideVocabulary: true });
});
(measure.comparisons || []).forEach((comparison, index) => {
  const label = `量詞比較${index + 1}「${comparison.title || ""}」`;
  if (!comparison.title || !comparison.tip || comparison.rows?.length < 2) errors.push(`${label}: title・tip・rows が不足しています`);
  for (const row of comparison.rows || []) if (!row.word || !row.pinyin || !row.use || !row.example) errors.push(`${label}: word・pinyin・use・example のいずれかが未設定`);
});

const seenItems = new Set();
const seenHanzi = new Set();
for (const item of measure.items) {
  const word = item.wordId ? words.get(item.wordId) : null;
  const hanzi = word?.hanzi || item.hanzi;
  const label = `量詞 ${item.wordId || item.hanzi || "(未設定)"}${word ? ` ${word.hanzi}` : ""}`;
  if (item.wordId) checkWordId(label, item.wordId);
  else if (!item.hanzi || !item.pinyin || ![1, 2, 3].includes(item.level)) errors.push(`${label}: 語彙表外の量詞に hanzi・pinyin・level(1〜3) が必要です`);
  if (seenHanzi.has(hanzi)) errors.push(`${label}: 見出し「${hanzi}」が重複しています`);
  seenHanzi.add(hanzi);
  if (item.wordId) seenItems.add(item.wordId);
  if (!groupIds.has(item.group)) errors.push(`${label}: グループ ${item.group} は groups にありません`);
  if (!item.use || !item.tip) errors.push(`${label}: use か tip が未設定`);
  checkPhrase(label, item.phrase, { allowOutsideVocabulary: !item.wordId });
  // 量詞ページの例フレーズには、その量詞そのものが入っていてほしい。
  if (hanzi && item.phrase?.cn && !item.phrase.cn.includes(hanzi)) errors.push(`${label}: 例フレーズに見出しの量詞が含まれていません → ${item.phrase.cn}`);
  (item.nouns || []).forEach((nounId) => checkWordId(`${label} の名詞`, nounId));
  for (const noun of item.nounExamples || []) if (!noun.hanzi || !noun.pinyin || !noun.meaning) errors.push(`${label}: nounExamples に hanzi・pinyin・meaning が必要です`);
}
measure.quiz.forEach((question, index) => {
  const label = `量詞クイズ${index + 1}`;
  if (question.wordId) checkWordId(label, question.wordId);
  if (!question.prompt?.includes("＿")) errors.push(`${label}: 問題文に空欄（＿）がありません`);
  if (!question.subPrompt || !question.explanation) errors.push(`${label}: 訳か解説が未設定`);
  if ((question.choices || []).length < 3) errors.push(`${label}: 選択肢は3つ以上にしてください`);
  if (new Set(question.choices).size !== question.choices.length) errors.push(`${label}: 選択肢が重複しています`);
  if (!question.choices?.includes(question.correct)) errors.push(`${label}: 正解「${question.correct}」が選択肢にありません`);
  if (question.wordId && words.get(question.wordId)?.hanzi !== question.correct) errors.push(`${label}: wordId と正解「${question.correct}」が一致しません`);
});

const missing = measureIds.filter((id) => !seenItems.has(id));
// 新大綱では「日・天・時」のように名詞としても使う語まで量詞に分類される。
// 特設ページは実際に数え分ける語を優先するため、未掲載は警告として追跡する。
if (missing.length) warnings.push(`量詞ページに未掲載の量詞用法: ${missing.map((id) => `${id} ${words.get(id)?.hanzi || ""}`).join(", ")}`);
for (const group of measure.groups) {
  if (!measure.items.some((item) => item.group === group.id)) errors.push(`量詞グループ「${group.label}」に項目がありません`);
}

// --- 分類別学習ページ ---
const { guides: categoryGuides } = await loadChineseData("category-guides.json");
const categoryIds = new Set(tagData.categories.map((category) => category.id));
for (const [categoryId, guide] of Object.entries(categoryGuides || {})) {
  const label = `分類別学習 ${categoryId}`;
  if (!categoryIds.has(categoryId)) errors.push(`${label}: 分類IDが word-tags.json にありません`);
  if (!guide.title || !guide.summary) errors.push(`${label}: title か summary が未設定`);
  if (!guide.groups?.length) errors.push(`${label}: 単語グループがありません`);
  const groupedIds = guide.groups?.flatMap((group) => group.wordIds || []) || [];
  const duplicateIds = groupedIds.filter((id, index) => groupedIds.indexOf(id) !== index);
  if (duplicateIds.length) errors.push(`${label}: 単語グループ内でIDが重複しています → ${[...new Set(duplicateIds)].join(", ")}`);
  const taggedIds = Object.entries(tagData.words).filter(([, tags]) => tags.includes(categoryId)).map(([id]) => id);
  const missingFromGuide = taggedIds.filter((id) => !groupedIds.includes(id));
  if (missingFromGuide.length) errors.push(`${label}: 分類タグはあるのに学習グループにない単語があります → ${missingFromGuide.join(", ")}`);
  for (const group of guide.groups || []) {
    if (!group.title || !group.description || !group.wordIds?.length) errors.push(`${label}: title・description・wordIds が不足した単語グループがあります`);
    for (const id of group.wordIds || []) {
      checkWordId(`${label} / ${group.title}`, id);
      if (!tagData.words[id]?.includes(categoryId)) errors.push(`${label}: ${id} に分類タグ「${categoryId}」がありません`);
    }
  }
  for (const [index, pattern] of (guide.patterns || []).entries()) {
    const patternLabel = `${label} 文型${index + 1}`;
    if (!pattern.label || !pattern.formula || !pattern.tip) errors.push(`${patternLabel}: label・formula・tip のいずれかが未設定`);
    checkPhrase(patternLabel, pattern.example);
  }
  for (const [index, comparison] of (guide.comparisons || []).entries()) {
    const comparisonLabel = `${label} 比較${index + 1}`;
    if (!comparison.title || !comparison.tip || comparison.rows?.length < 2) errors.push(`${comparisonLabel}: title・tip・rows が不足しています`);
    for (const row of comparison.rows || []) {
      checkWordId(comparisonLabel, row.wordId);
      if (!row.use || !row.example) errors.push(`${comparisonLabel}: use か example が未設定`);
    }
  }
  if (!guide.dialogue?.title || !guide.dialogue?.lines?.length) errors.push(`${label}: 会話が未設定`);
  for (const [index, line] of (guide.dialogue?.lines || []).entries()) {
    if (!line.speaker) errors.push(`${label} 会話${index + 1}: speaker が未設定`);
    checkPhrase(`${label} 会話${index + 1}`, line);
  }
  if (!guide.routine?.length) errors.push(`${label}: 生活ルーティンが未設定`);
  for (const [index, item] of (guide.routine || []).entries()) {
    if (!item.step || !item.title) errors.push(`${label} ルーティン${index + 1}: step か title が未設定`);
    checkPhrase(`${label} ルーティン${index + 1}`, item);
  }
}

// --- 文法：解説の節・よくある間違い・ドリル（コラムのページと単元で共通の基準） ---
function checkSections(label, sections) {
  for (const section of sections || []) {
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
    checkCompare(sectionLabel, section.compare);
    for (const row of section.table?.rows || []) {
      if (row.length !== section.table.columns.length) errors.push(`${sectionLabel}: 表の列数が揃っていません → ${row.join(" / ")}`);
    }
  }
}

function checkCompare(label, pairs) {
  for (const pair of pairs || []) {
    if (!pair.wrong || !pair.right || !pair.note || !pair.meaning) errors.push(`${label}: wrong・right・note・meaning のいずれかが未設定`);
    // ○×ドリルでは right／wrong をそのまま中国語の文として出すので、日本語（かな）が混ざっていてはいけない。
    if (/[ぁ-んァ-ン]/.test(`${pair.wrong || ""}${pair.right || ""}`)) errors.push(`${label}: 間違いの文・正しい文に日本語が混ざっています → ${pair.wrong} / ${pair.right}`);
  }
  // 同じ正しい文に対して別々の誤り方を並べるのはよいが、誤りの文まで同じものは重複。
  const keys = (pairs || []).map((pair) => `${pair.wrong} → ${pair.right}`);
  const duplicated = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicated.length) errors.push(`${label}: よくある間違いが重複しています → ${[...new Set(duplicated)].join(" / ")}`);
}

function checkPractice(label, practice) {
  practice?.forEach((question, index) => {
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
      // 採点は句読点を無視するので（js/chinese/util.js の normalizeAnswer）、検証もそろえる。
      const dropMarks = (text) => String(text).replace(/[\s。！？，、,.?!]/g, "");
      const answerChars = [...dropMarks(question.answer)].sort().join("");
      const tokenChars = [...dropMarks((question.tokens || []).join(""))].sort().join("");
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

// コラム（了・的得地・知る考える覚える）
const { guides } = await loadChineseData("guides.json");
const guideIds = new Set();
for (const guide of guides) {
  const label = `コラム ${guide.id}`;
  if (guideIds.has(guide.id)) errors.push(`${label}: IDが重複しています`);
  guideIds.add(guide.id);
  if (!guide.title || !guide.summary) errors.push(`${label}: title か summary が未設定`);
  if (!guide.sections?.length) errors.push(`${label}: セクションがありません`);
  if (!guide.practice?.length) errors.push(`${label}: 練習問題がありません`);
  checkSections(label, guide.sections);
  checkPractice(label, guide.practice);
}

// 文法の単元（data/chinese/grammar.json）。構成（大綱との対応など）は scripts/check_grammar.mjs で確認する。
const grammar = await loadChineseData("grammar.json");
checkSections("文法トップ", grammar.top?.sections);
for (const step of grammar.steps) {
  checkCompare(`ステップ ${step.id} の復習`, step.review?.compare);
  checkPractice(`ステップ ${step.id} の復習`, step.review?.practice);
}
for (const unit of grammar.units) {
  const label = `単元 ${unit.id}`;
  checkSections(label, unit.sections);
  checkCompare(label, unit.compare);
  checkPractice(label, unit.practice);
}
const unitPractice = grammar.units.reduce((sum, unit) => sum + unit.practice.length, 0);

for (const warning of warnings) console.warn(`警告: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`エラー: ${error}`);
  console.error(`\n${errors.length}件のエラーがあります。`);
  process.exit(1);
}
console.log(`数量詞 ${measure.items.length}語・数の型 ${measure.numberPatterns?.length || 0}件・比較 ${measure.comparisons?.length || 0}件 / 分類別学習 ${Object.keys(categoryGuides || {}).length}件 / コラム ${guides.length}件（練習 ${guides.reduce((sum, guide) => sum + guide.practice.length, 0)}問） / 文法の単元 ${grammar.units.length}件（練習 ${unitPractice}問）`);
console.log(warnings.length ? `検証に成功しました（警告 ${warnings.length}件）。` : "検証に成功しました。");
