import { getStorePromoPricing } from '../app/premium_store_promo_display';

describe('getStorePromoPricing', () => {
  it('returns null without product', () => {
    expect(getStorePromoPricing(undefined)).toBeNull();
  });

  it('detects Android-style multi-phase promo (promo then full)', () => {
    const product: any = {
      priceString: '₴144.99',
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
    const r = getStorePromoPricing(product);
    expect(r).not.toBeNull();
    expect(r!.discountPercent).toBe(50);
    expect(r!.promoPriceString).toContain('72');
    expect(r!.standardPriceString).toContain('144');
  });

  it('skips free trial phase but keeps paid promo chain', () => {
    const product: any = {
      priceString: '₴100',
      defaultSubscriptionOption: {
        id: 'with-trial',
        pricingPhases: [
          { price: { amountMicros: 0, formatted: '₴0' } },
          { price: { amountMicros: 50000000, formatted: '₴50' } },
          { price: { amountMicros: 100000000, formatted: '₴100' } },
        ],
      },
    };
    const r = getStorePromoPricing(product);
    expect(r).not.toBeNull();
    expect(r!.discountPercent).toBe(50);
  });

  it('detects iOS paid introductory vs regular price', () => {
    const product: any = {
      price: 10,
      priceString: '$10.00',
      introPrice: { price: 5, priceString: '$5.00' },
    };
    const r = getStorePromoPricing(product);
    expect(r).not.toBeNull();
    expect(r!.discountPercent).toBe(50);
  });

  it('returns null when only single paid phase', () => {
    const product: any = {
      priceString: '₴100',
      subscriptionOptions: [
        {
          id: 'base',
          pricingPhases: [{ price: { amountMicros: 100000000, formatted: '₴100' } }],
        },
      ],
    };
    expect(getStorePromoPricing(product)).toBeNull();
  });
});
