import AsyncStorage from '@react-native-async-storage/async-storage';
// zachem: append/read attempt-events zashishcheny "pokoleniem akkaunta" (gard ot gonki
// pri smene polzovatelya, throw 'stale_account_generation'). V teste realnogo akkaunta
// net, poetomu gard sryval vse keysy, hotya logika ispravna. Mokaem pokolenie stabilnym
// "tekushchim", kak v auth_clean_install_recovery_*.test.ts; sam gard pokryt otdelno.
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, phase: 'active', stableId: 'test_uid' }),
  isCurrentAccountGeneration: () => true,
  withAccountTransitionLock: async (fn: () => Promise<unknown>) => fn(),
}));


import { openPersonalPlanTask } from '../app/personal_plan_navigation';
import {
  getPersonalPlanPhraseRecallItems,
} from '../app/personal_plan_phrase_recall_items';
import { appendPersonalPlanAttemptEvent } from '../app/personal_plan_attempt_events';
import {
  createPlanAttemptEvent,
  type PlanExerciseBlock,
} from '../app/personal_plan_engine_contracts';
import { PERSONAL_PLAN_CATALOG, type PlanDailyTask } from '../app/personal_plan_catalog';

const wrongBlock: PlanExerciseBlock = {
  id: 'gavan_d001_missing_word',
  planId: 'gavan',
  dayIndex: 1,
  type: 'plan_missing_word',
  title: 'Words in phrase',
  contentUnitIds: ['gavan_d1_phrase_1'],
  estimatedMinutes: 3,
  requiredFor: [15, 20],
  prerequisiteLessonIds: [1],
  progressPolicy: 'correct_only',
  recoveryPolicy: 'return_wrong_to_recall',
};

describe('personal plan phrase-recall live route', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'gavan')!;
  const day = plan.days[0];

  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('opens the dedicated plan exercise screen instead of the old lesson shell', () => {
    const router = { push: jest.fn() };
    const task: PlanDailyTask = {
      id: 'gavan_d004_recall',
      kind: 'plan_phrase_recall',
      title: 'Вспомнить фразы',
      subtitle: 'Без подсказок: сначала ошибки, потом фразы дня.',
      minutes: 4,
      requiredFor: [15, 20],
      destination: {
        type: 'plan_phrase_recall',
        lessonId: 'gavan_day1_short_replies',
        requiredPhrases: 2,
        afterLessonId: 1,
      },
    };

    openPersonalPlanTask(router as any, plan, day, task, 'instance_recall_1');

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/personal_plan_exercise',
      params: {
        rendererType: 'plan_phrase_recall',
        planId: 'gavan',
        planDayIndex: '1',
        planTaskId: 'gavan_d004_recall',
        planInstanceId: 'instance_recall_1',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: 'gavan_d1_phrase_1,gavan_d1_phrase_2',
        requiredCorrect: '2',
      },
    });
  });

  it('puts wrong attempts from the same plan instance first', async () => {
    await appendPersonalPlanAttemptEvent(createPlanAttemptEvent(wrongBlock, {
      id: 'wrong_here',
      planInstanceId: 'instance_recall_1',
      result: 'wrong',
      contentUnitId: 'gavan_d1_phrase_1',
      expectedAnswer: "I'm here.",
      selectedAnswer: "I'm okay.",
      grammarTags: ['to-be'],
      vocabularyTags: ['place'],
      mistakeTags: ['listen_choose'],
      occurredAt: '2026-06-01T10:00:00.000Z',
    }));
    await appendPersonalPlanAttemptEvent(createPlanAttemptEvent(wrongBlock, {
      id: 'wrong_other_instance',
      planInstanceId: 'old_instance',
      result: 'wrong',
      contentUnitId: 'gavan_d1_phrase_2',
      expectedAnswer: "I'm okay.",
      selectedAnswer: "I'm here.",
      occurredAt: '2026-06-01T10:01:00.000Z',
    }));

    const items = await getPersonalPlanPhraseRecallItems({
      planInstanceId: 'instance_recall_1',
      lessonId: 'gavan_day1_short_replies',
      contentUnitIds: ['gavan_d1_phrase_2'],
    });

    expect(items.map((item) => item.id)).toEqual([
      'recall:gavan_d1_phrase_1',
      'fallback:gavan_d1_phrase_2',
    ]);
    expect(items[0]).toEqual(expect.objectContaining({
      promptRu: 'Я здесь.',
      targetText: "I'm here.",
      source: 'wrong_attempt',
      previousSelectedAnswer: "I'm okay.",
      explanation: expect.objectContaining({
        wrongRu: expect.stringContaining('не сравниваем'),
      }),
    }));
  });
});
