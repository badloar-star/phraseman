import {
  materializeLearningV2ActivityLearnerActionResourceV1,
  type LearningV2ActivityLearnerActionEntryV1,
  type LearningV2ActivityLearnerActionResourceV1,
} from "../../../modules/learning-v2/runtime/activity_learner_action_resource_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  buildV2ActivitySessionProjection,
  isV2ActivitySessionProjectionArtifacts,
  type V2ActivitySessionProjectionArtifacts,
  type V2ActivitySessionProjectionSource,
} from "./v2_activity_session_projection";

export const V2_ACTIVITY_LEARNER_ACTION_RESOURCE_PROJECTOR_SCHEMA_V1 =
  "v2-activity-learner-action-resource-projector.v1" as const;

function fail(): never {
  throw new Error("v2_activity_learner_action_resource_projector_invalid");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

export function projectV2ActivityLearnerActionResourceV1(
  input: Readonly<{
    source: V2ActivitySessionProjectionSource;
    artifacts: V2ActivitySessionProjectionArtifacts;
    learnerVisiblePromptSaveTaskIds: readonly string[];
  }>,
): LearningV2ActivityLearnerActionResourceV1 {
  if (
    !isPlainObject(input) ||
    Object.keys(input).sort().join("|") !==
      "artifacts|learnerVisiblePromptSaveTaskIds|source" ||
    !isV2ActivitySessionProjectionArtifacts(input.artifacts) ||
    !Array.isArray(input.learnerVisiblePromptSaveTaskIds) ||
    input.learnerVisiblePromptSaveTaskIds.length > 12
  )
    fail();

  const expected = buildV2ActivitySessionProjection(input.source);
  if (
    canonicalJsonV1(expected.renderSeed) !==
    canonicalJsonV1(input.artifacts.renderSeed)
  )
    fail();
  const render = input.artifacts.renderSeed;
  if (
    render.episodeId !== input.source.episodeId ||
    render.sourceFingerprint !== hashCanonicalBody(input.source) ||
    render.session.sessionId !== input.source.session.sessionId ||
    render.session.ordinal !== input.source.session.ordinal ||
    render.session.tasks.length !== 12 ||
    input.source.session.tasks.length !== 12
  )
    fail();

  const visiblePromptSaveTaskIds = new Set<string>();
  for (const taskId of input.learnerVisiblePromptSaveTaskIds) {
    if (typeof taskId !== "string" || visiblePromptSaveTaskIds.has(taskId))
      fail();
    visiblePromptSaveTaskIds.add(taskId);
  }

  const entries: LearningV2ActivityLearnerActionEntryV1[] =
    render.session.tasks.map((renderTask, index) => {
      const sourceTask = input.source.session.tasks[index];
      if (
        !sourceTask ||
        sourceTask.taskId !== renderTask.taskId ||
        sourceTask.slot !== renderTask.slot ||
        sourceTask.family !== renderTask.family ||
        sourceTask.learner.promptId !== renderTask.learner.promptId ||
        canonicalJsonV1(sourceTask.learner) !==
          canonicalJsonV1(renderTask.learner)
      )
        fail();
      const responseOptions = Object.freeze(
        renderTask.learner.responseOptions.map((option) =>
          Object.freeze({
            responseId: option.responseId,
            text: option.text,
          }),
        ),
      );
      const learnerSurfaceFingerprint = hashCanonicalBody({
        promptId: renderTask.learner.promptId,
        prompt: renderTask.learner.prompt,
        responseOptions,
        accessibilityLabel: renderTask.learner.accessibilityLabel,
      });
      const reportBody = {
        taskId: sourceTask.taskId,
        activityId: sourceTask.activityId,
        promptId: renderTask.learner.promptId,
        sessionOrdinal: render.session.ordinal,
        screen: "learning_v2_activity" as const,
        dataId: sourceTask.taskId,
        prompt: renderTask.learner.prompt,
        responseOptions,
        accessibilityLabel: renderTask.learner.accessibilityLabel,
        learnerSurfaceFingerprint,
      };
      const report = Object.freeze({
        reportContextRef: hashCanonicalBody(reportBody),
        screen: "learning_v2_activity" as const,
        dataId: sourceTask.taskId,
        prompt: renderTask.learner.prompt,
        responseOptions,
        accessibilityLabel: renderTask.learner.accessibilityLabel,
        learnerSurfaceFingerprint,
      });
      const save = visiblePromptSaveTaskIds.has(sourceTask.taskId)
        ? (() => {
            const targetText = renderTask.learner.prompt;
            const sourceTextFingerprint = hashCanonicalBody({ targetText });
            const saveBody = {
              taskId: sourceTask.taskId,
              activityId: sourceTask.activityId,
              promptId: renderTask.learner.promptId,
              resolution: "learner_visible_prompt" as const,
              targetText,
              meaningResolution:
                "server_post_terminal_release_resource" as const,
              sourceTextFingerprint,
            };
            return Object.freeze({
              savablePhraseRef: hashCanonicalBody(saveBody),
              resolution: "learner_visible_prompt" as const,
              targetText,
              meaningResolution:
                "server_post_terminal_release_resource" as const,
              sourceTextFingerprint,
            });
          })()
        : (() => {
            const saveBody = {
              taskId: sourceTask.taskId,
              activityId: sourceTask.activityId,
              promptId: renderTask.learner.promptId,
              resolution: "server_post_terminal" as const,
            };
            return Object.freeze({
              savablePhraseRef: hashCanonicalBody(saveBody),
              resolution: "server_post_terminal" as const,
              targetText: null,
              meaningResolution:
                "server_post_terminal_release_resource" as const,
              sourceTextFingerprint: null,
            });
          })();
      const entryBody = {
        taskId: sourceTask.taskId,
        activityId: sourceTask.activityId,
        promptId: renderTask.learner.promptId,
        slot: renderTask.slot,
        family: renderTask.family,
        report,
        save,
        voiceAvailable: true,
      };
      return Object.freeze({
        ...entryBody,
        entryFingerprint: hashCanonicalBody(entryBody),
      });
    });
  if (visiblePromptSaveTaskIds.size > 0) {
    const known = new Set(entries.map((entry) => entry.taskId));
    if ([...visiblePromptSaveTaskIds].some((taskId) => !known.has(taskId)))
      fail();
  }

  return materializeLearningV2ActivityLearnerActionResourceV1({
    episodeId: render.episodeId,
    targetLanguage: render.targetLanguage,
    sessionId: render.session.sessionId,
    sessionOrdinal: render.session.ordinal,
    sourceFingerprint: render.sourceFingerprint,
    renderFingerprint: hashCanonicalBody(render),
    entries,
  });
}
