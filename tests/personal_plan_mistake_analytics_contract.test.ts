import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearMistakeLog,
  flushMistakeLog,
  getTopMistakePhraseDetails,
  loadMistakeLog,
  logMistake,
} from '../app/mistake_log';
import {
  isFlexiblePlanNameAnswer,
  shouldSkipPlanGrammarAnalytics,
} from '../app/personal_plan_mistake_context';
import { clearTrainerStore, recordPhraseMistake } from '../app/trainer_store';
import { trainerStoreKey } from '../app/target_storage_keys';
import type { LessonPhrase } from '../app/lesson_data_types';

describe('personal plan mistake analytics contract', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await clearMistakeLog();
    await clearTrainerStore();
  });

  it('stores plan context and POS category for plan phrase mistakes', async () => {
    logMistake(
      "Hi, I'm Beta8958",
      1,
      'lesson',
      'wrong_pick',
      {
        phraseId: 'gavan_identity_001',
        tokenText: "I'm",
        tokenIndex: 1,
        expected: "I'm",
        picked: "You're",
        rawCategory: 'to-be',
        planId: 'gavan',
        planInstanceId: 'gavan_123',
        planTaskId: 'gavan_day1_phrase_lesson',
        planDayIndex: 1,
        planPhraseLessonId: 'gavan_future_content_unit',
      },
    );
    await flushMistakeLog();

    const [entry] = await loadMistakeLog();
    expect(entry).toEqual(expect.objectContaining({
      category: 'to-be',
      planId: 'gavan',
      planInstanceId: 'gavan_123',
      planTaskId: 'gavan_day1_phrase_lesson',
      planDayIndex: 1,
      planPhraseLessonId: 'gavan_future_content_unit',
    }));

    const [stat] = await getTopMistakePhraseDetails(5, 1);
    expect(stat).toEqual(expect.objectContaining({
      topCategory: 'to-be',
      topPlanId: 'gavan',
      planCounts: expect.objectContaining({ gavan: 1 }),
    }));
  });

  it('carries plan context into the trainer queue that becomes due on the next days', async () => {
    await recordPhraseMistake(
      "Hi, I'm Beta8958",
      'Здравствуйте, я Beta8958.',
      'Вітаю, я Beta8958.',
      1,
      "I'm",
      'to-be',
      undefined,
      undefined,
      {
        planId: 'gavan',
        planInstanceId: 'gavan_123',
        planTaskId: 'gavan_day1_phrase_lesson',
        planDayIndex: 1,
        planPhraseLessonId: 'gavan_future_content_unit',
      },
    );

    const raw = await AsyncStorage.getItem(trainerStoreKey());
    const items = JSON.parse(raw ?? '[]');
    expect(items[0]).toEqual(expect.objectContaining({
      queue: 'phrases',
      category: 'to-be',
      planId: 'gavan',
      planInstanceId: 'gavan_123',
      planTaskId: 'gavan_day1_phrase_lesson',
      planDayIndex: 1,
      planPhraseLessonId: 'gavan_future_content_unit',
    }));
    expect(items[0].nextDue).toBeGreaterThan(Date.now());
  });

  it('treats the name slot as flexible and skips grammar analytics for name-only mistakes', () => {
    const phrase: LessonPhrase = {
      id: 'gavan_identity_001',
      english: "Hi, I'm Beta8958",
      russian: 'Здравствуйте, я Beta8958.',
      ukrainian: 'Вітаю, я Beta8958.',
      words: [
        { text: 'Hi', correct: 'Hi', distractors: [], category: 'greeting' },
        { text: "I'm", correct: "I'm", distractors: [], category: 'to-be' },
        { text: 'Beta8958', correct: 'Beta8958', distractors: [], category: 'name' },
      ],
    };

    expect(isFlexiblePlanNameAnswer(phrase, "Hi I'm Sam", 'en')).toBe(true);
    expect(isFlexiblePlanNameAnswer(phrase, "Hi You're Sam", 'en')).toBe(false);
    expect(shouldSkipPlanGrammarAnalytics('name')).toBe(true);
    expect(shouldSkipPlanGrammarAnalytics('to-be')).toBe(false);
  });
});
