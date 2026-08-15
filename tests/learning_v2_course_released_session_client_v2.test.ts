import AsyncStorage from "@react-native-async-storage/async-storage";
import { httpsCallable } from "@react-native-firebase/functions";
import {
  clearLearningV2CourseReleasedSessionCacheV2,
  loadCurrentLearningV2CourseReleasedSessionV2,
  peekCurrentLearningV2CourseReleasedSessionV2,
  preloadCurrentLearningV2CourseReleasedSessionV2,
  waitForCurrentLearningV2CourseReleasedSessionPreloadV2,
} from "../app/learning_v2_course_released_session_client_v2";
import {
  parseLearningV2CourseSessionAuxiliaryChildV1,
  parseLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionLearnerChildV1,
} from "../modules/learning-v2/runtime/course_session_client_children_v1";
import { parseLearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";

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

const h = (character: string) => character.repeat(64);
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
    schemaVersion: "v2-course-released-session-response.v2",
    releaseId: "release-1",
    activeRootFingerprint: h("a"),
    activeHeadFingerprint: h("b"),
    topologyFingerprint: h("c"),
    lessonId: "lesson-32",
    lessonOrdinal: 32,
    lessonIndexFingerprint: h("d"),
    courseSessionId,
    sessionOrdinal: 56,
    packageFingerprint: h("e"),
    childSetFingerprint: h("f"),
    introFingerprint: h("1"),
    learnerFingerprint: h("2"),
    auxiliaryFingerprint: h("3"),
    evaluatorCapsuleSetFingerprint: h("4"),
    canonicalIntroRaw: '{"intro":true}',
    canonicalLearnerRaw: '{"learner":true}',
    canonicalEvaluatorCapsuleRaw: '{"capsule":true}',
    canonicalAuxiliaryRaw: '{"auxiliary":true}',
    transportAuthority: "firebase_callable_auth_and_app_check_boundary",
    repositoryOriginProjection: "active_v2_32x56_release_exact_session_join",
    learnerProjection: "intro_learner_capsule_auxiliary_only",
    evaluatorIsolation: "server_sidecar_not_exposed",
    cacheAuthority: "none_client_lkg_is_availability_only",
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    completionAuthority: "none",
    releaseAuthority: false,
  };
}

describe("Learning V2 direct 32x56 released session client", () => {
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
      introFingerprint: h("1"),
    } as never);
    jest.mocked(parseLearningV2CourseSessionLearnerChildV1).mockReturnValue({
      courseSessionId,
      targetLanguage: "en",
      learnerFingerprint: h("2"),
    } as never);
    jest.mocked(parseLearningV2CourseSessionAuxiliaryChildV1).mockReturnValue({
      courseSessionId,
      auxiliaryFingerprint: h("3"),
    } as never);
    jest
      .mocked(parseLearningV2CourseSessionEvaluatorCapsuleChildV1)
      .mockReturnValue({
        courseSessionId,
        capsuleSetFingerprint: h("4"),
      } as never);
    network = async () => response();
    lastRequest = null;
    jest.mocked(httpsCallable).mockReturnValue((async (
      data: Record<string, unknown>,
    ) => {
      lastRequest = data;
      return { data: await network() };
    }) as never);
    await clearLearningV2CourseReleasedSessionCacheV2();
  });

  test("loads lesson 32 session 56 online and reuses account-scoped LKG offline", async () => {
    const online = await loadCurrentLearningV2CourseReleasedSessionV2(locator);
    expect(online).toMatchObject({
      source: "network",
      transport: "firebase_callable",
      evaluatorCapsuleAvailableToClient: true,
      evaluatorSidecarAvailableToClient: false,
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
    expect(lastRequest).not.toHaveProperty("releaseId");
    expect(peekCurrentLearningV2CourseReleasedSessionV2(locator)).toMatchObject(
      { courseSessionId },
    );

    network = async () => {
      throw new Error("offline");
    };
    const offline = await loadCurrentLearningV2CourseReleasedSessionV2(locator);
    expect(offline).toMatchObject({
      source: "lkg",
      transport: "offline_lkg",
      cacheAuthority: "availability_only_not_release_or_origin_authority",
      evaluatorCapsuleAvailableToClient: true,
      evaluatorSidecarAvailableToClient: false,
    });
  });

  test("deduplicates preload and rejects a protocol or learner-child mismatch", async () => {
    let release!: () => void;
    network = () =>
      new Promise((resolve) => {
        release = () => resolve(response());
      });
    const first = preloadCurrentLearningV2CourseReleasedSessionV2(locator);
    const second = preloadCurrentLearningV2CourseReleasedSessionV2(locator);
    expect(first).toBe(second);
    for (let spin = 0; spin < 20 && !release; spin += 1)
      await new Promise((resolve) => setImmediate(resolve));
    release();
    await first;
    expect(
      waitForCurrentLearningV2CourseReleasedSessionPreloadV2(locator),
    ).toBeNull();

    network = async () => ({ ...response(), learnerFingerprint: h("9") });
    await expect(
      loadCurrentLearningV2CourseReleasedSessionV2(locator),
    ).rejects.toThrow("learning_v2_course_released_session_app_client_invalid");

    jest.mocked(parseLearningV2CourseSessionLearnerChildV1).mockReturnValue({
      courseSessionId: "lesson-32:session:55",
      targetLanguage: "en",
      learnerFingerprint: h("2"),
    } as never);
    network = async () => response();
    await expect(
      loadCurrentLearningV2CourseReleasedSessionV2(locator),
    ).rejects.toThrow("learning_v2_course_released_session_app_client_invalid");
  });

  test("never falls back to stale cache after release drift or data-loss", async () => {
    await loadCurrentLearningV2CourseReleasedSessionV2(locator);
    for (const code of [
      "functions/failed-precondition",
      "functions/data-loss",
    ]) {
      network = async () => {
        throw Object.assign(new Error("fatal"), { code });
      };
      await expect(
        loadCurrentLearningV2CourseReleasedSessionV2(locator),
      ).rejects.toMatchObject({ code });
    }
  });
});
