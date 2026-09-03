import type { LearningV2InterfaceLocale } from "../content/generator_course_contract";
import { authoredLearningV2Episode03SessionSource } from "../content/source/authored_episode_03_sessions_v1";
import { LESSON3_AUTHORING_REGISTRY_V1 } from "../content/source/lesson3_authoring_registry_v1";
import type { Lesson1AuthoringStatusV1 } from "../content/source/lesson1_authoring_registry_v1";
import { buildSessionChildBodiesFromShard } from "../content/source/session_package_from_shard_v1";
import { buildSessionShardFromSource } from "../content/source/session_shard_from_source_v1";
import type { LearningV2CourseSessionAuxiliaryChildV1, LearningV2CourseSessionIntroChildV1, LearningV2CourseSessionLearnerChildV1 } from "../runtime/course_session_client_children_v1";
import type { LearningV2CourseSessionEvaluatorCapsuleChildV1 } from "../runtime/course_session_evaluator_capsule_child_v1";
import { LEARNING_V2_AUTHORING_DEVICE_PREVIEW_SCHEMA_V1 } from "./authoring_device_preview_v1";

export function learningV2AuthoringDevicePreviewLesson3RowsV1(): readonly Readonly<{lessonOrdinal:3;sessionOrdinal:number;status:Lesson1AuthoringStatusV1;openable:true}>[] {
  const current=LESSON3_AUTHORING_REGISTRY_V1.findIndex((entry)=>entry.status!=="LOCKED");
  const last=current===-1?LESSON3_AUTHORING_REGISTRY_V1.length-1:current;
  return Object.freeze(LESSON3_AUTHORING_REGISTRY_V1.slice(0,last+1).map((entry)=>Object.freeze({lessonOrdinal:3 as const,sessionOrdinal:entry.sessionOrdinal,status:entry.status,openable:true as const})));
}

export function buildLearningV2AuthoringDevicePreviewLesson3V1(sessionOrdinal:number, interfaceLocale:LearningV2InterfaceLocale): Readonly<{schemaVersion:typeof LEARNING_V2_AUTHORING_DEVICE_PREVIEW_SCHEMA_V1;targetLanguage:"en";lessonOrdinal:3;sessionOrdinal:number;status:Lesson1AuthoringStatusV1;releaseId:"authoring-preview-lesson-03";activeRootFingerprint:string;activeHeadFingerprint:string;lessonId:"lesson-03";courseSessionId:string;packageFingerprint:string;childSetFingerprint:string;introChild:LearningV2CourseSessionIntroChildV1;learnerChild:LearningV2CourseSessionLearnerChildV1;evaluatorCapsuleChild:LearningV2CourseSessionEvaluatorCapsuleChildV1;auxiliaryChild:LearningV2CourseSessionAuxiliaryChildV1;audioReadiness:"published_audio_or_device_tts_preview_fallback";sideEffectPolicy:"preview_only_no_learner_writes"}> {
  const row=learningV2AuthoringDevicePreviewLesson3RowsV1().find((entry)=>entry.sessionOrdinal===sessionOrdinal);
  if(!row) throw new Error(`learning_v2_lesson3_authoring_device_preview_forbidden:session=${sessionOrdinal}`);
  const source=authoredLearningV2Episode03SessionSource(sessionOrdinal);
  if(!source) throw new Error(`learning_v2_lesson3_authoring_device_preview_source_missing:session=${sessionOrdinal}`);
  const courseSessionId=`lesson-03:session:${String(sessionOrdinal).padStart(2,"0")}`;
  const children=buildSessionChildBodiesFromShard(buildSessionShardFromSource(source),interfaceLocale,courseSessionId) as Readonly<{intro:LearningV2CourseSessionIntroChildV1;learner:LearningV2CourseSessionLearnerChildV1;evaluatorCapsule:LearningV2CourseSessionEvaluatorCapsuleChildV1;auxiliary:LearningV2CourseSessionAuxiliaryChildV1}>;
  const zero="0".repeat(64);
  return Object.freeze({schemaVersion:LEARNING_V2_AUTHORING_DEVICE_PREVIEW_SCHEMA_V1,targetLanguage:"en" as const,lessonOrdinal:3 as const,sessionOrdinal,status:row.status,releaseId:"authoring-preview-lesson-03" as const,activeRootFingerprint:zero,activeHeadFingerprint:zero,lessonId:"lesson-03" as const,courseSessionId,packageFingerprint:zero,childSetFingerprint:zero,introChild:children.intro,learnerChild:children.learner,evaluatorCapsuleChild:children.evaluatorCapsule,auxiliaryChild:children.auxiliary,audioReadiness:"published_audio_or_device_tts_preview_fallback" as const,sideEffectPolicy:"preview_only_no_learner_writes" as const});
}
