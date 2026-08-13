import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../modules/learning-v2/policies/decision_registry";
import {
  materializeLearningV2ActivityLearnerActionResourceV1,
  type LearningV2ActivityLearnerActionEntryV1,
} from "../modules/learning-v2/runtime/activity_learner_action_resource_v1";
import { materializeLearningV2ActivityPostTerminalCardCatalogV1 } from "../modules/learning-v2/runtime/activity_post_terminal_card_catalog_v1";
import { materializeLearningV2ActivityPostTerminalCardCapsuleV1 } from "../modules/learning-v2/runtime/activity_post_terminal_card_capsule_v1";
import { materializeLearningV2ActivityAudioRuntimeProjectionV1 } from "../modules/learning-v2/runtime/activity_audio_runtime_projection_v1";
import { materializeLearningV2ActivityAuxiliaryClientDescriptorV1 } from "../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1";
import { createLearningV2ActivityAuxiliarySessionRuntimeV1 } from "../modules/learning-v2/runtime/activity_auxiliary_session_runtime_v1";
import {
  createLearningV2ActivityActionSessionV1,
  isLearningV2ActivityActionSessionV1,
} from "../modules/learning-v2/runtime/activity_action_session_v1";

const h = (value: unknown) => hashCanonicalBody(value);

function runtimeFixture() {
  const entries: LearningV2ActivityLearnerActionEntryV1[] = Array.from(
    { length: 12 },
    (_, index) => {
      const slot = index + 1;
      const taskId = `task-${slot}`;
      const activityId = `activity-${slot}`;
      const promptId = `prompt-${slot}`;
      const prompt = `Prompt ${slot}`;
      const responseOptions = Object.freeze([
        Object.freeze({ responseId: `option-${slot}-a`, text: "A" }),
        Object.freeze({ responseId: `option-${slot}-b`, text: "B" }),
      ]);
      const learnerSurfaceFingerprint = h({
        promptId,
        prompt,
        responseOptions,
        accessibilityLabel: `Task ${slot}`,
      });
      const reportBody = {
        taskId,
        activityId,
        promptId,
        sessionOrdinal: 1,
        screen: "learning_v2_activity" as const,
        dataId: taskId,
        prompt,
        responseOptions,
        accessibilityLabel: `Task ${slot}`,
        learnerSurfaceFingerprint,
      };
      const report = Object.freeze({
        reportContextRef: h(reportBody),
        screen: "learning_v2_activity" as const,
        dataId: taskId,
        prompt,
        responseOptions,
        accessibilityLabel: `Task ${slot}`,
        learnerSurfaceFingerprint,
      });
      const serverOnly = slot === 9 || slot === 10 || slot === 12;
      const saveBody = serverOnly
        ? {
            taskId,
            activityId,
            promptId,
            resolution: "server_post_terminal" as const,
          }
        : {
            taskId,
            activityId,
            promptId,
            resolution: "learner_visible_prompt" as const,
            targetText: prompt,
            meaningResolution: "server_post_terminal_release_resource" as const,
            sourceTextFingerprint: h({ targetText: prompt }),
          };
      const save = serverOnly
        ? Object.freeze({
            savablePhraseRef: h(saveBody),
            resolution: "server_post_terminal" as const,
            targetText: null,
            meaningResolution: "server_post_terminal_release_resource" as const,
            sourceTextFingerprint: null,
          })
        : Object.freeze({
            savablePhraseRef: h(saveBody),
            resolution: "learner_visible_prompt" as const,
            targetText: prompt,
            meaningResolution: "server_post_terminal_release_resource" as const,
            sourceTextFingerprint: h({ targetText: prompt }),
          });
      const body = {
        taskId,
        activityId,
        promptId,
        slot,
        family: "phrase_builder" as const,
        report,
        save,
        voiceAvailable: true,
      };
      return Object.freeze({ ...body, entryFingerprint: h(body) });
    },
  );
  const action = materializeLearningV2ActivityLearnerActionResourceV1({
    episodeId: "episode-1",
    targetLanguage: "en",
    sessionId: "session-1",
    sessionOrdinal: 1,
    sourceFingerprint: h("source"),
    renderFingerprint: h("render"),
    entries,
  });
  const localized = (prefix: string) =>
    Object.freeze(
      Object.fromEntries(
        LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
          locale,
          `${prefix}-${locale}`,
        ]),
      ),
    ) as never;
  const catalog = materializeLearningV2ActivityPostTerminalCardCatalogV1({
    catalogId: "cards-1",
    packageId: "package-1",
    actionResource: action,
    declarations: action.entries.map((entry, index) => ({
      taskId: entry.taskId,
      targetText: `Prompt ${index + 1}`,
      meaningByLocale: localized(`Meaning ${index + 1}`),
      provenanceFingerprint: h(["card", index]),
    })),
  });
  const cards = materializeLearningV2ActivityPostTerminalCardCapsuleV1(
    catalog,
    action,
  );
  const audioEntries = (["ash", "onyx", "nova", "coral"] as const).flatMap(
    (voiceId) =>
      (
        [
          {
            inputKind: "full_utterance" as const,
            wordId: null,
            wordOrdinal: null,
          },
          {
            inputKind: "word" as const,
            wordId: h("word-1"),
            wordOrdinal: 1,
          },
        ] as const
      ).map((coordinate) => {
        const contentHash = h(["audio", voiceId, coordinate]);
        const body = {
        generationTargetFingerprint: h(["generation", voiceId, coordinate]),
          itemFingerprint: h(["item", voiceId, coordinate]),
          taskId: "task-1",
          taskVoiceGroupFingerprint: h("voice-group"),
          audioTargetId: h("audio-target"),
          ...coordinate,
          voiceId,
          objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h("target")}/${contentHash}.mp3`,
          contentHash,
          objectGeneration: "9",
          byteSize: 2_048,
          contentType: "audio/mpeg" as const,
          codecRulesFingerprint: h("codec-rules"),
          codecResultFingerprint: h(["codec-result", voiceId]),
        };
        return Object.freeze({ ...body, entryFingerprint: h(body) });
      }),
  );
  const audio = materializeLearningV2ActivityAudioRuntimeProjectionV1({
    episodeId: "episode-1",
    sessionId: "session-1",
    sessionOrdinal: 1,
    voiceAudioManifestFingerprint: h("voice-manifest"),
    sourceSessionManifestFingerprint: h("session-manifest"),
    activityAudioCatalogFingerprint: h("audio-catalog"),
    voiceTargetsPackageFingerprint: h("voice-package"),
    entries: audioEntries,
    selectableBindings: [],
  });
  const descriptor = materializeLearningV2ActivityAuxiliaryClientDescriptorV1({
    environment: "lab",
    studyTarget: "en",
    learnerSourceLocale: "ru",
    seasonId: "season-1",
    releaseId: "release-1",
    activeManifestHash: h("active-manifest"),
    episodeId: "episode-1",
    stageId: "stage-1",
    sessionId: "session-1",
    sessionOrdinal: 1,
    activityPackageFingerprint: h("package"),
    auxiliaryIndexFingerprint: h("index"),
    auxiliaryManifestFingerprint: h("aux-manifest"),
    sourceFingerprint: action.sourceFingerprint,
    renderFingerprint: action.renderFingerprint,
    actionResource: action,
    postTerminalCards: cards,
    audioRuntime: audio,
    errorSourceProjectionFingerprint: h("errors"),
    errorExplanations: action.entries.map((entry, index) => ({
      explanationRef: `explanation-${index + 1}`,
      taskId: entry.taskId,
      activityId: entry.activityId,
      textByLocale: localized(`Explanation ${index + 1}`),
    })),
  });
  return createLearningV2ActivityAuxiliarySessionRuntimeV1({
    descriptor,
    interfaceLocale: "uk",
  });
}

function harness(terminalState: "completed" | "not_terminal" = "completed") {
  const runtime = runtimeFixture();
  const task = runtime.resolveTaskBySlot(1);
  const calls: unknown[] = [];
  let resolveStart: ((value: "started") => void) | null = null;
  const session = createLearningV2ActivityActionSessionV1({
    runtime,
    task,
    terminalState,
    reducedMotion: false,
    ports: {
      openReport: async (input) => {
        calls.push({ kind: "report", input });
      },
      saveCard: async (input) => {
        calls.push({ kind: "save", input });
        return "added";
      },
      voiceControl: async (input) => {
        calls.push({ kind: "voice", input });
        if (input.command === "stop") return "stopped";
        return new Promise<"started">((resolve) => {
          resolveStart = resolve;
        });
      },
    },
  });
  return {
    calls,
    runtime,
    session,
    finishVoiceStart: () => {
      if (!resolveStart) throw new Error("voice_start_not_pending");
      resolveStart("started");
    },
  };
}

describe("Learning V2 exact activity action session", () => {
  it("binds report/save to one released task and keeps pre-terminal save stale", async () => {
    const value = harness();
    expect(isLearningV2ActivityActionSessionV1(value.session)).toBe(true);
    await expect(value.session.openReport()).resolves.toEqual({
      kind: "report_result",
      outcome: "opened",
    });
    await expect(value.session.savePhrase()).resolves.toEqual({
      kind: "save_result",
      outcome: "added",
    });
    expect(value.calls[1]).toMatchObject({
      kind: "save",
      input: {
        card: {
          taskId: "task-1",
          activityId: "activity-1",
          targetText: "Prompt 1",
          meaning: "Meaning 1-uk",
          interfaceLocale: "uk",
        },
      },
    });
    const blocked = harness("not_terminal");
    await expect(blocked.session.savePhrase()).resolves.toEqual({
      kind: "save_result",
      outcome: "stale",
    });
    expect(blocked.calls).toEqual([]);
  });

  it("shows no first-error copy and binds the localized explanation from error two", () => {
    const value = harness();
    expect(value.session.resolveWrongFeedback(1)).toEqual({
      motion: "transparent_nudge",
      showRedFrame: false,
      commitSelection: false,
      errorOrdinal: 1,
      explanation: null,
    });
    expect(value.session.resolveWrongFeedback(2)).toMatchObject({
      showRedFrame: false,
      commitSelection: false,
      errorOrdinal: 2,
      explanation: {
        explanationRef: "explanation-1",
        localizedText: "Explanation 1-uk",
        interfaceLocale: "uk",
      },
    });
  });

  it("stops a voice start that resolves during disposal and rejects stale use", async () => {
    const value = harness();
    const start = value.session.controlVoice("start", "hold");
    const dispose = value.session.dispose();
    value.finishVoiceStart();
    await expect(start).resolves.toEqual({
      kind: "voice_result",
      outcome: "disposed",
    });
    await dispose;
    expect(value.calls).toEqual([
      {
        kind: "voice",
        input: { command: "start", interaction: "hold" },
      },
      {
        kind: "voice",
        input: { command: "stop", interaction: "lifecycle" },
      },
    ]);
    await expect(value.session.openReport()).resolves.toEqual({
      kind: "report_result",
      outcome: "disposed",
    });
    expect(isLearningV2ActivityActionSessionV1({ ...value.session })).toBe(
      false,
    );
  });

  it("rejects a task object from another runtime even when coordinates match", () => {
    const first = runtimeFixture();
    const second = runtimeFixture();
    expect(() =>
      createLearningV2ActivityActionSessionV1({
        runtime: first,
        task: second.resolveTaskBySlot(1),
        terminalState: "completed",
        reducedMotion: false,
        ports: {
          openReport: () => undefined,
          saveCard: async () => "added",
          voiceControl: async () => "unavailable",
        },
      }),
    ).toThrow("learning_v2_activity_action_session_invalid");
  });

  it("keeps the fixture descriptor canonical and evaluator-free", () => {
    const raw = canonicalJsonV1(runtimeFixture().getDescriptor());
    expect(raw).not.toMatch(/correctResponse|acceptedResponses|salt/u);
  });
});
