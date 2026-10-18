#!/usr/bin/env node
/**
 * Learning V2: перекодирование MP3 без повторной генерации речи.
 * Решение владельца 18.10: --all-course --kbps 96; встроенный набор сокращается
 * отдельно, только после публикации и сверки Storage.
 * Без --all-course сохраняется прежний режим только для встроенного набора.
 * Файлы с меньшим битрейтом не увеличиваются искусственно.
 * Весь курс сначала кодируется во временную папку; перед заменой повторно
 * проверяются входные хеши и сохраняются оригиналы для восстановления.
 * Запуск: node scripts/learning_v2_reencode_bundle_audio_64k.mjs
 *   [--root <папка>] [--dry] [--kbps 64|96]
 *   [--all-course --selection <runtime-reference-report.json>]
 */
import crypto from "node:crypto";
import { loadRuntimeAudioSelection } from "./learning_v2_storage_audio_plan.mjs";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LOG = "[V2-REENCODE]";
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
// Владелец 18.10: весь курс, а не только старый большой набор сборки.
const ALL_COURSE = args.includes("--all-course");
const rootArg = args.indexOf("--root");
const ROOT = path.resolve(rootArg >= 0 ? args[rootArg + 1] : path.join(path.dirname(fileURLToPath(import.meta.url)), ".."));
const selectionArg = args.indexOf("--selection");
const requiredHashes = ALL_COURSE ? loadRuntimeAudioSelection(ROOT, selectionArg >= 0 ? args[selectionArg + 1] : undefined) : null;
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
  // Container bitrate includes MP3 headers and can report a short 96 kbps
  // recording as 106-113 kbps. That would recompress audio already at the
  // owner's target. Only the encoded audio stream decides whether to convert.
  const probe = spawnSync(FFPROBE, [
    "-v", "error",
    "-select_streams", "a:0",
    "-show_entries", "stream=bit_rate",
    "-of", "csv=p=0",
    file,
  ], { encoding: "utf8" });
  const value = Number(String(probe.stdout).trim());
  if (probe.status !== 0 || !Number.isFinite(value) || value <= 0)
    throw new Error(`${LOG} ffprobe stream bitrate failed ${file}: ${probe.stderr}`);
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
// Источники: путь → хеш; весь активный курс или только встроенный набор.
const sources = new Map();
const silentHashes = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, "app/learning_v2_factory_silent_audio_v1.json"), "utf8")).entries.map(entry => entry.contentHash));
for (const assignment of Object.values(singleVoice.data.assignments ?? {}))
  for (const clip of assignment.clips ?? []) if ((ALL_COURSE ? requiredHashes.has(clip.contentHash) : bundleHashes.has(clip.contentHash)) && !silentHashes.has(clip.contentHash)) sources.set(clip.assetPath, clip.contentHash);
for (const entry of manifest.data.entries ?? []) if ((ALL_COURSE ? requiredHashes.has(entry.contentHash) : bundleHashes.has(entry.contentHash)) && !silentHashes.has(entry.contentHash)) sources.set(entry.assetPath, entry.contentHash);
if (ALL_COURSE) {
  const sharedHashes = new Set(sources.values());
  for (const entry of readJson("assets/audio/learning-v2/session1-production-v1/manifest.json").data.entries)
    if (sharedHashes.has(entry.contentHash))
      sources.set("assets/audio/learning-v2/session1-production-v1/" + entry.filename, entry.contentHash);
}
if (ALL_COURSE) {
  const found = new Set(sources.values());
  for (const hash of requiredHashes) if (!found.has(hash)) throw new Error("Selected audio source missing: " + hash);
}
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
// Держим на диске, не в памяти: весь курс занимает сотни МБ.
const byOldHash = new Map(); // старый хеш → путь перекодированных байт
const stagingDirectory = path.join(ROOT, ".codex-tmp", `learning-v2-reencode-${KBPS}k`);
fs.mkdirSync(stagingDirectory, { recursive: true });
let skipped = 0;
const skippedByKbps = new Map(); // битрейт исходника → сколько файлов оставлено как есть
const KEEP_AS_IS_PREFIXES = ["assets/audio/learning-v2/session1-production-v1/"];
const SESSION1_MODULE = "app/learning_v2_session1_production_audio_v1.ts";
let missing = 0;
let bytesBefore = 0;
let bytesAfter = 0;
let processed = 0;
for (const [rel, oldHash] of sources) {
  processed += 1;
  if (processed % 100 === 0) console.log(`${LOG} обработано ${processed}/${sources.size}`);
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) { missing += 1; console.warn(`${LOG} нет исходника ${rel}`); continue; }
  const before = fs.readFileSync(file);
  if (sha256(before) !== oldHash) throw new Error(`${LOG} исходник ${rel} не совпадает с таблицей (${oldHash.slice(0, 8)}) — стоп, ничего не меняю дальше`);
  // зачем (координатор 18.10): исходник уже сжат (например shrink_audio V2 до 64k) — не пережимаем второй раз и не «поднимаем»
  // 64k до 96k: файл остаётся как есть, хеш в таблицах не меняется. Каждый пропуск — строка с битрейтом и итоговый счётчик.
  // зачем (репетиция утра 18.10): app/learning_v2_session1_production_audio_v1.ts (клиент выпуска → L1 S1) держит жёстко
  // прописанные хеши файлов session1-production-v1. Перекодирование сменило бы хеши, и модуль ссылался бы на удалённые
  // файлы набора — первое занятие потеряло бы звук. Эти исходники (3 малых файла) оставляем как есть.
  if (!ALL_COURSE && KEEP_AS_IS_PREFIXES.some((prefix) => rel.replace(/\\/gu, "/").startsWith(prefix))) {
    skipped += 1;
    skippedByKbps.set("legacy", (skippedByKbps.get("legacy") ?? 0) + 1);
    console.log(`[REENCODE] skip reason=legacy_session1_hardcoded_hashes target_kbps=${KBPS} file=${rel}`);
    continue;
  }
  const srcBitrate = bitrateOf(file);
  if (srcBitrate <= TARGET_BITRATE * 1.1) {
    skipped += 1;
    const bucket = `${Math.round(srcBitrate / 1000)}k`;
    skippedByKbps.set(bucket, (skippedByKbps.get(bucket) ?? 0) + 1);
    console.log(`[REENCODE] skip reason=src_kbps=${Math.round(srcBitrate / 1000)} target_kbps=${KBPS} file=${rel}`);
    continue;
  }
  let staged = byOldHash.get(oldHash);
  if (!staged) {
    const tmp = path.join(stagingDirectory, `${oldHash}.mp3`);
    const enc = spawnSync(FFMPEG, ["-v", "error", "-y", "-i", file, "-ac", "1", "-ar", "24000", "-c:a", "libmp3lame", "-b:a", `${KBPS}k`, "-map_metadata", "-1", "-id3v2_version", "0", tmp], { encoding: "utf8" });
    if (enc.status !== 0) throw new Error(`${LOG} ffmpeg failed ${rel}: ${enc.stderr}`);
    staged = tmp;
    byOldHash.set(oldHash, staged);
  }
  const next = fs.readFileSync(staged);
  bytesBefore += before.length;
  bytesAfter += next.length;
  remap.set(oldHash, { hash: sha256(next), size: next.length, staged });
  if (!DRY && !ALL_COURSE) {
    fs.writeFileSync(`${file}.reencode.tmp`, next);
    fs.renameSync(`${file}.reencode.tmp`, file);
  }
}
console.log(`[REENCODE] skip total=${skipped} by_src_kbps=${JSON.stringify(Object.fromEntries(skippedByKbps))} target_kbps=${KBPS}`);
console.log(`${LOG} перекодировано ${remap.size} (уникальных байт), пропущено ≤${KBPS} кбит/с ${skipped}, нет исходника ${missing}; ` +
  `${(bytesBefore / 1048576).toFixed(1)} МБ → ${(bytesAfter / 1048576).toFixed(1)} МБ`);
if (missing > 0) throw new Error(`${LOG} нет ${missing} исходников — таблицы не трогаю`);
if (DRY) { console.log(`${LOG} пробный прогон: файлы и таблицы не изменены`); process.exit(0); }
if (remap.size === 0) { console.log(`${LOG} перекодировать нечего — уже ≤ ${KBPS} кбит/с; проверяю модули`); }

if (ALL_COURSE) {
  // Не меняем исходники до окончания кодирования ВСЕГО набора. Повторно сверяем
  // входы: соседняя сессия не должна незаметно изменить таблицу или файл за это время.
  if (fs.readFileSync(path.join(ROOT, SINGLE_VOICE), "utf8") !== singleVoice.raw ||
      fs.readFileSync(path.join(ROOT, MANIFEST), "utf8") !== manifest.raw)
    throw new Error(`${LOG} таблицы изменились во время кодирования; исходники не заменены`);
  for (const [rel, oldHash] of sources)
    if (sha256(fs.readFileSync(path.join(ROOT, rel))) !== oldHash)
      throw new Error(`${LOG} исходник изменился во время кодирования: ${rel}; исходники не заменены`);
  fs.writeFileSync(path.join(stagingDirectory, "remap.json"), JSON.stringify(Object.fromEntries(remap), null, 2));
  // Отдельный снимок для восстановления при сбое записи после начала применения.
  // Не используем git reset: рабочее дерево общее с другими сессиями.
  const backupDirectory = fs.mkdtempSync(path.join(stagingDirectory, "originals-"));
  const backupPaths = [...sources.keys(), SINGLE_VOICE, MANIFEST,
    "assets/audio/learning-v2/session1-production-v1/manifest.json", SESSION1_MODULE];
  for (const rel of backupPaths) {
    const backup = path.join(backupDirectory, rel);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(path.join(ROOT, rel), backup);
  }
  fs.writeFileSync(path.join(backupDirectory, "recovery.json"), JSON.stringify({
    root: ROOT, paths: backupPaths, originalHashes: Object.fromEntries(sources),
    replacementHashes: Object.fromEntries([...remap].map(([hash, next]) => [hash, next.hash])),
    rebuild: ["build_learning_v2_factory_audio_module.mjs", "build_learning_v2_factory_single_voice_module.mjs",
      "build_learning_v2_bootstrap_audio_pack.mjs", "build_learning_v2_factory_lesson_audio_index.mjs"],
    instructions: "On interrupted apply: stop audio writers; compare each current file with original/replacement hashes; restore only these paths from this snapshot, preserving unrelated edits; then run rebuild scripts in listed order. Do not rerun conversion over partially migrated tables."
  }, null, 2));
  console.log(LOG + " original snapshot: " + backupDirectory);

  for (const [rel, oldHash] of sources) {
    const next = remap.get(oldHash);
    if (!next) continue;
    const file = path.join(ROOT, rel);
    fs.copyFileSync(next.staged, `${file}.reencode.tmp`);
    fs.renameSync(`${file}.reencode.tmp`, file);
  }
  // Старое первое занятие хранит собственные хеши: обновляем его вместе с байтами.
  const legacyPath = "assets/audio/learning-v2/session1-production-v1/manifest.json";
  if (fs.existsSync(path.join(ROOT, legacyPath))) {
    const legacy = readJson(legacyPath);
    const update = value => {
      if (!value || typeof value !== "object") return;
      const next = remap.get(value.contentHash);
      if (next) { value.contentHash = next.hash; value.byteSize = next.size; }
      for (const child of Object.values(value)) update(child);
    };
    update(legacy.data);
    writeJsonAtomic(legacyPath, legacy, legacy.data);
  }
  const legacyModule = path.join(ROOT, SESSION1_MODULE);
  const legacyText = fs.readFileSync(legacyModule, "utf8");
  const updatedLegacy = legacyText.replace(/contentHash: "([0-9a-f]{64})", byteSize: \d+/gu, (original, hash) => {
    const next = remap.get(hash);
    return next ? `contentHash: "${next.hash}", byteSize: ${next.size}` : original;
  });
  if (updatedLegacy !== legacyText) {
    fs.writeFileSync(`${legacyModule}.reencode.tmp`, updatedLegacy);
    fs.renameSync(`${legacyModule}.reencode.tmp`, legacyModule);
  }
}

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
if (!ALL_COURSE) run("build_learning_v2_factory_lesson_audio_index.mjs");
run("build_learning_v2_factory_audio_module.mjs", ["--check"]);
run("build_learning_v2_factory_single_voice_module.mjs", ["--check"]);
run("build_learning_v2_bootstrap_audio_pack.mjs", ["--check"]);
// пост-проверка (координатор 04:55, каскад): ЛЮБОЙ исходник приложения с жёстко прописанным хешем файла набора — не только
// L1 S1 (SESSION1_MODULE) — после перекодирования должен по-прежнему находить этот хеш в наборе. Список модулей не ручной:
// сканируются app, modules, components, hooks, constants (ts/tsx/js/json) на 64-hex из набора ДО перекодирования; модули,
// которые этот скрипт сам пересобирает, исключены. Журнал [POSTCHECK]: модуль → хешей набора → пропало.
if (!ALL_COURSE) {
  const REGENERATED = new Set([BOOTSTRAP_MODULE, "app/learning_v2_factory_single_voice_v1.generated.ts",
    "app/learning_v2_factory_production_audio_entries_v1.generated.ts", "app/learning_v2_factory_lesson_audio_index_v1.generated.ts"]);
  const bundleNow = new Set([...fs.readFileSync(path.join(ROOT, BOOTSTRAP_MODULE), "utf8").matchAll(/contentHash: "([0-9a-f]{64})"/gu)].map((m) => m[1]));
  // зачем (координатор 05:00): ссылка может быть не полным хешем, а его 8–12-символьным префиксом — ищем и их.
  // Манифесты в assets/** и app.json / metro.config.js тоже смотрим (там лежит, например, манифест session1-production-v1).
  const prefixToHash = new Map();
  for (const h of bundleHashes) for (let n = 8; n <= 12; n += 1) prefixToHash.set(h.slice(0, n), h);
  REGENERATED.add(SINGLE_VOICE);
  REGENERATED.add(MANIFEST);
  const holders = [];
  const scanFile = (rel) => {
    const text = fs.readFileSync(path.join(ROOT, rel), "utf8");
    const held = new Set([...text.matchAll(/(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])/gu)].map((m) => m[0]).filter((h) => bundleHashes.has(h)));
    for (const m of text.matchAll(/(?<![0-9a-f])[0-9a-f]{8,12}(?![0-9a-f])/gu)) { const h = prefixToHash.get(m[0]); if (h) held.add(h); }
    if (held.size > 0) holders.push({ rel, held: [...held], lost: [...held].filter((h) => !bundleNow.has(h)) });
  };
  const walk = (dir, accept) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) { if (entry.name !== "node_modules" && entry.name !== "learning-v2-bootstrap-v1") walk(rel, accept); continue; }
      if (accept(entry.name) && !REGENERATED.has(rel)) scanFile(rel);
    }
  };
  for (const dir of ["app", "modules", "components", "hooks", "constants"]) if (fs.existsSync(path.join(ROOT, dir))) walk(dir, (n) => /\.(ts|tsx|js|json)$/u.test(n));
  if (fs.existsSync(path.join(ROOT, "assets"))) walk("assets", (n) => /manifest.*\.json$/iu.test(n));
  for (const rel of ["app.json", "metro.config.js", "app.config.js", "app.config.ts"]) if (fs.existsSync(path.join(ROOT, rel))) scanFile(rel);
  console.log(`[POSTCHECK] модулей с жёсткими хешами набора: ${holders.length}${holders.some((h) => h.rel === SESSION1_MODULE) ? " (включая L1 S1)" : ""}`);
  for (const h of holders) console.log(`[POSTCHECK]   ${h.rel}: хешей набора ${h.held.length}, пропало из набора ${h.lost.length}`);
  const broken = holders.filter((h) => h.lost.length > 0);
  if (broken.length > 0) throw new Error(`[POSTCHECK] модули ссылаются на хеши, которых больше нет в наборе: ${broken.map((h) => `${h.rel} (${h.lost.map((x) => x.slice(0, 8)).join(", ")})`).join("; ")}`);
}
if (ALL_COURSE) {
  const legacyManifest = readJson("assets/audio/learning-v2/session1-production-v1/manifest.json").data;
  const known = new Set(legacyManifest.entries.map(entry => entry.contentHash));
  for (const entry of legacyManifest.entries) {
    const bytes = fs.readFileSync(path.join(ROOT, "assets/audio/learning-v2/session1-production-v1", entry.filename));
    if (bytes.length !== entry.byteSize || sha256(bytes) !== entry.contentHash)
      throw new Error(`${LOG} legacy file differs from its table: ${entry.filename}`);
  }
  const legacy = fs.readFileSync(path.join(ROOT, SESSION1_MODULE), "utf8");
  const missingLegacy = [...legacy.matchAll(/contentHash: "([0-9a-f]{64})"/gu)].map(match => match[1]).filter(hash => !known.has(hash));
  if (missingLegacy.length) throw new Error(`${LOG} legacy references missing: ${missingLegacy.join(",")}`);
  console.log(`[POSTCHECK] legacy module and files match their table; bundle/Storage coverage is checked by the release guard`);
}
if (!ALL_COURSE) run("build_learning_v2_factory_lesson_audio_index.mjs", ["--check"]);
console.log(`${LOG} готово: дальше — ворота (learning_v2_plan_b_gates) и сторож полноты`);
