import { loadCompassRecommendation, type LoadCompassRecommendationDependencies } from '../app/compass_recommendation_loader';
import type { HomeScreenHydration } from '../app/home_screen_hydration';
import type { TrainerDashboard } from '../app/trainer_store';

function dashboard(due = { words: 0, phrases: 0 }): TrainerDashboard {
  return {
    due, totalDue: due.words + due.phrases, overdue: 0, totalTracked: 0, active: 0, future: 0,
    archived: 0, archivedPhrases: 0, hardestQueue: null, hardestMistakes: 0, hardestCategory: null,
    hardestCategoryMistakes: 0, hardestCategoryPriority: 0, hardestCategoryRecovery: 0,
    memoryScore: 100, posMasteryXp: 0, posMasteryTop: [], nextQueue: null,
  };
}

function home(overrides: Partial<HomeScreenHydration> = {}): HomeScreenHydration {
  return {
    userName: 'Learner', totalXP: 10, streak: 1, displayStreak: 1,
    weekDone: [true, false, false, false, false, false, false], weekPoints: 10,
    shardsBalance: 0, lessonsCompleted: 0, freezeActive: false, premiumFreezeUsed: false,
    totalXPMulti: 10, userAvatar: '1', userFrame: '1', lastLessonId: null,
    lastLessonProgress: 0, lastLessonScore: '0.0', ...overrides,
  };
}

function deps(overrides: Partial<LoadCompassRecommendationDependencies> = {}): LoadCompassRecommendationDependencies {
  return {
    loadTrainer: async () => dashboard(),
    loadWeeklyReview: async () => ({ status: 'insufficient', snapshot: {} as never, coverage: {} as never }),
    peekHome: () => home(),
    loadExplanation: async () => ({ status: 'ready', whyNow: 'Короткий раунд поможет удержать фразы.', source: 'provider' }),
    ...overrides,
  };
}

describe('Compass recommendation loader', () => {
  it('returns a ready recommendation only after its explanation is ready', async () => {
    const result = await loadCompassRecommendation({
      lang: 'ru', studyTarget: 'en', deps: deps({ loadTrainer: async () => dashboard({ words: 2, phrases: 6 }) }),
    });
    expect(result).toMatchObject({
      status: 'ready', whyNow: 'Короткий раунд поможет удержать фразы.',
      recommendation: { recommendationId: 'trainer:phrases', action: { kind: 'trainer_phrases' } },
    });
  });

  it('stays internal when no learning action is available', async () => {
    const result = await loadCompassRecommendation({
      lang: 'ru',
      deps: deps({
        loadTrainer: async () => { throw new Error('unavailable'); },
        loadWeeklyReview: async () => { throw new Error('unavailable'); },
        peekHome: () => null,
      }),
    });
    expect(result).toEqual({
      status: 'insufficient', reason: 'sources_not_ready',
      missingSources: ['trainer', 'lesson_progress', 'weekly_review'],
    });
  });

  it('hides the recommendation when its personalized explanation is unavailable', async () => {
    const result = await loadCompassRecommendation({
      lang: 'ru',
      deps: deps({
        loadTrainer: async () => dashboard({ words: 0, phrases: 8 }),
        loadExplanation: async () => ({ status: 'unavailable', reason: 'network' }),
      }),
    });
    expect(result.status).toBe('insufficient');
  });

  it('can use a started session when optional sources fail', async () => {
    const result = await loadCompassRecommendation({
      lang: 'ru',
      deps: deps({
        loadTrainer: async () => { throw new Error('unavailable'); },
        loadWeeklyReview: async () => { throw new Error('unavailable'); },
        peekHome: () => home({ lastLessonId: 4, lastLessonProgress: 18 }),
      }),
    });
    expect(result).toMatchObject({
      status: 'ready', recommendation: { recommendationId: 'lesson:4' },
      missingSources: ['trainer', 'weekly_review'],
    });
  });

  it('ignores Personal Plan snapshots completely', async () => {
    const result = await loadCompassRecommendation({
      lang: 'ru',
      deps: deps({ peekHome: () => home({ personalPlanSnapshot: {
        planId: 'echo', planName: 'Echo', dayIndex: 2, weekIndex: 1, todayTitle: 'Day 2',
        minutesPerDay: 10, progressPct: 6, dayProgressPct: 0, completedTodayCount: 0,
        requiredTodayCount: 2, todayDone: false, isCarryover: false,
      } }) }),
    });
    expect(result).toEqual({ status: 'insufficient', reason: 'no_actionable_signal', missingSources: [] });
  });
});
