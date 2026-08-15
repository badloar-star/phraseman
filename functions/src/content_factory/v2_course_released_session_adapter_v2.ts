import { createHash } from "node:crypto";
import { canonicalJsonV1 } from "../../../modules/learning-v2/policies/decision_registry";
import {
  LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1,
  encodeLearningV2CourseLessonReleaseIndexV1,
  parseLearningV2CourseLessonReleaseIndexV1,
  type LearningV2CourseSessionPackagePinV1,
} from "../../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import {
  LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_MAX_BYTES_V1,
  encodeLearningV2CourseSessionReleasePackageV1,
  parseLearningV2CourseSessionReleasePackageV1,
  type LearningV2CourseSessionChildPinV1,
} from "../../../modules/learning-v2/runtime/course_session_release_package_v1";
import {
  getLearningV2CourseSessionReadbackSummaryV1,
  loadLearningV2CourseSessionReadbackV1,
  resolveLearningV2CourseSessionLearnerMaterialV1,
  type LearningV2CourseSessionLearnerMaterialV1,
  type LearningV2CourseSessionReadbackSummaryV1,
} from "../../../modules/learning-v2/runtime/course_session_readback_v1";
import {
  parseLearningV2CourseSessionAuxiliaryChildV1,
  parseLearningV2CourseSessionIntroChildV1,
  parseLearningV2CourseSessionLearnerChildV1,
  type LearningV2CourseSessionAuxiliaryChildV1,
  type LearningV2CourseSessionIntroChildV1,
  type LearningV2CourseSessionLearnerChildV1,
} from "../../../modules/learning-v2/runtime/course_session_client_children_v1";
import {
  parseLearningV2CourseSessionEvaluatorCapsuleChildV1,
  type LearningV2CourseSessionEvaluatorCapsuleChildV1,
} from "../../../modules/learning-v2/runtime/course_session_evaluator_capsule_child_v1";
import {
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseLessonIdV1,
  learningV2CourseSessionIdV1,
} from "../../../modules/learning-v2/content/course_topology_v1";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import type {
  V2RepositoryImmutableObjectPinV1,
  V2RepositoryImmutableStoragePortV1,
} from "./v2_firebase_repository_persistence_v1";
import {
  isV2UnifiedCourseReleaseActiveHandleV2,
  resolveV2UnifiedCourseReleaseActiveMaterialV2,
  type V2UnifiedCourseReleaseActiveHandleV2,
} from "./v2_unified_course_release_repository_v2";
import {
  v2UnifiedCourseLessonIndexObjectPathV2,
  type V2UnifiedCourseReleaseRootV2,
} from "./v2_unified_course_release_v2";

export const V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V2 =
  "v2-course-released-session-summary.v2" as const;

export interface V2CourseReleasedSessionHandleV2 {
  readonly kind: "v2_course_released_session_handle_v2";
}

export interface V2CourseReleasedSessionSummaryV2 {
  readonly schemaVersion: typeof V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V2;
  readonly releaseId: string;
  readonly activeRootFingerprint: string;
  readonly activeHeadFingerprint: string;
  readonly topologyFingerprint: string;
  readonly lessonId: string;
  readonly lessonOrdinal: number;
  readonly lessonIndexFingerprint: string;
  readonly courseSessionId: string;
  readonly sessionOrdinal: number;
  readonly packageFingerprint: string;
  readonly childSetFingerprint: string;
  readonly learningOutcomeAvailable: true;
  readonly introQuestionPolicy: "one_embedded_question_per_intro_page_no_post_intro_duplicate";
  readonly activeReleaseBinding:
    | "exact_v2_head_root_lesson_index_session_package_join"
    | "exact_v3_composite_head_base_root_lesson_index_session_package_join";
  readonly storageIntegrity: "exact_generation_hash_size_content_type_readback";
  readonly learnerProjection: "intro_learner_capsule_auxiliary_only";
  readonly evaluatorIsolation: "server_sidecar_not_exposed";
  readonly repositoryOriginAuthority:
    | "active_v2_repository_head_and_generation_pinned_objects"
    | "active_v3_composite_repository_head_and_generation_pinned_objects";
  readonly runtimeAuthority: "active_release_session_projection_only";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none";
  readonly releaseAuthority: false;
}

export interface V2CourseReleasedSessionMaterialV2 {
  readonly summary: V2CourseReleasedSessionSummaryV2;
  readonly readback: LearningV2CourseSessionReadbackSummaryV1;
  readonly learner: LearningV2CourseSessionLearnerMaterialV1;
  readonly introChild: LearningV2CourseSessionIntroChildV1;
  readonly learnerChild: LearningV2CourseSessionLearnerChildV1;
  readonly evaluatorCapsuleChild: LearningV2CourseSessionEvaluatorCapsuleChildV1;
  readonly auxiliaryChild: LearningV2CourseSessionAuxiliaryChildV1;
  readonly evaluatorSidecarRawExposed: false;
}

export type V2CourseReleasedSessionInputV2 = Readonly<{
  activeHandle: V2UnifiedCourseReleaseActiveHandleV2;
  lessonOrdinal: number;
  sessionOrdinal: number;
}>;

export interface V2CourseReleasedSessionAdapterV2 {
  load(
    input: V2CourseReleasedSessionInputV2,
  ): Promise<V2CourseReleasedSessionHandleV2>;
}

const handles = new WeakSet<object>();
const materials = new WeakMap<object, V2CourseReleasedSessionMaterialV2>();

function fail(code: string): never {
  throw new Error(`v2_course_released_session_${code}`);
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readExactJson(
  storage: V2RepositoryImmutableStoragePortV1,
  pin:
    | V2RepositoryImmutableObjectPinV1
    | LearningV2CourseSessionPackagePinV1
    | LearningV2CourseSessionChildPinV1,
  maximumBytes: number,
): Promise<string> {
  if (pin.byteSize > maximumBytes) fail("pin_oversize");
  const metadata = await storage.readMetadataExact(pin.objectPath);
  if (
    !metadata ||
    metadata.generation !== pin.objectGeneration ||
    metadata.byteSize !== pin.byteSize ||
    metadata.contentHash !== pin.contentHash ||
    metadata.contentType !== pin.contentType
  )
    fail("metadata_mismatch");
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
    fail("bytes_mismatch");
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(result.bytes);
  } catch {
    fail("utf8_invalid");
  }
}

function exactOrdinal(value: number, max: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > max)
    fail("coordinate_invalid");
  return value;
}

export type V2CourseReleasedSessionBaseLoadInputV2 = Readonly<{
  storage: V2RepositoryImmutableStoragePortV1;
  root: V2UnifiedCourseReleaseRootV2;
  activeRootFingerprint: string;
  activeHeadFingerprint: string;
  lessonOrdinal: number;
  sessionOrdinal: number;
  activeReleaseBinding: V2CourseReleasedSessionSummaryV2["activeReleaseBinding"];
  repositoryOriginAuthority: V2CourseReleasedSessionSummaryV2["repositoryOriginAuthority"];
}>;

/**
 * Shared exact base-session loader. The v2 adapter and the composite v3 audio
 * adapter use the same package/child readback and learner projection rules.
 * It does not mint an active-release handle and therefore cannot create
 * repository authority by itself.
 */
export async function loadV2CourseReleasedSessionBaseMaterialV2(
  input: V2CourseReleasedSessionBaseLoadInputV2,
): Promise<V2CourseReleasedSessionMaterialV2> {
  const lessonOrdinal = exactOrdinal(
    input.lessonOrdinal,
    LEARNING_V2_COURSE_LESSON_COUNT_V1,
  );
  const sessionOrdinal = exactOrdinal(
    input.sessionOrdinal,
    LEARNING_V2_LESSON_SESSION_COUNT_V1,
  );
  const lessonRoot = input.root.lessons[lessonOrdinal - 1];
  if (
    !lessonRoot ||
    lessonRoot.lessonId !== learningV2CourseLessonIdV1(lessonOrdinal)
  )
    fail("lesson_missing");
  const indexRaw = await readExactJson(
    input.storage,
    lessonRoot.lessonIndexObject,
    LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1,
  );
  const index = parseLearningV2CourseLessonReleaseIndexV1(indexRaw);
  const expectedIndexPath = v2UnifiedCourseLessonIndexObjectPathV2({
    releaseId: input.root.releaseId,
    lessonId: index.lessonId,
    indexFingerprint: index.indexFingerprint,
    rawHash: sha256Bytes(new TextEncoder().encode(indexRaw)),
  });
  if (
    encodeLearningV2CourseLessonReleaseIndexV1(index) !== indexRaw ||
    index.releaseId !== input.root.releaseId ||
    index.lessonOrdinal !== lessonOrdinal ||
    index.lessonId !== lessonRoot.lessonId ||
    index.indexFingerprint !== lessonRoot.lessonIndexFingerprint ||
    index.ownerLessonFingerprint !== lessonRoot.ownerLessonFingerprint ||
    index.ownerConfirmationFingerprint !==
      lessonRoot.ownerConfirmationFingerprint ||
    index.sessionSetFingerprint !== lessonRoot.sessionSetFingerprint ||
    lessonRoot.lessonIndexObject.objectPath !== expectedIndexPath
  )
    fail("lesson_index_join_mismatch");
  const sessionRow = index.sessions[sessionOrdinal - 1];
  if (
    !sessionRow ||
    sessionRow.courseSessionId !==
      learningV2CourseSessionIdV1(lessonOrdinal, sessionOrdinal)
  )
    fail("session_missing");
  const packageRaw = await readExactJson(
    input.storage,
    sessionRow.packagePin,
    LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_MAX_BYTES_V1,
  );
  const sessionPackage =
    parseLearningV2CourseSessionReleasePackageV1(packageRaw);
  if (
    encodeLearningV2CourseSessionReleasePackageV1(sessionPackage) !==
      packageRaw ||
    sessionPackage.packageFingerprint !== sessionRow.packageFingerprint
  )
    fail("package_join_mismatch");
  const readbackHandle = await loadLearningV2CourseSessionReadbackV1({
    index,
    package: sessionPackage,
    packageRaw,
    reader: {
      readExact: async (pin) => {
        const raw = await readExactJson(input.storage, pin, pin.byteSize);
        return Object.freeze({
          raw,
          objectGeneration: pin.objectGeneration,
          byteSize: pin.byteSize,
          contentHash: pin.contentHash,
          contentType: pin.contentType,
        });
      },
    },
  });
  const readback = getLearningV2CourseSessionReadbackSummaryV1(readbackHandle);
  const learner =
    resolveLearningV2CourseSessionLearnerMaterialV1(readbackHandle);
  const introChild = parseLearningV2CourseSessionIntroChildV1(learner.introRaw);
  const learnerChild = parseLearningV2CourseSessionLearnerChildV1(
    learner.learnerRaw,
  );
  const evaluatorCapsuleChild =
    parseLearningV2CourseSessionEvaluatorCapsuleChildV1(
      learner.evaluatorCapsuleRaw,
    );
  const auxiliaryChild = parseLearningV2CourseSessionAuxiliaryChildV1(
    learner.auxiliaryRaw,
  );
  const allInteractionIds = [
    ...introChild.pages.map((page) => page.question.interactionId),
    ...learnerChild.interactions.map(
      (interaction) => interaction.interactionId,
    ),
  ];
  if (
    introChild.courseSessionId !== sessionPackage.courseSessionId ||
    learnerChild.courseSessionId !== sessionPackage.courseSessionId ||
    evaluatorCapsuleChild.courseSessionId !== sessionPackage.courseSessionId ||
    auxiliaryChild.courseSessionId !== sessionPackage.courseSessionId ||
    canonicalJsonV1(introChild.learningOutcomeByLocale) !==
      canonicalJsonV1(sessionPackage.learningOutcomeByLocale) ||
    learnerChild.interactionProfile !== sessionPackage.interactionProfile ||
    learnerChild.practiceInteractionCount + 3 !==
      sessionPackage.plannedPrimaryInteractionCount ||
    canonicalJsonV1(allInteractionIds) !==
      canonicalJsonV1(sessionPackage.interactionIds) ||
    canonicalJsonV1(
      auxiliaryChild.entries.map((entry) => entry.interactionId),
    ) !== canonicalJsonV1(sessionPackage.interactionIds) ||
    canonicalJsonV1(
      evaluatorCapsuleChild.entries.map((entry) => entry.interactionId),
    ) !== canonicalJsonV1(sessionPackage.interactionIds)
  )
    fail("client_child_join_mismatch");
  const summary = Object.freeze({
    schemaVersion: V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V2,
    releaseId: input.root.releaseId,
    activeRootFingerprint: input.activeRootFingerprint,
    activeHeadFingerprint: input.activeHeadFingerprint,
    topologyFingerprint: input.root.topologyFingerprint,
    lessonId: index.lessonId,
    lessonOrdinal,
    lessonIndexFingerprint: index.indexFingerprint,
    courseSessionId: sessionPackage.courseSessionId,
    sessionOrdinal,
    packageFingerprint: sessionPackage.packageFingerprint,
    childSetFingerprint: sessionPackage.childSetFingerprint,
    learningOutcomeAvailable: true as const,
    introQuestionPolicy:
      "one_embedded_question_per_intro_page_no_post_intro_duplicate" as const,
    activeReleaseBinding: input.activeReleaseBinding,
    storageIntegrity:
      "exact_generation_hash_size_content_type_readback" as const,
    learnerProjection: "intro_learner_capsule_auxiliary_only" as const,
    evaluatorIsolation: "server_sidecar_not_exposed" as const,
    repositoryOriginAuthority: input.repositoryOriginAuthority,
    runtimeAuthority: "active_release_session_projection_only" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  return Object.freeze({
    summary,
    readback,
    learner,
    introChild,
    learnerChild,
    evaluatorCapsuleChild,
    auxiliaryChild,
    evaluatorSidecarRawExposed: false as const,
  });
}

export function createV2CourseReleasedSessionAdapterV2(input: {
  readonly storage: V2RepositoryImmutableStoragePortV1;
}): V2CourseReleasedSessionAdapterV2 {
  if (!input || typeof input !== "object" || !input.storage)
    fail("ports_invalid");
  const { storage } = input;
  return Object.freeze({
    load: async (request: V2CourseReleasedSessionInputV2) => {
      if (!isV2UnifiedCourseReleaseActiveHandleV2(request.activeHandle))
        fail("active_handle_invalid");
      const lessonOrdinal = exactOrdinal(
        request.lessonOrdinal,
        LEARNING_V2_COURSE_LESSON_COUNT_V1,
      );
      const sessionOrdinal = exactOrdinal(
        request.sessionOrdinal,
        LEARNING_V2_LESSON_SESSION_COUNT_V1,
      );
      const active = resolveV2UnifiedCourseReleaseActiveMaterialV2(
        request.activeHandle,
      );
      const lessonRoot = active.root.lessons[lessonOrdinal - 1];
      if (
        !lessonRoot ||
        lessonRoot.lessonId !== learningV2CourseLessonIdV1(lessonOrdinal)
      )
        fail("lesson_missing");
      const indexRaw = await readExactJson(
        storage,
        lessonRoot.lessonIndexObject,
        LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1,
      );
      const index = parseLearningV2CourseLessonReleaseIndexV1(indexRaw);
      const expectedIndexPath = v2UnifiedCourseLessonIndexObjectPathV2({
        releaseId: active.root.releaseId,
        lessonId: index.lessonId,
        indexFingerprint: index.indexFingerprint,
        rawHash: sha256Bytes(new TextEncoder().encode(indexRaw)),
      });
      if (
        encodeLearningV2CourseLessonReleaseIndexV1(index) !== indexRaw ||
        index.releaseId !== active.root.releaseId ||
        index.lessonOrdinal !== lessonOrdinal ||
        index.lessonId !== lessonRoot.lessonId ||
        index.indexFingerprint !== lessonRoot.lessonIndexFingerprint ||
        index.ownerLessonFingerprint !== lessonRoot.ownerLessonFingerprint ||
        index.ownerConfirmationFingerprint !==
          lessonRoot.ownerConfirmationFingerprint ||
        index.sessionSetFingerprint !== lessonRoot.sessionSetFingerprint ||
        lessonRoot.lessonIndexObject.objectPath !== expectedIndexPath
      )
        fail("lesson_index_join_mismatch");
      const sessionRow = index.sessions[sessionOrdinal - 1];
      if (
        !sessionRow ||
        sessionRow.courseSessionId !==
          learningV2CourseSessionIdV1(lessonOrdinal, sessionOrdinal)
      )
        fail("session_missing");
      const packageRaw = await readExactJson(
        storage,
        sessionRow.packagePin,
        LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_MAX_BYTES_V1,
      );
      const sessionPackage =
        parseLearningV2CourseSessionReleasePackageV1(packageRaw);
      if (
        encodeLearningV2CourseSessionReleasePackageV1(sessionPackage) !==
          packageRaw ||
        sessionPackage.packageFingerprint !== sessionRow.packageFingerprint
      )
        fail("package_join_mismatch");
      const readbackHandle = await loadLearningV2CourseSessionReadbackV1({
        index,
        package: sessionPackage,
        packageRaw,
        reader: {
          readExact: async (pin) => {
            const raw = await readExactJson(storage, pin, pin.byteSize);
            return Object.freeze({
              raw,
              objectGeneration: pin.objectGeneration,
              byteSize: pin.byteSize,
              contentHash: pin.contentHash,
              contentType: pin.contentType,
            });
          },
        },
      });
      const readback =
        getLearningV2CourseSessionReadbackSummaryV1(readbackHandle);
      const learner =
        resolveLearningV2CourseSessionLearnerMaterialV1(readbackHandle);
      const introChild = parseLearningV2CourseSessionIntroChildV1(
        learner.introRaw,
      );
      const learnerChild = parseLearningV2CourseSessionLearnerChildV1(
        learner.learnerRaw,
      );
      const evaluatorCapsuleChild =
        parseLearningV2CourseSessionEvaluatorCapsuleChildV1(
          learner.evaluatorCapsuleRaw,
        );
      const auxiliaryChild = parseLearningV2CourseSessionAuxiliaryChildV1(
        learner.auxiliaryRaw,
      );
      const allInteractionIds = [
        ...introChild.pages.map((page) => page.question.interactionId),
        ...learnerChild.interactions.map(
          (interaction) => interaction.interactionId,
        ),
      ];
      if (
        introChild.courseSessionId !== sessionPackage.courseSessionId ||
        learnerChild.courseSessionId !== sessionPackage.courseSessionId ||
        evaluatorCapsuleChild.courseSessionId !==
          sessionPackage.courseSessionId ||
        auxiliaryChild.courseSessionId !== sessionPackage.courseSessionId ||
        canonicalJsonV1(introChild.learningOutcomeByLocale) !==
          canonicalJsonV1(sessionPackage.learningOutcomeByLocale) ||
        learnerChild.interactionProfile !== sessionPackage.interactionProfile ||
        learnerChild.practiceInteractionCount + 3 !==
          sessionPackage.plannedPrimaryInteractionCount ||
        canonicalJsonV1(allInteractionIds) !==
          canonicalJsonV1(sessionPackage.interactionIds) ||
        canonicalJsonV1(
          auxiliaryChild.entries.map((entry) => entry.interactionId),
        ) !== canonicalJsonV1(sessionPackage.interactionIds) ||
        canonicalJsonV1(
          evaluatorCapsuleChild.entries.map((entry) => entry.interactionId),
        ) !== canonicalJsonV1(sessionPackage.interactionIds)
      )
        fail("client_child_join_mismatch");
      const summary = Object.freeze({
        schemaVersion: V2_COURSE_RELEASED_SESSION_SUMMARY_SCHEMA_V2,
        releaseId: active.root.releaseId,
        activeRootFingerprint: active.root.rootFingerprint,
        activeHeadFingerprint: active.head.headFingerprint,
        topologyFingerprint: active.root.topologyFingerprint,
        lessonId: index.lessonId,
        lessonOrdinal,
        lessonIndexFingerprint: index.indexFingerprint,
        courseSessionId: sessionPackage.courseSessionId,
        sessionOrdinal,
        packageFingerprint: sessionPackage.packageFingerprint,
        childSetFingerprint: sessionPackage.childSetFingerprint,
        learningOutcomeAvailable: true as const,
        introQuestionPolicy:
          "one_embedded_question_per_intro_page_no_post_intro_duplicate" as const,
        activeReleaseBinding:
          "exact_v2_head_root_lesson_index_session_package_join" as const,
        storageIntegrity:
          "exact_generation_hash_size_content_type_readback" as const,
        learnerProjection: "intro_learner_capsule_auxiliary_only" as const,
        evaluatorIsolation: "server_sidecar_not_exposed" as const,
        repositoryOriginAuthority:
          "active_v2_repository_head_and_generation_pinned_objects" as const,
        runtimeAuthority: "active_release_session_projection_only" as const,
        walletAuthority: "none" as const,
        masteryAuthority: "none" as const,
        evidenceAuthority: "none" as const,
        completionAuthority: "none" as const,
        releaseAuthority: false as const,
      });
      const handle = Object.freeze({
        kind: "v2_course_released_session_handle_v2" as const,
      });
      const material = Object.freeze({
        summary,
        readback,
        learner,
        introChild,
        learnerChild,
        evaluatorCapsuleChild,
        auxiliaryChild,
        evaluatorSidecarRawExposed: false as const,
      });
      handles.add(handle);
      materials.set(handle, material);
      return handle;
    },
  });
}

export function createFirebaseAdminV2CourseReleasedSessionAdapterV2(): V2CourseReleasedSessionAdapterV2 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return createV2CourseReleasedSessionAdapterV2({ storage: io.storage });
}

export function isV2CourseReleasedSessionHandleV2(
  value: unknown,
): value is V2CourseReleasedSessionHandleV2 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2CourseReleasedSessionSummaryV2(
  handle: V2CourseReleasedSessionHandleV2,
): V2CourseReleasedSessionSummaryV2 {
  const material = materials.get(handle);
  if (!material || !handles.has(handle)) fail("handle_invalid");
  return material.summary;
}

export function resolveV2CourseReleasedSessionLearnerMaterialV2(
  handle: V2CourseReleasedSessionHandleV2,
): V2CourseReleasedSessionMaterialV2 {
  const material = materials.get(handle);
  if (!material || !handles.has(handle)) fail("handle_invalid");
  return material;
}
