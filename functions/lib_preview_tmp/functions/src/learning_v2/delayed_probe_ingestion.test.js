"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const evidence_1 = require("../../../modules/learning-v2/contracts/evidence");
const delayed_probe_ingestion_1 = require("./delayed_probe_ingestion");
const progress_event_evidence_1 = require("./progress_event_evidence");
const binding = { nodeId: "n1", objectiveId: "o1", skillId: "s1", construct: "semantic", phase: "delayed_probe", targetKind: "objective", targetId: "o1" };
const body = (0, attempt_1.sanitizeAttemptBody)({ schemaVersion: "v2-attempt-body.v1", opId: "ingest-delayed-1", attemptSurface: { kind: "scheduled_delayed_probe" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "delayed_probe" }, inputBinding: { source: "keyboard" }, delayedCandidates: [{ candidateId: "c1", binding, candidateOutcome: { resultCode: "CORRECT" }, candidateEvidence: { hintsUsed: 0 } }] });
const candidate = { schemaVersion: "v2-delayed-attempt-candidate.v1", attemptBody: body, attemptRef: (0, attempt_1.buildCanonicalAttemptRef)(body) };
const context = {
    candidate, expectedTupleKeys: [(0, evidence_1.buildLearningEvidenceTupleKey)(binding)],
    assignmentRef: { assignmentId: "a1", contentHash: "a".repeat(64) }, launchReceiptRef: { launchId: "l1", contentHash: "b".repeat(64) }, probeRef: { probeId: "p1", contentHash: "c".repeat(64) }, timingReceiptId: "timing-1", failureReceiptId: "failure-1", acceptedAtServer: "2026-07-17T00:00:00.000Z", observedDelayMs: 20, windowPolicyId: "w1",
};
const scope = "delayed-ingest-user";
const request = (mutationId = "delayed-ingest-1", candidateOverride = candidate) => ({ stableUid: scope, accountGeneration: 1, accountScopeHash: "", mutationId, candidate: candidateOverride, context: { ...context, candidate } });
const memoryStore = () => { const records = new Map(); return { records, read: async (id) => records.get(id), create: async (record) => { if (records.has(record.mutationId))
        throw new Error("already_exists"); records.set(record.mutationId, record); } }; };
describe("server-authoritative delayed probe ingestion", () => {
    test("creates one timing receipt and replays the same terminal record", async () => {
        const store = memoryStore();
        const input = { ...request(), accountScopeHash: require("./progress_event").deriveProgressAccountScopeHash(scope, 1) };
        const deps = { resolveDecision: () => ({ kind: "timed", window: "inside_pinned_window" }) };
        const first = await (0, delayed_probe_ingestion_1.ingestDelayedProbeTerminal)(store, input, deps);
        const second = await (0, delayed_probe_ingestion_1.ingestDelayedProbeTerminal)(store, input, deps);
        expect(first.duplicate).toBe(false);
        expect(second.duplicate).toBe(true);
        expect(first.record.terminalStatus).toBe("timed_finalized");
        expect(store.records.size).toBe(1);
    });
    test("server failure/out-of-window are terminal non-assessment and substitution is rejected", async () => {
        const store = memoryStore();
        const input = { ...request("delayed-ingest-2"), accountScopeHash: require("./progress_event").deriveProgressAccountScopeHash(scope, 1) };
        const result = await (0, delayed_probe_ingestion_1.ingestDelayedProbeTerminal)(store, input, { resolveDecision: () => ({ kind: "system_failure", reasonCode: "launch_expired" }) });
        expect(result.record.terminalStatus).toBe("system_non_assessment_finalized");
        const substitutedBody = (0, attempt_1.sanitizeAttemptBody)({ ...body, opId: "substituted-op" });
        const substituted = { schemaVersion: "v2-delayed-attempt-candidate.v1", attemptBody: substitutedBody, attemptRef: (0, attempt_1.buildCanonicalAttemptRef)(substitutedBody) };
        await expect((0, delayed_probe_ingestion_1.ingestDelayedProbeTerminal)(store, { ...input, mutationId: "delayed-ingest-3", candidate: substituted }, { resolveDecision: () => ({ kind: "timed", window: "outside_pinned_window" }) })).rejects.toThrow("delayed_candidate_substitution");
    });
    test("materializes exactly the terminal receipt mapping and keeps skipped ref-free", async () => {
        const store = memoryStore();
        const input = { ...request("delayed-ingest-materialize"), accountScopeHash: require("./progress_event").deriveProgressAccountScopeHash(scope, 1) };
        const terminal = await (0, delayed_probe_ingestion_1.ingestDelayedProbeTerminal)(store, input, { resolveDecision: () => ({ kind: "timed", window: "inside_pinned_window" }) });
        const bundle = (0, delayed_probe_ingestion_1.materializeDelayedTerminalEvidence)(body, terminal.record);
        const materialized = (0, progress_event_evidence_1.materializeProgressEvidenceBundle)(bundle);
        expect(bundle.evidenceBodies).toHaveLength(1);
        expect(bundle.nonAssessmentBodies).toHaveLength(0);
        expect(materialized.refs).toHaveLength(1);
        expect(materialized.refs[0].tupleKey).toBe((0, evidence_1.buildLearningEvidenceTupleKey)(binding));
        expect(materialized.refs[0]).toMatchObject({ sourceAttempt: candidate.attemptRef });
        const skippedBody = (0, attempt_1.sanitizeAttemptBody)({ ...body, opId: "ingest-skipped", delayedCandidates: [{ ...body.delayedCandidates[0], candidateOutcome: { resultCode: "SKIPPED" } }] });
        const skippedCandidate = { schemaVersion: "v2-delayed-attempt-candidate.v1", attemptBody: skippedBody, attemptRef: (0, attempt_1.buildCanonicalAttemptRef)(skippedBody) };
        const skippedInput = { ...input, mutationId: "delayed-ingest-skipped", candidate: skippedCandidate, context: { ...context, candidate: skippedCandidate, expectedTupleKeys: [(0, evidence_1.buildLearningEvidenceTupleKey)(binding)] } };
        const skipped = await (0, delayed_probe_ingestion_1.ingestDelayedProbeTerminal)(store, skippedInput, { resolveDecision: () => ({ kind: "timed", window: "inside_pinned_window" }) });
        const skippedBundle = (0, delayed_probe_ingestion_1.materializeDelayedTerminalEvidence)(skippedBody, skipped.record);
        expect(skippedBundle.evidenceBodies).toHaveLength(0);
        expect(skippedBundle.nonAssessmentBodies).toHaveLength(0);
    });
});
//# sourceMappingURL=delayed_probe_ingestion.test.js.map