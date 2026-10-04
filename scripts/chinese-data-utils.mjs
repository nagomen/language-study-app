import { readFile } from "node:fs/promises";

export const PINYIN_VOWELS = "aāáǎàeēéěèiīíǐìoōóǒòuūúǔùüǖǘǚǜ";

export const HANZI = /[一-鿿]/u;

export const loadChineseData = async (file) => JSON.parse(await readFile(new URL(`../data/chinese/${file}`, import.meta.url), "utf8"));

export const countPinyinSyllables = (pinyin) => (pinyin.match(new RegExp(`[${PINYIN_VOWELS}]+`, "gi")) || []).length;

export const countHanzi = (text) => [...text].filter((char) => HANZI.test(char)).length;
