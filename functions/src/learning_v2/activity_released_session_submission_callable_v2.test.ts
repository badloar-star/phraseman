import { HttpsError } from "firebase-functions/v2/https";
import {
  parseLearningV2ActivityReleasedSessionSubmissionV2,
  rebindLearningV2ActivityReleasedSessionSubmissionV2,
} from "../../../modules/learning-v2/progress/activity_released_session_submission_v2";
import { materializeLearningV2ActivityReleasedSessionEvaluationV1 } from "./activity_released_session_evaluation_v1";
import { materializeLearningV2ActivityReleasedSettlementProjectionV1 } from "./activity_released_session_settlement_projection_v1";
import {
  createLearningV2ActivityReleasedSubmissionHandlerV2,
  LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_CALLABLE_OPTIONS_V2,
} from "./activity_released_session_submission_callable_v2";

jest.mock(
  "../../../modules/learning-v2/progress/activity_released_session_submission_v2",
  () => ({
    parseLearningV2ActivityReleasedSessionSubmissionV2: jest.fn(),
    rebindLearningV2ActivityReleasedSessionSubmissionV2: jest.fn(),
  }),
);
jest.mock("./activity_released_session_evaluation_v1", () => ({
  materializeLearningV2ActivityReleasedSessionEvaluationV1: jest.fn(),
}));
jest.mock("./activity_released_session_settlement_projection_v1", () => ({
  materializeLearningV2ActivityReleasedSettlementProjectionV1: jest.fn(),
}));

const h = (character: string) => character.repeat(64);
const local = Object.freeze({
  submissionFingerprint: h("a"),
  completion: Object.freeze({
    studyTarget: "en",
    learnerSourceLocale: "ru",
    seasonId: "season-1",
  }),
  activeManifestHash: h("b"),
  releaseId: "release-1",
  episodeId: "episode-1",
  stageId: "stage-1",
  activityPackageFingerprint: h("c"),
  packageFingerprint: h("d"),
  sessionId: "session-1",
  sessionOrdinal: 1,
  sessionRunId: "run-1",
});
const rebound = Object.freeze({
  ...local,
  accountScopeHash: h("e"),
  accountGeneration: 7,
  submissionFingerprint: h("f"),
});
const evaluation = Object.freeze({
  evaluationFingerprint: h("1"),
  walletAuthority: "none_settlement_required",
  masteryAuthority: "none_settlement_required",
  evidenceAuthority: "none_settlement_required",
  completionAuthority: "none_settlement_required",
  releaseAuthority: false,
});
const settlementProjection = Object.freeze({
  projectionFingerprint: h("2"),
  candidate: Object.freeze({ candidateFingerprint: h("3") }),
});
const materials = Object.freeze({
  canonicalPackageRaw: '{"package":true}',
  canonicalSidecarRaw: '{"sidecar":true}',
  activeManifestHash: h("b"),
  releaseId: "release-1",
  courseReleaseId: "course-release-1",
  episodeOrdinal: 1,
  stageId: "stage-1",
  activityPackageFingerprint: h("c"),
});

describe("Learning V2 released submission callable", () => {
  beforeEach(() => {
    jest
      .mocked(parseLearningV2ActivityReleasedSessionSubmissionV2)
      .mockReturnValue(local as never);
    jest
      .mocked(rebindLearningV2ActivityReleasedSessionSubmissionV2)
      .mockReturnValue(rebound as never);
    jest
      .mocked(materializeLearningV2ActivityReleasedSessionEvaluationV1)
      .mockReturnValue(evaluation as never);
    jest
      .mocked(materializeLearningV2ActivityReleasedSettlementProjectionV1)
      .mockReturnValue(settlementProjection as never);
  });

  it("rebinds identity, evaluates against active package+sidecar and stores settled economy", async () => {
    expect(
      LEARNING_V2_ACTIVITY_RELEASED_SUBMISSION_CALLABLE_OPTIONS_V2.enforceAppCheck,
    ).toBe(true);
    const putIfAbsent = jest.fn(async () => ({
      status: "created" as const,
      completionKind: "initial" as const,
      awardedSubunits: 30_000,
      walletRewardRequest: Object.freeze({
        schemaVersion: "learning-v2-server-wallet-reward-request.v1" as const,
        rewardId: "required-session-initial-test",
        rewardFingerprint: h("4"),
      }),
    }));
    const handler = createLearningV2ActivityReleasedSubmissionHandlerV2({
      authorize: async () => ({ stableUid: "stable-1", accountGeneration: 7 }),
      resolveMaterials: async (submission, stableUid) => {
        expect(submission).toBe(rebound);
        expect(stableUid).toBe("stable-1");
        return materials;
      },
      inboxStore: { putIfAbsent },
    });
    const receipt = await handler({
      data: { submission: local },
      auth: { uid: "auth-1" },
    });
    expect(
      rebindLearningV2ActivityReleasedSessionSubmissionV2,
    ).toHaveBeenCalledWith(local, {
      accountScopeHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      accountGeneration: 7,
    });
    expect(
      materializeLearningV2ActivityReleasedSessionEvaluationV1,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        submission: rebound,
        canonicalPackageRaw: materials.canonicalPackageRaw,
        canonicalSidecarRaw: materials.canonicalSidecarRaw,
      }),
    );
    expect(
      materializeLearningV2ActivityReleasedSettlementProjectionV1,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        submission: rebound,
        evaluation,
        courseReleaseId: "course-release-1",
        episodeOrdinal: 1,
        economicAccountScopeHash: expect.stringMatching(/^[a-f0-9]{64}$/u),
      }),
    );
    expect(putIfAbsent).toHaveBeenCalledTimes(1);
    expect(receipt).toMatchObject({
      schemaVersion:
        "learning-v2-activity-released-submission-server-receipt.v2",
      localSubmissionFingerprint: h("a"),
      serverSubmissionFingerprint: h("f"),
      evaluationFingerprint: h("1"),
      settlementProjectionFingerprint: h("2"),
      completionKind: "initial",
      awardedSubunits: 30_000,
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
  });

  it("fails closed on auth, release drift, evaluation failure and conflict", async () => {
    const base = {
      authorize: async () => ({ stableUid: "stable-1", accountGeneration: 7 }),
      resolveMaterials: async () => materials,
    };
    const handler = createLearningV2ActivityReleasedSubmissionHandlerV2({
      ...base,
      inboxStore: {
        putIfAbsent: async () => ({
          status: "existing",
          completionKind: "initial",
          awardedSubunits: 30_000,
          walletRewardRequest: null,
        }),
      },
    });
    await expect(
      handler({ data: { submission: local } }),
    ).rejects.toMatchObject({
      code: "unauthenticated",
    });
    await expect(
      handler({
        data: { submission: local, extra: true },
        auth: { uid: "auth-1" },
      }),
    ).rejects.toMatchObject({ code: "invalid-argument" });
    await expect(
      handler({ data: { submission: local }, auth: { uid: "auth-1" } }),
    ).resolves.toMatchObject({ duplicate: true });

    const drift = createLearningV2ActivityReleasedSubmissionHandlerV2({
      ...base,
      resolveMaterials: async () => ({ ...materials, releaseId: "other" }),
      inboxStore: {
        putIfAbsent: async () => ({
          status: "created",
          completionKind: "initial",
          awardedSubunits: 30_000,
          walletRewardRequest: null,
        }),
      },
    });
    await expect(
      drift({ data: { submission: local }, auth: { uid: "auth-1" } }),
    ).rejects.toMatchObject({ code: "failed-precondition" });

    jest
      .mocked(materializeLearningV2ActivityReleasedSessionEvaluationV1)
      .mockImplementationOnce(() => {
        throw new Error("invalid");
      });
    await expect(
      handler({ data: { submission: local }, auth: { uid: "auth-1" } }),
    ).rejects.toMatchObject({ code: "failed-precondition" });

    const conflict = createLearningV2ActivityReleasedSubmissionHandlerV2({
      ...base,
      inboxStore: {
        putIfAbsent: async () => {
          throw new Error("activity_released_submission_conflict");
        },
      },
    });
    await expect(
      conflict({ data: { submission: local }, auth: { uid: "auth-1" } }),
    ).rejects.toBeInstanceOf(HttpsError);
  });
});
