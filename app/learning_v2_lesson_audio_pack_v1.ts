import { ensureAccountGeneration, isCurrentAccountGeneration, subscribeAccountGeneration, type AccountGenerationToken } from "./account_generation";
import { learningV2NativeDecoderIdentityForAudioFileV1 } from "./learning_v2_audio_identity_v1";
import { learningV2EsSession1RemoteAudioFilesV1 } from "./learning_v2_es_session1_production_audio_v1";
import { learningV2EsSession2RemoteAudioFilesV1 } from "./learning_v2_es_session2_production_audio_v1";
import {
  learningV2FactoryHasAudibleAudioForContentHashV1,
  learningV2FactorySessionClipHashesV1,
  learningV2FactoryWordAudioFileV1,
  learningV2FactoryRemoteAudioFilesForContentHashesV1,
  warmLearningV2FactoryAudioTablesV1,
} from "./learning_v2_factory_production_audio_v1";
import { fetchLearningV2RemoteAudioBytesV1, LearningV2RemoteAudioErrorV1 } from "./learning_v2_remote_audio_v1";
import { lazyContent } from "./content_lazy";
import { getStableId } from "./stable_id";
import { learningV2Lesson1RemoteAudioFilesV1 } from "./learning_v2_lesson1_audio_assets";
import { resolveLearningV2BootstrapAudioOfflineFileV1 } from "./learning_v2_bootstrap_audio_seed_v1";
import type { LearningV2InterfaceLocale } from "../modules/learning-v2/content/generator_course_contract";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import type { LearningV2CourseSessionAudioFileV1 } from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  prepareLearningV2VoiceAudioOfflineBytesV1,
  replaceLearningV2VoiceAudioProtectedContentHashesV1,
  resolveLearningV2VoiceAudioOfflineCacheMaterialV1,
  resolvePreparedLearningV2VoiceAudioOfflineFileV1,
} from "../modules/learning-v2/runtime/voice_audio_offline_cache_v1";

type FactoryLessonAudioIndexModuleV1 = typeof import("./learning_v2_factory_lesson_audio_index_v1.generated");
type FactoryLessonAudioIndexV1 = FactoryLessonAudioIndexModuleV1["LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1"];
// зачем (PM-216, [CONTENT-LAZY]): 515 КБ индекса «урок → озвучка» нужны только при работе с озвучкой занятия;
// раньше выполнялись при импорте экрана плеера на старте.
const factoryLessonAudioIndex = lazyContent("learning_v2_factory_lesson_audio_index", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require("./learning_v2_factory_lesson_audio_index_v1.generated") as FactoryLessonAudioIndexModuleV1)
    .LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1;
});

/**
 * Строит обе таблицы озвучки (записи + индекс «урок → озвучка») заранее, чтобы вход в занятие не замирал на их разовой сборке.
 * зачем (Сверка 21.10, пункт №39): вызывается после первого кадра карты курса; повторные вызовы бесплатны (lazyContent).
 */
export function warmLearningV2AudioTablesV1(): void {
  warmLearningV2FactoryAudioTablesV1();
  try {
    factoryLessonAudioIndex();
  } catch (error) {
    console.warn("[AUDIO-TABLES-WARM] index_failed", error instanceof Error ? error.message : String(error));
  }
}

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
  runtimeNetwork: "storage_on_local_miss";
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
  runtimeNetwork: "storage_on_local_miss";
  packFingerprint: string;
}>;

const preparedFileUriByContentHash = new Map<string, string>();

/** Synchronous, network-free lookup after the lesson pack gate is ready. */
export function resolvePreparedLearningV2FactoryWordAudioV1(
  word: string,
): string | null {
  // зачем (17.10): тот же голос слова, что при подготовке занятия — ash, иначе записанный голос слова.
  const file = learningV2FactoryWordAudioFileV1(word);
  if (!file) return null;
  return preparedFileUriByContentHash.get(file.contentHash) ?? null;
}

const ready = new Map<string, LearningV2LessonAudioPackSummaryV1>();
const inFlight = new Map<string, Promise<LearningV2LessonAudioPackSummaryV1>>();
const sessionReady = new Map<string, LearningV2SessionAudioPackSummaryV1>();
const sessionInFlight = new Map<string, { generation: number; operation: Promise<LearningV2SessionAudioPackSummaryV1> }>();
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

// зачем (Ревизор 3.42, R125, 18.10): в индексе прогрева L1 S1 оказался тихий хеш, рантайм его уже не знает, и
// learningV2FactoryRemoteAudioFilesForContentHashesV1 бросал — падал прогрев всего занятия. Незнакомый хеш теперь
// выкидывается здесь с причиной в логе; такой файл и так не звучал бы (плеер подставит голос телефона).
function factoryFilesForIndexedHashes(
  contentHashes: readonly string[],
  where: string,
): readonly LearningV2CourseSessionAudioFileV1[] {
  const known = contentHashes.filter((contentHash) => learningV2FactoryHasAudibleAudioForContentHashV1(contentHash));
  if (known.length !== contentHashes.length) {
    const dropped = contentHashes.filter((contentHash) => !known.includes(contentHash));
    console.warn(
      "[V2-PREWARM] index_hash_unknown_dropped",
      JSON.stringify({ where, dropped: dropped.length, total: contentHashes.length, sample: dropped.slice(0, 3) }),
    );
  }
  return learningV2FactoryRemoteAudioFilesForContentHashesV1(known);
}

function filesForLesson(
  lessonOrdinal: number,
  targetLanguage: "en" | "es",
  _interfaceLocale: LearningV2InterfaceLocale,
): Readonly<{ files: readonly LearningV2CourseSessionAudioFileV1[]; sessionCount: number }> {
  const byHash = new Map<string, LearningV2CourseSessionAudioFileV1>();
  if (targetLanguage === "en") {
    const indexed = factoryLessonAudioIndex()[
      lessonOrdinal as keyof FactoryLessonAudioIndexV1
    ];
    if (!indexed) return Object.freeze({ files: Object.freeze([]), sessionCount: 0 });
    for (const file of factoryFilesForIndexedHashes(indexed.contentHashes, `lesson:${lessonOrdinal}`))
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
    const lesson = factoryLessonAudioIndex()[
      lessonOrdinal as keyof FactoryLessonAudioIndexV1
    ];
    // Индекс содержит все опубликованные занятия, включая карточки слов.
    const session = lesson?.sessions[sessionOrdinal as keyof typeof lesson.sessions];
    const hashes = new Set<string>(session?.contentHashes ?? []);
    // Полный индекс текущего выпуска — точный список фактически используемых файлов.
    // Резерв нужен только для ещё не попавшей в индекс сессии.
    if (!session) for (const hash of learningV2FactorySessionClipHashesV1(lessonOrdinal, sessionOrdinal)) hashes.add(hash);
    if (hashes.size === 0) return Object.freeze([]);
    return factoryFilesForIndexedHashes([...hashes], `lesson:${lessonOrdinal}:session:${sessionOrdinal}`);
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

// Решение владельца 18.10: курс 96 кбит/с, в сборке пять первых занятий; порядок —
// стартовый бандл → уже скачанное (кэш на диске) → сеть (Storage, точная сверка sha256 и размера) → голос телефона.
// Сеть — только при промахе локального, одна загрузка на файл навсегда (кэш), не больше NETWORK_SLOTS одновременно на
// весь процесс, 404 запоминается до перезапуска (не долбим Storage файлом, которого там нет). Скорость старта не страдает:
// подготовка — фоном, после первого кадра; занятие открывается и без файла, плеер подставит TTS
// (`learning_v2_direct_session_player_v1.tsx`).
const NETWORK_SLOTS = 6;
let networkActive = 0;
const networkWaiters: (() => void)[] = [];
const remoteMissingHashes = new Set<string>();
async function withNetworkSlot<T>(work: () => Promise<T>): Promise<T> {
  while (networkActive >= NETWORK_SLOTS) await new Promise<void>((resolve) => networkWaiters.push(resolve));
  networkActive += 1;
  try {
    return await work();
  } finally {
    networkActive -= 1;
    networkWaiters.shift()?.();
  }
}

type PrepareStatsV1 = { local: number; network: number; tts: number; reasons: Record<string, number> };

async function prepareFiles(input: {
  readonly files: readonly LearningV2CourseSessionAudioFileV1[];
  readonly stableId: string;
  readonly account: AccountGenerationToken;
  readonly onProgress?: (completed: number, total: number) => void;
  readonly where?: string;
  readonly stillNeeded?: () => boolean;
}): Promise<PrepareStatsV1> {
  let completed = 0;
  const stats: PrepareStatsV1 = { local: 0, network: 0, tts: 0, reasons: {} };
  const startedAt = Date.now();
  input.onProgress?.(0, input.files.length);
  await runPool(input.files.length, async (index) => {
    if (input.stillNeeded?.() === false) return;
    if (!isCurrentAccountGeneration(input.account, input.stableId))
      throw new Error("learning_v2_lesson_audio_pack_account_changed");
    const file = input.files[index]!;
    const identity = learningV2NativeDecoderIdentityForAudioFileV1(file, index);
    let handle =
      (await resolveLearningV2BootstrapAudioOfflineFileV1(identity)) ??
      (await resolvePreparedLearningV2VoiceAudioOfflineFileV1(identity));
    if (input.stillNeeded?.() === false) return;
    if (handle) stats.local += 1;
    if (!handle && !remoteMissingHashes.has(file.contentHash)) {
      try {
        handle = await withNetworkSlot(() => {
          if (input.stillNeeded?.() === false) throw new Error("learning_v2_audio_ahead_superseded");
          return prepareLearningV2VoiceAudioOfflineBytesV1({
          identity,
          loadBytes: () => fetchLearningV2RemoteAudioBytesV1({
            objectPath: file.objectPath,
            contentHash: file.contentHash,
            byteSize: file.byteSize,
            where: input.where ?? "lesson_audio_pack",
          }),
          });
        });
        stats.network += 1;
      } catch (error) {
        if (input.stillNeeded?.() === false) return;
        const reason = error instanceof LearningV2RemoteAudioErrorV1 ? error.reason : "verify_or_write_failed";
        stats.reasons[reason] = (stats.reasons[reason] ?? 0) + 1;
        if (reason === "not_found") remoteMissingHashes.add(file.contentHash);
        console.warn("[AUDIO-REMOTE] file_failed", JSON.stringify({ where: input.where, reason, contentHash: file.contentHash.slice(0, 12), detail: (error instanceof Error ? error.message : String(error)).slice(0, 160) }));
      }
    }
    if (!isCurrentAccountGeneration(input.account, input.stableId))
      throw new Error("learning_v2_lesson_audio_pack_account_changed");
    if (!handle) {
      // Немой пропуск запрещён: без этой строки «тихая фраза» неотличима от
      // бага прогрева. TTS-фолбэк называет причину сам, эта — на уровне пака.
      stats.tts += 1;
      console.warn(
        "[V2-AUDIO-TTS] lesson_audio_pack_file_not_local",
        JSON.stringify({ contentHash: file.contentHash, objectPath: file.objectPath, remoteMissing: remoteMissingHashes.has(file.contentHash) }),
      );
      completed += 1;
      input.onProgress?.(completed, input.files.length);
      return;
    }
    const material = resolveLearningV2VoiceAudioOfflineCacheMaterialV1({ handle, identity });
    if (!isCurrentAccountGeneration(input.account, input.stableId))
      throw new Error("learning_v2_lesson_audio_pack_account_changed");
    preparedFileUriByContentHash.set(file.contentHash, material.fileUri);
    completed += 1;
    input.onProgress?.(completed, input.files.length);
  });
  console.log("[AUDIO-REMOTE] pack_done", JSON.stringify({ where: input.where, files: input.files.length, ...stats, ms: Date.now() - startedAt })); // guard-ok: одна строка итога на пак
  return stats;
}

// Владелец 18.10: на любой сети готовим только два следующих занятия. Новое открытое занятие
// отменяет прежнюю очередь; уже начавшийся запрос может закончиться, новые запросы из неё не запускаются.
const LESSON_AHEAD_DELAY_MS = 4_000;
const SESSIONS_PER_LESSON = 56;
const LAST_LESSON = 32;
const AUDIO_AHEAD_SESSION_COUNT = 2;
let activeAheadKey: string | null = null;
let aheadGeneration = 0;
let scheduledAheadGeneration = -1;
let aheadTimer: ReturnType<typeof setTimeout> | null = null;

export function learningV2AudioAheadSessionsV1(lessonOrdinal: number, sessionOrdinal: number):
readonly { lessonOrdinal: number; sessionOrdinal: number }[] {
  if (!Number.isInteger(lessonOrdinal) || lessonOrdinal < 1 || lessonOrdinal > LAST_LESSON ||
      !Number.isInteger(sessionOrdinal) || sessionOrdinal < 1 || sessionOrdinal > SESSIONS_PER_LESSON) return [];
  const current = (lessonOrdinal - 1) * SESSIONS_PER_LESSON + sessionOrdinal - 1;
  const plan: { lessonOrdinal: number; sessionOrdinal: number }[] = [];
  for (let offset = 1; offset <= AUDIO_AHEAD_SESSION_COUNT; offset += 1) {
    const next = current + offset;
    if (next >= LAST_LESSON * SESSIONS_PER_LESSON) break;
    plan.push({ lessonOrdinal: Math.floor(next / SESSIONS_PER_LESSON) + 1, sessionOrdinal: next % SESSIONS_PER_LESSON + 1 });
  }
  return plan;
}

function activateAudioAheadWindowV1(sessionKey: string): number {
  if (activeAheadKey !== sessionKey) {
    activeAheadKey = sessionKey;
    aheadGeneration += 1;
    if (aheadTimer !== null) clearTimeout(aheadTimer);
    aheadTimer = null;
  }
  return aheadGeneration;
}

function scheduleLessonAheadV1(input: {
  readonly stableId: string;
  readonly account: AccountGenerationToken;
  readonly lessonOrdinal: number;
  readonly sessionOrdinal: number;
  readonly generation: number;
}): void {
  if (input.generation !== aheadGeneration || scheduledAheadGeneration === input.generation) return;
  scheduledAheadGeneration = input.generation;
  const plan = learningV2AudioAheadSessionsV1(input.lessonOrdinal, input.sessionOrdinal);
  const stillNeeded = () => input.generation === aheadGeneration && isCurrentAccountGeneration(input.account, input.stableId);
  console.log("[AUDIO-REMOTE] sessions_ahead_scheduled", JSON.stringify({ lesson: input.lessonOrdinal, session: input.sessionOrdinal, plan, delayMs: LESSON_AHEAD_DELAY_MS }));
  aheadTimer = setTimeout(() => {
    aheadTimer = null;
    void (async () => {
      const startedAt = Date.now();
      const total: PrepareStatsV1 = { local: 0, network: 0, tts: 0, reasons: {} };
      let sessions = 0;
      for (const step of plan) {
        if (!stillNeeded()) {
          console.log("[AUDIO-REMOTE] sessions_ahead_stopped", JSON.stringify({ reason: "window_or_account_changed", done: sessions }));
          return;
        }
        const files = filesForSession(step.lessonOrdinal, step.sessionOrdinal, "en");
        if (files.length === 0) continue;
        try {
          const stats = await prepareFiles({ files, stableId: input.stableId, account: input.account, stillNeeded, where: `ahead:l${step.lessonOrdinal}s${step.sessionOrdinal}` });
          sessions += 1;
          total.local += stats.local; total.network += stats.network; total.tts += stats.tts;
          for (const [r, n] of Object.entries(stats.reasons)) total.reasons[r] = (total.reasons[r] ?? 0) + n;
        } catch (error) {
          console.warn("[AUDIO-REMOTE] lesson_ahead_session_failed", JSON.stringify({ lesson: step.lessonOrdinal, session: step.sessionOrdinal, reason: (error instanceof Error ? error.message : String(error)).slice(0, 160) }));
          if (!stillNeeded()) return;
        }
      }
      console.log("[AUDIO-REMOTE] lesson_ahead_done", JSON.stringify({ lesson: input.lessonOrdinal, sessions, ...total, ms: Date.now() - startedAt }));
    })();
  }, LESSON_AHEAD_DELAY_MS);
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
      factoryLessonAudioIndex(),
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
    Object.keys(factoryLessonAudioIndex())
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
    const indexed = factoryLessonAudioIndex()[
      input.lessonOrdinal as keyof FactoryLessonAudioIndexV1
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

  // Storage используется только при отсутствии файла в бандле и проверенном кэше.
  // Сеть ограничена общим NETWORK_SLOTS; смену аккаунта проверяет prepareFiles.
  let operation: Promise<LearningV2LessonAudioPackSummaryV1>;
  operation = (async () => {
    const { files, sessionCount } = filesForLesson(
      input.lessonOrdinal,
      input.targetLanguage,
      input.interfaceLocale,
    );
    if (sessionCount === 0) throw new Error("learning_v2_lesson_audio_pack_empty");
    fileHashesByPack.set(packKey, new Set(files.map((file) => file.contentHash)));
    refreshProtectedHashes();
    await prepareFiles({
      files,
      stableId,
      account,
      onProgress: input.onProgress,
    });
    if (input.signal?.aborted)
      throw new Error("learning_v2_lesson_audio_pack_aborted");
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
      runtimeNetwork: "storage_on_local_miss" as const,
    };
    const summary = Object.freeze({
      ...body,
      packFingerprint: hashCanonicalBody({ ...body, files: files.map((file) => file.fileFingerprint) }),
    });
    ready.set(packKey, summary);
    return summary;
  })().finally(() => {
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
  const generation = activateAudioAheadWindowV1(packKey);
  const scheduleAhead = () => {
    if (input.targetLanguage === "en" && !input.signal?.aborted && isCurrentAccountGeneration(account, stableId))
      scheduleLessonAheadV1({ stableId, account, lessonOrdinal: input.lessonOrdinal, sessionOrdinal: input.sessionOrdinal, generation });
  };
  const existing = sessionReady.get(packKey);
  if (existing) { scheduleAhead(); return existing; }
  const pending = sessionInFlight.get(packKey);
  if (pending?.generation === generation) { const result = await pending.operation; scheduleAhead(); return result; }
  const files = filesForSession(input.lessonOrdinal, input.sessionOrdinal, input.targetLanguage);
  if (files.length === 0) throw new Error("learning_v2_session_audio_pack_empty");
  const retentionKey = key(stableId, input.targetLanguage, input.lessonOrdinal);
  const protectedHashes = new Set(fileHashesByPack.get(retentionKey) ?? []);
  files.forEach((file) => protectedHashes.add(file.contentHash));
  fileHashesByPack.set(retentionKey, protectedHashes);
  refreshProtectedHashes();
  // Текущее занятие готовится отдельно от ограниченного фонового окна.
  let operation: Promise<LearningV2SessionAudioPackSummaryV1>;
  operation = (async () => {
    await prepareFiles({
      files,
      stableId,
      account,
      onProgress: input.onProgress,
      where: `session:l${input.lessonOrdinal}s${input.sessionOrdinal}`,
      stillNeeded: () => generation === aheadGeneration && !input.signal?.aborted,
    });
    if (input.signal?.aborted)
      throw new Error("learning_v2_session_audio_pack_aborted");
    if (!isCurrentAccountGeneration(account, stableId))
      throw new Error("learning_v2_lesson_audio_pack_account_changed");
    if (generation !== aheadGeneration)
      throw new Error("learning_v2_session_audio_pack_superseded");
    scheduleAhead();
    const body = {
      schemaVersion: LEARNING_V2_LESSON_AUDIO_PACK_SCHEMA_V1,
      lessonOrdinal: input.lessonOrdinal,
      sessionOrdinal: input.sessionOrdinal,
      fileCount: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.byteSize, 0),
      voicesPerCoordinate: 4 as const,
      storage: "durable_documents" as const,
      verification: "exact_sha256_and_byte_size" as const,
      runtimeNetwork: "storage_on_local_miss" as const,
    };
    const summary = Object.freeze({
      ...body,
      packFingerprint: hashCanonicalBody({ ...body, files: files.map((file) => file.fileFingerprint) }),
    });
    sessionReady.set(packKey, summary);
    return summary;
  })().finally(() => {
    if (sessionInFlight.get(packKey)?.operation === operation) sessionInFlight.delete(packKey);
  });
  sessionInFlight.set(packKey, { generation, operation });
  return operation;
}

subscribeAccountGeneration(() => {
  ready.clear();
  inFlight.clear();
  sessionReady.clear();
  sessionInFlight.clear();
  fileHashesByPack.clear();
  preparedFileUriByContentHash.clear();
  activeAheadKey = null;
  aheadGeneration += 1;
  if (aheadTimer !== null) clearTimeout(aheadTimer);
  aheadTimer = null;
  refreshProtectedHashes();
});
