import type { AdminAlertType } from './admin_alert_catalog';

/**
 * зачем: владелец 2026-09-13 попросил уникальный шаблон для КАЖДОГО типа
 * уведомления вместо одного общего каркаса. Раньше покупка Premium выглядела
 * так же, как падение крона: заголовок → «Профиль события» → «Контекст» →
 * «Содержимое события». Здесь описано, чем один тип отличается от другого:
 * эмодзи-герой, своя шапка, тон и порядок блоков.
 *
 * Это ТОЛЬКО раскладка. Ни одно поле отсюда не попадает в сообщение в обход
 * `sanitizeAdminAlertPayload`: шаблон не может напечатать то, что не прошло
 * санитайзер. Макет: docs/design/telegram-alerts/alert-templates-mockup.html
 */

/** Тон письма. Управляет полосой-акцентом и порядком блоков, не содержанием. */
export type AdminAlertMood = 'celebrate' | 'neutral' | 'warn' | 'alarm' | 'digest';

/**
 * Порядок смысловых зон письма. `identity` — кто, `context` — служебные поля,
 * `details` — человеческий текст события. Шаблон решает, что идёт первым:
 * у денег первой идёт сумма, у репорта — цитата, у ошибки — текст ошибки.
 */
export type AdminAlertZone = 'identity' | 'context' | 'details';

export interface AdminAlertTemplate {
  /** Эмодзи-герой: по нему письмо узнаётся в списке чатов без чтения. */
  readonly emoji: string;
  /** Шапка вместо служебного названия типа из каталога. */
  readonly hero: string;
  readonly mood: AdminAlertMood;
  /** Порядок зон. Пустые зоны просто не печатаются. */
  readonly zones: readonly AdminAlertZone[];
  /**
   * Вариант шапки, когда событие значит противоположное: бан сняли, крон
   * поднялся, рассылка упала. Выбирается по `status`/`severity` из payload.
   */
  readonly variants?: Readonly<Record<string, { readonly emoji: string; readonly hero: string; readonly mood: AdminAlertMood }>>;
}

const HUMAN_FIRST: readonly AdminAlertZone[] = ['details', 'identity', 'context'];
const IDENTITY_FIRST: readonly AdminAlertZone[] = ['identity', 'details', 'context'];
const NUMBERS_FIRST: readonly AdminAlertZone[] = ['context', 'details', 'identity'];

export const ADMIN_ALERT_TEMPLATES: Readonly<Record<AdminAlertType, AdminAlertTemplate>> = Object.freeze({
  // ── ЛЮДИ: рост базы, тон праздничный ──
  newUser: { emoji: '🎉', hero: 'НОВЫЙ ЧЕЛОВЕК В PHRASEMAN', mood: 'celebrate', zones: IDENTITY_FIRST },
  referralAttributed: { emoji: '🤝', hero: 'КОД ДРУГА СРАБОТАЛ', mood: 'celebrate', zones: IDENTITY_FIRST },
  referralFirstLaunch: { emoji: '🚀', hero: 'ПРИГЛАШЁННЫЙ ОТКРЫЛ ПРИЛОЖЕНИЕ', mood: 'celebrate', zones: IDENTITY_FIRST },
  referralQualified: { emoji: '✅', hero: 'РЕФЕРАЛ ЗАСЧИТАН', mood: 'celebrate', zones: IDENTITY_FIRST },
  referralRewarded: { emoji: '🎁', hero: 'НАГРАДА ЗА ДРУГА ВЫДАНА', mood: 'celebrate', zones: IDENTITY_FIRST },
  banChanged: {
    emoji: '🔨', hero: 'БАН ВЫДАН', mood: 'alarm', zones: IDENTITY_FIRST,
    // зачем: снятие бана — хорошая новость, её нельзя красить тревогой.
    variants: { unbanned: { emoji: '🕊', hero: 'БАН СНЯТ', mood: 'neutral' } },
  },

  // ── ОБУЧЕНИЕ: ведёт оценка, а не имя ──
  lessonRating: {
    emoji: '⭐', hero: 'ОЦЕНКА УРОКА', mood: 'neutral', zones: HUMAN_FIRST,
    // зачем: единица это сигнал о проблеме, а не статистика.
    variants: { low: { emoji: '⭐', hero: 'НИЗКАЯ ОЦЕНКА УРОКА', mood: 'alarm' } },
  },
  vocabDialogueRating: {
    emoji: '💬', hero: 'ОЦЕНКА ДИАЛОГА', mood: 'neutral', zones: HUMAN_FIRST,
    variants: { low: { emoji: '💬', hero: 'НИЗКАЯ ОЦЕНКА ДИАЛОГА', mood: 'alarm' } },
  },
  arenaRating: {
    emoji: '⚔️', hero: 'ОЦЕНКА АРЕНЫ', mood: 'neutral', zones: HUMAN_FIRST,
    variants: { low: { emoji: '⚔️', hero: 'НИЗКАЯ ОЦЕНКА АРЕНЫ', mood: 'alarm' } },
  },
  lessonCompletionDigest: { emoji: '📚', hero: 'УРОКИ ЗА СУТКИ', mood: 'digest', zones: NUMBERS_FIRST },

  // ── РЕПОРТЫ И ОШИБКИ: ведёт суть проблемы, техника ниже ──
  contentReport: { emoji: '🚩', hero: 'ЖАЛОБА НА КОНТЕНТ', mood: 'alarm', zones: HUMAN_FIRST },
  userReport: { emoji: '⚠️', hero: 'ЖАЛОБА НА ЧЕЛОВЕКА', mood: 'alarm', zones: HUMAN_FIRST },
  ideaOrCommunityReport: { emoji: '📌', hero: 'ЖАЛОБА НА ИДЕЮ ИЛИ НАБОР', mood: 'alarm', zones: HUMAN_FIRST },
  explanationReport: { emoji: '🧩', hero: 'ЖАЛОБА НА ОБЪЯСНЕНИЕ', mood: 'alarm', zones: HUMAN_FIRST },
  criticalError: { emoji: '💥', hero: 'КРИТИЧЕСКАЯ ОШИБКА', mood: 'alarm', zones: HUMAN_FIRST },
  authFailureSpike: { emoji: '🔐', hero: 'ЛЮДИ НЕ МОГУТ ВОЙТИ', mood: 'alarm', zones: NUMBERS_FIRST },
  safetyFlag: { emoji: '🛡', hero: 'ОПАСНЫЙ ТЕКСТ ОТ ПОЛЬЗОВАТЕЛЯ', mood: 'alarm', zones: HUMAN_FIRST },
  appErrorDigest: { emoji: '🐞', hero: 'НОВЫЙ ТИП ОШИБКИ', mood: 'alarm', zones: HUMAN_FIRST },
  complianceRisk: { emoji: '📋', hero: 'КОНТРОЛЬ НЕ ПРОЙДЕН', mood: 'alarm', zones: HUMAN_FIRST },

  // ── ДЕНЬГИ: сумма — главный знак письма ──
  trialStart: { emoji: '🌱', hero: 'НАЧАЛСЯ ПРОБНЫЙ ПЕРИОД', mood: 'celebrate', zones: NUMBERS_FIRST },
  premiumPurchase: { emoji: '💎', hero: 'КУПИЛИ PREMIUM', mood: 'celebrate', zones: NUMBERS_FIRST },
  renewal: { emoji: '🔁', hero: 'ПОДПИСКА ПРОДЛЕНА', mood: 'celebrate', zones: NUMBERS_FIRST },
  // зачем: уход клиента — не авария. Спокойный тон, главное — дата конца доступа.
  cancellation: { emoji: '💔', hero: 'ОТКЛЮЧИЛИ АВТОПРОДЛЕНИЕ', mood: 'warn', zones: IDENTITY_FIRST },
  expiration: { emoji: '🌙', hero: 'ПОДПИСКА ЗАКОНЧИЛАСЬ', mood: 'warn', zones: IDENTITY_FIRST },
  billingIssue: { emoji: '🧾', hero: 'ПЛАТЁЖ НЕ ПРОШЁЛ', mood: 'alarm', zones: NUMBERS_FIRST },
  refund: { emoji: '↩️', hero: 'ВОЗВРАТ ДЕНЕГ', mood: 'alarm', zones: NUMBERS_FIRST },
  refundSpike: { emoji: '🔥', hero: 'ВСПЛЕСК ВОЗВРАТОВ', mood: 'alarm', zones: NUMBERS_FIRST },
  ugcPurchase: { emoji: '🛒', hero: 'КУПИЛИ НАБОР СООБЩЕСТВА', mood: 'celebrate', zones: NUMBERS_FIRST },
  promoGift: { emoji: '🎟', hero: 'ПРОМОКОД АКТИВИРОВАН', mood: 'celebrate', zones: NUMBERS_FIRST },
  revenueDigest: { emoji: '💰', hero: 'ДЕНЬГИ ЗА СУТКИ', mood: 'digest', zones: NUMBERS_FIRST },

  // ── КОНТЕНТ: ведёт голос человека ──
  newIdea: { emoji: '💡', hero: 'ИДЕЯ ОТ ПОЛЬЗОВАТЕЛЯ', mood: 'neutral', zones: HUMAN_FIRST },
  websiteInbox: { emoji: '🌐', hero: 'ПИСЬМО С САЙТА', mood: 'neutral', zones: HUMAN_FIRST },
  supportEmail: { emoji: '✉️', hero: 'ПИСЬМО В ПОДДЕРЖКУ', mood: 'neutral', zones: HUMAN_FIRST },
  ugcSubmission: { emoji: '📦', hero: 'НАБОР ЖДЁТ ПРОВЕРКИ', mood: 'neutral', zones: HUMAN_FIRST },
  surveyDigest: { emoji: '📊', hero: 'ОТВЕТЫ НА ОПРОС', mood: 'digest', zones: NUMBERS_FIRST },
  cancelReason: { emoji: '🗣', hero: 'ПОЧЕМУ ОТМЕНИЛИ', mood: 'warn', zones: HUMAN_FIRST },
  appMessageDigest: { emoji: '👍', hero: 'РЕАКЦИИ НА СООБЩЕНИЕ', mood: 'digest', zones: NUMBERS_FIRST },
  cardPackDigest: { emoji: '🃏', hero: 'КАРТОЧКИ ЗА СУТКИ', mood: 'digest', zones: NUMBERS_FIRST },

  // ── ОПЕРАЦИИ: состояние системы ──
  cronHealth: {
    emoji: '⏰', hero: 'ФОНОВАЯ ЗАДАЧА УПАЛА', mood: 'alarm', zones: HUMAN_FIRST,
    // зачем: восстановление крона — хорошая новость под своей шапкой.
    variants: { recovered: { emoji: '✅', hero: 'ЗАДАЧА ВОССТАНОВИЛАСЬ', mood: 'neutral' } },
  },
  paymentWebhookFailure: { emoji: '💸', hero: 'ПЛАТЁЖ НЕ ДОЕХАЛ', mood: 'alarm', zones: HUMAN_FIRST },
  adminAudit: { emoji: '🔑', hero: 'ДЕЙСТВИЕ В АДМИНКЕ', mood: 'neutral', zones: IDENTITY_FIRST },
  pushJob: {
    emoji: '📣', hero: 'РАССЫЛКА ОТПРАВЛЕНА', mood: 'neutral', zones: NUMBERS_FIRST,
    variants: { error: { emoji: '🚨', hero: 'РАССЫЛКА УПАЛА', mood: 'alarm' } },
  },
  appMessagePublished: { emoji: '📰', hero: 'СООБЩЕНИЕ ОПУБЛИКОВАНО', mood: 'neutral', zones: HUMAN_FIRST },
  jarvisCritical: { emoji: '🤖', hero: 'JARVIS: КРИТИЧНАЯ НАХОДКА', mood: 'alarm', zones: HUMAN_FIRST },
  activityDigest: { emoji: '📈', hero: 'АКТИВНОСТЬ ЗА СУТКИ', mood: 'digest', zones: NUMBERS_FIRST },
  paywallDigest: { emoji: '🚪', hero: 'ВОРОНКА ПЕЙВОЛЛА', mood: 'digest', zones: NUMBERS_FIRST },
  ownerDailyDigest: { emoji: '🌅', hero: 'ИТОГИ ДНЯ', mood: 'digest', zones: NUMBERS_FIRST },
});

/** Полоса-акцент тона. Telegram не даёт цвета, поэтому тон несёт символ. */
const MOOD_MARK: Readonly<Record<AdminAlertMood, string>> = Object.freeze({
  celebrate: '', neutral: '', warn: '', alarm: '', digest: '',
});

/**
 * Шаблон с учётом варианта. Вариант выбирается по уже отсанитайзенным
 * `status`/`severity`/`rating` — сырой payload сюда не доходит.
 */
export function adminAlertTemplate(
  eventType: AdminAlertType,
  signals: { readonly status?: string; readonly rating?: number } = {},
): AdminAlertTemplate {
  const base = ADMIN_ALERT_TEMPLATES[eventType];
  if (!base.variants) return base;

  const status = String(signals.status ?? '').toLowerCase();
  const rating = Number(signals.rating);
  // Низкая оценка важнее статуса: молчать о единице нельзя.
  const key = Number.isFinite(rating) && rating >= 1 && rating <= 2 ? 'low'
    : status && base.variants[status] ? status : '';
  const variant = key ? base.variants[key] : undefined;
  return variant ? { ...base, ...variant } : base;
}

export { MOOD_MARK };
