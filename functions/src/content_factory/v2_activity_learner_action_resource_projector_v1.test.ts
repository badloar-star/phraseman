import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";

let trustedArtifacts: object;
let expectedArtifacts: object;

jest.mock("./v2_activity_session_projection", () => ({
  buildV2ActivitySessionProjection: (value: unknown) => {
    if (value !== source) throw new Error("untrusted");
    return expectedArtifacts;
  },
  isV2ActivitySessionProjectionArtifacts: (value: unknown) =>
    value === trustedArtifacts,
}));

// Jest hoists the projection mocks above these imports.
// eslint-disable-next-line import/first
import { projectV2ActivityLearnerActionResourceV1 } from "./v2_activity_learner_action_resource_projector_v1";
// eslint-disable-next-line import/first
import {
  LEARNING_V2_ACTIVITY_LEARNER_ACTION_RESOURCE_MAX_BYTES_V1,
  encodeLearningV2ActivityLearnerActionResourceV1,
  getLearningV2ActivityLearnerActionEntryV1,
  isLearningV2ActivityLearnerActionResourceV1,
  parseLearningV2ActivityLearnerActionResourceV1,
} from "../../../modules/learning-v2/runtime/activity_learner_action_resource_v1";

let source: Record<string, unknown>;

const families = [
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
] as const;

function fixture() {
  const sourceTasks = Array.from({ length: 12 }, (_, index) => {
    const slot = index + 1;
    const taskId = `task-${slot}`;
    const learner = Object.freeze({
      promptId: `prompt-${slot}`,
      prompt: `Visible prompt ${slot}`,
      responseOptions: Object.freeze([
        Object.freeze({ responseId: `response-${slot}-a`, text: "Option A" }),
        Object.freeze({ responseId: `response-${slot}-b`, text: "Option B" }),
      ]),
      mediaIds: Object.freeze([]),
      audioTargetIds: Object.freeze([]),
      accessibilityLabel: `Task ${slot} of 12`,
    });
    return Object.freeze({
      taskId,
      activityId: `activity-${slot}`,
      slot,
      family: families[index % families.length],
      learner,
    });
  });
  source = Object.freeze({
    episodeId: "episode-1",
    targetLanguage: "en",
    session: Object.freeze({
      sessionId: "episode-1:session:01",
      ordinal: 1,
      tasks: Object.freeze(sourceTasks),
    }),
  });
  const sourceFingerprint = hashCanonicalBody(source);
  const renderTasks = sourceTasks.map((task) =>
    Object.freeze({
      taskId: task.taskId,
      slot: task.slot,
      family: task.family,
      learner: task.learner,
    }),
  );
  trustedArtifacts = Object.freeze({
    renderSeed: Object.freeze({
      episodeId: "episode-1",
      targetLanguage: "en",
      sourceFingerprint,
      session: Object.freeze({
        sessionId: "episode-1:session:01",
        ordinal: 1,
        tasks: Object.freeze(renderTasks),
      }),
    }),
  });
  expectedArtifacts = trustedArtifacts;
}

function project(saveTaskIds = ["task-1", "task-2", "task-11"]) {
  fixture();
  return projectV2ActivityLearnerActionResourceV1({
    source: source as never,
    artifacts: trustedArtifacts as never,
    learnerVisiblePromptSaveTaskIds: saveTaskIds,
  });
}

describe("Learning V2 learner action resource projector", () => {
  it("projects 12 exact report contexts and only learner-visible save text", () => {
    const resource = project();
    const raw = encodeLearningV2ActivityLearnerActionResourceV1(resource);
    const rehydrated = parseLearningV2ActivityLearnerActionResourceV1(raw);

    expect(rehydrated).toMatchObject({
      episodeId: "episode-1",
      sessionOrdinal: 1,
      entryCount: 12,
      reportContextBinding: "learner_visible_render_claim",
      reportContextAuthority: "none_release_binding_required",
      savablePhraseBinding: "visible_prompt_or_post_terminal_ref_claim",
      savablePhraseAuthority: "none_release_binding_required",
      answerKeyAuthority: "none_structural_allowlist_semantic_qa_required",
      runtimeAuthority: "none_release_binding_required",
      releaseAuthority: false,
    });
    expect(rehydrated.entries).toHaveLength(12);
    expect(rehydrated.entries[0]).toMatchObject({
      taskId: "task-1",
      activityId: "activity-1",
      report: {
        screen: "learning_v2_activity",
        dataId: "task-1",
        prompt: "Visible prompt 1",
      },
      save: {
        resolution: "learner_visible_prompt",
        targetText: "Visible prompt 1",
        meaningResolution: "server_post_terminal_release_resource",
      },
      voiceAvailable: true,
    });
    expect(rehydrated.entries[8].save).toEqual(
      expect.objectContaining({
        resolution: "server_post_terminal",
        targetText: null,
        sourceTextFingerprint: null,
      }),
    );
    expect(rehydrated.entries[9].save.resolution).toBe("server_post_terminal");
    expect(rehydrated.entries[11].save.resolution).toBe("server_post_terminal");
    expect(raw).not.toMatch(
      /correctResponse|acceptedResponses|acceptedCommitments|evaluator|salt|meaningByLocale|translation|serverSidecar/,
    );
    expect(
      getLearningV2ActivityLearnerActionEntryV1(
        rehydrated,
        "task-1",
        "activity-1",
      ).report.responseOptions,
    ).toHaveLength(2);
    expect(isLearningV2ActivityLearnerActionResourceV1({ ...rehydrated })).toBe(
      false,
    );
  });

  it("rejects answer-revealing save data in assessment slots and unknown task refs", () => {
    expect(() => project(["task-10"])).toThrow(
      "learning_v2_activity_action_assessment_save_leak",
    );
    expect(() => project(["missing-task"])).toThrow(
      "v2_activity_learner_action_resource_projector_invalid",
    );
  });

  it("rejects forged artifacts, surface drift and coordinated learner-byte tampering", () => {
    project();
    expect(() =>
      projectV2ActivityLearnerActionResourceV1({
        source: source as never,
        artifacts: { ...trustedArtifacts } as never,
        learnerVisiblePromptSaveTaskIds: [],
      }),
    ).toThrow("v2_activity_learner_action_resource_projector_invalid");

    const resource = project();
    const parsed = JSON.parse(
      encodeLearningV2ActivityLearnerActionResourceV1(resource),
    );
    parsed.entries[0].report.prompt = "Leaked answer";
    expect(() =>
      parseLearningV2ActivityLearnerActionResourceV1(canonicalJsonV1(parsed)),
    ).toThrow("learning_v2_activity_action_report_fingerprint_invalid");

    const visibleSave = JSON.parse(
      encodeLearningV2ActivityLearnerActionResourceV1(resource),
    );
    visibleSave.entries[0].save.targetText = "Hidden correct answer";
    expect(() =>
      parseLearningV2ActivityLearnerActionResourceV1(
        canonicalJsonV1(visibleSave),
      ),
    ).toThrow("learning_v2_activity_action_save_not_visible");
  });

  it("bounds raw bytes and hostile depth before canonical traversal", () => {
    expect(() =>
      parseLearningV2ActivityLearnerActionResourceV1(
        "x".repeat(
          LEARNING_V2_ACTIVITY_LEARNER_ACTION_RESOURCE_MAX_BYTES_V1 + 1,
        ),
      ),
    ).toThrow("learning_v2_activity_action_raw_invalid");

    const parsed = JSON.parse(
      encodeLearningV2ActivityLearnerActionResourceV1(project()),
    );
    let deep: Record<string, unknown> = {};
    for (let index = 0; index < 20; index += 1) deep = { child: deep };
    parsed.hostile = deep;
    expect(() =>
      parseLearningV2ActivityLearnerActionResourceV1(canonicalJsonV1(parsed)),
    ).toThrow("learning_v2_activity_action_complexity_invalid");
  });
});
