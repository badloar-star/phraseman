import { buildCanonicalAttemptRef } from "../../../modules/learning-v2/contracts/attempt";
import { materializeProgressEvidenceBundle } from "./progress_event_evidence";
import { prepareProgressTransactionPlan } from "./progress_event_transaction_plan";

const attemptBody = { schemaVersion: "v2-attempt-body.v1", opId: "plan-attempt-1", attemptSurface: { kind: "episode_graph_node" }, outcome: { resultCode: "CORRECT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "near_transfer" }, inputBinding: { source: "keyboard" }, learningTupleDispositions: [] } as const;
const attemptRef = buildCanonicalAttemptRef(attemptBody);

describe("V2 transaction preparation plan", () => {
  it("combines bounded evidence merge and best-score decision", () => {
    const materialized = materializeProgressEvidenceBundle({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [], nonAssessmentBodies: [] });
    const projection = { performanceStars: 2, performanceStarsDelta: 0, accessStarsEarnedDelta: 0, accessStarsPurchasedDelta: 0 as const, starSlotId: "slot-1", activityId: "activity-1", progressCompatibilityKey: "compat-1" };
    expect(prepareProgressTransactionPlan({ existingEvidenceIndex: {}, existingBestStars: 2, materialized, projection })).toMatchObject({ applyProjection: false, evidenceComponentFingerprint: materialized.componentFingerprint });
  });

  it("fails closed when a client projection tries to mint stars", () => {
    const materialized = materializeProgressEvidenceBundle({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [], nonAssessmentBodies: [] });
    const positive = { performanceStars: 2, performanceStarsDelta: 2, accessStarsEarnedDelta: 2, accessStarsPurchasedDelta: 0 as const, starSlotId: "slot-1", activityId: "activity-1", progressCompatibilityKey: "compat-1" };
    expect(() => prepareProgressTransactionPlan({ existingEvidenceIndex: {}, existingBestStars: 1, materialized, projection: positive })).toThrow("v2_progress_projection_untrusted");
    expect(() => prepareProgressTransactionPlan({ existingEvidenceIndex: {}, materialized, projection: positive })).toThrow("v2_progress_projection_untrusted");
  });
});
