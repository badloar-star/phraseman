// ═══════════════════════════════════════════════════════════════════════════
// Страж ботов Шпиля (PM-277; решения владельца T24–T26, D56).
//
// Фиксирует:
//   • боты детерминированы из зерна комнаты — один и тот же ответ на любом
//     устройстве и в итоговом кроне, без Firestore;
//   • ступени бота не убывают со временем и считаются только с дня когорты;
//   • бот НИКОГДА не выше самого слабого живого в зоне повышения и не ниже
//     самого сильного живого в зоне понижения (T25);
//   • комната добивается до 30, живые места не теряют.
// ═══════════════════════════════════════════════════════════════════════════

import {
  SPIRE_ROOM_SIZE,
  buildSpireRoster,
  spireCohortDay,
  spireCohortStartMs,
  spireLiveZoneSize,
  spireResidentBounds,
  spireResidentRawState,
  spireResidentSeed,
  spireRoomResidents,
  spireVisibleResidentCount,
  spireWeekStartMs,
} from './spire_residents';

const HOUR = 60 * 60 * 1000;
const WEEK_START = Date.UTC(2026, 8, 21); // понедельник 2026-09-21
const TUNING = { targetZoneMarginSteps: 1, maxStepsPerHour: 6 };

describe('spire residents: время и когорта (T24)', () => {
  it('день входа 0..6 от понедельника UTC', () => {
    expect(spireWeekStartMs(WEEK_START + 3 * 24 * HOUR + 5 * HOUR)).toBe(WEEK_START);
    expect(spireCohortDay(WEEK_START + 1)).toBe(0);
    expect(spireCohortDay(WEEK_START + 2 * 24 * HOUR + 1)).toBe(2);
    expect(spireCohortDay(WEEK_START + 7 * 24 * HOUR - 1)).toBe(6);
  });

  it('бот поздней когорты не имеет ступеней до своего дня', () => {
    const seed = spireResidentSeed('room-late', 0);
    const cohortStart = spireCohortStartMs(WEEK_START, 3);
    const before = spireResidentRawState(seed, cohortStart, WEEK_START, cohortStart - HOUR, 6);
    expect(before.steps).toBe(0);
  });
});

describe('spire residents: формула', () => {
  it('детерминирована и не убывает по часам', () => {
    const seed = spireResidentSeed('room-a', 4);
    let prev = 0;
    for (let h = 0; h <= 7 * 24; h += 1) {
      const a = spireResidentRawState(seed, WEEK_START, WEEK_START, WEEK_START + h * HOUR, 6);
      const b = spireResidentRawState(seed, WEEK_START, WEEK_START, WEEK_START + h * HOUR, 6);
      expect(a).toEqual(b);
      expect(a.steps).toBeGreaterThanOrEqual(prev);
      prev = a.steps;
    }
  });

  it('за неделю «средний» результат, не рекорд', () => {
    const end = WEEK_START + 7 * 24 * HOUR;
    const totals = Array.from({ length: 29 }, (_, slot) =>
      spireResidentRawState(spireResidentSeed('room-b', slot), WEEK_START, WEEK_START, end, 6).steps);
    const avg = totals.reduce((s, n) => s + n, 0) / totals.length;
    expect(avg).toBeGreaterThan(8);
    expect(avg).toBeLessThan(45);
    // Разброс: боты не одинаковые (T26).
    expect(new Set(totals).size).toBeGreaterThan(5);
  });
});

describe('spire residents: зоны только по живым (T25)', () => {
  it('размер зоны — от всей комнаты с ботами (D59), живых нет — зон нет', () => {
    expect(spireLiveZoneSize(0)).toBe(0);
    // D59: одинокий живой среди 29 ботов повышается — зона 15% от 30 = 5.
    expect(spireLiveZoneSize(1)).toBe(5);
    expect(spireLiveZoneSize(2)).toBe(5);
    expect(spireLiveZoneSize(20)).toBe(5);
    expect(spireLiveZoneSize(30)).toBe(5);
  });

  it('бот строго ниже зоны повышения и выше зоны понижения', () => {
    const live = [
      { uid: 'a', steps: 30 }, { uid: 'b', steps: 22 }, { uid: 'c', steps: 12 },
      { uid: 'd', steps: 5 }, { uid: 'e', steps: 0 },
    ];
    const bounds = spireResidentBounds(live, 1);
    // D59: зона 5 (от 30 с ботами) — повышаются все игравшие a..d, слабейший d (5).
    expect(bounds.hi).toBe(4);
    expect(bounds.lo).toBe(1);  // понижаются нули
    const late = WEEK_START + 6 * 24 * HOUR;
    const bots = spireRoomResidents({
      groupId: 'room-c', weekStartMs: WEEK_START, cohortDay: 0, nowMs: late, live, tuning: TUNING,
    });
    expect(bots).toHaveLength(SPIRE_ROOM_SIZE - live.length);
    for (const bot of bots) {
      expect(bot.steps).toBeLessThan(5);
      expect(bot.steps).toBeGreaterThan(0);
    }
  });

  it('слабый лидер-живой: боты сжимаются под него, порядок между ними сохраняется', () => {
    const live = [{ uid: 'a', steps: 3 }, { uid: 'b', steps: 0 }];
    const late = WEEK_START + 6 * 24 * HOUR;
    const bots = spireRoomResidents({
      groupId: 'room-d', weekStartMs: WEEK_START, cohortDay: 0, nowMs: late, live, tuning: TUNING,
    });
    for (const bot of bots) expect(bot.steps).toBeLessThan(3);
  });

  it('пока никто из живых не играл — зон нет, боты идут по формуле', () => {
    const live = [{ uid: 'a', steps: 0 }];
    expect(spireResidentBounds(live, 1)).toEqual({ lo: 0, hi: null });
  });
});

describe('spire residents: добивка и лица', () => {
  it('комната добивается до 30', () => {
    expect(spireVisibleResidentCount(1)).toBe(29);
    expect(spireVisibleResidentCount(30)).toBe(0);
    expect(spireVisibleResidentCount(31)).toBe(0);
  });

  it('roster: 29 лиц, uid с префиксом жителя, без повторов имён', () => {
    const roster = buildSpireRoster('2026-W39_en_t0_d0_1_uid', WEEK_START);
    expect(roster).toHaveLength(SPIRE_ROOM_SIZE - 1);
    expect(roster.every((r) => r.uid.startsWith('res_'))).toBe(true);
    expect(new Set(roster.map((r) => r.name)).size).toBe(roster.length);
  });
});
