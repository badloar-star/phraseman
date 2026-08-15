import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  encodeLearningV2CourseSessionAudioChildV1,
  isLearningV2CourseSessionAudioChildV1,
  type LearningV2CourseSessionAudioChildV1,
} from "./course_session_audio_child_v1";
import {
  isLearningV2CourseSessionLearnerChildV1,
  type LearningV2CourseSessionLearnerChildV1,
} from "./course_session_client_children_v1";
import {
  isLearningV2CourseSessionReleasePackageV1,
  type LearningV2CourseSessionReleasePackageV1,
} from "./course_session_release_package_v1";

export const LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_SCHEMA_V1 =
  "learning-v2-course-session-audio-release-extension.v1" as const;
export const LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_PREFIX_V1 =
  "learning-v2/course-session-audio-extensions" as const;
export const LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_OBJECT_PREFIX_V1 =
  "learning-v2/course-session-audio-release-extension-objects" as const;
export const LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_MAX_BYTES_V1 =
  64 * 1024;

export interface LearningV2CourseSessionAudioChildPinV1 {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly objectGeneration: string;
  readonly byteSize: number;
  readonly contentType: "application/json; charset=utf-8";
}

export interface LearningV2CourseSessionAudioReleaseExtensionV1 {
  readonly schemaVersion: typeof LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_SCHEMA_V1;
  readonly releaseId: string;
  readonly lessonId: string;
  readonly lessonOrdinal: number;
  readonly courseSessionId: string;
  readonly sessionOrdinal: number;
  readonly basePackageFingerprint: string;
  readonly baseChildSetFingerprint: string;
  readonly learnerFingerprint: string;
  readonly audioFingerprint: string;
  readonly audioChildPin: LearningV2CourseSessionAudioChildPinV1;
  readonly extensionModel: "additive_audio_child_does_not_mutate_base_package_v1";
  readonly playbackTransport: "local_file_only_after_generation_pinned_readback";
  readonly serverRequestPerPlayback: false;
  readonly remoteTtsFallbackDuringSession: false;
  readonly answerPayload: "absent_by_exact_schema";
  readonly correctnessAuthority: "none";
  readonly repositoryOriginAuthority: "none_active_release_join_required";
  readonly storageAuthority: "none_generation_pinned_readback_required";
  readonly runtimeAuthority: "none_active_release_join_required";
  readonly publicationAuthority: "none";
  readonly releaseAuthority: false;
  readonly extensionFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "releaseId",
  "lessonId",
  "lessonOrdinal",
  "courseSessionId",
  "sessionOrdinal",
  "basePackageFingerprint",
  "baseChildSetFingerprint",
  "learnerFingerprint",
  "audioFingerprint",
  "audioChildPin",
  "extensionModel",
  "playbackTransport",
  "serverRequestPerPlayback",
  "remoteTtsFallbackDuringSession",
  "answerPayload",
  "correctnessAuthority",
  "repositoryOriginAuthority",
  "storageAuthority",
  "runtimeAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "extensionFingerprint",
] as const);
const PIN_KEYS = Object.freeze([
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);
const handles = new WeakSet<object>();

function fail(): never {
  throw new Error("learning_v2_course_session_audio_release_extension_invalid");
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
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key))
  )
    fail();
}

function bodyWithoutFingerprint(
  value: LearningV2CourseSessionAudioReleaseExtensionV1,
) {
  const { extensionFingerprint: _ignored, ...body } = value;
  return body;
}

export function learningV2CourseSessionAudioChildObjectPathV1(
  input: Readonly<{
    releaseId: string;
    lessonId: string;
    courseSessionId: string;
    basePackageFingerprint: string;
    audioFingerprint: string;
    contentHash: string;
  }>,
): string {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "audioFingerprint|basePackageFingerprint|contentHash|courseSessionId|lessonId|releaseId" ||
    !HASH_RE.test(input.basePackageFingerprint) ||
    !HASH_RE.test(input.audioFingerprint) ||
    !HASH_RE.test(input.contentHash)
  )
    fail();
  const releaseCoordinate = sha256Utf8(input.releaseId);
  const lessonCoordinate = sha256Utf8(input.lessonId);
  const sessionCoordinate = sha256Utf8(input.courseSessionId);
  return `${LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_PREFIX_V1}/${releaseCoordinate}/${lessonCoordinate}/${sessionCoordinate}/${input.basePackageFingerprint}/${input.audioFingerprint}/${input.contentHash}.json`;
}

export function learningV2CourseSessionAudioReleaseExtensionObjectPathV1(
  input: Readonly<{
    releaseId: string;
    lessonId: string;
    courseSessionId: string;
    extensionFingerprint: string;
    rawHash: string;
  }>,
): string {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "courseSessionId|extensionFingerprint|lessonId|rawHash|releaseId" ||
    !HASH_RE.test(input.extensionFingerprint) ||
    !HASH_RE.test(input.rawHash)
  )
    fail();
  return `${LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_OBJECT_PREFIX_V1}/${sha256Utf8(input.releaseId)}/${sha256Utf8(input.lessonId)}/${sha256Utf8(input.courseSessionId)}/${input.extensionFingerprint}/${input.rawHash}.json`;
}

function validate(
  value: unknown,
): LearningV2CourseSessionAudioReleaseExtensionV1 {
  if (!record(value)) fail();
  exactKeys(value, ROOT_KEYS);
  if (!record(value.audioChildPin)) fail();
  exactKeys(value.audioChildPin, PIN_KEYS);
  const candidate =
    value as unknown as LearningV2CourseSessionAudioReleaseExtensionV1;
  if (
    candidate.schemaVersion !==
      LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_SCHEMA_V1 ||
    !HASH_RE.test(candidate.basePackageFingerprint) ||
    !HASH_RE.test(candidate.baseChildSetFingerprint) ||
    !HASH_RE.test(candidate.learnerFingerprint) ||
    !HASH_RE.test(candidate.audioFingerprint) ||
    !HASH_RE.test(candidate.audioChildPin.contentHash) ||
    !GENERATION_RE.test(candidate.audioChildPin.objectGeneration) ||
    !Number.isSafeInteger(candidate.audioChildPin.byteSize) ||
    candidate.audioChildPin.byteSize < 2 ||
    candidate.audioChildPin.byteSize > 4 * 1024 * 1024 ||
    candidate.audioChildPin.contentType !== "application/json; charset=utf-8" ||
    candidate.audioChildPin.objectPath !==
      learningV2CourseSessionAudioChildObjectPathV1({
        releaseId: candidate.releaseId,
        lessonId: candidate.lessonId,
        courseSessionId: candidate.courseSessionId,
        basePackageFingerprint: candidate.basePackageFingerprint,
        audioFingerprint: candidate.audioFingerprint,
        contentHash: candidate.audioChildPin.contentHash,
      }) ||
    candidate.extensionModel !==
      "additive_audio_child_does_not_mutate_base_package_v1" ||
    candidate.playbackTransport !==
      "local_file_only_after_generation_pinned_readback" ||
    candidate.serverRequestPerPlayback !== false ||
    candidate.remoteTtsFallbackDuringSession !== false ||
    candidate.answerPayload !== "absent_by_exact_schema" ||
    candidate.correctnessAuthority !== "none" ||
    candidate.repositoryOriginAuthority !==
      "none_active_release_join_required" ||
    candidate.storageAuthority !== "none_generation_pinned_readback_required" ||
    candidate.runtimeAuthority !== "none_active_release_join_required" ||
    candidate.publicationAuthority !== "none" ||
    candidate.releaseAuthority !== false ||
    candidate.extensionFingerprint !==
      hashCanonicalBody(bodyWithoutFingerprint(candidate))
  )
    fail();
  const result = Object.freeze({
    ...candidate,
    audioChildPin: Object.freeze({ ...candidate.audioChildPin }),
  });
  handles.add(result);
  return result;
}

export function materializeLearningV2CourseSessionAudioReleaseExtensionV1(
  input: Readonly<{
    package: LearningV2CourseSessionReleasePackageV1;
    learner: LearningV2CourseSessionLearnerChildV1;
    audio: LearningV2CourseSessionAudioChildV1;
    audioChildObjectGeneration: string;
  }>,
): LearningV2CourseSessionAudioReleaseExtensionV1 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "audio|audioChildObjectGeneration|learner|package" ||
    !isLearningV2CourseSessionReleasePackageV1(input.package) ||
    !isLearningV2CourseSessionLearnerChildV1(input.learner) ||
    !isLearningV2CourseSessionAudioChildV1(input.audio) ||
    input.package.courseSessionId !== input.learner.courseSessionId ||
    input.audio.courseSessionId !== input.package.courseSessionId ||
    input.audio.learnerFingerprint !== input.learner.learnerFingerprint ||
    !GENERATION_RE.test(input.audioChildObjectGeneration)
  )
    fail();
  const audioRaw = encodeLearningV2CourseSessionAudioChildV1(input.audio);
  const contentHash = sha256Utf8(audioRaw);
  const audioChildPin = Object.freeze({
    objectPath: learningV2CourseSessionAudioChildObjectPathV1({
      releaseId: input.package.releaseId,
      lessonId: input.package.lessonId,
      courseSessionId: input.package.courseSessionId,
      basePackageFingerprint: input.package.packageFingerprint,
      audioFingerprint: input.audio.audioFingerprint,
      contentHash,
    }),
    contentHash,
    objectGeneration: input.audioChildObjectGeneration,
    byteSize: utf8ByteLengthV1(audioRaw),
    contentType: "application/json; charset=utf-8" as const,
  });
  const body = {
    schemaVersion: LEARNING_V2_COURSE_SESSION_AUDIO_RELEASE_EXTENSION_SCHEMA_V1,
    releaseId: input.package.releaseId,
    lessonId: input.package.lessonId,
    lessonOrdinal: input.package.lessonOrdinal,
    courseSessionId: input.package.courseSessionId,
    sessionOrdinal: input.package.sessionOrdinal,
    basePackageFingerprint: input.package.packageFingerprint,
    baseChildSetFingerprint: input.package.childSetFingerprint,
    learnerFingerprint: input.learner.learnerFingerprint,
    audioFingerprint: input.audio.audioFingerprint,
    audioChildPin,
    extensionModel:
      "additive_audio_child_does_not_mutate_base_package_v1" as const,
    playbackTransport:
      "local_file_only_after_generation_pinned_readback" as const,
    serverRequestPerPlayback: false as const,
    remoteTtsFallbackDuringSession: false as const,
    answerPayload: "absent_by_exact_schema" as const,
    correctnessAuthority: "none" as const,
    repositoryOriginAuthority: "none_active_release_join_required" as const,
    storageAuthority: "none_generation_pinned_readback_required" as const,
    runtimeAuthority: "none_active_release_join_required" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return validate({ ...body, extensionFingerprint: hashCanonicalBody(body) });
}

export function parseLearningV2CourseSessionAudioReleaseExtensionV1(
  raw: string,
): LearningV2CourseSessionAudioReleaseExtensionV1 {
  if (
    typeof raw !== "string" ||
    raw.length > LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_COURSE_SESSION_AUDIO_EXTENSION_MAX_BYTES_V1
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

export function encodeLearningV2CourseSessionAudioReleaseExtensionV1(
  value: LearningV2CourseSessionAudioReleaseExtensionV1,
): string {
  if (!handles.has(value)) fail();
  return canonicalJsonV1(value);
}

export function isLearningV2CourseSessionAudioReleaseExtensionV1(
  value: unknown,
): value is LearningV2CourseSessionAudioReleaseExtensionV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
