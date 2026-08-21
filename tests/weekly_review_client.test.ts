import {
  generateWeeklyReview,
  getWeeklyReviewState,
  type WeeklyReviewClientDependencies,
  type WeeklyReviewCallableResult,
  type WeeklyReviewStoredV2,
} from '../app/weekly_review_client';
import { WEEKLY_REVIEW_SCHEMA_VERSION, type WeeklyReviewBriefingV2, type WeeklyReviewSnapshot, type WeeklyReviewV2 } from '../app/weekly_review_types';

const snapshot: WeeklyReviewSnapshot = {
  status: 'ready', signalCount: 8, progressCurrent: 8, progressRequired: 5,
  mistakeCount7d: 8, mistakeCount30d: 12, uniqueMistakePhrases: 6,
  activeDays7d: 4, activeDays30d: 12, currentStreak: 3, longestStreak: 5,
  weekXp: 120, weekMinutes: 40, lessons7d: 2, reviews7d: 3,
  dueWords: 4, duePhrases: 2, overdue: 1, totalDue: 6, totalTracked: 20,
  sourceCoverage: { ready: 3, failed: 0, total: 3, readySources: ['mistakes', 'activity', 'practice'], failedSources: [] },
};

const briefing: WeeklyReviewBriefingV2 = {
  schemaVersion: WEEKLY_REVIEW_SCHEMA_VERSION, lang: 'ru', studyTarget: 'en',
  mistakes: {
    last7: { mistakes: 8, uniquePhrases: 4, repeatedMistakes: 2, recoveredPhrases: 1, accuracyPct: null },
    last30: { mistakes: 12, uniquePhrases: 6, repeatedMistakes: 3, recoveredPhrases: 2, accuracyPct: null },
    delta: { accuracyPct: null, mistakes: -2 },
    weakCategories: [{ category: 'verb', label: 'Глаголы', pct: 40, priorityScore: 70, topWords: ['have'] }],
    strongCategories: [], recoveredCategories: [], weakLessons: [], topMistakePhrases: [],
  },
  practice: { dueWords: 4, duePhrases: 2, overdue: 1, totalTracked: 20, completed7d: 5, accuracy7d: null, accuracyDelta: null },
  effort: { activeDays7d: 4, activeDays30d: 12, currentStreak: 3, longestStreak: 5, weekXp: 120, weekMinutes: 40, lessons7d: 2, reviews7d: 3 },
  recommendations: [{ recommendationId: 'due:mistakes', actionKind: 'open_mistake_practice', label: 'Исправить ошибки', routePayload: { length: '5' } }],
  evidenceRegistry: { 'practice.dueWords': 4 },
  coverage: snapshot.sourceCoverage,
};

const review: WeeklyReviewV2 = {
  schemaVersion: WEEKLY_REVIEW_SCHEMA_VERSION,
  headline: 'Точный следующий шаг', summary: 'Повторение уже укрепляет материал.',
  patterns: [{ title: 'Глаголы', explanation: 'Сигнал повторяется.', evidenceRefs: ['practice.dueWords'] }],
  improvements: [], priorities: [{ title: 'Повторить', reason: 'Это актуально.', evidenceRefs: ['practice.dueWords'] }],
  plan: [{ order: 1, actionKind: 'open_mistake_practice', recommendationId: 'due:mistakes', evidenceRefs: ['practice.dueWords'], expectedOutcome: 'Исправить ошибки.' }],
  confidence: 'high', coverageNote: 'Все источники доступны.',
};

const callableResult: WeeklyReviewCallableResult = { ok: true, review, nextAllowedAtMs: 2000, model: 'test' };

function makeDeps(overrides: Partial<WeeklyReviewClientDependencies> = {}) {
  const values = new Map<string, string>();
  const storage = {
    getItem: jest.fn(async (key: string) => values.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => { values.set(key, value); }),
    removeItem: jest.fn(async (key: string) => { values.delete(key); }),
  };
  const deps: WeeklyReviewClientDependencies = {
    storage: storage as any,
    buildBriefing: jest.fn(async () => ({ status: 'ready' as const, briefing, snapshot, coverage: snapshot.sourceCoverage })),
    captureGeneration: () => ({ generation: 1, stableId: 'stable-a', phase: 'active' }),
    accountScope: () => 'generation:1:uid:stable-a',
    isCurrentGeneration: () => true,
    requestCallable: jest.fn(async () => callableResult),
    now: () => 1000,
    aiEnabled: () => true,
    ...overrides,
  };
  return { deps, storage, values };
}

function storedEnvelope(nextAllowedAtMs = 500): WeeklyReviewStoredV2 {
  return {
    schemaVersion: WEEKLY_REVIEW_SCHEMA_VERSION,
    accountScope: 'generation:1:uid:stable-a', entitlement: 'plus', lang: 'ru', studyTarget: 'en',
    review, generatedAtMs: 100, nextAllowedAtMs,
  };
}

describe('weekly review client tier and callable boundary', () => {
  it('never touches auth/callable/cache for Free', async () => {
    const { deps, storage } = makeDeps({ requestCallable: jest.fn(async () => callableResult) });
    const state = await generateWeeklyReview({ lang: 'ru', isPremium: false, aiV2Enabled: true }, deps);
    expect(state.status).toBe('free_eligible');
    expect(deps.requestCallable).not.toHaveBeenCalled();
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('calls the Plus callable by default instead of showing a local fallback', async () => {
    const { deps } = makeDeps();
    const state = await generateWeeklyReview({ lang: 'ru', isPremium: true }, deps);
    expect(state.status).toBe('fresh');
    expect(state.status === 'fresh' && state.review).toEqual(review);
    expect(deps.requestCallable).toHaveBeenCalledTimes(1);
  });

  it('does not fabricate a Plus review when the AI kill switch is off', async () => {
    const { deps } = makeDeps({ aiEnabled: () => false });
    const state = await generateWeeklyReview({ lang: 'ru', isPremium: true }, deps);
    const runtimeState = state as typeof state & { review?: WeeklyReviewV2; fallback?: WeeklyReviewV2 };
    expect(state.status).toBe('plus_ready_to_generate');
    expect(runtimeState.review).toBeUndefined();
    expect(runtimeState.fallback).toBeUndefined();
    expect(deps.requestCallable).not.toHaveBeenCalled();
  });

  it('calls the enabled Plus callable once and shares identical in-flight requests', async () => {
    let release!: (value: WeeklyReviewCallableResult) => void;
    const requestCallable = jest.fn(() => new Promise<WeeklyReviewCallableResult>((resolve) => { release = resolve; }));
    const { deps } = makeDeps({ requestCallable });
    const a = generateWeeklyReview({ lang: 'ru', isPremium: true, aiV2Enabled: true }, deps);
    const b = generateWeeklyReview({ lang: 'ru', isPremium: true, aiV2Enabled: true }, deps);
    await Promise.resolve(); await Promise.resolve();
    release(callableResult);
    const [first, second] = await Promise.all([a, b]);
    expect(requestCallable).toHaveBeenCalledTimes(1);
    expect(first.status).toBe('fresh');
    expect(second.status).toBe('fresh');
  });
});

describe('weekly review client account-scoped cache', () => {
  it('does not hydrate while identity is inactive', async () => {
    const { deps, storage } = makeDeps({
      captureGeneration: () => ({ generation: 1, stableId: null, phase: 'transitioning' }),
      accountScope: () => null,
    });
    const state = await generateWeeklyReview({ lang: 'ru', isPremium: true }, deps);
    expect(state.status).toBe('hydrating');
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('discards an async read when generation changes', async () => {
    let current = true;
    const { deps, storage } = makeDeps({ isCurrentGeneration: () => current });
    storage.getItem.mockImplementationOnce(async () => { current = false; return JSON.stringify(storedEnvelope()); });
    const state = await generateWeeklyReview({ lang: 'ru', isPremium: true }, deps);
    expect(state.status).toBe('hydrating');
  });

  it('hides Plus cache after downgrade', async () => {
    const { deps, storage } = makeDeps();
    storage.getItem.mockResolvedValue(JSON.stringify(storedEnvelope(5000)));
    const state = await generateWeeklyReview({ lang: 'ru', isPremium: false }, deps);
    expect(state.status).toBe('free_eligible');
    expect(storage.getItem).not.toHaveBeenCalled();
  });

  it('keeps the cached review on offline/provider errors and cooldown', async () => {
    const { deps, storage } = makeDeps({ requestCallable: jest.fn(async () => { throw new Error('network unavailable'); }) });
    storage.getItem.mockResolvedValue(JSON.stringify(storedEnvelope(500)));
    const state = await generateWeeklyReview({ lang: 'ru', isPremium: true, aiV2Enabled: true }, deps);
    expect(state.status).toBe('offline');
    expect(state.status === 'offline' && state.review).toEqual(review);

    storage.getItem.mockResolvedValue(JSON.stringify(storedEnvelope(5000)));
    const cooldown = await generateWeeklyReview({ lang: 'ru', isPremium: true, aiV2Enabled: true }, deps);
    expect(cooldown.status).toBe('cooldown');
  });

  it('does not show a generated-looking fallback on provider errors without cache', async () => {
    const { deps } = makeDeps({ requestCallable: jest.fn(async () => { throw new Error('provider failed'); }) });
    const state = await generateWeeklyReview({ lang: 'ru', isPremium: true }, deps);
    expect(state.status).toBe('error');
    expect(state.status === 'error' && state.review).toBeUndefined();
  });

  it('keeps cached content when the server reports not-ready', async () => {
    const { deps, storage } = makeDeps({ requestCallable: jest.fn(async () => { throw new Error('weekly_review_not_ready'); }) });
    storage.getItem.mockResolvedValue(JSON.stringify(storedEnvelope(500)));
    const state = await generateWeeklyReview({ lang: 'ru', isPremium: true, aiV2Enabled: true }, deps);
    expect(state.status).toBe('cooldown');
    expect(state.status === 'cooldown' && state.review).toEqual(review);
  });

  it('marks an expired cached review ready so the card auto-generates the next daily review', async () => {
    const { deps, storage } = makeDeps({ aiEnabled: () => true });
    storage.getItem.mockResolvedValue(JSON.stringify(storedEnvelope(500)));

    const state = await getWeeklyReviewState({ lang: 'ru', isPremium: true }, deps);

    const runtimeState = state as typeof state & { review?: WeeklyReviewV2; fallback?: WeeklyReviewV2 };
    expect(state.status).toBe('plus_ready_to_generate');
    expect(runtimeState.review).toEqual(review);
    expect(runtimeState.fallback).toBeUndefined();
    expect(deps.requestCallable).not.toHaveBeenCalled();
  });

  it('separates lang/schema/account keys and deletes legacy only after V2 save', async () => {
    const { deps, storage } = makeDeps({ aiEnabled: () => true });
    await generateWeeklyReview({ lang: 'ru', isPremium: true }, deps);
    const firstKey = storage.setItem.mock.calls[0][0];
    expect(firstKey).toContain('weekly_review_v2');
    expect(firstKey).toContain('ru');
    expect(storage.removeItem).toHaveBeenCalledTimes(1);

    storage.setItem.mockRejectedValueOnce(new Error('disk full'));
    storage.removeItem.mockClear();
    await generateWeeklyReview({ lang: 'es', isPremium: true }, deps);
    expect(storage.removeItem).not.toHaveBeenCalled();
  });
});
