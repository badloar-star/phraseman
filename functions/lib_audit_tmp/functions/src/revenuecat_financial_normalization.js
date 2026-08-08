"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyRevenueCatBillingCadence = classifyRevenueCatBillingCadence;
exports.normalizeRevenueCatFinancials = normalizeRevenueCatFinancials;
function classifyRevenueCatBillingCadence(input) {
    const productId = String(input.product_id ?? '').trim().toLowerCase();
    const eventType = String(input.type ?? '').trim().toUpperCase();
    if (/lifetime|forever|one.?time|onetime|perpetual/.test(productId) || eventType === 'NON_RENEWING_PURCHASE')
        return 'lifetime';
    if (/year|yearly|annual|12.?month/.test(productId))
        return 'yearly';
    if (/month|monthly|1.?month/.test(productId))
        return 'monthly';
    return 'unknown';
}
function finiteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
function moneyMicros(value) {
    const parsed = finiteNumber(value);
    if (parsed == null || Math.abs(parsed) > Number.MAX_SAFE_INTEGER / 1000000)
        return null;
    return Math.round(parsed * 1000000);
}
function ratePpm(value) {
    const parsed = finiteNumber(value);
    if (parsed == null || parsed < 0 || parsed > 1)
        return null;
    return Math.round(parsed * 1000000);
}
function currencyCode(value) {
    const code = String(value ?? '').trim().toUpperCase();
    return /^[A-Z]{3}$/.test(code) ? code : null;
}
function renewalNumber(value) {
    const parsed = finiteNumber(value);
    if (parsed == null || parsed < 0 || !Number.isInteger(parsed))
        return null;
    return Math.min(parsed, 10000);
}
function normalizeRevenueCatFinancials(input) {
    const grossUsdMicros = moneyMicros(input.price);
    const grossPurchasedCurrencyMicros = moneyMicros(input.price_in_purchased_currency);
    const purchasedCurrency = currencyCode(input.currency);
    const taxRatePpm = ratePpm(input.tax_percentage);
    const commissionRatePpm = ratePpm(input.commission_percentage);
    const normalizedRenewalNumber = renewalNumber(input.renewal_number);
    const hasAnyFinancial = grossUsdMicros != null
        || grossPurchasedCurrencyMicros != null
        || purchasedCurrency != null
        || taxRatePpm != null
        || commissionRatePpm != null;
    const complete = grossUsdMicros != null
        && grossPurchasedCurrencyMicros != null
        && purchasedCurrency != null
        && taxRatePpm != null
        && commissionRatePpm != null
        && taxRatePpm + commissionRatePpm <= 1000000;
    const canEstimateUsdProceeds = grossUsdMicros != null
        && taxRatePpm != null
        && commissionRatePpm != null
        && taxRatePpm + commissionRatePpm <= 1000000;
    const out = {
        financialSchemaVersion: 1,
        financialCoverage: complete ? 'complete' : hasAnyFinancial ? 'partial' : 'unavailable',
        financialSource: 'revenuecat_webhook',
    };
    if (grossUsdMicros != null)
        out.grossUsdMicros = grossUsdMicros;
    if (grossPurchasedCurrencyMicros != null)
        out.grossPurchasedCurrencyMicros = grossPurchasedCurrencyMicros;
    if (purchasedCurrency != null)
        out.purchasedCurrency = purchasedCurrency;
    if (taxRatePpm != null)
        out.taxRatePpm = taxRatePpm;
    if (commissionRatePpm != null)
        out.commissionRatePpm = commissionRatePpm;
    if (canEstimateUsdProceeds) {
        out.estimatedProceedsUsdMicros = Math.round(grossUsdMicros * (1 - (taxRatePpm + commissionRatePpm) / 1000000));
    }
    if (normalizedRenewalNumber != null)
        out.renewalNumber = normalizedRenewalNumber;
    if (typeof input.is_trial_conversion === 'boolean')
        out.isTrialConversion = input.is_trial_conversion;
    return out;
}
//# sourceMappingURL=revenuecat_financial_normalization.js.map