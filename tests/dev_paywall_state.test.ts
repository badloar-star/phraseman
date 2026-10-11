// зачем (координатор 12.10, R1 «нет пути»): dev-состояния пейвола для робот-съёмки обязаны работать только в dev-сборке;
// в стор-сборке параметр маршрута _dev_state не должен менять ни один флаг окна цен.
let mockStoreRelease = false;
jest.mock('../app/config', () => ({
  ...jest.requireActual('../app/config'),
  get IS_STORE_RELEASE() { return mockStoreRelease; },
}));

import { applyDevPaywallView, parseDevPaywallState, type PaywallDevView } from '../app/dev_paywall_state';

const BASE: PaywallDevView = {
  loading: false, offeringsSettled: true, offeringsFailed: false, storeUnavailableReason: null,
  previewPrices: false, priceSource: 'store', pricesApproximate: false, yearlyPriceSource: 'store', monthlyPriceSource: 'store',
  yearlyPrice: '€39,99', monthlyPrice: '€7,99', yearlyPerMonth: '€3,33', monthlyPerMonth: '€7,99', pricesFromCache: false,
  purchasing: false, payStarted: false, restoring: false, tapNotice: false,
  storePromo: { yearly: null, monthly: null, lifetime: null }, selectedPromo: null, trialReminderPrompt: null,
};

describe('dev paywall states', () => {
  beforeEach(() => { mockStoreRelease = false; (globalThis as { __DEV__?: boolean }).__DEV__ = true; jest.spyOn(console, 'log').mockImplementation(() => {}); jest.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('parses names and aliases in a dev build', () => {
    expect(parseDevPaywallState('loading')).toBe('loading');
    expect(parseDevPaywallState('failed')).toBe('error_no_prices');
    expect(parseDevPaywallState('purchase_pending')).toBe('pending');
    expect(parseDevPaywallState(['store_promo'])).toBe('store_promo');
    expect(parseDevPaywallState('nope')).toBeNull();
    expect(parseDevPaywallState(undefined)).toBeNull();
  });

  it('does nothing in a store build', () => {
    mockStoreRelease = true;
    expect(parseDevPaywallState('loading')).toBeNull();
    expect(applyDevPaywallView('loading', BASE, 'yearly')).toBe(BASE);
    expect(applyDevPaywallView('error_no_prices', BASE, 'yearly')).toBe(BASE);
  });

  it('returns the view untouched when no state is requested', () => {
    expect(applyDevPaywallView(null, BASE, 'yearly')).toBe(BASE);
  });

  it('builds each visual state without store, network or purchase', () => {
    const loading = applyDevPaywallView('loading', BASE, 'yearly');
    expect(loading).toMatchObject({ loading: true, offeringsSettled: false, yearlyPrice: '', priceSource: 'none' });
    const failed = applyDevPaywallView('error_no_prices', BASE, 'yearly');
    expect(failed).toMatchObject({ offeringsFailed: true, storeUnavailableReason: 'network', yearlyPrice: '' });
    expect(applyDevPaywallView('billing_unavailable', BASE, 'yearly').storeUnavailableReason).toBe('billing_unavailable');
    const reference = applyDevPaywallView('reference', BASE, 'yearly');
    expect(reference).toMatchObject({ pricesApproximate: true, priceSource: 'reference', offeringsFailed: false });
    expect(applyDevPaywallView('purchasing', BASE, 'yearly')).toMatchObject({ purchasing: true, payStarted: true });
    expect(applyDevPaywallView('restoring', BASE, 'yearly').restoring).toBe(true);
    const promo = applyDevPaywallView('store_promo', BASE, 'monthly');
    expect(promo.storePromo.yearly?.discountPercent).toBe(30);
    expect(promo.selectedPromo?.discountPercent).toBe(25);
    expect(applyDevPaywallView('reminder_prompt', BASE, 'yearly').trialReminderPrompt?.days).toBe(3);
  });
});
