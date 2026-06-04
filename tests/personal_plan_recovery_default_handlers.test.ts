import AsyncStorage from '@react-native-async-storage/async-storage';

import { getAllItems, clearAllItems } from '../app/active_recall';
import { flushMistakeLog, loadMistakeLog } from '../app/mistake_log';
import { createPlanRecoveryDefaultHandlers } from '../app/personal_plan_recovery_default_handlers';
import { buildPlanRecoveryActions } from '../app/personal_plan_recovery_actions';
import { clearAppliedPlanRecoveryActionIds, writePlanRecoveryActionsWithRegistry } from '../app/personal_plan_recovery_applied_registry';
import {
  createPlanAttemptEvent,
  type PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';
import { clearTrainerStore, getTrainerPremiumItemsForPlan } from '../app/trainer_store';

const block: PlanExerciseBlock = {
  id: 'gavan_day1_phrase_build',
  planId: 'gavan',
  dayIndex: 1,
  type: 'plan_phrase_build',
  title: 'Build phrase',
  contentUnitIds: ['gavan-w1-d1-p1'],
  estimatedMinutes: 4,
  requiredFor: [5, 10, 15, 20],
  prerequisiteLessonIds: [1],
  progressPolicy: 'correct_only',
  recoveryPolicy: 'return_wrong_to_recall_and_trainer',
};

function recoveryActions() {
  const event = createPlanAttemptEvent(block, {
    id: 'attempt_wrong_phrase_build',
    planInstanceId: 'gavan_123',
    result: 'wrong',
    contentUnitId: 'gavan-w1-d1-p1',
    expectedAnswer: "I'm here.",
    selectedAnswer: 'I here.',
    grammarTags: ['to-be'],
    vocabularyTags: ['arrival'],
    mistakeTags: ['missing-verb'],
    occurredAt: '2026-06-03T10:00:00.000Z',
  });

  return buildPlanRecoveryActions(block, event, {
    currentPlanInstanceId: 'gavan_123',
  });
}

describe('personal plan recovery default handlers', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearAllItems();
    await clearTrainerStore();
    await clearAppliedPlanRecoveryActionIds('gavan_123');
  });

  it('applies wrong plan attempts into recall, trainer, and mistake analytics with plan context', async () => {
    const actions = recoveryActions();
    const results = await writePlanRecoveryActionsWithRegistry('gavan_123', actions, {
      mode: 'apply',
      handlers: createPlanRecoveryDefaultHandlers({ studyTarget: 'en' }),
    });
    await flushMistakeLog();

    expect(results.map((result) => result.status)).toEqual(['applied', 'applied', 'applied']);

    const recallItems = await getAllItems('en');
    expect(recallItems).toHaveLength(1);
    expect(recallItems[0]).toEqual(expect.objectContaining({
      phrase: "I'm here",
      correctAnswer: "I'm here.",
      lessonId: 1,
      source: 'lesson',
      errorWord: "I'm here.",
      grammarTag: 'to-be',
    }));

    const trainerItems = await getTrainerPremiumItemsForPlan('gavan_123', 'weak', 5, 'en');
    expect(trainerItems).toHaveLength(1);
    expect(trainerItems[0]).toEqual(expect.objectContaining({
      key: "I'm here.",
      queue: 'phrases',
      category: 'to-be',
      planId: 'gavan',
      planInstanceId: 'gavan_123',
      planTaskId: 'gavan_day1_phrase_build',
      planDayIndex: 1,
      planPhraseLessonId: 'gavan-w1-d1-p1',
    }));

    const mistakes = await loadMistakeLog('en');
    expect(mistakes).toHaveLength(1);
    expect(mistakes[0]).toEqual(expect.objectContaining({
      phrase: "I'm here.",
      lessonId: 1,
      mode: 'lesson',
      what: 'wrong_pick',
      expected: "I'm here.",
      picked: 'I here.',
      rawCategory: 'to-be',
      planId: 'gavan',
      planInstanceId: 'gavan_123',
      planTaskId: 'gavan_day1_phrase_build',
      planDayIndex: 1,
      planPhraseLessonId: 'gavan-w1-d1-p1',
    }));
  });

  it('uses the registry to keep default handler writes idempotent', async () => {
    const actions = recoveryActions();
    const handlers = createPlanRecoveryDefaultHandlers({ studyTarget: 'en' });

    await writePlanRecoveryActionsWithRegistry('gavan_123', actions, {
      mode: 'apply',
      handlers,
    });
    const second = await writePlanRecoveryActionsWithRegistry('gavan_123', actions, {
      mode: 'apply',
      handlers,
    });
    await flushMistakeLog();

    expect(second.every((result) => result.status === 'skipped' && result.reason === 'duplicate_action')).toBe(true);
    expect(await getAllItems('en')).toHaveLength(1);
    expect(await getTrainerPremiumItemsForPlan('gavan_123', 'weak', 5, 'en')).toHaveLength(1);
    expect(await loadMistakeLog('en')).toHaveLength(1);
  });
});
