// spanish.js から機能ごとに切り出したモジュール。
export const LEVELS = ["A1", "A2", "B1"];

export const LEVEL_META = {
  A1: { name: "Acceso", title: "最初の一歩", description: "あいさつ、家族、数字、食事など毎日の基本語彙。" },
  A2: { name: "Plataforma", title: "暮らしを話す", description: "旅行、買い物、健康、仕事など身近な場面の語彙。" },
  B1: { name: "Umbral", title: "自分の考えを伝える", description: "意見、社会、文化、感情など会話を広げる語彙。" },
};

export const STORAGE_KEY = "language-app-spanish-progress-v1";

export const CHECKED_KEY = "language-app-spanish-checked-v1";

export const QUIZ_SIZE = 10;
