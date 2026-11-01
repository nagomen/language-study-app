// 文法の例文・聞き取り問題の録音音声。どの文を録音するか（grammarAudioTexts）と、
// 文からファイル名を作る規則（grammarAudioFile）を、画面と scripts/generate_sentence_audio.mjs で共用する。
// ファイル名は文の中身から作るので、並べ替えても音声がずれず、同じ文は1つの音声を使い回す。

/** 文字列から8桁の16進数を作る（FNV-1a 32bit）。ブラウザでも Node.js でも同じ値になる。 */
export function grammarAudioId(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `grammar-${hash.toString(16).padStart(8, "0")}`;
}

export const grammarAudioFile = (text) => `audio/sentences/${grammarAudioId(text)}.m4a`;

const KANA = /[ぁ-んァ-ン]/;

/** 選択ドリルの空欄に正解を入れた文（日本語の設問や、空欄のない問題は null） */
export function filledSentence(question) {
  if (question.kind !== "choice" || !String(question.prompt || "").includes("＿")) return null;
  const parts = String(question.correct || "").split("／");
  let index = 0;
  const text = String(question.prompt).replace(/＿+/g, () => parts[Math.min(index++, parts.length - 1)]);
  return KANA.test(text) || /[A-Z]：/.test(text) ? null : text;
}

/** 語の一覧（{ hanzi, pinyin }）から、漢字 → 読み（声調記号つき・空白なし）の集合 を作る。 */
export function readingIndex(words) {
  const index = new Map();
  for (const word of words || []) {
    if (!word?.hanzi || !word?.pinyin) continue;
    if (!index.has(word.hanzi)) index.set(word.hanzi, new Set());
    for (const reading of String(word.pinyin).split(/[\/／,，]/)) index.get(word.hanzi).add(reading.toLowerCase().replace(/[\s'’·]/g, ""));
  }
  return index;
}

/** 漢字列の読みの候補（辞書の語で最長一致に区切る）。辞書にない字があれば null。 */
function readingsOf(text, index) {
  const hanzi = [...text].filter((char) => /[一-鿿]/u.test(char)).join("");
  if (!hanzi) return null;
  let readings = [""];
  for (let i = 0; i < hanzi.length;) {
    let length = Math.min(6, hanzi.length - i);
    while (length > 1 && !index.has(hanzi.slice(i, i + length))) length -= 1;
    const options = index.get(hanzi.slice(i, i + length));
    if (!options) return null;
    readings = readings.flatMap((head) => [...options].map((tail) => head + tail)).slice(0, 64);
    i += length;
  }
  return new Set(readings);
}

/**
 * 選択肢に、耳では区別できない（同じ読みになる）組があるか。的／得／地 など。
 * 選択肢に共通する前後（「做的／做得」の「做」）は除いて比べる。辞書にない字を含む選択肢は比べない。
 */
export function choicesSoundAlike(choices, index) {
  const chars = choices.map((choice) => [...String(choice)]);
  let head = 0;
  while (chars.every((list) => head < list.length && list[head] === chars[0][head])) head += 1;
  let tail = 0;
  while (chars.every((list) => tail < list.length - head && list[list.length - 1 - tail] === chars[0][chars[0].length - 1 - tail])) tail += 1;
  const readings = chars.map((list) => readingsOf(list.slice(head, list.length - tail).join(""), index));
  return readings.some((a, i) => a && readings.slice(i + 1).some((b) => b && [...a].some((reading) => b.has(reading))));
}

/**
 * 録音する文の一覧。返り値は [{ text, level, dialogue }]。
 * 単元の型カードの例文・よくある間違い（正しい文と誤った文）・選択ドリルの完成文・語順ドリルの答え・会話、
 * 文法トップの見取り図、ステップの復習問題、コラム（guides.json）の例文と正しい文。
 */
export function grammarAudioTexts(grammar, guides = []) {
  const seen = new Map();
  const add = (text, level, dialogue = false) => {
    const value = String(text || "").trim();
    if (!value || KANA.test(value) || seen.has(value)) return;
    seen.set(value, { text: value, level, dialogue });
  };
  const steps = new Map((grammar?.steps || []).map((step) => [step.id, step]));
  const addSections = (sections, level) => (sections || []).forEach((section) => {
    (section.patterns || []).forEach((pattern) => add(pattern.example?.cn, level));
    (section.compare || []).forEach((pair) => add(pair.right, level));
  });
  const addDrills = (practice, compare, level) => {
    (compare || []).forEach((pair) => { add(pair.right, level); add(pair.wrong, level); });
    (practice || []).forEach((question) => {
      add(filledSentence(question), level);
      if (question.kind === "reorder") add(question.answer, level);
    });
  };
  for (const unit of grammar?.units || []) {
    const level = steps.get(unit.step)?.level || 3;
    addSections(unit.sections, level);
    addDrills(unit.practice, unit.compare, level);
    if (unit.dialogue?.audio) add(unit.dialogue.audio, level, true);
  }
  for (const step of grammar?.steps || []) addDrills(step.review?.practice, step.review?.compare, step.level);
  addSections(grammar?.top?.sections, 3);
  for (const guide of guides) addSections(guide.sections, 3);
  return [...seen.values()];
}
