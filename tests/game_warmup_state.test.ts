/** Разминка: день сам берёт три игры из общего списка, сыгранное помнится в пределах дня. */
import {
  WARMUP_POOL, __warmupTestHooks as hooks, markWarmupGamePlayed, nextWarmupIndex, peekWarmup, subscribeWarmup,
  warmupGamesForDay, warmupPlayedCount,
} from '../modules/games/warmup_state';

const NOON = new Date(2026, 10, 11, 12, 0, 0).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;
let now = NOON;

beforeEach(() => {
  now = NOON;
  hooks.reset(() => now);
});

it('первые три игры списка — как в макете', () => {
  expect(WARMUP_POOL.slice(0, 3).map((g) => g.name.ru)).toEqual(['Поток', 'Лишнее слово', 'Сортировка']);
  expect(new Set(WARMUP_POOL.map((g) => g.id)).size).toBe(WARMUP_POOL.length);
});

it('в дне всегда три разные игры, и одна дата всегда даёт одни и те же', () => {
  const games = warmupGamesForDay('2026-11-11');
  expect(games).toHaveLength(3);
  expect(new Set(games.map((g) => g.id)).size).toBe(3);
  expect(warmupGamesForDay('2026-11-11').map((g) => g.id)).toEqual(games.map((g) => g.id));
});

it('за восемь дней подряд каждая игра встречается, а соседние дни не повторяют тройку', () => {
  const seen = new Set<string>();
  let previous = '';
  for (let i = 0; i < 8; i += 1) {
    const d = new Date(2026, 10, 11 + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const ids = warmupGamesForDay(key).map((g) => g.id);
    ids.forEach((id) => seen.add(id));
    expect(ids.join(',')).not.toBe(previous);
    previous = ids.join(',');
  }
  expect(seen.size).toBe(WARMUP_POOL.length);
});

it('отмечает сыгранное, сообщает подписчикам и ведёт к следующей несыгранной игре', () => {
  let calls = 0;
  subscribeWarmup(() => { calls += 1; });
  const [first, second, third] = peekWarmup().games;
  expect(nextWarmupIndex(peekWarmup(), 0)).toBe(0);
  markWarmupGamePlayed(first.id, '5/6');
  expect(calls).toBe(1);
  expect(peekWarmup().results[first.id]).toBe('5/6');
  expect(nextWarmupIndex(peekWarmup(), 0)).toBe(1);
  markWarmupGamePlayed(third.id, '6/6');
  expect(nextWarmupIndex(peekWarmup(), 2)).toBe(1);
  markWarmupGamePlayed(second.id, '4/4');
  expect(warmupPlayedCount(peekWarmup())).toBe(3);
  expect(nextWarmupIndex(peekWarmup(), 0)).toBeNull();
});

it('игра не из сегодняшней тройки в счёт дня не идёт', () => {
  const today = new Set(peekWarmup().games.map((g) => g.id));
  const other = WARMUP_POOL.find((g) => !today.has(g.id));
  expect(other).toBeDefined();
  if (other) markWarmupGamePlayed(other.id, '1/1');
  expect(warmupPlayedCount(peekWarmup())).toBe(0);
});

it('на следующий день разминка снова чистая', () => {
  markWarmupGamePlayed(peekWarmup().games[0].id, '6/6');
  now = NOON + DAY_MS;
  expect(warmupPlayedCount(peekWarmup())).toBe(0);
  expect(peekWarmup().day).toBe('2026-11-12');
});
