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
import { hashCanonicalBody } from "../../modules/learning-v2/policies/decision_registry";
import { deriveProgressAccountScopeHash } from "./learning_v2/progress_event";

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
  readonly accountGeneration: number;
  readonly receiptHash: string;
  readonly terminalStatus: DelayedTerminalRecord["terminalStatus"];
  readonly receipt: DelayedRuntimeReceipt;
}
export interface DelayedTerminalRecord {
  readonly schemaVersion: "v2-delayed-probe-terminal.v1";
  readonly mutationId: string;
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly receipt: DelayedRuntimeReceipt;
  readonly receiptHash: string;
  readonly terminalStatus: "timed_finalized" | "system_non_assessment_finalized" | "protocol_rejected";
}
export interface DelayedReceiptTransaction {
  get<T>(key: string): Promise<{ readonly exists: boolean; readonly data?: T }>;
  create(key: string, value: unknown): void;
}
export interface DelayedReceiptRepository {
  runTransaction<T>(
    fn: (transaction: DelayedReceiptTransaction) => Promise<T>,
  ): Promise<T>;
  /** Server-side deterministic race seam; never populated from callable input. */
  readonly testHooks?: Readonly<{
    readonly afterBindingReads?: () => void | Promise<void>;
  }>;
}
export interface FinalizeDelayedCandidateInput {
  readonly operationId: string;
  readonly fingerprint: string;
  /** Firebase Auth UID used only to re-read the canonical anchor at commit time. */
  readonly authUid: string;
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
const authLinkKey = (authUid: string): string => `auth_links:${authUid}`;
const accountKey = (stableId: string): string => `users:${stableId}`;
const tombstoneKey = (stableId: string): string =>
  `account_deletion_tombstones:${stableId}`;
const receiptKey = (stableId: string, receipt: DelayedRuntimeReceipt): string =>
  receipt.kind === "timing"
    ? `learning_v2_timing_receipts:${stableId}:${receipt.ref.timingReceiptId}`
    : `learning_v2_failure_receipts:${stableId}:${receipt.ref.failureReceiptId}`;
const terminalKey = (stableId: string, accountScopeHash: string, operationId: string): string =>
  `learning_v2_delayed_terminals:${stableId}:${accountScopeHash}__${operationId}`;
const terminalStatusFor = (receipt: DelayedRuntimeReceipt): DelayedTerminalRecord["terminalStatus"] =>
  receipt.kind === "timing"
    ? "timed_finalized"
    : receipt.body.decision.kind === "system_non_assessment"
      ? "system_non_assessment_finalized"
      : "protocol_rejected";
const buildTerminalRecord = (
  input: FinalizeDelayedCandidateInput,
  receipt: DelayedRuntimeReceipt,
): DelayedTerminalRecord => {
  const receiptHash = hashCanonicalBody(receipt);
  return {
    schemaVersion: "v2-delayed-probe-terminal.v1",
    mutationId: input.operationId,
    accountScopeHash: deriveProgressAccountScopeHash(input.stableId, input.accountGeneration),
    accountGeneration: input.accountGeneration,
    receipt,
    receiptHash,
    terminalStatus: terminalStatusFor(receipt),
  };
};
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
  if (
    !/^[A-Za-z0-9._-]{1,160}$/.test(input.operationId) ||
    !/^[a-f0-9]{64}$/.test(input.fingerprint) ||
    typeof input.authUid !== "string" ||
    input.authUid.trim().length === 0 ||
    input.authUid.length > 128 ||
    input.authUid.includes("/") ||
    input.stableId.length === 0 ||
    !Number.isSafeInteger(input.accountGeneration) ||
    input.accountGeneration < 1
  )
    throw new Error("delayed_operation_identity_invalid");
  return repository.runTransaction(async (transaction) => {
    const [authLinkDocument, accountDocument, tombstoneDocument] =
      await Promise.all([
        transaction.get<{ readonly stable_id?: unknown }>(
          authLinkKey(input.authUid),
        ),
        transaction.get<{
          readonly accountGeneration?: unknown;
          readonly generation?: unknown;
        }>(accountKey(input.stableId)),
        transaction.get(tombstoneKey(input.stableId)),
      ]);
    await repository.testHooks?.afterBindingReads?.();
    if (!authLinkDocument.exists) {
      throw new Error("delayed_identity_anchor_missing");
    }
    if (
      typeof authLinkDocument.data?.stable_id !== "string" ||
      authLinkDocument.data.stable_id.trim() !== input.stableId
    ) {
      throw new Error("delayed_stable_identity_mismatch");
    }
    if (tombstoneDocument.exists) {
      throw new Error("delayed_account_delete_pending");
    }
    const liveGeneration = Number(
      accountDocument.data?.accountGeneration ??
        accountDocument.data?.generation,
    );
    if (
      !accountDocument.exists ||
      !Number.isSafeInteger(liveGeneration) ||
      liveGeneration < 1 ||
      liveGeneration !== input.accountGeneration
    ) {
      throw new Error("delayed_account_generation_mismatch");
    }

    const operationDocument = await transaction.get<DelayedReceiptOperation>(
      operationKey(input),
    );
    if (operationDocument.exists) {
      if (operationDocument.data?.fingerprint !== input.fingerprint)
        throw new Error("delayed_operation_replay_mismatch");
      const operation = operationDocument.data;
      if (
        !operation?.receipt ||
        operation.accountGeneration !== input.accountGeneration ||
        operation.receiptHash !== hashCanonicalBody(operation.receipt) ||
        operation.terminalStatus !== terminalStatusFor(operation.receipt)
      )
        throw new Error("delayed_operation_record_invalid");
      const terminal = buildTerminalRecord(input, operation.receipt);
      if (
        terminal.receiptHash !== operation.receiptHash ||
        terminal.terminalStatus !== operation.terminalStatus
      ) throw new Error("delayed_operation_record_invalid");
      const [receiptDocument, terminalDocument] = await Promise.all([
        transaction.get<DelayedRuntimeReceipt>(receiptKey(input.stableId, operation.receipt)),
        transaction.get<DelayedTerminalRecord>(terminalKey(input.stableId, terminal.accountScopeHash, input.operationId)),
      ]);
      if (receiptDocument.exists && hashCanonicalBody(receiptDocument.data) !== terminal.receiptHash) {
        throw new Error("delayed_receipt_replay_conflict");
      }
      if (terminalDocument.exists && hashCanonicalBody(terminalDocument.data) !== hashCanonicalBody(terminal)) {
        throw new Error("delayed_terminal_replay_conflict");
      }
      if (!receiptDocument.exists) transaction.create(receiptKey(input.stableId, operation.receipt), operation.receipt);
      if (!terminalDocument.exists) transaction.create(terminalKey(input.stableId, terminal.accountScopeHash, input.operationId), terminal);
      return { replayed: true, receipt: operation.receipt };
    }
    const assignmentDocument = await transaction.get<DelayedAssignmentRecord>(
      `learning_v2_assignments:${input.stableId}:${input.assignmentRef.assignmentId}`,
    );
    const launchDocument = await transaction.get<DelayedLaunchRecord>(
      `learning_v2_launches:${input.stableId}:${input.launchReceiptRef.launchId}`,
    );
    let decision = input.serverDecision;
    const assignment = assignmentDocument.data;
    const launch = launchDocument.data;
    if (!assignmentDocument.exists || !assignment) {
      throw new Error("delayed_assignment_binding_unavailable");
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
    const terminal = buildTerminalRecord(input, receipt);
    transaction.create(receiptKey(input.stableId, receipt), receipt);
    transaction.create(terminalKey(input.stableId, terminal.accountScopeHash, input.operationId), terminal);
    transaction.create(operationKey(input), {
      operationId: input.operationId,
      fingerprint: input.fingerprint,
      accountGeneration: input.accountGeneration,
      receiptHash: terminal.receiptHash,
      terminalStatus: terminal.terminalStatus,
      receipt,
    });
    return { replayed: false, receipt };
  });
}
