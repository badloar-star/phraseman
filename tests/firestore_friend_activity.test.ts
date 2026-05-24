import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchFriendsActivityFeed, invalidateFriendsActivityCache } from '../app/firestore_friend_activity';

type MockEventDoc = {
  id: string;
  data: () => Record<string, unknown>;
};

const mockEventsByUid = new Map<string, MockEventDoc[]>();

jest.mock('@react-native-firebase/firestore', () => {
  const firestore: any = jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn((uid: string) => ({
        collection: jest.fn(() => {
          const query: any = {};
          query.orderBy = jest.fn(() => query);
          query.limit = jest.fn(() => query);
          query.get = jest.fn(async () => ({ docs: mockEventsByUid.get(uid) ?? [] }));
          return query;
        }),
      })),
    })),
  }));
  firestore.default = firestore;
  return firestore;
});

beforeEach(() => {
  mockEventsByUid.clear();
  (AsyncStorage as any).__reset?.();
  jest.clearAllMocks();
});

describe('fetchFriendsActivityFeed', () => {
  it('uses the queried friend uid as owner for legacy events with stale uid fields', async () => {
    mockEventsByUid.set('stable-friend', [
      {
        id: 'level_up_3',
        data: () => ({
          uid: 'legacy-auth-friend',
          type: 'level_up',
          ts: 1_700_000_000_000,
          activityLikeCount: 2,
          payload: { level: 3 },
        }),
      },
    ]);

    const events = await fetchFriendsActivityFeed(['stable-friend'], true);

    expect(events).toEqual([
      {
        id: 'level_up_3',
        uid: 'stable-friend',
        type: 'level_up',
        ts: 1_700_000_000_000,
        activityLikeCount: 2,
        payload: { level: 3 },
      },
    ]);
  });

  it('invalidates both current and legacy activity feed caches', async () => {
    await invalidateFriendsActivityCache();

    expect(AsyncStorage.multiRemove).toHaveBeenCalledWith([
      'friends_activity_feed_v2',
      'friends_activity_feed_v1',
    ]);
  });
});
