"use strict";
/** Hash-free shape and binding checks for a server-issued Access Boost quote. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAccessQuoteForPurchase = void 0;
const nonEmpty = (value) => typeof value === 'string' && value.trim().length > 0;
const safeNonNegative = (value) => Number.isSafeInteger(value) && value >= 0;
const validateAccessQuoteForPurchase = (quote, request, nowMs) => {
    if (quote === null || typeof quote !== 'object' ||
        request === null || typeof request !== 'object') {
        return { valid: false, reason: 'quote_invalid' };
    }
    const quoteStrings = [
        quote.quoteId,
        quote.stableId,
        quote.seasonId,
        quote.gateId,
        quote.policyVersion,
        quote.releaseId,
    ];
    const requestStrings = [
        request.opId,
        request.quoteId,
        request.stableId,
        request.seasonId,
        request.gateId,
        request.releaseId,
        request.policyVersion,
    ];
    if (quoteStrings.some((value) => !nonEmpty(value)) ||
        requestStrings.some((value) => !nonEmpty(value)) ||
        !Number.isSafeInteger(nowMs) ||
        nowMs < 0 ||
        !Number.isSafeInteger(quote.expiresAtMs) ||
        quote.expiresAtMs <= 0 ||
        !safeNonNegative(quote.earnedDeficit) ||
        quote.earnedDeficit < 1 ||
        quote.earnedDeficit > 3 ||
        quote.accessStarsToApply !== quote.earnedDeficit ||
        !Number.isSafeInteger(quote.unitPriceShards) ||
        quote.unitPriceShards < 1 ||
        !safeNonNegative(quote.totalCostShards) ||
        quote.totalCostShards !== quote.earnedDeficit * quote.unitPriceShards ||
        !safeNonNegative(request.expectedCostShards)) {
        return { valid: false, reason: 'quote_invalid' };
    }
    if (nowMs >= quote.expiresAtMs)
        return { valid: false, reason: 'quote_expired' };
    if (request.quoteId !== quote.quoteId ||
        request.stableId !== quote.stableId ||
        request.seasonId !== quote.seasonId ||
        request.gateId !== quote.gateId ||
        request.releaseId !== quote.releaseId ||
        request.policyVersion !== quote.policyVersion ||
        request.expectedCostShards !== quote.totalCostShards) {
        return { valid: false, reason: 'binding_mismatch' };
    }
    return { valid: true };
};
exports.validateAccessQuoteForPurchase = validateAccessQuoteForPurchase;
//# sourceMappingURL=access_quote.js.map