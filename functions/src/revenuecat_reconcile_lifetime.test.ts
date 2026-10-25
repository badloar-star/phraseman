/**
 * зачем (координатор 25.10, разбор «оплата в отсрочке удаления»): вебхук в 14-дневной отсрочке отказывает навсегда, Plus возвращает
 * подтяжка revenueCatPremiumReconcileMine. Раньше она брала только подписки — «навсегда», купленное в отсрочке, после
 * восстановления на сервер не приходило. Сторож: разовая покупка «навсегда» отбирается строго и применяется синтетическим
 * NON_RENEWING_PURCHASE; восстановление сбрасывает задержку подтяжки; повтор не задваивает; подписки — как раньше, первыми.
 */
import fs from 'fs';
import path from 'path';

jest.mock('firebase-functions/logger', () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn() }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const hooks = require('./revenuecat_reconcile').__revenueCatReconcileTestHooks;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { REVENUECAT_RECONCILE_RESERVATIONS, revenueCatPremiumReconcileReservationId } = require('./revenuecat_reconcile');

// зачем: reconcileMine закрывает резервацию по Date.now() — тестовое «сейчас» обязано совпадать с настоящим, иначе задержка уже истекла
const NOW = Date.now();
const UID = 'stable_owner_lifetime_1';
const LIFETIME_PRODUCT_RC_ID = 'prod_lifetime_01';

function lifetimePurchase(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'purch_lifetime_01',
    product_id: LIFETIME_PRODUCT_RC_ID,
    store_purchase_identifier: '2000000123456789',
    environment: 'production',
    ownership: 'purchased',
    status: 'owned',
    store: 'app_store',
    purchased_at: NOW - 3 * 86_400_000, // куплено в отсрочке
    entitlements: { items: [{ lookup_key: 'premium', state: 'active' }] },
    ...overrides,
  };
}

describe('выбор и сопоставление «навсегда»', () => {
  it('оплаченная production-покупка с правом premium подходит; возврат, песочница, семейная, без права — нет', () => {
    expect(hooks.selectEligibleLifetimePurchase([lifetimePurchase()])).not.toBeNull();
    for (const bad of [
      { status: 'refunded' }, { environment: 'sandbox' }, { ownership: 'family_shared' }, { store: 'stripe' },
      { entitlements: { items: [] } }, { store_purchase_identifier: '' },
    ]) {
      expect(hooks.selectEligibleLifetimePurchase([lifetimePurchase(bad)])).toBeNull();
    }
  });

  it('синтетическое событие NON_RENEWING_PURCHASE детерминировано — повтор даёт тот же id', () => {
    const a = hooks.mapLifetimePurchaseToSyntheticEvent(UID, lifetimePurchase(), 'phraseman_premium_lifetime_v1', 'appABC123');
    const b = hooks.mapLifetimePurchaseToSyntheticEvent(UID, lifetimePurchase(), 'phraseman_premium_lifetime_v1', 'appABC123');
    expect(a.id).toBe(b.id);
    expect(String(a.id)).toMatch(/^rc_reconcile_lt_[0-9a-f]{40}$/);
    expect(a.type).toBe('NON_RENEWING_PURCHASE');
    expect(a.product_id).toBe('phraseman_premium_lifetime_v1');
    expect(a.app_user_id).toBe(UID);
    expect(a.environment).toBe('PRODUCTION');
  });

  it('чужой продукт (не наш lifetime) не превращается в событие', () => {
    expect(() => hooks.mapLifetimePurchaseToSyntheticEvent(UID, lifetimePurchase(), 'phraseman_premium_monthly', 'appABC123'))
      .toThrow('revenuecat_reconcile_not_lifetime_product');
  });
});

/** Подставная база: резервации подтяжки + users/{uid} (проекция Plus, которую «пишет» подставной редьюсер). */
function fakeDb() {
  const docs = new Map<string, Record<string, unknown>>();
  const ref = (col: string, id: string) => ({
    path: `${col}/${id}`,
    get: async () => ({ exists: docs.has(`${col}/${id}`), data: () => docs.get(`${col}/${id}`) }),
    set: async (data: Record<string, unknown>, opts?: { merge?: boolean }) => {
      docs.set(`${col}/${id}`, opts?.merge ? { ...(docs.get(`${col}/${id}`) ?? {}), ...data } : { ...data });
    },
  });
  const db = {
    collection: (col: string) => ({ doc: (id: string) => ref(col, id) }),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => fn({
      get: (r: { get: () => Promise<unknown> }) => r.get(),
      set: (r: { set: (d: Record<string, unknown>, o?: { merge?: boolean }) => Promise<void> }, d: Record<string, unknown>, o?: { merge?: boolean }) => { void r.set(d, o); },
    }),
  };
  return { db, docs };
}

function fakeFetch(purchases: unknown[], subscriptions: unknown[] = []) {
  const urls: string[] = [];
  const impl = async (url: string) => {
    urls.push(url);
    const body = url.includes('/subscriptions') ? { items: subscriptions, next_page: null }
      : url.includes('/purchases') ? { items: purchases, next_page: null }
        : url.includes('/products/') ? { store_identifier: 'phraseman_premium_lifetime_v1', app_id: 'appABC123' }
          : {};
    return { ok: true, status: 200, json: async () => body } as unknown as Response;
  };
  return { impl, urls };
}

describe('цепочка: «навсегда» в отсрочке → восстановили → пришло на сервер', () => {
  it('задержка мешает, сброс при восстановлении — и Plus «навсегда» применяется; повтор не задваивает', async () => {
    const { db, docs } = fakeDb();
    const reservationKey = `${REVENUECAT_RECONCILE_RESERVATIONS}/${revenueCatPremiumReconcileReservationId(UID)}`;
    // прошлая (неудачная) попытка оставила задержку
    docs.set(reservationKey, { leaseUntilMs: 0, nextAllowedAtMs: NOW + 60 * 60 * 1000, outcome: 'not_found' });
    const apply = jest.fn(async (event: Record<string, unknown>) => {
      if (docs.get(`users/${UID}`)) return { statusCode: 200, body: { ok: true, kind: 'premium', updated: false, reason: 'duplicate' } };
      docs.set(`users/${UID}`, { progress: { premium_plan: 'lifetime', premium_expiry: '0' } });
      return { statusCode: 200, body: { ok: true, kind: 'premium', updated: true, active: true, eventId: event.id } };
    });
    const f = fakeFetch([lifetimePurchase()]);

    // до сброса — задержка, ничего не применяется
    const blocked = await hooks.reconcileMine(db, UID, 'auth_1', 'test_secret', NOW, f.impl, 'premium', apply);
    expect(blocked.reconciled).toBe(false);
    expect(apply).not.toHaveBeenCalled();

    // восстановление аккаунта удаляет резервацию (как account_delete_restore)
    docs.delete(reservationKey);
    const restored = await hooks.reconcileMine(db, UID, 'auth_1', 'test_secret', NOW, f.impl, 'premium', apply);
    expect(restored).toMatchObject({ ok: true, active: true, reconciled: true, plan: 'lifetime' });
    expect(apply).toHaveBeenCalledTimes(1);
    expect((apply.mock.calls[0] as unknown[])[0]).toMatchObject({ type: 'NON_RENEWING_PURCHASE', product_id: 'phraseman_premium_lifetime_v1' });

    // повтор сразу после — задержка успеха, начислений больше нет, ответ «активно» из проекции
    const again = await hooks.reconcileMine(db, UID, 'auth_1', 'test_secret', NOW + 1000, f.impl, 'premium', apply);
    expect(again).toMatchObject({ active: true, reconciled: true });
    expect(apply).toHaveBeenCalledTimes(1);

    // даже после задержки — то же событие (тот же id) → «duplicate», редьюсер не начисляет второй раз
    docs.delete(reservationKey);
    const later = await hooks.reconcileMine(db, UID, 'auth_1', 'test_secret', NOW + 7 * 3_600_000, f.impl, 'premium', apply);
    expect(later).toMatchObject({ active: true, reconciled: true });
    expect(apply).toHaveBeenCalledTimes(2);
    expect((apply.mock.calls[1] as unknown[])[0]).toMatchObject({ id: (apply.mock.calls[0] as unknown[] as Array<Record<string, unknown>>)[0].id });
  });

  it('подписки — как раньше: есть активная подписка → разовые покупки не запрашиваются', async () => {
    const { db } = fakeDb();
    const subscription = {
      id: 'sub_prod_01', product_id: 'prod_monthly_01', gives_access: true, status: 'active', environment: 'production',
      ownership: 'purchased', store: 'app_store', store_subscription_identifier: '1000000000000001',
      entitlements: { items: [{ lookup_key: 'premium', state: 'active' }] },
      starts_at: NOW - 40 * 86_400_000, current_period_starts_at: NOW - 86_400_000, current_period_ends_at: NOW + 29 * 86_400_000,
    };
    const f = fakeFetch([lifetimePurchase()], [subscription]);
    const apply = jest.fn(async () => ({ statusCode: 200, body: { ok: true, updated: true, active: true } }));
    // продукт подписки — месячный
    const impl = async (url: string) => {
      if (url.includes('/products/')) {
        f.urls.push(url);
        return { ok: true, status: 200, json: async () => ({ store_identifier: 'phraseman_premium_monthly', app_id: 'appABC123' }) } as unknown as Response;
      }
      return f.impl(url);
    };
    const result = await hooks.reconcileMine(db, UID, 'auth_1', 'test_secret', NOW, impl, 'premium', apply);
    expect(result).toMatchObject({ active: true, reconciled: true });
    expect(f.urls.some((u) => u.includes('/purchases'))).toBe(false);
    expect((apply.mock.calls[0] as unknown[])[0]).toMatchObject({ type: 'RENEWAL' });
  });

  it('нет ни подписки, ни «навсегда» → не найдено, без применения', async () => {
    const { db } = fakeDb();
    const apply = jest.fn();
    const f = fakeFetch([lifetimePurchase({ status: 'refunded' })]);
    const result = await hooks.reconcileMine(db, UID, 'auth_1', 'test_secret', NOW, f.impl, 'premium', apply);
    expect(result).toMatchObject({ active: false, reconciled: false, reason: 'no_verified_subscription_or_lifetime' });
    expect(apply).not.toHaveBeenCalled();
  });
});

describe('восстановление аккаунта сбрасывает задержку подтяжки', () => {
  it('в транзакции accountDeleteRestoreMine удаляется резервация подтяжки этого аккаунта', () => {
    const src = fs.readFileSync(path.join(__dirname, 'account_delete_restore.ts'), 'utf8');
    expect(src).toContain('tx.delete(db.collection(REVENUECAT_RECONCILE_RESERVATIONS).doc(revenueCatPremiumReconcileReservationId(stableUid)));');
    expect(revenueCatPremiumReconcileReservationId(UID)).toBe(hooks.reservationId(UID, 'premium'));
  });

  it('в отсрочке подтяжка закрыта общим шлюзом удаления (resolveStableUidForAuth)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'revenuecat_reconcile.ts'), 'utf8');
    const handler = src.slice(src.indexOf('export const revenueCatPremiumReconcileMine'));
    expect(handler.indexOf('resolveStableUidForAuth(')).toBeGreaterThan(0);
    expect(handler.indexOf('resolveStableUidForAuth(')).toBeLessThan(handler.indexOf('reconcileMine('));
  });
});
