"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
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
        ...initial,
    };
    const docRef = (collection, id) => ({
        collection,
        id,
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
    const db = {
        collection: (collection) => ({ doc: (id) => docRef(collection, id) }),
        runTransaction: async (work) => work({
            get: (ref) => ref.get(),
            set: (ref, data) => ref.set(data),
            update: (ref, data) => ref.update(data),
        }),
    };
    return { db, store };
}
describe('RevenueCat TRANSFER Phase 2 safety (RED)', () => {
    it.each([
        ['missing', {}],
        ['tombstoned', { account_deletion_tombstones: { 'target-a': { status: 'completed' } } }],
        ['permanently deleted after marker GC', { account_deletion_permanent_denials: { 'target-a': { status: 'denied' } } }],
    ])('does not create or consume a TRANSFER when its recipient is %s', async (_label, extra) => {
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
            expect(response.body).toMatchObject({ moved: false, retryable: true });
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
    it('moves every donor lineage to one resolved canonical owner', () => {
        expect(transferSource).toContain("db.collection('revenuecat_premium_lineages')");
        expect(transferSource).toMatch(/where\('ownerUid', 'in', sources\)/);
        expect(transferSource).toContain('tx.update(lineage.ref, { ownerUid: recipientId');
    });
    it('aggregates donor and target lineages so stronger target access is preserved', () => {
        expect(transferSource).toContain('aggregatePremiumLineages(recipientLineages');
        expect(transferSource).not.toContain('progress: { ...premiumBlock');
    });
});
//# sourceMappingURL=revenuecat_transfer_phase2.test.js.map