import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { withCronHeartbeat } from './cron_heartbeat';
import { RESEND_API_KEY } from './resend_secret';
import { sendActivationEmail, webCheckoutEmailFrom, webCheckoutSupportEmail } from './web_checkout';

/*
 * НАПОМИНАНИЯ О НЕАКТИВИРОВАННОЙ ПОКУПКЕ С САЙТА.
 *
 * зачем: 21.09.2026 жалоба пользователя вскрыла, что на сайте трое оплативших
 * не получили доступ ВООБЩЕ. Письмо с кодом активации у всех троих провалилось
 * (`provider_rejected`, 401 «API key is invalid»), и никто об этом не узнал:
 * человек платит от 4 до 100 EUR, письмо не доходит, доступа нет, он молчит и
 * уходит. Самый старый заказ пролежал так почти месяц.
 *
 * Отправка одна на весь проект — `sendActivationEmail` из web_checkout.ts.
 * Второй копии письма здесь нет намеренно: один формат, один набор статусов.
 *
 * Крон НЕ выдаёт доступ и НЕ меняет статус заказа — только досылает письмо.
 * Выдача остаётся за человеком (ввод кода) и за админкой.
 */

const REGION = 'us-central1';
const ORDERS_COLLECTION = 'web_premium_orders';
const PROMO_CODES_COLLECTION = 'promo_codes';
const PENDING_STATUS = 'paid_pending_activation';

/** Через сколько дней после оплаты шлём 1-е, 2-е и 3-е напоминание. */
export const REMINDER_SCHEDULE_DAYS = [2, 7, 14] as const;
export const MAX_REMINDERS = REMINDER_SCHEDULE_DAYS.length;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Страховка от двух писем в сутки, если крон запустится повторно. */
const MIN_GAP_MS = 20 * 60 * 60 * 1000;
/** Заказы старше этого срока не трогаем: поздно напоминать, нужен человек. */
const MAX_ORDER_AGE_MS = 60 * DAY_MS;
/** Сколько заказов разбираем за прогон. Их единицы, запас огромный. */
const MAX_ORDERS_PER_RUN = 100;

export type ReminderDecision =
  | { send: true; reminderIndex: number }
  | { send: false; reason: string; detail?: string | number };

/**
 * Решение по одному заказу. Чистая функция — вся логика расписания здесь,
 * поэтому её можно проверить тестами без Firestore.
 */
export function decideReminder(input: {
  status: unknown;
  paidAtMs: unknown;
  remindersSent: unknown;
  lastReminderAtMs: unknown;
  hasEmail: boolean;
  hasActivationCode: boolean;
  /**
   * Код уже активирован (usedCount > 0 в promo_codes).
   *
   * зачем вторая опора: 22.09.2026 статус заказа НЕ обновлялся при активации,
   * и по нему трое людей с работающим Plus числились «ожидающими». Письмо
   * «вы не активировали» оплатившему человеку — прямой вред, поэтому одного
   * поля мало: спрашиваем ещё и сам код.
   */
  codeAlreadyRedeemed?: boolean;
  nowMs: number;
}): ReminderDecision {
  const status = typeof input.status === 'string' ? input.status : '';
  if (status !== PENDING_STATUS) return { send: false, reason: 'not_pending', detail: status || 'empty' };
  if (input.codeAlreadyRedeemed === true) {
    return { send: false, reason: 'code_already_redeemed' };
  }
  if (!input.hasEmail) return { send: false, reason: 'no_email' };
  if (!input.hasActivationCode) return { send: false, reason: 'no_activation_code' };

  const paidAtMs = Number(input.paidAtMs);
  if (!Number.isFinite(paidAtMs) || paidAtMs <= 0) {
    return { send: false, reason: 'no_paid_at', detail: String(input.paidAtMs) };
  }

  const ageMs = input.nowMs - paidAtMs;
  if (ageMs < 0) return { send: false, reason: 'paid_in_future', detail: ageMs };
  if (ageMs > MAX_ORDER_AGE_MS) return { send: false, reason: 'too_old', detail: Math.floor(ageMs / DAY_MS) };

  const sentRaw = Number(input.remindersSent);
  const sent = Number.isFinite(sentRaw) && sentRaw > 0 ? Math.floor(sentRaw) : 0;
  if (sent >= MAX_REMINDERS) return { send: false, reason: 'limit_reached', detail: sent };

  const lastAtMs = Number(input.lastReminderAtMs);
  if (Number.isFinite(lastAtMs) && lastAtMs > 0 && input.nowMs - lastAtMs < MIN_GAP_MS) {
    return { send: false, reason: 'too_soon_after_last', detail: Math.floor((input.nowMs - lastAtMs) / 1000) };
  }

  const dueAfterDays = REMINDER_SCHEDULE_DAYS[sent];
  if (ageMs < dueAfterDays * DAY_MS) {
    return { send: false, reason: 'not_due_yet', detail: `${Math.floor(ageMs / DAY_MS)}д<${dueAfterDays}д` };
  }

  return { send: true, reminderIndex: sent + 1 };
}

function toMs(value: unknown): number {
  if (!value) return 0;
  const anyValue = value as { toMillis?: () => number; seconds?: number; _seconds?: number };
  if (typeof anyValue.toMillis === 'function') return anyValue.toMillis();
  if (typeof anyValue.seconds === 'number') return anyValue.seconds * 1000;
  if (typeof anyValue._seconds === 'number') return anyValue._seconds * 1000;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanEmail(value: unknown): string {
  return typeof value === 'string' && value.includes('@') ? value.trim() : '';
}

/**
 * Один проход: найти оплаченные неактивированные заказы и досылать письма.
 *
 * Логирование по правилу проекта «сперва логи»: печатаем вход, КАЖДОЕ решение
 * вместе со значением, которое его приняло, каждый ранний выход и итог.
 * Префикс [ACTIVATION-REMINDER] — чтобы вся цепочка доставалась одним grep.
 */
export async function sweepActivationReminders(
  db: FirebaseFirestore.Firestore,
  nowMs: number,
): Promise<{ scanned: number; sent: number; failed: number; skipped: number }> {
  // Firebase-экономия: выбираем ТОЛЬКО ожидающие активации заказы (их единицы),
  // а не всю коллекцию. Без этого where крон читал бы все заказы каждый день.
  const snapshot = await db.collection(ORDERS_COLLECTION)
    .where('status', '==', PENDING_STATUS)
    .limit(MAX_ORDERS_PER_RUN)
    .get();

  logger.info(`[ACTIVATION-REMINDER] старт: ожидающих активации=${snapshot.size} nowMs=${nowMs}`);

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  // Состояние кодов читаем ОДНИМ батчем на весь прогон, а не по документу в
  // цикле: заказов единицы, но привычка дешёвых чтений важнее удобства.
  const codeIds = [...new Set(
    snapshot.docs
      .map((doc) => String((doc.data() || {}).activationCode || '').trim())
      .filter((code) => code.length > 0),
  )];
  const redeemedCodes = new Set<string>();
  if (codeIds.length > 0) {
    try {
      const codeDocs = await db.getAll(...codeIds.map((code) => db.collection(PROMO_CODES_COLLECTION).doc(code)));
      codeDocs.forEach((codeDoc) => {
        if (!codeDoc.exists) return;
        if (Number((codeDoc.data() || {}).usedCount ?? 0) > 0) redeemedCodes.add(codeDoc.id);
      });
    } catch (e) {
      // Запрет немого catch. Читать не смогли — НЕ шлём ничего в этот прогон:
      // лучше пропустить напоминание, чем написать «вы не активировали»
      // человеку, который активировал.
      logger.error(
        `[ACTIVATION-REMINDER] не прочитали состояние кодов (${codeIds.length}), прогон пропущен: `
        + String((e as { message?: unknown })?.message ?? e).slice(0, 200),
      );
      return { scanned: snapshot.size, sent: 0, failed: 0, skipped: snapshot.size };
    }
  }

  for (const doc of snapshot.docs) {
    const order = doc.data() || {};
    const email = cleanEmail(order.email) || cleanEmail(order.customerEmail) || cleanEmail(order.payerEmail);
    const paidAtMs = toMs(order.paidAt) || toMs(order.paidAtIso ? Date.parse(String(order.paidAtIso)) : 0);
    const activationCode = String(order.activationCode || '').trim();

    const decision = decideReminder({
      status: order.status,
      paidAtMs,
      remindersSent: order.activationReminderCount,
      lastReminderAtMs: toMs(order.activationReminderLastAt),
      hasEmail: Boolean(email),
      hasActivationCode: Boolean(activationCode),
      codeAlreadyRedeemed: activationCode ? redeemedCodes.has(activationCode) : false,
      nowMs,
    });

    if (!decision.send) {
      skipped += 1;
      // зачем печатаем причину и ЗНАЧЕНИЕ: без него «пропущен» не отличить от
      // «сломан» — именно так уже терялись круги работы.
      logger.info(`[ACTIVATION-REMINDER] заказ=${doc.id} пропуск: ${decision.reason}=${decision.detail ?? '—'}`);
      continue;
    }

    logger.info(
      `[ACTIVATION-REMINDER] заказ=${doc.id} шлём напоминание №${decision.reminderIndex}`
      + ` план=${order.plan ?? '—'} оплачен=${new Date(paidAtMs).toISOString()}`,
    );

    let ok = false;
    try {
      // Идемпотентность: один ключ на (заказ, номер напоминания) — повторный
      // прогон в тот же день не создаст у Resend второе письмо.
      ok = await sendActivationEmail(
        { ...order, orderId: doc.id },
        doc.ref,
        `reminder-${doc.id}-${decision.reminderIndex}`,
      );
    } catch (e) {
      // зачем не молчим: немой catch уже оставлял механизмы мёртвыми месяцами.
      ok = false;
      logger.error(`[ACTIVATION-REMINDER] заказ=${doc.id} отправка упала: ${String((e as { message?: unknown })?.message ?? e).slice(0, 200)}`);
    }

    if (!ok) {
      failed += 1;
      // Счётчик НЕ растим намеренно: провал доставки (например, мёртвый ключ)
      // не должен съедать лимит попыток. Иначе после починки почты человек
      // останется без письма — «лимит исчерпан» при нуле полученных писем.
      logger.warn(`[ACTIVATION-REMINDER] заказ=${doc.id} письмо НЕ ушло, счётчик не увеличен`);
      continue;
    }

    sent += 1;
    try {
      await doc.ref.set({
        activationReminderCount: decision.reminderIndex,
        activationReminderLastAt: admin.firestore.FieldValue.serverTimestamp(),
        activationReminderLastAtIso: new Date(nowMs).toISOString(),
      }, { merge: true });
    } catch (e) {
      logger.error(`[ACTIVATION-REMINDER] заказ=${doc.id} счётчик не записался: ${String((e as { message?: unknown })?.message ?? e).slice(0, 200)}`);
    }
  }

  logger.info(`[ACTIVATION-REMINDER] итог: просмотрено=${snapshot.size} отправлено=${sent} провал=${failed} пропущено=${skipped}`);
  return { scanned: snapshot.size, sent, failed, skipped };
}

export const webActivationReminderCron = onSchedule(
  {
    region: REGION,
    // Раз в сутки: расписание 2/7/14 дней, чаще проверять нечего.
    schedule: '0 10 * * *',
    timeZone: 'UTC',
    memory: '256MiB',
    timeoutSeconds: 300,
    maxInstances: 1,
    retryCount: 1,
    // Только RESEND_API_KEY — секрет. Отправитель и адрес поддержки это
    // defineString-параметры: они доступны функции без объявления в secrets,
    // импорт выше нужен, чтобы параметры зарегистрировались при деплое.
    secrets: [RESEND_API_KEY],
  },
  withCronHeartbeat('webActivationReminderCron', async () => {
    const result = await sweepActivationReminders(admin.firestore(), Date.now());
    return result;
  }),
);
