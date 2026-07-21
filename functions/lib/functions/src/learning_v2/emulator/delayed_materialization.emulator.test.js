"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const firestore_1 = require("firebase/firestore");
const rules_unit_testing_1 = require("@firebase/rules-unit-testing");
const attempt_1 = require("../../../../modules/learning-v2/contracts/attempt");
const evidence_1 = require("../../../../modules/learning-v2/contracts/evidence");
const progress_event_evidence_1 = require("../progress_event_evidence");
const delayed_probe_ingestion_1 = require("../delayed_probe_ingestion");
const PROJECT_ID = "demo-phraseman-delayed-materialization";
const RULES_PATH = node_path_1.default.resolve(__dirname, "../../../../firestore.rules");
const binding = { nodeId: "em-node", objectiveId: "em-objective", skillId: "em-skill", construct: "semantic", phase: "delayed_probe", targetKind: "objective", targetId: "em-objective" };
const body = (0, attempt_1.sanitizeAttemptBody)({ schemaVersion: "v2-attempt-body.v1", opId: "em-delayed-op", attemptSurface: { kind: "scheduled_delayed_probe" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "delayed_probe" }, inputBinding: { source: "keyboard" }, delayedCandidates: [{ candidateId: "em-c1", binding, candidateOutcome: { resultCode: "CORRECT" }, candidateEvidence: { hintsUsed: 0 } }] });
const candidate = { schemaVersion: "v2-delayed-attempt-candidate.v1", attemptBody: body, attemptRef: (0, attempt_1.buildCanonicalAttemptRef)(body) };
const scope = "emulator-user";
describe("delayed receipt -> materialized evidence emulator seam", () => {
    let environment;
    beforeAll(async () => { environment = await (0, rules_unit_testing_1.initializeTestEnvironment)({ projectId: PROJECT_ID, firestore: { rules: (0, node_fs_1.readFileSync)(RULES_PATH, "utf8") } }); });
    afterAll(async () => environment?.cleanup());
    test("has no evidence before receipt, then stores hash-equal 1:1 materialization", async () => {
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            const evidenceRef = (0, firestore_1.doc)(db, "learning_v2_evidence", "em-delayed-op");
            expect((await (0, firestore_1.getDoc)(evidenceRef)).exists()).toBe(false);
            const records = new Map();
            const terminal = await (0, delayed_probe_ingestion_1.ingestDelayedProbeTerminal)({ read: async (id) => records.get(id), create: async (record) => { records.set(record.mutationId, record); } }, { stableUid: scope, accountGeneration: 1, accountScopeHash: require("../progress_event").deriveProgressAccountScopeHash(scope, 1), mutationId: "em-delayed-op", candidate, context: { candidate, expectedTupleKeys: [(0, evidence_1.buildLearningEvidenceTupleKey)(binding)], assignmentRef: { assignmentId: "em-a", contentHash: "a".repeat(64) }, launchReceiptRef: { launchId: "em-l", contentHash: "b".repeat(64) }, probeRef: { probeId: "em-p", contentHash: "c".repeat(64) }, timingReceiptId: "em-timing", failureReceiptId: "em-failure", acceptedAtServer: "2026-07-17T00:00:00.000Z", observedDelayMs: 100, windowPolicyId: "em-window" } }, { resolveDecision: () => ({ kind: "timed", window: "inside_pinned_window" }) });
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, "learning_v2_timing_receipts", "em-timing"), terminal.record.receipt);
            const bundle = (0, delayed_probe_ingestion_1.materializeDelayedTerminalEvidence)(body, terminal.record);
            const materialized = (0, progress_event_evidence_1.materializeProgressEvidenceBundle)(bundle);
            expect(materialized.refs).toHaveLength(1);
            expect(materialized.refs[0].tupleKey).toBe((0, evidence_1.buildLearningEvidenceTupleKey)(binding));
            expect(materialized.refs[0].sourceAttempt).toEqual(candidate.attemptRef);
            expect(materialized.componentFingerprint).toMatch(/^[a-f0-9]{64}$/);
            await (0, firestore_1.setDoc)(evidenceRef, { receiptHash: terminal.record.receiptHash, componentFingerprint: materialized.componentFingerprint, refs: materialized.refs });
            const stored = await (0, firestore_1.getDoc)(evidenceRef);
            expect(stored.data()?.receiptHash).toBe(terminal.record.receiptHash);
            expect(stored.data()?.refs).toHaveLength(1);
        });
    });
});
//# sourceMappingURL=delayed_materialization.emulator.test.js.map