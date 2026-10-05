import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  __resetVideoPhrasesCacheForTests,
  loadVideoPhrasesCached,
  peekCachedVideoPhrases,
  VIDEO_PHRASES_CACHE_TTL_MS,
} from '../app/video_phrases_client';

// зачем (video-011, координатор 05.10): экран ролика открывается из кэша фраз; сеть — только при протухшем кэше,
// отказ сети при старом кэше не прячет фразы.
const VIDEO = 'abcdefghijk';
const raw = [{ phrase: 'Catch a flight', translation: 'успеть на рейс', explanation: 'x', startSec: 42 }];

describe('video phrases cache', () => {
  beforeEach(async () => {
    __resetVideoPhrasesCacheForTests();
    await AsyncStorage.clear();
  });

  it('first load goes to the network, the second comes from memory without a fetch', async () => {
    const { normalizeVideoPhraseList } = jest.requireActual('../shared/video_phrases_contract');
    const fetcher = jest.fn(async () => normalizeVideoPhraseList(VIDEO, raw));
    const first = await loadVideoPhrasesCached(VIDEO, { nowMs: 1_000, fetcher });
    expect(first.from).toBe('net');
    expect(peekCachedVideoPhrases(VIDEO)?.[0]?.phrase).toBe('Catch a flight');
    const second = await loadVideoPhrasesCached(VIDEO, { nowMs: 2_000, fetcher });
    expect(second.from).toBe('memory');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('reads a fresh disk cache after a process restart without the network', async () => {
    const { normalizeVideoPhraseList } = jest.requireActual('../shared/video_phrases_contract');
    const fetcher = jest.fn(async () => normalizeVideoPhraseList(VIDEO, raw));
    await loadVideoPhrasesCached(VIDEO, { nowMs: 1_000, fetcher });
    await new Promise((resolve) => setTimeout(resolve, 0));
    __resetVideoPhrasesCacheForTests();
    const again = await loadVideoPhrasesCached(VIDEO, { nowMs: 5_000, fetcher });
    expect(again.from).toBe('disk');
    expect(again.phrases[0]?.startSec).toBe(42);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('refreshes a stale cache, and on network failure keeps the old phrases', async () => {
    const { normalizeVideoPhraseList } = jest.requireActual('../shared/video_phrases_contract');
    await loadVideoPhrasesCached(VIDEO, { nowMs: 1_000, fetcher: async () => normalizeVideoPhraseList(VIDEO, raw) });
    const failing = jest.fn(async () => { throw new Error('offline'); });
    const stale = await loadVideoPhrasesCached(VIDEO, { nowMs: 1_000 + VIDEO_PHRASES_CACHE_TTL_MS + 1, fetcher: failing });
    expect(failing).toHaveBeenCalledTimes(1);
    expect(stale.from).toBe('stale_after_net_error');
    expect(stale.phrases).toHaveLength(1);
  });

  it('without any cache a network failure is passed to the caller (it retries quietly)', async () => {
    await expect(loadVideoPhrasesCached(VIDEO, { nowMs: 1_000, fetcher: async () => { throw new Error('offline'); } }))
      .rejects.toThrow('offline');
  });
});
