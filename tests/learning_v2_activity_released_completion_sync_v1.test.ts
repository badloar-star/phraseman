import { httpsCallable } from "@react-native-firebase/functions";
import { attemptPendingLearningV2ActivityReleasedCompletionsV1 } from "../app/learning_v2_activity_released_completion_sync_v1";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const storage = new Map<string, string>();
const completion = Object.freeze({ completionFingerprint: "a".repeat(64) });
const list = jest.fn(async () => [completion]);
const discoverAccountScopes = jest.fn(async (scope) => [scope]);
const remove = jest.fn(async () => undefined);
const receiptBody = Object.freeze({
  schemaVersion: "learning-v2-activity-released-completion-server-receipt.v1",
  localCompletionFingerprint: completion.completionFingerprint,
  serverCompletionFingerprint: "b".repeat(64),
  recordFingerprint: "c".repeat(64),
  reconciliationFingerprint: "d".repeat(64),
  duplicate: false,
  catalogAuthority: "firebase_admin_active_release_12_task_coordinate_match",
  completionAuthority: "accepted_for_post_session_verification_only",
  performanceAuthority: "none",
  walletAuthority: "none",
  masteryAuthority: "none",
  evidenceAuthority: "none",
  releaseAuthority: false,
});
const callable = jest.fn(async () => ({
  data: {
    ...receiptBody,
    receiptFingerprint: hashCanonicalBody(receiptBody),
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async (key: string) => storage.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => {
    storage.set(key, value);
  }),
  removeItem: jest.fn(async (key: string) => {
    storage.delete(key);
  }),
}));
jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(() => ({})),
}));
jest.mock("@react-native-firebase/functions", () => ({
  getFunctions: jest.fn(() => ({})),
  httpsCallable: jest.fn(() => callable),
}));
jest.mock("../app/config", () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));
jest.mock("../app/app_check_init", () => ({
  initFirebaseAppCheckIfAvailable: jest.fn(async () => true),
}));
jest.mock("../app/callable_timeout", () => ({
  withCallableTimeout: jest.fn(async (promise: Promise<unknown>) => promise),
}));
jest.mock("../app/stable_id", () => ({
  getStableId: jest.fn(async () => "stable-1"),
}));
jest.mock("../app/account_generation", () => ({
  captureAccountGeneration: jest.fn(() => ({
    generation: 2,
    stableId: "stable-1",
    phase: "active",
  })),
  isCurrentAccountGeneration: jest.fn(() => true),
  withAccountTransitionLock: jest.fn(async (work: () => Promise<unknown>) =>
    work(),
  ),
}));
jest.mock("../app/interactive_network_quiet", () => ({
  isInteractiveNetworkDeferredError: jest.fn(() => false),
  withBackgroundNetworkLease: jest.fn(
    async (
      _source: string,
      work: (lease: { assertCurrent(): void }) => Promise<unknown>,
    ) => work({ assertCurrent: jest.fn() }),
  ),
}));
jest.mock(
  "../modules/learning-v2/progress/activity_released_session_completion_spool_v1",
  () => ({
    createLearningV2ActivityReleasedSessionCompletionSpoolV1: jest.fn(() => ({
      list,
      remove,
      discoverAccountScopes,
    })),
  }),
);

describe("Learning V2 released completion background sync", () => {
  beforeEach(() => {
    list.mockResolvedValue([completion]);
    discoverAccountScopes.mockImplementation(async (scope) => [scope]);
    remove.mockClear();
    callable.mockClear();
  });

  test("submits once after the session and removes only after an exact receipt", async () => {
    await expect(
      attemptPendingLearningV2ActivityReleasedCompletionsV1(),
    ).resolves.toEqual({ processed: 1, disposition: "drained" });
    expect(httpsCallable).toHaveBeenCalledWith(
      expect.anything(),
      "submitLearningV2ActivityReleasedCompletionV1",
    );
    expect(callable).toHaveBeenCalledWith({ completion });
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({
        stableId: "stable-1",
        seasonId: "learning-v2",
      }),
      completion.completionFingerprint,
    );
  });

  test("keeps the spool row when transport or receipt validation fails", async () => {
    callable.mockRejectedValueOnce(new Error("offline"));
    await expect(
      attemptPendingLearningV2ActivityReleasedCompletionsV1(),
    ).resolves.toEqual({ processed: 0, disposition: "retryable_failure" });
    expect(remove).not.toHaveBeenCalled();

    callable.mockResolvedValueOnce({
      data: {
        ...(await callable()).data,
        localCompletionFingerprint: "9".repeat(64),
      },
    });
    await expect(
      attemptPendingLearningV2ActivityReleasedCompletionsV1(),
    ).resolves.toEqual({ processed: 0, disposition: "retryable_failure" });
    expect(remove).not.toHaveBeenCalled();
  });
});
