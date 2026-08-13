import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import {
  getLearningV2ActivityReleasedSessionRuntimeSummaryV1,
  getLearningV2ActivityReleasedSessionTaskV1,
  mountLearningV2ActivityReleasedSessionRuntimeV1,
  parseLearningV2ActivityReleasedSessionPackageV1,
} from "../../../modules/learning-v2/runtime/activity_released_session_package_v1";
import { materializeLearningV2ActivityReleasedCompletionReconciliationV1 } from "./activity_released_session_completion_projection_v1";

jest.mock(
  "../../../modules/learning-v2/runtime/activity_released_session_package_v1",
  () => ({
    getLearningV2ActivityReleasedSessionRuntimeSummaryV1: jest.fn(),
    getLearningV2ActivityReleasedSessionTaskV1: jest.fn(),
    mountLearningV2ActivityReleasedSessionRuntimeV1: jest.fn(),
    parseLearningV2ActivityReleasedSessionPackageV1: jest.fn(),
  }),
);

const h = (value: unknown) => hashCanonicalBody(value);
const runtime = Object.freeze({});
const summary = Object.freeze({
  seasonId: "season-1",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  releaseId: "release-1",
  activeManifestHash: h("active"),
  episodeId: "episode-1",
  stageId: "stage-1",
  activityPackageFingerprint: h("activity"),
  packageFingerprint: h("package"),
  sessionId: "session-1",
  sessionOrdinal: 1,
});

function completion() {
  const body = Object.freeze({
    schemaVersion: "learning-v2-activity-released-session-completion.v1",
    kind: "activity_released_session_completion",
    accountScopeHash: h("account"),
    accountGeneration: 1,
    ...summary,
    localSessionId: "lesson-1-understand-1",
    sessionRunId: "run-1",
    taskCompletions: Object.freeze(
      Array.from({ length: 12 }, (_, index) =>
        Object.freeze({
          slot: index + 1,
          taskId: `task-${index + 1}`,
          activityId: `activity-${index + 1}`,
          family: "phrase_builder",
          purpose: index === 10 ? "interleaved_review" : "guided_practice",
          disposition: index === 11 ? "skipped" : "completed",
          learnerAttempts: index === 11 ? 0 : 1,
          hintUsed: false,
          localResultClaim:
            index === 11
              ? "skipped_without_evidence"
              : "locally_provisional_correct_before_completion",
        }),
      ),
    ),
    answerPayload: "absent",
    localFeedbackAuthority: "local_provisional_only",
    transportAuthority: "none_local_spool_candidate",
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    completionAuthority: "none_server_revalidation_required",
    releaseAuthority: false,
  });
  return Object.freeze({ ...body, completionFingerprint: h(body) });
}

describe("Learning V2 released completion reconciliation", () => {
  beforeEach(() => {
    jest
      .mocked(parseLearningV2ActivityReleasedSessionPackageV1)
      .mockReturnValue(Object.freeze({}) as never);
    jest
      .mocked(mountLearningV2ActivityReleasedSessionRuntimeV1)
      .mockReturnValue(runtime as never);
    jest
      .mocked(getLearningV2ActivityReleasedSessionRuntimeSummaryV1)
      .mockReturnValue(summary as never);
    jest.mocked(getLearningV2ActivityReleasedSessionTaskV1).mockImplementation(
      (_runtime, slot) =>
        Object.freeze({
          slot,
          taskId: `task-${slot}`,
          activityId: `activity-${slot}`,
          family: "phrase_builder",
          purpose: slot === 11 ? "interleaved_review" : "guided_practice",
        }) as never,
    );
  });

  test("reconciles all twelve coordinates but grants no performance authority", () => {
    const result =
      materializeLearningV2ActivityReleasedCompletionReconciliationV1({
        completion: completion(),
        canonicalPackageRaw: '{"package":true}',
        expectedAccountScopeHash: h("account"),
        expectedAccountGeneration: 1,
      });
    expect(result).toMatchObject({
      completedCount: 11,
      skipCount: 1,
      catalogReconciliation: "exact_active_release_package_and_12_task_match",
      completionClaimAuthority: "untrusted_client_report_only",
      performanceAuthority: "none",
      walletAuthority: "none",
      releaseAuthority: false,
    });
    expect(result.taskClaims).toHaveLength(12);
  });

  test("rejects account, active release and task-coordinate drift", () => {
    const input = {
      completion: completion(),
      canonicalPackageRaw: '{"package":true}',
      expectedAccountScopeHash: h("account"),
      expectedAccountGeneration: 1,
    };
    expect(() =>
      materializeLearningV2ActivityReleasedCompletionReconciliationV1({
        ...input,
        expectedAccountScopeHash: h("other"),
      }),
    ).toThrow(
      "learning_v2_activity_released_completion_reconciliation_invalid",
    );
    jest
      .mocked(getLearningV2ActivityReleasedSessionRuntimeSummaryV1)
      .mockReturnValue({ ...summary, activeManifestHash: h("next") } as never);
    expect(() =>
      materializeLearningV2ActivityReleasedCompletionReconciliationV1(input),
    ).toThrow(
      "learning_v2_activity_released_completion_reconciliation_invalid",
    );
    jest
      .mocked(getLearningV2ActivityReleasedSessionRuntimeSummaryV1)
      .mockReturnValue(summary as never);
    jest.mocked(getLearningV2ActivityReleasedSessionTaskV1).mockImplementation(
      (_runtime, slot) =>
        ({
          slot,
          taskId: slot === 4 ? "substituted-task" : `task-${slot}`,
          activityId: `activity-${slot}`,
          family: "phrase_builder",
          purpose: slot === 11 ? "interleaved_review" : "guided_practice",
        }) as never,
    );
    expect(() =>
      materializeLearningV2ActivityReleasedCompletionReconciliationV1(input),
    ).toThrow(
      "learning_v2_activity_released_completion_reconciliation_invalid",
    );
  });
});
