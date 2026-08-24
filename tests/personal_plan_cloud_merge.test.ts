import AsyncStorage from '@react-native-async-storage/async-storage';

import { __cloudSyncTestHooks } from '../app/cloud_sync';
import {
  commitPlanXpTask,
  reservePlanXpTask,
} from '../app/personal_plan_xp_ledger';

const {
  applyPersonalPlanRestorePairs,
  applyRestoreFromUserDoc,
  mergePersonalPlanRestoreValue,
} = __cloudSyncTestHooks;
const cloudDoc = (progress: Record<string, unknown>) => ({
  exists: true,
  data: () => ({ progress }),
});

describe('personal plan client-authoritative cloud restore merge', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });
  it('keeps a newer offline local plan state over older cloud state', () => {
    const local = JSON.stringify({
      planInstanceId: 'plan-a',
      status: 'active',
      currentDayIndex: 4,
      updatedAt: '2026-08-20T12:00:00.000Z',
    });
    const cloud = JSON.stringify({
      planInstanceId: 'plan-a',
      status: 'active',
      currentDayIndex: 2,
      updatedAt: '2026-08-19T12:00:00.000Z',
    });

    expect(mergePersonalPlanRestoreValue('personal_plan_state_v1', cloud, local)).toBe(local);
  });

  it('keeps the day-specific start marker from the furthest monotonic state', () => {
    const local = JSON.stringify({
      planInstanceId: 'plan-a',
      status: 'active',
      currentDayIndex: 4,
      currentDayStartedAt: '2026-08-18T08:00:00.000Z',
      updatedAt: '2026-08-18T08:00:00.000Z',
    });
    const cloud = JSON.stringify({
      planInstanceId: 'plan-a',
      status: 'active',
      currentDayIndex: 2,
      currentDayStartedAt: '2026-08-20T08:00:00.000Z',
      updatedAt: '2026-08-20T08:00:00.000Z',
    });

    expect(JSON.parse(mergePersonalPlanRestoreValue(
      'personal_plan_state_v1', cloud, local,
    ))).toMatchObject({
      currentDayIndex: 4,
      currentDayStartedAt: '2026-08-18T08:00:00.000Z',
    });
  });

  it('selects the newer activation when devices hold different plan instances', () => {
    const local = JSON.stringify({
      planInstanceId: 'old-plan',
      status: 'completed',
      currentDayIndex: 30,
      activatedAt: '2026-08-01T08:00:00.000Z',
      updatedAt: '2026-08-20T09:00:00.000Z',
    });
    const cloud = JSON.stringify({
      planInstanceId: 'new-plan',
      status: 'active',
      currentDayIndex: 2,
      activatedAt: '2026-08-19T08:00:00.000Z',
      updatedAt: '2026-08-19T09:00:00.000Z',
    });

    expect(mergePersonalPlanRestoreValue('personal_plan_state_v1', cloud, local)).toBe(cloud);
  });

  it('unions monotonic task completions from cloud and offline local state', () => {
    const local = JSON.stringify({
      'plan-a::task-local': { taskId: 'task-local', completedAt: '2026-08-20T12:00:00.000Z' },
    });
    const cloud = JSON.stringify({
      'plan-a::task-cloud': { taskId: 'task-cloud', completedAt: '2026-08-19T12:00:00.000Z' },
    });

    expect(JSON.parse(mergePersonalPlanRestoreValue(
      'personal_plan_completed_tasks_v1', cloud, local,
    ))).toEqual(expect.objectContaining({
      'plan-a::task-local': expect.any(Object),
      'plan-a::task-cloud': expect.any(Object),
    }));
  });

  it('keeps the furthest resumable task progress and unions correct answers', () => {
    const local = JSON.stringify({
      'plan-a::task-1': { index: 5, correctIds: ['a', 'b'], attemptSequence: 5, updatedAt: '2026-08-20T12:00:00.000Z' },
    });
    const cloud = JSON.stringify({
      'plan-a::task-1': { index: 3, correctIds: ['a', 'c'], attemptSequence: 3, updatedAt: '2026-08-19T12:00:00.000Z' },
    });

    const merged = JSON.parse(mergePersonalPlanRestoreValue(
      'personal_plan_task_progress_v1', cloud, local,
    ));
    expect(merged['plan-a::task-1']).toMatchObject({ index: 5, attemptSequence: 5 });
    expect(merged['plan-a::task-1'].correctIds).toEqual(expect.arrayContaining(['a', 'b', 'c']));
  });

  it('unions XP task receipts without replacing an applied local receipt with pending cloud data', () => {
    const local = JSON.stringify({
      'plan-a': {
        xp: 6,
        phrases: 2,
        taskIds: { 'task-1': { xp: 6, phrases: 2, status: 'applied', eventId: 'event-local' } },
      },
    });
    const cloud = JSON.stringify({
      'plan-a': {
        xp: 0,
        phrases: 0,
        taskIds: { 'task-1': { xp: 6, phrases: 2, status: 'pending', eventId: 'event-local' } },
      },
    });

    const merged = JSON.parse(mergePersonalPlanRestoreValue(
      'personal_plan_xp_ledger_v1', cloud, local,
    ));
    expect(merged['plan-a']).toMatchObject({ xp: 6, phrases: 2 });
    expect(merged['plan-a'].taskIds['task-1']).toMatchObject({ status: 'applied' });
  });

  it('merges remote plan progress even when higher local XP selects the sticky restore branch', async () => {
    await AsyncStorage.multiSet([
      ['user_total_xp', '200'],
      ['streak_count', '0'],
      ['personal_plan_completed_tasks_v1', JSON.stringify({
        'plan-a::local': { taskId: 'local', completedAt: '2026-08-20T08:00:00.000Z' },
      })],
    ]);

    await expect(applyRestoreFromUserDoc(cloudDoc({
      user_total_xp: '100',
      streak_count: '0',
      personal_plan_completed_tasks_v1: JSON.stringify({
        'plan-a::remote': { taskId: 'remote', completedAt: '2026-08-19T08:00:00.000Z' },
      }),
    }))).resolves.toBe(true);

    expect(JSON.parse(String(await AsyncStorage.getItem('personal_plan_completed_tasks_v1'))))
      .toEqual(expect.objectContaining({
        'plan-a::local': expect.any(Object),
        'plan-a::remote': expect.any(Object),
      }));
  });

  it('serializes cloud ledger merge with an in-flight pending-to-applied transition', async () => {
    await reservePlanXpTask('plan-a', 'local-task', 6, 2, 'event-local');
    const setItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
    const original = setItem.getMockImplementation();
    let releaseCommit!: () => void;
    let markCommitStarted!: () => void;
    const commitStarted = new Promise<void>((resolve) => { markCommitStarted = resolve; });
    const commitBlocked = new Promise<void>((resolve) => { releaseCommit = resolve; });
    setItem.mockImplementation(async (key, value) => {
      if (key === 'personal_plan_xp_ledger_v1' && String(value).includes('"status":"applied"')) {
        markCommitStarted();
        await commitBlocked;
      }
      if (original) await original(key, value);
    });

    const commit = commitPlanXpTask('plan-a', 'local-task');
    await commitStarted;
    const restore = applyPersonalPlanRestorePairs([[
      'personal_plan_xp_ledger_v1',
      JSON.stringify({
        'plan-a': {
          xp: 6,
          phrases: 1,
          taskIds: {
            'remote-task': { xp: 6, phrases: 1, status: 'applied', eventId: 'event-remote' },
          },
        },
      }),
    ]]);
    releaseCommit();
    await Promise.all([commit, restore]);

    const ledger = JSON.parse(String(await AsyncStorage.getItem('personal_plan_xp_ledger_v1')));
    expect(ledger['plan-a']).toMatchObject({ xp: 12, phrases: 3 });
    expect(ledger['plan-a'].taskIds).toEqual(expect.objectContaining({
      'local-task': expect.objectContaining({ status: 'applied' }),
      'remote-task': expect.objectContaining({ status: 'applied' }),
    }));
  });
});
