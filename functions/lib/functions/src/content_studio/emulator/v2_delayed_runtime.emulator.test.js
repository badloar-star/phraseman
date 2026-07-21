"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const rules_unit_testing_1 = require("@firebase/rules-unit-testing");
const firestore_1 = require("firebase/firestore");
const attempt_1 = require("../../../../modules/learning-v2/contracts/attempt");
const evidence_1 = require("../../../../modules/learning-v2/contracts/evidence");
const learning_v2_delayed_adapter_1 = require("../../learning_v2_delayed_adapter");
const PROJECT_ID = "demo-phraseman-rules";
const RULES_PATH = node_path_1.default.resolve(__dirname, "../../../../firestore.rules");
const binding = {
    nodeId: "probe-node-1",
    objectiveId: "objective-1",
    skillId: "skill-1",
    construct: "semantic",
    phase: "delayed_probe",
    targetKind: "objective",
    targetId: "objective-1",
};
const body = (0, attempt_1.sanitizeAttemptBody)({
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
    schemaVersion: "v2-delayed-attempt-candidate.v1",
    attemptBody: body,
    attemptRef: (0, attempt_1.buildCanonicalAttemptRef)(body),
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
const firestorePath = (key) => {
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
    let environment;
    beforeAll(async () => {
        environment = await (0, rules_unit_testing_1.initializeTestEnvironment)({
            projectId: PROJECT_ID,
            firestore: { rules: (0, node_fs_1.readFileSync)(RULES_PATH, "utf8") },
        });
    });
    afterAll(async () => environment?.cleanup());
    test("seeds server records, persists one receipt, and replays it", async () => {
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, "learning_v2_assignments", assignmentRef.assignmentId), {
                ref: assignmentRef,
                stableId: "uid-emulator",
                accountGeneration: 3,
                probeRef,
                expectedTupleKeys: [(0, evidence_1.buildLearningEvidenceTupleKey)(binding)],
                assessableWindowOpensAtMs: 1000,
                assessableWindowClosesAtMs: 5000,
            });
            await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, "learning_v2_launches", launchReceiptRef.launchId), {
                ref: launchReceiptRef,
                stableId: "uid-emulator",
                accountGeneration: 3,
                probeRef,
                expiresAtMs: 10000,
            });
            const repository = {
                runTransaction: (fn) => (0, firestore_1.runTransaction)(db, async (transaction) => fn({
                    get: async (key) => {
                        const snapshot = await transaction.get((0, firestore_1.doc)(db, firestorePath(key)));
                        return {
                            exists: snapshot.exists(),
                            data: snapshot.exists() ? snapshot.data() : undefined,
                        };
                    },
                    create: (key, value) => transaction.set((0, firestore_1.doc)(db, firestorePath(key)), value),
                })),
            };
            const input = {
                operationId: "emulator-operation-1",
                fingerprint: "d".repeat(64),
                stableId: "uid-emulator",
                accountGeneration: 3,
                candidate,
                expectedTupleKeys: [(0, evidence_1.buildLearningEvidenceTupleKey)(binding)],
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
                    kind: "timed",
                    window: "inside_pinned_window",
                },
            };
            const first = await (0, learning_v2_delayed_adapter_1.finalizeDelayedCandidate)(repository, input);
            const second = await (0, learning_v2_delayed_adapter_1.finalizeDelayedCandidate)(repository, input);
            expect(first.replayed).toBe(false);
            expect(second.replayed).toBe(true);
            expect(second.receipt).toEqual(first.receipt);
            // The terminal receipt is the only server output of this phase. No
            // LearningEvidence/evidence bundle or projection is accepted/materialized
            // before a subsequent progress event references this receipt.
            expect(first.receipt).not.toHaveProperty("evidence");
            expect(first.receipt).not.toHaveProperty("projection");
            const receiptSnapshot = await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, "learning_v2_timing_receipts", "timing-emulator-1"));
            expect(receiptSnapshot.exists()).toBe(true);
            expect(receiptSnapshot.data()?.ref.contentHash).toMatch(/^[a-f0-9]{64}$/);
            const mismatch = await (0, learning_v2_delayed_adapter_1.finalizeDelayedCandidate)(repository, {
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
                (0, learning_v2_delayed_adapter_1.finalizeDelayedCandidate)(repository, concurrentInput),
                (0, learning_v2_delayed_adapter_1.finalizeDelayedCandidate)(repository, concurrentInput),
            ]);
            expect(concurrent.map((result) => result.replayed).sort()).toEqual([
                false,
                true,
            ]);
            const concurrentReceipt = await (0, firestore_1.getDoc)((0, firestore_1.doc)(db, "learning_v2_timing_receipts", "timing-emulator-concurrent"));
            expect(concurrentReceipt.exists()).toBe(true);
        });
    });
    test("classifies stale, expired, and out-of-window launches server-side and rejects substitution", async () => {
        await environment.withSecurityRulesDisabled(async (context) => {
            const db = context.firestore();
            const seed = async (id, overrides = {}) => {
                await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, "learning_v2_assignments", `${id}-assignment`), {
                    ref: { ...assignmentRef, assignmentId: `${id}-assignment` },
                    stableId: "uid-emulator", accountGeneration: 3, probeRef,
                    expectedTupleKeys: [(0, evidence_1.buildLearningEvidenceTupleKey)(binding)],
                    assessableWindowOpensAtMs: 1000, assessableWindowClosesAtMs: 5000,
                    ...overrides,
                });
                await (0, firestore_1.setDoc)((0, firestore_1.doc)(db, "learning_v2_launches", `${id}-launch`), {
                    ref: { ...launchReceiptRef, launchId: `${id}-launch` },
                    stableId: "uid-emulator", accountGeneration: 3, probeRef,
                    expiresAtMs: 10000,
                });
            };
            const repository = {
                runTransaction: (fn) => (0, firestore_1.runTransaction)(db, async (transaction) => fn({
                    get: async (key) => { const snapshot = await transaction.get((0, firestore_1.doc)(db, firestorePath(key))); return { exists: snapshot.exists(), data: snapshot.exists() ? snapshot.data() : undefined }; },
                    create: (key, value) => transaction.set((0, firestore_1.doc)(db, firestorePath(key)), value),
                })),
            };
            const run = async (id, nowMs, overrides = {}) => {
                await seed(id, overrides);
                const assignment = { ...assignmentRef, assignmentId: `${id}-assignment` };
                const launch = { ...launchReceiptRef, launchId: `${id}-launch` };
                return (0, learning_v2_delayed_adapter_1.finalizeDelayedCandidate)(repository, {
                    operationId: `emulator-${id}-operation`, fingerprint: "a".repeat(64),
                    stableId: "uid-emulator", accountGeneration: 3, candidate,
                    expectedTupleKeys: [(0, evidence_1.buildLearningEvidenceTupleKey)(binding)], assignmentRef: assignment,
                    launchReceiptRef: launch, probeRef, timingReceiptId: `timing-${id}`, failureReceiptId: `failure-${id}`,
                    acceptedAtServer: new Date().toISOString(), observedDelayMs: 259200000, windowPolicyId: "HYP-V2-007",
                    nowMs, serverDecision: { kind: "timed", window: "inside_pinned_window" },
                });
            };
            const stale = await run("stale", 3000, { status: "stale" });
            expect(stale.receipt.kind).toBe("failure");
            if (stale.receipt.kind === "failure")
                expect(stale.receipt.body.decision).toMatchObject({ kind: "system_non_assessment", reasonCode: "assignment_stale" });
            const expired = await run("expired", 10000);
            expect(expired.receipt.kind).toBe("failure");
            if (expired.receipt.kind === "failure")
                expect(expired.receipt.body.decision).toMatchObject({ kind: "system_non_assessment", reasonCode: "launch_expired" });
            const outside = await run("outside", 6000);
            expect(outside.receipt.kind).toBe("timing");
            if (outside.receipt.kind === "timing")
                expect(outside.receipt.body.assessmentTiming).toBe("outside_pinned_window");
            await seed("substitution");
            const substitution = await (0, learning_v2_delayed_adapter_1.finalizeDelayedCandidate)(repository, {
                operationId: "emulator-substitution-operation", fingerprint: "b".repeat(64),
                stableId: "uid-emulator", accountGeneration: 3, candidate,
                expectedTupleKeys: [(0, evidence_1.buildLearningEvidenceTupleKey)(binding)],
                assignmentRef: { ...assignmentRef, assignmentId: "substitution-assignment" },
                launchReceiptRef: { ...launchReceiptRef, launchId: "substitution-launch" },
                probeRef: { ...probeRef, contentHash: "f".repeat(64) },
                timingReceiptId: "timing-substitution", failureReceiptId: "failure-substitution",
                acceptedAtServer: new Date().toISOString(), observedDelayMs: 1000, windowPolicyId: "HYP-V2-007",
                nowMs: 3000, serverDecision: { kind: "timed", window: "inside_pinned_window" },
            });
            expect(substitution.receipt.kind).toBe("failure");
            if (substitution.receipt.kind === "failure")
                expect(substitution.receipt.body.decision.kind).toBe("protocol_rejection");
        });
    });
});
//# sourceMappingURL=v2_delayed_runtime.emulator.test.js.map