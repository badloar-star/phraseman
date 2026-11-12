/**
 * Правило уровней игры (D207, макет `levels()`): «Три хороших захода подряд — уровень вверх. Два слабых — вниз».
 * зачем: уровень человек не выбирает — значит, правило обязано быть точным и не уводить за края лестницы.
 */
import {
  INITIAL_LEVELS_STATE, LEVELS_COUNT, LEVELS_GOOD_TO_RISE, LEVELS_WEAK_TO_DROP, applyLevelRun, levelRowState, normalizeLevelsState, type LevelsState,
} from '../modules/games/levels_core';
import { LEVELS_MOTION } from '../modules/games/levels_motion';

const run = (start: LevelsState, results: readonly boolean[]): LevelsState => results.reduce((s, good) => applyLevelRun(s, good).state, start);

it('три хороших подряд поднимают уровень, серия обнуляется', () => {
  const two = run(INITIAL_LEVELS_STATE, [true, true]);
  expect(two).toEqual({ level: 0, good: 2, weak: 0 });
  const third = applyLevelRun(two, true);
  expect(third).toEqual({ state: { level: 1, good: 0, weak: 0 }, moved: 1 });
});

it('слабый заход рвёт серию хороших, хороший — серию слабых', () => {
  expect(run(INITIAL_LEVELS_STATE, [true, true, false, true, true])).toEqual({ level: 0, good: 2, weak: 0 });
  expect(run({ level: 2, good: 0, weak: 0 }, [false, true, false])).toEqual({ level: 2, good: 0, weak: 1 });
});

it('два слабых подряд опускают уровень', () => {
  const one = applyLevelRun({ level: 3, good: 1, weak: 0 }, false);
  expect(one).toEqual({ state: { level: 3, good: 0, weak: 1 }, moved: 0 });
  expect(applyLevelRun(one.state, false)).toEqual({ state: { level: 2, good: 0, weak: 0 }, moved: -1 });
});

it('уровень не выходит за края лестницы', () => {
  const top = { level: LEVELS_COUNT - 1, good: LEVELS_GOOD_TO_RISE - 1, weak: 0 };
  expect(applyLevelRun(top, true)).toEqual({ state: { level: LEVELS_COUNT - 1, good: 0, weak: 0 }, moved: 0 });
  const bottom = { level: 0, good: 0, weak: LEVELS_WEAK_TO_DROP - 1 };
  expect(applyLevelRun(bottom, false)).toEqual({ state: { level: 0, good: 0, weak: 0 }, moved: 0 });
});

it('внешние данные приводятся к допустимому состоянию', () => {
  expect(normalizeLevelsState({ level: '2', good: '1' })).toEqual({ level: 2, good: 1, weak: 0 });
  expect(normalizeLevelsState({ level: 99, good: 99, weak: 99 })).toEqual({ level: LEVELS_COUNT - 1, good: LEVELS_GOOD_TO_RISE - 1, weak: LEVELS_WEAK_TO_DROP - 1 });
  expect(normalizeLevelsState({ level: -3, good: 'abc', weak: Number.NaN })).toEqual(INITIAL_LEVELS_STATE);
  expect(normalizeLevelsState({ level: 2.9 })).toEqual({ level: 2, good: 0, weak: 0 });
  expect(normalizeLevelsState(undefined)).toEqual(INITIAL_LEVELS_STATE);
  expect(applyLevelRun({ level: 9, good: 7, weak: 0 }, true).state.level).toBe(LEVELS_COUNT - 1);
});

it('вид строк лестницы: пройденные ниже текущей, впереди — выше', () => {
  const state = { level: 2, good: 0, weak: 0 };
  expect(Array.from({ length: LEVELS_COUNT }, (_, i) => levelRowState(state, i))).toEqual(['done', 'done', 'cur', 'next', 'next']);
});

it('числа движения — из макета: строка 400/400/500 мс, монета и деления 300 мс, пять ступеней и три деления', () => {
  expect([LEVELS_MOTION.rowFadeMs, LEVELS_MOTION.rowTintMs, LEVELS_MOTION.rowScaleMs, LEVELS_MOTION.coinFadeMs, LEVELS_MOTION.pipMs]).toEqual([400, 400, 500, 300, 300]);
  expect([LEVELS_MOTION.rowOpacity, LEVELS_MOTION.rowOpacityDone, LEVELS_MOTION.rowScaleCur]).toEqual([0.5, 0.85, 1.03]);
  expect([LEVELS_COUNT, LEVELS_GOOD_TO_RISE, LEVELS_WEAK_TO_DROP]).toEqual([5, 3, 2]);
});
