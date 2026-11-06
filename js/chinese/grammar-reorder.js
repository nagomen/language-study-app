// 文法の確認ドリル・まとめテストの並べ替え問題。作問した語順問題に加えて、単元の文を語句に区切って問題を作る。
// 画面（js/chinese/grammar.js）と scripts/check_grammar.mjs で共用する（DOM には触らない）。
import { filledSentence } from "./grammar-audio.js";

const LONGEST_WORD = 4;
const MIN_TOKENS = 3;
const MAX_TOKENS = 9;
const KANA = /[ぁ-んァ-ン]/;

export const normalizeSentence = (text) => String(text || "").replace(/[\s。！？，、,.?!]/g, "");

/** 語の一覧（{ hanzi }）から、区切りに使う語の集合を作る。 */
export const reorderLexicon = (words) => new Set((words || []).map((word) => word?.hanzi).filter(Boolean));

/** 文を辞書の語で最長一致に区切る（句読点は落とす）。語の数が少なすぎる・多すぎる文や、日本語の混じる文は null。 */
export function reorderTokens(sentence, lexicon) {
  const text = String(sentence || "");
  if (/[ぁ-んァ-ン＿A-Za-z]/.test(text)) return null;
  const tokens = [];
  for (const chunk of text.split(/[^一-鿿]+/).filter(Boolean)) {
    for (let i = 0; i < chunk.length;) {
      let size = Math.min(LONGEST_WORD, chunk.length - i);
      while (size > 1 && !lexicon.has(chunk.slice(i, i + size))) size -= 1;
      tokens.push(chunk.slice(i, i + size));
      i += size;
    }
  }
  return tokens.length >= MIN_TOKENS && tokens.length <= MAX_TOKENS ? tokens : null;
}

/**
 * 単元の文から作れる並べ替え問題（作問した語順問題と同じ文は除く）。
 * 作る元は、よくある間違いの正しい文・選択ドリルの完成文・型カードの例文（日本語訳のあるものだけ）。同じ文は1回だけ。
 * ステップの復習問題（step.review：practice と compare だけ）も同じ形で渡せる。
 */
export function generatedReorders(unit, lexicon) {
  const { practice = [], compare = [], sections = [] } = unit;
  const seen = new Set(practice.filter((item) => item.kind === "reorder").map((item) => normalizeSentence(item.answer)));
  const sources = [
    ...compare.map((pair) => ({ cn: pair.right, ja: pair.meaning, note: pair.note })),
    ...practice.filter(filledSentence).map((item) => ({ cn: filledSentence(item), ja: item.subPrompt, note: item.explanation })),
    ...sections.flatMap((section) => section.patterns || []).map((pattern) => ({ cn: pattern.example?.cn, ja: pattern.example?.ja, note: pattern.formula })),
  ];
  const generated = [];
  for (const { cn, ja, note } of sources) {
    const key = normalizeSentence(cn);
    const tokens = ja && !KANA.test(key) ? reorderTokens(cn, lexicon) : null;
    if (!tokens || seen.has(key)) continue;
    seen.add(key);
    generated.push({
      skill: "writing", kind: "reorder", tokens, answer: cn, meaning: ja,
      instruction: "語句を並べ替えて文を作ってください", explanation: note || "",
    });
  }
  return generated;
}
