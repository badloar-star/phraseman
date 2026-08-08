import {
  PREMIERE_INTRO_MAX_ENTRIES,
  PREMIERE_INTRO_TTL_MS,
  PREMIERE_TICK_INTERVAL_MS,
  getPremierePresentation,
  markPremiereIntroSeen,
  prunePremiereIntroSeen,
  shouldPlayPremiereIntro,
  shouldRunPremiereCountdownTicker,
} from '../app/youtube_premiere_runtime';

describe('YouTube premiere countdown', () => {
  const start = '2026-08-10T12:00:00.000Z';

  it('shows days, hours and minutes, adding seconds only in the final hour', () => {
    expect(getPremierePresentation('upcoming', start, Date.parse('2026-08-08T09:55:20.000Z'))).toEqual({
      kind: 'countdown', remainingMs: 2 * 86_400_000 + 2 * 3_600_000 + 4 * 60_000 + 40_000,
      days: 2, hours: 2, minutes: 4, seconds: null,
    });
    expect(getPremierePresentation('upcoming', start, Date.parse('2026-08-10T11:54:20.000Z'))).toEqual({
      kind: 'countdown', remainingMs: 5 * 60_000 + 40_000,
      days: 0, hours: 0, minutes: 5, seconds: 40,
    });
  });

  it('uses an absolute instant regardless of timezone offset and reaches a zero boundary', () => {
    const utc = getPremierePresentation('upcoming', '2026-08-10T12:00:00.000Z', Date.parse('2026-08-10T11:00:00.000Z'));
    const offset = getPremierePresentation('upcoming', '2026-08-10T14:00:00.000+02:00', Date.parse('2026-08-10T11:00:00.000Z'));
    expect(offset).toEqual(utc);
    expect(getPremierePresentation('upcoming', start, Date.parse(start))).toEqual({ kind: 'checking', remainingMs: 0 });
  });

  it('never displays a negative/invalid countdown and treats snapshot state as authoritative', () => {
    expect(getPremierePresentation('upcoming', 'invalid', Date.parse(start))).toEqual({ kind: 'upcoming', remainingMs: null });
    expect(getPremierePresentation('upcoming', start, Date.parse(start) + 10_000)).toEqual({ kind: 'checking', remainingMs: 0 });
    expect(getPremierePresentation('live', '2099-01-01T00:00:00.000Z', Date.parse(start))).toEqual({ kind: 'live' });
    expect(getPremierePresentation('completed', start, Date.parse(start) - 10_000)).toEqual({ kind: 'none' });
    expect(getPremierePresentation('video', start, Date.parse(start) - 10_000)).toEqual({ kind: 'none' });
  });

  it('ticks no faster than once per second and stops on blur/background', () => {
    expect(PREMIERE_TICK_INTERVAL_MS).toBeGreaterThanOrEqual(1_000);
    const base = { state: 'upcoming' as const, scheduledStartTime: start, nowMs: Date.parse(start) - 1_000 };
    expect(shouldRunPremiereCountdownTicker({ ...base, runtimeActive: true, appState: 'active' })).toBe(true);
    expect(shouldRunPremiereCountdownTicker({ ...base, runtimeActive: false, appState: 'active' })).toBe(false);
    expect(shouldRunPremiereCountdownTicker({ ...base, runtimeActive: true, appState: 'background' })).toBe(false);
    expect(shouldRunPremiereCountdownTicker({ ...base, state: 'live', runtimeActive: true, appState: 'active' })).toBe(false);
  });
});

describe('YouTube premiere premium intro seen-map', () => {
  const nowMs = Date.parse('2026-08-08T12:00:00.000Z');

  it('plays once per video and expires old entries after 180 days', () => {
    const seen = markPremiereIntroSeen({}, 'video-42', nowMs);
    expect(shouldPlayPremiereIntro(seen, 'video-42', nowMs)).toBe(false);
    expect(shouldPlayPremiereIntro(seen, 'another-video', nowMs)).toBe(true);
    expect(shouldPlayPremiereIntro(seen, 'video-42', nowMs + PREMIERE_INTRO_TTL_MS + 1)).toBe(true);
  });

  it('keeps only the 40 newest valid entries', () => {
    const oversized = Object.fromEntries(Array.from({ length: 60 }, (_, index) => [`video-${index}`, nowMs + index]));
    const pruned = prunePremiereIntroSeen(oversized, nowMs + 100);
    expect(Object.keys(pruned)).toHaveLength(PREMIERE_INTRO_MAX_ENTRIES);
    expect(pruned['video-59']).toBeDefined();
    expect(pruned['video-0']).toBeUndefined();
  });

  it('prunes malformed timestamps while marking the current premiere', () => {
    const next = markPremiereIntroSeen({ broken: Number.NaN, future: nowMs + 86_400_000 }, 'video-42', nowMs);
    expect(next).toEqual({ 'video-42': nowMs });
  });
});
