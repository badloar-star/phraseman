import { __weeklyReviewTestHooks, type WeeklyReviewBriefing } from './weekly_review';

const {
  sanitizeBriefing,
  parseAndGuardResult,
  buildSystemPrompt,
  briefingHashForReplay,
  decideWeeklyReviewReplay,
  readStoredWeeklyReview,
  runWeeklyReviewPreflight,
  asOpenAIChatResponse,
} = __weeklyReviewTestHooks;

function baseBriefing(): WeeklyReviewBriefing {
  return {
    schemaVersion: 'weekly-review-v2',
    lang: 'ru',
    studyTarget: 'en',
    mistakes: {
      last7: { mistakes: 8, uniquePhrases: 4, repeatedMistakes: 2, recoveredPhrases: 1, accuracyPct: null },
      last30: { mistakes: 12, uniquePhrases: 6, repeatedMistakes: 3, recoveredPhrases: 2, accuracyPct: null },
      delta: { accuracyPct: null, mistakes: -2 },
      weakCategories: [{ category: 'verb', label: 'Глаголы', pct: 40, priorityScore: 70, topWords: ['have', 'has'] }],
      strongCategories: [{ category: 'noun', label: 'Существительные', recoveryScore: 80 }],
      recoveredCategories: [{ category: 'article', label: 'Артикли', recoveryScore: 60 }],
      weakLessons: [{ lessonId: 1, title: 'Lesson 1', pct: 30, mistakeCount: 5 }],
      topMistakePhrases: [{ phrase: 'I have a dog', count: 5, trend: 'down' }],
    },
    practice: { dueWords: 4, duePhrases: 2, overdue: 1, totalTracked: 20, completed7d: 5, accuracy7d: null, accuracyDelta: null },
    effort: { activeDays7d: 4, activeDays30d: 12, currentStreak: 3, longestStreak: 5, weekXp: 120, weekMinutes: 40, lessons7d: 2, quizzes7d: 1, reviews7d: 3, arena7d: 0 },
    recommendations: [{ recommendationId: 'due:words', actionKind: 'repeat_due_words', label: 'Повторить слова' }],
    evidenceRegistry: { 'mistakes.last7': 8, 'mistakes.recovered': 2, 'practice.dueWords': 4 },
    coverage: { ready: 3, failed: 0, total: 3, readySources: ['mistakes', 'activity', 'trainer'], failedSources: [] },
  };
}

function validReview() {
  return {
    schemaVersion: 'weekly-review-v2',
    headline: 'Практика становится увереннее',
    summary: 'Повторение уже помогает закреплять сложные места.',
    patterns: [{ title: 'Глаголы требуют внимания', explanation: 'Этот сигнал повторяется чаще.', evidenceRefs: ['mistakes.last7'] }],
    improvements: [{ title: 'Часть трудностей уже ушла', evidenceRefs: ['mistakes.recovered'] }],
    priorities: [{ title: 'Повтори очередь слов', reason: 'Это закрепит текущий материал.', evidenceRefs: ['practice.dueWords'] }],
    plan: [{ order: 5, actionKind: 'repeat_due_words', recommendationId: 'due:words', evidenceRefs: ['practice.dueWords'], expectedOutcome: 'Увереннее вспомнить нужные слова.' }],
    confidence: 'high',
    coverageNote: 'Использованы все доступные источники.',
  };
}

describe('weekly_review paid response normalization', () => {
  it('normalizes JSON null and other primitives before billing and output validation', () => {
    expect(asOpenAIChatResponse(null)).toEqual({});
    expect(asOpenAIChatResponse('unexpected')).toEqual({});
    expect(asOpenAIChatResponse([])).toEqual({});
    expect(asOpenAIChatResponse({ usage: { total_tokens: 17 } })).toEqual({ usage: { total_tokens: 17 } });
  });
});

describe('weekly_review parseAndGuardResult', () => {
  it('accepts a complete evidence-backed V2 result', () => {
    const result = parseAndGuardResult(JSON.stringify(validReview()), baseBriefing());
    expect(result.schemaVersion).toBe('weekly-review-v2');
    expect(result.plan[0]).toMatchObject({ order: 1, recommendationId: 'due:words' });
  });

  it('throws on non-JSON model output', () => {
    expect(() => parseAndGuardResult('not json at all', baseBriefing())).toThrow();
  });

  it('throws when required fields are empty', () => {
    const empty = JSON.stringify({ ...validReview(), headline: '' });
    expect(() => parseAndGuardResult(empty, baseBriefing())).toThrow();
  });

  it('throws when the model returns a different language than the briefing requested', () => {
    const english = JSON.stringify({ ...validReview(), headline: 'Good start!', summary: 'Your practice is getting stronger today.' });
    expect(() => parseAndGuardResult(english, baseBriefing())).toThrow('weekly_review_wrong_language');
  });
});

describe('weekly_review sanitizeBriefing', () => {
  it('bounds hostile oversized input', () => {
    const hostile = {
      lang: 'xx', // invalid → falls back to ru
      studyTarget: 'zz', // invalid → en
      mistakes: {
        last30: { mistakes: -50 },
        weakCategories: Array.from({ length: 50 }, () => ({ category: 'verb', label: 'x'.repeat(500), pct: 9999, priorityScore: -10, topWords: Array.from({ length: 50 }, () => 'word') })),
      },
      recommendations: Array.from({ length: 50 }, (_, i) => ({ recommendationId: `id_${i}`, actionKind: 'repeat_due_words', label: 'L' })),
      effort: { currentStreak: -5, longestStreak: 1e9, weekXp: -1, weekMinutes: 1e12 },
    };
    const clean = sanitizeBriefing(hostile);
    expect(clean.lang).toBe('ru');
    expect(clean.studyTarget).toBe('en');
    expect(clean.mistakes.last30.mistakes).toBe(0);
    expect(clean.mistakes.weakCategories.length).toBeLessThanOrEqual(5);
    expect(clean.mistakes.weakCategories[0].label.length).toBeLessThanOrEqual(80);
    expect(clean.mistakes.weakCategories[0].pct).toBeLessThanOrEqual(100);
    expect(clean.mistakes.weakCategories[0].topWords.length).toBeLessThanOrEqual(5);
    expect(clean.recommendations.length).toBeLessThanOrEqual(8);
    expect(clean.effort.currentStreak).toBeGreaterThanOrEqual(0);
  });

  it('handles completely empty input without throwing', () => {
    const clean = sanitizeBriefing({});
    expect(clean.mistakes.weakCategories).toEqual([]);
    expect(clean.recommendations).toEqual([]);
    expect(clean.mistakes.last30.mistakes).toBe(0);
  });
});

describe('weekly_review buildSystemPrompt', () => {
  it('embeds the target language name and the strict rules', () => {
    const prompt = buildSystemPrompt('ru');
    expect(prompt).toContain('Russian');
    expect(prompt).toContain('Use only facts');
    expect(prompt).toContain('STRICT JSON');
  });
});

describe('weekly_review quota replay helpers', () => {
  it('returns the stored review for the same briefing while the window is closed', () => {
    const briefing = baseBriefing();
    const hash = briefingHashForReplay(briefing);
    const decision = decideWeeklyReviewReplay({
      nextAllowedAtMs: 2000,
      lastBriefingHash: hash,
      lastModel: 'test-model',
      lastReview: validReview(),
    }, hash, 1000);

    expect(decision.kind).toBe('replay');
    if (decision.kind !== 'replay') throw new Error('expected replay');
    expect(decision.review.headline).toBe('Практика становится увереннее');
    expect(decision.review.plan[0].recommendationId).toBe('due:words');
    expect(decision.nextAllowedAtMs).toBe(2000);
    expect(decision.model).toBe('test-model');
  });

  it('opens generation instead of replaying same-hash stored review in the wrong language', () => {
    const briefing = baseBriefing();
    const hash = briefingHashForReplay(briefing);
    const decision = decideWeeklyReviewReplay({
      nextAllowedAtMs: 2000,
      lastBriefingHash: hash,
      lastReview: { ...validReview(), headline: 'Good start today.', summary: 'Your practice is stronger today.', coverageNote: 'All sources are ready.' },
    }, hash, 1000, 'ru');

    expect(decision).toEqual({ kind: 'open' });
  });

  it('keeps a different briefing gated until the window opens', () => {
    const briefing = baseBriefing();
    const hash = briefingHashForReplay(briefing);
    const decision = decideWeeklyReviewReplay({
      nextAllowedAtMs: 2000,
      lastBriefingHash: 'different-hash',
      lastReview: validReview(),
    }, hash, 1000);

    expect(decision).toEqual({ kind: 'not_ready', nextAllowedAtMs: 2000 });
  });

  it('opens generation after the stored window expires', () => {
    const briefing = baseBriefing();
    const hash = briefingHashForReplay(briefing);
    const decision = decideWeeklyReviewReplay({
      nextAllowedAtMs: 1000,
      lastBriefingHash: hash,
      lastReview: validReview(),
    }, hash, 2000);

    expect(decision).toEqual({ kind: 'open' });
  });

  it('does not replay malformed stored review payloads', () => {
    const review = readStoredWeeklyReview({ schemaVersion: 'weekly-review-v2', headline: '', summary: '' });
    expect(review).toBeNull();
  });
});

describe('weekly_review Plus-only preflight ordering', () => {
  it('accepts five real mistakes even when conservative category classification finds no weak category', async () => {
    const briefing = baseBriefing();
    briefing.mistakes.last30.mistakes = 5;
    briefing.mistakes.weakCategories = [];
    const result = await runWeeklyReviewPreflight({ authUid: 'auth-eligible', rawBriefing: briefing, db: {} as any }, {
      requireAuth: (uid: string | undefined) => uid!,
      sanitize: (raw: unknown) => raw as WeeklyReviewBriefing,
      resolveStableUid: async () => 'stable-eligible',
      resolvePremium: async () => true,
      rejectFree: () => { throw new Error('unexpected_free'); },
    });
    expect(result.stableUid).toBe('stable-eligible');
    expect(result.briefing.mistakes.weakCategories).toEqual([]);
  });

  it('rejects Free before config, replay, rate, lease, budget, provider, or billing', async () => {
    const trace: string[] = [];
    await expect(runWeeklyReviewPreflight({ authUid: 'auth-free', rawBriefing: baseBriefing(), db: {} as any }, {
      requireAuth: (uid: string | undefined) => { trace.push('auth'); return uid!; },
      sanitize: (raw: unknown) => { trace.push('sanitize'); return raw as WeeklyReviewBriefing; },
      resolveStableUid: async () => { trace.push('resolveStableUid'); return 'stable-free'; },
      resolvePremium: async () => { trace.push('resolvePremium'); return false; },
      rejectFree: () => { trace.push('rejectFree'); throw new Error('weekly_review_plus_required'); },
    })).rejects.toThrow('weekly_review_plus_required');
    expect(trace).toEqual(['auth', 'sanitize', 'resolveStableUid', 'resolvePremium', 'rejectFree']);
  });

  it('ignores a forged isPremium field from the request body', async () => {
    await expect(runWeeklyReviewPreflight({
      authUid: 'auth-free',
      rawBriefing: { ...baseBriefing(), isPremium: true },
      db: {} as any,
    }, {
      requireAuth: (uid: string | undefined) => uid!,
      sanitize: () => baseBriefing(),
      resolveStableUid: async () => 'stable-free',
      resolvePremium: async () => false,
      rejectFree: () => { throw new Error('weekly_review_plus_required'); },
    })).rejects.toThrow('weekly_review_plus_required');
  });
});
