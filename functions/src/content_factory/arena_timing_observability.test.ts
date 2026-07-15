import {
  applyArenaTimingEvent,
  ARENA_AUTHORITATIVE_QUESTION_TIMEOUT_MS,
  ARENA_TIMING_MIN_SAMPLE,
  arenaTimingDocumentId,
  arenaTimingRollupDocumentId,
  summarizeArenaTiming,
} from './arena_timing_observability';

describe('Arena timing observability', () => {
  it('stores privacy-safe aggregates without player or session identity', () => {
    const nowMs = Date.UTC(2026, 6, 13);
    const value = applyArenaTimingEvent(null, {
      questionId: 'question-1',
      difficulty: 'hard',
      deviceClass: 'phone',
      timeMs: 4_300,
      isCorrect: false,
      timedOut: false,
      nowMs,
    });

    expect(value).toMatchObject({
      day: '2026-07-13',
      difficulty: 'hard',
      deviceClass: 'phone',
      sampleCount: 1,
      wrongCount: 1,
      timeoutCount: 0,
      histogram: { '5000': 1 },
    });
    expect(value.itemHash).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(value)).not.toContain('question-1');
    expect(arenaTimingDocumentId({ questionId: 'question-1', difficulty: 'hard', deviceClass: 'phone', nowMs }))
      .not.toContain('question-1');
    expect(arenaTimingRollupDocumentId({ questionId: 'question-1', difficulty: 'hard', deviceClass: 'phone', nowMs }))
      .toMatch(/^2026-07-13_hard_phone_s[01]$/);
  });

  it('requires complete server-observed samples and preserves the authoritative timeout', () => {
    let value = null;
    for (let index = 0; index < ARENA_TIMING_MIN_SAMPLE; index += 1) {
      value = applyArenaTimingEvent(value, {
        questionId: 'question-2',
        difficulty: 'medium',
        deviceClass: 'web',
        timeMs: 3_000,
        isCorrect: true,
        timedOut: false,
        nowMs: Date.UTC(2026, 6, 13),
      });
    }
    if (!value) throw new Error('arena timing fixture was not built');

    expect(summarizeArenaTiming([value])).toMatchObject({
      recommendationEligible: true,
      authoritativeQuestionTimeoutMs: ARENA_AUTHORITATIVE_QUESTION_TIMEOUT_MS,
      automaticRuntimeChangeAllowed: false,
    });
    expect(summarizeArenaTiming([value], true).recommendationEligible).toBe(false);
  });
});
