import {
  evaluateLearningV2CourseSessionInteractionV1,
  isLearningV2CourseSessionEvaluatorCapsuleChildV1,
  type LearningV2CourseSessionEvaluatorCapsuleChildV1,
} from "./course_session_evaluator_capsule_child_v1";
import type {
  V2LocalEvaluatorResponseV1,
  V2LocalEvaluatorVerdictV1,
} from "./local_evaluator_capsule_v1";
import {
  encodeLearningV2CourseSessionAuxiliaryChildV1,
  encodeLearningV2CourseSessionIntroChildV1,
  encodeLearningV2CourseSessionLearnerChildV1,
  type LearningV2CourseSessionAuxiliaryChildV1,
  type LearningV2CourseSessionIntroPageV1,
  type LearningV2CourseSessionIntroChildV1,
  type LearningV2CourseSessionLearnerChildV1,
  type LearningV2CourseSessionNewWordEncounterV1,
  type LearningV2CourseSessionPracticeInteractionV1,
} from "./course_session_client_children_v1";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { parseV2ExactLanguageTagV1 } from "../contracts/language_tag_v1";

export const LEARNING_V2_COURSE_SESSION_DEVICE_RUN_SCHEMA_V1 =
  "learning-v2-course-session-device-run.v1" as const;
export const LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_SCHEMA_V1 =
  "learning-v2-course-session-completed-summary.v1" as const;
export const LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_MAX_BYTES_V1 =
  64 * 1024;

export interface LearningV2CourseSessionDeviceRunHandleV1 {
  readonly schemaVersion: typeof LEARNING_V2_COURSE_SESSION_DEVICE_RUN_SCHEMA_V1;
}

export type LearningV2CourseSessionDeviceRunSummaryV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_SESSION_DEVICE_RUN_SCHEMA_V1;
  environment: "lab" | "staging" | "production";
  targetLanguage: string;
  studyTarget: string;
  learnerSourceLocale: string;
  seasonId: string;
  releaseId: string;
  activeRootFingerprint: string;
  activeHeadFingerprint: string;
  lessonId: string;
  lessonOrdinal: number;
  courseSessionId: string;
  sessionOrdinal: number;
  packageFingerprint: string;
  childSetFingerprint: string;
  introInteractionCount: 3;
  practiceInteractionCount: number;
  interactionCount: number;
  interactionSetFingerprint: string;
  correctnessAuthority: "local_device_only";
  serverAnswerAuthority: "none_answers_never_transported_or_rechecked";
  interruptedSessionPolicy: "restart_from_first_intro_with_new_run_id";
  partialRunPersistence: "none";
  releaseAuthority: false;
}>;

export type LearningV2CourseSessionInteractionCompletionV1 = Readonly<{
  interactionId: string;
  disposition: "completed" | "skipped";
  learnerAttempts: number;
  hintUsed: boolean;
}>;

export type LearningV2CourseSessionCompletedSummaryV1 = Readonly<{
  schemaVersion: typeof LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_SCHEMA_V1;
  environment: "lab" | "staging" | "production";
  targetLanguage: string;
  studyTarget: string;
  learnerSourceLocale: string;
  seasonId: string;
  releaseId: string;
  activeRootFingerprint: string;
  activeHeadFingerprint: string;
  lessonId: string;
  lessonOrdinal: number;
  courseSessionId: string;
  sessionOrdinal: number;
  packageFingerprint: string;
  childSetFingerprint: string;
  sessionRunId: string;
  interactionCompletions: readonly Readonly<{
    interactionOrdinal: number;
    interactionId: string;
    disposition: "completed" | "skipped";
    learnerAttempts: number;
    hintUsed: boolean;
  }>[];
  interactionCount: number;
  interactionSetFingerprint: string;
  answerPayload: "absent";
  perAnswerTransport: "none";
  localFeedbackAuthority: "device_interaction_only";
  serverEvaluationAuthority: "none_server_must_not_return_correct_or_wrong";
  completionAuthority: "completed_session_summary_for_background_storage_only";
  interruptedSessionPolicy: "restart_from_first_intro_with_new_run_id";
  partialRunPersistence: "none";
  walletAuthority: "none";
  masteryAuthority: "none";
  evidenceAuthority: "none";
  releaseAuthority: false;
  completionFingerprint: string;
}>;

type RunMaterial = Readonly<{
  summary: LearningV2CourseSessionDeviceRunSummaryV1;
  intro: LearningV2CourseSessionIntroChildV1;
  learner: LearningV2CourseSessionLearnerChildV1;
  evaluator: LearningV2CourseSessionEvaluatorCapsuleChildV1;
  auxiliary: LearningV2CourseSessionAuxiliaryChildV1;
  interactionIds: readonly string[];
}>;

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const handles = new WeakSet<object>();
const materialByHandle = new WeakMap<object, RunMaterial>();
const completedSummaryHandles = new WeakSet<object>();
const COMPLETED_ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "environment",
  "targetLanguage",
  "studyTarget",
  "learnerSourceLocale",
  "seasonId",
  "releaseId",
  "activeRootFingerprint",
  "activeHeadFingerprint",
  "lessonId",
  "lessonOrdinal",
  "courseSessionId",
  "sessionOrdinal",
  "packageFingerprint",
  "childSetFingerprint",
  "sessionRunId",
  "interactionCompletions",
  "interactionCount",
  "interactionSetFingerprint",
  "answerPayload",
  "perAnswerTransport",
  "localFeedbackAuthority",
  "serverEvaluationAuthority",
  "completionAuthority",
  "interruptedSessionPolicy",
  "partialRunPersistence",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "releaseAuthority",
  "completionFingerprint",
] as const);
const COMPLETION_ROW_KEYS = Object.freeze([
  "interactionOrdinal",
  "interactionId",
  "disposition",
  "learnerAttempts",
  "hintUsed",
] as const);

function fail(): never {
  throw new Error("learning_v2_course_session_device_run_invalid");
}

function exactId(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value)) fail();
  return value;
}

function exactHash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

function exactOrdinal(value: unknown, max: number): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1 || Number(value) > max)
    fail();
  return Number(value);
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
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  if (
    keys.length !== sortedExpected.length ||
    keys.some((key, index) => key !== sortedExpected[index])
  )
    fail();
}

function sameOrder(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    left.every((entry, index) => entry === right[index])
  );
}

function material(handle: LearningV2CourseSessionDeviceRunHandleV1) {
  if (!isLearningV2CourseSessionDeviceRunHandleV1(handle)) fail();
  const found = materialByHandle.get(handle);
  if (!found) fail();
  return found;
}

export function createLearningV2CourseSessionDeviceRunV1(
  input: Readonly<{
    environment: "lab" | "staging" | "production";
    targetLanguage: string;
    studyTarget: string;
    learnerSourceLocale: string;
    seasonId: string;
    releaseId: string;
    activeRootFingerprint: string;
    activeHeadFingerprint: string;
    lessonId: string;
    lessonOrdinal: number;
    courseSessionId: string;
    sessionOrdinal: number;
    packageFingerprint: string;
    childSetFingerprint: string;
    introChild: LearningV2CourseSessionIntroChildV1;
    learnerChild: LearningV2CourseSessionLearnerChildV1;
    evaluatorCapsuleChild: LearningV2CourseSessionEvaluatorCapsuleChildV1;
    auxiliaryChild: LearningV2CourseSessionAuxiliaryChildV1;
  }>,
): LearningV2CourseSessionDeviceRunHandleV1 {
  if (
    typeof input !== "object" ||
    input === null ||
    !isLearningV2CourseSessionEvaluatorCapsuleChildV1(
      input.evaluatorCapsuleChild,
    )
  )
    fail();
  // These encoders accept only canonical parser/materializer handles. A
  // caller-created lookalike must not become an executable learner run.
  try {
    encodeLearningV2CourseSessionIntroChildV1(input.introChild);
    encodeLearningV2CourseSessionLearnerChildV1(input.learnerChild);
    encodeLearningV2CourseSessionAuxiliaryChildV1(input.auxiliaryChild);
  } catch {
    fail();
  }
  if (
    !["lab", "staging", "production"].includes(input.environment) ||
    parseV2ExactLanguageTagV1(input.targetLanguage) === null ||
    parseV2ExactLanguageTagV1(input.studyTarget) === null ||
    parseV2ExactLanguageTagV1(input.learnerSourceLocale) === null
  )
    fail();
  const seasonId = exactId(input.seasonId);
  const releaseId = exactId(input.releaseId);
  const activeRootFingerprint = exactHash(input.activeRootFingerprint);
  const activeHeadFingerprint = exactHash(input.activeHeadFingerprint);
  const lessonId = exactId(input.lessonId);
  const lessonOrdinal = exactOrdinal(input.lessonOrdinal, 32);
  const courseSessionId = exactId(input.courseSessionId);
  const sessionOrdinal = exactOrdinal(input.sessionOrdinal, 56);
  const packageFingerprint = exactHash(input.packageFingerprint);
  const childSetFingerprint = exactHash(input.childSetFingerprint);
  if (
    input.introChild.courseSessionId !== courseSessionId ||
    input.learnerChild.courseSessionId !== courseSessionId ||
    input.evaluatorCapsuleChild.courseSessionId !== courseSessionId ||
    input.auxiliaryChild.courseSessionId !== courseSessionId
  )
    fail();

  const introIds = input.introChild.pages.map(
    (page) => page.question.interactionId,
  );
  const practiceIds = input.learnerChild.interactions.map(
    (entry) => entry.interactionId,
  );
  const interactionIds = Object.freeze([...introIds, ...practiceIds]);
  const evaluatorIds = input.evaluatorCapsuleChild.entries.map(
    (entry) => entry.interactionId,
  );
  const auxiliaryIds = input.auxiliaryChild.entries.map(
    (entry) => entry.interactionId,
  );
  if (
    introIds.length !== 3 ||
    new Set(interactionIds).size !== interactionIds.length ||
    !sameOrder(interactionIds, evaluatorIds) ||
    !sameOrder(interactionIds, auxiliaryIds)
  )
    fail();
  if (
    input.auxiliaryChild.entries.some(
      (entry) => entry.save.targetLanguage !== input.targetLanguage,
    )
  )
    fail();
  if (
    input.evaluatorCapsuleChild.entries
      .slice(0, 3)
      .some((entry) => entry.inputKind !== "text")
  )
    fail();
  input.learnerChild.interactions.forEach((entry, index) => {
    const evaluator = input.evaluatorCapsuleChild.entries[index + 3];
    const expectedInputKind =
      entry.inputMode === "single_choice" || entry.inputMode === "pair_grid"
        ? "choice_token"
        : entry.inputMode === "scripted_speech" ||
            entry.inputMode === "tap_record_compare"
          ? "transcript"
          : "text";
    if (
      !evaluator ||
      evaluator.family !== entry.family ||
      evaluator.inputKind !== expectedInputKind
    )
      fail();
  });

  const summary = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_DEVICE_RUN_SCHEMA_V1,
    environment: input.environment,
    targetLanguage: input.targetLanguage,
    studyTarget: input.studyTarget,
    learnerSourceLocale: input.learnerSourceLocale,
    seasonId,
    releaseId,
    activeRootFingerprint,
    activeHeadFingerprint,
    lessonId,
    lessonOrdinal,
    courseSessionId,
    sessionOrdinal,
    packageFingerprint,
    childSetFingerprint,
    introInteractionCount: 3 as const,
    practiceInteractionCount: practiceIds.length,
    interactionCount: interactionIds.length,
    interactionSetFingerprint: hashCanonicalBody(interactionIds),
    correctnessAuthority: "local_device_only" as const,
    serverAnswerAuthority:
      "none_answers_never_transported_or_rechecked" as const,
    interruptedSessionPolicy:
      "restart_from_first_intro_with_new_run_id" as const,
    partialRunPersistence: "none" as const,
    releaseAuthority: false as const,
  });
  const handle = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_DEVICE_RUN_SCHEMA_V1,
  });
  handles.add(handle);
  materialByHandle.set(
    handle,
    Object.freeze({
      summary,
      intro: input.introChild,
      learner: input.learnerChild,
      evaluator: input.evaluatorCapsuleChild,
      auxiliary: input.auxiliaryChild,
      interactionIds,
    }),
  );
  return handle;
}

export function isLearningV2CourseSessionDeviceRunHandleV1(
  value: unknown,
): value is LearningV2CourseSessionDeviceRunHandleV1 {
  return typeof value === "object" && value !== null && handles.has(value);
}

export function getLearningV2CourseSessionDeviceRunSummaryV1(
  handle: LearningV2CourseSessionDeviceRunHandleV1,
): LearningV2CourseSessionDeviceRunSummaryV1 {
  return material(handle).summary;
}

export function getLearningV2CourseSessionIntroPageV1(
  handle: LearningV2CourseSessionDeviceRunHandleV1,
  pageOrdinal: 1 | 2 | 3,
): LearningV2CourseSessionIntroPageV1 {
  return material(handle).intro.pages[pageOrdinal - 1];
}

export function getLearningV2CourseSessionPracticeInteractionV1(
  handle: LearningV2CourseSessionDeviceRunHandleV1,
  practiceIndex: number,
): LearningV2CourseSessionPracticeInteractionV1 {
  const found = material(handle).learner.interactions[practiceIndex];
  if (!found) fail();
  return found;
}

export function getLearningV2CourseSessionAuxiliaryEntryV1(
  handle: LearningV2CourseSessionDeviceRunHandleV1,
  interactionId: string,
) {
  const found = material(handle).auxiliary.entries.find(
    (entry) => entry.interactionId === interactionId,
  );
  if (!found) fail();
  return found;
}

export function getLearningV2CourseSessionNewWordEncountersV1(
  handle: LearningV2CourseSessionDeviceRunHandleV1,
): readonly LearningV2CourseSessionNewWordEncounterV1[] {
  const encounters = material(handle)
    .auxiliary.entries.flatMap((entry) =>
      entry.newWordEncounter ? [entry.newWordEncounter] : [],
    )
    .sort((left, right) => left.orderWithinSession - right.orderWithinSession);
  if (
    encounters.some(
      (encounter, index) => encounter.orderWithinSession !== index + 1,
    )
  )
    fail();
  return Object.freeze(encounters);
}

export function evaluateLearningV2CourseSessionDeviceInteractionV1(
  handle: LearningV2CourseSessionDeviceRunHandleV1,
  interactionId: string,
  response: V2LocalEvaluatorResponseV1,
): V2LocalEvaluatorVerdictV1 {
  const found = material(handle);
  if (!found.interactionIds.includes(interactionId)) fail();
  return evaluateLearningV2CourseSessionInteractionV1(
    found.evaluator,
    interactionId,
    response,
  );
}

export function materializeLearningV2CourseSessionCompletedSummaryV1(
  input: Readonly<{
    run: LearningV2CourseSessionDeviceRunHandleV1;
    sessionRunId: string;
    interactionCompletions: readonly LearningV2CourseSessionInteractionCompletionV1[];
  }>,
): LearningV2CourseSessionCompletedSummaryV1 {
  const found = material(input.run);
  const sessionRunId = exactId(input.sessionRunId);
  if (
    !Array.isArray(input.interactionCompletions) ||
    input.interactionCompletions.length !== found.interactionIds.length
  )
    fail();
  const seen = new Set<string>();
  const interactionCompletions = Object.freeze(
    found.interactionIds.map((interactionId, index) => {
      const candidate = input.interactionCompletions[index];
      if (
        !candidate ||
        candidate.interactionId !== interactionId ||
        seen.has(interactionId) ||
        !["completed", "skipped"].includes(candidate.disposition) ||
        !Number.isSafeInteger(candidate.learnerAttempts) ||
        candidate.learnerAttempts <
          (candidate.disposition === "completed" ? 1 : 0) ||
        candidate.learnerAttempts > 99 ||
        typeof candidate.hintUsed !== "boolean"
      )
        fail();
      seen.add(interactionId);
      return Object.freeze({
        interactionOrdinal: index + 1,
        interactionId,
        disposition: candidate.disposition,
        learnerAttempts: candidate.learnerAttempts,
        hintUsed: candidate.hintUsed,
      });
    }),
  );
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_SCHEMA_V1,
    environment: found.summary.environment,
    targetLanguage: found.summary.targetLanguage,
    studyTarget: found.summary.studyTarget,
    learnerSourceLocale: found.summary.learnerSourceLocale,
    seasonId: found.summary.seasonId,
    releaseId: found.summary.releaseId,
    activeRootFingerprint: found.summary.activeRootFingerprint,
    activeHeadFingerprint: found.summary.activeHeadFingerprint,
    lessonId: found.summary.lessonId,
    lessonOrdinal: found.summary.lessonOrdinal,
    courseSessionId: found.summary.courseSessionId,
    sessionOrdinal: found.summary.sessionOrdinal,
    packageFingerprint: found.summary.packageFingerprint,
    childSetFingerprint: found.summary.childSetFingerprint,
    sessionRunId,
    interactionCompletions,
    interactionCount: interactionCompletions.length,
    interactionSetFingerprint: found.summary.interactionSetFingerprint,
    answerPayload: "absent" as const,
    perAnswerTransport: "none" as const,
    localFeedbackAuthority: "device_interaction_only" as const,
    serverEvaluationAuthority:
      "none_server_must_not_return_correct_or_wrong" as const,
    completionAuthority:
      "completed_session_summary_for_background_storage_only" as const,
    interruptedSessionPolicy:
      "restart_from_first_intro_with_new_run_id" as const,
    partialRunPersistence: "none" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  const result = Object.freeze({
    ...body,
    completionFingerprint: hashCanonicalBody(body),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_MAX_BYTES_V1
  )
    fail();
  completedSummaryHandles.add(result);
  return result;
}

export function parseLearningV2CourseSessionCompletedSummaryV1(
  input: unknown,
): LearningV2CourseSessionCompletedSummaryV1 {
  if (!plain(input)) fail();
  exactKeys(input, COMPLETED_ROOT_KEYS);
  if (
    input.schemaVersion !==
      LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_SCHEMA_V1 ||
    !["lab", "staging", "production"].includes(String(input.environment)) ||
    parseV2ExactLanguageTagV1(input.targetLanguage) === null ||
    parseV2ExactLanguageTagV1(input.studyTarget) === null ||
    parseV2ExactLanguageTagV1(input.learnerSourceLocale) === null ||
    !Array.isArray(input.interactionCompletions) ||
    input.interactionCompletions.length < 10 ||
    input.interactionCompletions.length > 22 ||
    input.interactionCount !== input.interactionCompletions.length ||
    input.answerPayload !== "absent" ||
    input.perAnswerTransport !== "none" ||
    input.localFeedbackAuthority !== "device_interaction_only" ||
    input.serverEvaluationAuthority !==
      "none_server_must_not_return_correct_or_wrong" ||
    input.completionAuthority !==
      "completed_session_summary_for_background_storage_only" ||
    input.interruptedSessionPolicy !==
      "restart_from_first_intro_with_new_run_id" ||
    input.partialRunPersistence !== "none" ||
    input.walletAuthority !== "none" ||
    input.masteryAuthority !== "none" ||
    input.evidenceAuthority !== "none" ||
    input.releaseAuthority !== false
  )
    fail();
  const seen = new Set<string>();
  const interactionCompletions = Object.freeze(
    input.interactionCompletions.map((candidate, index) => {
      if (!plain(candidate)) fail();
      exactKeys(candidate, COMPLETION_ROW_KEYS);
      const interactionId = exactId(candidate.interactionId);
      if (
        seen.has(interactionId) ||
        candidate.interactionOrdinal !== index + 1 ||
        !["completed", "skipped"].includes(String(candidate.disposition)) ||
        !Number.isSafeInteger(candidate.learnerAttempts) ||
        Number(candidate.learnerAttempts) <
          (candidate.disposition === "completed" ? 1 : 0) ||
        Number(candidate.learnerAttempts) > 99 ||
        typeof candidate.hintUsed !== "boolean"
      )
        fail();
      seen.add(interactionId);
      return Object.freeze({
        interactionOrdinal: index + 1,
        interactionId,
        disposition: candidate.disposition as "completed" | "skipped",
        learnerAttempts: Number(candidate.learnerAttempts),
        hintUsed: candidate.hintUsed,
      });
    }),
  );
  const body = Object.freeze({
    schemaVersion: LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_SCHEMA_V1,
    environment: input.environment as "lab" | "staging" | "production",
    targetLanguage: String(input.targetLanguage),
    studyTarget: String(input.studyTarget),
    learnerSourceLocale: String(input.learnerSourceLocale),
    seasonId: exactId(input.seasonId),
    releaseId: exactId(input.releaseId),
    activeRootFingerprint: exactHash(input.activeRootFingerprint),
    activeHeadFingerprint: exactHash(input.activeHeadFingerprint),
    lessonId: exactId(input.lessonId),
    lessonOrdinal: exactOrdinal(input.lessonOrdinal, 32),
    courseSessionId: exactId(input.courseSessionId),
    sessionOrdinal: exactOrdinal(input.sessionOrdinal, 56),
    packageFingerprint: exactHash(input.packageFingerprint),
    childSetFingerprint: exactHash(input.childSetFingerprint),
    sessionRunId: exactId(input.sessionRunId),
    interactionCompletions,
    interactionCount: interactionCompletions.length,
    interactionSetFingerprint: exactHash(input.interactionSetFingerprint),
    answerPayload: "absent" as const,
    perAnswerTransport: "none" as const,
    localFeedbackAuthority: "device_interaction_only" as const,
    serverEvaluationAuthority:
      "none_server_must_not_return_correct_or_wrong" as const,
    completionAuthority:
      "completed_session_summary_for_background_storage_only" as const,
    interruptedSessionPolicy:
      "restart_from_first_intro_with_new_run_id" as const,
    partialRunPersistence: "none" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    releaseAuthority: false as const,
  });
  if (
    body.interactionSetFingerprint !==
      hashCanonicalBody(
        interactionCompletions.map((entry) => entry.interactionId),
      ) ||
    input.completionFingerprint !== hashCanonicalBody(body)
  )
    fail();
  const result = Object.freeze({
    ...body,
    completionFingerprint: String(input.completionFingerprint),
  });
  if (
    utf8ByteLengthV1(canonicalJsonV1(result)) >
    LEARNING_V2_COURSE_SESSION_COMPLETED_SUMMARY_MAX_BYTES_V1
  )
    fail();
  completedSummaryHandles.add(result);
  return result;
}

export function encodeLearningV2CourseSessionCompletedSummaryV1(
  value: LearningV2CourseSessionCompletedSummaryV1,
): string {
  if (!completedSummaryHandles.has(value)) fail();
  return canonicalJsonV1(value);
}
