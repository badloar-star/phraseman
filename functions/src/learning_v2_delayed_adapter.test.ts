import {
  buildCanonicalAttemptRef,
  sanitizeAttemptBody,
} from "../../modules/learning-v2/contracts/attempt";
import { buildLearningEvidenceTupleKey } from "../../modules/learning-v2/contracts/evidence";
import {
  finalizeDelayedCandidate,
  type DelayedReceiptRepository,
} from "./learning_v2_delayed_adapter";

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
  opId: "adapter-op-1",
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
const assignmentRef = {
  assignmentId: "assignment-1",
  contentHash: "a".repeat(64),
};
const launchReceiptRef = { launchId: "launch-1", contentHash: "b".repeat(64) };
const probeRef = { probeId: "probe-1", contentHash: "c".repeat(64) };

function repository(seed: Record<string, unknown>): DelayedReceiptRepository {
  const documents = new Map(Object.entries(seed));
  return {
    runTransaction: async (fn) =>
      fn({
        get: async <T>(key: string) => ({
          exists: documents.has(key),
          data: documents.get(key) as T | undefined,
        }),
        create: (key, value) => {
          if (documents.has(key)) throw new Error("already_exists");
          documents.set(key, value);
        },
      }),
  };
}

const input = (overrides: Record<string, unknown> = {}) => ({
  operationId: "operation-1",
  fingerprint: "d".repeat(64),
  stableId: "stable-1",
  accountGeneration: 3,
  candidate,
  expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)],
  assignmentRef,
  launchReceiptRef,
  probeRef,
  timingReceiptId: "timing-1",
  failureReceiptId: "failure-1",
  acceptedAtServer: "2026-07-16T00:00:00.000Z",
  observedDelayMs: 259200000,
  windowPolicyId: "HYP-V2-007",
  serverDecision: {
    kind: "timed" as const,
    window: "inside_pinned_window" as const,
  },
  ...overrides,
});
const records = {
  "learning_v2_assignments:assignment-1": {
    ref: assignmentRef,
    stableId: "stable-1",
    accountGeneration: 3,
    probeRef,
    expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)],
    assessableWindowOpensAtMs: 1000,
    assessableWindowClosesAtMs: 2000,
  },
  "learning_v2_launches:launch-1": {
    ref: launchReceiptRef,
    stableId: "stable-1",
    accountGeneration: 3,
    probeRef,
    expiresAtMs: 5000,
  },
};

describe("Learning V2 delayed Functions adapter", () => {
  test("persists receipt and replays idempotently", async () => {
    const repo = repository(records);
    const first = await finalizeDelayedCandidate(repo, input());
    const second = await finalizeDelayedCandidate(repo, input());
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.receipt).toEqual(first.receipt);
  });

  test("rejects same operation id with a different fingerprint", async () => {
    const repo = repository(records);
    await finalizeDelayedCandidate(repo, input());
    await expect(
      finalizeDelayedCandidate(repo, input({ fingerprint: "e".repeat(64) })),
    ).rejects.toThrow("delayed_operation_replay_mismatch");
  });

  test("fails closed when assignment binding is unavailable", async () => {
    const repo = repository({});
    await expect(
      finalizeDelayedCandidate(
        repo,
        input({
          serverDecision: { kind: "timed", window: "inside_pinned_window" },
        }),
      ),
    ).rejects.toThrow("delayed_assignment_binding_unavailable");
  });

  test("uses server window classification instead of the caller decision", async () => {
    const repo = repository(records);
    const result = await finalizeDelayedCandidate(
      repo,
      input({
        nowMs: 3000,
        serverDecision: { kind: "timed", window: "inside_pinned_window" },
      }),
    );
    expect(result.receipt.kind).toBe("timing");
    if (result.receipt.kind === "timing")
      expect(result.receipt.body.assessmentTiming).toBe(
        "outside_pinned_window",
      );
  });

  test("surfaces a transaction collision instead of duplicating a receipt", async () => {
    const repo = repository(records);
    const results = await Promise.allSettled([
      finalizeDelayedCandidate(repo, input()),
      finalizeDelayedCandidate(repo, input()),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect(
      results.filter((result) => result.status === "rejected"),
    ).toHaveLength(1);
    expect(
      (
        results.find(
          (result) => result.status === "rejected",
        ) as PromiseRejectedResult
      ).reason.message,
    ).toBe("already_exists");
  });

  test("receipt persistence remains replayable after a completed first attempt", async () => {
    const repo = repository(records);
    const first = await finalizeDelayedCandidate(repo, input());
    expect(first.replayed).toBe(false);
    const replay = await finalizeDelayedCandidate(repo, input());
    expect(replay).toMatchObject({ replayed: true, receipt: first.receipt });
  });
});
