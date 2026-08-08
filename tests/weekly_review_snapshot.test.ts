import {
  buildWeeklyReviewSnapshot,
  type WeeklyReviewSnapshotSources,
} from '../app/weekly_review_snapshot';

const READY_SOURCES: WeeklyReviewSnapshotSources = {
  mistakes: { status: 'ready', total7d: 8, total30d: 21, uniquePhrases: 6 },
  activity: {
    status: 'ready',
    activeDays7d: 4,
    activeDays30d: 13,
    currentStreak: 3,
    longestStreak: 11,
    weekXp: 460,
    weekMinutes: 72,
    lessons7d: 3,
    reviews7d: 4,
  },
  trainer: {
    status: 'ready',
    dueWords: 5,
    duePhrases: 7,
    overdue: 4,
    totalTracked: 31,
  },
};

describe('weekly review local snapshot', () => {
  it('returns a visible ready snapshot without diagnostic conclusions', () => {
    const snapshot = buildWeeklyReviewSnapshot(READY_SOURCES);

    expect(snapshot).toMatchObject({
      status: 'ready',
      mistakeCount30d: 21,
      activeDays7d: 4,
      totalDue: 12,
      sourceCoverage: { ready: 3, total: 3 },
    });
    expect(snapshot.signalCount).toBeGreaterThan(0);
    expect(snapshot).not.toHaveProperty('weakCategories');
    expect(snapshot).not.toHaveProperty('recommendations');
  });

  it('distinguishes insufficient learning data from a failed optional source', () => {
    expect(buildWeeklyReviewSnapshot({
      ...READY_SOURCES,
      mistakes: { status: 'ready', total7d: 1, total30d: 2, uniquePhrases: 1 },
    }).status).toBe('insufficient');

    expect(buildWeeklyReviewSnapshot({
      ...READY_SOURCES,
      trainer: { status: 'error', errorCode: 'trainer_store_unavailable' },
    })).toMatchObject({
      status: 'partial',
      sourceCoverage: { ready: 2, failed: 1, total: 3 },
      totalDue: 0,
    });
  });

  it('returns error when the required mistake source is unavailable', () => {
    expect(buildWeeklyReviewSnapshot({
      ...READY_SOURCES,
      mistakes: { status: 'error', errorCode: 'mistake_log_unavailable' },
    })).toMatchObject({
      status: 'error',
      mistakeCount30d: 0,
      sourceCoverage: { ready: 2, failed: 1, total: 3 },
    });
  });
});
