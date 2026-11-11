/*
 * U23 «Привязка Pro»: ручное «Восстановить покупки» выдаёт Plus только аккаунту-владельцу.
 * Магазин может вернуть активную подписку любому аккаунту на телефоне — решает сервер.
 */
import fs from 'fs';
import path from 'path';

const sync = jest.fn<Promise<boolean>, [string]>();
jest.mock('../app/revenuecat_projection_sync', () => ({
  syncRevenueCatProjectionForAccount: (stableUid: string) => sync(stableUid),
}));
jest.mock('../app/events', () => ({
  actionToastTri: (type: string, m: Record<string, string>) => ({ type, messageRu: m.ru, messageEn: m.en }),
}));

import { confirmRestoreOwnerOnServer, restoreOwnerNotConfirmedToast } from '../app/restore_owner_confirmation';

const read = (file: string): string => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

let warn: jest.SpyInstance;
let log: jest.SpyInstance;
beforeEach(() => {
  sync.mockReset();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => { warn.mockRestore(); log.mockRestore(); });

describe('confirmRestoreOwnerOnServer', () => {
  it('account A (owner): server confirms → confirmed', async () => {
    sync.mockResolvedValue(true);
    await expect(confirmRestoreOwnerOnServer('stable-a', 'paywall:test')).resolves.toMatchObject({ verdict: 'confirmed' });
    expect(sync).toHaveBeenCalledWith('stable-a');
  });

  it('account B (not owner): server answers «not yours» → not_confirmed', async () => {
    sync.mockResolvedValue(false);
    await expect(confirmRestoreOwnerOnServer('stable-b', 'paywall:test')).resolves.toMatchObject({ verdict: 'not_confirmed' });
  });

  it('server refuses or is unreachable → check_failed, never throws, reason is logged', async () => {
    sync.mockRejectedValue(new Error('revenuecat_reconcile_unavailable'));
    await expect(confirmRestoreOwnerOnServer('stable-b', 'manage_subscription')).resolves.toMatchObject({ verdict: 'check_failed' });
    expect(warn.mock.calls.some((call) => String(call[0]).includes('[RESTORE-OWNER] verdict=check_failed')
      && String(call[0]).includes('revenuecat_reconcile_unavailable'))).toBe(true);
  });

  it('no account → check_failed without touching the server', async () => {
    await expect(confirmRestoreOwnerOnServer(null, 'paywall:test')).resolves.toMatchObject({ verdict: 'check_failed' });
    expect(sync).not.toHaveBeenCalled();
  });

  it('never logs the account identifier', async () => {
    sync.mockResolvedValue(false);
    await confirmRestoreOwnerOnServer('stable-secret-id', 'paywall:test');
    const all = [...warn.mock.calls, ...log.mock.calls].map((call) => String(call[0])).join('\n');
    expect(all).not.toContain('stable-secret-id');
  });

  it('toast says where Plus lives', () => {
    expect(restoreOwnerNotConfirmedToast()).toMatchObject({ type: 'error' });
    expect(String((restoreOwnerNotConfirmedToast() as { messageRu?: string }).messageRu)).toContain('только на аккаунте');
  });
});

// Экран подписки проверяется отдельно: tests/u23_restore_owner_manage_subscription.test.ts.
describe('paywall «Восстановить» gates access on the server verdict', () => {
  it('paywall: owner check runs after the store answer and before any local access write', () => {
    const src = read('app/paywall_purchase.ts');
    const restore = src.slice(src.indexOf('const handleRestore = useCallback('), src.indexOf('entitlementSyncRef.current = handleRestore;'));
    const store = restore.indexOf('Purchases.restorePurchases()');
    const gate = restore.indexOf('confirmRestoreOwnerOnServer(operationAccount.stableId');
    const persist = restore.indexOf('persistStorePremiumLocally(');
    expect(store).toBeGreaterThan(-1);
    expect(gate).toBeGreaterThan(store);
    expect(persist).toBeGreaterThan(gate);
    expect(restore).toContain("if (ownerCheck.verdict !== 'confirmed') {");
    expect(restore).toContain('restoreOwnerNotConfirmedToast()');
    // «Проверить статус» своей свежей оплаты не блокируется проверкой владельца.
    expect(restore).toContain("if (mode === 'restore') {");
  });
});
