export const LESSON_REPLAY_XP_RATE = 0.2;

export type LessonReplayXpState = {
  normalBaseXpTotal: number;
  awardedBaseXpTotal: number;
};

export type LessonAnswerBaseXp = LessonReplayXpState & {
  baseXp: number;
  normalBaseXp: number;
};

const safeXp = (value: unknown): number => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0;
};

/**
 * A replay receives 20% of the base XP that the same answers would earn during
 * a normal pass. Rounding is cumulative, so fifty small answer rewards do not
 * inflate the advertised 20% rate. Global XP multipliers are applied later by
 * registerXP to the returned baseXp exactly as they are for a first pass.
 */
export function resolveLessonAnswerBaseXp(
  normalBaseXp: number,
  isLessonReplay: boolean,
  replayState: LessonReplayXpState,
): LessonAnswerBaseXp {
  const safeNormalBaseXp = safeXp(normalBaseXp);
  const previousNormalTotal = safeXp(replayState.normalBaseXpTotal);
  const previousAwardedTotal = safeXp(replayState.awardedBaseXpTotal);

  if (!isLessonReplay) {
    return {
      baseXp: safeNormalBaseXp,
      normalBaseXp: safeNormalBaseXp,
      normalBaseXpTotal: previousNormalTotal,
      awardedBaseXpTotal: previousAwardedTotal,
    };
  }

  const normalBaseXpTotal = previousNormalTotal + safeNormalBaseXp;
  const targetAwardedTotal = Math.round(normalBaseXpTotal * LESSON_REPLAY_XP_RATE);
  const baseXp = Math.max(0, targetAwardedTotal - previousAwardedTotal);

  return {
    baseXp,
    normalBaseXp: safeNormalBaseXp,
    normalBaseXpTotal,
    awardedBaseXpTotal: previousAwardedTotal + baseXp,
  };
}
