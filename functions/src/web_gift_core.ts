// ═══ Подарок Phraseman Plus через сайт — правила вручения (без HTTP) ══════════════
// зачем (владелец 21.10): подарок вручается двумя способами — код на почту покупателю (как было) или ссылка
// knowlyapps.com/g/<КОД>, которую покупатель отправляет сам. «По нику» владелец снял 21.10 ~22:20.
// При действующем Plus подарок ПРОДЛЕВАЕТ срок (обычный путь промокода). Только месяц и год.
// Код и ссылку можно отменить до активации; деньги возвращает владелец вручную через поддержку.
//
// HTTP-ручки живут в web_gift_endpoints.ts; web_checkout.ts берёт отсюда разбор способа (без циклических импортов).
import * as logger from 'firebase-functions/logger';

export const GIFT_LOG = '[GIFT-PLUS]';

export type GiftDelivery = 'email' | 'link';

export function giftLog(step: string, fields: Record<string, unknown> = {}): void {
  logger.info(`${GIFT_LOG} ${step}`, fields);
}

export function giftWarn(step: string, fields: Record<string, unknown> = {}): void {
  logger.warn(`${GIFT_LOG} ${step}`, fields);
}

/** Способ вручения из тела запроса сайта; неизвестное и пустое (в т.ч. снятое «nick») — письмом, как до 21.10. */
export function parseGiftDelivery(raw: unknown): GiftDelivery {
  return raw === 'link' ? 'link' : 'email';
}

export type GiftOrderDeliveryDecision =
  | Readonly<{ ok: true; delivery: GiftDelivery }>
  | Readonly<{ ok: false; error: 'gift_plan_not_allowed' }>;

/**
 * Способ вручения для нового заказа (webCheckoutCreate / paypalOrderCreate). Не подарок — всегда 'email'.
 * Подарок «навсегда» отклоняем (владелец 21.10: только месяц и год).
 */
export function resolveGiftOrderDelivery(
  body: Record<string, unknown>,
  plan: string,
  gift: boolean,
): GiftOrderDeliveryDecision {
  if (!gift) return { ok: true, delivery: 'email' };
  if (plan !== 'monthly' && plan !== 'yearly') {
    giftLog('order:rejected', { reason: 'gift_plan_not_allowed', plan });
    return { ok: false, error: 'gift_plan_not_allowed' };
  }
  const delivery = parseGiftDelivery(body.delivery);
  giftLog('order:delivery', { delivery, raw: typeof body.delivery === 'string' ? body.delivery.slice(0, 12) : null });
  return { ok: true, delivery };
}
