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

function repository(seed: Record<string, unknown>): DelayedReceiptRepository & {
  readonly documents: Map<string, unknown>;
  readonly reads: string[];
  readonly writes: string[];
} {
  const documents = new Map(Object.entries(seed));
  const reads: string[] = [];
  const writes: string[] = [];
  return {
    documents,
    reads,
    writes,
    runTransaction: async (fn) =>
      fn({
        get: async <T>(key: string) => {
          reads.push(key);
          return {
            exists: documents.has(key),
            data: documents.get(key) as T | undefined,
          };
        },
        create: (key, value) => {
          if (documents.has(key)) throw new Error("already_exists");
          writes.push(key);
          documents.set(key, value);
        },
      }),
  };
}

const input = (overrides: Record<string, unknown> = {}) => ({
  operationId: "operation-1",
  fingerprint: "d".repeat(64),
  authUid: "provider-auth-1",
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
  "auth_links:provider-auth-1": {
    stable_id: "stable-1",
  },
  "users:stable-1": {
    accountGeneration: 3,
  },
  "learning_v2_assignments:stable-1:assignment-1": {
    ref: assignmentRef,
    stableId: "stable-1",
    accountGeneration: 3,
    probeRef,
    expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)],
    assessableWindowOpensAtMs: 1000,
    assessableWindowClosesAtMs: 2000,
  },
  "learning_v2_launches:stable-1:launch-1": {
    ref: launchReceiptRef,
    stableId: "stable-1",
    accountGeneration: 3,
    probeRef,
    expiresAtMs: 5000,
  },
};

describe("Learning V2 delayed Functions adapter", () => {
  test.each([
    [
      "provider relink",
      {
        ...records,
        "auth_links:provider-auth-1": { stable_id: "different-stable" },
      },
      "delayed_stable_identity_mismatch",
    ],
    [
      "account generation change",
      {
        ...records,
        "users:stable-1": { accountGeneration: 4 },
      },
      "delayed_account_generation_mismatch",
    ],
    [
      "deletion tombstone",
      {
        ...records,
        "account_deletion_tombstones:stable-1": { status: "pending" },
      },
      "delayed_account_delete_pending",
    ],
  ])(
    "fails closed with ordered barrier reads and zero writes after a pre-read %s",
    async (_label, racedRecords, expectedError) => {
      const repo = repository(racedRecords);

      await expect(finalizeDelayedCandidate(repo, input()))
        .rejects.toThrow(expectedError);

      expect(repo.reads).toEqual([
        "auth_links:provider-auth-1",
        "users:stable-1",
        "account_deletion_tombstones:stable-1",
      ]);
      expect(repo.writes).toEqual([]);
      expect([...repo.documents.keys()].some((key) =>
        key.startsWith("learning-v2:delayed:stable-1:"))).toBe(false);
      expect([...repo.documents.keys()].some((key) =>
        key.startsWith("learning_v2_delayed_terminals:stable-1:"))).toBe(false);
      expect([...repo.documents.keys()].some((key) =>
        key.startsWith("learning_v2_timing_receipts:stable-1:"))).toBe(false);
    },
  );

  test("persists receipt and replays idempotently", async () => {
    const repo = repository(records);
    const first = await finalizeDelayedCandidate(repo, input());
    const second = await finalizeDelayedCandidate(repo, input());
    expect(first.replayed).toBe(false);
    expect(second.replayed).toBe(true);
    expect(second.receipt).toEqual(first.receipt);
  });

  test("blocks replay success and replay repair after a deletion tombstone", async () => {
    const repo = repository(records);
    await finalizeDelayedCandidate(repo, input());
    repo.documents.delete("learning_v2_timing_receipts:stable-1:timing-1");
    repo.documents.set("account_deletion_tombstones:stable-1", {
      status: "pending",
    });
    repo.reads.length = 0;
    repo.writes.length = 0;

    await expect(finalizeDelayedCandidate(repo, input()))
      .rejects.toThrow("delayed_account_delete_pending");

    expect(repo.reads).toEqual([
      "auth_links:provider-auth-1",
      "users:stable-1",
      "account_deletion_tombstones:stable-1",
    ]);
    expect(repo.writes).toEqual([]);
    expect(repo.documents.has("learning_v2_timing_receipts:stable-1:timing-1"))
      .toBe(false);
  });

  test("rejects same operation id with a different fingerprint", async () => {
    const repo = repository(records);
    await finalizeDelayedCandidate(repo, input());
    await expect(
      finalizeDelayedCandidate(repo, input({ fingerprint: "e".repeat(64) })),
    ).rejects.toThrow("delayed_operation_replay_mismatch");
  });

  test("fails closed when assignment binding is unavailable", async () => {
    const repo = repository({
      "auth_links:provider-auth-1": { stable_id: "stable-1" },
      "users:stable-1": { accountGeneration: 3 },
    });
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

  test("repairs missing canonical receipt and terminal artifacts before delayed replay success", async () => {
    const repo = repository(records);
    const first = await finalizeDelayedCandidate(repo, input());
    repo.documents.delete("learning_v2_timing_receipts:stable-1:timing-1");
    repo.documents.delete(`learning_v2_delayed_terminals:stable-1:${require("./learning_v2/progress_event").deriveProgressAccountScopeHash("stable-1", 3)}__operation-1`);

    await expect(finalizeDelayedCandidate(repo, input()))
      .resolves.toEqual({ replayed: true, receipt: first.receipt });
    expect(repo.documents.has("learning_v2_timing_receipts:stable-1:timing-1")).toBe(true);
    expect([...repo.documents.keys()].some((key) =>
      key.startsWith("learning_v2_delayed_terminals:stable-1:"))).toBe(true);
  });
});
