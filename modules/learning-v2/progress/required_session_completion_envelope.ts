import { V2_ACTIVITY_FAMILIES, type V2ActivityFamily } from "../contracts/activity";
import { detachBoundedWalletJson } from "../contracts/wallet";
import { hashCanonicalBody } from "../policies/decision_registry";
import { progressAccountKey, type ProgressAccountScope } from "./progress_store";
import type { V2CompiledRequiredSession } from "../content/session_compiler";

export interface RequiredSessionTaskCompletionInputV3 {
  readonly taskId: string;
  readonly disposition: "completed" | "skipped";
  readonly learnerAttempts: number;
  readonly hintUsed: boolean;
}

export interface RequiredSessionTaskCompletionV3 {
  readonly schemaVersion: "learning-v2-required-session-task-completion.v3";
  readonly taskOrdinal: number;
  readonly taskId: string;
  readonly activityId: string;
  readonly family: V2ActivityFamily;
  readonly disposition: "completed" | "skipped";
  readonly learnerAttempts: number;
  readonly hintUsed: boolean;
}

export interface RequiredSessionCompletionEnvelopeV3 {
  readonly schemaVersion: "learning-v2-required-session-completion-envelope.v3";
  readonly kind: "required_session_completion";
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly seasonId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly episodeId: string;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly localSessionId: string;
  readonly sessionRunId: string;
  readonly canonicalSessionId: string;
  readonly requiredSessionOrdinal: number;
  readonly sessionFingerprint: string;
  readonly taskCompletions: readonly RequiredSessionTaskCompletionV3[];
  readonly completionFingerprint: string;
}

const INPUT_KEYS = [
  "scope", "episodeId", "sessionSetId", "sessionSetHash", "localSessionId",
  "sessionRunId", "session", "taskResults",
] as const;
const SCOPE_KEYS = [
  "stableId", "accountScopeHash", "seasonId", "studyTarget",
  "learnerSourceLocale", "generation",
] as const;
const RESULT_INPUT_KEYS = [
  "taskId", "disposition", "learnerAttempts", "hintUsed",
] as const;
const TASK_KEYS = [
  "schemaVersion", "taskOrdinal", "taskId", "activityId", "family",
  "disposition", "learnerAttempts", "hintUsed",
] as const;
const BODY_KEYS = [
  "schemaVersion", "kind", "accountScopeHash", "accountGeneration", "seasonId",
  "studyTarget", "learnerSourceLocale", "episodeId", "sessionSetId",
  "sessionSetHash", "localSessionId", "sessionRunId",
  "canonicalSessionId", "requiredSessionOrdinal", "sessionFingerprint",
  "taskCompletions",
] as const;
const ENVELOPE_KEYS = [...BODY_KEYS, "completionFingerprint"] as const;
const SESSION_KEYS = ["sessionId", "ordinal", "zone", "support", "targetSeconds", "cards"] as const;
const CARD_KEYS = [
  "cardId", "contentItemId", "activityId", "objectiveId", "family",
  "learningFunction", "support", "promptId", "promptNovelty",
] as const;
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const HASH = /^[a-f0-9]{64}$/;
const FAMILY = new Set<string>(V2_ACTIVITY_FAMILIES);
const ZONE = new Set(["understand", "use", "master"]);
const SUPPORT = new Set(["model", "full_text", "partial_cue", "visual_only", "none"]);
const LEARNING_FUNCTION = new Set([
  "notice", "comprehend", "retrieve", "discriminate", "assemble",
  "pronounce", "respond", "transfer", "review",
]);
const NOVELTY = new Set(["trained", "varied", "novel"]);

const fail = (): never => { throw new Error("required_session_completion_invalid"); };
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const ownKeys = Reflect.ownKeys(value);
  return ownKeys.length === keys.length && ownKeys.every((key) =>
    typeof key === "string" && keys.includes(key));
};
const detach = (input: unknown): Record<string, unknown> => {
  try {
    const value = detachBoundedWalletJson(input, "required_session_completion_invalid");
    if (!isRecord(value) || Object.getPrototypeOf(value) !== Object.prototype) return fail();
    return value;
  } catch { return fail(); }
};
const validId = (value: unknown): value is string => typeof value === "string" && ID.test(value);
const validSafe = (value: unknown, min: number, max: number): value is number =>
  Number.isSafeInteger(value) && Number(value) >= min && Number(value) <= max;
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};

const parseTaskCompletion = (input: unknown): RequiredSessionTaskCompletionV3 => {
  const value = detach(input);
  if (!exactKeys(value, TASK_KEYS) ||
    value.schemaVersion !== "learning-v2-required-session-task-completion.v3" ||
    !validSafe(value.taskOrdinal, 1, 12) || !validId(value.taskId) ||
    !validId(value.activityId) || typeof value.family !== "string" ||
    !FAMILY.has(value.family) ||
    (value.disposition !== "completed" && value.disposition !== "skipped") ||
    !validSafe(value.learnerAttempts, value.disposition === "completed" ? 1 : 0, 99) ||
    typeof value.hintUsed !== "boolean") {
    return fail();
  }
  return deepFreeze({
    schemaVersion: "learning-v2-required-session-task-completion.v3",
    taskOrdinal: Number(value.taskOrdinal),
    taskId: value.taskId,
    activityId: value.activityId,
    family: value.family as V2ActivityFamily,
    disposition: value.disposition,
    learnerAttempts: Number(value.learnerAttempts),
    hintUsed: value.hintUsed,
  });
};

const canonicalSession = (input: unknown): {
  readonly sessionId: string;
  readonly ordinal: number;
  readonly zone: "understand" | "use" | "master";
  readonly targetSeconds: number;
  readonly cards: readonly Record<string, unknown>[];
} => {
  const session = detach(input);
  if (!exactKeys(session, SESSION_KEYS) || !validId(session.sessionId) ||
    !validSafe(session.ordinal, 1, 384) || typeof session.zone !== "string" ||
    !ZONE.has(session.zone) || typeof session.support !== "string" ||
    !SUPPORT.has(session.support) || !validSafe(session.targetSeconds, 1, 3600) ||
    !Array.isArray(session.cards) || session.cards.length !== 12) return fail();
  const cards = session.cards.map((candidate) => {
    const card = detach(candidate);
    if (!exactKeys(card, CARD_KEYS) || !validId(card.cardId) ||
      !validId(card.contentItemId) || !validId(card.activityId) ||
      !validId(card.objectiveId) || typeof card.family !== "string" ||
      !FAMILY.has(card.family) || typeof card.learningFunction !== "string" ||
      !LEARNING_FUNCTION.has(card.learningFunction) || typeof card.support !== "string" ||
      !SUPPORT.has(card.support) || !validId(card.promptId) ||
      typeof card.promptNovelty !== "string" || !NOVELTY.has(card.promptNovelty)) return fail();
    return Object.freeze({
      cardId: card.cardId,
      contentItemId: card.contentItemId,
      activityId: card.activityId,
      objectiveId: card.objectiveId,
      family: card.family,
      learningFunction: card.learningFunction,
      support: card.support,
      promptId: card.promptId,
      promptNovelty: card.promptNovelty,
    });
  });
  if (new Set(cards.map((card) => card.cardId)).size !== 12) return fail();
  return deepFreeze({
    sessionId: session.sessionId,
    ordinal: Number(session.ordinal),
    zone: session.zone as "understand" | "use" | "master",
    targetSeconds: Number(session.targetSeconds),
    cards,
  });
};

export const materializeRequiredSessionCompletionEnvelope = (input: {
  readonly scope: ProgressAccountScope;
  readonly episodeId: string;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly localSessionId: string;
  readonly sessionRunId: string;
  readonly session: V2CompiledRequiredSession;
  readonly taskResults: readonly RequiredSessionTaskCompletionInputV3[];
}): RequiredSessionCompletionEnvelopeV3 => {
  const request = detach(input);
  if (!exactKeys(request, INPUT_KEYS) || !validId(request.episodeId) ||
    !validId(request.sessionSetId) || typeof request.sessionSetHash !== "string" ||
    !HASH.test(request.sessionSetHash) || !validId(request.localSessionId) ||
    !validId(request.sessionRunId) ||
    !Array.isArray(request.taskResults) ||
    request.taskResults.length !== 12) return fail();
  const scope = detach(request.scope);
  if (!exactKeys(scope, SCOPE_KEYS) ||
    !((typeof scope.stableId === "string" && validId(scope.stableId)) || scope.stableId === null)) {
    return fail();
  }
  try { progressAccountKey(scope as unknown as ProgressAccountScope); } catch { return fail(); }
  const session = canonicalSession(request.session);
  const resultByTask = new Map<string, RequiredSessionTaskCompletionInputV3>();
  for (const candidate of request.taskResults) {
    const result = detach(candidate);
    if (!exactKeys(result, RESULT_INPUT_KEYS) || !validId(result.taskId) ||
      (result.disposition !== "completed" && result.disposition !== "skipped") ||
      !validSafe(result.learnerAttempts, result.disposition === "completed" ? 1 : 0, 99) ||
      typeof result.hintUsed !== "boolean" ||
      resultByTask.has(result.taskId)) return fail();
    resultByTask.set(result.taskId, {
      taskId: result.taskId,
      disposition: result.disposition,
      learnerAttempts: Number(result.learnerAttempts),
      hintUsed: result.hintUsed,
    });
  }
  const taskCompletions = session.cards.map((card, index) => {
    const result = resultByTask.get(card.cardId as string);
    if (!result) return fail();
    return parseTaskCompletion({
      schemaVersion: "learning-v2-required-session-task-completion.v3",
      taskOrdinal: index + 1,
      taskId: card.cardId,
      activityId: card.activityId,
      family: card.family,
      disposition: result.disposition,
      learnerAttempts: result.learnerAttempts,
      hintUsed: result.hintUsed,
    });
  });
  const body = {
    schemaVersion: "learning-v2-required-session-completion-envelope.v3" as const,
    kind: "required_session_completion" as const,
    accountScopeHash: scope.accountScopeHash as string,
    accountGeneration: scope.generation as number,
    seasonId: scope.seasonId as string,
    studyTarget: scope.studyTarget as string,
    learnerSourceLocale: scope.learnerSourceLocale as string,
    episodeId: request.episodeId,
    sessionSetId: request.sessionSetId,
    sessionSetHash: request.sessionSetHash,
    localSessionId: request.localSessionId,
    sessionRunId: request.sessionRunId,
    canonicalSessionId: session.sessionId,
    requiredSessionOrdinal: session.ordinal,
    sessionFingerprint: hashCanonicalBody(session),
    taskCompletions: Object.freeze(taskCompletions),
  };
  return deepFreeze({ ...body, completionFingerprint: hashCanonicalBody(body) });
};

export const parseRequiredSessionCompletionEnvelope = (
  input: unknown,
): RequiredSessionCompletionEnvelopeV3 => {
  const value = detach(input);
  if (!exactKeys(value, ENVELOPE_KEYS) ||
    value.schemaVersion !== "learning-v2-required-session-completion-envelope.v3" ||
    value.kind !== "required_session_completion" ||
    typeof value.accountScopeHash !== "string" || !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
    !validSafe(value.accountGeneration, 0, Number.MAX_SAFE_INTEGER) ||
    ![value.seasonId, value.studyTarget, value.learnerSourceLocale, value.episodeId,
      value.sessionSetId, value.localSessionId, value.sessionRunId,
      value.canonicalSessionId].every(validId) ||
    typeof value.sessionSetHash !== "string" || !HASH.test(value.sessionSetHash) ||
    !validSafe(value.requiredSessionOrdinal, 1, 384) ||
    typeof value.sessionFingerprint !== "string" || !HASH.test(value.sessionFingerprint) ||
    !Array.isArray(value.taskCompletions) || value.taskCompletions.length !== 12 ||
    typeof value.completionFingerprint !== "string" || !HASH.test(value.completionFingerprint)) return fail();
  const taskCompletions = value.taskCompletions.map(parseTaskCompletion);
  if (taskCompletions.some((task, index) => task.taskOrdinal !== index + 1) ||
    new Set(taskCompletions.map((task) => task.taskId)).size !== 12) return fail();
  const body = {
    schemaVersion: "learning-v2-required-session-completion-envelope.v3" as const,
    kind: "required_session_completion" as const,
    accountScopeHash: value.accountScopeHash,
    accountGeneration: Number(value.accountGeneration),
    seasonId: value.seasonId as string,
    studyTarget: value.studyTarget as string,
    learnerSourceLocale: value.learnerSourceLocale as string,
    episodeId: value.episodeId as string,
    sessionSetId: value.sessionSetId as string,
    sessionSetHash: value.sessionSetHash,
    localSessionId: value.localSessionId as string,
    sessionRunId: value.sessionRunId as string,
    canonicalSessionId: value.canonicalSessionId as string,
    requiredSessionOrdinal: Number(value.requiredSessionOrdinal),
    sessionFingerprint: value.sessionFingerprint,
    taskCompletions: Object.freeze(taskCompletions),
  };
  if (hashCanonicalBody(body) !== value.completionFingerprint) return fail();
  return deepFreeze({ ...body, completionFingerprint: value.completionFingerprint });
};

/**
 * Rebinds an untrusted local/offline completion to the exact server-owned
 * account binding without changing its session run or task claims. This is a
 * transport transformation only and grants no economic or evidence authority.
 */
export const rebindRequiredSessionCompletionEnvelope = (
  input: unknown,
  binding: { readonly accountScopeHash: string; readonly accountGeneration: number },
): RequiredSessionCompletionEnvelopeV3 => {
  const envelope = parseRequiredSessionCompletionEnvelope(input);
  const value = detach(binding);
  if (!exactKeys(value, ["accountScopeHash", "accountGeneration"]) ||
    typeof value.accountScopeHash !== "string" ||
    !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
    !validSafe(value.accountGeneration, 1, Number.MAX_SAFE_INTEGER)) return fail();
  const body = {
    schemaVersion: envelope.schemaVersion,
    kind: envelope.kind,
    accountScopeHash: value.accountScopeHash,
    accountGeneration: Number(value.accountGeneration),
    seasonId: envelope.seasonId,
    studyTarget: envelope.studyTarget,
    learnerSourceLocale: envelope.learnerSourceLocale,
    episodeId: envelope.episodeId,
    sessionSetId: envelope.sessionSetId,
    sessionSetHash: envelope.sessionSetHash,
    localSessionId: envelope.localSessionId,
    sessionRunId: envelope.sessionRunId,
    canonicalSessionId: envelope.canonicalSessionId,
    requiredSessionOrdinal: envelope.requiredSessionOrdinal,
    sessionFingerprint: envelope.sessionFingerprint,
    taskCompletions: envelope.taskCompletions,
  };
  return deepFreeze({ ...body, completionFingerprint: hashCanonicalBody(body) });
};

export const requiredSessionCompletionMutationId = (
  input: unknown,
): string => {
  const envelope = parseRequiredSessionCompletionEnvelope(input);
  return `required-session-complete:${hashCanonicalBody({
    schemaVersion: "learning-v2-required-session-completion-mutation-key.v3",
    accountScopeHash: envelope.accountScopeHash,
    accountGeneration: envelope.accountGeneration,
    episodeId: envelope.episodeId,
    sessionSetId: envelope.sessionSetId,
    canonicalSessionId: envelope.canonicalSessionId,
    sessionRunId: envelope.sessionRunId,
  })}`;
};
