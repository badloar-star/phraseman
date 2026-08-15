import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const account = Object.freeze({
  generation: 1,
  stableId: "stable-1",
  phase: "active",
});
const transport = Object.freeze({ transport: true });
let accountCurrent = true;
let accountListener: (() => void) | null = null;
const createTransport = jest.fn(async () => transport);
const downloadBytes = jest.fn(async (input: unknown) => {
  const entry = (input as { entry: { byteSize: number } }).entry;
  return new Uint8Array(entry.byteSize).fill(7);
});

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
jest.mock("../app/learning_v2_activity_audio_transport_v1", () => ({
  createLearningV2ActivityAudioTransportV1: () => createTransport(),
  downloadLearningV2ActivityAudioBytesV1: (input: unknown) =>
    downloadBytes(input),
}));
jest.mock("../modules/learning-v2/progress/progress_account_scope", () => ({
  deriveLocalOfflineProgressAccountScopeHash: () => h("account-scope"),
}));
jest.mock(
  "../modules/learning-v2/runtime/voice_audio_offline_cache_v1",
  () => ({
    prepareLearningV2VoiceAudioOfflineBytesV1: async ({
      identity,
      loadBytes,
    }: any) => {
      const bytes = await loadBytes();
      expect(bytes).toHaveLength(identity.byteSize);
      return Object.freeze({ identity });
    },
    resolveLearningV2VoiceAudioOfflineCacheMaterialV1: ({ identity }: any) => ({
      fileUri: `file:///cache/${identity.contentHash}.mp3`,
    }),
  }),
);

/* eslint-disable import/first -- native and network seams are mocked first */
import {
  getLearningV2CourseSessionAudioPreloadSummaryV1,
  isLearningV2CourseSessionAudioPreloadHandleV1,
  preloadLearningV2CourseSessionAudioV1,
  resolveLearningV2CourseSessionFullPhraseAudioV1,
  resolveLearningV2CourseSessionSelectableAudioV1,
} from "../app/learning_v2_course_session_audio_preload_v1";
import { materializeLearningV2CourseSessionAudioChildV1 } from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import { materializeLearningV2CourseSessionLearnerChildV1 } from "../modules/learning-v2/runtime/course_session_client_children_v1";
/* eslint-enable import/first */

function fixture() {
  const learner = materializeLearningV2CourseSessionLearnerChildV1({
    courseSessionId: "lesson-01:session:01",
    targetLanguage: "en-US",
    interactionProfile: "standard",
    interactions: Array.from({ length: 13 }, (_, index) => ({
      interactionId: `interaction-${index + 4}`,
      ordinal: index + 4,
      purpose: "supported_practice" as const,
      family: "phrase_builder" as const,
      inputMode: "ordered_tokens" as const,
      prompt: `Neutral ${index + 1}`,
      responseOptions: [
        { responseId: `chip-${index + 1}`, text: `word${index + 1}` },
      ],
      mediaIds: [],
      audioTargetIds: index === 0 ? [h("target")] : [],
      accessibilityLabel: `Neutral ${index + 1}`,
      scriptedAlternate: null,
    })),
  });
  const files = (suffix: string) =>
    (["ash", "onyx", "nova", "coral"] as const).map((voiceId) => {
      const contentHash = h([voiceId, suffix]);
      return {
        voiceId,
        objectPath: `learning-v2/voice-audio/${h("a")}/${h("b")}/${h("c")}/${contentHash}.mp3`,
        contentHash,
        objectGeneration: "1",
        byteSize: 4,
        contentType: "audio/mpeg" as const,
      };
    });
  const audioChild = materializeLearningV2CourseSessionAudioChildV1({
    learner,
    interactions: [
      {
        interactionId: "interaction-4",
        taskVoiceGroupFingerprint: h("group"),
        fullPhraseFiles: files("phrase"),
        selectables: [
          {
            selectableId: "chip-1",
            audioTargetId: h("target"),
            wordId: h("word"),
            wordOrdinal: 1,
            visibleText: "word1",
            files: files("word"),
          },
        ],
      },
    ],
  });
  return { learner, audioChild };
}

describe("Learning V2 direct course-session audio preload", () => {
  beforeEach(() => {
    accountCurrent = true;
    accountListener?.();
    createTransport.mockClear();
    downloadBytes.mockClear();
  });

  test("prepares the selected phrase and word before start and keeps one voice", async () => {
    const value = fixture();
    const handle = await preloadLearningV2CourseSessionAudioV1({
      ...value,
      sessionRunId: "run-neutral-1",
    });
    expect(isLearningV2CourseSessionAudioPreloadHandleV1(handle)).toBe(true);
    expect(createTransport).toHaveBeenCalledTimes(1);
    expect(downloadBytes).toHaveBeenCalledTimes(2);
    expect(
      getLearningV2CourseSessionAudioPreloadSummaryV1(handle),
    ).toMatchObject({
      selectedFileCount: 2,
      localFileCount: 2,
      preparationPolicy: "all_selected_mp3_verified_before_session_start",
      taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words",
      answerPathTransport: "none_local_file_only",
      serverRequestPerPlayback: false,
      releaseAuthority: false,
    });
    const phrase = resolveLearningV2CourseSessionFullPhraseAudioV1({
      handle,
      interactionId: "interaction-4",
    });
    const word = resolveLearningV2CourseSessionSelectableAudioV1({
      handle,
      interactionId: "interaction-4",
      selectableId: "chip-1",
    });
    expect(phrase?.voiceId).toBe(word?.voiceId);
    expect(phrase?.fileUri).toMatch(/^file:\/\/\/cache\//u);
    expect(word?.fileUri).toMatch(/^file:\/\/\/cache\//u);

    const repeated = await preloadLearningV2CourseSessionAudioV1({
      ...value,
      sessionRunId: "run-neutral-1",
    });
    expect(repeated).toBe(handle);
    expect(downloadBytes).toHaveBeenCalledTimes(2);
  });

  test("invalidates the opaque preload when the account changes", async () => {
    const value = fixture();
    const handle = await preloadLearningV2CourseSessionAudioV1({
      ...value,
      sessionRunId: "run-neutral-2",
    });
    accountCurrent = false;
    accountListener?.();
    expect(isLearningV2CourseSessionAudioPreloadHandleV1(handle)).toBe(false);
    expect(() =>
      getLearningV2CourseSessionAudioPreloadSummaryV1(handle),
    ).toThrow("learning_v2_course_session_audio_preload_invalid");
  });
});
