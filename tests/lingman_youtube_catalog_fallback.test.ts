import AsyncStorage from '@react-native-async-storage/async-storage';

const mockFetchManifest = jest.fn();
const mockFetchRail = jest.fn();
jest.mock('../app/youtube_catalog_client', () => ({
  fetchYoutubeCatalogManifest: (...args: unknown[]) => mockFetchManifest(...args),
  fetchYoutubeHomeRailCatalog: (...args: unknown[]) => mockFetchRail(...args),
}));

// eslint-disable-next-line import/first
import {
  LINGMAN_CHANNEL_ID,
  getLingmanYoutubeSnapshot,
  resetLingmanCatalogFallbackForTests,
  resetLingmanFeedNotFoundForTests,
} from '../app/lingman_youtube';

// зачем (Сверка cold4 05:35; проверка 11.10: RSS YouTube отвечает 404 даже для правильного канала): лента Главной берёт
// свежие ролики того же канала из серверного каталога, а не застревает на старом кэше/пустоте.
const STORAGE_KEY = 'lingman_youtube_last_successful_snapshot_v2';
const manifest = {
  activeVersion: 'yt_1',
  defaultChannelId: 'channel-en',
  localeDefaults: { en: 'channel-en' },
  channels: [{ id: 'channel-en', displayName: 'Professor Lingman', languageTags: ['en'], order: 0 }],
};
const catalogVideo = (id: string, extra: Record<string, unknown> = {}) => ({
  id, channelId: 'channel-en', title: `Lesson ${id}`, description: 'Full lesson.',
  thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, watchUrl: `https://www.youtube.com/watch?v=${id}`,
  publishedAt: '2026-10-10T10:00:00Z', state: 'published', playlistIds: [], durationSec: 600, ...extra,
});
const rail = (youtubeChannelId: string, videos: unknown[]) => ({
  version: 'yt_1', channel: { id: 'channel-en', youtubeChannelId }, videos, fetchedAt: '2026-10-11T05:00:00Z',
});

describe('home feed falls back to the server catalog when the YouTube RSS fails', () => {
  const originalFetch = global.fetch;
  let warn: jest.SpyInstance;

  beforeEach(async () => {
    await (AsyncStorage as jest.Mocked<typeof AsyncStorage>).clear();
    resetLingmanFeedNotFoundForTests();
    resetLingmanCatalogFallbackForTests();
    mockFetchManifest.mockReset().mockResolvedValue(manifest);
    mockFetchRail.mockReset();
    global.fetch = jest.fn(async () => ({ ok: false, status: 404, text: async () => '' })) as unknown as typeof fetch;
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });
  afterEach(() => {
    global.fetch = originalFetch;
    warn.mockRestore();
  });

  it('RSS 404 → fresh videos of the same channel from the catalog, no error, saved for later', async () => {
    mockFetchRail.mockResolvedValue(rail(LINGMAN_CHANNEL_ID, [
      catalogVideo('aaaaaaaaaaa'),
      catalogVideo('upcomingvid', { state: 'upcoming' }),
      catalogVideo('bbbbbbbbbbb'),
    ]));
    const snapshot = await getLingmanYoutubeSnapshot();

    expect(snapshot.error).toBeUndefined();
    expect(snapshot.videos.map((video) => video.id)).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
    expect(mockFetchRail).toHaveBeenCalledWith('channel-en', manifest, 12);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const saved = JSON.parse(String(await AsyncStorage.getItem(STORAGE_KEY)));
    expect(saved).toMatchObject({ channelId: LINGMAN_CHANNEL_ID });
    expect(saved.videos.map((video: { id: string }) => video.id)).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
  });

  it('a catalog channel that is not our YouTube channel is never shown', async () => {
    mockFetchRail.mockResolvedValue(rail('UC_someone_else_000000', [catalogVideo('ccccccccccc')]));
    const snapshot = await getLingmanYoutubeSnapshot();
    expect(snapshot.videos.some((video) => video.id === 'ccccccccccc')).toBe(false);
    expect(warn).toHaveBeenCalledWith('[HOME-COLD] video_feed:catalog_channel_mismatch', expect.any(String));
  });

  it('a saved list younger than 6 hours is used without reading the catalog', async () => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
      channelId: LINGMAN_CHANNEL_ID,
      fetchedAtMs: Date.now() - 60_000,
      videos: [{ id: 'ddddddddddd', title: 'Saved lesson', description: 'Full lesson.', thumbnailUrl: 'https://i.ytimg.com/vi/ddddddddddd/hqdefault.jpg', publishedAt: '2026-10-10T10:00:00Z', updatedAt: '2026-10-10T10:00:00Z', watchUrl: 'https://www.youtube.com/watch?v=ddddddddddd' }],
    }));
    const snapshot = await getLingmanYoutubeSnapshot();
    expect(mockFetchManifest).not.toHaveBeenCalled();
    expect(snapshot.videos.some((video) => video.id === 'ddddddddddd')).toBe(true);
  });

  it('a failing catalog keeps the previous fallback (built-in list for the default channel)', async () => {
    mockFetchManifest.mockRejectedValue(new Error('offline'));
    const snapshot = await getLingmanYoutubeSnapshot();
    expect(snapshot.videos.length).toBeGreaterThan(0);
    expect(warn).toHaveBeenCalledWith('[HOME-COLD] video_feed:catalog_failed', 'offline');
  });
});
