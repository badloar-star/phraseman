// зачем (владелец 11.10, журнал 14: «Все видео» ДО РЕЛИЗА): источник полного списка роликов — первый кадр без сети,
// минимум чтений Firestore (кэш свежий — 0; версия та же — 1 чтение манифеста; новая версия — полное чтение).
const asyncStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async (k: string) => asyncStore[k] ?? null),
  setItem: jest.fn(async (k: string, v: string) => { asyncStore[k] = v; }),
}));

const manifestVersion = { value: 'v1' };
const fetchManifest = jest.fn(async () => ({ activeVersion: manifestVersion.value, channels: [{ id: 'ch1' }] }));
const PLAYLISTS = [{ id: 'pl1', channelId: 'ch1', title: 'Плейлист 1', description: 'длинное описание', url: 'u', itemCount: 3, order: 0, pageCount: 1 }];
const fetchChannel = jest.fn(async () => ({ version: manifestVersion.value, videos: VIDEOS, playlists: PLAYLISTS }));
jest.mock('../app/youtube_catalog_client', () => ({
  fetchYoutubeCatalogManifestWithReader: () => fetchManifest(),
  fetchYoutubeChannelCatalogWithReader: () => fetchChannel(),
}));

import {
  ALL_VIDEOS_PAGE_SIZE,
  ALL_VIDEOS_REFRESH_MS,
  allVideosPage,
  loadAllChannelVideos,
  resetAllChannelVideosForTests,
  selectAllChannelVideos,
  type AllVideosItem,
} from '../app/all_channel_videos_source';

function video(id: string, publishedAt: string, viewCount: number, extra: Partial<AllVideosItem> = {}) {
  return {
    id, channelId: 'ch1', title: `Видео ${id}`, description: 'd', thumbnailUrl: 't', watchUrl: 'w',
    publishedAt, viewCount, state: 'published', playlistIds: [] as string[], ...extra,
  };
}
const VIDEOS = [
  video('a', '2026-10-01T00:00:00Z', 10, { playlistIds: ['pl1'] }),
  video('b', '2026-10-05T00:00:00Z', 50),
  video('c', '2026-09-01T00:00:00Z', 900, { title: 'Фразы в аэропорту' }),
  video('d', '2026-10-09T00:00:00Z', 0, { state: 'upcoming' }),
];
const reader = { get: jest.fn(), list: jest.fn() };
let token = { generation: 0, stableId: 'user-1' as string | null, phase: 'active' as 'active' | 'uninitialized' | 'transitioning' };

beforeEach(() => {
  Object.keys(asyncStore).forEach((k) => delete asyncStore[k]);
  resetAllChannelVideosForTests();
  manifestVersion.value = 'v1';
  fetchManifest.mockClear();
  fetchChannel.mockClear();
  const generation = require('../app/account_generation');
  generation.beginAccountGeneration('user-1');
  token = generation.captureAccountGeneration();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});

describe('selectAllChannelVideos', () => {
  const items = VIDEOS as unknown as AllVideosItem[];
  it('новые — по дате, без запланированных премьер', () => {
    expect(selectAllChannelVideos(items).map((v) => v.id)).toEqual(['b', 'a', 'c']);
  });
  it('популярные — по просмотрам', () => {
    expect(selectAllChannelVideos(items, { sort: 'popular' }).map((v) => v.id)).toEqual(['c', 'b', 'a']);
  });
  it('поиск по названию без регистра и фильтр по плейлисту', () => {
    expect(selectAllChannelVideos(items, { search: 'аэроПОРТ' }).map((v) => v.id)).toEqual(['c']);
    expect(selectAllChannelVideos(items, { playlistId: 'pl1' }).map((v) => v.id)).toEqual(['a']);
  });
  it('порции по 20', () => {
    const many = Array.from({ length: 45 }, (_, i) => ({ ...items[0], id: `v${i}` }));
    expect(allVideosPage(many, 1)).toHaveLength(ALL_VIDEOS_PAGE_SIZE);
    expect(allVideosPage(many, 3)).toHaveLength(45);
  });
});

describe('loadAllChannelVideos', () => {
  it('первый заход — полное чтение; затем кэш свежий — ноль чтений', async () => {
    const first = await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 });
    expect(first?.items).toHaveLength(4);
    expect(fetchChannel).toHaveBeenCalledTimes(1);
    const again = await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 2_000 });
    expect(again?.items).toHaveLength(4);
    expect(fetchManifest).toHaveBeenCalledTimes(0);
    expect(fetchChannel).toHaveBeenCalledTimes(1);
  });

  it('кэш устарел, версия та же — только манифест', async () => {
    await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 });
    await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 + ALL_VIDEOS_REFRESH_MS + 1 });
    expect(fetchManifest).toHaveBeenCalledTimes(1);
    expect(fetchChannel).toHaveBeenCalledTimes(1);
  });

  it('новая версия каталога — полное перечитывание', async () => {
    await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 });
    manifestVersion.value = 'v2';
    const next = await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 + ALL_VIDEOS_REFRESH_MS + 1 });
    expect(next?.version).toBe('v2');
    expect(fetchChannel).toHaveBeenCalledTimes(2);
  });

  it('холодный запуск: список с диска без сети', async () => {
    await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 });
    resetAllChannelVideosForTests();
    fetchChannel.mockClear();
    const cold = await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 5_000 });
    expect(cold?.items).toHaveLength(4);
    expect(fetchChannel).not.toHaveBeenCalled();
  });

  it('ошибка сети при кэше — отдаём кэш', async () => {
    await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 });
    fetchManifest.mockRejectedValueOnce(new Error('offline'));
    const result = await loadAllChannelVideos({ channelId: 'ch1', token, reader, force: true, nowMs: 3_000 });
    expect(result?.items).toHaveLength(4);
  });

  it('ошибка сети без кэша — null (экран покажет «Сейчас недоступно»)', async () => {
    fetchChannel.mockRejectedValueOnce(new Error('offline'));
    await expect(loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 })).resolves.toBeNull();
  });

  it('аккаунт сменился во время чтения — ответ не ложится в кэш нового', async () => {
    let release: () => void = () => undefined;
    fetchChannel.mockImplementationOnce(() => new Promise((resolve) => { release = () => resolve({ version: 'v1', videos: VIDEOS }); }));
    const pending = loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 });
    await new Promise((resolve) => setTimeout(resolve, 0));
    require('../app/account_generation').beginAccountGeneration('user-2');
    release();
    await expect(pending).resolves.toBeNull();
  });

  it('описания роликов в кэш не попадают (компактный список)', async () => {
    await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 });
    const raw = Object.values(asyncStore)[0];
    expect(raw).not.toContain('"description"');
  });
  // зачем (аудит #24, 15.10): снимок экрана видео обрезал плейлисты до 8 — полный список плейлистов канала лежит рядом с роликами, без описаний
  it('полный список плейлистов сохраняется вместе с роликами (без описаний)', async () => {
    const list = await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 });
    expect(list?.playlists).toEqual([{ id: 'pl1', channelId: 'ch1', title: 'Плейлист 1', url: 'u', itemCount: 3, order: 0, pageCount: 1 }]);
  });

  it('кэш, записанный до 15.10 (без плейлистов), версия та же — один раз перечитываем полный каталог', async () => {
    await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 });
    const key = Object.keys(asyncStore)[0]!;
    const old = JSON.parse(asyncStore[key]!);
    delete old.playlists;
    asyncStore[key] = JSON.stringify(old);
    resetAllChannelVideosForTests();
    fetchManifest.mockClear();
    fetchChannel.mockClear();
    const refreshed = await loadAllChannelVideos({ channelId: 'ch1', token, reader, nowMs: 1_000 + ALL_VIDEOS_REFRESH_MS + 1 });
    expect(fetchChannel).toHaveBeenCalledTimes(1);
    expect(refreshed?.playlists).toHaveLength(1);
  });

  it('пустой channelId — ни сети, ни записи (экран ещё не знает канал)', async () => {
    await expect(loadAllChannelVideos({ channelId: '', token, reader, nowMs: 1_000 })).resolves.toBeNull();
    expect(fetchManifest).not.toHaveBeenCalled();
    expect(fetchChannel).not.toHaveBeenCalled();
    expect(Object.keys(asyncStore)).toHaveLength(0);
  });
});
