import { readFileSync } from "node:fs";
import path from "node:path";
import {
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, runTransaction, setDoc } from "firebase/firestore";
import {
  buildCanonicalAttemptRef,
  sanitizeAttemptBody,
} from "../../../../modules/learning-v2/contracts/attempt";
import { buildLearningEvidenceTupleKey } from "../../../../modules/learning-v2/contracts/evidence";
import {
  finalizeDelayedCandidate,
  type DelayedReceiptRepository,
} from "../../learning_v2_delayed_adapter";

const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = path.resolve(__dirname, "../../../../firestore.rules");
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
  opId: "emulator-op-1",
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
  assignmentId: "assignment-emulator-1",
  contentHash: "a".repeat(64),
};
const launchReceiptRef = {
  launchId: "launch-emulator-1",
  contentHash: "b".repeat(64),
};
const probeRef = { probeId: "probe-emulator-1", contentHash: "c".repeat(64) };

const firestorePath = (key: string): string => {
  if (key.startsWith("auth_links:")) {
    return `auth_links/${key.slice("auth_links:".length)}`;
  }
  if (key.startsWith("users:")) {
    return `users/${key.slice("users:".length)}`;
  }
  if (key.startsWith("account_deletion_tombstones:")) {
    return `account_deletion_tombstones/${key.slice("account_deletion_tombstones:".length)}`;
  }
  const scoped = (prefix: string, collection: string): string | undefined => {
    if (!key.startsWith(prefix)) return undefined;
    const [stableId, id, ...extra] = key.slice(prefix.length).split(":");
    if (!stableId || !id || extra.length > 0) throw new Error(`unsupported_key:${key}`);
    return `users/${stableId}/${collection}/${id}`;
  };
  const mapped =
    scoped("learning_v2_assignments:", "v2_delayed_assignments") ??
    scoped("learning_v2_launches:", "v2_delayed_launches") ??
    scoped("learning_v2_timing_receipts:", "v2_delayed_timing_receipts") ??
    scoped("learning_v2_failure_receipts:", "v2_delayed_failure_receipts") ??
    scoped("learning_v2_delayed_terminals:", "v2_delayed_attempts") ??
    scoped("learning-v2:delayed:", "v2_delayed_operations");
  if (mapped) return mapped;
  throw new Error(`unsupported_key:${key}`);
};

describe("Learning V2 delayed Firestore transaction persistence", () => {
  let environment: RulesTestEnvironment;
  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules: readFileSync(RULES_PATH, "utf8") },
    });
  });
  afterAll(async () => environment?.cleanup());

  test("seeds server records, persists one receipt, and replays it", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "auth_links", "auth-delayed-emulator"), {
        stable_id: "uid-emulator",
      });
      await setDoc(doc(db, "users", "uid-emulator"), {
        accountGeneration: 3,
      });
      await setDoc(
        doc(db, "users", "uid-emulator", "v2_delayed_assignments", assignmentRef.assignmentId),
        {
          ref: assignmentRef,
          stableId: "uid-emulator",
          accountGeneration: 3,
          probeRef,
          expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)],
          assessableWindowOpensAtMs: 1000,
          assessableWindowClosesAtMs: 5000,
        },
      );
      await setDoc(doc(db, "users", "uid-emulator", "v2_delayed_launches", launchReceiptRef.launchId), {
        ref: launchReceiptRef,
        stableId: "uid-emulator",
        accountGeneration: 3,
        probeRef,
        expiresAtMs: 10000,
      });
      const repository: DelayedReceiptRepository = {
        runTransaction: (fn) =>
          runTransaction(db, async (transaction) =>
            fn({
              get: async <T>(key: string) => {
                const snapshot = await transaction.get(
                  doc(db, firestorePath(key)),
                );
                return {
                  exists: snapshot.exists(),
                  data: snapshot.exists() ? (snapshot.data() as T) : undefined,
                };
              },
              create: (key, value) =>
                transaction.set(doc(db, firestorePath(key)), value),
            }),
          ),
      };
      const input = {
        operationId: "emulator-operation-1",
        fingerprint: "d".repeat(64),
        authUid: "auth-delayed-emulator",
        stableId: "uid-emulator",
        accountGeneration: 3,
        candidate,
        expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)],
        assignmentRef,
        launchReceiptRef,
        probeRef,
        timingReceiptId: "timing-emulator-1",
        failureReceiptId: "failure-emulator-1",
        acceptedAtServer: new Date().toISOString(),
        observedDelayMs: 259200000,
        windowPolicyId: "HYP-V2-007",
        nowMs: 3000,
        serverDecision: {
          kind: "timed" as const,
          window: "inside_pinned_window" as const,
        },
      };
      const first = await finalizeDelayedCandidate(repository, input);
      const second = await finalizeDelayedCandidate(repository, input);
      expect(first.replayed).toBe(false);
      expect(second.replayed).toBe(true);
      expect(second.receipt).toEqual(first.receipt);
      // The terminal receipt is the only server output of this phase. No
      // LearningEvidence/evidence bundle or projection is accepted/materialized
      // before a subsequent progress event references this receipt.
      expect(first.receipt).not.toHaveProperty("evidence");
      expect(first.receipt).not.toHaveProperty("projection");
      const receiptSnapshot = await getDoc(
        doc(db, "users", "uid-emulator", "v2_delayed_timing_receipts", "timing-emulator-1"),
      );
      expect(receiptSnapshot.exists()).toBe(true);
      expect(receiptSnapshot.data()?.ref.contentHash).toMatch(/^[a-f0-9]{64}$/);

      const mismatch = await finalizeDelayedCandidate(repository, {
        ...input,
        operationId: "emulator-mismatch-operation",
        fingerprint: "e".repeat(64),
        probeRef: { ...probeRef, contentHash: "f".repeat(64) },
        timingReceiptId: "timing-emulator-mismatch",
        failureReceiptId: "failure-emulator-mismatch",
      });
      expect(mismatch.receipt.kind).toBe("failure");
      if (mismatch.receipt.kind === "failure") {
        expect(mismatch.receipt.body.decision.kind).toBe("protocol_rejection");
      }

      const concurrentInput = {
        ...input,
        operationId: "emulator-concurrent-operation",
        fingerprint: "f".repeat(64),
        timingReceiptId: "timing-emulator-concurrent",
        failureReceiptId: "failure-emulator-concurrent",
      };
      const concurrent = await Promise.all([
        finalizeDelayedCandidate(repository, concurrentInput),
        finalizeDelayedCandidate(repository, concurrentInput),
      ]);
      expect(concurrent.map((result) => result.replayed).sort()).toEqual([
        false,
        true,
      ]);
      const concurrentReceipt = await getDoc(
        doc(db, "users", "uid-emulator", "v2_delayed_timing_receipts", "timing-emulator-concurrent"),
      );
      expect(concurrentReceipt.exists()).toBe(true);
    });
  });

  test("classifies stale, expired, and out-of-window launches server-side and rejects substitution", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "auth_links", "auth-delayed-emulator"), {
        stable_id: "uid-emulator",
      });
      await setDoc(doc(db, "users", "uid-emulator"), {
        accountGeneration: 3,
      });
      const seed = async (id: string, overrides: Record<string, unknown> = {}) => {
        await setDoc(doc(db, "users", "uid-emulator", "v2_delayed_assignments", `${id}-assignment`), {
          ref: { ...assignmentRef, assignmentId: `${id}-assignment` },
          stableId: "uid-emulator", accountGeneration: 3, probeRef,
          expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)],
          assessableWindowOpensAtMs: 1000, assessableWindowClosesAtMs: 5000,
          ...overrides,
        });
        await setDoc(doc(db, "users", "uid-emulator", "v2_delayed_launches", `${id}-launch`), {
          ref: { ...launchReceiptRef, launchId: `${id}-launch` },
          stableId: "uid-emulator", accountGeneration: 3, probeRef,
          expiresAtMs: 10000,
        });
      };
      const repository: DelayedReceiptRepository = {
        runTransaction: (fn) => runTransaction(db, async (transaction) => fn({
          get: async <T>(key: string) => { const snapshot = await transaction.get(doc(db, firestorePath(key))); return { exists: snapshot.exists(), data: snapshot.exists() ? snapshot.data() as T : undefined }; },
          create: (key, value) => transaction.set(doc(db, firestorePath(key)), value),
        })),
      };
      const run = async (id: string, nowMs: number, overrides: Record<string, unknown> = {}) => {
        await seed(id, overrides);
        const assignment = { ...assignmentRef, assignmentId: `${id}-assignment` };
        const launch = { ...launchReceiptRef, launchId: `${id}-launch` };
        return finalizeDelayedCandidate(repository, {
          operationId: `emulator-${id}-operation`, fingerprint: "a".repeat(64),
          authUid: "auth-delayed-emulator",
          stableId: "uid-emulator", accountGeneration: 3, candidate,
          expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)], assignmentRef: assignment,
          launchReceiptRef: launch, probeRef, timingReceiptId: `timing-${id}`, failureReceiptId: `failure-${id}`,
          acceptedAtServer: new Date().toISOString(), observedDelayMs: 259200000, windowPolicyId: "HYP-V2-007",
          nowMs, serverDecision: { kind: "timed" as const, window: "inside_pinned_window" as const },
        });
      };
      const stale = await run("stale", 3000, { status: "stale" });
      expect(stale.receipt.kind).toBe("failure");
      if (stale.receipt.kind === "failure") expect(stale.receipt.body.decision).toMatchObject({ kind: "system_non_assessment", reasonCode: "assignment_stale" });
      const expired = await run("expired", 10000);
      expect(expired.receipt.kind).toBe("failure");
      if (expired.receipt.kind === "failure") expect(expired.receipt.body.decision).toMatchObject({ kind: "system_non_assessment", reasonCode: "launch_expired" });
      const outside = await run("outside", 6000);
      expect(outside.receipt.kind).toBe("timing");
      if (outside.receipt.kind === "timing") expect(outside.receipt.body.assessmentTiming).toBe("outside_pinned_window");
      await seed("substitution");
      const substitution = await finalizeDelayedCandidate(repository, {
        operationId: "emulator-substitution-operation", fingerprint: "b".repeat(64),
        authUid: "auth-delayed-emulator",
        stableId: "uid-emulator", accountGeneration: 3, candidate,
        expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)],
        assignmentRef: { ...assignmentRef, assignmentId: "substitution-assignment" },
        launchReceiptRef: { ...launchReceiptRef, launchId: "substitution-launch" },
        probeRef: { ...probeRef, contentHash: "f".repeat(64) },
        timingReceiptId: "timing-substitution", failureReceiptId: "failure-substitution",
        acceptedAtServer: new Date().toISOString(), observedDelayMs: 1000, windowPolicyId: "HYP-V2-007",
        nowMs: 3000, serverDecision: { kind: "timed" as const, window: "inside_pinned_window" as const },
      });
      expect(substitution.receipt.kind).toBe("failure");
      if (substitution.receipt.kind === "failure") expect(substitution.receipt.body.decision.kind).toBe("protocol_rejection");
    });
  });

  test("retries after a commit-time deletion tombstone and leaves zero delayed artifacts", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "auth_links", "auth-delayed-race"), {
        stable_id: "uid-delayed-race",
      });
      await setDoc(doc(db, "users", "uid-delayed-race"), {
        accountGeneration: 3,
      });
      await setDoc(
        doc(db, "users", "uid-delayed-race", "v2_delayed_assignments", assignmentRef.assignmentId),
        {
          ref: assignmentRef,
          stableId: "uid-delayed-race",
          accountGeneration: 3,
          probeRef,
          expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)],
          assessableWindowOpensAtMs: 1000,
          assessableWindowClosesAtMs: 5000,
        },
      );
      await setDoc(
        doc(db, "users", "uid-delayed-race", "v2_delayed_launches", launchReceiptRef.launchId),
        {
          ref: launchReceiptRef,
          stableId: "uid-delayed-race",
          accountGeneration: 3,
          probeRef,
          expiresAtMs: 10000,
        },
      );
      let bindingReadAttempts = 0;
      let signalFirstBindingReads!: () => void;
      const firstBindingReads = new Promise<void>((resolve) => {
        signalFirstBindingReads = resolve;
      });
      let releaseFirstAttempt!: () => void;
      const firstAttemptMayContinue = new Promise<void>((resolve) => {
        releaseFirstAttempt = resolve;
      });
      const repository: DelayedReceiptRepository = {
        testHooks: {
          afterBindingReads: async () => {
            bindingReadAttempts += 1;
            if (bindingReadAttempts === 1) {
              signalFirstBindingReads();
              await firstAttemptMayContinue;
            }
          },
        },
        runTransaction: (fn) =>
          runTransaction(db, async (transaction) =>
            fn({
              get: async <T>(key: string) => {
                const snapshot = await transaction.get(doc(db, firestorePath(key)));
                return {
                  exists: snapshot.exists(),
                  data: snapshot.exists() ? snapshot.data() as T : undefined,
                };
              },
              create: (key, value) =>
                transaction.set(doc(db, firestorePath(key)), value),
            }),
          ),
      };
      const raceInput = {
        operationId: "emulator-delayed-delete-race",
        fingerprint: "f".repeat(64),
        authUid: "auth-delayed-race",
        stableId: "uid-delayed-race",
        accountGeneration: 3,
        candidate,
        expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)],
        assignmentRef,
        launchReceiptRef,
        probeRef,
        timingReceiptId: "timing-delayed-delete-race",
        failureReceiptId: "failure-delayed-delete-race",
        acceptedAtServer: new Date().toISOString(),
        observedDelayMs: 259200000,
        windowPolicyId: "HYP-V2-007",
        nowMs: 3000,
        serverDecision: {
          kind: "timed" as const,
          window: "inside_pinned_window" as const,
        },
      };

      const racing = finalizeDelayedCandidate(repository, raceInput);
      await firstBindingReads;
      try {
        await setDoc(
          doc(db, "account_deletion_tombstones", raceInput.stableId),
          { status: "pending" },
        );
      } finally {
        releaseFirstAttempt();
      }

      await expect(racing).rejects.toThrow("delayed_account_delete_pending");
      expect(bindingReadAttempts).toBe(2);
      const artifactSnapshots = await Promise.all([
        getDoc(doc(db, "users", raceInput.stableId, "v2_delayed_timing_receipts", raceInput.timingReceiptId)),
        getDoc(doc(db, "users", raceInput.stableId, "v2_delayed_failure_receipts", raceInput.failureReceiptId)),
        getDoc(doc(db, "users", raceInput.stableId, "v2_delayed_operations", raceInput.operationId)),
      ]);
      expect(artifactSnapshots.every((snapshot) => !snapshot.exists())).toBe(true);
      expect((await getDoc(doc(
        db,
        "users",
        raceInput.stableId,
        "v2_delayed_attempts",
        `${require("../../learning_v2/progress_event").deriveProgressAccountScopeHash(raceInput.stableId, raceInput.accountGeneration)}__${raceInput.operationId}`,
      ))).exists()).toBe(false);
    });
  });
});
