/*
 * AA S2d 🔴1 (§127, вариант B): Plus при двух аккаунтах.
 *
 * Причина (S2c, итог исполнителя, auth_provider ~2792–2830 и «Сменить аккаунт»):
 * после смены аккаунта RevenueCat делает logIn(новый appUserID), а покупка стора
 * остаётся на прежнем appUserID до ручного «Восстановить покупки» — «оплата на
 * одном аккаунте». Контракт после правки:
 *  - ЛЮБАЯ смена stable_id ставит удержание и запускает тихий syncPurchasesForResult (раунд 3; restorePurchases — только по кнопке);
 *  - Plus прежнего аккаунта держится локально до ответа (не мигает);
 *  - откат только при подтверждённом отсутствии entitlement;
 *  - сбой → повтор на старте / возврате из фона, не чаще раза в 10 минут;
 *  - логи [PLUS-TRANSFER] без сырого appUserID.
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

test('any account switch starts a hold: Plus of the previous account stays visible on the new one until RevenueCat answers', async () => {
  const m = load();
  await switchAccount(m, true);

  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(true);
  const stored = JSON.parse(String(await m.storage.getItem(m.hold.PLUS_TRANSFER_HOLD_KEY)));
  expect(stored).toMatchObject({ target: STABLE_B, heldPlus: true, reason: 'stable_id_set', attempts: 0 });
  // Чужой аккаунт удержанием не пользуется.
  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_A)).resolves.toBe(false);
});

test('without Plus before the switch nothing is granted, but a silent check is still pending', async () => {
  const m = load();
  await switchAccount(m, false);

  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(false);
  await expect(m.hold.readPlusTransferHold()).resolves.toMatchObject({ target: STABLE_B, heldPlus: false });
});

test('«Сменить аккаунт» (clear) is a switch too, but Plus is NOT carried to a fresh profile (M-S2d-1); the check still binds to it', async () => {
  const m = load();
  await m.stable.setStableId(STABLE_A);
  m.hold.notePlusStoreAccessEvidence(STABLE_A, true, 'monthly');
  await m.stable.clearStableId();
  await expect(m.hold.readPlusTransferHold()).resolves.toMatchObject({ target: null, heldPlus: false, reason: 'stable_id_cleared' });
  // Выход A с Plus → вход B на том же устройстве: Plus не выдаётся без ответа RevenueCat.
  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(false);

  m.generation.beginAccountGeneration(STABLE_B);
  m.purchases.syncPurchasesForResult.mockRejectedValueOnce(new Error('network'));
  installDeps(m);
  await expect(m.transfer.runPlusTransferCheck('startup')).resolves.toBe('retry');
  await expect(m.hold.readPlusTransferHold()).resolves.toMatchObject({ target: STABLE_B, attempts: 1 });
});

test('restore confirms the entitlement → Plus is written for the new account and the hold is released', async () => {
  const m = load();
  await switchAccount(m, true);
  const { persist } = installDeps(m);
  await m.transfer.runPlusTransferCheck('after_switch');

  expect(m.purchases.syncPurchasesForResult).toHaveBeenCalledTimes(1);
  expect(m.purchases.restorePurchases).not.toHaveBeenCalled();
  expect(persist).toHaveBeenCalledWith(PLUS_INFO, expect.any(Function));
  await expect(m.hold.readPlusTransferHold()).resolves.toBeNull();
  expect(mockInvalidatePremiumCache).toHaveBeenCalled();
  expect(mockEmitAppEvent).not.toHaveBeenCalledWith('premium_deactivated');
  const result = traceLines().find((line) => line.includes('restore result'));
  expect(result).toContain('"result":"confirmed"');
  expect(result).toContain('"entitlements":"premium"');
  expect(traceLines().join('\n')).not.toContain(STABLE_B);
  expect(traceLines().join('\n')).not.toContain(STABLE_A);
});

test('only a CONFIRMED absence rolls the held Plus back', async () => {
  const m = load();
  await switchAccount(m, true);
  m.purchases.syncPurchasesForResult.mockResolvedValue({ customerInfo: NO_PLUS_INFO });
  installDeps(m);
  // Первая проверка (старт установки) уже ответила «нет».
  await m.transfer.runPlusTransferCheck('after_switch');

  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(false);
  await expect(m.hold.readPlusTransferHold()).resolves.toBeNull();
  expect(mockEmitAppEvent).toHaveBeenCalledWith('premium_deactivated');
  expect(traceLines().find((line) => line.includes('"result":"absent"'))).toBeDefined();
});

test('a failed restore keeps Plus held, retries on return from background no more than once per 10 minutes', async () => {
  const m = load();
  await switchAccount(m, true);
  m.purchases.syncPurchasesForResult.mockRejectedValue(Object.assign(new Error('offline'), { code: 'NETWORK_ERROR' }));
  installDeps(m);
  await m.transfer.runPlusTransferCheck('after_switch');
  const callsAfterFirst = m.purchases.syncPurchasesForResult.mock.calls.length;

  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(true);
  expect(mockEmitAppEvent).not.toHaveBeenCalledWith('premium_deactivated');
  const failed = traceLines().find((line) => line.includes('"reason":"restore_failed"'));
  expect(failed).toContain('"code":"NETWORK_ERROR"');
  expect(mockPersisted).toContain('[PLUS-TRANSFER] restore result');

  await expect(m.transfer.runPlusTransferCheck('foreground')).resolves.toBe('rate_limited');
  expect(m.purchases.syncPurchasesForResult).toHaveBeenCalledTimes(callsAfterFirst);

  const realNow = Date.now();
  const now = jest.spyOn(Date, 'now').mockReturnValue(realNow + 10 * 60 * 1000 + 1);
  m.purchases.syncPurchasesForResult.mockResolvedValue({ customerInfo: PLUS_INFO });
  await expect(m.transfer.runPlusTransferCheck('foreground')).resolves.toBe('confirmed');
  now.mockRestore();
});

test('RevenueCat identity not yet on the new account → no restore, retry later', async () => {
  const m = load();
  await switchAccount(m, true);
  installDeps(m, { syncIdentity: jest.fn(async () => false) });
  await expect(m.transfer.runPlusTransferCheck('after_switch')).resolves.toBe('retry');
  expect(m.purchases.syncPurchasesForResult).not.toHaveBeenCalled();
  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(true);
});

test('restore answered for another appUserID is not trusted', async () => {
  const m = load();
  await switchAccount(m, true);
  m.purchases.getAppUserID.mockImplementation(async () => STABLE_A);
  installDeps(m);
  await expect(m.transfer.runPlusTransferCheck('after_switch')).resolves.toBe('retry');
  expect(m.purchases.syncPurchasesForResult).not.toHaveBeenCalled();
});

test('a hold for another account is dropped; an expired hold is dropped and rolls Plus back', async () => {
  const m = load();
  await switchAccount(m, true);
  m.generation.beginAccountGeneration(STABLE_A);
  installDeps(m);
  await expect(m.transfer.runPlusTransferCheck('startup')).resolves.toBe('account_changed');
  await expect(m.hold.readPlusTransferHold()).resolves.toBeNull();

  const m2 = load();
  await switchAccount(m2, true);
  const now = jest.spyOn(Date, 'now').mockReturnValue(Date.now() + m2.hold.PLUS_TRANSFER_HOLD_TTL_MS + 1);
  installDeps(m2);
  await expect(m2.transfer.runPlusTransferCheck('startup')).resolves.toBe('expired');
  await expect(m2.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(false);
  now.mockRestore();
});

test('attempts are capped (no avalanche of restore calls)', async () => {
  const m = load();
  await switchAccount(m, true);
  const hold = await m.hold.readPlusTransferHold();
  await m.hold.writePlusTransferHold({ ...hold!, attempts: m.transfer.PLUS_TRANSFER_MAX_ATTEMPTS });
  installDeps(m);
  await expect(m.transfer.runPlusTransferCheck('startup')).resolves.toBe('attempts_exhausted');
  expect(m.purchases.syncPurchasesForResult).not.toHaveBeenCalled();
});

test('manual switch warning point: shown only when the current account has store Plus; text key for Design', async () => {
  const m = load();
  m.hold.notePlusStoreAccessEvidence(STABLE_A, true, 'yearly');
  expect(m.hold.getPlusTransferSwitchWarning(STABLE_A)).toEqual({ show: true, textKey: 'plus_transfer_switch_warning' });
  expect(m.hold.getPlusTransferSwitchWarning(STABLE_B)).toEqual({ show: false, textKey: 'plus_transfer_switch_warning' });
  expect(m.hold.PLUS_TRANSFER_SWITCH_WARNING_DRAFT.ru).toBe('Plus перейдёт на новый аккаунт на этом устройстве');
});

test('H-S2d-3: the automatic path never calls restorePurchases (iOS system Apple ID prompt)', async () => {
  const m = load();
  await switchAccount(m, true);
  installDeps(m);
  await expect(m.transfer.runPlusTransferCheck('after_switch')).resolves.toBe('confirmed');
  expect(m.purchases.syncPurchasesForResult).toHaveBeenCalled();
  expect(m.purchases.getCustomerInfo).not.toHaveBeenCalled();
  expect(m.purchases.restorePurchases).not.toHaveBeenCalled();
});

test('M-S2d-1: a hold without a concrete target never grants Plus, even if marked heldPlus', async () => {
  const m = load();
  const hold = m.hold.beginPlusTransferHold(STABLE_A, null, 'stable_id_cleared');
  expect(hold.heldPlus).toBe(false);
  await m.hold.writePlusTransferHold({ ...hold, heldPlus: true });
  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(false);
});

// ── Раунд 3 (§135): не мешать открытому потоку покупки ─────────────────────────
test('the transfer check is deferred while a purchase flow is open, without spending an attempt', async () => {
  const m = load();
  await switchAccount(m, true);
  const flow = require('../app/purchase_flow_activity') as typeof import('../app/purchase_flow_activity');
  const end = flow.beginPurchaseFlow('paywall_purchase');
  installDeps(m);

  // Установка раннера сама делает проверку старта — она тоже откладывается.
  await expect(m.transfer.runPlusTransferCheck('startup')).resolves.toBe('deferred_purchase_flow');
  // Любой повод (после смены, возврат из фона) при открытой покупке — отложен.
  await expect(m.transfer.runPlusTransferCheck('after_switch')).resolves.toBe('deferred_purchase_flow');
  await expect(m.transfer.runPlusTransferCheck('foreground')).resolves.toBe('deferred_purchase_flow');
  expect(m.purchases.syncPurchasesForResult).not.toHaveBeenCalled();
  await expect(m.hold.readPlusTransferHold()).resolves.toMatchObject({ attempts: 0 });
  // Plus держится, пока проверка отложена.
  await expect(m.hold.plusTransferHoldGrantsAccess(STABLE_B)).resolves.toBe(true);

  end();
  await expect(m.transfer.runPlusTransferCheck('foreground')).resolves.toBe('confirmed');
});

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
  expect(read('app/paywall_purchase.ts')).toMatch(/withPurchaseFlow\('paywall_purchase', \(\) => \{\s*purchaseInvoked = true;[^\n]*\n\s*return Purchases\.purchasePackage\(pkg\);/);
  // зачем (10.10): 65(а) d677a328e — «Проверить статус» (getCustomerInfo) и «Восстановить» идут одним путём; оба внутри метки.
  expect(read('app/paywall_purchase.ts')).toContain("withPurchaseFlow('paywall_restore', () => (mode === 'check' ? Purchases.getCustomerInfo() : Purchases.restorePurchases()))");
  expect(read('app/manage_subscription_purchase.ts')).toContain("withPurchaseFlow('manage_subscription_upgrade', () => Purchases.purchasePackage(yearlyPackage, opts as any))");
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
