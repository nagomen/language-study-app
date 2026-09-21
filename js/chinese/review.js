// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, escapeHtml, checkButtonHtml } from "../shared.js";
import { playAudioFile, speak } from "./audio.js";
import { REVIEW_SUB_LABELS, SKILL_LABELS } from "./config.js";
import { reviewSessions, state } from "./state.js";
import { normalizeAnswer } from "./util.js";

export function setReview(key, entries) {
  reviewSessions[key] = { entries, scope: "all" };
  renderReview(key);
}

export function renderReview(key) {
  const panel = $(`#${key}-review`);
  const session = reviewSessions[key];
  if (!panel || !session) return;
  const { entries, scope } = session;
  panel.classList.toggle("is-hidden", !entries.length);
  if (!entries.length) return;
  const missed = entries.filter((entry) => entry.status !== "correct");
  panel.querySelector(".review-count-total").textContent = entries.length;
  panel.querySelector(".review-count-missed").textContent = missed.length;
  panel.querySelectorAll("[data-review-scope]").forEach((button) => {
    const isActive = button.dataset.reviewScope === scope;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  const shown = scope === "wrong" ? missed : entries;
  panel.querySelector(".review-list").innerHTML = shown.map((entry) => reviewItemHtml(entry, entries.indexOf(entry))).join("");
  const empty = panel.querySelector(".review-empty");
  empty.textContent = "まちがいはありません。全問正解です。";
  empty.classList.toggle("is-hidden", shown.length > 0);
  panel.querySelectorAll("[data-review-audio]").forEach((button) => {
    button.addEventListener("click", () => playReviewAudio(entries[Number(button.dataset.reviewAudio)], button));
  });
}

function reviewItemHtml(entry, index) {
  const marks = { correct: "正解", wrong: "まちがい", skipped: "未回答" };
  const yourClass = entry.status === "correct" ? " is-correct" : entry.status === "wrong" ? " is-wrong" : "";
  return `<li class="review-item is-${entry.status}">
    <div class="review-item-head"><span class="review-index">${entry.number}</span><span class="review-tag">${escapeHtml(entry.tag)}</span><span class="review-mark">${marks[entry.status]}</span>${entry.wordId ? checkButtonHtml(entry.wordId, state.checked.has(entry.wordId)) : ""}</div>
    ${entry.lines.filter((line) => line.text).map((line) => `<p class="review-line"><span>${escapeHtml(line.label)}</span><b>${escapeHtml(line.text)}</b></p>`).join("")}
    <div class="review-answers">
      <div class="review-answer${yourClass}"><span>あなたの回答</span><strong>${escapeHtml(entry.your || "未回答")}</strong></div>
      <div class="review-answer is-correct"><span>正解</span><strong>${escapeHtml(entry.answer || "—")}</strong></div>
    </div>
    ${entry.note ? `<p class="review-note">${escapeHtml(entry.note)}</p>` : ""}
    ${entry.audio ? `<button class="review-audio" type="button" data-review-audio="${index}"><span aria-hidden="true">▶</span> 音声をもう一度聞く</button>` : ""}
  </li>`;
}

function playReviewAudio(entry, button) {
  const audio = entry?.audio;
  if (!audio) return;
  if (audio.word) return speak(audio.word, button);
  playAudioFile(audio.file, button, { fallbackText: audio.text, dialogue: Boolean(audio.dialogue), role: "narrator" });
}

export function buildQuizReview() {
  const { questions, answers, direction } = state.quiz;
  const isReverse = direction === "ja-cn";
  return questions.map((word, index) => {
    const answer = answers[index];
    const chosen = answer?.choice;
    return {
      number: index + 1,
      status: !answer ? "skipped" : answer.correct ? "correct" : "wrong",
      tag: `HSK ${word.level} · 単語（${isReverse ? "日 → 中" : "中 → 日"}）`,
      lines: [{ label: "問題", text: isReverse ? word.meaning : `${word.hanzi}（${word.pinyin}）` }],
      your: chosen ? (isReverse ? `${chosen.hanzi}（${chosen.pinyin}）` : chosen.meaning) : "",
      answer: isReverse ? `${word.hanzi}（${word.pinyin}）` : word.meaning,
      note: word.example && word.exampleMeaning ? `${word.example}（${word.exampleMeaning}）` : "",
      audio: { word },
      wordId: word.id,
    };
  });
}

export function buildPracticeReview(session) {
  return session.questions.map((question, index) => {
    const answered = question.userAnswer !== undefined;
    const answerLabel = reviewChoiceLabel(question, question.correct ?? question.answer);
    const lines = reviewLines(question);
    return {
      number: index + 1,
      status: !answered ? "skipped" : question.isCorrect ? "correct" : "wrong",
      tag: session.isMock ? `${SKILL_LABELS[question.skill]} · 第${question.part || 1}部分` : SKILL_LABELS[question.skill],
      lines,
      your: answered ? reviewChoiceLabel(question, question.userAnswer) || "（空欄）" : "",
      answer: answerLabel,
      note: reviewNote(question, lines, answerLabel),
      audio: question.skill === "listening" ? { file: question.audioFile, text: question.audioText, word: question.audioWord, dialogue: String(question.kind).includes("dialogue") } : null,
      wordId: findQuestionWord(question)?.id || "",
    };
  });
}

function reviewLines(question) {
  const lines = [];
  if (question.audioText) lines.push({ label: "音声原文", text: question.audioText });
  else if (question.audioWord) lines.push({ label: "音声", text: `${question.audioWord.hanzi}（${question.audioWord.pinyin}）` });
  if (question.kind === "slot") lines.push({ label: "問題", text: `${question.slot.number} ＋ ？ ＋ ${question.slot.noun}（${question.slot.meaning}）` });
  if (question.kind === "reorder") lines.push({ label: "語句", text: question.tokens.join(" / ") });
  if (question.kind === "input" && question.sentence) lines.push({ label: "問題", text: question.sentence });
  if (question.kind === "input" && question.pinyin) lines.push({ label: "ピンイン", text: question.pinyin });
  if (question.meaning && (question.kind === "reorder" || question.kind === "input")) lines.push({ label: "意味", text: question.meaning });
  if (question.prompt) lines.push({ label: question.skill === "listening" ? "設問" : "問題", text: question.prompt });
  if (question.promptPinyin) lines.push({ label: "ピンイン", text: question.promptPinyin });
  if (question.subPrompt) lines.push({ label: REVIEW_SUB_LABELS[question.kind] || "補足", text: question.subPrompt });
  if (question.subPromptPinyin) lines.push({ label: "ピンイン", text: question.subPromptPinyin });
  if (question.visual) lines.push({ label: "図示", text: `${question.visual.symbol} ${question.visual.alt}` });
  return lines;
}

function reviewNote(question, lines, answerLabel) {
  const note = question.explanation;
  if (!note) return "";
  // 問題文と正解の並べ替えでしかない解説は、繰り返しになるので表示しない。
  const parts = [answerLabel, String(question.correct ?? question.answer ?? ""), ...lines.map((line) => line.text)].filter(Boolean).sort((a, b) => b.length - a.length);
  const rest = parts.reduce((text, part) => text.split(part).join(""), note);
  return /[^\s—、。（）()・·-]/.test(rest) ? note : "";
}

export function findQuestionWord(question) {
  return state.words.find((item) => item.id === question.wordId || item.id === question.audioWord?.id || item.hanzi === question.answer);
}

function reviewChoiceLabel(question, value) {
  if (value === undefined || value === null || value === "") return "";
  const choice = question.choices?.find((item) => normalizeAnswer(item.value) === normalizeAnswer(value));
  if (!choice) return String(value);
  const pinyin = choice.pinyin ? `（${choice.pinyin}）` : "";
  const description = choice.ariaLabel && choice.ariaLabel !== choice.label ? `（${choice.ariaLabel}）` : "";
  return `${choice.label}${pinyin}${description}`;
}
