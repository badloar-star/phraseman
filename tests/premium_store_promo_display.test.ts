import { getStorePromoPricing } from '../app/premium_store_promo_display';

describe('getStorePromoPricing', () => {
  it('returns null without product', () => {
    expect(getStorePromoPricing(undefined, { platform: 'android' })).toBeNull();
  });

  it('ignores an Android promo that is not the default purchase option', () => {
    const product: any = {
      priceString: '₴144.99',
      defaultOption: {
        id: 'base',
        pricingPhases: [
          { price: { amountMicros: 14499900, formatted: '₴144.99' } },
        ],
      },
      subscriptionOptions: [
        {
          id: 'offer-50',
          pricingPhases: [
            { price: { amountMicros: 7249950, formatted: '₴72.50' } },
            { price: { amountMicros: 14499900, formatted: '₴144.99' } },
          ],
        },
      ],
    };
    expect(getStorePromoPricing(product, { platform: 'android' })).toBeNull();
  });

  it('uses only the Android default purchase option promo phases', () => {
    const product: any = {
      priceString: '₴100',
      subscriptionPeriod: 'P1M',
      defaultOption: {
        id: 'with-trial',
        pricingPhases: [
          {
            billingPeriod: { iso8601: 'P1M' },
            billingCycleCount: 1,
            recurrenceMode: 2,
            price: { amountMicros: 50000000, formatted: '₴50' },
          },
          {
            billingPeriod: { iso8601: 'P1M' },
            billingCycleCount: null,
            recurrenceMode: 1,
            price: { amountMicros: 100000000, formatted: '₴100' },
          },
        ],
      },
    };
    const r = getStorePromoPricing(product, { platform: 'android' });
    expect(r).not.toBeNull();
    expect(r!.discountPercent).toBe(50);
    expect(r!.promoPriceString).toBe('₴50');
    expect(r!.standardPriceString).toBe('₴100');
  });

  it('shows an iOS paid introductory price only for confirmed eligibility', () => {
    const product: any = {
      price: 10,
      priceString: '$10.00',
      subscriptionPeriod: 'P1M',
      introPrice: { price: 5, priceString: '$5.00', cycles: 1, period: 'P1M' },
    };
    const r = getStorePromoPricing(product, {
      platform: 'ios',
      iosEligibility: 'eligible',
    });
    expect(r).not.toBeNull();
    expect(r!.discountPercent).toBe(50);
  });

  it.each(['unknown', 'ineligible'] as const)(
    'hides an iOS paid introductory price when eligibility is %s',
    (iosEligibility) => {
      const product: any = {
        price: 10,
        priceString: '$10.00',
        subscriptionPeriod: 'P1M',
        introPrice: { price: 5, priceString: '$5.00', cycles: 1, period: 'P1M' },
      };
      expect(getStorePromoPricing(product, { platform: 'ios', iosEligibility })).toBeNull();
    },
  );

  it('does not interpret platform-specific offer data on another platform', () => {
    const product: any = {
      price: 10,
      priceString: '$10.00',
      subscriptionPeriod: 'P1M',
      introPrice: { price: 5, priceString: '$5.00', cycles: 1, period: 'P1M' },
      defaultOption: {
        pricingPhases: [
          { billingPeriod: { iso8601: 'P1M' }, billingCycleCount: 1, recurrenceMode: 2, price: { amountMicros: 5000000, formatted: '$5.00' } },
          { billingPeriod: { iso8601: 'P1M' }, billingCycleCount: null, recurrenceMode: 1, price: { amountMicros: 10000000, formatted: '$10.00' } },
        ],
      },
    };
    expect(getStorePromoPricing(product, { platform: 'android' })?.promoPriceString).toBe('$5.00');
    expect(getStorePromoPricing(product, { platform: 'ios', iosEligibility: 'unknown' })).toBeNull();
  });

  it('hides a three-paid-phase Android offer that the current UI cannot fully disclose', () => {
    const product: any = {
      priceString: '€60',
      subscriptionPeriod: 'P1Y',
      defaultOption: {
        pricingPhases: [
          { billingPeriod: { iso8601: 'P1M' }, billingCycleCount: 1, recurrenceMode: 2, price: { amountMicros: 30000000, formatted: '€30' } },
          { billingPeriod: { iso8601: 'P1M' }, billingCycleCount: 2, recurrenceMode: 2, price: { amountMicros: 40000000, formatted: '€40' } },
          { billingPeriod: { iso8601: 'P1Y' }, billingCycleCount: null, recurrenceMode: 1, price: { amountMicros: 60000000, formatted: '€60' } },
        ],
      },
    };
    expect(getStorePromoPricing(product, { platform: 'android' })).toBeNull();
  });

  it('hides Android promo cadence that differs from the selected product period', () => {
    const product: any = {
      priceString: '€60',
      subscriptionPeriod: 'P1Y',
      defaultOption: {
        pricingPhases: [
          { billingPeriod: { iso8601: 'P1M' }, billingCycleCount: 1, recurrenceMode: 2, price: { amountMicros: 30000000, formatted: '€30' } },
          { billingPeriod: { iso8601: 'P1Y' }, billingCycleCount: null, recurrenceMode: 1, price: { amountMicros: 60000000, formatted: '€60' } },
        ],
      },
    };
    expect(getStorePromoPricing(product, { platform: 'android' })).toBeNull();
  });

  it('hides multi-cycle or period-mismatched iOS introductory pricing', () => {
    const base: any = { price: 60, priceString: '€60', subscriptionPeriod: 'P1Y' };
    expect(getStorePromoPricing({
      ...base,
      introPrice: { price: 30, priceString: '€30', cycles: 2, period: 'P1Y' },
    }, { platform: 'ios', iosEligibility: 'eligible' })).toBeNull();
    expect(getStorePromoPricing({
      ...base,
      introPrice: { price: 30, priceString: '€30', cycles: 1, period: 'P1M' },
    }, { platform: 'ios', iosEligibility: 'eligible' })).toBeNull();
  });

  it('hides a promo when cadence metadata is incomplete', () => {
    const product: any = {
      priceString: '€60',
      subscriptionPeriod: 'P1Y',
      defaultOption: {
        pricingPhases: [
          { price: { amountMicros: 30000000, formatted: '€30' } },
          { price: { amountMicros: 60000000, formatted: '€60' } },
        ],
      },
    };
    expect(getStorePromoPricing(product, { platform: 'android' })).toBeNull();
  });

  it('returns null when only single paid phase', () => {
    const product: any = {
      priceString: '₴100',
      defaultOption: {
        id: 'base',
        pricingPhases: [{ price: { amountMicros: 100000000, formatted: '₴100' } }],
      },
    };
    expect(getStorePromoPricing(product, { platform: 'android' })).toBeNull();
  });
});
