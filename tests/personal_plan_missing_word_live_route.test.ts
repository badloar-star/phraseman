import { openPersonalPlanTask } from '../app/personal_plan_navigation';
import {
  getPersonalPlanMissingWordItems,
  validatePersonalPlanMissingWordItemQuality,
} from '../app/personal_plan_missing_word_items';
import { PERSONAL_PLAN_CATALOG, type PlanDailyTask } from '../app/personal_plan_catalog';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('personal plan missing-word live route', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'gavan')!;
  const day = plan.days[0];

  it('opens a dedicated plan exercise screen instead of the old lesson shell', () => {
    const router = { push: jest.fn() };
    const task: PlanDailyTask = {
      id: 'gavan_d001_missing_word',
      kind: 'plan_missing_word',
      title: 'Вставить нужное слово',
      subtitle: 'Короткая проверка одной фразы.',
      minutes: 3,
      requiredFor: [15, 20],
      destination: {
        type: 'plan_exercise',
        exerciseType: 'plan_missing_word',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: ['gavan_d1_phrase_1', 'gavan_d1_phrase_2'],
        requiredCorrect: 2,
      },
    };

    openPersonalPlanTask(router as any, plan, day, task, 'instance_1');

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/personal_plan_exercise',
      params: {
        rendererType: 'plan_missing_word',
        planId: 'gavan',
        planDayIndex: '1',
        planTaskId: 'gavan_d001_missing_word',
        planInstanceId: 'instance_1',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: 'gavan_d1_phrase_1,gavan_d1_phrase_2',
        requiredCorrect: '2',
      },
    });
  });

  it('blanks a semantic word, not the to-be subject chunk', () => {
    const items = getPersonalPlanMissingWordItems({
      lessonId: 'gavan_day1_short_replies',
      contentUnitIds: ['gavan_d1_phrase_1'],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(expect.objectContaining({
      id: 'gavan_d1_phrase_1',
      displayEnglish: "I'm ___.",
      correctAnswer: 'here',
      options: expect.arrayContaining(['here', 'hear', 'there']),
      explanation: expect.objectContaining({
        correctRu: expect.stringContaining('Here'),
        wrongRu: expect.stringContaining('hear'),
      }),
    }));
    expect(items[0].displayEnglish).not.toBe('___ here.');
    expect(items[0].options).not.toEqual(expect.arrayContaining(["I'm", "You're", "He's", "We're", "It's"]));
    expect(items[0].options).not.toContain('Alex');
    expect(items[0].options).not.toContain('087');
    expect(validatePersonalPlanMissingWordItemQuality(items)).toEqual([]);
  });

  it('rejects ambiguous missing-word slots with pronoun or to-be options', () => {
    const issues = validatePersonalPlanMissingWordItemQuality([
      {
        id: 'bad-slot',
        promptRu: 'Я здесь.',
        promptUk: 'Я тут.',
        displayEnglish: '___ here.',
        correctAnswer: "I'm",
        options: ["I'm", "You're", "He's", "We're", "It's"],
        fullAnswer: "I'm here.",
        grammarTags: ['to-be'],
        vocabularyTags: [],
        explanation: {
          id: 'bad-exp',
          titleRu: 'Почему так',
          correctRu: 'Bad fixture.',
          wrongRu: 'Bad fixture.',
        },
      },
    ]);

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'unsafe_missing_word_slot' }),
      expect.objectContaining({ code: 'unsafe_missing_word_option' }),
    ]));
  });

  it('rejects generated missing-word distractors copied from the same phrase', () => {
    const issues = validatePersonalPlanMissingWordItemQuality([
      {
        id: 'copied-phrase-token',
        promptRu: 'Bad fixture.',
        promptUk: 'Bad fixture.',
        displayEnglish: 'The next steps are ___.',
        correctAnswer: 'clear',
        options: ['clear', 'next', 'steps', 'today'],
        fullAnswer: 'The next steps are clear.',
        grammarTags: ['phrase'],
        vocabularyTags: ['phrase'],
        explanation: {
          id: 'bad-copied-token-exp',
          titleRu: 'Bad fixture.',
          correctRu: 'Bad fixture.',
          wrongRu: 'Bad fixture.',
        },
      },
    ]);

    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'missing_word_option_reuses_phrase_token' }),
    ]));
  });

  it('keeps generated personal-plan missing-word options from exposing the same phrase tokens', () => {
    const items = getPersonalPlanMissingWordItems({
      lessonId: 'mitap_d001_content_unit',
      contentUnitIds: ['mitap_d001_content_unit_phrase_1'],
    });

    expect(items).toHaveLength(1);
    expect(items[0].fullAnswer).toBe('The next steps are clear.');
    expect(items[0].correctAnswer).toBe('clear');
    expect(items[0].options).not.toEqual(expect.arrayContaining(['next', 'steps', 'are']));
    expect(validatePersonalPlanMissingWordItemQuality(items)).toEqual([]);
  });

  it('does not return runtime missing-word items that fail the strict quality gate', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_missing_word_items.ts'), 'utf8');

    expect(source).toContain('validatePersonalPlanMissingWordItemQuality([item]).length === 0');
    expect(source).toContain('.filter((item) => validatePersonalPlanMissingWordItemQuality([item]).length === 0)');
  });

  it('keeps fallback explanations readable and never invents the selected wrong option', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_missing_word_items.ts'), 'utf8');

    expect(source).toContain("titleRu: 'Почему так'");
    expect(source).toContain('Мы не угадываем твой выбранный вариант');
    expect(source).not.toMatch(/[ÐÑÂ]/);
    expect(source).not.toContain('ты выбрал');
    expect(source).not.toContain('вы выбрали');
  });
});
