#!/usr/bin/env node
// 「似た語の使い分け」の単語ID、掲載漏れ、例文、10問テストを検証する。
import { countHanzi, countPinyinSyllables, loadChineseData } from "./chinese-data-utils.mjs";

const errors = [];
const groups = await Promise.all([1, 2, 3].map((level) => loadChineseData(`hsk${level}.json`)));
const supplement = await loadChineseData("hsk-legacy-supplement.json");
const words = new Map([...groups.flat(), ...supplement].map((word) => [word.id, word]));
const { groups: comparisons } = await loadChineseData("word-comparisons.json");
const seenGroups = new Set();

function checkPhrase(label, phrase) {
  if (!phrase?.cn || !phrase?.pinyin || !phrase?.ja) return errors.push(`${label}: cn・pinyin・ja が必要です`);
  const hanzi = countHanzi(phrase.cn);
  const erhua = (phrase.cn.match(/儿/g) || []).length;
  const syllables = countPinyinSyllables(phrase.pinyin);
  if (syllables > hanzi || syllables < hanzi - erhua) errors.push(`${label}: 漢字${hanzi}字に対しピンイン${syllables}音節 → ${phrase.cn} / ${phrase.pinyin}`);
}

for (const group of comparisons) {
  const label = `使い分け ${group.id}`;
  if (seenGroups.has(group.id)) errors.push(`${label}: IDが重複しています`);
  seenGroups.add(group.id);
  if (!group.title || !group.summary || !group.mark || !group.wordIds?.length) errors.push(`${label}: 基本情報が不足しています`);
  const duplicateIds = group.wordIds.filter((id, index) => group.wordIds.indexOf(id) !== index);
  if (duplicateIds.length) errors.push(`${label}: wordIdsが重複しています → ${[...new Set(duplicateIds)].join(", ")}`);
  for (const id of group.wordIds) if (!words.has(id)) errors.push(`${label}: 単語ID ${id} が見つかりません`);
  const rowIds = (group.sets || []).flatMap((set) => (set.rows || []).map((row) => row.wordId));
  const missingRows = group.wordIds.filter((id) => !rowIds.includes(id));
  const extraRows = rowIds.filter((id) => !group.wordIds.includes(id));
  if (missingRows.length) errors.push(`${label}: 比較カードに未掲載 → ${missingRows.join(", ")}`);
  if (extraRows.length) errors.push(`${label}: wordIdsにない比較カード → ${extraRows.join(", ")}`);
  if (new Set(rowIds).size !== rowIds.length) errors.push(`${label}: 比較カードの単語IDが重複しています`);
  for (const set of group.sets || []) {
    if (!set.title || !set.summary || !set.tip || set.rows?.length < 2) errors.push(`${label}: 比較セットの情報が不足しています`);
    for (const row of set.rows || []) {
      if (!row.core || !row.cue || !row.pattern) errors.push(`${label} / ${set.title}: core・cue・pattern が必要です`);
      checkPhrase(`${label} / ${set.title} / ${row.wordId}`, row.example);
    }
  }
  if (group.quiz?.length !== 10) errors.push(`${label}: テストは10問必要です（現在${group.quiz?.length || 0}問）`);
  for (const [index, question] of (group.quiz || []).entries()) {
    const qLabel = `${label} テスト${index + 1}`;
    if (!question.prompt?.includes("＿") || !question.subPrompt || !question.explanation) errors.push(`${qLabel}: 空欄付きprompt・subPrompt・explanation が必要です`);
    if (question.choices?.length !== 3 || new Set(question.choices).size !== 3) errors.push(`${qLabel}: 重複しない選択肢が3つ必要です`);
    if (!question.choices?.includes(question.correct)) errors.push(`${qLabel}: 正解が選択肢にありません`);
    const groupHanzi = group.wordIds.map((id) => words.get(id)?.hanzi);
    for (const choice of question.choices || []) if (!groupHanzi.includes(choice)) errors.push(`${qLabel}: 選択肢「${choice}」はこの章の収録語ではありません`);
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`エラー: ${error}`));
  console.error(`\n${errors.length}件のエラーがあります。`);
  process.exit(1);
}
console.log(`使い分け ${comparisons.length}章・${comparisons.reduce((sum, group) => sum + group.wordIds.length, 0)}語・${comparisons.reduce((sum, group) => sum + group.quiz.length, 0)}問を検証しました。`);
