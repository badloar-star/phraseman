// ════════════════════════════════════════════════════════════════════════════
// paywall_plus_resilient_checkout.test.ts — PM-214, пакет A (решение D158).
//
// Поведенческий тест хука usePaywallPurchase в режиме resilientCheckout (Plus-окно):
//  • тап без offerings → загрузка на тапе + покупка;
//  • тайм-аут загрузки → тихая подпись, кнопка снова жива;
//  • зависшая первая загрузка не блокирует вторую;
//  • кэш цен показывается в первом кадре и пишется только публичными строками.
// Хук реальный; сеть магазина и соседние модули — управляемые моки.
// ════════════════════════════════════════════════════════════════════════════
/* eslint-disable import/first, @typescript-eslint/no-require-imports */
import { act, renderHook } from '@testing-library/react-native';

jest.unmock('react-native');
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn(), back: jest.fn() }) }));

const mockGetOfferings = jest.fn();
const mockGetTrialInfo = jest.fn((..._a: unknown[]) => ({ hasTrial: false }));
const mockCheckEligibility = jest.fn(async (..._a: unknown[]) => ({}));
const mockPurchasePackage = jest.fn();
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    getOfferings: (...a: unknown[]) => mockGetOfferings(...a),
    purchasePackage: (...a: unknown[]) => mockPurchasePackage(...a),
    checkTrialOrIntroductoryPriceEligibility: (...a: unknown[]) => mockCheckEligibility(...a),
    restorePurchases: jest.fn(),
  },
  INTRO_ELIGIBILITY_STATUS: {
    INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 'ELIGIBLE',
    INTRO_ELIGIBILITY_STATUS_INELIGIBLE: 'INELIGIBLE',
    INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS: 'NONE',
  },
  PURCHASES_ERROR_CODE: { PAYMENT_PENDING_ERROR: 'PAYMENT_PENDING_ERROR' },
}));
jest.mock('../app/revenuecat_init', () => ({
  initRevenueCat: jest.fn(async () => {}),
  resolvePremiumPackages: jest.fn((list: Array<{ identifier: string }>) => ({
    monthly: list.find((p) => p.identifier === 'monthly'),
    yearly: list.find((p) => p.identifier === 'yearly'),
    lifetime: list.find((p) => p.identifier === 'lifetime'),
  })),
  syncRevenueCatIdentity: jest.fn(async () => true),
}));
jest.mock('../app/revenuecat_account_identity', () => ({
  commitRevenueCatResultForGeneration: jest.fn(async () => ({ status: 'stale' })),
  readRevenueCatCustomerInfoForGeneration: jest.fn(async () => null),
  // Покупка в тесте доходит до магазина и на этом заканчивается (ответ «устарело»).
  runRevenueCatOperationForGeneration: jest.fn(async (_acc: unknown, fn: () => Promise<unknown>) => {
    await fn();
    return { status: 'stale' };
  }),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: jest.fn(() => 1),
  isCurrentAccountGeneration: jest.fn(() => true),
}));
jest.mock('../app/remote_flags', () => ({ isLifetimeButtonEnabled: jest.fn(() => false) }));
jest.mock('../app/premium_revenuecat_state', () => ({
  customerInfoConfirmsProductAccess: jest.fn(() => false),
  inferPremiumPlanFromProductId: jest.fn(() => 'monthly'),
  persistStorePremiumLocally: jest.fn(async () => true),
  revenueCatCustomerInfoHasPremiumAccess: jest.fn(() => false),
  revenueCatPremiumMetadata: jest.fn(() => ({ productId: '' })),
}));
jest.mock('../app/paywall_pricing', () => ({
  computeSavingsPct: jest.fn(() => 0),
  computePerDayString: jest.fn(() => ''),
}));
jest.mock('../app/paywall_trial_info', () => ({
  ...jest.requireActual('../app/paywall_trial_info'),
  getTrialInfo: (...a: unknown[]) => mockGetTrialInfo(...a),
  trialDaysOrDefault: jest.fn(() => 3),
}));
jest.mock('../app/paywall_funnel', () => ({ logPaywallFunnel: jest.fn() }));
jest.mock('../app/notifications', () => ({
  scheduleTrialEndReminder: jest.fn(async () => true),
  schedulePaywallAbandonedNotification: jest.fn(async () => {}),
  requestNotificationPermission: jest.fn(async () => false),
  requestNotificationPermissionWithFallback: jest.fn(async () => ({ granted: false, blocked: false, openedSettings: false })),
  getNotificationPermissionStatus: jest.fn(async () => 'undetermined'),
}));
jest.mock('../app/navigation_back', () => ({ dismissPaywallModal: jest.fn(), markNextNavigationAsReplace: jest.fn() }));
jest.mock('../app/paywall_lesson_continuation', () => ({ resumeLessonAfterPremium: jest.fn(() => false) }));
jest.mock('../app/onboarding_notification_choice', () => ({ readOnboardingNotificationChoice: jest.fn(async () => 'skip') }));
jest.mock('../app/themed_blocking_alert_queue', () => ({ enqueueThemedBlockingInfoAlert: jest.fn(async () => {}) }));
jest.mock('../app/product_operation_analytics', () => ({ trackProductOperationFailure: jest.fn() }));
jest.mock('../hooks/use-haptics', () => ({ hapticTap: jest.fn() }));
jest.mock('../app/config', () => ({ DEV_IAP_BYPASS: false }));
jest.mock('../app/paywall_dev_preview', () => ({
  DEV_PREVIEW_MONTHLY_PRICE: '', DEV_PREVIEW_YEARLY_PRICE: '', DEV_PREVIEW_YEARLY_PER_MONTH: '',
  DEV_PREVIEW_LIFETIME_PRICE: '', DEV_PREVIEW_LIFETIME_PACKAGE: undefined,
}));
jest.mock('../app/analytics', () => ({ trackEvent: jest.fn() }));
jest.mock('../app/events', () => ({
  emitAppEvent: jest.fn(),
  actionToastTri: jest.fn(() => ({})),
  onAppEvent: jest.fn(() => ({ remove: jest.fn() })),
}));
jest.mock('../app/phone_state_progress_register_bridge', () => ({ persistPortableProgressRegister: jest.fn(async () => {}) }));
jest.mock('../app/premium_celebration_state', () => ({ markCelebrationPending: jest.fn(async () => {}) }));
jest.mock('../components/EnergyContext', () => ({ useEnergy: () => ({ refillToMax: jest.fn(async () => true) }) }));
jest.mock('../app/premium_guard', () => ({ invalidatePremiumCache: jest.fn() }));
jest.mock('../app/debug-logger', () => ({
  DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  swallowError: () => () => {},
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { paywallTermsEqual, usePaywallPurchase } from '../app/paywall_purchase';
import {
  PAYWALL_PRICE_CACHE_KEY,
  __resetPaywallPriceCacheForTests,
  savePaywallPriceCache,
} from '../app/paywall_price_cache';
import { createPaywallAnalyticsImpression } from '../app/paywall_analytics_impression';
import { COPY } from '../components/paywall/PaywallPlusCopy';
import { LOAD_GATE_TOTAL_MS } from '../app/load_gate_config';

const pkg = (identifier: string, priceString: string, perMonth = '') => ({
  identifier,
  product: { identifier: `prod_${identifier}`, priceString, pricePerMonthString: perMonth },
});
const OFFERINGS = {
  current: { availablePackages: [pkg('yearly', '$49.99', '$4.17'), pkg('monthly', '$7.99')] },
};

const NEVER = () => new Promise(() => {});

type HookValue = ReturnType<typeof usePaywallPurchase>;

// RNTL 14: renderHook асинхронный. frames[0] — ровно первый кадр хука, до любых эффектов и await.
async function mount(resilientCheckout = true) {
  const frames: HookValue[] = [];
  const rendered = await renderHook(() => {
    const value = usePaywallPurchase({
      variant: 'PLUS', context: 'test', source: 'test', lang: 'en',
      impression: createPaywallAnalyticsImpression(() => 'imp-1'),
      resilientCheckout,
    });
    frames.push(value);
    return value;
  });
  return { result: rendered.result, frames, unmount: rendered.unmount };
}

async function advance(ms: number) {
  await act(async () => { await jest.advanceTimersByTimeAsync(ms); });
}

beforeEach(() => {
  jest.useFakeTimers();
  mockGetOfferings.mockReset();
  mockPurchasePackage.mockReset();
  mockPurchasePackage.mockImplementation(NEVER);
  mockGetTrialInfo.mockClear();
  mockCheckEligibility.mockReset();
  mockCheckEligibility.mockResolvedValue({});
  __resetPaywallPriceCacheForTests();
  (AsyncStorage as unknown as { __reset?: () => void }).__reset?.();
});
afterEach(() => { jest.useRealTimers(); });

describe('Plus-окно: тап без offerings грузит; цены на кнопке не было → покупка только вторым тапом (D158-уточнение, M1)', () => {
  test('первая загрузка упала, тап присоединяется к повтору: окно обновлено, покупки нет; второй тап покупает', async () => {
    mockGetOfferings
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(OFFERINGS);
    const { result } = await mount();
    await advance(0);
    // зачем (владелец 11.10: «ЦЕНЫ ДОЛЖНЫ ПОКАЗЫВАТЬСЯ ВСЕ РАВНО!!! ВЕЗДЕ»): без магазина и кэша — справочная цена с «≈»,
    // а не пустая плитка; покупка по ней всё равно не начинается (второй тап — по живой цене, проверено ниже).
    // 13.10: интерфейс en — справочная цена с десятичной точкой (EN-проход Авторизации ac166bf42).
    expect(result.current.yearlyPrice).toBe('€39.99');
    expect(result.current.yearlyPriceSource).toBe('reference');
    expect(result.current.selectedAvailable).toBe(false);

    await act(async () => { void result.current.handlePurchase(); });
    await advance(1_000); // пауза тихого повтора
    await advance(0);

    expect(mockGetOfferings).toHaveBeenCalledTimes(2);
    expect(mockPurchasePackage).not.toHaveBeenCalled(); // terms_changed_wait_second_tap
    expect(result.current.yearlyPrice).toBe('$49.99'); // окно обновлено свежими ценами
    expect(result.current.tapNotice).toBe(false); // и без тихой ошибки
    expect(result.current.purchasing).toBe(false); // кнопка снова жива

    await act(async () => { void result.current.handlePurchase(); });
    await advance(0);
    expect(mockPurchasePackage).toHaveBeenCalledTimes(1);
    expect(mockPurchasePackage.mock.calls[0][0].identifier).toBe('yearly'); // выбран годовой по умолчанию
  });

  test('на кнопке была кэш-цена и свежая совпала → покупка сразу, без второго тапа', async () => {
    await savePaywallPriceCache({ yearly: { productId: 'prod_yearly', price: '$49.99', perMonth: '$4.17' } });
    let release: (v: unknown) => void = () => {};
    mockGetOfferings.mockImplementation(() => new Promise((r) => { release = r; }));
    const { result } = await mount();
    await advance(0);
    expect(result.current.yearlyPrice).toBe('$49.99');

    await act(async () => { void result.current.handlePurchase(); }); // присоединились к идущей загрузке
    expect(mockPurchasePackage).not.toHaveBeenCalled();
    await act(async () => { release(OFFERINGS); });
    await advance(0);
    await advance(0);
    expect(mockPurchasePackage).toHaveBeenCalledTimes(1);
    expect(mockPurchasePackage.mock.calls[0][0].identifier).toBe('yearly');
  });

  test('на кнопке была кэш-цена, свежая другая → окно обновлено, покупки нет, второй тап покупает', async () => {
    await savePaywallPriceCache({ yearly: { productId: 'prod_yearly', price: '$49.99', perMonth: '$4.17' } });
    let release: (v: unknown) => void = () => {};
    mockGetOfferings.mockImplementation(() => new Promise((r) => { release = r; }));
    const { result } = await mount();
    await advance(0);

    await act(async () => { void result.current.handlePurchase(); });
    await act(async () => { release({ current: { availablePackages: [pkg('yearly', '$59.99', '$5.00'), pkg('monthly', '$7.99')] } }); });
    await advance(0);
    await advance(0);
    expect(mockPurchasePackage).not.toHaveBeenCalled();
    expect(result.current.yearlyPrice).toBe('$59.99');
    expect(result.current.tapNotice).toBe(false);

    await act(async () => { void result.current.handlePurchase(); });
    await advance(0);
    expect(mockPurchasePackage).toHaveBeenCalledTimes(1);
  });

  test('paywallTermsEqual: пустая цена на кнопке, другая цена, пробный или промо = не совпало', () => {
    const base = { price: '$49.99', trialDays: null, promoPrice: null };
    expect(paywallTermsEqual(base, base)).toBe(true);
    expect(paywallTermsEqual({ ...base, price: '' }, { ...base, price: '' })).toBe(false);
    expect(paywallTermsEqual(base, { ...base, price: '$59.99' })).toBe(false);
    expect(paywallTermsEqual(base, { ...base, trialDays: 7 })).toBe(false);
    expect(paywallTermsEqual(base, { ...base, promoPrice: '$9.99' })).toBe(false);
  });
});

describe('Plus-окно: тариф переключили / окно закрыли, пока грузились offerings на тапе (M-A, L1)', () => {
  const cachedYearly = { yearly: { productId: 'prod_yearly', price: '$49.99', perMonth: '$4.17' } };

  test('M-A: смена тарифа во время загрузки → покупки нет (selection_changed_during_load)', async () => {
    await savePaywallPriceCache(cachedYearly);
    let release: (v: unknown) => void = () => {};
    mockGetOfferings.mockImplementation(() => new Promise((r) => { release = r; }));
    const { result } = await mount();
    await advance(0);
    await act(async () => { void result.current.handlePurchase(); }); // захвачен «год»
    await act(async () => { result.current.selectPlan('monthly'); });
    await act(async () => { release(OFFERINGS); });
    await advance(0);
    await advance(0);
    expect(mockPurchasePackage).not.toHaveBeenCalled();
    expect(result.current.selected).toBe('monthly');
    expect(result.current.purchasing).toBe(false);
  });

  test('L1: окно закрыли во время загрузки → purchasePackage не вызывается', async () => {
    await savePaywallPriceCache(cachedYearly);
    let release: (v: unknown) => void = () => {};
    mockGetOfferings.mockImplementation(() => new Promise((r) => { release = r; }));
    const { result, unmount } = await mount();
    await advance(0);
    await act(async () => { void result.current.handlePurchase(); });
    expect(result.current.payStarted).toBe(false); // оплата не начата — закрывать можно
    await act(async () => { unmount(); });
    release(OFFERINGS);
    await advance(0);
    await advance(0);
    expect(mockPurchasePackage).not.toHaveBeenCalled();
  });
});

describe('Plus-окно: кэш только до первого успешного ответа магазина (M2)', () => {
  test('магазин ответил без месячного плана → кэш-цены месяца нет', async () => {
    await savePaywallPriceCache({
      yearly: { productId: 'prod_yearly', price: '$49.99', perMonth: '$4.17' },
      monthly: { productId: 'prod_monthly', price: '$7.99', perMonth: '' },
    });
    mockGetOfferings.mockResolvedValue({ current: { availablePackages: [pkg('yearly', '$49.99', '$4.17')] } });
    const { result, frames } = await mount();
    expect(frames[0].monthlyPrice).toBe('$7.99'); // первый кадр — кэш
    await advance(0);
    await advance(0);
    expect(result.current.yearlyPrice).toBe('$49.99');
    expect(result.current.monthlyPrice).toBe(''); // плана нет — и цены нет
    expect(result.current.pricesFromCache).toBe(false);
  });
});

describe('Plus-окно: пробный период при покупке без offerings (M3, iOS)', () => {
  test('eligibility свежей загрузки доходит до getTrialInfo в момент покупки', async () => {
    await savePaywallPriceCache({ yearly: { productId: 'prod_yearly', price: '$49.99', perMonth: '$4.17' } });
    mockCheckEligibility.mockResolvedValue({ prod_yearly: { status: 'ELIGIBLE' }, prod_monthly: { status: 'ELIGIBLE' } });
    let release: (v: unknown) => void = () => {};
    mockGetOfferings.mockImplementation(() => new Promise((r) => { release = r; }));
    let seenAtPurchase: unknown[] | undefined;
    mockPurchasePackage.mockImplementation(() => {
      seenAtPurchase = mockGetTrialInfo.mock.calls.at(-1);
      return NEVER();
    });
    const { result } = await mount();
    await advance(0);
    await act(async () => { void result.current.handlePurchase(); });
    await act(async () => { release(OFFERINGS); });
    await advance(0);
    await advance(0);
    expect(mockPurchasePackage).toHaveBeenCalledTimes(1);
    expect((seenAtPurchase?.[0] as { product: { identifier: string } }).product.identifier).toBe('prod_yearly');
    expect(seenAtPurchase?.[1]).toBe('eligible'); // из ref свежей загрузки, а не 'unknown' из замыкания тапа
  });
});

describe('Plus-окно: тайм-аут загрузки (D158)', () => {
  test('нет offerings за потолок → тихая подпись, покупка не запущена, кнопка снова жива', async () => {
    mockGetOfferings.mockImplementation(NEVER);
    const { result } = await mount();
    await advance(0);

    await act(async () => { void result.current.handlePurchase(); });
    expect(result.current.purchasing).toBe(true); // защита от двойного тапа на время загрузки
    expect(result.current.payStarted).toBe(false); // L1: оплата не начата — окно можно закрыть
    await advance(LOAD_GATE_TOTAL_MS + 500);
    await advance(0);

    expect(result.current.tapNotice).toBe(true);
    expect(result.current.purchasing).toBe(false);
    expect(result.current.offeringsSettled).toBe(true);
    expect(result.current.offeringsFailed).toBe(true);
    expect(result.current.loading).toBe(false); // вечного скелетона нет
    expect(mockPurchasePackage).not.toHaveBeenCalled();

    // Сеть вернулась: следующий тап снова работает и сам сбрасывает подпись.
    mockGetOfferings.mockReset();
    mockGetOfferings.mockResolvedValue(OFFERINGS);
    await act(async () => { void result.current.handlePurchase(); }); // цены на кнопке не было → обновили окно
    await advance(0);
    await advance(0);
    expect(mockPurchasePackage).not.toHaveBeenCalled();
    expect(result.current.tapNotice).toBe(false);
    await act(async () => { void result.current.handlePurchase(); }); // второй тап покупает
    await advance(0);
    expect(mockPurchasePackage).toHaveBeenCalledTimes(1);
  });
});

describe('Plus-окно: зависшая загрузка не блокирует новую (D158)', () => {
  test('после потолка слот свободен: ручной повтор реально зовёт магазин и приносит цены', async () => {
    mockGetOfferings.mockImplementation(NEVER);
    const { result } = await mount();
    await advance(0);
    const callsBefore = mockGetOfferings.mock.calls.length;
    expect(callsBefore).toBe(1); // первая попытка висит

    await advance(LOAD_GATE_TOTAL_MS + 500);
    await advance(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.offeringsFailed).toBe(true);

    mockGetOfferings.mockReset();
    mockGetOfferings.mockResolvedValue(OFFERINGS);
    await act(async () => { result.current.reloadOfferings(); });
    await advance(0);
    await advance(0);

    expect(mockGetOfferings).toHaveBeenCalledTimes(1);
    expect(result.current.yearlyPrice).toBe('$49.99');
    expect(result.current.offeringsFailed).toBe(false);
  });

  test('повтор до потолка присоединяется к идущей загрузке, а не плодит параллельные', async () => {
    mockGetOfferings.mockImplementation(NEVER);
    const { result } = await mount();
    await advance(0);
    await act(async () => { result.current.reloadOfferings(); });
    await advance(0);
    expect(mockGetOfferings).toHaveBeenCalledTimes(1);
  });
});

describe('Plus-окно: кэш цен между запусками (D158)', () => {
  // зачем (владелец 11.10, «цены везде»): кэш последних настоящих цен теперь во всех пейволах, не только в окне Plus.
  test('первый кадр показывает кэш, пока магазин молчит; кэш — во всех пейволах', async () => {
    await savePaywallPriceCache({
      yearly: { productId: 'prod_yearly', price: '$49.99', perMonth: '$4.17' },
      monthly: { productId: 'prod_monthly', price: '$7.99', perMonth: '' },
    });
    mockGetOfferings.mockImplementation(NEVER);

    const first = await mount(true);
    // frames[0] — ровно первый кадр, до эффектов и сети
    expect(first.frames[0].yearlyPrice).toBe('$49.99');
    expect(first.frames[0].pricesFromCache).toBe(true);
    expect(first.result.current.yearlyPrice).toBe('$49.99');
    expect(first.result.current.yearlyPerMonth).toBe('$4.17');
    expect(first.result.current.monthlyPrice).toBe('$7.99');
    expect(first.result.current.pricesFromCache).toBe(true);

    const plain = await mount(false);
    expect(plain.frames[0].yearlyPrice).toBe('$49.99');
    expect(plain.result.current.yearlyPrice).toBe('$49.99');
    expect(plain.result.current.pricesFromCache).toBe(true);
    expect(plain.result.current.yearlyPriceSource).toBe('cache');
  });

  test('после успешной загрузки в кэш уходят только публичные строки цен и id пакетов', async () => {
    mockGetOfferings.mockResolvedValue(OFFERINGS);
    const { result } = await mount();
    await advance(0);
    await advance(0);
    expect(result.current.pricesFromCache).toBe(false); // живые цены главнее кэша
    const raw = await AsyncStorage.getItem(PAYWALL_PRICE_CACHE_KEY);
    expect(raw).toBeTruthy();
    const saved = JSON.parse(raw as string);
    expect(Object.keys(saved).sort()).toEqual(['monthly', 'savedAt', 'v', 'yearly']);
    expect(saved.yearly).toEqual({ productId: 'prod_yearly', price: '$49.99', perMonth: '$4.17' });
    expect(JSON.stringify(saved)).not.toMatch(/uid|email|token|user/i);
  });
});

describe('Plus-окно: тихие тексты на всех языках окна', () => {
  // зачем (Дизайн, приказ «пейволы все сделать»): блок «Сейчас недоступно / Цены не загрузились» убран — тихие тексты окна теперь «цена уточнится» и «магазин недоступен».
  test.each(['priceWillConfirm', 'storeUnavailable', 'tryInMinute', 'getPlus'] as const)('%s есть на 9 языках', (key) => {
    const copy = COPY[key] as Record<string, string>;
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
      expect(typeof copy[lang]).toBe('string');
      expect(copy[lang].trim().length).toBeGreaterThan(3);
    }
    expect(copy.ru).not.toBe(copy.en);
  });
});
