export const LEARNING_V2_AUDIO_RELEASE_SCHEMA =
  "learning-v2-audio-release-manifest.v1" as const;
export const LEARNING_V2_AUDIO_LESSON_SCHEMA =
  "learning-v2-audio-lesson-catalog.v1" as const;
export const LEARNING_V2_AUDIO_MAX_PACK_BYTES = 8 * 1024 * 1024;
export const LEARNING_V2_AUDIO_MAX_CLIP_BYTES = 512 * 1024;
export const LEARNING_V2_AUDIO_MAX_CATALOG_BYTES = 12 * 1024 * 1024;
export const LEARNING_V2_AUDIO_CACHE_MAX_BYTES = 96 * 1024 * 1024;
export const LEARNING_V2_AUDIO_CACHE_TARGET_BYTES = 80 * 1024 * 1024;

export type LearningV2AudioStudyTarget = "en" | "es";
export interface LearningV2AudioManifestLesson {
  readonly lessonOrdinal: number;
  readonly startOrdinal: number;
  readonly endOrdinal: number;
  readonly byteSize: number;
  readonly sha256: string;
  readonly objectPath: string;
}
export interface LearningV2AudioReleaseManifest {
  readonly schemaVersion: typeof LEARNING_V2_AUDIO_RELEASE_SCHEMA;
  readonly studyTarget: LearningV2AudioStudyTarget;
  readonly releaseId: string;
  readonly availability: "generated_ready";
  readonly totalSessionCount: number;
  readonly lessons: readonly LearningV2AudioManifestLesson[];
}
export interface LearningV2AudioClipIndex {
  readonly sha256: string;
  readonly offset: number;
  readonly byteSize: number;
}
export interface LearningV2AudioPack {
  readonly packId: string;
  readonly sha256: string;
  readonly byteSize: number;
  readonly objectPath: string;
  readonly clips: readonly LearningV2AudioClipIndex[];
}
export interface LearningV2AudioPhraseIndex {
  readonly clip: LearningV2AudioClipIndex;
  readonly pack: LearningV2AudioPack;
}
export interface LearningV2AudioLessonCatalog {
  readonly schemaVersion: typeof LEARNING_V2_AUDIO_LESSON_SCHEMA;
  readonly studyTarget: LearningV2AudioStudyTarget;
  readonly releaseId: string;
  readonly lessonOrdinal: number;
  readonly startOrdinal: number;
  readonly endOrdinal: number;
  readonly packs: readonly LearningV2AudioPack[];
  readonly sessions: readonly Readonly<{
    ordinal: number;
    sessionOrdinal: number;
    phrases: readonly Readonly<{ textKey: string; clipSha256: string }>[];
  }>[];
  readonly packsBySha256: ReadonlyMap<string, LearningV2AudioPack>;
  readonly clipsBySha256: ReadonlyMap<string, LearningV2AudioPhraseIndex>;
  readonly sessionsByOrdinal: ReadonlyMap<
    number,
    Readonly<{
      sessionOrdinal: number;
      phrases: ReadonlyMap<string, LearningV2AudioPhraseIndex>;
    }>
  >;
}
export interface LearningV2ProgressiveAudioWindow {
  readonly requiredStartOrdinal: number;
  readonly targetEndOrdinal: number;
  readonly retainOrdinals: readonly number[];
}

const HASH = /^[a-f0-9]{64}$/u;
const PACK_ID = /^(?:base|delta)-[a-z0-9-]{1,96}$/u;
const plain = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;
const keys = (
  value: Record<string, unknown>,
  expected: readonly string[],
): boolean =>
  Object.keys(value).sort().join("|") === [...expected].sort().join("|");
const invalid = (): never => {
  throw new Error("learning_v2_progressive_audio_catalog_invalid");
};
const ordinal = (value: unknown, max = 10_000): number => {
  if (
    !Number.isSafeInteger(value) ||
    (value as number) < 1 ||
    (value as number) > max
  )
    invalid();
  return value as number;
};
const hash = (value: unknown): string => {
  if (typeof value !== "string" || !HASH.test(value)) invalid();
  return value as string;
};

export function normalizeLearningV2RecordedText(value: string): string {
  if (typeof value !== "string") invalid();
  const result = value.normalize("NFC").trim().replace(/\s+/gu, " ");
  if (!result || result.length > 1_000) invalid();
  return result;
}

export function parseLearningV2AudioReleaseManifest(
  value: unknown,
): LearningV2AudioReleaseManifest {
  if (
    !plain(value) ||
    !keys(value, [
      "schemaVersion",
      "studyTarget",
      "releaseId",
      "availability",
      "totalSessionCount",
      "lessons",
    ]) ||
    value.schemaVersion !== LEARNING_V2_AUDIO_RELEASE_SCHEMA ||
    (value.studyTarget !== "en" && value.studyTarget !== "es") ||
    value.availability !== "generated_ready" ||
    !Array.isArray(value.lessons) ||
    value.lessons.length < 1 ||
    value.lessons.length > 1_000
  )
    invalid();
  const manifest = value as Record<string, unknown> & {
    studyTarget: LearningV2AudioStudyTarget;
    lessons: unknown[];
  };
  const studyTarget = manifest.studyTarget;
  const releaseId = hash(manifest.releaseId);
  const totalSessionCount = ordinal(manifest.totalSessionCount);
  let expectedStart = 1;
  const lessons = manifest.lessons.map(
    (row, index): LearningV2AudioManifestLesson => {
      if (
        !plain(row) ||
        !keys(row, [
          "lessonOrdinal",
          "startOrdinal",
          "endOrdinal",
          "byteSize",
          "sha256",
          "objectPath",
        ])
      )
        invalid();
      const lessonRow = row as Record<string, unknown>;
      const lessonOrdinal = ordinal(lessonRow.lessonOrdinal, 1_000);
      const startOrdinal = ordinal(lessonRow.startOrdinal);
      const endOrdinal = ordinal(lessonRow.endOrdinal);
      const sha256 = hash(lessonRow.sha256);
      if (
        lessonOrdinal !== index + 1 ||
        startOrdinal !== expectedStart ||
        endOrdinal < startOrdinal ||
        !Number.isSafeInteger(lessonRow.byteSize) ||
        (lessonRow.byteSize as number) < 100 ||
        (lessonRow.byteSize as number) > LEARNING_V2_AUDIO_MAX_CATALOG_BYTES ||
        lessonRow.objectPath !==
          `learning-v2/voice-audio/v1/${studyTarget}/releases/${releaseId}/lessons/l${String(lessonOrdinal).padStart(3, "0")}-${sha256}.json`
      )
        invalid();
      expectedStart = endOrdinal + 1;
      return Object.freeze({
        lessonOrdinal,
        startOrdinal,
        endOrdinal,
        byteSize: lessonRow.byteSize as number,
        sha256,
        objectPath: lessonRow.objectPath as string,
      });
    },
  );
  if (expectedStart - 1 !== totalSessionCount) invalid();
  return Object.freeze({
    schemaVersion: LEARNING_V2_AUDIO_RELEASE_SCHEMA,
    studyTarget,
    releaseId,
    availability: "generated_ready",
    totalSessionCount,
    lessons: Object.freeze(lessons),
  });
}

export function parseLearningV2AudioLessonCatalog(
  value: unknown,
): LearningV2AudioLessonCatalog {
  if (
    !plain(value) ||
    !keys(value, [
      "schemaVersion",
      "studyTarget",
      "releaseId",
      "lessonOrdinal",
      "startOrdinal",
      "endOrdinal",
      "packs",
      "sessions",
    ]) ||
    value.schemaVersion !== LEARNING_V2_AUDIO_LESSON_SCHEMA ||
    (value.studyTarget !== "en" && value.studyTarget !== "es") ||
    !Array.isArray(value.packs) ||
    value.packs.length < 1 ||
    value.packs.length > 2_000 ||
    !Array.isArray(value.sessions) ||
    value.sessions.length < 1 ||
    value.sessions.length > 1_000
  )
    invalid();
  const catalog = value as Record<string, unknown> & {
    studyTarget: LearningV2AudioStudyTarget;
    packs: unknown[];
    sessions: unknown[];
  };
  const studyTarget = catalog.studyTarget;
  const releaseId = hash(catalog.releaseId);
  const lessonOrdinal = ordinal(catalog.lessonOrdinal, 1_000);
  const startOrdinal = ordinal(catalog.startOrdinal);
  const endOrdinal = ordinal(catalog.endOrdinal);
  if (
    endOrdinal < startOrdinal ||
    catalog.sessions.length !== endOrdinal - startOrdinal + 1
  )
    invalid();
  const clipsBySha256 = new Map<string, LearningV2AudioPhraseIndex>();
  const packsBySha256 = new Map<string, LearningV2AudioPack>();
  const packs = catalog.packs.map((row): LearningV2AudioPack => {
    if (
      !plain(row) ||
      !keys(row, ["packId", "sha256", "byteSize", "objectPath", "clips"]) ||
      typeof row.packId !== "string" ||
      !PACK_ID.test(row.packId) ||
      !Array.isArray(row.clips) ||
      row.clips.length < 1 ||
      row.clips.length > 2_000
    )
      invalid();
    const packRow = row as Record<string, unknown> & { packId: string; clips: unknown[] };
    const packId = packRow.packId;
    const sha256 = hash(packRow.sha256);
    if (
      !Number.isSafeInteger(packRow.byteSize) ||
      (packRow.byteSize as number) < 200 ||
      (packRow.byteSize as number) > LEARNING_V2_AUDIO_MAX_PACK_BYTES ||
      packRow.objectPath !==
        `learning-v2/voice-audio/v1/${studyTarget}/packs/${packId}-${sha256}.bin`
    )
      invalid();
    let expectedOffset = 0;
    const clips = packRow.clips.map((clip): LearningV2AudioClipIndex => {
      if (!plain(clip) || !keys(clip, ["sha256", "offset", "byteSize"]))
        invalid();
      const clipRow = clip as Record<string, unknown>;
      const clipSha = hash(clipRow.sha256);
      if (
        !Number.isSafeInteger(clipRow.offset) ||
        clipRow.offset !== expectedOffset ||
        !Number.isSafeInteger(clipRow.byteSize) ||
        (clipRow.byteSize as number) < 200 ||
        (clipRow.byteSize as number) > LEARNING_V2_AUDIO_MAX_CLIP_BYTES
      )
        invalid();
      const parsed = Object.freeze({
        sha256: clipSha,
        offset: clipRow.offset as number,
        byteSize: clipRow.byteSize as number,
      });
      expectedOffset += parsed.byteSize;
      return parsed;
    });
    if (expectedOffset !== packRow.byteSize || packsBySha256.has(sha256)) invalid();
    const pack = Object.freeze({
      packId,
      sha256,
      byteSize: packRow.byteSize as number,
      objectPath: packRow.objectPath as string,
      clips: Object.freeze(clips),
    });
    packsBySha256.set(sha256, pack);
    for (const clip of clips) {
      if (clipsBySha256.has(clip.sha256)) invalid();
      clipsBySha256.set(clip.sha256, Object.freeze({ clip, pack }));
    }
    return pack;
  });
  const sessionsByOrdinal = new Map<
    number,
    Readonly<{
      sessionOrdinal: number;
      phrases: ReadonlyMap<string, LearningV2AudioPhraseIndex>;
    }>
  >();
  const sessions = catalog.sessions.map((row, index) => {
    if (
      !plain(row) ||
      !keys(row, ["ordinal", "sessionOrdinal", "phrases"]) ||
      !Array.isArray(row.phrases) ||
      row.phrases.length < 1 ||
      row.phrases.length > 5_000
    )
      invalid();
    const sessionRow = row as Record<string, unknown> & { phrases: unknown[] };
    const absolute = ordinal(sessionRow.ordinal);
    const sessionOrdinal = ordinal(sessionRow.sessionOrdinal, 1_000);
    if (absolute !== startOrdinal + index || sessionsByOrdinal.has(absolute))
      invalid();
    const phraseMap = new Map<string, LearningV2AudioPhraseIndex>();
    const phrases = sessionRow.phrases.map((phrase) => {
      if (
        !plain(phrase) ||
        !keys(phrase, ["textKey", "clipSha256"]) ||
        typeof phrase.textKey !== "string"
      )
        invalid();
      const phraseRow = phrase as Record<string, unknown> & { textKey: string };
      const textKey = normalizeLearningV2RecordedText(phraseRow.textKey);
      if (textKey !== phraseRow.textKey || phraseMap.has(textKey)) invalid();
      const clipSha256 = hash(phraseRow.clipSha256);
      const indexed = clipsBySha256.get(clipSha256);
      if (!indexed) invalid();
      phraseMap.set(textKey, indexed as LearningV2AudioPhraseIndex);
      return Object.freeze({ textKey, clipSha256 });
    });
    sessionsByOrdinal.set(
      absolute,
      Object.freeze({ sessionOrdinal, phrases: phraseMap }),
    );
    return Object.freeze({
      ordinal: absolute,
      sessionOrdinal,
      phrases: Object.freeze(phrases),
    });
  });
  return Object.freeze({
    schemaVersion: LEARNING_V2_AUDIO_LESSON_SCHEMA,
    studyTarget,
    releaseId,
    lessonOrdinal,
    startOrdinal,
    endOrdinal,
    packs: Object.freeze(packs),
    sessions: Object.freeze(sessions),
    packsBySha256,
    clipsBySha256,
    sessionsByOrdinal,
  });
}

export function planLearningV2ProgressiveAudioWindow(
  input: Readonly<{ completedPrefixCount: number; totalSessionCount: number }>,
): LearningV2ProgressiveAudioWindow {
  if (
    !Number.isSafeInteger(input.completedPrefixCount) ||
    input.completedPrefixCount < 0 ||
    !Number.isSafeInteger(input.totalSessionCount) ||
    input.totalSessionCount < 1 ||
    input.completedPrefixCount > input.totalSessionCount
  )
    throw new Error("learning_v2_progressive_audio_progress_invalid");
  const current = Math.min(
    input.totalSessionCount,
    input.completedPrefixCount + 1,
  );
  const end =
    input.completedPrefixCount < 1
      ? 1
      : input.completedPrefixCount < 8
        ? 8
        : input.completedPrefixCount < 16
          ? 16
          : input.completedPrefixCount < 56
            ? 56
            : Math.max(112, input.completedPrefixCount + 56);
  const currentChapterStart = Math.floor((current - 1) / 8) * 8 + 1;
  const retainOrdinals = Array.from(
    {
      length:
        Math.min(input.totalSessionCount, currentChapterStart + 15) -
        currentChapterStart +
        1,
    },
    (_, index) => currentChapterStart + index,
  );
  return Object.freeze({
    requiredStartOrdinal: current,
    targetEndOrdinal: Math.min(input.totalSessionCount, end),
    retainOrdinals: Object.freeze(retainOrdinals),
  });
}
