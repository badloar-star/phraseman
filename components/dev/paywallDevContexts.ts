import {
  PREMIUM_CONTEXT_VALUES,
  type PremiumContext,
} from '../../app/premium_context';

export type DevPaywallContext = Readonly<{
  context: PremiumContext;
  label: string;
}>;

const LABELS: Record<PremiumContext, string> = {
  no_energy: 'Нет энергии',
  onboarding_plan: 'Онбординг',
  season_pass_lane: 'Сезонный трек',
  course_after_lesson3: 'После 3-го урока',
  lesson_b1: 'Урок B1',
  flashcard_limit: 'Лимит карточек',
  flashcard_training: 'Тренировка карточек',
  flashcard_create: 'Создание карточки',
  pack_create: 'Создание набора',
  streak: 'Серия',
  theme: 'Тема',
  club: 'Клуб',
  dialog_limit: 'Лимит диалога',
  dialog_locked_level: 'Уровень диалога',
  dialog_analysis: 'Разбор диалога',
  ai_voice_input: 'Голосовой ввод ИИ',
  speaking: 'Голосовая практика',
  mistake_practice: 'Отработка ошибок',
  mastery: 'Повтор урока',
  stats: 'Статистика',
  heatmap: 'Тепловая карта',
  patterns: 'Паттерны ошибок',
  percentiles: 'Процентили',
  intro_ended: 'Пробный доступ завершён',
  level_up: 'Повышение уровня',
  premium_expired: 'Plus истёк',
  vip_expired: 'VIP истёк',
  notification_upsell: 'Уведомление',
  language_add: 'Дополнительный язык',
  ai_explain: 'Разбор ответа ИИ',
  weekly_review: 'Недельный обзор',
  avatar_aura: 'Аура профиля',
  free_lessons_complete: 'После уроков обычного аккаунта',
  winback: 'Возврат',
  referral_ended: 'Реферальный доступ завершён',
  arena_limit: 'Арена: матч на сегодня сыгран',
  generic: 'Общий',
};

/** Один источник правды для DEV-переключателя контекстов пейвола. */
export const DEV_PAYWALL_CONTEXTS: readonly DevPaywallContext[] = Object.freeze(
  PREMIUM_CONTEXT_VALUES.map((context) => Object.freeze({ context, label: LABELS[context] })),
);

