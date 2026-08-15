import {
  LEARNING_V2_COURSE_TOPOLOGY_SCHEMA_V1,
  LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  buildLearningV2CourseTopologyV1,
  learningV2CourseLessonIdV1,
} from "../content/course_topology_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../content/generator_course_contract";
export const LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_SCHEMA_V1 =
  "learning-v2-course-lesson-release-index.v1" as const;
export const LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1 = 256 * 1024;
export const LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1 =
  "learning-v2-course-session-release-package.v1" as const;
export const LEARNING_V2_COURSE_SESSION_PACKAGE_MAX_BYTES_V1 = 8 * 1024 * 1024;
export const LEARNING_V2_COURSE_SESSION_PACKAGE_PREFIX_V1 =
  "learning-v2/course-session-packages" as const;

export type LearningV2CourseSessionOutcomeKindV1 =
  | "understand"
  | "learn"
  | "can_do";

export type LearningV2CourseSessionPackagePinV1 = Readonly<{
  objectPath: string;
  contentHash: string;
  objectGeneration: string;
  byteSize: number;
  contentType: "application/json; charset=utf-8";
}>;

export type LearningV2CourseLessonReleaseSessionV1 = Readonly<{
  courseSessionId: string;
  sessionOrdinal: number;
  chapterOrdinal: number;
  positionInChapter: number;
  role:
    | "guided_learning"
    | "chapter_checkpoint"
    | "transfer_practice"
    | "final_exam";
  learningOutcomeKind: LearningV2CourseSessionOutcomeKindV1;
  learningOutcomeByLocale: Readonly<Record<LearningV2InterfaceLocale, string>>;
  packageSchemaVersion: typeof LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1;
  packageFingerprint: string;
  packagePin: LearningV2CourseSessionPackagePinV1;
}>;

export type LearningV2CourseLessonReleaseIndexV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_SCHEMA_V1;
  topologySchemaVersion: typeof LEARNING_V2_COURSE_TOPOLOGY_SCHEMA_V1;
  topologyFingerprint: string;
  releaseId: string;
  lessonId: string;
  lessonOrdinal: number;
  titleByLocale: Readonly<Record<LearningV2InterfaceLocale, string>>;
  canDoByLocale: Readonly<Record<LearningV2InterfaceLocale, string>>;
  ownerLessonFingerprint: string;
  ownerConfirmationFingerprint: string;
  sessions: readonly LearningV2CourseLessonReleaseSessionV1[];
  sessionCount: typeof LEARNING_V2_LESSON_SESSION_COUNT_V1;
  chapterCount: typeof LEARNING_V2_LESSON_CHAPTER_COUNT_V1;
  sessionSetFingerprint: string;
  sessionIdentityModel: "direct_56_no_hidden_grouping";
  packageBinding: "exact_56_direct_content_addressed_session_packages";
  contentAuthorship: "owner_only";
  repositoryOriginAuthority: "none_server_readback_required";
  storageAuthority: "none_server_readback_required";
  ownerConfirmationAuthority: "none_private_owner_handle_required";
  runtimeAuthority: "none_active_release_join_required";
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  publicationAuthority: "none";
  releaseAuthority: false;
  indexFingerprint: string;
}>;

export type LearningV2CourseLessonReleaseSessionInputV1 = Readonly<{
  courseSessionId: string;
  learningOutcomeKind: LearningV2CourseSessionOutcomeKindV1;
  learningOutcomeByLocale: Readonly<Record<LearningV2InterfaceLocale, string>>;
  packageSchemaVersion: typeof LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1;
  packageFingerprint: string;
  contentHash: string;
  objectGeneration: string;
  byteSize: number;
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const RESERVED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "topologySchemaVersion",
  "topologyFingerprint",
  "releaseId",
  "lessonId",
  "lessonOrdinal",
  "titleByLocale",
  "canDoByLocale",
  "ownerLessonFingerprint",
  "ownerConfirmationFingerprint",
  "sessions",
  "sessionCount",
  "chapterCount",
  "sessionSetFingerprint",
  "sessionIdentityModel",
  "packageBinding",
  "contentAuthorship",
  "repositoryOriginAuthority",
  "storageAuthority",
  "ownerConfirmationAuthority",
  "runtimeAuthority",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "indexFingerprint",
] as const);
const SESSION_KEYS = Object.freeze([
  "courseSessionId",
  "sessionOrdinal",
  "chapterOrdinal",
  "positionInChapter",
  "role",
  "learningOutcomeKind",
  "learningOutcomeByLocale",
  "packageSchemaVersion",
  "packageFingerprint",
  "packagePin",
] as const);
const PIN_KEYS = Object.freeze([
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);
const handles = new WeakSet<object>();
const COURSE_TOPOLOGY_V1 = buildLearningV2CourseTopologyV1();

function fail(): never {
  throw new Error("learning_v2_course_lesson_release_index_invalid");
}

function plain(value: unknown): value is Record<string, unknown> {
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
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => !expected.includes(key) || RESERVED_KEYS.has(key))
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
    !ID_RE.test(value) ||
    RESERVED_KEYS.has(value)
  )
    fail();
  return value;
}

function localized(
  value: unknown,
  maximum: number,
): Readonly<Record<LearningV2InterfaceLocale, string>> {
  if (!plain(value)) fail();
  exactKeys(value, LEARNING_V2_INTERFACE_LOCALES);
  const result: Partial<Record<LearningV2InterfaceLocale, string>> = {};
  for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
    const text = value[locale];
    if (
      typeof text !== "string" ||
      text.length < 4 ||
      text.length > maximum ||
      text !== text.normalize("NFC") ||
      /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2069\ufeff]/u.test(
        text,
      )
    )
      fail();
    result[locale] = text;
  }
  return Object.freeze(result) as Readonly<
    Record<LearningV2InterfaceLocale, string>
  >;
}

function preflight(value: unknown): void {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 1 }];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > 4_096 || current.depth > 16) fail();
    if (typeof current.value === "string") {
      if (
        current.value.length > 4_096 ||
        current.value.normalize("NFC") !== current.value ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(
          current.value,
        )
      )
        fail();
    } else if (typeof current.value === "number") {
      if (
        !Number.isFinite(current.value) ||
        Object.is(current.value, -0) ||
        !Number.isSafeInteger(current.value)
      )
        fail();
    } else if (Array.isArray(current.value)) {
      if (current.value.length > LEARNING_V2_LESSON_SESSION_COUNT_V1) fail();
      for (const child of current.value)
        stack.push({ value: child, depth: current.depth + 1 });
    } else if (current.value !== null && typeof current.value === "object") {
      if (!plain(current.value)) fail();
      const entries = Object.entries(current.value);
      if (entries.length > 64) fail();
      for (const [key, child] of entries) {
        if (RESERVED_KEYS.has(key)) fail();
        stack.push({ value: child, depth: current.depth + 1 });
      }
    }
  }
}

export function learningV2CourseSessionPackageObjectPathV1(
  input: Readonly<{
    releaseId: string;
    lessonOrdinal: number;
    sessionOrdinal: number;
    packageFingerprint: string;
    contentHash: string;
  }>,
): string {
  const topology = COURSE_TOPOLOGY_V1;
  const lesson = topology.lessons[input.lessonOrdinal - 1];
  const session = lesson?.sessions[input.sessionOrdinal - 1];
  if (!lesson || !session) fail();
  return `${LEARNING_V2_COURSE_SESSION_PACKAGE_PREFIX_V1}/${sha256Utf8(exactId(input.releaseId))}/${lesson.lessonId}/sessions/${String(session.sessionOrdinal).padStart(2, "0")}/${exactHash(input.packageFingerprint)}/${exactHash(input.contentHash)}.json`;
}

function parsePin(
  value: unknown,
  expected: Readonly<{
    releaseId: string;
    lessonOrdinal: number;
    sessionOrdinal: number;
    packageFingerprint: string;
  }>,
): LearningV2CourseSessionPackagePinV1 {
  if (!plain(value)) fail();
  exactKeys(value, PIN_KEYS);
  const contentHash = exactHash(value.contentHash);
  if (
    typeof value.objectGeneration !== "string" ||
    !GENERATION_RE.test(value.objectGeneration) ||
    !Number.isSafeInteger(value.byteSize) ||
    Number(value.byteSize) < 2 ||
    Number(value.byteSize) > LEARNING_V2_COURSE_SESSION_PACKAGE_MAX_BYTES_V1 ||
    value.contentType !== "application/json; charset=utf-8" ||
    value.objectPath !==
      learningV2CourseSessionPackageObjectPathV1({
        ...expected,
        contentHash,
      })
  )
    fail();
  return Object.freeze({
    objectPath: value.objectPath as string,
    contentHash,
    objectGeneration: value.objectGeneration,
    byteSize: Number(value.byteSize),
    contentType: "application/json; charset=utf-8" as const,
  });
}

function parseSession(
  value: unknown,
  expected: ReturnType<
    typeof buildLearningV2CourseTopologyV1
  >["lessons"][number]["sessions"][number],
  releaseId: string,
): LearningV2CourseLessonReleaseSessionV1 {
  if (!plain(value)) fail();
  exactKeys(value, SESSION_KEYS);
  const packageFingerprint = exactHash(value.packageFingerprint);
  if (
    value.courseSessionId !== expected.sessionId ||
    value.sessionOrdinal !== expected.sessionOrdinal ||
    value.chapterOrdinal !== expected.chapterOrdinal ||
    value.positionInChapter !== expected.positionInChapter ||
    value.role !== expected.role ||
    value.packageSchemaVersion !==
      LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1
  )
    fail();
  return Object.freeze({
    courseSessionId: expected.sessionId,
    sessionOrdinal: expected.sessionOrdinal,
    chapterOrdinal: expected.chapterOrdinal,
    positionInChapter: expected.positionInChapter,
    role: expected.role,
    learningOutcomeKind:
      value.learningOutcomeKind === "understand" ||
      value.learningOutcomeKind === "learn" ||
      value.learningOutcomeKind === "can_do"
        ? value.learningOutcomeKind
        : fail(),
    learningOutcomeByLocale: localized(value.learningOutcomeByLocale, 512),
    packageSchemaVersion: LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1,
    packageFingerprint,
    packagePin: parsePin(value.packagePin, {
      releaseId,
      lessonOrdinal: expected.lessonOrdinal,
      sessionOrdinal: expected.sessionOrdinal,
      packageFingerprint,
    }),
  });
}

function validate(value: unknown): LearningV2CourseLessonReleaseIndexV1 {
  preflight(value);
  if (!plain(value)) fail();
  exactKeys(value, ROOT_KEYS);
  const topology = COURSE_TOPOLOGY_V1;
  const releaseId = exactId(value.releaseId);
  if (
    !Number.isSafeInteger(value.lessonOrdinal) ||
    Number(value.lessonOrdinal) < 1 ||
    Number(value.lessonOrdinal) > topology.lessonCount
  )
    fail();
  const lesson = topology.lessons[Number(value.lessonOrdinal) - 1];
  if (
    !lesson ||
    !Array.isArray(value.sessions) ||
    value.sessions.length !== lesson.sessionCount
  )
    fail();
  const sessions = value.sessions.map((session, index) =>
    parseSession(session, lesson.sessions[index]!, releaseId),
  );
  const sessionSetFingerprint = hashCanonicalBody(sessions);
  const body = {
    schemaVersion: LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_SCHEMA_V1,
    topologySchemaVersion: topology.schemaVersion,
    topologyFingerprint: topology.topologyFingerprint,
    releaseId,
    lessonId: lesson.lessonId,
    lessonOrdinal: lesson.lessonOrdinal,
    titleByLocale: localized(value.titleByLocale, 160),
    canDoByLocale: localized(value.canDoByLocale, 512),
    ownerLessonFingerprint: exactHash(value.ownerLessonFingerprint),
    ownerConfirmationFingerprint: exactHash(value.ownerConfirmationFingerprint),
    sessions: Object.freeze(sessions),
    sessionCount: LEARNING_V2_LESSON_SESSION_COUNT_V1,
    chapterCount: LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
    sessionSetFingerprint,
    sessionIdentityModel: "direct_56_no_hidden_grouping" as const,
    packageBinding:
      "exact_56_direct_content_addressed_session_packages" as const,
    contentAuthorship: "owner_only" as const,
    repositoryOriginAuthority: "none_server_readback_required" as const,
    storageAuthority: "none_server_readback_required" as const,
    ownerConfirmationAuthority: "none_private_owner_handle_required" as const,
    runtimeAuthority: "none_active_release_join_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  if (
    value.schemaVersion !== body.schemaVersion ||
    value.topologySchemaVersion !== body.topologySchemaVersion ||
    value.topologyFingerprint !== body.topologyFingerprint ||
    value.lessonId !== body.lessonId ||
    value.sessionCount !== body.sessionCount ||
    value.chapterCount !== body.chapterCount ||
    value.sessionSetFingerprint !== body.sessionSetFingerprint ||
    value.sessionIdentityModel !== body.sessionIdentityModel ||
    value.packageBinding !== body.packageBinding ||
    value.contentAuthorship !== body.contentAuthorship ||
    value.repositoryOriginAuthority !== body.repositoryOriginAuthority ||
    value.storageAuthority !== body.storageAuthority ||
    value.ownerConfirmationAuthority !== body.ownerConfirmationAuthority ||
    value.runtimeAuthority !== body.runtimeAuthority ||
    value.walletAuthority !== body.walletAuthority ||
    value.masteryAuthority !== body.masteryAuthority ||
    value.evidenceAuthority !== body.evidenceAuthority ||
    value.publicationAuthority !== body.publicationAuthority ||
    value.releaseAuthority !== false ||
    value.indexFingerprint !== hashCanonicalBody(body)
  )
    fail();
  const index = Object.freeze({
    ...body,
    indexFingerprint: value.indexFingerprint as string,
  });
  handles.add(index);
  return index;
}

export function materializeLearningV2CourseLessonReleaseIndexV1(
  input: Readonly<{
    releaseId: string;
    lessonOrdinal: number;
    titleByLocale: Readonly<Record<LearningV2InterfaceLocale, string>>;
    canDoByLocale: Readonly<Record<LearningV2InterfaceLocale, string>>;
    ownerLessonFingerprint: string;
    ownerConfirmationFingerprint: string;
    sessions: readonly LearningV2CourseLessonReleaseSessionInputV1[];
  }>,
): LearningV2CourseLessonReleaseIndexV1 {
  const topology = COURSE_TOPOLOGY_V1;
  const lesson = topology.lessons[input.lessonOrdinal - 1];
  if (!lesson || input.sessions.length !== lesson.sessionCount) fail();
  const sessions = lesson.sessions.map((expected, index) => {
    const source = input.sessions[index];
    if (
      !source ||
      source.courseSessionId !== expected.sessionId ||
      source.packageSchemaVersion !==
        LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1
    )
      fail();
    const packageFingerprint = exactHash(source.packageFingerprint);
    const contentHash = exactHash(source.contentHash);
    return Object.freeze({
      courseSessionId: expected.sessionId,
      sessionOrdinal: expected.sessionOrdinal,
      chapterOrdinal: expected.chapterOrdinal,
      positionInChapter: expected.positionInChapter,
      role: expected.role,
      learningOutcomeKind: source.learningOutcomeKind,
      learningOutcomeByLocale: localized(source.learningOutcomeByLocale, 512),
      packageSchemaVersion: source.packageSchemaVersion,
      packageFingerprint,
      packagePin: Object.freeze({
        objectPath: learningV2CourseSessionPackageObjectPathV1({
          releaseId: input.releaseId,
          lessonOrdinal: input.lessonOrdinal,
          sessionOrdinal: expected.sessionOrdinal,
          packageFingerprint,
          contentHash,
        }),
        contentHash,
        objectGeneration: source.objectGeneration,
        byteSize: source.byteSize,
        contentType: "application/json; charset=utf-8" as const,
      }),
    });
  });
  const body = {
    schemaVersion: LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_SCHEMA_V1,
    topologySchemaVersion: topology.schemaVersion,
    topologyFingerprint: topology.topologyFingerprint,
    releaseId: input.releaseId,
    lessonId: learningV2CourseLessonIdV1(input.lessonOrdinal),
    lessonOrdinal: input.lessonOrdinal,
    titleByLocale: input.titleByLocale,
    canDoByLocale: input.canDoByLocale,
    ownerLessonFingerprint: input.ownerLessonFingerprint,
    ownerConfirmationFingerprint: input.ownerConfirmationFingerprint,
    sessions: Object.freeze(sessions),
    sessionCount: LEARNING_V2_LESSON_SESSION_COUNT_V1,
    chapterCount: LEARNING_V2_LESSON_CHAPTER_COUNT_V1,
    sessionSetFingerprint: hashCanonicalBody(sessions),
    sessionIdentityModel: "direct_56_no_hidden_grouping" as const,
    packageBinding:
      "exact_56_direct_content_addressed_session_packages" as const,
    contentAuthorship: "owner_only" as const,
    repositoryOriginAuthority: "none_server_readback_required" as const,
    storageAuthority: "none_server_readback_required" as const,
    ownerConfirmationAuthority: "none_private_owner_handle_required" as const,
    runtimeAuthority: "none_active_release_join_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    publicationAuthority: "none" as const,
    releaseAuthority: false as const,
  };
  return validate({ ...body, indexFingerprint: hashCanonicalBody(body) });
}

export function parseLearningV2CourseLessonReleaseIndexV1(
  raw: string,
): LearningV2CourseLessonReleaseIndexV1 {
  if (
    typeof raw !== "string" ||
    raw.length > LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) > LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1
  )
    fail();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    fail();
  }
  if (canonicalJsonV1(value) !== raw) fail();
  return validate(value);
}

export function encodeLearningV2CourseLessonReleaseIndexV1(
  index: LearningV2CourseLessonReleaseIndexV1,
): string {
  if (!handles.has(index)) fail();
  const raw = canonicalJsonV1(index);
  if (
    utf8ByteLengthV1(raw) > LEARNING_V2_COURSE_LESSON_RELEASE_INDEX_MAX_BYTES_V1
  )
    fail();
  return raw;
}

export function isLearningV2CourseLessonReleaseIndexV1(
  value: unknown,
): value is LearningV2CourseLessonReleaseIndexV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
