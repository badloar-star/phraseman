import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  parseLearningV2ActivityReleasedSessionCompletionV1,
  rebindLearningV2ActivityReleasedSessionCompletionV1,
  type LearningV2ActivityReleasedSessionCompletionV1,
} from "./activity_released_session_completion_v1";
import {
  getLearningV2ActivityReleasedSessionRuntimeSummaryV1,
  getLearningV2ActivityReleasedSessionTaskV1,
  isLearningV2ActivityReleasedSessionRuntimeHandleV1,
  type LearningV2ActivityReleasedSessionRuntimeHandleV1,
} from "../runtime/activity_released_session_package_v1";
import type {
  V2LocalEvaluatorInputKindV1,
  V2LocalEvaluatorResponseV1,
} from "../runtime/local_evaluator_capsule_v1";

export const LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_SCHEMA_V2 =
  "learning-v2-activity-released-session-submission.v2" as const;
export const LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_MAX_BYTES_V2 =
  192 * 1024;
export const LEARNING_V2_ACTIVITY_RELEASED_TASK_ATTEMPT_MAX_BYTES_V2 = 1024;
export const LEARNING_V2_ACTIVITY_RELEASED_TASK_ATTEMPT_MAX_COUNT_V2 = 99;

export type LearningV2ActivityReleasedTaskAttemptInputV2 = Readonly<{
  kind: V2LocalEvaluatorInputKindV1;
  value: string | null;
}>;

export type LearningV2ActivityReleasedTaskAnswerInputV2 = Readonly<{
  taskId: string;
  attempts: readonly LearningV2ActivityReleasedTaskAttemptInputV2[];
}>;

export type LearningV2ActivityReleasedTaskAttemptV2 = Readonly<{
  attemptOrdinal: number;
  kind: V2LocalEvaluatorInputKindV1;
  value: string | null;
}>;

export type LearningV2ActivityReleasedTaskAnswerV2 = Readonly<{
  slot: number;
  taskId: string;
  activityId: string;
  family: string;
  inputKind: V2LocalEvaluatorInputKindV1;
  disposition: "completed" | "skipped";
  attempts: readonly LearningV2ActivityReleasedTaskAttemptV2[];
}>;

export interface LearningV2ActivityReleasedSessionSubmissionV2 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_SCHEMA_V2;
  readonly kind: "activity_released_session_submission";
  readonly completion: LearningV2ActivityReleasedSessionCompletionV1;
  readonly completionFingerprint: string;
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
  readonly packageFingerprint: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly sessionRunId: string;
  readonly taskAnswers: readonly LearningV2ActivityReleasedTaskAnswerV2[];
  readonly answerTransport: "bounded_post_session_batch_only";
  readonly rawAudioPayload: "forbidden";
  readonly transcriptClaimAuthority: "untrusted_client_text_claim_only";
  readonly answerSequenceAuthority: "untrusted_client_sequence_only";
  readonly localFeedbackAuthority: "local_provisional_only";
  readonly performanceAuthority: "none_server_evaluation_required";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none_server_evaluation_required";
  readonly releaseAuthority: false;
  readonly submissionFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const INPUT_KINDS = new Set(["text", "choice_token", "transcript"]);
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "kind",
  "completion",
  "completionFingerprint",
  "accountScopeHash",
  "accountGeneration",
  "releaseId",
  "activeManifestHash",
  "episodeId",
  "stageId",
  "activityPackageFingerprint",
  "packageFingerprint",
  "sessionId",
  "sessionOrdinal",
  "sessionRunId",
  "taskAnswers",
  "answerTransport",
  "rawAudioPayload",
  "transcriptClaimAuthority",
  "answerSequenceAuthority",
  "localFeedbackAuthority",
  "performanceAuthority",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "completionAuthority",
  "releaseAuthority",
  "submissionFingerprint",
] as const);
const TASK_KEYS = Object.freeze([
  "slot",
  "taskId",
  "activityId",
  "family",
  "inputKind",
  "disposition",
  "attempts",
] as const);
const ATTEMPT_KEYS = Object.freeze(["attemptOrdinal", "kind", "value"]);

function fail(): never {
  throw new Error("learning_v2_activity_released_session_submission_invalid");
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
  const own = Reflect.ownKeys(value);
  if (
    own.length !== keys.length ||
    own.some((key) => typeof key !== "string" || !keys.includes(key))
  )
    fail();
}

function id(value: unknown): string {
  if (typeof value !== "string" || !ID_RE.test(value)) fail();
  return value;
}

function hash(value: unknown): string {
  if (typeof value !== "string" || !HASH_RE.test(value)) fail();
  return value;
}

function safeInt(value: unknown, minimum: number, maximum: number): number {
  if (
    !Number.isSafeInteger(value) ||
    Number(value) < minimum ||
    Number(value) > maximum
  )
    fail();
  return Number(value);
}

function inputKind(value: unknown): V2LocalEvaluatorInputKindV1 {
  if (typeof value !== "string" || !INPUT_KINDS.has(value)) fail();
  return value as V2LocalEvaluatorInputKindV1;
}

function answerValue(value: unknown): string | null {
  if (value === null) return null;
  if (
    typeof value !== "string" ||
    value.length > LEARNING_V2_ACTIVITY_RELEASED_TASK_ATTEMPT_MAX_BYTES_V2 ||
    utf8ByteLengthV1(value) >
      LEARNING_V2_ACTIVITY_RELEASED_TASK_ATTEMPT_MAX_BYTES_V2 ||
    value.normalize("NFC") !== value ||
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(
      value,
    )
  )
    fail();
  return value;
}

function freeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  Object.values(value as Record<string, unknown>).forEach(freeze);
  return value;
}

function parseAttempt(
  value: unknown,
  expectedOrdinal: number,
  expectedKind: V2LocalEvaluatorInputKindV1,
): LearningV2ActivityReleasedTaskAttemptV2 {
  if (!record(value)) fail();
  exactKeys(value, ATTEMPT_KEYS);
  const kind = inputKind(value.kind);
  if (value.attemptOrdinal !== expectedOrdinal || kind !== expectedKind) fail();
  return freeze({
    attemptOrdinal: expectedOrdinal,
    kind,
    value: answerValue(value.value),
  });
}

function parseTask(
  value: unknown,
  completion: LearningV2ActivityReleasedSessionCompletionV1,
  expectedSlot: number,
): LearningV2ActivityReleasedTaskAnswerV2 {
  if (!record(value)) fail();
  exactKeys(value, TASK_KEYS);
  const completed = completion.taskCompletions[expectedSlot - 1];
  if (!completed || value.slot !== expectedSlot) fail();
  const kind = inputKind(value.inputKind);
  if (
    value.taskId !== completed.taskId ||
    value.activityId !== completed.activityId ||
    value.family !== completed.family ||
    value.disposition !== completed.disposition ||
    !Array.isArray(value.attempts) ||
    value.attempts.length !== completed.learnerAttempts ||
    value.attempts.length >
      LEARNING_V2_ACTIVITY_RELEASED_TASK_ATTEMPT_MAX_COUNT_V2 ||
    (completed.disposition === "completed" && value.attempts.length < 1)
  )
    fail();
  const attempts = Object.freeze(
    value.attempts.map((attempt, index) =>
      parseAttempt(attempt, index + 1, kind),
    ),
  );
  return freeze({
    slot: expectedSlot,
    taskId: id(value.taskId),
    activityId: id(value.activityId),
    family: id(value.family),
    inputKind: kind,
    disposition: completed.disposition,
    attempts,
  });
}

function body(
  completion: LearningV2ActivityReleasedSessionCompletionV1,
  taskAnswers: readonly LearningV2ActivityReleasedTaskAnswerV2[],
) {
  return freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_SCHEMA_V2,
    kind: "activity_released_session_submission" as const,
    completion,
    completionFingerprint: completion.completionFingerprint,
    accountScopeHash: completion.accountScopeHash,
    accountGeneration: completion.accountGeneration,
    releaseId: completion.releaseId,
    activeManifestHash: completion.activeManifestHash,
    episodeId: completion.episodeId,
    stageId: completion.stageId,
    activityPackageFingerprint: completion.activityPackageFingerprint,
    packageFingerprint: completion.packageFingerprint,
    sessionId: completion.sessionId,
    sessionOrdinal: completion.sessionOrdinal,
    sessionRunId: completion.sessionRunId,
    taskAnswers,
    answerTransport: "bounded_post_session_batch_only" as const,
    rawAudioPayload: "forbidden" as const,
    transcriptClaimAuthority: "untrusted_client_text_claim_only" as const,
    answerSequenceAuthority: "untrusted_client_sequence_only" as const,
    localFeedbackAuthority: "local_provisional_only" as const,
    performanceAuthority: "none_server_evaluation_required" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none_server_evaluation_required" as const,
    releaseAuthority: false as const,
  });
}

function bounded(value: unknown): void {
  const raw = canonicalJsonV1(value);
  if (
    raw.length >
      LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_MAX_BYTES_V2 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_MAX_BYTES_V2
  )
    fail();
}

export function materializeLearningV2ActivityReleasedSessionSubmissionV2(input: {
  readonly runtime: LearningV2ActivityReleasedSessionRuntimeHandleV1;
  readonly completion: LearningV2ActivityReleasedSessionCompletionV1;
  readonly taskAnswers: readonly LearningV2ActivityReleasedTaskAnswerInputV2[];
}): LearningV2ActivityReleasedSessionSubmissionV2 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !== "completion|runtime|taskAnswers" ||
    !isLearningV2ActivityReleasedSessionRuntimeHandleV1(input.runtime) ||
    !Array.isArray(input.taskAnswers) ||
    input.taskAnswers.length !== 12
  )
    fail();
  const completion = parseLearningV2ActivityReleasedSessionCompletionV1(
    input.completion,
  );
  const summary = getLearningV2ActivityReleasedSessionRuntimeSummaryV1(
    input.runtime,
  );
  if (
    completion.releaseId !== summary.releaseId ||
    completion.activeManifestHash !== summary.activeManifestHash ||
    completion.episodeId !== summary.episodeId ||
    completion.stageId !== summary.stageId ||
    completion.activityPackageFingerprint !==
      summary.activityPackageFingerprint ||
    completion.packageFingerprint !== summary.packageFingerprint ||
    completion.sessionId !== summary.sessionId ||
    completion.sessionOrdinal !== summary.sessionOrdinal
  )
    fail();
  const answerByTaskId = new Map<
    string,
    LearningV2ActivityReleasedTaskAnswerInputV2
  >();
  for (const candidate of input.taskAnswers) {
    const taskId = record(candidate) ? candidate.taskId : null;
    if (
      !record(candidate) ||
      Object.keys(candidate).sort().join("|") !== "attempts|taskId" ||
      typeof taskId !== "string" ||
      !ID_RE.test(taskId) ||
      !Array.isArray(candidate.attempts) ||
      answerByTaskId.has(taskId)
    )
      fail();
    answerByTaskId.set(
      taskId,
      candidate as unknown as LearningV2ActivityReleasedTaskAnswerInputV2,
    );
  }
  const taskAnswers = Object.freeze(
    Array.from({ length: 12 }, (_, index) => {
      const slot = index + 1;
      const task = getLearningV2ActivityReleasedSessionTaskV1(
        input.runtime,
        slot,
      );
      const completed = completion.taskCompletions[index];
      const supplied = answerByTaskId.get(task.taskId);
      if (!completed || !supplied || completed.taskId !== task.taskId) fail();
      return parseTask(
        {
          slot,
          taskId: task.taskId,
          activityId: task.activityId,
          family: task.family,
          inputKind: task.evaluatorInputKind,
          disposition: completed.disposition,
          attempts: supplied.attempts.map((attempt, attemptIndex) => ({
            attemptOrdinal: attemptIndex + 1,
            kind: attempt.kind,
            value: attempt.value,
          })),
        },
        completion,
        slot,
      );
    }),
  );
  const value = body(completion, taskAnswers);
  const submission = freeze({
    ...value,
    submissionFingerprint: hashCanonicalBody(value),
  });
  bounded(submission);
  return submission;
}

export function parseLearningV2ActivityReleasedSessionSubmissionV2(
  value: unknown,
): LearningV2ActivityReleasedSessionSubmissionV2 {
  if (!record(value)) fail();
  exactKeys(value, ROOT_KEYS);
  if (
    value.schemaVersion !==
      LEARNING_V2_ACTIVITY_RELEASED_SESSION_SUBMISSION_SCHEMA_V2 ||
    value.kind !== "activity_released_session_submission" ||
    value.answerTransport !== "bounded_post_session_batch_only" ||
    value.rawAudioPayload !== "forbidden" ||
    value.transcriptClaimAuthority !== "untrusted_client_text_claim_only" ||
    value.answerSequenceAuthority !== "untrusted_client_sequence_only" ||
    value.localFeedbackAuthority !== "local_provisional_only" ||
    value.performanceAuthority !== "none_server_evaluation_required" ||
    value.walletAuthority !== "none" ||
    value.masteryAuthority !== "none" ||
    value.evidenceAuthority !== "none" ||
    value.completionAuthority !== "none_server_evaluation_required" ||
    value.releaseAuthority !== false ||
    !Array.isArray(value.taskAnswers) ||
    value.taskAnswers.length !== 12
  )
    fail();
  const completion = parseLearningV2ActivityReleasedSessionCompletionV1(
    value.completion,
  );
  if (
    value.completionFingerprint !== completion.completionFingerprint ||
    value.accountScopeHash !== completion.accountScopeHash ||
    value.accountGeneration !== completion.accountGeneration ||
    value.releaseId !== completion.releaseId ||
    value.activeManifestHash !== completion.activeManifestHash ||
    value.episodeId !== completion.episodeId ||
    value.stageId !== completion.stageId ||
    value.activityPackageFingerprint !==
      completion.activityPackageFingerprint ||
    value.packageFingerprint !== completion.packageFingerprint ||
    value.sessionId !== completion.sessionId ||
    value.sessionOrdinal !== completion.sessionOrdinal ||
    value.sessionRunId !== completion.sessionRunId
  )
    fail();
  const taskAnswers = Object.freeze(
    value.taskAnswers.map((task, index) =>
      parseTask(task, completion, index + 1),
    ),
  );
  const expected = body(completion, taskAnswers);
  const submissionFingerprint = hash(value.submissionFingerprint);
  if (hashCanonicalBody(expected) !== submissionFingerprint) fail();
  const result = freeze({ ...expected, submissionFingerprint });
  bounded(result);
  return result;
}

export function rebindLearningV2ActivityReleasedSessionSubmissionV2(
  input: unknown,
  account: Readonly<{
    accountScopeHash: string;
    accountGeneration: number;
  }>,
): LearningV2ActivityReleasedSessionSubmissionV2 {
  if (
    !record(account) ||
    Object.keys(account).sort().join("|") !==
      "accountGeneration|accountScopeHash"
  )
    fail();
  const submission = parseLearningV2ActivityReleasedSessionSubmissionV2(input);
  const completion = rebindLearningV2ActivityReleasedSessionCompletionV1(
    submission.completion,
    {
      accountScopeHash: hash(account.accountScopeHash),
      accountGeneration: safeInt(
        account.accountGeneration,
        1,
        Number.MAX_SAFE_INTEGER,
      ),
    },
  );
  const reboundBody = body(completion, submission.taskAnswers);
  const rebound = freeze({
    ...reboundBody,
    submissionFingerprint: hashCanonicalBody(reboundBody),
  });
  bounded(rebound);
  return rebound;
}

export function submissionAttemptToLocalEvaluatorResponseV2(
  attempt: LearningV2ActivityReleasedTaskAttemptV2,
): V2LocalEvaluatorResponseV1 {
  return Object.freeze({ kind: attempt.kind, value: attempt.value });
}
