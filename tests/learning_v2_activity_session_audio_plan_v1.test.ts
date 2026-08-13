import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

let trustedDescriptor: object;

jest.mock(
  "../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1",
  () => ({
    isLearningV2ActivityAuxiliaryClientDescriptorV1: (value: unknown) =>
      value === trustedDescriptor,
  }),
);

// The descriptor predicate is intentionally private and hoisted above imports.
// eslint-disable-next-line import/first
import {
  getLearningV2ActivitySessionAudioPlanEntriesV1,
  getLearningV2ActivitySessionAudioPlanSummaryV1,
  getLearningV2ActivitySessionAudioTaskPlanV1,
  isLearningV2ActivitySessionAudioPlanHandleV1,
  materializeLearningV2ActivitySessionAudioPlanV1,
  resolveLearningV2ActivitySessionAudioEntryV1,
} from "../modules/learning-v2/runtime/activity_session_audio_plan_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const voices = ["ash", "onyx", "nova", "coral"] as const;

function descriptor() {
  const actions = Array.from({ length: 12 }, (_, index) => ({
    taskId: `task-${index + 1}`,
  }));
  const entries = actions.flatMap((action, taskIndex) =>
    voices.flatMap((voiceId) => {
      const audioTargetId = h(["target", action.taskId]);
      const wordId = h(["word", action.taskId]);
      return [
        {
          inputKind: "full_utterance" as const,
          wordId: null,
          wordOrdinal: null,
        },
        { inputKind: "word" as const, wordId, wordOrdinal: 1 },
      ].map((coordinate) => {
        const contentHash = h(["bytes", action.taskId, voiceId, coordinate]);
        return Object.freeze({
          generationTargetFingerprint: h([
            "generation",
            action.taskId,
            voiceId,
            coordinate,
          ]),
          itemFingerprint: h(["item", action.taskId, voiceId, coordinate]),
          taskId: action.taskId,
          taskVoiceGroupFingerprint: h(["group", action.taskId]),
          audioTargetId,
          ...coordinate,
          voiceId,
          objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h(["target", taskIndex])}/${contentHash}.mp3`,
          contentHash,
          objectGeneration: "7",
          byteSize: 2_048,
          contentType: "audio/mpeg" as const,
          codecRulesFingerprint: h("codec"),
          codecResultFingerprint: h([
            "codec-result",
            action.taskId,
            voiceId,
            coordinate,
          ]),
          entryFingerprint: h(["entry", action.taskId, voiceId, coordinate]),
        });
      });
    }),
  );
  const selectableBindings = actions.map((action) => {
    const body = {
      taskId: action.taskId,
      taskVoiceGroupFingerprint: h(["group", action.taskId]),
      selectableId: `response-${action.taskId}`,
      audioTargetId: h(["target", action.taskId]),
      wordId: h(["word", action.taskId]),
      wordOrdinal: 1,
    };
    return Object.freeze({ ...body, bindingFingerprint: h(body) });
  });
  trustedDescriptor = Object.freeze({
    descriptorFingerprint: h("descriptor"),
    sessionId: "session-1",
    sessionOrdinal: 1,
    actionResource: Object.freeze({ entries: Object.freeze(actions) }),
    audioRuntime: Object.freeze({
      entries: Object.freeze(entries),
      selectableBindings: Object.freeze(selectableBindings),
    }),
  });
  return trustedDescriptor as never;
}

describe("Learning V2 activity session audio plan", () => {
  test("selects a balanced shuffled voice once per task and keeps phrase and words together", () => {
    const handle = materializeLearningV2ActivitySessionAudioPlanV1({
      descriptor: descriptor(),
      selectionSeed: h("account-session-run"),
    });
    expect(isLearningV2ActivitySessionAudioPlanHandleV1(handle)).toBe(true);
    expect(
      getLearningV2ActivitySessionAudioPlanSummaryV1(handle),
    ).toMatchObject({
      taskPlanCount: 12,
      selectedEntryCount: 24,
      voiceSelectionPolicy: "local_shuffled_round_robin",
      taskVoiceScope: "one_voice_per_task_for_phrase_and_words",
      transportDependency: "none_after_local_file_preload",
      releaseAuthority: false,
    });
    const taskPlans = Array.from({ length: 12 }, (_, index) =>
      getLearningV2ActivitySessionAudioTaskPlanV1(handle, `task-${index + 1}`),
    );
    expect(new Set(taskPlans.slice(0, 4).map((task) => task?.voiceId))).toEqual(
      new Set(voices),
    );
    expect(new Set(taskPlans.slice(4, 8).map((task) => task?.voiceId))).toEqual(
      new Set(voices),
    );
    expect(taskPlans[3]?.voiceId).not.toBe(taskPlans[4]?.voiceId);
    for (const task of taskPlans) {
      expect(task).not.toBeNull();
      const taskEntries = task!.entryFingerprints.map((fingerprint) =>
        resolveLearningV2ActivitySessionAudioEntryV1(handle, fingerprint),
      );
      expect(new Set(taskEntries.map((entry) => entry.voiceId))).toEqual(
        new Set([task!.voiceId]),
      );
      expect(taskEntries.some((entry) => entry.inputKind === "word")).toBe(
        true,
      );
      expect(
        taskEntries.some((entry) => entry.inputKind === "full_utterance"),
      ).toBe(true);
    }
    expect(getLearningV2ActivitySessionAudioPlanEntriesV1(handle)).toHaveLength(
      24,
    );
  });

  test("is deterministic for the exact seed and rejects copied handles or another seed", () => {
    const exactDescriptor = descriptor();
    const first = materializeLearningV2ActivitySessionAudioPlanV1({
      descriptor: exactDescriptor,
      selectionSeed: h("seed-one"),
    });
    const second = materializeLearningV2ActivitySessionAudioPlanV1({
      descriptor: exactDescriptor,
      selectionSeed: h("seed-one"),
    });
    const changed = materializeLearningV2ActivitySessionAudioPlanV1({
      descriptor: exactDescriptor,
      selectionSeed: h("seed-two"),
    });
    expect(
      getLearningV2ActivitySessionAudioPlanSummaryV1(first).planFingerprint,
    ).toBe(
      getLearningV2ActivitySessionAudioPlanSummaryV1(second).planFingerprint,
    );
    expect(
      getLearningV2ActivitySessionAudioPlanSummaryV1(changed).planFingerprint,
    ).not.toBe(
      getLearningV2ActivitySessionAudioPlanSummaryV1(first).planFingerprint,
    );
    expect(isLearningV2ActivitySessionAudioPlanHandleV1({ ...first })).toBe(
      false,
    );
    expect(() =>
      getLearningV2ActivitySessionAudioPlanSummaryV1({ ...first } as never),
    ).toThrow("learning_v2_activity_session_audio_plan_invalid");
  });
});
