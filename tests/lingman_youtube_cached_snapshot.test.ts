import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LINGMAN_CHANNEL_ID,
  getLingmanYoutubeWatchUrl,
  isLingmanLongFormVideo,
  readCachedLingmanYoutubeSnapshot,
  type LingmanYoutubeVideo,
} from '../app/lingman_youtube';

// зачем (Сверка 06:01, пакет 07:26 [HOME-COLD] videos=0): Главная сначала показывает сохранённую ленту, сеть — фоном.
// Сторож: чтение кэша ленты НИКОГДА не ходит в сеть; нет кэша → null; есть → ролики + непросмотренные.
const CACHE_KEY = 'lingman_youtube_last_successful_snapshot_v2';
const LAST_SEEN_KEY = 'lingman_youtube_last_seen_video_id_v2';

function makeVideo(id: string): LingmanYoutubeVideo {
  return {
    id,
    title: `${id} — full lesson about English phrases`,
    description: 'Practice phrases after the video.',
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    publishedAt: '2026-06-01T00:00:00+00:00',
    updatedAt: '2026-06-01T00:00:00+00:00',
    watchUrl: getLingmanYoutubeWatchUrl(id),
  };
}

describe('readCachedLingmanYoutubeSnapshot', () => {
  const originalFetch = global.fetch;
  let fetchSpy: jest.Mock;

  beforeEach(async () => {
    await AsyncStorage.clear();
    fetchSpy = jest.fn(async () => { throw new Error('network must not be touched'); });
    global.fetch = fetchSpy as unknown as typeof fetch;
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('returns null without a saved feed and never calls the network', async () => {
    await expect(readCachedLingmanYoutubeSnapshot()).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns the saved feed with the unread count, without the network', async () => {
    const videos = ['AAAAAAAAAA1', 'BBBBBBBBBB2', 'CCCCCCCCCC3'].map(makeVideo);
    const longForm = videos.filter(isLingmanLongFormVideo);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ videos, channelId: LINGMAN_CHANNEL_ID, fetchedAtMs: 1 }));
    await AsyncStorage.setItem(LAST_SEEN_KEY, longForm[longForm.length - 1]?.id ?? '');

    const snapshot = await readCachedLingmanYoutubeSnapshot();
    expect(fetchSpy).not.toHaveBeenCalled();
    if (longForm.length === 0) {
      expect(snapshot).toBeNull();
      return;
    }
    expect(snapshot).not.toBeNull();
    expect(snapshot?.videos.map((video) => video.id)).toEqual(expect.arrayContaining(longForm.map((video) => video.id)));
    expect(snapshot?.latestVideoId).toBe(snapshot?.videos[0]?.id ?? null);
    expect(snapshot?.error).toBeUndefined();
  });

  it('ignores a saved feed of another channel', async () => {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ videos: [makeVideo('DDDDDDDDDD4')], channelId: 'UC_other_channel', fetchedAtMs: 1 }));
    await expect(readCachedLingmanYoutubeSnapshot()).resolves.toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
