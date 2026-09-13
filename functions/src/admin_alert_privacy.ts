import { adminAlertDefinition, type AdminAlertType } from './admin_alert_catalog';
import { adminAlertTemplate, type AdminAlertZone } from './admin_alert_templates';

export interface AdminAlertSafePayload {
  readonly platform?: string;
  readonly language?: string;
  readonly source?: string;
  readonly nickname?: string;
  readonly uidLast4?: string;
  readonly rating?: number;
  readonly category?: string;
  readonly severity?: string;
  readonly provider?: string;
  readonly product?: string;
  readonly environment?: string;
  readonly appVersion?: string;
  readonly buildNumber?: string;
  readonly versionContext?: string;
  readonly relatedNickname?: string;
  readonly relatedRole?: string;
  readonly details?: readonly AdminAlertDetail[];
  readonly amount?: number;
  readonly currency?: string;
  readonly status?: string;
  readonly count?: number;
  readonly route?: string;
  readonly windowStartMs?: number;
  readonly windowEndMs?: number;
  readonly metrics?: readonly AdminAlertDigestMetric[];
}

export interface AdminAlertDetail {
  readonly label: string;
  readonly value: string;
}

// Explicit owner-approved content. Never serialize arbitrary source documents,
// diagnostic timelines, credentials, or account/payment identifiers.
export const ADMIN_ALERT_DETAIL_LABELS = Object.freeze([
  'Текст репорта', 'Отзыв', 'Причина', 'Комментарий', 'Контент', 'Ответ пользователя',
  'Экран', 'Контекст', 'Ошибка', 'Сообщение ошибки', 'Стек ошибки', 'Устройство',
  'ОС', 'Уровень', 'XP', 'Стрик', 'Дней в приложении', 'Доступ', 'Название',
  'Описание', 'Сообщение', 'Тема', 'Отправитель', 'Страница', 'Урок / сессия',
  'Набор', 'Карточек', 'Язык обучения', 'Тип изменения', 'Пригласивший',
  'Награда', 'Период подписки', 'Окончание подписки', 'Автопродление',
  'Причина отмены', 'Причина истечения', 'Причина возврата', 'Число продлений',
  'Администратор', 'Действие', 'Объект', 'Результат', 'Аудитория', 'Доставлено',
  'Не доставлено', 'Цель рассылки', 'Вопрос', 'Варианты ответа', 'Контроль',
  'Проблема', 'Рекомендация', 'Обоснование', 'Длительность', 'Повторов',
  'Порог', 'Стадии входа', 'Фраза', 'Количество репортов', 'Автоотключение',
  'Категория безопасности', 'Текст пользователя', 'Ник в событии',
] as const);

const COMMON_DETAIL_LABELS = ['Экран', 'Устройство', 'ОС', 'Язык обучения', 'Ник в событии'];
const MONEY_DETAIL_LABELS = ['Период подписки', 'Причина отмены', 'Причина истечения', 'Причина возврата', 'Число продлений', 'Автопродление', 'Окончание подписки'];
const RATING_DETAIL_LABELS = ['Отзыв', 'Урок / сессия'];
const ERROR_DETAIL_LABELS = ['Ошибка', 'Сообщение ошибки', 'Контекст', 'Стек ошибки', 'Повторов'];
const REFERRAL_DETAIL_LABELS = ['Награда'];
const DETAIL_POLICY: Partial<Readonly<Record<AdminAlertType, readonly string[]>>> = Object.freeze({
  contentReport: ['Текст репорта', 'Контент', 'Ответ пользователя', 'Уровень', 'XP', 'Стрик', 'Дней в приложении', 'Доступ'],
  userReport: ['Причина', 'Комментарий', 'Название'], ideaOrCommunityReport: ['Причина', 'Комментарий', 'Название'],
  lessonRating: RATING_DETAIL_LABELS, vocabDialogueRating: RATING_DETAIL_LABELS, arenaRating: RATING_DETAIL_LABELS,
  criticalError: ERROR_DETAIL_LABELS, appErrorDigest: ERROR_DETAIL_LABELS, paymentWebhookFailure: ERROR_DETAIL_LABELS,
  newIdea: ['Название', 'Описание', 'Обоснование', 'Сообщение'], websiteInbox: ['Отправитель', 'Тема', 'Сообщение', 'Страница'],
  supportEmail: ['Отправитель', 'Тема', 'Сообщение'], cancelReason: ['Причина отмены', 'Комментарий'],
  ugcSubmission: ['Набор', 'Описание', 'Тип изменения', 'Карточек'], ugcPurchase: ['Набор', 'Описание', 'Причина возврата'],
  cardPackDigest: ['Набор', 'Описание'], trialStart: MONEY_DETAIL_LABELS, premiumPurchase: MONEY_DETAIL_LABELS,
  renewal: MONEY_DETAIL_LABELS, cancellation: MONEY_DETAIL_LABELS, expiration: MONEY_DETAIL_LABELS,
  billingIssue: MONEY_DETAIL_LABELS, refund: MONEY_DETAIL_LABELS, promoGift: MONEY_DETAIL_LABELS,
  banChanged: ['Причина'], referralAttributed: REFERRAL_DETAIL_LABELS, referralFirstLaunch: REFERRAL_DETAIL_LABELS,
  referralQualified: REFERRAL_DETAIL_LABELS, referralRewarded: REFERRAL_DETAIL_LABELS,
  safetyFlag: ['Категория безопасности', 'Текст пользователя', 'Контекст'],
  explanationReport: ['Фраза', 'Причина', 'Комментарий', 'Контент', 'Ответ пользователя', 'Количество репортов', 'Автоотключение'],
  cronHealth: ['Ошибка', 'Длительность'], adminAudit: ['Действие', 'Объект', 'Причина', 'Результат'],
  pushJob: ['Название', 'Сообщение', 'Аудитория', 'Доставлено', 'Цель рассылки', 'Не доставлено', 'Ошибка'],
  appMessagePublished: ['Название', 'Сообщение', 'Вопрос', 'Варианты ответа'],
  jarvisCritical: ['Вопрос', 'Проблема', 'Обоснование', 'Рекомендация'], complianceRisk: ['Контроль', 'Проблема'],
  authFailureSpike: ['Порог', 'Стадии входа'], refundSpike: ['Порог', 'Повторов'],
});

export interface AdminAlertDigestMetric {
  readonly eventType: AdminAlertType;
  readonly count: number;
  readonly available?: boolean;
}

export interface AdminAlertMessageInput {
  readonly eventType: AdminAlertType;
  readonly occurredAtMs: number;
  readonly payload: AdminAlertSafePayload;
}

type SafePayloadKey = Exclude<keyof AdminAlertSafePayload, 'metrics' | 'details'>;
const COMMON_FIELDS: readonly SafePayloadKey[] = ['nickname', 'appVersion', 'buildNumber', 'versionContext', 'platform', 'language', 'relatedNickname', 'relatedRole'];

const PEOPLE_REFERRAL_FIELDS = ['platform', 'language', 'source', 'uidLast4', 'status', 'route'] as const;
const RATING_FIELDS = ['rating', 'category', 'uidLast4', 'route'] as const;
const REPORT_FIELDS = ['category', 'severity', 'platform', 'uidLast4', 'count', 'route'] as const;
const APP_ERROR_FIELDS = ['category', 'severity', 'platform', 'appVersion', 'nickname', 'uidLast4', 'route'] as const;
const REVENUE_FIELDS = ['provider', 'product', 'environment', 'amount', 'currency', 'uidLast4', 'status', 'count', 'route'] as const;
const CONTENT_FIELDS = ['category', 'status', 'count', 'uidLast4', 'route'] as const;
const OPS_FIELDS = ['category', 'severity', 'environment', 'status', 'count', 'route'] as const;

const SAFE_FIELD_POLICY: Readonly<Record<AdminAlertType, readonly SafePayloadKey[]>> = Object.freeze({
  newUser: ['platform', 'language', 'source', 'nickname', 'uidLast4', 'route'],
  referralAttributed: PEOPLE_REFERRAL_FIELDS,
  referralFirstLaunch: PEOPLE_REFERRAL_FIELDS,
  referralQualified: PEOPLE_REFERRAL_FIELDS,
  referralRewarded: PEOPLE_REFERRAL_FIELDS,
  banChanged: ['status', 'uidLast4', 'route'],

  lessonRating: RATING_FIELDS,
  vocabDialogueRating: RATING_FIELDS,
  arenaRating: RATING_FIELDS,
  lessonCompletionDigest: ['count', 'status', 'route'],

  contentReport: REPORT_FIELDS,
  userReport: REPORT_FIELDS,
  ideaOrCommunityReport: REPORT_FIELDS,
  explanationReport: REPORT_FIELDS,
  criticalError: APP_ERROR_FIELDS,
  authFailureSpike: REPORT_FIELDS,
  safetyFlag: REPORT_FIELDS,
  appErrorDigest: APP_ERROR_FIELDS,
  complianceRisk: REPORT_FIELDS,

  trialStart: REVENUE_FIELDS,
  premiumPurchase: REVENUE_FIELDS,
  renewal: REVENUE_FIELDS,
  cancellation: REVENUE_FIELDS,
  expiration: REVENUE_FIELDS,
  billingIssue: REVENUE_FIELDS,
  refund: REVENUE_FIELDS,
  refundSpike: REVENUE_FIELDS,
  ugcPurchase: REVENUE_FIELDS,
  promoGift: REVENUE_FIELDS,
  revenueDigest: REVENUE_FIELDS,

  newIdea: CONTENT_FIELDS,
  websiteInbox: CONTENT_FIELDS,
  supportEmail: CONTENT_FIELDS,
  ugcSubmission: CONTENT_FIELDS,
  surveyDigest: CONTENT_FIELDS,
  cancelReason: CONTENT_FIELDS,
  appMessageDigest: CONTENT_FIELDS,
  cardPackDigest: CONTENT_FIELDS,

  cronHealth: OPS_FIELDS,
  paymentWebhookFailure: OPS_FIELDS,
  adminAudit: OPS_FIELDS,
  pushJob: OPS_FIELDS,
  appMessagePublished: OPS_FIELDS,
  jarvisCritical: OPS_FIELDS,
  activityDigest: OPS_FIELDS,
  paywallDigest: OPS_FIELDS,
  ownerDailyDigest: ['count', 'windowStartMs', 'windowEndMs', 'route'],
});

const FIELD_LABELS: Readonly<Record<Exclude<SafePayloadKey, 'currency' | 'route'>, string>> = Object.freeze({
  platform: 'Платформа',
  language: 'Язык',
  source: 'Источник',
  nickname: 'Пользователь',
  uidLast4: 'ID',
  rating: 'Оценка',
  category: 'Категория',
  severity: 'Важность',
  provider: 'Провайдер',
  product: 'Продукт',
  environment: 'Среда',
  appVersion: 'Версия приложения',
  buildNumber: 'Сборка',
  versionContext: 'Источник версии',
  relatedNickname: 'Связанный пользователь',
  relatedRole: 'Роль',
  amount: 'Сумма',
  status: 'Статус',
  count: 'Количество',
  windowStartMs: 'Начало окна',
  windowEndMs: 'Конец окна',
});

export function escapeTelegramHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function maskId(value: unknown): string {
  const compact = String(value ?? '').replace(/[^A-Za-z0-9]/g, '');
  const suffix = compact.slice(-4);
  return suffix ? `••••${suffix}` : '';
}

export function sanitizePublicNickname(value: unknown): string {
  if (typeof value !== 'string') return '';
  const nickname = value.normalize('NFKC').replace(/\s+/g, ' ').trim();
  // Same display-name shape as nameReserve: numbered nicknames contain spaces.
  if (nickname.length < 2 || nickname.length > 32 || /[\r\n\t@#\u0000-\u001f]/.test(value)
    || /https?:\/\/|www\./i.test(nickname)) return '';
  return nickname;
}

export function redactAdminAlertText(value: string): string {
  return value
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[закрытый ключ скрыт]')
    .replace(/\b(?:Bearer|Basic)\s+[A-Za-z0-9._~+\/=-]+/gi, '[авторизация скрыта]')
    .replace(/\b(?:sk|rk)-(?:proj-)?[A-Za-z0-9_-]{16,}/g, '[ключ скрыт]')
    .replace(/\b(?:(?:sk|rk)_(?:live|test)_|whsec_)[A-Za-z0-9_-]+/g, '[ключ скрыт]')
    .replace(/\b\d{6,12}:[A-Za-z0-9_-]{25,}\b/g, '[токен скрыт]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[JWT скрыт]')
    .replace(/([a-z][a-z0-9+.-]*:\/\/)[^\s/@:]+:[^\s/@]+@/gi, '$1[данные входа скрыты]@')
    .replace(/([?&](?:token|key|secret|signature|code|x-amz-signature|x-goog-signature|access_token|api_key)=)[^\s&#]*/gi, '$1[скрыто]')
    .replace(/\b(?:set-cookie|cookie)\s*:[^\r\n]*/gi, 'Cookie: [скрыто]')
    .replace(/(\b[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|ACCESS_KEY|API_KEY)[A-Z0-9_]*\s*=\s*)[^\r\n]+/g, '$1[скрыто]')
    .replace(/(["']?(?:password|passwd|authorization|api[_-]?key|(?:access|refresh)[_-]?token|(?:client|webhook)[_-]?secret|activation[_-]?code|cookie|session(?:[_-]?(?:id|token))?)["']?\s*[=:]\s*)(?:"[^"]*"|'[^']*'|[^\r\n"'&,;}]+)/gi, '$1[скрыто]')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');
}

function safeToken(value: unknown, max = 64): string {
  const token = String(value ?? '').trim().slice(0, max);
  if (!token || !/^[\p{L}\p{N}_ .:/+()-]+$/u.test(token)) return '';
  return token;
}

function safeRoute(value: unknown): string {
  const route = String(value ?? '').trim();
  if (route.length > 160) return '';
  if (/^#[a-z0-9_-]+$/i.test(route)) return `/legacy.html${route}`;
  if (/^\/legacy\.html#[a-z0-9_-]+$/i.test(route)) return route;
  return '';
}

function idSuffix(value: unknown): string {
  return String(value ?? '').replace(/[^A-Za-z0-9]/g, '').slice(-4);
}

export function sanitizeAdminAlertPayload(
  eventType: AdminAlertType,
  input: unknown,
): AdminAlertSafePayload {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return Object.freeze({});
  const source = input as Record<string, unknown>;
  const sanitized: Record<string, string | number | readonly AdminAlertDigestMetric[] | readonly AdminAlertDetail[]> = {};
  for (const key of new Set([...COMMON_FIELDS, ...SAFE_FIELD_POLICY[eventType]])) {
    const value = source[key];
    if (value === undefined || value === null) continue;
    if (key === 'nickname' || key === 'relatedNickname') {
      const nickname = sanitizePublicNickname(value);
      if (nickname) sanitized[key] = nickname;
      continue;
    }
    if (key === 'uidLast4') {
      const suffix = idSuffix(value);
      if (suffix) sanitized.uidLast4 = suffix;
      continue;
    }
    if (key === 'rating') {
      const rating = Number(value);
      if (Number.isInteger(rating) && rating >= 1 && rating <= 5) sanitized.rating = rating;
      continue;
    }
    if (key === 'amount') {
      const amount = Number(value);
      if (Number.isFinite(amount) && amount >= 0 && amount <= 1_000_000_000) sanitized.amount = amount;
      continue;
    }
    if (key === 'count') {
      const count = Number(value);
      if (Number.isSafeInteger(count) && count >= 0) sanitized.count = count;
      continue;
    }
    if (key === 'windowStartMs' || key === 'windowEndMs') {
      const timestamp = Number(value);
      if (Number.isSafeInteger(timestamp) && timestamp > 0) sanitized[key] = timestamp;
      continue;
    }
    if (key === 'currency') {
      const currency = String(value).trim().toUpperCase();
      if (/^[A-Z]{3,5}$/.test(currency)) sanitized.currency = currency;
      continue;
    }
    if (key === 'route') {
      const route = safeRoute(value);
      if (route) sanitized.route = route;
      continue;
    }
    const token = safeToken(value);
    if (token) sanitized[key] = token;
  }
  if (eventType !== 'ownerDailyDigest' && Array.isArray(source.details)) {
    let remaining = 60_000;
    sanitized.details = Object.freeze(source.details.slice(0, 28).flatMap((item: unknown) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const { label, value } = item as Record<string, unknown>;
      const allowed = [...COMMON_DETAIL_LABELS, ...(DETAIL_POLICY[eventType] ?? [])];
      if (!allowed.includes(String(label)) || typeof value !== 'string') return [];
      const cleaned = redactAdminAlertText(value).trim();
      if (!cleaned) return [];
      if (remaining <= 0) return [{ label: String(label), value: '[Лимит пересылки текста — остальные данные в админке]' }];
      const limit = Math.min(50_000, remaining);
      let prefix = cleaned.slice(0, limit);
      if (/[\uD800-\uDBFF]$/.test(prefix)) prefix = prefix.slice(0, -1);
      remaining -= prefix.length;
      const bounded = cleaned.length <= limit ? cleaned : `${prefix}\n[Лимит пересылки текста — продолжение в админке]`;
      return [Object.freeze({ label: String(label), value: bounded })];
    }));
  }
  if (eventType === 'ownerDailyDigest' && Array.isArray(source.metrics)) {
    const metrics: AdminAlertDigestMetric[] = [];
    const seen = new Set<AdminAlertType>();
    for (const rawMetric of source.metrics.slice(0, 47)) {
      if (typeof rawMetric !== 'object' || rawMetric === null || Array.isArray(rawMetric)) continue;
      const metric = rawMetric as Record<string, unknown>;
      const eventTypeValue = String(metric.eventType ?? '') as AdminAlertType;
      const count = Number(metric.count);
      try {
        adminAlertDefinition(eventTypeValue);
      } catch {
        continue;
      }
      if (eventTypeValue === 'ownerDailyDigest' || seen.has(eventTypeValue)) continue;
      if (!Number.isSafeInteger(count) || count < 0) continue;
      seen.add(eventTypeValue);
      metrics.push(Object.freeze({ eventType: eventTypeValue, count, ...(metric.available === false ? {available: false} : {}) }));
    }
    sanitized.metrics = Object.freeze(metrics);
  }
  return Object.freeze(sanitized) as AdminAlertSafePayload;
}

function formatField(key: SafePayloadKey, payload: AdminAlertSafePayload): string | null {
  const value = payload[key];
  if (value === undefined || value === null) return null;

  if (key === 'route') {
    const route = safeRoute(value);
    return route ? `<a href="https://phraseman-ea0b3.web.app${escapeTelegramHtml(route)}">Открыть в админке</a>` : null;
  }
  if (key === 'currency') return null;
  if (key === 'nickname') {
    const nickname = sanitizePublicNickname(value);
    return nickname ? `${FIELD_LABELS.nickname}: <b>${escapeTelegramHtml(nickname)}</b>` : null;
  }
  if (key === 'uidLast4') {
    return null;
  }
  if (key === 'rating') {
    const rating = Number(value);
    return Number.isInteger(rating) && rating >= 1 && rating <= 5 ? `${FIELD_LABELS.rating}: ${rating}/5` : null;
  }
  if (key === 'amount') {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000_000) return null;
    const currency = /^[A-Z]{3,5}$/.test(String(payload.currency ?? '').trim().toUpperCase())
      ? String(payload.currency).trim().toUpperCase()
      : '';
    return `${FIELD_LABELS.amount}: <b>${amount.toFixed(2)}${currency ? ` ${currency}` : ''}</b>`;
  }
  if (key === 'count') {
    const count = Number(value);
    return Number.isSafeInteger(count) && count >= 0 ? `${FIELD_LABELS.count}: <b>${count}</b>` : null;
  }
  if (key === 'windowStartMs' || key === 'windowEndMs') return null;

  const token = safeToken(value);
  return token ? `${FIELD_LABELS[key]}: <b>${escapeTelegramHtml(token)}</b>` : null;
}

const DIGEST_CATEGORY_LABELS = Object.freeze({
  people: 'Люди и рефералы',
  learning: 'Обучение',
  reports: 'Репорты и ошибки',
  revenue: 'Деньги и подписки',
  content: 'Контент и обратная связь',
  operations: 'Операции',
} as const);

function formatIrelandTime(timestampMs: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Dublin',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(timestampMs));
}

function renderOwnerDailyDigest(payload: AdminAlertSafePayload): string {
  const startMs = Number(payload.windowStartMs);
  const endMs = Number(payload.windowEndMs);
  const metrics = Array.isArray(payload.metrics) ? payload.metrics : [];
  const total = Number.isSafeInteger(payload.count) && Number(payload.count) >= 0 ? Number(payload.count) : 0;
  // зачем: дайджест рендерится отдельной веткой и раньше оставался без шапки-героя.
  // Берём её из той же таблицы шаблонов, иначе он выпадает из общего стандарта.
  const template = adminAlertTemplate('ownerDailyDigest');
  const lines = [
    `${template.emoji} <b>${escapeTelegramHtml(template.hero)}</b>`,
    `Событий с отдельными уведомлениями: <b>${total}</b>`,
    Number.isFinite(startMs) && Number.isFinite(endMs)
      ? `<code>${escapeTelegramHtml(formatIrelandTime(startMs))} → ${escapeTelegramHtml(formatIrelandTime(endMs))}</code>`
      : 'Окно: 20:00 → 20:00',
  ];
  for (const category of Object.keys(DIGEST_CATEGORY_LABELS) as Array<keyof typeof DIGEST_CATEGORY_LABELS>) {
    const categoryMetrics = metrics.filter((metric) => adminAlertDefinition(metric.eventType).category === category);
    if (categoryMetrics.length === 0) continue;
    lines.push('', `<b>${DIGEST_CATEGORY_LABELS[category]}</b>`);
    for (const metric of categoryMetrics) {
      lines.push(`• ${escapeTelegramHtml(adminAlertDefinition(metric.eventType).label)}: <b>${metric.available === false ? 'нет серверных данных' : metric.count}</b>`);
    }
  }
  const route = safeRoute(payload.route);
  if (route) lines.push('', `<a href="https://phraseman-ea0b3.web.app${escapeTelegramHtml(route)}">Открыть в админке</a>`);
  return lines.join('\n');
}

const QUOTE_DETAIL_LABELS = new Set([
  'Текст репорта', 'Отзыв', 'Комментарий', 'Контент', 'Ответ пользователя',
  'Сообщение', 'Описание', 'Обоснование', 'Проблема', 'Рекомендация',
  'Причина', 'Причина отмены', 'Причина возврата', 'Текст пользователя',
]);

const CODE_DETAIL_LABELS = new Set(['Стек ошибки', 'Сообщение ошибки', 'Контекст', 'Экран', 'Урок / сессия']);
const COLLAPSIBLE_DETAIL_LABELS = new Set(['Стек ошибки']);

const PRIORITY_LABELS: Readonly<Record<string, string>> = Object.freeze({
  critical: 'КРИТИЧНО', high: 'ВЫСОКИЙ ПРИОРИТЕТ', medium: 'СРЕДНИЙ ПРИОРИТЕТ', low: 'НИЗКИЙ ПРИОРИТЕТ',
});

function renderDetailBlock(detail: AdminAlertDetail, continuation: number): string {
  const label = `${escapeTelegramHtml(detail.label)}${continuation ? ' (продолжение)' : ''}`;
  // `escapedTextChunks` has already escaped the value and deliberately splits
  // on the escaped length so entities cannot be cut in half.
  const text = detail.value;
  if (CODE_DETAIL_LABELS.has(detail.label)) {
    const code = `<pre>${text}</pre>`;
    return COLLAPSIBLE_DETAIL_LABELS.has(detail.label)
      // Telegram disallows nesting `pre` inside `blockquote`; the expandable
      // variant therefore keeps the escaped stack text plain and valid.
      ? `<b>${label}:</b>\n<blockquote expandable>${text}</blockquote>`
      : `<b>${label}:</b>\n${code}`;
  }
  if (QUOTE_DETAIL_LABELS.has(detail.label)) return `<b>${label}:</b>\n<blockquote>${text}</blockquote>`;
  return `<b>${label}:</b>\n<code>${text}</code>`;
}

export function renderAdminAlertMessage(input: AdminAlertMessageInput): string {
  return renderAdminAlertMessages(input)[0];
}

/** Split raw text BEFORE escaping; every chunk remains valid Telegram HTML. */
function escapedTextChunks(value: string, maxLength: number): string[] {
  const result: string[] = [];
  let chunk = '';
  for (const character of value) {
    const escaped = escapeTelegramHtml(character);
    if (chunk.length + escaped.length > maxLength) { result.push(chunk); chunk = ''; }
    chunk += escaped;
  }
  if (chunk) result.push(chunk);
  return result;
}

/**
 * Строка «кто это был». Пустые поля НЕ печатаются: владелец 2026-09-13 убрал
 * заглушки «ник не найден» и «не передана клиентом» — они занимали место и
 * ничего не сообщали. Нет ника — нет строки.
 */
function renderIdentity(payload: AdminAlertSafePayload): string {
  const version = payload.appVersion && !/^(unknown|undefined|null|\?|0)$/i.test(payload.appVersion)
    ? payload.appVersion : '';
  const build = version && payload.buildNumber ? ` (${escapeTelegramHtml(payload.buildNumber)})` : '';
  // Ник — только из серверного поиска профиля, никогда из клиентского payload.
  const who = payload.nickname ? `<b>${escapeTelegramHtml(payload.nickname)}</b>` : '';
  const device = [payload.platform ? escapeTelegramHtml(payload.platform) : '',
    version ? `v${escapeTelegramHtml(version)}${build}` : ''].filter(Boolean).join(' · ');
  const lines = [[who, device].filter(Boolean).join(' · ')].filter(Boolean);
  if (payload.relatedNickname) {
    lines.push(`<blockquote>${escapeTelegramHtml(payload.relatedRole || 'Связанный пользователь')}: <b>${escapeTelegramHtml(payload.relatedNickname)}</b></blockquote>`);
  }
  return lines.join('\n');
}

export function renderAdminAlertMessages(input: AdminAlertMessageInput): readonly string[] {
  const payload = sanitizeAdminAlertPayload(input.eventType, input.payload);
  if (input.eventType === 'ownerDailyDigest') return [renderOwnerDailyDigest(payload)];
  // зачем: у каждого типа свой герой и свой порядок блоков — покупка Premium
  // больше не выглядит как падение крона. Раскладка не может обойти санитайзер.
  const template = adminAlertTemplate(input.eventType, { status: payload.status, rating: payload.rating });
  const priority = payload.severity ? PRIORITY_LABELS[payload.severity.toLowerCase()] ?? payload.severity.toUpperCase() : '';
  // зачем: владелец просил, чтобы деньги читались с одного взгляда. Сумма —
  // главный знак письма, поэтому она стоит сразу под шапкой, а не теряется
  // среди служебных полей вроде провайдера и продукта.
  const headline = formatField('amount', payload);
  const header = [`${template.emoji} <b>${escapeTelegramHtml(template.hero)}</b>`,
    ...(priority ? [`<code>◆ ${escapeTelegramHtml(priority)}</code>`] : []),
    ...(headline ? [headline] : []),
  ].join('\n');

  const metadata: string[] = [];
  for (const field of new Set<SafePayloadKey>([...SAFE_FIELD_POLICY[input.eventType], 'language'])) {
    if (['nickname', 'uidLast4', 'appVersion', 'buildNumber', 'platform', 'route', 'versionContext',
      'relatedNickname', 'relatedRole', 'severity',
      // Сумма уже в шапке — второй раз её печатать не нужно.
      ...(headline ? ['amount', 'currency'] : [])].includes(field)) continue;
    const rendered = formatField(field, payload);
    if (rendered) metadata.push(rendered);
  }

  const identity = renderIdentity(payload);
  const detailBlocks: string[] = [];
  for (const detail of payload.details ?? []) {
    escapedTextChunks(detail.value, 2000).forEach((chunk, index) => {
      detailBlocks.push(renderDetailBlock({ ...detail, value: chunk }, index));
    });
  }

  // Порядок зон задаёт шаблон: у денег первыми идут цифры, у репорта — цитата.
  const zones: Readonly<Record<AdminAlertZone, readonly string[]>> = {
    identity: [],
    context: metadata.length > 0 ? [`<blockquote>${metadata.join('\n')}</blockquote>`] : [],
    details: detailBlocks,
  };
  const blocks: string[] = template.zones.flatMap((zone: AdminAlertZone) => [...zones[zone]]);
  const footer = [formatField('route', payload), Number.isFinite(input.occurredAtMs) && input.occurredAtMs > 0
    ? `Время: <code>${escapeTelegramHtml(formatIrelandTime(input.occurredAtMs))}</code>` : null].filter(Boolean).join('\n');

  // зачем: длинный текст режется на части, и на КАЖДОЙ должно быть видно, о ком
  // речь — иначе вторая часть приходит без имени и версии (правило закреплено
  // тестом «identity on every part»). Поэтому «кто» живёт в повторяемой шапке.
  // Шаблон решает лишь, идёт identity сразу под героем или после сути события.
  const identityFirst = template.zones.indexOf('identity') === 0;
  const headWithWho = [header, ...(identity && identityFirst ? [identity] : [])].join('\n');
  const tailWho = identity && !identityFirst ? identity : '';

  const parts: string[] = [];
  let part = headWithWho;
  for (const block of blocks) {
    if (part.length + block.length + footer.length + tailWho.length + 100 > 4096) {
      parts.push(part);
      part = headWithWho;
    }
    part += `\n\n${block}`;
  }
  parts.push(part);
  return parts.map((body, index) => {
    // «Кто» в хвосте повторяется на каждой части — так же, как шапка.
    const withWho = tailWho ? `${body}\n\n${tailWho}` : body;
    const counter = parts.length > 1 ? `\n\nЧасть ${index + 1}/${parts.length}` : '';
    return `${withWho}${counter}\n\n${footer}`;
  });
}
