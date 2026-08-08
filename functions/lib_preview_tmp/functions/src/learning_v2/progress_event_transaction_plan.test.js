"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const progress_event_evidence_1 = require("./progress_event_evidence");
const progress_event_transaction_plan_1 = require("./progress_event_transaction_plan");
const attemptBody = { schemaVersion: "v2-attempt-body.v1", opId: "plan-attempt-1", attemptSurface: { kind: "episode_graph_node" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "near_transfer" }, inputBinding: { source: "keyboard" }, learningTupleDispositions: [] };
const attemptRef = (0, attempt_1.buildCanonicalAttemptRef)(attemptBody);
describe("V2 transaction preparation plan", () => {
    it("combines bounded evidence merge and best-score decision", () => {
        const materialized = (0, progress_event_evidence_1.materializeProgressEvidenceBundle)({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [], nonAssessmentBodies: [] });
        const projection = { performanceStars: 2, performanceStarsDelta: 0, accessStarsEarnedDelta: 0, accessStarsPurchasedDelta: 0, starSlotId: "slot-1", activityId: "activity-1", progressCompatibilityKey: "compat-1" };
        expect((0, progress_event_transaction_plan_1.prepareProgressTransactionPlan)({ existingEvidenceIndex: {}, existingBestStars: 2, materialized, projection })).toMatchObject({ applyProjection: false, evidenceComponentFingerprint: materialized.componentFingerprint });
    });
    it("fails closed when a client projection tries to mint stars", () => {
        const materialized = (0, progress_event_evidence_1.materializeProgressEvidenceBundle)({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [], nonAssessmentBodies: [] });
        const positive = { performanceStars: 2, performanceStarsDelta: 2, accessStarsEarnedDelta: 2, accessStarsPurchasedDelta: 0, starSlotId: "slot-1", activityId: "activity-1", progressCompatibilityKey: "compat-1" };
        expect(() => (0, progress_event_transaction_plan_1.prepareProgressTransactionPlan)({ existingEvidenceIndex: {}, existingBestStars: 1, materialized, projection: positive })).toThrow("v2_progress_projection_untrusted");
        expect(() => (0, progress_event_transaction_plan_1.prepareProgressTransactionPlan)({ existingEvidenceIndex: {}, materialized, projection: positive })).toThrow("v2_progress_projection_untrusted");
    });
});
//# sourceMappingURL=progress_event_transaction_plan.test.js.map