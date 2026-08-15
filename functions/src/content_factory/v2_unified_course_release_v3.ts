import { V2_REQUIRED_VOICE_IDS } from "../../../modules/learning-v2/contracts/voice_playback_policy_v1";
import { parseV2ExactLanguageTagV1 } from "../../../modules/learning-v2/contracts/language_tag_v1";
import {
  LEARNING_V2_COURSE_SESSION_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
} from "../../../modules/learning-v2/content/course_topology_v1";
import {
  encodeLearningV2CourseLessonAudioReleaseIndexV1,
  isLearningV2CourseLessonAudioReleaseIndexV1,
  learningV2CourseLessonAudioReleaseIndexObjectPathV1,
  type LearningV2CourseLessonAudioReleaseIndexV1,
} from "../../../modules/learning-v2/runtime/course_lesson_audio_release_index_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../../../modules/learning-v2/policies/decision_registry";
import type { V2RepositoryImmutableObjectPinV1 } from "./v2_firebase_repository_persistence_v1";
import { v2UnifiedCourseReleaseRootObjectPathV2 } from "./v2_unified_course_release_repository_v2";
import {
  V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V2,
  isV2UnifiedCourseReleaseRootV2,
  type V2UnifiedCourseReleaseRootV2,
} from "./v2_unified_course_release_v2";

export const V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V3 =
  "v2-unified-course-release-root.v3" as const;
export const V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V3 =
  "v2-unified-course-release-head.v3" as const;
export const V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3 = 512 * 1024;
export const V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V3 = 32 * 1024;

export interface V2UnifiedCourseAudioLessonReleaseV3 {
  readonly lessonOrdinal: number;
  readonly lessonId: string;
  readonly baseLessonIndexFingerprint: string;
  readonly audioIndexFingerprint: string;
  readonly audioIndexObject: V2RepositoryImmutableObjectPinV1;
  readonly extensionSetFingerprint: string;
  readonly audioSetFingerprint: string;
  readonly sessionCount: 56;
  readonly lessonAudioReleaseFingerprint: string;
}

export interface V2UnifiedCourseReleaseRootV3 {
  readonly schemaVersion: typeof V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V3;
  readonly baseRootSchemaVersion: typeof V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V2;
  readonly topologySchemaVersion: string;
  readonly topologyFingerprint: string;
  readonly courseModel: "direct_32_lessons_56_sessions_audio_required";
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
  readonly baseRootFingerprint: string;
  readonly baseRootObject: V2RepositoryImmutableObjectPinV1;
  readonly lessons: readonly V2UnifiedCourseAudioLessonReleaseV3[];
  readonly lessonCount: number;
  readonly sessionsPerLesson: 56;
  readonly directSessionCount: number;
  readonly audioLessonIndexAggregate: string;
  readonly audioExtensionAggregate: string;
  readonly audioSetAggregate: string;
  readonly audioCoverage: "exact_audio_extension_for_every_released_session";
  readonly requiredVoiceIds: typeof V2_REQUIRED_VOICE_IDS;
  readonly variantsPerAudioCoordinate: 4;
  readonly taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words";
  readonly playbackTransport: "generation_pinned_local_file_only";
  readonly serverRequestPerPlayback: false;
  readonly remoteTtsFallbackDuringSession: false;
  readonly answerPayload: "absent_by_exact_schema";
  readonly correctnessAuthority: "local_device_only";
  readonly serverAnswerAuthority: "none_answers_never_transported_or_rechecked";
  readonly repositoryOriginAuthority: "none_server_readback_required";
  readonly storageAuthority: "none_server_readback_required";
  readonly publicationDecisionAuthority: "none";
  readonly executionAuthority: "none";
  readonly runtimeConsumer: false;
  readonly releaseEligible: false;
  readonly releaseAuthority: false;
  readonly rootFingerprint: string;
}

export interface V2UnifiedCourseReleaseHeadV3 {
  readonly schemaVersion: typeof V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V3;
  readonly topologyFingerprint: string;
  readonly environment: V2UnifiedCourseReleaseRootV3["environment"];
  readonly seasonId: string;
  readonly targetLanguage: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly activeReleaseId: string;
  readonly activeRootFingerprint: string;
  readonly activeBaseRootFingerprint: string;
  readonly activeRootObject: V2RepositoryImmutableObjectPinV1;
  readonly previousReleaseId: string | null;
  readonly previousRootFingerprint: string | null;
  readonly previousBaseRootFingerprint: string | null;
  readonly previousRootObject: V2RepositoryImmutableObjectPinV1 | null;
  readonly operationRevision: number;
  readonly state: "live" | "rolled_back";
  readonly operationId: string;
  readonly operationFingerprint: string;
  readonly updatedAtIso: string;
  readonly headAuthority: "none_server_cas_and_readback_required";
  readonly serverAnswerAuthority: "none_answers_never_transported_or_rechecked";
  readonly runtimeConsumer: false;
  readonly releaseAuthority: false;
  readonly headFingerprint: string;
}

export type V2UnifiedCourseAudioLessonReleaseInputV3 = Readonly<{
  index: LearningV2CourseLessonAudioReleaseIndexV1;
  indexObject: V2RepositoryImmutableObjectPinV1;
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const handles = new WeakSet<object>();
const headHandles = new WeakSet<object>();
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
  "baseLessonIndexFingerprint",
  "audioIndexFingerprint",
  "audioIndexObject",
  "extensionSetFingerprint",
  "audioSetFingerprint",
  "sessionCount",
  "lessonAudioReleaseFingerprint",
] as const);
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "baseRootSchemaVersion",
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
  "baseRootFingerprint",
  "baseRootObject",
  "lessons",
  "lessonCount",
  "sessionsPerLesson",
  "directSessionCount",
  "audioLessonIndexAggregate",
  "audioExtensionAggregate",
  "audioSetAggregate",
  "audioCoverage",
  "requiredVoiceIds",
  "variantsPerAudioCoordinate",
  "taskVoiceScope",
  "playbackTransport",
  "serverRequestPerPlayback",
  "remoteTtsFallbackDuringSession",
  "answerPayload",
  "correctnessAuthority",
  "serverAnswerAuthority",
  "repositoryOriginAuthority",
  "storageAuthority",
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
  "activeBaseRootFingerprint",
  "activeRootObject",
  "previousReleaseId",
  "previousRootFingerprint",
  "previousBaseRootFingerprint",
  "previousRootObject",
  "operationRevision",
  "state",
  "operationId",
  "operationFingerprint",
  "updatedAtIso",
  "headAuthority",
  "serverAnswerAuthority",
  "runtimeConsumer",
  "releaseAuthority",
  "headFingerprint",
] as const);

function fail(): never {
  throw new Error("v2_unified_course_release_v3_invalid");
}

function record(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
) {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (
    actual.length !== wanted.length ||
    actual.some((key, index) => key !== wanted[index] || RESERVED.has(key))
  )
    fail();
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

function exactId(value: unknown): string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(value) ||
    RESERVED.has(value)
  )
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
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 2 ||
    value.contentType !== "application/json; charset=utf-8"
  )
    fail();
  return Object.freeze({
    objectPath: value.objectPath,
    contentHash: exactHash(value.contentHash),
    objectGeneration: value.objectGeneration,
    byteSize: Number(value.byteSize),
    contentType: "application/json; charset=utf-8" as const,
  });
}

function lessonFromRaw(
  value: unknown,
  expected: V2UnifiedCourseReleaseRootV2["lessons"][number],
): V2UnifiedCourseAudioLessonReleaseV3 {
  if (!record(value)) fail();
  exactKeys(value, LESSON_KEYS);
  const body = {
    lessonOrdinal: expected.lessonOrdinal,
    lessonId: expected.lessonId,
    baseLessonIndexFingerprint: expected.lessonIndexFingerprint,
    audioIndexFingerprint: exactHash(value.audioIndexFingerprint),
    audioIndexObject: exactPin(value.audioIndexObject),
    extensionSetFingerprint: exactHash(value.extensionSetFingerprint),
    audioSetFingerprint: exactHash(value.audioSetFingerprint),
    sessionCount: LEARNING_V2_LESSON_SESSION_COUNT_V1,
  };
  if (
    value.lessonOrdinal !== body.lessonOrdinal ||
    value.lessonId !== body.lessonId ||
    value.baseLessonIndexFingerprint !== body.baseLessonIndexFingerprint ||
    value.sessionCount !== body.sessionCount ||
    value.lessonAudioReleaseFingerprint !== hashCanonicalBody(body)
  )
    fail();
  return Object.freeze({
    ...body,
    lessonAudioReleaseFingerprint:
      value.lessonAudioReleaseFingerprint as string,
  });
}

function build(
  baseRoot: V2UnifiedCourseReleaseRootV2,
  baseRootObject: V2RepositoryImmutableObjectPinV1,
  lessons: readonly V2UnifiedCourseAudioLessonReleaseV3[],
): V2UnifiedCourseReleaseRootV3 {
  const body = {
    schemaVersion: V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V3,
    baseRootSchemaVersion: V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V2,
    topologySchemaVersion: baseRoot.topologySchemaVersion,
    topologyFingerprint: baseRoot.topologyFingerprint,
    courseModel: "direct_32_lessons_56_sessions_audio_required" as const,
    environment: baseRoot.environment,
    releaseId: baseRoot.releaseId,
    planFingerprint: baseRoot.planFingerprint,
    courseContractFingerprint: baseRoot.courseContractFingerprint,
    seasonId: baseRoot.seasonId,
    targetLanguage: baseRoot.targetLanguage,
    studyTarget: baseRoot.studyTarget,
    learnerSourceLocale: baseRoot.learnerSourceLocale,
    interfaceLocales: Object.freeze([...baseRoot.interfaceLocales]),
    contentClass: baseRoot.contentClass,
    releaseScope: baseRoot.releaseScope,
    rollout: baseRoot.rollout,
    baseRootFingerprint: baseRoot.rootFingerprint,
    baseRootObject,
    lessons: Object.freeze([...lessons]),
    lessonCount: lessons.length,
    sessionsPerLesson: LEARNING_V2_LESSON_SESSION_COUNT_V1,
    directSessionCount: lessons.length * LEARNING_V2_LESSON_SESSION_COUNT_V1,
    audioLessonIndexAggregate: hashCanonicalBody(
      lessons.map((lesson) => lesson.audioIndexFingerprint),
    ),
    audioExtensionAggregate: hashCanonicalBody(
      lessons.map((lesson) => lesson.extensionSetFingerprint),
    ),
    audioSetAggregate: hashCanonicalBody(
      lessons.map((lesson) => lesson.audioSetFingerprint),
    ),
    audioCoverage: "exact_audio_extension_for_every_released_session" as const,
    requiredVoiceIds: V2_REQUIRED_VOICE_IDS,
    variantsPerAudioCoordinate: 4 as const,
    taskVoiceScope: "one_voice_per_interaction_for_phrase_and_words" as const,
    playbackTransport: "generation_pinned_local_file_only" as const,
    serverRequestPerPlayback: false as const,
    remoteTtsFallbackDuringSession: false as const,
    answerPayload: "absent_by_exact_schema" as const,
    correctnessAuthority: "local_device_only" as const,
    serverAnswerAuthority:
      "none_answers_never_transported_or_rechecked" as const,
    repositoryOriginAuthority: "none_server_readback_required" as const,
    storageAuthority: "none_server_readback_required" as const,
    publicationDecisionAuthority: "none" as const,
    executionAuthority: "none" as const,
    runtimeConsumer: false as const,
    releaseEligible: false as const,
    releaseAuthority: false as const,
  };
  const result = Object.freeze({
    ...body,
    rootFingerprint: hashCanonicalBody(body),
  });
  if (
    (baseRoot.releaseScope === "full_course" &&
      result.directSessionCount !== LEARNING_V2_COURSE_SESSION_COUNT_V1) ||
    utf8ByteLengthV1(canonicalJsonV1(result)) >
      V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3
  )
    fail();
  handles.add(result);
  return result;
}

export function materializeV2UnifiedCourseReleaseRootV3(
  input: Readonly<{
    baseRoot: V2UnifiedCourseReleaseRootV2;
    baseRootObject: V2RepositoryImmutableObjectPinV1;
    lessons: readonly V2UnifiedCourseAudioLessonReleaseInputV3[];
  }>,
): V2UnifiedCourseReleaseRootV3 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !== "baseRoot|baseRootObject|lessons" ||
    !isV2UnifiedCourseReleaseRootV2(input.baseRoot) ||
    !Array.isArray(input.lessons) ||
    input.lessons.length !== input.baseRoot.lessons.length
  )
    fail();
  const baseRaw = canonicalJsonV1(input.baseRoot);
  const baseRawHash = sha256Utf8(baseRaw);
  const baseRootObject = exactPin(input.baseRootObject);
  if (
    baseRootObject.objectPath !==
      v2UnifiedCourseReleaseRootObjectPathV2({
        releaseId: input.baseRoot.releaseId,
        rootFingerprint: input.baseRoot.rootFingerprint,
        rawHash: baseRawHash,
      }) ||
    baseRootObject.contentHash !== baseRawHash ||
    baseRootObject.byteSize !== utf8ByteLengthV1(baseRaw)
  )
    fail();
  const lessons = input.baseRoot.lessons.map((baseLesson, index) => {
    const source = input.lessons[index];
    if (
      !source ||
      !isLearningV2CourseLessonAudioReleaseIndexV1(source.index) ||
      source.index.releaseId !== input.baseRoot.releaseId ||
      source.index.lessonId !== baseLesson.lessonId ||
      source.index.lessonOrdinal !== baseLesson.lessonOrdinal ||
      source.index.baseLessonIndexFingerprint !==
        baseLesson.lessonIndexFingerprint
    )
      fail();
    const raw = encodeLearningV2CourseLessonAudioReleaseIndexV1(source.index);
    const rawHash = sha256Utf8(raw);
    const indexObject = exactPin(source.indexObject);
    if (
      indexObject.objectPath !==
        learningV2CourseLessonAudioReleaseIndexObjectPathV1({
          releaseId: source.index.releaseId,
          lessonId: source.index.lessonId,
          indexFingerprint: source.index.indexFingerprint,
          rawHash,
        }) ||
      indexObject.contentHash !== rawHash ||
      indexObject.byteSize !== utf8ByteLengthV1(raw)
    )
      fail();
    const body = {
      lessonOrdinal: baseLesson.lessonOrdinal,
      lessonId: baseLesson.lessonId,
      baseLessonIndexFingerprint: baseLesson.lessonIndexFingerprint,
      audioIndexFingerprint: source.index.indexFingerprint,
      audioIndexObject: indexObject,
      extensionSetFingerprint: source.index.extensionSetFingerprint,
      audioSetFingerprint: source.index.audioSetFingerprint,
      sessionCount: LEARNING_V2_LESSON_SESSION_COUNT_V1,
    };
    return Object.freeze({
      ...body,
      lessonAudioReleaseFingerprint: hashCanonicalBody(body),
    });
  });
  return build(input.baseRoot, baseRootObject, lessons);
}

export function parseV2UnifiedCourseReleaseRootV3(
  raw: string,
  baseRoot: V2UnifiedCourseReleaseRootV2,
): V2UnifiedCourseReleaseRootV3 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3 ||
    utf8ByteLengthV1(raw) > V2_UNIFIED_COURSE_RELEASE_ROOT_MAX_BYTES_V3 ||
    !isV2UnifiedCourseReleaseRootV2(baseRoot)
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (!record(value) || canonicalJsonV1(value) !== raw) fail();
  exactKeys(value, ROOT_KEYS);
  if (
    value.schemaVersion !== V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V3 ||
    value.baseRootSchemaVersion !== V2_UNIFIED_COURSE_RELEASE_ROOT_SCHEMA_V2 ||
    value.baseRootFingerprint !== baseRoot.rootFingerprint ||
    !Array.isArray(value.lessons) ||
    value.lessons.length !== baseRoot.lessons.length
  )
    fail();
  const lessons = value.lessons.map((lesson, index) =>
    lessonFromRaw(lesson, baseRoot.lessons[index]!),
  );
  const rebuilt = build(baseRoot, exactPin(value.baseRootObject), lessons);
  if (canonicalJsonV1(rebuilt) !== raw) fail();
  return rebuilt;
}

export function encodeV2UnifiedCourseReleaseRootV3(
  value: V2UnifiedCourseReleaseRootV3,
): string {
  if (!handles.has(value)) fail();
  return canonicalJsonV1(value);
}

export function isV2UnifiedCourseReleaseRootV3(
  value: unknown,
): value is V2UnifiedCourseReleaseRootV3 {
  return typeof value === "object" && value !== null && handles.has(value);
}

function buildHead(
  input: Readonly<{
    current: V2UnifiedCourseReleaseHeadV3 | null;
    target: V2UnifiedCourseReleaseRootV3;
    targetObject: V2RepositoryImmutableObjectPinV1;
    action: "activate" | "rollback";
    expectedRevision: number;
    operationId: string;
    updatedAtIso: string;
  }>,
): Readonly<{
  kind: "commit" | "exact_replay";
  head: V2UnifiedCourseReleaseHeadV3;
}> {
  if (!isV2UnifiedCourseReleaseRootV3(input.target)) fail();
  if (input.current !== null && !headHandles.has(input.current)) fail();
  const targetObject = exactPin(input.targetObject);
  const operationId = exactId(input.operationId);
  const operationFingerprint = hashCanonicalBody({
    action: input.action,
    operationId,
    targetRootFingerprint: input.target.rootFingerprint,
    targetBaseRootFingerprint: input.target.baseRootFingerprint,
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
    input.expectedRevision >= Number.MAX_SAFE_INTEGER ||
    (input.current?.operationRevision ?? 0) !== input.expectedRevision
  )
    fail();
  if (
    input.current &&
    (input.current.topologyFingerprint !== input.target.topologyFingerprint ||
      input.current.environment !== input.target.environment ||
      input.current.seasonId !== input.target.seasonId ||
      input.current.targetLanguage !== input.target.targetLanguage ||
      input.current.studyTarget !== input.target.studyTarget ||
      input.current.learnerSourceLocale !== input.target.learnerSourceLocale)
  )
    fail();
  if (input.current?.activeRootFingerprint === input.target.rootFingerprint)
    fail();
  if (
    input.action === "rollback" &&
    (!input.current ||
      input.current.previousReleaseId !== input.target.releaseId ||
      input.current.previousRootFingerprint !== input.target.rootFingerprint ||
      input.current.previousBaseRootFingerprint !==
        input.target.baseRootFingerprint ||
      canonicalJsonV1(input.current.previousRootObject) !==
        canonicalJsonV1(targetObject))
  )
    fail();
  const body = {
    schemaVersion: V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V3,
    topologyFingerprint: input.target.topologyFingerprint,
    environment: input.target.environment,
    seasonId: input.target.seasonId,
    targetLanguage: input.target.targetLanguage,
    studyTarget: input.target.studyTarget,
    learnerSourceLocale: input.target.learnerSourceLocale,
    activeReleaseId: input.target.releaseId,
    activeRootFingerprint: input.target.rootFingerprint,
    activeBaseRootFingerprint: input.target.baseRootFingerprint,
    activeRootObject: targetObject,
    previousReleaseId: input.current?.activeReleaseId ?? null,
    previousRootFingerprint: input.current?.activeRootFingerprint ?? null,
    previousBaseRootFingerprint:
      input.current?.activeBaseRootFingerprint ?? null,
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
    serverAnswerAuthority:
      "none_answers_never_transported_or_rechecked" as const,
    runtimeConsumer: false as const,
    releaseAuthority: false as const,
  };
  const head = Object.freeze({
    ...body,
    headFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(head)) >
    V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V3
  )
    fail();
  headHandles.add(head);
  return Object.freeze({ kind: "commit", head });
}

export const decideV2UnifiedCourseReleaseHeadV3 = buildHead;

export function parseV2UnifiedCourseReleaseHeadV3(
  raw: string,
): V2UnifiedCourseReleaseHeadV3 {
  if (
    typeof raw !== "string" ||
    raw.length > V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V3 ||
    utf8ByteLengthV1(raw) > V2_UNIFIED_COURSE_RELEASE_HEAD_MAX_BYTES_V3
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (!record(value) || canonicalJsonV1(value) !== raw) fail();
  exactKeys(value, HEAD_KEYS);
  const activeRootObject = exactPin(value.activeRootObject);
  const previousRootObject =
    value.previousRootObject === null
      ? null
      : exactPin(value.previousRootObject);
  if (
    value.schemaVersion !== V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V3 ||
    (value.environment !== "lab" &&
      value.environment !== "staging" &&
      value.environment !== "production") ||
    parseV2ExactLanguageTagV1(value.targetLanguage) === null ||
    parseV2ExactLanguageTagV1(value.studyTarget) === null ||
    parseV2ExactLanguageTagV1(value.learnerSourceLocale) === null ||
    (value.previousReleaseId === null) !==
      (value.previousRootFingerprint === null) ||
    (value.previousReleaseId === null) !==
      (value.previousBaseRootFingerprint === null) ||
    (value.previousReleaseId === null) !== (previousRootObject === null) ||
    !Number.isSafeInteger(value.operationRevision) ||
    Number(value.operationRevision) < 1 ||
    (value.state !== "live" && value.state !== "rolled_back")
  )
    fail();
  const body = {
    schemaVersion: V2_UNIFIED_COURSE_RELEASE_HEAD_SCHEMA_V3,
    topologyFingerprint: exactHash(value.topologyFingerprint),
    environment:
      value.environment as V2UnifiedCourseReleaseHeadV3["environment"],
    seasonId: exactId(value.seasonId),
    targetLanguage: value.targetLanguage as string,
    studyTarget: value.studyTarget as string,
    learnerSourceLocale: value.learnerSourceLocale as string,
    activeReleaseId: exactId(value.activeReleaseId),
    activeRootFingerprint: exactHash(value.activeRootFingerprint),
    activeBaseRootFingerprint: exactHash(value.activeBaseRootFingerprint),
    activeRootObject,
    previousReleaseId:
      value.previousReleaseId === null
        ? null
        : exactId(value.previousReleaseId),
    previousRootFingerprint:
      value.previousRootFingerprint === null
        ? null
        : exactHash(value.previousRootFingerprint),
    previousBaseRootFingerprint:
      value.previousBaseRootFingerprint === null
        ? null
        : exactHash(value.previousBaseRootFingerprint),
    previousRootObject,
    operationRevision: Number(value.operationRevision),
    state: value.state as "live" | "rolled_back",
    operationId: exactId(value.operationId),
    operationFingerprint: exactHash(value.operationFingerprint),
    updatedAtIso: exactIso(value.updatedAtIso),
    headAuthority: "none_server_cas_and_readback_required" as const,
    serverAnswerAuthority:
      "none_answers_never_transported_or_rechecked" as const,
    runtimeConsumer: false as const,
    releaseAuthority: false as const,
  };
  if (
    value.headAuthority !== body.headAuthority ||
    value.serverAnswerAuthority !== body.serverAnswerAuthority ||
    value.runtimeConsumer !== false ||
    value.releaseAuthority !== false ||
    value.headFingerprint !== hashCanonicalBody(body)
  )
    fail();
  const head = Object.freeze({
    ...body,
    headFingerprint: value.headFingerprint as string,
  });
  if (canonicalJsonV1(head) !== raw) fail();
  headHandles.add(head);
  return head;
}

export function encodeV2UnifiedCourseReleaseHeadV3(
  value: V2UnifiedCourseReleaseHeadV3,
): string {
  if (!headHandles.has(value)) fail();
  return canonicalJsonV1(value);
}

export function isV2UnifiedCourseReleaseHeadV3(
  value: unknown,
): value is V2UnifiedCourseReleaseHeadV3 {
  return typeof value === "object" && value !== null && headHandles.has(value);
}
