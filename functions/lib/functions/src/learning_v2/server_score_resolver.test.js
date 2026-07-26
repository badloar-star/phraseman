"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const progress_event_projection_1 = require("./progress_event_projection");
const server_score_resolver_1 = require("./server_score_resolver");
const progress_event_evidence_1 = require("./progress_event_evidence");
const progress_event_transaction_plan_1 = require("./progress_event_transaction_plan");
const attemptBody = {
    schemaVersion: "v2-attempt-body.v1",
    opId: "server-score-attempt-1",
    attemptSurface: { kind: "episode_graph_node" },
    outcome: { resultCode: "PASS_CONFIDENT" },
    evidence: { hintsUsed: 0 },
    provenance: { phase: "near_transfer" },
    inputBinding: { source: "keyboard" },
    learningTupleDispositions: [],
};
const attemptRef = (0, attempt_1.buildCanonicalAttemptRef)(attemptBody);
const scoringPolicyRef = { kind: "scoring", key: "policy.scoring.core", version: 1, contentHash: "a".repeat(64) };
const input = {
    attemptRef,
    activityId: "activity-1",
    starSlotId: "slot-1",
    progressCompatibilityKey: "compat-1",
    scoringPolicyRef,
    resultCode: "PASS_CONFIDENT",
    evidenceComponentFingerprint: (0, decision_registry_1.hashCanonicalBody)({ evidence: "bound" }),
};
describe("V2 server-owned score resolver", () => {
    it("produces a hash-pinned resolution and only that resolution can project stars", () => {
        const resolution = (0, server_score_resolver_1.resolveServerScore)(input, () => 3);
        expect(resolution).toMatchObject({ source: "server_policy", candidatePerformanceStars: 3 });
        expect((0, progress_event_projection_1.deriveProgressProjectionFromServerScore)({ previousBestStars: 1, resolution })).toMatchObject({ performanceStars: 3, performanceStarsDelta: 2, accessStarsEarnedDelta: 2 });
        expect(() => (0, server_score_resolver_1.assertServerScoreResolution)({ ...resolution, decisionHash: "b".repeat(64) })).toThrow("v2_server_score_hash_mismatch");
        const materialized = (0, progress_event_evidence_1.materializeProgressEvidenceBundle)({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [], nonAssessmentBodies: [] });
        const boundResolution = (0, server_score_resolver_1.resolveServerScore)({ ...input, evidenceComponentFingerprint: materialized.componentFingerprint }, () => 3);
        const plan = (0, progress_event_transaction_plan_1.prepareProgressTransactionPlanFromServerScore)({ existingEvidenceIndex: {}, materialized, resolution: boundResolution });
        expect(plan).toMatchObject({ applyProjection: true, projection: { performanceStars: 3, performanceStarsDelta: 3 } });
    });
    it("rejects positive scores for uncertain, system-failed, and skipped outcomes", () => {
        for (const resultCode of ["UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM", "SKIPPED"]) {
            expect(() => (0, server_score_resolver_1.resolveServerScore)({ ...input, resultCode }, () => 1)).toThrow("v2_server_score_result_must_be_zero");
        }
    });
    it("rejects a resolution bound to a different activity or evidence component", () => {
        const resolution = (0, server_score_resolver_1.resolveServerScore)(input, () => 2);
        expect(() => (0, server_score_resolver_1.assertServerScoreResolution)(resolution, { ...input, activityId: "activity-2" })).toThrow("v2_server_score_context_mismatch");
        expect(() => (0, server_score_resolver_1.assertServerScoreResolution)(resolution, { ...input, evidenceComponentFingerprint: "b".repeat(64) })).toThrow("v2_server_score_context_mismatch");
    });
    it("fails closed when the evaluator returns a value outside the star domain", () => {
        expect(() => (0, server_score_resolver_1.resolveServerScore)(input, () => 4)).toThrow("v2_server_score_output_invalid");
    });
});
//# sourceMappingURL=server_score_resolver.test.js.map