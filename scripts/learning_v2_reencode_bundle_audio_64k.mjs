#!/usr/bin/env node
/**
 * Перекодирование звука Learning V2, который едет в сборку, в mp3 64 кбит/с моно 24 кГц — повторяемо.
 *
 * зачем (координатор 17.10, размер сборки): набор звука V2 — 4,3 тыс. mp3 по 128 кбит/с моно 24 кГц (~133 МБ),
 * загрузка из Play выходила ~185–195 МБ при лимите 200. Для речи 24 кГц моно 64 кбит/с практически неотличимо
 * и вдвое меньше. Решение координатора: 64 (не 48), проверка на слух у Сверки, коммит по его слову; скрипт —
 * последним шагом после финального переноса V2, повторный прогон ничего не меняет (файлы ≤ 64 кбит/с пропускаются).
 *
 * Что делает в дереве ROOT (по умолчанию — корень репозитория; --root <папка> — временная копия):
 *   1) берёт файлы, которые реально едут в сборку (app/learning_v2_bootstrap_audio_assets_v1.generated.ts),
 *      и их исходники: клипы таблицы одного голоса (content/learning-v2-course/audio/en/single-voice-v1.json)
 *      и записи старого манифеста (assets/audio/learning-v2/factory-production-v1/manifest.json);
 *   2) исходник с битрейтом > 64 кбит/с перекодирует на месте (атомарно), одинаковые байты — один раз;
 *   3) в обеих таблицах меняет contentHash/byteSize перекодированных файлов (sha256 новых байт);
 *   4) пересобирает модули: записи фабрики, таблица одного голоса, индекс прогрева, набор сборки — и их --check.
 * Звуковые одобрения (scripts/learning_v2_owner_approved_audio_evidence.v1.json) ключуются audioTargetId — хеш там нет.
 * Исходники в папке Codex не читаются и не трогаются. Журнал [V2-REENCODE].
 *
 * Запуск: node scripts/learning_v2_reencode_bundle_audio_64k.mjs [--root <папка>] [--dry] [--kbps 64|96]
 *
 * зачем --kbps (координатор 18.10): при 128k загрузка из Play ≈203 МБ — выше лимита, поэтому «на слух» нужен честный
 * запасной вариант 96 кбит/с, если владелец услышит разницу с 64k. Тот же кодер и те же правила, меняется только
 * битрейт; по умолчанию 64 — утренний прогон без параметра ведёт себя как раньше. Повторный прогон с МЕНЬШИМ битрейтом
 * перекодирует уже ужатые файлы ещё раз (второе поколение), поэтому выбирать битрейт один раз, по исходникам 128k.
 */
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOG = "[V2-REENCODE]";
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const rootArg = args.indexOf("--root");
const ROOT = path.resolve(rootArg >= 0 ? args[rootArg + 1] : path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const FFMPEG = process.env.FFMPEG
  ?? "C:/Users/badlo/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1-full_build/bin/ffmpeg.exe";
const FFPROBE = FFMPEG.replace(/ffmpeg(\.exe)?$/u, "ffprobe$1");
const kbpsArg = args.indexOf("--kbps");
const KBPS = kbpsArg >= 0 ? Number(args[kbpsArg + 1]) : 64;
const ALLOWED_KBPS = [48, 64, 80, 96, 112];
if (!ALLOWED_KBPS.includes(KBPS)) {
  console.error(`${LOG} --kbps ${args[kbpsArg + 1]} не поддерживается (можно: ${ALLOWED_KBPS.join(", ")}) — ничего не меняю`);
  process.exit(2);
}
const TARGET_BITRATE = KBPS * 1000;
const SINGLE_VOICE = "content/learning-v2-course/audio/en/single-voice-v1.json";
const MANIFEST = "assets/audio/learning-v2/factory-production-v1/manifest.json";
const BOOTSTRAP_MODULE = "app/learning_v2_bootstrap_audio_assets_v1.generated.ts";

const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");
const readJson = (rel) => {
  const raw = fs.readFileSync(path.join(ROOT, rel), "utf8");
  return { raw, eol: raw.includes("\r\n") ? "\r\n" : "\n", data: JSON.parse(raw) };
};
const writeJsonAtomic = (rel, { raw, eol }, data) => {
  const trailing = /\r?\n$/u.test(raw) ? eol : "";
  const out = JSON.stringify(data, null, 2).replace(/\n/gu, eol) + trailing;
  const file = path.join(ROOT, rel);
  fs.writeFileSync(`${file}.reencode.tmp`, out);
  fs.renameSync(`${file}.reencode.tmp`, file);
};
function bitrateOf(file) {
  const probe = spawnSync(FFPROBE, ["-v", "error", "-show_entries", "format=bit_rate", "-of", "csv=p=0", file], { encoding: "utf8" });
  const value = Number(String(probe.stdout).trim());
  if (probe.status !== 0 || !Number.isFinite(value)) throw new Error(`${LOG} ffprobe failed ${file}: ${probe.stderr}`);
  return value;
}
function run(script, extra = []) {
  const result = spawnSync(process.execPath, [path.join(ROOT, "scripts", script), ...extra], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const tail = `${result.stdout}\n${result.stderr}`.trim().split(/\r?\n/u).slice(-1)[0];
  console.log(`${LOG} ${script} ${extra.join(" ")} → код ${result.status}: ${tail}`);
  if (result.status !== 0) throw new Error(`${LOG} ${script} ${extra.join(" ")} упал (код ${result.status})`);
}

console.log(`${LOG} старт root=${ROOT} dry=${DRY} цель=${TARGET_BITRATE / 1000} кбит/с`);
const bundleHashes = new Set([...fs.readFileSync(path.join(ROOT, BOOTSTRAP_MODULE), "utf8").matchAll(/contentHash: "([0-9a-f]{64})"/gu)].map((m) => m[1]));
const singleVoice = readJson(SINGLE_VOICE);
const manifest = readJson(MANIFEST);
// источники: путь → хеш; только то, что едет в сборку
const sources = new Map();
for (const assignment of Object.values(singleVoice.data.assignments ?? {}))
  for (const clip of assignment.clips ?? []) if (bundleHashes.has(clip.contentHash)) sources.set(clip.assetPath, clip.contentHash);
for (const entry of manifest.data.entries ?? []) if (bundleHashes.has(entry.contentHash)) sources.set(entry.assetPath, entry.contentHash);
console.log(`${LOG} в сборке ${bundleHashes.size} файлов, исходников ${sources.size}`);

// зачем (ночная подготовка 18.10): сверка «байты исходника = хеш таблицы» шла внутри цикла, где файлы уже переписываются, —
// на 4-м несовпадении (таблица закоммичена, файл исходника нет) рабочая копия осталась бы наполовину перекодированной.
// Теперь ВСЕ исходники сверяются до первой записи; любое несовпадение или пропажа — стоп, ни один файл не тронут.
const drift = [];
const absent = [];
for (const [rel, oldHash] of sources) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { absent.push(rel); continue; }
  const actual = sha256(fs.readFileSync(file));
  if (actual !== oldHash) drift.push(`${rel} (таблица ${oldHash.slice(0, 8)}, файл ${actual.slice(0, 8)})`);
}
if (drift.length > 0 || absent.length > 0) {
  console.error(`${LOG} предпроверка: не совпадает с таблицей ${drift.length}, нет исходника ${absent.length} — стоп, ни один файл не изменён`);
  for (const line of [...drift, ...absent.map((rel) => `${rel} (нет файла)`)].slice(0, 20)) console.error(`${LOG}   ${line}`);
  process.exit(1);
}
console.log(`${LOG} предпроверка: все ${sources.size} исходников совпадают с таблицами`);

const remap = new Map(); // старый хеш → { hash, size }
const byOldHash = new Map(); // старый хеш → перекодированные байты (одинаковые байты кодируем один раз)
let skipped = 0;
const skippedByKbps = new Map(); // битрейт исходника → сколько файлов оставлено как есть
let missing = 0;
let bytesBefore = 0;
let bytesAfter = 0;
for (const [rel, oldHash] of sources) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { missing += 1; console.warn(`${LOG} нет исходника ${rel}`); continue; }
  const before = fs.readFileSync(file);
  if (sha256(before) !== oldHash) throw new Error(`${LOG} исходник ${rel} не совпадает с таблицей (${oldHash.slice(0, 8)}) — стоп, ничего не меняю дальше`);
  // зачем (координатор 18.10): исходник уже сжат (например shrink_audio V2 до 64k) — не пережимаем второй раз и не «поднимаем»
  // 64k до 96k: файл остаётся как есть, хеш в таблицах не меняется. Каждый пропуск — строка с битрейтом и итоговый счётчик.
  const srcBitrate = bitrateOf(file);
  if (srcBitrate <= TARGET_BITRATE * 1.1) {
    skipped += 1;
    const bucket = `${Math.round(srcBitrate / 1000)}k`;
    skippedByKbps.set(bucket, (skippedByKbps.get(bucket) ?? 0) + 1);
    console.log(`[REENCODE] skip reason=src_kbps=${Math.round(srcBitrate / 1000)} target_kbps=${KBPS} file=${rel}`);
    continue;
  }
  let next = byOldHash.get(oldHash);
  if (!next) {
    const tmp = `${file}.reencode.mp3`;
    const enc = spawnSync(FFMPEG, ["-v", "error", "-y", "-i", file, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", `${KBPS}k`, "-map_metadata", "-1", "-id3v2_version", "0", tmp], { encoding: "utf8" });
    if (enc.status !== 0) throw new Error(`${LOG} ffmpeg failed ${rel}: ${enc.stderr}`);
    next = fs.readFileSync(tmp);
    fs.rmSync(tmp);
    byOldHash.set(oldHash, next);
  }
  bytesBefore += before.length;
  bytesAfter += next.length;
  remap.set(oldHash, { hash: sha256(next), size: next.length });
  if (!DRY) {
    fs.writeFileSync(`${file}.reencode.tmp`, next);
    fs.renameSync(`${file}.reencode.tmp`, file);
  }
}
console.log(`[REENCODE] skip total=${skipped} by_src_kbps=${JSON.stringify(Object.fromEntries(skippedByKbps))} target_kbps=${KBPS}`);
console.log(`${LOG} перекодировано ${remap.size} (уникальных байт), пропущено ≤${KBPS} кбит/с ${skipped}, нет исходника ${missing}; ` +
  `${(bytesBefore / 1048576).toFixed(1)} МБ → ${(bytesAfter / 1048576).toFixed(1)} МБ`);
if (missing > 0) throw new Error(`${LOG} нет ${missing} исходников — таблицы не трогаю`);
if (DRY) { console.log(`${LOG} пробный прогон: файлы и таблицы не изменены`); process.exit(0); }
if (remap.size === 0) { console.log(`${LOG} перекодировать нечего — уже ≤ 64 кбит/с; проверяю модули`); }

let svChanged = 0;
for (const assignment of Object.values(singleVoice.data.assignments ?? {}))
  for (const clip of assignment.clips ?? []) {
    const next = remap.get(clip.contentHash);
    if (next) { clip.contentHash = next.hash; clip.byteSize = next.size; svChanged += 1; }
  }
let manChanged = 0;
for (const entry of manifest.data.entries ?? []) {
  const next = remap.get(entry.contentHash);
  if (next) { entry.contentHash = next.hash; entry.byteSize = next.size; manChanged += 1; }
}
if (svChanged) writeJsonAtomic(SINGLE_VOICE, singleVoice, singleVoice.data);
if (manChanged) writeJsonAtomic(MANIFEST, manifest, manifest.data);
console.log(`${LOG} таблицы: одного голоса ${svChanged} клипов, старый манифест ${manChanged} записей`);

run("build_learning_v2_factory_audio_module.mjs");
run("build_learning_v2_factory_single_voice_module.mjs");
// зачем (R125, 18.10): индекс прогрева фильтруется по набору сборки — строить его ПОСЛЕ набора
run("build_learning_v2_bootstrap_audio_pack.mjs");
run("build_learning_v2_factory_lesson_audio_index.mjs");
run("build_learning_v2_factory_audio_module.mjs", ["--check"]);
run("build_learning_v2_factory_single_voice_module.mjs", ["--check"]);
run("build_learning_v2_bootstrap_audio_pack.mjs", ["--check"]);
run("build_learning_v2_factory_lesson_audio_index.mjs", ["--check"]);
console.log(`${LOG} готово: дальше — ворота (learning_v2_plan_b_gates) и сторож полноты`);
