import { buildCanonicalAttemptRef } from "../../../modules/learning-v2/contracts/attempt";
import { hashCanonicalBody } from "../../../modules/learning-v2/policies/decision_registry";
import { deriveProgressProjectionFromServerScore } from "./progress_event_projection";
import { assertServerScoreResolution, resolveServerScore, type ServerScoreResolverInput } from "./server_score_resolver";
import { materializeProgressEvidenceBundle } from "./progress_event_evidence";
import { prepareProgressTransactionPlanFromServerScore } from "./progress_event_transaction_plan";

const attemptBody = {
  schemaVersion: "v2-attempt-body.v1",
  opId: "server-score-attempt-1",
  attemptSurface: { kind: "episode_graph_node" },
  outcome: { resultCode: "PASS_CONFIDENT" },
  evidence: { hintsUsed: 0 },
  provenance: { phase: "near_transfer" },
  inputBinding: { source: "keyboard" },
  learningTupleDispositions: [],
} as const;
const attemptRef = buildCanonicalAttemptRef(attemptBody);
const scoringPolicyRef = { kind: "scoring" as const, key: "policy.scoring.core", version: 1, contentHash: "a".repeat(64) };
const input: ServerScoreResolverInput = {
  attemptRef,
  activityId: "activity-1",
  starSlotId: "slot-1",
  progressCompatibilityKey: "compat-1",
  scoringPolicyRef,
  resultCode: "PASS_CONFIDENT",
  evidenceComponentFingerprint: hashCanonicalBody({ evidence: "bound" }),
};

describe("V2 server-owned score resolver", () => {
  it("produces a hash-pinned resolution and only that resolution can project stars", () => {
    const resolution = resolveServerScore(input, () => 3);
    expect(resolution).toMatchObject({ source: "server_policy", candidatePerformanceStars: 3 });
    expect(deriveProgressProjectionFromServerScore({ previousBestStars: 1, resolution })).toMatchObject({ performanceStars: 3, performanceStarsDelta: 2, accessStarsEarnedDelta: 2 });
    expect(() => assertServerScoreResolution({ ...resolution, decisionHash: "b".repeat(64) })).toThrow("v2_server_score_hash_mismatch");
    const materialized = materializeProgressEvidenceBundle({ schemaVersion: "v2-progress-evidence-bundle.v1", attemptRef, evidenceBodies: [], nonAssessmentBodies: [] });
    const boundResolution = resolveServerScore({ ...input, evidenceComponentFingerprint: materialized.componentFingerprint }, () => 3);
    const plan = prepareProgressTransactionPlanFromServerScore({ existingEvidenceIndex: {}, materialized, resolution: boundResolution });
    expect(plan).toMatchObject({ applyProjection: true, projection: { performanceStars: 3, performanceStarsDelta: 3 } });
  });

  it("rejects positive scores for uncertain, system-failed, and skipped outcomes", () => {
    for (const resultCode of ["UNCERTAIN", "INVALID_AUDIO_OR_SYSTEM", "SKIPPED"] as const) {
      expect(() => resolveServerScore({ ...input, resultCode }, () => 1)).toThrow("v2_server_score_result_must_be_zero");
    }
  });

  it("rejects a resolution bound to a different activity or evidence component", () => {
    const resolution = resolveServerScore(input, () => 2);
    expect(() => assertServerScoreResolution(resolution, { ...input, activityId: "activity-2" })).toThrow("v2_server_score_context_mismatch");
    expect(() => assertServerScoreResolution(resolution, { ...input, evidenceComponentFingerprint: "b".repeat(64) })).toThrow("v2_server_score_context_mismatch");
  });

  it("fails closed when the evaluator returns a value outside the star domain", () => {
    expect(() => resolveServerScore(input, () => 4 as 0 | 1 | 2 | 3)).toThrow("v2_server_score_output_invalid");
  });
});
