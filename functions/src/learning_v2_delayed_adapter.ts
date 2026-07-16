import {
  adjudicateDelayedCandidate,
  type DelayedProtocolRejectionReason,
  type DelayedRuntimeReceipt,
  type DelayedSystemFailureReason,
} from "../../modules/learning-v2/contracts/delayed_runtime";
import type {
  V2DelayedProbeAssignmentRef,
  V2DelayedProbeLaunchReceiptRef,
  V2DelayedProbeRef,
} from "../../modules/learning-v2/contracts/delayed_receipts";

export interface DelayedAssignmentRecord {
  readonly ref: V2DelayedProbeAssignmentRef;
  readonly stableId: string;
  readonly accountGeneration: number;
  readonly probeRef: V2DelayedProbeRef;
  readonly expectedTupleKeys: readonly string[];
  readonly assessableWindowOpensAtMs?: number;
  readonly assessableWindowClosesAtMs?: number;
  readonly status?: "active" | "stale";
}
export interface DelayedLaunchRecord {
  readonly ref: V2DelayedProbeLaunchReceiptRef;
  readonly stableId: string;
  readonly accountGeneration: number;
  readonly probeRef: V2DelayedProbeRef;
  readonly expiresAtMs?: number;
}
export interface DelayedReceiptOperation {
  readonly operationId: string;
  readonly fingerprint: string;
  readonly receipt: DelayedRuntimeReceipt;
}
export interface DelayedReceiptTransaction {
  get<T>(key: string): Promise<{ readonly exists: boolean; readonly data?: T }>;
  create(key: string, value: unknown): void;
}
export interface DelayedReceiptRepository {
  runTransaction<T>(
    fn: (transaction: DelayedReceiptTransaction) => Promise<T>,
  ): Promise<T>;
}
export interface FinalizeDelayedCandidateInput {
  readonly operationId: string;
  readonly fingerprint: string;
  readonly stableId: string;
  readonly accountGeneration: number;
  readonly candidate: Readonly<Record<string, unknown>>;
  readonly expectedTupleKeys: readonly string[];
  readonly assignmentRef: V2DelayedProbeAssignmentRef;
  readonly launchReceiptRef: V2DelayedProbeLaunchReceiptRef;
  readonly probeRef: V2DelayedProbeRef;
  readonly timingReceiptId: string;
  readonly failureReceiptId: string;
  readonly acceptedAtServer: string;
  readonly observedDelayMs: number;
  readonly windowPolicyId: string;
  readonly serverDecision:
    | {
        readonly kind: "timed";
        readonly window: "inside_pinned_window" | "outside_pinned_window";
      }
    | {
        readonly kind: "system_failure";
        readonly reasonCode: DelayedSystemFailureReason;
      }
    | {
        readonly kind: "protocol_rejection";
        readonly reasonCode: DelayedProtocolRejectionReason;
      };
  /** Server clock; client timestamps are never used for classification. */
  readonly nowMs?: number;
}

const sameRef = (
  left: {
    readonly assignmentId?: string;
    readonly launchId?: string;
    readonly contentHash: string;
  },
  right: {
    readonly assignmentId?: string;
    readonly launchId?: string;
    readonly contentHash: string;
  },
): boolean =>
  (left.assignmentId ?? left.launchId) ===
    (right.assignmentId ?? right.launchId) &&
  left.contentHash === right.contentHash;
const sameProbe = (
  left: V2DelayedProbeRef,
  right: V2DelayedProbeRef,
): boolean =>
  left.probeId === right.probeId && left.contentHash === right.contentHash;
const operationKey = (input: FinalizeDelayedCandidateInput): string =>
  `learning-v2:delayed:${input.stableId}:${input.operationId}`;
const receiptKey = (receipt: DelayedRuntimeReceipt): string =>
  receipt.kind === "timing"
    ? `learning_v2_timing_receipts:${receipt.ref.timingReceiptId}`
    : `learning_v2_failure_receipts:${receipt.ref.failureReceiptId}`;
const deriveWindowDecision = (
  assignment: DelayedAssignmentRecord,
  launch: DelayedLaunchRecord,
  nowMs: number,
): FinalizeDelayedCandidateInput["serverDecision"] => {
  if (assignment.status === "stale")
    return { kind: "system_failure", reasonCode: "assignment_stale" };
  if (launch.expiresAtMs !== undefined && nowMs >= launch.expiresAtMs)
    return { kind: "system_failure", reasonCode: "launch_expired" };
  if (
    assignment.assessableWindowOpensAtMs === undefined ||
    assignment.assessableWindowClosesAtMs === undefined
  )
    return { kind: "system_failure", reasonCode: "server_timing_unavailable" };
  return {
    kind: "timed",
    window:
      nowMs >= assignment.assessableWindowOpensAtMs &&
      nowMs <= assignment.assessableWindowClosesAtMs
        ? "inside_pinned_window"
        : "outside_pinned_window",
  };
};

export async function finalizeDelayedCandidate(
  repository: DelayedReceiptRepository,
  input: FinalizeDelayedCandidateInput,
): Promise<{
  readonly replayed: boolean;
  readonly receipt: DelayedRuntimeReceipt;
}> {
  return repository.runTransaction(async (transaction) => {
    const operationDocument = await transaction.get<DelayedReceiptOperation>(
      operationKey(input),
    );
    if (operationDocument.exists) {
      if (operationDocument.data?.fingerprint !== input.fingerprint)
        throw new Error("delayed_operation_replay_mismatch");
      if (!operationDocument.data?.receipt)
        throw new Error("delayed_operation_record_invalid");
      return { replayed: true, receipt: operationDocument.data.receipt };
    }
    const assignmentDocument = await transaction.get<DelayedAssignmentRecord>(
      `learning_v2_assignments:${input.assignmentRef.assignmentId}`,
    );
    const launchDocument = await transaction.get<DelayedLaunchRecord>(
      `learning_v2_launches:${input.launchReceiptRef.launchId}`,
    );
    let decision = input.serverDecision;
    const assignment = assignmentDocument.data;
    const launch = launchDocument.data;
    if (!assignmentDocument.exists || !assignment) {
      decision = { kind: "system_failure", reasonCode: "assignment_missing" };
    } else if (!launchDocument.exists || !launch) {
      decision = { kind: "system_failure", reasonCode: "launch_missing" };
    } else if (
      assignment.stableId !== input.stableId ||
      assignment.accountGeneration !== input.accountGeneration ||
      !sameRef(assignment.ref, input.assignmentRef) ||
      !sameProbe(assignment.probeRef, input.probeRef) ||
      launch.stableId !== input.stableId ||
      launch.accountGeneration !== input.accountGeneration ||
      !sameRef(launch.ref, input.launchReceiptRef) ||
      !sameProbe(launch.probeRef, input.probeRef)
    ) {
      decision = {
        kind: "protocol_rejection",
        reasonCode: "declaration_or_provenance_mismatch",
      };
    } else if (input.nowMs !== undefined) {
      decision = deriveWindowDecision(assignment, launch, input.nowMs);
    }
    const expectedTupleKeys =
      assignment?.expectedTupleKeys ?? input.expectedTupleKeys;
    const receipt = adjudicateDelayedCandidate(
      {
        candidate: input.candidate,
        expectedTupleKeys,
        assignmentRef: input.assignmentRef,
        launchReceiptRef: input.launchReceiptRef,
        probeRef: input.probeRef,
        timingReceiptId: input.timingReceiptId,
        failureReceiptId: input.failureReceiptId,
        acceptedAtServer: input.acceptedAtServer,
        observedDelayMs: input.observedDelayMs,
        windowPolicyId: input.windowPolicyId,
      },
      decision,
    );
    transaction.create(receiptKey(receipt), receipt);
    transaction.create(operationKey(input), {
      operationId: input.operationId,
      fingerprint: input.fingerprint,
      receipt,
    });
    return { replayed: false, receipt };
  });
}
