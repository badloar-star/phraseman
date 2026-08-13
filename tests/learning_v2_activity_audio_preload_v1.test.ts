import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const account = Object.freeze({
  generation: 1,
  stableId: "stable-1",
  phase: "active",
});
const descriptor = Object.freeze({
  descriptorFingerprint: h("descriptor"),
  sessionId: "session-1",
  sessionOrdinal: 1,
});
const plan = Object.freeze({ plan: true });
const transport = Object.freeze({ transport: true });
const cacheHandles = new Map<string, object>();
let accountCurrent = true;
let accountListener: (() => void) | null = null;
const createTransport = jest.fn(async (_input: unknown) => transport);
const downloadBytes = jest.fn(async (input: unknown) => {
  const entry = (input as { entry: { byteSize: number } }).entry;
  return new Uint8Array(entry.byteSize).fill(7);
});

const entries = [
  {
    generationTargetFingerprint: h("generation-full"),
    entryFingerprint: h("entry-full"),
    objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h("target")}/${h("full-bytes")}.mp3`,
    contentHash: h("full-bytes"),
    objectGeneration: "7",
    byteSize: 4,
    contentType: "audio/mpeg",
    voiceId: "nova",
  },
  {
    generationTargetFingerprint: h("generation-word"),
    entryFingerprint: h("entry-word"),
    objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h("target")}/${h("word-bytes")}.mp3`,
    contentHash: h("word-bytes"),
    objectGeneration: "8",
    byteSize: 4,
    contentType: "audio/mpeg",
    voiceId: "nova",
  },
];

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: { version: "1.0.0" },
    nativeAppVersion: "1.0.0",
    nativeBuildVersion: "7",
  },
}));
jest.mock("expo-device", () => ({ isDevice: true, osVersion: "18.6" }));
jest.mock("react-native", () => ({ Platform: { OS: "ios" } }));
jest.mock("../app/account_generation", () => ({
  ensureAccountGeneration: () => account,
  isCurrentAccountGeneration: () => accountCurrent,
  subscribeAccountGeneration: (listener: () => void) => {
    accountListener = listener;
    return { remove: () => undefined };
  },
}));
jest.mock("../app/stable_id", () => ({ getStableId: async () => "stable-1" }));
jest.mock("../app/interactive_network_quiet", () => ({
  isInteractiveNetworkDeferredError: () => false,
  registerInteractiveNetworkQuietParticipant: () => () => undefined,
  withBackgroundNetworkLease: async (
    _source: string,
    work: (lease: object) => Promise<unknown>,
  ) =>
    work(
      Object.freeze({
        signal: new AbortController().signal,
        assertCurrent: () => undefined,
      }),
    ),
}));
jest.mock("../app/learning_v2_activity_auxiliary_client", () => ({
  preloadCurrentLearningV2ActivityAuxiliarySessionV1: async () => undefined,
  peekCurrentLearningV2ActivityAuxiliarySessionV1: () => descriptor,
}));
jest.mock("../app/learning_v2_activity_audio_transport_v1", () => ({
  createLearningV2ActivityAudioTransportV1: (input: unknown) =>
    createTransport(input),
  downloadLearningV2ActivityAudioBytesV1: (input: unknown) =>
    downloadBytes(input),
}));
jest.mock("../modules/learning-v2/progress/progress_account_scope", () => ({
  deriveLocalOfflineProgressAccountScopeHash: () => h("account-scope"),
}));
jest.mock(
  "../modules/learning-v2/runtime/activity_session_audio_plan_v1",
  () => ({
    materializeLearningV2ActivitySessionAudioPlanV1: () => plan,
    getLearningV2ActivitySessionAudioPlanEntriesV1: () => entries,
    getLearningV2ActivitySessionAudioPlanSummaryV1: () => ({
      planFingerprint: h("audio-plan"),
      taskPlanCount: 1,
      selectedEntryCount: 2,
    }),
    getLearningV2ActivitySessionAudioTaskPlanV1: (
      _plan: object,
      taskId: string,
    ) =>
      taskId === "task-1"
        ? {
            voiceId: "nova",
            fullPhraseEntryFingerprint: entries[0].entryFingerprint,
            selectableEntryFingerprints: {
              "response-1": entries[1].entryFingerprint,
            },
          }
        : null,
    resolveLearningV2ActivitySessionAudioEntryV1: (
      _plan: object,
      fingerprint: string,
    ) => entries.find((entry) => entry.entryFingerprint === fingerprint),
  }),
);
jest.mock(
  "../modules/learning-v2/runtime/voice_audio_offline_cache_v1",
  () => ({
    prepareLearningV2VoiceAudioOfflineBytesV1: async ({
      identity,
      loadBytes,
    }: any) => {
      const existing = cacheHandles.get(identity.contentHash);
      if (existing) return existing;
      const bytes = await loadBytes();
      expect(bytes).toHaveLength(identity.byteSize);
      const handle = Object.freeze({ contentHash: identity.contentHash });
      cacheHandles.set(identity.contentHash, handle);
      return handle;
    },
    resolveLearningV2VoiceAudioOfflineCacheMaterialV1: ({ identity }: any) => ({
      fileUri: `file:///cache/${identity.contentHash}.mp3`,
    }),
  }),
);

/* eslint-disable import/first -- every native/network dependency is mocked first */
import {
  getLearningV2ActivityAudioPreloadSummaryV1,
  isLearningV2ActivityAudioPreloadHandleV1,
  peekCurrentLearningV2ActivityAudioSessionV1,
  preloadCurrentLearningV2ActivityAudioSessionV1,
  resolveLearningV2ActivityFullPhraseAudioFileV1,
  resolveLearningV2ActivitySelectableAudioFileV1,
} from "../app/learning_v2_activity_audio_preload_v1";
/* eslint-enable import/first */

const locator = Object.freeze({
  environment: "production" as const,
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "season-1",
  episodeId: "episode-1",
  sessionOrdinal: 1,
});

describe("Learning V2 activity audio preload", () => {
  beforeEach(() => {
    accountCurrent = true;
    accountListener?.();
    cacheHandles.clear();
    createTransport.mockClear();
    downloadBytes.mockClear();
  });

  it("preloads exact local files and resolves phrase and selected word with one voice", async () => {
    const handle =
      await preloadCurrentLearningV2ActivityAudioSessionV1(locator);
    expect(isLearningV2ActivityAudioPreloadHandleV1(handle)).toBe(true);
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(downloadBytes).toHaveBeenCalledTimes(2);
    expect(getLearningV2ActivityAudioPreloadSummaryV1(handle)).toMatchObject({
      selectedEntryCount: 2,
      localFileCount: 2,
      taskVoiceScope: "one_voice_per_task_for_phrase_and_words",
      answerPathTransport: "none_local_file_only",
      releaseAuthority: false,
    });
    const phrase = resolveLearningV2ActivityFullPhraseAudioFileV1({
      handle,
      taskId: "task-1",
    });
    const word = resolveLearningV2ActivitySelectableAudioFileV1({
      handle,
      taskId: "task-1",
      selectableId: "response-1",
    });
    expect(phrase?.voiceId).toBe("nova");
    expect(word?.voiceId).toBe("nova");
    expect(phrase?.fileUri).toContain(entries[0].contentHash);
    expect(word?.fileUri).toContain(entries[1].contentHash);

    const repeated =
      await preloadCurrentLearningV2ActivityAudioSessionV1(locator);
    expect(repeated).toBe(handle);
    expect(downloadBytes).toHaveBeenCalledTimes(2);
    expect(peekCurrentLearningV2ActivityAudioSessionV1(locator)).toBe(handle);
  });

  it("invalidates the opaque session immediately on an account transition", async () => {
    const handle =
      await preloadCurrentLearningV2ActivityAudioSessionV1(locator);
    accountCurrent = false;
    accountListener?.();
    expect(isLearningV2ActivityAudioPreloadHandleV1(handle)).toBe(false);
    expect(peekCurrentLearningV2ActivityAudioSessionV1(locator)).toBeNull();
    expect(() => getLearningV2ActivityAudioPreloadSummaryV1(handle)).toThrow(
      "learning_v2_activity_audio_preload_invalid",
    );
  });
});
