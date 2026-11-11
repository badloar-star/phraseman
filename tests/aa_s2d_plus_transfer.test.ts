/*
 * Account-only Plus regression. Account activation never syncs store receipts,
 * grants a transfer hold, or persists another account's CustomerInfo. Legacy
 * hold records are revoked; explicit user-initiated restore remains separate.
 */
const mockEmitAppEvent = jest.fn();
const mockInvalidatePremiumCache = jest.fn();
jest.mock('../app/events', () => ({ emitAppEvent: (...args: unknown[]) => mockEmitAppEvent(...args) }));
jest.mock('../app/premium_guard', () => ({ invalidatePremiumCache: () => mockInvalidatePremiumCache() }));
jest.mock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
const mockPersisted: string[] = [];
jest.mock('../app/debug-logger', () => ({
  DebugLogger: {
    error: jest.fn((context: string) => { mockPersisted.push(context); }),
    warn: jest.fn(),
    info: jest.fn(),
  },
  reportSwallowed: jest.fn(),
  swallowError: jest.fn(() => jest.fn()),
}));

const STABLE_A = '0f8fad5b-d9cb-469f-a165-70867728950e';
const STABLE_B = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const PLUS_INFO = {
  entitlements: { active: { premium: { productIdentifier: 'phraseman_premium_yearly', isActive: true } } },
  activeSubscriptions: ['phraseman_premium_yearly'],
};
const NO_PLUS_INFO = { entitlements: { active: {} }, activeSubscriptions: [] };

type Purchases = {
  getAppUserID: jest.Mock;
  restorePurchases: jest.Mock;
  syncPurchasesForResult: jest.Mock;
  getCustomerInfo: jest.Mock;
};
type Modules = {
  hold: typeof import('../app/plus_transfer_hold');
  transfer: typeof import('../app/plus_transfer');
  stable: typeof import('../app/stable_id');
  generation: typeof import('../app/account_generation');
  storage: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> };
  purchases: Purchases;
};

let warn: jest.SpyInstance;

function load(): Modules {
  jest.resetModules();
  const storage = require('@react-native-async-storage/async-storage');
  storage.__reset?.();
  const purchases = require('react-native-purchases').default as Purchases;
  purchases.getAppUserID.mockReset().mockImplementation(async () => STABLE_B);
  // зачем (раунды 2–3, H-S2d-3, §135): автоматический путь — syncPurchasesForResult,
  // решение «подтверждённое отсутствие» — по ответу самой синхронизации;
  // restorePurchases (системный запрос Apple ID на iOS) — только по кнопке.
  purchases.restorePurchases.mockReset().mockImplementation(async () => PLUS_INFO);
  purchases.syncPurchasesForResult = jest.fn(async () => ({ customerInfo: PLUS_INFO }));
  purchases.getCustomerInfo.mockReset().mockImplementation(async () => PLUS_INFO);
  return {
    hold: require('../app/plus_transfer_hold'),
    transfer: require('../app/plus_transfer'),
    stable: require('../app/stable_id'),
    generation: require('../app/account_generation'),
    storage,
    purchases,
  };
}

function traceLines(): string[] {
  return warn.mock.calls.map((call) => String(call[0])).filter((line) => line.startsWith('[PLUS-TRANSFER]'));
}

function installDeps(m: Modules, overrides: Partial<{ syncIdentity: jest.Mock; persist: jest.Mock }> = {}) {
  const syncIdentity = overrides.syncIdentity ?? jest.fn(async () => true);
  const persist = overrides.persist ?? jest.fn(async () => undefined);
  m.transfer.installPlusTransferRunner({ syncIdentity, persistConfirmedPremium: persist });
  return { syncIdentity, persist };
}

async function switchAccount(m: Modules, plusBefore: boolean): Promise<void> {
  await m.stable.setStableId(STABLE_A);
  m.generation.beginAccountGeneration(STABLE_A);
  m.hold.notePlusStoreAccessEvidence(STABLE_A, plusBefore, plusBefore ? 'yearly' : null);
  await m.stable.setStableId(STABLE_B);
  m.generation.beginAccountGeneration(STABLE_B);
}

beforeEach(() => {
  jest.useRealTimers();
  mockEmitAppEvent.mockClear();
  mockInvalidatePremiumCache.mockClear();
  mockPersisted.length = 0;
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
});

test('account A store evidence never grants account B during a direct switch', async () => {
  const m = load();
  await switchAccount(m, true);

  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(false);
  await expect(m.hold.readPlusTransferHold()).resolves.toBeNull();
  // Чужой аккаунт удержанием не пользуется.
  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_A)).resolves.toBe(false);
});

test('account switch records no hold when A is free', async () => {
  const m = load();
  await switchAccount(m, false);

  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(false);
  await expect(m.hold.readPlusTransferHold()).resolves.toBeNull();
});

test('logout A -> null -> B stays free and performs no automatic store restore', async () => {
  const m = load();
  await m.stable.setStableId(STABLE_A);
  m.hold.notePlusStoreAccessEvidence(STABLE_A, true, 'monthly');
  await m.stable.clearStableId();
  await expect(m.hold.readPlusTransferHold()).resolves.toBeNull();
  // Выход A с Plus → вход B на том же устройстве: Plus не выдаётся без ответа RevenueCat.
  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(false);

  m.generation.beginAccountGeneration(STABLE_B);
  const { persist } = installDeps(m);
  await expect(m.transfer.runPlusTransferCheck('startup')).resolves.toBe('no_hold');
  expect(m.purchases.syncPurchasesForResult).not.toHaveBeenCalled();
  expect(m.purchases.restorePurchases).not.toHaveBeenCalled();
  expect(persist).not.toHaveBeenCalled();
  await expect(m.hold.readPlusTransferHold()).resolves.toBeNull();
});

test('automatic switch cleanup never assigns a store entitlement to B even if the device store reports Plus', async () => {
  const m = load();
  await switchAccount(m, true);
  m.hold.beginPlusTransferHold(STABLE_A, STABLE_B, 'stable_id_set');
  const { persist } = installDeps(m);
  await expect(m.transfer.runPlusTransferCheck('after_switch')).resolves.toBe('absent');

  expect(m.purchases.syncPurchasesForResult).not.toHaveBeenCalled();
  expect(m.purchases.restorePurchases).not.toHaveBeenCalled();
  expect(persist).not.toHaveBeenCalled();
  await expect(m.hold.readPlusTransferHold()).resolves.toBeNull();
  expect(mockInvalidatePremiumCache).toHaveBeenCalled();
  expect(mockEmitAppEvent).not.toHaveBeenCalledWith('premium_activated');
  expect(traceLines().join('\n')).not.toContain(STABLE_B);
  expect(traceLines().join('\n')).not.toContain(STABLE_A);
});

test('legacy heldPlus cleanup calls neither RevenueCat nor deactivation that could clear legitimate VIP', async () => {
  const m = load();
  await switchAccount(m, true);
  m.hold.beginPlusTransferHold(STABLE_A, STABLE_B, 'stable_id_set');
  const hold = await m.hold.readPlusTransferHold();
  await m.hold.writePlusTransferHold({ ...hold!, heldPlus: true });
  installDeps(m);
  await expect(m.transfer.runPlusTransferCheck('after_switch')).resolves.toBe('absent');

  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(false);
  await expect(m.hold.readPlusTransferHold()).resolves.toBeNull();
  expect(mockEmitAppEvent).not.toHaveBeenCalled();
  expect(m.purchases.syncPurchasesForResult).not.toHaveBeenCalled();
});

test('A -> B -> A never derives either account access from the other account evidence', async () => {
  const m = load();
  await switchAccount(m, true);
  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(false);
  m.hold.notePlusStoreAccessEvidence(STABLE_B, false, null);
  m.hold.beginPlusTransferHold(STABLE_B, STABLE_A, 'stable_id_set');
  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_A)).resolves.toBe(false);
});

test('M-S2d-1: a hold without a concrete target never grants Plus, even if marked heldPlus', async () => {
  const m = load();
  const hold = m.hold.beginPlusTransferHold(STABLE_A, null, 'stable_id_cleared');
  expect(hold.heldPlus).toBe(false);
  await m.hold.writePlusTransferHold({ ...hold, heldPlus: true });
  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(false);
});

// ── Раунд 3 (§135): не мешать открытому потоку покупки ─────────────────────────
test('purchase flow marker: nested flows, idempotent end, wrapper ends on error', async () => {
  const m = load();
  void m;
  const flow = require('../app/purchase_flow_activity') as typeof import('../app/purchase_flow_activity');
  const a = flow.beginPurchaseFlow('paywall_purchase');
  const b = flow.beginPurchaseFlow('paywall_restore');
  a();
  a();
  expect(flow.isPurchaseFlowActive()).toBe(true);
  b();
  expect(flow.isPurchaseFlowActive()).toBe(false);
  await expect(flow.withPurchaseFlow('manage_subscription_upgrade', async () => {
    expect(flow.isPurchaseFlowActive()).toBe(true);
    throw new Error('store_cancelled');
  })).rejects.toThrow('store_cancelled');
  expect(flow.isPurchaseFlowActive()).toBe(false);
});

test('paywall and «Управление подпиской» mark their store operations as a purchase flow', () => {
  const fsMod = require('fs') as typeof import('fs');
  // зачем (координатор 05.10): рабочая копия в CRLF — исходник читаем с окончаниями LF
  const read = (rel: string) => fsMod.readFileSync(require.resolve('../' + rel), 'utf8').replace(/\r\n?/g, '\n');
  // зачем (ревью 12.10 п.1): внутри метки потока теперь ещё ставится флаг purchaseInvoked — вызов магазина остаётся единственным return внутри метки
  // зачем (Q8, 06.11): при замене месячной на годовую на Android вызов магазина получает третьим аргументом параметры замены — иначе прежняя обычная покупка
  expect(read('app/paywall_purchase.ts')).toMatch(/withPurchaseFlow\('paywall_purchase', \(\) => \{\s*purchaseInvoked = true;[^\n]*\n\s*return googleChange \? Purchases\.purchasePackage\(pkg, null, googleChange\) : Purchases\.purchasePackage\(pkg\);/);
  // зачем (10.10): 65(а) d677a328e — «Проверить статус» (getCustomerInfo) и «Восстановить» идут одним путём; оба внутри метки.
  expect(read('app/paywall_purchase.ts')).toContain("withPurchaseFlow('paywall_restore', () => (mode === 'check' ? Purchases.getCustomerInfo() : Purchases.restorePurchases()))");
  expect(read('app/manage_subscription_purchase.ts')).toContain("withPurchaseFlow('manage_subscription_upgrade', () => Purchases.purchasePackage(yearlyPackage, null, googleChange))");
  expect(read('app/manage_subscription.tsx')).toContain("withPurchaseFlow('manage_subscription_restore', () => Purchases.restorePurchases())");
});

// ── Раунд 4 (L-R3-6): потолок жизни метки покупки ───────────────────────────────
test('L-R3-6: a purchase flow mark older than 10 minutes expires with a log, so a hung store call cannot block Plus transfer', () => {
  const m = load();
  void m;
  const flow = require('../app/purchase_flow_activity') as typeof import('../app/purchase_flow_activity');
  const realNow = Date.now();
  const now = jest.spyOn(Date, 'now').mockReturnValue(realNow);
  try {
    flow.beginPurchaseFlow('paywall_purchase');
    expect(flow.isPurchaseFlowActive()).toBe(true);
    now.mockReturnValue(realNow + flow.PURCHASE_FLOW_MAX_AGE_MS - 1);
    expect(flow.isPurchaseFlowActive()).toBe(true);
    now.mockReturnValue(realNow + flow.PURCHASE_FLOW_MAX_AGE_MS + 1);
    expect(flow.isPurchaseFlowActive()).toBe(false);
    const lines = warn.mock.calls.map((c) => String(c[0]));
    expect(lines.some((l) => l.includes('[PLUS-TRANSFER] purchase_flow expired'))).toBe(true);
  } finally {
    now.mockRestore();
  }
});
