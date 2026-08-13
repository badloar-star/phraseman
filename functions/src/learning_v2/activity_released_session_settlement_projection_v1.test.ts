import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { materializeLearningV2ActivityReleasedSettlementProjectionV1 } from "./activity_released_session_settlement_projection_v1";

const h = (value: unknown) => hashCanonicalBody(value);

function fixture() {
  const taskCompletions = Object.freeze(
    Array.from({ length: 12 }, (_, index) =>
      Object.freeze({
        slot: index + 1,
        taskId: `task-${index + 1}`,
        activityId: `activity-${index + 1}`,
        family: "phrase_builder",
        purpose: index === 10 ? "interleaved_review" : "guided_practice",
        disposition:
          index === 10 ? ("skipped" as const) : ("completed" as const),
        learnerAttempts: index === 10 ? 0 : index === 0 ? 2 : 1,
        hintUsed: index === 1,
        localResultClaim:
          index === 10
            ? ("skipped_without_evidence" as const)
            : ("locally_provisional_correct_before_completion" as const),
      }),
    ),
  );
  const completion = Object.freeze({
    studyTarget: "en",
    localSessionId: "lesson-1-understand-1",
    taskCompletions,
  });
  const submission = Object.freeze({
    accountScopeHash: h("account"),
    accountGeneration: 4,
    releaseId: "release-1",
    activeManifestHash: h("manifest"),
    episodeId: "episode-2",
    stageId: "stage-activity-2",
    activityPackageFingerprint: h("activity"),
    packageFingerprint: h("package"),
    sessionId: "episode-2:session:03",
    sessionOrdinal: 3,
    sessionRunId: "run-1",
    completionFingerprint: h("completion"),
    submissionFingerprint: h("submission"),
    completion,
    taskAnswers: Object.freeze(
      taskCompletions.map((task, index) =>
        Object.freeze({
          slot: task.slot,
          taskId: task.taskId,
          activityId: task.activityId,
          family: task.family,
          disposition: task.disposition,
          attempts: Object.freeze(
            Array.from({ length: index === 10 ? 0 : index === 0 ? 2 : 1 }),
          ),
        }),
      ),
    ),
  });
  const taskEvaluations = Object.freeze(
    taskCompletions.map((task, index) =>
      Object.freeze({
        slot: task.slot,
        taskId: task.taskId,
        activityId: task.activityId,
        family: task.family,
        disposition: task.disposition,
        attempts: Object.freeze(
          index === 10
            ? []
            : index === 0
              ? [
                  { attemptOrdinal: 1, resultCode: "wrong" },
                  { attemptOrdinal: 2, resultCode: "correct" },
                ]
              : [{ attemptOrdinal: 1, resultCode: "correct" }],
        ),
      }),
    ),
  );
  const evaluation = Object.freeze({
    accountScopeHash: submission.accountScopeHash,
    accountGeneration: submission.accountGeneration,
    releaseId: submission.releaseId,
    activeManifestHash: submission.activeManifestHash,
    episodeId: submission.episodeId,
    stageId: submission.stageId,
    activityPackageFingerprint: submission.activityPackageFingerprint,
    packageFingerprint: submission.packageFingerprint,
    sessionId: submission.sessionId,
    sessionOrdinal: submission.sessionOrdinal,
    sessionRunId: submission.sessionRunId,
    completionFingerprint: submission.completionFingerprint,
    submissionFingerprint: submission.submissionFingerprint,
    evaluationFingerprint: h("evaluation"),
    taskEvaluations,
  });
  return { submission, evaluation };
}

describe("released Activity settlement projection", () => {
  it("derives 3/2/1/0 stars only from evaluated submitted attempts", () => {
    const input = fixture();
    const projection =
      materializeLearningV2ActivityReleasedSettlementProjectionV1({
        ...input,
        courseReleaseId: "course-release-1",
        episodeOrdinal: 2,
        economicAccountScopeHash: h("economic-account"),
      } as never);
    expect(projection).toMatchObject({
      courseId: "learning-v2-en",
      courseRequiredSessionOrdinal: 15,
      taskStars: [2, 1, 3, 3, 3, 3, 3, 3, 3, 3, 0, 3],
      totalStars: 30,
      learnerAttemptClaim: "server_evaluated_submitted_sequence",
      sequenceCompletenessAuthority: "app_check_client_claim_not_anti_cheat",
      hintUseAuthority: "app_check_client_claim_not_anti_cheat",
      performanceAuthority: "server_policy_over_evaluated_submitted_sequence",
      masteryAuthority: "none",
      evidenceAuthority: "none",
    });
    expect(projection.candidate).toMatchObject({
      schemaVersion:
        "learning-v2-reconciled-required-session-completion-candidate.v2",
      episodeOrdinal: 2,
      courseRequiredSessionOrdinal: 15,
      provisionalBasePerformanceStars: 30,
      skipCount: 1,
      economicAuthority: "none",
    });
  });

  it("rejects evaluation/submission drift and technical-invalid-only completion", () => {
    const input = fixture();
    const common = {
      courseReleaseId: "course-release-1",
      episodeOrdinal: 2,
      economicAccountScopeHash: h("economic-account"),
    };
    expect(() =>
      materializeLearningV2ActivityReleasedSettlementProjectionV1({
        ...input,
        ...common,
        evaluation: { ...input.evaluation, sessionRunId: "other-run" },
      } as never),
    ).toThrow("activity_released_session_settlement_projection_invalid");
    const brokenTasks = input.evaluation.taskEvaluations.map((task, index) =>
      index === 0
        ? {
            ...task,
            attempts: [{ attemptOrdinal: 1, resultCode: "technical_invalid" }],
          }
        : task,
    );
    expect(() =>
      materializeLearningV2ActivityReleasedSettlementProjectionV1({
        ...input,
        ...common,
        evaluation: { ...input.evaluation, taskEvaluations: brokenTasks },
      } as never),
    ).toThrow("activity_released_session_settlement_projection_invalid");
  });
});
