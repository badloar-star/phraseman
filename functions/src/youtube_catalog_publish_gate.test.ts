import {
  YOUTUBE_VIEW_COUNT_REFRESH_MS,
  decideYoutubeCatalogPublish,
  youtubeSnapshotContentHashes,
  youtubeViewCountDisplayBucket,
} from './youtube_catalog_publish_gate';
import type { YoutubeBuiltSnapshot } from './youtube_catalog_store';

// зачем (§CORE-0163, находка K аудита стоимости Firebase): неизменившийся каталог не перепубликуется каждые
// 15 минут (в эфир — каждую минуту); просмотры, которые видит человек, освежаются не реже раза в 6 ч.
const NOW = Date.parse('2026-10-11T04:30:00Z');

function snapshot(overrides: { version?: string; generatedAt?: string; viewCount?: number; title?: string; state?: string } = {}): YoutubeBuiltSnapshot {
  const version = overrides.version ?? 'yt_a';
  const generatedAt = overrides.generatedAt ?? '2026-10-11T04:00:00.000Z';
  return {
    version,
    manifest: {
      schemaVersion: 1,
      activeVersion: version,
      generatedAt,
      sourceRefreshedAt: generatedAt,
      defaultChannelId: 'channel-en',
      localeDefaults: { en: 'channel-en' },
      channels: [{ id: 'channel-en', displayName: 'Phraseman', languageTags: ['en'], order: 0 }],
    },
    channels: [{
      channel: { id: 'channel-en', youtubeChannelId: 'UCx', displayName: 'Phraseman', handle: '@x', url: 'https://www.youtube.com/@x/videos', languageTags: ['en'], order: 0, recentVideoIds: ['aaaaaaaaaaa'], playlistIds: [] },
      videos: [{
        id: 'aaaaaaaaaaa', channelId: 'channel-en', title: overrides.title ?? 'Lesson', description: '',
        thumbnailUrl: 'https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg', watchUrl: 'https://www.youtube.com/watch?v=aaaaaaaaaaa',
        state: overrides.state ?? 'published', playlistIds: [],
        ...(overrides.viewCount === undefined ? {} : { viewCount: overrides.viewCount }),
      }],
      playlists: [],
      playlistPages: [],
    }],
  } as unknown as YoutubeBuiltSnapshot;
}

const published = (structure: string, display: string, atMs: number) => ({
  lastPublishedStructureHash: structure, lastPublishedDisplayHash: display, lastPublishedAtMs: atMs,
});

describe('YouTube catalog publish gate', () => {
  test('view counts are bucketed exactly as the app shows them', () => {
    expect(youtubeViewCountDisplayBucket(999)).toBe('999');
    expect(youtubeViewCountDisplayBucket(1_234)).toBe('1.2K');
    expect(youtubeViewCountDisplayBucket(1_249)).toBe(youtubeViewCountDisplayBucket(1_201));
    expect(youtubeViewCountDisplayBucket(12_345)).toBe('12K');
    expect(youtubeViewCountDisplayBucket(12_400)).toBe(youtubeViewCountDisplayBucket(12_100));
    expect(youtubeViewCountDisplayBucket(2_500_000)).toBe('2.5M');
    expect(youtubeViewCountDisplayBucket(undefined)).toBeNull();
  });

  test('fingerprints ignore the version and build timestamps', () => {
    const a = youtubeSnapshotContentHashes(snapshot({ version: 'yt_1', generatedAt: '2026-10-11T04:00:00.000Z' }));
    const b = youtubeSnapshotContentHashes(snapshot({ version: 'yt_2', generatedAt: '2026-10-11T04:15:00.000Z' }));
    expect(b).toEqual(a);
  });

  test('a title or live-state change moves the structure fingerprint; views move only the display one', () => {
    const base = youtubeSnapshotContentHashes(snapshot({ viewCount: 12_100 }));
    expect(youtubeSnapshotContentHashes(snapshot({ viewCount: 12_100, title: 'New' })).structure).not.toBe(base.structure);
    expect(youtubeSnapshotContentHashes(snapshot({ viewCount: 12_100, state: 'live' })).structure).not.toBe(base.structure);
    const sameBucket = youtubeSnapshotContentHashes(snapshot({ viewCount: 12_400 }));
    expect(sameBucket).toEqual(base);
    const newBucket = youtubeSnapshotContentHashes(snapshot({ viewCount: 13_000 }));
    expect(newBucket.structure).toBe(base.structure);
    expect(newBucket.display).not.toBe(base.display);
  });

  test('decisions: manual always, first run, change, unchanged, views-only recent and stale', () => {
    const hashes = youtubeSnapshotContentHashes(snapshot({ viewCount: 13_000 }));
    const old = youtubeSnapshotContentHashes(snapshot({ viewCount: 12_100 }));
    const decide = (syncState: Record<string, unknown>, trigger: 'cron' | 'manual' = 'cron') =>
      decideYoutubeCatalogPublish({ trigger, nowMs: NOW, hashes, syncState });

    expect(decide(published(hashes.structure, hashes.display, NOW - 60_000), 'manual')).toEqual({ publish: true, reason: 'manual' });
    expect(decide({})).toEqual({ publish: true, reason: 'no_previous_fingerprint' });
    expect(decide(published('other', 'other', NOW - 60_000))).toEqual({ publish: true, reason: 'content_changed' });
    expect(decide(published(hashes.structure, hashes.display, NOW - 60_000))).toEqual({ publish: false, reason: 'unchanged' });
    expect(decide(published(old.structure, old.display, NOW - 60_000))).toEqual({ publish: false, reason: 'view_counts_only_recent' });
    expect(decide(published(old.structure, old.display, NOW - YOUTUBE_VIEW_COUNT_REFRESH_MS))).toEqual({ publish: true, reason: 'view_counts_refresh' });
  });

  test('a live broadcast where only views move every minute is not republished', () => {
    const minute1 = youtubeSnapshotContentHashes(snapshot({ state: 'live', viewCount: 410, version: 'yt_m1' }));
    const minute2 = youtubeSnapshotContentHashes(snapshot({ state: 'live', viewCount: 437, version: 'yt_m2' }));
    expect(minute2.structure).toBe(minute1.structure);
    expect(decideYoutubeCatalogPublish({
      trigger: 'cron', nowMs: NOW, hashes: minute2, syncState: published(minute1.structure, minute1.display, NOW - 60_000),
    }).publish).toBe(false);
  });
});
