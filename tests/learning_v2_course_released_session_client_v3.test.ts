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
jest.mock("../app/cloud_sync", () => ({
  ensureAnonUser: jest.fn(async () => "stable-1"),
  // зачем: с 2026-08-27 клиенты Learning V2 сперва вызывают ensureStableAuthLink (решение владельца).
  ensureStableAuthLink: jest.fn(async () => true),
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
    // зачем: поле добавлено в сводку озвучки 2026-09-20 (6c02e4088); у этой сессии доп. слов нет.
    supplementalAudioCount: 0,
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
    bindLearningV2CourseSessionLearnerProjectionToSourceV1: jest.fn(),
    learnerProjectionFingerprintV1: jest.fn(),
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
  hydrateLearningV2CourseReleasedSessionCacheV3,
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
  bindLearningV2CourseSessionLearnerProjectionToSourceV1,
  learnerProjectionFingerprintV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import { parseLearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
/* eslint-enable import/first */

const storage = new Map<string, string>();
// зачем: английский курс в 2.0 берётся только из встроенного контента
// (bundled_factory) и сервер не вызывает; сетевой путь + LKG проверяем на
// не-английском курсе, а английский — отдельным тестом ниже.
const locator = Object.freeze({
  environment: "lab" as const,
  targetLanguage: "es",
  studyTarget: "es",
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
    schemaVersion: "v2-course-released-session-response.v4",
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
    sourceLearnerFingerprint: h("2"),
    learnerProjectionFingerprint: h("9"),
    sourceAuxiliaryFingerprint: h("7"),
    auxiliaryProjectionFingerprint: h("0"),
    evaluatorCapsuleSetFingerprint: h("8"),
    audioExtensionFingerprint: h("3"),
    audioFingerprint: h("5"),
    canonicalIntroRaw: '{"intro":true}',
    canonicalLearnerProjectionRaw: '{"learnerFingerprint":"' + h("9") + '"}',
    canonicalEvaluatorCapsuleRaw: '{"capsule":true}',
    canonicalAuxiliaryProjectionRaw: '{"auxiliaryFingerprint":"' + h("0") + '"}',
    canonicalAudioChildRaw: '{"audio":true}',
    transportAuthority: "authenticated_callable_only",
    repositoryOriginProjection:
      "active_v3_composite_text_audio_exact_session_join",
    learnerProjection: "canonical_learner_and_auxiliary_wire_projection_v2",
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
    const projectedLearner = {
      courseSessionId,
      targetLanguage: "es",
      learnerFingerprint: h("9"),
    } as never;
    const boundLearner = {
      courseSessionId,
      targetLanguage: "es",
      learnerFingerprint: h("2"),
    } as never;
    jest.mocked(parseLearningV2CourseSessionLearnerChildV1).mockReturnValue(projectedLearner);
    jest.mocked(bindLearningV2CourseSessionLearnerProjectionToSourceV1).mockReturnValue(boundLearner);
    jest.mocked(learnerProjectionFingerprintV1).mockReturnValue(h("9"));
    jest.mocked(parseLearningV2CourseSessionAuxiliaryChildV1).mockReturnValue({
      courseSessionId,
      auxiliaryFingerprint: h("0"),
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

  test("never calls the server for English: serves bundled material or fails closed", async () => {
    jest.mocked(httpsCallable).mockClear();
    const english = { ...locator, targetLanguage: "en", studyTarget: "en" };
    let result: unknown = null;
    try {
      result = await loadCurrentLearningV2CourseReleasedSessionV3(english);
    } catch (error) {
      expect((error as Error).message).toBe("learning_v2_factory_session_unavailable");
    }
    if (result) expect(result).toMatchObject({ source: "bundled_factory" });
    expect(httpsCallable).not.toHaveBeenCalled();
  });

  test("persists canonical text and audio descriptors and reuses account-scoped LKG", async () => {
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
    expect(httpsCallable).toHaveBeenCalledWith(
      expect.anything(),
      "learningV2CourseReleasedSessionGetV4",
    );
    expect(bindLearningV2CourseSessionLearnerProjectionToSourceV1).toHaveBeenCalledWith({
      projectedLearner: expect.objectContaining({ learnerFingerprint: h("9") }),
      projectedLearnerRaw: response().canonicalLearnerProjectionRaw,
      expectedProjectionFingerprint: h("9"),
      sourceLearnerFingerprint: h("2"),
    });
    expect(parseLearningV2CourseSessionAuxiliaryChildV1).toHaveBeenCalledWith(
      response().canonicalAuxiliaryProjectionRaw,
    );
    expect([...storage.keys()]).toContain("learning_v2_course_released_session_cache_v4");
    expect([...storage.keys()]).not.toContain("learning_v2_course_released_session_cache_v3");
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

  // зачем (владелец 22.10: «аудио убрали и сменили на TTS»): готовность = готов текст; записи не готовятся и не проверяются.
  test("mints readiness after the canonical response without preparing any recordings", async () => {
    const handle = await prepareCurrentLearningV2CourseSessionV3({
      locator,
      sessionRunId: "run-neutral-1",
    });
    expect(isLearningV2CourseSessionReadyHandleV3(handle)).toBe(true);
    expect(preloadAudio).not.toHaveBeenCalled();
    expect(getLearningV2CourseSessionReadySummaryV3(handle)).toMatchObject({
      courseSessionId,
      sessionRunId: "run-neutral-1",
      textReadiness: "canonical_children_parsed_and_account_scoped_cached",
      audioReadiness: "device_system_tts_ready_no_prerecorded_audio",
      startPolicy: "intro_may_open_after_text_ready_device_speech_covers_all_audio",
      answerPathTransport: "none",
      releaseAuthority: false,
    });
    expect(resolveLearningV2CourseSessionReadyMaterialV3(handle)).toMatchObject(
      {
        result: { material: { courseSessionId, audioChild: null, audioDelivery: "device_system_tts_only" } },
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

  test("never reads a legacy v3 cache row that may contain unprojected learner bytes", async () => {
    storage.set("learning_v2_course_released_session_cache_v3", JSON.stringify({
      schemaVersion: "learning-v2-course-released-session-cache.v3",
      rows: [{ canonicalResponseRaw: JSON.stringify({
        ...response(),
        canonicalLearnerRaw: '{"choiceFeedback":[{"correct":true}]}',
      }) }],
    }));
    network = async () => {
      throw new Error("offline");
    };

    await expect(loadCurrentLearningV2CourseReleasedSessionV3(locator))
      .rejects.toThrow("offline");
    expect(AsyncStorage.getItem).toHaveBeenLastCalledWith(
      "learning_v2_course_released_session_cache_v4",
    );
  });

  test("v4 hydration purges the legacy v3 cache once without migrating it", async () => {
    storage.set("learning_v2_course_released_session_cache_v3", "legacy-unprojected");
    jest.mocked(AsyncStorage.removeItem).mockClear();

    await hydrateLearningV2CourseReleasedSessionCacheV3();
    await hydrateLearningV2CourseReleasedSessionCacheV3();

    expect(AsyncStorage.removeItem).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(
      "learning_v2_course_released_session_cache_v3",
    );
    expect(storage.has("learning_v2_course_released_session_cache_v3")).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
      "learning_v2_course_released_session_cache_v3",
      expect.anything(),
    );
  });
});
