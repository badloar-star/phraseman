import { httpsCallable } from "@react-native-firebase/functions";
import { attemptPendingLearningV2ActivityReleasedSubmissionsV2 } from "../app/learning_v2_activity_released_submission_sync_v2";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const submission = Object.freeze({ submissionFingerprint: "a".repeat(64) });
const list = jest.fn(async () => [submission]);
const discoverAccountScopes = jest.fn(async (scope) => [scope]);
const remove = jest.fn(async () => undefined);
const mockCommitLearningV2ServerWalletReward = jest.fn(
  async (_request: unknown) => undefined,
);
const walletRewardRequest = Object.freeze({
  schemaVersion: "learning-v2-server-wallet-reward-request.v1" as const,
  rewardId: "required-session-initial-test",
  rewardFingerprint: "e".repeat(64),
});
const receiptBody = Object.freeze({
  schemaVersion: "learning-v2-activity-released-submission-server-receipt.v2",
  localSubmissionFingerprint: submission.submissionFingerprint,
  serverSubmissionFingerprint: "b".repeat(64),
  recordFingerprint: "c".repeat(64),
  evaluationFingerprint: "d".repeat(64),
  settlementProjectionFingerprint: "f".repeat(64),
  completionKind: "initial",
  awardedSubunits: 30_000,
  walletRewardRequest,
  duplicate: false,
  catalogAuthority: "firebase_admin_active_release_package_and_sidecar",
  evaluationAuthority: "server_active_release_answer_sequence_only",
  settlementState: "server_economy_settled",
  walletAuthority: "protected_server_reward_receipt_or_none",
  masteryAuthority: "none",
  evidenceAuthority: "none",
  completionAuthority: "server_settled_required_session_progress",
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
jest.mock("../app/learning_v2_owner_repository_runtime", () => ({
  commitLearningV2ServerWalletReward: (request: unknown) =>
    mockCommitLearningV2ServerWalletReward(request),
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
  "../modules/learning-v2/progress/activity_released_session_submission_spool_v2",
  () => ({
    createLearningV2ActivityReleasedSessionSubmissionSpoolV2: jest.fn(() => ({
      list,
      remove,
      discoverAccountScopes,
    })),
  }),
);

describe("Learning V2 released submission background sync", () => {
  beforeEach(() => {
    list.mockResolvedValue([submission]);
    discoverAccountScopes.mockImplementation(async (scope) => [scope]);
    remove.mockClear();
    callable.mockClear();
    mockCommitLearningV2ServerWalletReward.mockClear();
  });

  it("removes a batch only after the exact evaluated server receipt", async () => {
    await expect(
      attemptPendingLearningV2ActivityReleasedSubmissionsV2(),
    ).resolves.toEqual({ processed: 1, disposition: "drained" });
    expect(httpsCallable).toHaveBeenCalledWith(
      expect.anything(),
      "submitLearningV2ActivityReleasedSessionV2",
    );
    expect(callable).toHaveBeenCalledWith({ submission });
    expect(mockCommitLearningV2ServerWalletReward).toHaveBeenCalledWith(
      walletRewardRequest,
    );
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({
        stableId: "stable-1",
        seasonId: "learning-v2",
      }),
      submission.submissionFingerprint,
    );
  });

  it("keeps the batch on transport or receipt failure", async () => {
    callable.mockRejectedValueOnce(new Error("offline"));
    await expect(
      attemptPendingLearningV2ActivityReleasedSubmissionsV2(),
    ).resolves.toEqual({ processed: 0, disposition: "retryable_failure" });
    expect(remove).not.toHaveBeenCalled();

    callable.mockResolvedValueOnce({
      data: {
        ...receiptBody,
        receiptFingerprint: hashCanonicalBody(receiptBody),
      },
    });
    mockCommitLearningV2ServerWalletReward.mockRejectedValueOnce(
      new Error("wallet-offline"),
    );
    await expect(
      attemptPendingLearningV2ActivityReleasedSubmissionsV2(),
    ).resolves.toEqual({ processed: 0, disposition: "retryable_failure" });
    expect(remove).not.toHaveBeenCalled();

    callable.mockResolvedValueOnce({
      data: {
        ...receiptBody,
        localSubmissionFingerprint: "9".repeat(64),
        receiptFingerprint: hashCanonicalBody({
          ...receiptBody,
          localSubmissionFingerprint: "9".repeat(64),
        }),
      },
    });
    await expect(
      attemptPendingLearningV2ActivityReleasedSubmissionsV2(),
    ).resolves.toEqual({ processed: 0, disposition: "retryable_failure" });
    expect(remove).not.toHaveBeenCalled();
  });
});
