// spanish.js から機能ごとに切り出したモジュール。
import { $, escapeHtml, checkButtonHtml } from "../shared.js";
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
  const { entries, scope } = state.review;
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
  panel.querySelector(".review-list").innerHTML = shown.map((entry) => reviewItemHtml(entry)).join("");
  const empty = panel.querySelector(".review-empty");
  empty.textContent = "まちがいはありません。¡Perfecto!";
  empty.classList.toggle("is-hidden", shown.length > 0);
  panel.querySelectorAll("[data-review-speak]").forEach((button) => {
    button.addEventListener("click", () => speakSpanish(button.dataset.reviewSpeak, button));
  });
}

function reviewItemHtml(entry) {
  const marks = { correct: "正解", wrong: "まちがい", skipped: "未回答" };
  const yourClass = entry.status === "correct" ? " is-correct" : entry.status === "wrong" ? " is-wrong" : "";
  return `<li class="review-item is-${entry.status}">
    <div class="review-item-head"><span class="review-index">${entry.number}</span><span class="review-tag">${escapeHtml(entry.tag)}</span><span class="review-mark">${marks[entry.status]}</span>${checkButtonHtml(entry.wordId, state.checked.has(entry.wordId))}</div>
    ${entry.lines.filter((line) => line.text).map((line) => `<p class="review-line"><span>${escapeHtml(line.label)}</span><b>${escapeHtml(line.text)}</b></p>`).join("")}
    <div class="review-answers">
      <div class="review-answer${yourClass}"><span>あなたの回答</span><strong>${escapeHtml(entry.your || "未回答")}</strong></div>
      <div class="review-answer is-correct"><span>正解</span><strong>${escapeHtml(entry.answer)}</strong></div>
    </div>
    <button class="review-audio" type="button" data-review-speak="${escapeHtml(entry.speakText)}"><span aria-hidden="true">▶</span> 発音をもう一度聞く</button>
  </li>`;
}
