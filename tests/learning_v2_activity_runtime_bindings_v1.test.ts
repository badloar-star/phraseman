import {
  LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_SCHEMA_V1,
  encodeLearningV2ActivityErrorExplanationCatalogV1,
  parseLearningV2ActivityErrorExplanationCatalogV1,
  projectLearningV2ActivityErrorExplanationsForLearnerV1,
  type LearningV2ActivityErrorExplanationCatalogV1,
} from "../modules/learning-v2/content/activity_error_explanation_catalog_v1";
import { LEARNING_V2_INTERFACE_LOCALES } from "../modules/learning-v2/content/generator_course_contract";
import {
  bindLearningV2ActivityAttemptAudioV1,
  materializeLearningV2ActivityAudioRuntimeProjectionV1,
} from "../modules/learning-v2/runtime/activity_audio_runtime_projection_v1";
import { createLearningV2ActivityAttemptControllerFromRuntimeBindingsV1 } from "../modules/learning-v2/runtime/activity_attempt_controller_v1";
import {
  V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  buildV2LocalEvaluatorCapsuleRawV1,
  createV2LocalEvaluatorCommitmentV1,
  parseV2LocalEvaluatorCapsuleV1,
} from "../modules/learning-v2/runtime/local_evaluator_capsule_v1";
import { hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";

const h = (value: unknown) => hashCanonicalBody(value);
const voices = ["ash", "onyx", "nova", "coral"] as const;
const families = [
  "phrase_builder",
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
] as const;

function explanationProjection() {
  const localized = (value: string) =>
    Object.fromEntries(
      LEARNING_V2_INTERFACE_LOCALES.map((locale) => [
        locale,
        `${value}-${locale}`,
      ]),
    ) as Record<(typeof LEARNING_V2_INTERFACE_LOCALES)[number], string>;
  const body: Omit<
    LearningV2ActivityErrorExplanationCatalogV1,
    "catalogFingerprint"
  > = {
    schemaVersion: LEARNING_V2_ACTIVITY_ERROR_EXPLANATION_CATALOG_SCHEMA_V1,
    catalogId: "error-catalog-1",
    packageId: "package-1",
    targetLanguage: "en",
    episodeId: "episode-1",
    episodeOrdinal: 1,
    interfaceLocales: LEARNING_V2_INTERFACE_LOCALES,
    entries: Array.from({ length: 144 }, (_, index) => {
      const sessionOrdinal = Math.floor(index / 12) + 1;
      const taskOrdinal = (index % 12) + 1;
      const suffix = `${sessionOrdinal}-${taskOrdinal}`;
      const selectedVariantId = `variant-${suffix}`;
      return {
        explanationId: `explanation-${suffix}`,
        episodeId: "episode-1",
        sessionId: `session-${sessionOrdinal}`,
        sessionOrdinal,
        taskId: `task-${suffix}`,
        activityId: `activity-${suffix}`,
        family: families[index % families.length],
        errorKind: "generic_wrong_answer" as const,
        selectedVariantId,
        variants: [
          {
            variantId: selectedVariantId,
            state: "selected_for_preview" as const,
            origin: "owner_authored" as const,
            provenanceFingerprint: h(["provenance", suffix]),
            textByLocale: localized(`explanation-${suffix}`),
          },
        ],
      };
    }),
    entryCount: 144,
    filterDimensions: [
      "interface_locale",
      "family",
      "episode",
      "session",
      "task",
    ],
    contentOriginAuthority: "unverified_owner_or_generator_claim",
    selectionAuthority: "preview_only_no_release_authority",
    runtimeAuthority: "none",
    publicationAuthority: "none",
    releaseAuthority: false,
  };
  return projectLearningV2ActivityErrorExplanationsForLearnerV1(
    parseLearningV2ActivityErrorExplanationCatalogV1(
      encodeLearningV2ActivityErrorExplanationCatalogV1(body),
    ),
  );
}

function audioBinding() {
  const taskVoiceGroupFingerprint = h("group");
  const audioTargetId = h("audio-target");
  const wordId = h("word");
  const entries = voices.flatMap((voiceId) =>
    [
      { inputKind: "full_utterance" as const, wordId: null, wordOrdinal: null },
      { inputKind: "word" as const, wordId, wordOrdinal: 1 },
    ].map((coordinate) => {
      const contentHash = h([voiceId, coordinate]);
      const body = {
        generationTargetFingerprint: h(["generation", voiceId, coordinate]),
        itemFingerprint: h(["item", voiceId, coordinate]),
        taskId: "task-1-1",
        taskVoiceGroupFingerprint,
        audioTargetId,
        ...coordinate,
        voiceId,
        objectPath: `learning-v2/voice-audio/${h("plan")}/${h("stage")}/${h("target")}/${contentHash}.mp3`,
        contentHash,
        objectGeneration: "11",
        byteSize: 2_000,
        contentType: "audio/mpeg" as const,
        codecRulesFingerprint: h("codec-rules"),
        codecResultFingerprint: h(["codec-result", voiceId, coordinate]),
      };
      return { ...body, entryFingerprint: h(body) };
    }),
  );
  const selectableBody = {
    taskId: "task-1-1",
    taskVoiceGroupFingerprint,
    selectableId: "chip-one",
    audioTargetId,
    wordId,
    wordOrdinal: 1,
  };
  const projection = materializeLearningV2ActivityAudioRuntimeProjectionV1({
    episodeId: "episode-1",
    sessionId: "session-1",
    sessionOrdinal: 1,
    voiceAudioManifestFingerprint: h("manifest"),
    sourceSessionManifestFingerprint: h("session-manifest"),
    activityAudioCatalogFingerprint: h("catalog"),
    voiceTargetsPackageFingerprint: h("voice-package"),
    entries,
    selectableBindings: [
      { ...selectableBody, bindingFingerprint: h(selectableBody) },
    ],
  });
  return bindLearningV2ActivityAttemptAudioV1({
    projection,
    taskId: "task-1-1",
    voiceSelectionIndex: 1,
    fullPhraseAudioTargetId: audioTargetId,
  });
}

function evaluator() {
  const salt = h("salt");
  const common = {
    capsuleId: "capsule-1",
    taskId: "task-1-1",
    activityId: "activity-1-1",
    family: "listen_choose" as const,
    inputKind: "choice_token" as const,
    normalizationLocale: "en-US",
    normalizationProfileHash: V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
    salt,
  };
  const acceptedCommitment = createV2LocalEvaluatorCommitmentV1({
    ...common,
    response: "correct-option",
  });
  return parseV2LocalEvaluatorCapsuleV1(
    buildV2LocalEvaluatorCapsuleRawV1({
      ...common,
      acceptedCommitments: [acceptedCommitment],
    }),
  );
}

describe("Learning V2 exact activity runtime bindings", () => {
  it("plays the selected word with one voice and explains only the second wrong answer", () => {
    const controller =
      createLearningV2ActivityAttemptControllerFromRuntimeBindingsV1({
        identity: {
          episodeId: "episode-1",
          sessionId: "session-1",
          sessionOrdinal: 1,
          taskId: "task-1-1",
          activityId: "activity-1-1",
          promptId: "prompt-1",
        },
        capsuleHandle: evaluator(),
        audioBinding: audioBinding(),
        savablePhraseRef: "phrase-1",
        reportContextRef: "report-1",
        reducedMotion: false,
        holdToTalkEnabled: true,
        explanationProjection: explanationProjection(),
        interfaceLocale: "uk",
      });
    expect(
      controller.attemptSelection({
        selectableId: "chip-one",
        response: { kind: "choice_token", value: "wrong-one" },
        feedbackTargetId: "chip-one",
      }),
    ).toMatchObject({
      effects: [
        {
          kind: "play_audio",
          voiceId: "onyx",
          source: "selected_word_or_chip",
        },
        { kind: "wrong_feedback", commitSelection: false, explanation: null },
      ],
      commitSelection: false,
    });
    expect(
      controller.evaluateResponse({
        response: { kind: "choice_token", value: "wrong-two" },
        feedbackTargetId: "chip-one",
      }),
    ).toMatchObject({
      errorOrdinal: 2,
      explanation: { localizedText: "explanation-1-1-uk" },
      showRedFrame: false,
    });
    expect(controller.playFullPhrase()).toMatchObject({
      voiceId: "onyx",
      wordId: null,
    });
  });
});
