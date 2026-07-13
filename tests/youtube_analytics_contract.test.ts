import {
  MAX_YOUTUBE_PLAYER_MESSAGE_LENGTH,
  buildYoutubeAnalyticsEvent,
  parseYoutubePlayerMessage,
  type YoutubeAnalyticsEventInput,
} from '../app/youtube_analytics_contract';

const common = {
  eventId: 'event-1',
  sessionId: 'session-1',
  channelId: 'UC_channel_1',
  platform: 'ios' as const,
  appVersion: '2.0.0',
  buildNumber: '200',
  occurredAtMs: 1_234,
};

const validInputs: YoutubeAnalyticsEventInput[] = [
  { ...common, eventName: 'youtube_home_entry_click', source: 'home' },
  { ...common, eventName: 'youtube_catalog_open', source: 'home' },
  {
    ...common,
    eventName: 'youtube_video_select',
    source: 'catalog',
    videoId: 'video_1',
    videoTitle: `  A   useful\n title ${'x'.repeat(120)}  `,
  },
  { ...common, eventName: 'youtube_player_ready', source: 'player', videoId: 'video_1' },
  {
    ...common,
    eventName: 'youtube_playback_start',
    source: 'player',
    videoId: 'video_1',
    playbackId: 'playback-1',
  },
  {
    ...common,
    eventName: 'youtube_playback_checkpoint',
    source: 'player',
    videoId: 'video_1',
    playbackId: 'playback-1',
    activeWatchMs: 10_000,
    positionMs: 12_000,
    durationMs: 60_000,
    maxPositionPermille: 200,
  },
  {
    ...common,
    eventName: 'youtube_playback_end',
    source: 'player',
    videoId: 'video_1',
    playbackId: 'playback-1',
    activeWatchMs: 20_000,
    positionMs: 30_000,
    durationMs: 60_000,
    maxPositionPermille: 500,
    endReason: 'ended',
  },
  {
    ...common,
    eventName: 'youtube_external_video_open',
    source: 'catalog',
    videoId: 'video_1',
  },
  {
    ...common,
    eventName: 'youtube_external_video_open',
    source: 'player',
    videoId: 'video_1',
  },
  { ...common, eventName: 'youtube_channel_open', source: 'catalog' },
  {
    ...common,
    eventName: 'youtube_channel_open',
    source: 'player',
    videoId: 'video_1',
  },
];

describe('YouTube analytics contract', () => {
  it.each(validInputs)('builds the valid $eventName/$source payload form', (input) => {
    const built = buildYoutubeAnalyticsEvent(input);

    const expectedKeys = [
      'app_version',
      'build_number',
      'channel_id',
      'event_id',
      'occurred_at_ms',
      'platform',
      'schema_version',
      'session_id',
      'source',
      ...('videoId' in input && input.videoId ? ['video_id'] : []),
      ...('videoTitle' in input && input.videoTitle ? ['video_title'] : []),
      ...('playbackId' in input && input.playbackId ? ['playback_id'] : []),
      ...('activeWatchMs' in input ? [
        'active_watch_ms',
        'duration_ms',
        'max_position_permille',
        'position_ms',
      ] : []),
      ...('endReason' in input && input.endReason ? ['end_reason'] : []),
    ].sort();

    expect(built.eventName).toBe(input.eventName);
    expect(Object.keys(built.payload).sort()).toEqual(expectedKeys);
    expect(built.payload.schema_version).toBe(1);
    expect(built.payload.event_id).toBe('event-1');
    expect(built.payload.session_id).toBe('session-1');
    expect(built.payload.channel_id).toBe('UC_channel_1');
    expect(built.payload.source).toBe(input.source);
    expect(built.payload.platform).toBe('ios');
    expect(built.payload.app_version).toBe('2.0.0');
    expect(built.payload.build_number).toBe('200');
    expect(built.payload.occurred_at_ms).toBe(1_234);
    expect(built.payload).not.toHaveProperty('product_session_id');
    if (input.eventName === 'youtube_video_select') {
      expect(built.payload.video_title).toHaveLength(100);
      expect(built.payload.video_title).not.toMatch(/\s{2,}/);
    } else {
      expect(built.payload).not.toHaveProperty('video_title');
    }
  });

  it.each([
    ['missing session', { ...common, sessionId: '', eventName: 'youtube_home_entry_click', source: 'home' }],
    ['invalid session', { ...common, sessionId: 'private user text', eventName: 'youtube_home_entry_click', source: 'home' }],
    ['trimmed session', { ...common, sessionId: ' session-1 ', eventName: 'youtube_home_entry_click', source: 'home' }],
    ['punctuation-only session', { ...common, sessionId: '---', eventName: 'youtube_home_entry_click', source: 'home' }],
    ['missing event ID', { ...common, eventId: '', eventName: 'youtube_home_entry_click', source: 'home' }],
    ['missing channel ID', { ...common, channelId: '', eventName: 'youtube_home_entry_click', source: 'home' }],
    ['unknown platform', { ...common, platform: 'web', eventName: 'youtube_home_entry_click', source: 'home' }],
    ['nonfinite occurrence', { ...common, occurredAtMs: Number.NaN, eventName: 'youtube_home_entry_click', source: 'home' }],
    ['wrong source', { ...common, eventName: 'youtube_home_entry_click', source: 'player' }],
    ['missing video', { ...common, eventName: 'youtube_player_ready', source: 'player' }],
    ['invalid video punctuation', { ...common, eventName: 'youtube_player_ready', source: 'player', videoId: 'video.bad' }],
    ['missing select title', { ...common, eventName: 'youtube_video_select', source: 'catalog', videoId: 'video_1' }],
    ['catalog channel with video', { ...common, eventName: 'youtube_channel_open', source: 'catalog', videoId: 'video_1' }],
    ['player channel without video', { ...common, eventName: 'youtube_channel_open', source: 'player' }],
    ['playback ID on ready', { ...common, eventName: 'youtube_player_ready', source: 'player', videoId: 'video_1', playbackId: 'p1' }],
    ['missing playback ID', { ...common, eventName: 'youtube_playback_start', source: 'player', videoId: 'video_1' }],
    ['title outside select', { ...common, eventName: 'youtube_player_ready', source: 'player', videoId: 'video_1', videoTitle: 'private' }],
    ['nonfinite checkpoint', { ...validInputs[5], activeWatchMs: Number.POSITIVE_INFINITY }],
    ['negative position', { ...validInputs[5], positionMs: -1 }],
    ['oversized duration', { ...validInputs[6], durationMs: 86_400_001 }],
    ['oversized permille', { ...validInputs[6], maxPositionPermille: 1_001 }],
    ['numeric field on start', { ...validInputs[4], positionMs: 0 }],
  ])('rejects invalid combination: %s', (_label, input) => {
    expect(() => buildYoutubeAnalyticsEvent(input as YoutubeAnalyticsEventInput)).toThrow();
  });

  it('accepts identifiers at the boundary and rejects oversized identifiers', () => {
    const eventId = `e${'x'.repeat(79)}`;
    expect(buildYoutubeAnalyticsEvent({
      ...common,
      eventId,
      eventName: 'youtube_home_entry_click',
      source: 'home',
    }).payload.event_id).toBe(eventId);
    expect(() => buildYoutubeAnalyticsEvent({
      ...common,
      eventId: `${eventId}x`,
      eventName: 'youtube_home_entry_click',
      source: 'home',
    })).toThrow('Invalid eventId');
  });

  it('rejects governed non-YouTube events with an intentional error', () => {
    expect(() => buildYoutubeAnalyticsEvent({
      ...common,
      eventName: 'product_session_start',
      source: 'home',
    } as unknown as YoutubeAnalyticsEventInput)).toThrow('unsupported_youtube_event');
  });

  it('truncates titles by Unicode code point without splitting emoji', () => {
    const videoTitle = `${'a'.repeat(99)}😀tail`;
    const built = buildYoutubeAnalyticsEvent({
      ...common,
      eventName: 'youtube_video_select',
      source: 'catalog',
      videoId: 'video_1',
      videoTitle,
    });

    expect(Array.from(built.payload.video_title as string)).toHaveLength(100);
    expect(built.payload.video_title).toBe(`${'a'.repeat(99)}😀`);
  });

  it.each(['\uD800broken', 'broken\uDC00'])('rejects malformed title surrogate data', (videoTitle) => {
    expect(() => buildYoutubeAnalyticsEvent({
      ...common,
      eventName: 'youtube_video_select',
      source: 'catalog',
      videoId: 'video_1',
      videoTitle,
    })).toThrow('Invalid videoTitle');
  });

  it.each([
    ['{"version":1,"type":"ready","ignored":"value"}', { version: 1, type: 'ready' }],
    [
      '{"version":1,"type":"state","state":1,"positionMs":123,"durationMs":456,"ignored":true}',
      { version: 1, type: 'state', state: 1, positionMs: 123, durationMs: 456 },
    ],
    ['{"version":1,"type":"error","code":150,"message":"private"}', { version: 1, type: 'error', code: 150 }],
  ])('parses and allowlists a player message', (raw, expected) => {
    expect(parseYoutubePlayerMessage(raw)).toEqual(expected);
  });

  it.each([2, 5, 100, 101, 150] as const)('accepts known YouTube player error code %s', (code) => {
    expect(parseYoutubePlayerMessage(JSON.stringify({ version: 1, type: 'error', code }))).toEqual({
      version: 1,
      type: 'error',
      code,
    });
  });

  it('accepts the exact player-message size boundary and rejects one character over it', () => {
    const ready = '{"version":1,"type":"ready"}';
    const atBoundary = ready + ' '.repeat(MAX_YOUTUBE_PLAYER_MESSAGE_LENGTH - ready.length);
    const oversized = `${atBoundary} `;

    expect(atBoundary).toHaveLength(MAX_YOUTUBE_PLAYER_MESSAGE_LENGTH);
    expect(parseYoutubePlayerMessage(atBoundary)).toEqual({ version: 1, type: 'ready' });
    const parseSpy = jest.spyOn(JSON, 'parse');
    try {
      expect(parseYoutubePlayerMessage(oversized)).toBeNull();
      expect(parseSpy).not.toHaveBeenCalled();
    } finally {
      parseSpy.mockRestore();
    }
  });

  it.each([
    ['not json'],
    ['{"version":2,"type":"ready"}'],
    ['{"version":1,"type":"unknown"}'],
    ['{"version":1,"type":"state","state":4,"positionMs":0,"durationMs":1}'],
    ['{"version":1,"type":"state","state":1,"positionMs":-1,"durationMs":1}'],
    ['{"version":1,"type":"state","state":1,"positionMs":0,"durationMs":86400001}'],
    ['{"version":1,"type":"state","state":1,"positionMs":0}'],
    ['{"version":1,"type":"error","code":999}'],
    [null],
  ])('rejects an unknown or malformed player message', (raw) => {
    expect(parseYoutubePlayerMessage(raw)).toBeNull();
  });
});
