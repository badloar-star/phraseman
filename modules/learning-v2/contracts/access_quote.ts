/** Hash-free shape and binding checks for a server-issued Access Boost quote. */

export interface V2AccessQuote {
  readonly quoteId: string;
  readonly stableId: string;
  readonly seasonId: string;
  readonly gateId: string;
  readonly policyVersion: string;
  readonly releaseId: string;
  readonly expiresAtMs: number;
  readonly earnedDeficit: number;
  readonly accessStarsToApply: number;
  readonly unitPriceShards: number;
  readonly totalCostShards: number;
}

export interface V2AccessPurchaseRequest {
  readonly opId: string;
  readonly quoteId: string;
  readonly stableId: string;
  readonly seasonId: string;
  readonly gateId: string;
  readonly releaseId: string;
  readonly policyVersion: string;
  readonly expectedCostShards: number;
}

export type AccessQuoteValidation =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: 'quote_invalid' | 'quote_expired' | 'binding_mismatch' };

const nonEmpty = (value: string): boolean => typeof value === 'string' && value.length > 0;
const safeNonNegative = (value: number): boolean => Number.isSafeInteger(value) && value >= 0;

export const validateAccessQuoteForPurchase = (
  quote: V2AccessQuote,
  request: V2AccessPurchaseRequest,
  nowMs: number,
): AccessQuoteValidation => {
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
  if (
    quoteStrings.some((value) => !nonEmpty(value)) ||
    requestStrings.some((value) => !nonEmpty(value)) ||
    !Number.isSafeInteger(nowMs) ||
    !Number.isSafeInteger(quote.expiresAtMs) ||
    quote.expiresAtMs <= 0 ||
    !safeNonNegative(quote.earnedDeficit) ||
    quote.earnedDeficit < 1 ||
    quote.accessStarsToApply !== quote.earnedDeficit ||
    !Number.isSafeInteger(quote.unitPriceShards) ||
    quote.unitPriceShards < 1 ||
    !safeNonNegative(quote.totalCostShards) ||
    quote.totalCostShards !== quote.earnedDeficit * quote.unitPriceShards ||
    !safeNonNegative(request.expectedCostShards)
  ) {
    return { valid: false, reason: 'quote_invalid' };
  }
  if (nowMs >= quote.expiresAtMs) return { valid: false, reason: 'quote_expired' };
  if (
    request.quoteId !== quote.quoteId ||
    request.stableId !== quote.stableId ||
    request.seasonId !== quote.seasonId ||
    request.gateId !== quote.gateId ||
    request.releaseId !== quote.releaseId ||
    request.policyVersion !== quote.policyVersion ||
    request.expectedCostShards !== quote.totalCostShards
  ) {
    return { valid: false, reason: 'binding_mismatch' };
  }
  return { valid: true };
};
