// Решение владельца 18.10 заменяет D47: бандл → проверенный кэш → Storage → TTS.
// Старые загрузчики не возвращаем; новая подготовка не скачивает локальные файлы
// и не расходует мобильный трафик на целый урок: впереди только две сессии.
const mockBootstrap = new Set<string>();
const mockCache = new Map<string, { fileUri: string }>();
const mockRemote = jest.fn(async (_input: unknown) => new Uint8Array([1, 2, 3]));
let mockAccountReset: () => void = () => undefined;
jest.mock("../app/account_generation", () => ({
  ensureAccountGeneration: () => 1,
  isCurrentAccountGeneration: () => true,
  subscribeAccountGeneration: (callback: () => void) => { mockAccountReset = callback; },
}));
jest.mock("../app/stable_id", () => ({ getStableId: async () => "audio-test-user" }));
jest.mock("../app/content_lazy", () => ({ lazyContent: (_name: string, load: () => unknown) => load }));
jest.mock("../app/learning_v2_factory_lesson_audio_index_v1.generated", () => ({ LEARNING_V2_FACTORY_LESSON_AUDIO_INDEX_V1: {} }));
jest.mock("../app/learning_v2_factory_production_audio_v1", () => ({
  learningV2FactoryHasAudibleAudioForContentHashV1: () => true,
  learningV2FactorySessionClipHashesV1: (lesson: number, session: number) => [`l${lesson}s${session}`],
  learningV2FactoryWordAudioFileV1: () => null,
  learningV2FactoryRemoteAudioFilesForContentHashesV1: (hashes: string[]) => hashes.map(contentHash => ({ contentHash, byteSize: 3, objectPath: contentHash, voiceId: "ash" })),
}));
jest.mock("../app/learning_v2_audio_identity_v1", () => ({ learningV2NativeDecoderIdentityForAudioFileV1: (file: unknown) => file }));
jest.mock("../app/learning_v2_bootstrap_audio_seed_v1", () => ({
  resolveLearningV2BootstrapAudioOfflineFileV1: async ({ contentHash }: { contentHash: string }) =>
    mockBootstrap.has(contentHash) ? { fileUri: `bundle:${contentHash}` } : null,
}));
jest.mock("../modules/learning-v2/runtime/voice_audio_offline_cache_v1", () => ({
  replaceLearningV2VoiceAudioProtectedContentHashesV1: () => undefined,
  resolvePreparedLearningV2VoiceAudioOfflineFileV1: async ({ contentHash }: { contentHash: string }) => mockCache.get(contentHash) ?? null,
  resolveLearningV2VoiceAudioOfflineCacheMaterialV1: ({ handle }: { handle: unknown }) => handle,
  prepareLearningV2VoiceAudioOfflineBytesV1: async ({ identity, loadBytes }: { identity: { contentHash: string }; loadBytes: () => Promise<Uint8Array> }) => {
    await loadBytes();
    const handle = { fileUri: `cache:${identity.contentHash}` };
    mockCache.set(identity.contentHash, handle);
    return handle;
  },
}));
jest.mock("../app/learning_v2_remote_audio_v1", () => ({
  fetchLearningV2RemoteAudioBytesV1: (input: unknown) => mockRemote(input),
  LearningV2RemoteAudioErrorV1: class extends Error {},
}));
jest.mock("../app/learning_v2_es_session1_production_audio_v1", () => ({ learningV2EsSession1RemoteAudioFilesV1: () => [] }));
jest.mock("../app/learning_v2_es_session2_production_audio_v1", () => ({ learningV2EsSession2RemoteAudioFilesV1: () => [] }));
jest.mock("../app/learning_v2_lesson1_audio_assets", () => ({ learningV2Lesson1RemoteAudioFilesV1: () => [] }));
jest.mock("../modules/learning-v2/policies/decision_registry", () => ({ hashCanonicalBody: (value: unknown) => JSON.stringify(value) }));
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { learningV2AudioAheadSessionsV1, prepareLearningV2SessionAudioPackV1 } from "../app/learning_v2_lesson_audio_pack_v1";

const root = join(__dirname, "..");
const read = (rel: string): string => readFileSync(join(root, rel), "utf8");

const DELETED_MODULES = [
  "app/learning_v2_activity_audio_preload_v1.ts",
  "app/learning_v2_activity_audio_transport_v1.ts",
  "app/use_learning_v2_activity_audio_session_v1.ts",
  "app/use_learning_v2_activity_local_audio_playback_v1.ts",
  "app/learning_v2_lesson_background_prefetch_v1.ts",
  "app/learning_v2_audio_prefetch_coordinator_v1.ts",
  "app/learning_v2_audio_prefetch_background_v1.ts",
];

const FORBIDDEN_IN_V2_SOURCES =
  /learning_v2_activity_audio_(preload|transport)_v1|learning_v2_lesson_background_prefetch_v1|learning_v2_audio_prefetch_(coordinator|background)_v1|use_learning_v2_activity_audio_session_v1|downloadLearningV2ActivityAudioBytesV1|createLearningV2ActivityAudioTransportV1|prefetchLearningV2LessonInBackgroundV1|preloadCurrentLearningV2ActivityAudioSessionV1\(/u;

// Живые файлы V2, где скачивание могло бы вернуться. Комментарии «зачем» вырезаем:
// они вправе называть удалённое, код — нет.
const LIVE_V2_FILES = [
  "app/learning_v2_course_session_audio_preload_v1.ts",
  "app/learning_v2_lesson_audio_pack_v1.ts",
  "app/learning_v2_bootstrap_audio_seed_v1.ts",
  "app/learning_v2_direct_session_player_v1.tsx",
  "app/learning-v2/session/[id].tsx",
  "app/(tabs)/lessons.tsx",
];

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/(^|[^:])\/\/.*$/gmu, "$1");
}

describe("Learning V2: ограниченная загрузка Storage вместо D47", () => {
  test.each(DELETED_MODULES)("модуль %s удалён", (rel) => {
    expect(existsSync(join(root, rel))).toBe(false);
  });

  test.each(LIVE_V2_FILES)("в %s нет ссылок на удалённую цепочку скачивания", (rel) => {
    expect(stripComments(read(rel))).not.toMatch(FORBIDDEN_IN_V2_SOURCES);
  });

  test("декодер не скачивает звук напрямую, транспорт остаётся в подготовке пакета", () => {
    const src = stripComments(read("app/learning_v2_course_session_audio_preload_v1.ts"));
    expect(src).not.toMatch(/firebasestorage|\bfetch\(/u);
  });
});

describe("Learning V2: бандл, кэш и два занятия вперёд", () => {
  const prepare = (lessonOrdinal: number, sessionOrdinal: number) => prepareLearningV2SessionAudioPackV1({ lessonOrdinal, sessionOrdinal, targetLanguage: "en" });
  beforeEach(() => {
    jest.useFakeTimers();
    mockAccountReset();
    mockBootstrap.clear(); mockCache.clear(); mockRemote.mockClear();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => { mockAccountReset(); jest.clearAllTimers(); jest.useRealTimers(); jest.restoreAllMocks(); });

  test("стартовое занятие использует бандл без сети; следующее скачивается и сохраняется в кэш", async () => {
    mockBootstrap.add("l1s1");
    await prepare(1, 1);
    expect(mockRemote).not.toHaveBeenCalled();
    await prepare(1, 6);
    expect(mockRemote).toHaveBeenCalledTimes(1);
    expect(mockCache.has("l1s6")).toBe(true);
    mockAccountReset();
    await prepare(1, 6);
    expect(mockRemote).toHaveBeenCalledTimes(1);
  });

  test("переключение во время загрузки не помечает старую сессию готовой", async () => {
    let finish: (bytes: Uint8Array) => void = () => undefined;
    mockRemote.mockImplementationOnce(() => new Promise<Uint8Array>(resolve => { finish = resolve; }));
    const old = prepare(1, 1);
    const rejected = expect(old).rejects.toThrow("learning_v2_session_audio_pack_superseded");
    // Дожидаемся начала реального сетевого слота, а не только запуска prepare().
    for (let i = 0; i < 30 && mockRemote.mock.calls.length === 0; i += 1) await Promise.resolve();
    expect(mockRemote).toHaveBeenCalledTimes(1);
    await prepare(1, 10);
    // Возвращаемся до окончания первого A: новая подготовка не наследует его отказ.
    const returned = prepare(1, 1);
    finish(new Uint8Array([1, 2, 3]));
    await rejected;
    await expect(returned).resolves.toMatchObject({ lessonOrdinal: 1, sessionOrdinal: 1 });
  });

  test.each([
    [1, 1, [[1, 2], [1, 3]]],
    [1, 55, [[1, 56], [2, 1]]],
    [1, 56, [[2, 1], [2, 2]]],
    [32, 55, [[32, 56]]],
    [32, 56, []],
  ])("после %i/%i окно содержит только следующие два занятия", (lesson, session, expected) => {
    expect(learningV2AudioAheadSessionsV1(lesson as number, session as number).map(p => [p.lessonOrdinal, p.sessionOrdinal])).toEqual(expected);
  });

  test("смена текущей сессии отменяет старый таймер и двигает окно, включая возврат к готовой сессии", async () => {
    await prepare(1, 1);
    await prepare(1, 10);
    mockRemote.mockClear();
    await jest.advanceTimersByTimeAsync(4000);
    expect(mockRemote.mock.calls.map(([input]) => (input as { objectPath: string }).objectPath)).toEqual(["l1s11", "l1s12"]);
    await prepare(1, 1);
    mockRemote.mockClear();
    await jest.advanceTimersByTimeAsync(4000);
    expect(mockRemote.mock.calls.map(([input]) => (input as { objectPath: string }).objectPath)).toEqual(["l1s2", "l1s3"]);
  });
});
