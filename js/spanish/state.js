// spanish.js から機能ごとに切り出したモジュール。
import { loadCheckedIds } from "../shared.js";
import { CHECKED_KEY } from "./config.js";
import { loadProgress } from "./storage.js";

export const state = {
  words: [],
  byLevel: {},
  currentView: "home",
  filter: "all",
  checked: loadCheckedIds(CHECKED_KEY),
  checkedOnly: false,
  quiz: [],
  quizIndex: 0,
  quizCorrect: 0,
  quizAnswers: [],
  review: { entries: [], scope: "all" },
  lastQuizSource: null,
  answeredCurrent: false,
  progress: loadProgress(),
};
