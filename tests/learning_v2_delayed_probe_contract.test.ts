import {
  buildCanonicalAttemptRef,
  sanitizeAttemptBody,
} from "../modules/learning-v2/contracts/attempt";
import {
  buildLearningEvidenceTupleKey,
  type LearningEvidenceTupleIdentity,
} from "../modules/learning-v2/contracts/evidence";
import {
  resolveDelayedTerminal,
  validateDelayedAttemptCandidate,
} from "../modules/learning-v2/contracts/delayed_probe";

const binding: LearningEvidenceTupleIdentity = {
  nodeId: "probe-node-1",
  objectiveId: "objective-1",
  skillId: "skill-1",
  construct: "semantic",
  phase: "delayed_probe",
  targetKind: "objective",
  targetId: "objective-1",
};
const candidateBody = sanitizeAttemptBody({
  schemaVersion: "v2-attempt-body.v1",
  opId: "delayed-candidate-1",
  attemptSurface: { kind: "scheduled_delayed_probe" },
  outcome: { resultCode: "CORRECT" },
  evidence: { hintsUsed: 0 },
  provenance: { phase: "delayed_probe" },
  inputBinding: { source: "keyboard" },
  delayedCandidates: [
    {
      candidateId: "candidate-1",
      binding,
      candidateOutcome: { resultCode: "CORRECT" },
      candidateEvidence: { hintsUsed: 0 },
    },
  ],
});
const candidate = {
  schemaVersion: "v2-delayed-attempt-candidate.v1" as const,
  attemptBody: candidateBody,
  attemptRef: buildCanonicalAttemptRef(candidateBody),
};
const tupleKey = buildLearningEvidenceTupleKey(binding);

describe("Learning V2 delayed probe contract", () => {
  test("keeps canonical client candidate separate from server terminal resolution", () => {
    expect(validateDelayedAttemptCandidate(candidate, [tupleKey]).ok).toBe(
      true,
    );
    expect(
      validateDelayedAttemptCandidate({
        ...candidate,
        timingReceiptRef: "forbidden",
      }).ok,
    ).toBe(false);
    expect(
      resolveDelayedTerminal(candidate, "outside_pinned_window", [tupleKey]),
    ).toMatchObject({
      ok: true,
      resolutions: [
        {
          tupleKey,
          sourceCandidateDisposition: "assessed_candidate",
          terminalDisposition: "not_assessed_for_window",
        },
      ],
    });
  });

  test("rejects candidate hash mismatch and unknown expected tuple", () => {
    expect(
      validateDelayedAttemptCandidate(
        {
          ...candidate,
          attemptRef: {
            ...candidate.attemptRef,
            attemptBodyHash: "0".repeat(64),
          },
        },
        [tupleKey],
      ).ok,
    ).toBe(false);
    expect(
      validateDelayedAttemptCandidate(candidate, ["letk1.unknown"]).ok,
    ).toBe(false);
  });
});
