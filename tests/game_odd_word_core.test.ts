/** Игра «Лишнее слово»: правила и тропа из утверждённого макета. */
import {
  INITIAL_ODD_WORD_STATE, ODD_WORD_SEED_TASKS, isValidOddWordTask, nextOddWordRound, oddWordTrail, tapOddWord,
} from '../modules/games/odd_word_core';

const TASK = ODD_WORD_SEED_TASKS[0];

it('примеры из макета годны: лишнее слово существует', () => {
  expect(ODD_WORD_SEED_TASKS).toHaveLength(4);
  expect(ODD_WORD_SEED_TASKS.every(isValidOddWordTask)).toBe(true);
  expect(TASK.words[TASK.extraIndex]).toBe('do');
  expect(isValidOddWordTask({ ...TASK, extraIndex: 9 })).toBe(false);
});

it('промах сбрасывает серию и оставляет фразу; верное нажатие растит серию', () => {
  const hit = tapOddWord(INITIAL_ODD_WORD_STATE, TASK, TASK.extraIndex);
  expect(hit).toMatchObject({ correct: true, state: { streak: 1, solved: 1, bestStreak: 1, missedThisRound: false } });
  const miss = tapOddWord(hit.state, TASK, 0);
  expect(miss).toMatchObject({ correct: false, state: { streak: 0, misses: 1, bestStreak: 1, solved: 1, missedThisRound: true } });
  expect(nextOddWordRound(miss.state)).toMatchObject({ round: 1, missedThisRound: false, bestStreak: 1 });
});

it('не меняет исходное состояние', () => {
  const frozen = Object.freeze({ ...INITIAL_ODD_WORD_STATE });
  expect(() => tapOddWord(frozen, TASK, 0)).not.toThrow();
  expect(frozen.streak).toBe(0);
});

it('тропа: старт и конец — как в кривой макета, остановок на одну больше, чем фраз', () => {
  const trail = oddWordTrail(4);
  expect(trail.stops).toHaveLength(5);
  expect(trail.stops[0]).toEqual({ x: 36, y: 70 });
  expect(Math.round(trail.stops[4].x)).toBe(372);
  expect(Math.round(trail.stops[4].y)).toBe(44);
  expect(trail.length).toBeGreaterThan(336);
  for (let i = 1; i < trail.stops.length; i += 1) expect(trail.stops[i].x).toBeGreaterThan(trail.stops[i - 1].x);
});
