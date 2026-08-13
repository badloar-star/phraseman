/**
 * cards-2.0 (E5): каркас сессии (app/flashcards/session_queue.ts, §3.5 мастер-плана).
 * Покрытие: «ошибка → в конец очереди, максимум 2 повтора» (кэп повторов),
 * расчёт итога сессии (счёт/точность/среднее время/список «Ещё учу»).
 */
import {
  MAX_MISTAKE_REPEATS,
  requeueAfterMistake,
  summarizeSession,
  TRAINER_SESSION_SIZE,
  type SessionAnswerEvent,
} from '../app/flashcards/session_queue';

type Card = { key: string };
const card = (key: string): Card => ({ key });

describe('requeueAfterMistake — «ошибка → в конец, ≤2 повторов»', () => {
  it('первая ошибка добавляет карточку в конец очереди', () => {
    const q = [card('a'), card('b'), card('c')];
    const res = requeueAfterMistake(q, q[0], 'a', {});
    expect(res.requeued).toBe(true);
    expect(res.queue.map(c => c.key)).toEqual(['a', 'b', 'c', 'a']);
    expect(res.repeatCounts).toEqual({ a: 1 });
  });

  it('не мутирует входную очередь и входные счётчики', () => {
    const q = [card('a')];
    const counts = { a: 1 };
    const res = requeueAfterMistake(q, q[0], 'a', counts);
    expect(q).toHaveLength(1);
    expect(counts).toEqual({ a: 1 });
    expect(res.queue).toHaveLength(2);
    expect(res.repeatCounts).toEqual({ a: 2 });
  });

  it('кэп: после MAX_MISTAKE_REPEATS повторов карточка больше не возвращается', () => {
    let queue: Card[] = [card('a')];
    let counts: Record<string, number> = {};
    // Две ошибки → два повтора
    for (let i = 0; i < MAX_MISTAKE_REPEATS; i++) {
      const res = requeueAfterMistake(queue, queue[0], 'a', counts);
      expect(res.requeued).toBe(true);
      queue = res.queue;
      counts = res.repeatCounts;
    }
    expect(queue).toHaveLength(1 + MAX_MISTAKE_REPEATS);
    // Третья ошибка — кэп исчерпан, очередь не растёт
    const res = requeueAfterMistake(queue, queue[0], 'a', counts);
    expect(res.requeued).toBe(false);
    expect(res.queue).toHaveLength(1 + MAX_MISTAKE_REPEATS);
    expect(res.repeatCounts).toEqual({ a: MAX_MISTAKE_REPEATS });
  });

  it('кэп считается пер-карточно — другие карточки повторяются независимо', () => {
    const q = [card('a'), card('b')];
    const counts = { a: MAX_MISTAKE_REPEATS };
    const resA = requeueAfterMistake(q, q[0], 'a', counts);
    expect(resA.requeued).toBe(false);
    const resB = requeueAfterMistake(q, q[1], 'b', counts);
    expect(resB.requeued).toBe(true);
    expect(resB.queue.map(c => c.key)).toEqual(['a', 'b', 'b']);
  });

  it('сессия всегда конечна: N карточек и сплошные ошибки → ≤ N×(1+кэп) показов', () => {
    // Симуляция «всё время ошибаюсь» — воспроизводит баг 13 (бесконечная сессия)
    const N = 5;
    let queue: Card[] = Array.from({ length: N }, (_, i) => card(`c${i}`));
    let counts: Record<string, number> = {};
    let shown = 0;
    for (let idx = 0; idx < queue.length; idx++) {
      shown += 1;
      const res = requeueAfterMistake(queue, queue[idx], queue[idx].key, counts);
      queue = res.queue;
      counts = res.repeatCounts;
      expect(shown).toBeLessThanOrEqual(N * (1 + MAX_MISTAKE_REPEATS));
    }
    expect(shown).toBe(N * (1 + MAX_MISTAKE_REPEATS));
  });

  it('дефолт размера сессии тренера = 15 (§3.5)', () => {
    expect(TRAINER_SESSION_SIZE).toBe(15);
  });
});

describe('summarizeSession — расчёт результата сессии', () => {
  const ev = (key: string, correct: boolean, ms?: number): SessionAnswerEvent => ({ key, correct, ms });

  it('пустая сессия → нули без деления на ноль', () => {
    const s = summarizeSession([]);
    expect(s).toEqual({ correct: 0, wrong: 0, total: 0, accuracy: 0, learnKeys: [] });
    expect(s.avgAnswerSec).toBeUndefined();
  });

  it('считает счёт, точность и среднее время в секундах', () => {
    const s = summarizeSession([
      ev('a', true, 2000),
      ev('b', false, 4000),
      ev('c', true, 3000),
      ev('b', true, 1000), // повтор после ошибки — отдельная попытка
    ]);
    expect(s.correct).toBe(3);
    expect(s.wrong).toBe(1);
    expect(s.total).toBe(4);
    expect(s.accuracy).toBeCloseTo(0.75);
    expect(s.avgAnswerSec).toBeCloseTo(2.5);
  });

  it('learnKeys — уникальные карточки с хотя бы одной ошибкой', () => {
    const s = summarizeSession([
      ev('a', false),
      ev('b', true),
      ev('a', false), // вторая ошибка той же карточки — не дублируется
      ev('c', false),
      ev('c', true), // исправился на повторе — карточка всё равно «Ещё учу»
    ]);
    expect(s.learnKeys.sort()).toEqual(['a', 'c']);
  });

  it('игнорирует битые замеры времени (undefined/NaN/отрицательные)', () => {
    const s = summarizeSession([
      ev('a', true),
      ev('b', true, Number.NaN),
      ev('c', true, -50),
      ev('d', true, 1000),
    ]);
    expect(s.avgAnswerSec).toBeCloseTo(1);
  });

  it('без замеров времени avgAnswerSec отсутствует (3★ недостижимы, §4)', () => {
    const s = summarizeSession([ev('a', true), ev('b', true)]);
    expect(s.avgAnswerSec).toBeUndefined();
    expect(s.accuracy).toBe(1);
  });

  it('100% с быстрым временем — вход для 3★: accuracy 1, avg ≤ 5с (choice)', () => {
    const s = summarizeSession([ev('a', true, 1200), ev('b', true, 2400), ev('c', true, 900)]);
    expect(s.accuracy).toBe(1);
    expect(s.avgAnswerSec).toBeLessThanOrEqual(5);
    expect(s.learnKeys).toEqual([]);
  });
});
