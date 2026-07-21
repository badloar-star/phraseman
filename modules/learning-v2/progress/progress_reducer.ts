import { applyBestPerformanceStars } from "../contracts/stars";
import type {
  LearningEvidenceIndexEntry,
  PerformanceStars,
  ProgressEventInput,
  ProgressReducerContext,
  ProgressReduction,
  ProgressSnapshot,
} from "./progress_types";

export type ProgressEvent = ProgressEventInput;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;
const isStars = (value: unknown): value is PerformanceStars =>
  Number.isInteger(value) && Number(value) >= 0 && Number(value) <= 3;
const isCanonicalRef = (
  value: unknown,
): value is {
  readonly schemaVersion: "v2-attempt-ref.v1";
  readonly opId: string;
  readonly attemptBodyHash: string;
} =>
  isRecord(value) &&
  value.schemaVersion === "v2-attempt-ref.v1" &&
  isNonEmpty(value.opId) &&
  typeof value.attemptBodyHash === "string" &&
  /^[a-f0-9]{64}$/.test(value.attemptBodyHash);
const isMaterializationRef = (value: unknown, assessed: boolean): boolean => {
  if (
    !isRecord(value) ||
    !isNonEmpty(value.tupleKey) ||
    !isCanonicalRef(value.sourceAttempt)
  )
    return false;
  const id = assessed ? value.observationId : value.nonAssessmentId;
  const hash = assessed ? value.evidenceBodyHash : value.nonAssessmentBodyHash;
  return (
    isNonEmpty(id) && typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash)
  );
};
const isStrictAttemptRef = (
  value: unknown,
): value is {
  readonly schemaVersion: "v2-attempt-ref.v1";
  readonly opId: string;
  readonly attemptBodyHash: string;
} => isCanonicalRef(value) && Object.keys(value).length === 3;
const MAX_INDEX_ENTRIES = 2048;
const isAcceptedOutcome = (value: { readonly resultCode: string }): boolean =>
  [
    "CORRECT",
    "COMPLETED",
    "PASS_CONFIDENT",
    "NEEDS_WORK_CONFIDENT",
    "WRONG",
  ].includes(value.resultCode);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const createInitialProgressState = (
  options: Partial<
    Pick<
      ProgressSnapshot,
      | "accountScopeHash"
      | "seasonId"
      | "studyTarget"
      | "learnerSourceLocale"
      | "enrolledPolicyVersion"
      | "legacy"
    >
  > = {},
): ProgressSnapshot => ({
  schemaVersion: "v2-progress.v1",
  accountScopeHash: options.accountScopeHash ?? "anonymous",
  seasonId: options.seasonId ?? "season-01",
  studyTarget: options.studyTarget ?? "general",
  learnerSourceLocale: options.learnerSourceLocale ?? "en",
  enrolledPolicyVersion: options.enrolledPolicyVersion ?? 1,
  slots: {},
  nodeOutcomes: {},
  learningEvidenceIndex: {},
  checkpointEvidenceIndex: {},
  gateReceipts: {},
  ...(options.legacy === undefined ? {} : { legacy: clone(options.legacy) }),
  updatedAt: new Date(0).toISOString(),
});

export const assertProgressSnapshot = (state: ProgressSnapshot): void => {
  if (!isRecord(state) || state.schemaVersion !== "v2-progress.v1")
    throw new Error("progress_snapshot_invalid");
  if (
    !isNonEmpty(state.accountScopeHash) ||
    !isNonEmpty(state.seasonId) ||
    !isNonEmpty(state.studyTarget) ||
    !isNonEmpty(state.learnerSourceLocale)
  ) {
    throw new Error("progress_snapshot_invalid");
  }
  if (
    !Number.isSafeInteger(state.enrolledPolicyVersion) ||
    state.enrolledPolicyVersion < 1 ||
    !isNonEmpty(state.updatedAt) ||
    Number.isNaN(Date.parse(state.updatedAt))
  ) {
    throw new Error("progress_snapshot_invalid");
  }
  const slotIds = Object.keys(state.slots);
  const slotStars = slotIds.map((slotId) => {
    const slot = state.slots[slotId];
    if (
      !isRecord(slot) ||
      !isNonEmpty(slot.episodeId) ||
      slot.starSlotId !== slotId ||
      !isNonEmpty(slot.activityId) ||
      !isNonEmpty(slot.progressCompatibilityKey) ||
      !isStars(slot.bestPerformanceStars)
    ) {
      throw new Error("progress_slot_invalid");
    }
    if (
      slot.bestPerformanceAttemptRef &&
      !isStrictAttemptRef(slot.bestPerformanceAttemptRef)
    )
      throw new Error("progress_attempt_ref_invalid");
    return slot.bestPerformanceStars;
  });
  if (slotStars.some((value) => !isStars(value)))
    throw new Error("star_slots_invalid");
  if (
    Object.keys(state.learningEvidenceIndex).length > MAX_INDEX_ENTRIES ||
    Object.keys(state.checkpointEvidenceIndex).length > MAX_INDEX_ENTRIES ||
    Object.keys(state.gateReceipts).length > 128
  )
    throw new Error("progress_index_overflow");
  for (const [key, entry] of Object.entries(state.checkpointEvidenceIndex)) {
    if (
      !isRecord(entry) ||
      key !== `${entry.checkpointEpisodeId}::${entry.tupleKey}` ||
      !isNonEmpty(entry.checkpointEpisodeId) ||
      !isNonEmpty(entry.tupleKey) ||
      !["passed", "repair_required", "not_assessed", "incomplete"].includes(
        String(entry.state),
      )
    )
      throw new Error("checkpoint_index_invalid");
    if (entry.ref && !isMaterializationRef(entry.ref, entry.state === "passed"))
      throw new Error("checkpoint_index_invalid");
    if (entry.ref && entry.ref.tupleKey !== entry.tupleKey)
      throw new Error("checkpoint_index_invalid");
  }
  for (const entry of Object.values(state.gateReceipts)) {
    if (
      !isRecord(entry) ||
      !Number.isSafeInteger(entry.unlockedAtMs) ||
      entry.unlockedAtMs < 0 ||
      !isNonEmpty(entry.releaseId)
    )
      throw new Error("gate_receipt_invalid");
  }
  for (const node of Object.values(state.nodeOutcomes)) {
    if (!isRecord(node) || !isStrictAttemptRef(node.bestAcceptedAttemptRef))
      throw new Error("progress_node_outcome_invalid");
  }
  for (const [nodeId, node] of Object.entries(state.nodeOutcomes)) {
    if (!isRecord(node) || node.nodeId !== nodeId)
      throw new Error("progress_node_identity_invalid");
  }
  for (const [tupleKey, entry] of Object.entries(state.learningEvidenceIndex)) {
    if (!isNonEmpty(tupleKey) || !isRecord(entry))
      throw new Error("learning_evidence_index_invalid");
    const typedEntry = entry as LearningEvidenceIndexEntry;
    if (
      typedEntry.bestAssessedEvidenceRef &&
      !isMaterializationRef(typedEntry.bestAssessedEvidenceRef, true)
    )
      throw new Error("learning_evidence_index_invalid");
    if (
      typedEntry.latestNonAssessmentRef &&
      !isMaterializationRef(typedEntry.latestNonAssessmentRef, false)
    )
      throw new Error("learning_evidence_index_invalid");
    if (
      typedEntry.bestAssessedEvidenceRef &&
      typedEntry.latestNonAssessmentRef &&
      typedEntry.bestAssessedEvidenceRef.tupleKey !==
        typedEntry.latestNonAssessmentRef.tupleKey
    ) {
      throw new Error("learning_evidence_index_invalid");
    }
  }
};

const outcomeRank = (outcome: { readonly resultCode: string }): number => {
  if (
    outcome.resultCode === "PASS_CONFIDENT" ||
    outcome.resultCode === "CORRECT" ||
    outcome.resultCode === "COMPLETED"
  )
    return 2;
  if (
    outcome.resultCode === "NEEDS_WORK_CONFIDENT" ||
    outcome.resultCode === "WRONG"
  )
    return 1;
  return 0;
};

export const reduceProgress = (
  state: ProgressSnapshot,
  event: ProgressEvent,
  context: ProgressReducerContext,
): ProgressReduction => {
  assertProgressSnapshot(state);
  if (
    state.accountScopeHash !== context.expectedAccountScopeHash ||
    state.seasonId !== context.expectedSeasonId
  )
    throw new Error("progress_scope_mismatch");
  if (
    !isRecord(event) ||
    !isNonEmpty(event.eventId) ||
    !isNonEmpty(event.starSlotId)
  )
    throw new Error("progress_event_invalid");
  if (!isStars(event.candidateStars))
    throw new Error("performance_stars_invalid");
  if (
    !event.attemptRef ||
    !isStrictAttemptRef(event.attemptRef) ||
    !context.validateAttemptRef(event.attemptRef)
  )
    throw new Error("attempt_ref_invalid");
  const previousAttemptHash =
    context.processedAttemptIndex[event.attemptRef.opId];
  if (
    previousAttemptHash &&
    previousAttemptHash !== event.attemptRef.attemptBodyHash
  )
    throw new Error("progress_replay_conflict");
  if (previousAttemptHash === event.attemptRef.attemptBodyHash)
    return {
      state,
      delta: 0,
      accessStarsEarnedDelta: 0,
      changed: false,
      attemptLedgerEntry: {
        opId: event.attemptRef.opId,
        attemptBodyHash: event.attemptRef.attemptBodyHash,
      },
    };
  const catalog = context.slotCatalog[event.starSlotId];
  if (!catalog) throw new Error("star_slot_unknown");
  const episodeSlotCount = Object.values(context.slotCatalog).filter(
    (slot) => slot.episodeId === catalog.episodeId,
  ).length;
  if (episodeSlotCount > 8) throw new Error("star_slots_invalid");
  for (const [slotId, slot] of Object.entries(state.slots)) {
    const known = context.slotCatalog[slotId];
    if (
      !known ||
      slot.episodeId !== known.episodeId ||
      slot.activityId !== known.activityId ||
      slot.progressCompatibilityKey !== known.progressCompatibilityKey
    )
      throw new Error("star_slot_catalog_mismatch");
  }
  if (event.activityId && event.activityId !== catalog.activityId)
    throw new Error("star_slot_catalog_mismatch");
  if (
    event.progressCompatibilityKey &&
    event.progressCompatibilityKey !== catalog.progressCompatibilityKey
  )
    throw new Error("star_slot_catalog_mismatch");
  if (
    context.declaredEvidenceTupleKeys &&
    event.learningEvidence &&
    !context.declaredEvidenceTupleKeys.includes(event.learningEvidence.tupleKey)
  )
    throw new Error("learning_evidence_tuple_unknown");
  if (
    event.occurredAtMs !== undefined &&
    (!Number.isSafeInteger(event.occurredAtMs) || event.occurredAtMs < 0)
  )
    throw new Error("progress_event_invalid");
  const current = state.slots[event.starSlotId];
  if (
    current?.bestPerformanceAttemptRef?.opId === event.attemptRef.opId &&
    current.bestPerformanceAttemptRef.attemptBodyHash !==
      event.attemptRef.attemptBodyHash
  )
    throw new Error("progress_replay_conflict");
  const previous = current?.bestPerformanceStars ?? 0;
  const projection = applyBestPerformanceStars({
    previous,
    candidate: event.candidateStars,
  });
  const activityId =
    event.activityId ?? current?.activityId ?? catalog.activityId;
  const compatibilityKey =
    event.progressCompatibilityKey ??
    current?.progressCompatibilityKey ??
    catalog.progressCompatibilityKey;
  if (!isNonEmpty(activityId) || !isNonEmpty(compatibilityKey))
    throw new Error("progress_event_invalid");

  const nextSlots = { ...state.slots };
  if (!current || projection.next > previous) {
    nextSlots[event.starSlotId] = {
      starSlotId: event.starSlotId,
      episodeId: catalog.episodeId,
      activityId,
      progressCompatibilityKey: compatibilityKey,
      bestPerformanceStars: projection.next as PerformanceStars,
      ...(event.attemptRef
        ? { bestPerformanceAttemptRef: event.attemptRef }
        : current?.bestPerformanceAttemptRef
          ? { bestPerformanceAttemptRef: current.bestPerformanceAttemptRef }
          : {}),
    };
  }
  const nextEvidence = { ...state.learningEvidenceIndex } as Record<
    string,
    LearningEvidenceIndexEntry
  >;
  if (event.learningEvidence) {
    const input = event.learningEvidence;
    const inputRef =
      "assessedRef" in input ? input.assessedRef : input.nonAssessmentRef;
    if (input.tupleKey !== inputRef.tupleKey)
      throw new Error("learning_evidence_tuple_mismatch");
    const refValid =
      "assessedRef" in input
        ? isMaterializationRef(input.assessedRef, true)
        : isMaterializationRef(input.nonAssessmentRef, false);
    if (!refValid) throw new Error("learning_evidence_ref_invalid");
    if (!context.validateEvidenceRef(input.tupleKey, inputRef))
      throw new Error("learning_evidence_binding_invalid");
    const binding = context.evidenceBindings?.[input.tupleKey];
    const bodyHash =
      "assessedRef" in input
        ? input.assessedRef.evidenceBodyHash
        : input.nonAssessmentRef.nonAssessmentBodyHash;
    if (
      !binding ||
      bodyHash !== binding.bodyHash ||
      inputRef.sourceAttempt.opId !== binding.sourceAttempt.opId ||
      inputRef.sourceAttempt.attemptBodyHash !==
        binding.sourceAttempt.attemptBodyHash
    )
      throw new Error("learning_evidence_binding_invalid");
    const existing = nextEvidence[input.tupleKey] ?? {};
    if ("assessedRef" in input) {
      if (
        existing.bestAssessedEvidenceRef?.observationId ===
          input.assessedRef.observationId &&
        existing.bestAssessedEvidenceRef.evidenceBodyHash ===
          input.assessedRef.evidenceBodyHash
      ) {
        return {
          state,
          delta: 0,
          accessStarsEarnedDelta: 0,
          changed: false,
          attemptLedgerEntry: {
            opId: event.attemptRef.opId,
            attemptBodyHash: event.attemptRef.attemptBodyHash,
          },
        };
      }
      if (
        existing.bestAssessedEvidenceRef?.observationId ===
        input.assessedRef.observationId
      )
        throw new Error("learning_evidence_conflict");
      const currentHash =
        existing.bestAssessedEvidenceRef?.evidenceBodyHash ?? "";
      nextEvidence[input.tupleKey] = {
        ...existing,
        bestAssessedEvidenceRef:
          input.assessedRef.evidenceBodyHash >= currentHash
            ? input.assessedRef
            : existing.bestAssessedEvidenceRef,
      };
    } else {
      if (
        existing.latestNonAssessmentRef?.nonAssessmentId ===
          input.nonAssessmentRef.nonAssessmentId &&
        existing.latestNonAssessmentRef.nonAssessmentBodyHash ===
          input.nonAssessmentRef.nonAssessmentBodyHash
      ) {
        return {
          state,
          delta: 0,
          accessStarsEarnedDelta: 0,
          changed: false,
          attemptLedgerEntry: {
            opId: event.attemptRef.opId,
            attemptBodyHash: event.attemptRef.attemptBodyHash,
          },
        };
      }
      const currentId = existing.latestNonAssessmentRef?.nonAssessmentId ?? "";
      nextEvidence[input.tupleKey] = {
        ...existing,
        latestNonAssessmentRef:
          input.nonAssessmentRef.nonAssessmentId >= currentId
            ? input.nonAssessmentRef
            : existing.latestNonAssessmentRef,
      };
    }
  }
  const nextCheckpoint = { ...state.checkpointEvidenceIndex };
  if (event.checkpointEvidence) {
    const checkpoint = event.checkpointEvidence;
    const key = `${checkpoint.checkpointEpisodeId}::${checkpoint.tupleKey}`;
    if (!context.checkpointContract.tupleKeys.includes(checkpoint.tupleKey))
      throw new Error("checkpoint_tuple_unknown");
    if (
      checkpoint.state === "passed" &&
      !context.checkpointContract.criticalTupleKeys.includes(
        checkpoint.tupleKey,
      )
    )
      throw new Error("checkpoint_critical_tuple_required");
    if (
      checkpoint.state === "repair_required" &&
      !context.checkpointContract.repairTupleKeys.includes(checkpoint.tupleKey)
    )
      throw new Error("checkpoint_repair_route_missing");
    if (
      checkpoint.state === "not_assessed" &&
      !context.checkpointContract.alternateTupleKeys.includes(
        checkpoint.tupleKey,
      )
    )
      throw new Error("checkpoint_alternate_route_missing");
    if (
      checkpoint.state === "passed" &&
      (!checkpoint.ref ||
        !isMaterializationRef(checkpoint.ref, true) ||
        context.evidenceBindings?.[checkpoint.tupleKey]?.assessmentStatus !==
          "assessed" ||
        context.evidenceBindings?.[checkpoint.tupleKey]?.outcome !== "success")
    )
      throw new Error("checkpoint_evidence_required");
    if (
      checkpoint.state === "repair_required" &&
      (!checkpoint.ref ||
        !isMaterializationRef(checkpoint.ref, true) ||
        context.evidenceBindings?.[checkpoint.tupleKey]?.assessmentStatus !==
          "assessed" ||
        context.evidenceBindings?.[checkpoint.tupleKey]?.outcome !==
          "needs_work")
    )
      throw new Error("checkpoint_repair_binding_invalid");
    if (
      checkpoint.state === "not_assessed" &&
      (!checkpoint.ref ||
        !isMaterializationRef(checkpoint.ref, false) ||
        context.evidenceBindings?.[checkpoint.tupleKey]?.assessmentStatus !==
          "not_assessed" ||
        !context.checkpointContract.alternateTupleKeys.includes(
          checkpoint.tupleKey,
        ))
    )
      throw new Error("checkpoint_alternate_binding_invalid");
    if (
      checkpoint.ref &&
      (!context.validateEvidenceRef(checkpoint.tupleKey, checkpoint.ref) ||
        !context.evidenceBindings?.[checkpoint.tupleKey] ||
        checkpoint.ref.sourceAttempt.opId !==
          context.evidenceBindings[checkpoint.tupleKey].sourceAttempt.opId ||
        checkpoint.ref.sourceAttempt.attemptBodyHash !==
          context.evidenceBindings[checkpoint.tupleKey].sourceAttempt
            .attemptBodyHash ||
        (checkpoint.state === "not_assessed"
          ? !("nonAssessmentBodyHash" in checkpoint.ref) ||
            checkpoint.ref.nonAssessmentBodyHash !==
              context.evidenceBindings[checkpoint.tupleKey].bodyHash
          : !("evidenceBodyHash" in checkpoint.ref) ||
            checkpoint.ref.evidenceBodyHash !==
              context.evidenceBindings[checkpoint.tupleKey].bodyHash))
    )
      throw new Error("checkpoint_evidence_binding_invalid");
    nextCheckpoint[key] = {
      checkpointEpisodeId: checkpoint.checkpointEpisodeId,
      tupleKey: checkpoint.tupleKey,
      state: checkpoint.state,
      ...(checkpoint.ref ? { ref: checkpoint.ref } : {}),
    };
  }
  const nextNodes = { ...state.nodeOutcomes };
  if (event.nodeId && event.attemptRef && event.acceptedOutcome) {
    if (!isAcceptedOutcome(event.acceptedOutcome))
      throw new Error("node_outcome_invalid");
    const node = context.nodeCatalog?.[event.nodeId];
    if (
      !node ||
      node.activityId !== activityId ||
      node.progressCompatibilityKey !== compatibilityKey
    )
      throw new Error("node_catalog_mismatch");
    const previousOutcome = nextNodes[event.nodeId];
    if (
      !previousOutcome ||
      outcomeRank(event.acceptedOutcome) >=
        outcomeRank(previousOutcome.bestAcceptedOutcome)
    ) {
      nextNodes[event.nodeId] = {
        nodeId: event.nodeId,
        activityId,
        progressCompatibilityKey: compatibilityKey,
        bestAcceptedAttemptRef: event.attemptRef,
        bestAcceptedOutcome: event.acceptedOutcome,
      };
    }
  }
  const changed =
    projection.performanceStarsDelta > 0 ||
    Boolean(event.learningEvidence) ||
    Boolean(event.checkpointEvidence) ||
    Boolean(event.nodeId && event.attemptRef && event.acceptedOutcome);
  return {
    state: {
      ...state,
      slots: nextSlots,
      nodeOutcomes: nextNodes,
      learningEvidenceIndex: nextEvidence,
      checkpointEvidenceIndex: nextCheckpoint,
      updatedAt:
        event.occurredAtMs === undefined ||
        new Date(event.occurredAtMs).getTime() < Date.parse(state.updatedAt)
          ? state.updatedAt
          : new Date(event.occurredAtMs).toISOString(),
    },
    delta: projection.performanceStarsDelta,
    accessStarsEarnedDelta: projection.accessStarsEarnedDelta,
    changed,
    attemptLedgerEntry: {
      opId: event.attemptRef.opId,
      attemptBodyHash: event.attemptRef.attemptBodyHash,
    },
  };
};

export const deriveAccessStarsEarned = (state: ProgressSnapshot): number => {
  assertProgressSnapshot(state);
  return Object.values(state.slots).reduce(
    (sum, slot) => sum + slot.bestPerformanceStars,
    0,
  );
};

export const deriveRequiredLoopsComplete = (
  state: ProgressSnapshot,
  context: ProgressReducerContext,
): boolean => {
  assertProgressSnapshot(state);
  const loops = context.requiredLoopNodeIds;
  if (!loops) return false;
  if (
    state.accountScopeHash !== context.expectedAccountScopeHash ||
    state.seasonId !== context.expectedSeasonId
  )
    return false;
  const accepted = (nodeId: string): boolean => {
    const entry = state.nodeOutcomes[nodeId];
    const catalog = context.nodeCatalog?.[nodeId];
    if (
      !entry ||
      entry.nodeId !== nodeId ||
      !catalog ||
      entry.activityId !== catalog.activityId ||
      entry.progressCompatibilityKey !== catalog.progressCompatibilityKey
    )
      return false;
    if (
      context.processedAttemptIndex[entry.bestAcceptedAttemptRef.opId] !==
      entry.bestAcceptedAttemptRef.attemptBodyHash
    )
      return false;
    if (
      !isRecord(entry.bestAcceptedOutcome) ||
      Object.keys(entry.bestAcceptedOutcome).length !== 1 ||
      !isAcceptedOutcome(entry.bestAcceptedOutcome)
    )
      return false;
    const resultCode = entry.bestAcceptedOutcome.resultCode;
    return (
      resultCode === "CORRECT" ||
      resultCode === "COMPLETED" ||
      resultCode === "PASS_CONFIDENT"
    );
  };
  return (
    loops.encounterBuild.length > 0 &&
    loops.nearTransfer.length > 0 &&
    loops.encounterBuild.every(accepted) &&
    loops.nearTransfer.every(accepted)
  );
};
