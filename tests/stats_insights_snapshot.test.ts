import {
  buildStatsInsightsSnapshot,
  canBuildStatsInsightsSnapshotForCycle,
  finishStatsInsightsLoadCycle,
  isCurrentStatsInsightsLoadCycle,
  notesForStatsInsightsFingerprint,
  selectionPolicyForStatsInsightsSnapshot,
  shouldRenderStatsComparison,
} from '../app/stats_insights_snapshot';
import { buildStatsInsightAnalysis } from '../app/stats_insights_analysis';

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
    expect(snapshot.studyTarget).toBe('es');
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

  it('rejects out-of-order and invalidated load completions', () => {
    expect(isCurrentStatsInsightsLoadCycle(4, 5)).toBe(false);
    expect(isCurrentStatsInsightsLoadCycle(5, 5)).toBe(true);
    expect(isCurrentStatsInsightsLoadCycle(5, 6)).toBe(false);
  });

  it('opens the snapshot gate only when all data belongs to the current completed cycle', () => {
    const ready = {
      cycleId: 8,
      currentCycleId: 8,
      completedCycleId: 8,
      activityStatus: 'ready' as const,
      percentilesStatus: 'unavailable' as const,
      lifetimeStatus: 'ready' as const,
      hasActivity: true,
      hasLifetime: true,
    };
    expect(canBuildStatsInsightsSnapshotForCycle(ready)).toBe(true);
    expect(canBuildStatsInsightsSnapshotForCycle({ ...ready, completedCycleId: -1 })).toBe(false);
    expect(canBuildStatsInsightsSnapshotForCycle({ ...ready, currentCycleId: 9 })).toBe(false);
    expect(canBuildStatsInsightsSnapshotForCycle({ ...ready, activityStatus: 'loading' })).toBe(false);
    expect(canBuildStatsInsightsSnapshotForCycle({ ...ready, percentilesStatus: 'loading' })).toBe(false);
    expect(canBuildStatsInsightsSnapshotForCycle({ ...ready, lifetimeStatus: 'loading' })).toBe(false);
    expect(canBuildStatsInsightsSnapshotForCycle({ ...ready, lifetimeStatus: 'unavailable' })).toBe(false);
  });

  it('keeps the gate closed when analytics finish before the core load cycle', () => {
    const analyticsReady = {
      cycleId: 12,
      currentCycleId: 12,
      completedCycleId: -1,
      activityStatus: 'ready' as const,
      percentilesStatus: 'ready' as const,
      lifetimeStatus: 'ready' as const,
      hasActivity: true,
      hasLifetime: true,
    };
    expect(canBuildStatsInsightsSnapshotForCycle(analyticsReady)).toBe(false);
    expect(canBuildStatsInsightsSnapshotForCycle({ ...analyticsReady, completedCycleId: 12 })).toBe(true);
  });

  it('shows notes only for the exact current fingerprint', () => {
    const stored = { fingerprint: 'new', notes: { week: 'new note' } };
    expect(notesForStatsInsightsFingerprint('old', stored)).toBeNull();
    expect(notesForStatsInsightsFingerprint(null, stored)).toBeNull();
    expect(notesForStatsInsightsFingerprint('new', stored)).toEqual(stored.notes);
  });

  it('maps a matching persisted selection window to preserve, rotate, or default', () => {
    const ids = { week: 'w', longTerm: 'l', comparison: 'c', lifetime: 't' };
    expect(selectionPolicyForStatsInsightsSnapshot('base', {
      snapshotKey: 'base',
      selection: { kind: 'none' },
    })).toEqual({});
    expect(selectionPolicyForStatsInsightsSnapshot('base', {
      snapshotKey: 'base',
      selection: { kind: 'preserve', observationIds: ids, nextAllowedAtMs: 100 },
    })).toEqual({ preferredObservationIds: ['w', 'l', 'c', 't'] });
    expect(selectionPolicyForStatsInsightsSnapshot('base', {
      snapshotKey: 'base',
      selection: { kind: 'rotate', observationIds: ids, nextAllowedAtMs: 100 },
    })).toEqual({ previousObservationIds: ['w', 'l', 'c', 't'] });
  });

  it('rejects late selection metadata from another base snapshot and lets QA rotate deliberately', () => {
    const state = {
      snapshotKey: 'old',
      selection: {
        kind: 'preserve' as const,
        observationIds: { week: 'w', longTerm: 'l', comparison: 'c', lifetime: 't' },
        nextAllowedAtMs: 100,
      },
    };
    expect(selectionPolicyForStatsInsightsSnapshot('new', state)).toBeNull();
    expect(selectionPolicyForStatsInsightsSnapshot('old', state, true)).toEqual({
      previousObservationIds: ['w', 'l', 'c', 't'],
    });
  });

  it('keeps comparison geometry after the first resolved result', () => {
    expect(shouldRenderStatsComparison(false)).toBe(false);
    expect(shouldRenderStatsComparison(true)).toBe(true);
  });

  it('keeps unchanged facts on the same deterministic fingerprint', () => {
    const input = {
      lang: 'ru' as const,
      studyTarget: 'en' as const,
      week: { activeDays7: 1, minutes7: 5, xp7: 20, previousMinutes7: null, bestDayLabel: null, dailyMinutes7: [0, 0, 0, 0, 0, 0, 5] },
      longTerm: { activeDays365: 1, currentStreak: 1, longestStreak: 1, bestMonthLabel: null, last30ActiveDays: 1, previous30ActiveDays: null, goalPct: 1 },
      comparison: { sample, totalXpPercentile: 60, daily7XpPercentile: null, daily7TimePercentile: null },
      lifetime: { words: 2, phrases: 1, quizzes: 0, arenaWins: 0, daysActive: 1 },
      weakCategories: [],
    };
    expect(buildStatsInsightAnalysis(input).fingerprint).toBe(buildStatsInsightAnalysis(input).fingerprint);
  });

  it('does not apply a deferred cycle after blur or a newer focus wins', async () => {
    const applied: number[] = [];
    let currentCycleId = 1;
    let resolveCycle1!: () => void;
    const cycle1Work = new Promise<void>((resolve) => { resolveCycle1 = resolve; });
    const cycle1 = finishStatsInsightsLoadCycle(1, cycle1Work, () => currentCycleId);

    currentCycleId = 2;
    const cycle2 = finishStatsInsightsLoadCycle(2, Promise.resolve(), () => currentCycleId);
    const cycle2Token = await cycle2;
    if (cycle2Token !== null) applied.push(cycle2Token);
    expect(cycle2Token).toBe(2);
    resolveCycle1();
    const cycle1Token = await cycle1;
    if (cycle1Token !== null) applied.push(cycle1Token);
    expect(cycle1Token).toBeNull();
    expect(applied).toEqual([2]);

    let resolveBlurred!: () => void;
    const blurred = finishStatsInsightsLoadCycle(2, new Promise<void>((resolve) => { resolveBlurred = resolve; }), () => currentCycleId);
    currentCycleId = 3;
    resolveBlurred();
    const blurredToken = await blurred;
    if (blurredToken !== null) applied.push(blurredToken);
    expect(blurredToken).toBeNull();
    expect(applied).toEqual([2]);
  });
});
