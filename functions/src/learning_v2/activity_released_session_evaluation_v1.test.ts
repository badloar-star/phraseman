import { materializeLearningV2ActivityReleasedSessionCompletionV1 } from "../../../modules/learning-v2/progress/activity_released_session_completion_v1";
import { materializeLearningV2ActivityReleasedSessionSubmissionV2 } from "../../../modules/learning-v2/progress/activity_released_session_submission_v2";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  createV2LocalEvaluatorCommitmentV1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
} from "../../../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import {
  getLearningV2ActivityReleasedSessionPackageSummaryV1,
  getLearningV2ActivityReleasedSessionRuntimeSummaryV1,
  getLearningV2ActivityReleasedSessionTaskV1,
  isLearningV2ActivityReleasedSessionRuntimeHandleV1,
} from "../../../modules/learning-v2/runtime/activity_released_session_package_v1";
import { materializeLearningV2ActivityReleasedSessionEvaluationV1 } from "./activity_released_session_evaluation_v1";

jest.mock(
  "../../../modules/learning-v2/runtime/activity_released_session_package_v1",
  () => ({
    getLearningV2ActivityReleasedSessionPackageSummaryV1: jest.fn(),
    getLearningV2ActivityReleasedSessionRuntimeSummaryV1: jest.fn(),
    getLearningV2ActivityReleasedSessionTaskV1: jest.fn(),
    isLearningV2ActivityReleasedSessionRuntimeHandleV1: jest.fn(),
    parseLearningV2ActivityReleasedSessionPackageV1: jest.fn(() => ({})),
    mountLearningV2ActivityReleasedSessionRuntimeV1: jest.fn(() => runtime),
  }),
);

const h = (value: unknown) => hashCanonicalBody(value);
const runtime = Object.freeze({});
const scope = Object.freeze({
  stableId: "stable-1",
  accountScopeHash: h("account"),
  seasonId: "season-1",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  generation: 1,
});
const summary = Object.freeze({
  environment: "lab",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  seasonId: "season-1",
  releaseId: "release-1",
  activeManifestHash: h("manifest"),
  episodeId: "episode-1",
  stageId: "stage-activity-1",
  activityPackageFingerprint: h("activity-package"),
  packageFingerprint: h("session-package"),
  sessionId: "episode-1:session:01",
  sessionOrdinal: 1,
});
const packageSummary = Object.freeze({
  episodeId: summary.episodeId,
  sessionId: summary.sessionId,
  sessionOrdinal: summary.sessionOrdinal,
  activityPackageFingerprint: summary.activityPackageFingerprint,
  packageFingerprint: summary.packageFingerprint,
  sourceFingerprint: h("source"),
});

function task(slot: number) {
  return Object.freeze({
    slot,
    taskId: `task-${slot}`,
    activityId: `activity-${slot}`,
    family: "phrase_builder",
    purpose: slot === 11 ? "interleaved_review" : "guided_practice",
    evaluatorInputKind: "text",
  });
}

function fixture() {
  const taskResults = Array.from({ length: 12 }, (_, index) => ({
    taskId: `task-${index + 1}`,
    disposition: index === 10 ? ("skipped" as const) : ("completed" as const),
    learnerAttempts: index === 10 ? 0 : index === 0 ? 2 : 1,
    hintUsed: false,
  }));
  const completion = materializeLearningV2ActivityReleasedSessionCompletionV1({
    scope,
    runtime: runtime as never,
    localSessionId: "lesson-1-understand-1",
    sessionRunId: "run-1",
    taskResults,
  });
  const taskAnswers = Array.from({ length: 12 }, (_, index) => ({
    taskId: `task-${index + 1}`,
    attempts:
      index === 10
        ? []
        : index === 0
          ? [
              { kind: "text" as const, value: "wrong" },
              { kind: "text" as const, value: "right" },
            ]
          : [{ kind: "text" as const, value: "right" }],
  }));
  const submission = materializeLearningV2ActivityReleasedSessionSubmissionV2({
    runtime: runtime as never,
    completion,
    taskAnswers,
  });
  const sidecarTasks = Array.from({ length: 12 }, (_, index) => {
    const slot = index + 1;
    const salt = h(["salt", slot]);
    const input = {
      capsuleId: `capsule-${slot}`,
      taskId: `task-${slot}`,
      activityId: `activity-${slot}`,
      family: "phrase_builder" as const,
      inputKind: "text" as const,
      normalizationLocale: "en",
      normalizationProfileHash:
        V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
      salt,
    };
    return Object.freeze({
      ...input,
      normalizationRef: V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
      correctResponse: "right",
      acceptedResponses: Object.freeze(["right"]),
      acceptedCommitments: Object.freeze([
        createV2LocalEvaluatorCommitmentV1({ ...input, response: "right" }),
      ]),
    });
  });
  const sidecarRaw = canonicalJsonV1({
    schemaVersion: "v2-activity-session-server-sidecar.v2",
    sourceFingerprint: h("source"),
    episodeId: "episode-1",
    sessionId: "episode-1:session:01",
    sessionOrdinal: 1,
    tasks: sidecarTasks,
    commitmentAggregate: h("commitments"),
    serverOnly: true,
    evaluationAuthority: "none",
    rewardAuthority: "none",
    releaseAuthority: false,
  });
  return { submission, sidecarRaw };
}

describe("released Activity server answer evaluation", () => {
  beforeEach(() => {
    jest
      .mocked(getLearningV2ActivityReleasedSessionPackageSummaryV1)
      .mockReturnValue(packageSummary as never);
    jest
      .mocked(isLearningV2ActivityReleasedSessionRuntimeHandleV1)
      .mockReturnValue(true);
    jest
      .mocked(getLearningV2ActivityReleasedSessionRuntimeSummaryV1)
      .mockReturnValue(summary as never);
    jest
      .mocked(getLearningV2ActivityReleasedSessionTaskV1)
      .mockImplementation((_runtime, slot) => task(slot) as never);
  });

  it("replays every attempt against the release-pinned sidecar", () => {
    const { submission, sidecarRaw } = fixture();
    const evaluation = materializeLearningV2ActivityReleasedSessionEvaluationV1(
      {
        submission,
        canonicalPackageRaw: canonicalJsonV1({ package: true }),
        canonicalSidecarRaw: sidecarRaw,
        expectedAccountScopeHash: scope.accountScopeHash,
        expectedAccountGeneration: 1,
      },
    );
    expect(evaluation).toMatchObject({
      verifiedCompletedCount: 11,
      skipCount: 1,
      technicalInvalidAttemptCount: 0,
      answerEvaluation: "exact_release_pinned_server_sidecar_commitment_replay",
      rawAudioEvaluation: "absent_not_evaluated",
      pronunciationAuthority: "none_transcript_content_only",
      performanceAuthority: "server_answer_sequence_only",
      walletAuthority: "none_settlement_required",
      masteryAuthority: "none_settlement_required",
      evidenceAuthority: "none_settlement_required",
      completionAuthority: "none_settlement_required",
      publicationAuthority: "none",
      releaseAuthority: false,
    });
    expect(evaluation.taskEvaluations[0]).toMatchObject({
      firstCorrectAttemptOrdinal: 2,
      attempts: [
        { attemptOrdinal: 1, resultCode: "wrong" },
        { attemptOrdinal: 2, resultCode: "correct" },
      ],
    });
    expect(evaluation.taskEvaluations[10]).toMatchObject({
      verifiedDisposition: "skipped_no_evidence",
      attempts: [],
      performanceAuthority: "none_skipped",
    });
  });

  it("rejects a false completion claim, account drift and sidecar substitution", () => {
    const { submission, sidecarRaw } = fixture();
    const falseCompletion = JSON.parse(JSON.stringify(submission));
    falseCompletion.taskAnswers[0].attempts = [
      { attemptOrdinal: 1, kind: "text", value: "wrong" },
      { attemptOrdinal: 2, kind: "text", value: "still wrong" },
    ];
    const body = Object.fromEntries(
      Object.entries(falseCompletion).filter(
        ([key]) => key !== "submissionFingerprint",
      ),
    );
    falseCompletion.submissionFingerprint = h(body);
    expect(() =>
      materializeLearningV2ActivityReleasedSessionEvaluationV1({
        submission: falseCompletion,
        canonicalPackageRaw: canonicalJsonV1({ package: true }),
        canonicalSidecarRaw: sidecarRaw,
        expectedAccountScopeHash: scope.accountScopeHash,
        expectedAccountGeneration: 1,
      }),
    ).toThrow("learning_v2_activity_released_session_evaluation_invalid");
    expect(() =>
      materializeLearningV2ActivityReleasedSessionEvaluationV1({
        submission,
        canonicalPackageRaw: canonicalJsonV1({ package: true }),
        canonicalSidecarRaw: sidecarRaw,
        expectedAccountScopeHash: h("other-account"),
        expectedAccountGeneration: 1,
      }),
    ).toThrow("learning_v2_activity_released_session_evaluation_invalid");
    const sidecar = JSON.parse(sidecarRaw);
    sidecar.tasks[0].taskId = "other-task";
    expect(() =>
      materializeLearningV2ActivityReleasedSessionEvaluationV1({
        submission,
        canonicalPackageRaw: canonicalJsonV1({ package: true }),
        canonicalSidecarRaw: canonicalJsonV1(sidecar),
        expectedAccountScopeHash: scope.accountScopeHash,
        expectedAccountGeneration: 1,
      }),
    ).toThrow("learning_v2_activity_released_session_evaluation_invalid");
  });
});
