import { createProgressOutbox } from "../modules/learning-v2/progress/progress_outbox";
import { adjudicateDelayedCandidate } from "../modules/learning-v2/contracts/delayed_runtime";
import { buildCanonicalAttemptRef, sanitizeAttemptBody } from "../modules/learning-v2/contracts/attempt";
import { buildLearningEvidenceTupleKey } from "../modules/learning-v2/contracts/evidence";

const scope = { stableId: "delayed-user", accountScopeHash: "dddddddddddddddd", seasonId: "season-1", studyTarget: "en", learnerSourceLocale: "ru", generation: 1 } as const;
const binding = { nodeId: "n1", objectiveId: "o1", skillId: "s1", construct: "semantic" as const, phase: "delayed_probe" as const, targetKind: "objective" as const, targetId: "o1" };
const attemptBody = sanitizeAttemptBody({
  schemaVersion: "v2-attempt-body.v1", opId: "delayed-two-phase-1", attemptSurface: { kind: "scheduled_delayed_probe" },
  outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "delayed_probe" }, inputBinding: { source: "keyboard" },
  delayedCandidates: [{ candidateId: "c1", binding, candidateOutcome: { resultCode: "CORRECT" }, candidateEvidence: { hintsUsed: 0 } }],
});
const candidate = { schemaVersion: "v2-delayed-attempt-candidate.v1" as const, attemptBody, attemptRef: buildCanonicalAttemptRef(attemptBody) };
const context = {
  candidate, expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)], assignmentRef: { assignmentId: "a1", contentHash: "a".repeat(64) },
  launchReceiptRef: { launchId: "l1", contentHash: "b".repeat(64) }, probeRef: { probeId: "p1", contentHash: "c".repeat(64) },
  timingReceiptId: "timing-1", failureReceiptId: "failure-1", acceptedAtServer: "2026-07-17T00:00:00.000Z", observedDelayMs: 1000, windowPolicyId: "window-1",
};

describe("Learning V2 delayed probe two-phase protocol", () => {
  test("keeps candidate pending until one terminal timing acknowledgement", async () => {
    let stored: string | null = null;
    const storage = { getItem: async () => stored, setItem: async (_key: string, value: string) => { stored = value; } };
    const outbox = createProgressOutbox(storage, (current) => current.stableId === scope.stableId && current.generation === scope.generation);
    await outbox.enqueue(scope, "delayed-mutation-1", candidate);
    const receipt = adjudicateDelayedCandidate(context, { kind: "timed", window: "inside_pinned_window" });
    expect(receipt.kind).toBe("timing");
    await outbox.acknowledge(scope, "delayed-mutation-1", "timed_finalized");
    await expect(outbox.acknowledge(scope, "delayed-mutation-1", "system_non_assessment_finalized")).resolves.toBeUndefined();
    expect((await outbox.list(scope))[0]).toMatchObject({ status: "terminal", terminalStatus: "timed_finalized" });
  });

  test("system failure produces non-assessment receipt without learning mastery", () => {
    const receipt = adjudicateDelayedCandidate(context, { kind: "system_failure", reasonCode: "launch_expired" });
    expect(receipt.kind).toBe("failure");
    if (receipt.kind === "failure" && receipt.body.decision.kind === "system_non_assessment") {
      expect(receipt.body.decision.terminalTupleResolutions[0].terminalDisposition).toBe("not_assessed_system");
    }
  });
});
