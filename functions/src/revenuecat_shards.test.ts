const mockRevenueCatSecretValue = jest.fn(() => 'safe-test-revenuecat-secret');

jest.mock('firebase-functions/params', () => ({
  ...jest.requireActual('firebase-functions/params'),
  defineSecret: jest.fn((name: string) => ({
    name,
    value: name === 'REVENUECAT_WEBHOOK_AUTH'
      ? mockRevenueCatSecretValue
      : () => `safe-test-${name}`,
  })),
}));

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import type { PremiumReducerProvenance } from './revenuecat_shards';
const {
  applyPremiumLineageEvent,
  canonicalPremiumLineageHash,
  normalizePremiumLineageEvent,
} = require('./revenuecat_premium_lineage') as typeof import('./revenuecat_premium_lineage');

const {
  __revenueCatWebhookTestHooks,
  applyVerifiedPremiumSubscriptionEvent,
  revenueCatShardsWebhook,
} = require('./revenuecat_shards') as typeof import('./revenuecat_shards');

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
  qualifyReferralFromVerifiedPremiumOutcome,
  retiredProductFamily,
} = __revenueCatWebhookTestHooks;

function makeWebhookResponse() {
  const response: any = { statusCode: 0, body: null };
  response.status = (code: number) => { response.statusCode = code; return response; };
  response.send = (body: unknown) => { response.body = body; return response; };
  response.json = (body: unknown) => { response.body = body; return response; };
  return response;
}

async function invokeCheckedRevenueCatWebhook(
  event: Record<string, unknown>,
  authorization?: string | null,
) {
  const authorizationHeader = arguments.length < 2
    ? 'Bearer safe-test-revenuecat-secret'
    : authorization;
  const response = makeWebhookResponse();
  await (revenueCatShardsWebhook as any)({
    method: 'POST',
    headers: {
      authorization: authorizationHeader,
    },
    body: { event, provenance: { kind: 'authenticated_webhook', forged: true } },
  }, response);
  return response;
}

function productionTypeScriptSources(directory: string): Array<{ path: string; source: string }> {
  const out: Array<{ path: string; source: string }> = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      out.push(...productionTypeScriptSources(absolute));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      out.push({ path: absolute, source: fs.readFileSync(absolute, 'utf8') });
    }
  }
  return out;
}

if (false) {
  // @ts-expect-error reducer requires opaque provenance
  void applyVerifiedPremiumSubscriptionEvent({}, 'RENEWAL', 'phraseman_premium_yearly');
  const forged = { kind: 'authenticated_webhook' } as const;
  // @ts-expect-error ordinary objects cannot construct authenticated webhook provenance
  const invalidProvenance: PremiumReducerProvenance = forged;
  void invalidProvenance;
}

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

  // зачем: D136 — минуты MAX больше не продаются; товар распознаётся только как снятый.
  it('classifies MAX voice-minute products as retired and never as premium', () => {
    for (const productId of [
      'phraseman_voice_minutes_30',
      'phraseman_voice_minutes_120',
      'phraseman_voice_minutes_300',
    ]) {
      expect(retiredProductFamily(productId)).toBe('max_voice_minutes');
      expect(looksLikePremiumSubscription({ product_id: productId, entitlement_ids: ['premium', 'max'] }))
        .toBe(false);
    }
    for (const productId of [
      'phraseman_voice_minutes_60',
      'phraseman_voice_minutes_120:base',
      'phraseman_voice_minutes_300_fake',
    ]) {
      expect(retiredProductFamily(productId)).toBeNull();
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

  it('authenticates the actual exported HTTP boundary and exposes no provenance-minting hook', async () => {
    mockRevenueCatSecretValue.mockClear();
    const productionExports = Object.keys(require('./revenuecat_shards'));
    expect(productionExports).not.toEqual(expect.arrayContaining([
      'authenticatedWebhookProvenance',
      'dispatchAuthenticatedRevenueCatWebhook',
      'handlePremiumSubscriptionEvent',
      'applyAuthenticatedPremiumSubscriptionEvent',
    ]));
    const hookNames = Object.keys(__revenueCatWebhookTestHooks);
    expect(hookNames).not.toEqual(expect.arrayContaining([
      'dispatchAuthenticatedRevenueCatWebhook',
      'handlePremiumSubscriptionEvent',
      'applyAuthenticatedPremiumSubscriptionEvent',
    ]));
    const provenanceConstructorCalls = source.match(/authenticatedWebhookProvenance\(\)/g) ?? [];
    expect(provenanceConstructorCalls).toHaveLength(2);
    const productionCallers = productionTypeScriptSources(path.join(process.cwd(), 'src'))
      .map((file) => ({
        path: path.relative(process.cwd(), file.path),
        calls: file.source.match(/authenticatedWebhookProvenance\(\)/g)?.length ?? 0,
      }))
      .filter(({ calls }) => calls > 0);
    expect(productionCallers).toEqual([{ path: path.join('src', 'revenuecat_shards.ts'), calls: 2 }]);
    const hookSurface = source.slice(source.indexOf('export const __revenueCatWebhookTestHooks'));
    expect(hookSurface).not.toContain('authenticatedWebhookProvenance()');

    for (const authorization of [undefined, 'Bearer wrong']) {
      const response = await invokeCheckedRevenueCatWebhook({
        id: 'forged', type: 'TRANSFER', transferred_from: ['donor'], transferred_to: ['recipient'],
      }, authorization);
      expect(response.statusCode).toBe(401);
    }
    expect(mockRevenueCatSecretValue).toHaveBeenCalledTimes(2);

    const response = await invokeCheckedRevenueCatWebhook({
      id: 'valid-transfer', type: 'TRANSFER', transferred_from: ['donor'], transferred_to: ['recipient'],
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ ok: true, kind: 'transfer', accepted: true, auditOnly: true });
  });

  it('derives original evidence only from authenticated production original-purchase facts', () => {
    const derive = (__revenueCatWebhookTestHooks as any).deriveAuthenticatedOriginalEvidence;
    expect(typeof derive).toBe('function');
    expect(derive({
      type: 'INITIAL_PURCHASE',
      environment: 'PRODUCTION',
      product_id: 'phraseman_premium_yearly',
      original_app_user_id: 'raw-L',
      app_user_id: 'B',
      aliases: ['B'],
    })).toEqual({ rawOriginalOwnerUid: 'raw-L', evidenceKind: 'authenticated_original_purchase_webhook_v1' });
    for (const event of [
      { type: 'INITIAL_PURCHASE', environment: 'SANDBOX', product_id: 'phraseman_premium_yearly', original_app_user_id: 'raw-L' },
      { type: 'RENEWAL', environment: 'PRODUCTION', product_id: 'phraseman_premium_yearly', original_app_user_id: 'raw-L' },
      { type: 'INITIAL_PURCHASE', environment: 'PRODUCTION', product_id: 'unknown', original_app_user_id: 'raw-L' },
      { type: 'INITIAL_PURCHASE', environment: 'PRODUCTION', product_id: 'phraseman_premium_yearly', original_app_user_id: '$RCAnonymousID:x' },
    ]) expect(derive(event)).toBeNull();
  });

  it('uses canonical lineage reduction and never invents durable premium identity or time', () => {
    const premiumHandler = source.slice(
      source.indexOf('export async function applyVerifiedPremiumSubscriptionEvent('),
      source.indexOf('// TRANSFER never establishes'),
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
      source.indexOf('// TRANSFER never establishes'),
    );
    expect(premiumHandler).toContain('db.collection(ACCOUNT_DELETE_TOMBSTONES)');
    expect(premiumHandler).toContain('db.collection(ACCOUNT_DELETE_AUTH_MARKERS)');
    expect(premiumHandler).toContain("db.collection('revenuecat_premium_denials')");
    expect(premiumHandler.indexOf('processedSnap')).toBeLessThan(premiumHandler.indexOf('tx.set(lineageRef'));
    expect(premiumHandler.indexOf('deletionSnap')).toBeLessThan(premiumHandler.indexOf('tx.set(lineageRef'));
    expect(premiumHandler).toContain("return zeroTail('lineage_owner_unproven')");
    expect(source).toContain('if (!snap.exists) return null;');
    expect(premiumHandler).toContain('boundPremiumOwnerCandidates(premiumAuthoritativeUserIds(event))');
    expect(premiumHandler).not.toContain('.slice(0, 16)');
  });

  it('keeps the webhook handler as a thin status/body-compatible wrapper', () => {
    const handler = source.slice(
      source.indexOf('async function handlePremiumSubscriptionEvent('),
      source.indexOf('// TRANSFER never establishes'),
    );
    expect(handler).toContain('applyVerifiedPremiumSubscriptionEvent(');
    expect(handler).toContain('res.status(outcome.statusCode).json(outcome.body)');
    expect(handler).toContain("res.status(500).send('Internal error')");
    expect(handler).not.toContain("tx.set(userRef");
  });

  it('qualifies referrals only from an explicit transaction tail capability', async () => {
    const db = {} as FirebaseFirestore.Firestore;
    const qualify = jest.fn(async () => undefined);

    await expect(qualifyReferralFromVerifiedPremiumOutcome(
      db,
      { referralOwnerUid: 'stable-paid' },
      qualify,
    )).resolves.toBe(true);
    await expect(qualifyReferralFromVerifiedPremiumOutcome(
      db,
      { referralOwnerUid: null },
      qualify,
    )).resolves.toBe(false);

    expect(qualify).toHaveBeenCalledTimes(1);
    expect(qualify).toHaveBeenNthCalledWith(1, db, 'stable-paid');
  });

  it('keeps the original owner on duplicate receipts and qualifies only after the Premium transaction', () => {
    const premiumHandler = source.slice(
      source.indexOf('export async function applyVerifiedPremiumSubscriptionEvent('),
      source.indexOf('// TRANSFER never establishes'),
    );
    expect(premiumHandler).toContain('authorityTargetOwnerUid: authority.targetOwnerUid');
    expect(premiumHandler).toContain('storedReferralEligible = receiptData.referralEligible === true');
    expect(premiumHandler.indexOf('await qualifyReferralFromVerifiedPremiumOutcome(db, tails)'))
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
    try {
      const response = await invokeCheckedRevenueCatWebhook({
        id: 'evt-delete', type: 'RENEWAL', app_id: 'app.phraseman', environment: 'PRODUCTION',
        store: 'APP_STORE', original_transaction_id: 'orig-delete', transaction_id: 'tx-delete',
        product_id: 'phraseman_premium_yearly', event_timestamp_ms: 2_000_000,
        expiration_at_ms: 9_000_000, app_user_id: 'auth-only', entitlement_ids: ['premium'],
      });
      expect(response.body).toMatchObject({ updated: false, reason: 'account_deletion_pending_or_tombstoned' });
      expect(writes).toHaveLength(1);
      expect(writes[0]).toMatchObject({ collection: 'revenuecat_premium_denials' });
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });
});

function makeAuthorityDb(initial: Record<string, Record<string, any>>) {
  const store: Record<string, Record<string, any>> = {
    users: {},
    auth_links: {},
    account_identity_owner_map: {},
    account_deletion_tombstones: {},
    account_deletion_auth_markers: {},
    account_deletion_permanent_denials: {},
    revenuecat_premium_events: {},
    revenuecat_premium_denials: {},
    revenuecat_premium_lineage_owners: {},
    revenuecat_premium_lineages: {},
    referral_attributions: {},
    public_profiles: {},
    ...initial,
  };
  const snapshot = (collection: string, id: string) => ({
    id,
    ref: document(collection, id),
    exists: store[collection]?.[id] !== undefined,
    data: () => store[collection]?.[id],
  });
  const write = (collection: string, id: string, data: any, merge = false) => {
    store[collection] ??= {};
    const previous = store[collection][id] ?? {};
    store[collection][id] = merge
      ? {
          ...previous,
          ...data,
          ...(data.progress ? { progress: { ...(previous.progress ?? {}), ...data.progress } } : {}),
        }
      : { ...data };
  };
  const document = (collection: string, id: string): any => ({
    collectionName: collection,
    id,
    path: `${collection}/${id}`,
    collection: (child: string) => ({
      doc: (childId: string) => document(`${collection}/${id}/${child}`, childId),
    }),
    get: async () => snapshot(collection, id),
    set: async (data: any, options?: { merge?: boolean }) => write(collection, id, data, options?.merge === true),
    update: async (data: any) => {
      if (store[collection]?.[id] === undefined) {
        const error = new Error('not-found') as Error & { code?: string };
        error.code = 'not-found';
        throw error;
      }
      write(collection, id, data, true);
    },
  });
  const query = (collection: string, field: string, value: unknown, limit = Infinity): any => ({
    limit: (nextLimit: number) => query(collection, field, value, nextLimit),
    get: async () => ({
      docs: Object.entries(store[collection] ?? {})
        .filter(([, data]) => data[field] === value)
        .slice(0, limit)
        .map(([id]) => snapshot(collection, id)),
    }),
  });
  const db: any = {
    collection: (collection: string) => ({
      doc: (id: string) => document(collection, id),
      where: (field: string, _operator: string, value: unknown) => query(collection, field, value),
    }),
    runTransaction: async (work: (transaction: any) => Promise<unknown>) => work({
      get: (reference: any) => reference.get(),
      set: (reference: any, data: any, options?: { merge?: boolean }) => write(
        reference.collectionName,
        reference.id,
        data,
        options?.merge === true,
      ),
      create: (reference: any, data: any) => {
        if (store[reference.collectionName]?.[reference.id] !== undefined) throw new Error('already-exists');
        write(reference.collectionName, reference.id, data, false);
      },
    }),
  };
  return { db, store };
}

function originalPurchaseEvent(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const now = Date.now();
  return {
    id: 'evt-original-owner',
    type: 'INITIAL_PURCHASE',
    app_id: 'app.phraseman',
    environment: 'PRODUCTION',
    store: 'APP_STORE',
    original_transaction_id: 'original-transaction-a',
    transaction_id: 'transaction-a',
    product_id: 'phraseman_premium_yearly',
    event_timestamp_ms: now,
    purchased_at_ms: now,
    expiration_at_ms: now + 30 * 86_400_000,
    period_type: 'NORMAL',
    app_user_id: 'B',
    original_app_user_id: 'raw-L',
    aliases: ['B'],
    entitlement_ids: ['premium'],
    ...overrides,
  };
}

describe('RevenueCat immutable original-owner transaction', () => {
  it('stores raw L/canonical A and grants only A when app_user_id and aliases point at B', async () => {
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-test' });
    const { db, store } = makeAuthorityDb({
      users: { A: { progress: { marker: 'owner' } }, B: { progress: { marker: 'requester' } } },
      account_identity_owner_map: { 'raw-L': { canonicalStableId: 'A' } },
    });
    const realFieldValue = admin.firestore.FieldValue;
    const firestoreMock: any = jest.spyOn(admin, 'firestore').mockReturnValue(db);
    firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    (admin.firestore as any).FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    try {
      const event = originalPurchaseEvent();
      const outcome = await invokeCheckedRevenueCatWebhook(event);
      expect(outcome).toMatchObject({ statusCode: 200, body: { ok: true, updated: true } });
      expect(Object.values(store.revenuecat_premium_lineage_owners)).toContainEqual(expect.objectContaining({
        originalOwnerUid: 'raw-L',
        canonicalOwnerUidAtCreation: 'A',
        status: 'verified_original',
      }));
      expect(Object.values(store.revenuecat_premium_lineages)).toContainEqual(expect.objectContaining({ ownerUid: 'A' }));
      expect(store.users.A.progress.premium_plan).toBe('yearly');
      expect(store.users.B.progress).toEqual({ marker: 'requester' });
      expect(store.auth_links['raw-L']).toBeUndefined();
      expect(store.account_identity_owner_map['raw-L']).toEqual({ canonicalStableId: 'A' });
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it.each([
    ['missing legacy history', 'INITIAL_PURCHASE', false, false],
    ['ambiguous legacy history', 'NON_RENEWING_PURCHASE', true, false],
    ['missing verified owner', 'INITIAL_PURCHASE', false, true],
  ] as const)(
    'keeps unresolved original purchase zero-effect on first delivery and replay: %s',
    async (_label, eventType, ambiguous, withVerifiedOwner) => {
      const admin = require('firebase-admin');
      const referral = require('./referral');
      const profile = require('./public_profile_plus_sync');
      if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-test' });
      const event = originalPurchaseEvent({
        id: `evt-unresolved-${eventType.toLowerCase()}-${ambiguous}-${withVerifiedOwner}`,
        type: eventType,
        product_id: eventType === 'NON_RENEWING_PURCHASE'
          ? 'phraseman_premium_lifetime_v1'
          : 'phraseman_premium_yearly',
      });
      const normalized = normalizePremiumLineageEvent(event);
      if (normalized.status !== 'ok') throw new Error('test event must normalize');
      const lineageHash = normalized.event.lineageHash;
      const users = ambiguous
        ? { A: { progress: { marker: 'legacy-owner' } }, B: { progress: { marker: 'other-root' } } }
        : { A: { progress: { marker: 'legacy-owner' } } };
      const ownerRecord = withVerifiedOwner ? {
        [lineageHash]: {
          schemaVersion: 1,
          lineageHash,
          originalOwnerUid: 'previous-raw-owner',
          canonicalOwnerUidAtCreation: 'A',
          status: 'verified_original',
          evidenceKind: 'authenticated_original_purchase_webhook_v1',
          evidenceEventIdHash: 'previous-event-hash',
          receiptFingerprint: 'previous-receipt-fingerprint',
          createdAtMs: 1,
        },
      } : {};
      const { db, store } = makeAuthorityDb({
        users,
        auth_links: ambiguous ? { 'raw-L': { stable_id: 'A' } } : {},
        account_identity_owner_map: ambiguous ? { 'raw-L': { canonicalStableId: 'B' } } : {},
        revenuecat_premium_lineages: {
          legacy: { ownerUid: 'A', ...applyPremiumLineageEvent(null, normalized.event).state },
        },
        revenuecat_premium_lineage_owners: ownerRecord,
      });
      const before = JSON.stringify(store);
      const realFieldValue = admin.firestore.FieldValue;
      const firestoreMock: any = jest.spyOn(admin, 'firestore').mockReturnValue(db);
      firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
      (admin.firestore as any).FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
      const referralSpy = jest.spyOn(referral, 'markRefereeQualified').mockResolvedValue(undefined);
      const profileSpy = jest.spyOn(profile, 'syncPublicProfilePlusAfterCommit').mockResolvedValue('updated');
      try {
        const first = await invokeCheckedRevenueCatWebhook(event);
        expect(first).toMatchObject({
          statusCode: 200,
          body: { ok: true, kind: 'premium', updated: false, reason: 'lineage_owner_unproven' },
        });
        expect(JSON.stringify(store)).toBe(before);
        const replay = await invokeCheckedRevenueCatWebhook(event);
        expect(replay).toMatchObject({
          statusCode: 200,
          body: { ok: true, kind: 'premium', updated: false, reason: 'lineage_owner_unproven' },
        });
        expect(JSON.stringify(store)).toBe(before);
        expect(referralSpy).not.toHaveBeenCalled();
        expect(profileSpy).not.toHaveBeenCalled();
      } finally {
        referralSpy.mockRestore();
        profileSpy.mockRestore();
        (admin.firestore as jest.Mock).mockRestore();
      }
    },
  );

  it.each([
    ['S1 target differs from V/H', 'INITIAL_PURCHASE', false, true, false, 'B', 'authenticated_webhook', null],
    ['S1 provenance differs', 'NON_RENEWING_PURCHASE', true, false, false, 'A', 'synthetic_reconcile', null],
    ['S1 requester differs', 'INITIAL_PURCHASE', false, false, false, 'A', 'authenticated_webhook', 'B'],
    ['pre-S1 target differs', 'NON_RENEWING_PURCHASE', true, false, true, 'B', null, null],
  ] as const)(
    'classifies incompatible receipt before unresolved original transaction: %s',
    async (
      _label,
      eventType,
      ambiguous,
      withVerifiedOwner,
      legacyReceipt,
      receiptTarget,
      receiptProvenance,
      receiptRequester,
    ) => {
      const admin = require('firebase-admin');
      const referral = require('./referral');
      const profile = require('./public_profile_plus_sync');
      if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-test' });
      const event = originalPurchaseEvent({
        id: `evt-receipt-order-${eventType.toLowerCase()}-${ambiguous}-${receiptTarget}-${receiptProvenance}`,
        type: eventType,
        product_id: eventType === 'NON_RENEWING_PURCHASE'
          ? 'phraseman_premium_lifetime_v1'
          : 'phraseman_premium_yearly',
      });
      const normalized = normalizePremiumLineageEvent(event);
      if (normalized.status !== 'ok') throw new Error('test event must normalize');
      const lineageHash = normalized.event.lineageHash;
      const receiptId = 'evt_' + createHash('sha256').update(String(event.id)).digest('hex');
      const receipt = legacyReceipt ? {
        uid: receiptTarget,
        eventId: normalized.event.eventId,
        fingerprint: normalized.event.fingerprint,
      } : {
        uid: receiptTarget,
        eventId: normalized.event.eventId,
        fingerprint: normalized.event.fingerprint,
        authoritySchemaVersion: 1,
        authorityTargetOwnerUid: receiptTarget,
        authorityProvenanceKind: receiptProvenance,
        authorityRequesterCanonicalUid: receiptRequester,
        authorityEvidenceKind: 'none',
        authorityRawOriginalOwnerUid: null,
        authorityEvidenceCanonicalOwnerUid: null,
        referralEligible: true,
      };
      const ownerRecord = withVerifiedOwner ? {
        [lineageHash]: {
          schemaVersion: 1,
          lineageHash,
          originalOwnerUid: 'previous-raw-owner',
          canonicalOwnerUidAtCreation: 'A',
          status: 'verified_original',
          evidenceKind: 'authenticated_original_purchase_webhook_v1',
          evidenceEventIdHash: 'previous-event-hash',
          receiptFingerprint: 'previous-receipt-fingerprint',
          createdAtMs: 1,
        },
      } : {};
      const { db, store } = makeAuthorityDb({
        users: {
          A: { progress: { marker: 'legacy-owner' } },
          B: { progress: { marker: 'other-authority' } },
        },
        auth_links: ambiguous ? { 'raw-L': { stable_id: 'A' } } : {},
        account_identity_owner_map: ambiguous ? { 'raw-L': { canonicalStableId: 'B' } } : {},
        revenuecat_premium_lineages: {
          legacy: { ownerUid: 'A', ...applyPremiumLineageEvent(null, normalized.event).state },
        },
        revenuecat_premium_lineage_owners: ownerRecord,
        revenuecat_premium_events: { [receiptId]: receipt },
      });
      const before = JSON.stringify(store);
      const realFieldValue = admin.firestore.FieldValue;
      const firestoreMock: any = jest.spyOn(admin, 'firestore').mockReturnValue(db);
      firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
      (admin.firestore as any).FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
      const referralSpy = jest.spyOn(referral, 'markRefereeQualified').mockResolvedValue(undefined);
      const profileSpy = jest.spyOn(profile, 'syncPublicProfilePlusAfterCommit').mockResolvedValue('updated');
      try {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const outcome = await invokeCheckedRevenueCatWebhook(event);
          expect(outcome).toMatchObject({
            statusCode: 200,
            body: { ok: true, kind: 'premium', updated: false, reason: 'receipt_evidence_conflict' },
          });
          expect(JSON.stringify(store)).toBe(before);
        }
        expect(referralSpy).not.toHaveBeenCalled();
        expect(profileSpy).not.toHaveBeenCalled();
      } finally {
        referralSpy.mockRestore();
        profileSpy.mockRestore();
        (admin.firestore as jest.Mock).mockRestore();
      }
    },
  );

  it('synthetic original-shaped payload cannot create owner, lineage, receipt, or requester projection', async () => {
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-test' });
    const { db, store } = makeAuthorityDb({ users: { B: { progress: { marker: 'unchanged' } } } });
    const realFieldValue = admin.firestore.FieldValue;
    const firestoreMock: any = jest.spyOn(admin, 'firestore').mockReturnValue(db);
    firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    (admin.firestore as any).FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    try {
      const event = originalPurchaseEvent({ app_user_id: 'B', original_app_user_id: 'B' });
      const outcome = await applyVerifiedPremiumSubscriptionEvent(
        event,
        'INITIAL_PURCHASE',
        'phraseman_premium_yearly',
        { kind: 'synthetic_reconcile', requesterCanonicalUid: 'B', source: 'lifetime' },
      );
      expect(outcome.body).toMatchObject({ updated: false, reason: 'lineage_owner_unproven' });
      expect(store.users.B.progress).toEqual({ marker: 'unchanged' });
      expect(store.revenuecat_premium_lineage_owners).toEqual({});
      expect(store.revenuecat_premium_lineages).toEqual({});
      expect(store.revenuecat_premium_events).toEqual({});
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it('upgrades only immutable owner metadata for a compatible pre-S1 duplicate', async () => {
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-test' });
    const event = originalPurchaseEvent({ id: 'evt-legacy-duplicate' });
    const normalized = normalizePremiumLineageEvent(event);
    if (normalized.status !== 'ok') throw new Error('test event must normalize');
    const lineageHash = canonicalPremiumLineageHash(event);
    const receiptId = 'evt_' + createHash('sha256').update(String(event.id)).digest('hex');
    const lineage = { ownerUid: 'A', ...applyPremiumLineageEvent(null, normalized.event).state, financialMarker: 'frozen' };
    const receipt = { uid: 'A', eventId: normalized.event.eventId, fingerprint: normalized.event.fingerprint, frozen: true };
    const user = { progress: { premium_plan: 'yearly', financialMarker: 'frozen' }, achievement: 'frozen' };
    const { db, store } = makeAuthorityDb({
      users: { A: user },
      account_identity_owner_map: { 'raw-L': { canonicalStableId: 'A' } },
      revenuecat_premium_lineages: { legacy: lineage },
      revenuecat_premium_events: { [receiptId]: receipt },
    });
    const before = JSON.stringify({ user, lineage, receipt, ownerMap: store.account_identity_owner_map });
    const realFieldValue = admin.firestore.FieldValue;
    const firestoreMock: any = jest.spyOn(admin, 'firestore').mockReturnValue(db);
    firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    (admin.firestore as any).FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    try {
      const outcome = await invokeCheckedRevenueCatWebhook(event);
      expect(outcome.body).toMatchObject({ updated: false, reason: 'duplicate', ownerMetadataCreated: true });
      expect(store.revenuecat_premium_lineage_owners[lineageHash]).toMatchObject({
        originalOwnerUid: 'raw-L', canonicalOwnerUidAtCreation: 'A',
      });
      expect(JSON.stringify({
        user: store.users.A,
        lineage: store.revenuecat_premium_lineages.legacy,
        receipt: store.revenuecat_premium_events[receiptId],
        ownerMap: store.account_identity_owner_map,
      })).toBe(before);
      expect(store.auth_links['raw-L']).toBeUndefined();
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it('lets synthetic requester B refresh verified A without authorizing, writing, or tailing B', async () => {
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-test' });
    const original = originalPurchaseEvent({ app_user_id: 'A', original_app_user_id: 'A' });
    const originalNormalized = normalizePremiumLineageEvent(original);
    if (originalNormalized.status !== 'ok') throw new Error('test event must normalize');
    const lineageHash = originalNormalized.event.lineageHash;
    const initialLineage = {
      ownerUid: 'A',
      ...applyPremiumLineageEvent(null, originalNormalized.event).state,
    };
    const renewal = {
      ...original,
      id: 'evt-synthetic-b-refresh',
      type: 'RENEWAL',
      app_user_id: 'B',
      transaction_id: 'transaction-renewal-b',
      event_timestamp_ms: Number(original.event_timestamp_ms) + 1_000,
      expiration_at_ms: Number(original.expiration_at_ms) + 86_400_000,
    };
    delete (renewal as Record<string, unknown>).original_app_user_id;
    const { db, store } = makeAuthorityDb({
      users: { A: { progress: { marker: 'owner' } }, B: { progress: { marker: 'requester' } } },
      revenuecat_premium_lineages: { existing: initialLineage },
      revenuecat_premium_lineage_owners: {
        [lineageHash]: {
          schemaVersion: 1,
          lineageHash,
          originalOwnerUid: 'A',
          canonicalOwnerUidAtCreation: 'A',
          status: 'verified_original',
          evidenceKind: 'authenticated_original_purchase_webhook_v1',
          evidenceEventIdHash: createHash('sha256').update(String(original.id)).digest('hex'),
          receiptFingerprint: originalNormalized.event.fingerprint,
          createdAtMs: Date.now(),
        },
      },
    });
    const realFieldValue = admin.firestore.FieldValue;
    const firestoreMock: any = jest.spyOn(admin, 'firestore').mockReturnValue(db);
    firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    (admin.firestore as any).FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
    try {
      const outcome = await applyVerifiedPremiumSubscriptionEvent(
        renewal,
        'RENEWAL',
        'phraseman_premium_yearly',
        { kind: 'synthetic_reconcile', requesterCanonicalUid: 'B', source: 'subscription' },
      );
      expect(outcome.body).toEqual({ ok: true, kind: 'premium', updated: true, reason: 'not_requester' });
      expect(store.users.A.progress.premium_plan).toBe('yearly');
      expect(store.users.B.progress).toEqual({ marker: 'requester' });
      expect(store.public_profiles.A).toBeUndefined();
      expect(store.public_profiles.B).toBeUndefined();
      expect(JSON.stringify(outcome.body)).not.toContain('A');
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });
});

// TRANSFER is audit-only under the original-account-only policy. Detailed mutation guards
// live in revenuecat_transfer_phase2.test.ts; these helpers only normalize bounded audit ids.
describe('RevenueCat webhook TRANSFER audit inputs', () => {
  it('keeps source ids and exposes only stable target ids to the audit classifier', () => {
    const event = {
      type: 'TRANSFER',
      transferred_to: ['$RCAnonymousID:zzz', 'stable-real'],
      transferred_from: ['$RCAnonymousID:aaa'],
    } as any;
    expect(transferTargetIds(event)).toEqual(['stable-real']);
    expect(transferSourceIds(event)).toEqual(['$RCAnonymousID:aaa']);
  });
});

// зачем: D103/D139 (жемчуг) и D136 (MAX) — владелец 2026-10-01: код приёма денег
// за эти товары удалён. Покупка снятого товара обязана оставить алерт владельцу
// (деньги списаны), а не пройти молча; начисления и списания нет ни в одной ветке.
describe('D103/D136/D139: retired products are never credited', () => {
  function setup() {
    const admin = require('firebase-admin');
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-test' });
    const writes: Array<{ collection: string; id: string; data: any }> = [];
    const db: any = {
      collection: (collection: string) => ({
        doc: (id: string) => ({
          collection,
          id,
          set: async (data: any) => { writes.push({ collection, id, data }); },
          get: async () => ({ exists: false, data: () => undefined }),
        }),
      }),
      runTransaction: async () => { throw new Error('no transaction expected for retired products'); },
    };
    const fsMock: any = jest.spyOn(admin, 'firestore').mockReturnValue(db);
    fsMock.FieldValue = admin.firestore.FieldValue ?? { serverTimestamp: () => 'ts' };
    const res: any = { statusCode: 0, body: null };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (body: any) => { res.body = body; return res; };
    res.send = (body: any) => { res.body = body; return res; };
    return { admin, writes, res };
  }

  const EVENT = {
    id: 'evt-retired',
    type: 'NON_RENEWING_PURCHASE',
    app_id: 'app.phraseman',
    environment: 'PRODUCTION',
    store: 'APP_STORE',
    transaction_id: 'tx-retired',
    original_transaction_id: 'tx-retired',
    product_id: 'phraseman_shards_80',
    event_timestamp_ms: 3_000_000,
    purchased_at_ms: 3_000_000,
    app_user_id: 'stable-user',
  } as any;

  it('classifies every retired family and leaves Plus untouched', () => {
    expect(retiredProductFamily('phraseman_shards_30')).toBe('pearl_pack');
    expect(retiredProductFamily('phraseman_shards_420')).toBe('pearl_pack');
    expect(retiredProductFamily('phraseman_voice_minutes_120')).toBe('max_voice_minutes');
    expect(retiredProductFamily('phraseman_max_monthly_v1')).toBe('max_subscription');
    expect(retiredProductFamily('phraseman_max_monthly_v1:monthly-base')).toBe('max_subscription');
    expect(retiredProductFamily('phraseman_premium_yearly')).toBeNull();
    expect(retiredProductFamily('phraseman_premium_lifetime_v1')).toBeNull();
    expect(retiredProductFamily('')).toBeNull();
  });

  it.each([
    ['phraseman_shards_80', 'NON_RENEWING_PURCHASE'],
    ['phraseman_voice_minutes_120', 'NON_RENEWING_PURCHASE'],
    ['phraseman_max_monthly_v1', 'RENEWAL'],
  ])('answers 200 ignored for %s %s, writes no economy event, but raises an owner alert', async (productId, eventType) => {
    const { admin, writes, res } = setup();
    try {
      await __revenueCatWebhookTestHooks.handleRetiredProductEvent(
        { ...EVENT, product_id: productId, type: eventType }, eventType, productId,
        retiredProductFamily(productId) as any, res,
      );
      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject({ ok: true, ignored: 'retired_product' });
      expect(writes.some((w) => w.collection === 'external_economy_events')).toBe(false);
      expect(writes.some((w) => w.collection.startsWith('voice_minute'))).toBe(false);
      expect(writes.some((w) => w.collection === 'app_errors')).toBe(true);
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it.each(['REFUND', 'REFUND_REVERSED', 'CANCELLATION', 'EXPIRATION'])('ignores %s without any write', async (eventType) => {
    const { admin, writes, res } = setup();
    try {
      await __revenueCatWebhookTestHooks.handleRetiredProductEvent(
        { ...EVENT, type: eventType }, eventType, 'phraseman_shards_80', 'pearl_pack', res,
      );
      expect(res.statusCode).toBe(200);
      expect(writes).toEqual([]);
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it('does not alert for a SANDBOX purchase of a retired product', async () => {
    const { admin, writes, res } = setup();
    try {
      await __revenueCatWebhookTestHooks.handleRetiredProductEvent(
        { ...EVENT, environment: 'SANDBOX', product_id: 'phraseman_voice_minutes_30' },
        'NON_RENEWING_PURCHASE', 'phraseman_voice_minutes_30', 'max_voice_minutes', res,
      );
      expect(res.body).toMatchObject({ ok: true, ignored: 'retired_product' });
      expect(writes).toEqual([]);
    } finally {
      (admin.firestore as jest.Mock).mockRestore();
    }
  });

  it('keeps no pearl or voice-minute crediting code in the webhook and routes retired products first', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
    expect(source).not.toContain('appendExternalEconomyEvent');
    expect(source).not.toContain('async function handleShardPurchaseEvent');
    expect(source).not.toContain("collection('shard_log')");
    expect(source).not.toContain("from './voice_minutes'");
    expect(source).not.toContain('handleVoiceMinutePackEvent');
    expect(source).not.toContain('VOICE_MINUTE_SANDBOX_STABLE_UIDS');
    const dispatch = source.slice(
      source.indexOf('async function dispatchAuthenticatedRevenueCatWebhook('),
      source.indexOf('export const revenueCatShardsWebhook'),
    );
    const route = source.slice(
      source.indexOf('async function routeAuthenticatedRevenueCatWebhook('),
      source.indexOf('async function dispatchAuthenticatedRevenueCatWebhook('),
    );
    const auth = dispatch.indexOf('authMatches(req.headers?.authorization, expectedAuth)');
    const body = dispatch.indexOf('const body = req.body');
    const retired = route.indexOf('const retiredFamily = retiredProductFamily(productId);');
    const sandbox = route.indexOf('if (isSandboxEvent(event))');
    expect(auth).toBeGreaterThan(-1);
    expect(body).toBeGreaterThan(auth);
    expect(retired).toBeGreaterThan(-1);
    expect(sandbox).toBeGreaterThan(retired);
  });
});
