import {
  getResultsSequenceFinalRevealPlan,
} from "../components/feedback/results_sequence_final_reveal_plan";

describe("ResultsSequence final reveal plan", () => {
  test("reduced motion settles the complete result on the first frame", () => {
    expect(getResultsSequenceFinalRevealPlan({
      nowMs: 1_000,
      mountedAtMs: 1_000,
      rewardCursorEndsAtMs: 9_000,
      hardUnlockMs: 3_000,
      immediate: true,
    })).toEqual({
      mode: "immediate",
      revealDelayMs: 0,
      detailsDurationMs: 0,
      ctaDurationMs: 0,
    });
  });

  test("normal choreography finishes details before starting CTA", () => {
    expect(getResultsSequenceFinalRevealPlan({
      nowMs: 1_000,
      mountedAtMs: 1_000,
      rewardCursorEndsAtMs: 2_000,
      hardUnlockMs: 3_000,
      immediate: false,
    })).toEqual({
      mode: "animated",
      revealDelayMs: 1_140,
      detailsDurationMs: 180,
      ctaDurationMs: 180,
    });
  });

  test("three-second ceiling uses one atomic final state", () => {
    expect(getResultsSequenceFinalRevealPlan({
      nowMs: 2_500,
      mountedAtMs: 1_000,
      rewardCursorEndsAtMs: 3_600,
      hardUnlockMs: 3_000,
      immediate: false,
    })).toEqual({
      mode: "hard-settle",
      revealDelayMs: 1_500,
      detailsDurationMs: 0,
      ctaDurationMs: 0,
    });
  });

  test("unsettled rewards never postpone the mount-based hard unlock", () => {
    expect(getResultsSequenceFinalRevealPlan({
      nowMs: 1_500,
      mountedAtMs: 1_000,
      rewardCursorEndsAtMs: 20_000,
      hardUnlockMs: 3_000,
      immediate: false,
      rewardsSettled: false,
    })).toEqual({
      mode: "hard-settle",
      revealDelayMs: 2_500,
      detailsDurationMs: 0,
      ctaDurationMs: 0,
    });
  });
});
