import {
  LEARNING_V2_INTERFACE_LOCALES,
  type LearningV2InterfaceLocale,
} from "../content/generator_course_contract";
import {
  LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1,
  isLearningV2CourseLessonReleaseIndexV1,
  type LearningV2CourseLessonReleaseIndexV1,
  type LearningV2CourseSessionOutcomeKindV1,
} from "./course_lesson_release_index_v1";
import {
  buildLearningV2CourseTopologyV1,
  learningV2SessionInteractionBudgetV1,
  type LearningV2CourseSessionTopologyV1,
} from "../content/course_topology_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";

export const LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_MAX_BYTES_V1 =
  512 * 1024;
export const LEARNING_V2_COURSE_SESSION_CHILD_PREFIX_V1 =
  "learning-v2/course-session-children" as const;
export const LEARNING_V2_COURSE_SESSION_CHILD_KINDS_V1 = Object.freeze([
  "intro",
  "learner",
  "evaluator_capsule",
  "evaluator_sidecar",
  "auxiliary",
] as const);
export const LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1 = Object.freeze({
  intro: "learning-v2-course-session-intro-child.v1",
  learner: "learning-v2-course-session-learner-child.v1",
  evaluator_capsule: "learning-v2-course-session-evaluator-capsule-child.v1",
  evaluator_sidecar: "learning-v2-course-session-evaluator-sidecar-child.v1",
  auxiliary: "learning-v2-course-session-auxiliary-child.v1",
} as const);

export type LearningV2CourseSessionInteractionProfileV1 =
  | "standard"
  | "rapid"
  | "voice_heavy";
export type LearningV2CourseSessionChildKindV1 =
  (typeof LEARNING_V2_COURSE_SESSION_CHILD_KINDS_V1)[number];

export type LearningV2CourseSessionChildPinV1 = Readonly<{
  kind: LearningV2CourseSessionChildKindV1;
  schemaVersion: string;
  artifactFingerprint: string;
  objectPath: string;
  contentHash: string;
  objectGeneration: string;
  byteSize: number;
  contentType: "application/json; charset=utf-8";
}>;

export type LearningV2CourseSessionReleasePackageV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1;
  topologySchemaVersion: "learning-v2-course-topology.v1";
  topologyFingerprint: string;
  releaseId: string;
  lessonId: string;
  lessonOrdinal: number;
  ownerLessonFingerprint: string;
  ownerConfirmationFingerprint: string;
  courseSessionId: string;
  sessionOrdinal: number;
  chapterOrdinal: number;
  positionInChapter: number;
  role: LearningV2CourseSessionTopologyV1["role"];
  learningOutcomeKind: LearningV2CourseSessionOutcomeKindV1;
  learningOutcomeByLocale: Readonly<Record<LearningV2InterfaceLocale, string>>;
  interactionProfile: LearningV2CourseSessionInteractionProfileV1;
  interactionBudget: ReturnType<typeof learningV2SessionInteractionBudgetV1>;
  plannedPrimaryInteractionCount: number;
  interactionIds: readonly string[];
  introInteractionIds: readonly [string, string, string];
  practiceInteractionIds: readonly string[];
  introPageCount: 3;
  practiceStartOrdinal: 4;
  introQuestionPolicy: "one_embedded_question_per_intro_page_no_post_intro_duplicate";
  completionPolicy: "duration_and_objective_coverage_not_raw_count";
  remediationPolicy: "retries_and_second_error_explanation_outside_base_count";
  interactionSetFingerprint: string;
  children: readonly [
    LearningV2CourseSessionChildPinV1,
    LearningV2CourseSessionChildPinV1,
    LearningV2CourseSessionChildPinV1,
    LearningV2CourseSessionChildPinV1,
    LearningV2CourseSessionChildPinV1,
  ];
  childSetFingerprint: string;
  contentAuthorship: "owner_only";
  learnerProjectionPolicy: "positive_allowlist_intro_learner_capsule_auxiliary_only";
  evaluatorIsolationPolicy: "server_sidecar_never_returned_to_learner";
  repositoryOriginAuthority: "none_server_readback_required";
  storageAuthority: "none_server_readback_required";
  ownerConfirmationAuthority: "none_private_owner_handle_required";
  runtimeAuthority: "none_active_release_join_required";
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  publicationAuthority: "none";
  releaseAuthority: false;
  packageFingerprint: string;
}>;

export type LearningV2CourseSessionChildInputV1 = Readonly<{
  kind: LearningV2CourseSessionChildKindV1;
  schemaVersion: string;
  artifactFingerprint: string;
  contentHash: string;
  objectGeneration: string;
  byteSize: number;
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const GENERATION_RE = /^[1-9][0-9]{0,30}$/u;
const FORBIDDEN_TEXT_RE =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const CHILD_MAX_BYTES: Readonly<
  Record<LearningV2CourseSessionChildKindV1, number>
> = Object.freeze({
  intro: 256 * 1024,
  learner: 4 * 1024 * 1024,
  evaluator_capsule: 512 * 1024,
  evaluator_sidecar: 4 * 1024 * 1024,
  auxiliary: 2 * 1024 * 1024,
});
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "topologySchemaVersion",
  "topologyFingerprint",
  "releaseId",
  "lessonId",
  "lessonOrdinal",
  "ownerLessonFingerprint",
  "ownerConfirmationFingerprint",
  "courseSessionId",
  "sessionOrdinal",
  "chapterOrdinal",
  "positionInChapter",
  "role",
  "learningOutcomeKind",
  "learningOutcomeByLocale",
  "interactionProfile",
  "interactionBudget",
  "plannedPrimaryInteractionCount",
  "interactionIds",
  "introInteractionIds",
  "practiceInteractionIds",
  "introPageCount",
  "practiceStartOrdinal",
  "introQuestionPolicy",
  "completionPolicy",
  "remediationPolicy",
  "interactionSetFingerprint",
  "children",
  "childSetFingerprint",
  "contentAuthorship",
  "learnerProjectionPolicy",
  "evaluatorIsolationPolicy",
  "repositoryOriginAuthority",
  "storageAuthority",
  "ownerConfirmationAuthority",
  "runtimeAuthority",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "publicationAuthority",
  "releaseAuthority",
  "packageFingerprint",
] as const);
const CHILD_KEYS = Object.freeze([
  "kind",
  "schemaVersion",
  "artifactFingerprint",
  "objectPath",
  "contentHash",
  "objectGeneration",
  "byteSize",
  "contentType",
] as const);
const handles = new WeakSet<object>();
const COURSE_TOPOLOGY_V1 = buildLearningV2CourseTopologyV1();

function fail(): never {
  throw new Error("learning_v2_course_session_release_package_invalid");
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
): void {
  const keys = Object.keys(value);
  if (
    keys.length !== expected.length ||
    keys.some((key) => RESERVED.has(key) || !expected.includes(key))
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

function preflight(value: unknown): void {
  const stack: { value: unknown; depth: number }[] = [{ value, depth: 1 }];
  let nodes = 0;
  while (stack.length > 0) {
    const current = stack.pop()!;
    nodes += 1;
    if (nodes > 8_192 || current.depth > 18) fail();
    if (typeof current.value === "string") {
      if (
        current.value.length > 4_096 ||
        current.value.normalize("NFC") !== current.value ||
        FORBIDDEN_TEXT_RE.test(current.value)
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
      if (current.value.length > 32) fail();
      for (const child of current.value)
        stack.push({ value: child, depth: current.depth + 1 });
    } else if (current.value !== null && typeof current.value === "object") {
      if (!plain(current.value)) fail();
      const entries = Object.entries(current.value);
      if (entries.length > 64) fail();
      for (const [key, child] of entries) {
        if (RESERVED.has(key)) fail();
        stack.push({ value: child, depth: current.depth + 1 });
      }
    }
  }
}

function selectedRange(profile: LearningV2CourseSessionInteractionProfileV1) {
  const budget = learningV2SessionInteractionBudgetV1();
  return profile === "voice_heavy" ? budget.voiceHeavy : budget[profile];
}

function exactOutcomes(
  value: unknown,
): Readonly<Record<LearningV2InterfaceLocale, string>> {
  if (!plain(value)) fail();
  exactKeys(value, LEARNING_V2_INTERFACE_LOCALES);
  const result = {} as Record<LearningV2InterfaceLocale, string>;
  for (const locale of LEARNING_V2_INTERFACE_LOCALES) {
    const text = value[locale];
    if (
      typeof text !== "string" ||
      text.trim() !== text ||
      text.length < 8 ||
      text.length > 320 ||
      FORBIDDEN_TEXT_RE.test(text) ||
      text.normalize("NFC") !== text
    )
      fail();
    result[locale] = text;
  }
  return Object.freeze(result);
}

export function learningV2CourseSessionChildObjectPathV1(
  input: Readonly<{
    releaseId: string;
    lessonOrdinal: number;
    sessionOrdinal: number;
    kind: LearningV2CourseSessionChildKindV1;
    artifactFingerprint: string;
    contentHash: string;
  }>,
): string {
  const topology = COURSE_TOPOLOGY_V1;
  const session =
    topology.lessons[input.lessonOrdinal - 1]?.sessions[
      input.sessionOrdinal - 1
    ];
  if (
    !session ||
    !LEARNING_V2_COURSE_SESSION_CHILD_KINDS_V1.includes(input.kind)
  )
    fail();
  return `${LEARNING_V2_COURSE_SESSION_CHILD_PREFIX_V1}/${sha256Utf8(exactId(input.releaseId))}/${session.sessionId.replace(":session:", "/sessions/")}/${input.kind}/${exactHash(input.artifactFingerprint)}/${exactHash(input.contentHash)}.json`;
}

function parseChildren(
  value: unknown,
  identity: Readonly<{
    releaseId: string;
    lessonOrdinal: number;
    sessionOrdinal: number;
  }>,
): LearningV2CourseSessionReleasePackageV1["children"] {
  if (
    !Array.isArray(value) ||
    value.length !== LEARNING_V2_COURSE_SESSION_CHILD_KINDS_V1.length
  )
    fail();
  return Object.freeze(
    value.map((candidate, index) => {
      if (!plain(candidate)) fail();
      exactKeys(candidate, CHILD_KEYS);
      const kind = LEARNING_V2_COURSE_SESSION_CHILD_KINDS_V1[index]!;
      const artifactFingerprint = exactHash(candidate.artifactFingerprint);
      const contentHash = exactHash(candidate.contentHash);
      if (
        candidate.kind !== kind ||
        candidate.schemaVersion !==
          LEARNING_V2_COURSE_SESSION_CHILD_SCHEMAS_V1[kind] ||
        typeof candidate.objectGeneration !== "string" ||
        !GENERATION_RE.test(candidate.objectGeneration) ||
        !Number.isSafeInteger(candidate.byteSize) ||
        Number(candidate.byteSize) < 2 ||
        Number(candidate.byteSize) > CHILD_MAX_BYTES[kind] ||
        candidate.contentType !== "application/json; charset=utf-8" ||
        candidate.objectPath !==
          learningV2CourseSessionChildObjectPathV1({
            ...identity,
            kind,
            artifactFingerprint,
            contentHash,
          })
      )
        fail();
      return Object.freeze({
        kind,
        schemaVersion: candidate.schemaVersion,
        artifactFingerprint,
        objectPath: candidate.objectPath,
        contentHash,
        objectGeneration: candidate.objectGeneration,
        byteSize: Number(candidate.byteSize),
        contentType: "application/json; charset=utf-8" as const,
      });
    }),
  ) as LearningV2CourseSessionReleasePackageV1["children"];
}

function validate(value: unknown): LearningV2CourseSessionReleasePackageV1 {
  preflight(value);
  if (!plain(value)) fail();
  exactKeys(value, ROOT_KEYS);
  const topology = COURSE_TOPOLOGY_V1;
  if (
    !Number.isSafeInteger(value.lessonOrdinal) ||
    !Number.isSafeInteger(value.sessionOrdinal)
  )
    fail();
  const session =
    topology.lessons[Number(value.lessonOrdinal) - 1]?.sessions[
      Number(value.sessionOrdinal) - 1
    ];
  if (!session) fail();
  const releaseId = exactId(value.releaseId);
  if (
    !Array.isArray(value.interactionIds) ||
    value.interactionIds.length < 3 ||
    !Array.isArray(value.introInteractionIds) ||
    !Array.isArray(value.practiceInteractionIds)
  )
    fail();
  const interactionIds = value.interactionIds.map(exactId);
  if (
    new Set(interactionIds).size !== interactionIds.length ||
    value.plannedPrimaryInteractionCount !== interactionIds.length ||
    value.introInteractionIds.length !== 3 ||
    value.introInteractionIds.some(
      (entry, index) => entry !== interactionIds[index],
    ) ||
    value.practiceInteractionIds.length !== interactionIds.length - 3 ||
    value.practiceInteractionIds.some(
      (entry, index) => entry !== interactionIds[index + 3],
    )
  )
    fail();
  if (
    value.interactionProfile !== "standard" &&
    value.interactionProfile !== "rapid" &&
    value.interactionProfile !== "voice_heavy"
  )
    fail();
  const profile = value.interactionProfile;
  const range = selectedRange(profile);
  if (interactionIds.length < range.min || interactionIds.length > range.max)
    fail();
  const children = parseChildren(value.children, {
    releaseId,
    lessonOrdinal: session.lessonOrdinal,
    sessionOrdinal: session.sessionOrdinal,
  });
  const body = {
    schemaVersion: LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1,
    topologySchemaVersion: topology.schemaVersion,
    topologyFingerprint: topology.topologyFingerprint,
    releaseId,
    lessonId: topology.lessons[session.lessonOrdinal - 1]!.lessonId,
    lessonOrdinal: session.lessonOrdinal,
    ownerLessonFingerprint: exactHash(value.ownerLessonFingerprint),
    ownerConfirmationFingerprint: exactHash(value.ownerConfirmationFingerprint),
    courseSessionId: session.sessionId,
    sessionOrdinal: session.sessionOrdinal,
    chapterOrdinal: session.chapterOrdinal,
    positionInChapter: session.positionInChapter,
    role: session.role,
    learningOutcomeKind:
      value.learningOutcomeKind === "understand" ||
      value.learningOutcomeKind === "learn" ||
      value.learningOutcomeKind === "can_do"
        ? (value.learningOutcomeKind as LearningV2CourseSessionOutcomeKindV1)
        : fail(),
    learningOutcomeByLocale: exactOutcomes(value.learningOutcomeByLocale),
    interactionProfile: profile as LearningV2CourseSessionInteractionProfileV1,
    interactionBudget: learningV2SessionInteractionBudgetV1(),
    plannedPrimaryInteractionCount: interactionIds.length,
    interactionIds: Object.freeze(interactionIds),
    introInteractionIds: Object.freeze(interactionIds.slice(0, 3)) as readonly [
      string,
      string,
      string,
    ],
    practiceInteractionIds: Object.freeze(interactionIds.slice(3)),
    introPageCount: 3 as const,
    practiceStartOrdinal: 4 as const,
    introQuestionPolicy:
      "one_embedded_question_per_intro_page_no_post_intro_duplicate" as const,
    completionPolicy: "duration_and_objective_coverage_not_raw_count" as const,
    remediationPolicy:
      "retries_and_second_error_explanation_outside_base_count" as const,
    interactionSetFingerprint: hashCanonicalBody(interactionIds),
    children,
    childSetFingerprint: hashCanonicalBody(children),
    contentAuthorship: "owner_only" as const,
    learnerProjectionPolicy:
      "positive_allowlist_intro_learner_capsule_auxiliary_only" as const,
    evaluatorIsolationPolicy:
      "server_sidecar_never_returned_to_learner" as const,
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
  const exactFields = [
    "schemaVersion",
    "topologySchemaVersion",
    "topologyFingerprint",
    "lessonId",
    "courseSessionId",
    "chapterOrdinal",
    "positionInChapter",
    "role",
    "interactionBudget",
    "introPageCount",
    "practiceStartOrdinal",
    "introQuestionPolicy",
    "completionPolicy",
    "remediationPolicy",
    "interactionSetFingerprint",
    "childSetFingerprint",
    "contentAuthorship",
    "learnerProjectionPolicy",
    "evaluatorIsolationPolicy",
    "repositoryOriginAuthority",
    "storageAuthority",
    "ownerConfirmationAuthority",
    "runtimeAuthority",
    "walletAuthority",
    "masteryAuthority",
    "evidenceAuthority",
    "publicationAuthority",
    "releaseAuthority",
  ] as const;
  if (
    exactFields.some(
      (field) => canonicalJsonV1(value[field]) !== canonicalJsonV1(body[field]),
    ) ||
    value.packageFingerprint !== hashCanonicalBody(body)
  )
    fail();
  const result = Object.freeze({
    ...body,
    packageFingerprint: value.packageFingerprint as string,
  });
  handles.add(result);
  return result;
}

export function materializeLearningV2CourseSessionReleasePackageV1(
  input: Readonly<{
    releaseId: string;
    lessonOrdinal: number;
    sessionOrdinal: number;
    ownerLessonFingerprint: string;
    ownerConfirmationFingerprint: string;
    learningOutcomeKind: LearningV2CourseSessionOutcomeKindV1;
    learningOutcomeByLocale: Readonly<
      Record<LearningV2InterfaceLocale, string>
    >;
    interactionProfile: LearningV2CourseSessionInteractionProfileV1;
    interactionIds: readonly string[];
    children: readonly LearningV2CourseSessionChildInputV1[];
  }>,
): LearningV2CourseSessionReleasePackageV1 {
  const topology = COURSE_TOPOLOGY_V1;
  const session =
    topology.lessons[input.lessonOrdinal - 1]?.sessions[
      input.sessionOrdinal - 1
    ];
  if (!session || input.children.length !== 5) fail();
  const children = input.children.map((child) => ({
    ...child,
    objectPath: learningV2CourseSessionChildObjectPathV1({
      releaseId: input.releaseId,
      lessonOrdinal: input.lessonOrdinal,
      sessionOrdinal: input.sessionOrdinal,
      kind: child.kind,
      artifactFingerprint: child.artifactFingerprint,
      contentHash: child.contentHash,
    }),
    contentType: "application/json; charset=utf-8" as const,
  }));
  const interactionIds = [...input.interactionIds];
  const body = {
    schemaVersion: LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_SCHEMA_V1,
    topologySchemaVersion: topology.schemaVersion,
    topologyFingerprint: topology.topologyFingerprint,
    releaseId: input.releaseId,
    lessonId: topology.lessons[input.lessonOrdinal - 1]!.lessonId,
    lessonOrdinal: input.lessonOrdinal,
    ownerLessonFingerprint: input.ownerLessonFingerprint,
    ownerConfirmationFingerprint: input.ownerConfirmationFingerprint,
    courseSessionId: session.sessionId,
    sessionOrdinal: session.sessionOrdinal,
    chapterOrdinal: session.chapterOrdinal,
    positionInChapter: session.positionInChapter,
    role: session.role,
    learningOutcomeKind: input.learningOutcomeKind,
    learningOutcomeByLocale: input.learningOutcomeByLocale,
    interactionProfile: input.interactionProfile,
    interactionBudget: learningV2SessionInteractionBudgetV1(),
    plannedPrimaryInteractionCount: interactionIds.length,
    interactionIds,
    introInteractionIds: interactionIds.slice(0, 3),
    practiceInteractionIds: interactionIds.slice(3),
    introPageCount: 3,
    practiceStartOrdinal: 4,
    introQuestionPolicy:
      "one_embedded_question_per_intro_page_no_post_intro_duplicate",
    completionPolicy: "duration_and_objective_coverage_not_raw_count",
    remediationPolicy:
      "retries_and_second_error_explanation_outside_base_count",
    interactionSetFingerprint: hashCanonicalBody(interactionIds),
    children,
    childSetFingerprint: hashCanonicalBody(children),
    contentAuthorship: "owner_only",
    learnerProjectionPolicy:
      "positive_allowlist_intro_learner_capsule_auxiliary_only",
    evaluatorIsolationPolicy: "server_sidecar_never_returned_to_learner",
    repositoryOriginAuthority: "none_server_readback_required",
    storageAuthority: "none_server_readback_required",
    ownerConfirmationAuthority: "none_private_owner_handle_required",
    runtimeAuthority: "none_active_release_join_required",
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    publicationAuthority: "none",
    releaseAuthority: false,
  };
  return validate({ ...body, packageFingerprint: hashCanonicalBody(body) });
}

export function parseLearningV2CourseSessionReleasePackageV1(
  raw: string,
): LearningV2CourseSessionReleasePackageV1 {
  if (
    typeof raw !== "string" ||
    raw.length > LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_MAX_BYTES_V1
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

export function encodeLearningV2CourseSessionReleasePackageV1(
  value: LearningV2CourseSessionReleasePackageV1,
): string {
  if (!handles.has(value)) fail();
  const raw = canonicalJsonV1(value);
  if (
    utf8ByteLengthV1(raw) >
    LEARNING_V2_COURSE_SESSION_RELEASE_PACKAGE_MAX_BYTES_V1
  )
    fail();
  return raw;
}

export function bindLearningV2CourseSessionPackageToReleaseIndexV1(
  input: Readonly<{
    index: LearningV2CourseLessonReleaseIndexV1;
    package: LearningV2CourseSessionReleasePackageV1;
  }>,
): LearningV2CourseSessionReleasePackageV1 {
  if (
    !isLearningV2CourseLessonReleaseIndexV1(input.index) ||
    !handles.has(input.package)
  )
    fail();
  const row = input.index.sessions[input.package.sessionOrdinal - 1];
  const raw = encodeLearningV2CourseSessionReleasePackageV1(input.package);
  if (
    !row ||
    input.index.releaseId !== input.package.releaseId ||
    input.index.lessonId !== input.package.lessonId ||
    input.index.ownerLessonFingerprint !==
      input.package.ownerLessonFingerprint ||
    input.index.ownerConfirmationFingerprint !==
      input.package.ownerConfirmationFingerprint ||
    row.courseSessionId !== input.package.courseSessionId ||
    row.learningOutcomeKind !== input.package.learningOutcomeKind ||
    canonicalJsonV1(row.learningOutcomeByLocale) !==
      canonicalJsonV1(input.package.learningOutcomeByLocale) ||
    row.packageFingerprint !== input.package.packageFingerprint ||
    row.packagePin.contentHash !== sha256Utf8(raw) ||
    row.packagePin.byteSize !== utf8ByteLengthV1(raw)
  )
    fail();
  return input.package;
}

export function isLearningV2CourseSessionReleasePackageV1(
  value: unknown,
): value is LearningV2CourseSessionReleasePackageV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
