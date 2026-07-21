import {
  buildFailureReceiptRef,
  buildTimingReceiptRef,
  type V2DelayedProbeAssignmentRef,
  type V2DelayedProbeFailureReceiptBody,
  type V2DelayedProbeFailureReceiptRef,
  type V2DelayedProbeLaunchReceiptRef,
  type V2DelayedProbeRef,
  type V2DelayedProbeTimingReceiptBody,
  type V2DelayedProbeTimingReceiptRef,
  type DelayedTerminalResolution,
  validateFailureReceipt,
  validateTimingReceipt,
} from "./delayed_receipts";
import {
  resolveDelayedTerminal,
  validateDelayedAttemptCandidate,
  type V2DelayedTerminalWindow,
} from "./delayed_probe";

export type DelayedProtocolRejectionReason =
  | "account_generation_mismatch"
  | "probe_ref_mismatch"
  | "activity_or_template_mismatch"
  | "declaration_or_provenance_mismatch"
  | "attempt_hash_mismatch";
export type DelayedSystemFailureReason =
  | "assignment_missing"
  | "assignment_stale"
  | "launch_missing"
  | "launch_expired"
  | "server_timing_unavailable";

export type DelayedRuntimeReceipt =
  | {
      readonly kind: "timing";
      readonly body: V2DelayedProbeTimingReceiptBody;
      readonly ref: V2DelayedProbeTimingReceiptRef;
    }
  | {
      readonly kind: "failure";
      readonly body: V2DelayedProbeFailureReceiptBody;
      readonly ref: V2DelayedProbeFailureReceiptRef;
    };

export interface DelayedRuntimeContext {
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
}

const nonEmpty = (value: string): boolean => value.length > 0;

const makeSystemResolutions = (
  candidate: Readonly<Record<string, unknown>>,
  expectedTupleKeys: readonly string[],
) => {
  const resolved = resolveDelayedTerminal(
    candidate,
    "system_failure",
    expectedTupleKeys,
  );
  if (!resolved.ok) throw new Error("delayed_candidate_invalid");
  return resolved.resolutions.filter(
    (resolution) => resolution.terminalDisposition !== "no_record",
  );
};

export const adjudicateDelayedCandidate = (
  context: DelayedRuntimeContext,
  decision:
    | { readonly kind: "timed"; readonly window: V2DelayedTerminalWindow }
    | {
        readonly kind: "system_failure";
        readonly reasonCode: DelayedSystemFailureReason;
      }
    | {
        readonly kind: "protocol_rejection";
        readonly reasonCode: DelayedProtocolRejectionReason;
      },
): DelayedRuntimeReceipt => {
  if (
    !nonEmpty(context.timingReceiptId) ||
    !nonEmpty(context.failureReceiptId) ||
    !nonEmpty(context.acceptedAtServer) ||
    !Number.isFinite(context.observedDelayMs) ||
    context.observedDelayMs < 0 ||
    !nonEmpty(context.windowPolicyId) ||
    !validateDelayedAttemptCandidate(
      context.candidate,
      context.expectedTupleKeys,
    ).ok
  )
    throw new Error("delayed_runtime_context_invalid");

  const parsedAttemptRef = context.candidate.attemptRef;
  if (typeof parsedAttemptRef !== "object" || parsedAttemptRef === null)
    throw new Error("delayed_candidate_attempt_ref_missing");
  if (decision.kind === "timed") {
    const resolved = resolveDelayedTerminal(
      context.candidate,
      decision.window,
      context.expectedTupleKeys,
    );
    if (!resolved.ok) throw new Error("delayed_candidate_invalid");
    const body: V2DelayedProbeTimingReceiptBody = {
      schemaVersion: "v2-delayed-probe-timing-receipt.v1",
      timingReceiptId: context.timingReceiptId,
      assignmentRef: context.assignmentRef,
      launchReceiptRef: context.launchReceiptRef,
      attemptRef:
        parsedAttemptRef as V2DelayedProbeTimingReceiptBody["attemptRef"],
      acceptedAtServer: context.acceptedAtServer,
      observedDelayMs: context.observedDelayMs,
      assessmentTiming:
        decision.window === "inside_pinned_window"
          ? "inside_pinned_window"
          : "outside_pinned_window",
      windowPolicyId: context.windowPolicyId,
      terminalTupleResolutions: resolved.resolutions.filter(
        (resolution) => resolution.terminalDisposition !== "no_record",
      ) as readonly DelayedTerminalResolution[],
    };
    const ref = buildTimingReceiptRef(body);
    const materializedKeys = body.terminalTupleResolutions.map(
      (resolution) => resolution.tupleKey,
    );
    if (!validateTimingReceipt(body, ref, materializedKeys, body.attemptRef))
      throw new Error("delayed_timing_receipt_invalid");
    return { kind: "timing", body, ref };
  }

  const body: V2DelayedProbeFailureReceiptBody = {
    schemaVersion: "v2-delayed-probe-failure-receipt.v1",
    failureReceiptId: context.failureReceiptId,
    attemptRef:
      parsedAttemptRef as V2DelayedProbeFailureReceiptBody["attemptRef"],
    probeRef: context.probeRef,
    claimedAssignmentRef: context.assignmentRef,
    claimedLaunchReceiptRef: context.launchReceiptRef,
    decision:
      decision.kind === "protocol_rejection"
        ? { kind: "protocol_rejection", reasonCode: decision.reasonCode }
        : {
            kind: "system_non_assessment",
            reasonCode: decision.reasonCode,
            terminalTupleResolutions: makeSystemResolutions(
              context.candidate,
              context.expectedTupleKeys,
            ) as readonly DelayedTerminalResolution[],
          },
    rejectedAtServer: context.acceptedAtServer,
  };
  const ref = buildFailureReceiptRef(body);
  const nonSkippedKeys =
    decision.kind === "protocol_rejection"
      ? []
      : makeSystemResolutions(context.candidate, context.expectedTupleKeys).map(
          (resolution) => resolution.tupleKey,
        );
  if (!validateFailureReceipt(body, ref, nonSkippedKeys, body.attemptRef))
    throw new Error("delayed_failure_receipt_invalid");
  return { kind: "failure", body, ref };
};
