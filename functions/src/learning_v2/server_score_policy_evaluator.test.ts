import { buildCanonicalAttemptRef } from "../../../modules/learning-v2/contracts/attempt";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { materializeProgressEvidenceBundle } from "./progress_event_evidence";
import { prepareProgressTransactionPlanFromServerScore } from "./progress_event_transaction_plan";
import { resolvePinnedScoringContext, resolvePinnedServerScore } from "./server_score_policy_evaluator";

const attemptBody = {
  schemaVersion: "v2-attempt-body.v1",
  opId: "policy-attempt-1",
  attemptSurface: { kind: "episode_graph_node" },
  outcome: { resultCode: "CORRECT" },
  evidence: { hintsUsed: 0 },
  provenance: { phase: "near_transfer" },
  inputBinding: { source: "keyboard" },
  learningTupleDispositions: [],
} as const;
const attemptRef = buildCanonicalAttemptRef(attemptBody);
const templateBody = {
  schemaVersion: "v2-mode-template-body.v1",
  templateId: "template-1",
  version: 1,
  policies: {
    scoring: { kind: "scoring", key: "policy.scoring.core", version: 1, contentHash: "a".repeat(64) },
  },
};
const templateRef = { templateId: templateBody.templateId, version: templateBody.version, contentHash: hashCanonicalBody(templateBody) };
const episodeRevision = {
  body: {
    activities: [{ activityId: "activity-1", activityTypeKey: "voice.short_response.v1", progressCompatibilityKey: "compat-1", templateRef }],
    starSlots: [{ starSlotId: "slot-1", acceptedNodeIds: ["node-1"] }],
    graph: { nodes: [{ nodeId: "node-1", activityId: "activity-1", starSlotId: "slot-1" }] },
  },
};
const materialized = materializeProgressEvidenceBundle({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [], nonAssessmentBodies: [] });
const templates = { read: async () => ({ body: templateBody }) };

describe("trusted Functions scoring policy wiring", () => {
  it("pins activity, slot and scoring policy to the immutable Episode/template", async () => {
    await expect(resolvePinnedScoringContext(episodeRevision, { activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "compat-1" }, templates)).resolves.toMatchObject({ activityId: "activity-1", starSlotId: "slot-1", scoringPolicyRef: { key: "policy.scoring.core", version: 1 } });
    await expect(resolvePinnedScoringContext(episodeRevision, { activityId: "activity-1", starSlotId: "slot-other", progressCompatibilityKey: "compat-1" }, templates)).rejects.toThrow("v2_server_score_star_slot_not_pinned");
    await expect(resolvePinnedScoringContext(episodeRevision, { activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "forged" }, templates)).rejects.toThrow("v2_server_score_activity_not_pinned");
  });

  it("fails closed when no executable policy is registered", async () => {
    await expect(resolvePinnedServerScore({ episodeRevision, attemptRef, attemptBody, activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "compat-1", evidenceComponentFingerprint: materialized.componentFingerprint, templates, policies: { resolve: () => undefined } })).rejects.toThrow("v2_server_score_policy_missing");
  });

  it("uses the trusted policy result for first write and improvement, while lower scores do not apply", async () => {
    const resolution3 = await resolvePinnedServerScore({ episodeRevision, attemptRef, attemptBody, activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "compat-1", evidenceComponentFingerprint: materialized.componentFingerprint, templates, policies: { resolve: () => () => 3 } });
    const first = prepareProgressTransactionPlanFromServerScore({ existingEvidenceIndex: {}, existingBestStars: undefined, materialized, resolution: resolution3 });
    expect(first.applyProjection).toBe(true);
    expect(first.projection.performanceStars).toBe(3);
    const improvement = prepareProgressTransactionPlanFromServerScore({ existingEvidenceIndex: {}, existingBestStars: 1, materialized, resolution: resolution3 });
    expect(improvement.applyProjection).toBe(true);
    expect(improvement.projection.performanceStarsDelta).toBe(2);

    const lowerBody = { ...attemptBody, opId: "policy-attempt-2" } as const;
    const lowerRef = buildCanonicalAttemptRef(lowerBody);
    const lowerEvidence = materializeProgressEvidenceBundle({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef: lowerRef, evidenceBodies: [], nonAssessmentBodies: [] });
    const resolution2 = await resolvePinnedServerScore({ episodeRevision, attemptRef: lowerRef, attemptBody: lowerBody, activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "compat-1", evidenceComponentFingerprint: lowerEvidence.componentFingerprint, templates, policies: { resolve: () => () => 2 } });
    const lower = prepareProgressTransactionPlanFromServerScore({ existingEvidenceIndex: {}, existingBestStars: 3, materialized: lowerEvidence, resolution: resolution2 });
    expect(lower.applyProjection).toBe(false);
    expect(lower.projection.performanceStars).toBe(3);
  });

  it("is replay-stable and cannot be forged with a client candidateStars field", async () => {
    const resolution = await resolvePinnedServerScore({ episodeRevision, attemptRef, attemptBody, activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "compat-1", evidenceComponentFingerprint: materialized.componentFingerprint, templates, policies: { resolve: () => () => 1 } });
    const replay = await resolvePinnedServerScore({ episodeRevision, attemptRef, attemptBody: { ...attemptBody, candidateStars: 3 } as never, activityId: "activity-1", starSlotId: "slot-1", progressCompatibilityKey: "compat-1", evidenceComponentFingerprint: materialized.componentFingerprint, templates, policies: { resolve: () => () => 1 } });
    expect(replay.decisionHash).toBe(resolution.decisionHash);
    expect(replay.candidatePerformanceStars).toBe(1);
  });
});
