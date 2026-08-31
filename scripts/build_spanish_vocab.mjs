#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = { a1: 150, a2: 150, b1: 300 };
const seen = new Set();

for (const [level, expected] of Object.entries(config)) {
  const source = fs.readFileSync(path.join(appDir, "scripts", "spanish_vocab", `${level}.tsv`), "utf8");
  const rows = source.split(/\r?\n/).map((line) => line.trim()).filter((line) => line && !line.startsWith("#")).map((line, index) => {
    const [word, meaning, pos, category] = line.split("|").map((value) => value.trim());
    if (!word || !meaning || !pos || !category) throw new Error(`${level}:${index + 1} の列が不足しています`);
    const key = word.toLocaleLowerCase("es");
    if (seen.has(key)) throw new Error(`重複語: ${word}`);
    seen.add(key);
    return { id: `dele-${level}-${String(index + 1).padStart(3, "0")}`, word, meaning, pos, category, level: level.toUpperCase() };
  });
  if (rows.length !== expected) throw new Error(`${level.toUpperCase()} は ${expected}語必要ですが、${rows.length}語です`);
  fs.writeFileSync(path.join(appDir, "data", `dele-${level}.json`), `${JSON.stringify(rows, null, 2)}\n`);
  console.log(`${level.toUpperCase()}: ${rows.length}語`);
}
console.log(`合計: ${seen.size}語`);
