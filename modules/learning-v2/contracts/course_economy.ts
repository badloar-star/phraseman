export type LearningV2RepeatQualityBand =
  | "perfect"
  | "good"
  | "with_errors"
  | "skipped";

export type RequiredTaskDisposition =
  | "completed"
  | "skipped"
  | "technical_invalid";

export interface RequiredTaskStarInput {
  readonly disposition: RequiredTaskDisposition;
  /** Counts learner answers only. Technical capture failures never increment it. */
  readonly learnerAttempts: number;
  readonly hintUsed: boolean;
}

export interface RequiredTaskStarProjection {
  readonly stars: 0 | 1 | 2 | 3;
  readonly countsAsLearnerError: boolean;
  readonly retryRequired: boolean;
}

export interface RequiredSessionUnlockInput {
  /** One-based ordinal across all 32 × 12 required sessions. */
  readonly requiredSessionOrdinal: number;
  readonly alreadyUnlocked: boolean;
  readonly currentBalance: number;
}

export type RequiredSessionUnlockProjection =
  | {
      readonly allowed: true;
      readonly chargedStars: number;
      readonly nextBalance: number;
      readonly basis: "already_unlocked" | "free_first_session" | "stars";
    }
  | {
      readonly allowed: false;
      readonly reason: "insufficient_stars";
      readonly requiredStars: number;
      readonly currentBalance: number;
    };

const TOTAL_REQUIRED_SESSIONS = 32 * 12;
const REQUIRED_TASKS_PER_SESSION = 12;

const unlockPriceLadder = Object.freeze([0, 45, 50, 55, 60, 65] as const);
const repeatRewardBasisPoints = Object.freeze({
  perfect: 2_000,
  good: 1_200,
  with_errors: 500,
  skipped: 0,
} as const);

/** Versioned owner policy. Fractional repeat value is exact in 1/10,000 stars. */
export const LEARNING_V2_COURSE_ECONOMY_POLICY_V1 = Object.freeze({
  schemaVersion: "learning-v2-course-economy.v1" as const,
  totalRequiredSessions: TOTAL_REQUIRED_SESSIONS,
  requiredTasksPerSession: REQUIRED_TASKS_PER_SESSION,
  maximumBaseStarsPerSession: REQUIRED_TASKS_PER_SESSION * 3,
  unlockPriceLadder,
  repeatRewardBasisPoints,
  repeatRewardRounding: "exact_wallet_subunits" as const,
});

/** Returns the price of the next required session across the whole course. */
export const requiredSessionUnlockPrice = (
  previouslyUnlockedRequiredSessions: number,
): 0 | 45 | 50 | 55 | 60 | 65 => {
  if (
    !Number.isSafeInteger(previouslyUnlockedRequiredSessions) ||
    previouslyUnlockedRequiredSessions < 0 ||
    previouslyUnlockedRequiredSessions >= TOTAL_REQUIRED_SESSIONS
  ) {
    throw new Error("course_economy_progress_invalid");
  }
  const ladderIndex = Math.min(
    previouslyUnlockedRequiredSessions,
    unlockPriceLadder.length - 1,
  );
  return unlockPriceLadder[ladderIndex];
};

export const projectRequiredSessionUnlock = (
  input: RequiredSessionUnlockInput,
): RequiredSessionUnlockProjection => {
  if (
    !Number.isSafeInteger(input.requiredSessionOrdinal) ||
    input.requiredSessionOrdinal < 1 ||
    input.requiredSessionOrdinal > TOTAL_REQUIRED_SESSIONS ||
    typeof input.alreadyUnlocked !== "boolean" ||
    !Number.isSafeInteger(input.currentBalance) ||
    input.currentBalance < 0
  ) {
    throw new Error("course_economy_unlock_input_invalid");
  }
  if (input.alreadyUnlocked) {
    return Object.freeze({
      allowed: true,
      chargedStars: 0,
      nextBalance: input.currentBalance,
      basis: "already_unlocked",
    });
  }

  const requiredStars = requiredSessionUnlockPrice(
    input.requiredSessionOrdinal - 1,
  );
  if (input.currentBalance < requiredStars) {
    return Object.freeze({
      allowed: false,
      reason: "insufficient_stars",
      requiredStars,
      currentBalance: input.currentBalance,
    });
  }
  return Object.freeze({
    allowed: true,
    chargedStars: requiredStars,
    nextBalance: input.currentBalance - requiredStars,
    basis: requiredStars === 0 ? "free_first_session" : "stars",
  });
};

export const projectRequiredTaskStars = (
  input: RequiredTaskStarInput,
): RequiredTaskStarProjection => {
  if (
    (input.disposition !== "completed" &&
      input.disposition !== "skipped" &&
      input.disposition !== "technical_invalid") ||
    !Number.isSafeInteger(input.learnerAttempts) ||
    input.learnerAttempts < 0 ||
    typeof input.hintUsed !== "boolean" ||
    (input.disposition === "completed" && input.learnerAttempts < 1)
  ) {
    throw new Error("course_economy_task_result_invalid");
  }

  if (input.disposition === "technical_invalid") {
    return { stars: 0, countsAsLearnerError: false, retryRequired: true };
  }
  if (input.disposition === "skipped") {
    return { stars: 0, countsAsLearnerError: false, retryRequired: false };
  }

  const stars: 1 | 2 | 3 = input.hintUsed
    ? 1
    : input.learnerAttempts === 1
      ? 3
      : input.learnerAttempts === 2
        ? 2
        : 1;
  return {
    stars,
    countsAsLearnerError: input.learnerAttempts > 1,
    retryRequired: false,
  };
};

export const sumRequiredSessionStars = (
  taskStars: readonly number[],
): number => {
  if (
    taskStars.length !== REQUIRED_TASKS_PER_SESSION ||
    taskStars.some(
      (stars) => !Number.isSafeInteger(stars) || stars < 0 || stars > 3,
    )
  ) {
    throw new Error("course_economy_session_stars_invalid");
  }
  return taskStars.reduce((total, stars) => total + stars, 0);
};

export const repeatRewardRateBasisPoints = (
  qualityBand: LearningV2RepeatQualityBand,
): 0 | 500 | 1_200 | 2_000 => {
  if (!Object.prototype.hasOwnProperty.call(repeatRewardBasisPoints, qualityBand)) {
    throw new Error("course_economy_repeat_band_invalid");
  }
  return repeatRewardBasisPoints[qualityBand];
};
