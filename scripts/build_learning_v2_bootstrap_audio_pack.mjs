#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const check = process.argv.includes("--check");

/**
 * Сколько сессий урока 1 едут ОЗВУЧЕННЫМИ прямо в сборке.
 *
 * зачем: владелец 22.09 — «занятие не подготовилось. проверь связь» на уроке 2
 * и вылет на Главную. Корень был не в связи: в бандл попадала озвучка РОВНО
 * одной сессии (5 фраз, 27 файлов), а всё остальное качалось из Firebase
 * Storage в момент нажатия «Начать». Нет файла в оффлайн-кэше — подготовка
 * отклонялась, и занятие не открывалось вовсе.
 *
 * Пять сессий (~3,6 МБ) человек проходит не за один заход, поэтому за это
 * время скользящее окно (learning_v2_audio_rolling_window_v1) успевает
 * догрузить следующие. Число согласовано с владельцем: «первые 5 сессий,
 * сессия 1 завершена — уже должна грузиться сессия 6».
 */
const LAUNCH_SEED_SESSION_COUNT = 5;

/**
 * Сколько занятий урока 1 едут озвученными в сборке = открытый потолок.
 *
 * зачем (координатор 15.10, урок 1 целиком в сборку 16.10): сети у озвучки нет (D47/PM-205), поэтому всё, чего
 * нет в этом наборе, звучало голосом телефона — s06–s15 уже в релизе 15.10. Число не зашито: берётся из потолка,
 * который сторож learning_v2_bundle_availability генерирует по реально собранным занятиям. Поднялся потолок —
 * перегенерируй набор, `--check` упадёт, пока этого не сделали. Всё, что выше потолка, в сборку не едет
 * (`.easignore` пропускает только эту папку). Посев при запуске по-прежнему только первых
 * LAUNCH_SEED_SESSION_COUNT занятий: остальное занятие готовит само по запросу, без лишней работы на старте.
 */
const availabilityPath = path.join(root, "app/learning_v2_bundle_availability_v1.generated.ts");
const ceilingMatch = /LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 = (\d+);/u.exec(fs.readFileSync(availabilityPath, "utf8"));
if (!ceilingMatch) throw new Error(`learning_v2_bootstrap_audio_ceiling_unreadable:${availabilityPath}`);
const BOOTSTRAP_SESSION_COUNT = Math.max(LAUNCH_SEED_SESSION_COUNT, Number(ceilingMatch[1]));

const contentDirectory = path.join(root, "modules/learning-v2/content/factory_native/generated_release/en/l01");
const manifestPath = path.join(root, "assets/audio/learning-v2/factory-production-v1/manifest.json");
const outputDirectory = path.join(root, "assets/audio/learning-v2-bootstrap-v1");
const outputModule = path.join(root, "app/learning_v2_bootstrap_audio_assets_v1.generated.ts");
const voices = ["ash", "onyx", "nova", "coral"];

/**
 * Фразы занятий берём из ТЕКСТОВ, которые приложение реально показывает (generated_release — его читает
 * factory_native_manifest_v1), и кладём их записи во всех четырёх голосах.
 *
 * зачем (15.10, сверка координатора): таблица озвучки app/learning_v2_factory_lesson_audio_index_v1 собрана
 * 20.09 под старые тексты, а content/learning-v2-course/release фабрика меняет независимо от сборки. По обоим
 * источникам в сборку шли не те файлы: из нынешних s01–s15 в набор не попадало 60 записанных файлов
 * (звучали телефоном). Источник истины для сборки — то, что играет плеер: referenceAudio/audioA/audioB
 * заданий (buildLearningV2FactoryBundledAudioChildV1) и слова карточек.
 * Фразы без записи хотя бы в одном голосе пропускаются: такие задания приложение само выключает
 * (resolveLearningV2FactoryRuntimeAudioOmissionsV1). Число пропусков печатается — немого пропуска нет.
 */
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const byCoordinate = new Map(
  manifest.entries.map((entry) => [`${entry.transcript}\u0000${entry.voiceId}`, entry]),
);
const collectTranscripts = (value, into) => {
  if (Array.isArray(value)) return value.forEach((item) => collectTranscripts(item, into));
  if (!value || typeof value !== "object") return;
  if (value.isWordCard === true && typeof value.wordCard?.word === "string")
    into.add(value.wordCard.word.normalize("NFKC").trim());
  if (typeof value.audioTargetId === "string" && typeof value.transcript === "string")
    into.add(value.transcript);
  Object.values(value).forEach((item) => collectTranscripts(item, into));
};
const bundledEntries = new Map();
const launchSeedHashes = new Set();
const unvoiced = new Set();
for (let sessionOrdinal = 1; sessionOrdinal <= BOOTSTRAP_SESSION_COUNT; sessionOrdinal += 1) {
  const learnerPath = path.join(contentDirectory, `s${String(sessionOrdinal).padStart(2, "0")}`, "learner.json");
  // Немой пропуск запрещён: молча собранный неполный пак — это ровно тот баг,
  // который чиним (занятие открывается у автора и звучит телефоном у человека).
  if (!fs.existsSync(learnerPath))
    throw new Error(`learning_v2_bootstrap_audio_session_missing:${learnerPath}`);
  const transcripts = new Set();
  collectTranscripts(JSON.parse(fs.readFileSync(learnerPath, "utf8")).interactions, transcripts);
  for (const transcript of transcripts) {
    const voiced = voices.map((voiceId) => byCoordinate.get(`${transcript}\u0000${voiceId}`));
    if (voiced.some((entry) => !entry)) {
      unvoiced.add(transcript);
      continue;
    }
    for (const entry of voiced) {
      bundledEntries.set(entry.contentHash, entry);
      if (sessionOrdinal <= LAUNCH_SEED_SESSION_COUNT) launchSeedHashes.add(entry.contentHash);
    }
  }
}
console.log(`[V2-BOOTSTRAP-AUDIO] sessions=1..${BOOTSTRAP_SESSION_COUNT} files=${bundledEntries.size} launchSeed=${launchSeedHashes.size} unvoicedTranscripts=${unvoiced.size}`);

const entries = [...bundledEntries.values()];
entries.sort((left, right) => left.contentHash.localeCompare(right.contentHash));

const moduleText = [
  "/* Generated by scripts/build_learning_v2_bootstrap_audio_pack.mjs. */",
  "export const LEARNING_V2_BOOTSTRAP_AUDIO_SCHEMA_V1 = \"learning-v2-bootstrap-audio.v1\" as const;",
  "export const LEARNING_V2_BOOTSTRAP_AUDIO_ENTRIES_V1 = Object.freeze([",
  ...entries.map((entry) =>
    `  Object.freeze({ transcript: ${JSON.stringify(entry.transcript)}, voiceId: ${JSON.stringify(entry.voiceId)} as const, contentHash: ${JSON.stringify(entry.contentHash)}, byteSize: ${entry.byteSize}, launchSeed: ${launchSeedHashes.has(entry.contentHash)}, assetModule: require(\"../assets/audio/learning-v2-bootstrap-v1/${entry.contentHash}.mp3\") }),`),
  "] as const);",
  `export const LEARNING_V2_BOOTSTRAP_AUDIO_TOTAL_BYTES_V1 = ${entries.reduce((sum, entry) => sum + entry.byteSize, 0)} as const;`,
  `export const LEARNING_V2_BOOTSTRAP_AUDIO_SESSION_COUNT_V1 = ${BOOTSTRAP_SESSION_COUNT} as const;`,
  "",
].join("\n");

const hashFile = (filePath) => crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
const expectedNames = new Set(entries.map((entry) => `${entry.contentHash}.mp3`));

if (check) {
  if (!fs.existsSync(outputModule) || fs.readFileSync(outputModule, "utf8") !== moduleText)
    throw new Error("learning_v2_bootstrap_audio_module_stale");
  if (!fs.existsSync(outputDirectory)) throw new Error("learning_v2_bootstrap_audio_directory_missing");
  const actualNames = fs.readdirSync(outputDirectory).filter((name) => name.endsWith(".mp3")).sort();
  if (JSON.stringify(actualNames) !== JSON.stringify([...expectedNames].sort()))
    throw new Error("learning_v2_bootstrap_audio_inventory_stale");
  for (const entry of entries) {
    const target = path.join(outputDirectory, `${entry.contentHash}.mp3`);
    const stat = fs.statSync(target);
    if (stat.size !== entry.byteSize || hashFile(target) !== entry.contentHash)
      throw new Error(`learning_v2_bootstrap_audio_corrupt:${entry.contentHash}`);
  }
  console.log(`Learning V2 bootstrap audio PASS (${entries.length} files, ${entries.reduce((sum, entry) => sum + entry.byteSize, 0)} bytes)`);
  process.exit(0);
}

fs.mkdirSync(outputDirectory, { recursive: true });
for (const name of fs.readdirSync(outputDirectory)) {
  if (name.endsWith(".mp3") && !expectedNames.has(name)) fs.rmSync(path.join(outputDirectory, name));
}
for (const entry of entries) {
  const source = path.join(root, entry.assetPath);
  if (!fs.existsSync(source) || fs.statSync(source).size !== entry.byteSize || hashFile(source) !== entry.contentHash)
    throw new Error(`learning_v2_bootstrap_audio_source_invalid:${entry.contentHash}`);
  fs.copyFileSync(source, path.join(outputDirectory, `${entry.contentHash}.mp3`));
}
fs.writeFileSync(outputModule, moduleText, "utf8");
console.log(`wrote Learning V2 bootstrap audio (${entries.length} files, ${entries.reduce((sum, entry) => sum + entry.byteSize, 0)} bytes)`);
