import { createHash } from "node:crypto";
import {
  LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1,
  encodeLearningV2CourseLessonReleaseIndexV1,
  parseLearningV2CourseLessonReleaseIndexV1,
  type LearningV2CourseLessonReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import {
  encodeLearningV2ActiveCourseCatalogV1,
  materializeLearningV2ActiveCourseCatalogV1,
  type LearningV2ActiveCourseCatalogV1,
} from "../../../modules/learning-v2/runtime/course_active_catalog_v1";
import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../../../modules/learning-v2/content/generator_course_contract";
import type { V2RepositoryImmutableStoragePortV1 } from "./v2_firebase_repository_persistence_v1";
import { createV2FirebaseAdminRepositoryIoV1 } from "./v2_firebase_admin_repository_io_v1";
import {
  isV2UnifiedCourseReleaseActiveHandleV2,
  resolveV2UnifiedCourseReleaseActiveMaterialV2,
  type V2UnifiedCourseReleaseActiveHandleV2,
} from "./v2_unified_course_release_repository_v2";
import { v2UnifiedCourseLessonIndexObjectPathV2 } from "./v2_unified_course_release_v2";

export const V2_COURSE_ACTIVE_CATALOG_MAX_READ_CONCURRENCY_V1 = 4 as const;

export interface V2CourseActiveCatalogHandleV1 {
  readonly kind: "v2_course_active_catalog_handle_v1";
}

export interface V2CourseActiveCatalogSummaryV1 {
  readonly releaseId: string;
  readonly activeRootFingerprint: string;
  readonly activeHeadFingerprint: string;
  readonly interfaceLocale: LearningV2InterfaceLocale;
  readonly lessonCount: number;
  readonly directSessionCount: number;
  readonly catalogFingerprint: string;
  readonly learnerProjection: "titles_can_do_and_session_learning_outcomes_only";
  readonly correctnessAuthority: "local_device_only";
  readonly serverAnswerAuthority: "none_answers_never_transported";
  readonly progressWriteAuthority: "completed_session_summary_only";
  readonly releaseAuthority: false;
}

export interface V2CourseActiveCatalogAdapterV1 {
  load(
    input: V2CourseActiveCatalogInputV1,
  ): Promise<V2CourseActiveCatalogHandleV1>;
}

export type V2CourseActiveCatalogInputV1 = Readonly<{
  activeHandle: V2UnifiedCourseReleaseActiveHandleV2;
  interfaceLocale: LearningV2InterfaceLocale;
}>;

const handles = new WeakSet<object>();
const materials = new WeakMap<
  object,
  Readonly<{
    summary: V2CourseActiveCatalogSummaryV1;
    catalog: LearningV2ActiveCourseCatalogV1;
    raw: string;
  }>
>();

function fail(code: string): never {
  throw new Error(`v2_course_active_catalog_${code}`);
}

function sha256Bytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readIndex(
  storage: V2RepositoryImmutableStoragePortV1,
  active: ReturnType<typeof resolveV2UnifiedCourseReleaseActiveMaterialV2>,
  lessonIndex: number,
): Promise<LearningV2CourseLessonReleaseIndexV1> {
  const rootLesson = active.root.lessons[lessonIndex];
  if (!rootLesson) fail("lesson_missing");
  const pin = rootLesson.lessonIndexObject;
  if (pin.byteSize > LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1)
    fail("pin_oversize");
  const metadata = await storage.readMetadataExact(pin.objectPath);
  if (
    !metadata ||
    metadata.generation !== pin.objectGeneration ||
    metadata.byteSize !== pin.byteSize ||
    metadata.contentHash !== pin.contentHash ||
    metadata.contentType !== pin.contentType
  )
    fail("metadata_mismatch");
  const downloaded = await storage.downloadGenerationExact({
    objectPath: pin.objectPath,
    ifGenerationMatch: pin.objectGeneration,
    maximumBytes: LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1,
  });
  if (
    downloaded.kind !== "downloaded" ||
    !(downloaded.bytes instanceof Uint8Array) ||
    downloaded.bytes.byteLength !== pin.byteSize ||
    sha256Bytes(downloaded.bytes) !== pin.contentHash
  )
    fail("bytes_mismatch");
  let raw: string;
  try {
    raw = new TextDecoder("utf-8", { fatal: true }).decode(downloaded.bytes);
  } catch {
    fail("utf8_invalid");
  }
  const index = parseLearningV2CourseLessonReleaseIndexV1(raw);
  const expectedPath = v2UnifiedCourseLessonIndexObjectPathV2({
    releaseId: active.root.releaseId,
    lessonId: index.lessonId,
    indexFingerprint: index.indexFingerprint,
    rawHash: sha256Bytes(downloaded.bytes),
  });
  if (
    encodeLearningV2CourseLessonReleaseIndexV1(index) !== raw ||
    index.releaseId !== active.root.releaseId ||
    index.lessonOrdinal !== rootLesson.lessonOrdinal ||
    index.lessonId !== rootLesson.lessonId ||
    index.indexFingerprint !== rootLesson.lessonIndexFingerprint ||
    index.ownerLessonFingerprint !== rootLesson.ownerLessonFingerprint ||
    index.ownerConfirmationFingerprint !==
      rootLesson.ownerConfirmationFingerprint ||
    index.sessionSetFingerprint !== rootLesson.sessionSetFingerprint ||
    pin.objectPath !== expectedPath
  )
    fail("lesson_join_mismatch");
  return index;
}

async function readIndexes(
  storage: V2RepositoryImmutableStoragePortV1,
  active: ReturnType<typeof resolveV2UnifiedCourseReleaseActiveMaterialV2>,
): Promise<readonly LearningV2CourseLessonReleaseIndexV1[]> {
  const indexes = new Array<LearningV2CourseLessonReleaseIndexV1>(
    active.root.lessons.length,
  );
  let cursor = 0;
  await Promise.all(
    Array.from(
      {
        length: Math.min(
          V2_COURSE_ACTIVE_CATALOG_MAX_READ_CONCURRENCY_V1,
          active.root.lessons.length,
        ),
      },
      async () => {
        while (cursor < active.root.lessons.length) {
          const index = cursor;
          cursor += 1;
          indexes[index] = await readIndex(storage, active, index);
        }
      },
    ),
  );
  return Object.freeze(indexes);
}

export function createV2CourseActiveCatalogAdapterV1(input: {
  readonly storage: V2RepositoryImmutableStoragePortV1;
}): V2CourseActiveCatalogAdapterV1 {
  if (!input || typeof input !== "object" || !input.storage)
    fail("ports_invalid");
  return Object.freeze({
    load: async (request: V2CourseActiveCatalogInputV1) => {
      if (
        !isV2UnifiedCourseReleaseActiveHandleV2(request.activeHandle) ||
        !LEARNING_V2_INTERFACE_LOCALES.includes(request.interfaceLocale)
      )
        fail("input_invalid");
      const active = resolveV2UnifiedCourseReleaseActiveMaterialV2(
        request.activeHandle,
      );
      const indexes = await readIndexes(input.storage, active);
      const catalog = materializeLearningV2ActiveCourseCatalogV1({
        environment: active.root.environment,
        releaseId: active.root.releaseId,
        activeRootFingerprint: active.root.rootFingerprint,
        activeHeadFingerprint: active.head.headFingerprint,
        headOperationRevision: active.head.operationRevision,
        seasonId: active.root.seasonId,
        targetLanguage: active.root.targetLanguage,
        studyTarget: active.root.studyTarget,
        learnerSourceLocale: active.root.learnerSourceLocale,
        interfaceLocale: request.interfaceLocale,
        contentClass: active.root.contentClass,
        releaseScope: active.root.releaseScope,
        lessonIndexAggregate: active.root.lessonIndexAggregate,
        indexes,
      });
      const summary = Object.freeze({
        releaseId: catalog.releaseId,
        activeRootFingerprint: catalog.activeRootFingerprint,
        activeHeadFingerprint: catalog.activeHeadFingerprint,
        interfaceLocale: catalog.interfaceLocale,
        lessonCount: catalog.lessonCount,
        directSessionCount: catalog.directSessionCount,
        catalogFingerprint: catalog.catalogFingerprint,
        learnerProjection: catalog.learnerProjection,
        correctnessAuthority: catalog.correctnessAuthority,
        serverAnswerAuthority: catalog.serverAnswerAuthority,
        progressWriteAuthority: catalog.progressWriteAuthority,
        releaseAuthority: false as const,
      });
      const handle = Object.freeze({
        kind: "v2_course_active_catalog_handle_v1" as const,
      });
      handles.add(handle);
      materials.set(
        handle,
        Object.freeze({
          summary,
          catalog,
          raw: encodeLearningV2ActiveCourseCatalogV1(catalog),
        }),
      );
      return handle;
    },
  });
}

export function createFirebaseAdminV2CourseActiveCatalogAdapterV1(): V2CourseActiveCatalogAdapterV1 {
  const io = createV2FirebaseAdminRepositoryIoV1();
  return createV2CourseActiveCatalogAdapterV1({ storage: io.storage });
}

export function isV2CourseActiveCatalogHandleV1(
  value: unknown,
): value is V2CourseActiveCatalogHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getV2CourseActiveCatalogSummaryV1(
  handle: V2CourseActiveCatalogHandleV1,
): V2CourseActiveCatalogSummaryV1 {
  const material = materials.get(handle);
  if (!material || !handles.has(handle)) fail("handle_invalid");
  return material.summary;
}

export function resolveV2CourseActiveCatalogLearnerRawV1(
  handle: V2CourseActiveCatalogHandleV1,
): string {
  const material = materials.get(handle);
  if (!material || !handles.has(handle)) fail("handle_invalid");
  return material.raw;
}
