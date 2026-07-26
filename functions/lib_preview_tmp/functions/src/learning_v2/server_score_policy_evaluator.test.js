"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const decision_registry_1 = require("../../../modules/learning-v2/policies/decision_registry");
const progress_event_evidence_1 = require("./progress_event_evidence");
const progress_event_transaction_plan_1 = require("./progress_event_transaction_plan");
const server_score_policy_evaluator_1 = require("./server_score_policy_evaluator");
const attemptBody = {
    schemaVersion: "v2-attempt-body.v1",
    opId: "policy-attempt-1",
    attemptSurface: { kind: "episode_graph_node" },
    outcome: { resultCode: "CORRECT" },
    evidence: { hintsUsed: 0 },
    provenance: { phase: "near_transfer" },
    inputBinding: { source: "keyboard" },
    learningTupleDispositions: [],
};
const attemptRef = (0, attempt_1.buildCanonicalAttemptRef)(attemptBody);
const templateBody = {
    schemaVersion: "v2-mode-template-body.v1",
    templateId: "template-1",
    version: 1,
    policies: {
        scoring: { kind: "scoring", key: "policy.scoring.core", version: 1, contentHash: "a".repeat(64) },
    },
};
const templateRef = { templateId: templateBody.templateId, version: templateBody.version, contentHash: (0, decision_registry_1.hashCanonicalBody)(templateBody) };
const episodeRevision = {
    body: {
        activities: [{ activityId: "activity-1", activityTypeKey: "voice.short_response.v1", progressCompatibilityKey: "compat-1", templateRef }],
        starSlots: [{ starSlotId: "slot-1", acceptedNodeIds: ["node-1"] }],
        graph: { nodes: [{ nodeId: "node-1", activityId: "activity-1", starSlotId: "slot-1" }] },
    },
};
const materialized = (0, progress_event_evidence_1.materializeProgressEvidenceBundle)({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [], nonAssessmentBodies: [] });
const templates = { read: async () => ({ body: templateBody }) };
describe("trusted Functions scoring policy wiring", () => {
    it("pins activity, slot and scoring policy to the immutable Episode/template", async () => {
        await expect((0, server_score_policy_evaluator_1.resolvePinnedScoringContext)(episodeRevision, { activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "compat-1" }, templates)).resolves.toMatchObject({ activityId: "activity-1", starSlotId: "slot-1", scoringPolicyRef: { key: "policy.scoring.core", version: 1 } });
        await expect((0, server_score_policy_evaluator_1.resolvePinnedScoringContext)(episodeRevision, { activityId: "activity-1", starSlotId: "slot-other", progressCompatibilityKey: "compat-1" }, templates)).rejects.toThrow("v2_server_score_star_slot_not_pinned");
        await expect((0, server_score_policy_evaluator_1.resolvePinnedScoringContext)(episodeRevision, { activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "forged" }, templates)).rejects.toThrow("v2_server_score_activity_not_pinned");
    });
    it("fails closed when no executable policy is registered", async () => {
        await expect((0, server_score_policy_evaluator_1.resolvePinnedServerScore)({ episodeRevision, attemptRef, attemptBody, activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "compat-1", evidenceComponentFingerprint: materialized.componentFingerprint, templates, policies: { resolve: () => undefined } })).rejects.toThrow("v2_server_score_policy_missing");
    });
    it("uses the trusted policy result for first write and improvement, while lower scores do not apply", async () => {
        const resolution3 = await (0, server_score_policy_evaluator_1.resolvePinnedServerScore)({ episodeRevision, attemptRef, attemptBody, activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "compat-1", evidenceComponentFingerprint: materialized.componentFingerprint, templates, policies: { resolve: () => () => 3 } });
        const first = (0, progress_event_transaction_plan_1.prepareProgressTransactionPlanFromServerScore)({ existingEvidenceIndex: {}, existingBestStars: undefined, materialized, resolution: resolution3 });
        expect(first.applyProjection).toBe(true);
        expect(first.projection.performanceStars).toBe(3);
        const improvement = (0, progress_event_transaction_plan_1.prepareProgressTransactionPlanFromServerScore)({ existingEvidenceIndex: {}, existingBestStars: 1, materialized, resolution: resolution3 });
        expect(improvement.applyProjection).toBe(true);
        expect(improvement.projection.performanceStarsDelta).toBe(2);
        const lowerBody = { ...attemptBody, opId: "policy-attempt-2" };
        const lowerRef = (0, attempt_1.buildCanonicalAttemptRef)(lowerBody);
        const lowerEvidence = (0, progress_event_evidence_1.materializeProgressEvidenceBundle)({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef: lowerRef, evidenceBodies: [], nonAssessmentBodies: [] });
        const resolution2 = await (0, server_score_policy_evaluator_1.resolvePinnedServerScore)({ episodeRevision, attemptRef: lowerRef, attemptBody: lowerBody, activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "compat-1", evidenceComponentFingerprint: lowerEvidence.componentFingerprint, templates, policies: { resolve: () => () => 2 } });
        const lower = (0, progress_event_transaction_plan_1.prepareProgressTransactionPlanFromServerScore)({ existingEvidenceIndex: {}, existingBestStars: 3, materialized: lowerEvidence, resolution: resolution2 });
        expect(lower.applyProjection).toBe(false);
        expect(lower.projection.performanceStars).toBe(3);
    });
    it("is replay-stable and cannot be forged with a client candidateStars field", async () => {
        const resolution = await (0, server_score_policy_evaluator_1.resolvePinnedServerScore)({ episodeRevision, attemptRef, attemptBody, activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "compat-1", evidenceComponentFingerprint: materialized.componentFingerprint, templates, policies: { resolve: () => () => 1 } });
        const replay = await (0, server_score_policy_evaluator_1.resolvePinnedServerScore)({ episodeRevision, attemptRef, attemptBody: { ...attemptBody, candidateStars: 3 }, activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "compat-1", evidenceComponentFingerprint: materialized.componentFingerprint, templates, policies: { resolve: () => () => 1 } });
        expect(replay.decisionHash).toBe(resolution.decisionHash);
        expect(replay.candidatePerformanceStars).toBe(1);
    });
});
//# sourceMappingURL=server_score_policy_evaluator.test.js.map