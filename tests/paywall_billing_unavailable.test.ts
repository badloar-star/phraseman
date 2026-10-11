// зачем (владелец 11.10: «РАЗБЕРИСЬ ПОЧЕМУ ЦЕНЫ НЕ ПОКАЗЫВАЮТСЯ»): на устройстве без Google Play окно ждало 17–22 с
// повторов заведомого отказа. Сторожим: отказ «биллинг недоступен» распознаётся и не повторяется; предпросмотр цен —
// только в dev и никогда в стор-сборке.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isStoreBillingUnavailableError, shouldUseDevPricePreview } from '../app/paywall_billing_unavailable';

describe('isStoreBillingUnavailableError', () => {
  it.each([
    ['код RevenueCat PURCHASE_NOT_ALLOWED', { code: '3', message: 'x' }],
    ['readableErrorCode', { code: '99', readableErrorCode: 'PurchaseNotAllowedError' }],
    ['текст Google Play', { message: 'Billing service unavailable on device.' }],
    ['underlying BILLING_UNAVAILABLE', { userInfo: { underlyingErrorMessage: 'BILLING_UNAVAILABLE' } }],
    ['строка', 'PurchaseNotAllowedError'],
  ])('%s → магазин недоступен', (_label, error) => {
    expect(isStoreBillingUnavailableError(error)).toBe(true);
  });

  it.each([
    ['тайм-аут', new Error('timeout:getOfferings')],
    ['сеть', { code: '10', message: 'Error performing request.' }],
    ['пусто', null],
  ])('%s → не «магазин недоступен» (повторяем)', (_label, error) => {
    expect(isStoreBillingUnavailableError(error)).toBe(false);
  });
});

describe('shouldUseDevPricePreview', () => {
  it('только dev, только «биллинг недоступен»', () => {
    expect(shouldUseDevPricePreview({ isDev: true, isStoreRelease: false, reason: 'billing_unavailable' })).toBe(true);
    expect(shouldUseDevPricePreview({ isDev: true, isStoreRelease: false, reason: 'network' })).toBe(false);
    expect(shouldUseDevPricePreview({ isDev: true, isStoreRelease: false, reason: null })).toBe(false);
  });

  it('в стор-сборке — никогда', () => {
    expect(shouldUseDevPricePreview({ isDev: true, isStoreRelease: true, reason: 'billing_unavailable' })).toBe(false);
    expect(shouldUseDevPricePreview({ isDev: false, isStoreRelease: false, reason: 'billing_unavailable' })).toBe(false);
  });
});

describe('paywall_purchase: подключение', () => {
  const source = readFileSync(join(__dirname, '..', 'app', 'paywall_purchase.ts'), 'utf8').replace(/\r\n/g, '\n');

  it('отказ «биллинг недоступен» прерывает повторы', () => {
    expect(source).toMatch(/if \(result\.billingUnavailable\) \{[\s\S]{0,200}break;/);
  });

  it('предпросмотр решается через shouldUseDevPricePreview с IS_STORE_RELEASE, а тап в предпросмотре магазин не зовёт', () => {
    expect(source).toContain('isStoreRelease: IS_STORE_RELEASE');
    expect(source).toContain('if (DEV_IAP_BYPASS || previewPrices) {');
  });

  it('причина сбоя отдаётся окну', () => {
    expect(source).toContain("setStoreUnavailableReason(result.billingUnavailable ? 'billing_unavailable' : 'network')");
    expect(source).toContain('storeUnavailableReason, previewPrices,');
  });
});
