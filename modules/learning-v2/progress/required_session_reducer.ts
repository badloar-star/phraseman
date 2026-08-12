import { sumRequiredSessionStars } from "../contracts/course_economy";
import {
  createRequiredSessionCatalog,
  parseRequiredTaskSettlementCandidate,
  type RequiredSessionCatalogV1,
  type RequiredSessionRunKindClaim,
  type RequiredTaskSettlementCandidateV1,
} from "../contracts/required_session_progress";
import {
  canonicalJsonV1,
  hashCanonicalBody,
} from "../policies/decision_registry";

export interface RequiredSessionTaskSlotsSettledCandidateV1 {
  readonly schemaVersion: "learning-v2-required-session-task-slots-settled-candidate.v1";
  readonly candidateAuthority: "untrusted_local";
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly courseId: string;
  readonly studyTarget: string;
  readonly courseReleaseId: string;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly catalogFingerprint: string;
  readonly requiredSessionOrdinal: number;
  readonly sessionId: string;
  readonly sessionRunId: string;
  readonly runKindClaim: RequiredSessionRunKindClaim;
  readonly taskCandidateFingerprints: readonly string[];
  readonly projectedBasePerformanceStars: number;
  readonly projectedLearnerErrorCount: number;
  readonly projectedHintCount: number;
  readonly skipCount: number;
  /** Stable across run IDs; the authoritative ledger must allow it only once. */
  readonly initialCreditSubjectFingerprint: string;
  readonly candidateFingerprint: string;
}

export interface RequiredSessionProgressStateV1 {
  readonly schemaVersion: "learning-v2-required-session-progress.v1";
  readonly revision: number;
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly courseId: string;
  readonly studyTarget: string;
  readonly courseReleaseId: string;
  readonly sessionSetId: string;
  readonly sessionSetHash: string;
  readonly catalogFingerprint: string;
  readonly requiredSessionOrdinal: number;
  readonly sessionId: string;
  readonly sessionRunId: string;
  readonly runKindClaim: RequiredSessionRunKindClaim;
  readonly terminalTasks: Readonly<Record<string, RequiredTaskSettlementCandidateV1>>;
}

export interface RequiredSessionRunScope {
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly sessionRunId: string;
  readonly runKindClaim: RequiredSessionRunKindClaim;
}

export interface RequiredTaskReduction {
  readonly state: RequiredSessionProgressStateV1;
  readonly changed: boolean;
  readonly retryRequired: boolean;
  readonly expectedRevision: number;
  readonly nextRevision: number;
  readonly taskSlotsSettledCandidate?: RequiredSessionTaskSlotsSettledCandidateV1;
  readonly operationLedgerEntry?: {
    readonly operationId: string;
    readonly candidateFingerprint: string;
  };
}

const STATE_KEYS = [
  "schemaVersion",
  "revision",
  "accountScopeHash",
  "accountGeneration",
  "courseId",
  "studyTarget",
  "courseReleaseId",
  "sessionSetId",
  "sessionSetHash",
  "catalogFingerprint",
  "requiredSessionOrdinal",
  "sessionId",
  "sessionRunId",
  "runKindClaim",
  "terminalTasks",
] as const;
const SETTLED_CANDIDATE_KEYS = [
  "schemaVersion",
  "candidateAuthority",
  "accountScopeHash",
  "accountGeneration",
  "courseId",
  "studyTarget",
  "courseReleaseId",
  "sessionSetId",
  "sessionSetHash",
  "catalogFingerprint",
  "requiredSessionOrdinal",
  "sessionId",
  "sessionRunId",
  "runKindClaim",
  "taskCandidateFingerprints",
  "projectedBasePerformanceStars",
  "projectedLearnerErrorCount",
  "projectedHintCount",
  "skipCount",
  "initialCreditSubjectFingerprint",
  "candidateFingerprint",
] as const;
const HASH = /^[a-f0-9]{64}$/;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length &&
  Object.keys(value).every((key) => keys.includes(key));
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const assertBoundedJson = (input: unknown, code: string): void => {
  let nodes = 0;
  let stringUnits = 0;
  const ancestors = new Set<object>();
  const visit = (value: unknown, depth: number): void => {
    nodes += 1;
    if (nodes > 512 || depth > 12) throw new Error(code);
    if (typeof value === "string") {
      stringUnits += value.length;
      if (stringUnits > 65_536) throw new Error(code);
      return;
    }
    if (typeof value !== "object" || value === null) return;
    if (ancestors.has(value)) throw new Error(code);
    ancestors.add(value);
    if (Array.isArray(value)) {
      if (value.length > 64) throw new Error(code);
      const ownKeys = Reflect.ownKeys(value);
      if (ownKeys.some((key) =>
        typeof key !== "string" ||
        (key !== "length" && !/^(?:0|[1-9][0-9]*)$/.test(key))
      )) throw new Error(code);
      for (let index = 0; index < value.length; index += 1) {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
          throw new Error(code);
        }
        visit(descriptor.value, depth + 1);
      }
    } else {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) throw new Error(code);
      const descriptors = Object.getOwnPropertyDescriptors(value);
      const keys = Object.keys(descriptors);
      if (keys.length > 64) throw new Error(code);
      for (const key of keys) {
        stringUnits += key.length;
        if (stringUnits > 65_536) throw new Error(code);
        const descriptor = descriptors[key];
        if (!("value" in descriptor) || !descriptor.enumerable) throw new Error(code);
        visit(descriptor.value, depth + 1);
      }
    }
    ancestors.delete(value);
  };
  visit(input, 0);
};
const detached = (input: unknown, code: string): unknown => {
  assertBoundedJson(input, code);
  try {
    return JSON.parse(canonicalJsonV1(input)) as unknown;
  } catch {
    throw new Error(code);
  }
};

const assertCandidateBinding = (
  state: RequiredSessionProgressStateV1,
  candidate: RequiredTaskSettlementCandidateV1,
  catalog: RequiredSessionCatalogV1,
): void => {
  if (
    candidate.accountScopeHash !== state.accountScopeHash ||
    candidate.accountGeneration !== state.accountGeneration
  ) throw new Error("required_task_scope_mismatch");
  if (
    candidate.sessionRunId !== state.sessionRunId ||
    candidate.runKindClaim !== state.runKindClaim
  ) throw new Error("required_task_run_mismatch");
  const scopeValues: readonly (readonly [string | number, string | number, string | number])[] = [
    [state.courseId, catalog.courseId, candidate.courseId],
    [state.studyTarget, catalog.studyTarget, candidate.studyTarget],
    [state.courseReleaseId, catalog.courseReleaseId, candidate.courseReleaseId],
    [state.sessionSetId, catalog.sessionSetId, candidate.sessionSetId],
    [state.sessionSetHash, catalog.sessionSetHash, candidate.sessionSetHash],
    [state.catalogFingerprint, catalog.catalogFingerprint, catalog.catalogFingerprint],
    [state.requiredSessionOrdinal, catalog.requiredSessionOrdinal, candidate.requiredSessionOrdinal],
    [state.sessionId, catalog.sessionId, candidate.sessionId],
  ];
  if (scopeValues.some(([left, middle, right]) => left !== middle || middle !== right)) {
    throw new Error("required_task_catalog_mismatch");
  }
  const slot = catalog.tasks[candidate.taskOrdinal - 1];
  if (
    !slot ||
    slot.taskOrdinal !== candidate.taskOrdinal ||
    slot.taskId !== candidate.taskId ||
    slot.activityId !== candidate.activityId
  ) throw new Error("required_task_catalog_mismatch");
  if (candidate.disposition === "skipped" && slot.skipPolicy === "forbidden") {
    throw new Error("required_task_skip_forbidden");
  }
};

export const parseRequiredSessionProgressState = (
  input: unknown,
  inputCatalog: unknown,
): RequiredSessionProgressStateV1 => {
  const catalog = createRequiredSessionCatalog(inputCatalog);
  const value = detached(input, "required_session_progress_state_invalid");
  if (
    !isRecord(value) ||
    !exactKeys(value, STATE_KEYS) ||
    value.schemaVersion !== "learning-v2-required-session-progress.v1" ||
    !Number.isSafeInteger(value.revision) ||
    Number(value.revision) < 0 ||
    Number(value.revision) > 12 ||
    typeof value.accountScopeHash !== "string" ||
    !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
    !Number.isSafeInteger(value.accountGeneration) ||
    Number(value.accountGeneration) < 0 ||
    typeof value.courseId !== "string" ||
    typeof value.studyTarget !== "string" ||
    typeof value.courseReleaseId !== "string" ||
    typeof value.sessionSetId !== "string" ||
    typeof value.sessionSetHash !== "string" ||
    !HASH.test(value.sessionSetHash) ||
    value.catalogFingerprint !== catalog.catalogFingerprint ||
    !Number.isSafeInteger(value.requiredSessionOrdinal) ||
    typeof value.sessionId !== "string" ||
    typeof value.sessionRunId !== "string" ||
    !SAFE_ID.test(value.sessionRunId) ||
    (value.runKindClaim !== "initial" && value.runKindClaim !== "repeat") ||
    !isRecord(value.terminalTasks) ||
    Object.keys(value.terminalTasks).length > 12
  ) throw new Error("required_session_progress_state_invalid");
  const stateScope = {
    schemaVersion: "learning-v2-required-session-progress.v1" as const,
    revision: Number(value.revision),
    accountScopeHash: value.accountScopeHash,
    accountGeneration: Number(value.accountGeneration),
    courseId: value.courseId,
    studyTarget: value.studyTarget,
    courseReleaseId: value.courseReleaseId,
    sessionSetId: value.sessionSetId,
    sessionSetHash: value.sessionSetHash,
    catalogFingerprint: value.catalogFingerprint as string,
    requiredSessionOrdinal: Number(value.requiredSessionOrdinal),
    sessionId: value.sessionId,
    sessionRunId: value.sessionRunId,
    runKindClaim: value.runKindClaim as RequiredSessionRunKindClaim,
  };
  const terminalTasks: Record<string, RequiredTaskSettlementCandidateV1> = {};
  const operationIds = new Set<string>();
  const attemptOpIds = new Set<string>();
  const attemptBodyHashes = new Set<string>();
  for (const [key, rawCandidate] of Object.entries(value.terminalTasks)) {
    if (!/^(?:[1-9]|1[0-2])$/.test(key)) throw new Error("required_session_progress_state_invalid");
    const candidate = parseRequiredTaskSettlementCandidate(rawCandidate);
    if (candidate.disposition === "technical_invalid" || candidate.taskOrdinal !== Number(key)) {
      throw new Error("required_session_progress_state_invalid");
    }
    assertCandidateBinding(stateScope as RequiredSessionProgressStateV1, candidate, catalog);
    if (operationIds.has(candidate.operationId)) {
      throw new Error("required_task_operation_conflict");
    }
    operationIds.add(candidate.operationId);
    if (candidate.sourceAttemptRef) {
      if (
        attemptOpIds.has(candidate.sourceAttemptRef.opId) ||
        attemptBodyHashes.has(candidate.sourceAttemptRef.attemptBodyHash)
      ) throw new Error("required_task_attempt_reused");
      attemptOpIds.add(candidate.sourceAttemptRef.opId);
      attemptBodyHashes.add(candidate.sourceAttemptRef.attemptBodyHash);
    }
    terminalTasks[key] = candidate;
  }
  if (Number(value.revision) !== Object.keys(terminalTasks).length) {
    throw new Error("required_session_progress_state_invalid");
  }
  const parsed = deepFreeze({ ...stateScope, terminalTasks });
  const catalogScopeValues = [
    [parsed.courseId, catalog.courseId],
    [parsed.studyTarget, catalog.studyTarget],
    [parsed.courseReleaseId, catalog.courseReleaseId],
    [parsed.sessionSetId, catalog.sessionSetId],
    [parsed.sessionSetHash, catalog.sessionSetHash],
    [parsed.requiredSessionOrdinal, catalog.requiredSessionOrdinal],
    [parsed.sessionId, catalog.sessionId],
  ];
  if (catalogScopeValues.some(([left, right]) => left !== right)) {
    throw new Error("required_session_progress_state_invalid");
  }
  return parsed;
};

export const createRequiredSessionProgressState = (
  inputCatalog: unknown,
  run: RequiredSessionRunScope,
): RequiredSessionProgressStateV1 => {
  const catalog = createRequiredSessionCatalog(inputCatalog);
  if (
    typeof run.accountScopeHash !== "string" ||
    !/^[a-f0-9]{16,128}$/.test(run.accountScopeHash) ||
    !Number.isSafeInteger(run.accountGeneration) ||
    run.accountGeneration < 0 ||
    typeof run.sessionRunId !== "string" ||
    !SAFE_ID.test(run.sessionRunId) ||
    (run.runKindClaim !== "initial" && run.runKindClaim !== "repeat")
  ) throw new Error("required_session_progress_scope_invalid");
  return deepFreeze({
    schemaVersion: "learning-v2-required-session-progress.v1",
    revision: 0,
    accountScopeHash: run.accountScopeHash,
    accountGeneration: run.accountGeneration,
    courseId: catalog.courseId,
    studyTarget: catalog.studyTarget,
    courseReleaseId: catalog.courseReleaseId,
    sessionSetId: catalog.sessionSetId,
    sessionSetHash: catalog.sessionSetHash,
    catalogFingerprint: catalog.catalogFingerprint,
    requiredSessionOrdinal: catalog.requiredSessionOrdinal,
    sessionId: catalog.sessionId,
    sessionRunId: run.sessionRunId,
    runKindClaim: run.runKindClaim,
    terminalTasks: {},
  });
};

export const selectRequiredSessionTaskSlotsSettledCandidate = (
  inputState: unknown,
  inputCatalog: unknown,
): RequiredSessionTaskSlotsSettledCandidateV1 | undefined => {
  const catalog = createRequiredSessionCatalog(inputCatalog);
  const state = parseRequiredSessionProgressState(inputState, catalog);
  const ordered = Array.from({ length: 12 }, (_, index) => state.terminalTasks[String(index + 1)]);
  if (ordered.some((candidate) => !candidate)) return undefined;
  const candidates = ordered as RequiredTaskSettlementCandidateV1[];
  const initialCreditSubjectFingerprint = hashCanonicalBody({
    schemaVersion: "learning-v2-initial-session-credit-subject.v1",
    accountScopeHash: state.accountScopeHash,
    courseId: state.courseId,
    studyTarget: state.studyTarget,
    requiredSessionOrdinal: state.requiredSessionOrdinal,
  });
  const body = {
    schemaVersion: "learning-v2-required-session-task-slots-settled-candidate.v1" as const,
    candidateAuthority: "untrusted_local" as const,
    accountScopeHash: state.accountScopeHash,
    accountGeneration: state.accountGeneration,
    courseId: state.courseId,
    studyTarget: state.studyTarget,
    courseReleaseId: state.courseReleaseId,
    sessionSetId: state.sessionSetId,
    sessionSetHash: state.sessionSetHash,
    catalogFingerprint: catalog.catalogFingerprint,
    requiredSessionOrdinal: state.requiredSessionOrdinal,
    sessionId: state.sessionId,
    sessionRunId: state.sessionRunId,
    runKindClaim: state.runKindClaim,
    taskCandidateFingerprints: candidates.map((candidate) => candidate.candidateFingerprint),
    projectedBasePerformanceStars: sumRequiredSessionStars(candidates.map((candidate) => candidate.projectedStars)),
    projectedLearnerErrorCount: candidates.filter((candidate) => candidate.projectedCountsAsLearnerError).length,
    projectedHintCount: candidates.filter((candidate) => candidate.hintUsed).length,
    skipCount: candidates.filter((candidate) => candidate.disposition === "skipped").length,
    initialCreditSubjectFingerprint,
  };
  return deepFreeze({ ...body, candidateFingerprint: hashCanonicalBody(body) });
};

export const parseRequiredSessionTaskSlotsSettledCandidate = (
  input: unknown,
): RequiredSessionTaskSlotsSettledCandidateV1 => {
  const value = detached(
    input,
    "required_session_settled_candidate_invalid",
  );
  if (
    !isRecord(value) ||
    !exactKeys(value, SETTLED_CANDIDATE_KEYS) ||
    value.schemaVersion !==
      "learning-v2-required-session-task-slots-settled-candidate.v1" ||
    value.candidateAuthority !== "untrusted_local" ||
    typeof value.accountScopeHash !== "string" ||
    !/^[a-f0-9]{16,128}$/.test(value.accountScopeHash) ||
    !Number.isSafeInteger(value.accountGeneration) ||
    Number(value.accountGeneration) < 0 ||
    typeof value.courseId !== "string" ||
    !SAFE_ID.test(value.courseId) ||
    typeof value.studyTarget !== "string" ||
    !SAFE_ID.test(value.studyTarget) ||
    typeof value.courseReleaseId !== "string" ||
    !SAFE_ID.test(value.courseReleaseId) ||
    typeof value.sessionSetId !== "string" ||
    !SAFE_ID.test(value.sessionSetId) ||
    typeof value.sessionSetHash !== "string" ||
    !HASH.test(value.sessionSetHash) ||
    typeof value.catalogFingerprint !== "string" ||
    !HASH.test(value.catalogFingerprint) ||
    !Number.isSafeInteger(value.requiredSessionOrdinal) ||
    Number(value.requiredSessionOrdinal) < 1 ||
    Number(value.requiredSessionOrdinal) > 384 ||
    typeof value.sessionId !== "string" ||
    !SAFE_ID.test(value.sessionId) ||
    typeof value.sessionRunId !== "string" ||
    !SAFE_ID.test(value.sessionRunId) ||
    (value.runKindClaim !== "initial" && value.runKindClaim !== "repeat") ||
    !Array.isArray(value.taskCandidateFingerprints) ||
    value.taskCandidateFingerprints.length !== 12 ||
    value.taskCandidateFingerprints.some(
      (fingerprint) => typeof fingerprint !== "string" || !HASH.test(fingerprint),
    ) ||
    new Set(value.taskCandidateFingerprints).size !== 12 ||
    !Number.isSafeInteger(value.projectedBasePerformanceStars) ||
    Number(value.projectedBasePerformanceStars) < 0 ||
    Number(value.projectedBasePerformanceStars) > 36 ||
    !Number.isSafeInteger(value.projectedLearnerErrorCount) ||
    Number(value.projectedLearnerErrorCount) < 0 ||
    Number(value.projectedLearnerErrorCount) > 12 ||
    !Number.isSafeInteger(value.projectedHintCount) ||
    Number(value.projectedHintCount) < 0 ||
    Number(value.projectedHintCount) > 12 ||
    !Number.isSafeInteger(value.skipCount) ||
    Number(value.skipCount) < 0 ||
    Number(value.skipCount) > 12 ||
    typeof value.initialCreditSubjectFingerprint !== "string" ||
    !HASH.test(value.initialCreditSubjectFingerprint) ||
    typeof value.candidateFingerprint !== "string" ||
    !HASH.test(value.candidateFingerprint)
  ) {
    throw new Error("required_session_settled_candidate_invalid");
  }
  const body = { ...value } as Record<string, unknown>;
  delete body.candidateFingerprint;
  const completedCount = 12 - Number(value.skipCount);
  const expectedInitialSubjectFingerprint = hashCanonicalBody({
    schemaVersion: "learning-v2-initial-session-credit-subject.v1",
    accountScopeHash: value.accountScopeHash,
    courseId: value.courseId,
    studyTarget: value.studyTarget,
    requiredSessionOrdinal: value.requiredSessionOrdinal,
  });
  if (
    Number(value.projectedBasePerformanceStars) < completedCount ||
    Number(value.projectedBasePerformanceStars) > completedCount * 3 ||
    Number(value.projectedLearnerErrorCount) > completedCount ||
    Number(value.projectedHintCount) > completedCount ||
    value.initialCreditSubjectFingerprint !==
      expectedInitialSubjectFingerprint ||
    hashCanonicalBody(body) !== value.candidateFingerprint
  ) {
    throw new Error("required_session_settled_candidate_invalid");
  }
  return deepFreeze(
    value as unknown as RequiredSessionTaskSlotsSettledCandidateV1,
  );
};

export const reduceRequiredTaskSettlement = (
  inputState: unknown,
  inputCandidate: unknown,
  inputCatalog: unknown,
  processedOperationIndex: unknown,
): RequiredTaskReduction => {
  const catalog = createRequiredSessionCatalog(inputCatalog);
  const state = parseRequiredSessionProgressState(inputState, catalog);
  const candidate = parseRequiredTaskSettlementCandidate(inputCandidate);
  assertCandidateBinding(state, candidate, catalog);
  if (!isRecord(processedOperationIndex)) {
    throw new Error("required_task_operation_index_invalid");
  }
  const expectedRevision = state.revision;
  const processedDescriptor = Object.getOwnPropertyDescriptor(
    processedOperationIndex,
    candidate.operationId,
  );
  if (processedDescriptor && !("value" in processedDescriptor)) {
    throw new Error("required_task_operation_index_invalid");
  }
  const processedFingerprint = processedDescriptor?.value;
  if (
    processedFingerprint !== undefined &&
    (typeof processedFingerprint !== "string" || !HASH.test(processedFingerprint))
  ) throw new Error("required_task_operation_index_invalid");
  if (processedFingerprint !== undefined && processedFingerprint !== candidate.candidateFingerprint) {
    throw new Error("required_task_operation_conflict");
  }
  const existing = state.terminalTasks[String(candidate.taskOrdinal)];
  if (candidate.disposition === "technical_invalid") {
    if (Object.values(state.terminalTasks).some(
      (terminal) => terminal.operationId === candidate.operationId,
    )) throw new Error("required_task_operation_conflict");
    const taskSlotsSettledCandidate = existing
      ? selectRequiredSessionTaskSlotsSettledCandidate(state, catalog)
      : undefined;
    return deepFreeze({
      state,
      changed: false,
      retryRequired: existing === undefined,
      expectedRevision,
      nextRevision: expectedRevision,
      ...(taskSlotsSettledCandidate ? { taskSlotsSettledCandidate } : {}),
    });
  }
  if (existing) {
    if (existing.candidateFingerprint !== candidate.candidateFingerprint) {
      throw new Error("required_task_terminal_conflict");
    }
    const taskSlotsSettledCandidate = selectRequiredSessionTaskSlotsSettledCandidate(state, catalog);
    return deepFreeze({
      state,
      changed: false,
      retryRequired: false,
      expectedRevision,
      nextRevision: expectedRevision,
      ...(taskSlotsSettledCandidate ? { taskSlotsSettledCandidate } : {}),
      operationLedgerEntry: {
        operationId: candidate.operationId,
        candidateFingerprint: candidate.candidateFingerprint,
      },
    });
  }
  if (Object.values(state.terminalTasks).some(
    (terminal) => terminal.operationId === candidate.operationId,
  )) throw new Error("required_task_operation_conflict");
  if (candidate.sourceAttemptRef) {
    if (Object.values(state.terminalTasks).some((terminal) =>
      terminal.sourceAttemptRef &&
      (terminal.sourceAttemptRef.opId === candidate.sourceAttemptRef!.opId ||
        terminal.sourceAttemptRef.attemptBodyHash === candidate.sourceAttemptRef!.attemptBodyHash)
    )) throw new Error("required_task_attempt_reused");
  }
  const nextState = deepFreeze({
    ...state,
    revision: state.revision + 1,
    terminalTasks: {
      ...state.terminalTasks,
      [String(candidate.taskOrdinal)]: candidate,
    },
  });
  const taskSlotsSettledCandidate = selectRequiredSessionTaskSlotsSettledCandidate(nextState, catalog);
  return deepFreeze({
    state: nextState,
    changed: true,
    retryRequired: false,
    expectedRevision,
    nextRevision: nextState.revision,
    ...(taskSlotsSettledCandidate ? { taskSlotsSettledCandidate } : {}),
    operationLedgerEntry: {
      operationId: candidate.operationId,
      candidateFingerprint: candidate.candidateFingerprint,
    },
  });
};
