import {
  storeProductHasTrialIntro,
  anyPackageHasTrialIntro,
} from '../app/premium_trial_signal';

const fakeProduct = (overrides: Record<string, unknown>): any => ({
  identifier: 'test_product',
  ...overrides,
});

describe('storeProductHasTrialIntro', () => {
  test('returns false when product is undefined', () => {
    expect(storeProductHasTrialIntro(undefined)).toBe(false);
  });

  test('returns false for plain product without intro/options', () => {
    expect(
      storeProductHasTrialIntro(fakeProduct({ price: 4.99, priceString: '$4.99' })),
    ).toBe(false);
  });

  test('iOS introPrice with price === 0 → true', () => {
    expect(
      storeProductHasTrialIntro(
        fakeProduct({ introPrice: { price: 0, priceString: '$0.00' } }),
      ),
    ).toBe(true);
  });

  test('iOS introPrice with priceString "0,00 ₽" → true', () => {
    expect(
      storeProductHasTrialIntro(
        fakeProduct({ introPrice: { price: 0.0, priceString: '0,00 ₽' } }),
      ),
    ).toBe(true);
  });

  test('iOS introPrice with non-zero price → false', () => {
    expect(
      storeProductHasTrialIntro(
        fakeProduct({ introPrice: { price: 0.99, priceString: '$0.99' } }),
      ),
    ).toBe(false);
  });

  test('Android subscriptionOptions[].freePhase → true', () => {
    expect(
      storeProductHasTrialIntro(
        fakeProduct({
          subscriptionOptions: [
            { freePhase: { billingPeriod: 'P1W' } },
            { freePhase: null },
          ],
        }),
      ),
    ).toBe(true);
  });

  test('Android pricingPhases with amountMicros = 0 → true', () => {
    expect(
      storeProductHasTrialIntro(
        fakeProduct({
          subscriptionOptions: [
            {
              pricingPhases: [{ price: { amountMicros: 0 } }, { price: { amountMicros: 4990000 } }],
            },
          ],
        }),
      ),
    ).toBe(true);
  });

  test('Android pricingPhases all paid → false', () => {
    expect(
      storeProductHasTrialIntro(
        fakeProduct({
          subscriptionOptions: [
            {
              pricingPhases: [{ price: { amountMicros: 990000 } }, { price: { amountMicros: 4990000 } }],
            },
          ],
        }),
      ),
    ).toBe(false);
  });

  test('defaultOption with freePhase → true', () => {
    expect(
      storeProductHasTrialIntro(
        fakeProduct({ defaultOption: { freePhase: { billingPeriod: 'P1W' } } }),
      ),
    ).toBe(true);
  });
});

describe('anyPackageHasTrialIntro', () => {
  const trialProduct = { product: { introPrice: { price: 0 } } } as any;
  const paidProduct = { product: { price: 4.99 } } as any;

  test('returns true if yearly has trial', () => {
    expect(anyPackageHasTrialIntro({ yearly: trialProduct, monthly: paidProduct })).toBe(true);
  });

  test('returns true if monthly has trial', () => {
    expect(anyPackageHasTrialIntro({ yearly: paidProduct, monthly: trialProduct })).toBe(true);
  });

  test('returns false if neither has trial', () => {
    expect(anyPackageHasTrialIntro({ yearly: paidProduct, monthly: paidProduct })).toBe(false);
  });

  test('returns false for empty packages', () => {
    expect(anyPackageHasTrialIntro({})).toBe(false);
  });
});
