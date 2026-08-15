import type { CanonicalAttemptRef } from "./attempt";
import { projectRequiredTaskStars } from "./course_economy";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../policies/decision_registry";
import {
  validateV2SessionSet,
  type V2SessionSetBodyV2,
} from "./session";

export type RequiredTaskSkipPolicy = "allowed" | "forbidden";

export interface RequiredSessionTaskCatalogEntry {
  readonly taskOrdinal: number;
  readonly taskId: string;
  readonly activityId: string;
  readonly skipPolicy: RequiredTaskSkipPolicy;
}

export interface RequiredSessionCatalogV1 {
  readonly schemaVersion: "learning-v2-required-session-catalog.v1";
  readonly courseId: string;
  readonly studyTarget: string;
  readonly courseReleaseId: string;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly requiredSessionOrdinal: number;
  readonly sessionId: string;
  readonly tasks: readonly RequiredSessionTaskCatalogEntry[];
  readonly catalogFingerprint: string;
}

export type RequiredSessionRunKindClaim = "initial" | "repeat";
export type RequiredTaskSettlementDisposition =
  | "completed"
  | "skipped"
  | "technical_invalid";

/**
 * Untrusted transport coordinate for one of the twelve pinned required cards.
 * The server must re-derive the matching catalog entry from exact session-set
 * bytes before it may reduce progress or authorize any economic result.
 */
export interface RequiredSessionTaskSlotRefV1 {
  readonly schemaVersion: "learning-v2-required-session-task-slot-ref.v1";
  readonly courseId: string;
  readonly courseReleaseId: string;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly requiredSessionOrdinal: number;
  readonly sessionId: string;
  readonly sessionRunId: string;
  readonly runKindClaim: RequiredSessionRunKindClaim;
  readonly taskOrdinal: number;
  readonly taskId: string;
  readonly activityId: string;
}

/**
 * Server-owned publication envelope for one canonical session-set. It binds
 * the session bytes to the exact approved season and episode revision used by
 * progress validation. Client coordinates are never accepted as a substitute
 * for this record.
 */
export interface PublishedRequiredSessionSetV1 {
  readonly schemaVersion: "learning-v2-published-required-session-set.v1";
  readonly courseId: string;
  readonly studyTarget: string;
  readonly courseReleaseId: string;
  readonly seasonRevisionId: string;
  readonly episodeRevisionFingerprint: string;
  readonly episodeContentHash: string;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly sessionSet: V2SessionSetBodyV2;
  readonly publicationFingerprint: string;
}

/**
 * V2 adds the immutable episode coordinate needed to derive the one-based
 * required-session ordinal across the complete 32 x 12 course.  V1 remains
 * readable for already published bytes, but it cannot authorize new economy
 * because its local 1..12 ordinal is ambiguous across episodes.
 */
export interface PublishedRequiredSessionSetV2
  extends Omit<PublishedRequiredSessionSetV1, "schemaVersion"> {
  readonly schemaVersion: "learning-v2-published-required-session-set.v2";
  readonly episodeOrdinal: number;
}

export type PublishedRequiredSessionSet =
  | PublishedRequiredSessionSetV1
  | PublishedRequiredSessionSetV2;

/**
 * This is intentionally an untrusted local candidate. A server settlement may
 * use its evidence, but must independently bind the release, attempt history,
 * initial entitlement and semantic credit subject before minting currency.
 */
export interface RequiredTaskSettlementCandidateBodyV1 {
  readonly schemaVersion: "learning-v2-required-task-settlement-candidate-body.v1";
  readonly candidateAuthority: "untrusted_local";
  readonly operationId: string;
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly courseId: string;
  readonly studyTarget: string;
  readonly courseReleaseId: string;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly requiredSessionOrdinal: number;
  readonly sessionId: string;
  readonly sessionRunId: string;
  readonly runKindClaim: RequiredSessionRunKindClaim;
  readonly taskOrdinal: number;
  readonly taskId: string;
  readonly activityId: string;
  readonly disposition: RequiredTaskSettlementDisposition;
  /** Cumulative learner attempts known to the local run; the server re-derives it. */
  readonly learnerAttempts: number;
  readonly hintUsed: boolean;
  readonly sourceAttemptRef: CanonicalAttemptRef | null;
}

export interface RequiredTaskSettlementCandidateV1
  extends Omit<RequiredTaskSettlementCandidateBodyV1, "schemaVersion"> {
  readonly schemaVersion: "learning-v2-required-task-settlement-candidate.v1";
  readonly projectedStars: 0 | 1 | 2 | 3;
  readonly projectedCountsAsLearnerError: boolean;
  readonly retryRequired: boolean;
  readonly candidateFingerprint: string;
}

const CATALOG_BODY_KEYS = [
  "schemaVersion",
  "courseId",
  "studyTarget",
  "courseReleaseId",
  "sessionSetId",
  "sessionSetHash",
  "requiredSessionOrdinal",
  "sessionId",
  "tasks",
] as const;
const CATALOG_KEYS = [...CATALOG_BODY_KEYS, "catalogFingerprint"] as const;
const TASK_CATALOG_KEYS = [
  "taskOrdinal",
  "taskId",
  "activityId",
  "skipPolicy",
] as const;
const TASK_BODY_KEYS = [
  "schemaVersion",
  "candidateAuthority",
  "operationId",
  "accountScopeHash",
  "accountGeneration",
  "courseId",
  "studyTarget",
  "courseReleaseId",
  "sessionSetId",
  "sessionSetHash",
  "requiredSessionOrdinal",
  "sessionId",
  "sessionRunId",
  "runKindClaim",
  "taskOrdinal",
  "taskId",
  "activityId",
  "disposition",
  "learnerAttempts",
  "hintUsed",
  "sourceAttemptRef",
] as const;
const TASK_CANDIDATE_KEYS = [
  ...TASK_BODY_KEYS.filter((key) => key !== "schemaVersion"),
  "schemaVersion",
  "projectedStars",
  "projectedCountsAsLearnerError",
  "retryRequired",
  "candidateFingerprint",
] as const;
const ATTEMPT_REF_KEYS = ["schemaVersion", "opId", "attemptBodyHash"] as const;
const TASK_SLOT_REF_KEYS = [
  "schemaVersion",
  "courseId",
  "courseReleaseId",
  "sessionSetId",
  "sessionSetHash",
  "requiredSessionOrdinal",
  "sessionId",
  "sessionRunId",
  "runKindClaim",
  "taskOrdinal",
  "taskId",
  "activityId",
] as const;
const PUBLISHED_SESSION_SET_BODY_KEYS = [
  "schemaVersion",
  "courseId",
  "studyTarget",
  "courseReleaseId",
  "seasonRevisionId",
  "episodeRevisionFingerprint",
  "episodeContentHash",
  "sessionSetId",
  "sessionSetHash",
  "sessionSet",
] as const;
const PUBLISHED_SESSION_SET_KEYS = [
  ...PUBLISHED_SESSION_SET_BODY_KEYS,
  "publicationFingerprint",
] as const;
const PUBLISHED_SESSION_SET_V2_BODY_KEYS = [
  ...PUBLISHED_SESSION_SET_BODY_KEYS,
  "episodeOrdinal",
] as const;
const PUBLISHED_SESSION_SET_V2_KEYS = [
  ...PUBLISHED_SESSION_SET_V2_BODY_KEYS,
  "publicationFingerprint",
] as const;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const HASH = /^[a-f0-9]{64}$/;
const RESERVED_RECORD_KEYS = new Set(["__proto__", "prototype", "constructor"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean =>
  Object.keys(value).length === keys.length &&
  Object.keys(value).every((key) => keys.includes(key));
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const assertBoundedJson = (input: unknown, errorCode: string): void => {
  let nodes = 0;
  let stringUnits = 0;
  const ancestors = new Set<object>();
  const visit = (value: unknown, depth: number): void => {
    nodes += 1;
    if (nodes > 512 || depth > 12) throw new Error(errorCode);
    if (typeof value === "string") {
      stringUnits += value.length;
      if (stringUnits > 65_536) throw new Error(errorCode);
      return;
    }
    if (typeof value !== "object" || value === null) return;
    if (ancestors.has(value)) throw new Error(errorCode);
    ancestors.add(value);
    if (Array.isArray(value)) {
      if (value.length > 64) throw new Error(errorCode);
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.some((key) =>
        typeof key !== "string" ||
        (key !== "length" && !/^(?:0|[1-9][0-9]*)$/.test(key))
      )) throw new Error(errorCode);
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new Error(errorCode);
        }
        visit(descriptor.value, depth + 1);
      }
    } else {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) throw new Error(errorCode);
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const keys = Object.keys(descriptors);
      if (keys.length > 64) throw new Error(errorCode);
      for (const key of keys) {
        stringUnits += key.length;
        if (stringUnits > 65_536) throw new Error(errorCode);
        const descriptor = descriptors[key];
        if (!("value" in descriptor) || !descriptor.enumerable) throw new Error(errorCode);
        visit(descriptor.value, depth + 1);
      }
    }
    ancestors.delete(value);
  };
  visit(input, 0);
};
const detachedCanonical = (input: unknown, errorCode: string): unknown => {
  assertBoundedJson(input, errorCode);
  try {
    return JSON.parse(canonicalJsonV1(input)) as unknown;
  } catch {
    throw new Error(errorCode);
  }
};
const validId = (value: unknown): value is string =>
  typeof value === "string" &&
  SAFE_ID.test(value) &&
  !RESERVED_RECORD_KEYS.has(value);
const validOrdinal = (value: unknown, maximum: number): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= maximum;
const isAttemptRef = (value: unknown): value is CanonicalAttemptRef =>
  isRecord(value) &&
  exactKeys(value, ATTEMPT_REF_KEYS) &&
  value.schemaVersion === "v2-attempt-ref.v1" &&
  validId(value.opId) &&
  typeof value.attemptBodyHash === "string" &&
  HASH.test(value.attemptBodyHash);

export const parseRequiredSessionTaskSlotRef = (
  input: unknown,
): RequiredSessionTaskSlotRefV1 => {
  const value = detachedCanonical(input, "required_session_task_slot_ref_invalid");
  if (
    !isRecord(value) ||
    !exactKeys(value, TASK_SLOT_REF_KEYS) ||
    value.schemaVersion !== "learning-v2-required-session-task-slot-ref.v1" ||
    !validId(value.courseId) ||
    !validId(value.courseReleaseId) ||
    !validId(value.sessionSetId) ||
    typeof value.sessionSetHash !== "string" ||
    !HASH.test(value.sessionSetHash) ||
    !validOrdinal(value.requiredSessionOrdinal, 384) ||
    !validId(value.sessionId) ||
    !validId(value.sessionRunId) ||
    (value.runKindClaim !== "initial" && value.runKindClaim !== "repeat") ||
    !validOrdinal(value.taskOrdinal, 12) ||
    !validId(value.taskId) ||
    !validId(value.activityId)
  ) throw new Error("required_session_task_slot_ref_invalid");
  return deepFreeze(value as unknown as RequiredSessionTaskSlotRefV1);
};

export const createPublishedRequiredSessionSet = (
  input: unknown,
): PublishedRequiredSessionSet => {
  if (!isRecord(input) ||
    (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null)) {
    throw new Error("published_required_session_set_invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const ownKeys = Reflect.ownKeys(descriptors);
  const schemaDescriptor = descriptors.schemaVersion;
  if (!schemaDescriptor || !("value" in schemaDescriptor) ||
    !schemaDescriptor.enumerable ||
    (schemaDescriptor.value !== "learning-v2-published-required-session-set.v1" &&
      schemaDescriptor.value !== "learning-v2-published-required-session-set.v2")) {
    throw new Error("published_required_session_set_invalid");
  }
  const isV2 = schemaDescriptor.value === "learning-v2-published-required-session-set.v2";
  const hasFingerprint = Object.prototype.hasOwnProperty.call(descriptors, "publicationFingerprint");
  const expectedKeys = hasFingerprint
    ? (isV2 ? PUBLISHED_SESSION_SET_V2_KEYS : PUBLISHED_SESSION_SET_KEYS)
    : (isV2 ? PUBLISHED_SESSION_SET_V2_BODY_KEYS : PUBLISHED_SESSION_SET_BODY_KEYS);
  if (
    ownKeys.length !== expectedKeys.length ||
    ownKeys.some((key) => typeof key !== "string" || !expectedKeys.includes(key as never)) ||
    expectedKeys.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    })
  ) throw new Error("published_required_session_set_invalid");
  const value = Object.create(null) as Record<string, unknown>;
  for (const key of expectedKeys) value[key] = descriptors[key].value;
  if (
    !(hasFingerprint
      ? exactKeys(value, isV2 ? PUBLISHED_SESSION_SET_V2_KEYS : PUBLISHED_SESSION_SET_KEYS)
      : exactKeys(value, isV2 ? PUBLISHED_SESSION_SET_V2_BODY_KEYS : PUBLISHED_SESSION_SET_BODY_KEYS)) ||
    !validId(value.courseId) ||
    !validId(value.studyTarget) ||
    !validId(value.courseReleaseId) ||
    !validId(value.seasonRevisionId) ||
    typeof value.episodeRevisionFingerprint !== "string" ||
    !HASH.test(value.episodeRevisionFingerprint) ||
    typeof value.episodeContentHash !== "string" ||
    !HASH.test(value.episodeContentHash) ||
    !validId(value.sessionSetId) ||
    typeof value.sessionSetHash !== "string" ||
    !HASH.test(value.sessionSetHash) ||
    (isV2 && !validOrdinal(value.episodeOrdinal, 32))
  ) throw new Error("published_required_session_set_invalid");
  const validation = validateV2SessionSet(value.sessionSet);
  if (
    !validation.ok ||
    validation.value.schemaVersion !== "v2-session-set.v2" ||
    hashCanonicalBody(validation.value) !== value.sessionSetHash
  ) throw new Error("published_required_session_set_invalid");
  const commonBody = {
    courseId: value.courseId,
    studyTarget: value.studyTarget,
    courseReleaseId: value.courseReleaseId,
    seasonRevisionId: value.seasonRevisionId,
    episodeRevisionFingerprint: value.episodeRevisionFingerprint,
    episodeContentHash: value.episodeContentHash,
    sessionSetId: value.sessionSetId,
    sessionSetHash: value.sessionSetHash,
    sessionSet: validation.value as V2SessionSetBodyV2,
  };
  const body = isV2
    ? {
        schemaVersion: "learning-v2-published-required-session-set.v2" as const,
        ...commonBody,
        episodeOrdinal: Number(value.episodeOrdinal),
      }
    : {
        schemaVersion: "learning-v2-published-required-session-set.v1" as const,
        ...commonBody,
      };
  const publicationFingerprint = hashCanonicalBody(body);
  if (hasFingerprint && value.publicationFingerprint !== publicationFingerprint) {
    throw new Error("published_required_session_set_invalid");
  }
  return deepFreeze({ ...body, publicationFingerprint });
};

export const parsePublishedRequiredSessionSet = (
  input: unknown,
): PublishedRequiredSessionSet =>
  createPublishedRequiredSessionSet(input);

const catalogBodyForHash = (catalog: {
  readonly schemaVersion: "learning-v2-required-session-catalog.v1";
  readonly courseId: string;
  readonly studyTarget: string;
  readonly courseReleaseId: string;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly requiredSessionOrdinal: number;
  readonly sessionId: string;
  readonly tasks: readonly RequiredSessionTaskCatalogEntry[];
}) => catalog;

export const createRequiredSessionCatalog = (
  input: unknown,
): RequiredSessionCatalogV1 => {
  const value = detachedCanonical(input, "required_session_catalog_invalid");
  if (!isRecord(value)) throw new Error("required_session_catalog_invalid");
  const hasFingerprint = Object.prototype.hasOwnProperty.call(value, "catalogFingerprint");
  if (
    !(hasFingerprint ? exactKeys(value, CATALOG_KEYS) : exactKeys(value, CATALOG_BODY_KEYS)) ||
    value.schemaVersion !== "learning-v2-required-session-catalog.v1" ||
    !validId(value.courseId) ||
    !validId(value.studyTarget) ||
    !validId(value.courseReleaseId) ||
    !validId(value.sessionSetId) ||
    typeof value.sessionSetHash !== "string" ||
    !HASH.test(value.sessionSetHash) ||
    !validOrdinal(value.requiredSessionOrdinal, 384) ||
    !validId(value.sessionId) ||
    !Array.isArray(value.tasks) ||
    value.tasks.length !== 12
  ) throw new Error("required_session_catalog_invalid");
  const tasks = value.tasks.map((entry) => {
    if (
      !isRecord(entry) ||
      !exactKeys(entry, TASK_CATALOG_KEYS) ||
      !validOrdinal(entry.taskOrdinal, 12) ||
      !validId(entry.taskId) ||
      !validId(entry.activityId) ||
      (entry.skipPolicy !== "allowed" && entry.skipPolicy !== "forbidden")
    ) throw new Error("required_session_catalog_invalid");
    return {
      taskOrdinal: Number(entry.taskOrdinal),
      taskId: entry.taskId,
      activityId: entry.activityId,
      skipPolicy: entry.skipPolicy as RequiredTaskSkipPolicy,
    };
  }).sort((left, right) => left.taskOrdinal - right.taskOrdinal);
  if (
    tasks.some((task, index) => task.taskOrdinal !== index + 1) ||
    new Set(tasks.map((task) => task.taskId)).size !== 12 ||
    new Set(tasks.map((task) => task.activityId)).size !== 12
  ) throw new Error("required_session_catalog_invalid");
  const body = catalogBodyForHash({
    schemaVersion: "learning-v2-required-session-catalog.v1",
    courseId: value.courseId,
    studyTarget: value.studyTarget,
    courseReleaseId: value.courseReleaseId,
    sessionSetId: value.sessionSetId,
    sessionSetHash: value.sessionSetHash,
    requiredSessionOrdinal: Number(value.requiredSessionOrdinal),
    sessionId: value.sessionId,
    tasks,
  });
  const catalogFingerprint = hashCanonicalBody(body);
  if (hasFingerprint && value.catalogFingerprint !== catalogFingerprint) {
    throw new Error("required_session_catalog_invalid");
  }
  return deepFreeze({ ...body, catalogFingerprint });
};

/**
 * Derives the twelve authoritative task coordinates from canonical
 * session-set.v2 bytes. No activity id or task id is accepted separately.
 */
export const createRequiredSessionCatalogFromSessionSetV2 = (
  input: unknown,
): RequiredSessionCatalogV1 => {
  const sourceKeys = [
    "courseId",
    "studyTarget",
    "courseReleaseId",
    "sessionSetId",
    "sessionSetHash",
    "requiredSessionOrdinal",
    "sessionSet",
  ] as const;
  if (!isRecord(input) ||
    (Object.getPrototypeOf(input) !== Object.prototype && Object.getPrototypeOf(input) !== null)) {
    throw new Error("required_session_catalog_source_invalid");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const own = Reflect.ownKeys(descriptors);
  if (own.length !== sourceKeys.length || own.some((key) =>
    typeof key !== "string" || !sourceKeys.includes(key as typeof sourceKeys[number])) ||
    sourceKeys.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    })) {
    throw new Error("required_session_catalog_source_invalid");
  }
  const value = Object.create(null) as Record<string, unknown>;
  for (const key of sourceKeys) value[key] = descriptors[key].value;
  if (
    !isRecord(value) ||
    !exactKeys(value, sourceKeys) ||
    !validId(value.courseId) ||
    !validId(value.studyTarget) ||
    !validId(value.courseReleaseId) ||
    !validId(value.sessionSetId) ||
    typeof value.sessionSetHash !== "string" ||
    !HASH.test(value.sessionSetHash) ||
    !validOrdinal(value.requiredSessionOrdinal, 384)
  ) throw new Error("required_session_catalog_source_invalid");
  const validation = validateV2SessionSet(value.sessionSet);
  if (!validation.ok || validation.value.schemaVersion !== "v2-session-set.v2") {
    throw new Error("required_session_catalog_source_invalid");
  }
  const sessionSet = validation.value as V2SessionSetBodyV2;
  if (hashCanonicalBody(sessionSet) !== value.sessionSetHash) {
    throw new Error("required_session_catalog_source_invalid");
  }
  const session = sessionSet.sessions[Number(value.requiredSessionOrdinal) - 1];
  if (!session || session.ordinal !== value.requiredSessionOrdinal) {
    throw new Error("required_session_catalog_source_invalid");
  }
  return createRequiredSessionCatalog({
    schemaVersion: "learning-v2-required-session-catalog.v1",
    courseId: value.courseId,
    studyTarget: value.studyTarget,
    courseReleaseId: value.courseReleaseId,
    sessionSetId: value.sessionSetId,
    sessionSetHash: value.sessionSetHash,
    requiredSessionOrdinal: value.requiredSessionOrdinal,
    sessionId: session.sessionId,
    tasks: session.cards.map((card, index) => ({
      taskOrdinal: index + 1,
      taskId: card.cardId,
      activityId: card.activityId,
      skipPolicy: "allowed" as const,
    })),
  });
};

const parseCandidateBody = (
  input: unknown,
): RequiredTaskSettlementCandidateBodyV1 => {
  const value = detachedCanonical(input, "required_task_candidate_invalid");
  if (
    !isRecord(value) ||
    !exactKeys(value, TASK_BODY_KEYS) ||
    value.schemaVersion !== "learning-v2-required-task-settlement-candidate-body.v1" ||
    value.candidateAuthority !== "untrusted_local" ||
    !validId(value.operationId) ||
    typeof value.accountScopeHash !== "string" ||
    !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
    !Number.isSafeInteger(value.accountGeneration) ||
    Number(value.accountGeneration) < 0 ||
    !validId(value.courseId) ||
    !validId(value.studyTarget) ||
    !validId(value.courseReleaseId) ||
    !validId(value.sessionSetId) ||
    typeof value.sessionSetHash !== "string" ||
    !HASH.test(value.sessionSetHash) ||
    !validOrdinal(value.requiredSessionOrdinal, 384) ||
    !validId(value.sessionId) ||
    !validId(value.sessionRunId) ||
    (value.runKindClaim !== "initial" && value.runKindClaim !== "repeat") ||
    !validOrdinal(value.taskOrdinal, 12) ||
    !validId(value.taskId) ||
    !validId(value.activityId) ||
    (value.disposition !== "completed" &&
      value.disposition !== "skipped" &&
      value.disposition !== "technical_invalid") ||
    !Number.isSafeInteger(value.learnerAttempts) ||
    Number(value.learnerAttempts) < 0 ||
    typeof value.hintUsed !== "boolean" ||
    (value.sourceAttemptRef !== null && !isAttemptRef(value.sourceAttemptRef)) ||
    (value.disposition === "completed" &&
      (Number(value.learnerAttempts) < 1 || !isAttemptRef(value.sourceAttemptRef))) ||
    (value.disposition === "skipped" &&
      (Number(value.learnerAttempts) > 0 || value.hintUsed) &&
      !isAttemptRef(value.sourceAttemptRef))
  ) throw new Error("required_task_candidate_invalid");
  return value as unknown as RequiredTaskSettlementCandidateBodyV1;
};

export const createRequiredTaskSettlementCandidate = (
  input: unknown,
): RequiredTaskSettlementCandidateV1 => {
  const body = parseCandidateBody(input);
  const projection = projectRequiredTaskStars({
    disposition: body.disposition,
    learnerAttempts: body.learnerAttempts,
    hintUsed: body.hintUsed,
  });
  const { schemaVersion: _bodySchema, ...identity } = body;
  const candidateWithoutFingerprint = {
    schemaVersion: "learning-v2-required-task-settlement-candidate.v1" as const,
    ...identity,
    projectedStars: projection.stars,
    projectedCountsAsLearnerError: projection.countsAsLearnerError,
    retryRequired: projection.retryRequired,
  };
  return deepFreeze({
    ...candidateWithoutFingerprint,
    candidateFingerprint: hashCanonicalBody(candidateWithoutFingerprint),
  });
};

export const parseRequiredTaskSettlementCandidate = (
  input: unknown,
): RequiredTaskSettlementCandidateV1 => {
  const value = detachedCanonical(input, "required_task_candidate_invalid");
  if (
    !isRecord(value) ||
    !exactKeys(value, TASK_CANDIDATE_KEYS) ||
    value.schemaVersion !== "learning-v2-required-task-settlement-candidate.v1" ||
    typeof value.candidateFingerprint !== "string" ||
    !HASH.test(value.candidateFingerprint)
  ) throw new Error("required_task_candidate_invalid");
  const {
    schemaVersion: _candidateSchema,
    projectedStars,
    projectedCountsAsLearnerError,
    retryRequired,
    candidateFingerprint,
    ...identity
  } = value;
  const rebuilt = createRequiredTaskSettlementCandidate({
    schemaVersion: "learning-v2-required-task-settlement-candidate-body.v1",
    ...identity,
  });
  if (
    projectedStars !== rebuilt.projectedStars ||
    projectedCountsAsLearnerError !== rebuilt.projectedCountsAsLearnerError ||
    retryRequired !== rebuilt.retryRequired ||
    candidateFingerprint !== rebuilt.candidateFingerprint
  ) throw new Error("required_task_candidate_invalid");
  return rebuilt;
};
