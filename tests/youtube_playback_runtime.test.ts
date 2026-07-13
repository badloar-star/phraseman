import {
  createYoutubePlaybackRuntime,
  type YoutubePlaybackRuntimeEvent,
} from '../app/youtube_playback_runtime';

function createHarness() {
  let nowMs = 0;
  let idSequence = 0;
  const events: YoutubePlaybackRuntimeEvent[] = [];
  const runtime = createYoutubePlaybackRuntime({
    videoId: 'video_1',
    now: () => nowMs,
    createId: () => `playback-${++idSequence}`,
    emit: event => events.push(event),
  });

  return {
    events,
    runtime,
    advance(ms: number) {
      nowMs += ms;
    },
  };
}

describe('YouTube active-watch runtime', () => {
  it('counts only confirmed PLAYING wall time across pause and seek', () => {
    const h = createHarness();
    h.runtime.setConsent(true);

    h.runtime.handleState('playing', { positionMs: 0, durationMs: 60_000 });
    h.advance(4_000);
    h.runtime.handleState('paused', { positionMs: 4_000, durationMs: 60_000 });
    h.advance(10_000);
    h.runtime.updateProgress({ positionMs: 40_000, durationMs: 60_000 });
    h.runtime.handleState('playing');
    h.advance(3_000);
    h.runtime.background({ positionMs: 43_000, durationMs: 60_000 });

    expect(h.events.filter(event => event.kind === 'start')).toHaveLength(1);
    expect(h.runtime.getSnapshot()).toMatchObject({
      playbackId: 'playback-1',
      activeWatchMs: 7_000,
      positionMs: 43_000,
    });
  });

  it('does not count buffering time and resumes the same attempt', () => {
    const h = createHarness();
    h.runtime.setConsent(true);
    h.runtime.handleState('playing');
    h.advance(2_000);
    h.runtime.handleState('buffering');
    h.advance(8_000);
    h.runtime.handleState('playing');
    h.advance(1_000);
    h.runtime.tick();

    expect(h.runtime.getSnapshot().activeWatchMs).toBe(3_000);
    expect(h.events.filter(event => event.kind === 'start')).toHaveLength(1);
  });

  it('ignores duplicate PLAYING callbacks without resetting or double-starting', () => {
    const h = createHarness();
    h.runtime.setConsent(true);
    h.runtime.handleState('playing');
    h.advance(4_000);
    h.runtime.handleState('playing');
    h.advance(6_000);
    h.runtime.tick();

    expect(h.events.filter(event => event.kind === 'start')).toHaveLength(1);
    expect(h.events.find(event => event.kind === 'checkpoint')).toMatchObject({ activeWatchMs: 10_000 });
  });

  it('emits a cumulative checkpoint at the nominal 10-second active threshold', () => {
    const h = createHarness();
    h.runtime.setConsent(true);
    h.runtime.handleState('playing', { positionMs: 1_000, durationMs: 20_000 });
    h.advance(9_999);
    h.runtime.tick({ positionMs: 10_999 });
    expect(h.events.filter(event => event.kind === 'checkpoint')).toHaveLength(0);

    h.advance(1);
    h.runtime.tick({ positionMs: 11_000 });
    expect(h.events.filter(event => event.kind === 'checkpoint')).toEqual([
      expect.objectContaining({
        kind: 'checkpoint',
        activeWatchMs: 10_000,
        positionMs: 11_000,
        durationMs: 20_000,
        maxPositionPermille: 550,
      }),
    ]);
  });

  it('flushes real active time on pause and never emits checkpoints from idle ticks', () => {
    const h = createHarness();
    h.runtime.setConsent(true);
    h.runtime.handleState('playing');
    h.advance(12_500);
    h.runtime.handleState('paused');

    expect(h.events.find(event => event.kind === 'checkpoint')).toMatchObject({ activeWatchMs: 12_500 });
    h.advance(30_000);
    h.runtime.tick();
    expect(h.events.filter(event => event.kind === 'checkpoint')).toHaveLength(1);
  });

  it.each(['ended', 'exit', 'external', 'error'] as const)(
    'makes %s terminal and repeated terminal calls idempotent',
    reason => {
      const h = createHarness();
      h.runtime.setConsent(true);
      h.runtime.handleState('playing');
      h.advance(1_000);
      h.runtime.finish(reason);
      h.runtime.finish(reason);
      h.advance(5_000);
      h.runtime.tick();

      expect(h.events.filter(event => event.kind === 'end')).toEqual([
        expect.objectContaining({ kind: 'end', reason, activeWatchMs: 1_000 }),
      ]);
      expect(h.runtime.getSnapshot().activeWatchMs).toBe(0);
    },
  );

  it('uses seek position only as bounded progress metadata', () => {
    const h = createHarness();
    h.runtime.setConsent(true);
    h.runtime.handleState('playing', { positionMs: 5_000, durationMs: 100_000 });
    h.advance(1_000);
    h.runtime.updateProgress({ positionMs: 80_000 });
    h.advance(1_000);
    h.runtime.updateProgress({ positionMs: 2_000 });
    h.runtime.finish('ended');

    expect(h.events.find(event => event.kind === 'end')).toMatchObject({
      activeWatchMs: 2_000,
      positionMs: 2_000,
      durationMs: 100_000,
      maxPositionPermille: 800,
    });
  });

  it.each([
    ['unknown', undefined],
    ['zero', 0],
  ] as const)('handles %s duration without invalid progress', (_label, durationMs) => {
    const h = createHarness();
    h.runtime.setConsent(true);
    h.runtime.handleState('playing', { positionMs: 5_000, durationMs });
    h.advance(1_000);
    h.runtime.finish('ended');

    expect(h.events.find(event => event.kind === 'end')).toMatchObject({
      durationMs: 0,
      maxPositionPermille: 0,
    });
  });

  it('sanitizes bounded metadata and ignores non-finite updates', () => {
    const h = createHarness();
    h.runtime.setConsent(true);
    h.runtime.handleState('playing', {
      positionMs: -50,
      durationMs: 100_000_000,
    });
    h.runtime.updateProgress({ positionMs: Number.NaN, durationMs: Number.POSITIVE_INFINITY });
    h.runtime.finish('ended');

    expect(h.events.find(event => event.kind === 'end')).toMatchObject({
      positionMs: 0,
      durationMs: 86_400_000,
      maxPositionPermille: 0,
    });
  });

  it('creates a new playback ID only after a terminal attempt', () => {
    const h = createHarness();
    h.runtime.setConsent(true);
    h.runtime.handleState('playing');
    h.runtime.handleState('paused');
    h.runtime.handleState('playing');
    h.runtime.finish('exit');
    h.runtime.handleState('playing');

    expect(h.events.filter(event => event.kind === 'start')).toEqual([
      expect.objectContaining({ playbackId: 'playback-1' }),
      expect.objectContaining({ playbackId: 'playback-2' }),
    ]);
  });

  it('background and resume preserve the attempt and leave no active interval running', () => {
    const h = createHarness();
    h.runtime.setConsent(true);
    h.runtime.handleState('playing');
    h.advance(2_000);
    h.runtime.background();
    h.advance(20_000);
    h.runtime.tick();
    h.runtime.resume();
    h.advance(5_000);
    h.runtime.tick();
    expect(h.runtime.getSnapshot()).toMatchObject({ playbackId: 'playback-1', activeWatchMs: 2_000 });

    h.runtime.handleState('playing');
    h.advance(1_000);
    h.runtime.finish('exit');
    expect(h.events.find(event => event.kind === 'end')).toMatchObject({
      playbackId: 'playback-1',
      activeWatchMs: 3_000,
    });
  });

  it('hard-stops and clears silently on consent revocation until explicitly granted again', () => {
    const h = createHarness();
    h.runtime.setConsent(true);
    h.runtime.handleState('playing');
    h.advance(11_000);
    const eventCountBeforeRevoke = h.events.length;

    h.runtime.revokeConsent();
    h.runtime.handleState('paused');
    h.runtime.tick();
    h.runtime.finish('ended');
    h.runtime.handleState('playing');
    expect(h.events).toHaveLength(eventCountBeforeRevoke);
    expect(h.runtime.getSnapshot()).toEqual({
      playbackId: null,
      activeWatchMs: 0,
      positionMs: 0,
      durationMs: 0,
      maxPositionPermille: 0,
      isPlaying: false,
    });

    h.runtime.setConsent(true);
    h.runtime.handleState('playing');
    expect(h.events.at(-1)).toMatchObject({ kind: 'start', playbackId: 'playback-2' });
  });

  it('does not emit terminal events when consent is not currently granted', () => {
    const h = createHarness();
    h.runtime.finish('error');
    h.runtime.handleState('playing');
    expect(h.events).toEqual([]);
  });
});
