import fs from 'fs';
import path from 'path';

type ReconcileHooks = {
  selectEligiblePremiumSubscription: (items: unknown[], nowMs: number) => any | null;
  mapSubscriptionToSyntheticEvent: (
    stableUid: string,
    subscription: Record<string, unknown>,
    storeIdentifier: string,
    appId: string,
  ) => Record<string, unknown>;
  reconcileReservationDecision: (
    state: Record<string, unknown>,
    nowMs: number,
  ) => { kind: 'acquire' | 'cooldown' | 'in_progress' };
  fetchRevenueCatJson: (
    url: string,
    secret: string,
    fetchImpl: (url: string, init: RequestInit) => Promise<Response>,
  ) => Promise<unknown>;
  fetchEligiblePremiumSubscription: (
    initialUrl: string,
    secret: string,
    nowMs: number,
    fetchImpl: (url: string, init: RequestInit) => Promise<Response>,
  ) => Promise<Record<string, unknown> | null>;
  isCacheablePaidLineageOutcome: (
    outcome: { statusCode: number; body: Record<string, unknown> },
    existingStoreProjectionActive: boolean,
  ) => boolean;
  reservationId: (stableUid: string, scope?: 'premium') => string;
  acquireReservation: (
    db: any,
    stableUid: string,
    nowMs: number,
    scope?: 'premium',
  ) => Promise<'acquired' | 'cooldown' | 'in_progress'>;
  finishReservation: (
    db: any,
    stableUid: string,
    nowMs: number,
    outcome: 'active' | 'not_found' | 'error',
    scope?: 'premium',
  ) => Promise<void>;
  reservationCooldownMs: (
    outcome: 'active' | 'not_found' | 'error',
    scope?: 'premium',
  ) => number;
};

function loadHooks(): ReconcileHooks {
  const sourcePath = path.join(__dirname, 'revenuecat_reconcile.ts');
  expect(fs.existsSync(sourcePath)).toBe(true);
  return require('./revenuecat_reconcile').__revenueCatReconcileTestHooks as ReconcileHooks;
}

function activeSubscription(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'sub_prod_01',
    product_id: 'prod_monthly_01',
    entitlements: { items: [{ lookup_key: 'premium', state: 'active' }] },
    gives_access: true,
    status: 'active',
    environment: 'production',
    ownership: 'purchased',
    store: 'play_store',
    store_subscription_identifier: 'GPA.1234-5678-9012-34567',
    starts_at: 1_700_000_000_000,
    current_period_starts_at: 1_800_000_000_000,
    current_period_ends_at: 1_802_592_000_000,
    ends_at: 1_802_592_000_000,
    ...overrides,
  };
}

describe('RevenueCat V2 premium reconciliation policy', () => {
  it('selects a production purchased active premium subscription with unexpired access', () => {
    const { selectEligiblePremiumSubscription } = loadHooks();
    const selected = selectEligiblePremiumSubscription([activeSubscription()], 1_801_000_000_000);
    expect(selected).toMatchObject({ id: 'sub_prod_01', product_id: 'prod_monthly_01' });
  });

  it('rejects an active retired MAX-only subscription', () => {
    const { selectEligiblePremiumSubscription } = loadHooks();
    const selected = selectEligiblePremiumSubscription([
      activeSubscription({
        id: 'sub_max_only',
        entitlements: { items: [{ lookup_key: 'max', state: 'active' }] },
      }),
    ], 1_801_000_000_000);

    expect(selected).toBeNull();
  });

  it('selects the later-expiring ordinary Premium subscription without MAX priority', () => {
    const { selectEligiblePremiumSubscription } = loadHooks();
    const selected = selectEligiblePremiumSubscription([
      activeSubscription({
        id: 'sub_plus_later',
        current_period_ends_at: 1_803_000_000_000,
        ends_at: 1_803_000_000_000,
      }),
      activeSubscription({
        id: 'sub_max',
        entitlements: { items: [
          { lookup_key: 'premium', state: 'active' },
          { lookup_key: 'max', state: 'active' },
        ] },
        current_period_ends_at: 1_802_000_000_000,
        ends_at: 1_802_000_000_000,
      }),
    ], 1_801_000_000_000);

    expect(selected).toMatchObject({ id: 'sub_plus_later' });
  });

  it.each(['trialing', 'in_grace_period'])(
    'accepts %s when the production purchase still gives premium access',
    (status) => {
      const { selectEligiblePremiumSubscription } = loadHooks();
      expect(selectEligiblePremiumSubscription(
        [activeSubscription({ status })],
        1_801_000_000_000,
      )).toMatchObject({ id: 'sub_prod_01', status });
    },
  );

  it.each([
    ['sandbox', { environment: 'sandbox' }],
    ['promotional', { ownership: 'promotional' }],
    ['shared', { ownership: 'family_shared' }],
    ['wrong entitlement', { entitlements: { items: [{ lookup_key: 'pro', state: 'active' }] } }],
    ['inactive entitlement', { entitlements: { items: [{ lookup_key: 'premium', state: 'inactive' }] } }],
    ['no access', { gives_access: false }],
    ['expired', { current_period_ends_at: 1_800_000_000_000, ends_at: 1_800_000_000_000 }],
  ])('rejects %s subscriptions', (_label, overrides) => {
    const { selectEligiblePremiumSubscription } = loadHooks();
    expect(selectEligiblePremiumSubscription(
      [activeSubscription(overrides)],
      1_801_000_000_000,
    )).toBeNull();
  });

  it('maps the real Play base-plan SKU to a deterministic bounded webhook event', () => {
    const { mapSubscriptionToSyntheticEvent } = loadHooks();
    const subscription = activeSubscription();
    const first = mapSubscriptionToSyntheticEvent(
      'stable-user',
      subscription,
      'phraseman_premium_monthly_399:monthly-base',
      'appabc123',
    );
    const replay = mapSubscriptionToSyntheticEvent(
      'stable-user',
      subscription,
      'phraseman_premium_monthly_399:monthly-base',
      'appabc123',
    );

    expect(replay).toEqual(first);
    expect(String(first.id)).toMatch(/^rc_reconcile_[a-f0-9]{40}$/);
    expect(String(first.id).length).toBeLessThanOrEqual(64);
    expect(first).toMatchObject({
      type: 'RENEWAL',
      app_id: 'appabc123',
      app_user_id: 'stable-user',
      original_app_user_id: 'stable-user',
      product_id: 'phraseman_premium_monthly_399:monthly-base',
      entitlement_ids: ['premium'],
      store: 'PLAY_STORE',
      environment: 'PRODUCTION',
      original_transaction_id: 'GPA.1234-5678-9012-34567',
      transaction_id: 'sub_prod_01',
      purchased_at_ms: 1_700_000_000_000,
      event_timestamp_ms: 1_800_000_000_000,
      expiration_at_ms: 1_802_592_000_000,
    });
  });

  it.each([
    'phraseman_max_monthly_v1',
    'phraseman_max_monthly_v1:monthly-base',
  ])('rejects retired MAX SKU %s without creating Premium access', (productId) => {
    const { mapSubscriptionToSyntheticEvent } = loadHooks();
    expect(() => mapSubscriptionToSyntheticEvent(
      'stable-user',
      activeSubscription(),
      productId,
      'appabc123',
    )).toThrow('revenuecat_reconcile_unmanaged_product');
  });

  it('rejects a non-MAX product when only the max entitlement is active', () => {
    const { mapSubscriptionToSyntheticEvent } = loadHooks();
    expect(() => mapSubscriptionToSyntheticEvent(
      'stable-user',
      activeSubscription({
        entitlements: { items: [{ lookup_key: 'max', state: 'active' }] },
      }),
      'phraseman_premium_monthly_399:monthly-base',
      'appabc123',
    )).toThrow('revenuecat_reconcile_premium_entitlement_unverified');
  });

  it('keeps ordinary Premium reconciliation cooldowns bounded', () => {
    const { reservationCooldownMs } = loadHooks();
    expect(reservationCooldownMs('not_found', 'premium')).toBe(5 * 60 * 1_000);
    expect(reservationCooldownMs('error', 'premium')).toBe(5 * 60 * 1_000);
    expect(reservationCooldownMs('active', 'premium')).toBe(6 * 60 * 60 * 1_000);
  });

  it('rejects a lookalike product before creating a synthetic event', () => {
    const { mapSubscriptionToSyntheticEvent } = loadHooks();
    expect(() => mapSubscriptionToSyntheticEvent(
      'stable-user',
      activeSubscription(),
      'not_phraseman_premium_monthly_399:monthly-base',
      'appabc123',
    )).toThrow('revenuecat_reconcile_unmanaged_product');
  });

  it('rejects a missing or malformed authoritative RevenueCat app id', () => {
    const { mapSubscriptionToSyntheticEvent } = loadHooks();
    expect(() => mapSubscriptionToSyntheticEvent(
      'stable-user',
      activeSubscription(),
      'phraseman_premium_monthly_399:monthly-base',
      'proj6af7e8d5',
    )).toThrow('revenuecat_reconcile_subscription_invalid');
  });

  it('distinguishes an active lease from cooldown and an acquirable reservation', () => {
    const { reconcileReservationDecision } = loadHooks();
    expect(reconcileReservationDecision({ leaseUntilMs: 2_000 }, 1_000)).toEqual({ kind: 'in_progress' });
    expect(reconcileReservationDecision({ nextAllowedAtMs: 2_000 }, 1_000)).toEqual({ kind: 'cooldown' });
    expect(reconcileReservationDecision({ nextAllowedAtMs: 900, leaseUntilMs: 900 }, 1_000))
      .toEqual({ kind: 'acquire' });
  });

  it('uses only an injected fetch and fake secret in local tests', async () => {
    const { fetchRevenueCatJson } = loadHooks();
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ items: [] }),
    } as Response));
    const url = 'https://api.revenuecat.com/v2/projects/proj6af7e8d5/customers/test/subscriptions?limit=20';

    await expect(fetchRevenueCatJson(url, 'fake-test-secret', fetchImpl)).resolves.toEqual({ items: [] });
    expect(fetchImpl).toHaveBeenCalledWith(url, expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({ Authorization: 'Bearer fake-test-secret' }),
    }));
  });

  it('finds an eligible subscription on the second bounded RevenueCat page', async () => {
    const { fetchEligiblePremiumSubscription } = loadHooks();
    const initialUrl = 'https://api.revenuecat.com/v2/projects/proj6af7e8d5/customers/test/subscriptions?limit=20';
    const nextUrl = '/v2/projects/proj6af7e8d5/customers/test/subscriptions?limit=20&starting_after=sub_page_1';
    const fetchImpl = jest.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => url === initialUrl
        ? { items: [activeSubscription({ environment: 'sandbox' })], next_page: nextUrl }
        : { items: [activeSubscription({ id: 'sub_page_2', status: 'trialing' })], next_page: null },
    } as Response));

    await expect(fetchEligiblePremiumSubscription(
      initialUrl,
      'fake-test-secret',
      1_801_000_000_000,
      fetchImpl,
    )).resolves.toMatchObject({ id: 'sub_page_2' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['cross-origin', 'https://attacker.invalid/steal'],
    ['malformed', 'not a valid URL'],
    ['other customer', 'https://api.revenuecat.com/v2/projects/proj6af7e8d5/customers/other/subscriptions?limit=20'],
    ['other endpoint', 'https://api.revenuecat.com/v2/projects/proj6af7e8d5/products/prod_monthly_01'],
  ])('fails closed on a %s RevenueCat next_page', async (_label, hostileNextPage) => {
    const { fetchEligiblePremiumSubscription } = loadHooks();
    const initialUrl = 'https://api.revenuecat.com/v2/projects/proj6af7e8d5/customers/test/subscriptions?limit=20';
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ items: [], next_page: hostileNextPage }),
    } as Response));

    await expect(fetchEligiblePremiumSubscription(
      initialUrl,
      'fake-test-secret',
      1_801_000_000_000,
      fetchImpl,
    )).rejects.toThrow('revenuecat_v2_next_page_invalid');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('stops subscription pagination after five valid pages', async () => {
    const { fetchEligiblePremiumSubscription } = loadHooks();
    const base = 'https://api.revenuecat.com/v2/projects/proj6af7e8d5/customers/test/subscriptions';
    const fetchImpl = jest.fn(async (_url: string) => ({
      ok: true,
      status: 200,
      json: async () => ({ items: [], next_page: `${base}?limit=20&page=${fetchImpl.mock.calls.length + 1}` }),
    } as Response));

    await expect(fetchEligiblePremiumSubscription(
      `${base}?limit=20&page=1`,
      'fake-test-secret',
      1_801_000_000_000,
      fetchImpl,
    )).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });

  it('stops before fetching a subscription beyond the 100-row bound', async () => {
    const { fetchEligiblePremiumSubscription } = loadHooks();
    const base = 'https://api.revenuecat.com/v2/projects/proj6af7e8d5/customers/test/subscriptions';
    const fetchImpl = jest.fn(async (_url: string) => {
      const page = fetchImpl.mock.calls.length;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          items: page <= 4
            ? Array.from({ length: 25 }, (_, index) => activeSubscription({
              id: `sandbox_${page}_${index}`,
              environment: 'sandbox',
            }))
            : [activeSubscription({ id: 'too_late' })],
          next_page: `${base}?limit=20&page=${page + 1}`,
        }),
      } as Response;
    });

    await expect(fetchEligiblePremiumSubscription(
      `${base}?limit=20&page=1`,
      'fake-test-secret',
      1_801_000_000_000,
      fetchImpl,
    )).resolves.toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('does not let generic Firestore premium access bypass RevenueCat verification', () => {
    const source = fs.readFileSync(path.join(__dirname, 'revenuecat_reconcile.ts'), 'utf8');
    const start = source.indexOf('async function reconcileMine(');
    const end = source.indexOf('\nexport const revenueCatPremiumReconcileMine', start);
    const body = source.slice(start, end);
    const reducerCall = body.indexOf('applyVerifiedPremiumSubscriptionEvent');
    const accessResolve = body.indexOf('resolvePremiumAccess');

    expect(reducerCall).toBeGreaterThanOrEqual(0);
    expect(accessResolve).toBe(-1);
    expect(body).toContain('isCacheablePaidLineageOutcome');
    expect(body).not.toContain("source: 'firestore'");
  });

  it.each([
    ['intro', { intro_access_until_ms: '1802000000000' }],
    ['loyalty', { loyalty_gift_until_ms: '1802000000000' }],
  ])('does not cache owner_lineage_limit as paid reconciliation for %s access', (_label, progress) => {
    const { isCacheablePaidLineageOutcome } = loadHooks();
    const { isPremiumAccessActive, isStorePremiumActive } = require('./premium_status');
    const nowMs = 1_801_000_000_000;

    expect(isPremiumAccessActive(progress, nowMs)).toBe(true);
    expect(isStorePremiumActive(progress, nowMs)).toBe(false);
    expect(isCacheablePaidLineageOutcome({
      statusCode: 200,
      body: { ok: true, updated: false, active: false, reason: 'owner_lineage_limit' },
    }, isStorePremiumActive(progress, nowMs))).toBe(false);
  });

  it.each([
    ['applied active lineage', { statusCode: 200, body: { ok: true, updated: true, active: true } }, false],
    ['stale event with active aggregate', { statusCode: 200, body: { ok: true, updated: false, active: true, reason: 'stale_event' } }, false],
    ['duplicate with active store projection', { statusCode: 200, body: { ok: true, updated: false, reason: 'duplicate' } }, true],
  ])('accepts a confirmed paid outcome: %s', (_label, outcome, existingStoreProjectionActive) => {
    const { isCacheablePaidLineageOutcome } = loadHooks();
    expect(isCacheablePaidLineageOutcome(outcome, existingStoreProjectionActive)).toBe(true);
  });

  it('uses auth-only identity, fixed RC host, App Check, secret binding and the shared reducer', () => {
    const sourcePath = path.join(__dirname, 'revenuecat_reconcile.ts');
    expect(fs.existsSync(sourcePath)).toBe(true);
    const source = fs.readFileSync(sourcePath, 'utf8');
    const shards = fs.readFileSync(path.join(__dirname, 'revenuecat_shards.ts'), 'utf8');
    const index = fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8');

    expect(source).toContain("defineSecret('REVENUECAT_SECRET_API_KEY')");
    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(source).toContain('resolveStableUidForAuth(db, authUid, undefined');
    expect(source).toContain('isCacheablePaidLineageOutcome');
    expect(source).toContain('isStorePremiumActive');
    expect(source).not.toContain('resolvePremiumAccess(db, stableUid');
    expect(source).toContain('https://api.revenuecat.com/v2/projects/proj6af7e8d5');
    expect(source).toContain('applyVerifiedPremiumSubscriptionEvent');
    expect(source).not.toContain('request.data?.stableId');
    expect(source).not.toContain('progressPatch');
    expect(source).not.toMatch(/['"]progress\./);
    expect(source).not.toContain('console.');
    expect(shards).toContain('export async function applyVerifiedPremiumSubscriptionEvent');
    expect(index).toMatch(/export \{ revenueCatPremiumReconcileMine \} from ["']\.\/revenuecat_reconcile["'];/);
  });
});
