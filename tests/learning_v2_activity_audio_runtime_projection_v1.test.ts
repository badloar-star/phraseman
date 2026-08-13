import {
  bindLearningV2ActivityAttemptAudioV1,
  encodeLearningV2ActivityAudioRuntimeProjectionV1,
  getLearningV2ActivitySelectableAudioBindingsV1,
  isLearningV2ActivityAudioRuntimeProjectionV1,
  materializeLearningV2ActivityAudioRuntimeProjectionV1,
  parseLearningV2ActivityAudioRuntimeProjectionV1,
  selectLearningV2ActivityTaskAudioV1,
  type LearningV2ActivityAudioRuntimeEntryV1,
} from "../modules/learning-v2/runtime/activity_audio_runtime_projection_v1";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);

function entries(): readonly LearningV2ActivityAudioRuntimeEntryV1[] {
  return Object.freeze(
    ["ash", "onyx", "nova", "coral"].flatMap((voiceId) =>
      [
        {
          inputKind: "full_utterance" as const,
          wordId: null,
          wordOrdinal: null,
        },
        { inputKind: "word" as const, wordId: h("word-1"), wordOrdinal: 1 },
        { inputKind: "word" as const, wordId: h("word-2"), wordOrdinal: 2 },
      ].map((coordinate) => {
        const contentHash = h([voiceId, coordinate]);
        const body = {
          generationTargetFingerprint: h(["generation", voiceId, coordinate]),
          itemFingerprint: h(["item", voiceId, coordinate]),
          taskId: "task-1",
          taskVoiceGroupFingerprint: h("task-group"),
          audioTargetId: h("audio-target"),
          ...coordinate,
          voiceId: voiceId as "ash" | "onyx" | "nova" | "coral",
          objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h("target")}/${contentHash}.mp3`,
          contentHash,
          objectGeneration: "7",
          byteSize: 1_234,
          contentType: "audio/mpeg" as const,
          codecRulesFingerprint: h("codec-rules"),
          codecResultFingerprint: h(["codec-result", voiceId, coordinate]),
        };
        return Object.freeze({
          ...body,
          entryFingerprint: h(body),
        });
      }),
    ),
  );
}

function projection() {
  const bindingBody = {
    taskId: "task-1",
    taskVoiceGroupFingerprint: h("task-group"),
    selectableId: "chip-one",
    audioTargetId: h("audio-target"),
    wordId: h("word-1"),
    wordOrdinal: 1,
  };
  return materializeLearningV2ActivityAudioRuntimeProjectionV1({
    episodeId: "episode-1",
    sessionId: "session-1",
    sessionOrdinal: 1,
    voiceAudioManifestFingerprint: h("manifest"),
    sourceSessionManifestFingerprint: h("session-manifest"),
    activityAudioCatalogFingerprint: h("audio-catalog"),
    voiceTargetsPackageFingerprint: h("voice-targets-package"),
    entries: entries(),
    selectableBindings: [
      { ...bindingBody, bindingFingerprint: h(bindingBody) },
    ],
  });
}

describe("Learning V2 activity audio runtime projection", () => {
  it("rehydrates exact four-voice full-utterance and per-word coordinates", () => {
    const value = projection();
    const parsed = parseLearningV2ActivityAudioRuntimeProjectionV1(
      encodeLearningV2ActivityAudioRuntimeProjectionV1(value),
    );
    expect(isLearningV2ActivityAudioRuntimeProjectionV1(parsed)).toBe(true);
    expect(parsed).toMatchObject({
      entryCount: 12,
      voiceCoverage: "exact_ash_onyx_nova_coral_per_audio_coordinate",
      taskVoiceSelectionScope: "once_per_task_attempt",
      runtimeAuthority: "none_release_binding_required",
      releaseAuthority: false,
    });
    const nova = selectLearningV2ActivityTaskAudioV1({
      projection: parsed,
      taskId: "task-1",
      voiceId: "nova",
    });
    expect(nova).toHaveLength(3);
    expect(new Set(nova.map((entry) => entry.voiceId))).toEqual(
      new Set(["nova"]),
    );
    expect(nova.filter((entry) => entry.inputKind === "word")).toHaveLength(2);
    expect(
      getLearningV2ActivitySelectableAudioBindingsV1(parsed, "task-1"),
    ).toMatchObject([{ selectableId: "chip-one", wordOrdinal: 1 }]);
    const attemptAudio = bindLearningV2ActivityAttemptAudioV1({
      projection: parsed,
      taskId: "task-1",
      voiceSelectionIndex: 2,
      fullPhraseAudioTargetId: h("audio-target"),
    });
    expect(attemptAudio).toMatchObject({
      voiceId: "nova",
      fullPhraseAudioTargetId: h("audio-target"),
      selectableAudioTargets: {
        "chip-one": { audioTargetId: h("audio-target"), wordId: h("word-1") },
      },
      runtimeAuthority: "none_release_binding_required",
    });
  });

  it("rejects a missing voice and unbound stored-entry drift", () => {
    expect(() =>
      materializeLearningV2ActivityAudioRuntimeProjectionV1({
        episodeId: "episode-1",
        sessionId: "session-1",
        sessionOrdinal: 1,
        voiceAudioManifestFingerprint: h("manifest"),
        sourceSessionManifestFingerprint: h("session-manifest"),
        activityAudioCatalogFingerprint: h("audio-catalog"),
        voiceTargetsPackageFingerprint: h("voice-targets-package"),
        entries: entries().filter((entry) => entry.voiceId !== "coral"),
        selectableBindings: projection().selectableBindings,
      }),
    ).toThrow("learning_v2_activity_audio_runtime_projection_invalid");

    const raw = JSON.parse(
      encodeLearningV2ActivityAudioRuntimeProjectionV1(projection()),
    );
    raw.entries[0].byteSize += 1;
    expect(() =>
      parseLearningV2ActivityAudioRuntimeProjectionV1(JSON.stringify(raw)),
    ).toThrow("learning_v2_activity_audio_runtime_projection_invalid");
  });

  it("rejects cloned handles and a word/full-utterance shape mismatch", () => {
    const value = projection();
    expect(isLearningV2ActivityAudioRuntimeProjectionV1({ ...value })).toBe(
      false,
    );
    const changed = entries().map((entry, index) =>
      index === 0
        ? ({ ...entry, inputKind: "word", wordId: null } as never)
        : entry,
    );
    expect(() =>
      materializeLearningV2ActivityAudioRuntimeProjectionV1({
        episodeId: "episode-1",
        sessionId: "session-1",
        sessionOrdinal: 1,
        voiceAudioManifestFingerprint: h("manifest"),
        sourceSessionManifestFingerprint: h("session-manifest"),
        activityAudioCatalogFingerprint: h("audio-catalog"),
        voiceTargetsPackageFingerprint: h("voice-targets-package"),
        entries: changed,
        selectableBindings: projection().selectableBindings,
      }),
    ).toThrow("learning_v2_activity_audio_runtime_projection_invalid");
  });

  it("rejects a word gap even when every remaining coordinate has four voices", () => {
    const withoutFirstWord = entries().filter(
      (entry) => entry.wordOrdinal !== 1,
    );
    expect(() =>
      materializeLearningV2ActivityAudioRuntimeProjectionV1({
        episodeId: "episode-1",
        sessionId: "session-1",
        sessionOrdinal: 1,
        voiceAudioManifestFingerprint: h("manifest"),
        sourceSessionManifestFingerprint: h("session-manifest"),
        activityAudioCatalogFingerprint: h("audio-catalog"),
        voiceTargetsPackageFingerprint: h("voice-targets-package"),
        entries: withoutFirstWord,
        selectableBindings: projection().selectableBindings,
      }),
    ).toThrow("learning_v2_activity_audio_runtime_projection_invalid");
  });

  it("rejects prototype-reserved selectable identifiers", () => {
    const current = projection();
    const bindingBody = {
      ...current.selectableBindings[0],
      selectableId: "__proto__",
    };
    const { bindingFingerprint: _ignored, ...body } = bindingBody;
    expect(() =>
      materializeLearningV2ActivityAudioRuntimeProjectionV1({
        episodeId: current.episodeId,
        sessionId: current.sessionId,
        sessionOrdinal: current.sessionOrdinal,
        voiceAudioManifestFingerprint: current.voiceAudioManifestFingerprint,
        sourceSessionManifestFingerprint:
          current.sourceSessionManifestFingerprint,
        activityAudioCatalogFingerprint:
          current.activityAudioCatalogFingerprint,
        voiceTargetsPackageFingerprint: current.voiceTargetsPackageFingerprint,
        entries: current.entries,
        selectableBindings: [{ ...body, bindingFingerprint: h(body) } as never],
      }),
    ).toThrow("learning_v2_activity_audio_runtime_projection_invalid");
  });
});
