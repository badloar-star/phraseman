import {
  createSessionAttemptsState,
  reduceSessionAttempts,
  SESSION_ATTEMPTS_MAX,
  type SessionAttemptsStateV1,
} from '../app/session_attempts/session_attempts_domain';

const start = (): SessionAttemptsStateV1 => createSessionAttemptsState({
  sessionId: 'lesson_words:run_01',
  questionId: 'word:hello',
});
const wrong = (state: SessionAttemptsStateV1, answerAttemptId: string) => (
  reduceSessionAttempts(state, {
    type: 'verdict',
    answerAttemptId,
    verdict: 'pedagogical_wrong',
  })
);

describe('session attempts domain', () => {
  test('starts every session active with exactly three attempts', () => {
    expect(start()).toEqual({
      schemaVersion: 'session-attempts-state.v1',
      sessionId: 'lesson_words:run_01',
      questionId: 'word:hello',
      maxAttempts: SESSION_ATTEMPTS_MAX,
      remainingAttempts: 3,
      phase: 'active',
      recoveryOrdinal: 0,
      processedAnswerAttemptIds: [],
      recoveryReceiptIds: [],
    });
  });

  test('three unique pedagogical wrongs consume 3 → 2 → 1 → 0 and exhaust only on the third', () => {
    const first = wrong(start(), 'answer_01');
    expect(first.effect).toBe('attempt_consumed');
    expect(first.state).toMatchObject({ remainingAttempts: 2, phase: 'active' });

    const second = wrong(first.state, 'answer_02');
    expect(second.effect).toBe('attempt_consumed');
    expect(second.state).toMatchObject({ remainingAttempts: 1, phase: 'active' });

    const third = wrong(second.state, 'answer_03');
    expect(third.effect).toBe('attempts_exhausted');
    expect(third.state).toMatchObject({ remainingAttempts: 0, phase: 'awaiting_recovery' });
  });

  test('replayed answerAttemptId is a strict no-op', () => {
    const first = wrong(start(), 'answer_01');
    const replay = wrong(first.state, 'answer_01');

    expect(replay.effect).toBe('none');
    expect(replay.state).toBe(first.state);
  });

  test.each(['correct', 'no_speech', 'technical_error', 'cancelled'] as const)(
    '%s verdict does not consume an attempt',
    (verdict) => {
      const transition = reduceSessionAttempts(start(), {
        type: 'verdict',
        answerAttemptId: `answer_${verdict}`,
        verdict,
      });

      expect(transition.effect).toBe('none');
      expect(transition.state.remainingAttempts).toBe(3);
      expect(transition.state.processedAnswerAttemptIds).toContain(`answer_${verdict}`);
    },
  );

  test('recovery at zero restores exactly three and replays by receipt id', () => {
    const exhausted = wrong(wrong(wrong(start(), 'answer_01').state, 'answer_02').state, 'answer_03').state;
    const recovered = reduceSessionAttempts(exhausted, {
      type: 'recover_all',
      recoveryReceiptId: 'session_attempt_recovery:run_01:1',
    });

    expect(recovered.effect).toBe('attempts_restored');
    expect(recovered.state).toMatchObject({
      remainingAttempts: 3,
      phase: 'active',
      recoveryOrdinal: 1,
      recoveryReceiptIds: ['session_attempt_recovery:run_01:1'],
    });

    const replay = reduceSessionAttempts(recovered.state, {
      type: 'recover_all',
      recoveryReceiptId: 'session_attempt_recovery:run_01:1',
    });
    expect(replay.effect).toBe('none');
    expect(replay.state).toBe(recovered.state);
  });

  test('session-rune forfeiture restores hearts for every user without a recovery receipt', () => {
    const exhausted = wrong(wrong(wrong(start(), 'answer_01').state, 'answer_02').state, 'answer_03').state;

    const restored = reduceSessionAttempts(exhausted, {
      type: 'restore_after_session_rune_forfeit',
    });

    expect(restored.effect).toBe('attempts_restored');
    expect(restored.state).toMatchObject({
      remainingAttempts: 3,
      phase: 'active',
      recoveryOrdinal: 1,
      recoveryReceiptIds: [],
      questionId: 'word:hello',
    });

    const replay = reduceSessionAttempts(restored.state, {
      type: 'restore_after_session_rune_forfeit',
    });
    expect(replay.effect).toBe('none');
    expect(replay.state).toBe(restored.state);
  });

  test('recovery while active and verdict after end fail closed', () => {
    const activeRecovery = reduceSessionAttempts(start(), {
      type: 'recover_all',
      recoveryReceiptId: 'session_attempt_recovery:run_01:1',
    });
    expect(activeRecovery.effect).toBe('none');
    expect(activeRecovery.state).toEqual(start());

    const ended = reduceSessionAttempts(start(), { type: 'end_session' });
    expect(ended.effect).toBe('session_ended');
    expect(ended.state.phase).toBe('ended');

    const afterEnd = wrong(ended.state, 'answer_after_end');
    expect(afterEnd.effect).toBe('none');
    expect(afterEnd.state).toBe(ended.state);
  });

  test('question change preserves the session-level attempt count', () => {
    const afterWrong = wrong(start(), 'answer_01').state;
    const changed = reduceSessionAttempts(afterWrong, {
      type: 'question_changed',
      questionId: 'word:goodbye',
    });

    expect(changed.effect).toBe('none');
    expect(changed.state).toMatchObject({
      questionId: 'word:goodbye',
      remainingAttempts: 2,
      phase: 'active',
    });
  });

  test('processed answer ids stay bounded without persisting answer content', () => {
    let state = start();
    for (let index = 0; index < 300; index += 1) {
      state = reduceSessionAttempts(state, {
        type: 'verdict',
        answerAttemptId: `technical_${index.toString().padStart(3, '0')}`,
        verdict: 'technical_error',
      }).state;
    }

    expect(state.processedAnswerAttemptIds).toHaveLength(256);
    expect(state.processedAnswerAttemptIds[0]).toBe('technical_044');
    expect(JSON.stringify(state)).not.toContain('transcript');
    expect(JSON.stringify(state)).not.toContain('answerText');
  });

  test.each([
    { sessionId: '', questionId: 'q' },
    { sessionId: 's', questionId: '' },
    { sessionId: 'bad\ncontrol', questionId: 'q' },
  ])('rejects malformed initial ids: %o', (input) => {
    expect(() => createSessionAttemptsState(input)).toThrow('session_attempts_id_invalid');
  });
});
