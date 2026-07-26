"use strict";
// зачем: владелец утвердил «бесконечный фарм с уменьшением награды»: хард-капа НЕТ,
// но точное лёгкое повторение убывает по версионной политике; полезная практика
// (должники/починка ошибок) возвращает ценность бустами. Проекция ЧИСТАЯ: целые
// basis points, целые звёзды, никакого mastery и никаких решений о доступе.
// Продовые числа в этом пакете не выбираются — рантайм получает утверждённый
// VersionedPolicyRef<'reward'> и резолвленное тело.
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOptionalPracticeRewardPolicy = validateOptionalPracticeRewardPolicy;
exports.projectOptionalPracticeReward = projectOptionalPracticeReward;
const POLICY_KEYS = Object.freeze([
    'schemaVersion',
    'key',
    'version',
    'repeatBands',
    'dueBoostBasisPoints',
    'mistakeRepairBoostBasisPoints',
    'minimumAward',
]);
const BAND_KEYS = Object.freeze(['minimumPriorExactCompletions', 'multiplierBasisPoints']);
const BASIS_DENOMINATOR = 10000;
function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function isNonNegativeInteger(value) {
    return Number.isSafeInteger(value) && Number(value) >= 0;
}
function validateOptionalPracticeRewardPolicy(value) {
    if (!isPlainObject(value))
        return { ok: false, issues: Object.freeze(['reward_policy_invalid']) };
    const input = value;
    const issues = Object.keys(input).some((key) => !POLICY_KEYS.includes(key))
        ? ['reward_policy_unknown_field']
        : [];
    if (input.schemaVersion !== 'v2-optional-practice-reward-policy.v1')
        issues.push('reward_policy_schema_invalid');
    if (typeof input.key !== 'string' || !input.key.trim())
        issues.push('reward_policy_key_required');
    if (!Number.isSafeInteger(input.version) || Number(input.version) < 1)
        issues.push('reward_policy_version_invalid');
    if (!isNonNegativeInteger(input.dueBoostBasisPoints))
        issues.push('reward_policy_due_boost_invalid');
    if (!isNonNegativeInteger(input.mistakeRepairBoostBasisPoints))
        issues.push('reward_policy_mistake_boost_invalid');
    if (!Number.isSafeInteger(input.minimumAward) || Number(input.minimumAward) < 1)
        issues.push('reward_policy_minimum_award_invalid');
    const bands = Array.isArray(input.repeatBands) ? input.repeatBands : null;
    if (!bands || bands.length === 0) {
        issues.push('reward_policy_bands_required');
    }
    else {
        let previousThreshold = -1;
        let previousMultiplier = Number.MAX_SAFE_INTEGER;
        bands.forEach((band, index) => {
            if (!isPlainObject(band) || Object.keys(band).some((key) => !BAND_KEYS.includes(key))) {
                issues.push('reward_policy_band_invalid');
                return;
            }
            if (!isNonNegativeInteger(band.minimumPriorExactCompletions))
                issues.push('reward_policy_band_invalid');
            if (!isNonNegativeInteger(band.multiplierBasisPoints))
                issues.push('reward_policy_band_invalid');
            // зачем: первая полоса обязана начинаться с нуля — иначе новичок без повторов
            // не попадает ни в одну полосу и проекция не определена.
            if (index === 0 && band.minimumPriorExactCompletions !== 0)
                issues.push('reward_policy_first_band_invalid');
            if (Number(band.minimumPriorExactCompletions) <= previousThreshold)
                issues.push('reward_policy_thresholds_not_increasing');
            if (Number(band.multiplierBasisPoints) > previousMultiplier)
                issues.push('reward_policy_multipliers_increasing');
            previousThreshold = Number(band.minimumPriorExactCompletions);
            previousMultiplier = Number(band.multiplierBasisPoints);
        });
    }
    if (issues.length)
        return { ok: false, issues: Object.freeze([...new Set(issues)]) };
    return { ok: true, value: Object.freeze(input) };
}
function projectOptionalPracticeReward(input, policy) {
    const policyValidation = validateOptionalPracticeRewardPolicy(policy);
    if (!policyValidation.ok) {
        throw new Error(`reward_policy_invalid: ${policyValidation.issues.join(',')}`);
    }
    if (!isPlainObject(input)
        || !Number.isSafeInteger(input.baseStars) || input.baseStars < 0
        || !Number.isSafeInteger(input.priorExactCompletions) || input.priorExactCompletions < 0
        || typeof input.due !== 'boolean'
        || typeof input.mistakeRepair !== 'boolean') {
        throw new Error('reward_input_invalid');
    }
    // Полоса выбирается по числу ТОЧНЫХ прошлых прохождений: последняя, чей порог достигнут.
    let band = policy.repeatBands[0];
    for (const candidate of policy.repeatBands) {
        if (input.priorExactCompletions >= candidate.minimumPriorExactCompletions)
            band = candidate;
    }
    const basis = band.multiplierBasisPoints
        + (input.due ? policy.dueBoostBasisPoints : 0)
        + (input.mistakeRepair ? policy.mistakeRepairBoostBasisPoints : 0);
    const awardedStars = Math.max(policy.minimumAward, Math.floor((input.baseStars * basis) / BASIS_DENOMINATOR));
    return Object.freeze({
        awardedStars,
        hardCapReached: false,
        policyKey: policy.key,
        policyVersion: policy.version,
    });
}
//# sourceMappingURL=optional_practice_reward.js.map