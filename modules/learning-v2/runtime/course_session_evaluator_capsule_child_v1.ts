import {
  V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
  buildV2LocalEvaluatorCapsuleRawV1,
  createV2LocalEvaluatorCommitmentV1,
  evaluateV2LocalEvaluatorCapsuleV1,
  parseV2LocalEvaluatorCapsuleV1,
  v2LocalEvaluatorInputKindForFamilyV1,
  type V2LocalEvaluatorCapsuleHandleV1,
  type V2LocalEvaluatorFamilyV1,
  type V2LocalEvaluatorResponseV1,
  type V2LocalEvaluatorVerdictV1,
} from "./local_evaluator_capsule_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";

export const LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_SCHEMA_V1 =
  "learning-v2-course-session-evaluator-capsule-child.v1" as const;
export const LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_MAX_BYTES_V1 =
  512 * 1024;

export type LearningV2CourseSessionEvaluatorCapsuleEntryV1 = Readonly<{
  interactionId: string;
  activityId: string;
  capsuleId: string;
  family: V2LocalEvaluatorFamilyV1;
  inputKind: ReturnType<typeof v2LocalEvaluatorInputKindForFamilyV1>;
  capsuleRaw: string;
  capsuleRawHash: string;
}>;

export type LearningV2CourseSessionEvaluatorCapsuleChildV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_SCHEMA_V1;
  courseSessionId: string;
  normalizationProfileHash: typeof V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1;
  entries: readonly LearningV2CourseSessionEvaluatorCapsuleEntryV1[];
  entryCount: number;
  assessmentSecrecy: "none_device_inspectable";
  verdictAuthority: "local_provisional_only";
  plaintextAnswerPayload: "absent_by_exact_schema";
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  completionAuthority: "none";
  releaseAuthority: false;
  capsuleSetFingerprint: string;
}>;

export type LearningV2CourseSessionEvaluatorCapsuleInputV1 = Readonly<{
  interactionId: string;
  activityId: string;
  capsuleId: string;
  family: V2LocalEvaluatorFamilyV1;
  normalizationLocale: string;
  salt: string;
  acceptedResponses: readonly string[];
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const RESERVED = new Set(["__proto__", "prototype", "constructor"]);
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "courseSessionId",
  "normalizationProfileHash",
  "entries",
  "entryCount",
  "assessmentSecrecy",
  "verdictAuthority",
  "plaintextAnswerPayload",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "completionAuthority",
  "releaseAuthority",
  "capsuleSetFingerprint",
] as const);
const ENTRY_KEYS = Object.freeze([
  "interactionId",
  "activityId",
  "capsuleId",
  "family",
  "inputKind",
  "capsuleRaw",
  "capsuleRawHash",
] as const);
const handles = new WeakSet<object>();
const capsulesByChild = new WeakMap<
  object,
  ReadonlyMap<string, V2LocalEvaluatorCapsuleHandleV1>
>();

function fail(): never {
  throw new Error("learning_v2_course_session_evaluator_capsule_child_invalid");
}

function plain(value: unknown): value is Record<string, unknown> {
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

function exactId(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value) || RESERVED.has(value))
    fail();
  return value;
}

function parseBody(
  value: unknown,
): LearningV2CourseSessionEvaluatorCapsuleChildV1 {
  if (!plain(value)) fail();
  exactKeys(value, ROOT_KEYS);
  if (
    value.schemaVersion !==
      LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_SCHEMA_V1 ||
    value.normalizationProfileHash !==
      V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1 ||
    !Array.isArray(value.entries) ||
    value.entries.length < 10 ||
    value.entries.length > 22 ||
    value.entryCount !== value.entries.length ||
    value.assessmentSecrecy !== "none_device_inspectable" ||
    value.verdictAuthority !== "local_provisional_only" ||
    value.plaintextAnswerPayload !== "absent_by_exact_schema" ||
    value.walletAuthority !== "none" ||
    value.masteryAuthority !== "none" ||
    value.evidenceAuthority !== "none" ||
    value.completionAuthority !== "none" ||
    value.releaseAuthority !== false
  )
    fail();
  const courseSessionId = exactId(value.courseSessionId);
  const seen = new Set<string>();
  const capsuleHandles = new Map<string, V2LocalEvaluatorCapsuleHandleV1>();
  const entries = value.entries.map((candidate) => {
    if (!plain(candidate)) fail();
    exactKeys(candidate, ENTRY_KEYS);
    const interactionId = exactId(candidate.interactionId);
    const activityId = exactId(candidate.activityId);
    const capsuleId = exactId(candidate.capsuleId);
    if (seen.has(interactionId)) fail();
    seen.add(interactionId);
    if (
      typeof candidate.capsuleRaw !== "string" ||
      utf8ByteLengthV1(candidate.capsuleRaw) > 64 * 1024 ||
      typeof candidate.capsuleRawHash !== "string" ||
      !HASH_RE.test(candidate.capsuleRawHash) ||
      sha256Utf8(candidate.capsuleRaw) !== candidate.capsuleRawHash
    )
      fail();
    const capsule = parseV2LocalEvaluatorCapsuleV1(candidate.capsuleRaw);
    if (
      capsule.taskId !== interactionId ||
      capsule.activityId !== activityId ||
      capsule.capsuleId !== capsuleId ||
      capsule.family !== candidate.family ||
      capsule.inputKind !== candidate.inputKind
    )
      fail();
    capsuleHandles.set(interactionId, capsule);
    return Object.freeze({
      interactionId,
      activityId,
      capsuleId,
      family: capsule.family,
      inputKind: capsule.inputKind,
      capsuleRaw: candidate.capsuleRaw,
      capsuleRawHash: candidate.capsuleRawHash,
    });
  });
  if (
    value.capsuleSetFingerprint !==
    hashCanonicalBody(
      entries.map((entry) => ({
        interactionId: entry.interactionId,
        activityId: entry.activityId,
        capsuleId: entry.capsuleId,
        family: entry.family,
        inputKind: entry.inputKind,
        capsuleRawHash: entry.capsuleRawHash,
      })),
    )
  )
    fail();
  const result = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_SCHEMA_V1,
    courseSessionId,
    normalizationProfileHash: V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
    entries: Object.freeze(entries),
    entryCount: entries.length,
    assessmentSecrecy: "none_device_inspectable" as const,
    verdictAuthority: "local_provisional_only" as const,
    plaintextAnswerPayload: "absent_by_exact_schema" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none" as const,
    releaseAuthority: false as const,
    capsuleSetFingerprint: value.capsuleSetFingerprint as string,
  });
  handles.add(result);
  capsulesByChild.set(result, capsuleHandles);
  return result;
}

export function materializeLearningV2CourseSessionEvaluatorCapsuleChildV1(
  input: Readonly<{
    courseSessionId: string;
    entries: readonly LearningV2CourseSessionEvaluatorCapsuleInputV1[];
  }>,
): LearningV2CourseSessionEvaluatorCapsuleChildV1 {
  const entries = input.entries.map((entry) => {
    const inputKind = v2LocalEvaluatorInputKindForFamilyV1(entry.family);
    const acceptedCommitments = [...entry.acceptedResponses]
      .map((response) =>
        createV2LocalEvaluatorCommitmentV1({
          capsuleId: entry.capsuleId,
          taskId: entry.interactionId,
          activityId: entry.activityId,
          family: entry.family,
          inputKind,
          normalizationLocale: entry.normalizationLocale,
          normalizationProfileHash:
            V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
          salt: entry.salt,
          response,
        }),
      )
      .sort();
    const capsuleRaw = buildV2LocalEvaluatorCapsuleRawV1({
      capsuleId: entry.capsuleId,
      taskId: entry.interactionId,
      activityId: entry.activityId,
      family: entry.family,
      inputKind,
      normalizationLocale: entry.normalizationLocale,
      normalizationProfileHash:
        V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
      salt: entry.salt,
      acceptedCommitments,
    });
    return {
      interactionId: entry.interactionId,
      activityId: entry.activityId,
      capsuleId: entry.capsuleId,
      family: entry.family,
      inputKind,
      capsuleRaw,
      capsuleRawHash: sha256Utf8(capsuleRaw),
    };
  });
  const body = {
    schemaVersion: LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_SCHEMA_V1,
    courseSessionId: input.courseSessionId,
    normalizationProfileHash: V2_LOCAL_EVALUATOR_NORMALIZATION_PROFILE_HASH_V1,
    entries,
    entryCount: entries.length,
    assessmentSecrecy: "none_device_inspectable",
    verdictAuthority: "local_provisional_only",
    plaintextAnswerPayload: "absent_by_exact_schema",
    walletAuthority: "none",
    masteryAuthority: "none",
    evidenceAuthority: "none",
    completionAuthority: "none",
    releaseAuthority: false,
    capsuleSetFingerprint: hashCanonicalBody(
      entries.map(({ capsuleRaw: _raw, ...entry }) => entry),
    ),
  };
  return parseBody(body);
}

export function parseLearningV2CourseSessionEvaluatorCapsuleChildV1(
  raw: string,
): LearningV2CourseSessionEvaluatorCapsuleChildV1 {
  if (
    typeof raw !== "string" ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_MAX_BYTES_V1
  )
    fail();
  let decoded: unknown;
  try {
    decoded = JSON.parse(raw);
  } catch {
    fail();
  }
  if (canonicalJsonV1(decoded) !== raw) fail();
  return parseBody(decoded);
}

export function encodeLearningV2CourseSessionEvaluatorCapsuleChildV1(
  child: LearningV2CourseSessionEvaluatorCapsuleChildV1,
): string {
  if (!handles.has(child)) fail();
  const raw = canonicalJsonV1(child);
  if (
    utf8ByteLengthV1(raw) >
    LEARNING_V2_COURSE_SESSION_EVALUATOR_CAPSULE_CHILD_MAX_BYTES_V1
  )
    fail();
  return raw;
}

export function evaluateLearningV2CourseSessionInteractionV1(
  child: LearningV2CourseSessionEvaluatorCapsuleChildV1,
  interactionId: string,
  response: V2LocalEvaluatorResponseV1,
): V2LocalEvaluatorVerdictV1 {
  if (!handles.has(child)) fail();
  const capsule = capsulesByChild.get(child)?.get(interactionId);
  if (!capsule) fail();
  return evaluateV2LocalEvaluatorCapsuleV1(capsule, response);
}

export function isLearningV2CourseSessionEvaluatorCapsuleChildV1(
  value: unknown,
): value is LearningV2CourseSessionEvaluatorCapsuleChildV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}
