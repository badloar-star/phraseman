import AsyncStorage from "@react-native-async-storage/async-storage";
import { httpsCallable } from "@react-native-firebase/functions";

const h = (character: string) => character.repeat(64);
const audioPreload = Object.freeze({ audioPreload: true });
const preloadAudio = jest.fn(async (_input: unknown) => audioPreload);

jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(() => ({})),
}));
jest.mock("@react-native-firebase/functions", () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(),
}));
jest.mock("../app/app_check_init", () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => true),
}));
jest.mock("../app/cloud_sync", () => ({
  ensureAnonUser: jest.fn(async () => "stable-1"),
}));
jest.mock("../app/stable_id", () => ({
  peekStableId: jest.fn(() => "stable-1"),
}));
jest.mock("../app/learning_v2_course_session_audio_preload_v1", () => ({
  preloadLearningV2CourseSessionAudioV1: (input: unknown) =>
    preloadAudio(input),
  isLearningV2CourseSessionAudioPreloadHandleV1: (value: unknown) =>
    value === audioPreload,
  getLearningV2CourseSessionAudioPreloadSummaryV1: () => ({
    courseSessionId: "lesson-32:session:56",
    sessionRunId: "run-neutral-1",
    learnerFingerprint: h("2"),
    audioFingerprint: h("5"),
    localFileCount: 2,
    selectedFileCount: 2,
    preloadFingerprint: h("9"),
  }),
}));
jest.mock(
  "../modules/learning-v2/runtime/course_session_client_children_v1",
  () => ({
    LEARNING_V2_COURSE_SESSION_CLIENT_CHILD_MAX_BYTES_V1: 256 * 1024,
    parseLearningV2CourseSessionAuxiliaryChildV1: jest.fn(),
    parseLearningV2CourseSessionIntroChildV1: jest.fn(),
    parseLearningV2CourseSessionLearnerChildV1: jest.fn(),
  }),
);
jest.mock(
  "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1",
  () => ({
    LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_MAX_BYTES_V1: 512 * 1024,
    parseLearningV2CourseSessionEvaluatorCapsuleChildV1: jest.fn(),
  }),
);
jest.mock(
  "../modules/learning-v2/runtime/course_session_audio_child_v1",
  () => ({
    LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1: 4 * 1024 * 1024,
    parseLearningV2CourseSessionAudioChildV1: jest.fn(),
  }),
);

/* eslint-disable import/first -- all native, transport and parser seams are mocked first */
import {
  clearLearningV2CourseReleasedSessionCacheV3,
  getLearningV2CourseSessionReadySummaryV3,
  isLearningV2CourseSessionReadyHandleV3,
  loadCurrentLearningV2CourseReleasedSessionV3,
  peekCurrentLearningV2CourseReleasedSessionV3,
  prepareCurrentLearningV2CourseSessionV3,
  resolveLearningV2CourseSessionReadyMaterialV3,
} from "../app/learning_v2_course_released_session_client_v3";
import { parseLearningV2CourseSessionAudioChildV1 } from "../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  parseLearningV2CourseSessionAuxiliaryChildV1,
  parseLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionLearnerChildV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import { parseLearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
/* eslint-enable import/first */

const storage = new Map<string, string>();
const locator = Object.freeze({
  environment: "lab" as const,
  targetLanguage: "en",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "season-1",
  lessonOrdinal: 32,
  sessionOrdinal: 56,
});
const courseSessionId = "lesson-32:session:56";
let network: () => Promise<unknown>;
let lastRequest: Record<string, unknown> | null;

function response() {
  return {
    schemaVersion: "v2-course-released-session-response.v3",
    releaseId: "release-1",
    activeRootFingerprint: h("a"),
    activeBaseRootFingerprint: h("b"),
    activeHeadFingerprint: h("c"),
    topologyFingerprint: h("d"),
    lessonId: "lesson-32",
    lessonOrdinal: 32,
    baseLessonIndexFingerprint: h("e"),
    audioLessonIndexFingerprint: h("f"),
    courseSessionId,
    sessionOrdinal: 56,
    packageFingerprint: h("1"),
    childSetFingerprint: h("0"),
    introFingerprint: h("6"),
    learnerFingerprint: h("2"),
    auxiliaryFingerprint: h("7"),
    evaluatorCapsuleSetFingerprint: h("8"),
    audioExtensionFingerprint: h("3"),
    audioFingerprint: h("5"),
    canonicalIntroRaw: '{"intro":true}',
    canonicalLearnerRaw: '{"learner":true}',
    canonicalEvaluatorCapsuleRaw: '{"capsule":true}',
    canonicalAuxiliaryRaw: '{"auxiliary":true}',
    canonicalAudioChildRaw: '{"audio":true}',
    transportAuthority: "firebase_callable_auth_and_app_check_boundary",
    repositoryOriginProjection:
      "active_v3_composite_text_audio_exact_session_join",
    learnerProjection: "intro_learner_capsule_auxiliary_audio_child_only",
    evaluatorIsolation: "server_sidecar_not_exposed",
    answerPayload: "absent",
    correctnessAuthority: "local_device_only",
    serverAnswerAuthority: "none_answers_never_transported_or_rechecked",
    cacheAuthority: "none_client_lkg_is_availability_only",
    playbackPreparation:
      "client_generation_pinned_mp3_prefetch_required_before_session",
    serverRequestPerPlayback: false,
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    completionAuthority: "none",
    releaseAuthority: false,
  };
}

describe("Learning V2 composite text+audio app client v3", () => {
  beforeEach(async () => {
    storage.clear();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      async (key: string) => storage.get(key) ?? null,
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => storage.set(key, value),
    );
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(
      async (key: string) => storage.delete(key),
    );
    jest.mocked(parseLearningV2CourseSessionIntroChildV1).mockReturnValue({
      courseSessionId,
      introFingerprint: h("6"),
    } as never);
    jest.mocked(parseLearningV2CourseSessionLearnerChildV1).mockReturnValue({
      courseSessionId,
      targetLanguage: "en",
      learnerFingerprint: h("2"),
    } as never);
    jest.mocked(parseLearningV2CourseSessionAuxiliaryChildV1).mockReturnValue({
      courseSessionId,
      auxiliaryFingerprint: h("7"),
    } as never);
    jest
      .mocked(parseLearningV2CourseSessionEvaluatorCapsuleChildV1)
      .mockReturnValue({
        courseSessionId,
        capsuleSetFingerprint: h("8"),
      } as never);
    jest.mocked(parseLearningV2CourseSessionAudioChildV1).mockReturnValue({
      courseSessionId,
      learnerFingerprint: h("2"),
      audioFingerprint: h("5"),
    } as never);
    network = async () => response();
    lastRequest = null;
    jest.mocked(httpsCallable).mockReturnValue((async (
      data: Record<string, unknown>,
    ) => {
      lastRequest = data;
      return { data: await network() };
    }) as never);
    preloadAudio.mockClear();
    await clearLearningV2CourseReleasedSessionCacheV3();
  });

  test("persists canonical text+audio descriptors and reuses account-scoped LKG", async () => {
    const online = await loadCurrentLearningV2CourseReleasedSessionV3(locator);
    expect(online).toMatchObject({
      source: "network",
      evaluatorCapsuleAvailableToClient: true,
      evaluatorSidecarAvailableToClient: false,
      answerPayloadAvailableToTransport: false,
      audioDescriptorsAvailableToClient: true,
      material: { lessonOrdinal: 32, sessionOrdinal: 56 },
    });
    expect(Object.keys(lastRequest ?? {}).sort()).toEqual([
      "environment",
      "expectedActiveRootFingerprint",
      "learnerSourceLocale",
      "lessonOrdinal",
      "seasonId",
      "sessionOrdinal",
      "studyTarget",
      "targetLanguage",
    ]);
    expect(lastRequest).not.toHaveProperty("answer");
    expect(peekCurrentLearningV2CourseReleasedSessionV3(locator)).toMatchObject(
      {
        courseSessionId,
      },
    );

    network = async () => {
      throw new Error("offline");
    };
    await expect(
      loadCurrentLearningV2CourseReleasedSessionV3(locator),
    ).resolves.toMatchObject({ source: "lkg", transport: "offline_lkg" });
  });

  test("mints readiness only after the canonical response and local MP3 preload complete", async () => {
    const handle = await prepareCurrentLearningV2CourseSessionV3({
      locator,
      sessionRunId: "run-neutral-1",
    });
    expect(isLearningV2CourseSessionReadyHandleV3(handle)).toBe(true);
    expect(preloadAudio).toHaveBeenCalledTimes(1);
    expect(getLearningV2CourseSessionReadySummaryV3(handle)).toMatchObject({
      courseSessionId,
      sessionRunId: "run-neutral-1",
      textReadiness: "canonical_children_parsed_and_account_scoped_cached",
      audioReadiness: "all_selected_mp3_hash_verified_local_files",
      startPolicy: "intro_may_open_only_after_text_and_audio_ready",
      answerPathTransport: "none",
      releaseAuthority: false,
    });
    expect(resolveLearningV2CourseSessionReadyMaterialV3(handle)).toMatchObject(
      {
        result: { material: { courseSessionId } },
        audio: audioPreload,
      },
    );
  });

  test("rejects answer fields, protocol drift and never uses stale LKG after data-loss", async () => {
    await loadCurrentLearningV2CourseReleasedSessionV3(locator);
    network = async () => ({ ...response(), answer: "forbidden" });
    await expect(
      loadCurrentLearningV2CourseReleasedSessionV3(locator),
    ).rejects.toThrow(
      "learning_v2_course_released_session_app_client_v3_invalid",
    );

    network = async () => {
      throw Object.assign(new Error("fatal"), {
        code: "functions/data-loss",
      });
    };
    await expect(
      loadCurrentLearningV2CourseReleasedSessionV3(locator),
    ).rejects.toMatchObject({ code: "functions/data-loss" });
  });
});
