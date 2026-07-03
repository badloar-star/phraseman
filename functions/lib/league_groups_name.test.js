"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let currentDb = null;
jest.mock('firebase-admin', () => ({
    firestore: Object.assign(() => currentDb, {
        FieldValue: { delete: () => ({ __delete: true }) },
    }),
}));
jest.mock('./auth_identity', () => ({
    resolveStableUidForAuth: jest.fn(async (_db, _authUid, requestedStableId) => String(requestedStableId || 'stable-self')),
}));
jest.mock('./premium_status', () => ({
    isVipActive: jest.fn(() => false),
    resolvePremiumAccess: jest.fn(async () => false),
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { leagueUpdateMyMember } = require('./league_groups');
function currentWeekId() {
    const d = new Date();
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}
function setDotted(target, key, value) {
    const parts = key.split('.');
    let cur = target;
    for (let i = 0; i < parts.length - 1; i += 1) {
        const part = parts[i];
        const next = cur[part];
        if (!next || typeof next !== 'object')
            cur[part] = {};
        cur = cur[part];
    }
    cur[parts[parts.length - 1]] = value;
}
function makeDb(initial) {
    const store = {
        users: { ...(initial.users ?? {}) },
        leaderboard: { ...(initial.leaderboard ?? {}) },
        league_groups: { ...(initial.league_groups ?? {}) },
        name_index: { ...(initial.name_index ?? {}) },
        banned_users: { ...(initial.banned_users ?? {}) },
    };
    const snapFor = (id, data) => ({
        id,
        exists: !!data,
        data: () => data,
    });
    const readField = (data, field) => {
        let cur = data;
        for (const part of field.split('.')) {
            if (!cur || typeof cur !== 'object')
                return undefined;
            cur = cur[part];
        }
        return cur;
    };
    const docApi = (collectionName, id) => ({
        get: async () => snapFor(id, store[collectionName]?.[id]),
        set: async (data, options) => {
            store[collectionName] = store[collectionName] ?? {};
            const base = options?.merge ? { ...(store[collectionName][id] ?? {}) } : {};
            for (const [key, value] of Object.entries(data))
                setDotted(base, key, value);
            store[collectionName][id] = base;
        },
    });
    currentDb = {
        collection: (collectionName) => ({
            doc: (id) => docApi(collectionName, id),
            where: (field, op, value) => ({
                limit: () => ({
                    get: async () => ({
                        docs: Object.entries(store[collectionName] ?? {})
                            .filter(([, data]) => data && op === '==' && readField(data, field) === value)
                            .map(([id, data]) => snapFor(id, data)),
                    }),
                }),
            }),
        }),
    };
    return store;
}
function callableRun(fn, data, authUid) {
    const req = { auth: { uid: authUid, token: {} }, data, rawRequest: { headers: {} }, app: {} };
    if (typeof fn.run === 'function')
        return fn.run(req);
    return fn(req);
}
describe('league member display name ownership', () => {
    it('does not let leagueUpdateMyMember publish a nickname reserved by another live account', async () => {
        const weekId = currentWeekId();
        const store = makeDb({
            users: {
                'stable-self': {
                    firebaseAuthUid: 'auth-self',
                    progress: {
                        user_name: 'Professor L',
                        user_name_lower: 'professor l',
                        weekly_xp: '413',
                        streak_count: '2',
                        user_total_xp: '900',
                    },
                },
                'stable-owner': { firebaseAuthUid: 'auth-owner', progress: { user_name: 'Professor L' } },
            },
            leaderboard: {
                'stable-self': { groupId: 'group-1', groupWeekId: weekId, leagueId: 0 },
            },
            name_index: {
                'professor l': { uid: 'stable-owner', name: 'Professor L', nameLower: 'professor l' },
            },
            league_groups: {
                'group-1': { weekId, leagueId: 0, members: { 'stable-self': { uid: 'stable-self', name: 'Old' } } },
            },
        });
        const res = await callableRun(leagueUpdateMyMember, { stableId: 'stable-self', member: { name: 'Professor L', points: 999999 } }, 'auth-self');
        expect(res.ok).toBe(true);
        const member = (store.league_groups['group-1']?.members)['stable-self'];
        expect(member.name).not.toBe('Professor L');
        expect(member.name).toMatch(/^Player /);
        expect(member.points).toBe(413);
    });
});
//# sourceMappingURL=league_groups_name.test.js.map