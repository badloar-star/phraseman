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

const contentRoot = path.join(root, "modules/learning-v2/content/factory_native/generated_release/en");
const singleVoiceModulePath = path.join(root, "app/learning_v2_factory_single_voice_v1.generated.ts");
const SESSIONS_PER_LESSON = 56;
const manifestPath = path.join(root, "assets/audio/learning-v2/factory-production-v1/manifest.json");
const outputDirectory = path.join(root, "assets/audio/learning-v2-bootstrap-v1");
const outputModule = path.join(root, "app/learning_v2_bootstrap_audio_assets_v1.generated.ts");
const voices = ["ash", "onyx", "nova", "coral"];

/**
 * Фразы занятий берём из ТЕКСТОВ, которые приложение реально показывает (generated_release — его читает
 * factory_native_manifest_v1), и кладём все записанные голоса каждой фразы (4 или один назначенный).
 *
 * зачем (15.10, сверка координатора): таблица озвучки app/learning_v2_factory_lesson_audio_index_v1 собрана
 * 20.09 под старые тексты, а content/learning-v2-course/release фабрика меняет независимо от сборки. По обоим
 * источникам в сборку шли не те файлы: из нынешних s01–s15 в набор не попадало 60 записанных файлов
 * (звучали телефоном). Источник истины для сборки — то, что играет плеер: referenceAudio/audioA/audioB
 * заданий (buildLearningV2FactoryBundledAudioChildV1) и слова карточек.
 * Фразы без единой записи пропускаются: такие задания приложение само выключает
 * (resolveLearningV2FactoryRuntimeAudioOmissionsV1). Число пропусков печатается — немого пропуска нет.
 */
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const byCoordinate = new Map(
  manifest.entries.map((entry) => [`${entry.transcript}\u0000${entry.voiceId}`, entry]),
);
const byContentHash = new Map(manifest.entries.map((entry) => [entry.contentHash, entry]));
// зачем (владелец 15.10, «один голос на задание»): записи Codex и назначенный голос задания — из того же
// сгенерированного модуля, что читает приложение (scripts/build_learning_v2_factory_single_voice_module.mjs).
// Манифест главнее, как в рантайме (learning_v2_factory_production_audio_v1).
const singleVoiceText = fs.existsSync(singleVoiceModulePath) ? fs.readFileSync(singleVoiceModulePath, "utf8") : "";
for (const match of singleVoiceText.matchAll(/transcript: ("(?:[^"\\]|\\.)*"), voiceId: "([a-z]+)" as const, contentHash: "([0-9a-f]{64})", byteSize: (\d+), assetPath: ("(?:[^"\\]|\\.)*")/gu)) {
  const entry = { transcript: JSON.parse(match[1]), voiceId: match[2], contentHash: match[3], byteSize: Number(match[4]), assetPath: JSON.parse(match[5]) };
  const coordinate = `${entry.transcript}\u0000${entry.voiceId}`;
  if (!byCoordinate.has(coordinate)) byCoordinate.set(coordinate, entry);
  if (!byContentHash.has(entry.contentHash)) byContentHash.set(entry.contentHash, entry);
}
// Назначение Codex: голос и файл (contentHash) каждой реплики задания — как в приложении (Ревизор 2.74).
const assignment = new Map(
  [...singleVoiceText.matchAll(/^  "(lesson-\d{2}:session:\d{2}:[^"]+)": Object\.freeze\(\{ voice: "([a-z]+)" as const, clips: Object\.freeze\((\{.*\})\) \}\),$/gmu)]
    .map((match) => [match[1], { voice: match[2], clips: JSON.parse(match[3]) }]),
);
const has = (transcript, voiceId) => byCoordinate.has(`${transcript}\u0000${voiceId}`);
/**
 * Те же файлы, что factoryVoicePlanV1 в приложении: клипы задания по назначению Codex → 4 голоса → общий голос.
 * Возвращает записи (по одной на реплику × голос) или [] — задание не озвучено.
 */
const entriesFor = (interactionId, transcripts) => {
  const codex = assignment.get(interactionId);
  if (codex && transcripts.every((transcript) => byContentHash.has(codex.clips[transcript] ?? "")))
    return transcripts.map((transcript) => byContentHash.get(codex.clips[transcript]));
  const plan = transcripts.every((transcript) => voices.every((voiceId) => has(transcript, voiceId)))
    ? voices
    : [voices.find((voiceId) => transcripts.every((transcript) => has(transcript, voiceId)))].filter(Boolean);
  return plan.flatMap((voiceId) => transcripts.map((transcript) => byCoordinate.get(`${transcript}\u0000${voiceId}`)));
};
const referenceTranscripts = (interaction) => {
  const payload = interaction?.modePayload ?? {};
  if (payload.family === "sound_contrast") return [payload.audioA, payload.audioB].filter(Boolean).map((ref) => ref.transcript);
  return payload.referenceAudio ? [payload.referenceAudio.transcript] : [];
};
const collectWords = (value, into) => {
  if (Array.isArray(value)) return value.forEach((item) => collectWords(item, into));
  if (!value || typeof value !== "object") return;
  if (value.isWordCard === true && typeof value.wordCard?.word === "string")
    into.add(value.wordCard.word.normalize("NFKC").trim());
  Object.values(value).forEach((item) => collectWords(item, into));
};
const pad = (value) => String(value).padStart(2, "0");
// зачем: внутренний id задания строится так же, как в приложении (factory_native_course_v1: remapId) —
// префикс из intro.json (pageId без «:intro1») заменяется на lesson-LL:session:SS. Шаги вида «i17:s02» сохраняются.
const projectedInteractionId = (lessonOrdinal, sessionOrdinal, rawInteractionId, contentRootDir) => {
  const introPath = path.join(contentRootDir, `l${String(lessonOrdinal).padStart(2, "0")}`, `s${String(sessionOrdinal).padStart(2, "0")}`, "intro.json");
  const oldPrefix = String(JSON.parse(fs.readFileSync(introPath, "utf8")).pages?.[0]?.pageId ?? "").replace(/:intro1$/u, "");
  if (!oldPrefix) throw new Error(`learning_v2_projected_id_prefix_missing:${introPath}`);
  const courseSessionId = `lesson-${String(lessonOrdinal).padStart(2, "0")}:session:${String(sessionOrdinal).padStart(2, "0")}`;
  return String(rawInteractionId).split(oldPrefix).join(courseSessionId);
};
const bundledEntries = new Map();
const launchSeedHashes = new Set();
const unvoiced = new Set();
const add = (entry, launchSeed) => {
  bundledEntries.set(entry.contentHash, entry);
  if (launchSeed) launchSeedHashes.add(entry.contentHash);
};
// Порядок курса: урок 1 s01..s56, затем урок 2 и т. д. — как потолок (learningV2SessionCourseIndexV1).
for (let courseIndex = 0; courseIndex < BOOTSTRAP_SESSION_COUNT; courseIndex += 1) {
  const lessonOrdinal = Math.floor(courseIndex / SESSIONS_PER_LESSON) + 1;
  const sessionOrdinal = (courseIndex % SESSIONS_PER_LESSON) + 1;
  const launchSeed = lessonOrdinal === 1 && sessionOrdinal <= LAUNCH_SEED_SESSION_COUNT;
  const learnerPath = path.join(contentRoot, `l${pad(lessonOrdinal)}`, `s${pad(sessionOrdinal)}`, "learner.json");
  // Немой пропуск запрещён: молча собранный неполный пак — это ровно тот баг,
  // который чиним (занятие открывается у автора и звучит телефоном у человека).
  if (!fs.existsSync(learnerPath))
    throw new Error(`learning_v2_bootstrap_audio_session_missing:${learnerPath}`);
  const interactions = JSON.parse(fs.readFileSync(learnerPath, "utf8")).interactions;
  for (const interaction of interactions) {
    const transcripts = referenceTranscripts(interaction);
    if (!(interaction.audioTargetIds ?? []).length || transcripts.length === 0) continue;
    const files = entriesFor(projectedInteractionId(lessonOrdinal, sessionOrdinal, interaction.interactionId, contentRoot), transcripts);
    if (files.length === 0) {
      transcripts.forEach((transcript) => unvoiced.add(transcript));
      continue;
    }
    for (const entry of files) add(entry, launchSeed);
  }
  // Слова карточек: голос ash, иначе записанный голос слова (как learningV2FactoryWordAudioFileV1 в приложении, 17.10).
  const words = new Set();
  collectWords(interactions, words);
  for (const word of words) {
    const wordVoice = voices.find((voiceId) => byCoordinate.has(`${word}\u0000${voiceId}`));
    const entry = wordVoice ? byCoordinate.get(`${word}\u0000${wordVoice}`) : undefined;
    if (entry) add(entry, launchSeed);
    else unvoiced.add(word);
  }
}
console.log(`[V2-BOOTSTRAP-AUDIO] courseSessions=1..${BOOTSTRAP_SESSION_COUNT} files=${bundledEntries.size} launchSeed=${launchSeedHashes.size} unvoicedTranscripts=${unvoiced.size}`);

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
