import { ensureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration, type AccountGenerationToken } from "./account_generation";
import {
  createLearningV2ActivityAudioTransportV1,
  downloadLearningV2ActivityAudioBytesV1,
} from "./learning_v2_activity_audio_transport_v1";
import { learningV2NativeDecoderIdentityForAudioFileV1 } from "./learning_v2_audio_identity_v1";
import { learningV2EsSession1RemoteAudioFilesV1 } from "./learning_v2_es_session1_production_audio_v1";
import { learningV2EsSession2RemoteAudioFilesV1 } from "./learning_v2_es_session2_production_audio_v1";
import {
  learningV2FactoryRemoteAudioFileForTranscriptVoiceV1,
  learningV2FactoryRemoteAudioFilesForContentHashesV1,
} from "./learning_v2_factory_production_audio_v1";
import { LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1 } from "./learning_v2_factory_lesson_audio_index_v1.generated";
import { getStableId } from "./stable_id";
import { learningV2Lesson1RemoteAudioFilesV1 } from "./learning_v2_lesson1_audio_assets";
import { resolveLearningV2BootstrapAudioOfflineFileV1 } from "./learning_v2_bootstrap_audio_seed_v1";
import { withBackgroundNetworkLease } from "./interactive_network_quiet";
import type { LearningV2InterfaceLocale } from "../modules/learning-v2/content/generator_course_contract";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import type { LearningV2CourseSessionAudioFileV1 } from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  prepareLearningV2VoiceAudioOfflineBytesV1,
  replaceLearningV2VoiceAudioProtectedContentHashesV1,
  resolveLearningV2VoiceAudioOfflineCacheMaterialV1,
} from "../modules/learning-v2/runtime/voice_audio_offline_cache_v1";

export const LEARNING_V2_LESSON_AUDIO_PACK_SCHEMA_V1 =
  "learning-v2-lesson-audio-pack.v1" as const;
const MAX_CONCURRENCY = 6;

export type LearningV2LessonAudioPackSummaryV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_LESSON_AUDIO_PACK_SCHEMA_V1;
  lessonOrdinal: number;
  sessionCount: number;
  fileCount: number;
  totalBytes: number;
  voicesPerCoordinate: 4;
  storage: "durable_documents";
  verification: "exact_sha256_and_byte_size";
  runtimeNetwork: "forbidden";
  packFingerprint: string;
}>;

export type LearningV2SessionAudioPackSummaryV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_LESSON_AUDIO_PACK_SCHEMA_V1;
  lessonOrdinal: number;
  sessionOrdinal: number;
  fileCount: number;
  totalBytes: number;
  voicesPerCoordinate: 4;
  storage: "durable_documents";
  verification: "exact_sha256_and_byte_size";
  runtimeNetwork: "forbidden";
  packFingerprint: string;
}>;

const preparedFileUriByContentHash = new Map<string, string>();

/** Synchronous, network-free lookup after the lesson pack gate is ready. */
export function resolvePreparedLearningV2FactoryWordAudioV1(
  word: string,
): string | null {
  const file = learningV2FactoryRemoteAudioFileForTranscriptVoiceV1(word, "ash");
  if (!file) return null;
  return preparedFileUriByContentHash.get(file.contentHash) ?? null;
}

const ready = new Map<string, LearningV2LessonAudioPackSummaryV1>();
const inFlight = new Map<string, Promise<LearningV2LessonAudioPackSummaryV1>>();
const sessionReady = new Map<string, LearningV2SessionAudioPackSummaryV1>();
const sessionInFlight = new Map<string, Promise<LearningV2SessionAudioPackSummaryV1>>();
const fileHashesByPack = new Map<string, ReadonlySet<string>>();
let retainedLessonOrdinals = new Set<number>();
let retainedTargetLanguage: "en" | "es" = "en";
let retainedPublishedHashes = new Set<string>();

function refreshProtectedHashes(): void {
  const hashes = new Set<string>(retainedPublishedHashes);
  for (const [packKey, packHashes] of fileHashesByPack) {
    const parts = packKey.split(":");
    const targetLanguage = parts.at(-2);
    const lessonOrdinal = Number(parts.at(-1));
    if (targetLanguage !== retainedTargetLanguage || !retainedLessonOrdinals.has(lessonOrdinal)) continue;
    for (const hash of packHashes) hashes.add(hash);
  }
  replaceLearningV2VoiceAudioProtectedContentHashesV1([...hashes]);
}

function key(stableId: string, targetLanguage: "en" | "es", lessonOrdinal: number): string {
  return `${stableId}:${targetLanguage}:${lessonOrdinal}`;
}

function filesForLesson(
  lessonOrdinal: number,
  targetLanguage: "en" | "es",
  _interfaceLocale: LearningV2InterfaceLocale,
): Readonly<{ files: readonly LearningV2CourseSessionAudioFileV1[]; sessionCount: number }> {
  const byHash = new Map<string, LearningV2CourseSessionAudioFileV1>();
  if (targetLanguage === "en") {
    const indexed = LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1[
      lessonOrdinal as keyof typeof LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1
    ];
    if (!indexed) return Object.freeze({ files: Object.freeze([]), sessionCount: 0 });
    for (const file of learningV2FactoryRemoteAudioFilesForContentHashesV1(indexed.contentHashes))
      byHash.set(file.contentHash, file);
    if (lessonOrdinal === 1) {
      for (const file of learningV2Lesson1RemoteAudioFilesV1()) byHash.set(file.contentHash, file);
    }
    return Object.freeze({ files: Object.freeze([...byHash.values()]), sessionCount: indexed.sessionCount });
  }
  if (lessonOrdinal !== 1) return Object.freeze({ files: Object.freeze([]), sessionCount: 0 });
  const files = [
    ...learningV2EsSession1RemoteAudioFilesV1(),
    ...learningV2EsSession2RemoteAudioFilesV1(),
  ];
  for (const file of files) {
    const prior = byHash.get(file.contentHash);
    if (prior && (prior.byteSize !== file.byteSize || prior.objectPath !== file.objectPath))
      throw new Error("learning_v2_lesson_audio_pack_hash_collision");
    byHash.set(file.contentHash, file);
  }
  return Object.freeze({ files: Object.freeze([...byHash.values()]), sessionCount: 2 });
}

function filesForSession(
  lessonOrdinal: number,
  sessionOrdinal: number,
  targetLanguage: "en" | "es",
): readonly LearningV2CourseSessionAudioFileV1[] {
  if (targetLanguage === "en") {
    const lesson = LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1[
      lessonOrdinal as keyof typeof LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1
    ];
    if (!lesson) return Object.freeze([]);
    const session = lesson.sessions[sessionOrdinal as keyof typeof lesson.sessions];
    if (!session) return Object.freeze([]);
    return learningV2FactoryRemoteAudioFilesForContentHashesV1(session.contentHashes);
  }
  if (lessonOrdinal !== 1) return Object.freeze([]);
  if (sessionOrdinal === 1) return learningV2EsSession1RemoteAudioFilesV1();
  if (sessionOrdinal === 2) return learningV2EsSession2RemoteAudioFilesV1();
  return Object.freeze([]);
}

async function runPool(length: number, work: (index: number) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENCY, length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= length) return;
      await work(index);
    }
  }));
}

async function prepareFiles(input: {
  readonly files: readonly LearningV2CourseSessionAudioFileV1[];
  readonly stableId: string;
  readonly account: AccountGenerationToken;
  readonly loadBytes: (file: LearningV2CourseSessionAudioFileV1) => Promise<Uint8Array>;
  readonly onProgress?: (completed: number, total: number) => void;
}): Promise<void> {
  let completed = 0;
  input.onProgress?.(0, input.files.length);
  await runPool(input.files.length, async (index) => {
    if (!isCurrentAccountGeneration(input.account, input.stableId))
      throw new Error("learning_v2_lesson_audio_pack_account_changed");
    const file = input.files[index]!;
    const identity = learningV2NativeDecoderIdentityForAudioFileV1(file, index);
    const bundled = await resolveLearningV2BootstrapAudioOfflineFileV1(identity);
    const handle = bundled ?? await prepareLearningV2VoiceAudioOfflineBytesV1({
      identity,
      loadBytes: () => input.loadBytes(file),
    });
    if (!isCurrentAccountGeneration(input.account, input.stableId))
      throw new Error("learning_v2_lesson_audio_pack_account_changed");
    const material = resolveLearningV2VoiceAudioOfflineCacheMaterialV1({ handle, identity });
    if (!isCurrentAccountGeneration(input.account, input.stableId))
      throw new Error("learning_v2_lesson_audio_pack_account_changed");
    preparedFileUriByContentHash.set(file.contentHash, material.fileUri);
    completed += 1;
    input.onProgress?.(completed, input.files.length);
  });
}

export function isLearningV2LessonAudioPackReadyV1(input: {
  readonly stableId: string;
  readonly targetLanguage: "en" | "es";
  readonly lessonOrdinal: number;
}): boolean {
  return ready.has(key(input.stableId, input.targetLanguage, input.lessonOrdinal));
}

export function isLearningV2LessonAudioPackPublishedV1(input: {
  readonly targetLanguage: "en" | "es";
  readonly lessonOrdinal: number;
}): boolean {
  if (input.targetLanguage === "en") {
    return Object.prototype.hasOwnProperty.call(
      LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1,
      input.lessonOrdinal,
    );
  }
  return input.lessonOrdinal === 1;
}

export function learningV2PublishedAudioLessonOrdinalsV1(
  targetLanguage: "en" | "es",
): readonly number[] {
  if (targetLanguage === "es") return Object.freeze([1]);
  return Object.freeze(
    Object.keys(LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1)
      .map(Number)
      .filter((ordinal) => Number.isSafeInteger(ordinal) && ordinal >= 1 && ordinal <= 32)
      .sort((left, right) => left - right),
  );
}

export function isLearningV2SessionAudioPublishedV1(input: {
  readonly targetLanguage: "en" | "es";
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
}): boolean {
  if (input.targetLanguage === "en") {
    const indexed = LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1[
      input.lessonOrdinal as keyof typeof LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1
    ];
    return indexed?.sessionOrdinals.some((ordinal) => ordinal === input.sessionOrdinal) ?? false;
  }
  return input.lessonOrdinal === 1 && (input.sessionOrdinal === 1 || input.sessionOrdinal === 2);
}

export function retainLearningV2LessonAudioPacksV1(input: {
  readonly targetLanguage: "en" | "es";
  readonly lessonOrdinals: readonly number[];
}): void {
  retainedTargetLanguage = input.targetLanguage;
  retainedLessonOrdinals = new Set(input.lessonOrdinals.filter(
    (ordinal) => Number.isSafeInteger(ordinal) && ordinal >= 1 && ordinal <= 32,
  ));
  retainedPublishedHashes = new Set<string>();
  for (const lessonOrdinal of retainedLessonOrdinals) {
    const { files } = filesForLesson(lessonOrdinal, input.targetLanguage, "en");
    for (const file of files) retainedPublishedHashes.add(file.contentHash);
  }
  refreshProtectedHashes();
}

export async function prepareLearningV2LessonAudioPackV1(input: {
  readonly lessonOrdinal: number;
  readonly targetLanguage: "en" | "es";
  readonly interfaceLocale: LearningV2InterfaceLocale;
  readonly onProgress?: (completed: number, total: number) => void;
  readonly signal?: AbortSignal;
}): Promise<LearningV2LessonAudioPackSummaryV1> {
  if (!Number.isSafeInteger(input.lessonOrdinal) || input.lessonOrdinal < 1 || input.lessonOrdinal > 32)
    throw new Error("learning_v2_lesson_audio_pack_invalid");
  const stableId = await getStableId();
  const account = ensureAccountGeneration(stableId);
  const packKey = key(stableId, input.targetLanguage, input.lessonOrdinal);
  const existing = ready.get(packKey);
  if (existing) return existing;
  const pending = inFlight.get(packKey);
  if (pending) return pending;

  let operation: Promise<LearningV2LessonAudioPackSummaryV1>;
  operation = withBackgroundNetworkLease("learning-v2.lesson-audio-pack", async (lease) => {
    const { files, sessionCount } = filesForLesson(
      input.lessonOrdinal,
      input.targetLanguage,
      input.interfaceLocale,
    );
    if (sessionCount === 0) throw new Error("learning_v2_lesson_audio_pack_empty");
    fileHashesByPack.set(packKey, new Set(files.map((file) => file.contentHash)));
    refreshProtectedHashes();
    let transportPromise: ReturnType<typeof createLearningV2ActivityAudioTransportV1> | null = null;
    await prepareFiles({
      files,
      stableId,
      account,
      onProgress: input.onProgress,
      loadBytes: async (file) => {
        transportPromise ??= createLearningV2ActivityAudioTransportV1({ account, lease });
        return downloadLearningV2ActivityAudioBytesV1({ entry: file, transport: await transportPromise });
      },
    });
    if (!isCurrentAccountGeneration(account, stableId))
      throw new Error("learning_v2_lesson_audio_pack_account_changed");
    const body = {
      schemaVersion: LEARNING_V2_LESSON_AUDIO_PACK_SCHEMA_V1,
      lessonOrdinal: input.lessonOrdinal,
      sessionCount,
      fileCount: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.byteSize, 0),
      voicesPerCoordinate: 4 as const,
      storage: "durable_documents" as const,
      verification: "exact_sha256_and_byte_size" as const,
      runtimeNetwork: "forbidden" as const,
    };
    const summary = Object.freeze({
      ...body,
      packFingerprint: hashCanonicalBody({ ...body, files: files.map((file) => file.fileFingerprint) }),
    });
    ready.set(packKey, summary);
    return summary;
  }, input.signal).finally(() => {
    if (inFlight.get(packKey) === operation) inFlight.delete(packKey);
  });
  inFlight.set(packKey, operation);
  return operation;
}

export async function prepareLearningV2SessionAudioPackV1(input: {
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
  readonly signal?: AbortSignal;
  readonly targetLanguage: "en" | "es";
  readonly onProgress?: (completed: number, total: number) => void;
}): Promise<LearningV2SessionAudioPackSummaryV1> {
  if (
    !Number.isSafeInteger(input.lessonOrdinal) || input.lessonOrdinal < 1 || input.lessonOrdinal > 32 ||
    !Number.isSafeInteger(input.sessionOrdinal) || input.sessionOrdinal < 1 || input.sessionOrdinal > 56
  ) throw new Error("learning_v2_session_audio_pack_invalid");
  const stableId = await getStableId();
  const account = ensureAccountGeneration(stableId);
  const packKey = `${key(stableId, input.targetLanguage, input.lessonOrdinal)}:session:${input.sessionOrdinal}`;
  const existing = sessionReady.get(packKey);
  if (existing) return existing;
  const pending = sessionInFlight.get(packKey);
  if (pending) return pending;
  const files = filesForSession(input.lessonOrdinal, input.sessionOrdinal, input.targetLanguage);
  if (files.length === 0) throw new Error("learning_v2_session_audio_pack_empty");
  const retentionKey = key(stableId, input.targetLanguage, input.lessonOrdinal);
  const protectedHashes = new Set(fileHashesByPack.get(retentionKey) ?? []);
  files.forEach((file) => protectedHashes.add(file.contentHash));
  fileHashesByPack.set(retentionKey, protectedHashes);
  refreshProtectedHashes();
  let operation: Promise<LearningV2SessionAudioPackSummaryV1>;
  operation = withBackgroundNetworkLease("learning-v2.session-audio-pack", async (lease) => {
    let transportPromise: ReturnType<typeof createLearningV2ActivityAudioTransportV1> | null = null;
    await prepareFiles({
      files,
      stableId,
      account,
      onProgress: input.onProgress,
      loadBytes: async (file) => {
        transportPromise ??= createLearningV2ActivityAudioTransportV1({ account, lease });
        return downloadLearningV2ActivityAudioBytesV1({ entry: file, transport: await transportPromise });
      },
    });
    if (!isCurrentAccountGeneration(account, stableId))
      throw new Error("learning_v2_lesson_audio_pack_account_changed");
    const body = {
      schemaVersion: LEARNING_V2_LESSON_AUDIO_PACK_SCHEMA_V1,
      lessonOrdinal: input.lessonOrdinal,
      sessionOrdinal: input.sessionOrdinal,
      fileCount: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.byteSize, 0),
      voicesPerCoordinate: 4 as const,
      storage: "durable_documents" as const,
      verification: "exact_sha256_and_byte_size" as const,
      runtimeNetwork: "forbidden" as const,
    };
    const summary = Object.freeze({
      ...body,
      packFingerprint: hashCanonicalBody({ ...body, files: files.map((file) => file.fileFingerprint) }),
    });
    sessionReady.set(packKey, summary);
    return summary;
  }, input.signal).finally(() => {
    if (sessionInFlight.get(packKey) === operation) sessionInFlight.delete(packKey);
  });
  sessionInFlight.set(packKey, operation);
  return operation;
}

subscribeAccountGeneration(() => {
  ready.clear();
  inFlight.clear();
  sessionReady.clear();
  sessionInFlight.clear();
  fileHashesByPack.clear();
  preparedFileUriByContentHash.clear();
  refreshProtectedHashes();
});
