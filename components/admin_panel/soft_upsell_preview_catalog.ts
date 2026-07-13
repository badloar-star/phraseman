import type { SoftUpsellOpportunity } from '../../app/soft_upsell_core';

export interface SoftUpsellAdminPreview {
  readonly id: string;
  readonly icon: string;
  readonly adminLabel: string;
  readonly adminDescription: string;
  readonly title: string;
  readonly body: string;
  readonly ctaLabel: string;
  readonly opportunity: SoftUpsellOpportunity;
}

export const SOFT_UPSELL_ADMIN_PREVIEWS: readonly SoftUpsellAdminPreview[] = Object.freeze([
  {
    id: 'first-lesson',
    icon: 'map-outline',
    adminLabel: 'После первого урока',
    adminDescription: 'Первый успех → персональный путь',
    title: 'Первый шаг готов',
    body: 'Продолжай с персональным маршрутом под свою цель.',
    ctaLabel: 'Построить мой путь',
    opportunity: {
      trigger: 'first_lesson',
      value: 1,
      studyTarget: 'en',
      context: 'first_lesson_success',
      destination: 'personal_plan',
      milestoneId: 'first_lesson:1:en',
    },
  },
  {
    id: 'free-lessons-complete',
    icon: 'school-outline',
    adminLabel: 'После восьмого бесплатного урока',
    adminDescription: 'Бесплатная часть завершена → Plus',
    title: 'Бесплатная часть завершена',
    body: 'Открой полный учебный путь и продолжай без остановки.',
    ctaLabel: 'Открыть Plus',
    opportunity: {
      trigger: 'free_lessons_complete',
      value: 8,
      studyTarget: 'en',
      context: 'free_lessons_complete',
      destination: 'paywall',
      milestoneId: 'free_lessons_complete:8:en',
    },
  },
  {
    id: 'weekly-review',
    icon: 'analytics-outline',
    adminLabel: 'После недельного обзора',
    adminDescription: 'Полезный вывод недели → Plus',
    title: 'Твой прогресс уже виден',
    body: 'Ты лучше запоминаешь знакомые темы. Plus поможет усилить слабые места.',
    ctaLabel: 'Открыть Plus',
    opportunity: {
      trigger: 'weekly_review',
      value: 1,
      studyTarget: 'en',
      context: 'weekly_review',
      destination: 'paywall',
      milestoneId: 'weekly_review:1:en',
    },
  },
  {
    id: 'second-ai-dialogue',
    icon: 'chatbubbles-outline',
    adminLabel: 'После второго AI-диалога',
    adminDescription: 'Повторный разговор → Plus',
    title: 'Говорить становится легче',
    body: 'Продолжай практиковаться в диалогах без учебного напряжения.',
    ctaLabel: 'Открыть Plus',
    opportunity: {
      trigger: 'second_ai_dialogue',
      value: 2,
      studyTarget: 'en',
      context: 'dialog_repeat_success',
      destination: 'paywall',
      milestoneId: 'second_ai_dialogue:2:en',
    },
  },
  {
    id: 'streak-milestone',
    icon: 'flame-outline',
    adminLabel: 'После серии в 7 дней',
    adminDescription: 'Недельная серия → Plus',
    title: '7 дней подряд',
    body: 'Ты уже построил привычку. С Plus её проще превратить в устойчивый результат.',
    ctaLabel: 'Открыть Plus',
    opportunity: {
      trigger: 'streak_milestone',
      value: 7,
      studyTarget: 'en',
      context: 'streak_milestone',
      destination: 'paywall',
      milestoneId: 'streak_milestone:7:en',
    },
  },
  {
    id: 'repeated-training',
    icon: 'repeat-outline',
    adminLabel: 'После повторных тренировок',
    adminDescription: 'Повторное использование тренажёра → Plus',
    title: 'Тренировки уже работают',
    body: 'Продолжай закреплять слабые места с персональными повторами.',
    ctaLabel: 'Открыть Plus',
    opportunity: {
      trigger: 'repeated_training',
      value: 1,
      studyTarget: 'en',
      context: 'trainer_repeat_success',
      destination: 'paywall',
      milestoneId: 'repeated_training:1:en',
    },
  },
]);
