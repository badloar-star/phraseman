import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import { MISTAKE_RULE_THREE_STEPS, projectMistakes } from '../modules/mistake-practice/projection';
import { buildMistakePracticeSession } from '../modules/mistake-practice/session';
import { MISTAKE_CHECK_DELAY_MS } from '../modules/mistake-practice/three_step_rule';

// зачем (владелец 11.11, D203): правило «три шага + проверка» подключено к расчёту состояния ошибки и к сборке занятия.
// Главный риск — пересчёт старой истории: ответы без метки правила обязаны читаться по-старому.
const T0 = 1_760_000_000_000;
const ID = 'mistake:v1:abc';
const CYCLE = 'mistake-cycle:v1:abc';

const captured = (at = T0, mistakeId = ID, cycleId = CYCLE): MistakeEvent => ({
  eventId: `cap:${mistakeId}:${at}`,
  mistakeId,
  cycleId,
  type: 'captured',
  occurredAtMs: at,
  studyTarget: 'en',
  payload: {
    canonicalTarget: 'She works at home',
    facet: 'form',
    sourceKind: 'lesson_phrase',
    sourceId: `lesson-4:phrase-${mistakeId}`,
    sourceMeaning: 'Она работает дома',
    tokens: ['She', 'works', 'at', 'home'],
    distractors: ['work', 'working', 'in'],
    expected: 'works',
  },
});

let seq = 0;
const answered = (correct: boolean, at: number, extra: Record<string, unknown> = {}, mistakeId = ID, cycleId = CYCLE): MistakeEvent => ({
  eventId: `ans:${mistakeId}:${at}:${seq += 1}`,
  mistakeId,
  cycleId,
  type: 'practice_answered',
  occurredAtMs: at,
  studyTarget: 'en',
  payload: { correct, mode: 'lesson_choice', localDay: '2026-11-11', ...extra },
});

const v3 = { rule: MISTAKE_RULE_THREE_STEPS };
const item = (events: readonly MistakeEvent[]) => projectMistakes(events).items.get(ID)!;

describe('mistake projection under the three-step rule (D203)', () => {
  // зачем: что именно делает прежнее правило с ответом без метки — забота его собственных тестов; здесь сторожим только
  // то, что новое правило такой ответ НЕ трогает: ни проверки, ни счётчика промахов.
  test('an answer WITHOUT the rule marker is left to the previous rule', () => {
    const right = item([captured(), answered(true, T0 + 1)]);
    expect(right.checkDueAtMs).toBeNull();
    expect(right.checkPassedAtMs).toBeNull();
    const wrong = item([captured(), answered(false, T0 + 1), answered(false, T0 + 2), answered(false, T0 + 3)]);
    expect(wrong.missesInRow).toBe(0);
    expect(wrong.stubborn).toBe(false);
  });

  test('with the marker one correct answer leaves the mistake active at step one', () => {
    const state = item([captured(), answered(true, T0 + 1, v3)]);
    expect(state.status).toBe('active');
    expect(state.supportPassCount).toBe(1);
  });

  test('three marked correct answers correct the mistake and schedule the check', () => {
    const state = item([captured(), answered(true, T0 + 1, v3), answered(true, T0 + 2, v3), answered(true, T0 + 3, v3)]);
    expect(state.status).toBe('corrected');
    expect(state.correctedAtMs).toBe(T0 + 3);
    expect(state.checkDueAtMs).toBe(T0 + 3 + MISTAKE_CHECK_DELAY_MS);
    expect(state.checkPassedAtMs).toBeNull();
  });

  test('a marked miss drops one step, not all of them', () => {
    const state = item([captured(), answered(true, T0 + 1, v3), answered(true, T0 + 2, v3), answered(false, T0 + 3, v3)]);
    expect(state.status).toBe('active');
    expect(state.supportPassCount).toBe(1);
    expect(state.missesInRow).toBe(1);
  });

  test('three marked misses in a row make the mistake stubborn', () => {
    const state = item([captured(), answered(false, T0 + 1, v3), answered(false, T0 + 2, v3), answered(false, T0 + 3, v3)]);
    expect(state.stubborn).toBe(true);
    expect(state.status).toBe('active');
  });

  test('a correct review answer passes the check; a wrong one returns the mistake from step zero', () => {
    const fixed = [captured(), answered(true, T0 + 1, v3), answered(true, T0 + 2, v3), answered(true, T0 + 3, v3)];
    const later = T0 + 3 + MISTAKE_CHECK_DELAY_MS;
    const passed = item([...fixed, answered(true, later, { ...v3, review: true })]);
    expect(passed.status).toBe('corrected');
    expect(passed.checkPassedAtMs).toBe(later);
    expect(passed.checkDueAtMs).toBeNull();

    const failed = item([...fixed, answered(false, later, { ...v3, review: true })]);
    expect(failed.status).toBe('active');
    expect(failed.supportPassCount).toBe(0);
    expect(failed.checkDueAtMs).toBeNull();
  });

  test('old history is not rewritten: an unmarked record reads the same after marked answers appear elsewhere', () => {
    const other = 'mistake:v1:other';
    const old = [captured(), answered(true, T0 + 1), answered(false, T0 + 2), answered(true, T0 + 3)];
    const before = projectMistakes(old).items.get(ID);
    const after = projectMistakes([
      ...old,
      captured(T0 + 5, other, 'mistake-cycle:v1:other'), answered(true, T0 + 6, v3, other, 'mistake-cycle:v1:other'),
    ]);
    expect(after.items.get(ID)).toEqual(before);
    expect(after.items.get(other)!.status).toBe('active');
    expect(after.items.get(other)!.supportPassCount).toBe(1);
  });
});

describe('practice session carries all remaining steps of every mistake (D203)', () => {
  const second = 'mistake:v1:second';
  const journal = [captured(), captured(T0 + 1, second, 'mistake-cycle:v1:second')];
  const items = () => [...projectMistakes(journal).items.values()];

  test('a fresh mistake appears three times, never twice in a row when there are other mistakes', () => {
    const session = buildMistakePracticeSession({ items: items(), requestedLength: 'all', nowMs: T0 + 10 });
    expect(session.initialCount).toBe(2);
    expect(session.queue).toHaveLength(6);
    expect(session.queue.map((entry) => entry.mistakeId)).toEqual([ID, second, ID, second, ID, second]);
  });

  test('a mistake that already passed one step gets only the two steps it still owes', () => {
    const withStep = [...journal, answered(true, T0 + 2, v3)];
    const session = buildMistakePracticeSession({ items: [...projectMistakes(withStep).items.values()], requestedLength: 'all', nowMs: T0 + 10 });
    expect(session.queue.filter((entry) => entry.mistakeId === ID)).toHaveLength(2);
    expect(session.queue.filter((entry) => entry.mistakeId === second)).toHaveLength(3);
  });

  test('the review of corrected mistakes stays one question per mistake', () => {
    const fixed = [captured(), answered(true, T0 + 1, v3), answered(true, T0 + 2, v3), answered(true, T0 + 3, v3)];
    const session = buildMistakePracticeSession({ items: [...projectMistakes(fixed).items.values()], requestedLength: 'all', nowMs: T0 + 10, pool: 'corrected' });
    expect(session.queue).toHaveLength(1);
  });
});
