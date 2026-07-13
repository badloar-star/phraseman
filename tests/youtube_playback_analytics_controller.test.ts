import {
  createYoutubePlaybackAnalyticsController,
  mapYoutubePlaybackEndReason,
} from '../app/youtube_playback_analytics_controller';

function createHarness(initialActive: boolean, initialSession: string | null = 'session-A') {
  let now = 0;
  let session = initialSession;
  const sent: { eventName: string; source: string; sessionId: string; channelId: string; videoId?: string }[] = [];
  const controller = createYoutubePlaybackAnalyticsController({
    videoId: 'video_1', channelId: 'channel_A', initiallyActive: initialActive,
    now: () => now, createId: () => 'play-1', readSessionId: () => session,
    emit: (event, sessionId) => { sent.push({ eventName: event.eventName, source: event.source, sessionId, channelId: event.channelId, videoId: 'videoId' in event ? event.videoId : undefined }); return true; },
  });
  return { controller, sent, setNow: (value: number) => { now = value; }, setSession: (value: string | null) => { session = value; } };
}

describe('YouTube playback analytics controller', () => {
  test.each([false])('initial hidden/background state blocks late playing until visible', initiallyActive => {
    const h = createHarness(initiallyActive);
    h.controller.setConsent(true);
    h.controller.handleState('playing');
    expect(h.sent).toEqual([]);
    h.controller.setVisible(true);
    h.controller.handleState('playing');
    expect(h.sent.map(event => event.eventName)).toEqual(['youtube_playback_start']);
  });

  test('grant while hidden and a hidden replacement both remain inactive', () => {
    const first = createHarness(false);
    first.controller.setConsent(true);
    first.controller.handleState('playing');
    const replacement = createHarness(false);
    replacement.controller.setConsent(true);
    replacement.controller.handleState('playing');
    expect(first.sent).toEqual([]);
    expect(replacement.sent).toEqual([]);
  });

  test('pins session and channel for start checkpoint end across global rollover', () => {
    const h = createHarness(true);
    h.controller.setConsent(true);
    h.controller.handleState('playing', { positionMs: 0, durationMs: 30_000 });
    h.setSession('session-B');
    h.setNow(10_000);
    h.controller.tick({ positionMs: 10_000, durationMs: 30_000 });
    h.setNow(12_000);
    h.controller.finish('exit', { positionMs: 12_000, durationMs: 30_000 });
    expect(h.sent.map(event => [event.eventName, event.sessionId, event.channelId])).toEqual([
      ['youtube_playback_start', 'session-A', 'channel_A'],
      ['youtube_playback_checkpoint', 'session-A', 'channel_A'],
      ['youtube_playback_end', 'session-A', 'channel_A'],
    ]);
    const next = createHarness(true, 'session-B');
    next.controller.setConsent(true);
    next.controller.handleState('playing');
    expect(next.sent[0]?.sessionId).toBe('session-B');
  });

  test('same controller pins a fresh session after terminal replay', () => {
    const h = createHarness(true);
    h.controller.setConsent(true);
    h.controller.handleState('playing');
    h.controller.finish('ended');
    h.setSession('session-B');
    h.controller.handleState('playing');
    h.setNow(10_000);
    h.controller.tick();
    h.controller.finish('exit');
    expect(h.sent.map(event => [event.eventName, event.sessionId])).toEqual([
      ['youtube_playback_start', 'session-A'], ['youtube_playback_end', 'session-A'],
      ['youtube_playback_start', 'session-B'], ['youtube_playback_checkpoint', 'session-B'],
      ['youtube_playback_end', 'session-B'],
    ]);
  });

  test('revoke clears attempt session so regrant and replay use the new global session', () => {
    const h = createHarness(true);
    h.controller.setConsent(true);
    h.controller.handleState('playing');
    h.controller.revokeConsent();
    h.setSession('session-B');
    h.controller.setConsent(true);
    h.controller.handleState('playing');
    h.controller.finish('exit');
    expect(h.sent.map(event => [event.eventName, event.sessionId])).toEqual([
      ['youtube_playback_start', 'session-A'], ['youtube_playback_start', 'session-B'],
      ['youtube_playback_end', 'session-B'],
    ]);
  });

  test('consent and ready-time under A do not pin before playback begins under B', () => {
    const h = createHarness(true);
    h.controller.setConsent(true);
    h.setSession('session-B');
    h.controller.handleState('playing');
    expect(h.sent[0]?.sessionId).toBe('session-B');
  });

  test('waits for a valid session and keeps explicit finish plus cleanup idempotent', () => {
    const h = createHarness(true, null);
    h.controller.setConsent(true);
    h.controller.handleState('playing');
    expect(h.sent).toEqual([]);
    h.setSession('session-A');
    h.controller.handleState('playing');
    h.controller.finish('external');
    h.controller.finish('exit');
    expect(h.sent.map(event => event.eventName)).toEqual(['youtube_playback_start', 'youtube_playback_end']);
  });

  test('revoke makes late state/tick/finish silent', () => {
    const h = createHarness(true);
    h.controller.setConsent(true);
    h.controller.handleState('playing');
    h.controller.revokeConsent();
    h.controller.handleState('playing');
    h.controller.tick();
    h.controller.finish('exit');
    expect(h.sent.map(event => event.eventName)).toEqual(['youtube_playback_start']);
  });

  test('maps every runtime end reason exhaustively', () => {
    expect((['ended', 'exit', 'external', 'error'] as const).map(mapYoutubePlaybackEndReason)).toEqual([
      'ended', 'screen_exit', 'external_open', 'error',
    ]);
  });
});
