// зачем (смета Firebase R1, п.11, 13.10): лента видео es/fr/de/it на Главной держала результат только в памяти — каждый холодный
// старт читал Firestore заново (до 11 чтений). Теперь результат лежит на диске 6 ч: старт берёт его без сети.
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockManifest = { channels: [{ id: 'ch_es', languageTags: ['es'] }] };
const mockFetchManifest = jest.fn(async () => mockManifest);
const mockFetchRail = jest.fn(async () => ({
  videos: [{ id: 'v1', title: 'T', description: '', thumbnailUrl: 'u', publishedAt: '2026-10-01', watchUrl: 'w', state: 'published' }],
}));

jest.mock('../app/youtube_catalog_client', () => ({
  fetchYoutubeCatalogManifest: () => mockFetchManifest(),
  fetchYoutubeHomeRailCatalog: () => mockFetchRail(),
}));
jest.mock('../app/video_language_contour', () => ({
  resolveVideoChannelForStudyTarget: (channels: { id: string; languageTags: string[] }[], target: string) =>
    channels.find((channel) => channel.languageTags.includes(target)) ?? null,
}));

import { loadHomeVideoRailForTarget, resetHomeVideoRailMemoryForTests } from '../app/home_video_rail_source';

describe('лента видео Главной: дисковый кэш 6 ч', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    resetHomeVideoRailMemoryForTests();
    mockFetchManifest.mockClear();
    mockFetchRail.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('после загрузки из сети результат на диске; новый «холодный старт» берёт его без сети', async () => {
    const first = await loadHomeVideoRailForTarget('es');
    expect(first.videos).toHaveLength(1);
    expect(mockFetchManifest).toHaveBeenCalledTimes(1);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await AsyncStorage.getItem('home_video_rail_cache_v1')).toContain('"es"');

    resetHomeVideoRailMemoryForTests(); // как будто процесс перезапустился
    const second = await loadHomeVideoRailForTarget('es');
    expect(second.videos.map((video) => video.id)).toEqual(['v1']);
    expect(mockFetchManifest).toHaveBeenCalledTimes(1);
  });

  it('протухший дисковый кэш (> 6 ч) — снова сеть', async () => {
    const stale = { es: { atMs: Date.now() - 7 * 60 * 60_000, result: { videos: [], source: 'catalog_channel', channelId: 'ch_es' } } };
    await AsyncStorage.setItem('home_video_rail_cache_v1', JSON.stringify(stale));
    await loadHomeVideoRailForTarget('es');
    expect(mockFetchManifest).toHaveBeenCalledTimes(1);
  });

  it('битый дисковый кэш не ломает загрузку — сеть и причина в журнале', async () => {
    await AsyncStorage.setItem('home_video_rail_cache_v1', '{oops');
    const result = await loadHomeVideoRailForTarget('es');
    expect(result.videos).toHaveLength(1);
    expect(mockFetchManifest).toHaveBeenCalledTimes(1);
  });
});
