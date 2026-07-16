import {
  validateAccessQuoteForPurchase,
  type V2AccessQuote,
  type V2AccessPurchaseRequest,
} from '../modules/learning-v2/contracts/access_quote';

const quote: V2AccessQuote = {
  quoteId: 'quote-1',
  stableId: 'user-1',
  seasonId: 'season-1',
  gateId: 'gate-2',
  policyVersion: 'gate-policy-v1',
  releaseId: 'release-1',
  expiresAtMs: 2_000,
  earnedDeficit: 2,
  accessStarsToApply: 2,
  unitPriceShards: 3,
  totalCostShards: 6,
};

const request: V2AccessPurchaseRequest = {
  opId: 'op-1',
  quoteId: 'quote-1',
  stableId: 'user-1',
  seasonId: 'season-1',
  gateId: 'gate-2',
  releaseId: 'release-1',
  policyVersion: 'gate-policy-v1',
  expectedCostShards: 6,
};

describe('V2 access quote binding', () => {
  it('accepts an unexpired exact owner/release/policy/cost binding', () => {
    expect(validateAccessQuoteForPurchase(quote, request, 1_000)).toEqual({ valid: true });
  });

  it.each([
    ['owner', { stableId: 'user-2' }],
    ['quote id', { quoteId: 'quote-2' }],
    ['release', { releaseId: 'release-2' }],
    ['policy', { policyVersion: 'gate-policy-2' }],
    ['cost', { expectedCostShards: 3 }],
  ])('rejects %s mismatch', (_label, override) => {
    expect(validateAccessQuoteForPurchase(quote, { ...request, ...override }, 1_000)).toEqual({
      valid: false,
      reason: 'binding_mismatch',
    });
  });

  it('rejects stale quote and arithmetic mismatch before spending', () => {
    expect(validateAccessQuoteForPurchase(quote, request, 2_000)).toEqual({
      valid: false,
      reason: 'quote_expired',
    });
    expect(
      validateAccessQuoteForPurchase({ ...quote, totalCostShards: 5 }, request, 1_000),
    ).toEqual({ valid: false, reason: 'quote_invalid' });
  });

  it('rejects forged over-cap quotes, negative time, whitespace IDs and null runtime input', () => {
    expect(
      validateAccessQuoteForPurchase({ ...quote, earnedDeficit: 4, accessStarsToApply: 4, totalCostShards: 12 }, request, 1_000),
    ).toEqual({ valid: false, reason: 'quote_invalid' });
    expect(validateAccessQuoteForPurchase(quote, request, -1)).toEqual({ valid: false, reason: 'quote_invalid' });
    expect(validateAccessQuoteForPurchase({ ...quote, gateId: '   ' }, request, 1_000)).toEqual({ valid: false, reason: 'quote_invalid' });
    expect(validateAccessQuoteForPurchase(null as unknown as V2AccessQuote, request, 1_000)).toEqual({ valid: false, reason: 'quote_invalid' });
  });
});
