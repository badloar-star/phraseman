import { selectSoftUpsellCopy } from '../../app/soft_upsell_copy';
import type { SoftUpsellOpportunity } from '../../app/soft_upsell_core';

export interface SoftUpsellAdminPreview {
  readonly id: string;
  readonly icon: string;
  readonly adminLabel: string;
  readonly adminDescription: string;
  readonly proof: string;
  readonly title: string;
  readonly body: string;
  readonly ctaLabel: string;
  readonly opportunity: SoftUpsellOpportunity;
}

const DEFINITIONS: readonly Omit<SoftUpsellAdminPreview, 'proof' | 'title' | 'body' | 'ctaLabel'>[] = [
  {
    id: 'first-lesson', icon: 'map-outline', adminLabel: 'После первого урока',
    adminDescription: 'Первый успех → реальный paywall → персональный путь',
    opportunity: { trigger: 'first_lesson', value: 1, studyTarget: 'en', context: 'first_lesson_success', destination: 'paywall', milestoneId: 'first_lesson:1:en' },
  },
  {
    id: 'free-lessons-complete', icon: 'school-outline', adminLabel: 'После третьего бесплатного урока',
    adminDescription: 'Бесплатная часть завершена → Plus',
    opportunity: { trigger: 'free_lessons_complete', value: 3, studyTarget: 'en', context: 'free_lessons_complete', destination: 'paywall', milestoneId: 'free_lessons_complete:3:en' },
  },
  {
    id: 'weekly-review', icon: 'analytics-outline', adminLabel: 'После недельного обзора',
    adminDescription: 'Недельный результат → персональные повторы',
    opportunity: { trigger: 'weekly_review', value: 1, studyTarget: 'en', context: 'weekly_review', destination: 'paywall', milestoneId: 'weekly_review:1:en' },
  },
  {
    id: 'second-ai-dialogue', icon: 'chatbubbles-outline', adminLabel: 'После второго AI-диалога',
    adminDescription: 'Два разговора lifetime → продолжение практики',
    opportunity: { trigger: 'second_ai_dialogue', value: 2, studyTarget: 'en', context: 'dialog_repeat_success', destination: 'paywall', milestoneId: 'second_ai_dialogue:2:en' },
  },
  {
    id: 'streak-milestone', icon: 'flame-outline', adminLabel: 'После серии в 7 дней',
    adminDescription: 'Устойчивая привычка → следующий ежедневный шаг',
    opportunity: { trigger: 'streak_milestone', value: 7, studyTarget: 'en', context: 'streak_milestone', destination: 'paywall', milestoneId: 'streak_milestone:7:en' },
  },
  {
    id: 'repeated-training', icon: 'repeat-outline', adminLabel: 'После повторной тренировки',
    adminDescription: 'Успешное повторение → персональная практика',
    opportunity: { trigger: 'repeated_training', value: 1, studyTarget: 'en', context: 'trainer_repeat_success', destination: 'paywall', milestoneId: 'repeated_training:1:en' },
  },
];

export const SOFT_UPSELL_ADMIN_PREVIEWS: readonly SoftUpsellAdminPreview[] = Object.freeze(
  DEFINITIONS.map((definition) => ({
    ...definition,
    ...selectSoftUpsellCopy({ opportunity: definition.opportunity, locale: 'ru' }),
  })),
);
