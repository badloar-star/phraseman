import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
} from "../modules/learning-v2/policies/decision_registry";
import { materializeLearningV2ActivityAudioRuntimeProjectionV1 } from "../modules/learning-v2/runtime/activity_audio_runtime_projection_v1";
import { materializeLearningV2ActivityAuxiliaryClientDescriptorV1 } from "../modules/learning-v2/runtime/activity_auxiliary_client_descriptor_v1";
import {
  materializeLearningV2ActivityLearnerActionResourceV1,
  type LearningV2ActivityLearnerActionEntryV1,
} from "../modules/learning-v2/runtime/activity_learner_action_resource_v1";
import { materializeLearningV2ActivityPostTerminalCardCatalogV1 } from "../modules/learning-v2/runtime/activity_post_terminal_card_catalog_v1";
import { materializeLearningV2ActivityPostTerminalCardCapsuleV1 } from "../modules/learning-v2/runtime/activity_post_terminal_card_capsule_v1";
import {
  buildV2LocalEvaluatorCapsuleRawV1,
  createV2LocalEvaluatorCommitmentV1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
} from "../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import {
  evaluateLearningV2ActivityReleasedSessionTaskV1,
  getLearningV2ActivityReleasedSessionPackageSummaryV1,
  getLearningV2ActivityReleasedSessionRuntimeSummaryV1,
  getLearningV2ActivityReleasedSessionTaskV1,
  isLearningV2ActivityReleasedSessionPackageHandleV1,
  isLearningV2ActivityReleasedSessionRuntimeHandleV1,
  materializeLearningV2ActivityReleasedSessionPackageV1,
  mountLearningV2ActivityReleasedSessionRuntimeV1,
  parseLearningV2ActivityReleasedSessionPackageV1,
} from "../modules/learning-v2/runtime/activity_released_session_package_v1";
import {
  getLearningV2ActivityReleasedSessionPackageSummaryV2,
  isLearningV2ActivityReleasedSessionPackageHandleV2,
  isLearningV2ActivityReleasedSessionRuntimeHandleV2,
  materializeLearningV2ActivityReleasedSessionPackageV2,
  mountLearningV2ActivityReleasedSessionRuntimeV2,
  parseLearningV2ActivityReleasedSessionPackageV2,
  resolveLearningV2ActivityReleasedSessionCoreRuntimeV2,
  resolveLearningV2ActivityReleasedSessionIntroV2,
} from "../modules/learning-v2/runtime/activity_released_session_package_v2";
import {
  encodeLearningV2ActivitySessionIntroProjectionV1,
  materializeLearningV2ActivitySessionIntroProjectionV1,
} from "../modules/learning-v2/runtime/activity_session_intro_projection_v1";

const h = (value: unknown) => hashCanonicalBody(value);
const localized = (prefix: string) =>
  Object.freeze(
    Object.fromEntries(
      LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
        locale,
        `${prefix}-${locale}`,
      ]),
    ),
  ) as never;

function fixture() {
  const sourceFingerprint = h("source");
  const renderTasks = Array.from({ length: 12 }, (_, index) => {
    const slot = index + 1;
    return Object.freeze({
      taskId: `task-${slot}`,
      slot,
      purpose:
        slot <= 3
          ? "intro_comprehension_check"
          : slot <= 5
            ? "supported_practice"
            : slot <= 7
              ? "guided_practice"
              : slot === 8
                ? "retrieval_practice"
                : slot === 9
                  ? "near_transfer"
                  : slot === 11
                    ? "interleaved_review"
                    : "independent_check",
      family: "phrase_builder",
      answerExposure:
        slot === 10 || slot === 12 ? "forbidden" : "allowed_after_attempt",
      promptNovelty: slot === 10 || slot === 12 ? "novel" : "trained",
      inputMode: "ordered_tokens",
      support: slot === 10 || slot === 12 ? "none" : "model",
      hintsAllowed: slot === 10 || slot === 12 ? 0 : 1,
      learner: Object.freeze({
        promptId: `prompt-${slot}`,
        prompt: `Prompt ${slot}`,
        responseOptions: Object.freeze([
          Object.freeze({ responseId: `option-${slot}-a`, text: "hello" }),
          Object.freeze({ responseId: `option-${slot}-b`, text: "there" }),
        ]),
        mediaIds: Object.freeze([]),
        audioTargetIds: Object.freeze([]),
        accessibilityLabel: `Task ${slot}`,
      }),
      scriptedAlternate: null,
      runtimeCapabilityId: "v2.activity.phrase_builder.v1",
    });
  });
  const renderBody = Object.freeze({
    schemaVersion: "v2-activity-session-render-seed.v2",
    sourceFingerprint,
    episodeId: "episode-1",
    targetLanguage: "en",
    session: Object.freeze({
      sessionId: "session-1",
      ordinal: 1,
      zone: "understand",
      targetSeconds: 300,
      tasks: Object.freeze(renderTasks),
    }),
    executionAuthority: "none",
    rewardAuthority: "none",
    runtimeConsumer: false,
    releaseAuthority: false,
  });
  const renderRaw = canonicalJsonV1(renderBody);
  const actionEntries: LearningV2ActivityLearnerActionEntryV1[] =
    renderTasks.map((task) => {
      const activityId = `activity-${task.slot}`;
      const learnerSurfaceFingerprint = h({
        promptId: task.learner.promptId,
        prompt: task.learner.prompt,
        responseOptions: task.learner.responseOptions,
        accessibilityLabel: task.learner.accessibilityLabel,
      });
      const reportBody = {
        taskId: task.taskId,
        activityId,
        promptId: task.learner.promptId,
        sessionOrdinal: 1,
        screen: "learning_v2_activity" as const,
        dataId: task.taskId,
        prompt: task.learner.prompt,
        responseOptions: task.learner.responseOptions,
        accessibilityLabel: task.learner.accessibilityLabel,
        learnerSurfaceFingerprint,
      };
      const report = Object.freeze({
        reportContextRef: h(reportBody),
        screen: "learning_v2_activity" as const,
        dataId: task.taskId,
        prompt: task.learner.prompt,
        responseOptions: task.learner.responseOptions,
        accessibilityLabel: task.learner.accessibilityLabel,
        learnerSurfaceFingerprint,
      });
      const protectedSlot =
        task.slot === 9 || task.slot === 10 || task.slot === 12;
      const sourceTextFingerprint = h({ targetText: task.learner.prompt });
      const saveBody = protectedSlot
        ? {
            taskId: task.taskId,
            activityId,
            promptId: task.learner.promptId,
            resolution: "server_post_terminal" as const,
          }
        : {
            taskId: task.taskId,
            activityId,
            promptId: task.learner.promptId,
            resolution: "learner_visible_prompt" as const,
            targetText: task.learner.prompt,
            meaningResolution: "server_post_terminal_release_resource" as const,
            sourceTextFingerprint,
          };
      const save = protectedSlot
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
            targetText: task.learner.prompt,
            meaningResolution: "server_post_terminal_release_resource" as const,
            sourceTextFingerprint,
          });
      const body = {
        taskId: task.taskId,
        activityId,
        promptId: task.learner.promptId,
        slot: task.slot,
        family: "phrase_builder" as const,
        report,
        save,
        voiceAvailable: true,
      };
      return Object.freeze({ ...body, entryFingerprint: h(body) });
    });
  const action = materializeLearningV2ActivityLearnerActionResourceV1({
    episodeId: "episode-1",
    targetLanguage: "en",
    sessionId: "session-1",
    sessionOrdinal: 1,
    sourceFingerprint,
    renderFingerprint: sha256Utf8(renderRaw),
    entries: actionEntries,
  });
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
          { inputKind: "word" as const, wordId: h("word-1"), wordOrdinal: 1 },
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
          codecResultFingerprint: h(["codec-result", voiceId, coordinate]),
        };
        return Object.freeze({ ...body, entryFingerprint: h(body) });
      }),
  );
  const audio = materializeLearningV2ActivityAudioRuntimeProjectionV1({
    episodeId: "episode-1",
    sessionId: "session-1",
    sessionOrdinal: 1,
    voiceAudioManifestFingerprint: h("voice"),
    sourceSessionManifestFingerprint: h("source-manifest"),
    activityAudioCatalogFingerprint: h("catalog"),
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
    activeManifestHash: h("active"),
    episodeId: "episode-1",
    stageId: "stage-1",
    sessionId: "session-1",
    sessionOrdinal: 1,
    activityPackageFingerprint: h("package"),
    auxiliaryIndexFingerprint: h("index"),
    auxiliaryManifestFingerprint: h("manifest"),
    sourceFingerprint,
    renderFingerprint: sha256Utf8(renderRaw),
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
  const capsules = action.entries.map((entry) => {
    const base = {
      capsuleId: `capsule-${entry.slot}`,
      taskId: entry.taskId,
      activityId: entry.activityId,
      family: "phrase_builder" as const,
      inputKind: "text" as const,
      normalizationLocale: "en-US",
      normalizationProfileHash:
        V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
      salt: h(["salt", entry.slot]),
    };
    const acceptedCommitments = [
      createV2LocalEvaluatorCommitmentV1({ ...base, response: "hello there" }),
    ];
    return buildV2LocalEvaluatorCapsuleRawV1({ ...base, acceptedCommitments });
  });
  const capsuleEnvelopeRaw = canonicalJsonV1({
    schemaVersion: "v2-activity-session-capsule-envelope.v1",
    sourceFingerprint,
    episodeId: "episode-1",
    sessionId: "session-1",
    sessionOrdinal: 1,
    normalizationLocale: "en-US",
    normalizationProfileHash: V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
    capsules,
    commitmentAggregate: h({ capsules }),
    consumer: "app_internal_local_evaluator_only",
    verdictAuthority: "local_provisional_only",
  });
  const intro = materializeLearningV2ActivitySessionIntroProjectionV1({
    contentClass: "neutral_test_fixture",
    introId: "intro-session-1",
    introFingerprint: h("intro-session-1"),
    sourceSubjectFingerprint: h("intro-source-subject-1"),
    episodeId: "episode-1",
    sessionId: "session-1",
    sessionOrdinal: 1,
    targetLanguage: "en",
    title: "Three exact intro pages",
    pages: renderTasks.slice(0, 3).map((task, index) => ({
      pageOrdinal: (index + 1) as 1 | 2 | 3,
      conceptId: `concept-${index + 1}`,
      heading: `Heading ${index + 1}`,
      explanation: `Explanation ${index + 1}`,
      question: {
        taskId: task.taskId,
        taskSlot: (index + 1) as 1 | 2 | 3,
        questionId: `question-${index + 1}`,
        coveredConceptIds: [`concept-${index + 1}`],
        learnerSurfaceFingerprint: h({
          taskId: task.taskId,
          promptId: task.learner.promptId,
          prompt: task.learner.prompt,
          responseOptions: task.learner.responseOptions,
          accessibilityLabel: task.learner.accessibilityLabel,
        }),
        promptId: task.learner.promptId,
        prompt: task.learner.prompt,
        responseOptions: task.learner.responseOptions,
        accessibilityLabel: task.learner.accessibilityLabel,
      },
    })),
  });
  return {
    descriptor,
    renderRaw,
    capsuleEnvelopeRaw,
    introRaw: encodeLearningV2ActivitySessionIntroProjectionV1(intro),
  };
}

describe("released Activity session package", () => {
  it("mounts exact learner render/actions/capsules and evaluates locally", () => {
    const source = fixture();
    const raw = materializeLearningV2ActivityReleasedSessionPackageV1(source);
    const parsed = parseLearningV2ActivityReleasedSessionPackageV1(raw);
    expect(isLearningV2ActivityReleasedSessionPackageHandleV1(parsed)).toBe(
      true,
    );
    expect(
      getLearningV2ActivityReleasedSessionPackageSummaryV1(parsed),
    ).toMatchObject({
      taskCount: 12,
      learnerSurfaceBinding: "exact_render_action_capsule_bijection",
      localFeedbackAuthority: "local_provisional_only",
    });
    const runtime = mountLearningV2ActivityReleasedSessionRuntimeV1({
      packageHandle: parsed,
      interfaceLocale: "ru",
    });
    expect(isLearningV2ActivityReleasedSessionRuntimeHandleV1(runtime)).toBe(
      true,
    );
    expect(
      getLearningV2ActivityReleasedSessionRuntimeSummaryV1(runtime),
    ).toMatchObject({
      activeManifestHash: h("active"),
      activityPackageFingerprint: h("package"),
      answerTransport: "none_local_capsule_only",
      taskCount: 12,
    });
    expect(
      getLearningV2ActivityReleasedSessionTaskV1(runtime, 1),
    ).toMatchObject({
      taskId: "task-1",
      activityId: "activity-1",
      learner: { prompt: "Prompt 1" },
      actions: { secondErrorExplanation: { text: "Explanation 1-ru" } },
    });
    expect(
      evaluateLearningV2ActivityReleasedSessionTaskV1({
        runtime,
        taskId: "task-1",
        response: { kind: "text", value: "Hello there" },
      }).resultCode,
    ).toBe("provisional_correct");
    expect(
      evaluateLearningV2ActivityReleasedSessionTaskV1({
        runtime,
        taskId: "task-1",
        response: { kind: "text", value: "wrong" },
      }).resultCode,
    ).toBe("provisional_wrong");
  });

  it("rejects coordinated render/action drift, capsule swaps and copied handles", () => {
    const source = fixture();
    const raw = materializeLearningV2ActivityReleasedSessionPackageV1(source);
    const decoded = JSON.parse(raw);
    const render = JSON.parse(decoded.renderRaw);
    render.session.tasks[0].learner.prompt = "Changed";
    decoded.renderRaw = canonicalJsonV1(render);
    decoded.renderFingerprint = sha256Utf8(decoded.renderRaw);
    const { packageFingerprint: _ignored, ...body } = decoded;
    decoded.packageFingerprint = h(body);
    expect(() =>
      parseLearningV2ActivityReleasedSessionPackageV1(canonicalJsonV1(decoded)),
    ).toThrow("learning_v2_activity_released_session_package_invalid");

    const valid = parseLearningV2ActivityReleasedSessionPackageV1(raw);
    expect(
      isLearningV2ActivityReleasedSessionPackageHandleV1({ ...valid }),
    ).toBe(false);
    const swapped = JSON.parse(raw);
    const envelope = JSON.parse(swapped.capsuleEnvelopeRaw);
    [envelope.capsules[0], envelope.capsules[1]] = [
      envelope.capsules[1],
      envelope.capsules[0],
    ];
    swapped.capsuleEnvelopeRaw = canonicalJsonV1(envelope);
    swapped.capsuleEnvelopeFingerprint = sha256Utf8(swapped.capsuleEnvelopeRaw);
    const { packageFingerprint: _old, ...swappedBody } = swapped;
    swapped.packageFingerprint = h(swappedBody);
    expect(() =>
      parseLearningV2ActivityReleasedSessionPackageV1(canonicalJsonV1(swapped)),
    ).toThrow("learning_v2_activity_released_session_package_invalid");
  });

  it("wraps exact three-page intro and starts non-repeated practice at slot 4", () => {
    const source = fixture();
    const corePackageRaw =
      materializeLearningV2ActivityReleasedSessionPackageV1(source);
    const raw = materializeLearningV2ActivityReleasedSessionPackageV2({
      corePackageRaw,
      introRaw: source.introRaw,
    });
    const parsed = parseLearningV2ActivityReleasedSessionPackageV2(raw);
    expect(isLearningV2ActivityReleasedSessionPackageHandleV2(parsed)).toBe(
      true,
    );
    expect(
      getLearningV2ActivityReleasedSessionPackageSummaryV2(parsed),
    ).toMatchObject({
      introPageCount: 3,
      embeddedQuestionCount: 3,
      practiceStartSlot: 4,
      introTaskBinding: "exact_intro_questions_to_core_tasks_1_2_3",
    });
    const runtime = mountLearningV2ActivityReleasedSessionRuntimeV2({
      packageHandle: parsed,
      interfaceLocale: "ru",
    });
    expect(isLearningV2ActivityReleasedSessionRuntimeHandleV2(runtime)).toBe(
      true,
    );
    expect(resolveLearningV2ActivityReleasedSessionIntroV2(runtime)).toMatchObject({
      pageCount: 3,
      embeddedQuestionCount: 3,
      practiceStartSlot: 4,
    });
    expect(
      getLearningV2ActivityReleasedSessionTaskV1(
        resolveLearningV2ActivityReleasedSessionCoreRuntimeV2(runtime),
        4,
      ).taskId,
    ).toBe("task-4");
  });

  it("rejects a recomputed intro whose page question drifts from core task 1", () => {
    const source = fixture();
    const corePackageRaw =
      materializeLearningV2ActivityReleasedSessionPackageV1(source);
    const intro = JSON.parse(source.introRaw);
    intro.pages[0].question.prompt = "Different question";
    intro.pages[0].question.learnerSurfaceFingerprint = h({
      taskId: intro.pages[0].question.taskId,
      promptId: intro.pages[0].question.promptId,
      prompt: intro.pages[0].question.prompt,
      responseOptions: intro.pages[0].question.responseOptions,
      accessibilityLabel: intro.pages[0].question.accessibilityLabel,
    });
    const { projectionFingerprint: _old, ...introBody } = intro;
    intro.projectionFingerprint = h(introBody);
    expect(() =>
      materializeLearningV2ActivityReleasedSessionPackageV2({
        corePackageRaw,
        introRaw: canonicalJsonV1(intro),
      }),
    ).toThrow("learning_v2_activity_released_session_package_v2_invalid");
  });
});
