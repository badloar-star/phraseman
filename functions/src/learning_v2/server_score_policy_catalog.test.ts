import { buildCanonicalAttemptRef } from "../../../modules/learning-v2/contracts/attempt";
import { resolveServerScore } from "./server_score_resolver";
import {
  createCodeOwnedScoringPolicyCatalog,
  PILOT_SCORING_POLICY_BODY,
  PILOT_SCORING_POLICY_CATALOG,
} from "./server_score_policy_catalog";

const attemptBody = {
  schemaVersion: "v2-attempt-body.v1", opId: "catalog-attempt", attemptSurface: { kind: "episode_graph_node" },
  outcome: { resultCode: "PASS_CONFIDENT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "near_transfer" },
  inputBinding: { source: "keyboard" }, learningTupleDispositions: [],
} as const;
const attemptRef = buildCanonicalAttemptRef(attemptBody);
const fingerprint = "a".repeat(64);

describe("code-owned V2 scoring policy catalog", () => {
  it("exposes a hash-pinned immutable pilot ref", async () => {
    const entry = PILOT_SCORING_POLICY_CATALOG.entries[0];
    expect(entry.ref.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(await Promise.resolve(PILOT_SCORING_POLICY_CATALOG.resolve(entry.ref))).toBe(entry.evaluate);
    expect(await Promise.resolve(PILOT_SCORING_POLICY_CATALOG.resolve({ ...entry.ref, contentHash: "b".repeat(64) }))).toBeUndefined();
  });

  it("covers every pilot result code deterministically and ignores client fields", async () => {
    const entry = PILOT_SCORING_POLICY_CATALOG.entries[0];
    const evaluate = await PILOT_SCORING_POLICY_CATALOG.resolve(entry.ref);
    if (!evaluate || typeof evaluate !== "function") throw new Error("catalog_evaluator_missing");
    const expected = { PASS_CONFIDENT: 3, NEEDS_WORK_CONFIDENT: 1, UNCERTAIN: 0, INVALID_AUDIO_OR_SYSTEM: 0, CORRECT: 3, WRONG: 0, COMPLETED: 2, SKIPPED: 0 } as const;
    for (const [resultCode, score] of Object.entries(expected)) {
      const resolution = resolveServerScore({ attemptRef, activityId: "a", starSlotId: "s", progressCompatibilityKey: "p", scoringPolicyRef: entry.ref, resultCode: resultCode as never, evidenceComponentFingerprint: fingerprint }, evaluate);
      expect(resolution.candidatePerformanceStars).toBe(score);
      expect(resolveServerScore({ attemptRef, activityId: "a", starSlotId: "s", progressCompatibilityKey: "p", scoringPolicyRef: entry.ref, resultCode: resultCode as never, evidenceComponentFingerprint: fingerprint }, evaluate).decisionHash).toBe(resolution.decisionHash);
    }
  });

  it("rejects duplicate identities and unknown policy versions", async () => {
    expect(() => createCodeOwnedScoringPolicyCatalog([PILOT_SCORING_POLICY_BODY, PILOT_SCORING_POLICY_BODY])).toThrow("v2_server_score_policy_duplicate");
    const entry = PILOT_SCORING_POLICY_CATALOG.entries[0];
    expect(PILOT_SCORING_POLICY_CATALOG.resolve({ ...entry.ref, version: 2 })).toBeUndefined();
  });
});
