import type { LearningV2InterfaceLocale } from "../content/generator_course_contract";
import {
  LESSON1_AUTHORING_REGISTRY_V1,
  type Lesson1AuthoringStatusV1,
} from "../content/source/lesson1_authoring_registry_v1";
import { authoredLearningV2SessionSource } from "../content/source/authored_sessions_v1";
import { buildSessionShardFromSource } from "../content/source/session_shard_from_source_v1";
import { buildSessionChildBodiesFromShard } from "../content/source/session_package_from_shard_v1";
import type {
  LearningV2CourseSessionAuxiliaryChildV1,
  LearningV2CourseSessionIntroChildV1,
  LearningV2CourseSessionLearnerChildV1,
  LearningV2CourseSessionPracticeInteractionV1,
} from "../runtime/course_session_client_children_v1";
import type { LearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../runtime/course_session_evaluator_capsule_child_v1";

export const LEARNING_V2_AUTHORING_DEVICE_PREVIEW_SCHEMA_V1 =
  "learning-v2-authoring-device-preview.v1" as const;

export type LearningV2AuthoringDevicePreviewRowV1 = Readonly<{
  lessonOrdinal: 1;
  sessionOrdinal: number;
  status: Lesson1AuthoringStatusV1;
  openable: true;
}>;

/**
 * Review never jumps ahead of authoring. The owner may revisit the immutable
 * locked prefix and may inspect the single current candidate; every later
 * ordinal stays outside the mobile preview route.
 */
export function learningV2AuthoringDevicePreviewRowsV1(): readonly LearningV2AuthoringDevicePreviewRowV1[] {
  const currentIndex = LESSON1_AUTHORING_REGISTRY_V1.findIndex(
    (entry) => entry.status !== "LOCKED",
  );
  const lastVisibleIndex =
    currentIndex === -1
      ? LESSON1_AUTHORING_REGISTRY_V1.length - 1
      : currentIndex;
  return Object.freeze(
    LESSON1_AUTHORING_REGISTRY_V1.slice(0, lastVisibleIndex + 1).map((entry) =>
      Object.freeze({
        lessonOrdinal: 1 as const,
        sessionOrdinal: entry.sessionOrdinal,
        status: entry.status,
        openable: true as const,
      }),
    ),
  );
}

export type LearningV2AuthoringDevicePreviewV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_AUTHORING_DEVICE_PREVIEW_SCHEMA_V1;
  targetLanguage: "en";
  lessonOrdinal: 1;
  sessionOrdinal: number;
  status: Lesson1AuthoringStatusV1;
  releaseId: "authoring-preview-lesson-01";
  activeRootFingerprint: string;
  activeHeadFingerprint: string;
  lessonId: "lesson-01";
  courseSessionId: string;
  packageFingerprint: string;
  childSetFingerprint: string;
  introChild: LearningV2CourseSessionIntroChildV1;
  learnerChild: LearningV2CourseSessionLearnerChildV1;
  evaluatorCapsuleChild: LearningV2CourseSessionEvaluatorCapsuleChildV1;
  auxiliaryChild: LearningV2CourseSessionAuxiliaryChildV1;
  audioReadiness: "published_audio_or_device_tts_preview_fallback";
  sideEffectPolicy: "preview_only_no_learner_writes";
}>;

const PREVIEW_FINGERPRINT = "0".repeat(64);

/**
 * DEV-preview may run before the immutable audio child is published. The phone
 * still needs a real, audible review path, so we derive the exact text that is
 * already present in the mode-native payload and let the existing device TTS
 * pipeline pronounce it. This never invents an audio ref and never mutates the
 * authoring package; published audio remains the production authority.
 */
export function resolveLearningV2AuthoringPreviewSpeechTextV1(
  interaction: LearningV2CourseSessionPracticeInteractionV1,
): string | null {
  const payload = interaction.modePayload;
  if (!payload) return null;
  if (payload.family === "listen_choose") {
    if (payload.referenceAudio?.transcript.trim()) {
      return payload.referenceAudio.transcript.trim();
    }
    const correctResponseId = payload.choiceFeedback.find(
      (entry) => entry.correct,
    )?.responseId;
    return (
      payload.localizedMeaningChoices.find(
        (entry) => entry.responseId === correctResponseId,
      )?.targetText.trim() || null
    );
  }
  if (payload.family === "listen_build_dictation") {
    return (
      payload.referenceAudio?.transcript.trim() ||
      payload.hiddenTargetPhrase.trim() ||
      null
    );
  }
  if (payload.family === "scripted_repeat_compare") {
    return (
      payload.referenceAudio?.transcript.trim() ||
      payload.targetPhrase.trim() ||
      null
    );
  }
  return null;
}

function buildLearningV2AuthoringDevicePreviewFromSourceV1(
  sessionOrdinal: number,
  interfaceLocale: LearningV2InterfaceLocale,
  status: Lesson1AuthoringStatusV1,
  allowUnavailableAuthoredChoiceTargets = false,
): LearningV2AuthoringDevicePreviewV1 {
  const source = authoredLearningV2SessionSource(sessionOrdinal);
  if (!source) {
    throw new Error(
      `learning_v2_authoring_device_preview_source_missing:session=${sessionOrdinal}`,
    );
  }
  const shard = buildSessionShardFromSource(source);
  const courseSessionId = `lesson-01:session:${String(sessionOrdinal).padStart(2, "0")}`;
  const children = buildSessionChildBodiesFromShard(
    shard,
    interfaceLocale,
    courseSessionId,
    allowUnavailableAuthoredChoiceTargets
      ? { allowUnavailableAuthoredChoiceTargets: true }
      : undefined,
  ) as Readonly<{
    intro: LearningV2CourseSessionIntroChildV1;
    learner: LearningV2CourseSessionLearnerChildV1;
    evaluatorCapsule: LearningV2CourseSessionEvaluatorCapsuleChildV1;
    auxiliary: LearningV2CourseSessionAuxiliaryChildV1;
  }>;

  return Object.freeze({
    schemaVersion: LEARNING_V2_AUTHORING_DEVICE_PREVIEW_SCHEMA_V1,
    targetLanguage: "en" as const,
    lessonOrdinal: 1 as const,
    sessionOrdinal,
    status,
    releaseId: "authoring-preview-lesson-01" as const,
    activeRootFingerprint: PREVIEW_FINGERPRINT,
    activeHeadFingerprint: PREVIEW_FINGERPRINT,
    lessonId: "lesson-01" as const,
    courseSessionId,
    packageFingerprint: PREVIEW_FINGERPRINT,
    childSetFingerprint: PREVIEW_FINGERPRINT,
    introChild: children.intro,
    learnerChild: children.learner,
    evaluatorCapsuleChild: children.evaluatorCapsule,
    auxiliaryChild: children.auxiliary,
    audioReadiness: "published_audio_or_device_tts_preview_fallback" as const,
    sideEffectPolicy: "preview_only_no_learner_writes" as const,
  });
}

export function buildLearningV2AuthoringDevicePreviewV1(
  sessionOrdinal: number,
  interfaceLocale: LearningV2InterfaceLocale,
): LearningV2AuthoringDevicePreviewV1 {
  const row = learningV2AuthoringDevicePreviewRowsV1().find(
    (entry) => entry.sessionOrdinal === sessionOrdinal,
  );
  if (!row) {
    throw new Error(
      `learning_v2_authoring_device_preview_forbidden:session=${sessionOrdinal}`,
    );
  }
  return buildLearningV2AuthoringDevicePreviewFromSourceV1(
    sessionOrdinal,
    interfaceLocale,
    row.status,
  );
}

/**
 * Explicitly unsafe DEV-only review path used by the map toggle. It exposes
 * existing drafts without promoting them, writing learner progress, or
 * weakening the normal owner-review boundary above. Call sites must hard-gate
 * this function with React Native's compile-time `__DEV__` literal.
 */
export function buildLearningV2DevUnlockedDraftDevicePreviewV1(
  sessionOrdinal: number,
  interfaceLocale: LearningV2InterfaceLocale,
): LearningV2AuthoringDevicePreviewV1 {
  const row = LESSON1_AUTHORING_REGISTRY_V1.find(
    (entry) => entry.sessionOrdinal === sessionOrdinal,
  );
  if (!row) {
    throw new Error(
      `learning_v2_dev_unlocked_draft_preview_missing:session=${sessionOrdinal}`,
    );
  }
  return buildLearningV2AuthoringDevicePreviewFromSourceV1(
    sessionOrdinal,
    interfaceLocale,
    row.status,
    true,
  );
}
