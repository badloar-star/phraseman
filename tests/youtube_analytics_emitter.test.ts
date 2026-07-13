const trackEvent = jest.fn((_name: string, _payload: Record<string, unknown>) => Promise.resolve());
let consent: 'granted' | 'denied' | 'unset' = 'granted';
let sessionId: string | null = 'session-1';

jest.mock('../app/analytics', () => ({ trackEvent: (name: string, payload: Record<string, unknown>) => trackEvent(name, payload) }));
jest.mock('../app/analytics_consent', () => ({ getAnalyticsConsentState: () => consent }));
jest.mock('../app/product_analytics_session_context', () => ({ getProductAnalyticsSessionId: () => sessionId }));
jest.mock('expo-crypto', () => ({ randomUUID: () => 'event-1' }));
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '2.3.4' }, nativeAppVersion: 'fallback', nativeBuildVersion: '91' },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

// Mock factories depend on the mutable gate variables above.
// eslint-disable-next-line import/first
import {
  emitYoutubeAnalyticsEvent,
  resetYoutubeCatalogOpenDedupeForTests,
} from '../app/youtube_analytics_emitter';
// eslint-disable-next-line import/first
import { createYoutubePlaybackRuntime, type YoutubePlaybackRuntimeEvent } from '../app/youtube_playback_runtime';

const YOUTUBE_CATALOG_DEDUPE_MAX_KEYS = 32;

describe('governed YouTube analytics emitter', () => {
  beforeEach(() => {
    trackEvent.mockClear(); consent = 'granted'; sessionId = 'session-1';
    resetYoutubeCatalogOpenDedupeForTests();
  });

  test('sends all nine strict variants with generated app context and title only on select', () => {
    const common = { channelId: 'channel-1' } as const;
    const events = [
      { ...common, eventName: 'youtube_home_entry_click', source: 'home' },
      { ...common, eventName: 'youtube_catalog_open', source: 'home' },
      { ...common, eventName: 'youtube_video_select', source: 'catalog', videoId: 'vid_1', videoTitle: ' Trusted title ' },
      { ...common, eventName: 'youtube_player_ready', source: 'player', videoId: 'vid_1' },
      { ...common, eventName: 'youtube_playback_start', source: 'player', videoId: 'vid_1', playbackId: 'play-1' },
      { ...common, eventName: 'youtube_playback_checkpoint', source: 'player', videoId: 'vid_1', playbackId: 'play-1', activeWatchMs: 10, positionMs: 11, durationMs: 12, maxPositionPermille: 13 },
      { ...common, eventName: 'youtube_playback_end', source: 'player', videoId: 'vid_1', playbackId: 'play-1', activeWatchMs: 10, positionMs: 11, durationMs: 12, maxPositionPermille: 13, endReason: 'ended' },
      { ...common, eventName: 'youtube_external_video_open', source: 'catalog', videoId: 'vid_1' },
      { ...common, eventName: 'youtube_channel_open', source: 'catalog' },
    ] as const;
    events.forEach(event => expect(emitYoutubeAnalyticsEvent(event)).toBe(true));
    expect(trackEvent).toHaveBeenCalledTimes(9);
    const payloads = trackEvent.mock.calls.map(call => call[1] as Record<string, unknown>);
    expect(payloads[0]).toMatchObject({ event_id: 'event-1', session_id: 'session-1', platform: 'android', app_version: '2.3.4', build_number: '91' });
    expect(payloads.filter(payload => 'video_title' in payload)).toEqual([expect.objectContaining({ video_title: 'Trusted title' })]);
  });

  test.each(['denied', 'unset'] as const)('does not build or send when consent is %s', state => {
    consent = state;
    expect(emitYoutubeAnalyticsEvent({ eventName: 'youtube_home_entry_click', source: 'home', channelId: 'channel-1' })).toBe(false);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test('does not send without a valid current product session', () => {
    sessionId = null;
    expect(emitYoutubeAnalyticsEvent({ eventName: 'youtube_home_entry_click', source: 'home', channelId: 'channel-1' })).toBe(false);
    sessionId = ' invalid session ';
    expect(emitYoutubeAnalyticsEvent({ eventName: 'youtube_home_entry_click', source: 'home', channelId: 'channel-1' })).toBe(false);
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test('uses an explicit validated immutable session override without falling back', () => {
    sessionId = 'session-B';
    expect(emitYoutubeAnalyticsEvent(
      { eventName: 'youtube_player_ready', source: 'player', channelId: 'channel-1', videoId: 'vid_1' },
      { sessionId: 'session-A' },
    )).toBe(true);
    expect(trackEvent.mock.calls[0][1]).toMatchObject({ session_id: 'session-A' });
    expect(emitYoutubeAnalyticsEvent(
      { eventName: 'youtube_player_ready', source: 'player', channelId: 'channel-1', videoId: 'vid_1' },
      { sessionId: ' invalid ' },
    )).toBe(false);
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  test('deduplicates A-A and A-B-A per session while retained', () => {
    const eventA = { eventName: 'youtube_catalog_open', source: 'home', channelId: 'channel-A' } as const;
    const eventB = { eventName: 'youtube_catalog_open', source: 'home', channelId: 'channel-B' } as const;
    expect(emitYoutubeAnalyticsEvent(eventA)).toBe(true);
    expect(emitYoutubeAnalyticsEvent(eventA)).toBe(false);
    expect(emitYoutubeAnalyticsEvent(eventB)).toBe(true);
    expect(emitYoutubeAnalyticsEvent(eventA)).toBe(false);
    sessionId = 'session-2';
    expect(emitYoutubeAnalyticsEvent(eventA)).toBe(true);
    expect(trackEvent).toHaveBeenCalledTimes(3);
  });

  test('evicts the oldest catalog key deterministically at the bounded cap', () => {
    for (let index = 0; index < YOUTUBE_CATALOG_DEDUPE_MAX_KEYS; index += 1) {
      expect(emitYoutubeAnalyticsEvent({
        eventName: 'youtube_catalog_open', source: 'home', channelId: `channel-${index}`,
      })).toBe(true);
    }
    expect(emitYoutubeAnalyticsEvent({
      eventName: 'youtube_catalog_open', source: 'home', channelId: 'channel-0',
    })).toBe(false);
    expect(emitYoutubeAnalyticsEvent({
      eventName: 'youtube_catalog_open', source: 'home', channelId: `channel-${YOUTUBE_CATALOG_DEDUPE_MAX_KEYS}`,
    })).toBe(true);
    expect(emitYoutubeAnalyticsEvent({
      eventName: 'youtube_catalog_open', source: 'home', channelId: 'channel-0',
    })).toBe(true);
    expect(trackEvent).toHaveBeenCalledTimes(YOUTUBE_CATALOG_DEDUPE_MAX_KEYS + 2);
  });

  test('a rejected analytics promise cannot escape into the UI action', () => {
    trackEvent.mockRejectedValueOnce(new Error('offline'));
    expect(() => emitYoutubeAnalyticsEvent({
      eventName: 'youtube_external_video_open', source: 'catalog', channelId: 'channel-1', videoId: 'vid_1',
    })).not.toThrow();
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });

  test('revoke makes later player state, tick, unmount finish, and direct UI emission silent', () => {
    let now = 0;
    const emitRuntime = (event: YoutubePlaybackRuntimeEvent) => {
      if (event.kind === 'start') {
        emitYoutubeAnalyticsEvent({ eventName: 'youtube_playback_start', source: 'player', channelId: 'channel-1', videoId: event.videoId, playbackId: event.playbackId });
      } else if (event.kind === 'checkpoint') {
        emitYoutubeAnalyticsEvent({ eventName: 'youtube_playback_checkpoint', source: 'player', channelId: 'channel-1', videoId: event.videoId, playbackId: event.playbackId, activeWatchMs: event.activeWatchMs, positionMs: event.positionMs, durationMs: event.durationMs, maxPositionPermille: event.maxPositionPermille });
      } else {
        emitYoutubeAnalyticsEvent({ eventName: 'youtube_playback_end', source: 'player', channelId: 'channel-1', videoId: event.videoId, playbackId: event.playbackId, activeWatchMs: event.activeWatchMs, positionMs: event.positionMs, durationMs: event.durationMs, maxPositionPermille: event.maxPositionPermille, endReason: 'screen_exit' });
      }
    };
    const runtime = createYoutubePlaybackRuntime({ videoId: 'vid_1', now: () => now, createId: () => 'play-1', emit: emitRuntime });
    runtime.setConsent(true);
    runtime.handleState('playing', { positionMs: 0, durationMs: 30_000 });
    expect(trackEvent).toHaveBeenCalledTimes(1);

    consent = 'denied';
    runtime.revokeConsent();
    now = 20_000;
    runtime.handleState('playing', { positionMs: 20_000, durationMs: 30_000 });
    runtime.tick({ positionMs: 20_000, durationMs: 30_000 });
    runtime.finish('exit', { positionMs: 20_000, durationMs: 30_000 });
    runtime.finish('exit'); // mirrors an unmount cleanup after an explicit back callback
    emitYoutubeAnalyticsEvent({ eventName: 'youtube_player_ready', source: 'player', channelId: 'channel-1', videoId: 'vid_1' });

    expect(trackEvent).toHaveBeenCalledTimes(1);
  });
});
