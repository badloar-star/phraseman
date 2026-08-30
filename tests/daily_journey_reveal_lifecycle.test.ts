import { DailyJourneyRevealLifecycle } from '../components/daily_journey/dailyJourneyRevealLifecycle';

describe('DailyJourneyRevealLifecycle', () => {
  test('runs one normal sequence and delivers once despite duplicate completion', () => {
    const events: string[] = [];
    const lifecycle = new DailyJourneyRevealLifecycle();
    const token = lifecycle.begin({ identity: '1:op-a', targetPoint: { x: 11, y: 12 }, reducedMotion: false,
      onIntro: () => events.push('intro'), onFlight: () => events.push('flight'), onDelivered: () => events.push('delivered') });
    expect(events).toEqual(['intro']);
    lifecycle.startFlight(token);
    lifecycle.completeFlight(token, true);
    lifecycle.completeFlight(token, true);
    expect(events).toEqual(['intro', 'flight', 'delivered']);
  });

  test('skip, back and escape only advance a preflight sequence', () => {
    const events: string[] = [];
    const lifecycle = new DailyJourneyRevealLifecycle();
    const token = lifecycle.begin({ identity: '1:op-a', targetPoint: null, reducedMotion: false,
      onIntro: () => events.push('intro'), onFlight: () => events.push('flight'), onDelivered: () => events.push('done') });
    lifecycle.skip(token); lifecycle.back(token); lifecycle.escape(token);
    expect(events).toEqual(['intro', 'flight']);
  });

  test.each(['skip', 'back', 'escape'] as const)('reduced-motion %s advances its preflight once', (action) => {
    const events: string[] = [];
    const lifecycle = new DailyJourneyRevealLifecycle();
    const token = lifecycle.begin({ identity: '1:reduced', targetPoint: null, reducedMotion: true,
      onIntro: () => events.push('intro'), onFlight: () => events.push('flight'), onDelivered: () => events.push('done') });
    lifecycle[action](token);
    lifecycle.completeFlight(token, true);
    expect(events).toEqual(['intro', 'flight', 'done']);
  });

  test('rerenders with a target, callback, dimensions or motion preference do not restart the same identity', () => {
    const events: string[] = [];
    const lifecycle = new DailyJourneyRevealLifecycle();
    const first = lifecycle.begin({ identity: '1:op-a', targetPoint: null, reducedMotion: false,
      onIntro: () => events.push('first'), onFlight: () => undefined, onDelivered: () => undefined });
    const second = lifecycle.begin({ identity: '1:op-a', targetPoint: { x: 9, y: 9 }, reducedMotion: true,
      onIntro: () => events.push('second'), onFlight: () => undefined, onDelivered: () => undefined });
    expect(second).toBe(first);
    expect(events).toEqual(['first']);
  });

  test('same run with a new occurrence is a distinct sequence', () => {
    const events: string[] = [];
    const lifecycle = new DailyJourneyRevealLifecycle();
    lifecycle.begin({ identity: '1:op-a', targetPoint: null, reducedMotion: false, onIntro: () => events.push('a'), onFlight: () => undefined, onDelivered: () => undefined });
    lifecycle.begin({ identity: '1:op-b', targetPoint: null, reducedMotion: false, onIntro: () => events.push('b'), onFlight: () => undefined, onDelivered: () => undefined });
    expect(events).toEqual(['a', 'b']);
  });

  test('dispose invalidates intro, reveal, flight and reduced continuations', () => {
    const events: string[] = [];
    const lifecycle = new DailyJourneyRevealLifecycle();
    const token = lifecycle.begin({ identity: '1:op-a', targetPoint: null, reducedMotion: true,
      onIntro: () => events.push('intro'), onFlight: () => events.push('flight'), onDelivered: () => events.push('done') });
    lifecycle.dispose();
    lifecycle.startFlight(token); lifecycle.completeFlight(token, true);
    expect(events).toEqual(['intro']);
  });

  test('finished false never completes delivery', () => {
    const delivered = jest.fn();
    const lifecycle = new DailyJourneyRevealLifecycle();
    const token = lifecycle.begin({ identity: '1:op-a', targetPoint: null, reducedMotion: false, onIntro: () => undefined, onFlight: () => undefined, onDelivered: delivered });
    lifecycle.startFlight(token); lifecycle.completeFlight(token, false);
    expect(delivered).not.toHaveBeenCalled();
  });

  test('a stale completion token cannot deliver the next occurrence', () => {
    const events: string[] = [];
    const lifecycle = new DailyJourneyRevealLifecycle();
    const a = lifecycle.begin({ identity: '1:a', targetPoint: null, reducedMotion: false,
      onIntro: () => undefined, onFlight: () => undefined, onDelivered: () => events.push('a') });
    lifecycle.startFlight(a);
    const b = lifecycle.begin({ identity: '1:b', targetPoint: null, reducedMotion: false,
      onIntro: () => undefined, onFlight: () => undefined, onDelivered: () => events.push('b') });
    lifecycle.startFlight(b);
    lifecycle.completeFlight(a, true);
    lifecycle.completeFlight(b, true);
    expect(events).toEqual(['b']);
  });
});
