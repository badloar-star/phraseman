import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import { MISTAKE_RULE_THREE_STEPS, projectMistakes } from '../modules/mistake-practice/projection';
import { selectMistakesForSession } from '../modules/mistake-practice/scheduler';
import { advanceMistakePracticeSession, buildMistakePracticeSession } from '../modules/mistake-practice/session';
import { MISTAKE_STUBBORN_REST_MS } from '../modules/mistake-practice/three_step_rule';

// зачем (владелец 11.11, D203, упрямая ошибка): после трёх промахов подряд экран говорит «Вернёмся к этой фразе завтра».
// Раньше за этими словами ничего не стояло. Здесь сторожим, что обещание исполняется: задания по ошибке прекращаются
// и сутки она в занятия не попадает.
const T0 = 1_760_000_000_000;

const captured = (id: string, at = T0): MistakeEvent => ({
  eventId: `cap:${id}:${at}`,
  mistakeId: `mistake:v1:${id}`,
  cycleId: `mistake-cycle:v1:${id}`,
  type: 'captured',
  occurredAtMs: at,
  studyTarget: 'en',
  payload: {
    canonicalTarget: `She works at home ${id}`,
    facet: 'form',
    sourceKind: 'lesson_phrase',
    sourceId: `lesson-4:phrase-${id}`,
    sourceMeaning: `Она работает дома ${id}`,
    tokens: ['She', 'works', 'at', 'home', id],
    distractors: ['work', 'working', 'in'],
    expected: 'works',
  },
});

let seq = 0;
const answered = (id: string, correct: boolean, at: number): MistakeEvent => ({
  eventId: `ans:${id}:${at}:${seq += 1}`,
  mistakeId: `mistake:v1:${id}`,
  cycleId: `mistake-cycle:v1:${id}`,
  type: 'practice_answered',
  occurredAtMs: at,
  studyTarget: 'en',
  payload: { correct, mode: 'lesson_choice', localDay: '2026-11-11', rule: MISTAKE_RULE_THREE_STEPS },
});

const item = (events: MistakeEvent[], id = 'a') => projectMistakes(events).items.get(`mistake:v1:${id}`)!;

describe('a stubborn mistake really rests until tomorrow', () => {
  test('three misses in a row move the mistake a day ahead', () => {
    const state = item([captured('a'), answered('a', false, T0 + 1), answered('a', false, T0 + 2), answered('a', false, T0 + 3)]);
    expect(state.stubborn).toBe(true);
    expect(state.status).toBe('active');
    expect(state.dueAtMs).toBe(T0 + 3 + MISTAKE_STUBBORN_REST_MS);
  });

  test('two misses keep the mistake available right away', () => {
    const state = item([captured('a'), answered('a', false, T0 + 1), answered('a', false, T0 + 2)]);
    expect(state.stubborn).toBe(false);
    expect(state.dueAtMs).toBe(T0 + 2);
  });

  test('a correct answer between misses breaks the streak', () => {
    const state = item([
      captured('a'), answered('a', false, T0 + 1), answered('a', false, T0 + 2),
      answered('a', true, T0 + 3), answered('a', false, T0 + 4),
    ]);
    expect(state.stubborn).toBe(false);
    expect(state.dueAtMs).toBe(T0 + 4);
  });

  test('the resting mistake is not offered today and comes back tomorrow', () => {
    const events = [captured('a'), answered('a', false, T0 + 1), answered('a', false, T0 + 2), answered('a', false, T0 + 3), captured('b', T0 + 4)];
    const items = [...projectMistakes(events).items.values()];
    const today = selectMistakesForSession(items, { nowMs: T0 + 1000, limit: 10 }).map((entry) => entry.mistakeId);
    expect(today).toEqual(['mistake:v1:b']);
    const tomorrow = selectMistakesForSession(items, { nowMs: T0 + 3 + MISTAKE_STUBBORN_REST_MS, limit: 10 }).map((entry) => entry.mistakeId);
    expect(tomorrow.sort()).toEqual(['mistake:v1:a', 'mistake:v1:b']);
  });

  test('a new miss in a lesson brings the resting mistake back at once', () => {
    const events = [
      captured('a'), answered('a', false, T0 + 1), answered('a', false, T0 + 2), answered('a', false, T0 + 3),
      { ...captured('a', T0 + 500), eventId: 'cap:a:again' },
    ];
    expect(item(events).dueAtMs).toBeLessThanOrEqual(T0 + 500);
  });
});

describe('a stubborn mistake leaves the running session', () => {
  const session = () => buildMistakePracticeSession({
    items: [...projectMistakes([captured('a'), captured('b', T0 + 1), captured('c', T0 + 2)]).items.values()],
    requestedLength: 'all',
    nowMs: T0 + 100,
  });

  /** Отвечает неверно на ошибку `id` столько раз, сколько она встретится, пока занятие её не остановит. */
  const failUntilStopped = (id: string) => {
    let current = session();
    let attempt = 0;
    for (let guard = 0; guard < 60; guard += 1) {
      const entry = current.queue[current.cursor];
      if (!entry) break;
      attempt += 1;
      const result = advanceMistakePracticeSession(current, { attemptId: `t-${attempt}`, correct: entry.mistakeId !== id });
      current = result.session;
      if (result.requeue?.kind === 'stop_for_today') return current;
    }
    throw new Error('the session never stopped the mistake');
  };

  test('after the third miss in a row none of its later steps stay in the queue', () => {
    const stopped = failUntilStopped('mistake:v1:a');
    const rest = stopped.queue.slice(stopped.cursor).map((entry) => entry.mistakeId);
    expect(rest).not.toContain('mistake:v1:a');
    expect(rest.length).toBeGreaterThan(0);
  });

  test('the other mistakes keep all the steps they still owe', () => {
    const stopped = failUntilStopped('mistake:v1:a');
    const all = stopped.queue.map((entry) => entry.mistakeId);
    expect(all.filter((id) => id === 'mistake:v1:b')).toHaveLength(3);
    expect(all.filter((id) => id === 'mistake:v1:c')).toHaveLength(3);
  });

  test('miss, correct, miss, miss does not stop the mistake: the streak starts over', () => {
    let current = session();
    const answers: boolean[] = [];
    const plan = [false, true, false, false];
    let step = 0;
    let attempt = 0;
    for (let guard = 0; guard < 60 && step < plan.length; guard += 1) {
      const entry = current.queue[current.cursor];
      if (!entry) break;
      attempt += 1;
      const mine = entry.mistakeId === 'mistake:v1:a';
      const correct = mine ? plan[step]! : true;
      const result = advanceMistakePracticeSession(current, { attemptId: `s-${attempt}`, correct });
      if (mine) {
        step += 1;
        answers.push(result.requeue?.kind === 'stop_for_today');
      }
      current = result.session;
    }
    expect(step).toBe(plan.length);
    expect(answers).toEqual([false, false, false, false]);
  });
});
