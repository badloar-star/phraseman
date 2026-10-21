// ═══ Подарок Phraseman Plus через сайт — HTTP-ручки для knowlyapps.com/gift и /g/<КОД> ══════════════
// зачем (владелец 21.10, «да супер!» к макету docs/design/v2-app/site-gift.html; «по нику» снят владельцем в тот же день):
//  - giftLinkInfo — страница /g/<КОД>: какой подарок, от кого и жив ли он (активен / уже включён / отменён / истёк).
//  - giftCancel — покупатель отменяет код или ссылку до активации. Полномочие — тот же Stripe session id / PayPal order id,
//    по которому webOrderStatus уже отдаёт код. Деньги автоматически не возвращаем — владелец возвращает вручную через
//    поддержку (решение 21.10; ответ refund: 'manual').
// Сайт без входа, поэтому onRequest + CORS (как webCheckoutCreate), тело — JSON-строка без Content-Type.
// Журнал [GIFT-PLUS] на каждом раннем выходе и в catch.
import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onRequest } from 'firebase-functions/v2/https';

import { enforceCallerRateWindow } from './caller_rate_window';
import { applyCors, cleanShortText, parseJsonBody, type AnyRequest, type AnyResponse } from './web_checkout';
import { giftLog, giftWarn } from './web_gift_core';

const REGION = 'us-central1';
const ORDERS_COLLECTION = 'web_premium_orders';
const PROMO_CODES = 'promo_codes';
const DAY_MS = 24 * 60 * 60 * 1000;
const PUBLIC_OPTIONS = { region: REGION, memory: '256MiB' as const, timeoutSeconds: 15, maxInstances: 5, invoker: 'public' as const };
const CODE_RE = /^[A-Z0-9_-]{3,32}$/;

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

export const giftCancel = onRequest(PUBLIC_OPTIONS, async (req, res) => {
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
      if (order.status === 'cancelled_by_buyer') return { ok: true as const, already: true };
      if (order.status !== 'paid_pending_activation' || !code) return { ok: false as const, error: 'not_cancellable_status' };
      const codeRef = db.collection(PROMO_CODES).doc(code);
      const codeSnap = await tx.get(codeRef);
      const promo = codeSnap.data() ?? {};
      if (Number(promo.usedCount) > 0 || promo.lastRedeemedBy) return { ok: false as const, error: 'already_redeemed' };
      const nowMs = Date.now();
      tx.set(codeRef, { enabled: false, updatedAtMs: nowMs, updatedBy: 'gift_cancel_by_buyer' }, { merge: true });
      tx.set(orderRef, {
        status: 'cancelled_by_buyer',
        cancelledAtMs: nowMs,
        cancelledAtIso: new Date(nowMs).toISOString(),
        refundStatus: 'manual_pending',
      }, { merge: true });
      return { ok: true as const, already: false };
    });
    giftLog('cancel:out', { ok: outcome.ok, error: 'error' in outcome ? outcome.error : null, already: 'already' in outcome ? outcome.already : null });
    if (!outcome.ok) {
      res.status(409).json({ ok: false, error: outcome.error });
      return;
    }
    // Возврат денег — вручную через поддержку, пока владелец не решил иначе.
    res.status(200).json({ ok: true, refund: 'manual' });
  } catch (error) {
    giftWarn('cancel:failed', { message: error instanceof Error ? error.message.slice(0, 200) : String(error) });
    res.status(502).json({ ok: false, error: 'cancel_failed' });
  }
});
