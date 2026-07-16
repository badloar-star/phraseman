import { hashCanonicalBody } from "../policies/decision_registry";
import type { CanonicalAttemptRef } from "./attempt";

export interface V2DelayedProbeRef {
  readonly probeId: string;
  readonly contentHash: string;
}
export interface V2DelayedProbeAssignmentRef {
  readonly assignmentId: string;
  readonly contentHash: string;
}
export interface V2DelayedProbeLaunchReceiptRef {
  readonly launchId: string;
  readonly contentHash: string;
}
export interface V2DelayedProbeTimingReceiptRef {
  readonly timingReceiptId: string;
  readonly contentHash: string;
}
export interface V2DelayedProbeFailureReceiptRef {
  readonly failureReceiptId: string;
  readonly contentHash: string;
}

export type DelayedTerminalResolution = {
  readonly tupleKey: string;
  readonly sourceCandidateDisposition:
    | "assessed_candidate"
    | "non_assessment_candidate";
  readonly terminalDisposition:
    | "assessed"
    | "non_assessment"
    | "not_assessed_for_window"
    | "not_assessed_system";
};

export interface V2DelayedProbeTimingReceiptBody {
  readonly schemaVersion: "v2-delayed-probe-timing-receipt.v1";
  readonly timingReceiptId: string;
  readonly assignmentRef: V2DelayedProbeAssignmentRef;
  readonly launchReceiptRef: V2DelayedProbeLaunchReceiptRef;
  readonly attemptRef: CanonicalAttemptRef;
  readonly acceptedAtServer: string;
  readonly observedDelayMs: number;
  readonly assessmentTiming: "inside_pinned_window" | "outside_pinned_window";
  readonly windowPolicyId: string;
  readonly terminalTupleResolutions: readonly DelayedTerminalResolution[];
}

export interface V2DelayedProbeFailureReceiptBody {
  readonly schemaVersion: "v2-delayed-probe-failure-receipt.v1";
  readonly failureReceiptId: string;
  readonly attemptRef: CanonicalAttemptRef;
  readonly probeRef: V2DelayedProbeRef;
  readonly claimedAssignmentRef: V2DelayedProbeAssignmentRef;
  readonly claimedLaunchReceiptRef: V2DelayedProbeLaunchReceiptRef;
  readonly decision:
    | {
        readonly kind: "system_non_assessment";
        readonly reasonCode:
          | "assignment_missing"
          | "assignment_stale"
          | "launch_missing"
          | "launch_expired"
          | "server_timing_unavailable";
        readonly terminalTupleResolutions: readonly DelayedTerminalResolution[];
      }
    | {
        readonly kind: "protocol_rejection";
        readonly reasonCode:
          | "account_generation_mismatch"
          | "probe_ref_mismatch"
          | "activity_or_template_mismatch"
          | "declaration_or_provenance_mismatch"
          | "attempt_hash_mismatch";
      };
  readonly rejectedAtServer: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isNonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;
const isHash = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length &&
  Object.keys(value).every((key) => keys.includes(key));
const isRef = (value: unknown, keys: readonly string[]): boolean =>
  isRecord(value) &&
  exactKeys(value, keys) &&
  isNonEmpty(value[keys[0]]) &&
  isHash(value[keys[1]]);
const isTupleKey = (value: unknown): value is string =>
  typeof value === "string" && /^letk1\.[A-Za-z0-9_-]+$/.test(value);
const validResolution = (value: unknown): value is DelayedTerminalResolution =>
  isRecord(value) &&
  exactKeys(value, [
    "tupleKey",
    "sourceCandidateDisposition",
    "terminalDisposition",
  ]) &&
  isTupleKey(value.tupleKey) &&
  (value.sourceCandidateDisposition === "assessed_candidate" ||
    value.sourceCandidateDisposition === "non_assessment_candidate") &&
  [
    "assessed",
    "non_assessment",
    "not_assessed_for_window",
    "not_assessed_system",
  ].includes(String(value.terminalDisposition));
const validResolutions = (
  values: unknown,
): values is readonly DelayedTerminalResolution[] => {
  if (!Array.isArray(values)) return false;
  const keys = values.map((value) =>
    isRecord(value) ? value.tupleKey : undefined,
  );
  return values.every(validResolution) && new Set(keys).size === keys.length;
};
const validAttemptRef = (value: unknown): value is CanonicalAttemptRef =>
  isRecord(value) &&
  exactKeys(value, ["schemaVersion", "opId", "attemptBodyHash"]) &&
  value.schemaVersion === "v2-attempt-ref.v1" &&
  isNonEmpty(value.opId) &&
  isHash(value.attemptBodyHash);
const sameAttempt = (
  left: CanonicalAttemptRef,
  right: CanonicalAttemptRef,
): boolean =>
  left.schemaVersion === right.schemaVersion &&
  left.opId === right.opId &&
  left.attemptBodyHash === right.attemptBodyHash;
const validExpectedKeys = (keys: readonly string[]): boolean =>
  keys.every((key) => isTupleKey(key)) && new Set(keys).size === keys.length;
const validResolutionSemantics = (
  resolution: DelayedTerminalResolution,
  mode: "inside" | "outside" | "system",
): boolean =>
  mode === "inside"
    ? (resolution.sourceCandidateDisposition === "assessed_candidate" &&
        resolution.terminalDisposition === "assessed") ||
      (resolution.sourceCandidateDisposition === "non_assessment_candidate" &&
        resolution.terminalDisposition === "non_assessment")
    : mode === "outside"
      ? resolution.terminalDisposition === "not_assessed_for_window"
      : resolution.terminalDisposition === "not_assessed_system";

export const buildTimingReceiptRef = (
  body: V2DelayedProbeTimingReceiptBody,
): V2DelayedProbeTimingReceiptRef => ({
  timingReceiptId: body.timingReceiptId,
  contentHash: hashCanonicalBody(body),
});
export const buildFailureReceiptRef = (
  body: V2DelayedProbeFailureReceiptBody,
): V2DelayedProbeFailureReceiptRef => ({
  failureReceiptId: body.failureReceiptId,
  contentHash: hashCanonicalBody(body),
});

export const validateTimingReceipt = (
  body: V2DelayedProbeTimingReceiptBody,
  ref: V2DelayedProbeTimingReceiptRef,
  candidateTupleKeys: readonly string[],
  candidateAttemptRef: CanonicalAttemptRef,
): { readonly ok: boolean } => {
  const valid =
    isRecord(body) &&
    exactKeys(body, [
      "schemaVersion",
      "timingReceiptId",
      "assignmentRef",
      "launchReceiptRef",
      "attemptRef",
      "acceptedAtServer",
      "observedDelayMs",
      "assessmentTiming",
      "windowPolicyId",
      "terminalTupleResolutions",
    ]) &&
    body.schemaVersion === "v2-delayed-probe-timing-receipt.v1" &&
    isNonEmpty(body.timingReceiptId) &&
    isRef(body.assignmentRef, ["assignmentId", "contentHash"]) &&
    isRef(body.launchReceiptRef, ["launchId", "contentHash"]) &&
    validAttemptRef(body.attemptRef) &&
    isNonEmpty(body.acceptedAtServer) &&
    typeof body.observedDelayMs === "number" &&
    body.observedDelayMs >= 0 &&
    (body.assessmentTiming === "inside_pinned_window" ||
      body.assessmentTiming === "outside_pinned_window") &&
    isNonEmpty(body.windowPolicyId) &&
    validAttemptRef(candidateAttemptRef) &&
    sameAttempt(body.attemptRef, candidateAttemptRef) &&
    validExpectedKeys(candidateTupleKeys) &&
    validResolutions(body.terminalTupleResolutions) &&
    body.terminalTupleResolutions.every((resolution) =>
      validResolutionSemantics(
        resolution,
        body.assessmentTiming === "inside_pinned_window" ? "inside" : "outside",
      ),
    ) &&
    body.terminalTupleResolutions.length === candidateTupleKeys.length &&
    candidateTupleKeys.every((key) =>
      body.terminalTupleResolutions.some(
        (resolution) => resolution.tupleKey === key,
      ),
    );
  return {
    ok:
      !!valid &&
      isRef(ref, ["timingReceiptId", "contentHash"]) &&
      ref.timingReceiptId === body.timingReceiptId &&
      ref.contentHash === hashCanonicalBody(body),
  };
};

export const validateFailureReceipt = (
  body: V2DelayedProbeFailureReceiptBody,
  ref: V2DelayedProbeFailureReceiptRef,
  candidateTupleKeys: readonly string[],
  candidateAttemptRef: CanonicalAttemptRef,
): { readonly ok: boolean } => {
  const decision = body.decision;
  const base =
    isRecord(body) &&
    exactKeys(body, [
      "schemaVersion",
      "failureReceiptId",
      "attemptRef",
      "probeRef",
      "claimedAssignmentRef",
      "claimedLaunchReceiptRef",
      "decision",
      "rejectedAtServer",
    ]) &&
    body.schemaVersion === "v2-delayed-probe-failure-receipt.v1" &&
    isNonEmpty(body.failureReceiptId) &&
    validAttemptRef(body.attemptRef) &&
    isRef(body.probeRef, ["probeId", "contentHash"]) &&
    isRef(body.claimedAssignmentRef, ["assignmentId", "contentHash"]) &&
    isRef(body.claimedLaunchReceiptRef, ["launchId", "contentHash"]) &&
    isNonEmpty(body.rejectedAtServer) &&
    validAttemptRef(candidateAttemptRef) &&
    sameAttempt(body.attemptRef, candidateAttemptRef) &&
    validExpectedKeys(candidateTupleKeys) &&
    isRecord(decision);
  const decisionOk =
    base && decision.kind === "protocol_rejection"
      ? exactKeys(decision, ["kind", "reasonCode"]) &&
        [
          "account_generation_mismatch",
          "probe_ref_mismatch",
          "activity_or_template_mismatch",
          "declaration_or_provenance_mismatch",
          "attempt_hash_mismatch",
        ].includes(String(decision.reasonCode))
      : base && decision.kind === "system_non_assessment"
        ? exactKeys(decision, [
            "kind",
            "reasonCode",
            "terminalTupleResolutions",
          ]) &&
          [
            "assignment_missing",
            "assignment_stale",
            "launch_missing",
            "launch_expired",
            "server_timing_unavailable",
          ].includes(String(decision.reasonCode)) &&
          validResolutions(decision.terminalTupleResolutions) &&
          decision.terminalTupleResolutions.every((resolution) =>
            validResolutionSemantics(resolution, "system"),
          ) &&
          decision.terminalTupleResolutions.length ===
            candidateTupleKeys.length &&
          candidateTupleKeys.every((key) =>
            decision.terminalTupleResolutions.some(
              (resolution) => resolution.tupleKey === key,
            ),
          )
        : false;
  return {
    ok:
      !!decisionOk &&
      isRef(ref, ["failureReceiptId", "contentHash"]) &&
      ref.failureReceiptId === body.failureReceiptId &&
      ref.contentHash === hashCanonicalBody(body),
  };
};
