import {
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  buildLearningV2CourseTopologyV1,
} from "../content/course_topology_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  encodeLearningV2CourseSessionAudioReleaseExtensionV1,
  isLearningV2CourseSessionAudioReleaseExtensionV1,
  learningV2CourseSessionAudioReleaseExtensionObjectPathV1,
  type LearningV2CourseSessionAudioReleaseExtensionV1,
} from "./course_session_audio_release_extension_v1";
import {
  isLearningV2CourseLessonReleaseIndexV1,
  type LearningV2CourseLessonReleaseIndexV1,
} from "./course_lesson_release_index_v1";

export const LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1 =
  "learning-v2-course-lesson-audio-release-index.v1" as const;
export const LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_MAX_BYTES_V1 =
  512 * 1024;
export const LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_PREFIX_V1 =
  "learning-v2/course-lesson-audio-release-indexes" as const;

export type LearningV2CourseSessionAudioReleaseExtensionPinV1 = Readonly<{
  objectPath: string;
  contentHash: string;
  objectGeneration: string;
  byteSize: number;
  contentType: "application/json; charset=utf-8";
}>;

export type LearningV2CourseLessonAudioReleaseSessionV1 = Readonly<{
  courseSessionId: string;
  sessionOrdinal: number;
  basePackageFingerprint: string;
  baseChildSetFingerprint: string;
  learnerFingerprint: string;
  audioFingerprint: string;
  extensionFingerprint: string;
  extensionPin: LearningV2CourseSessionAudioReleaseExtensionPinV1;
}>;

export type LearningV2CourseLessonAudioReleaseIndexV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1;
  releaseId: string;
  lessonId: string;
  lessonOrdinal: number;
  baseLessonIndexFingerprint: string;
  sessions: readonly LearningV2CourseLessonAudioReleaseSessionV1[];
  sessionCount: typeof LEARNING_V2_LESSON_SESSION_COUNT_V1;
  extensionSetFingerprint: string;
  audioSetFingerprint: string;
  joinPolicy: "exact_56_base_package_to_audio_extension_bijection";
  playbackPolicy: "generation_pinned_local_files_no_session_network_tts";
  answerPayload: "absent_by_exact_schema";
  correctnessAuthority: "none";
  repositoryOriginAuthority: "none_active_release_join_required";
  storageAuthority: "none_generation_pinned_readback_required";
  runtimeAuthority: "none_active_release_join_required";
  publicationAuthority: "none";
  releaseAuthority: false;
  indexFingerprint: string;
}>;

export type LearningV2CourseLessonAudioReleaseSessionInputV1 = Readonly<{
  extension: LearningV2CourseSessionAudioReleaseExtensionV1;
  extensionObjectGeneration: string;
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const handles = new WeakSet<object>();
const topology = buildLearningV2CourseTopologyV1();

const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "releaseId",
  "lessonId",
  "lessonOrdinal",
  "baseLessonIndexFingerprint",
  "sessions",
  "sessionCount",
  "extensionSetFingerprint",
  "audioSetFingerprint",
  "joinPolicy",
  "playbackPolicy",
  "answerPayload",
  "correctnessAuthority",
  "repositoryOriginAuthority",
  "storageAuthority",
  "runtimeAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "indexFingerprint",
] as const);
const SESSION_KEYS = Object.freeze([
  "courseSessionId",
  "sessionOrdinal",
  "basePackageFingerprint",
  "baseChildSetFingerprint",
  "learnerFingerprint",
  "audioFingerprint",
  "extensionFingerprint",
  "extensionPin",
] as const);
const PIN_KEYS = Object.freeze([
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);

function fail(): never {
  throw new Error("learning_v2_course_lesson_audio_release_index_invalid");
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

function hash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

function id(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value) || RESERVED.has(value))
    fail();
  return value;
}

export function learningV2CourseLessonAudioReleaseIndexObjectPathV1(
  input: Readonly<{
    releaseId: string;
    lessonId: string;
    indexFingerprint: string;
    rawHash: string;
  }>,
): string {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "indexFingerprint|lessonId|rawHash|releaseId"
  )
    fail();
  return `${LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_PREFIX_V1}/${sha256Utf8(id(input.releaseId))}/${sha256Utf8(id(input.lessonId))}/${hash(input.indexFingerprint)}/${hash(input.rawHash)}.json`;
}

function validate(value: unknown): LearningV2CourseLessonAudioReleaseIndexV1 {
  if (!record(value)) fail();
  exactKeys(value, ROOT_KEYS);
  if (
    value.schemaVersion !==
      LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1 ||
    !Number.isSafeInteger(value.lessonOrdinal) ||
    !Array.isArray(value.sessions) ||
    value.sessions.length !== LEARNING_V2_LESSON_SESSION_COUNT_V1
  )
    fail();
  const lesson = topology.lessons[Number(value.lessonOrdinal) - 1];
  if (!lesson || value.lessonId !== lesson.lessonId) fail();
  const releaseId = id(value.releaseId);
  const sessions = Object.freeze(
    value.sessions.map((candidate, index) => {
      if (!record(candidate)) fail();
      exactKeys(candidate, SESSION_KEYS);
      if (!record(candidate.extensionPin)) fail();
      exactKeys(candidate.extensionPin, PIN_KEYS);
      const expected = lesson.sessions[index];
      if (
        !expected ||
        candidate.courseSessionId !== expected.sessionId ||
        candidate.sessionOrdinal !== expected.sessionOrdinal
      )
        fail();
      const extensionFingerprint = hash(candidate.extensionFingerprint);
      const contentHash = hash(candidate.extensionPin.contentHash);
      if (
        typeof candidate.extensionPin.objectGeneration !== "string" ||
        !GENERATION_RE.test(candidate.extensionPin.objectGeneration) ||
        !Number.isSafeInteger(candidate.extensionPin.byteSize) ||
        Number(candidate.extensionPin.byteSize) < 2 ||
        Number(candidate.extensionPin.byteSize) > 64 * 1024 ||
        candidate.extensionPin.contentType !==
          "application/json; charset=utf-8" ||
        candidate.extensionPin.objectPath !==
          learningV2CourseSessionAudioReleaseExtensionObjectPathV1({
            releaseId,
            lessonId: lesson.lessonId,
            courseSessionId: expected.sessionId,
            extensionFingerprint,
            rawHash: contentHash,
          })
      )
        fail();
      return Object.freeze({
        courseSessionId: expected.sessionId,
        sessionOrdinal: expected.sessionOrdinal,
        basePackageFingerprint: hash(candidate.basePackageFingerprint),
        baseChildSetFingerprint: hash(candidate.baseChildSetFingerprint),
        learnerFingerprint: hash(candidate.learnerFingerprint),
        audioFingerprint: hash(candidate.audioFingerprint),
        extensionFingerprint,
        extensionPin: Object.freeze({
          objectPath: candidate.extensionPin.objectPath as string,
          contentHash,
          objectGeneration: candidate.extensionPin.objectGeneration,
          byteSize: Number(candidate.extensionPin.byteSize),
          contentType: "application/json; charset=utf-8" as const,
        }),
      });
    }),
  );
  const body = {
    schemaVersion: LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1,
    releaseId,
    lessonId: lesson.lessonId,
    lessonOrdinal: lesson.lessonOrdinal,
    baseLessonIndexFingerprint: hash(value.baseLessonIndexFingerprint),
    sessions,
    sessionCount: LEARNING_V2_LESSON_SESSION_COUNT_V1,
    extensionSetFingerprint: hashCanonicalBody(
      sessions.map((session) => session.extensionFingerprint),
    ),
    audioSetFingerprint: hashCanonicalBody(
      sessions.map((session) => session.audioFingerprint),
    ),
    joinPolicy: "exact_56_base_package_to_audio_extension_bijection" as const,
    playbackPolicy:
      "generation_pinned_local_files_no_session_network_tts" as const,
    answerPayload: "absent_by_exact_schema" as const,
    correctnessAuthority: "none" as const,
    repositoryOriginAuthority: "none_active_release_join_required" as const,
    storageAuthority: "none_generation_pinned_readback_required" as const,
    runtimeAuthority: "none_active_release_join_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  const candidate =
    value as unknown as LearningV2CourseLessonAudioReleaseIndexV1;
  if (
    candidate.sessionCount !== body.sessionCount ||
    candidate.extensionSetFingerprint !== body.extensionSetFingerprint ||
    candidate.audioSetFingerprint !== body.audioSetFingerprint ||
    candidate.joinPolicy !== body.joinPolicy ||
    candidate.playbackPolicy !== body.playbackPolicy ||
    candidate.answerPayload !== body.answerPayload ||
    candidate.correctnessAuthority !== body.correctnessAuthority ||
    candidate.repositoryOriginAuthority !== body.repositoryOriginAuthority ||
    candidate.storageAuthority !== body.storageAuthority ||
    candidate.runtimeAuthority !== body.runtimeAuthority ||
    candidate.publicationAuthority !== body.publicationAuthority ||
    candidate.releaseAuthority !== false ||
    candidate.indexFingerprint !== hashCanonicalBody(body)
  )
    fail();
  const result = Object.freeze({
    ...body,
    indexFingerprint: candidate.indexFingerprint,
  });
  handles.add(result);
  return result;
}

export function materializeLearningV2CourseLessonAudioReleaseIndexV1(
  input: Readonly<{
    baseIndex: LearningV2CourseLessonReleaseIndexV1;
    sessions: readonly LearningV2CourseLessonAudioReleaseSessionInputV1[];
  }>,
): LearningV2CourseLessonAudioReleaseIndexV1 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !== "baseIndex|sessions" ||
    !isLearningV2CourseLessonReleaseIndexV1(input.baseIndex) ||
    !Array.isArray(input.sessions) ||
    input.sessions.length !== input.baseIndex.sessions.length
  )
    fail();
  const sessions = input.baseIndex.sessions.map((base, index) => {
    const source = input.sessions[index];
    if (
      !source ||
      !isLearningV2CourseSessionAudioReleaseExtensionV1(source.extension) ||
      !GENERATION_RE.test(source.extensionObjectGeneration)
    )
      fail();
    const extension = source.extension;
    if (
      extension.releaseId !== input.baseIndex.releaseId ||
      extension.lessonId !== input.baseIndex.lessonId ||
      extension.lessonOrdinal !== input.baseIndex.lessonOrdinal ||
      extension.courseSessionId !== base.courseSessionId ||
      extension.sessionOrdinal !== base.sessionOrdinal ||
      extension.basePackageFingerprint !== base.packageFingerprint
    )
      fail();
    const raw = encodeLearningV2CourseSessionAudioReleaseExtensionV1(extension);
    const rawHash = sha256Utf8(raw);
    return {
      courseSessionId: base.courseSessionId,
      sessionOrdinal: base.sessionOrdinal,
      basePackageFingerprint: extension.basePackageFingerprint,
      baseChildSetFingerprint: extension.baseChildSetFingerprint,
      learnerFingerprint: extension.learnerFingerprint,
      audioFingerprint: extension.audioFingerprint,
      extensionFingerprint: extension.extensionFingerprint,
      extensionPin: {
        objectPath: learningV2CourseSessionAudioReleaseExtensionObjectPathV1({
          releaseId: extension.releaseId,
          lessonId: extension.lessonId,
          courseSessionId: extension.courseSessionId,
          extensionFingerprint: extension.extensionFingerprint,
          rawHash,
        }),
        contentHash: rawHash,
        objectGeneration: source.extensionObjectGeneration,
        byteSize: utf8ByteLengthV1(raw),
        contentType: "application/json; charset=utf-8" as const,
      },
    };
  });
  const body = {
    schemaVersion: LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_SCHEMA_V1,
    releaseId: input.baseIndex.releaseId,
    lessonId: input.baseIndex.lessonId,
    lessonOrdinal: input.baseIndex.lessonOrdinal,
    baseLessonIndexFingerprint: input.baseIndex.indexFingerprint,
    sessions,
    sessionCount: LEARNING_V2_LESSON_SESSION_COUNT_V1,
    extensionSetFingerprint: hashCanonicalBody(
      sessions.map((session) => session.extensionFingerprint),
    ),
    audioSetFingerprint: hashCanonicalBody(
      sessions.map((session) => session.audioFingerprint),
    ),
    joinPolicy: "exact_56_base_package_to_audio_extension_bijection" as const,
    playbackPolicy:
      "generation_pinned_local_files_no_session_network_tts" as const,
    answerPayload: "absent_by_exact_schema" as const,
    correctnessAuthority: "none" as const,
    repositoryOriginAuthority: "none_active_release_join_required" as const,
    storageAuthority: "none_generation_pinned_readback_required" as const,
    runtimeAuthority: "none_active_release_join_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return validate({ ...body, indexFingerprint: hashCanonicalBody(body) });
}

export function parseLearningV2CourseLessonAudioReleaseIndexV1(
  raw: string,
): LearningV2CourseLessonAudioReleaseIndexV1 {
  if (
    typeof raw !== "string" ||
    raw.length > LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_MAX_BYTES_V1
  )
    fail();
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    fail();
  }
  if (canonicalJsonV1(decoded) !== raw) fail();
  return validate(decoded);
}

export function encodeLearningV2CourseLessonAudioReleaseIndexV1(
  value: LearningV2CourseLessonAudioReleaseIndexV1,
): string {
  if (!handles.has(value)) fail();
  const raw = canonicalJsonV1(value);
  if (
    utf8ByteLengthV1(raw) >
    LEARNING_V2_COURSE_LESSON_AUDIO_RELEASE_INDEX_MAX_BYTES_V1
  )
    fail();
  return raw;
}

export function isLearningV2CourseLessonAudioReleaseIndexV1(
  value: unknown,
): value is LearningV2CourseLessonAudioReleaseIndexV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
