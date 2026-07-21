import {
  buildFailureReceiptRef,
  buildTimingReceiptRef,
  validateFailureReceipt,
  validateTimingReceipt,
} from "../modules/learning-v2/contracts/delayed_receipts";

const attemptRef = {
  schemaVersion: "v2-attempt-ref.v1" as const,
  opId: "delayed-op-1",
  attemptBodyHash: "a".repeat(64),
};
const keys = ["letk1.alpha", "letk1.beta"];
const assignmentRef = {
  assignmentId: "assignment-1",
  contentHash: "b".repeat(64),
};
const launchReceiptRef = { launchId: "launch-1", contentHash: "c".repeat(64) };
const probeRef = { probeId: "probe-1", contentHash: "d".repeat(64) };
const resolutions = keys.map((tupleKey) => ({
  tupleKey,
  sourceCandidateDisposition: "assessed_candidate" as const,
  terminalDisposition: "assessed" as const,
}));

describe("Learning V2 delayed receipt contracts", () => {
  test("pins timing receipt body to exact ref and candidate cardinality", () => {
    const body = {
      schemaVersion: "v2-delayed-probe-timing-receipt.v1" as const,
      timingReceiptId: "timing-1",
      assignmentRef,
      launchReceiptRef,
      attemptRef,
      acceptedAtServer: "2026-07-16T00:00:00.000Z",
      observedDelayMs: 259200000,
      assessmentTiming: "inside_pinned_window" as const,
      windowPolicyId: "HYP-V2-007",
      terminalTupleResolutions: resolutions,
    };
    const ref = buildTimingReceiptRef(body);
    expect(validateTimingReceipt(body, ref, keys, attemptRef)).toEqual({
      ok: true,
    });
    expect(
      validateTimingReceipt(
        { ...body, terminalTupleResolutions: resolutions.slice(0, 1) },
        ref,
        keys,
        attemptRef,
      ),
    ).toEqual({ ok: false });
    expect(
      validateTimingReceipt(
        body,
        { ...ref, contentHash: "0".repeat(64) },
        keys,
        attemptRef,
      ),
    ).toEqual({ ok: false });
  });

  test("keeps protocol rejection receipt resolution-free and validates system resolution set", () => {
    const protocolBody = {
      schemaVersion: "v2-delayed-probe-failure-receipt.v1" as const,
      failureReceiptId: "failure-protocol-1",
      attemptRef,
      probeRef,
      claimedAssignmentRef: assignmentRef,
      claimedLaunchReceiptRef: launchReceiptRef,
      decision: {
        kind: "protocol_rejection" as const,
        reasonCode: "attempt_hash_mismatch" as const,
      },
      rejectedAtServer: "2026-07-16T00:00:00.000Z",
    };
    const protocolRef = buildFailureReceiptRef(protocolBody);
    expect(
      validateFailureReceipt(protocolBody, protocolRef, [], attemptRef),
    ).toEqual({
      ok: true,
    });
    expect(
      validateFailureReceipt(protocolBody, protocolRef, keys, attemptRef),
    ).toEqual({
      ok: true,
    });

    const systemBody = {
      ...protocolBody,
      failureReceiptId: "failure-system-1",
      decision: {
        kind: "system_non_assessment" as const,
        reasonCode: "launch_expired" as const,
        terminalTupleResolutions: resolutions.map((resolution) => ({
          ...resolution,
          terminalDisposition: "not_assessed_system" as const,
        })),
      },
    };
    const systemRef = buildFailureReceiptRef(systemBody);
    expect(
      validateFailureReceipt(systemBody, systemRef, keys, attemptRef),
    ).toEqual({
      ok: true,
    });
    expect(
      validateFailureReceipt(
        {
          ...systemBody,
          decision: { ...systemBody.decision, terminalTupleResolutions: [] },
        },
        systemRef,
        keys,
        attemptRef,
      ),
    ).toEqual({ ok: false });
  });
});
