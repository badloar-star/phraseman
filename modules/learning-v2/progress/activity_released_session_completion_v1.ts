import type { ProgressAccountScope } from "./progress_store";
import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  getLearningV2ActivityReleasedSessionRuntimeSummaryV1,
  getLearningV2ActivityReleasedSessionTaskV1,
  isLearningV2ActivityReleasedSessionRuntimeHandleV1,
  type LearningV2ActivityReleasedSessionRuntimeHandleV1,
} from "../runtime/activity_released_session_package_v1";

export const LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_SCHEMA_V1 =
  "learning-v2-activity-released-session-completion.v1" as const;
export const LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_MAX_BYTES_V1 =
  96 * 1024;

export type LearningV2ActivityReleasedTaskCompletionInputV1 = Readonly<{
  taskId: string;
  disposition: "completed" | "skipped";
  learnerAttempts: number;
  hintUsed: boolean;
}>;

export type LearningV2ActivityReleasedTaskCompletionV1 = Readonly<{
  slot: number;
  taskId: string;
  activityId: string;
  family: string;
  purpose: string;
  disposition: "completed" | "skipped";
  learnerAttempts: number;
  hintUsed: boolean;
  localResultClaim:
    | "locally_provisional_correct_before_completion"
    | "skipped_without_evidence";
}>;

export interface LearningV2ActivityReleasedSessionCompletionV1 {
  readonly schemaVersion: typeof LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_SCHEMA_V1;
  readonly kind: "activity_released_session_completion";
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly seasonId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly releaseId: string;
  readonly activeManifestHash: string;
  readonly episodeId: string;
  readonly stageId: string;
  readonly activityPackageFingerprint: string;
  readonly packageFingerprint: string;
  readonly localSessionId: string;
  readonly sessionRunId: string;
  readonly sessionId: string;
  readonly sessionOrdinal: number;
  readonly taskCompletions: readonly LearningV2ActivityReleasedTaskCompletionV1[];
  readonly answerPayload: "absent";
  readonly localFeedbackAuthority: "local_provisional_only";
  readonly transportAuthority: "none_local_spool_candidate";
  readonly walletAuthority: "none";
  readonly masteryAuthority: "none";
  readonly evidenceAuthority: "none";
  readonly completionAuthority: "none_server_revalidation_required";
  readonly releaseAuthority: false;
  readonly completionFingerprint: string;
}

const HASH_RE = /^[a-f0-9]{64}$/u;
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u;
const ROOT_KEYS = Object.freeze([
  "schemaVersion",
  "kind",
  "accountScopeHash",
  "accountGeneration",
  "seasonId",
  "studyTarget",
  "learnerSourceLocale",
  "releaseId",
  "activeManifestHash",
  "episodeId",
  "stageId",
  "activityPackageFingerprint",
  "packageFingerprint",
  "localSessionId",
  "sessionRunId",
  "sessionId",
  "sessionOrdinal",
  "taskCompletions",
  "answerPayload",
  "localFeedbackAuthority",
  "transportAuthority",
  "walletAuthority",
  "masteryAuthority",
  "evidenceAuthority",
  "completionAuthority",
  "releaseAuthority",
  "completionFingerprint",
] as const);
const TASK_KEYS = Object.freeze([
  "slot",
  "taskId",
  "activityId",
  "family",
  "purpose",
  "disposition",
  "learnerAttempts",
  "hintUsed",
  "localResultClaim",
] as const);

function fail(): never {
  throw new Error("learning_v2_activity_released_session_completion_invalid");
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
  const own = Reflect.ownKeys(value);
  if (
    own.length !== expected.length ||
    own.some((key) => typeof key !== "string" || !expected.includes(key))
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

function freeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  Object.values(value as Record<string, unknown>).forEach(freeze);
  return value;
}

function parseTask(
  value: unknown,
  expectedSlot: number,
): LearningV2ActivityReleasedTaskCompletionV1 {
  if (!record(value)) fail();
  exactKeys(value, TASK_KEYS);
  const disposition = value.disposition;
  if (disposition !== "completed" && disposition !== "skipped") fail();
  const learnerAttempts = safeInt(
    value.learnerAttempts,
    disposition === "completed" ? 1 : 0,
    99,
  );
  const localResultClaim =
    disposition === "completed"
      ? "locally_provisional_correct_before_completion"
      : "skipped_without_evidence";
  if (
    value.slot !== expectedSlot ||
    typeof value.hintUsed !== "boolean" ||
    value.localResultClaim !== localResultClaim
  )
    fail();
  return freeze({
    slot: expectedSlot,
    taskId: id(value.taskId),
    activityId: id(value.activityId),
    family: id(value.family),
    purpose: id(value.purpose),
    disposition,
    learnerAttempts,
    hintUsed: value.hintUsed,
    localResultClaim,
  });
}

function encodeBounded(value: LearningV2ActivityReleasedSessionCompletionV1) {
  const raw = canonicalJsonV1(value);
  if (
    raw.length >
      LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_MAX_BYTES_V1 ||
    utf8ByteLengthV1(raw) >
      LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_MAX_BYTES_V1
  )
    fail();
  return raw;
}

export function materializeLearningV2ActivityReleasedSessionCompletionV1(input: {
  readonly scope: ProgressAccountScope;
  readonly runtime: LearningV2ActivityReleasedSessionRuntimeHandleV1;
  readonly localSessionId: string;
  readonly sessionRunId: string;
  readonly taskResults: readonly LearningV2ActivityReleasedTaskCompletionInputV1[];
}): LearningV2ActivityReleasedSessionCompletionV1 {
  if (
    !record(input) ||
    Object.keys(input).sort().join("|") !==
      "localSessionId|runtime|scope|sessionRunId|taskResults" ||
    !isLearningV2ActivityReleasedSessionRuntimeHandleV1(input.runtime) ||
    !record(input.scope) ||
    !Array.isArray(input.taskResults) ||
    input.taskResults.length !== 12
  )
    fail();
  const summary = getLearningV2ActivityReleasedSessionRuntimeSummaryV1(
    input.runtime,
  );
  if (
    input.scope.seasonId !== summary.seasonId ||
    input.scope.studyTarget !== summary.studyTarget ||
    input.scope.learnerSourceLocale !== summary.learnerSourceLocale
  )
    fail();
  const resultByTask = new Map<
    string,
    LearningV2ActivityReleasedTaskCompletionInputV1
  >();
  input.taskResults.forEach((candidate) => {
    const row = candidate as LearningV2ActivityReleasedTaskCompletionInputV1;
    if (
      !record(candidate) ||
      Object.keys(candidate).sort().join("|") !==
        "disposition|hintUsed|learnerAttempts|taskId" ||
      !ID_RE.test(row.taskId) ||
      resultByTask.has(row.taskId) ||
      (row.disposition !== "completed" && row.disposition !== "skipped") ||
      !Number.isSafeInteger(row.learnerAttempts) ||
      row.learnerAttempts < (row.disposition === "completed" ? 1 : 0) ||
      row.learnerAttempts > 99 ||
      typeof row.hintUsed !== "boolean"
    )
      fail();
    resultByTask.set(row.taskId, row);
  });
  const taskCompletions = Object.freeze(
    Array.from({ length: 12 }, (_, index) => {
      const slot = index + 1;
      const task = getLearningV2ActivityReleasedSessionTaskV1(
        input.runtime,
        slot,
      );
      const result = resultByTask.get(task.taskId);
      if (!result) fail();
      return freeze({
        slot,
        taskId: task.taskId,
        activityId: task.activityId,
        family: task.family,
        purpose: task.purpose,
        disposition: result.disposition,
        learnerAttempts: result.learnerAttempts,
        hintUsed: result.hintUsed,
        localResultClaim:
          result.disposition === "completed"
            ? ("locally_provisional_correct_before_completion" as const)
            : ("skipped_without_evidence" as const),
      });
    }),
  );
  const body = freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_SCHEMA_V1,
    kind: "activity_released_session_completion" as const,
    accountScopeHash: hash(input.scope.accountScopeHash),
    accountGeneration: safeInt(
      input.scope.generation,
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    seasonId: id(summary.seasonId),
    studyTarget: id(summary.studyTarget),
    learnerSourceLocale: id(summary.learnerSourceLocale),
    releaseId: id(summary.releaseId),
    activeManifestHash: hash(summary.activeManifestHash),
    episodeId: id(summary.episodeId),
    stageId: id(summary.stageId),
    activityPackageFingerprint: hash(summary.activityPackageFingerprint),
    packageFingerprint: hash(summary.packageFingerprint),
    localSessionId: id(input.localSessionId),
    sessionRunId: id(input.sessionRunId),
    sessionId: id(summary.sessionId),
    sessionOrdinal: safeInt(summary.sessionOrdinal, 1, 12),
    taskCompletions,
    answerPayload: "absent" as const,
    localFeedbackAuthority: "local_provisional_only" as const,
    transportAuthority: "none_local_spool_candidate" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none_server_revalidation_required" as const,
    releaseAuthority: false as const,
  });
  const completion = freeze({
    ...body,
    completionFingerprint: hashCanonicalBody(body),
  });
  encodeBounded(completion);
  return completion;
}

export function parseLearningV2ActivityReleasedSessionCompletionV1(
  input: unknown,
): LearningV2ActivityReleasedSessionCompletionV1 {
  if (!record(input)) fail();
  exactKeys(input, ROOT_KEYS);
  if (
    input.schemaVersion !==
      LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_SCHEMA_V1 ||
    input.kind !== "activity_released_session_completion" ||
    !Array.isArray(input.taskCompletions) ||
    input.taskCompletions.length !== 12 ||
    input.answerPayload !== "absent" ||
    input.localFeedbackAuthority !== "local_provisional_only" ||
    input.transportAuthority !== "none_local_spool_candidate" ||
    input.walletAuthority !== "none" ||
    input.masteryAuthority !== "none" ||
    input.evidenceAuthority !== "none" ||
    input.completionAuthority !== "none_server_revalidation_required" ||
    input.releaseAuthority !== false
  )
    fail();
  const taskCompletions = Object.freeze(
    input.taskCompletions.map((candidate, index) =>
      parseTask(candidate, index + 1),
    ),
  );
  if (
    new Set(taskCompletions.map((task) => task.taskId)).size !== 12 ||
    new Set(taskCompletions.map((task) => task.activityId)).size !== 12
  )
    fail();
  const body = freeze({
    schemaVersion: LEARNING_V2_ACTIVITY_RELEASED_SESSION_COMPLETION_SCHEMA_V1,
    kind: "activity_released_session_completion" as const,
    accountScopeHash: hash(input.accountScopeHash),
    accountGeneration: safeInt(
      input.accountGeneration,
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    seasonId: id(input.seasonId),
    studyTarget: id(input.studyTarget),
    learnerSourceLocale: id(input.learnerSourceLocale),
    releaseId: id(input.releaseId),
    activeManifestHash: hash(input.activeManifestHash),
    episodeId: id(input.episodeId),
    stageId: id(input.stageId),
    activityPackageFingerprint: hash(input.activityPackageFingerprint),
    packageFingerprint: hash(input.packageFingerprint),
    localSessionId: id(input.localSessionId),
    sessionRunId: id(input.sessionRunId),
    sessionId: id(input.sessionId),
    sessionOrdinal: safeInt(input.sessionOrdinal, 1, 12),
    taskCompletions,
    answerPayload: "absent" as const,
    localFeedbackAuthority: "local_provisional_only" as const,
    transportAuthority: "none_local_spool_candidate" as const,
    walletAuthority: "none" as const,
    masteryAuthority: "none" as const,
    evidenceAuthority: "none" as const,
    completionAuthority: "none_server_revalidation_required" as const,
    releaseAuthority: false as const,
  });
  const completionFingerprint = hash(input.completionFingerprint);
  if (hashCanonicalBody(body) !== completionFingerprint) fail();
  const completion = freeze({ ...body, completionFingerprint });
  if (canonicalJsonV1(completion) !== encodeBounded(completion)) fail();
  return completion;
}

/**
 * Rebinds an offline/local completion to the server-owned stable account and
 * generation. This changes only transport identity and grants no progress,
 * performance, wallet, mastery, evidence or release authority.
 */
export function rebindLearningV2ActivityReleasedSessionCompletionV1(
  input: unknown,
  binding: Readonly<{
    accountScopeHash: string;
    accountGeneration: number;
  }>,
): LearningV2ActivityReleasedSessionCompletionV1 {
  const completion = parseLearningV2ActivityReleasedSessionCompletionV1(input);
  if (!record(binding)) fail();
  exactKeys(binding, ["accountScopeHash", "accountGeneration"]);
  const body = freeze({
    schemaVersion: completion.schemaVersion,
    kind: completion.kind,
    accountScopeHash: hash(binding.accountScopeHash),
    accountGeneration: safeInt(
      binding.accountGeneration,
      1,
      Number.MAX_SAFE_INTEGER,
    ),
    seasonId: completion.seasonId,
    studyTarget: completion.studyTarget,
    learnerSourceLocale: completion.learnerSourceLocale,
    releaseId: completion.releaseId,
    activeManifestHash: completion.activeManifestHash,
    episodeId: completion.episodeId,
    stageId: completion.stageId,
    activityPackageFingerprint: completion.activityPackageFingerprint,
    packageFingerprint: completion.packageFingerprint,
    localSessionId: completion.localSessionId,
    sessionRunId: completion.sessionRunId,
    sessionId: completion.sessionId,
    sessionOrdinal: completion.sessionOrdinal,
    taskCompletions: completion.taskCompletions,
    answerPayload: completion.answerPayload,
    localFeedbackAuthority: completion.localFeedbackAuthority,
    transportAuthority: completion.transportAuthority,
    walletAuthority: completion.walletAuthority,
    masteryAuthority: completion.masteryAuthority,
    evidenceAuthority: completion.evidenceAuthority,
    completionAuthority: completion.completionAuthority,
    releaseAuthority: completion.releaseAuthority,
  });
  const rebound = freeze({
    ...body,
    completionFingerprint: hashCanonicalBody(body),
  });
  encodeBounded(rebound);
  return rebound;
}

export function encodeLearningV2ActivityReleasedSessionCompletionV1(
  input: unknown,
): string {
  return encodeBounded(
    parseLearningV2ActivityReleasedSessionCompletionV1(input),
  );
}
