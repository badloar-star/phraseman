import { deriveProgressAccountScopeHash } from "./progress_event";
import {
  adjudicateDelayedCandidate,
  type DelayedProtocolRejectionReason,
  type DelayedRuntimeContext,
  type DelayedRuntimeReceipt,
  type DelayedSystemFailureReason,
} from "../../../modules/learning-v2/contracts/delayed_runtime";
import { validateDelayedAttemptCandidate } from "../../../modules/learning-v2/contracts/delayed_probe";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import type { ProgressEvidenceBundle } from "./progress_event_evidence";
import type { V2DelayedAttemptEventBody } from "../../../modules/learning-v2/contracts/attempt";
import type { LearningEvidenceBody, LearningNonAssessmentBody } from "../../../modules/learning-v2/contracts/evidence";
import { buildLearningEvidenceTupleKey } from "../../../modules/learning-v2/contracts/evidence";

export type DelayedServerDecision =
  | { readonly kind: "timed"; readonly window: "inside_pinned_window" | "outside_pinned_window" }
  | { readonly kind: "system_failure"; readonly reasonCode: DelayedSystemFailureReason }
  | { readonly kind: "protocol_rejection"; readonly reasonCode: DelayedProtocolRejectionReason };

export interface DelayedProbeIngestionRequest {
  readonly stableUid: string;
  readonly accountGeneration: number;
  readonly accountScopeHash: string;
  readonly mutationId: string;
  /** Untrusted client candidate; the resolver must build context from canonical server state. */
  readonly candidate: Readonly<Record<string, unknown>>;
  readonly context: DelayedRuntimeContext;
}

export interface DelayedProbeTerminalRecord {
  readonly schemaVersion: "v2-delayed-probe-terminal.v1";
  readonly mutationId: string;
  readonly accountScopeHash: string;
  readonly accountGeneration: number;
  readonly receipt: DelayedRuntimeReceipt;
  readonly receiptHash: string;
  readonly terminalStatus: "timed_finalized" | "system_non_assessment_finalized" | "protocol_rejected";
}

export interface DelayedProbeIngestionStore {
  read(mutationId: string): Promise<DelayedProbeTerminalRecord | undefined>;
  create(record: DelayedProbeTerminalRecord): Promise<void>;
}

export interface DelayedProbeIngestionDependencies {
  readonly resolveDecision: (request: DelayedProbeIngestionRequest) => Promise<DelayedServerDecision> | DelayedServerDecision;
}

/**
 * Materializes the delayed candidate only after the immutable terminal receipt
 * exists.  The candidate is used solely to recover tuple identity and the
 * server receipt owns timing/disposition; SKIPPED/no_record never becomes a
 * LearningEvidence or non-assessment reference.
 */
export const materializeDelayedTerminalEvidence = (
  attemptBody: V2DelayedAttemptEventBody,
  terminal: DelayedProbeTerminalRecord,
): ProgressEvidenceBundle => {
  const receipt = terminal.receipt;
  const resolutions = receipt.kind === "timing"
    ? receipt.body.terminalTupleResolutions
    : receipt.body.decision.kind === "system_non_assessment"
      ? receipt.body.decision.terminalTupleResolutions
      : [];
  const byTuple = new Map(attemptBody.delayedCandidates.map((candidate) => [
    buildLearningEvidenceTupleKey(candidate.binding), candidate,
  ]));
  const evidenceBodies: LearningEvidenceBody[] = [];
  const nonAssessmentBodies: LearningNonAssessmentBody[] = [];
  for (const resolution of resolutions) {
    const candidate = byTuple.get(resolution.tupleKey as `letk1.${string}`);
    if (!candidate) continue;
    const sourceAttempt = receipt.body.attemptRef;
    const candidateHash = hashCanonicalBody(candidate);
    const base = { ...candidate.binding, sourceAttempt, phase: "delayed_probe" as const };
    if (resolution.terminalDisposition === "assessed") {
      evidenceBodies.push({
        schemaVersion: "learning-evidence-body.v1",
        ...base,
        observationId: `${receipt.kind === "timing" ? receipt.body.timingReceiptId : receipt.body.failureReceiptId}:${candidate.candidateId}`,
        assessmentStatus: "assessed",
        outcome: ["CORRECT", "COMPLETED", "PASS_CONFIDENT"].includes(candidate.candidateOutcome.resultCode) ? "success" : "needs_work",
        policyId: "delayed-window.v1",
        policyVersion: 1,
        provenance: { phase: "delayed_probe", support: { hintsUsed: 0 }, context: { contextId: receipt.kind === "timing" ? receipt.body.assignmentRef.assignmentId : receipt.body.probeRef.probeId }, prompt: { promptId: candidate.candidateId } },
        route: attemptBody.inputBinding.source === "microphone"
          ? { kind: "voice", input: { source: "microphone", runtimeEvidenceRef: { runtimeEvidenceHash: candidateHash, sourceAttempt } } }
          : { kind: "non_voice", input: { source: attemptBody.inputBinding.source as "tap" | "word_bank" | "keyboard" | "accessibility_alternative", runtimeEvidenceRef: { runtimeEvidenceHash: candidateHash, sourceAttempt } } },
        timing: receipt.kind === "timing" ? { occurredAtServer: receipt.body.acceptedAtServer, assignmentRef: receipt.body.assignmentRef.assignmentId, launchReceiptRef: receipt.body.launchReceiptRef.launchId, timingReceiptRef: receipt.body.timingReceiptId } : { occurredAt: receipt.body.rejectedAtServer },
      });
      continue;
    }
    const outside = resolution.terminalDisposition === "not_assessed_for_window";
    nonAssessmentBodies.push({
      schemaVersion: "learning-non-assessment-body.v1",
      ...base,
      nonAssessmentId: `${receipt.kind === "timing" ? receipt.body.timingReceiptId : receipt.body.failureReceiptId}:${candidate.candidateId}`,
      occurredAt: receipt.kind === "timing" ? receipt.body.acceptedAtServer : receipt.body.rejectedAtServer,
      assessmentStatus: outside ? "not_assessed_for_window" : receipt.kind === "failure" ? "not_assessed_system" : "invalid",
      reasonCode: outside ? "outside_pinned_assessment_window" : (receipt.kind === "failure" && receipt.body.decision.kind === "system_non_assessment" ? receipt.body.decision.reasonCode : "uncertain_measurement"),
      ...(outside && receipt.kind === "timing" ? { assignmentRef: receipt.body.assignmentRef.assignmentId, launchReceiptRef: receipt.body.launchReceiptRef.launchId, timingReceiptRef: receipt.body.timingReceiptId } : {}),
      ...(!outside && receipt.kind === "failure" ? { failureReceiptRef: receipt.body.failureReceiptId } : {}),
    });
  }
  return { schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef: receipt.body.attemptRef, evidenceBodies, nonAssessmentBodies };
};


const mutationIdValid = (value: string): boolean => /^[A-Za-z0-9._:-]{8,160}$/.test(value);
const sameAttempt = (candidate: Readonly<Record<string, unknown>>, context: DelayedRuntimeContext): boolean => {
  const candidateRef = candidate.attemptRef as Record<string, unknown> | undefined;
  const contextRef = context.candidate.attemptRef as Record<string, unknown> | undefined;
  return !!candidateRef && !!contextRef && candidateRef.schemaVersion === contextRef.schemaVersion && candidateRef.opId === contextRef.opId && candidateRef.attemptBodyHash === contextRef.attemptBodyHash;
};

/**
 * Server-only terminal ingestion. The caller resolves timing/assignment state;
 * clients provide only the hash-bound candidate. No evidence or projection is
 * accepted here; those can be materialized only after this receipt exists.
 */
export const ingestDelayedProbeTerminal = async (
  store: DelayedProbeIngestionStore,
  request: DelayedProbeIngestionRequest,
  dependencies: DelayedProbeIngestionDependencies,
): Promise<{ readonly accepted: true; readonly duplicate: boolean; readonly record: DelayedProbeTerminalRecord }> => {
  if (!mutationIdValid(request.mutationId)) throw new Error("delayed_mutation_id_invalid");
  const expectedScope = deriveProgressAccountScopeHash(request.stableUid, request.accountGeneration);
  if (request.accountScopeHash !== expectedScope) throw new Error("delayed_account_generation_mismatch");
  if (!validateDelayedAttemptCandidate(request.candidate, request.context.expectedTupleKeys).ok) throw new Error("delayed_candidate_invalid");
  if (!sameAttempt(request.candidate, request.context)) throw new Error("delayed_candidate_substitution");

  const existing = await store.read(request.mutationId);
  if (existing) {
    if (existing.accountScopeHash !== request.accountScopeHash || hashCanonicalBody(existing.receipt) !== existing.receiptHash) throw new Error("delayed_terminal_record_invalid");
    return { accepted: true, duplicate: true, record: existing };
  }

  const decision = await dependencies.resolveDecision(request);
  const receipt = adjudicateDelayedCandidate(request.context, decision);
  const terminalStatus = receipt.kind === "timing"
    ? "timed_finalized" as const
    : receipt.body.decision.kind === "system_non_assessment"
      ? "system_non_assessment_finalized" as const
      : "protocol_rejected" as const;
  const record: DelayedProbeTerminalRecord = Object.freeze({
    schemaVersion: "v2-delayed-probe-terminal.v1",
    mutationId: request.mutationId,
    accountScopeHash: request.accountScopeHash,
    accountGeneration: request.accountGeneration,
    receipt,
    receiptHash: hashCanonicalBody(receipt),
    terminalStatus,
  });
  await store.create(record);
  return { accepted: true, duplicate: false, record };
};
