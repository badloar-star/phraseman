let docs: Array<{ id: string; data: Record<string, unknown>; ref: { path: string } }>;
let batchWrites: Array<{ path: string; data: Record<string, unknown> }>;
let stableUid: string | null;
const mockStorage: Record<string, string> = {};

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
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key] ?? null)),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
}));
jest.mock('@react-native-firebase/firestore', () => ({
  default: jest.fn(() => ({
    collection: (collectionName: string) => ({
      doc: (uid: string) => ({
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
      commit: async () => undefined,
    }),
  })),
}));

beforeEach(() => {
  jest.resetModules();
  stableUid = 'stable-me';
  batchWrites = [];
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
  const { FRIEND_GIFT_INVENTORY_KEY } = require('../app/friend_gift_inventory');
  const saved = JSON.parse(mockStorage[FRIEND_GIFT_INVENTORY_KEY]);
  expect(saved.map((gift: { id: string }) => gift.id)).toEqual(['gift-new', 'gift-old']);
  expect(saved[0]).toMatchObject({
    giftId: 'chain_shield_1',
    fromUid: 'friend-2',
    fromName: 'Mia',
  });
  expect(typeof saved[0].savedAt).toBe('number');
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
