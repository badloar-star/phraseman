import { httpsCallable } from "@react-native-firebase/functions";
import { attemptPendingLearningV2CourseSessionCompletedV1 } from "../app/learning_v2_course_session_completed_sync_v1";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const completion = Object.freeze({ completionFingerprint: "a".repeat(64) });
const list = jest.fn(async () => [completion]);
const remove = jest.fn(async () => undefined);
const receiptBody = Object.freeze({
  schemaVersion: "learning-v2-course-session-completed-server-receipt.v1",
  localCompletionFingerprint: completion.completionFingerprint,
  recordFingerprint: "b".repeat(64),
  duplicate: false,
  answerPayload: "absent",
  serverEvaluationAuthority: "none_server_must_not_return_correct_or_wrong",
  completionAuthority: "accepted_completed_summary_for_background_storage_only",
  walletAuthority: "none",
  masteryAuthority: "none",
  evidenceAuthority: "none",
  releaseAuthority: false,
});
const callable = jest.fn(async () => ({
  data: { ...receiptBody, receiptFingerprint: hashCanonicalBody(receiptBody) },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({}));
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
jest.mock("../app/learning_v2_course_session_completed_spool_v1", () => ({
  createLearningV2CourseSessionCompletedSpoolV1: jest.fn(() => ({
    list,
    remove,
  })),
}));

describe("Learning V2 direct completion background sync", () => {
  beforeEach(() => {
    list.mockResolvedValue([completion]);
    remove.mockClear();
    callable.mockClear();
  });

  test("sends only the completion summary and removes it after exact receipt", async () => {
    await expect(
      attemptPendingLearningV2CourseSessionCompletedV1(),
    ).resolves.toEqual({ processed: 1, disposition: "drained" });
    expect(httpsCallable).toHaveBeenCalledWith(
      expect.anything(),
      "submitLearningV2CourseSessionCompletedV1",
    );
    expect(callable).toHaveBeenCalledWith({ completion });
    expect(remove).toHaveBeenCalledWith(
      expect.stringMatching(/^[a-f0-9]{64}$/u),
      completion.completionFingerprint,
    );
  });

  test("keeps the summary when transport or receipt is invalid", async () => {
    callable.mockRejectedValueOnce(new Error("offline"));
    await expect(
      attemptPendingLearningV2CourseSessionCompletedV1(),
    ).resolves.toEqual({ processed: 0, disposition: "retryable_failure" });
    expect(remove).not.toHaveBeenCalled();

    callable.mockResolvedValueOnce({
      data: {
        ...receiptBody,
        localCompletionFingerprint: "9".repeat(64),
        receiptFingerprint: hashCanonicalBody({
          ...receiptBody,
          localCompletionFingerprint: "9".repeat(64),
        }),
      },
    });
    await expect(
      attemptPendingLearningV2CourseSessionCompletedV1(),
    ).resolves.toEqual({ processed: 0, disposition: "retryable_failure" });
    expect(remove).not.toHaveBeenCalled();
  });
});
