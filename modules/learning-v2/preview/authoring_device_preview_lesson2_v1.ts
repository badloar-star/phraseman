import type { LearningV2InterfaceLocale } from "../content/generator_course_contract";
import { authoredLearningV2Episode02SessionSource } from "../content/source/authored_episode_02_sessions_v1";
import {
  LESSON2_AUTHORING_REGISTRY_V1,
} from "../content/source/lesson2_authoring_registry_v1";
import type { Lesson1AuthoringStatusV1 } from "../content/source/lesson1_authoring_registry_v1";
import { buildSessionChildBodiesFromShard } from "../content/source/session_package_from_shard_v1";
import { buildSessionShardFromSource } from "../content/source/session_shard_from_source_v1";
import type {
  LearningV2CourseSessionAuxiliaryChildV1,
  LearningV2CourseSessionIntroChildV1,
  LearningV2CourseSessionLearnerChildV1,
} from "../runtime/course_session_client_children_v1";
import type { LearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../runtime/course_session_evaluator_capsule_child_v1";
import { LEARNING_V2_AUTHORING_DEVICE_PREVIEW_SCHEMA_V1 } from "./authoring_device_preview_v1";

export type LearningV2AuthoringDevicePreviewLesson2RowV1 = Readonly<{
  lessonOrdinal: 2;
  sessionOrdinal: number;
  status: Lesson1AuthoringStatusV1;
  openable: true;
}>;

export function learningV2AuthoringDevicePreviewLesson2RowsV1(): readonly LearningV2AuthoringDevicePreviewLesson2RowV1[] {
  const currentIndex = LESSON2_AUTHORING_REGISTRY_V1.findIndex((entry) => entry.status !== "LOCKED");
  const lastVisibleIndex = currentIndex === -1
    ? LESSON2_AUTHORING_REGISTRY_V1.length - 1
    : currentIndex;
  return Object.freeze(
    LESSON2_AUTHORING_REGISTRY_V1.slice(0, lastVisibleIndex + 1).map((entry) => Object.freeze({
      lessonOrdinal: 2 as const,
      sessionOrdinal: entry.sessionOrdinal,
      status: entry.status,
      openable: true as const,
    })),
  );
}

const PREVIEW_FINGERPRINT = "0".repeat(64);

export type LearningV2AuthoringDevicePreviewLesson2V1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_AUTHORING_DEVICE_PREVIEW_SCHEMA_V1;
  targetLanguage: "en";
  lessonOrdinal: 2;
  sessionOrdinal: number;
  status: Lesson1AuthoringStatusV1;
  releaseId: "authoring-preview-lesson-02";
  activeRootFingerprint: string;
  activeHeadFingerprint: string;
  lessonId: "lesson-02";
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

export function buildLearningV2AuthoringDevicePreviewLesson2V1(
  sessionOrdinal: number,
  interfaceLocale: LearningV2InterfaceLocale,
): LearningV2AuthoringDevicePreviewLesson2V1 {
  const row = learningV2AuthoringDevicePreviewLesson2RowsV1().find(
    (entry) => entry.sessionOrdinal === sessionOrdinal,
  );
  if (!row) {
    throw new Error(`learning_v2_lesson2_authoring_device_preview_forbidden:session=${sessionOrdinal}`);
  }
  const source = authoredLearningV2Episode02SessionSource(sessionOrdinal);
  if (!source) {
    throw new Error(`learning_v2_lesson2_authoring_device_preview_source_missing:session=${sessionOrdinal}`);
  }
  const shard = buildSessionShardFromSource(source);
  const courseSessionId = `lesson-02:session:${String(sessionOrdinal).padStart(2, "0")}`;
  const children = buildSessionChildBodiesFromShard(
    shard,
    interfaceLocale,
    courseSessionId,
  ) as Readonly<{
    intro: LearningV2CourseSessionIntroChildV1;
    learner: LearningV2CourseSessionLearnerChildV1;
    evaluatorCapsule: LearningV2CourseSessionEvaluatorCapsuleChildV1;
    auxiliary: LearningV2CourseSessionAuxiliaryChildV1;
  }>;

  return Object.freeze({
    schemaVersion: LEARNING_V2_AUTHORING_DEVICE_PREVIEW_SCHEMA_V1,
    targetLanguage: "en" as const,
    lessonOrdinal: 2 as const,
    sessionOrdinal,
    status: row.status,
    releaseId: "authoring-preview-lesson-02" as const,
    activeRootFingerprint: PREVIEW_FINGERPRINT,
    activeHeadFingerprint: PREVIEW_FINGERPRINT,
    lessonId: "lesson-02" as const,
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

