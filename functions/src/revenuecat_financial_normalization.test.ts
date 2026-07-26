import {
  classifyRevenueCatBillingCadence,
  normalizeRevenueCatFinancials,
} from './revenuecat_financial_normalization';

describe('normalizeRevenueCatFinancials', () => {
  it('uses integer micros and ppm and calculates estimated proceeds only with complete inputs', () => {
    expect(normalizeRevenueCatFinancials({
      price: 9.995001,
      price_in_purchased_currency: 8.5,
      currency: 'eur',
      tax_percentage: 0.2,
      commission_percentage: 0.15,
      renewal_number: 2,
      is_trial_conversion: true,
    })).toEqual({
      financialSchemaVersion: 1,
      grossUsdMicros: 9_995_001,
      grossPurchasedCurrencyMicros: 8_500_000,
      purchasedCurrency: 'EUR',
      taxRatePpm: 200_000,
      commissionRatePpm: 150_000,
      estimatedProceedsUsdMicros: 6_496_751,
      financialCoverage: 'complete',
      financialSource: 'revenuecat_webhook',
      renewalNumber: 2,
      isTrialConversion: true,
    });
  });

  it('preserves a signed refund instead of guessing its direction', () => {
    expect(normalizeRevenueCatFinancials({
      price: -4.99,
      price_in_purchased_currency: -4.99,
      currency: 'USD',
      tax_percentage: 0.1,
      commission_percentage: 0.2,
    })).toMatchObject({
      grossUsdMicros: -4_990_000,
      estimatedProceedsUsdMicros: -3_493_000,
      financialCoverage: 'complete',
    });
  });

  it('accepts lossless numeric strings from persisted or imported webhook rows', () => {
    expect(normalizeRevenueCatFinancials({
      price: '9.99',
      price_in_purchased_currency: '8.50',
      currency: 'eur',
      tax_percentage: '0.20',
      commission_percentage: '0.15',
      renewal_number: '2',
    })).toMatchObject({
      grossUsdMicros: 9_990_000,
      grossPurchasedCurrencyMicros: 8_500_000,
      taxRatePpm: 200_000,
      commissionRatePpm: 150_000,
      estimatedProceedsUsdMicros: 6_493_500,
      renewalNumber: 2,
      financialCoverage: 'complete',
    });
  });

  it('does not convert absent or invalid financial values into zero', () => {
    expect(normalizeRevenueCatFinancials({})).toEqual({
      financialSchemaVersion: 1,
      financialCoverage: 'unavailable',
      financialSource: 'revenuecat_webhook',
    });
    expect(normalizeRevenueCatFinancials({ price: 5 })).toEqual({
      financialSchemaVersion: 1,
      grossUsdMicros: 5_000_000,
      financialCoverage: 'partial',
      financialSource: 'revenuecat_webhook',
    });
    expect(normalizeRevenueCatFinancials({
      price: 5,
      tax_percentage: 0.1,
      commission_percentage: 0.2,
    })).toMatchObject({
      financialCoverage: 'partial',
      estimatedProceedsUsdMicros: 3_500_000,
    });
    expect(normalizeRevenueCatFinancials({
      price: Number.NaN,
      currency: 'not-a-currency',
      tax_percentage: 3,
    })).not.toHaveProperty('grossUsdMicros');
    expect(normalizeRevenueCatFinancials({
      price: '9.99 USD',
      tax_percentage: '15%',
    })).not.toHaveProperty('grossUsdMicros');
    expect(normalizeRevenueCatFinancials({
      price: 5,
      price_in_purchased_currency: 5,
      currency: 'USD',
      tax_percentage: 0.8,
      commission_percentage: 0.4,
    })).not.toHaveProperty('estimatedProceedsUsdMicros');
  });
});

describe('classifyRevenueCatBillingCadence', () => {
  it('uses explicit product signals and never defaults an opaque product to monthly', () => {
    expect(classifyRevenueCatBillingCadence({ product_id: 'phraseman_premium_monthly' })).toBe('monthly');
    expect(classifyRevenueCatBillingCadence({ product_id: 'phraseman_premium_yearly' })).toBe('yearly');
    expect(classifyRevenueCatBillingCadence({ product_id: 'phraseman_premium_lifetime_v1', type: 'NON_RENEWING_PURCHASE' })).toBe('lifetime');
    expect(classifyRevenueCatBillingCadence({ product_id: 'opaque-premium-sku', entitlement_ids: ['premium'] })).toBe('unknown');
  });
});
