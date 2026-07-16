import {
  buildCanonicalAttemptRef,
  sanitizeAttemptBody,
} from "../modules/learning-v2/contracts/attempt";
import { buildLearningEvidenceTupleKey } from "../modules/learning-v2/contracts/evidence";
import { adjudicateDelayedCandidate } from "../modules/learning-v2/contracts/delayed_runtime";

const binding = {
  nodeId: "probe-node-1",
  objectiveId: "objective-1",
  skillId: "skill-1",
  construct: "semantic" as const,
  phase: "delayed_probe" as const,
  targetKind: "objective" as const,
  targetId: "objective-1",
};
const body = sanitizeAttemptBody({
  schemaVersion: "v2-attempt-body.v1",
  opId: "runtime-candidate-1",
  attemptSurface: { kind: "scheduled_delayed_probe" },
  outcome: { resultCode: "CORRECT" },
  evidence: { hintsUsed: 0 },
  provenance: { phase: "delayed_probe" },
  inputBinding: { source: "keyboard" },
  delayedCandidates: [
    {
      candidateId: "c1",
      binding,
      candidateOutcome: { resultCode: "CORRECT" },
      candidateEvidence: { hintsUsed: 0 },
    },
  ],
});
const candidate = {
  schemaVersion: "v2-delayed-attempt-candidate.v1" as const,
  attemptBody: body,
  attemptRef: buildCanonicalAttemptRef(body),
};
const context = {
  candidate,
  expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)],
  assignmentRef: { assignmentId: "a1", contentHash: "a".repeat(64) },
  launchReceiptRef: { launchId: "l1", contentHash: "b".repeat(64) },
  probeRef: { probeId: "p1", contentHash: "c".repeat(64) },
  timingReceiptId: "t1",
  failureReceiptId: "f1",
  acceptedAtServer: "2026-07-16T00:00:00.000Z",
  observedDelayMs: 259200000,
  windowPolicyId: "HYP-V2-007",
};

describe("Learning V2 delayed runtime adjudicator", () => {
  test("creates hash-pinned timing receipt for a valid inside-window candidate", () => {
    const result = adjudicateDelayedCandidate(context, {
      kind: "timed",
      window: "inside_pinned_window",
    });
    expect(result.kind).toBe("timing");
    if (result.kind === "timing") {
      expect(result.ref.contentHash).toMatch(/^[a-f0-9]{64}$/);
      expect(result.body.terminalTupleResolutions).toHaveLength(1);
    }
  });

  test("protocol rejection is receipt-only and system failure materializes non-assessment", () => {
    const protocol = adjudicateDelayedCandidate(context, {
      kind: "protocol_rejection",
      reasonCode: "attempt_hash_mismatch",
    });
    expect(protocol.kind).toBe("failure");
    if (protocol.kind === "failure") {
      expect(protocol.body.decision.kind).toBe("protocol_rejection");
    }
    const system = adjudicateDelayedCandidate(context, {
      kind: "system_failure",
      reasonCode: "launch_expired",
    });
    expect(system.kind).toBe("failure");
    if (
      system.kind === "failure" &&
      system.body.decision.kind === "system_non_assessment"
    ) {
      expect(
        system.body.decision.terminalTupleResolutions[0].terminalDisposition,
      ).toBe("not_assessed_system");
    }
  });
});
