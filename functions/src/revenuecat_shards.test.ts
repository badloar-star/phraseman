import fs from 'fs';
import path from 'path';
import { __revenueCatWebhookTestHooks } from './revenuecat_shards';

const {
  candidateUserIds,
  premiumAuthoritativeUserIds,
  resolvePremiumOwnerRef,
  isRevenueCatAnonymousId,
  looksLikePremiumSubscription,
  premiumPlanFromEvent,
  paidAccessAchievementGrant,
  prioritizeUserCandidates,
  stableCandidateUserIds,
  transferTargetIds,
  transferSourceIds,
  revenueCatLifecycleReasonFields,
  handlePremiumSubscriptionEvent,
  qualifyReferralFromVerifiedPremiumOutcome,
  voiceMinutePackFromProduct,
  sandboxVoiceMinuteOwnerAllowed,
  handleVoiceMinutePackEvent,
} = __revenueCatWebhookTestHooks;

describe('paid access achievement facts', () => {
  it('accepts only confirmed production Plus and lifetime Pro origins', () => {
    expect(paidAccessAchievementGrant({
      environment: 'PRODUCTION', type: 'INITIAL_PURCHASE', period_type: 'NORMAL',
      product_id: 'phraseman_premium_yearly',
    })).toEqual({ plus: true, pro: false });
    expect(paidAccessAchievementGrant({
      environment: 'PRODUCTION', type: 'NON_RENEWING_PURCHASE',
      product_id: 'phraseman_premium_lifetime_v1',
    })).toEqual({ plus: false, pro: true });
  });

  it('rejects trial, restore-like lifecycle and sandbox facts', () => {
    for (const event of [
      { environment: 'PRODUCTION', type: 'INITIAL_PURCHASE', period_type: 'TRIAL', product_id: 'phraseman_premium_yearly' },
      { environment: 'PRODUCTION', type: 'RENEWAL', period_type: 'NORMAL', product_id: 'phraseman_premium_yearly' },
      { environment: 'SANDBOX', type: 'INITIAL_PURCHASE', period_type: 'NORMAL', product_id: 'phraseman_premium_yearly' },
    ]) {
      expect(paidAccessAchievementGrant(event)).toEqual({ plus: false, pro: false });
    }
  });
});

describe('RevenueCat webhook premium matching', () => {
  it('normalizes lifecycle reason enums and rejects arbitrary text', () => {
    expect(revenueCatLifecycleReasonFields({ cancel_reason: ' unsubscribe ' } as any, 'CANCELLATION'))
      .toEqual({ cancelReason: 'UNSUBSCRIBE' });
    expect(revenueCatLifecycleReasonFields({ expiration_reason: 'billing_error' } as any, 'EXPIRATION'))
      .toEqual({ expirationReason: 'BILLING_ERROR' });
    expect(revenueCatLifecycleReasonFields({ cancel_reason: 'user wrote free text!' } as any, 'CANCELLATION'))
      .toEqual({});
    expect(revenueCatLifecycleReasonFields({ cancel_reason: 'A'.repeat(65) } as any, 'CANCELLATION'))
      .toEqual({});
    expect(revenueCatLifecycleReasonFields({ cancel_reason: 'UNSUBSCRIBE' } as any, 'RENEWAL'))
      .toEqual({});
  });

  it('stores lifecycle reasons only in the RevenueCat audit event document', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
    expect(source).toContain('...revenueCatLifecycleReasonFields(event, eventType)');
    expect(source).not.toContain('progressPatch.cancelReason');
    expect(source).not.toContain('progressPatch.expirationReason');
  });

  it('stores normalized optional financial truth without changing entitlement fields', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
    for (const field of [
      'price_in_purchased_currency?: number',
      'tax_percentage?: number',
      'commission_percentage?: number',
      'renewal_number?: number',
      'is_trial_conversion?: boolean',
      '...normalizeRevenueCatFinancials(event)',
      'billingCadence: classifyRevenueCatBillingCadence(event)',
    ]) expect(source).toContain(field);
    expect(source).toContain('...aggregate.progressPatch');
    expect(source).not.toContain('progressPatch.grossUsdMicros');
    expect(source).not.toContain('progressPatch.estimatedProceedsUsdMicros');
  });
  it('accepts explicit premium entitlement events', () => {
    expect(looksLikePremiumSubscription({
      type: 'INITIAL_PURCHASE',
      product_id: 'phraseman_premium_monthly',
      entitlement_ids: ['premium'],
    })).toBe(true);
    expect(looksLikePremiumSubscription({
      type: 'INITIAL_PURCHASE',
      product_id: 'store_sku_123',
      entitlement_ids: ['premium'],
    })).toBe(false);
  });

  it('accepts premium-like subscription product ids and infers plan', () => {
    const yearly = { product_id: 'phraseman_premium_yearly' };
    const monthly = { product_id: 'phraseman_premium_monthly' };

    expect(looksLikePremiumSubscription(yearly)).toBe(true);
    expect(premiumPlanFromEvent(yearly)).toBe('yearly');
    expect(looksLikePremiumSubscription(monthly)).toBe(true);
    expect(premiumPlanFromEvent(monthly)).toBe('monthly');
    expect(looksLikePremiumSubscription({
      product_id: 'phraseman_premium_yearly_4999', entitlement_ids: ['premium'],
    })).toBe(true);
    expect(looksLikePremiumSubscription({
      product_id: 'phraseman_premium_yearly_1234567', entitlement_ids: ['premium'],
    })).toBe(false);
    expect(looksLikePremiumSubscription({
      product_id: 'phraseman_premium_yearly_fake', entitlement_ids: ['premium'],
    })).toBe(false);
  });

  it('accepts Google Play base-plan product ids and preserves plan inference', () => {
    const monthly = {
      product_id: 'phraseman_premium_monthly_399:monthly-base',
      entitlement_ids: ['premium'],
    };
    const yearly = {
      product_id: 'phraseman_premium_yearly_2399:yearly-base',
      entitlement_ids: ['premium'],
    };

    expect(looksLikePremiumSubscription(monthly)).toBe(true);
    expect(premiumPlanFromEvent(monthly)).toBe('monthly');
    expect(looksLikePremiumSubscription(yearly)).toBe(true);
    expect(premiumPlanFromEvent(yearly)).toBe('yearly');
  });

  it('ignores retired MAX subscription products even when an old entitlement is present', () => {
    for (const productId of [
      'phraseman_max_monthly_v1',
      'phraseman_max_monthly_v1:monthly-base',
    ]) {
      const event = { product_id: productId, entitlement_ids: ['premium', 'max'] };
      expect(looksLikePremiumSubscription(event)).toBe(false);
    }
  });

  it('recognizes only the exact one-time voice-minute products', () => {
    expect(voiceMinutePackFromProduct('phraseman_voice_minutes_30')).toEqual({ seconds: 1_800 });
    expect(voiceMinutePackFromProduct('phraseman_voice_minutes_120')).toEqual({ seconds: 7_200 });
    expect(voiceMinutePackFromProduct('phraseman_voice_minutes_300')).toEqual({ seconds: 18_000 });
    for (const productId of [
      'phraseman_voice_minutes_60',
      'phraseman_voice_minutes_120:base',
      'phraseman_voice_minutes_300_fake',
    ]) {
      expect(voiceMinutePackFromProduct(productId)).toBeNull();
      expect(looksLikePremiumSubscription({ product_id: productId, entitlement_ids: ['premium', 'max'] }))
        .toBe(false);
    }
  });

  it('rejects lookalike product families, unsafe base-plan suffixes, and non-premium entitlements', () => {
    for (const productId of [
      'phraseman_premium_weekly_399:monthly-base',
      'not_phraseman_premium_monthly_399:monthly-base',
      'phraseman_premium_monthly_fake:monthly-base',
      'phraseman_premium_monthly_399:',
      'phraseman_premium_monthly_399:-monthly-base',
      'phraseman_premium_monthly_399:monthly_base',
      'phraseman_premium_monthly_399:monthly/base',
      'phraseman_premium_monthly_399:monthly-base:extra',
    ]) {
      expect(looksLikePremiumSubscription({
        product_id: productId,
        entitlement_ids: ['premium'],
      })).toBe(false);
    }
    expect(looksLikePremiumSubscription({
      product_id: 'phraseman_premium_monthly_399:monthly-base',
      entitlement_ids: ['premium-plus'],
    })).toBe(false);
  });

  it('preserves legacy premium product ids and their plan inference', () => {
    for (const [productId, expectedPlan] of [
      ['phraseman_premium_monthly', 'monthly'],
      ['phraseman_premium_yearly_2399', 'yearly'],
      ['phraseman_premium_lifetime_v1', 'lifetime'],
    ] as const) {
      expect(looksLikePremiumSubscription({ product_id: productId })).toBe(true);
      expect(premiumPlanFromEvent({ product_id: productId })).toBe(expectedPlan);
    }
  });

  it('detects lifetime product and infers plan=lifetime', () => {
    const lifetime = { product_id: 'phraseman_premium_lifetime_v1', type: 'NON_RENEWING_PURCHASE' };
    expect(looksLikePremiumSubscription(lifetime)).toBe(true);
    expect(premiumPlanFromEvent(lifetime)).toBe('lifetime');
  });

  it('does not classify shard products or unknown products as premium', () => {
    expect(looksLikePremiumSubscription({
      type: 'NON_RENEWING_PURCHASE',
      product_id: 'phraseman_shards_80',
    })).toBe(false);
    expect(looksLikePremiumSubscription({
      type: 'INITIAL_PURCHASE',
      product_id: 'some_future_consumable_pack',
    })).toBe(false);
  });

  it('rejects unrelated subscription-like SKUs and offering labels without exact premium authority', () => {
    for (const productId of ['subtitle_pack', 'sub_bundle', 'subscription_tips']) {
      expect(looksLikePremiumSubscription({
        type: 'INITIAL_PURCHASE',
        product_id: productId,
        presented_offering_id: 'premium',
      })).toBe(false);
    }
    expect(looksLikePremiumSubscription({
      type: 'INITIAL_PURCHASE',
      product_id: 'opaque_store_sku',
      entitlement_ids: ['premium'],
    })).toBe(false);
  });

  it('recognizes RevenueCat anonymous ids while preserving them as a fallback target', () => {
    const anonymous = '$RCAnonymousID:98b700338b6e43e9801338d94a164c35';
    const stable = 'df7b4820-8f3c-486e-8570-ac6b66ce6d98';

    expect(isRevenueCatAnonymousId(anonymous)).toBe(true);
    expect(isRevenueCatAnonymousId(stable)).toBe(false);
    expect(stableCandidateUserIds([anonymous])).toEqual([]);
    expect(stableCandidateUserIds([anonymous, stable])).toEqual([stable]);
    expect(prioritizeUserCandidates([anonymous])).toEqual([anonymous]);
  });

  it('prioritizes stable app user ids over RevenueCat aliases', () => {
    const anonymousA = '$RCAnonymousID:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const anonymousB = '$RCAnonymousID:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
    const stable = '3b64231e-e333-4b9b-b9e9-b2c4be8e7a57';

    const candidates = candidateUserIds({
      app_user_id: anonymousA,
      original_app_user_id: anonymousB,
      aliases: [stable, anonymousA],
    });

    expect(candidates).toEqual([anonymousA, anonymousB, stable]);
    expect(prioritizeUserCandidates(candidates)).toEqual([stable, anonymousA, anonymousB]);
  });

  it('keeps subscriber attributes as evidence only and never lets them select a victim account', () => {
    const anonymous = '$RCAnonymousID:cccccccccccccccccccccccccccccccc';
    const victim = 'victim-stable-user';
    const legitimate = 'legitimate-stable-user';

    const event = {
      app_user_id: legitimate,
      original_app_user_id: anonymous,
      aliases: [legitimate, anonymous],
      subscriber_attributes: {
        phraseman_uid: {
          value: victim,
          updated_at_ms: 1710000000000,
        },
      },
    };

    expect(candidateUserIds(event)).toContain(victim);
    expect(premiumAuthoritativeUserIds(event)).toEqual([legitimate]);
    expect(premiumAuthoritativeUserIds({ ...event, app_user_id: anonymous })).toEqual([legitimate]);
    expect(premiumAuthoritativeUserIds({
      app_user_id: anonymous,
      original_app_user_id: '$RCAnonymousID:dddddddddddddddddddddddddddddddd',
      aliases: [anonymous],
      subscriber_attributes: { phraseman_uid: { value: victim } },
    })).toEqual([]);
  });

  it.each([
    ['hidden alias', ['old-a', 'canonical-b'], {
      users: {
        'old-a': { identityHidden: true, canonicalStableId: 'canonical-b' },
        'canonical-b': { identityHidden: false },
      },
      auth_links: {},
      account_identity_owner_map: {},
    }],
    ['provider link', ['provider-a'], {
      users: { 'canonical-b': { identityHidden: false } },
      auth_links: { 'provider-a': { stable_id: 'canonical-b' } },
      account_identity_owner_map: {},
    }],
  ])('resolves one non-hidden canonical premium owner through %s', async (_label, candidates, documents) => {
    const db: any = {
      collection: (collection: 'users' | 'auth_links' | 'account_identity_owner_map') => ({
        doc: (id: string) => ({ collection, id }),
      }),
    };
    const tx: any = {
      get: async (ref: { collection: 'users' | 'auth_links' | 'account_identity_owner_map'; id: string }) => {
        const data = (documents as any)[ref.collection][ref.id];
        return { exists: data !== undefined, data: () => data, ref };
      },
    };
    await expect(resolvePremiumOwnerRef(tx, db, candidates)).resolves.toMatchObject({
      status: 'resolved', uid: 'canonical-b',
    });
  });

  it('resolves a removed loser through the durable identity owner map', async () => {
    const documents: Record<string, Record<string, any>> = {
      users: { winner: { identityHidden: false } },
      auth_links: {},
      account_identity_owner_map: { loser: { canonicalStableId: 'winner' } },
    };
    const db: any = {
      collection: (collection: string) => ({ doc: (id: string) => ({ collection, id }) }),
    };
    const tx: any = {
      get: async (ref: { collection: string; id: string }) => {
        const data = documents[ref.collection]?.[ref.id];
        return { exists: data !== undefined, data: () => data, ref };
      },
    };

    await expect(resolvePremiumOwnerRef(tx, db, ['loser'])).resolves.toMatchObject({
      status: 'resolved', uid: 'winner',
    });
  });

  it('quarantines conflicting existing canonical premium roots', async () => {
    const db: any = {
      collection: (collection: 'users' | 'auth_links' | 'account_identity_owner_map') => ({ doc: (id: string) => ({ collection, id }) }),
    };
    const tx: any = {
      get: async (ref: { collection: 'users' | 'auth_links' | 'account_identity_owner_map'; id: string }) => {
        const data = ref.collection === 'users' && ['root-a', 'root-b'].includes(ref.id)
          ? { identityHidden: false }
          : undefined;
        return { exists: data !== undefined, data: () => data, ref };
      },
    };
    await expect(resolvePremiumOwnerRef(tx, db, ['root-a', 'root-b'])).resolves.toEqual({
      status: 'ambiguous', reason: 'conflicting_canonical_owners', ownerUids: ['root-a', 'root-b'],
    });
  });

  it('does not drop paid Premium events just because only an anonymous RevenueCat id is present', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');

    expect(source).not.toContain('anonymous_only_unmatched');
    expect(source).not.toContain('allowAnonymousOnly: false');
  });
});

describe('RevenueCat premium lineage transaction contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');

  it('uses canonical lineage reduction and never invents durable premium identity or time', () => {
    const premiumHandler = source.slice(
      source.indexOf('export async function applyVerifiedPremiumSubscriptionEvent('),
      source.indexOf('async function handleShardPurchaseEvent'),
    );
    expect(premiumHandler).toMatch(/normalizePremiumLineageEvent\(event/);
    expect(premiumHandler).toContain('applyPremiumLineageEvent');
    expect(premiumHandler).toContain('aggregatePremiumLineages');
    expect(premiumHandler).not.toContain('event_timestamp_ms || Date.now()');
    expect(source).not.toContain('handlePremiumSubscriptionEventLegacy');
  });

  it('checks receipt and deletion denial before lineage/projection writes and never creates a missing user', () => {
    const premiumHandler = source.slice(
      source.indexOf('export async function applyVerifiedPremiumSubscriptionEvent('),
      source.indexOf('async function handleShardPurchaseEvent'),
    );
    expect(premiumHandler).toContain('db.collection(ACCOUNT_DELETE_TOMBSTONES)');
    expect(premiumHandler).toContain('db.collection(ACCOUNT_DELETE_AUTH_MARKERS)');
    expect(premiumHandler).toContain("db.collection('revenuecat_premium_denials')");
    expect(premiumHandler.indexOf('processedSnap')).toBeLessThan(premiumHandler.indexOf('tx.set(lineageRef'));
    expect(premiumHandler.indexOf('deletionSnap')).toBeLessThan(premiumHandler.indexOf('tx.set(lineageRef'));
    expect(premiumHandler).toContain("reason: 'missing_user_candidate'");
    expect(source).toContain('if (!snap.exists) return null;');
    expect(premiumHandler).toContain('boundPremiumOwnerCandidates(premiumAuthoritativeUserIds(event))');
    expect(premiumHandler).not.toContain('.slice(0, 16)');
  });

  it('keeps the webhook handler as a thin status/body-compatible wrapper', () => {
    const handler = source.slice(
      source.indexOf('async function handlePremiumSubscriptionEvent('),
      source.indexOf('async function handleShardPurchaseEvent'),
    );
    expect(handler).toContain('applyVerifiedPremiumSubscriptionEvent(');
    expect(handler).toContain('res.status(outcome.statusCode).json(outcome.body)');
    expect(handler).toContain("res.status(500).send('Internal error')");
    expect(handler).not.toContain("tx.set(userRef");
  });

  it('retries referral qualification for both applied and duplicate verified Premium outcomes', async () => {
    const db = {} as FirebaseFirestore.Firestore;
    const qualify = jest.fn(async () => undefined);

    await expect(qualifyReferralFromVerifiedPremiumOutcome(
      db,
      { uid: 'stable-paid', active: true, updated: true },
      qualify,
    )).resolves.toBe(true);
    await expect(qualifyReferralFromVerifiedPremiumOutcome(
      db,
      { uid: 'stable-paid', reason: 'duplicate', updated: false },
      qualify,
    )).resolves.toBe(true);
    await expect(qualifyReferralFromVerifiedPremiumOutcome(
      db,
      { reason: 'missing_user_candidate', updated: false },
      qualify,
    )).resolves.toBe(false);

    expect(qualify).toHaveBeenCalledTimes(2);
    expect(qualify).toHaveBeenNthCalledWith(1, db, 'stable-paid');
    expect(qualify).toHaveBeenNthCalledWith(2, db, 'stable-paid');
  });

  it('keeps the original owner on duplicate receipts and qualifies only after the Premium transaction', () => {
    const premiumHandler = source.slice(
      source.indexOf('export async function applyVerifiedPremiumSubscriptionEvent('),
      source.indexOf('async function handleShardPurchaseEvent'),
    );
    expect(premiumHandler).toContain("uid: cleanId(processedSnap.data()?.uid)");
    expect(premiumHandler.indexOf('await qualifyReferralFromVerifiedPremiumOutcome(db, out)'))
      .toBeGreaterThan(premiumHandler.indexOf('const out = await db.runTransaction'));
  });

  it('denies an auth-uid-only pending deletion marker before any user or lineage write', async () => {
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-test' });
    const writes: Array<{ collection: string; id: string; data: any }> = [];
    const ref = (collection: string, id: string) => ({
      collection,
      id,
      get: async () => ({
        exists: collection === 'account_deletion_auth_markers' && id === 'auth-only',
        data: () => collection === 'account_deletion_auth_markers' ? { status: 'pending' } : undefined,
      }),
    });
    const db: any = {
      collection: (collection: string) => ({ doc: (id: string) => ref(collection, id) }),
      runTransaction: async (work: (tx: any) => Promise<unknown>) => work({
        get: (documentRef: any) => documentRef.get(),
        set: (documentRef: any, data: any) => writes.push({ collection: documentRef.collection, id: documentRef.id, data }),
      }),
    };
    const realFieldValue = admin.firestore.FieldValue;
    const fsMock: any = jest.spyOn(admin, 'firestore').mockReturnValue(db);
    fsMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    (admin.firestore as any).FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    const res: any = { statusCode: 0, body: null };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (body: any) => { res.body = body; return res; };
    res.send = (body: any) => { res.body = body; return res; };
    try {
      await handlePremiumSubscriptionEvent({
        id: 'evt-delete', type: 'RENEWAL', app_id: 'app.phraseman', environment: 'PRODUCTION',
        store: 'APP_STORE', original_transaction_id: 'orig-delete', transaction_id: 'tx-delete',
        product_id: 'phraseman_premium_yearly', event_timestamp_ms: 2_000_000,
        expiration_at_ms: 9_000_000, app_user_id: 'auth-only', entitlement_ids: ['premium'],
      } as any, 'RENEWAL', 'phraseman_premium_yearly', res);
      expect(res.body).toMatchObject({ updated: false, reason: 'account_deletion_pending_or_tombstoned' });
      expect(writes).toHaveLength(1);
      expect(writes[0]).toMatchObject({ collection: 'revenuecat_premium_denials' });
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });
});

describe('RevenueCat shard purchase never silently drops paid pearls', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
  const shardHandler = source.slice(
    source.indexOf('async function handleShardPurchaseEvent'),
    source.indexOf('async function handleShardRefundReversedEvent'),
  );

  // зачем: инцидент 2026-08-16 — покупатель оплатил пакет «80 + 12 бонусных»
  // и не получил ничего. Владелец разбирался по письму от самого покупателя.
  // Причина: при неразрешённом владельце ветка отвечала RevenueCat 200 OK,
  // провайдер считал доставку успешной и НИКОГДА не повторял событие. Деньги
  // списаны, жемчужин нет, следов в Firestore нет. Ровно такую же ситуацию
  // премиум-ветка уже обрабатывает правильно — пишет denial-квитанцию.
  it('retries every unresolved owner outcome instead of answering 200 OK', () => {
    // 'missing' и 'ambiguous' одинаково означают «мы пока не знаем, кому
    // начислить» — оба обязаны попасть под retry, иначе оплата теряется.
    expect(shardHandler).not.toContain("retryable: match.status === 'missing'");
    expect(shardHandler).toContain("retryable: true");
  });

  it('leaves a denial receipt so an unresolved paid purchase is visible to the owner', () => {
    expect(shardHandler).toContain("revenuecat_shard_denials");
  });
});

describe('RevenueCat paid voice-minute journal', () => {
  type Store = Record<string, Record<string, any>>;

  function setupVoiceMinuteWebhook() {
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-test' });
    const store: Store = {
      users: { 'stable-voice': { progress: { premium_plan: 'yearly', shards: '777' } } },
      auth_links: {},
      account_identity_owner_map: {},
      account_deletion_tombstones: {},
      account_deletion_auth_markers: {},
      account_deletion_permanent_denials: {},
      voice_minute_events: {},
      voice_minute_wallets: {},
      voice_minute_denials: {},
    };
    const ref = (collection: string, id: string) => ({
      collection,
      id,
      path: `${collection}/${id}`,
      get: async () => ({
        exists: store[collection]?.[id] !== undefined,
        data: () => store[collection]?.[id],
      }),
      set: async (data: any, options?: { merge?: boolean }) => {
        store[collection] = store[collection] ?? {};
        store[collection][id] = options?.merge
          ? { ...(store[collection][id] ?? {}), ...data }
          : { ...data };
      },
    });
    const db: any = {
      collection: (collection: string) => ({ doc: (id: string) => ref(collection, id) }),
      runTransaction: async (work: (tx: any) => Promise<unknown>) => work({
        get: (documentRef: any) => documentRef.get(),
        set: (documentRef: any, data: any, options?: { merge?: boolean }) => documentRef.set(data, options),
      }),
    };
    const fsMock: any = jest.spyOn(admin, 'firestore').mockReturnValue(db);
    fsMock.FieldValue = { serverTimestamp: () => 'server-ts' };
    (admin.firestore as any).FieldValue = fsMock.FieldValue;
    const res: any = { statusCode: 0, body: null };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (body: any) => { res.body = body; return res; };
    res.send = (body: any) => { res.body = body; return res; };
    return { admin, store, res };
  }

  const PURCHASE = {
    id: 'rc-voice-purchase-1',
    type: 'NON_RENEWING_PURCHASE',
    environment: 'PRODUCTION',
    store: 'APP_STORE',
    transaction_id: 'store-voice-tx-1',
    original_transaction_id: 'store-voice-tx-1',
    product_id: 'phraseman_voice_minutes_120',
    event_timestamp_ms: 1_800_000_000_000,
    purchased_at_ms: 1_800_000_000_000,
    app_user_id: 'stable-voice',
  } as any;

  it('writes exactly one immutable grant and wallet projection without touching Premium or shards', async () => {
    const { admin, store, res } = setupVoiceMinuteWebhook();
    try {
      await handleVoiceMinutePackEvent(
        PURCHASE, 'NON_RENEWING_PURCHASE', PURCHASE.product_id, { seconds: 7_200 }, res,
      );
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ ok: true, kind: 'voice_minutes', applied: true, availableSeconds: 7_200 });
      expect(Object.values(store.voice_minute_events)).toHaveLength(1);
      expect(Object.values(store.voice_minute_events)[0]).toMatchObject({
        kind: 'purchase_grant', ownerStableId: 'stable-voice', seconds: 7_200,
      });
      expect(store.voice_minute_wallets['stable-voice']).toMatchObject({
        grantedSeconds: 7_200, refundedSeconds: 0, chargedSeconds: 0,
        reservedSeconds: 0, availableSeconds: 7_200,
      });
      expect(store.users['stable-voice'].progress).toEqual({ premium_plan: 'yearly', shards: '777' });
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it('replays the same purchase receipt without a second grant', async () => {
    const { admin, store, res } = setupVoiceMinuteWebhook();
    try {
      await handleVoiceMinutePackEvent(
        PURCHASE, 'NON_RENEWING_PURCHASE', PURCHASE.product_id, { seconds: 7_200 }, res,
      );
      await handleVoiceMinutePackEvent(
        PURCHASE, 'NON_RENEWING_PURCHASE', PURCHASE.product_id, { seconds: 7_200 }, res,
      );
      expect(Object.values(store.voice_minute_events)).toHaveLength(1);
      expect(store.voice_minute_wallets['stable-voice'].grantedSeconds).toBe(7_200);
      expect(res.body).toMatchObject({ applied: false, reason: 'duplicate', availableSeconds: 7_200 });
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it('matches sandbox owners only against the exact server allowlist', () => {
    expect(sandboxVoiceMinuteOwnerAllowed('stable-voice', ' stable-other,stable-voice\nthird ')).toBe(true);
    expect(sandboxVoiceMinuteOwnerAllowed('stable-voice', 'stable-voice-copy')).toBe(false);
    expect(sandboxVoiceMinuteOwnerAllowed('stable-voice', '')).toBe(false);
  });

  it('authenticates the webhook before the narrow SANDBOX minute exception is evaluated', () => {
    const source = fs.readFileSync(path.join(__dirname, 'revenuecat_shards.ts'), 'utf8');
    const webhook = source.slice(source.indexOf('export const revenueCatShardsWebhook'));
    const authGuard = webhook.indexOf("if (!expectedAuth || !authMatches(req.headers.authorization, expectedAuth))");
    const productLookup = webhook.indexOf('const voiceMinutePack = voiceMinutePackFromProduct(productId);');
    const sandboxGate = webhook.indexOf('if (isSandboxEvent(event) && !voiceMinutePack)');
    const minuteDispatch = webhook.indexOf('if (voiceMinutePack)');

    expect(authGuard).toBeGreaterThan(-1);
    expect(authGuard).toBeLessThan(productLookup);
    expect(productLookup).toBeLessThan(sandboxGate);
    expect(sandboxGate).toBeLessThan(minuteDispatch);
    expect(webhook).toContain("res.status(401).send('Unauthorized')");
  });

  it('credits an allowlisted verified SANDBOX minute purchase exactly once without touching Premium or shards', async () => {
    const { admin, store, res } = setupVoiceMinuteWebhook();
    try {
      const sandboxPurchase = {
        ...PURCHASE,
        id: 'rc-voice-sandbox-1',
        environment: 'SANDBOX',
        transaction_id: 'sandbox-store-voice-tx-1',
        original_transaction_id: 'sandbox-store-voice-tx-1',
      } as any;
      await handleVoiceMinutePackEvent(
        sandboxPurchase, 'NON_RENEWING_PURCHASE', sandboxPurchase.product_id, { seconds: 7_200 }, res, 'stable-voice',
      );
      await handleVoiceMinutePackEvent(
        sandboxPurchase, 'NON_RENEWING_PURCHASE', sandboxPurchase.product_id, { seconds: 7_200 }, res, 'stable-voice',
      );

      expect(res.body).toMatchObject({
        ok: true,
        kind: 'voice_minutes',
        applied: false,
        reason: 'duplicate',
        availableSeconds: 7_200,
      });
      expect(Object.values(store.voice_minute_events)).toHaveLength(1);
      expect(Object.values(store.voice_minute_events)[0]).toMatchObject({
        kind: 'purchase_grant',
        environment: 'SANDBOX',
        ownerStableId: 'stable-voice',
        seconds: 7_200,
      });
      expect(store.voice_minute_wallets['stable-voice']).toMatchObject({
        grantedSeconds: 7_200,
        availableSeconds: 7_200,
      });
      expect(store.users['stable-voice'].progress).toEqual({ premium_plan: 'yearly', shards: '777' });
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it('keeps a verified SANDBOX minute purchase denied when its resolved owner is not allowlisted', async () => {
    const { admin, store, res } = setupVoiceMinuteWebhook();
    try {
      const sandboxPurchase = {
        ...PURCHASE,
        id: 'rc-voice-sandbox-denied-1',
        environment: 'SANDBOX',
        transaction_id: 'sandbox-store-voice-denied-1',
        original_transaction_id: 'sandbox-store-voice-denied-1',
      } as any;
      await handleVoiceMinutePackEvent(
        sandboxPurchase, 'NON_RENEWING_PURCHASE', sandboxPurchase.product_id, { seconds: 7_200 }, res, '',
      );
      expect(res.body).toMatchObject({
        ok: true,
        kind: 'voice_minutes',
        applied: false,
        ignored: 'voice_minutes_sandbox_owner_not_allowlisted',
      });
      expect(Object.values(store.voice_minute_events)).toHaveLength(0);
      expect(Object.values(store.voice_minute_wallets)).toHaveLength(0);
      expect(store.users['stable-voice'].progress).toEqual({ premium_plan: 'yearly', shards: '777' });
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it('rejects an unknown RevenueCat environment without changing the wallet', async () => {
    const { admin, store, res } = setupVoiceMinuteWebhook();
    try {
      await handleVoiceMinutePackEvent(
        { ...PURCHASE, environment: 'UNKNOWN' },
        'NON_RENEWING_PURCHASE', PURCHASE.product_id, { seconds: 7_200 }, res,
      );
      expect(res.body).toMatchObject({ ok: true, ignored: 'voice_minutes_unknown_environment' });
      expect(Object.values(store.voice_minute_events)).toHaveLength(0);
      expect(Object.values(store.voice_minute_wallets)).toHaveLength(0);
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it('appends one refund reversal bound to the original purchase and preserves completed accounting', async () => {
    const { admin, store, res } = setupVoiceMinuteWebhook();
    try {
      await handleVoiceMinutePackEvent(
        PURCHASE, 'NON_RENEWING_PURCHASE', PURCHASE.product_id, { seconds: 7_200 }, res,
      );
      const refund = {
        ...PURCHASE,
        id: 'rc-voice-refund-1',
        type: 'REFUND',
        event_timestamp_ms: 1_800_000_100_000,
      } as any;
      await handleVoiceMinutePackEvent(refund, 'REFUND', refund.product_id, { seconds: 7_200 }, res);
      await handleVoiceMinutePackEvent(refund, 'REFUND', refund.product_id, { seconds: 7_200 }, res);

      expect(Object.values(store.voice_minute_events)).toHaveLength(2);
      expect(Object.values(store.voice_minute_events).find((event: any) => event.kind === 'purchase_refund'))
        .toMatchObject({ ownerStableId: 'stable-voice', seconds: 7_200 });
      expect(store.voice_minute_wallets['stable-voice']).toMatchObject({
        grantedSeconds: 7_200, refundedSeconds: 7_200, availableSeconds: 0,
      });
      expect(store.users['stable-voice'].progress).toEqual({ premium_plan: 'yearly', shards: '777' });
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });
});

describe('RevenueCat shard refund durable identity', () => {
  it('rejects missing immutable event identity/time instead of using a Date.now idempotency key', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
    const refund = source.slice(source.indexOf('async function handleShardRefundEvent'), source.indexOf('export function transferTargetIds'));
    expect(refund).toContain('const eventId = cleanId(event.id);');
    expect(refund).toContain('const refundEventTimeMs = eventMs(event.event_timestamp_ms);');
    expect(refund).toContain('if (!originalTxId || !eventId || refundEventTimeMs === null)');
    expect(refund).not.toContain('Date.now()}`');
  });
});

// ── TRANSFER: anonymous → stable_id (scenario #13) ────────────────────────────
describe('RevenueCat webhook TRANSFER (anonymous → stable id)', () => {
  it('prefers stable recipients and lists donors', () => {
    const event = {
      type: 'TRANSFER',
      transferred_to: ['$RCAnonymousID:zzz', 'stable-real'],
      transferred_from: ['$RCAnonymousID:aaa'],
    } as any;
    expect(transferTargetIds(event)).toEqual(['stable-real']); // anonymous dropped
    expect(transferSourceIds(event)).toEqual(['$RCAnonymousID:aaa']);
  });

  function makeRcDbStub(initialUsers: Record<string, any> = {}) {
    const store: Record<string, Record<string, any>> = {
      users: { ...initialUsers },
      revenuecat_premium_events: {},
      revenuecat_premium_denials: {},
      revenuecat_premium_lineages: {},
      account_deletion_tombstones: {},
      account_deletion_auth_markers: {},
      account_deletion_permanent_denials: {},
      auth_links: {},
    };
    const snap = (coll: string, id: string, data: any) => ({ id, ref: docApi(coll, id), exists: !!data, data: () => data });
    const docApi = (coll: string, id: string) => ({
      collectionName: coll,
      collection: (child: string) => ({
        doc: (childId: string) => docApi(`${coll}/${id}/${child}`, childId),
      }),
      id,
      path: `${coll}/${id}`,
      get: async () => snap(coll, id, store[coll]?.[id]),
      set: async (data: any) => {
        store[coll] = store[coll] ?? {};
        const prev = store[coll][id] ?? {};
        const mergedProgress = data.progress ? { ...(prev.progress ?? {}), ...data.progress } : prev.progress;
        store[coll][id] = { ...prev, ...data, ...(mergedProgress ? { progress: mergedProgress } : {}) };
      },
      // зачем: заглушка обязана повторять НАСТОЯЩИЙ Firestore update:
      // (а) вложенный объект (`{ progress: {...} }`) ЗАМЕНЯЕТ поле целиком;
      // (б) путь через точку (`'progress.plan'`) правит один ключ.
      // Прежняя версия наоборот МЕРЖИЛА progress — из-за этого уничтожение
      // прогресса донора при TRANSFER_OUT (инцидент 27.08.2026) было
      // принципиально невидимо для тестов: тест ниже «проверял» деактивацию
      // донора и был зелёным, пока в проде у платящего стирался весь прогресс.
      update: async (data: any) => {
        if (store[coll]?.[id] === undefined) throw new Error('not-found');
        const next = { ...store[coll][id] };
        for (const [rawKey, value] of Object.entries(data)) {
          if (!rawKey.includes('.')) {
            next[rawKey] = value; // вложенный объект заменяет поле целиком
            continue;
          }
          const segments = rawKey.split('.');
          const leaf = segments.pop() as string;
          let cursor: Record<string, any> = next;
          for (const segment of segments) {
            cursor[segment] = { ...(cursor[segment] ?? {}) };
            cursor = cursor[segment];
          }
          cursor[leaf] = value;
        }
        store[coll][id] = next;
      },
    });
    const queryApi = (coll: string, field: string, op: string, value: unknown, max = Infinity): any => ({
      limit: (nextMax: number) => queryApi(coll, field, op, value, nextMax),
      get: async () => ({
        docs: Object.entries(store[coll] ?? {})
          .filter(([, data]) => op === 'in'
            ? Array.isArray(value) && value.includes(data[field])
            : data[field] === value)
          .slice(0, max)
          .map(([id, data]) => snap(coll, id, data)),
      }),
    });
    const db: any = {
      collection: (coll: string) => ({
        doc: (id: string) => docApi(coll, id),
        where: (field: string, op: string, value: unknown) => queryApi(coll, field, op, value),
      }),
      runTransaction: async (fn: (tx: any) => Promise<unknown>) => {
        const tx = {
          get: async (ref: any) => ref.get(),
          set: async (ref: any, data: any) => ref.set(data),
          update: async (ref: any, data: any) => ref.update(data),
          delete: async (ref: any) => { delete store[ref.collectionName][ref.id]; },
        };
        return fn(tx);
      },
    };
    return { db, store };
  }

  function makeRes() {
    const r: any = { statusCode: 0, body: null };
    r.status = (c: number) => { r.statusCode = c; return r; };
    r.json = (b: any) => { r.body = b; return r; };
    r.send = (b: any) => { r.body = b; return r; };
    return r;
  }

  it('moves active premium from the anonymous donor to the stable recipient and deactivates the donor', async () => {
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-test' });
    const { db, store } = makeRcDbStub({
      // У донора намеренно есть и учебный прогресс: премиум обязан уехать,
      // а XP/уровень/стрик — остаться (инцидент 27.08.2026, см. заглушку update).
      '$RCAnonymousID:aaa': {
        progress: {
          premium_plan: 'yearly',
          premium_expiry: '0',
          premium_rc_expiry_ms: String(Date.now() + 1e9),
          user_total_xp: '48210',
          user_level: '12',
          streak_days: '37',
        },
      },
      'stable-real': { progress: { user_total_xp: '4000' } },
    });
    const realFieldValue = admin.firestore.FieldValue;
    const fsMock: any = jest.spyOn(admin, 'firestore').mockReturnValue(db);
    fsMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    (admin.firestore as any).FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    try {
      const event = {
        id: 'evt_transfer_1',
        type: 'TRANSFER',
        event_timestamp_ms: 2_000_000,
        transferred_from: ['$RCAnonymousID:aaa'],
        transferred_to: ['stable-real'],
      } as any;
      const res = makeRes();
      await __revenueCatWebhookTestHooks.handleTransferEvent(event, 'TRANSFER', res);
      expect(res.body).toMatchObject({ ok: true, kind: 'transfer', moved: true, recipientId: 'stable-real' });
      expect(store.users['stable-real'].progress.premium_plan).toBe('yearly');
      expect(store.users['$RCAnonymousID:aaa'].progress.premium_plan).toBe(''); // donor deactivated
      // Премиум сняли — но учебный прогресс донора обязан уцелеть.
      expect(store.users['$RCAnonymousID:aaa'].progress.user_total_xp).toBe('48210');
      expect(store.users['$RCAnonymousID:aaa'].progress.user_level).toBe('12');
      expect(store.users['$RCAnonymousID:aaa'].progress.streak_days).toBe('37');
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it('is idempotent — a re-delivered TRANSFER does not move twice', async () => {
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-test' });
    const { db, store } = makeRcDbStub({
      '$RCAnonymousID:bbb': { progress: { premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(Date.now() + 1e9) } },
      'stable-2': { progress: { user_total_xp: '1' } },
    });
    store.revenuecat_premium_events['evt_dup'] = { eventId: 'evt_dup' }; // already processed
    const realFieldValue = admin.firestore.FieldValue;
    const fsMock: any = jest.spyOn(admin, 'firestore').mockReturnValue(db);
    fsMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    (admin.firestore as any).FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    try {
      const event = { id: 'evt_dup', type: 'TRANSFER', event_timestamp_ms: 2_000_001, transferred_from: ['$RCAnonymousID:bbb'], transferred_to: ['stable-2'] } as any;
      const res = makeRes();
      await __revenueCatWebhookTestHooks.handleTransferEvent(event, 'TRANSFER', res);
      expect(res.body).toMatchObject({ ok: true, moved: false, reason: 'duplicate' });
      expect(store.users['stable-2'].progress.premium_plan).toBeUndefined(); // untouched
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });
});

describe('Оплаченные жемчужины при неизвестном владельце — поведение, а не текст', () => {
  // зачем этот блок отдельно от проверок исходника выше (2026-08-16): те
  // тесты читают ТЕКСТ функции и остаются зелёными, даже если логика
  // сломана. Для оплаченной покупки этого мало — инцидент как раз в том,
  // что деньги списаны, а начисления нет и следов нет.

  function setup() {
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-test' });
    const writes: Array<{ collection: string; id: string; data: any }> = [];
    const ref = (collection: string, id: string) => ({
      collection,
      id,
      // Никого не находим: ни пользователя, ни маркеров удаления —
      // это и есть «владелец не разрешён».
      get: async () => ({ exists: false, data: () => undefined }),
    });
    const db: any = {
      collection: (collection: string) => ({
        doc: (id: string) => ref(collection, id),
        where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
      }),
      runTransaction: async (work: (tx: any) => Promise<unknown>) => work({
        get: (documentRef: any) => documentRef.get(),
        set: (documentRef: any, data: any) => writes.push({
          collection: documentRef.collection, id: documentRef.id, data,
        }),
      }),
      getAll: async () => [],
    };
    const realFieldValue = admin.firestore.FieldValue;
    const fsMock: any = jest.spyOn(admin, 'firestore').mockReturnValue(db);
    fsMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    (admin.firestore as any).FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    const res: any = { statusCode: 0, body: null };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (body: any) => { res.body = body; return res; };
    res.send = (body: any) => { res.body = body; return res; };
    return { admin, writes, res };
  }

  const EVENT = {
    id: 'evt-shards-unresolved',
    type: 'NON_RENEWING_PURCHASE',
    app_id: 'app.phraseman',
    environment: 'PRODUCTION',
    store: 'APP_STORE',
    transaction_id: 'tx-unresolved',
    original_transaction_id: 'tx-unresolved',
    product_id: 'shards_pack_80',
    event_timestamp_ms: 3_000_000,
    purchased_at_ms: 3_000_000,
    app_user_id: '$RCAnonymousID:nobody',
  } as any;

  const PACK = { packId: 'pack_80', shards: 80 };

  it('отвечает 503, чтобы провайдер повторил, а не считал доставку успешной', async () => {
    // зачем именно 503: на 200 OK RevenueCat закрывает событие НАВСЕГДА.
    // Оплата остаётся у нас, жемчужины — нигде.
    const { admin, res } = setup();
    try {
      await __revenueCatWebhookTestHooks.handleShardPurchaseEvent(
        EVENT, 'NON_RENEWING_PURCHASE', 'shards_pack_80', PACK, res,
      );
      expect(res.statusCode).toBe(503);
      expect(res.body).toMatchObject({ ok: false, granted: false });
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it('оставляет квитанцию, чтобы потерянная оплата была видна владельцу', async () => {
    // зачем: без записи инцидент виден только из письма покупателя —
    // ровно так владелец о нём и узнал.
    const { admin, writes, res } = setup();
    try {
      await __revenueCatWebhookTestHooks.handleShardPurchaseEvent(
        EVENT, 'NON_RENEWING_PURCHASE', 'shards_pack_80', PACK, res,
      );
      const denial = writes.find((w) => w.collection === 'revenuecat_shard_denials');
      expect(denial).toBeDefined();
      expect(denial!.data).toMatchObject({ shards: 80, packId: 'pack_80' });
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it('никому не начисляет жемчужины, пока владелец не известен', async () => {
    // зачем: «начислить хоть кому-нибудь» хуже потери — это выдача денег
    // постороннему человеку.
    const { admin, writes, res } = setup();
    try {
      await __revenueCatWebhookTestHooks.handleShardPurchaseEvent(
        EVENT, 'NON_RENEWING_PURCHASE', 'shards_pack_80', PACK, res,
      );
      expect(writes.some((w) => w.collection === 'external_economy_events')).toBe(false);
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });
});
