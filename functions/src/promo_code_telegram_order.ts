// зачем (владелец 11.11 «Да, почини»): заказ из Telegram-бота помечался выполненным только при ручном включении из админки.
// Когда человек сам вводил код, заказ навсегда оставался «ждёт активации» — 11.11 три таких заказа (19.07, 25.07, 18.08)
// выглядели как «оплатили и остались без доступа», хотя у всех троих код был введён и Plus работал. Та же болезнь уже лечилась
// для заказов сайта (promo_codes.ts, 22.09) — здесь то же самое для telegram_premium_orders. Поле status обязано отражать факт.
import type * as admin from 'firebase-admin';

const TELEGRAM_ORDERS_COLLECTION = 'telegram_premium_orders';
/** Единственный статус, из которого ввод кода переводит заказ в «выполнен». Возвраты и ручные заявки не трогаем. */
const PENDING_CODE_STATUS = 'paid_pending_activation';
/** Тот же статус, что ставит ручное включение из админки, — админка уже умеет его показывать. */
export const TELEGRAM_ORDER_ACTIVATED_STATUS = 'vip_activated';

/**
 * Достаёт id заказа бота из документа кода. Бот пишет связь в note вида
 * `telegram_stars telegram_premium_orders/<chargeId>`; явного поля у уже выпущенных кодов нет.
 */
export function telegramOrderIdFromPromoCodeDoc(data: unknown): string {
  const row = (data ?? {}) as Record<string, unknown>;
  const note = typeof row.note === 'string' ? row.note : '';
  const match = note.match(/(?:^|\s)telegram_premium_orders\/([A-Za-z0-9_-]{1,256})(?:\s|$)/);
  return match ? match[1] : '';
}

export type TelegramOrderMarkOutcome = 'marked' | 'order_missing' | 'code_mismatch' | 'status_not_pending';

/** Чистое решение: можно ли пометить заказ выполненным по вводу этого кода. */
export function decideTelegramOrderMark(order: unknown, code: string): TelegramOrderMarkOutcome {
  if (!order) return 'order_missing';
  const row = order as Record<string, unknown>;
  // зачем: note — текст; сверяем, что заказ сам ссылается на этот код, чтобы чужой код не закрыл чужой заказ.
  if (String(row.activationCode ?? '') !== code) return 'code_mismatch';
  if (String(row.status ?? '') !== PENDING_CODE_STATUS) return 'status_not_pending';
  return 'marked';
}

/**
 * Помечает заказ бота выполненным после ввода кода. testerActivationStatus НЕ ставим намеренно: на него подписан
 * telegramPremiumActivationNotifier, а человек только что сам ввёл код и увидел результат — второе сообщение лишнее.
 */
export async function markTelegramOrderActivatedByCode(
  db: admin.firestore.Firestore,
  params: { orderId: string; code: string; stableUid: string; nowMs: number; vipUntilMs: number },
): Promise<TelegramOrderMarkOutcome> {
  const ref = db.collection(TELEGRAM_ORDERS_COLLECTION).doc(params.orderId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const outcome = decideTelegramOrderMark(snap.exists ? snap.data() : null, params.code);
    if (outcome !== 'marked') return outcome;
    tx.set(ref, {
      status: TELEGRAM_ORDER_ACTIVATED_STATUS,
      activatedVia: 'code',
      activatedAt: params.nowMs,
      activatedUntil: params.vipUntilMs,
      activatedUserId: params.stableUid,
      activationCodeUsed: params.code,
    }, { merge: true });
    return outcome;
  });
}
