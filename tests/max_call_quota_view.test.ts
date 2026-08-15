import {
  computeCallDeadlines,
  formatMinutesPill,
  pillGranularity,
  pillTone,
  resolveMaxSeconds,
} from '../app/max_call_quota_view';

describe('resolveMaxSeconds', () => {
  it('takes min of server max_seconds, reserve, day remainder and format cap', () => {
    expect(
      resolveMaxSeconds({
        serverMaxSeconds: 320,
        reserveRemainingSec: 300,
        dayRemainingSec: 900,
        formatCapSec: 480,
      }),
    ).toBe(300);
    expect(
      resolveMaxSeconds({
        serverMaxSeconds: 480,
        reserveRemainingSec: 500,
        dayRemainingSec: 120,
        formatCapSec: 480,
      }),
    ).toBe(120);
  });

  it('is pessimistic: floors fractional bounds and clamps negatives to zero', () => {
    expect(resolveMaxSeconds({ serverMaxSeconds: 299.9 })).toBe(299);
    expect(resolveMaxSeconds({ serverMaxSeconds: 300, dayRemainingSec: -5 })).toBe(0);
  });

  it('ignores unknown (undefined / non-finite) bounds instead of inventing time', () => {
    expect(
      resolveMaxSeconds({ serverMaxSeconds: 300, dayRemainingSec: Number.NaN }),
    ).toBe(300);
    expect(resolveMaxSeconds({ serverMaxSeconds: 300 })).toBe(300);
  });
});

describe('computeCallDeadlines', () => {
  const startedAtMs = 1_000_000;

  it('places wrap/hard/teardown at lead before, exactly at, and tail after the cap', () => {
    const d = computeCallDeadlines({
      maxSeconds: 300,
      startedAtMs,
      wrapUpLeadSec: 75,
      graceTailSec: 20,
    });
    expect(d.hardAtMs).toBe(startedAtMs + 300_000);
    expect(d.wrapAtMs).toBe(d.hardAtMs - 75_000);
    expect(d.teardownAtMs).toBe(d.hardAtMs + 20_000);
  });

  it('never schedules wrap before the call start on ultra-short sessions', () => {
    const d = computeCallDeadlines({
      maxSeconds: 40,
      startedAtMs,
      wrapUpLeadSec: 75,
      graceTailSec: 20,
    });
    expect(d.wrapAtMs).toBe(startedAtMs);
    expect(d.hardAtMs).toBe(startedAtMs + 40_000);
    expect(d.teardownAtMs).toBe(startedAtMs + 60_000);
  });

  it('keeps ordering wrap ≤ hard < teardown for any sane input', () => {
    const d = computeCallDeadlines({
      maxSeconds: 480,
      startedAtMs,
      wrapUpLeadSec: 75,
      graceTailSec: 20,
    });
    expect(d.wrapAtMs).toBeLessThanOrEqual(d.hardAtMs);
    expect(d.hardAtMs).toBeLessThan(d.teardownAtMs);
  });

  it('reads broken durations pessimistically as an immediate deadline', () => {
    const d = computeCallDeadlines({
      maxSeconds: Number.NaN,
      startedAtMs,
      wrapUpLeadSec: 75,
      graceTailSec: 20,
    });
    expect(d.hardAtMs).toBe(startedAtMs);
    expect(d.wrapAtMs).toBe(startedAtMs);
    expect(d.teardownAtMs).toBe(startedAtMs + 20_000);
  });
});

describe('pillGranularity', () => {
  it('switches from minutes to seconds exactly at the 60s boundary', () => {
    expect(pillGranularity(61)).toBe('minutes');
    expect(pillGranularity(60)).toBe('seconds');
    expect(pillGranularity(59)).toBe('seconds');
    expect(pillGranularity(0)).toBe('seconds');
    expect(pillGranularity(300)).toBe('minutes');
  });
});

describe('formatMinutesPill', () => {
  it('rounds minutes UP so the learner never sees stolen time', () => {
    expect(formatMinutesPill(181, 'minutes')).toBe('4 мин');
    expect(formatMinutesPill(240, 'minutes')).toBe('4 мин');
    expect(formatMinutesPill(241, 'minutes')).toBe('5 мин');
    expect(formatMinutesPill(61, 'minutes')).toBe('2 мин');
  });

  it('formats the last minute as M:SS', () => {
    expect(formatMinutesPill(42, 'seconds')).toBe('0:42');
    expect(formatMinutesPill(60, 'seconds')).toBe('1:00');
    expect(formatMinutesPill(9, 'seconds')).toBe('0:09');
    expect(formatMinutesPill(0, 'seconds')).toBe('0:00');
  });

  it('clamps negative / broken remainders to zero instead of glitching', () => {
    expect(formatMinutesPill(-3, 'seconds')).toBe('0:00');
    expect(formatMinutesPill(-3, 'minutes')).toBe('0 мин');
    expect(formatMinutesPill(Number.NaN, 'seconds')).toBe('0:00');
  });
});

describe('pillTone', () => {
  it('crosses to amber at 300s and to red at 60s (inclusive)', () => {
    expect(pillTone(301)).toBe('normal');
    expect(pillTone(300)).toBe('amber');
    expect(pillTone(61)).toBe('amber');
    expect(pillTone(60)).toBe('red');
    expect(pillTone(1)).toBe('red');
  });

  it('is stable within zones so UI fires transitions on events, not frames', () => {
    // Симулируем посекундный тик: тон должен смениться ровно два раза за звонок,
    // а не дёргаться на каждом кадре — иначе amber-пульс сыграл бы многократно.
    let transitions = 0;
    let prev = pillTone(400);
    for (let sec = 399; sec >= 0; sec -= 1) {
      const next = pillTone(sec);
      if (next !== prev) transitions += 1;
      prev = next;
    }
    expect(transitions).toBe(2);
    expect(prev).toBe('red');
  });

  it('is pure: same input always yields the same tone', () => {
    expect(pillTone(150)).toBe(pillTone(150));
    expect(pillTone(500)).toBe('normal');
  });
});
