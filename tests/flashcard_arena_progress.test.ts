import { applyArenaAnswer, defaultArenaRow } from '../app/flashcards/arenaProgress';
import { statusFromMemoryRow } from '../app/flashcards/cardStatus';

/**
 * Контракт записи результата арены в прогресс карточек.
 *
 * Арена теперь влияет на статусы в коллекции, то есть на то, что юзер видит
 * как «освоено» / «слабая». Ошибка в арифметике молча перекрасит коллекцию и
 * сломает очередь повторений — поэтому пороги и переходы под тестом.
 */

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;

describe('applyArenaAnswer', () => {
  it('первый верный ответ: серия 1, срок повтора в будущем', () => {
    const r = applyArenaAnswer(undefined, true, NOW);
    expect(r.correct).toBe(1);
    expect(r.wrong).toBe(0);
    expect(r.seen).toBe(1);
    expect(r.mastered).toBe(1);
    expect(r.nextDueAt).toBeGreaterThan(NOW);
  });

  it('ошибка сбивает серию полностью, а не на единицу', () => {
    const r = applyArenaAnswer({ ...defaultArenaRow(), mastered: 4, correct: 4, seen: 4 }, false, NOW);
    expect(r.mastered).toBe(0);
    expect(r.wrong).toBe(1);
  });

  it('после ошибки карточка возвращается завтра', () => {
    const r = applyArenaAnswer(undefined, false, NOW);
    expect(r.nextDueAt).toBe(NOW + DAY);
  });

  it('интервал растёт вместе с серией', () => {
    let row = applyArenaAnswer(undefined, true, NOW);
    const first = row.nextDueAt - NOW;
    row = applyArenaAnswer(row, true, NOW);
    row = applyArenaAnswer(row, true, NOW);
    expect(row.nextDueAt - NOW).toBeGreaterThan(first);
  });

  it('ease не улетает вверх и не падает в ноль', () => {
    let up = defaultArenaRow();
    for (let i = 0; i < 40; i++) up = applyArenaAnswer(up, true, NOW);
    expect(up.ease).toBeLessThanOrEqual(2.8);

    let down = defaultArenaRow();
    for (let i = 0; i < 40; i++) down = applyArenaAnswer(down, false, NOW);
    expect(down.ease).toBeGreaterThanOrEqual(1.6);
  });

  it('исходную строку не мутируем', () => {
    const before = { ...defaultArenaRow(), mastered: 3 };
    const snapshot = { ...before };
    applyArenaAnswer(before, false, NOW);
    expect(before).toEqual(snapshot);
  });
});

describe('арена → статус в коллекции', () => {
  it('четыре верных подряд дают «освоено»', () => {
    let row = defaultArenaRow();
    for (let i = 0; i < 4; i++) row = applyArenaAnswer(row, true, NOW);
    expect(statusFromMemoryRow(row, NOW)).toBe('mastered');
  });

  it('провалы делают карточку «слабой»', () => {
    let row = defaultArenaRow();
    row = applyArenaAnswer(row, true, NOW);
    row = applyArenaAnswer(row, false, NOW);
    row = applyArenaAnswer(row, false, NOW);
    // ошибок (2) больше верных (1) — та самая «слабая» из макета
    expect(statusFromMemoryRow(row, NOW)).toBe('weak');
  });

  it('одиночная ошибка сразу помечает карточку «слабой», а не «к повторению»', () => {
    // зачем этот тест: правило «ошибок больше верных» приоритетнее срока —
    // проблемную карточку нельзя прятать за нейтральным «пора повторить».
    const row = applyArenaAnswer(undefined, false, NOW);
    expect(statusFromMemoryRow(row, NOW + DAY)).toBe('weak');
  });

  it('карточка с хорошим балансом уходит в «к повторению» по сроку', () => {
    let row = defaultArenaRow();
    row = applyArenaAnswer(row, true, NOW);
    row = applyArenaAnswer(row, true, NOW);
    row = applyArenaAnswer(row, false, NOW); // 2 верных против 1 ошибки
    expect(statusFromMemoryRow(row, NOW + DAY)).toBe('review');
  });
});
