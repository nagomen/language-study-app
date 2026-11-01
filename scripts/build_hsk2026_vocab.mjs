#!/usr/bin/env node
// 2025-11公開・2026-07施行の公式HSK語彙大綱から、HSK1〜3の1,000語を生成する。
// 既存の見出しと一致する語はIDと例文を引き継ぎ、学習履歴と収録音声をできるだけ保つ。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "data", "source", "hsk2026");
const vocabDir = path.join(root, "data", "chinese");
const tagDir = path.join(root, "data", "source", "word-tags");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
const cleanPinyin = (value) => String(value || "").toLowerCase().replace(/[\s'’·-]/g, "").replace(/u:/g, "ü");
const variants = (hanzi) => {
  const text = String(hanzi || "");
  return [...new Set([
    text.replace(/（[^）]*）/g, ""),
    ...[...text.matchAll(/（([^）]*)）/g)].map((match) => match[1]),
  ].map((value) => value.replace(/\s/g, "")).filter(Boolean))];
};

const readExampleRows = (file) => fs.readFileSync(path.join(sourceDir, file), "utf8")
  .split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#"))
  .map((line) => {
    const [id, example, exampleMeaning, ...extra] = line.split("|");
    if (!id || !example || !exampleMeaning || extra.length) throw new Error(`${file}: 例文行の形式が不正です → ${line}`);
    return [id, { example, exampleMeaning }];
  });

const existingGroups = [1, 2, 3].map((level) => readJson(path.join(vocabDir, `hsk${level}.json`)));
const existingSupplement = readJson(path.join(vocabDir, "hsk-legacy-supplement.json"));
const officialSources = Object.fromEntries([1, 2, 3].map((level) => [level, readJson(path.join(sourceDir, `hsk-${level}.json`))]));
const extraPinyin = { 首: "shǒu", 林: "lín", 王: "wáng", 同: "tóng", 辆: "liàng", 所: "suǒ", 台: "tái", 群: "qún", 层: "céng", 套: "tào", 座: "zuò", 张: "zhāng", 瓶: "píng", 支: "zhī", 碗: "wǎn", 间: "jiān", 名: "míng", 封: "fēng", 件: "jiàn", 只: "zhī", 把: "bǎ", 双: "shuāng", 次: "cì", 遍: "biàn" };
extraPinyin.儿 = "r";
Object.assign(extraPinyin, {
  窗户: "chuānghu", 护照: "hùzhào", 历史: "lìshǐ", 当地: "dāngdì", 初学者: "chūxuézhě", 按钮: "ànniǔ",
  地区: "dìqū", 文化: "wénhuà", 植物园: "zhíwùyuán", 认可: "rènkě", 垃圾: "lājī", 阳光: "yángguāng", 公里: "gōnglǐ",
  操场: "cāochǎng", 比赛: "bǐsài", 分钟: "fēnzhōng", 会议室: "huìyìshì", 经理: "jīnglǐ", 电梯: "diàntī",
  照片: "zhàopiàn", 游戏: "yóuxì", 同事: "tóngshì", 城市: "chéngshì", 衬衫: "chènshān", 答案: "dá'àn", 耳机: "ěrjī", 偶尔: "ǒu'ěr", 方便面: "fāngbiànmiàn", 毕业: "bìyè", 院子: "yuànzi", 勺子: "sháozi", 感谢: "gǎnxiè", 使用: "shǐyòng", 人数: "rénshù", 成为: "chéngwéi", 垃圾: "lājī",
  按: "àn", 付: "fù", 甜: "tián", 换: "huàn", 倒: "dào", 杯: "bēi", 部: "bù", 订: "dìng", 房: "fáng", 定: "dìng", 乱: "luàn", 丢: "diū", 升: "shēng", 吹: "chuī", 组: "zǔ", 场: "chǎng", 戴: "dài", 清: "qīng", 幅: "fú", 养: "yǎng", 鸡: "jī", 步: "bù", 停: "tíng", 转: "zhuǎn", 汤: "tāng", 美: "měi", 满: "mǎn", 但: "dàn", 没: "méi", 祝: "zhù", 重: "zhòng", 谁: "shéi", 垃: "lā", 圾: "jī",
});
const pinyinEntries = [
  ...Object.entries(extraPinyin).map(([hanzi, pinyin]) => ({ hanzi, pinyin })),
  ...Object.values(officialSources).flatMap((source) => source.terms).map((term) => ({ hanzi: term.simplified, pinyin: term.pinyin })),
  ...existingGroups.flat(),
  ...existingSupplement,
].flatMap((term) => variants(term.hanzi).map((hanzi) => [hanzi, term.pinyin]))
  .sort((left, right) => right[0].length - left[0].length);
const punctuation = { "，": ",", "。": ".", "？": "?", "！": "!", "、": "," };

function sentencePinyin(sentence) {
  const tokens = [];
  for (let index = 0; index < sentence.length;) {
    const char = sentence[index];
    if (punctuation[char]) { tokens.push(punctuation[char]); index += 1; continue; }
    const match = pinyinEntries.find(([hanzi]) => sentence.startsWith(hanzi, index));
    if (!match) throw new Error(`ピンインに変換できない字があります: ${sentence.slice(index)}（${sentence}）`);
    tokens.push(match[1]);
    index += match[0].length;
  }
  const text = tokens.join(" ").replace(/\s+([,.?!])/g, "$1");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const existing = existingGroups.flatMap((group, index) => group.map((word) => ({ ...word, previousLevel: index + 1 })));
const tagData = readJson(path.join(vocabDir, "word-tags.json"));
const curatedExamples = readJson(path.join(sourceDir, "examples-hsk3.json"));
const authoredHsk12 = readExampleRows("examples-new-hsk1-2.tsv");
const authoredHsk3 = readExampleRows("examples-new-hsk3.tsv");
const authoredRows = [...authoredHsk12, ...authoredHsk3];
const authoredExamples = new Map(authoredRows);
if (authoredHsk12.length !== 174 || authoredHsk3.length !== 177 || authoredExamples.size !== authoredRows.length) {
  throw new Error(`個別例文ソースが不正です: HSK1〜2 ${authoredHsk12.length}/174、HSK3 ${authoredHsk3.length}/177、重複 ${authoredRows.length - authoredExamples.size}`);
}
const usedIds = new Set();

function findExisting(term) {
  const byNumber = existing.find((word) => !usedIds.has(word.id) && word.officialNumber === term.number);
  if (byNumber) return byNumber;
  const exact = existing.find((word) => !usedIds.has(word.id)
    && variants(word.hanzi).includes(term.simplified)
    && cleanPinyin(word.pinyin) === cleanPinyin(term.pinyin));
  if (exact) return exact;
  return existing.find((word) => !usedIds.has(word.id) && variants(word.hanzi).includes(term.simplified)) || null;
}

function inferredTags(term, inherited = []) {
  const tags = new Set(inherited);
  const pos = term.partOfSpeech || "";
  if (pos.includes("数")) tags.add("number");
  if (pos.includes("量")) tags.add("measure");
  if (pos.includes("代")) tags.add(/[哪谁什么怎么几多少]/.test(term.simplified) ? "question" : "pronoun");
  if (pos.includes("动")) tags.add("verb");
  if (pos.includes("形")) tags.add("adjective");
  if (pos.includes("副")) tags.add("adverb");
  if (pos.includes("介")) tags.add("preposition");
  if (pos.includes("连")) tags.add("conjunction");
  if (/[助叹缀]/.test(pos)) tags.add("particle");
  // 名詞など、既存の品詞分類に専用ラベルがない語の安全な受け皿。
  if (!tags.size) tags.add("daily");
  return [...tags];
}

const outputGroups = { 1: [], 2: [], 3: [] };
const tagRows = { 1: [], 2: [], 3: [] };
const expectedCounts = { 1: 300, 2: 200, 3: 500 };
let reused = 0;
let added = 0;

for (const level of [1, 2, 3]) {
  const source = officialSources[level];
  const meanings = readJson(path.join(sourceDir, `meanings-ja-${level}.json`));
  if (source.terms.length !== expectedCounts[level]) {
    throw new Error(`HSK${level}の公式語数が不正です: ${source.terms.length}語（期待値 ${expectedCounts[level]}語）`);
  }
  for (const term of source.terms) {
    const previous = findExisting(term);
    // 再生成後のJSONを入力にしても、新出語の印が消えないようIDでも判定する。
    const newIn2026 = !previous || previous.id.startsWith("hsk2026-");
    if (previous) usedIds.add(previous.id);
    if (newIn2026) added += 1; else reused += 1;
    const id = previous?.id || `hsk2026-${String(term.number).padStart(4, "0")}`;
    const fallbackExample = {
      example: `我今天学了“${term.simplified}”这个词。`,
      examplePinyin: `Wǒ jīntiān xué le “${term.pinyin}” zhège cí.`,
      exampleMeaning: `今日は「${term.simplified}」という単語を学びました。`,
      exampleKind: "glossary",
    };
    const authoredExample = authoredExamples.get(id);
    const curatedExample = authoredExample ? { ...authoredExample, examplePinyin: sentencePinyin(authoredExample.example) } : curatedExamples[id];
    const word = {
      id,
      hanzi: term.simplified,
      pinyin: term.pinyin,
      meaning: meanings[String(term.number)],
      officialNumber: term.number,
      syllabus: "HSK3.0-2026",
      partOfSpeech: term.partOfSpeech || "",
      ...(newIn2026 ? { newIn2026: true } : {}),
      ...(curatedExample ? {
        ...curatedExample,
        exampleKind: level === 3 ? "context" : "authored",
        ...(authoredExample && level < 3 ? { exampleAudio: "browser" } : {}),
      } : previous?.example ? {
        example: previous.example,
        examplePinyin: previous.examplePinyin,
        exampleMeaning: previous.exampleMeaning,
        ...(previous.exampleKind ? { exampleKind: previous.exampleKind } : {}),
      } : fallbackExample),
    };
    if (!word.meaning) throw new Error(`日本語訳がありません: ${term.number} ${term.simplified}`);
    const tags = inferredTags(term, previous ? tagData.words[previous.id] || [] : []);
    outputGroups[level].push(word);
    tagRows[level].push(`${id}|${term.simplified}|${tags.join(",")}`);
  }
}

const allOutput = Object.values(outputGroups).flat();
const expectedNumbers = Array.from({ length: 1000 }, (_, index) => index + 1);
const actualNumbers = allOutput.map((word) => word.officialNumber);
if (actualNumbers.some((number, index) => number !== expectedNumbers[index])) {
  const index = actualNumbers.findIndex((number, offset) => number !== expectedNumbers[offset]);
  throw new Error(`公式番号が連続していません: 位置${index + 1}に${actualNumbers[index]}があります`);
}
const finalIds = allOutput.map((word) => word.id);
if (new Set(finalIds).size !== finalIds.length) {
  throw new Error("生成後の単語IDに重複があります");
}
const unknownExampleIds = authoredRows.map(([id]) => id).filter((id) => !finalIds.includes(id));
if (unknownExampleIds.length) throw new Error(`個別例文の単語IDが存在しません: ${unknownExampleIds.join(", ")}`);

const supplementRows = fs.readFileSync(path.join(sourceDir, "legacy-hsk2-supplement.tsv"), "utf8")
  .split(/\r?\n/)
  .map((line) => line.trim())
  .filter((line) => line && !line.startsWith("#"));
const supplement = supplementRows.map((line, index) => {
  const [id, levelText, hanzi, pinyin, meaning, tagText, example, examplePinyin, exampleMeaning, ...extra] = line.split("|");
  if (!id || !levelText || !hanzi || !pinyin || !meaning || !tagText || !example || !examplePinyin || !exampleMeaning || extra.length) {
    throw new Error(`旧HSK補完TSV ${index + 2}行目の列が不正です`);
  }
  return {
    id,
    hanzi,
    pinyin,
    meaning,
    level: Number(levelText),
    syllabus: "HSK2.0-supplement",
    tags: tagText.split(",").filter(Boolean),
    example,
    examplePinyin,
    exampleMeaning,
  };
});
const expectedSupplementByLevel = { 1: 2, 2: 12, 3: 19 };
if (supplement.length !== 33 || [1, 2, 3].some((level) => supplement.filter((word) => word.level === level).length !== expectedSupplementByLevel[level])) {
  throw new Error("旧HSK補完語は HSK1 2語・HSK2 12語・HSK3 19語の計33語である必要があります");
}
const officialHeads = new Set(allOutput.flatMap((word) => variants(word.hanzi)));
const duplicateSupplementHeads = supplement.filter((word) => variants(word.hanzi).some((head) => officialHeads.has(head)));
if (duplicateSupplementHeads.length) {
  throw new Error(`旧HSK補完語が2026年版と重複しています: ${duplicateSupplementHeads.map((word) => word.hanzi).join("、")}`);
}
const combinedIds = [...finalIds, ...supplement.map((word) => word.id)];
if (new Set(combinedIds).size !== combinedIds.length) throw new Error("公式語彙と旧HSK補完語のIDが重複しています");

for (const level of [1, 2, 3]) {
  writeJson(path.join(vocabDir, `hsk${level}.json`), outputGroups[level]);
  fs.writeFileSync(path.join(tagDir, `hsk${level}.tsv`), `${tagRows[level].join("\n")}\n`);
}
writeJson(path.join(vocabDir, "hsk-legacy-supplement.json"), supplement);

console.log(`HSK 2026 語彙 1,000語を生成しました（既存ID・例文を再利用 ${reused}語 / 新規 ${added}語）。`);
console.log(`HSK1 ${outputGroups[1].length}語 / HSK2 ${outputGroups[2].length}語 / HSK3 ${outputGroups[3].length}語`);
console.log(`旧HSK 2.0だけにある補完語 ${supplement.length}語（HSK1 2 / HSK2 12 / HSK3 19）`);
