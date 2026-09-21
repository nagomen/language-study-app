// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
export const LEVEL_META = {
  1: { name: "BEGINNER", title: "はじめの中国語", description: "あいさつや数字など、基本の単語からスタート。" },
  2: { name: "ELEMENTARY", title: "日常会話の基礎", description: "身近な話題を表現する語彙を身につけよう。" },
  3: { name: "INTERMEDIATE", title: "表現を広げる", description: "より豊かな会話につながる単語を学ぼう。" },
};

export const EXAM_CONFIG = {
  1: { listening: 20, reading: 20, writing: 0, minutes: 35, sectionMinutes: { listening: 18, reading: 17 }, maxScore: 200, passScore: 120 },
  2: { listening: 35, reading: 25, writing: 0, minutes: 50, sectionMinutes: { listening: 28, reading: 22 }, maxScore: 200, passScore: 120 },
  3: { listening: 40, reading: 30, writing: 10, minutes: 85, sectionMinutes: { listening: 40, reading: 30, writing: 15 }, maxScore: 300, passScore: 180 },
};

export const SKILL_LABELS = { vocabulary: "単語", listening: "聴解", reading: "読解", writing: "作文" };

export const REVIEW_SUB_LABELS = { "reading-comprehension": "設問", "reading-judge": "★の文", meaning: "ピンイン", fill: "訳", grammar: "訳" };

export const CHECKED_KEY = "hsk-checked-words";

// HSK3を毎日20語ずつ。並び順は固定の種から作るので、日ごとの20語は毎回同じで重複もしない。
export const DAILY_KEY = "hsk3-daily-v1";

export const DAILY_LEVEL = 3;

export const DAILY_SIZE = 20;

export const DAILY_SEED = 20260913;

// 分類ページのグループ見出し。data/word-tags.json の group と対応する。
export const CATEGORY_GROUP_META = {
  pos: { eyebrow: "PARTS OF SPEECH", label: "品詞でさがす", description: "数詞・量詞・形容詞など、ことばの種類ごとにまとめています。" },
  topic: { eyebrow: "TOPICS & SCENES", label: "場面・テーマでさがす", description: "旅行・食事・仕事など、使う場面ごとにまとめています。" },
};

// この語数以上の分類は、まぎらわしい選択肢を同じ分類の中から作る。
export const CATEGORY_QUIZ_MIN_POOL = 10;

// 分類ページから開ける解説ページ。分類ID → ガイドID。
export const CATEGORY_GUIDES = { particle: "de", degree: "bi", preposition: "ba", conjunction: "conjunction", direction: "complement", verb: "complement" };

export const MEASURE_CARD = { attr: 'data-category-open="measure"', mark: "量", title: "量詞（助数詞）の使い分け", note: "「数＋量詞＋名詞」で覚える特設ページ。量詞クイズつき" };

// 的・得・地は「どこに置くか」を問うドリル、語順は組み立て、間違いやすい形は○×で確かめる。
export const DE_NOTES = { 的: "名詞の前", 地: "動詞の前", 得: "動詞のあと" };

// 練習の出題語は、選んだ級の語を7割、下の級を復習として3割にし、1回の中では同じ語を出さない。
export const PRACTICE_TARGET_RATIO = 0.7;

export const LISTENING_MIX = {
  1: { word: 7, sentence: 3 },
  2: { word: 5, sentence: 4, dialogue: 1 },
  3: { word: 3, sentence: 5, dialogue: 2 },
};

export const READING_MIX = {
  1: { meaning: 4, pinyin: 4, fill: 2 },
  2: { meaning: 4, pinyin: 3, fill: 3 },
  3: { meaning: 3, pinyin: 2, fill: 5 },
};
