#!/usr/bin/env node
/**
 * Сторож: каждый файл, на который ссылается таблица голосов (content/learning-v2-course/audio/en/single-voice-v1.json),
 * закоммичен и совпадает с записанным contentHash.
 *
 * зачем (координатор 18.10, Ядро нашло): перенос L04 s17–s56 записал в таблицу новые хеши 4 перезаписанных клипов,
 * а сами файлы (статус M) не закоммитил — скрипт коммитил только новые (??). HEAD стал несогласован, и перекодирование
 * Ядра на снимке HEAD остановилось. Запускать ПЕРЕД коммитом таблицы: любой файл таблицы, который не закоммичен,
 * изменён в рабочей копии или не совпадает по хешу, — СТОП.
 *
 * Запуск: node scripts/check_learning_v2_single_voice_committed.mjs
 * Логи: префикс [V2-VOICE-COMMITTED].
 */
import crypto from "node:crypto";
import fs from "node:fs";
import { execFileSync } from "node:child_process";

const LOG = "[V2-VOICE-COMMITTED]";
const indexPath = "content/learning-v2-course/audio/en/single-voice-v1.json";

const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
const paths = new Map();
for (const assignment of Object.values(index.assignments ?? {})) {
  for (const clip of assignment.clips ?? []) {
    if (clip.assetPath && !paths.has(clip.assetPath)) paths.set(clip.assetPath, clip.contentHash);
  }
}

const porcelain = execFileSync("git", ["-c", "core.quotepath=false", "status", "--porcelain", "-uall", "--",
  "assets/audio/learning-v2/authoring-single-voice-v1", "assets/audio/learning-v2/factory-production-v1"],
  { encoding: "utf8", maxBuffer: 1 << 26 });
const dirty = new Map();
for (const line of porcelain.split("\n").filter(Boolean)) dirty.set(line.slice(3).trim(), line.slice(0, 2));

const problems = [];
for (const [assetPath, contentHash] of paths) {
  if (!fs.existsSync(assetPath)) { problems.push(`${assetPath}: файла нет`); continue; }
  const status = dirty.get(assetPath);
  if (status) problems.push(`${assetPath}: не закоммичен (статус «${status}»)`);
  const actual = crypto.createHash("sha256").update(fs.readFileSync(assetPath)).digest("hex");
  if (actual !== contentHash) problems.push(`${assetPath}: хеш ${actual.slice(0, 12)} ≠ таблица ${String(contentHash).slice(0, 12)}`);
}

console.log(`${LOG} файлов в таблице ${paths.size}, проблем ${problems.length}`);
for (const problem of problems.slice(0, 20)) console.log(`${LOG}   ${problem}`);
if (problems.length) {
  console.log(`${LOG} СТОП: закоммить перечисленные файлы (или верни таблицу) до коммита таблицы голосов`);
  process.exit(1);
}
console.log(`${LOG} PASS`);
