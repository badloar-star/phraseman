#!/usr/bin/env node
/**
 * Таблица «один назначенный голос на задание» для приложения — из файла Codex
 * content/learning-v2-course/audio/en/single-voice-v1.json (+ тексты приложения generated_release).
 *
 * зачем (владелец 15.10, EN-сессия; координатор 15.10 ~21:20): Codex озвучивает каждое задание ОДНИМ случайным голосом
 * и хранит выбор явно: assignments["l01/s16/task/3"] = { voice, clips:[{ text, assetPath, contentHash, byteSize }] }.
 * Номер task/N — позиция задания в learner.json занятия. Приложению нужны:
 *  1) записи этих клипов в таблице озвучки (по тексту и голосу) — в манифесте фабрики их нет, его ведёт инструмент
 *     генерации с цепочкой добавлений (тратит деньги на OpenAI) — поэтому отдельный модуль, манифест не трогаем;
 *  2) голос каждого задания по его внутреннему id (lesson-01:session:16:i01) — его рантайм берёт ПЕРВЫМ.
 * Задание берётся, только если тексты его реплик есть среди клипов назначения (иначе тексты разошлись — пропуск
 * с подсчётом). Запись, чей текст+голос уже есть в манифесте с другим файлом, не перекрывает манифест (подсчёт).
 *
 * Запуск: node scripts/build_learning_v2_factory_single_voice_module.mjs [--check]
 * Логи: префикс [V2-SINGLE-VOICE].
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const check = process.argv.includes("--check");
const LOG = "[V2-SINGLE-VOICE]";
const VOICES = new Set(["ash", "onyx", "nova", "coral"]);
const assignmentsPath = path.join(root, "content/learning-v2-course/audio/en/single-voice-v1.json");
const manifestPath = path.join(root, "assets/audio/learning-v2/factory-production-v1/manifest.json");
const contentRoot = path.join(root, "modules/learning-v2/content/factory_native/generated_release/en");
const outputModule = path.join(root, "app/learning_v2_factory_single_voice_v1.generated.ts");

const source = JSON.parse(fs.readFileSync(assignmentsPath, "utf8"));
if (source.schemaVersion !== 1 || !source.assignments || typeof source.assignments !== "object")
  throw new Error(`learning_v2_single_voice_source_invalid:${assignmentsPath}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const manifestByCoordinate = new Map(manifest.entries.map((entry) => [`${entry.transcript}\u0000${entry.voiceId}`, entry]));
const manifestHashes = new Set(manifest.entries.map((entry) => entry.contentHash));

const pad = (value) => String(value).padStart(2, "0");
const learnerCache = new Map();
const learnerFor = (lesson, session) => {
  const key = `${lesson}/${session}`;
  if (!learnerCache.has(key)) {
    const file = path.join(contentRoot, lesson, session, "learner.json");
    learnerCache.set(key, fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null);
  }
  return learnerCache.get(key);
};
const referenceTranscripts = (interaction) => {
  const payload = interaction?.modePayload ?? {};
  if (payload.family === "sound_contrast") return [payload.audioA, payload.audioB].filter(Boolean).map((ref) => ref.transcript);
  return payload.referenceAudio ? [payload.referenceAudio.transcript] : [];
};

// зачем: внутренний id задания строится так же, как в приложении (factory_native_course_v1: remapId) —
// префикс из intro.json (pageId без «:intro1») заменяется на lesson-LL:session:SS. Шаги вида «i17:s02» сохраняются.
const projectedInteractionId = (lessonOrdinal, sessionOrdinal, rawInteractionId, contentRootDir) => {
  const introPath = path.join(contentRootDir, `l${String(lessonOrdinal).padStart(2, "0")}`, `s${String(sessionOrdinal).padStart(2, "0")}`, "intro.json");
  const oldPrefix = String(JSON.parse(fs.readFileSync(introPath, "utf8")).pages?.[0]?.pageId ?? "").replace(/:intro1$/u, "");
  if (!oldPrefix) throw new Error(`learning_v2_projected_id_prefix_missing:${introPath}`);
  const courseSessionId = `lesson-${String(lessonOrdinal).padStart(2, "0")}:session:${String(sessionOrdinal).padStart(2, "0")}`;
  return String(rawInteractionId).split(oldPrefix).join(courseSessionId);
};
const entries = new Map();
const assignments = new Map();
const counts = { tasks: 0, intro: 0, assigned: 0, noAudio: 0, textMismatch: 0, noLearner: 0, badVoice: 0, sameAsManifest: 0, manifestConflict: 0, clipConflict: 0, fileMissing: 0 };
const mismatchSample = [];
for (const [key, assignment] of Object.entries(source.assignments).sort(([a], [b]) => a.localeCompare(b))) {
  const [lesson, session, kind, index] = key.split("/");
  if (!VOICES.has(assignment?.voice)) { counts.badVoice += 1; continue; }
  // Записи клипов — в таблицу озвучки ПО ФАЙЛУ (contentHash): задание играет именно свой клип, а не «первый
  // попавшийся» файл того же текста и голоса (Ревизор 2.74: одна фраза записана разными голосами в разных заданиях).
  for (const clip of assignment.clips ?? []) {
    const inManifest = manifestByCoordinate.get(`${clip.text}\u0000${assignment.voice}`);
    if (inManifest) {
      if (inManifest.contentHash === clip.contentHash) counts.sameAsManifest += 1;
      else counts.manifestConflict += 1;
    }
    if (manifestHashes.has(clip.contentHash) || entries.has(clip.contentHash)) continue;
    const file = path.join(root, clip.assetPath);
    if (!fs.existsSync(file) || fs.statSync(file).size !== clip.byteSize) { counts.fileMissing += 1; continue; }
    entries.set(clip.contentHash, { transcript: clip.text, voiceId: assignment.voice, contentHash: clip.contentHash, byteSize: clip.byteSize, assetPath: clip.assetPath });
  }
  if (kind === "intro") { counts.intro += 1; continue; }
  counts.tasks += 1;
  const learner = learnerFor(lesson, session);
  if (!learner) { counts.noLearner += 1; continue; }
  const interaction = learner.interactions?.[Number(index)];
  const transcripts = referenceTranscripts(interaction);
  if (!interaction || !(interaction.audioTargetIds ?? []).length || transcripts.length === 0) { counts.noAudio += 1; continue; }
  const clipTexts = new Set((assignment.clips ?? []).map((clip) => clip.text));
  if (!transcripts.every((transcript) => clipTexts.has(transcript))) {
    counts.textMismatch += 1;
    if (mismatchSample.length < 10) mismatchSample.push(`${key} ref=${transcripts.join("|")} clips=${[...clipTexts].join("|")}`);
    continue;
  }
  const lessonOrdinal = Number(lesson.slice(1));
  const sessionOrdinal = Number(session.slice(1));
  const clipHashByText = Object.fromEntries(transcripts.map((transcript) => [
    transcript,
    (assignment.clips ?? []).find((clip) => clip.text === transcript).contentHash,
  ]));
  assignments.set(projectedInteractionId(lessonOrdinal, sessionOrdinal, interaction.interactionId, contentRoot), { voice: assignment.voice, clips: clipHashByText });
  counts.assigned += 1;
}
console.log(`${LOG} ${JSON.stringify({ ...counts, entries: entries.size })}`);
for (const line of mismatchSample) console.warn(`${LOG} text_mismatch ${line}`);

const sortedEntries = [...entries.values()].sort((a, b) => a.contentHash.localeCompare(b.contentHash));
const sortedAssignments = [...assignments].sort(([a], [b]) => a.localeCompare(b));
const sourceSha256 = crypto.createHash("sha256").update(fs.readFileSync(assignmentsPath)).digest("hex");
const moduleText = [
  "/* Generated by scripts/build_learning_v2_factory_single_voice_module.mjs — do not edit by hand. */",
  `/* Source: content/learning-v2-course/audio/en/single-voice-v1.json sha256=${sourceSha256} */`,
  "export const FACTORY_SINGLE_VOICE_ENTRIES_V1 = Object.freeze([",
  ...sortedEntries.map((entry) =>
    `  Object.freeze({ transcript: ${JSON.stringify(entry.transcript)}, voiceId: ${JSON.stringify(entry.voiceId)} as const, contentHash: ${JSON.stringify(entry.contentHash)}, byteSize: ${entry.byteSize}, assetPath: ${JSON.stringify(entry.assetPath)} }),`),
  "] as const);",
  "/** Внутренний id задания → назначенный голос и файл каждой его реплики (Codex, «один голос на задание»). */",
  "export const FACTORY_SINGLE_VOICE_ASSIGNMENTS_V1: Readonly<Record<string, Readonly<{ voice: \"ash\" | \"onyx\" | \"nova\" | \"coral\"; clips: Readonly<Record<string, string>> }>>> = Object.freeze({",
  ...sortedAssignments.map(([id, value]) => `  ${JSON.stringify(id)}: Object.freeze({ voice: ${JSON.stringify(value.voice)} as const, clips: Object.freeze(${JSON.stringify(value.clips)}) }),`),
  "});",
  "",
].join("\n");

if (check) {
  const current = fs.existsSync(outputModule) ? fs.readFileSync(outputModule, "utf8").replace(/\r\n/gu, "\n") : null;
  if (current !== moduleText) {
    console.error(`${LOG} STALE: ${path.relative(root, outputModule)} — перегенерируй: node scripts/build_learning_v2_factory_single_voice_module.mjs`);
    process.exit(1);
  }
  console.log(`${LOG} PASS (${sortedEntries.length} entries, ${sortedAssignments.length} assignments)`);
  process.exit(0);
}
fs.writeFileSync(outputModule, moduleText, "utf8");
console.log(`${LOG} wrote ${path.relative(root, outputModule)} (${sortedEntries.length} entries, ${sortedAssignments.length} assignments)`);
