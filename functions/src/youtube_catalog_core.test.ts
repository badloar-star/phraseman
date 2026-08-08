import {
  classifyYoutubeVideo,
  decideYoutubeSearchBudget,
  mergeYoutubeVideoSources,
  nextYoutubeSyncIntervalMs,
} from './youtube_catalog_core';

const NOW = Date.parse('2026-08-08T20:05:00Z');

describe('youtube catalog core', () => {
  test('classifies upcoming, live, completed, and ordinary videos deterministically', () => {
    expect(classifyYoutubeVideo({ scheduledStartTime: '2026-08-08T21:00:00Z' }, NOW)).toBe('upcoming');
    expect(classifyYoutubeVideo({ actualStartTime: '2026-08-08T20:00:00Z' }, NOW)).toBe('live');
    expect(classifyYoutubeVideo({
      actualStartTime: '2026-08-08T19:00:00Z',
      actualEndTime: '2026-08-08T20:00:00Z',
    }, NOW)).toBe('completed');
    expect(classifyYoutubeVideo({}, NOW)).toBe('video');
  });

  test('uses one minute for live, two minutes for near upcoming, and fifteen minutes otherwise', () => {
    expect(nextYoutubeSyncIntervalMs([{ state: 'live' }], NOW)).toBe(60_000);
    expect(nextYoutubeSyncIntervalMs([{
      state: 'upcoming',
      scheduledStartTime: '2026-08-09T19:00:00Z',
    }], NOW)).toBe(120_000);
    expect(nextYoutubeSyncIntervalMs([], NOW)).toBe(15 * 60_000);
  });

  test('enforces the daily search cap and advances a fair round-robin cursor', () => {
    expect(decideYoutubeSearchBudget({
      utcDay: '2026-08-08',
      storedUtcDay: '2026-08-08',
      callsUsed: 79,
      cursor: 1,
      eligibleChannelIds: ['a', 'b', 'c'],
      requestedCallsPerChannel: 2,
    })).toEqual({
      channelIds: [],
      nextCallsUsed: 79,
      nextCursor: 1,
    });

    expect(decideYoutubeSearchBudget({
      utcDay: '2026-08-09',
      storedUtcDay: '2026-08-08',
      callsUsed: 80,
      cursor: 1,
      eligibleChannelIds: ['a', 'b', 'c'],
      requestedCallsPerChannel: 2,
    })).toEqual({
      channelIds: ['b', 'c', 'a'],
      nextCallsUsed: 6,
      nextCursor: 1,
    });

    expect(decideYoutubeSearchBudget({
      utcDay: '2026-08-08',
      storedUtcDay: '2026-08-08',
      callsUsed: 12,
      cursor: 4,
      eligibleChannelIds: [],
      requestedCallsPerChannel: 2,
    })).toEqual({
      channelIds: [],
      nextCallsUsed: 12,
      nextCursor: 0,
    });
  });

  test('merges sources without duplicates, filters Shorts markers, and applies expiring overrides', () => {
    const result = mergeYoutubeVideoSources({
      channelId: 'channel-en',
      nowMs: NOW,
      sources: [
        {
          id: 'aaaaaaaaaaa',
          title: 'Long lesson',
          description: 'Practice',
          thumbnailUrl: 'https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg',
          publishedAt: '2026-08-08T18:00:00Z',
          viewCount: 10,
          liveStreamingDetails: { scheduledStartTime: '2026-08-08T21:00:00Z' },
        },
        {
          id: 'bbbbbbbbbbb',
          title: 'Quick #shorts',
          description: '',
          thumbnailUrl: 'https://i.ytimg.com/vi/bbbbbbbbbbb/hqdefault.jpg',
          publishedAt: '2026-08-08T17:00:00Z',
        },
        {
          id: 'aaaaaaaaaaa',
          title: 'Duplicate',
          description: '',
          thumbnailUrl: 'https://i.ytimg.com/vi/aaaaaaaaaaa/hqdefault.jpg',
        },
      ],
      pinned: [{ id: 'ccccccccccc', title: 'Pinned lesson' }],
      overrides: {
        aaaaaaaaaaa: {
          titleOverride: 'Premiere title',
          scheduledStartOverride: '2026-08-08T22:00:00Z',
          expiresAt: '2026-08-09T00:00:00Z',
        },
      },
    });

    expect(result.map((video) => video.id)).toEqual(['ccccccccccc', 'aaaaaaaaaaa']);
    expect(result[1]).toMatchObject({
      title: 'Premiere title',
      state: 'upcoming',
      scheduledStartTime: '2026-08-08T22:00:00Z',
    });
  });
});
