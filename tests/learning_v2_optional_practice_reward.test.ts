// зачем: владелец решил — фарм без хард-капа, но точное лёгкое повторение убывает по
// версионной политике; полезная практика (должники/починка ошибок) возвращает ценность.
// Продовые числа здесь НЕ выбираются — только тестовая политика.
import {
  projectOptionalPracticeReward,
  validateOptionalPracticeRewardPolicy,
} from '../modules/learning-v2/progress/optional_practice_reward';

const policy = {
  schemaVersion: 'v2-optional-practice-reward-policy.v1' as const,
  key: 'optional-practice-test-policy',
  version: 1,
  repeatBands: [
    { minimumPriorExactCompletions: 0, multiplierBasisPoints: 10000 },
    { minimumPriorExactCompletions: 2, multiplierBasisPoints: 6000 },
    { minimumPriorExactCompletions: 5, multiplierBasisPoints: 2500 },
  ],
  dueBoostBasisPoints: 2000,
  mistakeRepairBoostBasisPoints: 2000,
  minimumAward: 1,
};

test('has no hard cap and diminishes exact easy repetition', () => {
  const first = projectOptionalPracticeReward({ baseStars: 4, priorExactCompletions: 0, due: false, mistakeRepair: false }, policy);
  const repeated = projectOptionalPracticeReward({ baseStars: 4, priorExactCompletions: 8, due: false, mistakeRepair: false }, policy);
  expect(first.awardedStars).toBe(4);
  expect(repeated.awardedStars).toBeGreaterThan(0);
  expect(repeated.awardedStars).toBeLessThan(first.awardedStars);
  expect(repeated.hardCapReached).toBe(false);
});

test('restores useful value for due and mistake-repair practice', () => {
  const plain = projectOptionalPracticeReward({ baseStars: 10, priorExactCompletions: 8, due: false, mistakeRepair: false }, policy);
  const useful = projectOptionalPracticeReward({ baseStars: 10, priorExactCompletions: 8, due: true, mistakeRepair: true }, policy);
  expect(useful.awardedStars).toBeGreaterThan(plain.awardedStars);
});

test('cannot output mastery or access decisions', () => {
  const result = projectOptionalPracticeReward({ baseStars: 4, priorExactCompletions: 0, due: false, mistakeRepair: false }, policy);
  expect(result).toEqual({ awardedStars: 4, hardCapReached: false, policyKey: 'optional-practice-test-policy', policyVersion: 1 });
  expect(result).not.toHaveProperty('mastered');
  expect(result).not.toHaveProperty('accessAllowed');
});

// зачем: доп. броня — политика проверяется fail-closed: пороги строго растут,
// множители не растут, отрицательные и дробные значения запрещены; вход тоже.
test('rejects malformed policies fail-closed', () => {
  expect(validateOptionalPracticeRewardPolicy(policy).ok).toBe(true);
  expect(validateOptionalPracticeRewardPolicy({
    ...policy,
    repeatBands: [
      { minimumPriorExactCompletions: 0, multiplierBasisPoints: 10000 },
      { minimumPriorExactCompletions: 0, multiplierBasisPoints: 6000 },
    ],
  })).toMatchObject({ ok: false, issues: expect.arrayContaining(['reward_policy_thresholds_not_increasing']) });
  expect(validateOptionalPracticeRewardPolicy({
    ...policy,
    repeatBands: [
      { minimumPriorExactCompletions: 0, multiplierBasisPoints: 6000 },
      { minimumPriorExactCompletions: 2, multiplierBasisPoints: 10000 },
    ],
  })).toMatchObject({ ok: false, issues: expect.arrayContaining(['reward_policy_multipliers_increasing']) });
  expect(validateOptionalPracticeRewardPolicy({
    ...policy,
    repeatBands: [{ minimumPriorExactCompletions: 1, multiplierBasisPoints: 10000 }],
  })).toMatchObject({ ok: false, issues: expect.arrayContaining(['reward_policy_first_band_invalid']) });
  expect(validateOptionalPracticeRewardPolicy({ ...policy, minimumAward: 0 })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['reward_policy_minimum_award_invalid']),
  });
  expect(validateOptionalPracticeRewardPolicy({ ...policy, hidden: 1 })).toMatchObject({
    ok: false,
    issues: expect.arrayContaining(['reward_policy_unknown_field']),
  });
  expect(() => projectOptionalPracticeReward(
    { baseStars: -1, priorExactCompletions: 0, due: false, mistakeRepair: false },
    policy,
  )).toThrow('reward_input_invalid');
  expect(() => projectOptionalPracticeReward(
    { baseStars: 4, priorExactCompletions: 0.5, due: false, mistakeRepair: false },
    policy,
  )).toThrow('reward_input_invalid');
});

test('never awards below the policy minimum and stays integer', () => {
  const tiny = projectOptionalPracticeReward({ baseStars: 1, priorExactCompletions: 20, due: false, mistakeRepair: false }, policy);
  expect(tiny.awardedStars).toBe(policy.minimumAward);
  const boosted = projectOptionalPracticeReward({ baseStars: 7, priorExactCompletions: 3, due: true, mistakeRepair: false }, policy);
  expect(Number.isSafeInteger(boosted.awardedStars)).toBe(true);
  expect(Object.isFrozen(boosted)).toBe(true);
});
