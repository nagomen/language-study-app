// spanish.js から機能ごとに切り出したモジュール。
import { $, escapeHtml, renderReviewPanel, reviewEntryHtml } from "../shared.js";
import { speakSpanish } from "./audio.js";
import { state } from "./state.js";

export function buildQuizReview() {
  return state.quiz.map((word, index) => {
    const answer = state.quizAnswers[index];
    return {
      number: index + 1,
      status: !answer ? "skipped" : answer.correct ? "correct" : "wrong",
      tag: `${word.level} · ${word.pos}`,
      lines: [{ label: "問題", text: word.word }, { label: "分野", text: word.category }],
      your: answer ? answer.choice.meaning : "",
      answer: word.meaning,
      speakText: word.word,
      wordId: word.id,
    };
  });
}

export function setReview(entries) {
  state.review = { entries, scope: "all" };
  renderReview();
}

export function renderReview() {
  const panel = $("#quiz-review");
  renderReviewPanel(panel, state.review, {
    itemHtml: reviewItemHtml,
    emptyText: "まちがいはありません。¡Perfecto!",
    audioSelector: "[data-review-speak]",
    onAudio: (button) => speakSpanish(button.dataset.reviewSpeak, button),
  });
}

function reviewItemHtml(entry) {
  const audioHtml = `<button class="review-audio" type="button" data-review-speak="${escapeHtml(entry.speakText)}"><span aria-hidden="true">▶</span> 発音をもう一度聞く</button>`;
  return reviewEntryHtml(entry, { checkedIds: state.checked, audioHtml });
}
