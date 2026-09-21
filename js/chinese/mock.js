// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, $$, shuffle } from "../shared.js";
import { EXAM_CONFIG, SKILL_LABELS } from "./config.js";
import { showView } from "./main.js";
import { clearPracticeTimer, finishPractice, renderPracticeQuestion } from "./practice.js";
import { getDueWords } from "./progress.js";
import { emptyPractice, state } from "./state.js";

export function renderExamHub() {
  $("#due-word-count").textContent = getDueWords().length;
  // セクション別練習のボタンは、模試の構成（問数・持ち時間）から作る。
  $$("[data-mock-sections]").forEach((container) => {
    const level = Number(container.dataset.mockSections);
    const config = EXAM_CONFIG[level];
    container.innerHTML = ["listening", "reading", "writing"].filter((skill) => config[skill] > 0).map((skill) => {
      const poolSize = state.mockForms[level]?.questions?.filter((question) => question.skill === skill).length || config[skill];
      const poolLabel = poolSize > config[skill] ? `・全${poolSize}問から抽選` : "";
      return `<button class="mock-section-button" type="button" data-mock-level="${level}" data-mock-section="${skill}">${SKILL_LABELS[skill]}だけ<small>${config[skill]}問・${config.sectionMinutes[skill]}分${poolLabel}</small></button>`;
    }).join("");
  });
}

function drawMockQuestions(form, section = null) {
  const skills = section ? [section] : ["listening", "reading", "writing"];
  return skills.flatMap((skill) => {
    const skillQuestions = form.questions.filter((question) => question.skill === skill);
    const partSelection = form.questionSelection?.[skill];
    if (!partSelection) return skillQuestions;
    return Object.entries(partSelection)
      .sort(([partA], [partB]) => Number(partA) - Number(partB))
      .flatMap(([part, count]) => shuffle(skillQuestions.filter((question) => question.part === Number(part))).slice(0, count));
  });
}

export function startMockExam(level, section = null) {
  const form = state.mockForms[level];
  const sourceQuestions = form?.questions?.length ? drawMockQuestions(form, section) : [];
  if (!sourceQuestions?.length) return alert("模試データを読み込めませんでした。");
  // 模試データは正解を先頭に持つため、受けるたびに選択肢を並べ替える（对／不对は順序を保つ）。
  const questions = JSON.parse(JSON.stringify(sourceQuestions)).map((question) => ({
    ...question,
    choices: question.choices && !isJudgeChoices(question.choices) ? shuffle([...question.choices]) : question.choices,
    mockFormat: question.skill === "writing",
    selected: [],
  }));
  state.practice = {
    ...emptyPractice(), mode: "mock", level, questions, isMock: true, section,
    lastStart: { mode: "mock", level, isMock: true, section }, sectionStats: {},
  };
  showView("practice");
  $("#practice-timer").classList.remove("is-hidden");
  renderPracticeQuestion();
}

function isJudgeChoices(choices) {
  return choices.every((choice) => choice.value === "true" || choice.value === "false");
}

export function startMockSectionTimer(skill) {
  const session = state.practice;
  clearPracticeTimer();
  session.currentSection = skill;
  session.remainingSeconds = (EXAM_CONFIG[session.level].sectionMinutes[skill] || 1) * 60;
  updatePracticeTimer();
  session.timerId = window.setInterval(() => {
    session.remainingSeconds -= 1;
    updatePracticeTimer();
    if (session.remainingSeconds <= 0) expireMockSection();
  }, 1000);
}

function expireMockSection() {
  const session = state.practice;
  const expiredSkill = session.currentSection;
  clearPracticeTimer();
  if (!session.timedOutSections.includes(expiredSkill)) session.timedOutSections.push(expiredSkill);
  const nextIndex = session.questions.findIndex((question, index) => index > session.index && question.skill !== expiredSkill);
  if (nextIndex < 0) return finishPractice(true);
  session.index = nextIndex;
  session.answered = false;
  renderPracticeQuestion();
}

function updatePracticeTimer() {
  const seconds = Math.max(0, state.practice.remainingSeconds);
  const minutes = Math.floor(seconds / 60);
  const prefix = state.practice.isMock && state.practice.currentSection ? `${SKILL_LABELS[state.practice.currentSection]} ` : "";
  $("#practice-timer").textContent = `${prefix}${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  $("#practice-timer").classList.toggle("is-warning", seconds <= 300);
}
