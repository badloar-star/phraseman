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
  | 'no_energy'
  | 'course_after_lesson3'
  | 'lesson_b1'
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
  /** Дневной free-лимит ИИ-разборов учебных ответов исчерпан. */
  | 'ai_explain'
  /** Недельный обзор: free видит тизер, полный разбор и план — в Plus. */
  | 'weekly_review'
  /** Премиум-аура вокруг аватара (лиги, друзья и списки сообщества). */
  | 'avatar_aura'
  /** Софт-апсейл на результатах последнего бесплатного урока (раньше падал в generic). */
  | 'free_lessons_complete'
  /** Вернувшийся после 7+ дней неактивности (раньше шёл как streak — обещал спасти сгоревшую серию). */
  | 'winback'
  /** Закончился реферальный/подарочный VIP-доступ (friends; раньше generic). */
  | 'referral_ended'
  | 'generic';

export const PREMIUM_CONTEXT_VALUES = [
  'no_energy',
  'course_after_lesson3',
  'lesson_b1',
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
  'free_lessons_complete',
  'winback',
  'referral_ended',
  'generic',
] as const satisfies readonly PremiumContext[];

export const PREMIUM_CONTEXT_SET: ReadonlySet<PremiumContext> = new Set<PremiumContext>(PREMIUM_CONTEXT_VALUES);
