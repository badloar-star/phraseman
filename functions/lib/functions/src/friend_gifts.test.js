"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const docs = new Map();
let autoId = 0;
function makeRef(path) {
    return {
        path,
        get: async () => {
            const data = docs.get(path);
            return { exists: data !== undefined, data: () => data };
        },
        set: async (data, opts) => {
            const existing = docs.get(path) ?? {};
            docs.set(path, opts?.merge ? deepMerge(existing, data) : { ...data });
        },
        collection: (name) => ({
            doc: (id) => makeRef(`${path}/${name}/${id || `auto-${++autoId}`}`),
        }),
    };
}
function deepMerge(target, source) {
    const result = { ...target };
    for (const [key, value] of Object.entries(source)) {
        const existing = target[key];
        if (value &&
            typeof value === 'object' &&
            !Array.isArray(value) &&
            existing &&
            typeof existing === 'object' &&
            !Array.isArray(existing)) {
            result[key] = deepMerge(existing, value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
function buildDb() {
    const collectionApi = (name) => ({
        doc: (id) => makeRef(`${name}/${id || `auto-${++autoId}`}`),
        where: (field, op, value) => ({
            limit: (count) => ({
                get: async () => {
                    const prefix = `${name}/`;
                    const matched = Array.from(docs.entries())
                        .filter(([path, data]) => (path.startsWith(prefix) &&
                        path.slice(prefix.length).split('/').length === 1 &&
                        op === '==' &&
                        data[field] === value))
                        .slice(0, count)
                        .map(([path, data]) => ({
                        id: path.slice(prefix.length),
                        ref: makeRef(path),
                        data: () => data,
                    }));
                    return {
                        empty: matched.length === 0,
                        docs: matched,
                    };
                },
            }),
        }),
    });
    return {
        collection: collectionApi,
        runTransaction: async (fn) => {
            const writes = [];
            const tx = {
                get: async (ref) => {
                    const data = docs.get(ref.path);
                    return { exists: data !== undefined, data: () => data };
                },
                set: (ref, data, opts) => {
                    writes.push(() => {
                        const existing = docs.get(ref.path) ?? {};
                        docs.set(ref.path, opts?.merge ? deepMerge(existing, data) : { ...data });
                    });
                },
            };
            const result = await fn(tx);
            writes.forEach(write => write());
            return result;
        },
    };
}
class FakeHttpsError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
jest.mock('firebase-functions/v2/https', () => ({
    HttpsError: FakeHttpsError,
    onCall: (_opts, handler) => handler,
}));
jest.mock('firebase-admin', () => {
    const firestore = Object.assign(jest.fn(() => buildDb()), {
        FieldValue: {
            serverTimestamp: jest.fn(() => new Date('2026-06-12T10:00:00.000Z')),
        },
    });
    return { firestore };
});
function seedGiftUsers() {
    docs.set('users/sender', {
        firebaseAuthUid: 'auth-sender',
        displayName: 'Sender',
        shards: 100,
        progress: { user_total_xp: '1000', user_name: 'Sender' },
    });
    docs.set('users/recipient', {
        firebaseAuthUid: 'auth-recipient',
        displayName: 'Recipient',
        shards: 40,
        progress: { user_total_xp: '900', user_name: 'Recipient' },
    });
    docs.set('users/sender/friends/recipient', { since: 1 });
    docs.set('users/recipient/friends/sender', { since: 1 });
}
async function sendGift(overrides = {}) {
    const { friendSendGift } = require('./friend_gifts');
    return friendSendGift({
        auth: { uid: 'auth-sender' },
        data: {
            senderStableId: 'sender',
            friendStableId: 'recipient',
            giftId: 'chain_shield_1',
            senderDisplayName: 'Sender',
            ...overrides,
        },
    });
}
async function thankGift(overrides = {}) {
    const { friendThankGift } = require('./friend_gifts');
    return friendThankGift({
        auth: { uid: 'auth-sender' },
        data: {
            senderStableId: 'sender',
            friendStableId: 'recipient',
            giftId: 'chain_shield_1',
            senderDisplayName: 'Sender',
            ...overrides,
        },
    });
}
beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-12T10:00:00.000Z'));
    jest.resetModules();
    docs.clear();
    autoId = 0;
    seedGiftUsers();
});
afterEach(() => {
    jest.useRealTimers();
});
test('friendSendGift starts one weekly friend quest after a successful gift', async () => {
    const result = await sendGift();
    expect(result).toMatchObject({
        ok: true,
        giftId: 'chain_shield_1',
        shardsUpdatedAtMs: new Date('2026-06-12T10:00:00.000Z').getTime(),
        questStarted: true,
        quest: {
            participantUids: ['sender', 'recipient'],
            targetXp: 3000,
            rewardShards: 10,
            rewardXp: 1000,
        },
    });
    const questId = result.quest.questId;
    expect(docs.get(`friend_quests/${questId}`)).toMatchObject({
        status: 'active',
        weekKey: '2026-W24',
        targetXp: 3000,
        rewardShards: 10,
        rewardXp: 1000,
        startXpByUid: { sender: 1000, recipient: 900 },
    });
    expect(docs.get('users/sender/friend_quest_meta/current')).toMatchObject({ questId, status: 'active' });
    expect(docs.get('users/recipient/friend_quest_meta/current')).toMatchObject({ questId, status: 'active' });
    expect(docs.get('users/sender/friend_quest_weekly/2026-W24')).toMatchObject({ questId });
    expect(docs.get('users/recipient/friend_quest_weekly/2026-W24')).toMatchObject({ questId });
});
test('friendSendGift repairs stale anonymous auth ownership before spending shards', async () => {
    docs.set('users/sender', {
        ...docs.get('users/sender'),
        firebaseAuthUid: 'old-anon-auth',
        anon_merge_claim: { authUid: 'old-anon-auth', at: Date.now() },
    });
    const result = await sendGift();
    expect(result).toMatchObject({ ok: true, senderBalanceAfter: 92 });
    expect(docs.get('users/sender')).toMatchObject({
        firebaseAuthUid: 'auth-sender',
        shards: 92,
    });
    expect(docs.get('auth_links/auth-sender')).toMatchObject({
        stable_id: 'sender',
    });
});
test('friendSendGift replays the same idempotency key without a second spend or gift', async () => {
    const first = await sendGift({ idempotencyKey: 'fg_test_1234567890' });
    const second = await sendGift({ idempotencyKey: 'fg_test_1234567890' });
    expect(first).toMatchObject({
        ok: true,
        senderBalanceAfter: 92,
        idempotencyKey: 'fg_test_1234567890',
    });
    expect(second).toMatchObject({
        ok: true,
        senderBalanceAfter: 92,
        idempotencyKey: 'fg_test_1234567890',
        idempotentReplay: true,
    });
    expect(docs.get('users/sender')).toMatchObject({ shards: 92 });
    expect(docs.get('users/sender/friend_gift_daily_limits/2026-06-12')).toMatchObject({
        totalSent: 1,
        recipients: { recipient: 1 },
    });
    expect(Array.from(docs.keys()).filter(path => path.startsWith('users/sender/friend_gifts_sent/'))).toHaveLength(1);
    expect(Array.from(docs.keys()).filter(path => path.startsWith('users/recipient/friend_gifts_received/'))).toHaveLength(1);
});
test('friendSendGift rejects reusing an idempotency key for a different gift', async () => {
    await sendGift({ idempotencyKey: 'fg_test_1234567890' });
    await expect(sendGift({
        giftId: 'arena_extra_5',
        idempotencyKey: 'fg_test_1234567890',
    })).rejects.toMatchObject({
        code: 'already-exists',
        message: 'Idempotency key already used for another friend gift',
    });
    expect(docs.get('users/sender')).toMatchObject({ shards: 92 });
});
test('friendThankGift replays the same idempotency key without a second thanks event', async () => {
    const first = await thankGift({ idempotencyKey: 'fgt_test_1234567890' });
    const second = await thankGift({ idempotencyKey: 'fgt_test_1234567890' });
    expect(first).toMatchObject({
        ok: true,
        idempotencyKey: 'fgt_test_1234567890',
    });
    expect(second).toMatchObject({
        ok: true,
        idempotencyKey: 'fgt_test_1234567890',
        idempotentReplay: true,
    });
    expect(docs.get('users/sender/friend_gift_thanks_idempotency/fgt_test_1234567890')).toMatchObject({
        senderStableId: 'sender',
        friendStableId: 'recipient',
        giftId: 'chain_shield_1',
    });
    expect(Array.from(docs.keys()).filter(path => path.startsWith('users/recipient/my_events/friend_gift_thanks_'))).toHaveLength(1);
});
test('friendThankGift rejects reusing an idempotency key for another thanks gift', async () => {
    await thankGift({ idempotencyKey: 'fgt_test_1234567890' });
    await expect(thankGift({
        giftId: 'arena_extra_5',
        idempotencyKey: 'fgt_test_1234567890',
    })).rejects.toMatchObject({
        code: 'already-exists',
        message: 'Idempotency key already used for another friend gift thanks',
    });
});
test('friendSendGift does not start another quest while either user has an active quest', async () => {
    docs.set('users/sender/friend_quest_meta/current', {
        questId: 'existing',
        status: 'active',
        expiresAtMs: Date.now() + 3600000,
    });
    const result = await sendGift();
    expect(result).toMatchObject({ ok: true, questStarted: false, questBlockedReason: 'active' });
    expect(Array.from(docs.keys()).filter(path => path.startsWith('friend_quests/'))).toEqual([]);
});
test('friendClaimQuestReward grants both users once when both reached the XP target', async () => {
    const questId = 'quest_sender_recipient_2026-W24';
    docs.set(`friend_quests/${questId}`, {
        questId,
        participantUids: ['sender', 'recipient'],
        status: 'active',
        startedAtMs: Date.now() - 3600000,
        expiresAtMs: Date.now() + 3600000,
        weekKey: '2026-W24',
        targetXp: 3000,
        rewardShards: 10,
        rewardXp: 1000,
        startXpByUid: { sender: 1000, recipient: 900 },
        rewardClaimedByUid: {},
    });
    docs.set('users/sender/friend_quest_meta/current', { questId, status: 'active', expiresAtMs: Date.now() + 3600000 });
    docs.set('users/recipient/friend_quest_meta/current', { questId, status: 'active', expiresAtMs: Date.now() + 3600000 });
    docs.set('users/sender', { ...docs.get('users/sender'), shards: 4, progress: { user_total_xp: '4100' } });
    docs.set('users/recipient', { ...docs.get('users/recipient'), shards: 9, progress: { user_total_xp: '3900' } });
    const { friendClaimQuestReward } = require('./friend_gifts');
    const first = await friendClaimQuestReward({
        auth: { uid: 'auth-sender' },
        data: { stableId: 'sender', questId },
    });
    const second = await friendClaimQuestReward({
        auth: { uid: 'auth-sender' },
        data: { stableId: 'sender', questId },
    });
    expect(first).toMatchObject({
        ok: true,
        questId,
        rewardApplied: true,
        callerShards: 14,
        shardsUpdatedAtMs: new Date('2026-06-12T10:00:00.000Z').getTime(),
        callerXp: 5100,
    });
    expect(second).toMatchObject({
        ok: true,
        questId,
        rewardApplied: false,
        callerShards: 14,
        shardsUpdatedAtMs: new Date('2026-06-12T10:00:00.000Z').getTime(),
        callerXp: 5100,
    });
    expect(docs.get('users/sender')).toMatchObject({ shards: 14, progress: { user_total_xp: '5100' } });
    expect(docs.get('users/recipient')).toMatchObject({ shards: 19, progress: { user_total_xp: '4900' } });
    expect(docs.get(`friend_quests/${questId}`)).toMatchObject({
        status: 'completed',
        rewardClaimedByUid: { sender: true, recipient: true },
    });
});
//# sourceMappingURL=friend_gifts.test.js.map