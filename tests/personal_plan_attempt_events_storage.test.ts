import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  appendPersonalPlanAttemptEvent,
  clearPersonalPlanAttemptEvents,
  listPersonalPlanAttemptEvents,
  personalPlanAttemptEventsStorageKey,
} from '../app/personal_plan_attempt_events';
import {
  canPlanAttemptAffectProgress,
  createPlanAttemptEvent,
  type PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';

const block: PlanExerciseBlock = {
  id: 'gavan_day1_block',
  planId: 'gavan',
  dayIndex: 1,
  type: 'plan_phrase_build',
  title: 'Useful phrase',
  contentUnitIds: ['unit_1'],
  estimatedMinutes: 3,
  requiredFor: [5, 10, 15, 20],
  prerequisiteLessonIds: [1],
  progressPolicy: 'correct_only',
  recoveryPolicy: 'return_wrong_to_recall_and_trainer',
};

describe('personal plan attempt event storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores and lists attempt events by planInstanceId only', async () => {
    const first = createPlanAttemptEvent(block, {
      id: 'attempt_instance_a',
      planInstanceId: 'instance_a',
      result: 'wrong',
      contentUnitId: 'unit_1',
    });
    const second = createPlanAttemptEvent(block, {
      id: 'attempt_instance_b',
      planInstanceId: 'instance_b',
      result: 'wrong',
      contentUnitId: 'unit_1',
    });

    await appendPersonalPlanAttemptEvent(first);
    await appendPersonalPlanAttemptEvent(second);

    expect(await listPersonalPlanAttemptEvents('instance_a')).toEqual([first]);
    expect(await listPersonalPlanAttemptEvents('instance_b')).toEqual([second]);
  });

  it('clears only the selected plan instance so reset cannot leak old attempts', async () => {
    await appendPersonalPlanAttemptEvent(createPlanAttemptEvent(block, {
      id: 'old_attempt',
      planInstanceId: 'old_instance',
      result: 'wrong',
      contentUnitId: 'unit_1',
    }));
    const fresh = await appendPersonalPlanAttemptEvent(createPlanAttemptEvent(block, {
      id: 'fresh_attempt',
      planInstanceId: 'fresh_instance',
      result: 'correct',
      contentUnitId: 'unit_1',
    }));

    await clearPersonalPlanAttemptEvents('old_instance');

    expect(await listPersonalPlanAttemptEvents('old_instance')).toEqual([]);
    expect(await listPersonalPlanAttemptEvents('fresh_instance')).toEqual([fresh]);
  });

  it('keeps wrong attempts as events but never makes them count as progress', async () => {
    const wrong = await appendPersonalPlanAttemptEvent(createPlanAttemptEvent(block, {
      id: 'wrong_attempt',
      planInstanceId: 'instance_progress',
      result: 'wrong',
      contentUnitId: 'unit_1',
    }));

    expect((await listPersonalPlanAttemptEvents('instance_progress'))[0]).toEqual(wrong);
    expect(canPlanAttemptAffectProgress(wrong)).toBe(false);
  });

  it('sanitizes sensitive payload before writing to storage', async () => {
    await appendPersonalPlanAttemptEvent(createPlanAttemptEvent(block, {
      id: 'sensitive_attempt',
      planInstanceId: 'instance_sensitive',
      result: 'wrong',
      contentUnitId: 'unit_1',
      payload: {
        safe: 'short retry',
        email: 'beta@example.com',
        phone: '+353 123456789',
        address: '221 Baker Street',
        note: 'card number 123456789',
      },
    }));

    const raw = await AsyncStorage.getItem(personalPlanAttemptEventsStorageKey());

    expect(raw).toContain('short retry');
    expect(raw).not.toContain('beta@example.com');
    expect(raw).not.toContain('123456789');
    expect(raw).not.toContain('Baker Street');
    expect(raw).not.toContain('card number');
  });

  it('rejects invalid events instead of storing cross-instance garbage', async () => {
    const invalid = createPlanAttemptEvent(block, {
      id: 'invalid_attempt',
      planInstanceId: ' ',
      result: 'wrong',
      contentUnitId: 'unit_1',
    });

    await expect(appendPersonalPlanAttemptEvent(invalid)).rejects.toThrow('missing_plan_instance_id');
    expect(await listPersonalPlanAttemptEvents('instance_missing')).toEqual([]);
  });
});
