import {
  LEARNING_V2_COURSE_ECONOMY_POLICY_V1,
  projectRequiredTaskStars,
  projectRequiredSessionUnlock,
  requiredSessionUnlockPrice,
  repeatRewardRateBasisPoints,
  sumRequiredSessionStars,
} from "../modules/learning-v2/contracts/course_economy";

describe("Learning V2 course economy owner contract", () => {
  it("uses one course-wide unlock ladder and never resets after lesson boundaries", () => {
    expect(
      Array.from({ length: 14 }, (_, previouslyUnlocked) =>
        requiredSessionUnlockPrice(previouslyUnlocked),
      ),
    ).toEqual([0, 45, 50, 55, 60, 65, 65, 65, 65, 65, 65, 65, 65, 65]);
    expect(requiredSessionUnlockPrice(12)).toBe(65);
    expect(requiredSessionUnlockPrice(383)).toBe(65);
  });

  it("fails closed for an invalid course progression count", () => {
    expect(() => requiredSessionUnlockPrice(-1)).toThrow(
      "course_economy_progress_invalid",
    );
    expect(() => requiredSessionUnlockPrice(1.5)).toThrow(
      "course_economy_progress_invalid",
    );
    expect(() => requiredSessionUnlockPrice(384)).toThrow(
      "course_economy_progress_invalid",
    );
  });

  it("opens the first course session for free and charges later sessions once", () => {
    expect(
      projectRequiredSessionUnlock({
        requiredSessionOrdinal: 1,
        alreadyUnlocked: false,
        currentBalance: 0,
      }),
    ).toEqual({
      allowed: true,
      chargedStars: 0,
      nextBalance: 0,
      basis: "free_first_session",
    });
    expect(
      projectRequiredSessionUnlock({
        requiredSessionOrdinal: 2,
        alreadyUnlocked: false,
        currentBalance: 45,
      }),
    ).toEqual({
      allowed: true,
      chargedStars: 45,
      nextBalance: 0,
      basis: "stars",
    });
    expect(
      projectRequiredSessionUnlock({
        requiredSessionOrdinal: 2,
        alreadyUnlocked: true,
        currentBalance: 45,
      }),
    ).toEqual({
      allowed: true,
      chargedStars: 0,
      nextBalance: 45,
      basis: "already_unlocked",
    });
  });

  it("denies an unaffordable session without changing the balance", () => {
    expect(
      projectRequiredSessionUnlock({
        requiredSessionOrdinal: 6,
        alreadyUnlocked: false,
        currentBalance: 64,
      }),
    ).toEqual({
      allowed: false,
      reason: "insufficient_stars",
      requiredStars: 65,
      currentBalance: 64,
    });
  });

  it("awards the exact 3/2/1/0 task scale", () => {
    expect(
      projectRequiredTaskStars({
        disposition: "completed",
        learnerAttempts: 1,
        hintUsed: false,
      }),
    ).toEqual({ stars: 3, countsAsLearnerError: false, retryRequired: false });
    expect(
      projectRequiredTaskStars({
        disposition: "completed",
        learnerAttempts: 2,
        hintUsed: false,
      }),
    ).toEqual({ stars: 2, countsAsLearnerError: true, retryRequired: false });
    expect(
      projectRequiredTaskStars({
        disposition: "completed",
        learnerAttempts: 1,
        hintUsed: true,
      }),
    ).toEqual({ stars: 1, countsAsLearnerError: false, retryRequired: false });
    expect(
      projectRequiredTaskStars({
        disposition: "completed",
        learnerAttempts: 3,
        hintUsed: false,
      }),
    ).toEqual({ stars: 1, countsAsLearnerError: true, retryRequired: false });
    expect(
      projectRequiredTaskStars({
        disposition: "skipped",
        learnerAttempts: 0,
        hintUsed: false,
      }),
    ).toEqual({ stars: 0, countsAsLearnerError: false, retryRequired: false });
  });

  it("does not turn a technical voice failure into a learner error", () => {
    expect(
      projectRequiredTaskStars({
        disposition: "technical_invalid",
        learnerAttempts: 0,
        hintUsed: false,
      }),
    ).toEqual({ stars: 0, countsAsLearnerError: false, retryRequired: true });
  });

  it("requires exactly twelve bounded task projections and caps a perfect session at 36", () => {
    expect(sumRequiredSessionStars(new Array(12).fill(3))).toBe(36);
    expect(sumRequiredSessionStars([3, 2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0])).toBe(18);
    expect(() => sumRequiredSessionStars(new Array(11).fill(3))).toThrow(
      "course_economy_session_stars_invalid",
    );
    expect(() => sumRequiredSessionStars([...new Array(11).fill(3), 4])).toThrow(
      "course_economy_session_stars_invalid",
    );
  });

  it("pins repeat reward rates without inventing a rounding rule", () => {
    expect(repeatRewardRateBasisPoints("perfect")).toBe(2_000);
    expect(repeatRewardRateBasisPoints("good")).toBe(1_200);
    expect(repeatRewardRateBasisPoints("with_errors")).toBe(500);
    expect(repeatRewardRateBasisPoints("skipped")).toBe(0);
    expect(LEARNING_V2_COURSE_ECONOMY_POLICY_V1.repeatRewardRounding).toBe(
      "exact_wallet_subunits",
    );
  });

  it("publishes an immutable versioned policy", () => {
    expect(LEARNING_V2_COURSE_ECONOMY_POLICY_V1).toEqual({
      schemaVersion: "learning-v2-course-economy.v1",
      totalRequiredSessions: 384,
      requiredTasksPerSession: 12,
      maximumBaseStarsPerSession: 36,
      unlockPriceLadder: [0, 45, 50, 55, 60, 65],
      repeatRewardBasisPoints: {
        perfect: 2_000,
        good: 1_200,
        with_errors: 500,
        skipped: 0,
      },
      repeatRewardRounding: "exact_wallet_subunits",
    });
    expect(Object.isFrozen(LEARNING_V2_COURSE_ECONOMY_POLICY_V1)).toBe(true);
    expect(Object.isFrozen(LEARNING_V2_COURSE_ECONOMY_POLICY_V1.unlockPriceLadder)).toBe(true);
    expect(Object.isFrozen(LEARNING_V2_COURSE_ECONOMY_POLICY_V1.repeatRewardBasisPoints)).toBe(true);
  });
});
