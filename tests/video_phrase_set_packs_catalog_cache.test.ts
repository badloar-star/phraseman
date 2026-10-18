// зачем (смета Firebase 13.10, п. 3; координатор): обновление «Из видео» раз в 6 ч не перечитывает каталог каналов, пока не сменилась его версия.
// Проверяем: та же версия — каналы не читаются и названия берутся из копии (в том числе у ролика, чей набор фраз появился позже каталога);
// версия сменилась — каналы читаются и копия обновляется; сбой канала/манифеста не стирает хорошие названия, а версию в копию не пишет.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));
jest.mock('../app/youtube_catalog_client', () => ({
  fetchYoutubeCatalogManifest: jest.fn(),
  fetchYoutubeVideoIndex: jest.fn(),
}));

let setsDocs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => ({
    collection: () => ({ where: () => ({ limit: () => ({ get: async () => ({ docs: setsDocs }) }) }) }),
  }),
}));

const CACHE_KEY = 'video_phrase_set_packs_cache_v2';
// перепин 18.10 (координатор): TTL каталога «Из видео» поднят 6 → 24 ч (db44eece1, расходы 17.10; VIDEO_PHRASE_SET_PACKS_TTL_MS).
// «Устаревшая копия» должна быть старше TTL — 25 ч; 7 ч теперь свежая копия, и загрузка законно пропускалась (ttl_not_expired).
const OLDER_THAN_TTL = 25 * 60 * 60 * 1000;
const VIDEO_A = 'aaaaaaaaaaa';
const VIDEO_B = 'bbbbbbbbbbb';

const setDoc = (videoId: string, count: number) => ({ id: videoId, data: () => ({ videoId, activePhraseCount: count, publishedAtMs: 1 }) });
const manifest = (version: string) => ({ activeVersion: version, channels: [{ id: 'ch_en', languageTags: ['en'] }] });
const video = (id: string, title: string, durationSec = 60) => ({ id, title, durationSec, channelId: 'ch_en' });

type Harness = {
  mod: typeof import('../app/video_phrase_set_packs');
  client: { fetchYoutubeCatalogManifest: jest.Mock; fetchYoutubeVideoIndex: jest.Mock };
  storage: { setItem: (k: string, v: string) => Promise<void>; getItem: (k: string) => Promise<string | null> };
};

async function boot(seed?: unknown): Promise<Harness> {
  jest.resetModules();
  const asyncStorageModule = require('@react-native-async-storage/async-storage');
  const storage = (asyncStorageModule.default ?? asyncStorageModule) as Harness['storage'];
  if (seed) await storage.setItem(CACHE_KEY, JSON.stringify(seed));
  return {
    mod: require('../app/video_phrase_set_packs'),
    client: require('../app/youtube_catalog_client'),
    storage,
  };
}

const staleCache = (extra: Record<string, unknown>) => ({
  savedAtMs: Date.now() - OLDER_THAN_TTL,
  packs: [],
  ...extra,
});

describe('«Из видео»: версия каталога и копия рядом с наборами', () => {
  beforeEach(() => { setsDocs = [setDoc(VIDEO_A, 5)]; });

  it('нет копии → каналы читаются, копия получает версию и строки каталога', async () => {
    const h = await boot();
    h.client.fetchYoutubeCatalogManifest.mockResolvedValue(manifest('v1'));
    h.client.fetchYoutubeVideoIndex.mockResolvedValue([{ channelId: 'ch_en', videos: [video(VIDEO_A, 'Title A', 612)] }]);
    const packs = await h.mod.loadVideoPhraseSetPacks();
    expect(h.client.fetchYoutubeVideoIndex).toHaveBeenCalledTimes(1);
    expect(packs[0].titleRu).toBe('Title A');
    expect(packs[0].videoDurationSec).toBe(612);
    const saved = JSON.parse((await h.storage.getItem(CACHE_KEY)) as string);
    expect(saved.catalogVersion).toBe('v1');
    expect(saved.catalog).toEqual([[VIDEO_A, 'Title A', 'ch_en', 'en', 612]]);
  });

  it('та же версия → каналы не читаются; название берётся из копии, в том числе у ролика, набор которого появился позже', async () => {
    const h = await boot(staleCache({
      catalogVersion: 'v1',
      catalog: [[VIDEO_A, 'Title A', 'ch_en', 'en', 0], [VIDEO_B, 'Title B', 'ch_en', 'en', 90]],
    }));
    setsDocs = [setDoc(VIDEO_A, 5), setDoc(VIDEO_B, 7)];
    h.client.fetchYoutubeCatalogManifest.mockResolvedValue(manifest('v1'));
    const packs = await h.mod.loadVideoPhraseSetPacks();
    expect(h.client.fetchYoutubeVideoIndex).not.toHaveBeenCalled();
    const byId = Object.fromEntries(packs.map((p) => [p.videoId, p]));
    expect(byId[VIDEO_B].titleRu).toBe('Title B');
    expect(byId[VIDEO_B].videoDurationSec).toBe(90);
    expect(byId[VIDEO_A].titleRu).toBe('Title A');
    expect(byId[VIDEO_A]).not.toHaveProperty('videoDurationSec');
  });

  it('версия сменилась → каналы читаются заново, копия обновляется', async () => {
    const h = await boot(staleCache({ catalogVersion: 'v1', catalog: [[VIDEO_A, 'Old', 'ch_en', 'en', 0]] }));
    h.client.fetchYoutubeCatalogManifest.mockResolvedValue(manifest('v2'));
    h.client.fetchYoutubeVideoIndex.mockResolvedValue([{ channelId: 'ch_en', videos: [video(VIDEO_A, 'New title')] }]);
    const packs = await h.mod.loadVideoPhraseSetPacks();
    expect(h.client.fetchYoutubeVideoIndex).toHaveBeenCalledTimes(1);
    expect(packs[0].titleRu).toBe('New title');
    const saved = JSON.parse((await h.storage.getItem(CACHE_KEY)) as string);
    expect(saved.catalogVersion).toBe('v2');
  });

  it('сбой канала → строки канала остаются из копии, версия в копию НЕ пишется (следующий заход пройдёт заново)', async () => {
    const h = await boot(staleCache({ catalogVersion: 'v1', catalog: [[VIDEO_A, 'Kept title', 'ch_en', 'en', 0]] }));
    h.client.fetchYoutubeCatalogManifest.mockResolvedValue(manifest('v2'));
    h.client.fetchYoutubeVideoIndex.mockResolvedValue([{ channelId: 'ch_en', videos: [], error: 'boom' }]);
    const packs = await h.mod.loadVideoPhraseSetPacks();
    expect(packs[0].titleRu).toBe('Kept title');
    const saved = JSON.parse((await h.storage.getItem(CACHE_KEY)) as string);
    expect(saved.catalogVersion).toBeUndefined();
    expect(saved.catalog).toEqual([[VIDEO_A, 'Kept title', 'ch_en', 'en', 0]]);
  });

  it('сбой манифеста → каналы не читаются, названия из копии, версия копии прежняя', async () => {
    const h = await boot(staleCache({ catalogVersion: 'v1', catalog: [[VIDEO_A, 'Cached', 'ch_en', 'en', 0]] }));
    h.client.fetchYoutubeCatalogManifest.mockRejectedValue(new Error('offline'));
    const packs = await h.mod.loadVideoPhraseSetPacks();
    expect(h.client.fetchYoutubeVideoIndex).not.toHaveBeenCalled();
    expect(packs[0].titleRu).toBe('Cached');
    const saved = JSON.parse((await h.storage.getItem(CACHE_KEY)) as string);
    expect(saved.catalogVersion).toBe('v1');
  });

  it('копия без версии (до 13.10) → один полный проход', async () => {
    const h = await boot(staleCache({}));
    h.client.fetchYoutubeCatalogManifest.mockResolvedValue(manifest('v1'));
    h.client.fetchYoutubeVideoIndex.mockResolvedValue([{ channelId: 'ch_en', videos: [video(VIDEO_A, 'Title A')] }]);
    await h.mod.loadVideoPhraseSetPacks();
    expect(h.client.fetchYoutubeVideoIndex).toHaveBeenCalledTimes(1);
  });
});
