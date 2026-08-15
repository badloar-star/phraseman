import {
  encodeLearningV2ActivityReleasedSessionCompletionV1,
  materializeLearningV2ActivityReleasedSessionCompletionV1,
  parseLearningV2ActivityReleasedSessionCompletionV1,
  rebindLearningV2ActivityReleasedSessionCompletionV1,
} from "../modules/learning-v2/progress/activity_released_session_completion_v1";
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
      learnerAttempts: index === 10 ? 0 : index + 1,
      hintUsed: index === 3,
    }),
  ),
);

describe("Learning V2 released Activity session completion", () => {
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
          family: slot % 2 === 0 ? "listen_choose" : "phrase_builder",
          purpose: slot === 11 ? "interleaved_review" : "guided_practice",
        }) as never,
    );
  });

  test("binds exact released tasks without answers or economic authority", () => {
    const completion = materializeLearningV2ActivityReleasedSessionCompletionV1(
      {
        scope,
        runtime: runtime as never,
        localSessionId: "lesson-1-understand-1",
        sessionRunId: "run-1",
        taskResults,
      },
    );
    expect(
      parseLearningV2ActivityReleasedSessionCompletionV1(completion),
    ).toEqual(completion);
    expect(completion).toMatchObject({
      activeManifestHash: h("b"),
      activityPackageFingerprint: h("c"),
      packageFingerprint: h("d"),
      answerPayload: "absent",
      completionAuthority: "completed_session_summary_for_background_storage",
      walletAuthority: "none",
      releaseAuthority: false,
    });
    expect(completion.taskCompletions[10]).toMatchObject({
      slot: 11,
      taskId: "task-11",
      disposition: "skipped",
      localResultClaim: "skipped_without_evidence",
    });
    expect(
      encodeLearningV2ActivityReleasedSessionCompletionV1(completion),
    ).not.toMatch(/response|transcript|correctResponse|acceptedResponses/u);
  });

  test("rejects task swaps, release drift, authority escalation and clone handles", () => {
    const input = {
      scope,
      runtime: runtime as never,
      localSessionId: "lesson-1-understand-1",
      sessionRunId: "run-1",
      taskResults,
    };
    const completion =
      materializeLearningV2ActivityReleasedSessionCompletionV1(input);
    expect(() =>
      materializeLearningV2ActivityReleasedSessionCompletionV1({
        ...input,
        taskResults: [
          { ...taskResults[0], taskId: "unknown-task" },
          ...taskResults.slice(1),
        ],
      }),
    ).toThrow("learning_v2_activity_released_session_completion_invalid");

    const escalated = JSON.parse(JSON.stringify(completion));
    escalated.walletAuthority = "award";
    expect(() =>
      parseLearningV2ActivityReleasedSessionCompletionV1(escalated),
    ).toThrow("learning_v2_activity_released_session_completion_invalid");

    jest
      .mocked(isLearningV2ActivityReleasedSessionRuntimeHandleV1)
      .mockReturnValue(false);
    expect(() =>
      materializeLearningV2ActivityReleasedSessionCompletionV1(input),
    ).toThrow("learning_v2_activity_released_session_completion_invalid");
  });

  test("rebinds only account identity and keeps every authority at none", () => {
    const completion = materializeLearningV2ActivityReleasedSessionCompletionV1(
      {
        scope,
        runtime: runtime as never,
        localSessionId: "lesson-1-understand-1",
        sessionRunId: "run-1",
        taskResults,
      },
    );
    const rebound = rebindLearningV2ActivityReleasedSessionCompletionV1(
      completion,
      { accountScopeHash: h("f"), accountGeneration: 8 },
    );
    expect(rebound).toMatchObject({
      accountScopeHash: h("f"),
      accountGeneration: 8,
      packageFingerprint: completion.packageFingerprint,
      taskCompletions: completion.taskCompletions,
      completionAuthority: "completed_session_summary_for_background_storage",
      walletAuthority: "none",
      masteryAuthority: "none",
      evidenceAuthority: "none",
      releaseAuthority: false,
    });
    expect(rebound.completionFingerprint).not.toBe(
      completion.completionFingerprint,
    );
    expect(() =>
      rebindLearningV2ActivityReleasedSessionCompletionV1(completion, {
        accountScopeHash: h("f"),
        accountGeneration: 0,
      }),
    ).toThrow("learning_v2_activity_released_session_completion_invalid");
  });
});
