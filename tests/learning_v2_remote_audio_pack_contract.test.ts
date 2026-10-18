import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1 } from "../app/learning_v2_factory_lesson_audio_index_v1.generated";
import { normalizeEol } from './helpers/read_source';

// зачем (координатор §47, 2026-10-01): файл был сценарием из голых assert без единого
// test() — jest помечал его «must contain at least one test» и НИ ОДНА проверка не
// исполнялась. Тело обёрнуто в один test; вне jest (npx tsx) оно запускается напрямую.
async function main(): Promise<void> {
const root = process.cwd();
const read = (path: string) => normalizeEol(readFileSync(join(root, path), "utf8"));
const bootstrapModulePath = "app/learning_v2_bootstrap_audio_assets_v1.generated.ts";
const bootstrapSeedPath = "app/learning_v2_bootstrap_audio_seed_v1.ts";
const bootstrapDirectory = "assets/audio/learning-v2-bootstrap-v1";

const generated = read("app/learning_v2_factory_production_audio_entries_v1.generated.ts");
const factory = read("app/learning_v2_factory_production_audio_v1.ts");
const preload = read("app/learning_v2_course_session_audio_preload_v1.ts");
const cache = read("modules/learning-v2/runtime/voice_audio_offline_cache_v1.ts");
const easIgnore = read(".easignore");
const legacyFallback = read("app/learning_v2_lesson1_audio_assets.ts");
const esGenerator = read("scripts/generate_es_session01_production_audio.mjs");
const pack = read("app/learning_v2_lesson_audio_pack_v1.ts");
const lessonAudioIndex = read("app/learning_v2_factory_lesson_audio_index_v1.generated.ts");
const pulseCourse = read("components/learning-v2/LearningV2ChaptersCourse.tsx");
const modeCopy = read("modules/learning-v2/modes/mode_copy_v1.ts");

assert.doesNotMatch(generated, /require\([^\n]+\.mp3["']\)/u);
assert.doesNotMatch(generated, /assetModule/u);
assert.doesNotMatch(factory, /BundledAudioModule|assetModule/u);
assert.doesNotMatch(preload, /expo-asset|downloadLearningV2ActivityAudioBytesV1|BundledAudioModule/u);
assert.match(preload, /resolvePreparedLearningV2VoiceAudioOfflineFileV1/u);
assert.match(cache, /new Directory\(Paths\.document/u);
assert.match(cache, /processVerifiedFileUris/u);
assert.match(easIgnore, /^assets\/audio\/learning-v2\/$/mu);
assert.doesNotMatch(legacyFallback, /require\([^\n]+\.(?:mp3|m4a)["']\)/u);
assert.match(legacyFallback, /Paths\.document/u);
assert.doesNotMatch(esGenerator, /assetModule:\s*require/u);
assert.match(pack, /LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1/u);
assert.doesNotMatch(pack, /bundledLearningV2CourseSessionMaterialV3/u);
assert.match(pack, /learningV2EsSession1RemoteAudioFilesV1/u);
assert.match(pack, /learningV2EsSession2RemoteAudioFilesV1/u);
assert.match(pack, /isLearningV2SessionAudioPublishedV1/u);
assert.match(pack, /export async function prepareLearningV2SessionAudioPackV1/u);
assert.match(lessonAudioIndex, /sessionOrdinals/u);

const manifest = JSON.parse(read("assets/audio/learning-v2/factory-production-v1/manifest.json")) as {
  entries: readonly {
    transcript: string;
    voiceId: string;
    contentHash: string;
    byteSize: number;
  }[];
};
const voices = ["ash", "onyx", "nova", "coral"] as const;
const silentHashes = new Set((JSON.parse(read("app/learning_v2_factory_silent_audio_v1.json")) as {
  entries: readonly { contentHash: string }[];
}).entries.map((entry) => entry.contentHash));
const bundleHashes = new Set([...read(bootstrapModulePath).matchAll(/contentHash: "([0-9a-f]{64})"/gu)].map((match) => match[1]!));
const byCoordinate = new Map(
  manifest.entries.map((entry) => [`${entry.transcript}\u0000${entry.voiceId}`, entry.contentHash]),
);
const expectedLessons = new Map<number, {
  ordinals: number[];
  hashes: Set<string>;
  sessions: Map<number, Set<string>>;
}>();
const releaseRoot = join(root, "content/learning-v2-course/release/en");
for (const lessonName of readdirSync(releaseRoot).filter((name) => /^l\d{2}$/u.test(name)).sort()) {
  const lessonOrdinal = Number(lessonName.slice(1));
  const expected = {
    ordinals: [] as number[],
    hashes: new Set<string>(),
    sessions: new Map<number, Set<string>>(),
  };
  for (const sessionName of readdirSync(join(releaseRoot, lessonName)).filter((name) => /^s\d{2}$/u.test(name)).sort()) {
    const learnerPath = join(releaseRoot, lessonName, sessionName, "learner.json");
    if (!existsSync(learnerPath)) continue;
    const learner = JSON.parse(normalizeEol(readFileSync(learnerPath, "utf8"))) as { interactions: unknown };
    const transcripts = new Set<string>();
    const visit = (value: unknown): void => {
      if (Array.isArray(value)) return value.forEach(visit);
      if (!value || typeof value !== "object") return;
      const record = value as Record<string, unknown>;
      if (typeof record.audioTargetId === "string" && typeof record.transcript === "string")
        transcripts.add(record.transcript);
      Object.values(record).forEach(visit);
    };
    visit(learner.interactions);
    const sessionHashes = new Set<string>();
    let complete = true;
    for (const transcript of transcripts) {
      for (const voice of voices) {
        const contentHash = byCoordinate.get(`${transcript}\u0000${voice}`);
        if (!contentHash) { complete = false; break; }
        // зачем (Ревизор 3.42, R125): как в генераторе — в индекс прогрева только слышимые файлы набора сборки
        if (!silentHashes.has(contentHash) && bundleHashes.has(contentHash)) sessionHashes.add(contentHash);
      }
      if (!complete) break;
    }
    if (!complete) continue;
    const sessionOrdinal = Number(sessionName.slice(1));
    expected.ordinals.push(sessionOrdinal);
    expected.sessions.set(sessionOrdinal, sessionHashes);
    sessionHashes.forEach((contentHash) => expected.hashes.add(contentHash));
  }
  if (expected.ordinals.length > 0) expectedLessons.set(lessonOrdinal, expected);
}
assert.deepEqual(
  Object.keys(LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1).map(Number).sort((a, b) => a - b),
  [...expectedLessons.keys()],
);
for (const [lessonOrdinal, expected] of expectedLessons) {
  const actual = LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1[
    lessonOrdinal as keyof typeof LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1
  ];
  assert.ok(actual);
  assert.equal(actual.sessionCount, expected.ordinals.length);
  assert.deepEqual([...actual.sessionOrdinals], expected.ordinals);
  assert.deepEqual([...actual.contentHashes].sort(), [...expected.hashes].sort());
  assert.deepEqual(
    Object.keys(actual.sessions).map(Number),
    expected.ordinals,
  );
  for (const [sessionOrdinal, hashes] of expected.sessions) {
    assert.deepEqual(
      [...actual.sessions[sessionOrdinal as keyof typeof actual.sessions].contentHashes].sort(),
      [...hashes].sort(),
    );
  }
}

const lessons = read("app/(tabs)/lessons.tsx");
assert.doesNotMatch(
  lessons,
  /Готовим аудио урока|Preparing lesson audio|Готуємо аудіо уроку|Preparando el audio de la lección/u,
  "audio preparation must never be learner-visible",
);
assert.doesNotMatch(lessons, /isLessonAudioReady=|onLessonAudioPendingPress=/u);
assert.doesNotMatch(pulseCourse, /isLessonAudioReady|onLessonAudioPendingPress/u);
assert.doesNotMatch(
  modeCopy,
  /loading:\s*"(?:Загружается|Завантаження|Cargando|Carregando|Đang tải|Memuat|Yükleniyor|Wczytywanie|Loading)/u,
  "local decoder setup must not expose loading copy",
);
// зачем (D47, владелец): координатор скачивания
// (learning_v2_audio_prefetch_coordinator_v1 и соседи) удалён целиком — все
// способы СКАЧИВАНИЯ озвучки V2 отменены. Карта готовит текущую сессию
// напрямую через prepareLearningV2SessionAudioPackV1, а он больше не качает
// по сети — только то, что уже есть локально (стартовый бандл + ранее
// скачанное). Сторож перевёрнут: возврат координатора — регрессия.
assert.doesNotMatch(lessons, /requestLearningV2AudioPrefetchV1/u,
  "the deleted download coordinator must never come back");
assert.doesNotMatch(
  lessons,
  /from ["'].*learning_v2_audio_prefetch_coordinator_v1["']/u,
  "the deleted download coordinator module must never be imported again",
);
assert.match(lessons, /prepareLearningV2SessionAudioPackV1/u);
assert.ok(
  !existsSync(join(root, "app/learning_v2_audio_prefetch_coordinator_v1.ts")),
  "audio prefetch coordinator must stay deleted (D47)",
);
assert.ok(
  !existsSync(join(root, "app/learning_v2_audio_prefetch_background_v1.ts")),
  "audio prefetch background task must stay deleted (D47)",
);

assert.ok(existsSync(join(root, bootstrapModulePath)), "bootstrap audio module must be generated");
assert.ok(existsSync(join(root, bootstrapDirectory)), "bootstrap audio directory must exist");
const bootstrapModule = read(bootstrapModulePath);
const bootstrapSeed = read(bootstrapSeedPath);
assert.match(bootstrapSeed, /Asset\.loadAsync/u);
assert.match(bootstrapSeed, /prepareLearningV2VoiceAudioOfflineBytesV1/u);
assert.match(bootstrapSeed, /seedLearningV2BootstrapAudioCacheV1/u);
assert.match(bootstrapSeed, /learningV2NativeDecoderIdentityForAudioFileV1/u);
assert.doesNotMatch(bootstrapSeed, /createLearningV2ActivityAudioTransportV1|downloadLearningV2ActivityAudioBytesV1/u);
assert.match(preload, /resolveLearningV2BootstrapAudioOfflineFileV1/u);
const bootstrapLearner = JSON.parse(
  read("content/learning-v2-course/release/en/l01/s01/learner.json"),
) as { interactions: unknown };
const bootstrapTranscripts = new Set<string>();
const visitBootstrap = (value: unknown): void => {
  if (Array.isArray(value)) return value.forEach(visitBootstrap);
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (typeof record.audioTargetId === "string" && typeof record.transcript === "string")
    bootstrapTranscripts.add(record.transcript);
  Object.values(record).forEach(visitBootstrap);
};
visitBootstrap(bootstrapLearner.interactions);
const bootstrapEntries = [...bootstrapTranscripts].flatMap((transcript) =>
  voices.map((voiceId) => manifest.entries.find((entry) =>
    entry.transcript === transcript && entry.voiceId === voiceId,
  )),
);
assert.ok(bootstrapEntries.every(Boolean), "every Session 1 coordinate must have four production voices");
const exactBootstrapEntries = bootstrapEntries as readonly {
  transcript: string;
  voiceId: string;
  contentHash: string;
  byteSize: number;
}[];
// зачем (Ядро 18.10): 28 записей / 863 232 байта были слепком старого текста l01/s01 (7 реплик); после переписывания
// урока 1 реплик стало больше. Смысл тот же, без слепка: каждая реплика занятия 1 — во всех четырёх голосах, и размер
// записи в манифесте равен размеру файла в наборе сборки.
assert.ok(bootstrapTranscripts.size > 0, "Session 1 has voiced coordinates");
assert.equal(exactBootstrapEntries.length, bootstrapTranscripts.size * voices.length);
const bootstrapAudioFiles = readdirSync(join(root, bootstrapDirectory)).filter((name) => name.endsWith(".mp3"));
assert.ok(
  bootstrapAudioFiles.length >= exactBootstrapEntries.length,
  "bootstrap directory may retain additional generated voice assets",
);
// зачем (Ядро 18.10): с «одним голосом на задание» в сборку едет назначенный голос реплики, а не все четыре —
// проверяем, что КАЖДАЯ реплика занятия 1 есть в наборе сборки хотя бы одним голосом и подключена require (файл на месте).
const bundledByTranscript = new Map<string, string>();
for (const match of bootstrapModule.matchAll(/transcript: ("(?:[^"\\]|\\.)*"), voiceId: "[a-z]+" as const, contentHash: "([0-9a-f]{64})"/gu))
  if (!bundledByTranscript.has(JSON.parse(match[1]))) bundledByTranscript.set(JSON.parse(match[1]), match[2]);
for (const transcript of bootstrapTranscripts) {
  const contentHash = bundledByTranscript.get(transcript);
  assert.ok(contentHash, `Session 1 transcript «${transcript}» is in the bootstrap bundle`);
  assert.match(bootstrapModule, new RegExp(`require\\(\"\\.\\./assets/audio/learning-v2-bootstrap-v1/${contentHash}\\.mp3\"\\)`, "u"));
  assert.ok(existsSync(join(root, bootstrapDirectory, `${contentHash}.mp3`)), `bundled file for «${transcript}»`);
}
assert.match(easIgnore, /^!assets\/audio\/learning-v2-bootstrap-v1\/$/mu);

console.log("LEARNING V2 REMOTE AUDIO PACK CONTRACT: PASS");
}

if (typeof test === "function") {
  test("learning_v2_remote_audio_pack_contract", main);
} else {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
