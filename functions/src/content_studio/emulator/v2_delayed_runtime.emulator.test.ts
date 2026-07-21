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
  if (key.startsWith("learning_v2_assignments:"))
    return `learning_v2_assignments/${key.slice("learning_v2_assignments:".length)}`;
  if (key.startsWith("learning_v2_launches:"))
    return `learning_v2_launches/${key.slice("learning_v2_launches:".length)}`;
  if (key.startsWith("learning_v2_timing_receipts:"))
    return `learning_v2_timing_receipts/${key.slice("learning_v2_timing_receipts:".length)}`;
  if (key.startsWith("learning_v2_failure_receipts:"))
    return `learning_v2_failure_receipts/${key.slice("learning_v2_failure_receipts:".length)}`;
  if (key.startsWith("learning-v2:delayed:"))
    return `learning_v2_receipt_operations/${key.slice("learning-v2:delayed:".length).replace(/:/g, "_")}`;
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
      await setDoc(
        doc(db, "learning_v2_assignments", assignmentRef.assignmentId),
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
      await setDoc(doc(db, "learning_v2_launches", launchReceiptRef.launchId), {
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
      const receiptSnapshot = await getDoc(
        doc(db, "learning_v2_timing_receipts", "timing-emulator-1"),
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
        doc(db, "learning_v2_timing_receipts", "timing-emulator-concurrent"),
      );
      expect(concurrentReceipt.exists()).toBe(true);
    });
  });
});
