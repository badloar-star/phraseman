// зачем (координатор 12.10): dev-состояния пейвола для съёмки paywalls-012/015/016/018 — только память, в стор-сборке не действуют; хвост окна прошлого состояния
// не перекрывает следующий кадр.
let mockStoreRelease = false;
jest.mock('../app/config', () => ({
  ...jest.requireActual('../app/config'),
  get IS_STORE_RELEASE() { return mockStoreRelease; },
}));

import fs from 'node:fs';
import path from 'node:path';

import { applyDevPaywallView, DEV_PAYWALL_STATES, parseDevPaywallState, type PaywallDevView } from '../app/dev_paywall_state';
import { clearThemedBlockingAlerts, enqueueThemedBlockingInfoAlert, getThemedBlockingAlertHead } from '../app/themed_blocking_alert_queue';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

const BASE: PaywallDevView = {
  loading: false, offeringsSettled: true, offeringsFailed: false, storeUnavailableReason: null,
  previewPrices: false, priceSource: 'store', pricesApproximate: false, yearlyPriceSource: 'store', monthlyPriceSource: 'store',
  yearlyPrice: '€39,99', monthlyPrice: '€7,99', yearlyPerMonth: '€3,33', monthlyPerMonth: '€7,99', pricesFromCache: false,
  purchasing: false, payStarted: false, restoring: false, tapNotice: false,
  storePromo: { yearly: null, monthly: null, lifetime: null }, selectedPromo: null, trialReminderPrompt: null,
};

describe('dev paywall states for the four R1 frames', () => {
  beforeEach(() => {
    mockStoreRelease = false;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { jest.restoreAllMocks(); });

  it('all four states exist and are parsed (012 store_unreachable, 015 unknown_outcome, 016 status_unknown, 018 store_promo)', () => {
    for (const name of ['store_unreachable', 'unknown_outcome', 'status_unknown', 'store_promo']) {
      expect(DEV_PAYWALL_STATES).toContain(name);
      expect(parseDevPaywallState(name)).toBe(name);
    }
    expect(parseDevPaywallState('checkout_error')).toBe('store_unreachable'); // псевдоним
  });

  it('012: live store prices, "try in a minute" under the button, nothing is purchasing', () => {
    const view = applyDevPaywallView('store_unreachable', BASE, 'yearly');
    expect(view.tapNotice).toBe(true);
    expect(view.yearlyPrice).toBe('€39,99');
    expect(view.purchasing).toBe(false);
    expect(view.offeringsFailed).toBe(false);
  });

  it('018: the promo block gets a store promo for both plans', () => {
    const view = applyDevPaywallView('store_promo', BASE, 'yearly');
    expect(view.storePromo.yearly?.discountPercent).toBe(30);
    expect(view.selectedPromo?.promoPriceString).toBe('€27,99');
  });

  it('the new state does nothing in a store build', () => {
    mockStoreRelease = true;
    expect(parseDevPaywallState('store_unreachable')).toBeNull();
    expect(applyDevPaywallView('store_unreachable', BASE, 'yearly')).toBe(BASE);
  });

  it('a window left in the queue by the previous dev state is cleared (it blocked the next frame)', async () => {
    const shown = enqueueThemedBlockingInfoAlert('Покупка ждёт подтверждения', 'x', 'OK');
    expect(getThemedBlockingAlertHead()).not.toBeNull();
    expect(clearThemedBlockingAlerts('test')).toBe(1);
    expect(getThemedBlockingAlertHead()).toBeNull();
    await expect(shown).resolves.toBeUndefined();
    expect(clearThemedBlockingAlerts('test_again')).toBe(0);
  });

  it('source: one toast source for purchase, restore and dev; the dev effect clears the queue on enter and leave; the store stub keeps its exports', () => {
    const purchase = read('app/paywall_purchase.ts');
    expect(purchase).toContain('export function storeUnreachableToast()');
    expect(purchase.match(/emitAppEvent\('action_toast', storeUnreachableToast\(\)\)/g)?.length).toBeGreaterThanOrEqual(3);
    expect(purchase).not.toMatch(/ru: 'Не удалось связаться с магазином\. Попробуй позже\.',[\s\S]{0,200}pl: 'Nie udało się połączyć ze sklepem\. Spróbuj później\.',[\s\S]{0,400}ru: 'Не удалось связаться с магазином\. Попробуй позже\.'/);
    expect(purchase).toContain('clearThemedBlockingAlerts(`dev_state_enter:${devState}`)');
    expect(purchase).toContain('clearThemedBlockingAlerts(`dev_state_leave:${devState}`)');
    expect(purchase).toContain("case 'store_unreachable':\n      return storeUnreachableToast();");
    expect(read('app/dev_state_fixtures.ts')).toContain("'restore_failed', 'store_unreachable'] as const");
  });
});
