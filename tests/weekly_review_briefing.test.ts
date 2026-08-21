import {
  buildWeeklyReviewBriefing,
  type BuildBriefingDependencies,
} from '../app/weekly_review_briefing';
import type { PhraseAnalyticsResult } from '../app/phrase_analytics';
import type { MistakePracticeInsights } from '../app/mistake_practice_insights';

const NOW = Date.parse('2026-07-13T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const INSIGHTS: MistakePracticeInsights = {
  active: 12,
  corrected: 2,
  correctedPhrases: 1,
  hidden: 0,
  overdue: 4,
  totalTracked: 31,
  dueWords: 5,
  duePhrases: 7,
  mistakeCount7d: 5,
  mistakeCountPrevious7d: 2,
  mistakeCount30d: 8,
  uniqueMistakes7d: 4,
  uniqueMistakes30d: 6,
  frequentFacets: [{ facet: 'form', count: 8 }],
  topMistakes: Array.from({ length: 6 }, (_, index) => ({
    mistakeId: `mistake-${index}`,
    phrase: index === 0 ? 'I have a dog' : `Phrase ${index}`,
    count: index === 0 ? 3 : 1,
    facet: 'form' as const,
    lessonId: '1',
  })),
};

const ANALYTICS: PhraseAnalyticsResult = {
  categoryStats: [{
    category: 'verb',
    mistakeCount: 8,
    weaknessScore: 74,
    priorityScore: 78,
    recoveryScore: 12,
    exactMistakeCount: 8,
    recentMistakeCount: 5,
    masteryLevel: 1,
    masteryXp: 10,
    masteryStreak: 0,
    practiceCorrect: 2,
    practiceWrong: 3,
    pct: 80,
    topWords: ['have', 'has'],
  }],
  lessonStats: [{
    lessonId: 1,
    lessonNameRU: 'Первый урок',
    lessonNameUK: 'Перший урок',
    lessonNameES: 'Primera lección',
    mistakeCount: 8,
    pct: 80,
  }],
  topMistakePhrases: [{ phrase: 'I have a dog', lessonId: 1, count: 5 }],
  insights: [],
  totalMistakes: 10,
  windowDays: 30,
};

function dependencies(overrides: Partial<BuildBriefingDependencies> = {}): BuildBriefingDependencies {
  const days = Array.from({ length: 30 }, (_, index) => ({
    date: new Date(NOW - (29 - index) * DAY_MS).toISOString().slice(0, 10),
    level: 1 as const,
    xp: index >= 23 ? 40 : 0,
    minutes: index >= 23 ? 8 : 0,
    active: index >= 23,
    future: false,
    metrics: {
      lessons: index >= 23 ? 1 : 0,
      quizzes: index >= 25 ? 1 : 0,
      review: index >= 26 ? 1 : 0,
      arena: 0,
      wordsLearned: 0,
      phrasesLearned: 0,
      flashcardsSaved: 0,
      dailyTasksClaimed: 0,
    },
  }));
  return {
    nowMs: () => NOW,
    loadMistakeEntries: async () => [
      mistake('I have a dog', 1),
      mistake('I have a dog', 2),
      mistake('She has a cat', 3),
      mistake('We have time', 5),
      mistake('They have lunch', 6),
      mistake('Old repeated phrase', 9),
      mistake('Old repeated phrase', 10),
      mistake('Thirty day signal', 20),
    ],
    computeAnalytics: async () => ANALYTICS,
    loadActivity: async () => ({
      days,
      activeDays: 7,
      currentStreak: 4,
      longestStreak: 9,
      biggestGap: 2,
      last30ActiveDays: 7,
      consistencyScore: 40,
      bestMonth: null,
      weakestMonth: null,
      currentMonth: null,
      insights: [],
      goal: { goal: 180, chosen: false, activeDays: 7, remainingDays: 173, forecastDate: null, requiredDaysPerWeek: 4, onTrack: false },
    }),
    loadResolvedTrainings: async () => ({}) as never,
    ...overrides,
  };
}

describe('weekly review briefing V2', () => {
  it('returns explicit insufficient state when the mistake signal is below threshold', async () => {
    const result = await buildWeeklyReviewBriefing({
      lang: 'ru',
      studyTarget: 'en',
      isPremium: false,
      deps: dependencies({ loadMistakeEntries: async () => [mistake('One', 1), mistake('Two', 2)] }),
    });

    expect(result.status).toBe('insufficient');
    expect(result.snapshot).toMatchObject({ mistakeCount30d: 2, progressCurrent: 2, progressRequired: 5 });
  });

  it('builds 7/30-day dynamics, practice queue, effort and evidence registry', async () => {
    const result = await buildWeeklyReviewBriefing({
      lang: 'ru',
      studyTarget: 'en',
      isPremium: true,
      deps: dependencies(),
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') throw new Error('expected ready briefing');
    expect(result.briefing).toMatchObject({
      schemaVersion: 'weekly-review-v2',
      mistakes: {
        last7: { mistakes: 5, uniquePhrases: 4 },
        last30: { mistakes: 8, uniquePhrases: 6 },
        delta: { mistakes: 3 },
      },
      practice: { dueWords: 5, duePhrases: 7, overdue: 4, totalTracked: 31 },
      effort: { currentStreak: 4, longestStreak: 9 },
    });
    expect(result.briefing.mistakes.topMistakePhrases).toHaveLength(6);
    expect(Object.keys(result.briefing.evidenceRegistry)).toEqual(expect.arrayContaining([
      'mistakes.last7.mistakes',
      'mistakes.last30.mistakes',
      'practice.duePhrases',
      'effort.activeDays7d',
    ]));
  });

  it('does not change aggregate content based on the client premium claim', async () => {
    const deps = dependencies();
    const free = await buildWeeklyReviewBriefing({ lang: 'ru', studyTarget: 'en', isPremium: false, deps });
    const plus = await buildWeeklyReviewBriefing({ lang: 'ru', studyTarget: 'en', isPremium: true, deps });

    expect(free.status).toBe('ready');
    expect(plus.status).toBe('ready');
    if (free.status === 'ready' && plus.status === 'ready') {
      expect(free.briefing).toEqual(plus.briefing);
    }
  });

  it('reports a source error instead of masking it as insufficient data', async () => {
    const result = await buildWeeklyReviewBriefing({
      lang: 'ru',
      studyTarget: 'en',
      isPremium: true,
      deps: dependencies({ loadMistakeInsights: async () => { throw new Error('disk unavailable'); } }),
    });

    expect(result).toMatchObject({
      status: 'error',
      errorCode: 'weekly_review_source_failed',
      coverage: { failedSources: ['mistakes', 'practice'] },
    });
  });
});
