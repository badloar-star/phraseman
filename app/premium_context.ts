/**
 * premium_context.ts — единый тип контекста пейвола.
 *
 * Вынесен из premium_modal.tsx, чтобы вспомогательные модули (перцентиль-строка,
 * зеркало прогресса, персонализация) могли типизироваться без импорта тяжёлого
 * экрана с нативными зависимостями.
 *
 * При добавлении нового контекста: добавить значение в union И в
 * PREMIUM_CONTEXT_VALUES — `satisfies` ниже гарантирует, что списки не разойдутся.
 */
export type PremiumContext =
  | 'arena'
  | 'no_energy'
  | 'course_after_lesson3'
  | 'lesson_b1'
  | 'quiz_limit'
  | 'quiz_level'
  | 'quiz_medium'
  | 'quiz_hard'
  | 'flashcard_limit'
  | 'streak'
  | 'theme'
  | 'club'
  /** Trainer premium modes paywall. */
  | 'trainer'
  /** Trainer daily session limit reached. */
  | 'trainer_limit'
  /** Personalized diagnosis training after the one free try. */
  | 'diagnosis_training'
  /** Mastery — повторное прохождение урока за осколки либо безлимит на Premium. */
  | 'mastery'
  /** Стат-экран: heatmap, mistake patterns, percentiles за blur'ом. */
  | 'stats'
  | 'heatmap'
  | 'patterns'
  | 'percentiles'
  | 'personal_plan'
  /** Закончился 72-часовой intro full-access — главный момент конверсии. */
  | 'intro_ended'
  /** After-win апсейл после повышения уровня (план #3). */
  | 'level_up'
  /** Умный микс тренажёра — lock-preview вместо мгновенного редиректа (план #11). */
  | 'smart_trainer'
  | 'generic';

export const PREMIUM_CONTEXT_VALUES = [
  'arena',
  'no_energy',
  'course_after_lesson3',
  'lesson_b1',
  'quiz_limit',
  'quiz_level',
  'quiz_medium',
  'quiz_hard',
  'flashcard_limit',
  'streak',
  'theme',
  'club',
  'trainer',
  'trainer_limit',
  'diagnosis_training',
  'mastery',
  'stats',
  'heatmap',
  'patterns',
  'percentiles',
  'personal_plan',
  'intro_ended',
  'level_up',
  'smart_trainer',
  'generic',
] as const satisfies readonly PremiumContext[];

export const PREMIUM_CONTEXT_SET: ReadonlySet<PremiumContext> = new Set<PremiumContext>(PREMIUM_CONTEXT_VALUES);
