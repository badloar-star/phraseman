import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import {
  V2_REQUIRED_SESSION_TASK_SLOT_POLICY_V2,
  v2ActivitySessionIdV2,
  type V2ActivityIntroQuestionRefV2,
  type V2ActivityReviewSourceV2,
  type V2ActivitySessionSupportV2,
  type V2RequiredSessionTaskPurposeV2,
} from "../../../modules/learning-v2/contracts/activity_session_package_v2";
import { V2_REQUIRED_SESSION_FAMILIES_V2 } from "../../../modules/learning-v2/contracts/activity_catalog_v2";
import {
  buildV2LocalEvaluatorCapsuleRawV1,
  createV2LocalEvaluatorCommitmentV1,
  normalizeV2LocalEvaluatorResponseV1,
  v2LocalEvaluatorInputKindForFamilyV1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
  type V2LocalEvaluatorInputKindV1,
} from "../../../modules/learning-v2/runtime/local_evaluator_capsule_v1";

export const V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2 =
  "v2-activity-session-source-shard.v2" as const;
export const V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2 =
  "v2-activity-session-render-seed.v2" as const;
export const V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1 =
  "v2-activity-session-capsule-envelope.v1" as const;
export const V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2 =
  "v2-activity-session-server-sidecar.v2" as const;
export const V2_ACTIVITY_EPISODE_ASSEMBLY_SCHEMA_V1 =
  "v2-activity-episode-projection-assembly.v1" as const;

export const V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES = 512 * 1024;
export const V2_ACTIVITY_SESSION_RENDER_MAX_BYTES = 256 * 1024;
export const V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_MAX_BYTES = 64 * 1024;
export const V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES = 128 * 1024;

export const V2_ACTIVITY_FAMILIES = V2_REQUIRED_SESSION_FAMILIES_V2;
export type V2ActivityFamily = (typeof V2_ACTIVITY_FAMILIES)[number];
export type V2ActivityInputMode =
  | "ordered_tokens"
  | "single_choice"
  | "scripted_speech";
export type V2ActivityPurpose = V2RequiredSessionTaskPurposeV2;
export type V2ActivityZone = "understand" | "use" | "master";
export type V2ActivitySupport = V2ActivitySessionSupportV2;
export type V2ActivityAnswerExposure = "allowed_after_attempt" | "forbidden";
export type V2ActivityPromptNovelty = "trained" | "varied" | "novel";

export const V2_SCRIPTED_ALTERNATE_REQUIRED_FAMILIES_V2 = Object.freeze([
  "listen_choose",
  "sound_contrast",
  "listen_build_dictation",
  "scripted_repeat_compare",
] as const);

export interface V2ActivityResponseOption {
  readonly responseId: string;
  readonly text: string;
}

export interface V2ActivityLearnerPayload {
  readonly promptId: string;
  readonly prompt: string;
  readonly responseOptions: readonly V2ActivityResponseOption[];
  readonly mediaIds: readonly string[];
  readonly audioTargetIds: readonly string[];
  readonly accessibilityLabel: string;
}

export interface V2ActivityScriptedAlternate {
  readonly alternateId: string;
  readonly instruction: string;
  readonly voiceEvidenceEquivalent: false;
  readonly canAward: false;
}

export interface V2ActivityEvaluatorPayload {
  readonly inputKind: V2LocalEvaluatorInputKindV1;
  readonly normalizationRef: typeof V2_LOCAL_EVALUATOR_NORMALIZATION_V1;
  readonly correctResponse: string;
  readonly acceptedResponses: readonly string[];
  readonly salt: string;
}

export interface V2ActivityProjectionSourceTask {
  readonly taskId: string;
  readonly slot: number;
  readonly purpose: V2ActivityPurpose;
  readonly family: V2ActivityFamily;
  readonly activityId: string;
  readonly contentItemId: string;
  readonly objectiveId: string;
  readonly learningFunction: string;
  readonly answerExposure: V2ActivityAnswerExposure;
  readonly promptNovelty: V2ActivityPromptNovelty;
  readonly localEvaluatorCapsuleId: string;
  readonly inputMode: V2ActivityInputMode;
  readonly support: V2ActivitySupport;
  readonly hintsAllowed: 0 | 1 | 2;
  readonly introQuestionRef: V2ActivityIntroQuestionRefV2 | null;
  readonly reviewSource: V2ActivityReviewSourceV2 | null;
  readonly learner: V2ActivityLearnerPayload;
  readonly scriptedAlternate: V2ActivityScriptedAlternate | null;
  readonly evaluator: V2ActivityEvaluatorPayload;
}

export interface V2ActivityProjectionSourceSession {
  readonly sessionId: string;
  readonly ordinal: number;
  readonly zone: V2ActivityZone;
  readonly targetSeconds: number;
  readonly tasks: readonly V2ActivityProjectionSourceTask[];
}

export interface V2ActivitySessionProjectionSource {
  readonly schemaVersion: typeof V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2;
  readonly episodeId: string;
  readonly targetLanguage: string;
  readonly normalizationLocale: string;
  readonly normalizationProfileHash: string;
  readonly session: V2ActivityProjectionSourceSession;
}

export interface V2ActivityRenderTask {
  readonly taskId: string;
  readonly slot: number;
  readonly purpose: V2ActivityPurpose;
  readonly family: V2ActivityFamily;
  readonly answerExposure: V2ActivityAnswerExposure;
  readonly promptNovelty: V2ActivityPromptNovelty;
  readonly inputMode: V2ActivityInputMode;
  readonly support: V2ActivitySupport;
  readonly hintsAllowed: 0 | 1 | 2;
  readonly learner: V2ActivityLearnerPayload;
  readonly scriptedAlternate: V2ActivityScriptedAlternate | null;
  readonly runtimeCapabilityId: string;
}

export interface V2ActivitySessionRenderSeed {
  readonly schemaVersion: typeof V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2;
  readonly sourceFingerprint: string;
  readonly episodeId: string;
  readonly targetLanguage: string;
  readonly session: Readonly<{
    sessionId: string;
    ordinal: number;
    zone: V2ActivityZone;
    targetSeconds: number;
    tasks: readonly V2ActivityRenderTask[];
  }>;
  readonly executionAuthority: "none";
  readonly rewardAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseAuthority: false;
}

export interface V2ActivitySessionCapsuleEnvelopeV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1;
  readonly sourceFingerprint: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly normalizationLocale: string;
  readonly normalizationProfileHash: string;
  readonly capsules: readonly string[];
  readonly commitmentAggregate: string;
  readonly consumer: "app_internal_local_evaluator_only";
  readonly verdictAuthority: "local_provisional_only";
}

export interface V2ActivityServerSidecarTask {
  readonly capsuleId: string;
  readonly taskId: string;
  readonly activityId: string;
  readonly family: V2ActivityFamily;
  readonly inputKind: V2LocalEvaluatorInputKindV1;
  readonly normalizationRef: typeof V2_LOCAL_EVALUATOR_NORMALIZATION_V1;
  readonly normalizationLocale: string;
  readonly normalizationProfileHash: string;
  readonly salt: string;
  readonly correctResponse: string;
  readonly acceptedResponses: readonly string[];
  readonly acceptedCommitments: readonly string[];
}

export interface V2ActivitySessionServerSidecar {
  readonly schemaVersion: typeof V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2;
  readonly sourceFingerprint: string;
  readonly episodeId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly tasks: readonly V2ActivityServerSidecarTask[];
  readonly commitmentAggregate: string;
  readonly serverOnly: true;
  readonly evaluationAuthority: "none";
  readonly rewardAuthority: "none";
  readonly releaseAuthority: false;
}

export interface V2ActivitySessionProjectionArtifacts {
  readonly renderSeed: V2ActivitySessionRenderSeed;
  readonly appLocalCapsuleEnvelope: V2ActivitySessionCapsuleEnvelopeV1;
  readonly serverSidecar: V2ActivitySessionServerSidecar;
}

export interface V2ActivityEpisodeProjectionAssemblyV1 {
  readonly schemaVersion: typeof V2_ACTIVITY_EPISODE_ASSEMBLY_SCHEMA_V1;
  readonly episodeId: string;
  readonly targetLanguage: string;
  readonly normalizationLocale: string;
  readonly normalizationProfileHash: string;
  readonly sessionCount: 12;
  readonly taskCount: 144;
  readonly sessions: readonly V2ActivitySessionProjectionArtifacts[];
  readonly assemblyFingerprint: string;
}

interface ActivityClassification {
  readonly inputMode: V2ActivityInputMode;
  readonly runtimeCapabilityId: string;
}

const CLASSIFICATIONS: Readonly<
  Record<V2ActivityFamily, ActivityClassification>
> = Object.freeze({
  phrase_builder: Object.freeze({
    inputMode: "ordered_tokens",
    runtimeCapabilityId: "v2.activity.phrase_builder.v1",
  }),
  listen_choose: Object.freeze({
    inputMode: "single_choice",
    runtimeCapabilityId: "v2.activity.listen_choose.v1",
  }),
  sound_contrast: Object.freeze({
    inputMode: "single_choice",
    runtimeCapabilityId: "v2.activity.sound_contrast.v1",
  }),
  listen_build_dictation: Object.freeze({
    inputMode: "ordered_tokens",
    runtimeCapabilityId: "v2.activity.listen_build_dictation.v1",
  }),
  context_gap_grammar: Object.freeze({
    inputMode: "single_choice",
    runtimeCapabilityId: "v2.activity.context_gap_grammar.v1",
  }),
  speed_match: Object.freeze({
    inputMode: "single_choice",
    runtimeCapabilityId: "v2.activity.speed_match.v1",
  }),
  scripted_repeat_compare: Object.freeze({
    inputMode: "scripted_speech",
    runtimeCapabilityId: "v2.activity.scripted_repeat_compare.v1",
  }),
});

const SOURCE_KEYS = [
  "episodeId",
  "normalizationLocale",
  "normalizationProfileHash",
  "schemaVersion",
  "session",
  "targetLanguage",
];
const SESSION_KEYS = ["ordinal", "sessionId", "targetSeconds", "tasks", "zone"];
const TASK_KEYS = [
  "activityId",
  "answerExposure",
  "contentItemId",
  "evaluator",
  "family",
  "hintsAllowed",
  "inputMode",
  "introQuestionRef",
  "learner",
  "learningFunction",
  "localEvaluatorCapsuleId",
  "objectiveId",
  "promptNovelty",
  "purpose",
  "reviewSource",
  "scriptedAlternate",
  "slot",
  "support",
  "taskId",
];
const LEARNER_KEYS = [
  "accessibilityLabel",
  "audioTargetIds",
  "mediaIds",
  "prompt",
  "promptId",
  "responseOptions",
];
const RESPONSE_OPTION_KEYS = ["responseId", "text"];
const ALTERNATE_KEYS = [
  "alternateId",
  "canAward",
  "instruction",
  "voiceEvidenceEquivalent",
];
const INTRO_QUESTION_KEYS = [
  "coveredConceptIds",
  "introArtifactFingerprint",
  "questionId",
];
const REVIEW_SOURCE_KEYS = ["kind", "reviewOfTaskId", "sourceSessionOrdinal"];
const EVALUATOR_KEYS = [
  "acceptedResponses",
  "correctResponse",
  "inputKind",
  "normalizationRef",
  "salt",
];
const ID_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const LANGUAGE_PATTERN = /^[a-z]{2,3}(?:-[A-Za-z0-9]{1,8}){0,15}$/;
const CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const trustedSources = new WeakSet<object>();
const trustedArtifacts = new WeakSet<object>();
const SCRIPTED_ALTERNATE_REQUIRED_FAMILY_SET = new Set<string>(
  V2_SCRIPTED_ALTERNATE_REQUIRED_FAMILIES_V2,
);

function fail(code: string): never {
  throw new Error(code);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function exactKeys(
  value: unknown,
  keys: readonly string[],
  code: string,
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) fail(code);
  const actual = Object.keys(value).sort();
  const expected = Array.from(keys).sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index])
  )
    fail(code);
}

const safeId = (value: unknown, code: string): string => {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) fail(code);
  return value;
};

const safeText = (value: unknown, maxLength: number, code: string): string => {
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > maxLength ||
    value.trim() !== value ||
    value.normalize("NFC") !== value ||
    CONTROL_PATTERN.test(value)
  )
    fail(code);
  return value;
};

const safeIdArray = (
  value: unknown,
  maximum: number,
  code: string,
): readonly string[] => {
  if (!Array.isArray(value) || value.length > maximum) fail(code);
  const values = value.map((item) => safeId(item, code));
  if (new Set(values).size !== values.length) fail(code);
  return values;
};

const safeResponseArray = (value: unknown): readonly string[] => {
  if (!Array.isArray(value) || value.length < 1 || value.length > 32) {
    fail("v2_activity_session_accepted_responses_invalid");
  }
  const values = value.map((item) =>
    safeText(item, 512, "v2_activity_session_accepted_responses_invalid"),
  );
  if (new Set(values).size !== values.length) {
    fail("v2_activity_session_accepted_responses_invalid");
  }
  return values;
};

const isFamily = (value: unknown): value is V2ActivityFamily =>
  typeof value === "string" &&
  (V2_ACTIVITY_FAMILIES as readonly string[]).includes(value);

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value as Record<string, unknown>)) {
      deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
};

const expectedZone = (ordinal: number): V2ActivityZone =>
  ordinal <= 4 ? "understand" : ordinal <= 8 ? "use" : "master";

const normalizeVisibleText = (value: string, locale: string): string =>
  normalizeV2LocalEvaluatorResponseV1("text", value, locale) ?? "";

const acceptedSemanticValues = (
  task: V2ActivityProjectionSourceTask,
  locale: string,
): readonly string[] => {
  if (task.evaluator.inputKind === "choice_token") {
    const optionTextById = new Map(
      task.learner.responseOptions.map((option) => [
        normalizeV2LocalEvaluatorResponseV1(
          "choice_token",
          option.responseId,
          locale,
        ),
        normalizeVisibleText(option.text, locale),
      ]),
    );
    return task.evaluator.acceptedResponses
      .map((response) =>
        optionTextById.get(
          normalizeV2LocalEvaluatorResponseV1("choice_token", response, locale),
        ),
      )
      .filter((value): value is string => typeof value === "string")
      .sort();
  }
  return task.evaluator.acceptedResponses
    .map((response) =>
      normalizeV2LocalEvaluatorResponseV1(
        task.evaluator.inputKind,
        response,
        locale,
      ),
    )
    .filter((value): value is string => typeof value === "string")
    .sort();
};

export const v2ActivitySemanticSurfaceFingerprintV2 = (
  task: V2ActivityProjectionSourceTask,
  normalizationLocale: string,
): string =>
  hashCanonicalBody({
    prompt: normalizeVisibleText(task.learner.prompt, normalizationLocale),
    acceptedSemanticValues: acceptedSemanticValues(task, normalizationLocale),
  });

const visibleFieldContainsAnswer = (visible: string, answer: string): boolean =>
  visible === answer || ` ${visible} `.includes(` ${answer} `);

function validateSource(
  candidate: unknown,
): asserts candidate is V2ActivitySessionProjectionSource {
  exactKeys(
    candidate,
    SOURCE_KEYS,
    "v2_activity_session_source_fields_invalid",
  );
  if (candidate.schemaVersion !== V2_ACTIVITY_SESSION_SOURCE_SCHEMA_V2) {
    fail("v2_activity_session_source_schema_invalid");
  }
  safeId(candidate.episodeId, "v2_activity_session_episode_id_invalid");
  if (
    typeof candidate.targetLanguage !== "string" ||
    candidate.targetLanguage.length > 255 ||
    !LANGUAGE_PATTERN.test(candidate.targetLanguage) ||
    candidate.normalizationLocale !== candidate.targetLanguage ||
    candidate.normalizationProfileHash !==
      V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1
  )
    fail("v2_activity_session_normalization_profile_invalid");

  const rawSession = candidate.session;
  exactKeys(
    rawSession,
    SESSION_KEYS,
    "v2_activity_session_session_fields_invalid",
  );
  safeId(rawSession.sessionId, "v2_activity_session_session_id_invalid");
  if (
    typeof rawSession.ordinal !== "number" ||
    !Number.isSafeInteger(rawSession.ordinal) ||
    rawSession.ordinal < 1 ||
    rawSession.ordinal > 12
  )
    fail("v2_activity_session_session_ordinal_invalid");
  const sessionOrdinal = Number(rawSession.ordinal);
  if (rawSession.zone !== expectedZone(rawSession.ordinal)) {
    fail("v2_activity_session_zone_invalid");
  }
  if (
    rawSession.sessionId !==
    v2ActivitySessionIdV2(candidate.episodeId as string, rawSession.ordinal)
  )
    fail("v2_activity_session_session_id_invalid");
  if (
    typeof rawSession.targetSeconds !== "number" ||
    !Number.isSafeInteger(rawSession.targetSeconds) ||
    rawSession.targetSeconds < 150 ||
    rawSession.targetSeconds > 360
  )
    fail("v2_activity_session_target_seconds_invalid");
  if (!Array.isArray(rawSession.tasks) || rawSession.tasks.length !== 12) {
    fail("v2_activity_session_task_count_invalid");
  }

  const objectIds = new Set<string>();
  const responseIds = new Set<string>();
  const alternateIds = new Set<string>();
  const salts = new Set<string>();
  const sessionFamilies = new Set<V2ActivityFamily>();
  const introArtifactFingerprints = new Set<string>();
  const introQuestionIds = new Set<string>();
  const taughtObjectiveIds = new Set<string>();
  const earlierTasksById = new Map<string, V2ActivityProjectionSourceTask>();

  rawSession.tasks.forEach((rawTask, taskIndex) => {
    exactKeys(rawTask, TASK_KEYS, "v2_activity_session_task_fields_invalid");
    const slot = taskIndex + 1;
    if (rawTask.slot !== slot) fail("v2_activity_session_task_slot_invalid");
    const slotPolicy = V2_REQUIRED_SESSION_TASK_SLOT_POLICY_V2[taskIndex];
    if (!slotPolicy || rawTask.purpose !== slotPolicy.purpose) {
      fail("v2_activity_session_purpose_invalid");
    }
    if (!isFamily(rawTask.family)) fail("v2_activity_session_family_invalid");
    sessionFamilies.add(rawTask.family);
    const classification = CLASSIFICATIONS[rawTask.family];
    if (rawTask.inputMode !== classification.inputMode) {
      fail("v2_activity_session_classification_invalid");
    }

    safeId(rawTask.contentItemId, "v2_activity_session_contentItemId_invalid");
    const objectiveId = safeId(
      rawTask.objectiveId,
      "v2_activity_session_objectiveId_invalid",
    );
    let taskId = "";
    for (const key of [
      "taskId",
      "activityId",
      "localEvaluatorCapsuleId",
    ] as const) {
      const identity = safeId(
        rawTask[key],
        `v2_activity_session_${key}_invalid`,
      );
      if (objectIds.has(identity)) fail(`v2_activity_session_${key}_invalid`);
      objectIds.add(identity);
      if (key === "taskId") taskId = identity;
    }
    safeText(
      rawTask.learningFunction,
      240,
      "v2_activity_session_learning_function_invalid",
    );
    if (
      rawTask.answerExposure !== "allowed_after_attempt" &&
      rawTask.answerExposure !== "forbidden"
    )
      fail("v2_activity_session_answer_exposure_invalid");
    if (
      !["trained", "varied", "novel"].includes(String(rawTask.promptNovelty))
    ) {
      fail("v2_activity_session_prompt_novelty_invalid");
    }
    if (
      !["model", "full_text", "partial_cue", "visual_only", "none"].includes(
        String(rawTask.support),
      )
    )
      fail("v2_activity_session_support_invalid");
    if (
      ![0, 1, 2].includes(rawTask.hintsAllowed as number) ||
      Number(rawTask.hintsAllowed) > slotPolicy.maxHints
    ) {
      fail("v2_activity_session_help_policy_invalid");
    }
    if (
      slotPolicy.independent &&
      (rawTask.support !== slotPolicy.requiredSupport ||
        rawTask.answerExposure !== slotPolicy.requiredAnswerExposure ||
        (!slotPolicy.trainedPromptAllowed &&
          rawTask.promptNovelty === "trained"))
    )
      fail("v2_activity_session_independent_check_invalid");
    if (slotPolicy.independent && rawTask.family === "scripted_repeat_compare")
      fail("v2_activity_session_independent_scripted_repeat_invalid");

    if (slot <= 3) {
      exactKeys(
        rawTask.introQuestionRef,
        INTRO_QUESTION_KEYS,
        "v2_activity_session_intro_question_ref_invalid",
      );
      if (
        typeof rawTask.introQuestionRef.introArtifactFingerprint !== "string" ||
        !HASH_PATTERN.test(rawTask.introQuestionRef.introArtifactFingerprint)
      )
        fail("v2_activity_session_intro_question_ref_invalid");
      introArtifactFingerprints.add(
        rawTask.introQuestionRef.introArtifactFingerprint,
      );
      const questionId = safeId(
        rawTask.introQuestionRef.questionId,
        "v2_activity_session_intro_question_ref_invalid",
      );
      if (introQuestionIds.has(questionId))
        fail("v2_activity_session_intro_question_ref_invalid");
      introQuestionIds.add(questionId);
      const coveredConceptIds = safeIdArray(
        rawTask.introQuestionRef.coveredConceptIds,
        16,
        "v2_activity_session_intro_question_ref_invalid",
      );
      if (coveredConceptIds.length < 1)
        fail("v2_activity_session_intro_question_ref_invalid");
    } else if (rawTask.introQuestionRef !== null) {
      fail("v2_activity_session_intro_question_ref_invalid");
    }

    if (slot === 11) {
      exactKeys(
        rawTask.reviewSource,
        REVIEW_SOURCE_KEYS,
        "v2_activity_session_review_source_invalid",
      );
      const reviewOfTaskId = safeId(
        rawTask.reviewSource.reviewOfTaskId,
        "v2_activity_session_review_source_invalid",
      );
      if (
        !Number.isSafeInteger(rawTask.reviewSource.sourceSessionOrdinal) ||
        Number(rawTask.reviewSource.sourceSessionOrdinal) < 1 ||
        Number(rawTask.reviewSource.sourceSessionOrdinal) > 12
      )
        fail("v2_activity_session_review_source_invalid");
      if (rawSession.ordinal === 1) {
        if (
          rawTask.reviewSource.kind !== "same_session_bootstrap" ||
          rawTask.reviewSource.sourceSessionOrdinal !== 1
        )
          fail("v2_activity_session_review_source_invalid");
        const reviewed = earlierTasksById.get(reviewOfTaskId);
        if (!reviewed || reviewed.objectiveId !== rawTask.objectiveId)
          fail("v2_activity_session_review_source_invalid");
      } else if (
        rawTask.reviewSource.kind !== "prior_session" ||
        Number(rawTask.reviewSource.sourceSessionOrdinal) >= sessionOrdinal
      ) {
        fail("v2_activity_session_review_source_invalid");
      }
    } else if (rawTask.reviewSource !== null) {
      fail("v2_activity_session_review_source_invalid");
    }

    exactKeys(
      rawTask.learner,
      LEARNER_KEYS,
      "v2_activity_session_learner_fields_invalid",
    );
    const promptId = safeId(
      rawTask.learner.promptId,
      "v2_activity_session_prompt_id_invalid",
    );
    if (objectIds.has(promptId)) fail("v2_activity_session_prompt_id_invalid");
    objectIds.add(promptId);
    safeText(
      rawTask.learner.prompt,
      1000,
      "v2_activity_session_prompt_invalid",
    );
    safeText(
      rawTask.learner.accessibilityLabel,
      300,
      "v2_activity_session_accessibility_label_invalid",
    );
    safeIdArray(
      rawTask.learner.mediaIds,
      4,
      "v2_activity_session_media_ids_invalid",
    );
    safeIdArray(
      rawTask.learner.audioTargetIds,
      4,
      "v2_activity_session_audio_target_ids_invalid",
    );
    if (
      !Array.isArray(rawTask.learner.responseOptions) ||
      rawTask.learner.responseOptions.length < 2 ||
      rawTask.learner.responseOptions.length > 6
    )
      fail("v2_activity_session_response_options_invalid");
    const localResponseIds = new Set<string>();
    const normalizedChoiceIds = new Set<string>();
    rawTask.learner.responseOptions.forEach((option) => {
      exactKeys(
        option,
        RESPONSE_OPTION_KEYS,
        "v2_activity_session_response_option_fields_invalid",
      );
      const responseId = safeId(
        option.responseId,
        "v2_activity_session_response_id_invalid",
      );
      if (localResponseIds.has(responseId) || responseIds.has(responseId)) {
        fail("v2_activity_session_response_id_invalid");
      }
      localResponseIds.add(responseId);
      responseIds.add(responseId);
      safeText(option.text, 500, "v2_activity_session_response_text_invalid");
      const normalized = normalizeV2LocalEvaluatorResponseV1(
        "choice_token",
        responseId,
        candidate.normalizationLocale as string,
      );
      if (normalized === null || normalizedChoiceIds.has(normalized)) {
        fail("v2_activity_session_normalized_choice_id_collision");
      }
      normalizedChoiceIds.add(normalized);
    });

    const alternateRequired = SCRIPTED_ALTERNATE_REQUIRED_FAMILY_SET.has(
      rawTask.family,
    );
    if (alternateRequired !== (rawTask.scriptedAlternate !== null))
      fail("v2_activity_session_scripted_alternate_policy_invalid");
    if (rawTask.scriptedAlternate !== null) {
      exactKeys(
        rawTask.scriptedAlternate,
        ALTERNATE_KEYS,
        "v2_activity_session_scripted_alternate_fields_invalid",
      );
      const alternateId = safeId(
        rawTask.scriptedAlternate.alternateId,
        "v2_activity_session_scripted_alternate_id_invalid",
      );
      if (alternateIds.has(alternateId)) {
        fail("v2_activity_session_scripted_alternate_id_invalid");
      }
      alternateIds.add(alternateId);
      safeText(
        rawTask.scriptedAlternate.instruction,
        500,
        "v2_activity_session_scripted_alternate_instruction_invalid",
      );
      if (
        rawTask.scriptedAlternate.voiceEvidenceEquivalent !== false ||
        rawTask.scriptedAlternate.canAward !== false
      )
        fail("v2_activity_session_scripted_alternate_authority_invalid");
    }

    exactKeys(
      rawTask.evaluator,
      EVALUATOR_KEYS,
      "v2_activity_session_evaluator_fields_invalid",
    );
    const inputKind = v2LocalEvaluatorInputKindForFamilyV1(rawTask.family);
    if (
      rawTask.evaluator.inputKind !== inputKind ||
      rawTask.evaluator.normalizationRef !== V2_LOCAL_EVALUATOR_NORMALIZATION_V1
    )
      fail("v2_activity_session_classification_invalid");
    const correctResponse = safeText(
      rawTask.evaluator.correctResponse,
      512,
      "v2_activity_session_correct_response_invalid",
    );
    const acceptedResponses = safeResponseArray(
      rawTask.evaluator.acceptedResponses,
    );
    if (!acceptedResponses.includes(correctResponse)) {
      fail("v2_activity_session_accepted_responses_invalid");
    }
    const normalizedResponses = acceptedResponses.map((response) =>
      normalizeV2LocalEvaluatorResponseV1(
        inputKind,
        response,
        candidate.normalizationLocale as string,
      ),
    );
    if (
      normalizedResponses.some((value) => value === null) ||
      new Set(normalizedResponses).size !== normalizedResponses.length
    )
      fail("v2_activity_session_normalized_responses_overlap");
    if (
      inputKind === "choice_token" &&
      normalizedResponses.some(
        (value) => !normalizedChoiceIds.has(value as string),
      )
    )
      fail("v2_activity_session_accepted_responses_invalid");
    if (
      typeof rawTask.evaluator.salt !== "string" ||
      !HASH_PATTERN.test(rawTask.evaluator.salt) ||
      salts.has(rawTask.evaluator.salt)
    )
      fail("v2_activity_session_commitment_salt_invalid");
    salts.add(rawTask.evaluator.salt);

    if (slotPolicy.independent) {
      if (!taughtObjectiveIds.has(objectiveId))
        fail("v2_activity_session_independent_objective_invalid");
      if (inputKind !== "choice_token") {
        const normalizedVisible = [
          rawTask.learner.prompt,
          rawTask.learner.accessibilityLabel,
          ...(rawTask.scriptedAlternate === null
            ? []
            : [
                (
                  rawTask.scriptedAlternate as unknown as V2ActivityScriptedAlternate
                ).instruction,
              ]),
          ...rawTask.learner.responseOptions.map((option) => option.text),
        ].map((value) =>
          normalizeVisibleText(value, candidate.normalizationLocale as string),
        );
        for (const answer of normalizedResponses as string[]) {
          if (
            normalizedVisible.some((visible) =>
              visibleFieldContainsAnswer(visible, answer),
            )
          )
            fail("v2_activity_session_independent_answer_leak");
        }
        if (
          rawTask.inputMode === "ordered_tokens" &&
          (normalizedResponses as string[]).includes(
            normalizeVisibleText(
              rawTask.learner.responseOptions
                .map((option) => option.text)
                .join(" "),
              candidate.normalizationLocale as string,
            ),
          )
        )
          fail("v2_activity_session_independent_answer_leak");
      }
      const independentFingerprint = v2ActivitySemanticSurfaceFingerprintV2(
        rawTask as unknown as V2ActivityProjectionSourceTask,
        candidate.normalizationLocale as string,
      );
      if (
        Array.from(earlierTasksById.values()).some(
          (earlier) =>
            earlier.objectiveId === rawTask.objectiveId &&
            v2ActivitySemanticSurfaceFingerprintV2(
              earlier,
              candidate.normalizationLocale as string,
            ) === independentFingerprint,
        )
      )
        fail("v2_activity_session_independent_surface_not_varied");
    }
    if (slot <= 9) taughtObjectiveIds.add(objectiveId);
    earlierTasksById.set(
      taskId,
      rawTask as unknown as V2ActivityProjectionSourceTask,
    );
  });

  if (introArtifactFingerprints.size !== 1 || introQuestionIds.size !== 3)
    fail("v2_activity_session_intro_question_ref_invalid");

  if (sessionFamilies.size < 3 || sessionFamilies.size > 4) {
    fail("v2_activity_session_family_distribution_invalid");
  }
}

export const parseV2ActivitySessionProjectionSource = (
  raw: string,
): V2ActivitySessionProjectionSource => {
  if (typeof raw !== "string") fail("v2_activity_session_source_raw_invalid");
  if (
    raw.length > V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES ||
    utf8ByteLengthV1(raw) > V2_ACTIVITY_SESSION_SOURCE_MAX_BYTES
  )
    fail("v2_activity_session_source_too_large");
  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    fail("v2_activity_session_source_json_invalid");
  }
  validateSource(candidate);
  if (canonicalJsonV1(candidate) !== raw) {
    fail("v2_activity_session_source_noncanonical");
  }
  deepFreeze(candidate);
  trustedSources.add(candidate);
  return candidate;
};

const copyLearner = (
  source: V2ActivityLearnerPayload,
): V2ActivityLearnerPayload =>
  Object.freeze({
    promptId: source.promptId,
    prompt: source.prompt,
    responseOptions: Object.freeze(
      source.responseOptions.map((option) => Object.freeze({ ...option })),
    ),
    mediaIds: Object.freeze([...source.mediaIds]),
    audioTargetIds: Object.freeze([...source.audioTargetIds]),
    accessibilityLabel: source.accessibilityLabel,
  });

const copyAlternate = (
  source: V2ActivityScriptedAlternate | null,
): V2ActivityScriptedAlternate | null =>
  source === null
    ? null
    : Object.freeze({
        alternateId: source.alternateId,
        instruction: source.instruction,
        voiceEvidenceEquivalent: false,
        canAward: false,
      });

function boundedCanonical(value: unknown, maximum: number, code: string): void {
  if (utf8ByteLengthV1(canonicalJsonV1(value)) > maximum) fail(code);
}

export const buildV2ActivitySessionProjection = (
  source: V2ActivitySessionProjectionSource,
): V2ActivitySessionProjectionArtifacts => {
  if (!isRecord(source) || !trustedSources.has(source)) {
    fail("v2_activity_session_source_untrusted");
  }
  const sourceFingerprint = hashCanonicalBody(source);
  const renderTasks: V2ActivityRenderTask[] = [];
  const capsuleRaws: string[] = [];
  const sidecarTasks: V2ActivityServerSidecarTask[] = [];

  for (const task of source.session.tasks) {
    const inputKind = v2LocalEvaluatorInputKindForFamilyV1(task.family);
    const commitmentInput = {
      capsuleId: task.localEvaluatorCapsuleId,
      taskId: task.taskId,
      activityId: task.activityId,
      family: task.family,
      inputKind,
      normalizationLocale: source.normalizationLocale,
      normalizationProfileHash: source.normalizationProfileHash,
      salt: task.evaluator.salt,
    };
    const acceptedCommitments = task.evaluator.acceptedResponses
      .map((response) =>
        createV2LocalEvaluatorCommitmentV1({
          ...commitmentInput,
          response,
        }),
      )
      .sort();
    if (new Set(acceptedCommitments).size !== acceptedCommitments.length) {
      fail("v2_activity_session_normalized_responses_overlap");
    }
    const capsuleRaw = buildV2LocalEvaluatorCapsuleRawV1({
      ...commitmentInput,
      acceptedCommitments,
    });
    capsuleRaws.push(capsuleRaw);
    renderTasks.push(
      Object.freeze({
        taskId: task.taskId,
        slot: task.slot,
        purpose: task.purpose,
        family: task.family,
        answerExposure: task.answerExposure,
        promptNovelty: task.promptNovelty,
        inputMode: task.inputMode,
        support: task.support,
        hintsAllowed: task.hintsAllowed,
        learner: copyLearner(task.learner),
        scriptedAlternate: copyAlternate(task.scriptedAlternate),
        runtimeCapabilityId: CLASSIFICATIONS[task.family].runtimeCapabilityId,
      }),
    );
    sidecarTasks.push(
      Object.freeze({
        ...commitmentInput,
        normalizationRef: V2_LOCAL_EVALUATOR_NORMALIZATION_V1,
        correctResponse: task.evaluator.correctResponse,
        acceptedResponses: Object.freeze([...task.evaluator.acceptedResponses]),
        acceptedCommitments: Object.freeze([...acceptedCommitments]),
      }),
    );
  }

  const sidecarRecomputedCapsules = sidecarTasks.map((task) =>
    buildV2LocalEvaluatorCapsuleRawV1({
      capsuleId: task.capsuleId,
      taskId: task.taskId,
      activityId: task.activityId,
      family: task.family,
      inputKind: task.inputKind,
      normalizationLocale: task.normalizationLocale,
      normalizationProfileHash: task.normalizationProfileHash,
      salt: task.salt,
      acceptedCommitments: task.acceptedCommitments,
    }),
  );
  if (
    canonicalJsonV1(sidecarRecomputedCapsules) !== canonicalJsonV1(capsuleRaws)
  ) {
    fail("v2_activity_session_capsule_sidecar_mismatch");
  }

  const commitmentAggregate = hashCanonicalBody({
    schemaVersion: "v2-activity-session-commitment-aggregate.v2",
    sourceFingerprint,
    sessionId: source.session.sessionId,
    capsules: capsuleRaws,
  });
  const renderSeed = deepFreeze({
    schemaVersion: V2_ACTIVITY_SESSION_RENDER_SCHEMA_V2,
    sourceFingerprint,
    episodeId: source.episodeId,
    targetLanguage: source.targetLanguage,
    session: {
      sessionId: source.session.sessionId,
      ordinal: source.session.ordinal,
      zone: source.session.zone,
      targetSeconds: source.session.targetSeconds,
      tasks: renderTasks,
    },
    executionAuthority: "none" as const,
    rewardAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseAuthority: false as const,
  }) as V2ActivitySessionRenderSeed;
  const appLocalCapsuleEnvelope = deepFreeze({
    schemaVersion: V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_SCHEMA_V1,
    sourceFingerprint,
    episodeId: source.episodeId,
    sessionId: source.session.sessionId,
    sessionOrdinal: source.session.ordinal,
    normalizationLocale: source.normalizationLocale,
    normalizationProfileHash: source.normalizationProfileHash,
    capsules: capsuleRaws,
    commitmentAggregate,
    consumer: "app_internal_local_evaluator_only" as const,
    verdictAuthority: "local_provisional_only" as const,
  }) as V2ActivitySessionCapsuleEnvelopeV1;
  const serverSidecar = deepFreeze({
    schemaVersion: V2_ACTIVITY_SESSION_SIDECAR_SCHEMA_V2,
    sourceFingerprint,
    episodeId: source.episodeId,
    sessionId: source.session.sessionId,
    sessionOrdinal: source.session.ordinal,
    tasks: sidecarTasks,
    commitmentAggregate,
    serverOnly: true as const,
    evaluationAuthority: "none" as const,
    rewardAuthority: "none" as const,
    releaseAuthority: false as const,
  }) as V2ActivitySessionServerSidecar;

  boundedCanonical(
    renderSeed,
    V2_ACTIVITY_SESSION_RENDER_MAX_BYTES,
    "v2_activity_session_render_seed_too_large",
  );
  boundedCanonical(
    appLocalCapsuleEnvelope,
    V2_ACTIVITY_SESSION_CAPSULE_ENVELOPE_MAX_BYTES,
    "v2_activity_session_capsule_too_large",
  );
  boundedCanonical(
    serverSidecar,
    V2_ACTIVITY_SESSION_SIDECAR_MAX_BYTES,
    "v2_activity_session_sidecar_too_large",
  );
  const artifacts = Object.freeze({
    renderSeed,
    appLocalCapsuleEnvelope,
    serverSidecar,
  });
  trustedArtifacts.add(artifacts);
  return artifacts;
};

export const assembleV2ActivityEpisodeProjectionV1 = (
  sources: readonly V2ActivitySessionProjectionSource[],
): V2ActivityEpisodeProjectionAssemblyV1 => {
  if (!Array.isArray(sources) || sources.length !== 12) {
    fail("v2_activity_episode_session_count_invalid");
  }
  const first = sources[0];
  if (!first || !trustedSources.has(first)) {
    fail("v2_activity_episode_source_untrusted");
  }
  const identities = new Set<string>();
  const families = new Set<V2ActivityFamily>();
  const tasksById = new Map<
    string,
    {
      readonly task: V2ActivityProjectionSourceTask;
      readonly sessionOrdinal: number;
    }
  >();
  const surfaces = new Map<
    string,
    {
      readonly taskId: string;
      readonly sessionOrdinal: number;
    }
  >();
  const artifacts = sources.map((source, index) => {
    if (
      !trustedSources.has(source) ||
      source.episodeId !== first.episodeId ||
      source.targetLanguage !== first.targetLanguage ||
      source.normalizationLocale !== first.normalizationLocale ||
      source.normalizationProfileHash !== first.normalizationProfileHash ||
      source.session.ordinal !== index + 1
    )
      fail("v2_activity_episode_source_identity_invalid");
    for (const task of source.session.tasks) {
      families.add(task.family);
      for (const identity of [
        task.taskId,
        task.activityId,
        task.localEvaluatorCapsuleId,
        task.learner.promptId,
        ...(task.scriptedAlternate === null
          ? []
          : [task.scriptedAlternate.alternateId]),
      ]) {
        if (identities.has(identity)) {
          fail("v2_activity_episode_execution_identity_invalid");
        }
        identities.add(identity);
      }
      if (task.purpose === "interleaved_review") {
        if (task.reviewSource === null)
          fail("v2_activity_episode_review_source_invalid");
        const reviewed = tasksById.get(task.reviewSource.reviewOfTaskId);
        if (
          !reviewed ||
          reviewed.task.objectiveId !== task.objectiveId ||
          reviewed.sessionOrdinal !== task.reviewSource.sourceSessionOrdinal
        )
          fail("v2_activity_episode_review_source_invalid");
        if (source.session.ordinal === 1) {
          if (
            task.reviewSource.kind !== "same_session_bootstrap" ||
            reviewed.sessionOrdinal !== 1 ||
            reviewed.task.slot >= task.slot
          )
            fail("v2_activity_episode_review_source_invalid");
        } else if (
          task.reviewSource.kind !== "prior_session" ||
          reviewed.sessionOrdinal >= source.session.ordinal
        ) {
          fail("v2_activity_episode_review_source_invalid");
        }
      }
      const surfaceFingerprint = v2ActivitySemanticSurfaceFingerprintV2(
        task,
        source.normalizationLocale,
      );
      const priorSurface = surfaces.get(surfaceFingerprint);
      if (
        priorSurface &&
        (task.purpose !== "interleaved_review" ||
          task.reviewSource === null ||
          task.reviewSource.reviewOfTaskId !== priorSurface.taskId ||
          task.reviewSource.sourceSessionOrdinal !==
            priorSurface.sessionOrdinal)
      )
        fail("v2_activity_episode_duplicate_semantic_surface");
      if (!priorSurface) {
        surfaces.set(surfaceFingerprint, {
          taskId: task.taskId,
          sessionOrdinal: source.session.ordinal,
        });
      }
      tasksById.set(task.taskId, {
        task,
        sessionOrdinal: source.session.ordinal,
      });
    }
    return buildV2ActivitySessionProjection(source);
  });
  if (families.size !== V2_ACTIVITY_FAMILIES.length) {
    fail("v2_activity_episode_family_coverage_invalid");
  }
  const body = deepFreeze({
    schemaVersion: V2_ACTIVITY_EPISODE_ASSEMBLY_SCHEMA_V1,
    episodeId: first.episodeId,
    targetLanguage: first.targetLanguage,
    normalizationLocale: first.normalizationLocale,
    normalizationProfileHash: first.normalizationProfileHash,
    sessionCount: 12 as const,
    taskCount: 144 as const,
    sessions: artifacts,
  });
  return deepFreeze({
    ...body,
    assemblyFingerprint: hashCanonicalBody(body),
  }) as V2ActivityEpisodeProjectionAssemblyV1;
};

export const isV2ActivitySessionProjectionArtifacts = (
  value: unknown,
): value is V2ActivitySessionProjectionArtifacts =>
  typeof value === "object" && value !== null && trustedArtifacts.has(value);
