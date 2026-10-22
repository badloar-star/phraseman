// зачем (владелец 22.10, вопрос 27 «сначала безопасные»; карта b94ddc823 п.2): общая лента app_messages читается из сети
// только когда сервер поднял remote_config/app.numbers.app_messages_feed_rev. Старт без изменений = 0 чтений ленты.
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'account-A'),
}));

jest.mock('../app/config', () => ({
  CLOUD_SYNC_ENABLED: true,
  IS_EXPO_GO: false,
}));

let mockFeedRev = 0;
jest.mock('../app/remote_flags', () => ({
  getRemoteNumber: jest.fn((key: string) => (key === 'app_messages_feed_rev' ? mockFeedRev : 0)),
}));

const mockQueriedPaths: string[] = [];
jest.mock('@react-native-firebase/firestore', () => {
  const db = { __db: true };
  return {
    __esModule: true,
    default: () => db,
    getFirestore: () => db,
    collection: (_db: unknown, ...path: string[]) => ({ path: path.join('/') }),
    orderBy: () => ({}),
    limit: () => ({}),
    query: (collectionRef: { path: string }) => collectionRef,
    getDocs: async (queryRef: { path: string }) => {
      mockQueriedPaths.push(queryRef.path);
      if (queryRef.path === 'app_messages') {
        return { docs: [{ id: 'news-1', data: () => ({ title: 'Новое', body: 'Текст', createdAtMs: 1_000, active: true }) }] };
      }
      return { docs: [] };
    },
  };
});

import {
  APP_MESSAGES_GLOBAL_FEED_MAX_AGE_MS,
  decideAppMessagesGlobalFeedReuse,
  refreshAppMessagesSnapshotOnce,
} from '../app/app_messages';

const feedReads = () => mockQueriedPaths.filter((path) => path === 'app_messages').length;

describe('общая лента сообщений по версии из remote_config/app', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockQueriedPaths.length = 0;
    mockFeedRev = 0;
  });

  it('старт без изменений версии = 0 чтений ленты, лента берётся из копии на телефоне', async () => {
    mockFeedRev = 5_000;
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 10_000 });
    expect(feedReads()).toBe(1);

    const again = await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 20_000 });
    expect(feedReads()).toBe(1);
    expect(again.messages.map((message) => message.id)).toContain('news-1');
    // Личные сообщения и состояния по-прежнему читаются (их версия — следующий шаг, users/{uid}.inboxRev).
    expect(mockQueriedPaths.filter((path) => path.startsWith('users/account-A/')).length).toBeGreaterThan(0);
  });

  it('версия выросла → один перечит ленты', async () => {
    mockFeedRev = 5_000;
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 10_000 });
    mockFeedRev = 6_000;
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 20_000 });
    expect(feedReads()).toBe(2);
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 30_000 });
    expect(feedReads()).toBe(2);
  });

  it('сервер версию не пишет (0) → лента читается как раньше, копия не сохраняется', async () => {
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 10_000 });
    await refreshAppMessagesSnapshotOnce({ force: true, nowMs: 20_000 });
    expect(feedReads()).toBe(2);
    expect(await AsyncStorage.getItem('global_news_feed_copy_v1')).toBeNull();
  });

  it('решение: страховка 7 дней и причины', () => {
    const stored = { rev: 7, fetchedAtMs: 0, messages: [] };
    expect(decideAppMessagesGlobalFeedReuse({ remoteRev: 0, stored, nowMs: 1 }).reason).toBe('no_remote_rev');
    expect(decideAppMessagesGlobalFeedReuse({ remoteRev: 7, stored: null, nowMs: 1 }).reason).toBe('no_local_copy');
    expect(decideAppMessagesGlobalFeedReuse({ remoteRev: 8, stored, nowMs: 1 }).reason).toBe('rev_changed');
    expect(decideAppMessagesGlobalFeedReuse({ remoteRev: 7, stored, nowMs: 1 }).reuse).toBe(true);
    expect(decideAppMessagesGlobalFeedReuse({ remoteRev: 7, stored, nowMs: APP_MESSAGES_GLOBAL_FEED_MAX_AGE_MS }).reason)
      .toBe('max_age');
  });
});
