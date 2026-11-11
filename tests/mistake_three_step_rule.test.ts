import {
  MISTAKE_CHECK_DELAY_MS,
  MISTAKE_STEPS_REQUIRED,
  MISTAKE_STUBBORN_AFTER_MISSES,
  applyMistakeStepAnswer,
  initialMistakeStepState,
  isMistakeCheckDue,
  mistakeStepSupport,
  type MistakeStepState,
} from '../modules/mistake-practice/three_step_rule';

// зачем (владелец 11.11, D203): ошибка исправлена после ТРЁХ шагов от лёгкого к самостоятельному, затем уходит
// на проверку через несколько дней; промах на проверке возвращает её. Здесь сторожим само правило — чистую функцию.
const T0 = 1_700_000_000_000;
const answer = (state: MistakeStepState, correct: boolean, at = T0, check = false) =>
  applyMistakeStepAnswer(state, { correct, occurredAtMs: at, check });

describe('mistake three-step correction rule (D203)', () => {
  test('a fresh mistake starts at step zero with the lightest task', () => {
    const state = initialMistakeStepState();
    expect(state).toEqual({ phase: 'steps', stepsDone: 0, checkDueAtMs: null, missesInRow: 0, stubborn: false });
    expect(mistakeStepSupport(state)).toBe('recognition');
  });

  test('one correct answer is NOT enough — the mistake stays in the list', () => {
    const state = answer(initialMistakeStepState(), true);
    expect(state.phase).toBe('steps');
    expect(state.stepsDone).toBe(1);
    expect(mistakeStepSupport(state)).toBe('guided');
  });

  test('three correct answers move the mistake out of the list and schedule the check', () => {
    let state = initialMistakeStepState();
    for (let i = 0; i < MISTAKE_STEPS_REQUIRED; i += 1) state = answer(state, true, T0 + i);
    expect(MISTAKE_STEPS_REQUIRED).toBe(3);
    expect(state.phase).toBe('check');
    expect(state.stepsDone).toBe(3);
    expect(state.checkDueAtMs).toBe(T0 + 2 + MISTAKE_CHECK_DELAY_MS);
  });

  test('the second step is independent production', () => {
    const state = answer(answer(initialMistakeStepState(), true), true);
    expect(mistakeStepSupport(state)).toBe('production');
  });

  test('a miss sends the mistake one step down, never below zero', () => {
    const two = answer(answer(initialMistakeStepState(), true), true);
    expect(answer(two, false).stepsDone).toBe(1);
    expect(answer(initialMistakeStepState(), false).stepsDone).toBe(0);
  });

  test('three misses in a row mark the mistake stubborn; a correct answer clears the streak', () => {
    let state = initialMistakeStepState();
    for (let i = 0; i < MISTAKE_STUBBORN_AFTER_MISSES; i += 1) state = answer(state, false);
    expect(state.stubborn).toBe(true);
    const recovered = answer(state, true);
    expect(recovered.missesInRow).toBe(0);
    expect(recovered.stubborn).toBe(false);
  });

  test('the check is not due before its day and is due from it', () => {
    let state = initialMistakeStepState();
    for (let i = 0; i < 3; i += 1) state = answer(state, true);
    const due = state.checkDueAtMs ?? 0;
    expect(isMistakeCheckDue(state, due - 1)).toBe(false);
    expect(isMistakeCheckDue(state, due)).toBe(true);
    expect(isMistakeCheckDue(initialMistakeStepState(), due)).toBe(false);
  });

  test('a passed check finishes the mistake for good', () => {
    let state = initialMistakeStepState();
    for (let i = 0; i < 3; i += 1) state = answer(state, true);
    const done = answer(state, true, T0 + MISTAKE_CHECK_DELAY_MS, true);
    expect(done.phase).toBe('done');
    expect(done.checkDueAtMs).toBeNull();
    expect(answer(done, false, T0 + MISTAKE_CHECK_DELAY_MS + 1, true)).toEqual(done);
  });

  test('a failed check returns the mistake to the list from step zero', () => {
    let state = initialMistakeStepState();
    for (let i = 0; i < 3; i += 1) state = answer(state, true);
    const back = answer(state, false, T0 + MISTAKE_CHECK_DELAY_MS, true);
    expect(back).toEqual({ phase: 'steps', stepsDone: 0, checkDueAtMs: null, missesInRow: 1, stubborn: false });
  });

  test('ordinary practice answers do not touch a mistake that waits for its check', () => {
    let state = initialMistakeStepState();
    for (let i = 0; i < 3; i += 1) state = answer(state, true);
    expect(answer(state, false, T0 + 10)).toEqual(state);
    expect(answer(state, true, T0 + 10)).toEqual(state);
  });

  test('the rule never mutates the state it was given', () => {
    const start = initialMistakeStepState();
    const frozen = Object.freeze({ ...start });
    expect(() => answer(frozen, true)).not.toThrow();
    expect(frozen).toEqual(start);
  });
});
