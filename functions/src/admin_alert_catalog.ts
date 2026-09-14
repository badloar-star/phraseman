export type AdminAlertCategory = 'people' | 'learning' | 'reports' | 'revenue' | 'content' | 'operations';
export type AdminAlertMode = 'instant' | 'digest';

export interface AdminAlertDefinition {
  readonly id: string;
  readonly category: AdminAlertCategory;
  readonly mode: AdminAlertMode;
  readonly label: string;
  readonly required: boolean;
  readonly defaultEnabled: boolean;
}

export const ADMIN_ALERT_CATALOG = Object.freeze([
  { id: 'newUser', category: 'people', mode: 'instant', label: 'Новый пользователь', required: true, defaultEnabled: true },
  { id: 'referralAttributed', category: 'people', mode: 'instant', label: 'Реферальный код применён', required: false, defaultEnabled: true },
  { id: 'referralFirstLaunch', category: 'people', mode: 'instant', label: 'Первый запуск по рефералу подтверждён', required: false, defaultEnabled: true },
  { id: 'referralQualified', category: 'people', mode: 'instant', label: 'Реферал квалифицирован', required: false, defaultEnabled: true },
  { id: 'referralRewarded', category: 'people', mode: 'instant', label: 'Реферальная награда выдана', required: false, defaultEnabled: true },
  { id: 'banChanged', category: 'people', mode: 'instant', label: 'Новый бан или снятие бана', required: false, defaultEnabled: true },

  { id: 'lessonRating', category: 'learning', mode: 'instant', label: 'Новая оценка урока', required: false, defaultEnabled: true },
  { id: 'vocabDialogueRating', category: 'learning', mode: 'instant', label: 'Оценка Vocab или Dialogue', required: false, defaultEnabled: true },
  { id: 'arenaRating', category: 'learning', mode: 'instant', label: 'Оценка Arena', required: false, defaultEnabled: true },
  { id: 'lessonCompletionDigest', category: 'learning', mode: 'digest', label: 'Завершения уроков', required: false, defaultEnabled: true },

  { id: 'contentReport', category: 'reports', mode: 'instant', label: 'Новый репорт контента', required: false, defaultEnabled: true },
  { id: 'userReport', category: 'reports', mode: 'instant', label: 'Новый репорт на пользователя', required: false, defaultEnabled: true },
  { id: 'ideaOrCommunityReport', category: 'reports', mode: 'instant', label: 'Репорт идеи или Community Pack', required: false, defaultEnabled: true },
  { id: 'explanationReport', category: 'reports', mode: 'instant', label: 'Репорт объяснения / автоотключение', required: false, defaultEnabled: true },
  { id: 'criticalError', category: 'reports', mode: 'instant', label: 'Критическая ошибка приложения', required: false, defaultEnabled: true },
  { id: 'authFailureSpike', category: 'reports', mode: 'instant', label: 'Всплеск ошибок входа', required: false, defaultEnabled: true },
  { id: 'safetyFlag', category: 'reports', mode: 'instant', label: 'Safety-флаг', required: false, defaultEnabled: true },
  { id: 'appErrorDigest', category: 'reports', mode: 'instant', label: 'Новый App Error', required: false, defaultEnabled: true },
  { id: 'complianceRisk', category: 'reports', mode: 'instant', label: 'Новый compliance-риск', required: false, defaultEnabled: true },

  { id: 'trialStart', category: 'revenue', mode: 'instant', label: 'Старт пробного периода', required: false, defaultEnabled: true },
  { id: 'premiumPurchase', category: 'revenue', mode: 'instant', label: 'Новая покупка Premium', required: false, defaultEnabled: true },
  { id: 'renewal', category: 'revenue', mode: 'instant', label: 'Продление подписки', required: false, defaultEnabled: true },
  { id: 'cancellation', category: 'revenue', mode: 'instant', label: 'Отмена автопродления', required: false, defaultEnabled: true },
  { id: 'expiration', category: 'revenue', mode: 'instant', label: 'Истечение подписки', required: false, defaultEnabled: true },
  { id: 'billingIssue', category: 'revenue', mode: 'instant', label: 'Проблема оплаты', required: false, defaultEnabled: true },
  { id: 'refund', category: 'revenue', mode: 'instant', label: 'Возврат средств', required: false, defaultEnabled: true },
  { id: 'refundSpike', category: 'revenue', mode: 'instant', label: 'Серийный возврат / всплеск отмен', required: false, defaultEnabled: true },
  { id: 'ugcPurchase', category: 'revenue', mode: 'instant', label: 'Покупка или возврат Community Pack', required: false, defaultEnabled: true },
  { id: 'promoGift', category: 'revenue', mode: 'instant', label: 'Промокод или подарочный сертификат', required: false, defaultEnabled: true },
  { id: 'revenueDigest', category: 'revenue', mode: 'digest', label: 'Денежная сводка', required: false, defaultEnabled: true },

  { id: 'newIdea', category: 'content', mode: 'instant', label: 'Новая идея пользователя', required: false, defaultEnabled: true },
  { id: 'websiteInbox', category: 'content', mode: 'instant', label: 'Сообщение с сайта', required: false, defaultEnabled: true },
  { id: 'supportEmail', category: 'content', mode: 'instant', label: 'Новое письмо поддержки', required: false, defaultEnabled: true },
  { id: 'ugcSubmission', category: 'content', mode: 'instant', label: 'Новый Community Pack на модерации', required: false, defaultEnabled: true },
  { id: 'surveyDigest', category: 'content', mode: 'digest', label: 'Ответ на опрос', required: false, defaultEnabled: true },
  { id: 'cancelReason', category: 'content', mode: 'instant', label: 'Новая причина отмены', required: false, defaultEnabled: true },
  { id: 'appMessageDigest', category: 'content', mode: 'digest', label: 'Реакции на сообщение приложения', required: false, defaultEnabled: true },
  { id: 'cardPackDigest', category: 'content', mode: 'digest', label: 'Сохранения и покупки Card Packs', required: false, defaultEnabled: true },

  { id: 'cronHealth', category: 'operations', mode: 'instant', label: 'Крон упал или восстановился', required: false, defaultEnabled: true },
  { id: 'paymentWebhookFailure', category: 'operations', mode: 'instant', label: 'Платёжный webhook не обработан', required: false, defaultEnabled: true },
  { id: 'adminAudit', category: 'operations', mode: 'instant', label: 'Изменение администратором', required: false, defaultEnabled: true },
  { id: 'pushJob', category: 'operations', mode: 'instant', label: 'Push-рассылка завершена или упала', required: false, defaultEnabled: true },
  { id: 'appMessagePublished', category: 'operations', mode: 'instant', label: 'App Message опубликовано', required: false, defaultEnabled: true },
  { id: 'jarvisCritical', category: 'operations', mode: 'instant', label: 'Jarvis нашёл критичную проблему', required: false, defaultEnabled: true },
  { id: 'activityDigest', category: 'operations', mode: 'digest', label: 'Активные пользователи и запуски', required: false, defaultEnabled: true },
  { id: 'paywallDigest', category: 'operations', mode: 'digest', label: 'Paywall funnel', required: false, defaultEnabled: true },
  { id: 'ownerDailyDigest', category: 'operations', mode: 'digest', label: 'Ежедневный дайджест владельца', required: false, defaultEnabled: true },
] as const satisfies readonly AdminAlertDefinition[]);

export type AdminAlertType = (typeof ADMIN_ALERT_CATALOG)[number]['id'];

export const ADMIN_ALERT_IDS = Object.freeze(
  ADMIN_ALERT_CATALOG.map((definition) => definition.id),
) as readonly AdminAlertType[];

export const LEGACY_ADMIN_ALERT_TYPE_ALIASES = Object.freeze({
  userReport: 'userReport',
  ideaReport: 'ideaOrCommunityReport',
  criticalError: 'criticalError',
  contentReportDigest: 'contentReport',
  cancelRefundSpike: 'refundSpike',
  safetyFlag: 'safetyFlag',
  authFailureSpike: 'authFailureSpike',
  serialRefunder: 'refundSpike',
  explanationRetired: 'explanationReport',
} as const satisfies Readonly<Record<string, AdminAlertType>>);

const ADMIN_ALERT_ID_SET: ReadonlySet<string> = new Set(ADMIN_ALERT_IDS);

export function isAdminAlertType(value: unknown): value is AdminAlertType {
  return typeof value === 'string' && ADMIN_ALERT_ID_SET.has(value);
}

export function canonicalAdminAlertType(value: unknown): AdminAlertType | null {
  if (isAdminAlertType(value)) return value;
  if (typeof value !== 'string') return null;
  return LEGACY_ADMIN_ALERT_TYPE_ALIASES[value as keyof typeof LEGACY_ADMIN_ALERT_TYPE_ALIASES] ?? null;
}

export function adminAlertDefinition(type: AdminAlertType): (typeof ADMIN_ALERT_CATALOG)[number] {
  const definition = ADMIN_ALERT_CATALOG.find((item) => item.id === type);
  if (!definition) throw new Error(`unknown_admin_alert_type:${type}`);
  return definition;
}
