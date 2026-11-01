// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { loadCheckedIds } from "../shared.js";
import { CHECKED_KEY } from "./config.js";
import { loadDaily } from "./daily.js";
import { loadAudioSpeed, loadProgress, loadVocabularyDirection } from "./storage.js";

export const reviewSessions = { quiz: { entries: [], scope: "all" }, practice: { entries: [], scope: "all" } };

export const state = {
  words: [],
  categories: [],
  categoryGuides: {},
  guides: [],
  // 文法（HSK2・3）の単元と公式大綱の項目。selectedUnit は開いている単元。
  grammar: null,
  grammarSyllabus: [],
  selectedUnit: null,
  measure: null,
  // 作文・聴解の問題文（data/chinese/practice-banks.json）。配列の順番が音声ファイルの連番に対応する。
  banks: { writing: [], listeningResponses: [], listeningDialogues: [] },
  selectedGuide: null,
  mockForms: {},
  audioSpeed: loadAudioSpeed(),
  vocabularyDirection: loadVocabularyDirection(),
  currentView: "home",
  wordFilter: "all",
  wordEditionFilter: "all",
  wordCategory: "all",
  wordHideMeaning: false,
  categoryFilter: "all",
  selectedCategory: null,
  checked: loadCheckedIds(CHECKED_KEY),
  checkedOnly: { words: false, categories: false },
  daily: loadDaily(),
  dailyDays: [],
  quiz: { questions: [], sourcePool: [], index: 0, correct: 0, answered: false, source: null, direction: "cn-ja", answers: [] },
  practice: emptyPractice(),
  progress: loadProgress(),
};

export function emptyPractice() {
  return { mode: null, level: 1, questions: [], index: 0, correct: 0, answered: false, isMock: false, remainingSeconds: 0, timerId: null, currentSection: null, timedOutSections: [], sectionStats: {}, lastStart: null };
}
