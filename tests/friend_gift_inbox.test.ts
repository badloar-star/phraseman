let docs: Array<{ id: string; data: Record<string, unknown>; ref: { path: string } }>;
let batchWrites: Array<{ path: string; data: Record<string, unknown> }>;
let stableUid: string | null;
const mockStorage: Record<string, string> = {};
let userData: Record<string, unknown>;
let generation = 1;
const operationOrder: string[] = [];

function buildQuery(filters: Array<[string, unknown]> = []) {
  return {
    where: (field: string, _op: string, value: unknown) => buildQuery([...filters, [field, value]]),
    limit: () => buildQuery(filters),
    get: async () => {
      const matched = docs.filter(doc => filters.every(([field, value]) => doc.data[field] === value));
      return {
        empty: matched.length === 0,
        docs: matched.map(doc => ({
          id: doc.id,
          ref: doc.ref,
          data: () => doc.data,
        })),
      };
    },
  };
}

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/cloud_sync', () => ({
  ensureAnonUser: jest.fn(async () => stableUid),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: jest.fn(() => ({ generation, stableId: stableUid, phase: 'active' })),
  isCurrentAccountGeneration: jest.fn((token: { generation: number; stableId: string | null }, expected?: string) => (
    token.generation === generation && token.stableId === stableUid && (!expected || expected === stableUid)
  )),
  withAccountTransitionLock: jest.fn(async (work: () => Promise<unknown>) => work()),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    operationOrder.push(`storage:${key}`);
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve(Object.keys(mockStorage))),
  multiSet: jest.fn((pairs: Array<[string, string]>) => {
    for (const [key, value] of pairs) {
      operationOrder.push(`storage:${key}`);
      mockStorage[key] = value;
    }
    return Promise.resolve();
  }),
  multiGet: jest.fn((keys: string[]) => Promise.resolve(keys.map((key) => [key, mockStorage[key] ?? null]))),
  multiRemove: jest.fn((keys: string[]) => {
    for (const key of keys) delete mockStorage[key];
    return Promise.resolve();
  }),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  default: jest.fn(() => ({
    collection: (collectionName: string) => ({
      doc: (uid: string) => ({
        get: async () => ({ exists: true, data: () => userData }),
        collection: (subCollectionName: string) => {
          if (collectionName !== 'users' || uid !== stableUid || subCollectionName !== 'shard_rewards') {
            throw new Error(`unexpected path ${collectionName}/${uid}/${subCollectionName}`);
          }
          return buildQuery();
        },
      }),
    }),
    batch: () => ({
      set: (ref: { path: string }, data: Record<string, unknown>) => {
        batchWrites.push({ path: ref.path, data });
      },
      commit: async () => { operationOrder.push('seen:commit'); },
    }),
  })),
}));

beforeEach(() => {
  jest.resetModules();
  stableUid = 'stable-me';
  generation = 1;
  batchWrites = [];
  operationOrder.length = 0;
  userData = {
    chain_shield: JSON.stringify({ daysLeft: 2, grantedAt: '2026-05-25' }),
    gift_xp_multiplier: JSON.stringify({ multiplier: 2, expiresAt: 1_900_000_000_000 }),
  };
  Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  docs = [
    {
      id: 'gift-old',
      ref: { path: 'users/stable-me/shard_rewards/gift-old' },
      data: {
        reason: 'friend_gift',
        seen: false,
        rewardType: 'arena_extra_5',
        giftLabelRu: '+5 рейтинг-игр',
        fromUid: 'friend-1',
        fromName: 'Adi',
        ts: '2026-05-25T10:00:00.000Z',
      },
    },
    {
      id: 'gift-new',
      ref: { path: 'users/stable-me/shard_rewards/gift-new' },
      data: {
        reason: 'friend_gift',
        seen: false,
        rewardType: 'chain_shield_1',
        giftLabelRu: 'Щит цепочки',
        fromUid: 'friend-2',
        fromName: 'Mia',
        ts: '2026-05-25T11:00:00.000Z',
      },
    },
    {
      id: 'already-seen',
      ref: { path: 'users/stable-me/shard_rewards/already-seen' },
      data: {
        reason: 'friend_gift',
        seen: true,
        rewardType: 'xp_boost_2x_24h',
        fromUid: 'friend-3',
        fromName: 'Seen',
        ts: '2026-05-25T12:00:00.000Z',
      },
    },
  ];
});

test('claimUnseenFriendGifts returns unseen friend gifts newest first and marks them seen', async () => {
  const { claimUnseenFriendGifts } = require('../app/friend_gift_inbox');

  const gifts = await claimUnseenFriendGifts();

  expect(gifts.map((gift: { id: string }) => gift.id)).toEqual(['gift-new', 'gift-old']);
  expect(gifts[0]).toMatchObject({
    giftId: 'chain_shield_1',
    giftLabelRu: 'Щит цепочки',
    fromUid: 'friend-2',
    fromName: 'Mia',
  });
  expect(batchWrites.map(write => write.path).sort()).toEqual([
    'users/stable-me/shard_rewards/gift-new',
    'users/stable-me/shard_rewards/gift-old',
  ]);
  expect(batchWrites.every(write => write.data.seen === true && typeof write.data.seenAt === 'number')).toBe(true);
  const { friendGiftInventoryKey } = require('../app/friend_gift_inventory');
  const inventoryKey = friendGiftInventoryKey({ generation: 1, stableId: 'stable-me', phase: 'active' });
  const saved = JSON.parse(mockStorage[inventoryKey]);
  expect(saved.map((gift: { id: string }) => gift.id)).toEqual(['gift-new', 'gift-old']);
  expect(saved[0]).toMatchObject({
    giftId: 'chain_shield_1',
    fromUid: 'friend-2',
    fromName: 'Mia',
  });
  expect(typeof saved[0].savedAt).toBe('number');
  expect(JSON.parse(mockStorage.chain_shield)).toMatchObject({ daysLeft: 2 });
  expect(JSON.parse(mockStorage.gift_xp_multiplier)).toMatchObject({ multiplier: 2 });
  expect(operationOrder.indexOf(`storage:${inventoryKey}`)).toBeLessThan(operationOrder.indexOf('seen:commit'));
  expect(operationOrder.indexOf('storage:chain_shield')).toBeLessThan(operationOrder.indexOf('seen:commit'));
});

test('friend gift inventory survives A to B to A generations without leaking into B', async () => {
  const { claimUnseenFriendGifts } = require('../app/friend_gift_inbox');
  const {
    friendGiftInventoryKey,
    loadStoredFriendGiftInventory,
  } = require('../app/friend_gift_inventory');
  const giftNow = Date.parse('2026-05-25T11:05:00.000Z');

  await claimUnseenFriendGifts();
  const aKeyAtReceive = friendGiftInventoryKey({ generation: 1, stableId: 'stable-me', phase: 'active' });

  stableUid = 'stable-b';
  generation = 2;
  await expect(loadStoredFriendGiftInventory(giftNow)).resolves.toEqual([]);

  stableUid = 'stable-me';
  generation = 3;
  const aKeyAfterReturn = friendGiftInventoryKey({ generation: 3, stableId: 'stable-me', phase: 'active' });
  expect(aKeyAfterReturn).toBe(aKeyAtReceive);
  await expect(loadStoredFriendGiftInventory(giftNow)).resolves.toEqual([
    expect.objectContaining({ id: 'gift-new' }),
    expect.objectContaining({ id: 'gift-old' }),
  ]);
});

test('migrates legacy generation-scoped inventory keys only for the current stable UID', async () => {
  const {
    friendGiftInventoryKey,
    loadStoredFriendGiftInventory,
  } = require('../app/friend_gift_inventory');
  const legacyAKey = 'friend_gift_inventory_v1::generation:7:uid:stable-me';
  const legacyBKey = 'friend_gift_inventory_v1::generation:8:uid:stable-b';
  const giftNow = Date.parse('2026-05-25T11:05:00.000Z');
  mockStorage[legacyAKey] = JSON.stringify([{
    id: 'legacy-a', giftId: 'chain_shield_1', giftLabel: 'Shield', fromUid: 'friend-a',
    fromName: 'Ada', ts: giftNow - 1000, savedAt: giftNow - 1000,
  }]);
  mockStorage[legacyBKey] = JSON.stringify([{
    id: 'legacy-b', giftId: 'chain_shield_1', giftLabel: 'Shield', fromUid: 'friend-b',
    fromName: 'Bea', ts: giftNow - 1000, savedAt: giftNow - 1000,
  }]);

  await expect(loadStoredFriendGiftInventory(giftNow)).resolves.toEqual([
    expect.objectContaining({ id: 'legacy-a' }),
  ]);
  expect(mockStorage[friendGiftInventoryKey({ generation, stableId: stableUid, phase: 'active' })]).toContain('legacy-a');
  expect(mockStorage[legacyAKey]).toBeUndefined();
  expect(mockStorage[legacyBKey]).toContain('legacy-b');
});

test('claimUnseenFriendGifts leaves gifts unseen when account generation changes during hydration', async () => {
  const storage = require('@react-native-async-storage/async-storage');
  storage.multiSet.mockImplementationOnce(async (pairs: Array<[string, string]>) => {
    for (const [key, value] of pairs) mockStorage[key] = value;
    generation = 2;
  });
  const { claimUnseenFriendGifts } = require('../app/friend_gift_inbox');

  await expect(claimUnseenFriendGifts()).rejects.toThrow('friend_gift_identity_changed');
  expect(operationOrder).not.toContain('seen:commit');
  expect(mockStorage.chain_shield).toBeUndefined();
  expect(mockStorage.gift_xp_multiplier).toBeUndefined();
});

test('claimUnseenFriendGifts is quiet when stable user is unavailable', async () => {
  stableUid = null;
  const { claimUnseenFriendGifts } = require('../app/friend_gift_inbox');

  await expect(claimUnseenFriendGifts()).resolves.toEqual([]);
  expect(batchWrites).toEqual([]);
});

test('friends tab has an explicit received gift modal contract', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'friends.tsx'), 'utf8');

  expect(source).toContain('friend-gift-received-modal');
  expect(source).toContain('friend-gift-received-card');
  expect(source).toContain('friend-gift-received-open-inventory');
  expect(source).toContain('friend-gift-received-ok');
  expect(source).toContain('friend-gift-reply-thanks');
  expect(source).toContain('friend-gift-reply-shield');
  expect(source).toContain('friend-gift-reply-boost');
  expect(source).toContain('Сохранено в разделе «Подарки»');
  expect(source).toContain('friends-feedback');
  expect(source).toContain('friend-gift-feedback');
  expect(source).toContain('friend-gift-rank-');
  expect(source).toContain('setIncomingGiftModal({ gifts })');
});

test('friends tab confirms successfully sent gifts explicitly', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'friends.tsx'), 'utf8');

  expect(source).toContain('sentGiftReceipt');
  expect(source).toContain('setSentGiftReceipt({');
  expect(source).toContain('friend-gift-sent-modal');
  expect(source).toContain('friend-gift-sent-card');
  expect(source).toContain('friend-gift-sent-ok');
  expect(source).toContain("emitAppEvent('action_toast'");
});

test('friends tab renders the active friend quest progress contract', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'friends.tsx'), 'utf8');

  expect(source).toContain('friend-quest-card');
  expect(source).toContain('friend-quest-my-progress');
  expect(source).toContain('friend-quest-friend-progress');
  expect(source).toContain('friend-quest-claim');
  expect(source).toContain('FriendQuestStartedModal');
  expect(source).toContain('FriendQuestCompletedModal');
});

test('global friend gift poll timestamp is account scoped and guarded against stale generations', () => {
  const fs = require('fs');
  const path = require('path');
  const source = fs.readFileSync(path.join(process.cwd(), 'components', 'GlobalFriendGiftHost.tsx'), 'utf8');

  expect(source).toContain('accountScopeKey(');
  expect(source).toContain('isCurrentAccountGeneration(');
  expect(source).toContain('`${LAST_POLL_KEY}::${scope}`');
});
