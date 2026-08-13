import AsyncStorage from '@react-native-async-storage/async-storage';

// зачем: appendPersonalPlanAttemptEvent защищён «поколением аккаунта» — гардом от
// гонки, когда пользователь сменился посреди записи (throw 'stale_account_generation').
// В тесте настоящего аккаунта нет, поэтому гард срабатывал и ронял все три кейса,
// хотя логика слабых мест исправна. Мокаем поколение стабильным «текущим», как в
// auth_clean_install_recovery_*.test.ts — сам гард отдельно покрыт своими тестами.
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, phase: 'active', stableId: 'test_uid' }),
  isCurrentAccountGeneration: () => true,
  withAccountTransitionLock: async (fn: () => Promise<unknown>) => fn(),
}));

import { appendPersonalPlanAttemptEvent } from '../app/personal_plan_attempt_events';
import { createPlanAttemptEvent, type PlanExerciseBlock } from '../app/personal_plan_engine_contracts';
import { readPlanWeakSpotView } from '../app/personal_plan_weak_spot_reader';

const block: PlanExerciseBlock = {
  id: 'voyazh_d1_phrase_build',
  planId: 'voyazh',
  dayIndex: 1,
  type: 'plan_phrase_build',
  title: 'Build',
  contentUnitIds: ['voyazh-w1-d1-p1'],
  estimatedMinutes: 4,
  requiredFor: [5, 10, 15, 20],
  prerequisiteLessonIds: [1],
  progressPolicy: 'correct_only',
  recoveryPolicy: 'return_wrong_to_recall_and_trainer',
};

async function recordWrong(id: string, grammarTags: string[], vocabularyTags: string[]) {
  const event = createPlanAttemptEvent(block, {
    id,
    planInstanceId: 'voyazh_inst_1',
    result: 'wrong',
    contentUnitId: 'voyazh-w1-d1-p1',
    expectedAnswer: "I'm here.",
    selectedAnswer: 'I here.',
    grammarTags,
    vocabularyTags,
    mistakeTags: ['missing-verb'],
    occurredAt: '2026-06-08T10:00:00.000Z',
  });
  await appendPersonalPlanAttemptEvent(event);
}

describe('plan weak spot reader', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('returns an empty view when there are no attempts', async () => {
    const view = await readPlanWeakSpotView('voyazh_inst_1');
    expect(view.hasData).toBe(false);
    expect(view.rows).toEqual([]);
  });

  it('surfaces weak spots from wrong attempts, most-wrong first', async () => {
    await recordWrong('a1', ['to-be'], ['arrival']);
    await recordWrong('a2', ['to-be'], ['arrival']);
    await recordWrong('a3', ['present-perfect'], ['objects']);

    const view = await readPlanWeakSpotView('voyazh_inst_1');
    expect(view.hasData).toBe(true);
    expect(view.totals.wrong).toBe(3);
    expect(view.rows.length).toBeGreaterThan(0);
    // to-be has 2 wrongs -> should be near the top
    const toBe = view.rows.find((r) => r.tag === 'to-be');
    expect(toBe?.wrongCount).toBe(2);
  });

  it('labels a grammar tag that is a real POS with the POS, keeps others as the tag', async () => {
    await recordWrong('a1', ['to-be'], []);
    await recordWrong('a2', ['present-perfect'], []);
    const view = await readPlanWeakSpotView('voyazh_inst_1');
    const toBe = view.rows.find((r) => r.tag === 'to-be');
    const perfect = view.rows.find((r) => r.tag === 'present-perfect');
    expect(toBe?.label).toBe('to-be');
    // present-perfect is not a WordCategory -> label stays the tag
    expect(perfect?.label).toBe('present-perfect');
  });

  it('scopes to the given plan instance', async () => {
    await recordWrong('a1', ['to-be'], []);
    const other = await readPlanWeakSpotView('voyazh_inst_OTHER');
    expect(other.hasData).toBe(false);
  });
});
