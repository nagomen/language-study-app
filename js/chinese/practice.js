// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, $$, escapeHtml, shuffle, localDateKey } from "../shared.js";
import { exampleAudioFile, playAudioFile, speak, speakDialogue, speakWithBrowser, stopAudio } from "./audio.js";
import { startCategoryPractice } from "./categories.js";
import { startCheckedPractice } from "./checked.js";
import { EXAM_CONFIG, LISTENING_MIX, PRACTICE_TARGET_RATIO, READING_MIX, SKILL_LABELS } from "./config.js";
import { multiAnswerValue, startGuidePractice, startMeasurePractice } from "./guide.js";
import { navigate, showView } from "./main.js";
import { startMockExam, startMockSectionTimer } from "./mock.js";
import { getDueWords, masteryScore, recordStudy, updateSummary } from "./progress.js";
import { buildPracticeReview, findQuestionWord, setReview } from "./review.js";
import { emptyPractice, state } from "./state.js";
import { saveProgress } from "./storage.js";
import { normalizeAnswer, uniqueChoices } from "./util.js";

function getLevelPool(level) {
  return state.words.filter((word) => word.level <= level);
}

function drawPracticeWords(level, count, source = null) {
  if (count <= 0) return [];
  if (source?.length) return repeatToCount(shuffle([...source]), count);
  const target = shuffle(state.words.filter((word) => word.level === level));
  const review = shuffle(state.words.filter((word) => word.level < level));
  const targetCount = review.length ? Math.min(target.length, Math.round(count * PRACTICE_TARGET_RATIO)) : count;
  const picked = [...target.slice(0, targetCount), ...review.slice(0, count - targetCount)];
  return shuffle(repeatToCount([...picked, ...target.slice(targetCount), ...review.slice(count - targetCount)], count));
}

// 分類やチェックのように語数が問題数より少ないときだけ、ひと通り出し切ってから繰り返す。
function repeatToCount(words, count) {
  if (!words.length) return [];
  const result = [...words];
  while (result.length < count) result.push(...shuffle([...words]));
  return result.slice(0, count);
}

// 誤答の選択肢は正解と同じ級の語から作る（足りないときだけ全体から補う）。
function sameLevelDistractors(word, pool) {
  const same = pool.filter((item) => item.level === word.level && item.id !== word.id);
  return same.length >= 8 ? same : pool.filter((item) => item.id !== word.id);
}

// 出題形式の比率。級が上がるほど、1語の聞き取りから例文・対話へ比重を移す。
function mixedKinds(mix, count) {
  const total = Object.values(mix).reduce((sum, share) => sum + share, 0);
  const kinds = Object.entries(mix).flatMap(([kind, share]) => Array(Math.round(count * share / total)).fill(kind));
  const fallback = Object.keys(mix)[0];
  while (kinds.length < count) kinds.push(fallback);
  return shuffle(kinds.slice(0, count));
}

export function startPractice(mode, level, source = null, sourceMeta = null) {
  clearPracticeTimer();
  let questions = [];
  let actualLevel = level;
  if (mode === "writing") {
    actualLevel = 3;
    $("#practice-level").value = "3";
    questions = makeWritingQuestions(10);
  } else if (mode === "listening") {
    questions = makeListeningQuestions(actualLevel, 10, source);
  } else if (mode === "reading") {
    questions = makeReadingQuestions(actualLevel, 10, source);
  } else if (mode === "srs") {
    const due = getDueWords();
    const reviewPool = due.length ? due : shuffle([...getLevelPool(actualLevel)]).sort((a, b) => masteryScore(a) - masteryScore(b)).slice(0, 10);
    const readingKinds = ["meaning", "pinyin", "fill"];
    questions = reviewPool.slice(0, 10).map((word, index) => index % 2
      ? makeReadingQuestion(word, word.level, readingKinds[Math.floor(index / 2) % readingKinds.length])
      : makeListeningQuestion(word, word.level, index % 4 ? "sentence" : "word"));
  }
  if (!questions.length) return alert("出題できる問題がありません。");
  const categoryId = sourceMeta?.categoryId || null;
  state.practice = {
    ...emptyPractice(),
    mode,
    level: actualLevel,
    questions,
    sourceLabel: source ? sourceMeta?.label || "チェックした単語" : "",
    lastStart: { mode, level: actualLevel, isMock: false, checked: Boolean(source) && !categoryId, categoryId },
    sectionStats: {},
  };
  showView("practice");
  renderPracticeQuestion();
}

function makeListeningQuestions(level, count, source = null) {
  const banked = state.banks.listeningDialogues
    .map((item, index) => ({ ...item, audioFile: `audio/sentences/mock-dialogue-${String(index + 1).padStart(3, "0")}.m4a` }))
    .filter((item) => item.level <= level);
  // 対話も選んだ級のものを先に使い、足りないときだけ下の級から出す。
  const dialogues = [...shuffle(banked.filter((item) => item.level === level)), ...shuffle(banked.filter((item) => item.level < level))];
  // 分類・チェックの練習では、その語と関係のない対話は出さない。
  const canUseDialogue = dialogues.length > 0 && !source?.length;
  const kinds = mixedKinds(LISTENING_MIX[level] || LISTENING_MIX[3], count)
    .map((kind) => (kind === "dialogue" && !canUseDialogue ? "sentence" : kind));
  const words = drawPracticeWords(level, kinds.filter((kind) => kind !== "dialogue").length, source);
  if (!words.length) return [];
  let wordIndex = 0;
  let dialogueIndex = 0;
  return kinds.map((kind) => {
    if (kind === "dialogue") return makeListeningDialogueQuestion(dialogues[dialogueIndex++ % dialogues.length]);
    return makeListeningQuestion(words[wordIndex++], level, kind);
  });
}

function makeListeningDialogueQuestion(item) {
  return {
    skill: "listening", kind: "audio-dialogue", audioText: item.audio, audioFile: item.audioFile,
    choices: shuffle([item.answer, ...item.distractors]).map((label) => ({ value: label, label })), correct: item.answer,
    instruction: "対話を聞いて、質問の答えを選んでください", explanation: `${item.prompt} — ${item.answer}`, audioPlays: 0,
  };
}

function makeListeningQuestion(word, level, kind = "word") {
  const pool = sameLevelDistractors(word, getLevelPool(level));
  if (kind === "sentence" && word.example) {
    const candidates = pool.filter((item) => item.exampleMeaning && item.id !== word.id);
    const choices = uniqueChoices([{ value: word.id, label: word.exampleMeaning }, ...shuffle(candidates).slice(0, 3).map((item) => ({ value: item.id, label: item.exampleMeaning }))]);
    return { skill: "listening", kind: "audio-sentence", wordId: word.id, audioText: word.example, audioFile: exampleAudioFile(word), choices: shuffle(choices), correct: word.id, instruction: "音声の内容として正しいものを選んでください", explanation: `${word.example}（${word.exampleMeaning}）`, audioPlays: 0 };
  }
  const choices = uniqueChoices([{ value: word.id, label: word.meaning }, ...shuffle(pool.filter((item) => item.id !== word.id && item.meaning !== word.meaning)).slice(0, 3).map((item) => ({ value: item.id, label: item.meaning }))]);
  return { skill: "listening", kind: "audio-word", wordId: word.id, audioWord: word, choices: shuffle(choices), correct: word.id, instruction: "音声で聞こえた単語の意味を選んでください", explanation: `${word.hanzi}（${word.pinyin}）— ${word.meaning}`, audioPlays: 0 };
}

function makeReadingQuestions(level, count, source = null) {
  const kinds = mixedKinds(READING_MIX[level] || READING_MIX[3], count);
  const words = drawPracticeWords(level, count, source);
  if (!words.length) return [];
  return words.map((word, index) => makeReadingQuestion(word, level, kinds[index]));
}

function makeReadingQuestion(word, level, kind = "meaning") {
  const pool = sameLevelDistractors(word, getLevelPool(level));
  if (kind === "pinyin") {
    const choices = uniqueChoices([{ value: word.id, label: word.pinyin }, ...shuffle(pool.filter((item) => item.id !== word.id && item.pinyin !== word.pinyin)).slice(0, 3).map((item) => ({ value: item.id, label: item.pinyin }))]);
    return { skill: "reading", kind: "pinyin", wordId: word.id, prompt: word.hanzi, choices: shuffle(choices), correct: word.id, instruction: "正しいピンインを選んでください", explanation: `${word.hanzi} — ${word.pinyin} — ${word.meaning}` };
  }
  if (kind === "fill" && word.example?.includes(word.hanzi)) {
    const choices = uniqueChoices([{ value: word.id, label: word.hanzi }, ...shuffle(pool.filter((item) => item.id !== word.id && item.hanzi !== word.hanzi)).slice(0, 3).map((item) => ({ value: item.id, label: item.hanzi }))]);
    return { skill: "reading", kind: "fill", wordId: word.id, prompt: word.example.replace(word.hanzi, "＿＿＿"), subPrompt: word.exampleMeaning, choices: shuffle(choices), correct: word.id, instruction: "空欄に入る単語を選んでください", explanation: `${word.example}（${word.exampleMeaning}）` };
  }
  const choices = uniqueChoices([{ value: word.id, label: word.meaning }, ...shuffle(pool.filter((item) => item.id !== word.id && item.meaning !== word.meaning)).slice(0, 3).map((item) => ({ value: item.id, label: item.meaning }))]);
  return { skill: "reading", kind: "meaning", wordId: word.id, prompt: word.hanzi, subPrompt: word.pinyin, choices: shuffle(choices), correct: word.id, instruction: "単語の意味を選んでください", explanation: `${word.hanzi}（${word.pinyin}）— ${word.meaning}` };
}

function makeWritingQuestions(count, isMock = false) {
  // 正解音声のファイル名は元の並び順の番号で決まるので、絞り込む前に付ける。
  const items = state.banks.writing.map((item, index) => ({ ...item, answerAudioFile: `audio/sentences/writing-bank-${String(index + 1).padStart(3, "0")}.m4a` }));
  const reorder = shuffle(items.filter((item) => item.type === "reorder"));
  const input = shuffle(items.filter((item) => item.type === "input"));
  const half = Math.ceil(count / 2);
  return [...reorder.slice(0, half), ...input.slice(0, count - half)].map((item) => ({
    ...item, skill: "writing", kind: item.type, mockFormat: isMock,
    instruction: isMock ? (item.type === "reorder" ? "请把下面的词语排列成正确的句子。" : "请根据拼音在空格上写汉字。") : (item.type === "reorder" ? "単語を正しい語順に並べてください" : "ピンインを漢字で書いてください"),
    selected: [],
  }));
}

export function renderPracticeQuestion() {
  const session = state.practice;
  const question = session.questions[session.index];
  if (!question) return finishPractice();
  if (session.isMock && session.currentSection !== question.skill) startMockSectionTimer(question.skill);
  session.answered = false;
  stopAudio();
  $("#practice-level-label").textContent = session.sourceLabel || `HSK ${session.level}`;
  $("#practice-mode-label").textContent = session.isMock
    ? `${session.section ? "セクション練習" : "写真なし模試"} · ${SKILL_LABELS[question.skill]} 第${question.part || 1}部分`
    : (session.modeLabel || (session.mode === "srs" ? `間隔反復 · ${SKILL_LABELS[question.skill]}` : SKILL_LABELS[question.skill]));
  $("#practice-step").textContent = `${session.index + 1} / ${session.questions.length}`;
  $("#practice-progress-bar").style.width = `${(session.index / session.questions.length) * 100}%`;
  $("#practice-instruction").textContent = question.instruction;
  // 模試は指示が中国語だけなので、日本語の補足を添える。
  const hint = $("#practice-hint");
  const showHint = Boolean(session.isMock && question.hint);
  hint.textContent = showHint ? question.hint : "";
  hint.classList.toggle("is-hidden", !showHint);
  $("#practice-feedback").textContent = "";
  $("#practice-feedback").className = "answer-feedback";
  $("#practice-script").classList.add("is-hidden");
  $("#practice-script").classList.remove("writing-result-panel");
  $("#practice-script-title").textContent = "音声のスクリプト";
  $("#practice-script-audio-label").textContent = "もう一度聞く";
  $("#practice-next").classList.add("is-hidden");
  $("#practice-next").innerHTML = `次の問題へ <span>→</span>`;
  const audioButton = $("#practice-audio");
  audioButton.classList.toggle("is-hidden", question.skill !== "listening");
  audioButton.disabled = session.isMock;
  $("#practice-audio-label").textContent = session.isMock ? "自动播放" : "音声を再生";
  const isAudioQuestion = question.skill === "listening";
  $("#audio-play-count").textContent = isAudioQuestion ? (session.isMock ? "自动播放两次" : `残り${2 - (question.audioPlays || 0)}回`) : "";
  const prompt = $("#practice-prompt");
  if (question.kind === "visual-judge") prompt.innerHTML = `<div class="mock-visual" role="img" aria-label="${escapeHtml(question.visual.alt)}">${escapeHtml(question.visual.symbol)}</div>`;
  else if (question.kind === "visual-choice") prompt.innerHTML = `<div class="listening-symbol" aria-hidden="true">听</div><p class="hidden-prompt">请听录音后选择图示</p>`;
  else if (question.kind === "reading-visual-judge") prompt.innerHTML = `<h2 class="mock-reading-prompt">${escapeHtml(question.prompt)}</h2>${question.promptPinyin ? `<p class="mock-pinyin">${escapeHtml(question.promptPinyin)}</p>` : ""}<div class="mock-visual" role="img" aria-label="${escapeHtml(question.visual.alt)}">${escapeHtml(question.visual.symbol)}</div>`;
  else if (question.kind === "reading-visual-choice") prompt.innerHTML = `<h2 class="mock-reading-prompt">${escapeHtml(question.prompt)}</h2>${question.promptPinyin ? `<p class="mock-pinyin">${escapeHtml(question.promptPinyin)}</p>` : ""}`;
  else if (question.kind === "audio-judge") prompt.innerHTML = `<div class="listening-symbol" aria-hidden="true">听</div><p class="audio-judge-prompt">${escapeHtml(question.prompt)}</p>`;
  else if (question.skill === "listening") prompt.innerHTML = `<div class="listening-symbol" aria-hidden="true">听</div><p class="hidden-prompt">${session.isMock ? "请听录音后选择答案" : "文字を見ずに聞き取りましょう"}</p>`;
  else if (question.kind === "input") prompt.innerHTML = question.mockFormat
    ? `<h2 class="mock-writing-sentence">${escapeHtml(question.sentence)}</h2>`
    : `<p class="writing-hint">${escapeHtml(question.meaning)}</p><h2 class="pinyin-prompt">${escapeHtml(question.pinyin)}</h2>`;
  else if (question.kind === "reorder") prompt.innerHTML = `${question.mockFormat ? "" : `<p class="writing-hint">${escapeHtml(question.meaning)}</p>`}${question.slots ? `<div class="slot-guide">${question.slots.map((label) => `<span>${escapeHtml(label)}</span>`).join(`<b aria-hidden="true">＋</b>`)}</div>` : ""}<div id="ordered-answer" class="ordered-answer" aria-label="並べた語句" aria-live="polite"><span class="ordered-placeholder">${question.mockFormat ? "请在这里排列句子" : "ここに語順を作ります"}</span></div>`;
  // 量詞は「数詞＋量詞＋名詞」の形のまま、空いたところを埋めさせる。
  else if (question.kind === "slot") prompt.innerHTML = `
    <div class="quiz-slot-row">
      <span class="quiz-slot"><strong>${escapeHtml(question.slot.number)}</strong><small>${escapeHtml(question.slot.numberPinyin)}</small></span>
      <b aria-hidden="true">＋</b>
      <span class="quiz-slot is-blank"><strong>？</strong><small>量詞</small></span>
      <b aria-hidden="true">＋</b>
      <span class="quiz-slot"><strong>${escapeHtml(question.slot.noun)}</strong><small>${escapeHtml(question.slot.nounPinyin)}</small></span>
    </div>
    <p class="quiz-slot-meaning">${escapeHtml(question.slot.meaning)}</p>`;
  // 量詞は「何を数えるか」がまとまりなので、当てはまるものを全部選ばせる。
  else if (question.kind === "multi") prompt.innerHTML = `
    <div class="quiz-measure-head"><strong>${escapeHtml(question.prompt)}</strong><span>${escapeHtml(question.promptPinyin || "")}</span></div>
    <p class="reading-subprompt">${escapeHtml(question.subPrompt || "")}</p>`;
  else {
    const subPinyin = question.subPromptPinyin ? `<p class="mock-pinyin">${escapeHtml(question.subPromptPinyin)}</p>` : "";
    // 判断对错では、判定する文を★付きの枠に入れて本文と区別する。
    const subBlock = !question.subPrompt ? ""
      : question.kind === "reading-judge"
        ? `<div class="judge-statement"><span class="judge-star" aria-hidden="true">★</span><div><p class="reading-subprompt">${escapeHtml(question.subPrompt)}</p>${subPinyin}</div></div>`
        : `<p class="reading-subprompt">${escapeHtml(question.subPrompt)}</p>${subPinyin}`;
    prompt.innerHTML = `<h2 class="${question.kind.startsWith("reading-") ? "mock-reading-prompt" : "reading-prompt"}">${escapeHtml(question.prompt)}</h2>${question.promptPinyin ? `<p class="mock-pinyin">${escapeHtml(question.promptPinyin)}</p>` : ""}${subBlock}`;
  }
  renderPracticeAnswers(question);
  if (session.isMock && isAudioQuestion && !(question.audioPlays > 0)) window.setTimeout(() => {
    if (state.practice === session && state.practice.questions[state.practice.index]?.id === question.id && !(question.audioPlays > 0)) playPracticeAudio(true);
  }, 450);
}

function renderPracticeAnswers(question) {
  const area = $("#practice-answer-area");
  if (question.kind === "multi") {
    // 複数選択。選んでから「解答する」で答え合わせする。
    area.innerHTML = `<div class="answer-list multi-list">${question.choices.map((choice, index) => `<button class="answer-button practice-choice multi-choice" type="button" data-value="${escapeHtml(choice.value)}" data-key="${String.fromCharCode(65 + index)}"><span class="choice-main">${escapeHtml(choice.label)}</span>${choice.pinyin ? `<small class="choice-pinyin">${escapeHtml(choice.pinyin)}</small>` : ""}${choice.meaning ? `<small class="choice-meaning">${escapeHtml(choice.meaning)}</small>` : ""}</button>`).join("")}</div>
      <div class="writing-actions"><button id="multi-submit" class="primary-button" type="button">解答する（${question.correctCount}つ）</button></div>`;
    $$(".multi-choice").forEach((button) => button.addEventListener("click", () => {
      if (state.practice.answered) return;
      button.classList.toggle("is-selected");
      button.setAttribute("aria-pressed", String(button.classList.contains("is-selected")));
    }));
    $("#multi-submit").addEventListener("click", () => {
      const picked = $$(".multi-choice.is-selected").map((button) => button.dataset.value);
      if (!picked.length) return;
      answerPractice(multiAnswerValue(question, picked), $("#multi-submit"));
    });
  } else if (question.choices) {
    const kindClass = { slot: " slot-choice", "slot-de": " de-choice" }[question.kind] || "";
    area.innerHTML = `<div class="answer-list${kindClass ? " chip-list" : ""}">${question.choices.map((choice, index) => `<button class="answer-button practice-choice${kindClass}${/^\p{Extended_Pictographic}/u.test(choice.label) ? " visual-choice-button" : ""}" type="button" data-value="${escapeHtml(choice.value)}" data-key="${String.fromCharCode(65 + index)}"${choice.ariaLabel ? ` aria-label="${escapeHtml(choice.ariaLabel)}"` : ""}><span class="choice-main">${escapeHtml(choice.label)}</span>${choice.pinyin ? `<small class="choice-pinyin">${escapeHtml(choice.pinyin)}</small>` : ""}${choice.note ? `<small class="choice-note">${escapeHtml(choice.note)}</small>` : ""}</button>`).join("")}</div>`;
    $$(".practice-choice").forEach((button) => button.addEventListener("click", () => answerPractice(button.dataset.value, button)));
  } else if (question.kind === "reorder") {
    question.selected = [];
    const shuffledTokens = shuffle(question.tokens.map((token, index) => ({ token, index })));
    area.innerHTML = `<div class="token-bank" aria-label="並べ替える語句">${shuffledTokens.map((item) => `<button type="button" class="word-token" draggable="true" data-token-index="${item.index}">${escapeHtml(item.token)}</button>`).join("")}</div><p class="drag-help">クリックで追加／ドラッグで順番を入れ替え</p><div class="writing-actions"><button id="reset-order" class="secondary-button" type="button">${question.mockFormat ? "重新排列" : "やり直す"}</button><button id="submit-order" class="primary-button" type="button">${question.mockFormat ? "提交答案" : "解答する"}</button></div>`;
    setupReorderInteraction(question);
    $("#reset-order").addEventListener("click", () => renderPracticeQuestion());
    $("#submit-order").addEventListener("click", () => {
      if (!question.selected.length) return;
      answerPractice(reorderAnswer(question), $("#submit-order"));
    });
  } else {
    area.innerHTML = `<form id="writing-form" class="writing-form"><label for="writing-input">${question.mockFormat ? "请写一个汉字" : "漢字で入力"}</label><input id="writing-input" type="text" lang="zh-CN" autocomplete="off" placeholder="${question.mockFormat ? "输入汉字" : "答えを入力"}" /><button class="primary-button" type="submit">${question.mockFormat ? "提交答案" : "解答する"}</button></form>`;
    $("#writing-form").addEventListener("submit", (event) => { event.preventDefault(); answerPractice($("#writing-input").value, $("#writing-form button")); });
    $("#writing-input").focus();
  }
}

function reorderAnswer(question) {
  return question.selected.map((index) => question.tokens[index]).join("");
}

function setupReorderInteraction(question) {
  const bank = $(".token-bank");
  const answer = $("#ordered-answer");
  if (!bank || !answer) return;
  let draggedElement = null;

  const render = () => {
    const selected = new Set(question.selected);
    bank.querySelectorAll(".word-token").forEach((button) => {
      button.disabled = selected.has(Number(button.dataset.tokenIndex));
    });
    answer.classList.toggle("has-tokens", question.selected.length > 0);
    answer.innerHTML = question.selected.length
      ? question.selected.map((index) => `<button type="button" class="word-token selected-token" draggable="true" data-token-index="${index}" aria-label="${escapeHtml(question.tokens[index])}を移動または候補に戻す">${escapeHtml(question.tokens[index])}</button>`).join("")
      : `<span class="ordered-placeholder">${question.mockFormat ? "请在这里排列句子" : "ここに語順を作ります"}</span>`;
  };

  const addToken = (index) => {
    if (!question.selected.includes(index)) question.selected.push(index);
    render();
  };
  const removeToken = (index) => {
    question.selected = question.selected.filter((selectedIndex) => selectedIndex !== index);
    render();
  };
  const moveToken = (index, beforeIndex = null) => {
    if (index === beforeIndex) return;
    const next = question.selected.filter((selectedIndex) => selectedIndex !== index);
    const position = beforeIndex === null ? next.length : next.indexOf(beforeIndex);
    next.splice(position < 0 ? next.length : position, 0, index);
    question.selected = next;
    render();
  };
  const clearDragState = () => {
    draggedElement?.classList.remove("is-dragging");
    draggedElement = null;
    bank.classList.remove("is-drag-over");
    answer.classList.remove("is-drag-over");
  };
  const beginDrag = (event) => {
    const token = event.target.closest(".word-token");
    if (!token || token.disabled || state.practice.answered) return;
    draggedElement = token;
    token.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", token.dataset.tokenIndex);
  };

  bank.addEventListener("click", (event) => {
    const token = event.target.closest(".word-token");
    if (token && !token.disabled && !state.practice.answered) addToken(Number(token.dataset.tokenIndex));
  });
  answer.addEventListener("click", (event) => {
    const token = event.target.closest(".selected-token");
    if (token && !state.practice.answered) removeToken(Number(token.dataset.tokenIndex));
  });
  bank.addEventListener("dragstart", beginDrag);
  answer.addEventListener("dragstart", beginDrag);
  [bank, answer].forEach((container) => container.addEventListener("dragend", clearDragState));
  answer.addEventListener("dragover", (event) => {
    if (state.practice.answered) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    answer.classList.add("is-drag-over");
  });
  answer.addEventListener("drop", (event) => {
    event.preventDefault();
    const index = Number(event.dataTransfer.getData("text/plain"));
    const target = event.target.closest(".selected-token");
    const beforeIndex = target ? Number(target.dataset.tokenIndex) : null;
    if (Number.isInteger(index)) moveToken(index, beforeIndex);
    clearDragState();
  });
  bank.addEventListener("dragover", (event) => {
    if (state.practice.answered) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    bank.classList.add("is-drag-over");
  });
  bank.addEventListener("drop", (event) => {
    event.preventDefault();
    const index = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(index)) removeToken(index);
    clearDragState();
  });
  render();
}

function answerPractice(value, selectedButton) {
  const session = state.practice;
  if (session.answered) return;
  const question = session.questions[session.index];
  const correct = normalizeAnswer(value) === normalizeAnswer(question.correct ?? question.answer);
  session.answered = true;
  question.userAnswer = value;
  question.isCorrect = correct;
  session.correct += correct ? 1 : 0;
  session.sectionStats[question.skill] ||= { answered: 0, correct: 0 };
  session.sectionStats[question.skill].answered += 1;
  session.sectionStats[question.skill].correct += correct ? 1 : 0;
  const word = findQuestionWord(question);
  const level = word?.level || session.level;
  state.progress.answered += 1;
  state.progress.correct += correct ? 1 : 0;
  state.progress.byLevel[level].answered += 1;
  state.progress.byLevel[level].correct += correct ? 1 : 0;
  if (word) state.progress.mistakes[word.id] = correct ? Math.max(0, (state.progress.mistakes[word.id] || 0) - 1) : (state.progress.mistakes[word.id] || 0) + 1;
  recordStudy(word, correct, question.skill);
  if (question.kind === "multi") {
    const answers = new Set(String(question.correct).split("、"));
    $$(".multi-choice").forEach((button) => {
      button.disabled = true;
      if (answers.has(button.dataset.value)) button.classList.add("is-correct");
      else if (button.classList.contains("is-selected")) button.classList.add("is-wrong");
    });
    $("#multi-submit").disabled = true;
  } else if (question.choices) {
    $$(".practice-choice").forEach((button) => {
      button.disabled = true;
      if (normalizeAnswer(button.dataset.value) === normalizeAnswer(question.correct)) button.classList.add("is-correct");
    });
    if (!correct) selectedButton?.classList.add("is-wrong");
  } else {
    $$(".practice-answer-area button, .practice-answer-area input").forEach((element) => { element.disabled = true; });
    if (question.kind === "reorder") {
      $$("#ordered-answer .word-token").forEach((element) => { element.disabled = true; });
      $("#ordered-answer")?.classList.add("is-locked");
    }
  }
  if (question.skill === "writing") {
    // 正解の文と訳はパネルに出すので、ここには解説（文法ドリルのみ）を添える。
    const detail = !session.isMock && question.explanation ? ` ${question.explanation}` : "";
    $("#practice-feedback").textContent = `${correct ? "正解！" : "正解を確認しましょう。"}${detail}`;
    $("#practice-feedback").classList.add(correct ? "correct" : "wrong");
    revealWritingAnswer(question);
  } else if (!session.isMock) {
    $("#practice-feedback").textContent = correct ? `正解！ ${question.explanation || question.answer}` : `正解：${question.explanation || question.answer}`;
    $("#practice-feedback").classList.add(correct ? "correct" : "wrong");
    if (question.skill === "listening") enableListeningReplay(question);
  } else if (question.skill === "listening") {
    revealListeningScript(question);
  }
  saveProgress();
  const next = session.questions[session.index + 1];
  if (session.isMock && next && next.skill !== question.skill) $("#practice-next").innerHTML = `${SKILL_LABELS[next.skill]}へ進む <span>→</span>`;
  $("#practice-next").classList.remove("is-hidden");
  $("#practice-next").focus();
}

// 解答が済んだ聴解問題は、回数制限なしで聞き直せるようにする。
function enableListeningReplay(question) {
  question.scriptRevealed = true;
  $("#practice-audio").disabled = false;
  $("#practice-audio-label").textContent = "もう一度聞く";
  $("#audio-play-count").textContent = "";
}

// 模試は解説を出さないので、答えたあとに原文を見せて勉強できるようにする。
function revealListeningScript(question) {
  const panel = $("#practice-script");
  const body = $("#practice-script-body");
  if (!panel || !body) return;
  body.innerHTML = question.audioWord
    ? `<p class="script-line"><span class="script-role">単</span>${escapeHtml(question.audioWord.hanzi)}（${escapeHtml(question.audioWord.pinyin)}）</p>`
    : scriptLinesHtml(question.audioText || "");
  panel.classList.remove("is-hidden");
  enableListeningReplay(question);
}

function writingAnswerSentence(question) {
  if (question.kind === "input") return String(question.sentence || "").replace(/（[^）]+）/, question.answer || "");
  return question.answer || "";
}

function revealWritingAnswer(question) {
  const panel = $("#practice-script");
  const body = $("#practice-script-body");
  if (!panel || !body) return;
  $("#practice-script-title").textContent = "正解と日本語の意味";
  $("#practice-script-audio-label").textContent = "正解を聞く";
  body.innerHTML = `<div class="writing-result-answer"><span>正解</span><strong lang="zh-CN">${escapeHtml(writingAnswerSentence(question))}</strong></div>
    <div class="writing-result-meaning"><span>意味</span><p>${escapeHtml(question.meaning || "日本語訳はありません")}</p></div>`;
  panel.classList.add("writing-result-panel");
  panel.classList.remove("is-hidden");
}

export function playPracticeReviewAudio() {
  const question = state.practice.questions[state.practice.index];
  const button = $("#practice-script-audio");
  if (!question || !button) return;
  if (question.skill !== "writing") return playPracticeAudio(false);
  const text = writingAnswerSentence(question);
  if (question.answerAudioFile) playAudioFile(question.answerAudioFile, button, { fallbackText: text, role: "female", fallbackRate: .86, baseRate: 1 });
  else {
    stopAudio();
    speakWithBrowser(text, button, { rate: .86, role: "female" });
  }
}

function scriptLinesHtml(text) {
  const roles = { 男: "男", 女: "女", 问: "問" };
  const parts = [...String(text).matchAll(/([男女问])：([\s\S]*?)(?=(?:男|女|问)：|$)/g)];
  if (!parts.length) return `<p class="script-line">${escapeHtml(text)}</p>`;
  return parts.map(([, role, line]) => `<p class="script-line"><span class="script-role">${roles[role] || role}</span>${escapeHtml(line.trim())}</p>`).join("");
}

export function nextPracticeQuestion() {
  state.practice.index += 1;
  if (state.practice.index >= state.practice.questions.length) finishPractice(); else renderPracticeQuestion();
}

export function playPracticeAudio(autoRepeat = false) {
  const question = state.practice.questions[state.practice.index];
  if (!question || (question.audioPlays >= 2 && !question.scriptRevealed)) return;
  question.audioPlays = (question.audioPlays || 0) + 1;
  const button = $("#practice-audio");
  if (question.audioWord) {
    speak(question.audioWord, button);
  } else if (question.audioFile) {
    const rate = state.practice.isMock ? 1 : 1;
    const shouldRepeat = autoRepeat && question.audioPlays < 2;
    playAudioFile(question.audioFile, button, { fallbackText: question.audioText, dialogue: question.kind.includes("dialogue"), role: "narrator", fallbackRate: rate, baseRate: rate, lockRate: state.practice.isMock, onEnded: shouldRepeat ? () => window.setTimeout(() => playPracticeAudio(false), 420) : null });
  } else {
    stopAudio();
    const rate = state.practice.isMock ? ({ 1: .72, 2: .78, 3: .84 }[state.practice.level] || .78) : .76;
    if (question.kind === "audio-dialogue") speakDialogue(question.audioText, button, rate);
    else speakWithBrowser(question.audioText, button, { rate, role: "narrator" });
  }
  if (question.scriptRevealed) {
    $("#audio-play-count").textContent = "";
    return;
  }
  $("#audio-play-count").textContent = state.practice.isMock ? (question.audioPlays < 2 ? "正在按考试速度播放" : "已播放两次") : `残り${2 - question.audioPlays}回`;
  // 解答済み・次の問題へ進んだあとにこのタイマーが効いてボタンを塞がないようにする。
  if (question.audioPlays >= 2) window.setTimeout(() => {
    if (question.scriptRevealed || state.practice.questions[state.practice.index] !== question) return;
    button.disabled = true;
  }, 100);
}

export function finishPractice(timedOut = Boolean(state.practice.timedOutSections?.length)) {
  const session = state.practice;
  clearPracticeTimer();
  stopAudio();
  $("#practice-timer").classList.add("is-hidden");
  const attempted = Object.values(session.sectionStats).reduce((sum, item) => sum + item.answered, 0);
  $("#practice-result-mark").textContent = timedOut ? "時" : (session.isMock ? "試" : "成");
  $("#practice-result-title").textContent = "トレーニング完了";
  if (session.isMock) {
    const config = EXAM_CONFIG[session.level];
    const skills = session.section ? [session.section] : ["listening", "reading", ...(session.level === 3 ? ["writing"] : [])];
    // 模試では未回答も不正解として扱い、各技能を100点満点に換算する。
    const scores = skills.map((skill) => Math.round(((session.sectionStats[skill]?.correct || 0) / config[skill]) * 100));
    const total = scores.reduce((sum, score) => sum + score, 0);
    const maxScore = skills.length * 100;
    // 合格基準は全体で6割。セクション別練習も同じ6割を目安にする。
    const passMark = session.section ? 60 : config.passScore;
    const passed = total >= passMark;
    $("#practice-result-title").textContent = session.section ? `HSK ${session.level} ${SKILL_LABELS[session.section]}の結果` : `HSK ${session.level} 模試結果`;
    $("#practice-result-score").textContent = total;
    $("#practice-result-unit").textContent = `/ ${maxScore} 点`;
    $("#practice-result-subtitle").textContent = passed ? "合格ライン到達" : "合格まであと少し";
    $("#practice-result-message").textContent = timedOut ? "時間切れです。振り返りから復習しましょう。" : (passed ? "合格ラインです。太棒了！" : `目安は${passMark}点です。振り返りで弱いところを確認しましょう。`);
    $("#practice-breakdown").innerHTML = skills.map((skill, index) => `<div><span>${SKILL_LABELS[skill]}</span><strong>${scores[index]}</strong><small>/ 100</small></div>`).join("");
    state.progress.mocks.unshift({ date: localDateKey(), level: session.level, score: total, maxScore, passed, ...(session.section ? { section: session.section } : {}) });
    state.progress.mocks = state.progress.mocks.slice(0, 10);
    saveProgress();
  } else {
    $("#practice-result-score").textContent = session.correct;
    $("#practice-result-unit").textContent = `/ ${attempted} 問`;
    $("#practice-result-subtitle").textContent = "今回の結果";
    $("#practice-result-message").textContent = attempted && session.correct / attempted >= .8 ? "よくできました！次の技能にも挑戦しましょう。" : "間違えた単語は間隔反復に追加しました。";
    $("#practice-breakdown").innerHTML = Object.entries(session.sectionStats).map(([skill, data]) => `<div><span>${SKILL_LABELS[skill]}</span><strong>${data.correct}</strong><small>/ ${data.answered}</small></div>`).join("");
  }
  setReview("practice", buildPracticeReview(session));
  showView("practice-result");
  updateSummary();
}

export function retryPractice() {
  const last = state.practice.lastStart;
  if (!last) return navigate("exam");
  if (last.isMock) startMockExam(last.level, last.section);
  else if (last.guideId === "measure") startMeasurePractice();
  else if (last.guideId) startGuidePractice(last.guideId);
  else if (last.categoryId) startCategoryPractice(last.mode, last.categoryId);
  else if (last.checked) startCheckedPractice(last.mode);
  else startPractice(last.mode, last.level);
}

export function closePractice() {
  clearPracticeTimer();
  stopAudio();
  navigate("exam");
}

export function clearPracticeTimer() {
  if (state.practice.timerId) window.clearInterval(state.practice.timerId);
  state.practice.timerId = null;
}
