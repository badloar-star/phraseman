import { createHash } from "node:crypto";
import {
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseLessonIdV1,
  learningV2CourseSessionIdV1,
} from "../../../modules/learning-v2/content/course_topology_v1";
import {
  LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1,
  encodeLearningV2CourseSessionAudioChildV1,
  parseLearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioChildV1,
} from "../../../modules/learning-v2/runtime/course_session_audio_child_v1";
import {
  LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_MAX_BYTES_V1,
  encodeLearningV2CourseSessionAudioReleaseExtensionV1,
  learningV2CourseSessionAudioReleaseExtensionObjectPathV1,
  parseLearningV2CourseSessionAudioReleaseExtensionV1,
  type LearningV2CourseSessionAudioReleaseExtensionV1,
} from "../../../modules/learning-v2/runtime/course_session_audio_release_extension_v1";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import type {
  V2RepositoryImmutableObjectPinV1,
  V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  loadV2CourseReleasedSessionBaseMaterialV2,
  type V2CourseReleasedSessionMaterialV2,
} from "./v2_course_released_session_adapter_v2";
import {
  isV2UnifiedCourseReleaseActiveHandleV3,
  resolveV2UnifiedCourseReleaseActiveMaterialV3,
  type V2UnifiedCourseReleaseActiveHandleV3,
} from "./v2_unified_course_release_repository_v3";

export const V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V3 =
  "v2-course-released-session-summary.v3" as const;

export interface V2CourseReleasedSessionHandleV3 {
  readonly kind: "v2_course_released_session_handle_v3";
}

export interface V2CourseReleasedSessionSummaryV3 {
  readonly schemaVersion: typeof V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V3;
  readonly releaseId: string;
  readonly activeRootFingerprint: string;
  readonly activeBaseRootFingerprint: string;
  readonly activeHeadFingerprint: string;
  readonly topologyFingerprint: string;
  readonly lessonId: string;
  readonly lessonOrdinal: number;
  readonly baseLessonIndexFingerprint: string;
  readonly audioLessonIndexFingerprint: string;
  readonly courseSessionId: string;
  readonly sessionOrdinal: number;
  readonly packageFingerprint: string;
  readonly childSetFingerprint: string;
  readonly learnerFingerprint: string;
  readonly audioExtensionFingerprint: string;
  readonly audioFingerprint: string;
  readonly baseProjectionBinding: "exact_v3_composite_head_base_root_lesson_index_session_package_join";
  readonly audioProjectionBinding: "exact_v3_audio_index_extension_audio_child_join";
  readonly storageIntegrity: "exact_generation_hash_size_content_type_readback";
  readonly learnerProjection: "intro_learner_capsule_auxiliary_audio_child_only";
  readonly evaluatorIsolation: "server_sidecar_not_exposed";
  readonly playbackPreparation: "client_generation_pinned_mp3_prefetch_required_before_session";
  readonly taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words";
  readonly serverRequestPerPlayback: false;
  readonly remoteTtsFallbackDuringSession: false;
  readonly answerPayload: "absent";
  readonly correctnessAuthority: "local_device_only";
  readonly serverAnswerAuthority: "none_answers_never_transported_or_rechecked";
  readonly repositoryOriginAuthority: "active_v3_composite_repository_head_and_generation_pinned_objects";
  readonly runtimeAuthority: "active_release_session_projection_only";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly releaseAuthority: false;
}

export interface V2CourseReleasedSessionMaterialV3 {
  readonly summary: V2CourseReleasedSessionSummaryV3;
  readonly base: V2CourseReleasedSessionMaterialV2;
  readonly audioExtension: LearningV2CourseSessionAudioReleaseExtensionV1;
  readonly audioChild: LearningV2CourseSessionAudioChildV1;
  readonly canonicalAudioChildRaw: string;
  readonly evaluatorSidecarRawExposed: false;
  readonly answerPayloadExposed: false;
}

export type V2CourseReleasedSessionInputV3 = Readonly<{
  activeHandle: V2UnifiedCourseReleaseActiveHandleV3;
  lessonOrdinal: number;
  sessionOrdinal: number;
}>;

export interface V2CourseReleasedSessionAdapterV3 {
  load(
    input: V2CourseReleasedSessionInputV3,
  ): Promise<V2CourseReleasedSessionHandleV3>;
}

const handles = new WeakSet<object>();
const materials = new WeakMap<object, V2CourseReleasedSessionMaterialV3>();

function fail(code: string): never {
  throw new Error(`v2_course_released_session_v3_${code}`);
}

function exactOrdinal(value: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum)
    fail("coordinate_invalid");
  return value;
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readExactJson(
  storage: V2RepositoryImmutableStoragePortV1,
  pin: V2RepositoryImmutableObjectPinV1,
  maximumBytes: number,
  kind: string,
): Promise<string> {
  if (pin.byteSize < 2 || pin.byteSize > maximumBytes)
    fail(`${kind}_pin_oversize`);
  const metadata = await storage.readMetadataExact(pin.objectPath);
  if (
    !metadata ||
    metadata.generation !== pin.objectGeneration ||
    metadata.byteSize !== pin.byteSize ||
    metadata.contentHash !== pin.contentHash ||
    metadata.contentType !== pin.contentType
  )
    fail(`${kind}_metadata_mismatch`);
  const result = await storage.downloadGenerationExact({
    objectPath: pin.objectPath,
    ifGenerationMatch: pin.objectGeneration,
    maximumBytes,
  });
  if (
    result.kind !== "downloaded" ||
    !(result.bytes instanceof Uint8Array) ||
    result.bytes.byteLength !== pin.byteSize ||
    sha256Bytes(result.bytes) !== pin.contentHash
  )
    fail(`${kind}_bytes_mismatch`);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(result.bytes);
  } catch {
    fail(`${kind}_utf8_invalid`);
  }
}

export function createV2CourseReleasedSessionAdapterV3(input: {
  readonly storage: V2RepositoryImmutableStoragePortV1;
}): V2CourseReleasedSessionAdapterV3 {
  if (!input || typeof input !== "object" || !input.storage)
    fail("ports_invalid");
  const { storage } = input;
  return Object.freeze({
    load: async (request: V2CourseReleasedSessionInputV3) => {
      if (!isV2UnifiedCourseReleaseActiveHandleV3(request.activeHandle))
        fail("active_handle_invalid");
      const lessonOrdinal = exactOrdinal(
        request.lessonOrdinal,
        LEARNING_V2_COURSE_LESSON_COUNT_V1,
      );
      const sessionOrdinal = exactOrdinal(
        request.sessionOrdinal,
        LEARNING_V2_LESSON_SESSION_COUNT_V1,
      );
      const active = resolveV2UnifiedCourseReleaseActiveMaterialV3(
        request.activeHandle,
      );
      const expectedLessonId = learningV2CourseLessonIdV1(lessonOrdinal);
      const expectedCourseSessionId = learningV2CourseSessionIdV1(
        lessonOrdinal,
        sessionOrdinal,
      );
      const rootLesson = active.root.lessons[lessonOrdinal - 1];
      const audioIndex = active.audioIndexes[lessonOrdinal - 1];
      if (
        !rootLesson ||
        !audioIndex ||
        rootLesson.lessonId !== expectedLessonId ||
        audioIndex.lessonId !== expectedLessonId ||
        audioIndex.lessonOrdinal !== lessonOrdinal ||
        audioIndex.indexFingerprint !== rootLesson.audioIndexFingerprint
      )
        fail("audio_lesson_missing");
      const base = await loadV2CourseReleasedSessionBaseMaterialV2({
        storage,
        root: active.baseRoot,
        activeRootFingerprint: active.root.rootFingerprint,
        activeHeadFingerprint: active.head.headFingerprint,
        lessonOrdinal,
        sessionOrdinal,
        activeReleaseBinding:
          "exact_v3_composite_head_base_root_lesson_index_session_package_join",
        repositoryOriginAuthority:
          "active_v3_composite_repository_head_and_generation_pinned_objects",
      });
      const audioSession = audioIndex.sessions[sessionOrdinal - 1];
      if (
        !audioSession ||
        audioSession.courseSessionId !== expectedCourseSessionId ||
        audioSession.basePackageFingerprint !==
          base.summary.packageFingerprint ||
        audioSession.baseChildSetFingerprint !==
          base.summary.childSetFingerprint ||
        audioSession.learnerFingerprint !== base.learnerChild.learnerFingerprint
      )
        fail("audio_session_join_mismatch");
      const extensionRaw = await readExactJson(
        storage,
        audioSession.extensionPin,
        LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_MAX_BYTES_V1,
        "audio_extension",
      );
      const extension =
        parseLearningV2CourseSessionAudioReleaseExtensionV1(extensionRaw);
      const expectedExtensionPath =
        learningV2CourseSessionAudioReleaseExtensionObjectPathV1({
          releaseId: active.root.releaseId,
          lessonId: expectedLessonId,
          courseSessionId: expectedCourseSessionId,
          extensionFingerprint: extension.extensionFingerprint,
          rawHash: sha256Bytes(new TextEncoder().encode(extensionRaw)),
        });
      if (
        encodeLearningV2CourseSessionAudioReleaseExtensionV1(extension) !==
          extensionRaw ||
        audioSession.extensionPin.objectPath !== expectedExtensionPath ||
        extension.releaseId !== active.root.releaseId ||
        extension.lessonId !== expectedLessonId ||
        extension.lessonOrdinal !== lessonOrdinal ||
        extension.courseSessionId !== expectedCourseSessionId ||
        extension.sessionOrdinal !== sessionOrdinal ||
        extension.basePackageFingerprint !== base.summary.packageFingerprint ||
        extension.baseChildSetFingerprint !==
          base.summary.childSetFingerprint ||
        extension.learnerFingerprint !== base.learnerChild.learnerFingerprint ||
        extension.audioFingerprint !== audioSession.audioFingerprint ||
        extension.extensionFingerprint !== audioSession.extensionFingerprint
      )
        fail("audio_extension_join_mismatch");
      const audioChildRaw = await readExactJson(
        storage,
        extension.audioChildPin,
        LEARNING_V2_COURSE_SESSION_AUDIO_CHILD_MAX_BYTES_V1,
        "audio_child",
      );
      const audioChild = parseLearningV2CourseSessionAudioChildV1(
        audioChildRaw,
        base.learnerChild,
      );
      if (
        encodeLearningV2CourseSessionAudioChildV1(audioChild) !==
          audioChildRaw ||
        audioChild.courseSessionId !== expectedCourseSessionId ||
        audioChild.learnerFingerprint !==
          base.learnerChild.learnerFingerprint ||
        audioChild.audioFingerprint !== extension.audioFingerprint
      )
        fail("audio_child_join_mismatch");
      const summary = Object.freeze({
        schemaVersion: V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V3,
        releaseId: active.root.releaseId,
        activeRootFingerprint: active.root.rootFingerprint,
        activeBaseRootFingerprint: active.root.baseRootFingerprint,
        activeHeadFingerprint: active.head.headFingerprint,
        topologyFingerprint: active.root.topologyFingerprint,
        lessonId: expectedLessonId,
        lessonOrdinal,
        baseLessonIndexFingerprint: base.summary.lessonIndexFingerprint,
        audioLessonIndexFingerprint: audioIndex.indexFingerprint,
        courseSessionId: expectedCourseSessionId,
        sessionOrdinal,
        packageFingerprint: base.summary.packageFingerprint,
        childSetFingerprint: base.summary.childSetFingerprint,
        learnerFingerprint: base.learnerChild.learnerFingerprint,
        audioExtensionFingerprint: extension.extensionFingerprint,
        audioFingerprint: audioChild.audioFingerprint,
        baseProjectionBinding:
          "exact_v3_composite_head_base_root_lesson_index_session_package_join" as const,
        audioProjectionBinding:
          "exact_v3_audio_index_extension_audio_child_join" as const,
        storageIntegrity:
          "exact_generation_hash_size_content_type_readback" as const,
        learnerProjection:
          "intro_learner_capsule_auxiliary_audio_child_only" as const,
        evaluatorIsolation: "server_sidecar_not_exposed" as const,
        playbackPreparation:
          "client_generation_pinned_mp3_prefetch_required_before_session" as const,
        taskVoiceScope:
          "one_voice_per_interaction_for_phrase_and_words" as const,
        serverRequestPerPlayback: false as const,
        remoteTtsFallbackDuringSession: false as const,
        answerPayload: "absent" as const,
        correctnessAuthority: "local_device_only" as const,
        serverAnswerAuthority:
          "none_answers_never_transported_or_rechecked" as const,
        repositoryOriginAuthority:
          "active_v3_composite_repository_head_and_generation_pinned_objects" as const,
        runtimeAuthority: "active_release_session_projection_only" as const,
        walletAuthority: "none" as const,
        masteryAuthority: "none" as const,
        evidenceAuthority: "none" as const,
        completionAuthority: "none" as const,
        releaseAuthority: false as const,
      });
      const material = Object.freeze({
        summary,
        base,
        audioExtension: extension,
        audioChild,
        canonicalAudioChildRaw: audioChildRaw,
        evaluatorSidecarRawExposed: false as const,
        answerPayloadExposed: false as const,
      });
      const handle = Object.freeze({
        kind: "v2_course_released_session_handle_v3" as const,
      });
      handles.add(handle);
      materials.set(handle, material);
      return handle;
    },
  });
}

export function createFirebaseAdminV2CourseReleasedSessionAdapterV3(): V2CourseReleasedSessionAdapterV3 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return createV2CourseReleasedSessionAdapterV3({ storage: io.storage });
}

export function isV2CourseReleasedSessionHandleV3(
  value: unknown,
): value is V2CourseReleasedSessionHandleV3 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2CourseReleasedSessionSummaryV3(
  handle: V2CourseReleasedSessionHandleV3,
): V2CourseReleasedSessionSummaryV3 {
  const material = materials.get(handle);
  if (!material || !handles.has(handle)) fail("handle_invalid");
  return material.summary;
}

export function resolveV2CourseReleasedSessionLearnerMaterialV3(
  handle: V2CourseReleasedSessionHandleV3,
): V2CourseReleasedSessionMaterialV3 {
  const material = materials.get(handle);
  if (!material || !handles.has(handle)) fail("handle_invalid");
  return material;
}
