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

  it('реальный прод-пул 2026-07-27 собирает все четыре раунда', () => {
    // Тот самый пул, из-за которого искали блокер: 44 опубликованных задания.
    const counts = {
      'fill_gap:2': 4, 'fill_gap:3': 4,
      'find_oddity:1': 2, 'find_oddity:2': 14,
      'guess_phrase:1': 4, 'guess_phrase:2': 4,
      'translate_build:1': 12, 'translate_build:2': 2, 'translate_build:3': 2,
    };
    const rounds = roundReadiness(counts);
    expect(rounds.every((round) => round.ok)).toBe(true);
    // зачем 2026-07-27: раньше здесь был снимок готовых режимов при пороге 6
    // (только translate_build и find_oddity). После перевода раунда на 4
    // задания планку проходят и другие ячейки — это и есть смысл правки.
    // Поэтому проверяем ПРАВИЛО, а не замороженный список: готов ровно тот
    // режим, у которого в ячейке набралось TASKS_PER_ROUND заданий.
    expect(rounds[0].readyModes).toEqual(
      expect.arrayContaining(['translate_build', 'guess_phrase']));
    expect(rounds[2].readyModes).toContain('find_oddity');
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
      'guess_phrase', 'fill_gap', 'find_oddity', 'translate_build',
      'listen_choose', 'sound_contrast', 'listen_build', 'speed_match',
    ]);
    // Голосовые ответы игрока и диалоги в турнир не идут: не проверяются
    // сервером объективно (verifyTournamentAnswer для voice всегда false).
    for (const banned of ['shadowing', 'speaking_club', 'quick_response', 'repeat_compare']) {
      expect(TOURNAMENT_MODES).not.toContain(banned);
    }
  });
});
