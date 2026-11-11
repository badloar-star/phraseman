/** Разминка: три игры в порядке макета, сыгранное помнится в пределах дня. */
import {
  WARMUP_GAMES, __warmupTestHooks as hooks, markWarmupGamePlayed, nextWarmupIndex, peekWarmup, subscribeWarmup, warmupPlayedCount,
} from '../modules/games/warmup_state';

const NOON = new Date(2026, 10, 11, 12, 0, 0).getTime();
let now = NOON;

beforeEach(() => {
  now = NOON;
  hooks.reset(() => now);
});

it('игры и порядок — как в макете', () => {
  expect(WARMUP_GAMES.map((g) => g.id)).toEqual(['flow', 'odd_word', 'sort']);
  expect(WARMUP_GAMES.map((g) => g.name.ru)).toEqual(['Поток', 'Лишнее слово', 'Сортировка']);
});

it('отмечает сыгранное, сообщает подписчикам и ведёт к следующей несыгранной игре', () => {
  let calls = 0;
  subscribeWarmup(() => { calls += 1; });
  expect(nextWarmupIndex(peekWarmup(), 0)).toBe(0);
  markWarmupGamePlayed('flow', '5 из 6');
  expect(calls).toBe(1);
  expect(peekWarmup().results.flow).toBe('5 из 6');
  expect(nextWarmupIndex(peekWarmup(), 0)).toBe(1);
  markWarmupGamePlayed('sort', '6 из 6');
  expect(nextWarmupIndex(peekWarmup(), 2)).toBe(1);
  markWarmupGamePlayed('odd_word', '4 из 4');
  expect(warmupPlayedCount(peekWarmup())).toBe(3);
  expect(nextWarmupIndex(peekWarmup(), 0)).toBeNull();
});

it('на следующий день разминка снова чистая', () => {
  markWarmupGamePlayed('flow', '6 из 6');
  now = NOON + 24 * 60 * 60 * 1000;
  expect(warmupPlayedCount(peekWarmup())).toBe(0);
  expect(peekWarmup().day).toBe('2026-11-12');
});
