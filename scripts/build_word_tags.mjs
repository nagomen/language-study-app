#!/usr/bin/env node
// scripts/word_tags/*.tsv から data/word-tags.json を生成し、単語データとの整合性を検証する。

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tagsDir = path.join(appDir, "scripts", "word_tags");
const GROUPS = new Set(["pos", "topic"]);
const MIN_WORDS_PER_CATEGORY = 3;

const readRows = (file) => fs.readFileSync(path.join(tagsDir, file), "utf8")
  .split(/\r?\n/)
  .map((line, index) => ({ line: line.trim(), number: index + 1 }))
  .filter(({ line }) => line && !line.startsWith("#"))
  .map(({ line, number }) => ({ columns: line.split("|").map((value) => value.trim()), number }));

const categories = [];
const categoryIds = new Set();
for (const { columns, number } of readRows("categories.tsv")) {
  const [id, group, label, description] = columns;
  if (!id || !group || !label || !description) throw new Error(`categories.tsv:${number} の列が不足しています`);
  if (!GROUPS.has(group)) throw new Error(`categories.tsv:${number} の group「${group}」は pos か topic にしてください`);
  if (categoryIds.has(id)) throw new Error(`categories.tsv:${number} のカテゴリID「${id}」が重複しています`);
  categoryIds.add(id);
  categories.push({ id, group, label, description });
}

const words = {};
const usage = new Map([...categoryIds].map((id) => [id, []]));
for (const level of [1, 2, 3]) {
  const file = `hsk${level}.tsv`;
  const vocabulary = JSON.parse(fs.readFileSync(path.join(appDir, "data", `hsk${level}.json`), "utf8"));
  const rows = readRows(file);
  if (rows.length !== vocabulary.length) throw new Error(`${file} は ${vocabulary.length}行必要ですが、${rows.length}行です`);
  rows.forEach(({ columns, number }, index) => {
    const [id, hanzi, tagList] = columns;
    const word = vocabulary[index];
    if (id !== word.id) throw new Error(`${file}:${number} のID「${id}」が単語データの「${word.id}」と一致しません`);
    if (hanzi !== word.hanzi) throw new Error(`${file}:${number} の見出し語「${hanzi}」が単語データの「${word.hanzi}」と一致しません`);
    const tags = (tagList || "").split(",").map((tag) => tag.trim()).filter(Boolean);
    if (!tags.length) throw new Error(`${file}:${number}「${hanzi}」にラベルがありません`);
    if (new Set(tags).size !== tags.length) throw new Error(`${file}:${number}「${hanzi}」に同じラベルが重複しています`);
    for (const tag of tags) {
      if (!categoryIds.has(tag)) throw new Error(`${file}:${number}「${hanzi}」のラベル「${tag}」は categories.tsv にありません`);
      usage.get(tag).push(id);
    }
    words[id] = tags;
  });
}

const unused = [...usage].filter(([, ids]) => ids.length === 0).map(([id]) => id);
if (unused.length) throw new Error(`単語が1つも付いていないカテゴリ: ${unused.join(", ")}`);

fs.writeFileSync(path.join(appDir, "data", "word-tags.json"), `${JSON.stringify({ categories, words }, null, 2)}\n`);

const byGroup = (group) => categories.filter((category) => category.group === group);
for (const group of ["pos", "topic"]) {
  console.log(`\n[${group === "pos" ? "品詞" : "場面・テーマ"}]`);
  for (const category of byGroup(group)) console.log(`  ${category.label}（${category.id}）: ${usage.get(category.id).length}語`);
}
const thin = categories.filter((category) => usage.get(category.id).length < MIN_WORDS_PER_CATEGORY);
if (thin.length) console.warn(`\n警告: ${MIN_WORDS_PER_CATEGORY}語未満のカテゴリがあります → ${thin.map((category) => category.label).join(", ")}`);
console.log(`\nカテゴリ ${categories.length}件 / 単語 ${Object.keys(words).length}語 → data/word-tags.json`);
