// ════════════════════════════════════════════════════════════════════════════
// admin_alert_routing.ts — что делать с оповещением: «сразу», «в недельную
// сводку» или «не слать».
//
// зачем (владелец 21.10, №48): канал в Telegram тонул. Каждая обычная ошибка
// и каждое продление шли отдельным письмом, а повтор одной ошибки — новым
// письмом на каждого пользователя. Правило владельца:
//   • сразу и по одному — покупка Plus и пробный, критичная ошибка, сбой
//     приёма оплаты, безопасность ИИ, возврат денег, всплеск ошибок входа,
//     обращения и жалобы;
//   • всё прочее несрочное — одной сводкой в понедельник 10:00 (Киев);
//   • не слать — тестовые покупки и тестовые аккаунты;
//   • старые версии 1.x и события старше часа — только в сводку.
// Сводка считает события по admin_alert_events, поэтому «в сводку» — это
// пометка без отправки, ни одной лишней записи.
// ════════════════════════════════════════════════════════════════════════════
import type { AdminAlertType } from './admin_alert_catalog';
import type { AdminAlertSafePayload } from './admin_alert_privacy';

export const ADMIN_ALERT_STALE_MS = 60 * 60 * 1000;
export const ADMIN_ALERT_GROUP_WINDOW_MS = 60 * 60 * 1000;

/** Решение владельца 21.10: эти типы приходят сразу, по одному. */
export const INSTANT_ADMIN_ALERT_TYPES: ReadonlySet<AdminAlertType> = new Set<AdminAlertType>([
  'premiumPurchase', 'trialStart',
  'criticalError', 'paymentWebhookFailure', 'authFailureSpike',
  'safetyFlag', 'refund',
  'supportEmail', 'websiteInbox',
  'userReport', 'contentReport', 'explanationReport', 'ideaOrCommunityReport',
  // Сама недельная сводка — её и ждёт владелец.
  'ownerDailyDigest',
]);

/** Сводке не нужны проверки свежести и версии: она всегда «за прошлую неделю». */
const ROUTING_EXEMPT: ReadonlySet<AdminAlertType> = new Set<AdminAlertType>(['ownerDailyDigest']);

/**
 * Деньги: не уходят в сводку ни по старой версии, ни по возрасту.
 * зачем (Ревизор 21.10, на «да» владельца): покупка, возврат и сбой приёма оплаты нельзя узнать через неделю.
 */
const MONEY_ALERT_TYPES: ReadonlySet<AdminAlertType> = new Set<AdminAlertType>(['premiumPurchase', 'refund', 'paymentWebhookFailure']);
/** Опоздавшие (старше часа), но всё равно «сразу» — с пометкой «с опозданием»: деньги и безопасность ИИ. */
const LATE_BUT_INSTANT_TYPES: ReadonlySet<AdminAlertType> = new Set<AdminAlertType>([...MONEY_ALERT_TYPES, 'safetyFlag']);

export type AdminAlertRoute =
  | { readonly kind: 'instant'; readonly lateMs?: number }
  | { readonly kind: 'weekly'; readonly reason: 'not_urgent' | 'legacy_1x' | 'stale' }
  | { readonly kind: 'drop'; readonly reason: 'test_purchase' | 'test_account' };

export interface AdminAlertRoutingInput {
  readonly eventType: AdminAlertType;
  readonly occurredAtMs: number;
  readonly payload: AdminAlertSafePayload;
}

export interface AdminAlertRoutingOptions {
  /** Ники тестовых аккаунтов из admin_config/alerts.testNicknames (без регистра). */
  readonly testNicknames?: readonly string[];
}

const TEST_ENVIRONMENTS = new Set(['SANDBOX', 'TEST', 'TEST_STORE', 'STAGING']);

/** Версия 1.x — старые сборки до 2.0. Пустая или нераспознанная версия старой не считается. */
export function isLegacyAppVersion(value: unknown): boolean {
  return /^1\.\d+/.test(String(value ?? '').trim());
}

export function routeAdminAlert(
  event: AdminAlertRoutingInput,
  nowMs: number,
  options: AdminAlertRoutingOptions = {},
): AdminAlertRoute {
  const environment = String(event.payload.environment ?? '').trim().toUpperCase();
  if (TEST_ENVIRONMENTS.has(environment)) return { kind: 'drop', reason: 'test_purchase' };
  const nickname = String(event.payload.nickname ?? '').trim().toLowerCase();
  if (nickname && (options.testNicknames ?? []).some((name) => String(name).trim().toLowerCase() === nickname)) {
    return { kind: 'drop', reason: 'test_account' };
  }
  if (!INSTANT_ADMIN_ALERT_TYPES.has(event.eventType)) return { kind: 'weekly', reason: 'not_urgent' };
  if (ROUTING_EXEMPT.has(event.eventType)) return { kind: 'instant' };
  if (isLegacyAppVersion(event.payload.appVersion) && !MONEY_ALERT_TYPES.has(event.eventType)) return { kind: 'weekly', reason: 'legacy_1x' };
  const lateMs = adminAlertLateMs(event, nowMs);
  if (lateMs > 0) {
    return LATE_BUT_INSTANT_TYPES.has(event.eventType) ? { kind: 'instant', lateMs } : { kind: 'weekly', reason: 'stale' };
  }
  return { kind: 'instant' };
}

/**
 * Насколько событие опоздало сверх часа «свежести» (0 — свежее). Для денег и безопасности ИИ
 * это не повод молчать, а пометка «с опозданием N мин» в сообщении.
 */
export function adminAlertLateMs(event: Pick<AdminAlertRoutingInput, 'occurredAtMs'>, nowMs: number): number {
  if (!Number.isFinite(event.occurredAtMs) || event.occurredAtMs <= 0) return 0;
  const ageMs = nowMs - event.occurredAtMs;
  return ageMs > ADMIN_ALERT_STALE_MS ? ageMs : 0;
}

/** Пометка опоздания для сообщения: «с опозданием 75 мин» / «с опозданием 3 ч». Пусто, если не опоздало. */
export function adminAlertLateLabel(lateMs: number | undefined): string {
  if (!lateMs || lateMs <= 0) return '';
  const minutes = Math.round(lateMs / 60_000);
  return minutes < 180 ? `с опозданием ${minutes} мин` : `с опозданием ${Math.round(minutes / 60)} ч`;
}

/** Текст причины для пометки события: `weekly:stale`, `drop:test_purchase`. */
export function adminAlertRouteReason(route: AdminAlertRoute): string {
  return route.kind === 'instant' ? 'instant' : `${route.kind}:${route.reason}`;
}

function keyPart(value: unknown): string {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9_.-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);
}

/**
 * Группа критичной ошибки: ВИД ошибки (раздел + место + имя), не пользователь.
 * Владелец 21.10: повторы одного вида за час — одним письмом «×N за час».
 * Окно — календарный час по UTC: соседние часы дают разные группы.
 */
export function criticalErrorGroupKey(input: {
  readonly payload: AdminAlertSafePayload;
  readonly occurredAtMs: number;
}): string {
  const detail = (label: string) => input.payload.details?.find((item) => item.label === label)?.value;
  const kind = [keyPart(input.payload.category), keyPart(detail('Контекст')), keyPart(detail('Ошибка'))]
    .filter(Boolean).join('.') || 'unknown';
  const hour = Math.floor(Math.max(0, input.occurredAtMs) / ADMIN_ALERT_GROUP_WINDOW_MS);
  return `critical.${kind}.${hour}`.slice(0, 200);
}
