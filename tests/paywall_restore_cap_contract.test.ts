// зачем (координатор 14.10, аудит покупки): пока идёт «Восстановить покупки», окно Plus закрыть нельзя, а старт магазина и синхронизация
// личности ждались без потолка — зависший RevenueCat запирал человека с вечным «Восстанавливаем…». Тест: оба шага ДО магазина под потолком
// LOAD_GATE_TOTAL_MS, по таймауту — лог [PAYWALL-RESTORE] + тост «Попробуй ещё раз», finally освобождает кнопку и закрытие; сам
// restorePurchases/getCustomerInfo без потолка (поздний ответ магазина применяется).
import fs from 'node:fs';
import path from 'node:path';

import { LOAD_GATE_TOTAL_MS } from '../app/load_gate_config';
import { awaitWithinInitCap } from '../app/paywall_init_cap';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/paywall_purchase.ts'), 'utf8');
const start = src.indexOf('const handleRestore = useCallback(');
const end = src.indexOf('entitlementSyncRef.current = handleRestore;');
const restore = src.slice(start, end);

describe('restore purchases: waiting before the store is capped', () => {
  it('finds the handleRestore block', () => {
    expect(start).toBeGreaterThan(0);
    expect(end).toBeGreaterThan(start);
  });

  it('both pre-store steps go through the cap, no bare await left', () => {
    expect(restore).toContain("awaitWithinInitCap('initRevenueCat', initRevenueCat(isOperationAccountCurrent), LOAD_GATE_TOTAL_MS,");
    expect(restore).toContain("awaitWithinInitCap('syncRevenueCatIdentity', syncRevenueCatIdentity(isOperationAccountCurrent), LOAD_GATE_TOTAL_MS,");
    expect(restore).not.toMatch(/await initRevenueCat\(/);
    expect(restore).not.toMatch(/await syncRevenueCatIdentity\(/);
    expect(restore).toContain("if (initCapped.status === 'timeout') { stopRestoreBeforeStore('initRevenueCat', initCapped.ms); return; }");
    expect(restore).toContain("if (identityCapped.status === 'timeout') { stopRestoreBeforeStore('syncRevenueCatIdentity', identityCapped.ms); return; }");
    expect(restore).toMatch(/if \(initCapped\.status === 'error'\) throw initCapped\.error;/);
    expect(restore).toMatch(/if \(identityCapped\.status === 'error'\) throw identityCapped\.error;/);
    // «личность не готова» осталась прежним тостом магазина
    expect(restore).toContain('if (!identityCapped.value) {');
  });

  it('the timeout exit logs [PAYWALL-RESTORE], writes the reason code and shows the retry toast', () => {
    const at = restore.indexOf('const stopRestoreBeforeStore =');
    expect(at).toBeGreaterThan(0);
    const stop = restore.slice(at, restore.indexOf('};', at));
    expect(stop).toContain('[PAYWALL-RESTORE] timeout step=');
    expect(stop).toContain("releaseReason('restore_purchase', 'load_timeout', 'error')");
    expect(stop).toContain("emitAppEvent('action_toast', restoreRetryToast())");
  });

  it('caps come before the store call, the store call itself has no cap, finally frees the button and close', () => {
    const storeCall = restore.indexOf('Purchases.restorePurchases()');
    expect(storeCall).toBeGreaterThan(0);
    expect(restore.indexOf("awaitWithinInitCap('syncRevenueCatIdentity'")).toBeLessThan(storeCall);
    expect(restore).not.toMatch(/awaitWithinInitCap\([^;]*restorePurchases/);
    expect(restore).not.toMatch(/withLoadTimeout\([^;]*restorePurchases/);
    expect(restore).toMatch(/finally \{\s*operationRef\.current = null;\s*setRestoring\(false\);/);
  });
});

describe('the ceiling itself (same value as purchase)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('a hung store start releases the restore after LOAD_GATE_TOTAL_MS, not later', async () => {
    const pending = awaitWithinInitCap('initRevenueCat', new Promise<void>(() => {}), LOAD_GATE_TOTAL_MS, 'restore:restore:settings');
    let settled = false;
    void pending.then(() => { settled = true; });
    await jest.advanceTimersByTimeAsync(LOAD_GATE_TOTAL_MS - 1);
    expect(settled).toBe(false);
    await jest.advanceTimersByTimeAsync(2);
    expect((await pending).status).toBe('timeout');
  });
});
