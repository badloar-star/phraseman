"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const account_delete_job_1 = require("./account_delete_job");
const revenuecat_shards_1 = require("./revenuecat_shards");
const source = fs_1.default.readFileSync(path_1.default.join(__dirname, 'revenuecat_shards.ts'), 'utf8');
const transferSource = source.slice(source.indexOf('async function handleTransferEvent('), source.indexOf('export const revenueCatShardsWebhook'));
function responseStub() {
    const response = { statusCode: 0, body: null };
    response.status = (statusCode) => { response.statusCode = statusCode; return response; };
    response.json = (body) => { response.body = body; return response; };
    response.send = (body) => { response.body = body; return response; };
    return response;
}
function transferDbStub(initial) {
    const store = {
        users: {},
        revenuecat_premium_events: {},
        account_deletion_tombstones: {},
        account_deletion_auth_markers: {},
        account_deletion_permanent_denials: {},
        auth_links: {},
        account_identity_owner_map: {},
        revenuecat_premium_lineages: {},
        revenuecat_premium_denials: {},
        revenuecat_shard_transactions: {},
        revenuecat_shard_refunds: {},
        ...initial,
    };
    let autoId = 0;
    const docRef = (collection, id = `auto-${autoId += 1}`) => ({
        collectionName: collection,
        id,
        path: `${collection}/${id}`,
        collection: (subcollection) => ({
            doc: (subId) => docRef(`${collection}/${id}/${subcollection}`, subId),
        }),
        get: async () => ({
            id,
            exists: store[collection]?.[id] !== undefined,
            data: () => store[collection]?.[id],
        }),
        set: async (data) => {
            store[collection] ?? (store[collection] = {});
            const previous = store[collection][id] ?? {};
            const progress = data.progress
                ? { ...(previous.progress ?? {}), ...data.progress }
                : previous.progress;
            store[collection][id] = { ...previous, ...data, ...(progress ? { progress } : {}) };
        },
        update: async (data) => {
            if (store[collection]?.[id] === undefined)
                throw new Error('not-found');
            store[collection][id] = { ...store[collection][id], ...data };
        },
    });
    const queryRef = (collection, field, op, value, max = Infinity) => ({
        limit: (nextMax) => queryRef(collection, field, op, value, nextMax),
        get: async () => ({
            docs: Object.entries(store[collection] ?? {})
                .filter(([, data]) => op === 'in'
                ? Array.isArray(value) && value.includes(data[field])
                : data[field] === value)
                .slice(0, max)
                .map(([id, data]) => ({ id, ref: docRef(collection, id), exists: true, data: () => data })),
        }),
    });
    const db = {
        collection: (collection) => ({
            doc: (id) => docRef(collection, id),
            where: (field, op, value) => queryRef(collection, field, op, value),
        }),
        runTransaction: async (work) => work({
            get: (ref) => ref.get(),
            set: (ref, data) => ref.set(data),
            update: (ref, data) => ref.update(data),
            delete: (ref) => { delete store[ref.collectionName][ref.id]; },
        }),
    };
    return { db, store };
}
describe('RevenueCat TRANSFER Phase 2 safety (RED)', () => {
    it.each([
        ['missing', {}, true],
        ['tombstoned', { account_deletion_tombstones: { 'target-a': { status: 'completed' } } }, false],
        ['permanently deleted after marker GC', { account_deletion_permanent_denials: { [(0, account_delete_job_1.accountDeletePermanentDenialId)('target-a')]: { status: 'denied' } } }, false],
    ])('does not create or consume a TRANSFER when its recipient is %s', async (_label, extra, retryable) => {
        const admin = require('firebase-admin');
        if (!admin.apps.length)
            admin.initializeApp({ projectId: 'demo-test' });
        const { db, store } = transferDbStub({
            users: {
                '$RCAnonymousID:donor': {
                    progress: {
                        premium_plan: 'yearly',
                        premium_expiry: '0',
                        premium_rc_expiry_ms: String(Date.now() + 1000000),
                    },
                },
            },
            ...extra,
        });
        const realFieldValue = admin.firestore.FieldValue;
        const firestoreMock = jest.spyOn(admin, 'firestore').mockReturnValue(db);
        firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        admin.firestore.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        try {
            const response = responseStub();
            await revenuecat_shards_1.__revenueCatWebhookTestHooks.handleTransferEvent({
                id: `transfer-${_label}`,
                type: 'TRANSFER',
                event_timestamp_ms: 2000000,
                transferred_from: ['$RCAnonymousID:donor'],
                transferred_to: ['target-a'],
            }, 'TRANSFER', response);
            expect(store.users['target-a']).toBeUndefined();
            expect(store.revenuecat_premium_events[`transfer-${_label}`]).toBeUndefined();
            expect(response.body).toMatchObject({ moved: false, retryable });
            expect(response.statusCode).toBe(retryable ? 503 : 200);
        }
        finally {
            admin.firestore.mockRestore();
        }
    });
    it('returns retryable non-2xx without receipt when target owners conflict', async () => {
        const admin = require('firebase-admin');
        if (!admin.apps.length)
            admin.initializeApp({ projectId: 'demo-test' });
        const { db, store } = transferDbStub({
            users: {
                donor: { progress: { premium_plan: 'yearly', premium_expiry: '0' } },
                'target-a': { progress: {} },
                'target-b': { progress: {} },
            },
        });
        const realFieldValue = admin.firestore.FieldValue;
        const firestoreMock = jest.spyOn(admin, 'firestore').mockReturnValue(db);
        firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        admin.firestore.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        try {
            const response = responseStub();
            await revenuecat_shards_1.__revenueCatWebhookTestHooks.handleTransferEvent({
                id: 'transfer-conflict',
                type: 'TRANSFER',
                event_timestamp_ms: Date.now(),
                transferred_from: ['donor'],
                transferred_to: ['target-a', 'target-b'],
            }, 'TRANSFER', response);
            expect(response.statusCode).toBe(503);
            expect(response.body).toMatchObject({ moved: false, retryable: true, reason: 'conflicting_canonical_owners' });
            expect(store.revenuecat_premium_events['transfer-conflict']).toBeUndefined();
            expect(Object.keys(store.revenuecat_premium_denials)).toHaveLength(0);
            expect(store.users['target-a'].progress).toEqual({});
            expect(store.users['target-b'].progress).toEqual({});
        }
        finally {
            admin.firestore.mockRestore();
        }
    });
    it('requires immutable transfer identity/time and never falls back to Date.now', () => {
        expect(transferSource).toContain('const eventId = cleanId(event.id);');
        expect(transferSource).toContain('const transferEventTimeMs = eventMs(event.event_timestamp_ms);');
        expect(transferSource).toContain('if (!eventId || transferEventTimeMs === null)');
        expect(transferSource).not.toContain('event.event_timestamp_ms || now');
    });
    it('rekeys donor lineages and preserves a stronger finite legacy target entitlement', async () => {
        const admin = require('firebase-admin');
        if (!admin.apps.length)
            admin.initializeApp({ projectId: 'demo-test' });
        const now = Date.now();
        const lineageHash = 'donor-lineage';
        const { db, store } = transferDbStub({
            users: {
                donor: { progress: {} },
                target: {
                    progress: {
                        premium_plan: 'yearly',
                        premium_expiry: String(now + 1000000),
                        premium_rc_product_id: 'legacy_yearly',
                        premium_rc_store: 'APP_STORE',
                        premium_rc_event_type: 'RENEWAL',
                    },
                },
            },
            revenuecat_premium_lineages: {
                old_owner_doc: {
                    ownerUid: 'donor',
                    lineageHash,
                    plan: 'monthly',
                    revoked: false,
                    activeThroughMs: now + 500000,
                    productId: 'monthly',
                    store: 'APP_STORE',
                    environment: 'PRODUCTION',
                    lastEventType: 'RENEWAL',
                    lastAccessEventTimeMs: now,
                    lastAccessEventRank: 50,
                    lastAccessEventTieValue: now + 500000,
                    lastAccessEventId: 'grant',
                    lastEventTimeMs: now,
                    lastEventRank: 30,
                    lastEventId: 'grant',
                    lastEventFingerprint: 'fp',
                },
            },
        });
        const realFieldValue = admin.firestore.FieldValue;
        const firestoreMock = jest.spyOn(admin, 'firestore').mockReturnValue(db);
        firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        admin.firestore.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        try {
            const response = responseStub();
            await revenuecat_shards_1.__revenueCatWebhookTestHooks.handleTransferEvent({
                id: 'transfer-rekey',
                type: 'TRANSFER',
                event_timestamp_ms: now,
                transferred_from: ['donor'],
                transferred_to: ['target'],
            }, 'TRANSFER', response);
            const ownerHash = (0, crypto_1.createHash)('sha256').update('target').digest('hex').slice(0, 32);
            const canonicalId = `lin_${ownerHash}_${lineageHash}`;
            expect(response.statusCode).toBe(200);
            expect(store.users.target.progress.premium_plan).toBe('yearly');
            expect(store.revenuecat_premium_lineages.old_owner_doc).toBeUndefined();
            expect(store.revenuecat_premium_lineages[canonicalId]).toMatchObject({ ownerUid: 'target', lineageHash });
        }
        finally {
            admin.firestore.mockRestore();
        }
    });
    it('selects the strongest legacy donor entitlement independent of donor order', async () => {
        const admin = require('firebase-admin');
        if (!admin.apps.length)
            admin.initializeApp({ projectId: 'demo-test' });
        for (const sources of [['donor-monthly', 'donor-lifetime'], ['donor-lifetime', 'donor-monthly']]) {
            const { db, store } = transferDbStub({
                users: {
                    'donor-monthly': { progress: { premium_plan: 'monthly', premium_expiry: '0' } },
                    'donor-lifetime': { progress: { premium_plan: 'lifetime', premium_expiry: '0' } },
                    target: { progress: {} },
                },
            });
            const realFieldValue = admin.firestore.FieldValue;
            const firestoreMock = jest.spyOn(admin, 'firestore').mockReturnValue(db);
            firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
            admin.firestore.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
            try {
                const response = responseStub();
                await revenuecat_shards_1.__revenueCatWebhookTestHooks.handleTransferEvent({
                    id: `transfer-${sources[0]}`,
                    type: 'TRANSFER',
                    event_timestamp_ms: Date.now(),
                    transferred_from: sources,
                    transferred_to: ['target'],
                }, 'TRANSFER', response);
                expect(response.statusCode).toBe(200);
                expect(store.users.target.progress.premium_plan).toBe('lifetime');
            }
            finally {
                admin.firestore.mockRestore();
            }
        }
    });
    it('moves a merged donor entitlement when RevenueCat later transfers from the retired alias', async () => {
        const admin = require('firebase-admin');
        if (!admin.apps.length)
            admin.initializeApp({ projectId: 'demo-test' });
        const now = Date.now();
        const lineageHash = 'merged-a-lineage';
        const { db, store } = transferDbStub({
            users: {
                B: {
                    progress: {
                        premium_plan: 'yearly',
                        premium_expiry: String(now + 1000000),
                        premium_rc_product_id: 'phraseman_premium_yearly',
                        premium_rc_store: 'APP_STORE',
                    },
                },
                C: { progress: {} },
            },
            account_identity_owner_map: {
                A: { canonicalStableId: 'B' },
            },
            revenuecat_premium_lineages: {
                merged_lineage: {
                    ownerUid: 'B',
                    lineageHash,
                    plan: 'yearly',
                    revoked: false,
                    activeThroughMs: now + 1000000,
                    productId: 'phraseman_premium_yearly',
                    store: 'APP_STORE',
                    environment: 'PRODUCTION',
                    lastEventType: 'RENEWAL',
                    lastAccessEventTimeMs: now - 1000,
                    lastAccessEventRank: 50,
                    lastAccessEventTieValue: now + 1000000,
                    lastAccessEventId: 'pre-merge-grant',
                    lastEventTimeMs: now - 1000,
                    lastEventRank: 30,
                    lastEventId: 'pre-merge-grant',
                    lastEventFingerprint: 'pre-merge-fingerprint',
                },
            },
        });
        const realFieldValue = admin.firestore.FieldValue;
        const firestoreMock = jest.spyOn(admin, 'firestore').mockReturnValue(db);
        firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        admin.firestore.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        try {
            const response = responseStub();
            await revenuecat_shards_1.__revenueCatWebhookTestHooks.handleTransferEvent({
                id: 'late-transfer-after-merge',
                type: 'TRANSFER',
                event_timestamp_ms: now,
                transferred_from: ['A'],
                transferred_to: ['C'],
            }, 'TRANSFER', response);
            const ownerHash = (0, crypto_1.createHash)('sha256').update('C').digest('hex').slice(0, 32);
            const canonicalId = `lin_${ownerHash}_${lineageHash}`;
            expect(response.statusCode).toBe(200);
            expect(response.body).toMatchObject({ moved: true, recipientId: 'C', donorIds: ['B'] });
            expect(response.body.reason).not.toBe('no_active_donor_premium');
            expect(store.users.C.progress.premium_plan).toBe('yearly');
            expect(store.users.B.progress.premium_plan).toBe('');
            expect(store.revenuecat_premium_lineages.merged_lineage).toBeUndefined();
            expect(store.revenuecat_premium_lineages[canonicalId]).toMatchObject({ ownerUid: 'C', lineageHash });
            expect(store.revenuecat_premium_events['late-transfer-after-merge']).toMatchObject({
                transferredFrom: ['A'],
                donorIds: ['B'],
                recipientId: 'C',
                movedPremium: true,
            });
        }
        finally {
            admin.firestore.mockRestore();
        }
    });
    it('follows the complete donor owner-map closure', async () => {
        const { db } = transferDbStub({
            account_identity_owner_map: {
                A: { canonicalStableId: 'B' },
                B: { canonicalStableId: 'C' },
            },
        });
        const resolved = await db.runTransaction((tx) => (revenuecat_shards_1.__revenueCatWebhookTestHooks.resolveCanonicalDonorUid(tx, db, 'A')));
        expect(resolved).toEqual({ status: 'resolved', uid: 'C' });
    });
    it('applies account-deletion guards to both the raw donor alias and canonical donor', async () => {
        const admin = require('firebase-admin');
        if (!admin.apps.length)
            admin.initializeApp({ projectId: 'demo-test' });
        const { db, store } = transferDbStub({
            users: {
                B: { progress: { premium_plan: 'yearly', premium_expiry: '0' } },
                C: { progress: {} },
            },
            account_identity_owner_map: { A: { canonicalStableId: 'B' } },
            account_deletion_tombstones: { B: { status: 'completed' } },
        });
        const realFieldValue = admin.firestore.FieldValue;
        const firestoreMock = jest.spyOn(admin, 'firestore').mockReturnValue(db);
        firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        admin.firestore.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        try {
            const response = responseStub();
            await revenuecat_shards_1.__revenueCatWebhookTestHooks.handleTransferEvent({
                id: 'late-transfer-deleted-canonical-donor',
                type: 'TRANSFER',
                event_timestamp_ms: Date.now(),
                transferred_from: ['A'],
                transferred_to: ['C'],
            }, 'TRANSFER', response);
            expect(response.statusCode).toBe(200);
            expect(response.body).toMatchObject({
                moved: false,
                retryable: false,
                reason: 'account_deletion_pending_or_permanent',
            });
            expect(store.users.C.progress).toEqual({});
            expect(store.revenuecat_premium_events['late-transfer-deleted-canonical-donor']).toBeUndefined();
            expect(Object.keys(store.revenuecat_premium_denials)).toHaveLength(1);
        }
        finally {
            admin.firestore.mockRestore();
        }
    });
    it('refunds a merged loser purchase against the mapped canonical winner', async () => {
        const admin = require('firebase-admin');
        if (!admin.apps.length)
            admin.initializeApp({ projectId: 'demo-test' });
        const { db, store } = transferDbStub({
            users: { winner: { shards: 100, progress: {} } },
            account_identity_owner_map: { loser: { canonicalStableId: 'winner' } },
            revenuecat_shard_transactions: {
                original: { uid: 'loser', shards: 35, productId: 'phraseman_shards_30' },
            },
        });
        const realFieldValue = admin.firestore.FieldValue;
        const firestoreMock = jest.spyOn(admin, 'firestore').mockReturnValue(db);
        firestoreMock.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        admin.firestore.FieldValue = realFieldValue ?? { serverTimestamp: () => 'ts' };
        try {
            const response = responseStub();
            await revenuecat_shards_1.__revenueCatWebhookTestHooks.handleShardRefundEvent({
                id: 'refund-merged',
                type: 'REFUND',
                original_transaction_id: 'original',
                event_timestamp_ms: Date.now(),
            }, 'phraseman_shards_30', response);
            expect(response.statusCode).toBe(200);
            expect(store.users.winner.shards).toBe(65);
            expect(store.revenuecat_shard_transactions.original.uid).toBe('winner');
            expect(store.revenuecat_shard_refunds['refund-merged']).toMatchObject({
                uid: 'winner', sourceUid: 'loser', actuallyDeducted: 35,
            });
        }
        finally {
            admin.firestore.mockRestore();
        }
    });
    it('moves every donor lineage to one resolved canonical owner', () => {
        expect(transferSource).toContain("db.collection('revenuecat_premium_lineages')");
        expect(transferSource).toMatch(/where\('ownerUid', 'in', canonicalDonorIds\)/);
        expect(transferSource).toContain('[...targets, ...sources, ...canonicalSourceIds]');
        expect(transferSource).toContain('premiumLineageDocId(recipientId, state.lineageHash)');
        expect(transferSource).toContain('tx.delete(obsoleteRef)');
    });
    it('aggregates donor and target lineages so stronger target access is preserved', () => {
        expect(transferSource).toContain('aggregatePremiumLineages(recipientLineages');
        expect(transferSource).not.toContain('progress: { ...premiumBlock');
    });
});
//# sourceMappingURL=revenuecat_transfer_phase2.test.js.map