// ═══ Подарок Phraseman Plus через сайт — HTTP-ручки для knowlyapps.com/gift и /g/<КОД> ══════════════
// зачем (владелец 21.10, «да супер!» к макету docs/design/v2-app/site-gift.html; «по нику» снят владельцем в тот же день):
//  - giftLinkInfo — страница /g/<КОД>: какой подарок, от кого и жив ли он (активен / уже включён / отменён / истёк).
//  - giftCancel — покупатель отменяет код или ссылку до активации. Полномочие — тот же Stripe session id / PayPal order id,
//    по которому webOrderStatus уже отдаёт код. Деньги автоматически не возвращаем — владелец возвращает вручную через
//    поддержку (решение 21.10; ответ refund: 'manual'). Ссылка «спасибо» с этим id даёт и код (webOrderStatus), и отмену —
//    один уровень доступа, осознанно (ревью Ядра 21.10). Владельцу сразу уходит оповещение «Возврат средств».
// Сайт без входа, поэтому onRequest + CORS (как webCheckoutCreate), тело — JSON-строка без Content-Type.
// Журнал [GIFT-PLUS] на каждом раннем выходе и в catch.
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onRequest } from 'firebase-functions/v2/https';

import { enqueueAdminAlert, type EnqueueAdminAlertInput } from './admin_alert_outbox';
import { enforceCallerRateWindow } from './caller_rate_window';
import { RESEND_API_KEY } from './resend_secret';
import {
  applyCors,
  buildResendRequestHeaders,
  cleanEmail,
  cleanShortText,
  htmlEscape,
  parseJsonBody,
  webCheckoutEmailFrom,
  webCheckoutSupportEmail,
  type AnyRequest,
  type AnyResponse,
} from './web_checkout';
import { giftLog, giftWarn } from './web_gift_core';

const REGION = 'us-central1';
const ORDERS_COLLECTION = 'web_premium_orders';
const PROMO_CODES = 'promo_codes';
const DAY_MS = 24 * 60 * 60 * 1000;
const PUBLIC_OPTIONS = { region: REGION, memory: '256MiB' as const, timeoutSeconds: 15, maxInstances: 5, invoker: 'public' as const };
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

/** Оповещение «Возврат средств» по отмене подарка: только безопасные поля (провайдер, тариф, сумма, статус, раздел админки). */
export function buildGiftCancelRefundAlert(
  orderId: string,
  order: Readonly<Record<string, unknown>>,
  nowMs: number,
): EnqueueAdminAlertInput {
  const provider = String(order.provider ?? '') === 'paypal' ? 'PayPal' : 'Stripe';
  const cancelledAtMs = Number(order.cancelledAtMs) > 0 ? Number(order.cancelledAtMs) : nowMs;
  return {
    eventType: 'refund',
    source: 'web.gift_cancel',
    sourceId: orderId,
    occurredAtMs: cancelledAtMs,
    payload: {
      provider,
      // зачем (Ядро 21.10): тестовая оплата (Stripe livemode=false, PayPal sandbox) — 'SANDBOX', такое оповещение владельцу не придёт.
      // Поля нет у заказов до 21.10 — считаем их боевыми, чтобы не потерять настоящий возврат.
      environment: order.paymentLivemode === false ? 'SANDBOX' : 'PRODUCTION',
      product: cleanShortText(order.plan, 20) || 'gift',
      amount: Math.max(0, Number(order.amountCents) || 0) / 100,
      currency: cleanShortText(order.currency, 8).toUpperCase() || undefined,
      status: 'cancel_requested',
      route: '#site-admin',
      details: [{ label: 'Причина возврата', value: 'Покупатель отменил подарок до активации — вернуть деньги вручную' }],
    },
  };
}

/**
 * Письмо покупателю «подарок отменён» — по-русски и по-английски (язык покупателя в заказе не хранится).
 * зачем (Ревизор 21.10): покупатель должен знать, что код погашен и деньги вернут вручную, и куда писать.
 * Срок возврата — 5 рабочих дней (решение владельца 22.10).
 */
export function buildGiftCancelEmail(order: Readonly<Record<string, unknown>>, support: string): { subject: string; text: string; html: string } {
  const plan = order.plan === 'monthly' ? 'monthly' : 'yearly';
  const ru = plan === 'monthly' ? 'Месяц Phraseman Plus' : 'Год Phraseman Plus';
  const en = plan === 'monthly' ? 'Phraseman Plus · 1 month' : 'Phraseman Plus · 1 year';
  const subject = 'Подарок Phraseman отменён · Gift cancelled';
  const text = [
    `Подарок «${ru}» отменён. Код и ссылка больше не работают.`,
    'Деньги вернём вручную на тот же способ оплаты в течение 5 рабочих дней и напишем, когда возврат будет оформлен.',
    `Вопросы — ${support}, пишите с этого адреса.`,
    '',
    `Your gift “${en}” has been cancelled. The code and link no longer work.`,
    'We’ll refund you manually to the same payment method within 5 business days and let you know once the refund is issued.',
    `Questions — ${support}, write from this email address.`,
  ].join('\n');
  const html = [
    '<div style="background:#f6f3ea;padding:28px 12px;font-family:Arial,Helvetica,sans-serif">',
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:24px;padding:28px;color:#201c12">',
    '<h1 style="font-size:22px;margin:0 0 8px">Подарок отменён</h1>',
    `<p style="margin:0;color:#4c4636">«${htmlEscape(ru)}» — код и ссылка больше не работают. Деньги вернём вручную на тот же способ оплаты в течение 5 рабочих дней и напишем, когда возврат будет оформлен.</p>`,
    `<p style="margin:12px 0 0;color:#4c4636">Вопросы — ${htmlEscape(support)}, пишите с этого адреса.</p>`,
    '<h2 style="font-size:18px;margin:24px 0 8px">Gift cancelled</h2>',
    `<p style="margin:0;color:#4c4636">“${htmlEscape(en)}” — the code and link no longer work. We’ll refund you manually to the same payment method within 5 business days and let you know once the refund is issued.</p>`,
    `<p style="margin:12px 0 0;color:#4c4636">Questions — ${htmlEscape(support)}, write from this email address.</p>`,
    '</div></div>',
  ].join('');
  return { subject, text, html };
}

/**
 * Отправка письма об отмене. Повтор не шлёт второе письмо: флаг cancelEmailSentAtMs в заказе (навсегда)
 * плюс ключ идемпотентности Resend (он живёт только 24 ч — поэтому одного ключа мало, Ревизор 21.10).
 */
async function sendGiftCancelEmail(
  orderRef: FirebaseFirestore.DocumentReference,
  order: Readonly<Record<string, unknown>>,
): Promise<void> {
  const orderId = orderRef.id;
  if (Number(order.cancelEmailSentAtMs) > 0) {
    giftLog('cancel:email_skipped', { orderId, reason: 'already_sent', sentAtMs: Number(order.cancelEmailSentAtMs) });
    return;
  }
  const to = cleanEmail(order.email) ?? cleanEmail(order.customerEmail) ?? cleanEmail(order.payerEmail);
  const key = RESEND_API_KEY.value();
  const from = webCheckoutEmailFrom.value().trim();
  if (!to || !key || !from) {
    giftWarn('cancel:email_skipped', { orderId, reason: !to ? 'no_recipient' : !key ? 'no_resend_key' : 'no_from' });
    return;
  }
  const { subject, text, html } = buildGiftCancelEmail(order, webCheckoutSupportEmail.value() || 'support.phraseman@gmail.com');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: buildResendRequestHeaders(key, `gift-cancel-${orderId}`),
    body: JSON.stringify({ from, to: [to], subject, text, html }),
  });
  if (!response.ok) {
    giftWarn('cancel:email_failed', { orderId, status: response.status, body: (await response.text()).slice(0, 200) });
    return;
  }
  giftLog('cancel:email_sent', { orderId });
  await orderRef.set({ cancelEmailSentAtMs: Date.now() }, { merge: true }).catch((error: unknown) => {
    giftWarn('cancel:email_flag_failed', { orderId, message: error instanceof Error ? error.message.slice(0, 200) : String(error) });
  });
}

/** Лимит ручки: false — отказ (лимит или занятое окно), причина уже в журнале. */
async function withinRate(
  req: unknown,
  scope: string,
  perIp: number,
  globalPerDay: number,
): Promise<boolean> {
  try {
    await enforceCallerRateWindow({ scope, authUid: null, rawRequest: req, maxPerUid: 0, maxPerIp: perIp });
    // Общий суточный потолок — тот же помощник, ключ «uid» = имя ручки (один счётчик на всех).
    await enforceCallerRateWindow({ scope: `${scope}_global`, authUid: scope, rawRequest: null, maxPerUid: globalPerDay, maxPerIp: 0, windowMs: DAY_MS });
    return true;
  } catch (error) {
    const code = error instanceof HttpsError ? error.code : 'unknown';
    giftWarn('rate:refused', { scope, code, message: error instanceof Error ? error.message.slice(0, 120) : String(error) });
    return false;
  }
}

type GiftLinkStatus = 'active' | 'redeemed' | 'cancelled' | 'expired' | 'unknown';

export const giftLinkInfo = onRequest(PUBLIC_OPTIONS, async (req, res) => {
  if (applyCors(req as unknown as AnyRequest, res as unknown as AnyResponse)) return;
  const body = parseJsonBody(req as unknown as AnyRequest);
  const code = cleanShortText(body?.code, 40).toUpperCase();
  if (!CODE_RE.test(code)) {
    giftLog('link_info:early_exit', { reason: 'bad_code' });
    res.status(400).json({ ok: false, error: 'bad_code' });
    return;
  }
  if (!(await withinRate(req, 'gift_link_info', 60, 20000))) {
    res.status(429).json({ ok: false, error: 'rate_limited' });
    return;
  }
  try {
    const db = getFirestore();
    const codeSnap = await db.collection(PROMO_CODES).doc(code).get();
    const promo = codeSnap.exists ? codeSnap.data() ?? {} : null;
    // Только подарочные коды сайта: чужие промокоды по этой ручке не раскрываем.
    const orderId = promo && promo.createdBy === 'web_checkout' ? cleanShortText(promo.orderId, 200) : '';
    if (!promo || !orderId) {
      giftLog('link_info:unknown', { reason: !promo ? 'no_code' : 'not_web_gift' });
      res.status(200).json({ ok: true, status: 'unknown' satisfies GiftLinkStatus });
      return;
    }
    const orderSnap = await db.collection(ORDERS_COLLECTION).doc(orderId).get();
    const order = orderSnap.exists ? orderSnap.data() ?? {} : {};
    if (order.gift !== true) {
      giftLog('link_info:unknown', { reason: 'not_gift_order' });
      res.status(200).json({ ok: true, status: 'unknown' satisfies GiftLinkStatus });
      return;
    }
    const nowMs = Date.now();
    const used = Number(promo.usedCount) > 0 || Boolean(promo.lastRedeemedBy);
    const expiresAtMs = Number(promo.expiresAtMs) || 0;
    const status: GiftLinkStatus = used ? 'redeemed'
      : promo.enabled !== true ? 'cancelled'
        : expiresAtMs > 0 && nowMs >= expiresAtMs ? 'expired'
          : 'active';
    giftLog('link_info:out', { status });
    res.status(200).json({
      ok: true,
      status,
      plan: order.plan === 'monthly' ? 'monthly' : 'yearly',
      from: cleanShortText(order.giftFrom, 60) || null,
      to: cleanShortText(order.giftTo, 60) || null,
      expiresAtMs: expiresAtMs || null,
    });
  } catch (error) {
    giftWarn('link_info:failed', { message: error instanceof Error ? error.message.slice(0, 200) : String(error) });
    res.status(502).json({ ok: false, error: 'link_info_failed' });
  }
});

// зачем: письмо «подарок отменён» уходит через Resend — секрет привязан только к этой ручке.
export const giftCancel = onRequest({ ...PUBLIC_OPTIONS, secrets: [RESEND_API_KEY] }, async (req, res) => {
  if (applyCors(req as unknown as AnyRequest, res as unknown as AnyResponse)) return;
  const body = parseJsonBody(req as unknown as AnyRequest);
  const sessionId = cleanShortText(body?.sessionId, 120);
  const paypalOrderId = cleanShortText(body?.paypalOrderId, 64);
  if ((!sessionId && !paypalOrderId) || (sessionId && (sessionId.length < 20 || !sessionId.startsWith('cs_')))) {
    giftLog('cancel:early_exit', { reason: 'bad_reference' });
    res.status(400).json({ ok: false, error: 'bad_reference' });
    return;
  }
  if (!(await withinRate(req, 'gift_cancel', 20, 2000))) {
    res.status(429).json({ ok: false, error: 'rate_limited' });
    return;
  }
  try {
    const db = getFirestore();
    const field = sessionId ? 'stripeSessionId' : 'paypalOrderId';
    const found = await db.collection(ORDERS_COLLECTION).where(field, '==', sessionId || paypalOrderId).limit(1).get();
    if (found.empty) {
      giftLog('cancel:early_exit', { reason: 'order_not_found' });
      res.status(404).json({ ok: false, error: 'order_not_found' });
      return;
    }
    const orderRef = found.docs[0].ref;
    const outcome = await db.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      const order = orderSnap.data() ?? {};
      const code = cleanShortText(order.activationCode, 40).toUpperCase();
      if (order.gift !== true) return { ok: false as const, error: 'not_gift' };
      if (order.status === 'cancelled_by_buyer') return { ok: true as const, already: true, order };
      // web_checkout пишет только 'paid_pending_activation'; 'paid_pending_manual_activation' — старые заявки без кода: отменять нечего.
      if (order.status !== 'paid_pending_activation' || !code) return { ok: false as const, error: 'not_cancellable_status' };
      const codeRef = db.collection(PROMO_CODES).doc(code);
      const codeSnap = await tx.get(codeRef);
      const promo = codeSnap.data() ?? {};
      if (Number(promo.usedCount) > 0 || promo.lastRedeemedBy) return { ok: false as const, error: 'already_redeemed' };
      const nowMs = Date.now();
      // зачем (Ревизор 21.10, 🟡): истёкший код (365 дней) уже не подарок — отмена и возврат после срока не положены.
      if (Number(promo.expiresAtMs) > 0 && Number(promo.expiresAtMs) <= nowMs) return { ok: false as const, error: 'expired' };
      tx.set(codeRef, { enabled: false, updatedAtMs: nowMs, updatedBy: 'gift_cancel_by_buyer' }, { merge: true });
      tx.set(orderRef, {
        status: 'cancelled_by_buyer',
        cancelledAtMs: nowMs,
        cancelledAtIso: new Date(nowMs).toISOString(),
        refundStatus: 'manual_pending',
      }, { merge: true });
      return { ok: true as const, already: false, order };
    });
    giftLog('cancel:out', { ok: outcome.ok, error: 'error' in outcome ? outcome.error : null, already: 'already' in outcome ? outcome.already : null });
    if (!outcome.ok) {
      res.status(409).json({ ok: false, error: outcome.error });
      return;
    }
    // зачем (ревью Ядра 21.10): после отмены владелец обязан вернуть деньги вручную — иначе они «висят».
    // Ключ события — orderId: повторная отмена не шлёт второе письмо, а если первое не ушло — дошлёт.
    try {
      const alert = await enqueueAdminAlert(db, buildGiftCancelRefundAlert(orderRef.id, outcome.order, Date.now()));
      giftLog('cancel:refund_alert', { orderId: orderRef.id, created: alert.created });
    } catch (error) {
      giftWarn('cancel:refund_alert_failed', { orderId: orderRef.id, message: error instanceof Error ? error.message.slice(0, 200) : String(error) });
    }
    try {
      await sendGiftCancelEmail(orderRef, outcome.order);
    } catch (error) {
      giftWarn('cancel:email_threw', { orderId: orderRef.id, message: error instanceof Error ? error.message.slice(0, 200) : String(error) });
    }
    // Возврат денег — вручную через поддержку, пока владелец не решил иначе.
    res.status(200).json({ ok: true, refund: 'manual' });
  } catch (error) {
    giftWarn('cancel:failed', { message: error instanceof Error ? error.message.slice(0, 200) : String(error) });
    res.status(502).json({ ok: false, error: 'cancel_failed' });
  }
});
