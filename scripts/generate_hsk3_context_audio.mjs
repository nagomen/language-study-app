#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const voice = process.env.HSK_AUDIO_VOICE || "Tingting";
const words = JSON.parse(fs.readFileSync(path.join(root, "data/chinese/hsk3.json"), "utf8"))
  .filter((word) => word.exampleKind === "context");
const manifestFile = path.join(root, "audio/context-manifest.json");
let previous = { items: {} };
try { previous = JSON.parse(fs.readFileSync(manifestFile, "utf8")); } catch {}

const jobs = words.flatMap((word) => [
  { id: word.id, text: word.hanzi, file: path.join(root, `audio/${word.id}.wav`), rate: 150, type: "word" },
  { id: `example-${word.id}`, text: word.example, file: path.join(root, `audio/sentences/example-${word.id}.wav`), rate: 158, type: "example" },
]);
for (const job of jobs) job.checksum = crypto.createHash("sha256").update(JSON.stringify({ voice, rate: job.rate, text: job.text })).digest("hex");

function say(job) {
  if (previous.items?.[job.id]?.checksum === job.checksum && fs.existsSync(job.file) && fs.statSync(job.file).size > 256) return Promise.resolve({ ...job, reused: true });
  return new Promise((resolve, reject) => {
    const child = spawn("say", ["-v", voice, "-r", String(job.rate), "-o", job.file, "--file-format=WAVE", "--data-format=LEI16@22050", job.text]);
    let error = "";
    child.stderr.on("data", (chunk) => { error += chunk; });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve({ ...job, reused: false }) : reject(new Error(error || `say exited with ${code}`)));
  });
}

const results = [];
let cursor = 0;
async function worker() {
  while (cursor < jobs.length) {
    const index = cursor++;
    results[index] = await say(jobs[index]);
    if ((index + 1) % 50 === 0) console.log(`${index + 1} / ${jobs.length} 音声を処理`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));

const items = Object.fromEntries(results.map((item) => [item.id, {
  text: item.text, type: item.type, voice, rate: item.rate, checksum: item.checksum,
  file: path.relative(root, item.file),
}]));
fs.writeFileSync(manifestFile, `${JSON.stringify({ version: 1, format: "wav", sampleRate: 22050, generatedAt: new Date().toISOString(), counts: { total: results.length, generated: results.filter((item) => !item.reused).length, reused: results.filter((item) => item.reused).length }, items }, null, 2)}\n`);
console.log(`HSK3文脈例文: ${words.length}語・${results.length}音声を収録（新規${results.filter((item) => !item.reused).length}）。`);
