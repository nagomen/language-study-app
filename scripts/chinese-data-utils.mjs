import { readFile } from "node:fs/promises";

export const PINYIN_VOWELS = "aāáǎàeēéěèiīíǐìoōóǒòuūúǔùüǖǘǚǜ";

export const HANZI = /[一-鿿]/u;

export const loadChineseData = async (file) => JSON.parse(await readFile(new URL(`../data/chinese/${file}`, import.meta.url), "utf8"));

export const countPinyinSyllables = (pinyin) => (pinyin.match(new RegExp(`[${PINYIN_VOWELS}]+`, "gi")) || []).length;

export const countHanzi = (text) => [...text].filter((char) => HANZI.test(char)).length;

// --- ピンインの照合 ---
// 例文を辞書の語で最長一致に区切り、語ごとに辞書のピンインと母音・声調を比べる。
// 「一」「不」の声調変化と、軽声（声調記号なし）との違いは許容する。読みが複数ある語は、どれかに合えばよい。
const TONE_MARKS = { ā: "a1", á: "a2", ǎ: "a3", à: "a4", ē: "e1", é: "e2", ě: "e3", è: "e4", ī: "i1", í: "i2", ǐ: "i3", ì: "i4", ō: "o1", ó: "o2", ǒ: "o3", ò: "o4", ū: "u1", ú: "u2", ǔ: "u3", ù: "u4", ǖ: "ü1", ǘ: "ü2", ǚ: "ü3", ǜ: "ü4" };
const vowelGroups = (pinyin) => (String(pinyin).toLowerCase().match(new RegExp(`[${PINYIN_VOWELS}]+`, "g")) || []);
function splitTone(group) {
  let tone = 0;
  const base = [...group].map((char) => {
    const mark = TONE_MARKS[char];
    if (!mark) return char;
    tone = Number(mark[1]);
    return mark[0];
  }).join("");
  return { base, tone };
}
function groupsMatch(expected, actual, loose) {
  const a = splitTone(expected), b = splitTone(actual);
  if (a.base !== b.base) return false;
  return loose || a.tone === b.tone || a.tone === 0 || b.tone === 0;
}

/** words: [{hanzi, pinyin}] から、漢字列 → 読みの一覧 の辞書を作る */
export function buildPinyinDictionary(words) {
  const dictionary = new Map();
  for (const word of words) {
    if (!word?.hanzi || !word?.pinyin) continue;
    if (!dictionary.has(word.hanzi)) dictionary.set(word.hanzi, new Set());
    dictionary.get(word.hanzi).add(String(word.pinyin).toLowerCase());
  }
  return dictionary;
}

/** 例文 cn のピンイン pinyin のうち、辞書と合わない語を返す（音節数が合わないときは比べない） */
export function pinyinMismatches(cn, pinyin, dictionary) {
  const hanzi = [...cn].filter((char) => HANZI.test(char)).join("");
  const actual = vowelGroups(pinyin);
  const segments = [];
  for (let i = 0; i < hanzi.length;) {
    let length = Math.min(6, hanzi.length - i);
    while (length > 1 && !dictionary.has(hanzi.slice(i, i + length))) length -= 1;
    const text = hanzi.slice(i, i + length);
    const readings = dictionary.has(text) ? [...dictionary.get(text)].map(vowelGroups) : null;
    segments.push({ text, readings: readings?.filter((groups) => groups.length) || null });
    i += length;
  }
  // 辞書にない字は1音節として扱う（儿化の「儿」は音節にならないことがあるので、合わなければ比べない）
  const minimum = segments.reduce((sum, segment) => sum + (segment.readings?.length ? Math.min(...segment.readings.map((r) => r.length)) : (segment.text === "儿" ? 0 : 1)), 0);
  if (minimum > actual.length) return [];
  const problems = [];
  let position = 0;
  for (const segment of segments) {
    if (!segment.readings?.length) { position += segment.text === "儿" && actual.length - position < hanzi.length ? 0 : 1; continue; }
    const loose = /^[一不]$/.test(segment.text) || segment.text.includes("一") || segment.text.includes("不");
    let best = null;
    for (const reading of segment.readings) {
      const slice = actual.slice(position, position + reading.length);
      const misses = reading.filter((group, index) => !slice[index] || !groupsMatch(group, slice[index], loose)).length;
      if (!best || misses < best.misses) best = { reading, misses, slice };
    }
    if (best.misses) problems.push(`${segment.text}（辞書: ${[...new Set(segment.readings.map((r) => r.join("·")))].join(" / ")} ／ 例文: ${best.slice.join("·")}）`);
    position += best.reading.length;
  }
  return problems;
}
