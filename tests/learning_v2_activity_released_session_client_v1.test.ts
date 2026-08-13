import AsyncStorage from "@react-native-async-storage/async-storage";
import { httpsCallable } from "@react-native-firebase/functions";
import {
  clearLearningV2ActivityReleasedSessionCacheV1,
  loadCurrentLearningV2ActivityReleasedSessionV1,
  peekCurrentLearningV2ActivityReleasedSessionV1,
  preloadCurrentLearningV2ActivityReleasedSessionV1,
  waitForCurrentLearningV2ActivityReleasedSessionPreloadV1,
} from "../app/learning_v2_activity_released_session_client_v1";
import {
  getLearningV2ActivityReleasedSessionPackageSummaryV1,
  parseLearningV2ActivityReleasedSessionPackageV1,
} from "../modules/learning-v2/runtime/activity_released_session_package_v1";

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
  "../modules/learning-v2/runtime/activity_released_session_package_v1",
  () => ({
    parseLearningV2ActivityReleasedSessionPackageV1: jest.fn(),
    getLearningV2ActivityReleasedSessionPackageSummaryV1: jest.fn(),
  }),
);

const h = (character: string) => character.repeat(64);
const storage = new Map<string, string>();
const packageHandle = Object.freeze({});
const summary = Object.freeze({
  episodeId: "episode-1",
  sessionId: "session-1",
  sessionOrdinal: 1,
  activityPackageFingerprint: h("b"),
  auxiliaryDescriptorFingerprint: h("c"),
  sourceFingerprint: h("d"),
  renderFingerprint: h("e"),
  capsuleEnvelopeFingerprint: h("f"),
  packageFingerprint: h("1"),
});
const current = Object.freeze({
  environment: "lab" as const,
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "season-1",
  episodeId: "episode-1",
  sessionOrdinal: 1,
});
let network: () => Promise<unknown>;
let lastCallableRequest: Record<string, unknown> | null;

function response() {
  return {
    schemaVersion: "v2-activity-released-session-response.v1",
    activeManifestHash: h("a"),
    unifiedReleaseId: "release-1",
    unifiedRootFingerprint: h("3"),
    episodeId: summary.episodeId,
    sessionId: summary.sessionId,
    sessionOrdinal: summary.sessionOrdinal,
    activityPackageFingerprint: summary.activityPackageFingerprint,
    auxiliaryIndexFingerprint: h("2"),
    descriptorFingerprint: summary.auxiliaryDescriptorFingerprint,
    sourceFingerprint: summary.sourceFingerprint,
    renderFingerprint: summary.renderFingerprint,
    capsuleEnvelopeFingerprint: summary.capsuleEnvelopeFingerprint,
    packageFingerprint: summary.packageFingerprint,
    canonicalPackageRaw: '{"safe":true}',
    transportAuthority: "firebase_callable_auth_and_app_check_boundary",
    repositoryOriginProjection:
      "joined_unified_active_release_learner_evaluator_auxiliary",
    localFeedbackAuthority: "local_provisional_only",
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    completionAuthority: "none",
    releaseAuthority: false,
  };
}

describe("Learning V2 released Activity session app client", () => {
  beforeEach(async () => {
    storage.clear();
    (AsyncStorage.getItem as jest.Mock).mockImplementation(
      async (key: string) => storage.get(key) ?? null,
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation(
      async (key: string, value: string) => {
        storage.set(key, value);
      },
    );
    (AsyncStorage.removeItem as jest.Mock).mockImplementation(
      async (key: string) => {
        storage.delete(key);
      },
    );
    jest
      .mocked(parseLearningV2ActivityReleasedSessionPackageV1)
      .mockReturnValue(packageHandle as never);
    jest
      .mocked(getLearningV2ActivityReleasedSessionPackageSummaryV1)
      .mockReturnValue(summary as never);
    network = async () => response();
    lastCallableRequest = null;
    jest.mocked(httpsCallable).mockReturnValue((async (
      data: Record<string, unknown>,
    ) => {
      lastCallableRequest = data;
      return { data: await network() };
    }) as never);
    await clearLearningV2ActivityReleasedSessionCacheV1();
  });

  test("loads the package online and reuses the exact account-scoped LKG offline", async () => {
    const online =
      await loadCurrentLearningV2ActivityReleasedSessionV1(current);
    expect(online).toMatchObject({
      source: "network",
      transport: "firebase_callable",
      summary: { packageFingerprint: h("1") },
    });
    expect(Object.keys(lastCallableRequest ?? {}).sort()).toEqual([
      "environment",
      "episodeId",
      "expectedActiveManifestHash",
      "learnerSourceLocale",
      "seasonId",
      "sessionOrdinal",
      "studyTarget",
    ]);
    expect(lastCallableRequest).not.toHaveProperty("activeManifestHash");
    expect(
      peekCurrentLearningV2ActivityReleasedSessionV1(current)?.summary
        .sessionId,
    ).toBe("session-1");

    network = async () => {
      throw new Error("offline");
    };
    const offline =
      await loadCurrentLearningV2ActivityReleasedSessionV1(current);
    expect(offline).toMatchObject({
      source: "lkg",
      transport: "offline_lkg",
      cacheAuthority: "availability_only_not_release_or_origin_authority",
    });
  });

  test("deduplicates preload and never hides an arrived protocol mismatch", async () => {
    let release!: () => void;
    network = () =>
      new Promise((resolve) => {
        release = () => resolve(response());
      });
    const first = preloadCurrentLearningV2ActivityReleasedSessionV1(current);
    const second = preloadCurrentLearningV2ActivityReleasedSessionV1(current);
    expect(first).toBe(second);
    for (let spin = 0; spin < 20 && !release; spin += 1)
      await new Promise((resolve) => setImmediate(resolve));
    release();
    await first;
    expect(
      waitForCurrentLearningV2ActivityReleasedSessionPreloadV1(current),
    ).toBeNull();

    network = async () => ({ ...response(), packageFingerprint: h("9") });
    await expect(
      loadCurrentLearningV2ActivityReleasedSessionV1(current),
    ).rejects.toThrow(
      "learning_v2_activity_released_session_app_client_invalid",
    );
  });
});
