export type ResultsSequenceFinalRevealPlan = Readonly<{
  mode: "immediate" | "hard-settle" | "animated";
  revealDelayMs: number;
  detailsDurationMs: number;
  ctaDurationMs: number;
}>;

export function getResultsSequenceFinalRevealPlan(input: Readonly<{
  nowMs: number;
  mountedAtMs: number;
  rewardCursorEndsAtMs: number;
  hardUnlockMs: number;
  immediate: boolean;
  rewardsSettled?: boolean;
  detailsDurationMs?: number;
  ctaDurationMs?: number;
}>): ResultsSequenceFinalRevealPlan {
  const detailsDurationMs = Math.max(0, input.detailsDurationMs ?? 180);
  const ctaDurationMs = Math.max(0, input.ctaDurationMs ?? 180);
  if (input.immediate) {
    return {
      mode: "immediate",
      revealDelayMs: 0,
      detailsDurationMs: 0,
      ctaDurationMs: 0,
    };
  }
  const timelineDelayMs = Math.max(
    0,
    input.rewardCursorEndsAtMs - input.nowMs + 140,
  );
  const hardLimitDelayMs = Math.max(
    0,
    input.hardUnlockMs - (input.nowMs - input.mountedAtMs),
  );
  if (input.rewardsSettled === false) {
    return {
      mode: "hard-settle",
      revealDelayMs: hardLimitDelayMs,
      detailsDurationMs: 0,
      ctaDurationMs: 0,
    };
  }
  if (timelineDelayMs + detailsDurationMs + ctaDurationMs > hardLimitDelayMs) {
    return {
      mode: "hard-settle",
      revealDelayMs: hardLimitDelayMs,
      detailsDurationMs: 0,
      ctaDurationMs: 0,
    };
  }
  return {
    mode: "animated",
    revealDelayMs: timelineDelayMs,
    detailsDurationMs,
    ctaDurationMs,
  };
}
