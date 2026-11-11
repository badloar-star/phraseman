/** Игры на диалогах («Охота на ошибку», «Собери диалог»): правила из утверждённого макета. */
import {
  HUNT_SEED_TASKS, INITIAL_ORDER_STATE, ORDER_SEED_TASKS, huntFixedLines, isHuntHit, isValidHuntTask, isValidOrderTask,
  shuffledOrder, tapOrderLine,
} from '../modules/games/dialogue_core';

const HUNT = HUNT_SEED_TASKS[0];
const ORDER = ORDER_SEED_TASKS[0];

it('охота: пример из макета годен, ошибка одна и находится нажатием', () => {
  expect(isValidHuntTask(HUNT)).toBe(true);
  expect(isHuntHit(HUNT, 1, 2)).toBe(true);
  expect(isHuntHit(HUNT, 2, 3)).toBe(false);
  expect(huntFixedLines(HUNT)[1].words.join(' ')).toBe('Yes, she works here every day.');
  expect(HUNT.lines[1].words.join(' ')).toBe('Yes, she work here every day.');
});

it('охота: задание, которое нельзя решить, отсекается', () => {
  expect(isValidHuntTask({ ...HUNT, wrong: { line: 0, word: 0 } })).toBe(false);
  expect(isValidHuntTask({ ...HUNT, fix: ' ' })).toBe(false);
});

it('диалог: реплики принимаются только по порядку', () => {
  expect(isValidOrderTask(ORDER)).toBe(true);
  const miss = tapOrderLine(INITIAL_ORDER_STATE, ORDER, 2);
  expect(miss).toMatchObject({ correct: false, finished: false, state: { placed: 0, misses: 1 } });
  let state = miss.state;
  let finished = false;
  for (let i = 0; i < ORDER.lines.length; i += 1) {
    const r = tapOrderLine(state, ORDER, i);
    expect(r.correct).toBe(true);
    state = r.state;
    finished = r.finished;
  }
  expect(finished).toBe(true);
  expect(tapOrderLine(state, ORDER, 0)).toMatchObject({ correct: false, finished: true });
});

it('диалог: кнопки никогда не стоят в верном порядке', () => {
  expect(shuffledOrder(4, () => 0.999)).not.toEqual([0, 1, 2, 3]);
  for (let seed = 1; seed <= 20; seed += 1) {
    let s = seed;
    const order = shuffledOrder(4, () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; });
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
    expect(order).not.toEqual([0, 1, 2, 3]);
  }
});
