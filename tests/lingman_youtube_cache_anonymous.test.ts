import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  captureAccountGeneration,
} from '../app/account_generation';
import {
  beginLingmanSnapshotRequest,
  commitLingmanSnapshot,
  isLingmanSnapshotRequestCurrent,
  lingmanSnapshotCacheKey,
  readLingmanSnapshot,
  resetLingmanSnapshotCacheForTests,
} from '../app/lingman_youtube_cache';
import type { LingmanYoutubeSnapshot } from '../app/lingman_youtube';
import { resetScreenSnapshotStoreForTests } from '../app/screen_snapshot_store';

const snapshot = (): LingmanYoutubeSnapshot => ({
  videos: [{
    id: 'abcdefghijk',
    title: 'Урок',
    description: '',
    thumbnailUrl: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    publishedAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    watchUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
  }],
  latestVideoId: 'abcdefghijk',
  unreadCount: 1,
  fetchedAtMs: 1_000,
});

describe('lingman youtube cache before the account is identified', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    resetLingmanSnapshotCacheForTests();
    resetScreenSnapshotStoreForTests();
  });

  // Владелец: видео должны показываться в ЛЮБОМ сценарии — с авторизацией и без.
  // Раньше ключ был null у неопознанной личности, поэтому запасная RSS-лента
  // не сохранялась и экран оставался пустым вообще без видео.
  it('keeps the shared feed usable without an identity', () => {
    const token = captureAccountGeneration();
    expect(token.phase).toBe('uninitialized');
    expect(lingmanSnapshotCacheKey(token, 'UC123')).toBe('anon:lingman-youtube:UC123');

    const request = beginLingmanSnapshotRequest(token, 'UC123');
    expect(isLingmanSnapshotRequestCurrent(request)).toBe(true);
    expect(commitLingmanSnapshot(request, snapshot())).toBe(true);

    const read = readLingmanSnapshot(token, 'UC123', 1_000);
    expect(read?.value.videos).toHaveLength(1);
  });

  it('never leaks the anonymous feed into a real account scope', () => {
    const anonymous = captureAccountGeneration();
    const request = beginLingmanSnapshotRequest(anonymous, 'UC123');
    commitLingmanSnapshot(request, snapshot());

    beginAccountGeneration('alice');
    const alice = captureAccountGeneration();
    expect(lingmanSnapshotCacheKey(alice, 'UC123')).not.toContain('anon:');
    expect(readLingmanSnapshot(alice, 'UC123', 1_000)).toBeNull();
  });

  it('drops a late response once the account actually switched', () => {
    beginAccountGeneration('alice');
    const alice = captureAccountGeneration();
    const request = beginLingmanSnapshotRequest(alice, 'UC123');

    beginAccountGeneration('bob');
    expect(isLingmanSnapshotRequestCurrent(request)).toBe(false);
    expect(commitLingmanSnapshot(request, snapshot())).toBe(false);
  });
});
