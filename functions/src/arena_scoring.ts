export const ARENA_SCORING = {
  correctBase: 100,
  speedBonusMax: 50,
  speedBonusThresholdMs: 2000,
  streakBonus: 30,
  streakThreshold: 3,
  firstAnswerBonus: 20,
  outspeedBonus: 15,
  outspeedThresholdMs: 10_000,
} as const;

export function calculateArenaPoints(
  answer: string | null,
  correct: string,
  timeMs: number,
  context?: {
    previousCorrectStreak?: number;
    hasAnyCorrectBefore?: boolean;
  },
): {
  isCorrect: boolean;
  points: number;
  bonus: {
    speed: number;
    streak: number;
    first: number;
    outspeed: number;
  };
} {
  const isCorrect = answer != null && answer === correct;
  if (!isCorrect) {
    return {
      isCorrect: false,
      points: 0,
      bonus: { speed: 0, streak: 0, first: 0, outspeed: 0 },
    };
  }

  const safeTimeMs = Number.isFinite(timeMs) ? Math.max(0, timeMs) : ARENA_SCORING.speedBonusThresholdMs;
  const speedBonus = safeTimeMs < ARENA_SCORING.speedBonusThresholdMs
    ? Math.round(
      ARENA_SCORING.speedBonusMax
      * (1 - safeTimeMs / ARENA_SCORING.speedBonusThresholdMs),
    )
    : 0;
  const streak = (context?.previousCorrectStreak ?? 0) + 1;
  const streakBonus = streak > 0 && streak % ARENA_SCORING.streakThreshold === 0
    ? ARENA_SCORING.streakBonus
    : 0;
  const firstBonus = context?.hasAnyCorrectBefore ? 0 : ARENA_SCORING.firstAnswerBonus;
  // Keep current app behavior in real matches: outspeed is based on fast answer threshold.
  const outspeedBonus = safeTimeMs < ARENA_SCORING.outspeedThresholdMs
    ? ARENA_SCORING.outspeedBonus
    : 0;
  const points = ARENA_SCORING.correctBase + speedBonus + streakBonus + firstBonus + outspeedBonus;

  return {
    isCorrect: true,
    points,
    bonus: {
      speed: speedBonus,
      streak: streakBonus,
      first: firstBonus,
      outspeed: outspeedBonus,
    },
  };
}
