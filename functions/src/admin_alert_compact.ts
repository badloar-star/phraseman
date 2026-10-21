// ════════════════════════════════════════════════════════════════════════════
// admin_alert_compact.ts — короткое оповещение: 2–3 строки + ссылка в админку.
//
// зачем (владелец 21.10, №48): письма в Telegram были на экран и больше,
// длинные дробились на «Часть 1/3» со стеками целиком. Новое правило:
// ВСЕГДА одно сообщение, суть с одного взгляда, подробности — в админке.
// Образцы владельца:
//   💳 Plus · год · Google Play
//   Vertex56818 · до 21.11.2026
//   → админка
// и
//   🔴 Эпизод не завершился · iPhone iOS 26
//   learning_v2 · finish · v2.0.0 (141) · ×3 за час
//   → админка
//
// Безопасность: на вход идёт только то, что пропустил sanitizeAdminAlertPayload.
// Для ошибок там нет ни ника, ни uid. Длинные тексты режутся до короткой цитаты.
// ════════════════════════════════════════════════════════════════════════════
import type { AdminAlertType } from './admin_alert_catalog';
import {
  escapeTelegramHtml,
  formatAlertMoney,
  renderAdminAlertMessages,
  safeRoute,
  sanitizeAdminAlertPayload,
  type AdminAlertMessageInput,
  type AdminAlertSafePayload,
} from './admin_alert_privacy';
import { adminAlertTemplate } from './admin_alert_templates';
import { adminAlertLateLabel } from './admin_alert_routing';

export const ADMIN_ALERT_ADMIN_ORIGIN = 'https://phraseman-ea0b3.web.app';
/** Потолок одного сообщения: с запасом меньше 4096 Telegram. */
export const COMPACT_ALERT_MAX_LENGTH = 1_000;
const QUOTE_MAX = 140;

export interface CompactAlertOptions {
  /** Сколько раз за час случилась эта критичная ошибка (≥2 печатается «×N за час»). */
  readonly count?: number;
  /** Опоздание сверх часа: деньги и безопасность ИИ приходят сразу, но с пометкой «с опозданием N мин». */
  readonly lateMs?: number;
}

function detail(payload: AdminAlertSafePayload, ...labels: readonly string[]): string {
  for (const label of labels) {
    const value = payload.details?.find((item) => item.label === label)?.value;
    if (value && value.trim()) return value.trim();
  }
  return '';
}

/** Одна строка без переносов, обрезанная по символам (а не по байтам). */
function short(value: string, max = QUOTE_MAX): string {
  const flat = value.replace(/\s+/g, ' ').trim();
  const chars = [...flat];
  return chars.length > max ? `${chars.slice(0, max - 1).join('')}…` : flat;
}

function quote(value: string): string {
  return value ? `«${escapeTelegramHtml(short(value))}»` : '';
}

function join(parts: readonly string[], separator = ' · '): string {
  return parts.filter((part) => part && part.trim()).join(separator);
}

const STORE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  PLAY_STORE: 'Google Play', APP_STORE: 'App Store', MAC_APP_STORE: 'App Store',
  STRIPE: 'Stripe', PAYPAL: 'PayPal', AMAZON: 'Amazon', PROMOTIONAL: 'Промо',
});

function storeName(provider: unknown): string {
  const raw = String(provider ?? '').trim();
  return STORE_NAMES[raw.toUpperCase()] ?? raw;
}

/** Срок из id продукта или подписи периода: «год», «месяц», «навсегда». */
function planName(payload: AdminAlertSafePayload): string {
  const text = `${payload.product ?? ''} ${detail(payload, 'Период подписки')}`.toLowerCase();
  if (/lifetime|навсегда/.test(text)) return 'навсегда';
  if (/year|annual|p1y|год|366/.test(text)) return 'год';
  if (/month|p1m|месяц|31/.test(text)) return 'месяц';
  if (/week|p1w|недел/.test(text)) return 'неделя';
  return '';
}

function ddmmyyyy(iso: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return '';
  const date = new Date(ms);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
}

function device(payload: AdminAlertSafePayload): string {
  const platform = String(payload.platform ?? '').trim();
  if (!platform) return '';
  return escapeTelegramHtml(platform.replace(/^ios\b/i, 'iPhone iOS').replace(/^android\b/i, 'Android'));
}

function version(payload: AdminAlertSafePayload): string {
  const value = String(payload.appVersion ?? '').trim();
  if (!value || /^(unknown|undefined|null|\?|0)$/i.test(value)) return '';
  const build = payload.buildNumber ? ` (${escapeTelegramHtml(payload.buildNumber)})` : '';
  return `v${escapeTelegramHtml(value)}${build}`;
}

function who(payload: AdminAlertSafePayload): string {
  return payload.nickname ? escapeTelegramHtml(payload.nickname) : '';
}

function money(payload: AdminAlertSafePayload): string {
  const formatted = formatAlertMoney(payload);
  return formatted && Number(payload.amount) > 0 ? escapeTelegramHtml(formatted.headline) : '';
}

function adminLink(payload: AdminAlertSafePayload): string {
  const route = safeRoute(payload.route) || '/legacy.html#alerts';
  return `<a href="${ADMIN_ALERT_ADMIN_ORIGIN}${escapeTelegramHtml(route)}">→ админка</a>`;
}

function repeats(count: number | undefined): string {
  return typeof count === 'number' && count >= 2 ? `×${Math.floor(count)} за час` : '';
}

/** Две содержательные строки по типу. Третья — ссылка — добавляется снаружи. */
function lines(eventType: AdminAlertType, payload: AdminAlertSafePayload, options: CompactAlertOptions): readonly string[] {
  const store = escapeTelegramHtml(storeName(payload.provider));
  const plan = planName(payload);
  const until = ddmmyyyy(detail(payload, 'Окончание подписки'));
  switch (eventType) {
    case 'premiumPurchase':
      return [`💳 ${join(['Plus', plan, store, money(payload)])}`, join([who(payload), until ? `до ${until}` : ''])];
    case 'trialStart':
      return [`🎁 ${join(['Пробный Plus', plan, store])}`, join([who(payload), until ? `пробный до ${until}` : ''])];
    case 'refund':
      return [`↩️ ${join(['Возврат денег', plan ? `Plus · ${plan}` : 'Plus', store, money(payload)])}`,
        join([who(payload), quote(detail(payload, 'Причина возврата'))])];
    case 'criticalError': {
      const title = detail(payload, 'Сообщение ошибки', 'Ошибка') || payload.category || 'Критическая ошибка';
      return [`🔴 ${join([escapeTelegramHtml(short(title, 80)), device(payload)])}`,
        join([escapeTelegramHtml(payload.category ?? ''), escapeTelegramHtml(short(detail(payload, 'Контекст'), 40)), version(payload), repeats(options.count)])];
    }
    case 'paymentWebhookFailure':
      return ['🔴 Сбой приёма оплаты', join([escapeTelegramHtml(payload.category ?? ''), escapeTelegramHtml(short(detail(payload, 'Ошибка', 'Сообщение ошибки'), 80)), repeats(options.count)])];
    case 'authFailureSpike':
      return [`⚠️ ${join(['Всплеск ошибок входа', typeof payload.count === 'number' ? `×${payload.count}` : ''])}`, escapeTelegramHtml(payload.category ?? '')];
    case 'safetyFlag':
      return [`🛡 ${join(['Безопасность ИИ', escapeTelegramHtml(detail(payload, 'Категория безопасности') || payload.category || '')])}`,
        join([who(payload), quote(detail(payload, 'Текст пользователя'))])];
    case 'supportEmail':
      return [`✉️ ${join(['Письмо в поддержку', escapeTelegramHtml(short(detail(payload, 'Отправитель'), 40))])}`,
        quote(join([detail(payload, 'Тема'), detail(payload, 'Сообщение')], ': '))];
    case 'websiteInbox':
      return [`🌐 ${join(['Сообщение с сайта', escapeTelegramHtml(short(detail(payload, 'Отправитель'), 40))])}`,
        quote(join([detail(payload, 'Тема'), detail(payload, 'Сообщение')], ': '))];
    case 'contentReport':
      return [`🚩 ${join(['Жалоба на контент', who(payload), version(payload)])}`,
        join([quote(detail(payload, 'Текст репорта', 'Комментарий')), detail(payload, 'Контент') ? `в «${escapeTelegramHtml(short(detail(payload, 'Контент'), 60))}»` : ''], ' ')];
    case 'explanationReport':
      return [`🚩 ${join(['Жалоба на объяснение', escapeTelegramHtml(short(detail(payload, 'Фраза'), 60))])}`,
        join([quote(detail(payload, 'Комментарий', 'Причина')), typeof payload.count === 'number' ? `жалоб: ${payload.count}` : ''])];
    case 'userReport':
      return [`🚩 ${join(['Жалоба на пользователя', escapeTelegramHtml(payload.category ?? '')])}`,
        quote(detail(payload, 'Комментарий', 'Причина'))];
    case 'ideaOrCommunityReport':
      return [`🚩 ${join(['Жалоба на набор', escapeTelegramHtml(short(detail(payload, 'Название'), 60))])}`,
        quote(detail(payload, 'Комментарий', 'Причина'))];
    default: {
      const template = adminAlertTemplate(eventType, { status: payload.status, rating: payload.rating });
      return [`${template.emoji} ${escapeTelegramHtml(template.hero)}`, join([who(payload), device(payload), version(payload)])];
    }
  }
}

/**
 * Ровно ОДНО сообщение. Недельная сводка печатается прежним форматом цифр
 * (он уже короткий), всё остальное — 2–3 строки.
 */
export function renderCompactAdminAlert(input: AdminAlertMessageInput, options: CompactAlertOptions = {}): string {
  const payload = sanitizeAdminAlertPayload(input.eventType, input.payload);
  if (input.eventType === 'ownerDailyDigest') {
    const digest = renderAdminAlertMessages({ ...input, payload })[0];
    return digest.length <= 4096 ? digest : `${digest.slice(0, 4080)}…`;
  }
  const raw = [...lines(input.eventType, payload, options)];
  // зачем (Ревизор 21.10): опоздавшее денежное событие видно сразу, но честно помечено — пометка в конце второй строки.
  const late = adminAlertLateLabel(options.lateMs);
  if (late) raw[1] = join([raw[1] ?? '', late]);
  const body = raw.filter((line) => line && line.trim());
  const text = [...body, adminLink(payload)].join('\n');
  if (text.length <= COMPACT_ALERT_MAX_LENGTH) return text;
  // Страховка: длинные значения уже обрезаны, но экранирование может раздуть строку.
  return [...body.map((line) => short(line.replace(/<[^>]*>/g, ''), 300)), adminLink(payload)].join('\n');
}
