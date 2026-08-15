import { HttpsError } from "firebase-functions/v2/https";
import {
  parseLearningV2ActivityReleasedSessionCompletionV1,
  rebindLearningV2ActivityReleasedSessionCompletionV1,
} from "../../../modules/learning-v2/progress/activity_released_session_completion_v1";
import { materializeLearningV2ActivityReleasedCompletionReconciliationV1 } from "./activity_released_session_completion_projection_v1";
import {
  createLearningV2ActivityReleasedCompletionHandlerV1,
  LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_CALLABLE_OPTIONS_V1,
} from "./activity_released_session_completion_callable_v1";

jest.mock(
  "../../../modules/learning-v2/progress/activity_released_session_completion_v1",
  () => ({
    parseLearningV2ActivityReleasedSessionCompletionV1: jest.fn(),
    rebindLearningV2ActivityReleasedSessionCompletionV1: jest.fn(),
  }),
);
jest.mock("./activity_released_session_completion_projection_v1", () => ({
  materializeLearningV2ActivityReleasedCompletionReconciliationV1: jest.fn(),
}));

const h = (character: string) => character.repeat(64);
const localCompletion = Object.freeze({
  completionFingerprint: h("a"),
  activeManifestHash: h("b"),
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "season-1",
  releaseId: "release-1",
  episodeId: "episode-1",
  stageId: "stage-1",
  activityPackageFingerprint: h("c"),
  packageFingerprint: h("d"),
  sessionId: "session-1",
  sessionOrdinal: 1,
  localSessionId: "local-session-1",
  sessionRunId: "run-1",
});
const reboundCompletion = Object.freeze({
  ...localCompletion,
  accountScopeHash: h("e"),
  accountGeneration: 7,
  completionFingerprint: h("f"),
});
const reconciliation = Object.freeze({
  reconciliationFingerprint: h("1"),
  completedCount: 11,
  skipCount: 1,
  performanceAuthority: "none",
  walletAuthority: "none",
  masteryAuthority: "none",
  evidenceAuthority: "none",
  releaseAuthority: false,
});

describe("Learning V2 released completion callable", () => {
  beforeEach(() => {
    jest
      .mocked(parseLearningV2ActivityReleasedSessionCompletionV1)
      .mockReturnValue(localCompletion as never);
    jest
      .mocked(rebindLearningV2ActivityReleasedSessionCompletionV1)
      .mockReturnValue(reboundCompletion as never);
    jest
      .mocked(materializeLearningV2ActivityReleasedCompletionReconciliationV1)
      .mockReturnValue(reconciliation as never);
  });

  test("rebinds server identity, reloads the active package and stores authority-free receipt", async () => {
    expect(
      LEARNING_V2_ACTIVITY_RELEASED_COMPLETION_CALLABLE_OPTIONS_V1.enforceAppCheck,
    ).toBe(true);
    const putIfAbsent = jest.fn(async () => "created" as const);
    const resolveSession = jest.fn(async (completion, stableUid) => {
      expect(completion).toBe(reboundCompletion);
      expect(stableUid).toBe("stable-1");
      return Object.freeze({
        activeManifestHash: h("b"),
        auxiliaryIndexFingerprint: h("2"),
        canonicalPackageRaw: '{"package":true}',
      });
    });
    const handler = createLearningV2ActivityReleasedCompletionHandlerV1({
      authorize: async (authUid) => {
        expect(authUid).toBe("auth-1");
        return Object.freeze({
          stableUid: "stable-1",
          accountGeneration: 7,
        });
      },
      resolveSession,
      inboxStore: { putIfAbsent },
    });
    const receipt = await handler({
      data: { completion: localCompletion },
      auth: { uid: "auth-1" },
    });
    expect(
      rebindLearningV2ActivityReleasedSessionCompletionV1,
    ).toHaveBeenCalledWith(localCompletion, {
      accountScopeHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      accountGeneration: 7,
    });
    expect(putIfAbsent).toHaveBeenCalledTimes(1);
    expect(receipt).toMatchObject({
      schemaVersion:
        "learning-v2-activity-released-completion-server-receipt.v1",
      localCompletionFingerprint: h("a"),
      serverCompletionFingerprint: h("f"),
      reconciliationFingerprint: h("1"),
      duplicate: false,
      catalogAuthority:
        "firebase_admin_active_release_12_task_coordinate_match",
      completionAuthority: "accepted_completed_summary_for_storage_only",
      performanceAuthority: "none",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      releaseAuthority: false,
    });
  });

  test("reports exact replay and fails closed on auth, release drift and stored conflict", async () => {
    const base = {
      authorize: async () => ({ stableUid: "stable-1", accountGeneration: 7 }),
      resolveSession: async () => ({
        activeManifestHash: h("b"),
        auxiliaryIndexFingerprint: h("2"),
        canonicalPackageRaw: '{"package":true}',
      }),
    };
    const replay = createLearningV2ActivityReleasedCompletionHandlerV1({
      ...base,
      inboxStore: { putIfAbsent: async () => "existing" },
    });
    await expect(
      replay({ data: { completion: localCompletion } }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(
      replay({
        data: { completion: localCompletion, extra: true },
        auth: { uid: "auth-1" },
      }),
    ).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(
      replay({
        data: { completion: localCompletion },
        auth: { uid: "auth-1" },
      }),
    ).resolves.toMatchObject({ duplicate: true });

    const drift = createLearningV2ActivityReleasedCompletionHandlerV1({
      ...base,
      resolveSession: async () => ({
        activeManifestHash: h("9"),
        auxiliaryIndexFingerprint: h("2"),
        canonicalPackageRaw: '{"package":true}',
      }),
      inboxStore: { putIfAbsent: async () => "created" },
    });
    await expect(
      drift({
        data: { completion: localCompletion },
        auth: { uid: "auth-1" },
      }),
    ).rejects.toMatchObject({ code: "failed-precondition" });

    const conflict = createLearningV2ActivityReleasedCompletionHandlerV1({
      ...base,
      inboxStore: {
        putIfAbsent: async () => {
          throw new Error("activity_released_completion_conflict");
        },
      },
    });
    await expect(
      conflict({
        data: { completion: localCompletion },
        auth: { uid: "auth-1" },
      }),
    ).rejects.toBeInstanceOf(HttpsError);
  });
});
