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
