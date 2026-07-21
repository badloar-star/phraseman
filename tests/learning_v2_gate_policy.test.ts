import {
  evaluateGatePolicy,
  episodeGateRequirement,
  localPerformanceMinimum,
} from "../modules/learning-v2/progress/gate_policy";

describe("Learning V2 gate policy", () => {
  it("matches the canonical local minimum bands and is monotonic", () => {
    expect(localPerformanceMinimum(1)).toBe(14);
    expect(localPerformanceMinimum(8)).toBe(14);
    expect(localPerformanceMinimum(9)).toBe(15);
    expect(localPerformanceMinimum(17)).toBe(16);
    expect(localPerformanceMinimum(25)).toBe(17);
    const requirements = Array.from({ length: 31 }, (_, i) =>
      episodeGateRequirement(i + 2),
    );
    expect(requirements).toEqual([
      14, 27, 41, 54, 68, 82, 96, 111, 125, 140, 154, 169, 185, 200, 215, 231,
      247, 263, 279, 295, 311, 328, 345, 361, 379, 396, 413, 431, 448, 466, 484,
    ]);
    expect(() => episodeGateRequirement(1)).toThrow("gate_target_invalid");
    expect(() => episodeGateRequirement(33)).toThrow("gate_target_invalid");
  });

  it("requires loops, fallback and checkpoint before earned access", () => {
    expect(
      evaluateGatePolicy({
        targetEpisode: 2,
        alreadyUnlocked: false,
        requiredLoopsComplete: false,
        capabilityFallbackComplete: true,
        priorEpisodePerformanceEarned: 24,
        checkpointDecision: "not_required",
        cumulativeAccessEarned: 24,
        purchasedAccessApplied: 0,
      }),
    ).toMatchObject({ allowed: false, reason: "required_loops" });
    expect(
      evaluateGatePolicy({
        targetEpisode: 2,
        alreadyUnlocked: false,
        requiredLoopsComplete: true,
        capabilityFallbackComplete: true,
        priorEpisodePerformanceEarned: 24,
        checkpointDecision: "not_required",
        cumulativeAccessEarned: 24,
        purchasedAccessApplied: 0,
      }).allowed,
    ).toBe(true);
  });

  it("never treats purchased access as checkpoint evidence", () => {
    const result = evaluateGatePolicy({
      targetEpisode: 5,
      alreadyUnlocked: false,
      requiredLoopsComplete: true,
      capabilityFallbackComplete: true,
      priorEpisodePerformanceEarned: 24,
      checkpointDecision: "incomplete",
      cumulativeAccessEarned: 0,
      purchasedAccessApplied: 999,
    });
    expect(result).toMatchObject({ allowed: false, reason: "checkpoint" });
  });
});
