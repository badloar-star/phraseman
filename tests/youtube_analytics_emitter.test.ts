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
import { emitYoutubeAnalyticsEvent, resetYoutubeCatalogOpenDedupeForTests } from '../app/youtube_analytics_emitter';

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

  test('deduplicates catalog open only for current session and channel', () => {
    const event = { eventName: 'youtube_catalog_open', source: 'home', channelId: 'channel-1' } as const;
    expect(emitYoutubeAnalyticsEvent(event)).toBe(true);
    expect(emitYoutubeAnalyticsEvent(event)).toBe(false);
    sessionId = 'session-2';
    expect(emitYoutubeAnalyticsEvent(event)).toBe(true);
    expect(trackEvent).toHaveBeenCalledTimes(2);
  });

  test('a rejected analytics promise cannot escape into the UI action', () => {
    trackEvent.mockRejectedValueOnce(new Error('offline'));
    expect(() => emitYoutubeAnalyticsEvent({
      eventName: 'youtube_external_video_open', source: 'catalog', channelId: 'channel-1', videoId: 'vid_1',
    })).not.toThrow();
    expect(trackEvent).toHaveBeenCalledTimes(1);
  });
});
