// app.js から機能ごとに切り出したモジュール。生成物ではなく、以降はこのファイルを直接編集する。
import { $, $$, escapeHtml } from "../shared.js";
import { state } from "./state.js";

export let activeAudio = null;

let speechRunId = 0;

export function bindWordRowAudio(container) {
  if (!container) return;
  container.querySelectorAll("[data-word-id]").forEach((button) => button.addEventListener("click", () => {
    speak(state.words.find((item) => item.id === button.dataset.wordId), button);
  }));
  container.querySelectorAll("[data-example-id]").forEach((button) => button.addEventListener("click", () => {
    const word = state.words.find((item) => item.id === button.dataset.exampleId);
    playAudioFile(exampleAudioFile(word), button, { fallbackText: word?.example, role: "female" });
  }));
}

export function speakButtonHtml(text, label) {
  return `<button class="phrase-audio" type="button" data-speak="${escapeHtml(text)}" aria-label="${escapeHtml(label)}"><span aria-hidden="true">▶</span></button>`;
}

export function exampleAudioFile(word) { return word?.id ? `audio/sentences/example-${word.id}.m4a` : ""; }

export function speak(word, button) {
  if (!word?.hanzi) return;
  playAudioFile(`audio/${encodeURIComponent(word.id)}.m4a`, button, { fallbackText: word.hanzi, role: "female" });
}

export function playAudioFile(file, button, options = {}) {
  if (!file) return speakWithBrowser(options.fallbackText, button, { rate: options.fallbackRate || .78, role: options.role || "female" });
  stopAudio();
  button?.classList.add("is-playing");
  const audio = new Audio(`${file}?v=aac48`);
  const playbackRate = options.lockRate ? (options.baseRate || 1) : Math.max(.7, Math.min(1.3, (options.baseRate || 1) * state.audioSpeed));
  audio.playbackRate = playbackRate;
  audio.preservesPitch = true;
  activeAudio = audio;
  audio.addEventListener("ended", () => {
    finishAudioButton(button);
    if (typeof options.onEnded === "function") options.onEnded();
  }, { once: true });
  let fallbackStarted = false;
  const startFallback = () => {
    if (fallbackStarted) return;
    fallbackStarted = true;
    finishAudioButton(button);
    if (options.dialogue) speakDialogue(options.fallbackText, button, (options.fallbackRate || .78) * state.audioSpeed);
    else speakWithBrowser(options.fallbackText, button, { rate: (options.fallbackRate || .78) * state.audioSpeed, role: options.role || "female" });
  };
  audio.addEventListener("error", startFallback, { once: true });
  audio.play().catch(startFallback);
}

export function stopAudio() {
  speechRunId += 1;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  $$(".is-playing").forEach((button) => button.classList.remove("is-playing"));
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
}

function finishAudioButton(button) {
  button?.classList.remove("is-playing");
  activeAudio = null;
}

export function speakWithBrowser(text, button, options = {}) {
  speakSegments([{ text, role: options.role || "female" }], button, options.rate || .78);
}

export function speakDialogue(text, button, rate = .78) {
  const segments = [];
  const pattern = /([男女问])：([\s\S]*?)(?=(?:男|女|问)：|$)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match[1] === "问") segments.push({ text: "Question", role: "cue" });
    segments.push({ text: match[2].trim(), role: match[1] === "男" ? "male" : (match[1] === "女" ? "female" : "narrator") });
  }
  speakSegments(segments.length ? segments : [{ text, role: "narrator" }], button, rate);
}

function speakSegments(segments, button, rate = .78) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const runId = ++speechRunId;
  button?.classList.add("is-playing");
  let index = 0;
  const playNext = () => {
    if (runId !== speechRunId) return;
    const segment = segments[index];
    if (!segment) return finishAudioButton(button);
    const utterance = new SpeechSynthesisUtterance(cleanSpeechText(segment.text));
    utterance.lang = segment.role === "cue" ? "en-US" : "zh-CN";
    utterance.rate = segment.role === "cue" ? Math.max(.8, rate) : rate;
    utterance.pitch = segment.role === "male" ? .92 : (segment.role === "female" ? 1.04 : 1);
    utterance.volume = 1;
    utterance.voice = segment.role === "cue" ? selectEnglishVoice() : selectChineseVoice(segment.role);
    utterance.onend = () => {
      if (runId !== speechRunId) return;
      index += 1;
      if (index >= segments.length) return finishAudioButton(button);
      const nextRole = segments[index].role;
      window.setTimeout(playNext, nextRole === "cue" ? 1200 : 450);
    };
    utterance.onerror = () => { if (runId === speechRunId) finishAudioButton(button); };
    window.speechSynthesis.speak(utterance);
  };
  playNext();
}

function selectEnglishVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((voice) => voice.name.includes("Samantha")) || voices.find((voice) => /^en[-_]US$/i.test(voice.lang)) || null;
}

function selectChineseVoice(role) {
  const voices = window.speechSynthesis.getVoices();
  const mainland = voices.filter((voice) => /^zh[-_]CN$/i.test(voice.lang));
  const chinese = mainland.length ? mainland : voices.filter((voice) => /^zh/i.test(voice.lang));
  // 収録済み音声と同じ Tingting を優先する（Sandyは音声データ未取得の端末で低品質になる）。
  const preferred = role === "male" ? ["Reed", "Eddy", "Rocko"] : (role === "female" ? ["Tingting", "Ting-Ting", "Flo", "Shelley"] : ["Tingting", "Ting-Ting", "Flo"]);
  return preferred.map((name) => chinese.find((voice) => voice.name.includes(name))).find(Boolean) || chinese[0] || null;
}

function cleanSpeechText(text) {
  return String(text || "").replace(/^[男女问]：/, "").replace(/＿＿＿/g, "什么").trim();
}
