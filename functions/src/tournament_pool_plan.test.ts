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
    // Раунд 1 (сложность 1, один режим) закрывается только translate_build.
    expect(rounds[0].readyModes).toEqual(['translate_build']);
    // Раунд 3 (сложность 2, один режим) — только find_oddity.
    expect(rounds[2].readyModes).toEqual(['find_oddity']);
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

  it('режимы Learning V2 не подключены до отбора владельцем', () => {
    // Владелец 2026-07-27: «не спеши перенимать задания из Learning V2, я ещё
    // не разобрался какие там нормальные, скажу сам». Плюс аудио/голос в турнир
    // не идут в принципе — таймер 15с не терпит загрузки звука.
    expect([...TOURNAMENT_MODES]).toEqual(['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build']);
    for (const banned of ['context_gap', 'speed_match', 'listen_choose', 'sound_contrast', 'shadowing', 'speaking_club']) {
      expect(TOURNAMENT_MODES).not.toContain(banned);
    }
  });
});
