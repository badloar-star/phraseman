import { LEARNING_V2_INTERFACE_LOCALES } from "../../../modules/learning-v2/content/generator_course_contract";
import {
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_COURSE_SESSION_COUNT_V1,
  LEARNING_V2_COURSE_TOPOLOGY_SCHEMA_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  buildLearningV2CourseTopologyV1,
} from "../../../modules/learning-v2/content/course_topology_v1";
import { parseV2ExactLanguageTagV1 } from "../../../modules/learning-v2/contracts/language_tag_v1";
import {
  encodeLearningV2CourseLessonReleaseIndexV1,
  isLearningV2CourseLessonReleaseIndexV1,
  type LearningV2CourseLessonReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/course_lesson_release_index_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type { V2RepositoryImmutableObjectPinV1 } from "./v2_firebase_repository_persistence_v1";

export const V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V2 =
  "v2-unified-course-release-root.v2" as const;
export const V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V2 =
  "v2-unified-course-release-head.v2" as const;
export const V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2 = 512 * 1024;
export const V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V2 = 32 * 1024;
export const V2_UNIFIED_COURSE_LESSON_INDEX_STORAGE_PREFIX_V2 =
  "learning-v2/unified-course-release-v2/lesson-indexes" as const;

export interface V2UnifiedCourseLessonReleaseV2 {
  readonly lessonOrdinal: number;
  readonly lessonId: string;
  readonly ownerLessonFingerprint: string;
  readonly ownerConfirmationFingerprint: string;
  readonly ownerConfirmationObject: V2RepositoryImmutableObjectPinV1;
  readonly lessonIndexFingerprint: string;
  readonly lessonIndexObject: V2RepositoryImmutableObjectPinV1;
  readonly sessionSetFingerprint: string;
  readonly sessionCount: 56;
  readonly lessonReleaseFingerprint: string;
}

export interface V2UnifiedCourseReleaseRootV2 {
  readonly schemaVersion: typeof V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V2;
  readonly topologySchemaVersion: typeof LEARNING_V2_COURSE_TOPOLOGY_SCHEMA_V1;
  readonly topologyFingerprint: string;
  readonly courseModel: "direct_32_lessons_56_sessions_no_hidden_episode_grouping";
  readonly environment: "lab" | "staging" | "production";
  readonly releaseId: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly seasonId: string;
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly interfaceLocales: readonly string[];
  readonly contentClass: "production_candidate" | "neutral_test_fixture";
  readonly releaseScope: "vertical_slice" | "full_course";
  readonly rollout: Readonly<{
    revision: number;
    state: "internal" | "rolling_out" | "live" | "paused";
    percent: 0 | 1 | 5 | 10 | 25 | 50 | 100;
    cohortSaltVersion: number;
    allowlistCohortIds: readonly string[];
    excludeCohortIds: readonly string[];
  }>;
  readonly lessons: readonly V2UnifiedCourseLessonReleaseV2[];
  readonly lessonCount: number;
  readonly sessionsPerLesson: 56;
  readonly directSessionCount: number;
  readonly ownerConfirmationAggregate: string;
  readonly lessonIndexAggregate: string;
  readonly sessionSetAggregate: string;
  readonly inventoryAggregate: string;
  readonly inventoryEvidence: "immutable_lesson_index_and_confirmation_pins";
  readonly contentAuthorship: "owner_only";
  readonly ownerContentAuthority: "none_structural_confirmation_pins_only";
  readonly machineValidationAuthority: "structural_direct_56_inventory_join_only";
  readonly humanApprovalAuthority: "none_activation_confirmation_required";
  readonly publicationDecisionAuthority: "none";
  readonly executionAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly rootFingerprint: string;
}

export interface V2UnifiedCourseReleaseHeadV2 {
  readonly schemaVersion: typeof V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V2;
  readonly topologyFingerprint: string;
  readonly environment: "lab" | "staging" | "production";
  readonly seasonId: string;
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly activeReleaseId: string;
  readonly activeRootFingerprint: string;
  readonly activeRootObject: V2RepositoryImmutableObjectPinV1;
  readonly previousReleaseId: string | null;
  readonly previousRootFingerprint: string | null;
  readonly previousRootObject: V2RepositoryImmutableObjectPinV1 | null;
  readonly operationRevision: number;
  readonly state: "live" | "rolled_back";
  readonly operationId: string;
  readonly operationFingerprint: string;
  readonly updatedAtIso: string;
  readonly headAuthority: "none_server_cas_and_readback_required";
  readonly runtimeConsumer: false;
  readonly releaseAuthority: false;
  readonly headFingerprint: string;
}

export type V2UnifiedCourseLessonReleaseInputV2 = Readonly<{
  index: LearningV2CourseLessonReleaseIndexV1;
  indexObject: V2RepositoryImmutableObjectPinV1;
  ownerConfirmationObject: V2RepositoryImmutableObjectPinV1;
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const CONTENT_TYPE = "application/json; charset=utf-8" as const;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const rootHandles = new WeakSet<object>();
const headHandles = new WeakSet<object>();
const COURSE_TOPOLOGY_V1 = buildLearningV2CourseTopologyV1();

const PIN_KEYS = Object.freeze([
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);
const LESSON_KEYS = Object.freeze([
  "lessonOrdinal",
  "lessonId",
  "ownerLessonFingerprint",
  "ownerConfirmationFingerprint",
  "ownerConfirmationObject",
  "lessonIndexFingerprint",
  "lessonIndexObject",
  "sessionSetFingerprint",
  "sessionCount",
  "lessonReleaseFingerprint",
] as const);
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "topologySchemaVersion",
  "topologyFingerprint",
  "courseModel",
  "environment",
  "releaseId",
  "planFingerprint",
  "courseContractFingerprint",
  "seasonId",
  "targetLanguage",
  "studyTarget",
  "learnerSourceLocale",
  "interfaceLocales",
  "contentClass",
  "releaseScope",
  "rollout",
  "lessons",
  "lessonCount",
  "sessionsPerLesson",
  "directSessionCount",
  "ownerConfirmationAggregate",
  "lessonIndexAggregate",
  "sessionSetAggregate",
  "inventoryAggregate",
  "inventoryEvidence",
  "contentAuthorship",
  "ownerContentAuthority",
  "machineValidationAuthority",
  "humanApprovalAuthority",
  "publicationDecisionAuthority",
  "executionAuthority",
  "runtimeConsumer",
  "releaseEligible",
  "releaseAuthority",
  "rootFingerprint",
] as const);
const HEAD_KEYS = Object.freeze([
  "schemaVersion",
  "topologyFingerprint",
  "environment",
  "seasonId",
  "targetLanguage",
  "studyTarget",
  "learnerSourceLocale",
  "activeReleaseId",
  "activeRootFingerprint",
  "activeRootObject",
  "previousReleaseId",
  "previousRootFingerprint",
  "previousRootObject",
  "operationRevision",
  "state",
  "operationId",
  "operationFingerprint",
  "updatedAtIso",
  "headAuthority",
  "runtimeConsumer",
  "releaseAuthority",
  "headFingerprint",
] as const);

function fail(code = "invalid"): never {
  throw new Error(`v2_unified_course_release_v2_${code}`);
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (
    actual.length !== expected.length ||
    actual.some((key, index) => key !== expected[index] || RESERVED.has(key))
  )
    fail();
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

function exactId(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value) || RESERVED.has(value))
    fail();
  return value;
}

function exactIso(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) ||
    new Date(value).toISOString() !== value
  )
    fail();
  return value;
}

function exactPin(value: unknown): V2RepositoryImmutableObjectPinV1 {
  if (!record(value)) fail();
  exactKeys(value, PIN_KEYS);
  if (
    typeof value.objectPath !== "string" ||
    value.objectPath.length < 3 ||
    value.objectPath.length > 600 ||
    value.objectPath.startsWith("/") ||
    value.objectPath.includes("..") ||
    value.objectPath.includes("\\") ||
    /%2f|%5c/iu.test(value.objectPath) ||
    !GENERATION_RE.test(String(value.objectGeneration)) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 2 ||
    Number(value.byteSize) > 24 * 1024 * 1024 ||
    value.contentType !== CONTENT_TYPE
  )
    fail();
  return Object.freeze({
    objectPath: value.objectPath,
    contentHash: exactHash(value.contentHash),
    objectGeneration: value.objectGeneration,
    byteSize: value.byteSize,
    contentType: CONTENT_TYPE,
  }) as V2RepositoryImmutableObjectPinV1;
}

export function v2UnifiedCourseLessonIndexObjectPathV2(input: {
  readonly releaseId: string;
  readonly lessonId: string;
  readonly indexFingerprint: string;
  readonly rawHash: string;
}): string {
  return `${V2_UNIFIED_COURSE_LESSON_INDEX_STORAGE_PREFIX_V2}/${sha256Utf8(exactId(input.releaseId))}/${exactId(input.lessonId)}/${exactHash(input.indexFingerprint)}/${exactHash(input.rawHash)}.json`;
}

function preflight(value: unknown): void {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  let nodes = 0;
  while (stack.length) {
    const current = stack.pop()!;
    if (++nodes > 20_000 || current.depth > 24) fail();
    if (typeof current.value === "number") {
      if (
        !Number.isFinite(current.value) ||
        Object.is(current.value, -0) ||
        (Number.isInteger(current.value) &&
          !Number.isSafeInteger(current.value))
      )
        fail();
    } else if (typeof current.value === "string") {
      if (
        current.value.length > 20_000 ||
        current.value.normalize("NFC") !== current.value ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(
          current.value,
        )
      )
        fail();
    } else if (Array.isArray(current.value)) {
      if (current.value.length > LEARNING_V2_COURSE_LESSON_COUNT_V1) fail();
      for (const child of current.value)
        stack.push({ value: child, depth: current.depth + 1 });
    } else if (record(current.value)) {
      const entries = Object.entries(current.value);
      if (entries.length > 64 || entries.some(([key]) => RESERVED.has(key)))
        fail();
      for (const [, child] of entries)
        stack.push({ value: child, depth: current.depth + 1 });
    } else if (current.value !== null && typeof current.value !== "boolean") {
      fail();
    }
  }
}

function lessonBody(
  value: unknown,
  expectedOrdinal: number,
): V2UnifiedCourseLessonReleaseV2 {
  if (!record(value)) fail();
  exactKeys(value, LESSON_KEYS);
  const topology = COURSE_TOPOLOGY_V1;
  const expected = topology.lessons[expectedOrdinal - 1];
  if (
    !expected ||
    value.lessonOrdinal !== expectedOrdinal ||
    value.lessonId !== expected.lessonId ||
    value.sessionCount !== LEARNING_V2_LESSON_SESSION_COUNT_V1
  )
    fail("lesson_coordinate_invalid");
  const body = {
    lessonOrdinal: expectedOrdinal,
    lessonId: expected.lessonId,
    ownerLessonFingerprint: exactHash(value.ownerLessonFingerprint),
    ownerConfirmationFingerprint: exactHash(value.ownerConfirmationFingerprint),
    ownerConfirmationObject: exactPin(value.ownerConfirmationObject),
    lessonIndexFingerprint: exactHash(value.lessonIndexFingerprint),
    lessonIndexObject: exactPin(value.lessonIndexObject),
    sessionSetFingerprint: exactHash(value.sessionSetFingerprint),
    sessionCount: LEARNING_V2_LESSON_SESSION_COUNT_V1,
  };
  if (value.lessonReleaseFingerprint !== hashCanonicalBody(body))
    fail("lesson_fingerprint_mismatch");
  return Object.freeze({
    ...body,
    lessonReleaseFingerprint: value.lessonReleaseFingerprint as string,
  });
}

function aggregate(
  lessons: readonly V2UnifiedCourseLessonReleaseV2[],
  key: keyof V2UnifiedCourseLessonReleaseV2,
) {
  return hashCanonicalBody(
    lessons.map((lesson) => ({
      lessonOrdinal: lesson.lessonOrdinal,
      value: lesson[key],
    })),
  );
}

function exactRollout(value: unknown): V2UnifiedCourseReleaseRootV2["rollout"] {
  if (!record(value)) fail("rollout_invalid");
  exactKeys(value, [
    "revision",
    "state",
    "percent",
    "cohortSaltVersion",
    "allowlistCohortIds",
    "excludeCohortIds",
  ]);
  if (
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 1 ||
    !["internal", "rolling_out", "live", "paused"].includes(
      String(value.state),
    ) ||
    ![0, 1, 5, 10, 25, 50, 100].includes(Number(value.percent)) ||
    !Number.isSafeInteger(value.cohortSaltVersion) ||
    Number(value.cohortSaltVersion) < 1 ||
    !Array.isArray(value.allowlistCohortIds) ||
    !Array.isArray(value.excludeCohortIds)
  )
    fail("rollout_invalid");
  const allow = value.allowlistCohortIds.map(exactHash);
  const exclude = value.excludeCohortIds.map(exactHash);
  if (
    new Set(allow).size !== allow.length ||
    new Set(exclude).size !== exclude.length ||
    allow.some((entry, index) => index > 0 && allow[index - 1]! >= entry) ||
    exclude.some((entry, index) => index > 0 && exclude[index - 1]! >= entry) ||
    allow.some((entry) => exclude.includes(entry))
  )
    fail("rollout_invalid");
  return Object.freeze({
    revision: value.revision as number,
    state: value.state as V2UnifiedCourseReleaseRootV2["rollout"]["state"],
    percent:
      value.percent as V2UnifiedCourseReleaseRootV2["rollout"]["percent"],
    cohortSaltVersion: value.cohortSaltVersion as number,
    allowlistCohortIds: Object.freeze(allow),
    excludeCohortIds: Object.freeze(exclude),
  });
}

function buildRoot(input: {
  environment: V2UnifiedCourseReleaseRootV2["environment"];
  releaseId: string;
  planFingerprint: string;
  courseContractFingerprint: string;
  seasonId: string;
  targetLanguage: string;
  studyTarget: string;
  learnerSourceLocale: string;
  interfaceLocales: readonly string[];
  contentClass: V2UnifiedCourseReleaseRootV2["contentClass"];
  releaseScope: V2UnifiedCourseReleaseRootV2["releaseScope"];
  rollout: V2UnifiedCourseReleaseRootV2["rollout"];
  lessons: readonly V2UnifiedCourseLessonReleaseV2[];
}): V2UnifiedCourseReleaseRootV2 {
  const topology = COURSE_TOPOLOGY_V1;
  const expectedCount = input.releaseScope === "full_course" ? 32 : 1;
  if (
    input.lessons.length !== expectedCount ||
    !["lab", "staging", "production"].includes(input.environment) ||
    // зачем: боевой релиз принимал ТОЛЬКО полный курс из 32 уроков, поэтому
    // готовый первый урок невозможно было выложить — приложение отвечало
    // «Сессия недоступна / NOT FOUND». Владелец разрешил неполный курс
    // (2026-08-16, повторно), чтобы проверять уроки по мере написания.
    //
    // Ослабление узкое: contentClass в проде по-прежнему обязан быть
    // production_candidate, а vertical_slice — начинаться с первого урока
    // (проверка ниже). Полный сезон по-прежнему требует ровно 32 урока.
    (input.environment === "production" &&
      input.contentClass !== "production_candidate") ||
    (input.environment !== "production" &&
      input.contentClass !== "neutral_test_fixture") ||
    (input.releaseScope === "vertical_slice" &&
      input.lessons[0]?.lessonOrdinal !== 1)
  )
    fail("scope_invalid");
  if (
    !parseV2ExactLanguageTagV1(input.targetLanguage) ||
    !parseV2ExactLanguageTagV1(input.studyTarget) ||
    !parseV2ExactLanguageTagV1(input.learnerSourceLocale) ||
    input.interfaceLocales.length !== LEARNING_V2_INTERFACE_LOCALES.length ||
    input.interfaceLocales.some(
      (locale, index) => locale !== LEARNING_V2_INTERFACE_LOCALES[index],
    )
  )
    fail("locale_invalid");
  const body = {
    schemaVersion: V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V2,
    topologySchemaVersion: topology.schemaVersion,
    topologyFingerprint: topology.topologyFingerprint,
    courseModel:
      "direct_32_lessons_56_sessions_no_hidden_episode_grouping" as const,
    environment: input.environment,
    releaseId: exactId(input.releaseId),
    planFingerprint: exactHash(input.planFingerprint),
    courseContractFingerprint: exactHash(input.courseContractFingerprint),
    seasonId: exactId(input.seasonId),
    targetLanguage: input.targetLanguage,
    studyTarget: input.studyTarget,
    learnerSourceLocale: input.learnerSourceLocale,
    interfaceLocales: Object.freeze([...input.interfaceLocales]),
    contentClass: input.contentClass,
    releaseScope: input.releaseScope,
    rollout: exactRollout(input.rollout),
    lessons: Object.freeze([...input.lessons]),
    lessonCount: input.lessons.length,
    sessionsPerLesson: LEARNING_V2_LESSON_SESSION_COUNT_V1,
    directSessionCount:
      input.lessons.length * LEARNING_V2_LESSON_SESSION_COUNT_V1,
    ownerConfirmationAggregate: aggregate(
      input.lessons,
      "ownerConfirmationFingerprint",
    ),
    lessonIndexAggregate: aggregate(input.lessons, "lessonIndexFingerprint"),
    sessionSetAggregate: aggregate(input.lessons, "sessionSetFingerprint"),
    inventoryAggregate: hashCanonicalBody(input.lessons),
    inventoryEvidence: "immutable_lesson_index_and_confirmation_pins" as const,
    contentAuthorship: "owner_only" as const,
    ownerContentAuthority: "none_structural_confirmation_pins_only" as const,
    machineValidationAuthority:
      "structural_direct_56_inventory_join_only" as const,
    humanApprovalAuthority: "none_activation_confirmation_required" as const,
    publicationDecisionAuthority: "none" as const,
    executionAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  if (
    input.releaseScope === "full_course" &&
    body.directSessionCount !== LEARNING_V2_COURSE_SESSION_COUNT_V1
  )
    fail("session_count_invalid");
  const root = Object.freeze({
    ...body,
    rootFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(root)) >
    V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2
  )
    fail("oversize");
  rootHandles.add(root);
  return root;
}

export function materializeV2UnifiedCourseReleaseRootV2(input: {
  readonly environment: V2UnifiedCourseReleaseRootV2["environment"];
  readonly releaseId: string;
  readonly planFingerprint: string;
  readonly courseContractFingerprint: string;
  readonly seasonId: string;
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly interfaceLocales: readonly string[];
  readonly contentClass: V2UnifiedCourseReleaseRootV2["contentClass"];
  readonly releaseScope: V2UnifiedCourseReleaseRootV2["releaseScope"];
  readonly rollout: V2UnifiedCourseReleaseRootV2["rollout"];
  readonly lessons: readonly V2UnifiedCourseLessonReleaseInputV2[];
}): V2UnifiedCourseReleaseRootV2 {
  if (!record(input) || !Array.isArray(input.lessons)) fail();
  const lessons = input.lessons.map((entry, index) => {
    if (
      !record(entry) ||
      !isLearningV2CourseLessonReleaseIndexV1(entry.index) ||
      entry.index.releaseId !== input.releaseId ||
      entry.index.lessonOrdinal !== index + 1
    )
      fail("lesson_index_invalid");
    const indexRaw = encodeLearningV2CourseLessonReleaseIndexV1(entry.index);
    const indexRawHash = sha256Utf8(indexRaw);
    const indexObject = exactPin(entry.indexObject);
    if (
      indexObject.objectPath !==
        v2UnifiedCourseLessonIndexObjectPathV2({
          releaseId: input.releaseId,
          lessonId: entry.index.lessonId,
          indexFingerprint: entry.index.indexFingerprint,
          rawHash: indexRawHash,
        }) ||
      indexObject.contentHash !== indexRawHash ||
      indexObject.byteSize !== utf8ByteLengthV1(indexRaw)
    )
      fail("lesson_index_pin_invalid");
    const body = {
      lessonOrdinal: entry.index.lessonOrdinal,
      lessonId: entry.index.lessonId,
      ownerLessonFingerprint: entry.index.ownerLessonFingerprint,
      ownerConfirmationFingerprint: entry.index.ownerConfirmationFingerprint,
      ownerConfirmationObject: exactPin(entry.ownerConfirmationObject),
      lessonIndexFingerprint: entry.index.indexFingerprint,
      lessonIndexObject: indexObject,
      sessionSetFingerprint: entry.index.sessionSetFingerprint,
      sessionCount: LEARNING_V2_LESSON_SESSION_COUNT_V1,
    };
    return Object.freeze({
      ...body,
      lessonReleaseFingerprint: hashCanonicalBody(body),
    });
  });
  return buildRoot({ ...input, lessons });
}

export function parseV2UnifiedCourseReleaseRootV2(
  raw: string,
): V2UnifiedCourseReleaseRootV2 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2 ||
    utf8ByteLengthV1(raw) > V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V2
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  preflight(value);
  if (!record(value) || canonicalJsonV1(value) !== raw) fail();
  exactKeys(value, ROOT_KEYS);
  if (!Array.isArray(value.lessons)) fail();
  const lessons = value.lessons.map((lesson, index) =>
    lessonBody(lesson, index + 1),
  );
  const rebuilt = buildRoot({
    environment:
      value.environment as V2UnifiedCourseReleaseRootV2["environment"],
    releaseId: value.releaseId as string,
    planFingerprint: value.planFingerprint as string,
    courseContractFingerprint: value.courseContractFingerprint as string,
    seasonId: value.seasonId as string,
    targetLanguage: value.targetLanguage as string,
    studyTarget: value.studyTarget as string,
    learnerSourceLocale: value.learnerSourceLocale as string,
    interfaceLocales: value.interfaceLocales as string[],
    contentClass:
      value.contentClass as V2UnifiedCourseReleaseRootV2["contentClass"],
    releaseScope:
      value.releaseScope as V2UnifiedCourseReleaseRootV2["releaseScope"],
    rollout: value.rollout as V2UnifiedCourseReleaseRootV2["rollout"],
    lessons,
  });
  if (canonicalJsonV1(rebuilt) !== raw) fail();
  return rebuilt;
}

export function isV2UnifiedCourseReleaseRootV2(
  value: unknown,
): value is V2UnifiedCourseReleaseRootV2 {
  return record(value) && rootHandles.has(value);
}

function buildHead(input: {
  current: V2UnifiedCourseReleaseHeadV2 | null;
  target: V2UnifiedCourseReleaseRootV2;
  targetObject: V2RepositoryImmutableObjectPinV1;
  action: "activate" | "rollback";
  expectedRevision: number;
  operationId: string;
  updatedAtIso: string;
}): Readonly<{
  kind: "commit" | "exact_replay";
  head: V2UnifiedCourseReleaseHeadV2;
}> {
  if (!isV2UnifiedCourseReleaseRootV2(input.target))
    fail("root_handle_invalid");
  const targetObject = exactPin(input.targetObject);
  const operationId = exactId(input.operationId);
  const operationFingerprint = hashCanonicalBody({
    action: input.action,
    operationId,
    targetRootFingerprint: input.target.rootFingerprint,
    targetObject,
    expectedRevision: input.expectedRevision,
  });
  if (
    input.current &&
    headHandles.has(input.current) &&
    input.current.operationFingerprint === operationFingerprint
  )
    return Object.freeze({ kind: "exact_replay", head: input.current });
  if (
    !Number.isSafeInteger(input.expectedRevision) ||
    input.expectedRevision < 0 ||
    (input.current?.operationRevision ?? 0) !== input.expectedRevision
  )
    fail("head_conflict");
  if (
    input.current &&
    (input.current.topologyFingerprint !== input.target.topologyFingerprint ||
      input.current.environment !== input.target.environment ||
      input.current.seasonId !== input.target.seasonId ||
      input.current.targetLanguage !== input.target.targetLanguage ||
      input.current.studyTarget !== input.target.studyTarget ||
      input.current.learnerSourceLocale !== input.target.learnerSourceLocale)
  )
    fail("head_scope_mismatch");
  if (input.current?.activeRootFingerprint === input.target.rootFingerprint)
    fail("head_same_release");
  if (
    input.action === "rollback" &&
    (!input.current ||
      input.current.previousReleaseId !== input.target.releaseId ||
      input.current.previousRootFingerprint !== input.target.rootFingerprint ||
      canonicalJsonV1(input.current.previousRootObject) !==
        canonicalJsonV1(targetObject))
  )
    fail("rollback_target_invalid");
  const body = {
    schemaVersion: V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V2,
    topologyFingerprint: input.target.topologyFingerprint,
    environment: input.target.environment,
    seasonId: input.target.seasonId,
    targetLanguage: input.target.targetLanguage,
    studyTarget: input.target.studyTarget,
    learnerSourceLocale: input.target.learnerSourceLocale,
    activeReleaseId: input.target.releaseId,
    activeRootFingerprint: input.target.rootFingerprint,
    activeRootObject: targetObject,
    previousReleaseId: input.current?.activeReleaseId ?? null,
    previousRootFingerprint: input.current?.activeRootFingerprint ?? null,
    previousRootObject: input.current?.activeRootObject ?? null,
    operationRevision: input.expectedRevision + 1,
    state:
      input.action === "rollback"
        ? ("rolled_back" as const)
        : ("live" as const),
    operationId,
    operationFingerprint,
    updatedAtIso: exactIso(input.updatedAtIso),
    headAuthority: "none_server_cas_and_readback_required" as const,
    runtimeConsumer: false as const,
    releaseAuthority: false as const,
  };
  const head = Object.freeze({
    ...body,
    headFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(head)) >
    V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V2
  )
    fail("head_oversize");
  headHandles.add(head);
  return Object.freeze({ kind: "commit", head });
}

export const decideV2UnifiedCourseReleaseHeadV2 = buildHead;

export function parseV2UnifiedCourseReleaseHeadV2(
  raw: string,
): V2UnifiedCourseReleaseHeadV2 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V2 ||
    utf8ByteLengthV1(raw) > V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V2
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  preflight(value);
  if (!record(value) || canonicalJsonV1(value) !== raw) fail();
  exactKeys(value, HEAD_KEYS);
  const activeRootObject = exactPin(value.activeRootObject);
  const previousRootObject =
    value.previousRootObject === null
      ? null
      : exactPin(value.previousRootObject);
  if (
    (value.previousReleaseId === null) !==
      (value.previousRootFingerprint === null) ||
    (value.previousReleaseId === null) !== (previousRootObject === null)
  )
    fail();
  const body = {
    schemaVersion: V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V2,
    topologyFingerprint: exactHash(value.topologyFingerprint),
    environment:
      value.environment as V2UnifiedCourseReleaseHeadV2["environment"],
    seasonId: exactId(value.seasonId),
    targetLanguage: value.targetLanguage as string,
    studyTarget: value.studyTarget as string,
    learnerSourceLocale: value.learnerSourceLocale as string,
    activeReleaseId: exactId(value.activeReleaseId),
    activeRootFingerprint: exactHash(value.activeRootFingerprint),
    activeRootObject,
    previousReleaseId:
      value.previousReleaseId === null
        ? null
        : exactId(value.previousReleaseId),
    previousRootFingerprint:
      value.previousRootFingerprint === null
        ? null
        : exactHash(value.previousRootFingerprint),
    previousRootObject,
    operationRevision: value.operationRevision as number,
    state: value.state as "live" | "rolled_back",
    operationId: exactId(value.operationId),
    operationFingerprint: exactHash(value.operationFingerprint),
    updatedAtIso: exactIso(value.updatedAtIso),
    headAuthority: "none_server_cas_and_readback_required" as const,
    runtimeConsumer: false as const,
    releaseAuthority: false as const,
  };
  if (
    value.schemaVersion !== body.schemaVersion ||
    !["lab", "staging", "production"].includes(body.environment) ||
    !parseV2ExactLanguageTagV1(body.targetLanguage) ||
    !parseV2ExactLanguageTagV1(body.studyTarget) ||
    !parseV2ExactLanguageTagV1(body.learnerSourceLocale) ||
    !Number.isSafeInteger(body.operationRevision) ||
    body.operationRevision < 1 ||
    !["live", "rolled_back"].includes(body.state) ||
    value.headAuthority !== body.headAuthority ||
    value.runtimeConsumer !== false ||
    value.releaseAuthority !== false ||
    value.headFingerprint !== hashCanonicalBody(body)
  )
    fail();
  const head = Object.freeze({
    ...body,
    headFingerprint: value.headFingerprint as string,
  });
  headHandles.add(head);
  return head;
}

export function isV2UnifiedCourseReleaseHeadV2(
  value: unknown,
): value is V2UnifiedCourseReleaseHeadV2 {
  return record(value) && headHandles.has(value);
}
