// ═══════════════════════════════════════════════════════════════════════════
// email_delivery_watchdog.ts — чтобы почта больше НИКОГДА не умирала молча.
//
// Инцидент 21.09.2026: с 28.08 письма с кодами активации не уходили (ключ
// RESEND_API_KEY читался из .env вместо Secret Manager, Resend отвечал 401
// "API key is invalid"). Система ЗНАЛА о провале — писала статус провала в
// заявку — и НИКОМУ не сказала. Трое оплативших (4 / 28 / 100 EUR) три недели
// сидели без доступа.
//
// Перенесено 01.10.2026 из ветки claude/sad-cannon-876ae9 (коммиты 3d3f7a824 +
// bcfbd5836): оба крона уже крутятся в облаке, а без этого файла полная выкладка
// functions молча удалила бы их.
//
// Три слоя защиты, каждый закрывает свою дыру:
//   1. notifyActivationEmailFailure — провал письма по ОПЛАЧЕННОЙ заявке сразу
//      поднимает Telegram-алерт владельцу (дедуп: не чаще раза в час).
//   2. resendKeyHealthCron — раз в 12 часов один дешёвый запрос к Resend.
//      Ключ невалиден → алерт (дедуп: не чаще раза в сутки).
//   3. activationEmailRetryCron — после починки ключа сам дошлёт письма по
//      заявкам с проваленным письмом, чтобы оплатившие не ждали ручной рассылки.
//
// Отправка письма одна на проект — sendActivationEmail из web_checkout.ts
// (её же зовёт webActivationReminderCron). Здесь своей копии отправки НЕТ:
// один формат письма, один набор статусов customerEmailStatus.
//
// ⛔ PII: во внешний канал (Telegram) уходят ТОЛЬКО id заявок, тариф, сумма и
//    количества. Никаких email, имён и кодов активации — правило проекта.
// ⛔ App Check: onSchedule без него (пломба APP_CHECK_SEALED_BY_OWNER_2026_08_17).
// ═══════════════════════════════════════════════════════════════════════════
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { ADMIN_ALERT_BOT_TOKEN, sendTelegramAlert } from './admin_alerts';
import { withCronHeartbeat } from './cron_heartbeat';
import { RESEND_API_KEY } from './resend_secret';

const REGION = 'us-central1';
const ORDERS_COLLECTION = 'web_premium_orders';
// зачем тот же путь, что у облачной версии: дедуп-метки, уже записанные ею,
// продолжают работать после выкладки нашей версии (совместимость данных).
const WATCHDOG_DOC = 'admin_config/email_watchdog';
const RESEND_API_KEYS_URL = 'https://api.resend.com/api-keys';
const LOG = '[EMAIL-WATCHDOG]';

/** Провал письма по оплаченной заявке — алерт не чаще раза в час. */
export const FAILURE_ALERT_COOLDOWN_MS = 60 * 60 * 1000;
/** Мёртвый ключ — алерт не чаще раза в сутки: чинится он руками, не за минуту. */
export const KEY_ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;
/** Сколько заявок дошлём за один прогон. */
export const RETRY_BATCH_LIMIT = 20;
/**
 * Сколько документов с проваленным письмом читаем за прогон. Больше, чем
 * RETRY_BATCH_LIMIT: заявки, исчерпавшие попытки, остаются в выборке и иначе
 * навсегда заняли бы окно, не пуская свежие. В нормальном состоянии таких
 * документов ноль — прогон стоит ноль чтений документов.
 */
export const RETRY_SCAN_LIMIT = 100;
/** Заявка с битым адресом не будет долбиться вечно. */
export const MAX_RETRY_ATTEMPTS = 5;

/** Статусы заявки «деньги получены». Провал письма тут — потеря денег. */
const PAID_ORDER_STATUSES = new Set([
  'paid_pending_activation',
  'paid_pending_manual_activation',
  'activated',
]);

/**
 * Кому дошлём письмо. 'activated' сюда НЕ входит: человек уже ввёл код,
 * значит код у него есть — повторное письмо было бы лишним.
 */
const RETRYABLE_ORDER_STATUSES = new Set([
  'paid_pending_activation',
  'paid_pending_manual_activation',
]);

/**
 * Статусы письма, которые сторож считает провалом доставки.
 * - 'failed' — старый статус облачной версии (до 01.10 web_checkout писал его);
 *   оставлен, чтобы заявки, проваленные ДО выкладки, тоже дослались.
 * - 'provider_rejected' / 'transport_unknown' — то, что пишет текущий
 *   sendActivationEmail (resendFailureOutcomeForHttpStatus + сетевой сбой).
 *   transport_unknown: письмо МОГЛО уйти; повтор = в худшем случае второе
 *   письмо с тем же кодом, а без повтора — оплативший без доступа.
 * - 'skipped_no_resend_key' / 'skipped_no_resend_from' — почта не настроена.
 */
export const FAILED_EMAIL_STATUSES: readonly string[] = [
  'failed',
  'provider_rejected',
  'transport_unknown',
  'skipped_no_resend_key',
  'skipped_no_resend_from',
];
const FAILED_EMAIL_STATUS_SET = new Set(FAILED_EMAIL_STATUSES);

export function isPaidOrderStatus(status: unknown): boolean {
  return PAID_ORDER_STATUSES.has(String(status ?? '').trim());
}

export function isFailedEmailStatus(status: unknown): boolean {
  return FAILED_EMAIL_STATUS_SET.has(String(status ?? '').trim());
}

/**
 * Проблема ли это КЛЮЧА (а не разовый сбой)? 401/403 от Resend = ключ отозван
 * или невалиден — лечится выпуском ключа / передеплоем с секретом, поэтому
 * текст алерта зовёт туда, а не «попробовать ещё раз».
 */
export function isAuthFailure(httpStatus: unknown, errorText: unknown): boolean {
  const code = Number(httpStatus);
  if (code === 401 || code === 403) return true;
  const text = String(errorText ?? '').toLowerCase();
  return text.includes('api key is invalid')
    || text.includes('restricted to only send emails')
    || text.includes('resend_api_key пуст');
}

function db(): FirebaseFirestore.Firestore {
  return getFirestore();
}

/**
 * Дедуп алертов через admin_config/email_watchdog. Транзакция, а не read+write:
 * два вебхука в одну секунду не должны дать два одинаковых сообщения.
 * Возвращает true, если алерт разрешён (и время сразу записано).
 */
export async function claimAlertSlot(field: string, cooldownMs: number, now = Date.now()): Promise<boolean> {
  const ref = db().doc(WATCHDOG_DOC);
  try {
    return await db().runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const data = (snap.data() ?? {}) as Record<string, unknown>;
      const last = Number(data[field] ?? 0);
      if (last && now - last < cooldownMs) {
        logger.info(`${LOG} alert suppressed by cooldown`, { field, lastAlertMsAgo: now - last, cooldownMs });
        return false;
      }
      tx.set(ref, { [field]: now }, { merge: true });
      return true;
    });
  } catch (e) {
    // зачем: сторож не имеет права молчать из-за сбоя собственного дедупа —
    // лучше лишний алерт, чем снова месяц тишины.
    logger.error(`${LOG} claimAlertSlot failed, allowing alert`, { field, reason: String(e).slice(0, 300) });
    return true;
  }
}

/** Текст алерта о провале письма. Без PII — только id заявки, тариф, сумма. */
export function formatEmailFailureAlert(params: {
  orderId: string;
  plan: string;
  amountCents: number;
  currency: string;
  httpStatus?: number | null;
  authFailure: boolean;
}): string {
  const amount = ((Number(params.amountCents) || 0) / 100).toFixed(2);
  const currency = String(params.currency || 'usd').toUpperCase();
  const lines = [
    '🔴 <b>Письмо с кодом активации НЕ ДОШЛО</b>',
    '',
    'Человек заплатил и остался без доступа.',
    '',
    `Заявка: <code>${params.orderId}</code>`,
    `Тариф: ${params.plan || '—'}`,
    `Сумма: ${amount} ${currency}`,
    params.httpStatus ? `Ответ почтового сервиса: ${params.httpStatus}` : '',
    '',
    params.authFailure
      ? '⚠️ КЛЮЧ ПОЧТЫ НЕ РАБОТАЕТ — письма не уходят вообще.\nПроверь: 1) ключ жив на resend.com, 2) функции задеплоены с секретом RESEND_API_KEY.'
      : 'Разовый сбой отправки. Проверь админку → Web orders.',
    '',
    '<i>Код активации есть в админке — можно выслать вручную. Крон дошлёт сам в течение 6 часов.</i>',
  ];
  return lines.filter((line) => line !== '').join('\n');
}

/** Текст алерта о мёртвом ключе (крон живости). */
export function formatKeyDeadAlert(params: {
  httpStatus: number | null;
  pendingFailedOrders: number;
  reason: string;
}): string {
  const lines = [
    '🔴 <b>Ключ почты Resend не работает</b>',
    '',
    'Письма клиентам не уходят ВООБЩЕ: коды активации, ответы с сайта, рассылки.',
    '',
    params.httpStatus ? `Ответ Resend: ${params.httpStatus}` : `Причина: ${params.reason}`,
    params.pendingFailedOrders > 0
      ? `Оплаченных заявок без письма: <b>${params.pendingFailedOrders}</b>`
      : 'Оплаченных заявок без письма пока нет.',
    '',
    '⚠️ Проверь по порядку:',
    '1) ключ жив на resend.com (не отозван);',
    '2) новая версия лежит в Secret Manager как RESEND_API_KEY;',
    '3) функции ПЕРЕдеплоены — секрет подхватывается только при деплое.',
    '',
    'После починки письма по зависшим заявкам дошлются сами.',
  ];
  return lines.filter((line) => line !== '').join('\n');
}

export interface ActivationEmailFailure {
  orderId: unknown;
  orderStatus: unknown;
  plan: unknown;
  amountCents: unknown;
  currency: unknown;
  httpStatus?: number | null;
  errorText?: unknown;
}

/**
 * Поднять алерт о провале письма. Вызывается из sendActivationEmail сразу после
 * провала. Никогда не бросает — алерт не имеет права сломать обработку оплаты.
 */
export async function notifyActivationEmailFailure(params: ActivationEmailFailure): Promise<boolean> {
  try {
    const orderId = String(params.orderId ?? '').trim().slice(0, 120);
    const paid = isPaidOrderStatus(params.orderStatus);
    const authFailure = isAuthFailure(params.httpStatus, params.errorText);

    logger.error(`${LOG} activation email failed`, {
      orderId: orderId || '(none)',
      orderStatus: String(params.orderStatus ?? ''),
      paidOrder: paid,
      httpStatus: params.httpStatus ?? null,
      authFailure,
      // зачем: тело ответа Resend — не секрет, но режем, чтобы не тащить мусор в логи.
      reason: String(params.errorText ?? '').slice(0, 300),
    });

    if (!orderId) {
      logger.warn(`${LOG} no orderId — alert skipped`);
      return false;
    }
    if (!paid) {
      // зачем: провал письма по неоплаченной заявке (или подарочной доставке со
      // своим статусом) денег не теряет — не шумим.
      logger.info(`${LOG} order not paid — alert skipped`, { orderId, orderStatus: String(params.orderStatus ?? '') });
      return false;
    }

    const allowed = await claimAlertSlot('lastEmailFailureAlertMs', FAILURE_ALERT_COOLDOWN_MS);
    if (!allowed) return false;

    const text = formatEmailFailureAlert({
      orderId,
      plan: String(params.plan ?? '').slice(0, 80),
      amountCents: Number(params.amountCents) || 0,
      currency: String(params.currency ?? 'usd'),
      httpStatus: params.httpStatus ?? null,
      authFailure,
    });
    const sent = await sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text);
    logger.info(`${LOG} failure alert dispatched`, { orderId, sent });
    return sent;
  } catch (e) {
    logger.error(`${LOG} notifyActivationEmailFailure threw`, { reason: String(e).slice(0, 300) });
    return false;
  }
}

export interface KeyProbeResult {
  alive: boolean;
  httpStatus: number | null;
  reason: string;
}

/**
 * Один дешёвый запрос к Resend: GET /api-keys ничего не отправляет и не стоит
 * писем, но валидность ключа проверяет.
 */
export async function probeResendKey(key: string, fetchImpl: typeof fetch = fetch): Promise<KeyProbeResult> {
  if (!key) {
    return { alive: false, httpStatus: null, reason: 'ключ не задан (RESEND_API_KEY пуст)' };
  }
  try {
    const response = await fetchImpl(RESEND_API_KEYS_URL, {
      method: 'GET',
      headers: { Authorization: `Bearer ${key}` },
    });
    if (response.ok) {
      return { alive: true, httpStatus: response.status, reason: 'ok' };
    }
    const body = await response.text().catch((e) => {
      logger.warn(`${LOG} probe body unreadable`, { reason: String(e).slice(0, 200) });
      return '';
    });
    // зачем: тело ответа режем — в нём может быть эхо запроса.
    return { alive: false, httpStatus: response.status, reason: body.slice(0, 200) || `HTTP ${response.status}` };
  } catch (e) {
    // зачем: сеть отвалилась ≠ ключ мёртв; отличаем по httpStatus=null выше по стеку.
    return { alive: false, httpStatus: null, reason: `сетевая ошибка: ${String(e).slice(0, 200)}` };
  }
}

/** Решение «будить ли владельца» по результату пробы. Чистая функция. */
export function shouldAlertOnProbe(probe: KeyProbeResult): boolean {
  if (probe.alive) return false;
  // зачем: сетевой сбой без HTTP-кода — не повод будить владельца, Resend
  // может быть недоступен минуту. Алертим на ответ сервиса или на пустой ключ.
  return probe.httpStatus !== null || probe.reason.startsWith('ключ не задан');
}

/** Сколько оплаченных заявок сейчас без доставленного письма. */
export async function countPaidOrdersWithFailedEmail(): Promise<number> {
  try {
    const snap = await db()
      .collection(ORDERS_COLLECTION)
      .where('customerEmailStatus', 'in', [...FAILED_EMAIL_STATUSES])
      .limit(RETRY_SCAN_LIMIT)
      .get();
    return snap.docs.filter((doc) => isPaidOrderStatus(doc.data()?.status)).length;
  } catch (e) {
    logger.error(`${LOG} countPaidOrdersWithFailedEmail failed`, { reason: String(e).slice(0, 300) });
    return 0;
  }
}

export async function runResendKeyHealthCheck(deps: {
  probe: () => Promise<KeyProbeResult>;
  recordProbe: (probe: KeyProbeResult) => Promise<void>;
  claimSlot: () => Promise<boolean>;
  countPending: () => Promise<number>;
  alert: (text: string) => Promise<boolean>;
}): Promise<{ alive: boolean; alerted: boolean; httpStatus: number | null }> {
  const startedAt = Date.now();
  const probe = await deps.probe();
  logger.info(`${LOG} key probe done`, {
    alive: probe.alive, httpStatus: probe.httpStatus, reason: probe.reason, tookMs: Date.now() - startedAt,
  });
  try {
    await deps.recordProbe(probe);
  } catch (e) {
    logger.error(`${LOG} key probe bookkeeping failed`, { reason: String(e).slice(0, 300) });
  }

  if (!shouldAlertOnProbe(probe)) {
    if (!probe.alive) logger.warn(`${LOG} probe failed without HTTP status — no alert`, { reason: probe.reason });
    return { alive: probe.alive, alerted: false, httpStatus: probe.httpStatus };
  }
  if (!(await deps.claimSlot())) {
    return { alive: false, alerted: false, httpStatus: probe.httpStatus };
  }
  const pending = await deps.countPending();
  const sent = await deps.alert(formatKeyDeadAlert({
    httpStatus: probe.httpStatus, pendingFailedOrders: pending, reason: probe.reason,
  }));
  logger.info(`${LOG} key dead alert dispatched`, { sent, pending });
  return { alive: false, alerted: sent, httpStatus: probe.httpStatus };
}

/**
 * Крон живости ключа: раз в 12 часов. Два запроса в сутки — цена того, чтобы
 * мёртвая почта находилась за часы, а не за месяц.
 */
export const resendKeyHealthCron = onSchedule(
  {
    schedule: '0 */12 * * *',
    timeZone: 'UTC',
    region: REGION,
    memory: '256MiB',
    maxInstances: 1,
    secrets: [ADMIN_ALERT_BOT_TOKEN, RESEND_API_KEY],
    retryCount: 0,
  },
  withCronHeartbeat('resendKeyHealthCron', async () => {
    const result = await runResendKeyHealthCheck({
      probe: () => probeResendKey(RESEND_API_KEY.value()),
      recordProbe: async (probe) => {
        await db().doc(WATCHDOG_DOC).set({
          lastKeyProbeAtMs: Date.now(),
          lastKeyProbeAlive: probe.alive,
          lastKeyProbeStatus: probe.httpStatus ?? null,
          lastKeyProbeReason: probe.reason.slice(0, 300),
          lastKeyProbeAt: FieldValue.serverTimestamp(),
        }, { merge: true });
      },
      claimSlot: () => claimAlertSlot('lastKeyDeadAlertMs', KEY_ALERT_COOLDOWN_MS),
      countPending: countPaidOrdersWithFailedEmail,
      alert: (text) => sendTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text),
    });
    return { alive: result.alive, alerted: result.alerted };
  }),
);

/** Попадает ли заявка в дорассылку. Чистая функция. */
export function shouldRetryOrder(order: Record<string, unknown>): boolean {
  if (!RETRYABLE_ORDER_STATUSES.has(String(order.status ?? '').trim())) return false;
  if (!isFailedEmailStatus(order.customerEmailStatus)) return false;
  if (!String(order.activationCode ?? '').trim()) return false;
  const attempts = Number(order.customerEmailRetryCount ?? 0);
  return !(attempts >= MAX_RETRY_ATTEMPTS);
}

export interface RetryOrderDoc {
  id: string;
  data: Record<string, unknown>;
}

export async function runActivationEmailRetry(deps: {
  probe: () => Promise<KeyProbeResult>;
  listFailed: () => Promise<RetryOrderDoc[]>;
  markAttempt: (orderId: string) => Promise<void>;
  send: (order: Record<string, unknown>, idempotencyKey: string) => Promise<boolean>;
}): Promise<{ skipped: string | null; scanned: number; attempted: number; sent: number }> {
  const probe = await deps.probe();
  if (!probe.alive) {
    // зачем: слать при мёртвом ключе — жечь вызовы и портить счётчик попыток.
    logger.warn(`${LOG} retry cron skipped, key not alive`, { httpStatus: probe.httpStatus, reason: probe.reason });
    return { skipped: 'key_not_alive', scanned: 0, attempted: 0, sent: 0 };
  }

  let docs: RetryOrderDoc[];
  try {
    docs = await deps.listFailed();
  } catch (e) {
    logger.error(`${LOG} retry cron query failed`, { reason: String(e).slice(0, 300) });
    return { skipped: 'query_failed', scanned: 0, attempted: 0, sent: 0 };
  }

  const candidates = docs.filter((doc) => shouldRetryOrder(doc.data)).slice(0, RETRY_BATCH_LIMIT);
  logger.info(`${LOG} retry cron scanning`, { scanned: docs.length, candidates: candidates.length });

  let sent = 0;
  for (const doc of candidates) {
    const attempt = (Number(doc.data.customerEmailRetryCount ?? 0) || 0) + 1;
    try {
      // зачем: счётчик растёт ДО отправки — даже если функция упадёт посреди
      // письма, заявка не будет долбиться бесконечно.
      await deps.markAttempt(doc.id);
      // зачем ключ идемпотентности (заявка, попытка): повторный запуск крона
      // в ту же попытку не создаст у Resend второе письмо.
      const ok = await deps.send({ ...doc.data, orderId: doc.id }, `activation-retry-${doc.id}-${attempt}`);
      if (ok) sent += 1;
      logger.info(`${LOG} retry attempt`, { orderId: doc.id, attempt, ok });
    } catch (e) {
      logger.error(`${LOG} retry attempt threw`, { orderId: doc.id, attempt, reason: String(e).slice(0, 300) });
    }
  }
  logger.info(`${LOG} retry cron done`, { attempted: candidates.length, sent });
  return { skipped: null, scanned: docs.length, attempted: candidates.length, sent };
}

/**
 * Дорассылка писем по оплаченным заявкам, которым письмо не дошло.
 *
 * Идемпотентность: sendActivationEmail при успехе ставит customerEmailStatus='sent',
 * заявка выпадает из выборки. Плюс счётчик попыток — битый адрес не долбится вечно.
 *
 * Разделение с webActivationReminderCron: тот шлёт НАПОМИНАНИЯ по расписанию
 * 2/7/14 дней, этот — быстро досылает ПРОВАЛИВШЕЕСЯ первое письмо. Поля счётчиков
 * разные (activationReminderCount vs customerEmailRetryCount), отправка общая.
 */
export const activationEmailRetryCron = onSchedule(
  {
    schedule: '30 */6 * * *',
    timeZone: 'UTC',
    region: REGION,
    memory: '256MiB',
    maxInstances: 1,
    timeoutSeconds: 300,
    secrets: [ADMIN_ALERT_BOT_TOKEN, RESEND_API_KEY],
    retryCount: 0,
  },
  withCronHeartbeat('activationEmailRetryCron', async () => {
    const result = await runActivationEmailRetry({
      probe: () => probeResendKey(RESEND_API_KEY.value()),
      listFailed: async () => {
        // Firebase-экономия: только документы с проваленным письмом (обычно ноль).
        const snap = await db()
          .collection(ORDERS_COLLECTION)
          .where('customerEmailStatus', 'in', [...FAILED_EMAIL_STATUSES])
          .limit(RETRY_SCAN_LIMIT)
          .get();
        return snap.docs.map((doc) => ({ id: doc.id, data: (doc.data() ?? {}) as Record<string, unknown> }));
      },
      markAttempt: async (orderId) => {
        await db().collection(ORDERS_COLLECTION).doc(orderId).set({
          customerEmailRetryCount: FieldValue.increment(1),
          customerEmailLastRetryAtMs: Date.now(),
        }, { merge: true });
      },
      send: async (order, idempotencyKey) => {
        // зачем: импорт внутри — web_checkout импортирует этот модуль,
        // статический импорт обратно дал бы цикл на этапе загрузки.
        const { sendActivationEmail } = await import('./web_checkout');
        // statusRef НЕ передаём: с ним sendActivationEmail перезаписал бы
        // поле status заявки статусом доставки (это режим подарочных доставок).
        return sendActivationEmail(order, undefined, idempotencyKey);
      },
    });
    return { skipped: result.skipped ?? 'none', scanned: result.scanned, attempted: result.attempted, sent: result.sent };
  }),
);
