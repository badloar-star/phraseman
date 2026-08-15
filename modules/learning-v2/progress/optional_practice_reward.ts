// зачем: владелец утвердил «бесконечный фарм с уменьшением награды»: хард-капа НЕТ,
// но точное лёгкое повторение убывает по версионной политике; полезная практика
// (должники/починка ошибок) возвращает ценность бустами. Проекция ЧИСТАЯ: целые
// basis points, целые звёзды, никакого mastery и никаких решений о доступе.
// Продовые числа в этом пакете не выбираются — рантайм получает утверждённый
// VersionedPolicyRef<'reward'> и резолвленное тело.

export interface V2OptionalPracticeRepeatBand {
  readonly minimumPriorExactCompletions: number;
  readonly multiplierBasisPoints: number;
}

export interface V2OptionalPracticeRewardPolicy {
  readonly schemaVersion: 'v2-optional-practice-reward-policy.v1';
  readonly key: string;
  readonly version: number;
  readonly repeatBands: readonly V2OptionalPracticeRepeatBand[];
  readonly dueBoostBasisPoints: number;
  readonly mistakeRepairBoostBasisPoints: number;
  readonly minimumAward: number;
}

export interface V2OptionalPracticeRewardInput {
  readonly baseStars: number;
  readonly priorExactCompletions: number;
  readonly due: boolean;
  readonly mistakeRepair: boolean;
}

export interface V2OptionalPracticeRewardProjection {
  readonly awardedStars: number;
  readonly hardCapReached: false;
  readonly policyKey: string;
  readonly policyVersion: number;
}

export interface V2OptionalPracticeRewardPolicyV2 {
  readonly schemaVersion: 'v2-optional-practice-reward-policy.v2';
  readonly key: string;
  readonly version: number;
  readonly repeatBands: readonly V2OptionalPracticeRepeatBand[];
  readonly dueBoostBasisPoints: number;
  readonly mistakeRepairBoostBasisPoints: number;
}

export interface V2OptionalPracticeRewardCarryInput extends V2OptionalPracticeRewardInput {
  readonly carryRemainderBasisPoints: number;
}

export interface V2OptionalPracticeRewardCarryProjection {
  readonly awardedStars: number;
  readonly nextCarryRemainderBasisPoints: number;
  readonly hardCapReached: false;
  readonly policyKey: string;
  readonly policyVersion: number;
}

export type V2RewardPolicyValidation =
  | { readonly ok: true; readonly value: Readonly<V2OptionalPracticeRewardPolicy> }
  | { readonly ok: false; readonly issues: readonly string[] };

const POLICY_KEYS = Object.freeze([
  'schemaVersion',
  'key',
  'version',
  'repeatBands',
  'dueBoostBasisPoints',
  'mistakeRepairBoostBasisPoints',
  'minimumAward',
] as const);
const BAND_KEYS = Object.freeze(['minimumPriorExactCompletions', 'multiplierBasisPoints'] as const);
const BASIS_DENOMINATOR = 10000;
const POLICY_V2_KEYS = Object.freeze([
  'schemaVersion', 'key', 'version', 'repeatBands',
  'dueBoostBasisPoints', 'mistakeRepairBoostBasisPoints',
] as const);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export function validateOptionalPracticeRewardPolicy(value: unknown): V2RewardPolicyValidation {
  if (!isPlainObject(value)) return { ok: false, issues: Object.freeze(['reward_policy_invalid']) };
  const input = value;
  const issues: string[] = Object.keys(input).some((key) => !POLICY_KEYS.includes(key as (typeof POLICY_KEYS)[number]))
    ? ['reward_policy_unknown_field']
    : [];

  if (input.schemaVersion !== 'v2-optional-practice-reward-policy.v1') issues.push('reward_policy_schema_invalid');
  if (typeof input.key !== 'string' || !input.key.trim()) issues.push('reward_policy_key_required');
  if (!Number.isSafeInteger(input.version) || Number(input.version) < 1) issues.push('reward_policy_version_invalid');
  if (!isNonNegativeInteger(input.dueBoostBasisPoints)) issues.push('reward_policy_due_boost_invalid');
  if (!isNonNegativeInteger(input.mistakeRepairBoostBasisPoints)) issues.push('reward_policy_mistake_boost_invalid');
  if (!Number.isSafeInteger(input.minimumAward) || Number(input.minimumAward) < 1) issues.push('reward_policy_minimum_award_invalid');

  const bands = Array.isArray(input.repeatBands) ? input.repeatBands : null;
  if (!bands || bands.length === 0) {
    issues.push('reward_policy_bands_required');
  } else {
    let previousThreshold = -1;
    let previousMultiplier = Number.MAX_SAFE_INTEGER;
    bands.forEach((band, index) => {
      if (!isPlainObject(band) || Object.keys(band).some((key) => !BAND_KEYS.includes(key as (typeof BAND_KEYS)[number]))) {
        issues.push('reward_policy_band_invalid');
        return;
      }
      if (!isNonNegativeInteger(band.minimumPriorExactCompletions)) issues.push('reward_policy_band_invalid');
      if (!isNonNegativeInteger(band.multiplierBasisPoints)) issues.push('reward_policy_band_invalid');
      // зачем: первая полоса обязана начинаться с нуля — иначе новичок без повторов
      // не попадает ни в одну полосу и проекция не определена.
      if (index === 0 && band.minimumPriorExactCompletions !== 0) issues.push('reward_policy_first_band_invalid');
      if (Number(band.minimumPriorExactCompletions) <= previousThreshold) issues.push('reward_policy_thresholds_not_increasing');
      if (Number(band.multiplierBasisPoints) > previousMultiplier) issues.push('reward_policy_multipliers_increasing');
      previousThreshold = Number(band.minimumPriorExactCompletions);
      previousMultiplier = Number(band.multiplierBasisPoints);
    });
  }

  if (issues.length) return { ok: false, issues: Object.freeze([...new Set(issues)]) };
  return { ok: true, value: Object.freeze(input as unknown as V2OptionalPracticeRewardPolicy) };
}

export function projectOptionalPracticeReward(
  input: V2OptionalPracticeRewardInput,
  policy: V2OptionalPracticeRewardPolicy,
): V2OptionalPracticeRewardProjection {
  const policyValidation = validateOptionalPracticeRewardPolicy(policy);
  if (!policyValidation.ok) {
    throw new Error(`reward_policy_invalid: ${policyValidation.issues.join(',')}`);
  }
  if (
    !isPlainObject(input)
    || !Number.isSafeInteger(input.baseStars) || input.baseStars < 0
    || !Number.isSafeInteger(input.priorExactCompletions) || input.priorExactCompletions < 0
    || typeof input.due !== 'boolean'
    || typeof input.mistakeRepair !== 'boolean'
  ) {
    throw new Error('reward_input_invalid');
  }

  // Полоса выбирается по числу ТОЧНЫХ прошлых прохождений: последняя, чей порог достигнут.
  let band = policy.repeatBands[0];
  for (const candidate of policy.repeatBands) {
    if (input.priorExactCompletions >= candidate.minimumPriorExactCompletions) band = candidate;
  }

  const basis = band.multiplierBasisPoints
    + (input.due ? policy.dueBoostBasisPoints : 0)
    + (input.mistakeRepair ? policy.mistakeRepairBoostBasisPoints : 0);
  const awardedStars = Math.max(
    policy.minimumAward,
    Math.floor((input.baseStars * basis) / BASIS_DENOMINATOR),
  );

  return Object.freeze({
    awardedStars,
    hardCapReached: false as const,
    policyKey: policy.key,
    policyVersion: policy.version,
  });
}

export function validateOptionalPracticeRewardPolicyV2(
  value: unknown,
): value is Readonly<V2OptionalPracticeRewardPolicyV2> {
  if (!isPlainObject(value) ||
    Object.keys(value).length !== POLICY_V2_KEYS.length ||
    Object.keys(value).some((key) => !POLICY_V2_KEYS.includes(key as typeof POLICY_V2_KEYS[number])) ||
    value.schemaVersion !== 'v2-optional-practice-reward-policy.v2' ||
    typeof value.key !== 'string' || !value.key.trim() ||
    !Number.isSafeInteger(value.version) || Number(value.version) < 1 ||
    !isNonNegativeInteger(value.dueBoostBasisPoints) ||
    !isNonNegativeInteger(value.mistakeRepairBoostBasisPoints) ||
    !Array.isArray(value.repeatBands) || value.repeatBands.length === 0) return false;
  let priorThreshold = -1;
  let priorMultiplier = Number.MAX_SAFE_INTEGER;
  return value.repeatBands.every((band, index) => {
    if (!isPlainObject(band) || Object.keys(band).length !== BAND_KEYS.length ||
      Object.keys(band).some((key) => !BAND_KEYS.includes(key as typeof BAND_KEYS[number])) ||
      !isNonNegativeInteger(band.minimumPriorExactCompletions) ||
      !isNonNegativeInteger(band.multiplierBasisPoints) ||
      Number(band.multiplierBasisPoints) > BASIS_DENOMINATOR ||
      (index === 0 && band.minimumPriorExactCompletions !== 0) ||
      Number(band.minimumPriorExactCompletions) <= priorThreshold ||
      Number(band.multiplierBasisPoints) > priorMultiplier) return false;
    priorThreshold = Number(band.minimumPriorExactCompletions);
    priorMultiplier = Number(band.multiplierBasisPoints);
    return true;
  });
}

/** Exact carry-forward projection: no per-award round-up and no lost fraction. */
export function projectOptionalPracticeRewardWithRemainder(
  input: V2OptionalPracticeRewardCarryInput,
  policy: V2OptionalPracticeRewardPolicyV2,
): V2OptionalPracticeRewardCarryProjection {
  if (!validateOptionalPracticeRewardPolicyV2(policy) || !isPlainObject(input) ||
    !Number.isSafeInteger(input.baseStars) || input.baseStars < 0 ||
    !Number.isSafeInteger(input.priorExactCompletions) || input.priorExactCompletions < 0 ||
    typeof input.due !== 'boolean' || typeof input.mistakeRepair !== 'boolean' ||
    !Number.isSafeInteger(input.carryRemainderBasisPoints) ||
    input.carryRemainderBasisPoints < 0 || input.carryRemainderBasisPoints >= BASIS_DENOMINATOR) {
    throw new Error('reward_carry_input_invalid');
  }
  let band = policy.repeatBands[0];
  for (const candidate of policy.repeatBands) {
    if (input.priorExactCompletions >= candidate.minimumPriorExactCompletions) band = candidate;
  }
  const basis = band.multiplierBasisPoints
    + (input.due ? policy.dueBoostBasisPoints : 0)
    + (input.mistakeRepair ? policy.mistakeRepairBoostBasisPoints : 0);
  if (!Number.isSafeInteger(basis) || basis < 0) throw new Error('reward_carry_input_invalid');
  if (input.baseStars === 0) {
    return Object.freeze({
      awardedStars: 0,
      nextCarryRemainderBasisPoints: input.carryRemainderBasisPoints,
      hardCapReached: false as const,
      policyKey: policy.key,
      policyVersion: policy.version,
    });
  }
  const numerator = input.baseStars * basis + input.carryRemainderBasisPoints;
  if (!Number.isSafeInteger(numerator)) throw new Error('reward_carry_input_invalid');
  return Object.freeze({
    awardedStars: Math.floor(numerator / BASIS_DENOMINATOR),
    nextCarryRemainderBasisPoints: numerator % BASIS_DENOMINATOR,
    hardCapReached: false as const,
    policyKey: policy.key,
    policyVersion: policy.version,
  });
}
