import {
  advanceMistakePracticeSession,
  type MistakePracticeSession,
} from '../modules/mistake-practice/session';

const entry = (id: string) => ({
  mistakeId: id,
  cycleId: `cycle-${id}`,
  facet: 'form' as const,
  support: 'production' as const,
  exercise: {
    exerciseId: `exercise-${id}`,
    mistakeId: id,
    mode: 'lesson_typing' as const,
    renderer: 'typing' as const,
    prompt: `prompt-${id}`,
    correctAnswer: `answer-${id}`,
    feedbackAnswer: `answer-${id}`,
  },
});

const session = (): MistakePracticeSession => ({
  version: 1,
  sessionId: 'session-1',
  startedAtMs: 1,
  initialCount: 5,
  cursor: 0,
  queue: [entry('a'), entry('b'), entry('c'), entry('d'), entry('e')],
  failureCounts: {},
  answeredAttemptIds: [],
});

describe('mistake session runtime', () => {
  test('advances a correct answer once and ignores an identical retry', () => {
    const first = advanceMistakePracticeSession(session(), { attemptId: 'try-1', correct: true });
    expect(first.kind).toBe('advanced');
    expect(first.session.cursor).toBe(1);
    const retry = advanceMistakePracticeSession(first.session, { attemptId: 'try-1', correct: true });
    expect(retry.kind).toBe('duplicate');
    expect(retry.session).toBe(first.session);
  });

  test('returns a failed item after two to four other tasks, at most twice', () => {
    let current = session();
    const first = advanceMistakePracticeSession(current, { attemptId: 'bad-1', correct: false });
    expect(first.kind).toBe('advanced');
    expect(first.requeue).toMatchObject({ kind: 'requeue' });
    const firstReturnIndex = first.session.queue.findIndex((item, index) => index > 0 && item.mistakeId === 'a');
    expect(firstReturnIndex).toBeGreaterThanOrEqual(3);
    expect(firstReturnIndex).toBeLessThanOrEqual(5);

    current = { ...first.session, cursor: firstReturnIndex };
    const second = advanceMistakePracticeSession(current, { attemptId: 'bad-2', correct: false });
    const secondReturnIndex = second.session.queue.findIndex((item, index) => index > firstReturnIndex && item.mistakeId === 'a');
    expect(secondReturnIndex).toBeGreaterThan(firstReturnIndex);

    current = { ...second.session, cursor: secondReturnIndex };
    const third = advanceMistakePracticeSession(current, { attemptId: 'bad-3', correct: false });
    expect(third.requeue).toEqual({ kind: 'stop_for_today', showExplanation: true });
    expect(third.session.queue.filter((item) => item.mistakeId === 'a')).toHaveLength(3);
  });

  test('adds real spacer tasks when the final item fails instead of repeating it immediately', () => {
    const atLast = { ...session(), cursor: 4 };
    const failed = advanceMistakePracticeSession(atLast, { attemptId: 'bad-last', correct: false });
    const appended = failed.session.queue.slice(5);
    const retryIndex = appended.findIndex((item) => item.mistakeId === 'e');
    expect(retryIndex).toBeGreaterThanOrEqual(2);
    expect(new Set(appended.slice(0, retryIndex).map((item) => item.mistakeId)).size).toBeGreaterThanOrEqual(2);
  });
});
