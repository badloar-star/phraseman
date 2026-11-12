/**
 * Подбор заданий для игр (владелец 11.11: «фразы должны корректно подбираться для режимов игры, без багов»):
 * задания только для языка, который человек учит; урок — не старше текущего; порция дня стабильна.
 */
import { isValidOddWordTask } from '../modules/games/odd_word_core';
import { isValidQuizRound } from '../modules/games/quiz_core';
import {
  bankEntryForLesson, dailyPortion, isGameAvailable, oddWordTasksFor, quizDeckFor, sortDeckFor, type GameId,
} from '../modules/games/task_source';
import { WARMUP_POOL, availableWarmupGames, warmupGamesForDay } from '../modules/games/warmup_state';

const ALL: GameId[] = ['flow', 'odd_word', 'sort', 'listen', 'memory', 'exact', 'forms', 'hunt', 'order', 'race'];

it('для английского уроков 1–8 у каждой игры есть годные задания', () => {
  for (let lesson = 1; lesson <= 8; lesson += 1) {
    const odd = oddWordTasksFor('en', lesson);
    expect(odd.length).toBeGreaterThan(0);
    expect(odd.every(isValidOddWordTask)).toBe(true);
    expect(sortDeckFor('en', lesson)?.tasks.length ?? 0).toBeGreaterThan(0);
    for (const kind of ['listen', 'memory', 'exact', 'forms'] as const) {
      const deck = quizDeckFor(kind, 'en', lesson);
      expect(deck?.rounds.length ?? 0).toBeGreaterThan(0);
      expect(deck?.rounds.every(isValidQuizRound)).toBe(true);
    }
    // зачем (владелец 11.11, «Скрыть на уроке 1»): в уроке 1 одни утверждения, однозначный порядок реплик не собрать — «Собери диалог» идёт с урока 2
    expect([lesson, ALL.filter((id) => !isGameAvailable(id, 'en', lesson))]).toEqual([lesson, lesson === 1 ? ['order'] : []]);
  }
});

it('язык без банка не получает ни чужих заданий, ни «Потока» с чужими фразами', () => {
  for (const target of ['xx', 'toString', 'constructor']) {
    expect(oddWordTasksFor(target, 1)).toEqual([]);
    expect(sortDeckFor(target, 1)).toBeNull();
    expect(quizDeckFor('exact', target, 1)).toBeNull();
    expect(ALL.filter((id) => isGameAvailable(id, target, 1))).toEqual([]);
    expect(availableWarmupGames(target).map((g) => g.id)).toEqual([]);
  }
});

it('урок старше банка берёт ближайший предыдущий, а не будущий и не пустоту', () => {
  // зачем (12.11): банк английского дорос до урока 12 — ближайший предыдущий для урока 20 теперь 12
  expect(sortDeckFor('en', 20)?.id).toBe(sortDeckFor('en', 12)?.id);
  expect(sortDeckFor('en', 20)?.id).toBe('sort-en-l12');
  const bank = { 2: ['b'], 5: ['e'] };
  expect(bankEntryForLesson(bank, 4, (x) => x.length > 0)).toEqual(['b']);
  expect(bankEntryForLesson(bank, 5, (x) => x.length > 0)).toEqual(['e']);
  expect(bankEntryForLesson(bank, 1, (x) => x.length > 0)).toBeNull();
  expect(bankEntryForLesson({ 3: [] as string[] }, 9, (x) => x.length > 0)).toBeNull();
  expect(bankEntryForLesson(undefined as Record<number, string[]> | undefined, 3, () => true)).toBeNull();
});

it('порция дня: нужного размера, без повторов, одна и та же в течение дня', () => {
  const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const today = dailyPortion(items, 4, 20768);
  expect(today).toHaveLength(4);
  expect(new Set(today).size).toBe(4);
  expect(dailyPortion(items, 4, 20768)).toEqual(today);
  expect(dailyPortion(items, 4, 20769)).not.toEqual(today);
  expect(dailyPortion(['x', 'y'], 4, 3)).toEqual(['x', 'y']);
  expect(dailyPortion(items, 4, -3)).toHaveLength(4);
});

it('разминка: когда доступна одна игра, день состоит из неё одной', () => {
  // зачем: раньше «одну игру» давал язык без банка (ему оставался «Поток» с чужими фразами); теперь у такого языка
  // игр нет вовсе, поэтому одна игра берётся прямо из списка разминки
  const only = WARMUP_POOL.filter((g) => g.id === 'flow');
  expect(warmupGamesForDay('2026-11-11', only).map((g) => g.id)).toEqual(['flow']);
  expect(warmupGamesForDay('2026-11-11', availableWarmupGames('xx'))).toEqual([]);
  expect(warmupGamesForDay('2026-11-11', availableWarmupGames('en'))).toHaveLength(3);
});

it('«Поток» не предлагается, когда язык интерфейса равен изучаемому: перевод совпал бы с фразой', () => {
  expect(isGameAvailable('flow', 'en', 1, 'en')).toBe(false);
  expect(isGameAvailable('flow', 'es', 1, 'es')).toBe(false);
  expect(isGameAvailable('flow', 'en', 1, 'ru')).toBe(true);
  expect(isGameAvailable('flow', 'de', 1, 'en')).toBe(true);
  expect(availableWarmupGames('en', 'en').map((g) => g.id)).not.toContain('flow');
  expect(availableWarmupGames('en', 'ru').map((g) => g.id)).toContain('flow');
});

it('«Гонка с собой» доступна там же, где «Поток»: свой курс и другой язык интерфейса', () => {
  expect(isGameAvailable('race', 'en', 1, 'ru')).toBe(true);
  expect(isGameAvailable('race', 'de', 8, 'en')).toBe(true);
  expect(isGameAvailable('race', 'en', 1, 'en')).toBe(false);
  expect(isGameAvailable('race', 'xx', 1, 'ru')).toBe(false);
  expect(availableWarmupGames('en', 'ru').map((g) => g.id)).toContain('race');
  expect(availableWarmupGames('en', 'en').map((g) => g.id)).not.toContain('race');
});
