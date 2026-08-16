import type { Firestore } from 'firebase-admin/firestore';

/**
 * Сигнал владельцу, когда падает вебхук платежей.
 *
 * зачем (ресерч 2026-08-15): в `revenuecat_shards.ts` пять мест, где обработчик
 * платежа падает и пишет ТОЛЬКО в лог — `logger.error(...)` и ответ 500.
 * Логи никто не читает по расписанию. Значит человек заплатил, доступ не выдался,
 * а владелец узнаёт об этом от самого пользователя, через часы или дни.
 * Это деньги и репутация, а не диагностика.
 *
 * зачем через `app_errors`, а не новый канал: механизм уже есть —
 * `adminAlertOnCriticalError` следит за этой коллекцией и шлёт в Telegram,
 * уважая общий выключатель алертов. Новый канал пришлось бы отдельно
 * настраивать, отдельно выключать и отдельно чинить.
 *
 * Модуль чистый в части сборки документа: `buildPaymentWebhookFailureDoc`
 * не касается сети, поэтому все правила проверяются тестами целиком.
 */

/** Какие вебхуки платежей умеют падать. Список из revenuecat_shards.ts. */
export type PaymentWebhookKind =
  | 'shards'
  | 'refund'
  | 'refund_reversed'
  | 'transfer'
  | 'premium_lineage';

const MAX_MESSAGE_LENGTH = 900;

/**
 * Идентификатор документа: один на вебхук в час.
 *
 * зачем склейка: сбой провайдера длится минутами и роняет десятки запросов
 * подряд. Без неё владелец получил бы сотню одинаковых сообщений за раз и
 * выключил бы канал — ровно то, от чего этот алерт защищает. Тот же приём
 * уже применён в max_voice_watchdog.
 */
export function paymentWebhookFailureId(hook: PaymentWebhookKind, nowMs: number): string {
  return `revenuecat_webhook_${hook}_${Math.floor(nowMs / 3_600_000)}`;
}

export interface PaymentWebhookFailureInput {
  readonly hook: PaymentWebhookKind;
  readonly message: string;
  readonly nowMs: number;
  /** Известен, но НЕ сохраняется — см. ниже. */
  readonly appUserId?: string;
}

/**
 * Собирает документ ошибки.
 *
 * зачем вычищать идентификатор пользователя: документ попадает в Telegram
 * через adminAlertOnCriticalError, а правило проекта — во внешние каналы
 * уходят количества, не PII. Владельцу для реакции достаточно знать, ЧТО
 * сломалось; кого именно это задело, видно в админке по журналу платежей.
 */
export function buildPaymentWebhookFailureDoc(
  input: PaymentWebhookFailureInput,
): Record<string, unknown> {
  let message = String(input.message ?? '').slice(0, MAX_MESSAGE_LENGTH);
  if (input.appUserId) {
    // зачем replaceAll, а не отказ: идентификатор часто уже внутри текста
    // ошибки от провайдера, и просто «не добавлять поле» его не уберёт.
    message = message.split(input.appUserId).join('<user>');
  }

  return {
    severity: 'critical',
    feature: 'payments',
    context: `revenuecat_webhook_${input.hook}`,
    errorName: 'PaymentWebhookFailure',
    message,
    fingerprint: `revenuecat_webhook_${input.hook}`,
    platform: 'server',
    appVersion: 'cloud-functions',
    createdAtMs: input.nowMs,
    createdAt: new Date(input.nowMs).toISOString(),
    status: 'new',
  };
}

/**
 * Записывает сбой. Никогда не бросает.
 *
 * зачем глушить свои ошибки: это сигнальный путь поверх уже упавшего запроса.
 * Если запись алерта уронит обработчик, мы превратим одну проблему в две —
 * и потеряем ответ провайдеру, который тот попытается повторить.
 */
export async function recordPaymentWebhookFailure(
  db: Firestore,
  input: PaymentWebhookFailureInput,
): Promise<void> {
  try {
    // guard-ok (limit): .doc() по конкретному id — одна запись, не запрос коллекции.
    await db.collection('app_errors')
      .doc(paymentWebhookFailureId(input.hook, input.nowMs))
      .set(buildPaymentWebhookFailureDoc(input), { merge: true });
  } catch {
    // Молча: логирование уже сделал вызывающий, дублировать нечего.
  }
}
