import {
  InvalidYoutubeAnalyticsRequestError,
  aggregateYoutubeAnalytics,
  buildYoutubeAnalyticsSql,
  decodeYoutubeAnalyticsQueryRows,
  normalizeYoutubeAnalyticsRequest,
  validateBigQueryEventsTable,
  type YoutubeAnalyticsFixtureEvent,
} from './admin_youtube_analytics_core';

const DAY = 86_400_000_000;
const FROM = Date.UTC(2026, 0, 1) * 1000;
const TO = FROM + 7 * DAY;

let sequence = 0;
function event(
  eventName: YoutubeAnalyticsFixtureEvent['event_name'],
  at = FROM + 1_000_000,
  overrides: Partial<YoutubeAnalyticsFixtureEvent> = {},
): YoutubeAnalyticsFixtureEvent {
  sequence += 1;
  return {
    event_name: eventName,
    event_timestamp: at,
    schema_version: 1,
    event_id: `event-${sequence}`,
    user_pseudo_id: 'user-1',
    session_id: 'session-1',
    platform: 'android',
    channel_id: 'channel-1',
    video_id: 'video-1',
    playback_id: 'playback-1',
    ...overrides,
  };
}

function aggregate(events: YoutubeAnalyticsFixtureEvent[], filters: { platform?: 'all' | 'ios' | 'android'; channelId?: string; videoId?: string } = {}) {
  return aggregateYoutubeAnalytics(events, {
    fromMicros: FROM,
    toMicros: TO,
    generatedAtMicros: TO + 1,
    filters: { rangeDays: 7, platform: 'all', ...filters },
  });
}

beforeEach(() => { sequence = 0; });

describe('request and safe table validation', () => {
  test('normalizes empty optional filters and rejects invalid nonempty values', () => {
    expect(normalizeYoutubeAnalyticsRequest({ rangeDays: 28, platform: 'ios', videoId: '  ', channelId: '' }))
      .toEqual({ rangeDays: 28, platform: 'ios' });
    expect(() => normalizeYoutubeAnalyticsRequest({ rangeDays: 30, platform: 'ios' }))
      .toThrow(InvalidYoutubeAnalyticsRequestError);
    expect(() => normalizeYoutubeAnalyticsRequest({ rangeDays: 7, platform: 'web' }))
      .toThrow(InvalidYoutubeAnalyticsRequestError);
    expect(() => normalizeYoutubeAnalyticsRequest({ rangeDays: 7, platform: 'all', videoId: 'bad id!' }))
      .toThrow(InvalidYoutubeAnalyticsRequestError);
  });

  test('accepts only a separately validated BigQuery events wildcard identifier', () => {
    expect(validateBigQueryEventsTable('project-1.analytics_123.events_*')).toBe('project-1.analytics_123.events_*');
    expect(() => validateBigQueryEventsTable('x`; DROP TABLE y; --')).toThrow(InvalidYoutubeAnalyticsRequestError);
  });
});

describe('fixture aggregation behavioral oracle', () => {
  test('deduplicates event ids before counts and reports duplicates', () => {
    const first = event('youtube_home_entry_click');
    const snapshot = aggregate([first, { ...first }]);
    expect(snapshot.summary.homeClicks).toBe(1);
    expect(snapshot.quality.duplicates).toBe(1);
    expect(snapshot.quality.state).toBe('partial');
  });

  test('excludes unknown schema and missing required fields', () => {
    const snapshot = aggregate([
      event('youtube_home_entry_click', FROM + 1, { schema_version: 2 }),
      event('youtube_video_select', FROM + 2, { video_id: '' }),
    ]);
    expect(snapshot.quality.unknownSchema).toBe(1);
    expect(snapshot.quality.missingRequiredFields).toBe(1);
    expect(snapshot.quality.state).toBe('empty');
  });

  test('normalizes padded identifiers and rejects whitespace-only or oversized required identifiers', () => {
    const snapshot = aggregate([
      event('youtube_video_select', FROM + 1, { video_id: ' video-1 ' }),
      event('youtube_home_entry_click', FROM + 2, { session_id: '   ' }),
      event('youtube_video_select', FROM + 3, { video_id: 'x'.repeat(257) }),
    ], { videoId: 'video-1' });
    expect(snapshot.summary.videoSelects).toBe(1);
    expect(snapshot.quality.missingRequiredFields).toBe(1);
    expect(aggregate([
      event('youtube_video_select', FROM + 3, { video_id: 'x'.repeat(257) }),
    ]).quality.missingRequiredFields).toBe(1);
  });

  test('rejects a whole playback candidate for a video conflict before attempt grouping', () => {
    const videoConflict = [
      event('youtube_playback_start'),
      event('youtube_playback_end', FROM + 2_000_000, { video_id: 'video-2', active_watch_ms: 10_000, duration_ms: 20_000 }),
    ];
    const snapshot = aggregate(videoConflict);
    expect(snapshot.summary.playbackStarts).toBe(0);
    expect(snapshot.quality.conflictingVideo).toBe(1);
    const filtered = aggregate(videoConflict, { videoId: 'video-1' });
    expect(filtered.summary.playbackStarts).toBe(0);
    expect(filtered.quality.conflictingVideo).toBe(1);
    const outside = aggregate(videoConflict, { videoId: 'video-3' });
    expect(outside.quality).toMatchObject({ totalEvents: 0, conflictingVideo: 0 });
  });

  test('rejects a whole playback candidate for a channel conflict before attempt grouping', () => {
    const channelConflict = [
      event('youtube_playback_start', FROM + 3_000_000, { playback_id: 'playback-2' }),
      event('youtube_playback_end', FROM + 4_000_000, { playback_id: 'playback-2', channel_id: 'channel-2', active_watch_ms: 10_000, duration_ms: 20_000 }),
    ];
    const snapshot = aggregate(channelConflict);
    expect(snapshot.summary.playbackStarts).toBe(0);
    expect(snapshot.quality.conflictingChannel).toBe(1);
    const filtered = aggregate(channelConflict, { channelId: 'channel-1' });
    expect(filtered.summary.playbackStarts).toBe(0);
    expect(filtered.quality.conflictingChannel).toBe(1);
    const outside = aggregate(channelConflict, { channelId: 'channel-3' });
    expect(outside.quality).toMatchObject({ totalEvents: 0, conflictingChannel: 0 });
  });

  test('rejects unsafe or reversed explicit microsecond windows', () => {
    expect(() => aggregateYoutubeAnalytics([], {
      fromMicros: TO, toMicros: FROM, generatedAtMicros: TO,
      filters: { rangeDays: 7, platform: 'all' },
    })).toThrow(InvalidYoutubeAnalyticsRequestError);
  });

  test('distinguishes starts from watch attempts and handles unfinished attempts', () => {
    const snapshot = aggregate([
      event('youtube_playback_start', FROM + 1),
      event('youtube_playback_checkpoint', FROM + 2_000_000, { active_watch_ms: 40_000, duration_ms: 100_000 }),
      event('youtube_playback_start', FROM + 3_000_000, { playback_id: 'start-only' }),
    ]);
    expect(snapshot.summary.playbackStarts).toBe(2);
    expect(snapshot.summary.watchAttempts).toBe(1);
    expect(snapshot.summary.totalActiveWatchMs).toBe(40_000);
    expect(snapshot.quality.unfinishedAttempts).toBe(1);
  });

  test('ignores playback snapshots before the unique start', () => {
    const snapshot = aggregate([
      event('youtube_playback_checkpoint', FROM + 1, { active_watch_ms: 90, duration_ms: 100 }),
      event('youtube_playback_start', FROM + 2),
      event('youtube_playback_checkpoint', FROM + 3, { active_watch_ms: 10, duration_ms: 100 }),
    ]);
    expect(snapshot.summary.totalActiveWatchMs).toBe(10);
    expect(snapshot.summary.completed25).toBe(0);
    expect(snapshot.quality.unfinishedAttempts).toBe(1);
    expect(snapshot.quality).toMatchObject({ totalEvents: 3, acceptedEvents: 2, validationRatio: 2 / 3 });
  });

  test('excludes a terminal/checkpoint candidate without a start', () => {
    const snapshot = aggregate([
      event('youtube_playback_end', FROM + 1, { active_watch_ms: 1_000, duration_ms: 2_000 }),
    ]);
    expect(snapshot.summary.playbackStarts).toBe(0);
    expect(snapshot.quality.rowsWithoutStart).toBe(1);
  });

  test('invalidates an attempt containing duplicate distinct start events', () => {
    const snapshot = aggregate([
      event('youtube_playback_start', FROM + 2, { playback_id: 'dup' }),
      event('youtube_playback_start', FROM + 3, { playback_id: 'dup' }),
    ]);
    expect(snapshot.summary.playbackStarts).toBe(0);
    expect(snapshot.quality.duplicateStartAttempts).toBe(1);
  });

  test('uses last-by-event-time positive duration and ignores zero duration', () => {
    const snapshot = aggregate([
      event('youtube_playback_start', FROM + 1),
      event('youtube_playback_checkpoint', FROM + 2, { active_watch_ms: 50, duration_ms: 100 }),
      event('youtube_playback_end', FROM + 3, { active_watch_ms: 75, duration_ms: 0 }),
      event('youtube_playback_start', FROM + 4, { playback_id: 'zero' }),
      event('youtube_playback_end', FROM + 5, { playback_id: 'zero', active_watch_ms: 10, duration_ms: 0 }),
    ]);
    expect(snapshot.summary.completed50).toBe(1);
    expect(snapshot.summary.completed75).toBe(1);
    expect(snapshot.quality.invalidDurationAttempts).toBe(1);
  });

  test('uses active time only for 25/50/75/95 thresholds, never position', () => {
    const events: YoutubeAnalyticsFixtureEvent[] = [];
    [25, 50, 75, 95].forEach((percent, index) => {
      const playback = `p-${index}`;
      events.push(event('youtube_playback_start', FROM + index * 10 + 1, { playback_id: playback }));
      events.push(event('youtube_playback_end', FROM + index * 10 + 2, {
        playback_id: playback, active_watch_ms: percent, duration_ms: 100,
        position_ms: 100, max_position_permille: 1000,
      }));
    });
    events.push(event('youtube_playback_start', FROM + 100, { playback_id: 'seek' }));
    events.push(event('youtube_playback_end', FROM + 101, {
      playback_id: 'seek', active_watch_ms: 1, duration_ms: 100, position_ms: 100, max_position_permille: 1000,
    }));
    const snapshot = aggregate(events);
    expect(snapshot.summary).toMatchObject({ completed25: 4, completed50: 3, completed75: 2, completed95: 1 });
  });

  test('computes exact average and PERCENTILE_CONT-compatible p50/p90', () => {
    const events: YoutubeAnalyticsFixtureEvent[] = [];
    [10, 20, 30, 40, 50].forEach((active, index) => {
      const playback = `p-${index}`;
      events.push(event('youtube_playback_start', FROM + index * 10 + 1, { playback_id: playback }));
      events.push(event('youtube_playback_end', FROM + index * 10 + 2, { playback_id: playback, active_watch_ms: active, duration_ms: 100 }));
    });
    expect(aggregate(events).summary).toMatchObject({ averageActiveWatchMs: 30, p50ActiveWatchMs: 30, p90ActiveWatchMs: 46 });
  });

  test('includes from, excludes to, and attributes attempts to UTC start day', () => {
    const midnight = FROM + DAY;
    const snapshot = aggregate([
      event('youtube_home_entry_click', FROM),
      event('youtube_home_entry_click', TO),
      event('youtube_playback_start', midnight - 1, { playback_id: 'boundary' }),
      event('youtube_playback_end', midnight + 1, { playback_id: 'boundary', active_watch_ms: 50, duration_ms: 100 }),
    ]);
    expect(snapshot.summary.homeClicks).toBe(1);
    expect(snapshot.trend[0]).toMatchObject({ day: '2026-01-01', playbackStarts: 1, activeWatchMs: 50 });
  });

  test('groups a rolling non-midnight duration across both touched UTC days', () => {
    const fromMicros = FROM + DAY / 2;
    const toMicros = fromMicros + DAY;
    const snapshot = aggregateYoutubeAnalytics([
      event('youtube_home_entry_click', FROM + DAY + 1),
    ], {
      fromMicros, toMicros, generatedAtMicros: toMicros,
      filters: { rangeDays: 7, platform: 'all' },
    });
    expect(snapshot.trend.map(row => row.day)).toEqual(['2026-01-01', '2026-01-02']);
    expect(snapshot.trend[1].homeClicks).toBe(1);
  });

  test('applies platform/channel/video filters and makes early funnel steps not applicable for video', () => {
    const events = [
      event('youtube_home_entry_click'),
      event('youtube_catalog_open', FROM + 2),
      event('youtube_video_select', FROM + 3),
      event('youtube_playback_start', FROM + 4),
      event('youtube_playback_end', FROM + 5, { active_watch_ms: 80, duration_ms: 100 }),
      event('youtube_video_select', FROM + 6, { platform: 'ios', channel_id: 'channel-2', video_id: 'video-2' }),
    ];
    const snapshot = aggregate(events, { platform: 'android', channelId: 'channel-1', videoId: 'video-1' });
    expect(snapshot.summary.videoSelects).toBe(1);
    expect(snapshot.funnel[0]).toMatchObject({ step: 'home', status: 'not_applicable' });
    expect(snapshot.funnel[1]).toMatchObject({ step: 'catalog', status: 'not_applicable' });
    expect(snapshot.funnel[2]).toMatchObject({ step: 'select', count: 1, percentOfPrevious: null });
  });

  test('scopes all quality metrics and data-through to the selected video', () => {
    const onlyOutside = aggregate([
      event('youtube_video_select', FROM + 20, { video_id: 'video-2' }),
    ], { videoId: 'video-1' });
    expect(onlyOutside.quality).toMatchObject({ totalEvents: 0, acceptedEvents: 0, validationRatio: 0, state: 'empty' });
    expect(onlyOutside.dataThroughMicros).toBeNull();

    const mixed = aggregate([
      event('youtube_video_select', FROM + 10, { video_id: 'video-1' }),
      event('youtube_video_select', FROM + 30, { video_id: 'video-2' }),
      event('youtube_video_select', FROM + 15, { video_id: 'video-1', schema_version: 2 }),
      event('youtube_video_select', FROM + 16, { video_id: 'video-1', session_id: '' }),
    ], { videoId: 'video-1' });
    expect(mixed.quality).toMatchObject({
      totalEvents: 3, acceptedEvents: 1, unknownSchema: 1, missingRequiredFields: 1,
      validationRatio: 1 / 3, state: 'partial',
    });
    expect(mixed.dataThroughMicros).toBe(FROM + 16);
  });

  test('scopes quality to the selected channel without leaking another channel timestamp', () => {
    const snapshot = aggregate([
      event('youtube_home_entry_click', FROM + 10, { channel_id: 'channel-1' }),
      event('youtube_home_entry_click', FROM + 50, { channel_id: 'channel-2' }),
    ], { channelId: 'channel-1' });
    expect(snapshot.quality).toMatchObject({ totalEvents: 1, acceptedEvents: 1, validationRatio: 1 });
    expect(snapshot.dataThroughMicros).toBe(FROM + 10);
  });

  test('reports both conflict counters when one candidate changes video and channel', () => {
    const snapshot = aggregate([
      event('youtube_playback_start', FROM + 1),
      event('youtube_playback_end', FROM + 2, {
        video_id: 'video-2', channel_id: 'channel-2', active_watch_ms: 10, duration_ms: 100,
      }),
    ]);
    expect(snapshot.summary.playbackStarts).toBe(0);
    expect(snapshot.quality).toMatchObject({ conflictingVideo: 1, conflictingChannel: 1 });
  });

  test('reports missing-start and both conflicts independently before excluding one candidate', () => {
    const snapshot = aggregate([
      event('youtube_playback_checkpoint', FROM + 1, { active_watch_ms: 5, duration_ms: 100 }),
      event('youtube_playback_end', FROM + 2, {
        video_id: 'video-2', channel_id: 'channel-2', active_watch_ms: 10, duration_ms: 100,
      }),
    ]);
    expect(snapshot.summary).toMatchObject({ playbackStarts: 0, watchAttempts: 0, totalActiveWatchMs: 0 });
    expect(snapshot.quality).toMatchObject({
      rowsWithoutStart: 1, duplicateStartAttempts: 0, conflictingVideo: 1, conflictingChannel: 1,
      acceptedEvents: 0,
    });
  });

  test('counts ordered distinct-session funnel and rejects out-of-order or equal timestamps', () => {
    const ordered = ['youtube_home_entry_click', 'youtube_catalog_open', 'youtube_video_select', 'youtube_playback_start'] as const;
    const events = ordered.map((name, index) => event(name, FROM + index, { session_id: 'ordered', playback_id: 'ordered' }));
    events.push(event('youtube_playback_checkpoint', FROM + 5, { session_id: 'ordered', playback_id: 'ordered', active_watch_ms: 25, duration_ms: 100 }));
    events.push(event('youtube_playback_end', FROM + 10, { session_id: 'ordered', playback_id: 'ordered', active_watch_ms: 80, duration_ms: 100 }));
    events.push(event('youtube_video_select', FROM + 20, { session_id: 'reverse', playback_id: 'reverse' }));
    events.push(event('youtube_catalog_open', FROM + 21, { session_id: 'reverse', playback_id: 'reverse' }));
    const equalAt = FROM + 30;
    ordered.forEach(name => events.push(event(name, equalAt, { session_id: 'equal', playback_id: 'equal' })));
    events.push(event('youtube_playback_end', equalAt, { session_id: 'equal', playback_id: 'equal', active_watch_ms: 80, duration_ms: 100 }));
    const funnel = aggregate(events).funnel;
    expect(funnel.map(row => row.count)).toEqual([2, 1, 1, 1, 1, 1]);
    expect(funnel.every((row, i) => i === 0 || (row.count ?? 0) <= (funnel[i - 1].count ?? 0))).toBe(true);
  });

  test('funnel finds a continuation-capable later select instead of stopping at a dead branch', () => {
    const snapshot = aggregate([
      event('youtube_home_entry_click', FROM + 1),
      event('youtube_catalog_open', FROM + 2),
      event('youtube_video_select', FROM + 3, { video_id: 'dead-video' }),
      event('youtube_video_select', FROM + 4, { video_id: 'video-1' }),
      event('youtube_playback_start', FROM + 5),
      event('youtube_playback_checkpoint', FROM + 6, { active_watch_ms: 25, duration_ms: 100 }),
      event('youtube_playback_end', FROM + 7, { active_watch_ms: 80, duration_ms: 100 }),
    ]);
    expect(snapshot.funnel.map(row => row.count)).toEqual([1, 1, 1, 1, 1, 1]);
  });

  test('funnel threshold timing uses the same final selected duration as summary', () => {
    const snapshot = aggregate([
      event('youtube_home_entry_click', FROM + 1),
      event('youtube_catalog_open', FROM + 2),
      event('youtube_video_select', FROM + 3),
      event('youtube_playback_start', FROM + 4),
      event('youtube_playback_checkpoint', FROM + 5, { active_watch_ms: 30, duration_ms: 100 }),
      event('youtube_playback_end', FROM + 6, { active_watch_ms: 60, duration_ms: 1_000 }),
    ]);
    expect(snapshot.summary.completed25).toBe(0);
    expect(snapshot.funnel.find(row => row.step === 'completed25')?.count).toBe(0);
  });

  test('funnel can use later repeated threshold callbacks for a strict 25 then 75 chain', () => {
    const snapshot = aggregate([
      event('youtube_home_entry_click', FROM + 1),
      event('youtube_catalog_open', FROM + 2),
      event('youtube_video_select', FROM + 3),
      event('youtube_playback_start', FROM + 4),
      event('youtube_playback_checkpoint', FROM + 5, { active_watch_ms: 80, duration_ms: 100 }),
      event('youtube_playback_checkpoint', FROM + 6, { active_watch_ms: 80, duration_ms: 100 }),
    ]);
    expect(snapshot.funnel.find(row => row.step === 'completed25')?.count).toBe(1);
    expect(snapshot.funnel.find(row => row.step === 'completed75')?.count).toBe(1);
  });

  test('applies Android platform scoping before event-id dedupe and candidate construction', () => {
    const ios = event('youtube_home_entry_click', FROM + 1, { platform: 'ios', event_id: 'same-id' });
    const android = event('youtube_home_entry_click', FROM + 2, { platform: 'android', event_id: 'same-id' });
    const snapshot = aggregate([ios, android], { platform: 'android' });
    expect(snapshot.summary.homeClicks).toBe(1);
    expect(snapshot.quality).toMatchObject({ totalEvents: 1, acceptedEvents: 1, duplicates: 0, validationRatio: 1 });
    expect(snapshot.dataThroughMicros).toBe(FROM + 2);
  });

  test('applies iOS platform scoping before event-id dedupe and candidate construction', () => {
    const ios = event('youtube_home_entry_click', FROM + 1, { platform: 'ios', event_id: 'same-id' });
    const android = event('youtube_home_entry_click', FROM + 2, { platform: 'android', event_id: 'same-id' });
    const snapshot = aggregate([ios, android], { platform: 'ios' });
    expect(snapshot.summary.homeClicks).toBe(1);
    expect(snapshot.quality).toMatchObject({ totalEvents: 1, acceptedEvents: 1, duplicates: 0, validationRatio: 1 });
    expect(snapshot.dataThroughMicros).toBe(FROM + 1);
  });

  test('takes latest nonempty select title for exact channel/video, caps Unicode safely, otherwise null', () => {
    const long = '😀'.repeat(101);
    const snapshot = aggregate([
      event('youtube_video_select', FROM + 1, { video_title: 'Old' }),
      event('youtube_video_select', FROM + 2, { video_title: long }),
      event('youtube_playback_start', FROM + 3),
      event('youtube_playback_start', FROM + 4, { playback_id: 'p2', video_id: 'video-2' }),
    ]);
    expect([...snapshot.videos[0].title ?? ''].length).toBe(100);
    expect(snapshot.videos.find(row => row.videoId === 'video-2')?.title).toBeNull();
  });

  test('does not let a later whitespace-only title replace a normalized title', () => {
    const snapshot = aggregate([
      event('youtube_video_select', FROM + 1, { video_title: '  Real title  ' }),
      event('youtube_video_select', FROM + 2, { video_title: '   ' }),
    ]);
    expect(snapshot.videos[0].title).toBe('Real title');
  });

  test('latest-title ties use Unicode code-point event-id order matching BigQuery', () => {
    const at = FROM + 1;
    const snapshot = aggregate([
      event('youtube_video_select', at, { event_id: '\uE000', video_title: 'private-use title' }),
      event('youtube_video_select', at, { event_id: '😀', video_title: 'emoji title' }),
    ]);
    expect(snapshot.videos[0].title).toBe('emoji title');
  });

  test('rejects malformed unpaired-surrogate identifiers before Unicode ordering', () => {
    const snapshot = aggregate([
      event('youtube_video_select', FROM + 1, { event_id: '\uD800', video_title: 'unsafe id' }),
    ]);
    expect(snapshot.quality).toMatchObject({ acceptedEvents: 0, missingRequiredFields: 1 });
  });

  test('dedupe tie-breaking is deterministic for payload-conflicting rows regardless of input order', () => {
    const start = event('youtube_playback_start', FROM + 1);
    const low = event('youtube_playback_end', FROM + 2, { event_id: 'duplicate-end', active_watch_ms: 20, duration_ms: 100 });
    const high = { ...low, active_watch_ms: 80 };
    const first = aggregate([start, low, high]);
    const second = aggregate([start, high, low]);
    expect(first.summary).toEqual(second.summary);
    expect(first.quality.duplicates).toBe(1);
  });

  test('dedupe uses BigQuery-compatible code-point order rather than locale order', () => {
    const start = event('youtube_playback_start', FROM + 1);
    const upper = event('youtube_playback_end', FROM + 2, { event_id: 'case-tie', session_id: 'Z', active_watch_ms: 80, duration_ms: 100 });
    const lower = { ...upper, session_id: 'a', active_watch_ms: 20 };
    const snapshot = aggregate([start, lower, upper]);
    expect(snapshot.summary.totalActiveWatchMs).toBe(80);
  });

  test('sorts stably, computes 201 rows, returns 200, and reports truncation', () => {
    const events: YoutubeAnalyticsFixtureEvent[] = [];
    for (let index = 0; index < 201; index += 1) {
      events.push(event('youtube_playback_start', FROM + index, {
        channel_id: `channel-${String(index).padStart(3, '0')}`,
        video_id: `video-${String(index).padStart(3, '0')}`,
        playback_id: `playback-${index}`,
      }));
    }
    const snapshot = aggregate(events);
    expect(snapshot.videos).toHaveLength(200);
    expect(snapshot.videos[0].videoId).toBe('video-000');
    expect(snapshot.quality).toMatchObject({ videosTruncated: true, videoRowsReturned: 200 });
  });

  test('sets ready, empty, and partial deterministically', () => {
    expect(aggregate([event('youtube_home_entry_click')]).quality.state).toBe('ready');
    expect(aggregate([]).quality.state).toBe('empty');
    expect(aggregate([event('youtube_home_entry_click'), event('youtube_home_entry_click', FROM + 2, { schema_version: 2 })]).quality.state).toBe('partial');
  });

  test('serialized snapshot contains no raw identity or event identifiers', () => {
    const json = JSON.stringify(aggregate([event('youtube_home_entry_click')]));
    ['user_pseudo_id', 'session_id', 'playback_id', 'event_id', 'raw'].forEach(forbidden => expect(json).not.toContain(forbidden));
  });
});

describe('BigQuery SQL semantic contract', () => {
  const builtQuery = () => buildYoutubeAnalyticsSql('project-1.analytics_123.events_*', {
    fromMicros: FROM,
    toMicros: TO,
    filters: { rangeDays: 7, platform: 'android', videoId: 'video-1' },
  });

  test('uses parameterized exact window/filter predicates and suffix pruning', () => {
    const built = builtQuery();
    expect(built.sql).toContain('event_timestamp >= @fromMicros');
    expect(built.sql).toContain('event_timestamp < @toMicros');
    expect(built.sql).toContain('_TABLE_SUFFIX BETWEEN @fromSuffix AND @toSuffix');
    expect(built.sql).toContain("@platform = 'all'");
    expect(built.sql).toContain('@videoId IS NULL');
    expect(built.sql).toContain('@channelId IS NULL');
    expect(built.sql).toContain('schema_version = 1');
    expect(built.sql).toContain('IFNULL(schema_version = 1,FALSE)');
    expect(built.sql).toContain("NULLIF(TRIM(video_title),'')");
    expect(built.sql).toContain('normalized_window AS');
    expect(built.sql).toContain('CHAR_LENGTH(video_id)<=256');
    expect(built.sql).toContain("(@videoId IS NULL OR video_id=@videoId)");
    expect(built.sql).toContain("(@channelId IS NULL OR channel_id=@channelId)");
    expect(built.sql).toMatch(/classified AS \([\s\S]*?FROM normalized_window[\s\S]*?\), platform_classified AS \([\s\S]*?\), scoped_classified AS \([\s\S]*?AND \(@channelId IS NULL OR channel_id=@channelId\)/);
    expect(built.sql).toContain('selected_scope');
    expect(built.sql).toMatch(/platform_classified AS \([\s\S]*?WHERE @platform = 'all' OR platform = @platform[\s\S]*?\), scoped_classified AS/);
    expect(built.sql).toContain("BigQuery's default binary ordering compares Unicode code points");
    expect(built.params).toEqual({
      fromMicros: FROM,
      toMicros: TO,
      fromSuffix: '20260101',
      toSuffix: '20260107',
      platform: 'android',
      videoId: 'video-1',
      channelId: null,
    });
  });

  test('derives pruning suffixes from both UTC dates touched by a rolling window', () => {
    const built = buildYoutubeAnalyticsSql('project-1.analytics_123.events_*', {
      fromMicros: FROM + DAY / 2,
      toMicros: FROM + DAY + DAY / 2,
      filters: { rangeDays: 7, platform: 'all' },
    });
    expect(built.params).toMatchObject({ fromSuffix: '20260101', toSuffix: '20260102' });
  });

  test('contains dedupe, conflict-before-attempt, exact duration/active semantics, funnel, title and stable limit contract', () => {
    const sql = builtQuery().sql;
    ['deduped', 'candidate_conflicts', 'valid_starts', 'active_watch_ms > 0', 'duration_ms BETWEEN 1 AND 86400000',
      '0.25', '0.50', '0.75', '0.95', 'ROW_NUMBER() OVER', 'latest_titles', 'select_paths',
      'ORDER BY playback_starts DESC, active_watch_ms DESC, channel_id ASC, video_id ASC', 'LIMIT 201']
      .forEach(fragment => expect(sql).toContain(fragment));
    expect(sql).not.toContain('user_pseudo_id AS user_pseudo_id');
    ['summary_rows', 'trend_rows', 'funnel_rows', 'video_rows', 'quality_rows']
      .forEach(cte => expect(sql).toContain(`FROM ${cte}`));
  });

  test('decodes a complete typed row contract and truncates the 201st video', () => {
    const rows: Array<{ row_kind: string; payload_json: string }> = [
      { row_kind: 'summary', payload_json: JSON.stringify({
        homeClicks: 1, catalogOpens: 1, videoSelects: 1, playerReady: 1, playbackStarts: 1,
        anonymousInstancesWithValidStart: 1, watchAttempts: 1, totalActiveWatchMs: 50,
        averageActiveWatchMs: 50, p50ActiveWatchMs: 50, p90ActiveWatchMs: 50,
        completed25: 1, completed50: 1, completed75: 0, completed95: 0,
        externalVideoOpens: 0, channelOpens: 0,
      }) },
      { row_kind: 'trend', payload_json: JSON.stringify({ day: '2026-01-01', homeClicks: 1, catalogOpens: 1, videoSelects: 1, playbackStarts: 1, activeWatchMs: 50 }) },
      ...(['home', 'catalog', 'select', 'start', 'completed25', 'completed75'] as const).map((step, index) => ({
        row_kind: 'funnel', payload_json: JSON.stringify({ step, status: index < 2 ? 'not_applicable' : 'ready', count: index < 2 ? null : 1, percentOfPrevious: null }),
      })),
      ...Array.from({ length: 201 }, (_, index) => ({ row_kind: 'video', payload_json: JSON.stringify({
        channelId: `c-${String(index).padStart(3, '0')}`, videoId: `v-${index}`, title: null,
        videoSelects: 0, playbackStarts: 1, anonymousInstances: 1, activeWatchMs: 50,
        averageActiveWatchMs: 50, p50ActiveWatchMs: 50, p90ActiveWatchMs: 50,
        completed25: 1, completed50: 1, completed75: 0, completed95: 0,
      }) })),
      { row_kind: 'quality', payload_json: JSON.stringify({
        state: 'ready', totalEvents: 4, acceptedEvents: 4, validationRatio: 1,
        missingRequiredFields: 0, duplicates: 0, unknownSchema: 0, rowsWithoutStart: 0,
        conflictingVideo: 0, conflictingChannel: 0, duplicateStartAttempts: 0,
        invalidDurationAttempts: 0, unfinishedAttempts: 0, dataThroughMicros: TO - 1,
      }) },
    ];
    const snapshot = decodeYoutubeAnalyticsQueryRows(rows, {
      fromMicros: FROM, toMicros: TO, generatedAtMicros: TO + 1,
      filters: { rangeDays: 7, platform: 'android', videoId: 'video-1' },
    });
    expect(snapshot.videos).toHaveLength(200);
    expect(snapshot.quality).toMatchObject({ videosTruncated: true, videoRowsReturned: 200 });
    expect(JSON.stringify(snapshot)).not.toContain('payload_json');
  });

  test('decoder rejects unknown row kinds and unsafe numeric payloads', () => {
    const context = { fromMicros: FROM, toMicros: TO, generatedAtMicros: TO, filters: { rangeDays: 7 as const, platform: 'all' as const } };
    expect(() => decodeYoutubeAnalyticsQueryRows([{ row_kind: 'raw', payload_json: '{}' }], context))
      .toThrow(InvalidYoutubeAnalyticsRequestError);
    expect(() => decodeYoutubeAnalyticsQueryRows([{ row_kind: 'summary', payload_json: '{"homeClicks":-1}' }], context))
      .toThrow(InvalidYoutubeAnalyticsRequestError);
  });
});
