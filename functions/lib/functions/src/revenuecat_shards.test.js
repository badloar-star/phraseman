"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const revenuecat_shards_1 = require("./revenuecat_shards");
const { candidateUserIds, isRevenueCatAnonymousId, looksLikePremiumSubscription, premiumPlanFromEvent, prioritizeUserCandidates, stableCandidateUserIds, transferTargetIds, transferSourceIds, revenueCatLifecycleReasonFields, } = revenuecat_shards_1.__revenueCatWebhookTestHooks;
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
    it('accepts explicit premium entitlement events', () => {
        expect(looksLikePremiumSubscription({
            type: 'INITIAL_PURCHASE',
            product_id: 'store_sku_123',
            entitlement_ids: ['premium'],
        })).toBe(true);
    });
    it('accepts premium-like subscription product ids and infers plan', () => {
        const yearly = { product_id: 'phraseman_premium_yearly' };
        const monthly = { product_id: 'phraseman_premium_monthly' };
        expect(looksLikePremiumSubscription(yearly)).toBe(true);
        expect(premiumPlanFromEvent(yearly)).toBe('yearly');
        expect(looksLikePremiumSubscription(monthly)).toBe(true);
        expect(premiumPlanFromEvent(monthly)).toBe('monthly');
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
    it('accepts premium-like offering ids when product id is opaque', () => {
        expect(looksLikePremiumSubscription({
            type: 'INITIAL_PURCHASE',
            product_id: 'sku_001',
            presented_offering_id: 'premium',
        })).toBe(true);
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
    it('uses Phraseman stable id attributes before RevenueCat anonymous ids', () => {
        const anonymous = '$RCAnonymousID:cccccccccccccccccccccccccccccccc';
        const stable = 'stable-user-123';
        const candidates = candidateUserIds({
            app_user_id: anonymous,
            original_app_user_id: anonymous,
            aliases: [anonymous],
            subscriber_attributes: {
                phraseman_uid: {
                    value: stable,
                    updated_at_ms: 1710000000000,
                },
            },
        });
        expect(candidates).toEqual([stable, anonymous]);
        expect(prioritizeUserCandidates(candidates)).toEqual([stable, anonymous]);
    });
    it('does not drop paid Premium events just because only an anonymous RevenueCat id is present', () => {
        const source = fs_1.default.readFileSync(path_1.default.join(process.cwd(), 'src', 'revenuecat_shards.ts'), 'utf8');
        expect(source).not.toContain('anonymous_only_unmatched');
        expect(source).not.toContain('allowAnonymousOnly: false');
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