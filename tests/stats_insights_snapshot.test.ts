import { buildStatsInsightsSnapshot } from '../app/stats_insights_snapshot';

const sample = {
  status: 'available' as const,
  userTotalXp: 12_000,
  minimumSampleXp: 5_000,
  totalUsers: 900,
  updatedAtMs: 123,
  isStale: false,
};

describe('buildStatsInsightsSnapshot', () => {
  it('joins exact weekly, comparison, long-term and lifetime facts without inventing a previous period', () => {
    const snapshot = buildStatsInsightsSnapshot({
      lang: 'ru',
      studyTarget: 'es',
      week: {
        activeDays7: 4,
        minutes7: 70,
        xp7: 560,
        bestDayLabel: 'Ср',
        dailyMinutes7: [5, 0, 10, 15, 0, 20, 20],
        currentPeriodDates: ['2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13'],
      },
      timeDays: [
        { date: '2026-07-01', ms: 10 * 60_000 },
        { date: '2026-07-02', ms: 20 * 60_000 },
      ],
      activity: {
        days: Array.from({ length: 45 }, (_, index) => ({ date: `d${index}`, active: index % 2 === 0, future: false })),
        activeDays: 23,
        currentStreak: 3,
        longestStreak: 11,
        last30ActiveDays: 15,
        bestMonth: { year: 2026, month: 5 },
        goal: { chosen: true, activeDays: 23, goal: 100 },
      },
      percentiles: { sample, xp: 72, daily7xp: 44, daily7timeMs: 51 },
      lifetime: { wordsLearned: 100, phrasesLearned: 30, quizzesTotal: 8, arenaWins: 2, appDaysUnion: 23 },
    });

    expect(snapshot.week.dailyMinutes7).toEqual([5, 0, 10, 15, 0, 20, 20]);
    expect(snapshot.studyTarget).toBe('en');
    expect(snapshot.week.previousMinutes7).toBeNull();
    expect(snapshot.longTerm.previous30ActiveDays).toBeNull();
    expect(snapshot.longTerm.bestMonthLabel).toMatch(/2026/);
    expect(snapshot.longTerm.goalPct).toBe(23);
    expect(snapshot.comparison).toMatchObject({
      sample,
      totalXpPercentile: 72,
      daily7XpPercentile: 44,
      daily7TimePercentile: 51,
    });
    expect(snapshot.weakCategories).toEqual([]);
  });

  it('uses the exact preceding seven dates and days 31-60 for comparisons', () => {
    const currentDates = ['2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10', '2026-07-11', '2026-07-12', '2026-07-13'];
    const priorDates = ['2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06'];
    const activityDays = Array.from({ length: 60 }, (_, index) => ({
      date: new Date(Date.UTC(2026, 4, 1 + index)).toISOString().slice(0, 10),
      active: index < 30 ? index % 3 === 0 : true,
      future: false,
    }));
    const snapshot = buildStatsInsightsSnapshot({
      lang: 'ru',
      studyTarget: 'fr',
      week: { activeDays7: 7, minutes7: 14, xp7: 70, bestDayLabel: null, dailyMinutes7: [2, 2, 2, 2, 2, 2, 2], currentPeriodDates: currentDates },
      timeDays: priorDates.map((date) => ({ date, ms: 3 * 60_000 })),
      activity: {
        days: activityDays,
        activeDays: 40,
        currentStreak: 2,
        longestStreak: 9,
        last30ActiveDays: 30,
        bestMonth: null,
        goal: { chosen: false, activeDays: 40, goal: 180 },
      },
      percentiles: { sample: { ...sample, status: 'below_sample_floor' }, xp: null, daily7xp: null, daily7timeMs: null },
      lifetime: { wordsLearned: 1, phrasesLearned: 2, quizzesTotal: 3, arenaWins: 4, appDaysUnion: 5 },
    });

    expect(snapshot.week.previousMinutes7).toBe(21);
    expect(snapshot.longTerm.previous30ActiveDays).toBe(10);
    expect(snapshot.longTerm.goalPct).toBe(0);
  });
});
