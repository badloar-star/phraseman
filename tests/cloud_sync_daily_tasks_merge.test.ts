import {
  deriveLastActiveDateForRestore,
  mergeDailyTasksProgressForRestore,
  SYNC_KEYS,
} from '../app/cloud_sync';

describe('mergeDailyTasksProgressForRestore', () => {
  it('returns cloud when local empty', () => {
    const cloud = JSON.stringify([{ taskId: 'a', current: 2, completed: false, claimed: false }]);
    expect(mergeDailyTasksProgressForRestore(null, cloud)).toBe(cloud);
  });

  it('merges counters and flags per taskId', () => {
    const local = JSON.stringify([
      { taskId: 'x', current: 5, completed: true, claimed: false },
    ]);
    const cloud = JSON.stringify([
      { taskId: 'x', current: 2, completed: false, claimed: false },
    ]);
    const out = JSON.parse(mergeDailyTasksProgressForRestore(local, cloud)) as unknown[];
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      taskId: 'x',
      current: 5,
      completed: true,
      claimed: false,
    });
  });

  it('keeps local-only task rows and merges arena combo fields', () => {
    const local = JSON.stringify([
      {
        taskId: 'arena1',
        current: 1,
        completed: false,
        claimed: false,
        comboPlays: 2,
        comboWins: 1,
      },
    ]);
    const cloud = JSON.stringify([]);
    const merged = mergeDailyTasksProgressForRestore(local, cloud);
    expect(JSON.parse(merged)).toEqual(JSON.parse(local));
  });

  it('ORs claimed from either side', () => {
    const local = JSON.stringify([{ taskId: 'y', current: 1, completed: true, claimed: true }]);
    const cloud = JSON.stringify([{ taskId: 'y', current: 0, completed: false, claimed: false }]);
    const out = JSON.parse(mergeDailyTasksProgressForRestore(local, cloud))[0] as { claimed: boolean };
    expect(out.claimed).toBe(true);
  });
});

describe('streak cloud restore safety', () => {
  it('syncs the activity date used by updateStreakOnActivity', () => {
    expect(SYNC_KEYS).toContain('streak_count');
    expect(SYNC_KEYS).toContain('last_active_date');
  });

  it('derives last_active_date from legacy streak_last_date', () => {
    expect(deriveLastActiveDateForRestore({
      last_active_date: null,
      streak_last_date: '2026-05-07',
    })).toBe('2026-05-07');
  });

  it('backfills last_active_date from daily_stats for old cloud profiles', () => {
    expect(deriveLastActiveDateForRestore({
      last_active_date: null,
      streak_last_date: null,
      daily_stats: JSON.stringify({
        '2026-05-05': { points: 20, streak: 9 },
        '2026-05-08': { points: 12, streak: 10 },
      }),
      stats_daily_breakdown_v1: null,
    })).toBe('2026-05-08');
  });
});
