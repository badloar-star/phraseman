import { readFileSync } from "node:fs";
import path from "node:path";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { buildCanonicalAttemptRef, sanitizeAttemptBody } from "../../../../modules/learning-v2/contracts/attempt";
import { buildLearningEvidenceTupleKey } from "../../../../modules/learning-v2/contracts/evidence";
import { materializeProgressEvidenceBundle } from "../progress_event_evidence";
import { ingestDelayedProbeTerminal, materializeDelayedTerminalEvidence } from "../delayed_probe_ingestion";
import { deriveProgressAccountScopeHash } from "../progress_event";

const PROJECT_ID = "demo-phraseman-delayed-materialization";
const RULES_PATH = path.resolve(__dirname, "../../../../firestore.rules");
const binding = { nodeId: "em-node", objectiveId: "em-objective", skillId: "em-skill", construct: "semantic" as const, phase: "delayed_probe" as const, targetKind: "objective" as const, targetId: "em-objective" };
const body = sanitizeAttemptBody({ schemaVersion: "v2-attempt-body.v1", opId: "em-delayed-op", attemptSurface: { kind: "scheduled_delayed_probe" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "delayed_probe" }, inputBinding: { source: "keyboard" }, delayedCandidates: [{ candidateId: "em-c1", binding, candidateOutcome: { resultCode: "CORRECT" }, candidateEvidence: { hintsUsed: 0 } }] });
const candidate = { schemaVersion: "v2-delayed-attempt-candidate.v1" as const, attemptBody: body, attemptRef: buildCanonicalAttemptRef(body) };
const scope = "emulator-user";
const accountScopeHash = deriveProgressAccountScopeHash(scope, 1);

describe("delayed receipt -> materialized evidence emulator seam", () => {
  let environment: RulesTestEnvironment;
  beforeAll(async () => { environment = await initializeTestEnvironment({ projectId: PROJECT_ID, firestore: { rules: readFileSync(RULES_PATH, "utf8") } }); });
  afterAll(async () => environment?.cleanup());

  test("has no evidence before receipt, then stores hash-equal 1:1 materialization", async () => {
    await environment.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const evidenceRef = doc(
        db,
        "users",
        scope,
        "v2_progress",
        accountScopeHash,
        "seasons",
        "em-season",
        "episodes",
        "em-episode",
        "evidence",
        buildLearningEvidenceTupleKey(binding),
      );
      const legacyTopLevelEvidenceRef = doc(db, "learning_v2_evidence", "em-delayed-op");
      expect((await getDoc(evidenceRef)).exists()).toBe(false);
      expect((await getDoc(legacyTopLevelEvidenceRef)).exists()).toBe(false);
      const records = new Map<string, any>();
      const terminal = await ingestDelayedProbeTerminal({ read: async (id) => records.get(id), create: async (record) => { records.set(record.mutationId, record); } }, { stableUid: scope, accountGeneration: 1, accountScopeHash, mutationId: "em-delayed-op", candidate, context: { candidate, expectedTupleKeys: [buildLearningEvidenceTupleKey(binding)], assignmentRef: { assignmentId: "em-a", contentHash: "a".repeat(64) }, launchReceiptRef: { launchId: "em-l", contentHash: "b".repeat(64) }, probeRef: { probeId: "em-p", contentHash: "c".repeat(64) }, timingReceiptId: "em-timing", failureReceiptId: "em-failure", acceptedAtServer: "2026-07-17T00:00:00.000Z", observedDelayMs: 100, windowPolicyId: "em-window" } }, { resolveDecision: () => ({ kind: "timed" as const, window: "inside_pinned_window" as const }) });
      await setDoc(doc(db, "users", scope, "v2_delayed_timing_receipts", "em-timing"), terminal.record.receipt);
      const bundle = materializeDelayedTerminalEvidence(body as import("../../../../modules/learning-v2/contracts/attempt").V2DelayedAttemptEventBody, terminal.record);
      const materialized = materializeProgressEvidenceBundle(bundle);
      expect(materialized.refs).toHaveLength(1);
      expect(materialized.refs[0].tupleKey).toBe(buildLearningEvidenceTupleKey(binding));
      expect(materialized.refs[0].sourceAttempt).toEqual(candidate.attemptRef);
      expect(materialized.componentFingerprint).toMatch(/^[a-f0-9]{64}$/);
      await setDoc(evidenceRef, { receiptHash: terminal.record.receiptHash, componentFingerprint: materialized.componentFingerprint, refs: materialized.refs });
      const stored = await getDoc(evidenceRef);
      expect(stored.data()?.receiptHash).toBe(terminal.record.receiptHash);
      expect(stored.data()?.refs).toHaveLength(1);

      const replayBundle = materializeDelayedTerminalEvidence(body as import("../../../../modules/learning-v2/contracts/attempt").V2DelayedAttemptEventBody, terminal.record);
      const replayMaterialized = materializeProgressEvidenceBundle(replayBundle);
      expect(replayMaterialized).toEqual(materialized);
      await setDoc(evidenceRef, {
        receiptHash: terminal.record.receiptHash,
        componentFingerprint: replayMaterialized.componentFingerprint,
        refs: replayMaterialized.refs,
      });
      expect((await getDoc(evidenceRef)).data()).toEqual(stored.data());
      expect((await getDoc(legacyTopLevelEvidenceRef)).exists()).toBe(false);
    });
  });
});
