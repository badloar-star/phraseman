import { selectSoftUpsellCopy } from '../app/soft_upsell_copy';
import type { SoftUpsellOpportunity, SoftUpsellTrigger } from '../app/soft_upsell_core';

function opportunity(trigger: SoftUpsellTrigger, value = 1): SoftUpsellOpportunity {
  const context = {
    first_lesson: 'first_lesson_success', free_lessons_complete: 'free_lessons_complete',
    weekly_review: 'weekly_review', second_ai_dialogue: 'dialog_repeat_success',
    streak_milestone: 'streak_milestone', repeated_training: 'trainer_repeat_success',
  } as const;
  return {
    trigger, value, studyTarget: 'en', context: context[trigger], destination: 'paywall',
    milestoneId: `${trigger}:${value}:en`,
  };
}

test.each([
  ['first_lesson', 'УРОК 1 ЗАВЕРШЁН', 'Ты уже начал. Теперь не теряй темп.'],
  ['free_lessons_complete', 'БЕСПЛАТНЫЙ СТАРТ ПРОЙДЕН', 'База готова. Дальше начинается твой английский.'],
  ['weekly_review', 'ТВОЯ НЕДЕЛЯ В ЦИФРАХ', 'Неделя уже показала, что работает для тебя.'],
  ['second_ai_dialogue', '2 РАЗГОВОРА ЗАВЕРШЕНЫ', 'Ты завершил два разговора. Не останавливай практику.'],
  ['streak_milestone', '7 ДНЕЙ ПОДРЯД', 'Это уже не случайность. У тебя появилась привычка.'],
  ['repeated_training', 'ТРЕНИРОВКА ЗАВЕРШЕНА', 'Повторение уже работает. Следующий шаг — сделать его точнее.'],
] as const)('returns approved result-led copy for %s', (trigger, proof, title) => {
  const copy = selectSoftUpsellCopy({ opportunity: opportunity(trigger, trigger === 'free_lessons_complete' ? 8 : trigger === 'second_ai_dialogue' ? 2 : trigger === 'streak_milestone' ? 7 : 1), locale: 'ru' });
  expect(copy).toMatchObject({ proof, title });
  expect(copy.body).toContain('Plus');
  expect(copy.ctaLabel.length).toBeGreaterThan(5);
});

test('never promises a daily free AI dialogue', () => {
  const copy = selectSoftUpsellCopy({ opportunity: opportunity('second_ai_dialogue', 2), locale: 'ru' });
  expect(JSON.stringify(copy).toLowerCase()).not.toMatch(/в день|daily|каждый день.*бесплат/);
});

test('uses measured weekly insight only for bounded categories with enough samples and delta', () => {
  const base = { opportunity: opportunity('weekly_review'), locale: 'ru' as const };
  expect(selectSoftUpsellCopy({ ...base, measured: {
    kind: 'weekly', strong: { category: 'vocabulary', attempts: 5, rate: 0.8 },
    weak: { category: 'grammar', attempts: 5, rate: 0.64 },
  } }).title).toBe('Ты лучше запоминаешь лексику, чем грамматику.');
  expect(selectSoftUpsellCopy({ ...base, measured: {
    kind: 'weekly', strong: { category: 'vocabulary', attempts: 4, rate: 0.8 },
    weak: { category: 'grammar', attempts: 20, rate: 0.2 },
  } }).title).toBe('Неделя уже показала, что работает для тебя.');
  expect(selectSoftUpsellCopy({ ...base, measured: {
    kind: 'weekly', strong: { category: 'vocabulary', attempts: 10, rate: 0.8 },
    weak: { category: 'grammar', attempts: 10, rate: 0.66 },
  } }).title).toBe('Неделя уже показала, что работает для тебя.');
});

test('uses measured trainer weakness only with five attempts and a 15-point lead', () => {
  const base = { opportunity: opportunity('repeated_training'), locale: 'ru' as const };
  expect(selectSoftUpsellCopy({ ...base, measured: {
    kind: 'trainer', weak: { category: 'listening', attempts: 5, errorRate: 0.5 },
    next: { category: 'grammar', attempts: 5, errorRate: 0.34 },
  } })).toMatchObject({ proof: 'СЛАБОЕ МЕСТО НАЙДЕНО', title: 'Аудирование пока забирает больше всего ошибок.' });
  expect(selectSoftUpsellCopy({ ...base, measured: {
    kind: 'trainer', weak: { category: 'listening', attempts: 5, errorRate: 0.5 },
    next: { category: 'grammar', attempts: 5, errorRate: 0.36 },
  } }).proof).toBe('ТРЕНИРОВКА ЗАВЕРШЕНА');
});

test('rejects arbitrary category strings', () => {
  const copy = selectSoftUpsellCopy({ opportunity: opportunity('weekly_review'), locale: 'ru', measured: {
    kind: 'weekly', strong: { category: 'raw user text', attempts: 100, rate: 1 },
    weak: { category: 'grammar', attempts: 100, rate: 0 },
  } as never });
  expect(copy.title).toBe('Неделя уже показала, что работает для тебя.');
});
