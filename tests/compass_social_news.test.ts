/**
 * compass_social_news — сбор соц-сводки + анти-повтор.
 *
 * Firestore мокаем ИНЛАЙН (не общий __mocks__-стаб, он заточен под shards),
 * чтобы точно управлять снимками friend_requests / friends / leaderboard.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOW = 1_700_000_000_000;

// Управляемое состояние Firestore для теста.
type DocData = Record<string, unknown>;
type Snap = { docs: Array<{ id: string; data: () => DocData }> };
const state: {
  requests: Array<{ id: string; data: DocData }>;
  friends: Array<{ id: string; data: DocData }>;
  leaderboard: Record<string, DocData>;
} = { requests: [], friends: [], leaderboard: {} };

function makeSnap(rows: Array<{ id: string; data: DocData }>): Snap {
  return { docs: rows.map(r => ({ id: r.id, data: () => r.data })) };
}

jest.mock('../app/config', () => ({ CLOUD_SYNC_ENABLED: true, IS_EXPO_GO: false }));
jest.mock('../app/user_id_policy', () => ({
  getCanonicalUserId: jest.fn(async () => 'me'),
}));

jest.mock('@react-native-firebase/firestore', () => {
  const docRef = (path: string) => ({
    __path: path,
    collection: (sub: string) => collRef(`${path}/${sub}`),
    get: async () => {
      // leaderboard/{uid}
      const m = /^leaderboard\/(.+)$/.exec(path);
      if (m) {
        const d = state.leaderboard[m[1]];
        return d ? { exists: true, data: () => d } : { exists: false, data: () => ({}) };
      }
      return { exists: false, data: () => ({}) };
    },
  });
  const collRef = (path: string) => ({
    __path: path,
    doc: (id: string) => docRef(`${path}/${id}`),
    limit: () => ({
      get: async () => {
        if (/users\/me\/friend_requests$/.test(path)) return makeSnap(state.requests);
        if (/users\/me\/friends$/.test(path)) return makeSnap(state.friends);
        return makeSnap([]);
      },
    }),
    get: async () => {
      if (/users\/me\/friends$/.test(path)) return makeSnap(state.friends);
      return makeSnap([]);
    },
  });
  const firestore = () => ({ collection: (name: string) => collRef(name) });
  firestore.default = firestore;
  return firestore;
});

const likesReceivedMock = jest.fn(
  async (_limit?: number) => [] as Array<{ id: string; fromName: string; ts: number }>,
);
jest.mock('../app/friend_activity_likes', () => ({
  fetchActivityLikesReceived: (limit?: number) => likesReceivedMock(limit),
}));

async function load() {
  return import('../app/compass/compass_social_news');
}

describe('compass_social_news — сбор соц-сводки', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    state.requests = [];
    state.friends = [];
    state.leaderboard = {};
    likesReceivedMock.mockResolvedValue([]);
  });

  it('пустое состояние → пустая сводка', async () => {
    const { collectCompassSocialNews } = await load();
    const news = await collectCompassSocialNews('ru', NOW);
    expect(news.lines).toEqual([]);
    expect(news.events).toEqual([]);
  });

  it('входящая заявка → строка «хочет добавить тебя в друзья» с именем из leaderboard', async () => {
    state.requests = [{ id: 'bob', data: { status: 'pending', createdAt: NOW - 1000 } }];
    state.leaderboard = { bob: { name: 'Боб' } };
    const { collectCompassSocialNews } = await load();
    const news = await collectCompassSocialNews('ru', NOW);
    expect(news.events).toHaveLength(1);
    expect(news.lines[0]).toContain('Боб');
    expect(news.lines[0]).toMatch(/друзья/);
  });

  it('новый друг с маркером acceptedAt → «принял твою заявку»', async () => {
    state.friends = [{ id: 'kate', data: { createdAt: NOW - 5000, acceptedAt: NOW - 5000 } }];
    state.leaderboard = { kate: { displayName: 'Катя' } };
    const { collectCompassSocialNews } = await load();
    const news = await collectCompassSocialNews('ru', NOW);
    expect(news.events.some(e => e.kind === 'friend_accepted')).toBe(true);
    expect(news.lines.some(l => l.includes('Катя') && /заявк/.test(l))).toBe(true);
  });

  it('новый друг БЕЗ acceptedAt (я принял входящую) → нейтральное «теперь вы друзья»', async () => {
    state.friends = [{ id: 'sam', data: { createdAt: NOW - 5000 } }];
    state.leaderboard = { sam: { name: 'Сэм' } };
    const { collectCompassSocialNews } = await load();
    const news = await collectCompassSocialNews('ru', NOW);
    expect(news.events.some(e => e.kind === 'friend_added')).toBe(true);
    expect(news.lines.some(l => l.includes('Сэм') && /друз/.test(l))).toBe(true);
  });

  it('лайк → строка «поставил тебе лайк», имя берётся из лайка (без leaderboard)', async () => {
    likesReceivedMock.mockResolvedValue([{ id: 'like1', fromName: 'Лена', ts: NOW - 2000 }]);
    const { collectCompassSocialNews } = await load();
    const news = await collectCompassSocialNews('ru', NOW);
    expect(news.lines.some(l => l.includes('Лена') && /лайк/.test(l))).toBe(true);
  });

  it('заявка от того, кто УЖЕ друг → отбрасывается (мусор после accept)', async () => {
    state.requests = [{ id: 'bob', data: { status: 'pending', createdAt: NOW - 1000 } }];
    state.friends = [{ id: 'bob', data: { createdAt: NOW - 1000 } }];
    state.leaderboard = { bob: { name: 'Боб' } };
    const { collectCompassSocialNews } = await load();
    const news = await collectCompassSocialNews('ru', NOW);
    // Заявка-дубль отброшена; остаётся только событие «новый друг» (без acceptedAt).
    expect(news.events.every(e => e.kind !== 'friend_request')).toBe(true);
    expect(news.events.some(e => e.kind === 'friend_added')).toBe(true);
  });

  it('старше окна свежести → не показывается', async () => {
    const old = NOW - 30 * 24 * 60 * 60 * 1000; // 30 дней назад
    state.requests = [{ id: 'bob', data: { status: 'pending', createdAt: old } }];
    state.leaderboard = { bob: { name: 'Боб' } };
    const { collectCompassSocialNews } = await load();
    const news = await collectCompassSocialNews('ru', NOW);
    expect(news.events).toHaveLength(0);
  });

  it('анти-повтор: после markSocialNewsSeen то же событие больше не всплывает', async () => {
    state.requests = [{ id: 'bob', data: { status: 'pending', createdAt: NOW - 1000 } }];
    state.leaderboard = { bob: { name: 'Боб' } };
    const { collectCompassSocialNews, markSocialNewsSeen } = await load();

    const first = await collectCompassSocialNews('ru', NOW);
    expect(first.events).toHaveLength(1);

    await markSocialNewsSeen(first.events);

    const second = await collectCompassSocialNews('ru', NOW);
    expect(second.events).toHaveLength(0);
    expect(second.lines).toEqual([]);
  });

  it('много событий одного типа → не более 3 строк, остаток сворачивается в «и ещё N»', async () => {
    state.friends = Array.from({ length: 6 }, (_, i) => ({
      id: `f${i}`,
      data: { createdAt: NOW - i * 1000 },
    }));
    for (let i = 0; i < 6; i++) state.leaderboard[`f${i}`] = { name: `Друг${i}` };
    const { collectCompassSocialNews } = await load();
    const news = await collectCompassSocialNews('ru', NOW);
    expect(news.lines.length).toBeLessThanOrEqual(3);
    // Все 6 событий собраны (для markSeen), но строк ≤3.
    expect(news.events.length).toBe(6);
    expect(news.allLines).toHaveLength(6);
    expect(news.lines[news.lines.length - 1]).toMatch(/ещё\s+3/);
    expect(news.allLines[news.allLines.length - 1]).not.toMatch(/ещё\s+\d+/);
  });

  it('Expo Go / cloud off → пустая сводка без чтения', async () => {
    jest.resetModules();
    jest.doMock('../app/config', () => ({ CLOUD_SYNC_ENABLED: false, IS_EXPO_GO: true }));
    const mod = await import('../app/compass/compass_social_news');
    const news = await mod.collectCompassSocialNews('ru', NOW);
    expect(news.events).toEqual([]);
    jest.dontMock('../app/config');
  });
});
