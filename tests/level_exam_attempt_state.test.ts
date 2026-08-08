import {
  applyLevelExamAnswer,
  beginLevelExamQuiz,
  completeLevelExamAttempt,
  createLevelExamAttempt,
  markLevelExamFinishing,
  remainingLevelExamMs,
  restoreLevelExamAttempt,
  type CreateLevelExamAttemptInput,
} from '../app/level_exam_attempt_state';

const BASE_INPUT: CreateLevelExamAttemptInput = {
  energySpent: true,
  ownerStableUid: 'stable-user-1',
  startToken: 'start-token-1',
  level: 'A2',
  studyTarget: 'en',
  sourceLocale: 'ru',
  blueprintVersion: 2,
  seed: 'seed-a2',
  orderedTaskIds: ['task-1', 'task-2'],
  scoredUnitIds: ['score-1', 'score-2'],
  startedAtMs: 1_000,
  durationMs: 13 * 60_000,
};

describe('level exam attempt state', () => {
  test('does not create an attempt before the energy transaction succeeds', () => {
    expect(() => createLevelExamAttempt({ ...BASE_INPUT, energySpent: false }))
      .toThrow('level_exam_energy_not_spent');
  });

  test('creates one deterministic active snapshot with a wall-clock deadline', () => {
    const first = createLevelExamAttempt(BASE_INPUT);
    const repeated = createLevelExamAttempt(BASE_INPUT);

    expect(repeated).toEqual(first);
    expect(first).toMatchObject({
      schemaVersion: 2,
      status: 'active',
      startedAtMs: 1_000,
      deadlineAtMs: 781_000,
      answers: {},
      currentTaskIndex: 0,
    });
    expect(first.attemptId).toContain('start-token-1');
    expect(first.finishToken).toBe(`${first.attemptId}:finish`);
  });

  test('starts the full exam timer only after the intro countdown completes', () => {
    const prepared = createLevelExamAttempt(BASE_INPUT);
    const started = beginLevelExamQuiz(prepared, 2_800);

    expect(started.startedAtMs).toBe(2_800);
    expect(started.deadlineAtMs).toBe(782_800);
    expect(remainingLevelExamMs(started, 2_800)).toBe(780_000);
  });

  test('persists answers by scored unit and rejects unknown units', () => {
    const attempt = createLevelExamAttempt(BASE_INPUT);
    const answered = applyLevelExamAnswer(attempt, 'score-1', {
      kind: 'choice',
      optionId: 'option-a',
    }, 1);

    expect(answered.answers).toEqual({
      'score-1': { kind: 'choice', optionId: 'option-a' },
    });
    expect(answered.currentTaskIndex).toBe(1);
    expect(attempt.answers).toEqual({});
    expect(() => applyLevelExamAnswer(attempt, 'unknown', { kind: 'skipped' }, 0))
      .toThrow('level_exam_score_unit_unknown');
  });

  test('derives remaining time from the deadline and clamps at zero', () => {
    const attempt = createLevelExamAttempt(BASE_INPUT);
    expect(remainingLevelExamMs(attempt, 1_000)).toBe(780_000);
    expect(remainingLevelExamMs(attempt, 780_999)).toBe(1);
    expect(remainingLevelExamMs(attempt, 900_000)).toBe(0);
  });

  test('restores a valid active attempt and routes an expired one to timeout finish', () => {
    const attempt = createLevelExamAttempt(BASE_INPUT);
    const context = {
      ownerStableUid: BASE_INPUT.ownerStableUid,
      level: BASE_INPUT.level,
      studyTarget: BASE_INPUT.studyTarget,
      sourceLocale: BASE_INPUT.sourceLocale,
      blueprintVersion: 2 as const,
    };

    expect(restoreLevelExamAttempt(attempt, { ...context, nowMs: 100_000 }))
      .toEqual({ kind: 'resume', attempt });
    expect(restoreLevelExamAttempt(attempt, { ...context, nowMs: 900_000 }))
      .toEqual({ kind: 'finish_timeout', attempt });
  });

  test('quarantines corrupt or cross-account snapshots', () => {
    const attempt = createLevelExamAttempt(BASE_INPUT);
    const context = {
      ownerStableUid: BASE_INPUT.ownerStableUid,
      level: BASE_INPUT.level,
      studyTarget: BASE_INPUT.studyTarget,
      sourceLocale: BASE_INPUT.sourceLocale,
      blueprintVersion: 2 as const,
      nowMs: 100_000,
    };

    expect(restoreLevelExamAttempt({ ...attempt, ownerStableUid: 'other-user' }, context))
      .toEqual({ kind: 'quarantine', reason: 'owner_mismatch' });
    expect(restoreLevelExamAttempt({ ...attempt, deadlineAtMs: Number.NaN }, context))
      .toEqual({ kind: 'quarantine', reason: 'invalid_snapshot' });
    expect(restoreLevelExamAttempt({ ...attempt, blueprintVersion: 1 } as never, context))
      .toEqual({ kind: 'quarantine', reason: 'blueprint_mismatch' });
  });

  test('manual submit and timeout share one idempotent finish token', () => {
    const attempt = createLevelExamAttempt(BASE_INPUT);
    const manual = markLevelExamFinishing(attempt, 'submitted');
    const racedTimeout = markLevelExamFinishing(manual, 'timeout');
    const completed = completeLevelExamAttempt(racedTimeout, 700_000);
    const repeated = completeLevelExamAttempt(completed, 900_000);

    expect(racedTimeout.finishReason).toBe('submitted');
    expect(racedTimeout.finishToken).toBe(attempt.finishToken);
    expect(completed).toEqual(repeated);
    expect(completed).toMatchObject({ status: 'completed', finishedAtMs: 700_000 });
  });
});
