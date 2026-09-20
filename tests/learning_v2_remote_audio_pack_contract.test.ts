import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1 } from "../app/learning_v2_factory_lesson_audio_index_v1.generated";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");
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
const pulseCourse = read("components/learning-v2/LearningV2PulseCourse.tsx");
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
  entries: readonly { transcript: string; voiceId: string; contentHash: string }[];
};
const voices = ["ash", "onyx", "nova", "coral"] as const;
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
    const learner = JSON.parse(readFileSync(learnerPath, "utf8")) as { interactions: unknown };
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
        sessionHashes.add(contentHash);
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
const audioPrefetchCoordinator = read("app/learning_v2_audio_prefetch_coordinator_v1.ts");
const audioPrefetchCore = read("app/learning_v2_audio_prefetch_coordinator_core_v1.ts");
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
assert.match(lessons, /requestLearningV2AudioPrefetchV1/u);
assert.match(lessons, /prepareLearningV2SessionAudioPackV1/u);
assert.match(audioPrefetchCoordinator, /prepareLearningV2LessonAudioPackV1/u);
assert.match(audioPrefetchCoordinator, /prepareLearningV2SessionAudioPackV1/u);
assert.match(audioPrefetchCoordinator, /learningV2PublishedAudioLessonOrdinalsV1/u);
assert.match(audioPrefetchCoordinator, /NetInfo\.addEventListener/u);
assert.match(audioPrefetchCore, /for \(const coordinate of urgent\)/u);
assert.match(audioPrefetchCore, /for \(const lessonOrdinal of lessons\)/u);
assert.match(lessons, /isLearningV2SessionAudioPublishedV1/u);
assert.ok(
  (lessons.match(/isLearningV2SessionAudioPublishedV1/gu)?.length ?? 0) >= 2,
  "published-audio checks must protect only speculative prewarm work",
);
const materialAvailability = lessons.slice(
  lessons.indexOf("isSessionMaterialAvailable="),
  lessons.indexOf("bottomPadding=", lessons.indexOf("isSessionMaterialAvailable=")),
);
assert.doesNotMatch(
  materialAvailability,
  /isLearningV2SessionAudioPublishedV1/u,
  "audio publication must not gate map material or navigation",
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
assert.equal(exactBootstrapEntries.length, 28);
assert.equal(exactBootstrapEntries.reduce((sum, entry) => sum + entry.byteSize, 0), 863_232);
assert.equal(
  readdirSync(join(root, bootstrapDirectory)).filter((name) => name.endsWith(".mp3")).length,
  exactBootstrapEntries.length,
);
for (const entry of exactBootstrapEntries) {
  assert.match(
    bootstrapModule,
    new RegExp(`require\\(\"\\.\\./assets/audio/learning-v2-bootstrap-v1/${entry.contentHash}\\.mp3\"\\)`, "u"),
  );
}
assert.match(easIgnore, /^!assets\/audio\/learning-v2-bootstrap-v1\/$/mu);

console.log("LEARNING V2 REMOTE AUDIO PACK CONTRACT: PASS");
