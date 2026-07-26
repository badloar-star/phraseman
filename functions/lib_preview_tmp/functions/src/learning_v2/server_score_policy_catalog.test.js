"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const attempt_1 = require("../../../modules/learning-v2/contracts/attempt");
const server_score_resolver_1 = require("./server_score_resolver");
const server_score_policy_catalog_1 = require("./server_score_policy_catalog");
const attemptBody = {
    schemaVersion: "v2-attempt-body.v1", opId: "catalog-attempt", attemptSurface: { kind: "episode_graph_node" },
    outcome: { resultCode: "PASS_CONFIDENT" }, evidence: { hintsUsed: 0 }, provenance: { phase: "near_transfer" },
    inputBinding: { source: "keyboard" }, learningTupleDispositions: [],
};
const attemptRef = (0, attempt_1.buildCanonicalAttemptRef)(attemptBody);
const fingerprint = "a".repeat(64);
describe("code-owned V2 scoring policy catalog", () => {
    it("exposes a hash-pinned immutable pilot ref", async () => {
        const entry = server_score_policy_catalog_1.PILOT_SCORING_POLICY_CATALOG.entries[0];
        expect(entry.ref.contentHash).toMatch(/^[a-f0-9]{64}$/);
        expect(await Promise.resolve(server_score_policy_catalog_1.PILOT_SCORING_POLICY_CATALOG.resolve(entry.ref))).toBe(entry.evaluate);
        expect(await Promise.resolve(server_score_policy_catalog_1.PILOT_SCORING_POLICY_CATALOG.resolve({ ...entry.ref, contentHash: "b".repeat(64) }))).toBeUndefined();
    });
    it("covers every pilot result code deterministically and ignores client fields", async () => {
        const entry = server_score_policy_catalog_1.PILOT_SCORING_POLICY_CATALOG.entries[0];
        const evaluate = await server_score_policy_catalog_1.PILOT_SCORING_POLICY_CATALOG.resolve(entry.ref);
        if (!evaluate || typeof evaluate !== "function")
            throw new Error("catalog_evaluator_missing");
        const expected = { PASS_CONFIDENT: 3, NEEDS_WORK_CONFIDENT: 1, UNCERTAIN: 0, INVALID_AUDIO_OR_SYSTEM: 0, CORRECT: 3, WRONG: 0, COMPLETED: 2, SKIPPED: 0 };
        for (const [resultCode, score] of Object.entries(expected)) {
            const resolution = (0, server_score_resolver_1.resolveServerScore)({ attemptRef, activityId: "a", starSlotId: "s", progressCompatibilityKey: "p", scoringPolicyRef: entry.ref, resultCode: resultCode, evidenceComponentFingerprint: fingerprint }, evaluate);
            expect(resolution.candidatePerformanceStars).toBe(score);
            expect((0, server_score_resolver_1.resolveServerScore)({ attemptRef, activityId: "a", starSlotId: "s", progressCompatibilityKey: "p", scoringPolicyRef: entry.ref, resultCode: resultCode, evidenceComponentFingerprint: fingerprint }, evaluate).decisionHash).toBe(resolution.decisionHash);
        }
    });
    it("rejects duplicate identities and unknown policy versions", async () => {
        expect(() => (0, server_score_policy_catalog_1.createCodeOwnedScoringPolicyCatalog)([server_score_policy_catalog_1.PILOT_SCORING_POLICY_BODY, server_score_policy_catalog_1.PILOT_SCORING_POLICY_BODY])).toThrow("v2_server_score_policy_duplicate");
        const entry = server_score_policy_catalog_1.PILOT_SCORING_POLICY_CATALOG.entries[0];
        expect(server_score_policy_catalog_1.PILOT_SCORING_POLICY_CATALOG.resolve({ ...entry.ref, version: 2 })).toBeUndefined();
    });
});
//# sourceMappingURL=server_score_policy_catalog.test.js.map