"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const progress_event_evidence_1 = require("./progress_event_evidence");
const attemptBody = { schemaVersion: "v2-attempt-body.v1", opId: "attempt-evidence-1", attemptSurface: { kind: "episode_graph_node" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "near_transfer" }, inputBinding: { source: "keyboard" }, learningTupleDispositions: [] };
const attemptRef = (0, attempt_1.buildCanonicalAttemptRef)(attemptBody);
const tuple = { nodeId: "node-1", objectiveId: "objective-1", skillId: "skill-1", construct: "semantic", phase: "near_transfer", targetKind: "objective", targetId: "objective-1" };
const evidence = { schemaVersion: "learning-evidence-body.v1", observationId: "observation-1", ...tuple, assessmentStatus: "assessed", outcome: "success", sourceAttempt: attemptRef, policyId: "policy-1", policyVersion: 1, provenance: { phase: "near_transfer", support: { hintsUsed: 0 }, context: { contextId: "ctx-1" }, prompt: { promptId: "prompt-1" } }, route: { kind: "non_voice", input: { source: "keyboard", runtimeEvidenceRef: { runtimeEvidenceHash: "a".repeat(64), sourceAttempt: attemptRef } } }, timing: { occurredAt: "2026-07-16T00:00:00.000Z" } };
describe("V2 server evidence bundle", () => {
    it("materializes separately hashed evidence refs with a component fingerprint", () => {
        const result = (0, progress_event_evidence_1.materializeProgressEvidenceBundle)({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [evidence], nonAssessmentBodies: [] });
        expect(result.refs).toHaveLength(1);
        expect(result.refs[0]).toMatchObject({ observationId: "observation-1", sourceAttempt: attemptRef });
        expect(result.componentFingerprint).toMatch(/^[a-f0-9]{64}$/);
    });
    it("rejects duplicate tuple materialization and wrong source attempts", () => {
        expect(() => (0, progress_event_evidence_1.materializeProgressEvidenceBundle)({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [evidence, { ...evidence, observationId: "observation-2" }], nonAssessmentBodies: [] })).toThrow("v2_progress_evidence_tuple_duplicate");
        expect(() => (0, progress_event_evidence_1.materializeProgressEvidenceBundle)({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [{ ...evidence, sourceAttempt: { ...attemptRef, opId: "other" } }], nonAssessmentBodies: [] })).toThrow("v2_progress_evidence_body_invalid");
    });
    it("merges evidence refs idempotently with bounded conflict handling", () => {
        const refs = (0, progress_event_evidence_1.materializeProgressEvidenceBundle)({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [evidence], nonAssessmentBodies: [] }).refs;
        expect(Object.keys((0, progress_event_evidence_1.mergeProgressEvidenceIndex)({}, refs))).toHaveLength(1);
        expect(Object.keys((0, progress_event_evidence_1.mergeProgressEvidenceIndex)((0, progress_event_evidence_1.mergeProgressEvidenceIndex)({}, refs), refs))).toHaveLength(1);
        expect(() => (0, progress_event_evidence_1.mergeProgressEvidenceIndex)({ [refs[0].tupleKey]: { ...refs[0], evidenceBodyHash: "d".repeat(64) } }, refs)).toThrow("v2_progress_evidence_index_conflict");
        expect(() => (0, progress_event_evidence_1.mergeProgressEvidenceIndex)({}, refs, 0)).toThrow("v2_progress_evidence_index_bound_invalid");
    });
});
//# sourceMappingURL=progress_event_evidence.test.js.map