import assert from "node:assert/strict";

import {
  getResultsSequenceFinalRevealPlan,
} from "../components/feedback/results_sequence_final_reveal_plan";

assert.deepEqual(getResultsSequenceFinalRevealPlan({
  nowMs: 1_000,
  mountedAtMs: 1_000,
  rewardCursorEndsAtMs: 9_000,
  hardUnlockMs: 3_000,
  immediate: true,
}), {
  mode: "immediate",
  revealDelayMs: 0,
  detailsDurationMs: 0,
  ctaDurationMs: 0,
});

assert.deepEqual(getResultsSequenceFinalRevealPlan({
  nowMs: 1_500,
  mountedAtMs: 1_000,
  rewardCursorEndsAtMs: 20_000,
  hardUnlockMs: 3_000,
  immediate: false,
  rewardsSettled: false,
}), {
  mode: "hard-settle",
  revealDelayMs: 2_500,
  detailsDurationMs: 0,
  ctaDurationMs: 0,
});

assert.deepEqual(getResultsSequenceFinalRevealPlan({
  nowMs: 1_000,
  mountedAtMs: 1_000,
  rewardCursorEndsAtMs: 2_000,
  hardUnlockMs: 3_000,
  immediate: false,
}), {
  mode: "animated",
  revealDelayMs: 1_140,
  detailsDurationMs: 180,
  ctaDurationMs: 180,
});

assert.deepEqual(getResultsSequenceFinalRevealPlan({
  nowMs: 2_500,
  mountedAtMs: 1_000,
  rewardCursorEndsAtMs: 3_600,
  hardUnlockMs: 3_000,
  immediate: false,
}), {
  mode: "hard-settle",
  revealDelayMs: 1_500,
  detailsDurationMs: 0,
  ctaDurationMs: 0,
});

console.log("RESULTS SEQUENCE FINAL REVEAL PLAN GATE: PASS");
