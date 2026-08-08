// Weekly Boons — движок резолва «бонус дня». Чистые функции, тестируем без Remote Config.
import {
  getTodaysBoons,
  resolveTodaysBoons,
  utcWeekdayFromTodayKey,
  utcWeekNumberFromTodayKey,
} from '../app/boons/boon_engine';
import {
  __resetRemoteFlagsForTest,
  applyRemoteConfigSnapshot,
} from '../app/remote_flags';
import type { WeeklyBoonsConfig } from '../app/boons/boon_types';

// Известные ключи дней (UTC). 2026-06-21 — воскресенье (getUTCDay()===0).
const SUN = '2026-06-21'; // вс
const MON = '2026-06-22'; // пн
const SAT_A = '2026-06-20'; // сб (одна неделя)
const SAT_B = '2026-06-27'; // сб (следующая неделя)

function cfg(partial: Partial<WeeklyBoonsConfig>): WeeklyBoonsConfig {
  return { schedule: {}, enabled: {}, modifiersEnabled: {}, ...partial };
}

describe('utcWeekdayFromTodayKey', () => {
  it('maps known UTC dates to weekday (0=вс..6=сб)', () => {
    expect(utcWeekdayFromTodayKey(SUN)).toBe(0);
    expect(utcWeekdayFromTodayKey(MON)).toBe(1);
    expect(utcWeekdayFromTodayKey(SAT_A)).toBe(6);
  });
});

describe('resolveTodaysBoons — single fixed boon per day', () => {
  it('returns the scheduled boon on its weekday', () => {
    const c = cfg({ schedule: { 0: 'streak_saver', 1: 'mystery_monday' } });
    expect(resolveTodaysBoons(c, SUN).primary).toBe('streak_saver');
    expect(resolveTodaysBoons(c, MON).primary).toBe('mystery_monday');
  });

  it('returns null when no boon is scheduled for the day', () => {
    const c = cfg({ schedule: { 1: 'mystery_monday' } });
    expect(resolveTodaysBoons(c, SUN).primary).toBeNull();
  });

  it('hides a boon when globally disabled', () => {
    const c = cfg({ schedule: { 0: 'streak_saver' }, enabled: { streak_saver: false } });
    expect(resolveTodaysBoons(c, SUN).primary).toBeNull();
  });
});

describe('resolveTodaysBoons — weekly rotation (alternating Saturday)', () => {
  const c = cfg({ schedule: { 6: ['speaking_saturday', 'turbo_regen'] } });

  it('alternates the boon between consecutive Saturdays', () => {
    const first = resolveTodaysBoons(c, SAT_A).primary;
    const second = resolveTodaysBoons(c, SAT_B).primary;
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(first).not.toBe(second); // ровно чередуется неделя через неделю
    expect([first, second].sort()).toEqual(['speaking_saturday', 'turbo_regen']);
  });

  it('always returns exactly ONE primary even with a rotation slot', () => {
    expect(typeof resolveTodaysBoons(c, SAT_A).primary).toBe('string');
  });

  it('skips a disabled element in a rotation and falls back to the enabled one', () => {
    const disabled = cfg({
      schedule: { 6: ['speaking_saturday', 'turbo_regen'] },
      enabled: { speaking_saturday: false },
    });
    // Обе субботы должны отдать turbo_regen, т.к. speaking выключен.
    expect(resolveTodaysBoons(disabled, SAT_A).primary).toBe('turbo_regen');
    expect(resolveTodaysBoons(disabled, SAT_B).primary).toBe('turbo_regen');
  });

  it('returns null when every element of a rotation is disabled', () => {
    const allOff = cfg({
      schedule: { 6: ['speaking_saturday', 'turbo_regen'] },
      enabled: { speaking_saturday: false, turbo_regen: false },
    });
    expect(resolveTodaysBoons(allOff, SAT_A).primary).toBeNull();
  });
});

describe('resolveTodaysBoons — always-on modifiers', () => {
  it('includes all modifiers by default (no enabled flags)', () => {
    const c = cfg({});
    const r = resolveTodaysBoons(c, SUN);
    expect(r.modifiers).toEqual(expect.arrayContaining(['early_bird', 'perfect_week']));
  });

  it('drops a modifier when explicitly disabled', () => {
    const c = cfg({ modifiersEnabled: { early_bird: false } });
    const r = resolveTodaysBoons(c, SUN);
    expect(r.modifiers).not.toContain('early_bird');
    expect(r.modifiers).toContain('perfect_week');
  });

  it('modifiers are independent of the day primary', () => {
    const c = cfg({ schedule: {}, modifiersEnabled: { perfect_week: false } });
    const r = resolveTodaysBoons(c, SUN);
    expect(r.primary).toBeNull(); // нет primary в этот день
    expect(r.modifiers).toEqual(['early_bird']); // но модификатор всё равно резолвится
  });
});

describe('week number monotonicity', () => {
  it('advances by exactly 1 between consecutive Saturdays', () => {
    expect(utcWeekNumberFromTodayKey(SAT_B) - utcWeekNumberFromTodayKey(SAT_A)).toBe(1);
  });
});

describe('getTodaysBoons — runtime Remote Config gate', () => {
  beforeEach(() => {
    __resetRemoteFlagsForTest();
  });

  afterEach(() => {
    __resetRemoteFlagsForTest();
  });

  it('fails closed until a cached or live Remote Config snapshot has been applied', () => {
    expect(getTodaysBoons(MON)).toMatchObject({ primary: null, modifiers: [] });
  });

  it('immediately reflects an admin disable after a snapshot change', () => {
    applyRemoteConfigSnapshot({
      texts: {
        weekly_boons_config: JSON.stringify(cfg({
          schedule: { 1: 'mystery_monday' },
          enabled: { mystery_monday: true },
        })),
      },
    });
    expect(getTodaysBoons(MON).primary).toBe('mystery_monday');

    applyRemoteConfigSnapshot({
      texts: {
        weekly_boons_config: JSON.stringify(cfg({
          schedule: { 1: 'mystery_monday' },
          enabled: { mystery_monday: false },
        })),
      },
    });
    expect(getTodaysBoons(MON).primary).toBeNull();
  });
});
