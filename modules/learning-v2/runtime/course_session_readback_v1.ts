import { sha256Utf8, utf8ByteLengthV1 } from "../policies/decision_registry";
import {
  bindLearningV2CourseSessionPackageToReleaseIndexV1,
  encodeLearningV2CourseSessionReleasePackageV1,
  type LearningV2CourseSessionChildPinV1,
  type LearningV2CourseSessionReleasePackageV1,
} from "./course_session_release_package_v1";
import type { LearningV2CourseLessonReleaseIndexV1 } from "./course_lesson_release_index_v1";

export const LEARNING_V2_COURSE_SESSION_READBACK_SCHEMA_V1 =
  "learning-v2-course-session-readback.v1" as const;
export const LEARNING_V2_COURSE_SESSION_READBACK_MAX_CONCURRENCY_V1 =
  2 as const;

export interface LearningV2CourseSessionExactReaderV1 {
  readExact(pin: LearningV2CourseSessionChildPinV1): Promise<
    Readonly<{
      raw: string;
      objectGeneration: string;
      byteSize: number;
      contentHash: string;
      contentType: "application/json; charset=utf-8";
    }>
  >;
}

export interface LearningV2CourseSessionReadbackHandleV1 {
  readonly schemaVersion: typeof LEARNING_V2_COURSE_SESSION_READBACK_SCHEMA_V1;
}

export type LearningV2CourseSessionReadbackSummaryV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_SESSION_READBACK_SCHEMA_V1;
  releaseId: string;
  lessonId: string;
  courseSessionId: string;
  sessionOrdinal: number;
  packageFingerprint: string;
  childSetFingerprint: string;
  childCount: 5;
  storageIntegrity: "exact_generation_hash_size_content_type_readback";
  learnerProjection: "intro_learner_capsule_auxiliary_only";
  evaluatorIsolation: "server_sidecar_not_exposed";
  repositoryOriginAuthority: "none_external_active_release_required";
  runtimeAuthority: "integrity_only_no_active_release_authority";
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  releaseAuthority: false;
}>;

export type LearningV2CourseSessionLearnerMaterialV1 = Readonly<{
  introRaw: string;
  learnerRaw: string;
  evaluatorCapsuleRaw: string;
  auxiliaryRaw: string;
  evaluatorSidecarRawExposed: false;
  materialAuthority: "none_integrity_handle_projection_only";
}>;

type Material = Readonly<{
  summary: LearningV2CourseSessionReadbackSummaryV1;
  introRaw: string;
  learnerRaw: string;
  evaluatorCapsuleRaw: string;
  auxiliaryRaw: string;
}>;

const handles = new WeakSet<object>();
const materialByHandle = new WeakMap<object, Material>();

function fail(): never {
  throw new Error("learning_v2_course_session_readback_invalid");
}

function plain(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactRaw(
  pin: LearningV2CourseSessionChildPinV1,
  value: unknown,
): string {
  if (
    !plain(value) ||
    Object.keys(value).sort().join("|") !==
      "byteSize|contentHash|contentType|objectGeneration|raw" ||
    typeof value.raw !== "string" ||
    value.objectGeneration !== pin.objectGeneration ||
    value.byteSize !== pin.byteSize ||
    value.contentHash !== pin.contentHash ||
    value.contentType !== pin.contentType ||
    utf8ByteLengthV1(value.raw) !== pin.byteSize ||
    sha256Utf8(value.raw) !== pin.contentHash
  )
    fail();
  return value.raw;
}

async function readBounded(
  pins: readonly LearningV2CourseSessionChildPinV1[],
  reader: LearningV2CourseSessionExactReaderV1,
): Promise<readonly string[]> {
  const results = new Array<string>(pins.length);
  let nextIndex = 0;
  const worker = async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= pins.length) return;
      const pin = pins[index]!;
      results[index] = exactRaw(pin, await reader.readExact(pin));
    }
  };
  await Promise.all(
    Array.from(
      {
        length: Math.min(
          LEARNING_V2_COURSE_SESSION_READBACK_MAX_CONCURRENCY_V1,
          pins.length,
        ),
      },
      () => worker(),
    ),
  );
  return Object.freeze(results);
}

export async function loadLearningV2CourseSessionReadbackV1(
  input: Readonly<{
    index: LearningV2CourseLessonReleaseIndexV1;
    package: LearningV2CourseSessionReleasePackageV1;
    packageRaw: string;
    reader: LearningV2CourseSessionExactReaderV1;
  }>,
): Promise<LearningV2CourseSessionReadbackHandleV1> {
  if (
    !plain(input) ||
    Object.keys(input).sort().join("|") !== "index|package|packageRaw|reader" ||
    typeof input.packageRaw !== "string" ||
    !plain(input.reader) ||
    typeof input.reader.readExact !== "function"
  )
    fail();
  const value = bindLearningV2CourseSessionPackageToReleaseIndexV1({
    index: input.index,
    package: input.package,
  });
  if (encodeLearningV2CourseSessionReleasePackageV1(value) !== input.packageRaw)
    fail();
  const readbacks = await readBounded(value.children, input.reader);
  const summary = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_READBACK_SCHEMA_V1,
    releaseId: value.releaseId,
    lessonId: value.lessonId,
    courseSessionId: value.courseSessionId,
    sessionOrdinal: value.sessionOrdinal,
    packageFingerprint: value.packageFingerprint,
    childSetFingerprint: value.childSetFingerprint,
    childCount: 5 as const,
    storageIntegrity:
      "exact_generation_hash_size_content_type_readback" as const,
    learnerProjection: "intro_learner_capsule_auxiliary_only" as const,
    evaluatorIsolation: "server_sidecar_not_exposed" as const,
    repositoryOriginAuthority: "none_external_active_release_required" as const,
    runtimeAuthority: "integrity_only_no_active_release_authority" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  const handle = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_READBACK_SCHEMA_V1,
  });
  handles.add(handle);
  materialByHandle.set(
    handle,
    Object.freeze({
      summary,
      introRaw: readbacks[0]!,
      learnerRaw: readbacks[1]!,
      evaluatorCapsuleRaw: readbacks[2]!,
      auxiliaryRaw: readbacks[4]!,
    }),
  );
  return handle;
}

function material(handle: LearningV2CourseSessionReadbackHandleV1): Material {
  if (!isLearningV2CourseSessionReadbackHandleV1(handle)) fail();
  const found = materialByHandle.get(handle);
  if (!found) fail();
  return found;
}

export function isLearningV2CourseSessionReadbackHandleV1(
  value: unknown,
): value is LearningV2CourseSessionReadbackHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getLearningV2CourseSessionReadbackSummaryV1(
  handle: LearningV2CourseSessionReadbackHandleV1,
): LearningV2CourseSessionReadbackSummaryV1 {
  return material(handle).summary;
}

export function resolveLearningV2CourseSessionLearnerMaterialV1(
  handle: LearningV2CourseSessionReadbackHandleV1,
): LearningV2CourseSessionLearnerMaterialV1 {
  const found = material(handle);
  return Object.freeze({
    introRaw: found.introRaw,
    learnerRaw: found.learnerRaw,
    evaluatorCapsuleRaw: found.evaluatorCapsuleRaw,
    auxiliaryRaw: found.auxiliaryRaw,
    evaluatorSidecarRawExposed: false as const,
    materialAuthority: "none_integrity_handle_projection_only" as const,
  });
}
