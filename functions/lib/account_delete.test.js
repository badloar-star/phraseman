"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const account_delete_1 = require("./account_delete");
const { accountDeleteQueryPlan, resolveStableUidForDelete } = account_delete_1.__accountDeleteTestHooks;
function makeDbStub(opts) {
    const users = opts.users ?? {};
    const authLinks = opts.authLinks ?? {};
    const collections = {
        users,
        auth_links: authLinks,
    };
    const snapFor = (id, data) => ({
        id,
        exists: !!data,
        data: () => data,
    });
    return {
        collection: (name) => {
            const data = collections[name] ?? {};
            return {
                doc: (id) => ({
                    get: async () => snapFor(id, data[id]),
                }),
                where: (field, _op, value) => ({
                    limit: (_n) => ({
                        get: async () => {
                            const docs = Object.entries(data)
                                .filter(([, doc]) => doc[field] === value)
                                .map(([id, doc]) => snapFor(id, doc));
                            return { empty: docs.length === 0, docs };
                        },
                    }),
                }),
            };
        },
    };
}
describe('accountDelete query plan', () => {
    it('covers the privacy-critical user data collections', () => {
        const plan = accountDeleteQueryPlan('stable-123', 'auth-456');
        const keys = new Set(plan.map((x) => `${x.collection}.${x.field}.${x.op}.${x.value}`));
        expect(keys.has('auth_links.stable_id.==.stable-123')).toBe(true);
        expect(keys.has('app_activity.uid.==.stable-123')).toBe(true);
        expect(keys.has('app_errors.uid.==.stable-123')).toBe(true);
        expect(keys.has('subscription_cancel_surveys.uid.==.stable-123')).toBe(true);
        expect(keys.has('community_packs.authorStableId.==.stable-123')).toBe(true);
        expect(keys.has('community_pack_purchases.buyerStableId.==.stable-123')).toBe(true);
        expect(keys.has('league_chat_messages.authorUid.==.stable-123')).toBe(true);
        expect(keys.has('user_reports.reporterUid.==.stable-123')).toBe(true);
        expect(keys.has('revenuecat_premium_events.candidates.array-contains.stable-123')).toBe(true);
    });
    it('covers auth-uid arena and chat documents', () => {
        const plan = accountDeleteQueryPlan('stable-123', 'auth-456');
        const keys = new Set(plan.map((x) => `${x.collection}.${x.field}.${x.op}.${x.value}`));
        expect(keys.has('matchmaking_queue.userId.==.auth-456')).toBe(true);
        expect(keys.has('arena_sessions.playerIds.array-contains.auth-456')).toBe(true);
        expect(keys.has('arena_invites.fromUid.==.auth-456')).toBe(true);
        expect(keys.has('arena_room_members.authUid.==.auth-456')).toBe(true);
        expect(keys.has('league_chat_messages.authUid.==.auth-456')).toBe(true);
        expect(keys.has('league_chat_reports.reporterAuthUid.==.auth-456')).toBe(true);
    });
    it('deduplicates both-value specs when stable id equals auth uid', () => {
        const plan = accountDeleteQueryPlan('same-id', 'same-id');
        const leaderboardUidMatches = plan.filter((x) => x.collection === 'name_index' && x.field === 'uid');
        expect(leaderboardUidMatches).toHaveLength(1);
        expect(leaderboardUidMatches[0]).toMatchObject({ value: 'same-id' });
    });
});
describe('accountDelete stable id resolver', () => {
    it('accepts the requested stable id when it is linked to the current auth uid', async () => {
        const db = makeDbStub({ users: { stable123: { firebaseAuthUid: 'auth456' } } });
        await expect(resolveStableUidForDelete(db, 'auth456', 'stable123')).resolves.toBe('stable123');
    });
    it('does not fail local account deletion when the requested local stable id has no cloud link yet', async () => {
        const db = makeDbStub({});
        await expect(resolveStableUidForDelete(db, 'auth456', 'localStableOnly')).resolves.toBe('auth456');
    });
    it('falls back to the known server-side stable id when the local stable id is stale', async () => {
        const db = makeDbStub({ users: { serverStable: { firebaseAuthUid: 'auth456' } } });
        await expect(resolveStableUidForDelete(db, 'auth456', 'staleLocalStable')).resolves.toBe('serverStable');
    });
    it('rejects a requested stable id that belongs to a different auth uid', async () => {
        const db = makeDbStub({ users: { stable123: { firebaseAuthUid: 'otherAuth' } } });
        await expect(resolveStableUidForDelete(db, 'auth456', 'stable123')).rejects.toMatchObject({
            code: 'permission-denied',
        });
    });
});
describe('accountDelete query deletion safety', () => {
    it('fails instead of looping forever when a query makes no delete progress', async () => {
        const ref = { path: 'stuck/doc' };
        const query = {
            limit: jest.fn(() => ({
                get: jest.fn(async () => ({ empty: false, docs: [{ ref }] })),
            })),
        };
        const ctx = {
            db: { recursiveDelete: jest.fn() },
            writer: {},
            seen: new Set([ref.path]),
            runId: 'test',
            stableUidHash: 'stable',
            authUidHash: 'auth',
            startedAtMs: 0,
            lastProgressLogDocs: 0,
            writerClosed: false,
        };
        const stats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };
        await expect(account_delete_1.__accountDeleteTestHooks.deleteQuery(query, ctx, stats))
            .rejects.toMatchObject({ code: 'internal' });
        expect(stats.queriesRun).toBe(1);
    });
});
//# sourceMappingURL=account_delete.test.js.map