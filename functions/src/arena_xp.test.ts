import {
  ARENA_XP_DAILY_CAP,
  ARENA_XP_MATCH_CAP,
  ARENA_XP_OUTCOME,
  arenaMatchXp,
  arenaMatchXpReward,
  arenaWeekKeyForMs,
  arenaXpEligible,
  arenaXpUserPatch,
} from './arena_xp';

/**
 * Опыт за матч Арены. Владелец: быстрый матч не даёт звёзд, но обязан давать
 * опыт (D-07/D-69), а проигравший обязан уносить что-то за потраченное время.
 */

describe('формула опыта Арены', () => {
  it('платит за правильные ответы и за исход в рейтинге', () => {
    const ranked = (outcome: 'win' | 'draw' | 'loss') =>
      arenaMatchXp({ mode: 'ranked', correctAnswers: 10, taskCount: 10, outcome, dailyXpCredited: 0 });
    expect(ranked('win')).toBe(220);
    expect(ranked('draw')).toBe(190);
    expect(ranked('loss')).toBe(160);
  });

  it('платит проигравшему за его правильные ответы', () => {
    expect(arenaMatchXp({ mode: 'ranked', correctAnswers: 3, taskCount: 10, outcome: 'loss', dailyXpCredited: 0 })).toBe(76);
  });

  it('даёт опыт в быстром матче и платит за исход меньше, чем в рейтинге', () => {
    // Владелец 2026-09-04: раньше исход в быстром матче не значил ничего —
    // выиграл или проиграл, опыт одинаковый. Теперь победа что-то стоит, но
    // меньше рейтинговой: ставок нет, звёзды ранга не двигаются.
    const quick = (outcome: 'win' | 'loss') =>
      arenaMatchXp({ mode: 'quick', correctAnswers: 5, taskCount: 5, outcome, dailyXpCredited: 0 });
    expect(quick('win')).toBe(85);
    expect(quick('loss')).toBe(60);
    expect(quick('win') - quick('loss')).toBeLessThan(ARENA_XP_OUTCOME.win);
  });

  it('возвращает авторитетную раскладку только когда её сумма равна начислению', () => {
    expect(arenaMatchXpReward({
      mode: 'quick', correctAnswers: 5, taskCount: 5, outcome: 'win', dailyXpCredited: 0,
    })).toEqual({
      xpEarned: 85,
      breakdown: {
        schemaVersion: 'arena-xp-breakdown.v1',
        baseXp: 20,
        correctBonusXp: 40,
        outcomeBonusXp: 25,
        totalXp: 85,
      },
    });
  });

  it('скрывает раскладку, если match или daily cap урезал начисление', () => {
    expect(arenaMatchXpReward({
      mode: 'ranked', correctAnswers: 100, taskCount: 100, outcome: 'win', dailyXpCredited: 0,
    })).toEqual({ xpEarned: ARENA_XP_MATCH_CAP });
    // Остаток суток (10) меньше заработанного за матч (60) — раскладка
    // скрывается, платим ровно остаток. Порог берём от потолка, а не числом:
    // иначе тест снова устареет при следующем изменении наград.
    expect(arenaMatchXpReward({
      mode: 'quick', correctAnswers: 5, taskCount: 5, outcome: 'loss', dailyXpCredited: ARENA_XP_DAILY_CAP - 10,
    })).toEqual({ xpEarned: 10 });
  });

  it('держит оба потолка', () => {
    expect(arenaMatchXp({ mode: 'ranked', correctAnswers: 100, taskCount: 100, outcome: 'win', dailyXpCredited: 0 }))
      .toBe(ARENA_XP_MATCH_CAP);
    // Остаток суток меньше награды за матч — платим ровно остаток.
    expect(arenaMatchXp({ mode: 'ranked', correctAnswers: 10, taskCount: 10, outcome: 'win', dailyXpCredited: ARENA_XP_DAILY_CAP - 40 }))
      .toBe(40);
    expect(arenaMatchXp({ mode: 'ranked', correctAnswers: 10, taskCount: 10, outcome: 'win', dailyXpCredited: ARENA_XP_DAILY_CAP }))
      .toBe(0);
    expect(arenaMatchXp({ mode: 'ranked', correctAnswers: 10, taskCount: 10, outcome: 'win', dailyXpCredited: 9_999 }))
      .toBe(0);
  });

  it('зажимает число правильных ответов числом заданий и терпит мусор', () => {
    expect(arenaMatchXp({ mode: 'quick', correctAnswers: 99, taskCount: 5, outcome: 'win', dailyXpCredited: 0 })).toBe(85);
    expect(arenaMatchXp({ mode: 'quick', correctAnswers: Number.NaN, taskCount: 5, outcome: 'win', dailyXpCredited: 0 })).toBe(45);
  });

  it('не платит ботам', () => {
    expect(arenaXpEligible('bot_abc')).toBe(false);
    expect(arenaXpEligible('u_abc')).toBe(true);
    expect(arenaXpEligible('')).toBe(false);
  });
});

describe('патч документа игрока', () => {
  const now = new Date('2026-08-12T10:00:00Z');

  it('переиспользует общий конвейер прогресса, а не пишет свой', () => {
    const out = arenaXpUserPatch({ userData: { progress: { user_total_xp: '5000' } }, xpDelta: 110, now });
    expect(out.totalXpAfter).toBe(5_110);
    expect((out.patch.progress as Record<string, unknown>).user_total_xp).toBe('5110');
    expect(out.levelAfter).toBeGreaterThan(0);
  });

  it('не даёт недельным очкам лиги убывать', () => {
    const out = arenaXpUserPatch({ userData: { progress: { user_total_xp: '5000' } }, xpDelta: 110, now });
    const weekPoints = JSON.parse(String((out.patch.progress as Record<string, unknown>).week_points_v2)).points;
    expect(Number(weekPoints)).toBeGreaterThanOrEqual(out.weekXpAfter);
  });

  it('терпит нулевую дельту и нового игрока', () => {
    expect(arenaXpUserPatch({ userData: { progress: { user_total_xp: '5000' } }, xpDelta: 0, now }).totalXpAfter).toBe(5_000);
    expect(arenaXpUserPatch({ userData: undefined, xpDelta: 30, now }).totalXpAfter).toBe(30);
  });

  it('считает ключ недели тем же помощником, что и прогресс', () => {
    expect(arenaWeekKeyForMs(Date.UTC(2026, 7, 12))).toBe('2026-W33');
  });
});
