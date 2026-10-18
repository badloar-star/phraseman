import {
  buildSpireRoster,
  spireCohortDay,
  spireLiveZoneSize,
  spireRoomResidents,
  spireVisibleResidentCount,
  spireWeekStartMs,
} from './spire_residents';

const HOUR = 60 * 60 * 1000;
const WEEK_START = Date.UTC(2026, 8, 21);
const TUNING = { targetZoneMarginSteps: 1, maxStepsPerHour: 6 };

describe('spire rooms use real players only', () => {
  it('keeps the weekly cohort calculation used for real players', () => {
    expect(spireWeekStartMs(WEEK_START + 3 * 24 * HOUR + 5 * HOUR)).toBe(WEEK_START);
    expect(spireCohortDay(WEEK_START + 1)).toBe(0);
    expect(spireCohortDay(WEEK_START + 2 * 24 * HOUR + 1)).toBe(2);
    expect(spireCohortDay(WEEK_START + 7 * 24 * HOUR - 1)).toBe(6);
  });

  it('never generates synthetic standings or roster entries', () => {
    for (const liveCount of [0, 1, 5, 20, 30]) {
      expect(spireVisibleResidentCount(liveCount)).toBe(0);
      const live = Array.from({ length: liveCount }, (_, i) => ({ uid: `real-${i}`, steps: i }));
      expect(spireRoomResidents({ groupId: 'group', weekStartMs: WEEK_START, cohortDay: 0,
        nowMs: WEEK_START + 5 * 24 * HOUR, live, tuning: TUNING })).toEqual([]);
    }
    expect(buildSpireRoster('group', WEEK_START)).toEqual([]);
  });

  it('sizes promotion and demotion zones from real participants', () => {
    expect([0, 1, 2, 10, 20, 30].map(spireLiveZoneSize)).toEqual([0, 1, 1, 2, 3, 5]);
  });
});
