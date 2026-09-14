import {
  advanceMistakePracticeSession,
  mistakePracticeProgress,
  type MistakePracticeSession,
} from '../modules/mistake-practice/session';

// Сторож бага владельца 2026-09-14: экран «Мои ошибки» показывал «10/10» сразу
// при открытии. Прежняя формула считала уникальные mistakeId в ПРОЙДЕННОЙ части
// очереди, поэтому ошибочные ответы (они переставляют задание дальше по очереди)
// накручивали счётчик до максимума задолго до конца сессии. Такая сессия
// сохранялась и при следующем заходе восстанавливалась уже «завершённой» на вид.

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

const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

const freshSession = (): MistakePracticeSession => ({
  version: 1,
  sessionId: 'session-progress',
  startedAtMs: 1,
  initialCount: ids.length,
  cursor: 0,
  queue: ids.map(entry),
  failureCounts: {},
  answeredAttemptIds: [],
});

describe('mistake practice progress counter', () => {
  test('starts at zero on a fresh session', () => {
    expect(mistakePracticeProgress(freshSession())).toBe(0);
  });

  test('never reports every mistake closed while tasks remain in the queue', () => {
    let session = freshSession();
    const answeredWrongOnce = new Set<string>();
    let step = 0;
    while (session.cursor < session.queue.length && step < 200) {
      const current = session.queue[session.cursor];
      // Каждую ошибку сначала проваливаем, на повторном показе отвечаем верно —
      // это и есть сценарий, в котором старая формула упиралась в 10/10 рано.
      const correct = answeredWrongOnce.has(current.mistakeId);
      answeredWrongOnce.add(current.mistakeId);
      const result = advanceMistakePracticeSession(session, {
        attemptId: `attempt-${step}`,
        correct,
      });
      session = result.session;
      step += 1;
      const progress = mistakePracticeProgress(session);
      const finished = session.cursor >= session.queue.length;
      if (!finished) {
        expect(progress).toBeLessThan(session.initialCount);
      }
    }
    expect(session.cursor).toBeGreaterThanOrEqual(session.queue.length);
    expect(mistakePracticeProgress(session)).toBe(session.initialCount);
  });

  test('counts a mistake only after its last queued repeat is answered', () => {
    let session = freshSession();
    // Первый ответ неверный — задание вернётся позже, ошибка ещё НЕ закрыта.
    session = advanceMistakePracticeSession(session, { attemptId: 'wrong', correct: false }).session;
    expect(mistakePracticeProgress(session)).toBe(0);
    // Второе задание отвечено верно и в очереди больше не появляется.
    session = advanceMistakePracticeSession(session, { attemptId: 'right', correct: true }).session;
    expect(mistakePracticeProgress(session)).toBe(1);
  });

  test('grows one by one when every answer is correct', () => {
    let session = freshSession();
    for (let index = 0; index < ids.length; index += 1) {
      session = advanceMistakePracticeSession(session, {
        attemptId: `clean-${index}`,
        correct: true,
      }).session;
      expect(mistakePracticeProgress(session)).toBe(index + 1);
    }
  });

  test('never exceeds the initial count', () => {
    let session = freshSession();
    let step = 0;
    while (session.cursor < session.queue.length && step < 200) {
      session = advanceMistakePracticeSession(session, {
        attemptId: `cap-${step}`,
        correct: step % 3 === 0,
      }).session;
      expect(mistakePracticeProgress(session)).toBeLessThanOrEqual(session.initialCount);
      step += 1;
    }
  });
});
