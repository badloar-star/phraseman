/**
 * зачем (PM-252 п.7, Firebase-экономия): каталог маркета наборов читал 100–200 документов
 * (7 запросов) на КАЖДОМ холодном запуске — кэш жил только в памяти процесса. Теперь:
 *  - копия на диске (TTL 6 ч) отдаёт каталог без сети после перезапуска;
 *  - одновременные вызовы (хаб, витрина, прогрев) делают ОДИН сетевой проход;
 *  - отказ сети отдаёт копию с диска любого возраста вместо пустого маркета.
 */
(globalThis as { __DEV__?: boolean }).__DEV__ = false;
const disk = new Map<string, string>();
const asyncStorageMock = {
  getItem: jest.fn(async (key: string) => disk.get(key) ?? null),
  setItem: jest.fn(async (key: string, value: string) => { disk.set(key, value); }),
  getAllKeys: jest.fn(async () => [...disk.keys()]),
  multiRemove: jest.fn(async (keys: string[]) => { keys.forEach((k) => disk.delete(k)); }),
};

let networkGets = 0;
let networkFails = false;
function makeQuery(): Record<string, unknown> {
  const query: Record<string, unknown> = {};
  query.where = () => query;
  query.limit = () => query;
  query.get = async () => {
    networkGets += 1;
    await Promise.resolve();
    if (networkFails) throw new Error('unavailable');
    return { docs: [] };
  };
  return query;
}

function loadModule(): typeof import('../app/community_packs/communityFirestore') {
  let mod!: typeof import('../app/community_packs/communityFirestore');
  jest.isolateModules(() => {
    jest.doMock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: asyncStorageMock }));
    jest.doMock('@react-native-firebase/firestore', () => ({ __esModule: true, default: () => ({ collection: () => makeQuery() }) }));
    jest.doMock('../app/config', () => ({ IS_EXPO_GO: false, CLOUD_SYNC_ENABLED: true }));
    jest.doMock('../app/community_packs/functionsClient', () => ({
      callCommunityFetchPackCardsIfAccessible: jest.fn(),
      isCommunityPacksCloudEnabled: () => true,
    }));
    mod = require('../app/community_packs/communityFirestore');
  });
  return mod;
}

const COMMUNITY_QUERIES = 7; // 6 языковых корзин + общий запрос
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  disk.clear();
  networkGets = 0;
  networkFails = false;
});

describe('каталог маркета: диск и дедуп', () => {
  test('после «перезапуска» каталог приходит с диска без единого запроса', async () => {
    const first = loadModule();
    await first.loadPublishedCommunityMarketPacks('en');
    expect(networkGets).toBe(COMMUNITY_QUERIES);
    await flush();
    expect([...disk.keys()]).toContain(`${first.COMMUNITY_CATALOG_DISK_PREFIX}community:en`);

    const coldStart = loadModule(); // новый процесс: память пуста
    networkGets = 0;
    await coldStart.loadPublishedCommunityMarketPacks('en');
    expect(networkGets).toBe(0);
  });

  test('протухшая копия (старше 24 ч) идёт в сеть', async () => {
    const mod = loadModule();
    disk.set(`${mod.COMMUNITY_CATALOG_DISK_PREFIX}community:en`, JSON.stringify({ at: Date.now() - 25 * 3600_000, packs: [] }));
    await mod.loadPublishedCommunityMarketPacks('en');
    expect(networkGets).toBe(COMMUNITY_QUERIES);
  });

  test('одновременные вызовы на холодном старте — один сетевой проход', async () => {
    const mod = loadModule();
    await Promise.all([
      mod.loadPublishedCommunityMarketPacks('en'),
      mod.loadPublishedCommunityMarketPacks('en'),
      mod.loadPublishedCommunityMarketPacks('en'),
    ]);
    expect(networkGets).toBe(COMMUNITY_QUERIES);
  });

  test('отказ сети отдаёт копию с диска любого возраста', async () => {
    const mod = loadModule();
    const stale = [{ id: 'pack-1' }];
    disk.set(`${mod.COMMUNITY_CATALOG_DISK_PREFIX}community:en`, JSON.stringify({ at: Date.now() - 48 * 3600_000, packs: stale }));
    networkFails = true;
    await expect(mod.loadPublishedCommunityMarketPacks('en')).resolves.toEqual(stale);
  });

  test('сброс каталога после публикации стирает и копию на диске', async () => {
    const mod = loadModule();
    await mod.loadPublishedCommunityMarketPacks('en');
    await flush();
    mod.invalidateCommunityPackCatalog();
    await flush();
    await flush();
    expect([...disk.keys()].some((k) => k.startsWith(`${mod.COMMUNITY_CATALOG_DISK_PREFIX}community:`))).toBe(false);
  });

  test('«Из видео»: диск после перезапуска, один запрос на одновременные вызовы', async () => {
    const first = loadModule();
    await Promise.all([first.loadVideoMarketPacks('en'), first.loadVideoMarketPacks('en')]);
    expect(networkGets).toBe(1);
    await flush();
    const coldStart = loadModule();
    networkGets = 0;
    await coldStart.loadVideoMarketPacks('en');
    expect(networkGets).toBe(0);
  });
});

// R31 (Ревизор 15.10): удалённый набор висел в «Из видео» до 6 ч — удаление чистило только кэш сообщества.
describe('удаление набора вычёркивает его из «Из видео» без лишнего запроса', () => {
  test('память и диск без удалённого набора, сеть не трогали', async () => {
    const mod = loadModule();
    const key = `${mod.COMMUNITY_CATALOG_DISK_PREFIX}video:en`;
    disk.set(key, JSON.stringify({ at: Date.now(), packs: [{ id: 'gone', videoId: 'v1' }, { id: 'kept', videoId: 'v2' }] }));
    await mod.loadVideoMarketPacks('en');
    networkGets = 0;
    mod.dropPacksFromVideoCatalog(['gone']);
    expect((mod.peekVideoMarketPacks('en') ?? []).map((pack) => pack.id)).toEqual(['kept']);
    await flush();
    expect((JSON.parse(String(disk.get(key))) as { packs: { id: string }[] }).packs.map((pack) => pack.id)).toEqual(['kept']);
    expect(networkGets).toBe(0);
  });
});

