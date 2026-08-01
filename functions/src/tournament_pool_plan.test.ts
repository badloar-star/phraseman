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
  ROUND_DIFFICULTIES,
  TOURNAMENT_MODES,
  isTournamentMode,
  planGenerationOrders,
  planPoolGaps,
  poolIsTournamentReady,
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

  it('пустой пул: турнир не готов, заказаны все блокирующие ячейки', () => {
    expect(poolIsTournamentReady({})).toBe(false);
    const orders = planGenerationOrders({}, { maxTasks: 1000 });
    // Каждая ячейка (режим × сложность) должна попасть в заказ.
    expect(orders.length).toBe(TOURNAMENT_MODES.length * 3);
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

    const counts = Object.fromEntries(
      TOURNAMENT_MODES.flatMap((mode) => [1, 2, 3].map((difficulty) => [
        `${mode}:${difficulty}`, TASKS_PER_ROUND,
      ])),
    );
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
