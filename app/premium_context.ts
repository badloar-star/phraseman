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
  // Игра «Созвездия» (specs/constellations.md C5): апселл Plus в лобби/поиске
  // режима (безлимит игр). Шапка/тексты пейвола — как arena, контекст отдельный
  // для аналитики конверсии режима.
  | 'constellations'
  | 'no_energy'
  | 'course_after_lesson3'
  | 'lesson_b1'
  | 'quiz_limit'
  | 'quiz_level'
  | 'quiz_medium'
  | 'quiz_hard'
  | 'flashcard_limit'
  | 'flashcard_training'
  | 'flashcard_autoplay'
  | 'streak'
  | 'theme'
  | 'club'
  /** Trainer premium modes paywall. */
  | 'trainer'
  /** Trainer daily session limit reached. */
  | 'trainer_limit'
  /** AI dialogue daily free limit reached. */
  | 'dialog_limit'
  | 'dialog_locked_level'
  | 'dialog_analysis'
  | 'ai_voice_input'
  /** Speaking mode — произнести фразу вслух (микрофон + распознавание). */
  | 'speaking'
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
  /** Истёк платный Premium — карточка возврата (EntitlementExpiredHost). */
  | 'premium_expired'
  /** Истёк VIP (реферальный/подарочный) — карточка возврата. */
  | 'vip_expired'
  /** Re-engage пуш-апсейл (intro_expiring / upsell_d4/d7/d14). */
  | 'notification_upsell'
  /** Добавление второго и последующих языков обучения (фри = 1 язык). */
  | 'language_add'
  /** Дневной free-лимит ИИ-разборов (choice/quiz/phrase/mistake) исчерпан. */
  | 'ai_explain'
  /** Недельный обзор: free видит тизер, полный разбор и план — в Plus. */
  | 'weekly_review'
  /** Премиум-аура вокруг аватара (лиги/Арена/друзья). */
  | 'avatar_aura'
  | 'generic';

export const PREMIUM_CONTEXT_VALUES = [
  'arena',
  'constellations',
  'no_energy',
  'course_after_lesson3',
  'lesson_b1',
  'quiz_limit',
  'quiz_level',
  'quiz_medium',
  'quiz_hard',
  'flashcard_limit',
  'flashcard_training',
  'flashcard_autoplay',
  'streak',
  'theme',
  'club',
  'trainer',
  'trainer_limit',
  'dialog_limit',
  'dialog_locked_level',
  'dialog_analysis',
  'ai_voice_input',
  'speaking',
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
  'premium_expired',
  'vip_expired',
  'notification_upsell',
  'language_add',
  'ai_explain',
  'weekly_review',
  'avatar_aura',
  'generic',
] as const satisfies readonly PremiumContext[];

export const PREMIUM_CONTEXT_SET: ReadonlySet<PremiumContext> = new Set<PremiumContext>(PREMIUM_CONTEXT_VALUES);
