import {
  arenaHistoryRows,
  arenaHistorySummary,
  arenaParseHistoryRow,
} from '../modules/arena/history_view';

/**
 * История матчей.
 *
 * Читается прямо из расписок игрока — они уже пишутся при закрытии матча, и
 * заводить под историю отдельный вызов или вторую копию данных значило бы
 * платить дважды за то, что уже лежит.
 *
 * Главное правило здесь: битая запись НЕ показывается. Показанная битая строка
 * хуже её отсутствия — игрок начнёт считать по ней свои звёзды и не сойдётся.
 */

const receipt = (over: Record<string, unknown> = {}) => ({
  matchId: 'm1',
  mode: 'ranked',
  outcome: 'win',
  settledAtMs: 1_700_000_000_000,
  reward: { starsEarned: 12, xpEarned: 40, ratingDelta: 20, ratingAfter: 320, rankAfter: 3 },
  ...over,
});

describe('разбор расписки', () => {
  it('нормальная расписка разбирается', () => {
    const row = arenaParseHistoryRow(receipt())!;
    expect(row.matchId).toBe('m1');
    expect(row.outcome).toBe('win');
    expect(row.starsEarned).toBe(12);
    expect(row.ratingDelta).toBe(20);
  });

  it('пусто и мусор дают null, а не падение', () => {
    for (const value of [null, undefined, 'строка', [], 42, {}]) {
      expect(arenaParseHistoryRow(value)).toBeNull();
    }
  });

  it('без идентификатора, исхода или времени строка не показывается', () => {
    expect(arenaParseHistoryRow(receipt({ matchId: '' }))).toBeNull();
    expect(arenaParseHistoryRow(receipt({ outcome: 'победа' }))).toBeNull();
    expect(arenaParseHistoryRow(receipt({ settledAtMs: 0 }))).toBeNull();
    expect(arenaParseHistoryRow(receipt({ settledAtMs: -5 }))).toBeNull();
  });

  it('отсутствующая награда не роняет строку — матч был', () => {
    const row = arenaParseHistoryRow(receipt({ reward: undefined }))!;
    expect(row).not.toBeNull();
    expect(row.starsEarned).toBe(0);
    expect(row.xpEarned).toBe(0);
  });

  it('отрицательные звёзды и опыт обрезаются, а очки ранга — нет', () => {
    const row = arenaParseHistoryRow(receipt({
      reward: { starsEarned: -5, xpEarned: -10, ratingDelta: -24, rankAfter: -2 },
    }))!;
    expect(row.starsEarned).toBe(0);
    expect(row.xpEarned).toBe(0);
    // Проигрыш обязан показываться минусом: обрезать его в ноль значит скрыть
    // от игрока, что он потерял очки.
    expect(row.ratingDelta).toBe(-24);
    expect(row.rankAfter).toBe(0);
  });
});

describe('список', () => {
  it('свежие сверху', () => {
    const rows = arenaHistoryRows([
      receipt({ matchId: 'a', settledAtMs: 100 }),
      receipt({ matchId: 'b', settledAtMs: 300 }),
      receipt({ matchId: 'c', settledAtMs: 200 }),
    ]);
    expect(rows.map((row) => row.matchId)).toEqual(['b', 'c', 'a']);
  });

  it('одинаковое время даёт устойчивый порядок', () => {
    const rows = arenaHistoryRows([
      receipt({ matchId: 'z', settledAtMs: 100 }),
      receipt({ matchId: 'a', settledAtMs: 100 }),
    ]);
    expect(rows.map((row) => row.matchId)).toEqual(['a', 'z']);
  });

  it('битые записи выпадают, целые остаются', () => {
    const rows = arenaHistoryRows([
      receipt({ matchId: 'ok1' }),
      null,
      { matchId: 'broken' },
      'мусор',
      receipt({ matchId: 'ok2', settledAtMs: 1 }),
    ]);
    expect(rows.map((row) => row.matchId)).toEqual(['ok1', 'ok2']);
  });

  it('пустой вход — пустой список', () => {
    expect(arenaHistoryRows([])).toEqual([]);
  });
});

describe('сводка', () => {
  const rows = (outcomes: readonly string[]) =>
    arenaHistoryRows(outcomes.map((outcome, index) =>
      receipt({ matchId: `m${index}`, outcome, settledAtMs: 1_000 - index })));

  it('считает победы, поражения и ничьи', () => {
    const summary = arenaHistorySummary(rows(['win', 'loss', 'draw', 'win']));
    expect(summary.matches).toBe(4);
    expect(summary.wins).toBe(2);
    expect(summary.losses).toBe(1);
    expect(summary.draws).toBe(1);
  });

  it('складывает звёзды', () => {
    expect(arenaHistorySummary(rows(['win', 'win'])).starsEarned).toBe(24);
  });

  /** Ноль процентов при отсутствии матчей — враньё, а не показатель. */
  it('доля побед отсутствует, когда матчей нет', () => {
    expect(arenaHistorySummary([]).winRate).toBeNull();
    expect(arenaHistorySummary([]).matches).toBe(0);
    expect(arenaHistorySummary([]).currentStreak).toBe(0);
  });

  it('доля побед считается от всех матчей', () => {
    expect(arenaHistorySummary(rows(['win', 'loss'])).winRate).toBeCloseTo(0.5, 5);
    expect(arenaHistorySummary(rows(['win', 'win', 'win', 'loss'])).winRate).toBeCloseTo(0.75, 5);
  });

  it('серия считается от самого свежего матча', () => {
    expect(arenaHistorySummary(rows(['win', 'win', 'loss', 'win'])).currentStreak).toBe(2);
    expect(arenaHistorySummary(rows(['loss', 'win', 'win'])).currentStreak).toBe(0);
  });

  /** Ничья не победа и не поражение — обнулять за неё серию обидно. */
  it('ничья серию не рвёт и не длит', () => {
    expect(arenaHistorySummary(rows(['win', 'draw', 'win'])).currentStreak).toBe(2);
    expect(arenaHistorySummary(rows(['draw', 'draw'])).currentStreak).toBe(0);
  });

  it('все победы — серия во всю длину', () => {
    expect(arenaHistorySummary(rows(['win', 'win', 'win'])).currentStreak).toBe(3);
  });
});
