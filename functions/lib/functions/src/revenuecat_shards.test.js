"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const revenuecat_shards_1 = require("./revenuecat_shards");
const { candidateUserIds, premiumAuthoritativeUserIds, resolvePremiumOwnerRef, isRevenueCatAnonymousId, looksLikePremiumSubscription, premiumPlanFromEvent, prioritizeUserCandidates, stableCandidateUserIds, transferTargetIds, transferSourceIds, revenueCatLifecycleReasonFields, handlePremiumSubscriptionEvent, } = revenuecat_shards_1.__revenueCatWebhookTestHooks;
describe('RevenueCat webhook premium matching', () => {
    it('normalizes lifecycle reason enums and rejects arbitrary text', () => {
        expect(revenueCatLifecycleReasonFields({ cancel_reason: ' unsubscribe ' }, 'CANCELLATION'))
            .toEqual({ cancelReason: 'UNSUBSCRIBE' });
        expect(revenueCatLifecycleReasonFields({ expiration_reason: 'billing_error' }, 'EXPIRATION'))
            .toEqual({ expirationReason: 'BILLING_ERROR' });
        expect(revenueCatLifecycleReasonFields({ cancel_reason: 'user wrote free text!' }, 'CANCELLATION'))
            .toEqual({});
        expect(revenueCatLifecycleReasonFields({ cancel_reason: 'A'.repeat(65) }, 'CANCELLATION'))
            .toEqual({});
        expect(revenueCatLifecycleReasonFields({ cancel_reason: 'UNSUBSCRIBE' }, 'RENEWAL'))
            .toEqual({});
    });
    it('stores lifecycle reasons only in the RevenueCat audit event document', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
        expect(source).toContain('...revenueCatLifecycleReasonFields(event, eventType)');
        expect(source).not.toContain('progressPatch.cancelReason');
        expect(source).not.toContain('progressPatch.expirationReason');
    });
    it('stores normalized optional financial truth without changing entitlement fields', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
        for (const field of [
            'price_in_purchased_currency?: number',
            'tax_percentage?: number',
            'commission_percentage?: number',
            'renewal_number?: number',
            'is_trial_conversion?: boolean',
            '...normalizeRevenueCatFinancials(event)',
            'billingCadence: classifyRevenueCatBillingCadence(event)',
        ])
            expect(source).toContain(field);
        expect(source).toContain('progress: aggregate.progressPatch');
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
            }],
        ['provider link', ['provider-a'], {
                users: { 'canonical-b': { identityHidden: false } },
                auth_links: { 'provider-a': { stable_id: 'canonical-b' } },
            }],
    ])('resolves one non-hidden canonical premium owner through %s', async (_label, candidates, documents) => {
        const db = {
            collection: (collection) => ({
                doc: (id) => ({ collection, id }),
            }),
        };
        const tx = {
            get: async (ref) => {
                const data = documents[ref.collection][ref.id];
                return { exists: data !== undefined, data: () => data, ref };
            },
        };
        await expect(resolvePremiumOwnerRef(tx, db, candidates)).resolves.toMatchObject({
            status: 'resolved', uid: 'canonical-b',
        });
    });
    it('quarantines conflicting existing canonical premium roots', async () => {
        const db = {
            collection: (collection) => ({ doc: (id) => ({ collection, id }) }),
        };
        const tx = {
            get: async (ref) => {
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
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
        expect(source).not.toContain('anonymous_only_unmatched');
        expect(source).not.toContain('allowAnonymousOnly: false');
    });
});
describe('RevenueCat premium lineage transaction contract', () => {
    const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
    it('uses canonical lineage reduction and never invents durable premium identity or time', () => {
        const premiumHandler = source.slice(source.indexOf('async function handlePremiumSubscriptionEvent('), source.indexOf('async function handleShardPurchaseEvent'));
        expect(premiumHandler).toMatch(/normalizePremiumLineageEvent\(event/);
        expect(premiumHandler).toContain('applyPremiumLineageEvent');
        expect(premiumHandler).toContain('aggregatePremiumLineages');
        expect(premiumHandler).not.toContain('event_timestamp_ms || Date.now()');
        expect(source).not.toContain('handlePremiumSubscriptionEventLegacy');
    });
    it('checks receipt and deletion denial before lineage/projection writes and never creates a missing user', () => {
        const premiumHandler = source.slice(source.indexOf('async function handlePremiumSubscriptionEvent('), source.indexOf('async function handleShardPurchaseEvent'));
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
    it('denies an auth-uid-only pending deletion marker before any user or lineage write', async () => {
        const admin = require('firebase-admin');
        if (!admin.apps.length)
            admin.initializeApp({ projectId: 'demo-test' });
        const writes = [];
        const ref = (collection, id) => ({
            collection,
            id,
            get: async () => ({
                exists: collection === 'account_deletion_auth_markers' && id === 'auth-only',
                data: () => collection === 'account_deletion_auth_markers' ? { status: 'pending' } : undefined,
            }),
        });
        const db = {
            collection: (collection) => ({ doc: (id) => ref(collection, id) }),
            runTransaction: async (work) => work({
                get: (documentRef) => documentRef.get(),
                set: (documentRef, data) => writes.push({ collection: documentRef.collection, id: documentRef.id, data }),
            }),
        };
        const realFieldValue = admin.firestore.FieldValue;
        const fsMock = jest.spyOn(admin, 'firestore').mockReturnValue(db);
        fsMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        admin.firestore.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        const res = { statusCode: 0, body: null };
        res.status = (code) => { res.statusCode = code; return res; };
        res.json = (body) => { res.body = body; return res; };
        res.send = (body) => { res.body = body; return res; };
        try {
            await handlePremiumSubscriptionEvent({
                id: 'evt-delete', type: 'RENEWAL', app_id: 'app.phraseman', environment: 'PRODUCTION',
                store: 'APP_STORE', original_transaction_id: 'orig-delete', transaction_id: 'tx-delete',
                product_id: 'phraseman_premium_yearly', event_timestamp_ms: 2000000,
                expiration_at_ms: 9000000, app_user_id: 'auth-only', entitlement_ids: ['premium'],
            }, 'RENEWAL', 'phraseman_premium_yearly', res);
            expect(res.body).toMatchObject({ updated: false, reason: 'account_deletion_pending_or_tombstoned' });
            expect(writes).toHaveLength(1);
            expect(writes[0]).toMatchObject({ collection: 'revenuecat_premium_denials' });
        }
        finally {
            admin.firestore.mockRestore();
        }
    });
});
describe('RevenueCat shard refund durable identity', () => {
    it('rejects missing immutable event identity/time instead of using a Date.now idempotency key', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
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
        };
        expect(transferTargetIds(event)).toEqual(['stable-real']); // anonymous dropped
        expect(transferSourceIds(event)).toEqual(['$RCAnonymousID:aaa']);
    });
    function makeRcDbStub(initialUsers = {}) {
        const store = {
            users: { ...initialUsers },
            revenuecat_premium_events: {},
        };
        const snap = (id, data) => ({ id, exists: !!data, data: () => data });
        const docApi = (coll, id) => ({
            id,
            get: async () => snap(id, store[coll]?.[id]),
            set: async (data) => {
                store[coll] = store[coll] ?? {};
                const prev = store[coll][id] ?? {};
                const mergedProgress = data.progress ? { ...(prev.progress ?? {}), ...data.progress } : prev.progress;
                store[coll][id] = { ...prev, ...data, ...(mergedProgress ? { progress: mergedProgress } : {}) };
            },
        });
        const db = {
            collection: (coll) => ({ doc: (id) => docApi(coll, id) }),
            runTransaction: async (fn) => {
                const tx = {
                    get: async (ref) => ref.get(),
                    set: async (ref, data) => ref.set(data),
                };
                return fn(tx);
            },
        };
        return { db, store };
    }
    function makeRes() {
        const r = { statusCode: 0, body: null };
        r.status = (c) => { r.statusCode = c; return r; };
        r.json = (b) => { r.body = b; return r; };
        r.send = (b) => { r.body = b; return r; };
        return r;
    }
    it('moves active premium from the anonymous donor to the stable recipient and deactivates the donor', async () => {
        const admin = require('firebase-admin');
        if (!admin.apps.length)
            admin.initializeApp({ projectId: 'demo-test' });
        const { db, store } = makeRcDbStub({
            '$RCAnonymousID:aaa': { progress: { premium_plan: 'yearly', premium_expiry: '0', premium_rc_expiry_ms: String(Date.now() + 1e9) } },
            'stable-real': { progress: { user_total_xp: '4000' } },
        });
        const realFieldValue = admin.firestore.FieldValue;
        const fsMock = jest.spyOn(admin, 'firestore').mockReturnValue(db);
        fsMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        admin.firestore.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        try {
            const event = {
                id: 'evt_transfer_1',
                type: 'TRANSFER',
                transferred_from: ['$RCAnonymousID:aaa'],
                transferred_to: ['stable-real'],
            };
            const res = makeRes();
            await revenuecat_shards_1.__revenueCatWebhookTestHooks.handleTransferEvent(event, 'TRANSFER', res);
            expect(res.body).toMatchObject({ ok: true, kind: 'transfer', moved: true, recipientId: 'stable-real' });
            expect(store.users['stable-real'].progress.premium_plan).toBe('yearly');
            expect(store.users['$RCAnonymousID:aaa'].progress.premium_plan).toBe(''); // donor deactivated
        }
        finally {
            admin.firestore.mockRestore();
        }
    });
    it('is idempotent — a re-delivered TRANSFER does not move twice', async () => {
        const admin = require('firebase-admin');
        if (!admin.apps.length)
            admin.initializeApp({ projectId: 'demo-test' });
        const { db, store } = makeRcDbStub({
            '$RCAnonymousID:bbb': { progress: { premium_plan: 'monthly', premium_expiry: '0', premium_rc_expiry_ms: String(Date.now() + 1e9) } },
            'stable-2': { progress: { user_total_xp: '1' } },
        });
        store.revenuecat_premium_events['evt_dup'] = { eventId: 'evt_dup' }; // already processed
        const realFieldValue = admin.firestore.FieldValue;
        const fsMock = jest.spyOn(admin, 'firestore').mockReturnValue(db);
        fsMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        admin.firestore.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        try {
            const event = { id: 'evt_dup', type: 'TRANSFER', transferred_from: ['$RCAnonymousID:bbb'], transferred_to: ['stable-2'] };
            const res = makeRes();
            await revenuecat_shards_1.__revenueCatWebhookTestHooks.handleTransferEvent(event, 'TRANSFER', res);
            expect(res.body).toMatchObject({ ok: true, moved: false, reason: 'duplicate' });
            expect(store.users['stable-2'].progress.premium_plan).toBeUndefined(); // untouched
        }
        finally {
            admin.firestore.mockRestore();
        }
    });
});
//# sourceMappingURL=revenuecat_shards.test.js.map