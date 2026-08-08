"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.REFERRAL_ANALYTICS_EVENTS = exports.REFERRAL_LEDGER_ROLLOUT_AT_MS = exports.THIRTY_DAYS_MS = exports.SEVEN_DAYS_MS = exports.DAY_MS = void 0;
exports.policyTimestampMs = policyTimestampMs;
exports.referralRoulettePolicyFromData = referralRoulettePolicyFromData;
exports.canCreateNewReferral = canCreateNewReferral;
exports.attributionDeadlineMs = attributionDeadlineMs;
exports.canQualifyAt = canQualifyAt;
exports.existingQualifiedDrainEligible = existingQualifiedDrainEligible;
exports.creditExpiryMs = creditExpiryMs;
exports.legacyCreditExpiryMs = legacyCreditExpiryMs;
exports.canConsumeCreditSource = canConsumeCreditSource;
exports.DAY_MS = 24 * 60 * 60 * 1000;
exports.SEVEN_DAYS_MS = 7 * exports.DAY_MS;
exports.THIRTY_DAYS_MS = 30 * exports.DAY_MS;
/**
 * One global compatibility anchor for aggregate credits that predate the ledger.
 * It must never be replaced with a per-user migration or first-touch timestamp.
 */
exports.REFERRAL_LEDGER_ROLLOUT_AT_MS = Date.parse('2026-07-22T00:00:00.000Z');
function policyTimestampMs(value) {
    if (typeof value === 'number' && Number.isFinite(value))
        return Math.max(0, Math.floor(value));
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    }
    if (value instanceof Date)
        return Math.max(0, Math.floor(value.getTime()));
    if (value && typeof value === 'object' && typeof value.toMillis === 'function') {
        const parsed = Number(value.toMillis());
        return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
    }
    return 0;
}
function referralRoulettePolicyFromData(data) {
    const numbers = data?.numbers;
    return {
        softEnabled: numbers?.referral_roulette_enabled !== false,
        emergencyStop: numbers?.referral_roulette_emergency_stop === true,
        softOffAtMs: policyTimestampMs(numbers?.referral_roulette_soft_off_at_ms),
    };
}
function canCreateNewReferral(policy) {
    return policy.softEnabled && !policy.emergencyStop;
}
function attributionDeadlineMs(createdAtMs) {
    return createdAtMs > 0 ? createdAtMs + exports.SEVEN_DAYS_MS : 0;
}
/** The grandfather deadline is inclusive; one millisecond later is rejected. */
function canQualifyAt(policy, createdAtMs, passAtMs) {
    if (policy.emergencyStop)
        return false;
    if (policy.softEnabled)
        return true;
    const deadlineAtMs = attributionDeadlineMs(createdAtMs);
    return createdAtMs > 0
        && policy.softOffAtMs > 0
        && createdAtMs <= policy.softOffAtMs
        && passAtMs > 0
        && passAtMs <= deadlineAtMs;
}
/**
 * A row qualified before soft OFF is already earned. Rows qualified after OFF
 * must have been created before the cutoff and completed inside their 7-day window.
 * Missing qualifiedAt is accepted only for pre-ledger legacy qualified rows.
 */
function existingQualifiedDrainEligible(row, policy) {
    if (policy.emergencyStop)
        return false;
    if (policy.softEnabled)
        return true;
    if (row.createdAtMs <= 0 || policy.softOffAtMs <= 0 || row.createdAtMs > policy.softOffAtMs)
        return false;
    if (row.qualifiedAtMs <= 0)
        return true;
    if (row.qualifiedAtMs <= policy.softOffAtMs)
        return true;
    return row.qualifiedAtMs <= attributionDeadlineMs(row.createdAtMs);
}
function creditExpiryMs(earnedAtMs) {
    return Math.max(0, Math.floor(earnedAtMs)) + exports.THIRTY_DAYS_MS;
}
function legacyCreditExpiryMs() {
    return creditExpiryMs(exports.REFERRAL_LEDGER_ROLLOUT_AT_MS);
}
function canConsumeCreditSource(softEnabled, source) {
    return softEnabled || source === 'referral' || source === 'legacy_aggregate';
}
exports.REFERRAL_ANALYTICS_EVENTS = Object.freeze({
    attributionCreated: 'referral_attribution_created',
    attributionExpired: 'referral_attribution_expired',
    attributionQualified: 'referral_attribution_qualified',
    creditEarned: 'referral_credit_earned',
    creditConsumed: 'referral_credit_consumed',
    creditExpired: 'referral_credit_expired',
});
//# sourceMappingURL=referral_roulette_policy.js.map