import {
  materializeLearningV2ActivityReleasedSessionSubmissionV2,
  parseLearningV2ActivityReleasedSessionSubmissionV2,
  rebindLearningV2ActivityReleasedSessionSubmissionV2,
} from "../modules/learning-v2/progress/activity_released_session_submission_v2";
import { materializeLearningV2ActivityReleasedSessionCompletionV1 } from "../modules/learning-v2/progress/activity_released_session_completion_v1";
import {
  getLearningV2ActivityReleasedSessionRuntimeSummaryV1,
  getLearningV2ActivityReleasedSessionTaskV1,
  isLearningV2ActivityReleasedSessionRuntimeHandleV1,
} from "../modules/learning-v2/runtime/activity_released_session_package_v1";

jest.mock(
  "../modules/learning-v2/runtime/activity_released_session_package_v1",
  () => ({
    getLearningV2ActivityReleasedSessionRuntimeSummaryV1: jest.fn(),
    getLearningV2ActivityReleasedSessionTaskV1: jest.fn(),
    isLearningV2ActivityReleasedSessionRuntimeHandleV1: jest.fn(),
  }),
);

const h = (character: string) => character.repeat(64);
const runtime = Object.freeze({});
const scope = Object.freeze({
  stableId: "stable-1",
  accountScopeHash: h("a"),
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
  activeManifestHash: h("b"),
  episodeId: "episode-1",
  stageId: "stage-activity-1",
  activityPackageFingerprint: h("c"),
  packageFingerprint: h("d"),
  sessionId: "session-1",
  sessionOrdinal: 1,
});
const taskResults = Object.freeze(
  Array.from({ length: 12 }, (_, index) =>
    Object.freeze({
      taskId: `task-${index + 1}`,
      disposition: index === 10 ? ("skipped" as const) : ("completed" as const),
      learnerAttempts: index === 10 ? 0 : index === 0 ? 2 : 1,
      hintUsed: false,
    }),
  ),
);

describe("Learning V2 released post-session submission", () => {
  beforeEach(() => {
    jest
      .mocked(isLearningV2ActivityReleasedSessionRuntimeHandleV1)
      .mockReturnValue(true);
    jest
      .mocked(getLearningV2ActivityReleasedSessionRuntimeSummaryV1)
      .mockReturnValue(summary as never);
    jest.mocked(getLearningV2ActivityReleasedSessionTaskV1).mockImplementation(
      (_runtime, slot) =>
        Object.freeze({
          slot,
          taskId: `task-${slot}`,
          activityId: `activity-${slot}`,
          family: slot === 12 ? "scripted_repeat_compare" : "phrase_builder",
          purpose: slot === 11 ? "interleaved_review" : "guided_practice",
          evaluatorInputKind: slot === 12 ? "transcript" : "text",
        }) as never,
    );
  });

  function fixture() {
    const completion = materializeLearningV2ActivityReleasedSessionCompletionV1(
      {
        scope,
        runtime: runtime as never,
        localSessionId: "lesson-1-understand-1",
        sessionRunId: "run-1",
        taskResults,
      },
    );
    const taskAnswers = Array.from({ length: 12 }, (_, index) => ({
      taskId: `task-${index + 1}`,
      attempts:
        index === 10
          ? []
          : Array.from({ length: index === 0 ? 2 : 1 }, (_, attemptIndex) => ({
              kind: index === 11 ? ("transcript" as const) : ("text" as const),
              value:
                index === 11
                  ? "spoken transcript"
                  : attemptIndex === 0 && index === 0
                    ? "wrong"
                    : "right",
            })),
    }));
    return { completion, taskAnswers };
  }

  it("binds all twelve attempt sequences without raw audio or authority", () => {
    const input = fixture();
    const submission = materializeLearningV2ActivityReleasedSessionSubmissionV2(
      {
        runtime: runtime as never,
        ...input,
      },
    );
    expect(
      parseLearningV2ActivityReleasedSessionSubmissionV2(submission),
    ).toEqual(submission);
    expect(submission).toMatchObject({
      answerTransport: "bounded_post_session_batch_only",
      rawAudioPayload: "forbidden",
      transcriptClaimAuthority: "untrusted_client_text_claim_only",
      answerSequenceAuthority: "untrusted_client_sequence_only",
      performanceAuthority: "none_server_evaluation_required",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      completionAuthority: "none_server_evaluation_required",
      releaseAuthority: false,
    });
    expect(submission.taskAnswers[0]?.attempts).toEqual([
      { attemptOrdinal: 1, kind: "text", value: "wrong" },
      { attemptOrdinal: 2, kind: "text", value: "right" },
    ]);
    expect(submission.taskAnswers[10]?.attempts).toEqual([]);
    expect(submission.taskAnswers[11]?.attempts[0]).toMatchObject({
      kind: "transcript",
      value: "spoken transcript",
    });
    expect(JSON.stringify(submission)).not.toMatch(
      /audioUri|audioBlob|recordingUri|confidence|deviceId|userId/u,
    );
  });

  it("rejects missing attempts, kind drift, oversize text and authority escalation", () => {
    const input = fixture();
    expect(() =>
      materializeLearningV2ActivityReleasedSessionSubmissionV2({
        runtime: runtime as never,
        completion: input.completion,
        taskAnswers: input.taskAnswers.map((task, index) =>
          index === 0 ? { ...task, attempts: task.attempts.slice(0, 1) } : task,
        ),
      }),
    ).toThrow("learning_v2_activity_released_session_submission_invalid");
    expect(() =>
      materializeLearningV2ActivityReleasedSessionSubmissionV2({
        runtime: runtime as never,
        completion: input.completion,
        taskAnswers: input.taskAnswers.map((task, index) =>
          index === 11
            ? {
                ...task,
                attempts: [{ kind: "text" as const, value: "spoken" }],
              }
            : task,
        ),
      }),
    ).toThrow("learning_v2_activity_released_session_submission_invalid");
    expect(() =>
      materializeLearningV2ActivityReleasedSessionSubmissionV2({
        runtime: runtime as never,
        completion: input.completion,
        taskAnswers: input.taskAnswers.map((task, index) =>
          index === 1
            ? {
                ...task,
                attempts: [{ kind: "text" as const, value: "x".repeat(1025) }],
              }
            : task,
        ),
      }),
    ).toThrow("learning_v2_activity_released_session_submission_invalid");
    const valid = materializeLearningV2ActivityReleasedSessionSubmissionV2({
      runtime: runtime as never,
      ...input,
    });
    const escalated = JSON.parse(JSON.stringify(valid));
    escalated.walletAuthority = "award";
    expect(() =>
      parseLearningV2ActivityReleasedSessionSubmissionV2(escalated),
    ).toThrow("learning_v2_activity_released_session_submission_invalid");
  });

  it("server-rebinds only account identity and recomputes both fingerprints", () => {
    const input = fixture();
    const submission = materializeLearningV2ActivityReleasedSessionSubmissionV2(
      {
        runtime: runtime as never,
        ...input,
      },
    );
    const rebound = rebindLearningV2ActivityReleasedSessionSubmissionV2(
      submission,
      { accountScopeHash: h("f"), accountGeneration: 9 },
    );
    expect(rebound).toMatchObject({
      accountScopeHash: h("f"),
      accountGeneration: 9,
      taskAnswers: submission.taskAnswers,
      releaseId: submission.releaseId,
      packageFingerprint: submission.packageFingerprint,
      walletAuthority: "none",
      releaseAuthority: false,
    });
    expect(rebound.completionFingerprint).not.toBe(
      submission.completionFingerprint,
    );
    expect(rebound.submissionFingerprint).not.toBe(
      submission.submissionFingerprint,
    );
  });
});
