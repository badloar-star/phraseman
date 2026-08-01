/**
 * Контракт планировщика комплекта заданий (tournament_pool_plan).
 *
 * зачем: владелец 2026-07-27 — «генератор должен сразу создавать все задания».
 * Планировщик — арифметика, из-за которой турнир либо собирается, либо нет,
 * поэтому проверяем именно граничные случаи, а не счастливый путь.
 */
import {
  TASKS_PER_ROUND,
  CELL_HEALTHY,
  cellKey,
  ROUND_DIFFICULTIES,
  TOURNAMENT_MODES,
  isTournamentMode,
  planGenerationOrders,
  planPoolGaps,
  poolIsTournamentReady,
  requiredCells,
  roundReadiness,
} from './tournament_pool_plan';

describe('планировщик комплекта турнира', () => {
  it('число заданий в раунде совпадает с сервером (tournaments.ts)', () => {
    // Расхождение здесь = раунды, которые планировщик считает готовыми, а
    // сервер собрать не может. Сверяем с приватной константой по исходнику.
    const source = require('fs').readFileSync(`${__dirname}/tournaments.ts`, 'utf8');
    const match = /const DEFAULT_TASKS_PER_ROUND = (\d+)/.exec(source);
    expect(match).toBeTruthy();
    expect(Number(match![1])).toBe(TASKS_PER_ROUND);
  });

  it('пустой пул: заказывает только mode×difficulty ячейки, достижимые реальным round plan', () => {
    expect(poolIsTournamentReady({})).toBe(false);
    const orders = planGenerationOrders({}, { maxTasks: 1000 });
    const cells = requiredCells();
    expect(cells).toHaveLength(14);
    expect(cells).not.toContainEqual({ mode: 'find_oddity', difficulty: 3 });
    expect(cells).toContainEqual({ mode: 'find_oddity', difficulty: 1 });
    expect(cells).toContainEqual({ mode: 'find_oddity', difficulty: 2 });
    expect(orders.map(({ mode, difficulty }) => ({ mode, difficulty }))).toEqual(cells);
    expect(orders.every((order) => order.count === TASKS_PER_ROUND)).toBe(true);
  });

  it('не считает неполный пул готовым', () => {
    const legacyCounts = {
      'listen_choose:1': 40,
      'sound_contrast:1': 40,
      'listen_build:1': 40,
    };
    expect(poolIsTournamentReady(legacyCounts)).toBe(false);
    expect(planGenerationOrders(legacyCounts, { maxTasks: 1000 })
      .some((order) => Object.prototype.hasOwnProperty.call(legacyCounts, `${order.mode}:${order.difficulty}`)))
      .toBe(false);
    expect(planGenerationOrders({}, {
      maxTasks: 1000,
      modes: ['voice', 'listen_choose'] as never,
    })).toEqual([]);

    const counts = Object.fromEntries(requiredCells().map(({ mode, difficulty }) => [
      `${mode}:${difficulty}`, TASKS_PER_ROUND,
    ]));
    const rounds = roundReadiness(counts);
    expect(rounds.every((round) => round.ok)).toBe(true);
    const cells: Record<string, number> = counts;
    rounds.forEach((round, index) => {
      for (const mode of round.readyModes) {
        const available = ROUND_DIFFICULTIES[index]
          .reduce((sum: number, d: number) => sum + (cells[`${mode}:${d}`] ?? 0), 0);
        expect(available).toBeGreaterThanOrEqual(TASKS_PER_ROUND);
      }
    });
  });

  it('готовность раунда требует по одному заданию каждого режима immutable round plan', () => {
    const roundOneCounts = {
      'guess_phrase:1': 1,
      'fill_gap:1': 1,
      'find_oddity:1': 1,
      'translate_build:1': 1,
    };
    expect(roundReadiness(roundOneCounts)[0]).toMatchObject({
      roundNo: 1,
      ok: true,
      readyModes: ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build'],
    });

    const wrongRoundFourMode = {
      'guess_phrase:3': 1,
      'fill_gap:3': 1,
      'translate_build:3': 1,
      'find_oddity:3': 1,
    };
    expect(roundReadiness(wrongRoundFourMode)[3]).toMatchObject({ ok: false });
  });

  it('не объявляет весь турнир готовым, если 14 ячеек не дают 16 уникальных заданий', () => {
    const onePerReachableCell = Object.fromEntries(requiredCells().map((cell) => [cellKey(cell), 1]));
    const rounds = roundReadiness(onePerReachableCell);
    expect(rounds[0].ok).toBe(true);
    expect(rounds.every((round) => round.ok)).toBe(false);
  });

  it('не возвращает зелёную готовность после недостижимого предыдущего раунда', () => {
    const counts = Object.fromEntries(requiredCells().map((cell) => [cellKey(cell), CELL_HEALTHY]));
    counts['find_oddity:1'] = 1;
    counts['find_oddity:2'] = 1;
    expect(roundReadiness(counts).map((round) => round.ok)).toEqual([true, true, false, false]);
  });

  it('ячейка ровно в минимуме не блокирует, на единицу меньше — блокирует', () => {
    const exact = planPoolGaps({ 'guess_phrase:1': TASKS_PER_ROUND })
      .find((gap) => gap.mode === 'guess_phrase' && gap.difficulty === 1);
    expect(exact?.blocking).toBe(false);
    expect(exact?.missing).toBe(0);

    const short = planPoolGaps({ 'guess_phrase:1': TASKS_PER_ROUND - 1 })
      .find((gap) => gap.mode === 'guess_phrase' && gap.difficulty === 1);
    expect(short?.blocking).toBe(true);
    expect(short?.missing).toBe(1);
  });

  it('заказ не превышает лимит и начинается с блокирующих ячеек', () => {
    const counts = { 'guess_phrase:1': TASKS_PER_ROUND, 'fill_gap:1': 0 };
    const orders = planGenerationOrders(counts, { maxTasks: 10 });
    const total = orders.reduce((sum, order) => sum + order.count, 0);
    expect(total).toBeLessThanOrEqual(10);
    // Полная ячейка в заказ не попадает.
    expect(orders.some((o) => o.mode === 'guess_phrase' && o.difficulty === 1)).toBe(false);
  });

  it('режим healthy добивает запас сверх минимума (разнообразие турниров)', () => {
    const counts = { 'guess_phrase:1': TASKS_PER_ROUND };
    const plain = planGenerationOrders(counts, { maxTasks: 1000 });
    const healthy = planGenerationOrders(counts, { maxTasks: 1000, healthy: true });
    expect(plain.some((o) => o.mode === 'guess_phrase' && o.difficulty === 1)).toBe(false);
    const healthyCell = healthy.find((o) => o.mode === 'guess_phrase' && o.difficulty === 1);
    expect(healthyCell?.count).toBe(CELL_HEALTHY - TASKS_PER_ROUND);
  });

  it('состав режимов — ровно тот, что отобрал владелец', () => {
    // Отбор владельца 2026-07-27 по макетам Learning V2. Список закреплён:
    // случайное добавление режима меняет требования к пулу и может тихо
    // сломать сборку раунда, поэтому изменение состава — осознанное действие.
    expect([...TOURNAMENT_MODES]).toEqual([
      'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match',
    ]);
    for (const banned of [
      'voice', 'listen_choose', 'sound_contrast', 'listen_build',
      'shadowing', 'quick_response', 'repeat_compare',
    ]) {
      expect(isTournamentMode(banned)).toBe(false);
    }
  });
});
