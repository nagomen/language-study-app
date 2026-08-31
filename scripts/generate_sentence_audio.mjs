#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { spawn } from "node:child_process";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(appDir, "audio", "sentences");
const manifestPath = path.join(appDir, "audio", "manifest.json");
const temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), "hsk-sentence-audio-"));
// 収録済み音声はすべて Tingting で生成されている。Sandy などの新しい声は音声データが
// 端末にダウンロードされていないと低品質な代替音で合成されるため、既定は Tingting とする。
const femaleVoice = process.env.HSK_SENTENCE_FEMALE_VOICE || "Tingting";
const maleVoice = process.env.HSK_SENTENCE_MALE_VOICE || "Tingting";
const force = process.env.HSK_SENTENCE_AUDIO_FORCE === "1";
const engineVersion = "apple-natural-v1";

fs.mkdirSync(outputDir, { recursive: true });

const sandbox = {
  console: { log() {}, error() {} },
  document: { addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } },
  window: {}, localStorage: { getItem() { return null; } }, Audio: function Audio() {},
  SpeechSynthesisUtterance: function SpeechSynthesisUtterance() {}, setTimeout,
};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(appDir, "app.js"), "utf8"), sandbox);
const banks = JSON.parse(vm.runInContext("JSON.stringify({ responses: MOCK_RESPONSE_BANK, dialogues: MOCK_DIALOGUE_BANK })", sandbox));

const words = [1, 2, 3].flatMap((level) => JSON.parse(fs.readFileSync(path.join(appDir, "data", `hsk${level}.json`), "utf8")).map((word) => ({ ...word, level })));
const mockQuestions = [1, 2, 3].flatMap((level) => {
  const form = JSON.parse(fs.readFileSync(path.join(appDir, "data", `mock-hsk${level}.json`), "utf8"));
  return form.questions.filter((question) => question.skill === "listening").map((question) => ({ ...question, level }));
});
const pad = (value) => String(value).padStart(3, "0");
const parseDialogue = (text) => {
  const segments = [];
  const pattern = /([男女问])：([\s\S]*?)(?=(?:男|女|问)：|$)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    segments.push({ role: match[1] === "男" ? "male" : (match[1] === "女" ? "female" : "narrator"), text: match[2].trim() });
  }
  return segments;
};

const catalog = [
  ...words.filter((word) => word.example).map((word) => ({
    id: `example-${word.id}`, type: "example", level: word.level, text: word.example,
    segments: [{ role: "female", text: word.example }],
  })),
  ...banks.responses.map((item, index) => ({
    id: `mock-response-${pad(index + 1)}`, type: "mock-response", level: item.level, text: item.prompt,
    segments: [{ role: "female", text: item.prompt }],
  })),
  ...banks.dialogues.map((item, index) => ({
    id: `mock-dialogue-${pad(index + 1)}`, type: "mock-dialogue", level: item.level, text: item.audio,
    segments: parseDialogue(item.audio),
  })),
  ...mockQuestions.map((item) => ({
    id: item.id, type: "mock-v2", level: item.level, text: item.audioText,
    segments: item.kind.includes("dialogue") ? parseDialogue(item.audioText) : [{ role: "female", text: item.audioText }],
  })),
];

let previous = { items: {} };
try { previous = JSON.parse(fs.readFileSync(manifestPath, "utf8")); } catch {}

function checksum(item) {
  return crypto.createHash("sha256").update(JSON.stringify({ engineVersion, femaleVoice, maleVoice, level: item.level, segments: item.segments })).digest("hex");
}

function runSay(text, voice, outputFile, rate, attempt = 1) {
  return new Promise((resolve, reject) => {
    const child = spawn("say", ["-v", voice, "-r", String(rate), "-o", outputFile, "--file-format=WAVE", "--data-format=LEI16@44100", text]);
    let error = "";
    // まれに say が応答しなくなるため、一定時間で打ち切って再試行する。
    const timer = setTimeout(() => { child.kill("SIGKILL"); }, 60000);
    child.stderr.on("data", (chunk) => { error += chunk; });
    child.on("error", (cause) => { clearTimeout(timer); reject(cause); });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) return resolve();
      if (attempt < 3) {
        console.log(`  再試行 ${attempt + 1}/3: ${text}`);
        return resolve(runSay(text, voice, outputFile, rate, attempt + 1));
      }
      reject(new Error(error || `say exited with ${code}`));
    });
  });
}

function extractPcm(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WAVE") throw new Error("invalid WAV file");
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const name = buffer.toString("ascii", offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (name === "data") return buffer.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + (size % 2);
  }
  throw new Error("WAV data chunk was not found");
}

function makeWave(pcm) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + pcm.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(44100, 24); header.writeUInt32LE(88200, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

async function generate(item) {
  const outputFile = path.join(outputDir, `${item.id}.wav`);
  const itemChecksum = checksum(item);
  if (!force && previous.items?.[item.id]?.checksum === itemChecksum && fs.existsSync(outputFile) && fs.statSync(outputFile).size > 44) return { ...item, checksum: itemChecksum, file: `audio/sentences/${item.id}.wav`, skipped: true };
  const rate = ({ 1: 145, 2: 152, 3: 158 }[item.level] || 150);
  const pcmParts = [];
  for (let index = 0; index < item.segments.length; index += 1) {
    const segment = item.segments[index];
    const segmentFile = path.join(temporaryDir, `${item.id}-${index}.wav`);
    await runSay(segment.text, segment.role === "male" ? maleVoice : femaleVoice, segmentFile, rate);
    pcmParts.push(extractPcm(fs.readFileSync(segmentFile)));
    if (index < item.segments.length - 1) {
      const nextIsQuestion = item.segments[index + 1].role === "narrator";
      pcmParts.push(Buffer.alloc(Math.round(44100 * (nextIsQuestion ? .55 : .28)) * 2));
    }
  }
  fs.writeFileSync(outputFile, makeWave(Buffer.concat(pcmParts)));
  return { ...item, checksum: itemChecksum, file: `audio/sentences/${item.id}.wav`, skipped: false };
}

const results = [];
try {
  for (let index = 0; index < catalog.length; index += 1) {
    results.push(await generate(catalog[index]));
    if ((index + 1) % 20 === 0 || index + 1 === catalog.length) console.log(`${index + 1} / ${catalog.length} 音声を処理`);
  }
  const items = Object.fromEntries(results.map(({ skipped, segments, ...item }) => [item.id, { ...item, voices: [...new Set(segments.map((segment) => segment.role === "male" ? maleVoice : femaleVoice))] }]));
  fs.writeFileSync(manifestPath, `${JSON.stringify({ version: 1, engineVersion, sampleRate: 44100, format: "wav", generatedAt: new Date().toISOString(), counts: { total: results.length, generated: results.filter((item) => !item.skipped).length, reused: results.filter((item) => item.skipped).length }, items }, null, 2)}\n`);
  console.log(`完了: ${results.length}件（生成${results.filter((item) => !item.skipped).length} / 再利用${results.filter((item) => item.skipped).length}）`);
} finally {
  fs.rmSync(temporaryDir, { recursive: true, force: true });
}
