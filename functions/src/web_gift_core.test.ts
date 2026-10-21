// зачем (владелец 21.10, подарок Plus через сайт): два способа — письмом с кодом и ссылкой /g/<КОД>; «по нику» снят.
// Тесты держат контракт: подарок только месяц/год, неизвестный способ (в т.ч. старое «nick») — письмом,
// письмо «ссылкой» содержит ссылку-подарок, письмо «письмом» — нет.
jest.mock('firebase-functions/logger', () => ({ info: jest.fn(), warn: jest.fn() }));

import { parseGiftDelivery, resolveGiftOrderDelivery } from './web_gift_core';
import { buildActivationEmail, GIFT_LINK_ORIGIN } from './web_checkout';
import { buildAdminAlertOutboxDocument } from './admin_alert_outbox';
import { buildGiftCancelEmail, buildGiftCancelRefundAlert } from './web_gift_endpoints';

describe('parseGiftDelivery', () => {
  it('keeps link', () => {
    expect(parseGiftDelivery('link')).toBe('link');
  });

  it.each([undefined, null, '', 'email', 'nick', 'LINK', 42])('falls back to email for %p', (raw) => {
    expect(parseGiftDelivery(raw)).toBe('email');
  });
});

describe('resolveGiftOrderDelivery', () => {
  it('non-gift orders are always email', () => {
    expect(resolveGiftOrderDelivery({ delivery: 'link' }, 'lifetime', false)).toEqual({ ok: true, delivery: 'email' });
  });

  it.each(['monthly', 'yearly'])('gift %s keeps the chosen link delivery', (plan) => {
    expect(resolveGiftOrderDelivery({ delivery: 'link' }, plan, true)).toEqual({ ok: true, delivery: 'link' });
  });

  it('a removed nick delivery degrades to email instead of failing the purchase', () => {
    expect(resolveGiftOrderDelivery({ delivery: 'nick', recipientToken: 'x' }, 'yearly', true)).toEqual({ ok: true, delivery: 'email' });
  });

  it('a lifetime gift is refused before any order is created', () => {
    expect(resolveGiftOrderDelivery({}, 'lifetime', true)).toEqual({ ok: false, error: 'gift_plan_not_allowed' });
  });
});

describe('buildActivationEmail gift link', () => {
  const support = 'support.phraseman@gmail.com';
  const base = {
    activationCode: 'WEB-7QW8E9R2TY',
    plan: 'yearly',
    product: 'yearly',
    gift: true,
    giftPhraseId: 'yearly-01',
    codeExpiresAtMs: Date.UTC(2027, 9, 21),
  };

  it('link delivery puts the /g/ link into subject, text and html', () => {
    const { subject, text, html } = buildActivationEmail({ ...base, giftDelivery: 'link' }, support);
    const link = `${GIFT_LINK_ORIGIN}/g/WEB-7QW8E9R2TY`;
    expect(subject).toContain('Ссылка-подарок');
    expect(text).toContain(link);
    expect(html).toContain(link);
    expect(text).toContain('WEB-7QW8E9R2TY');
  });

  it('email delivery keeps the classic certificate without a link', () => {
    const { subject, text, html } = buildActivationEmail({ ...base, giftDelivery: 'email' }, support);
    expect(subject).toContain('WEB-7QW8E9R2TY');
    expect(text).not.toContain('/g/');
    expect(html).not.toContain('data-gift-link');
  });

  it('a non-gift purchase never gets a gift link even if the field leaks in', () => {
    const { text } = buildActivationEmail({ ...base, gift: false, giftDelivery: 'link' }, support);
    expect(text).not.toContain('/g/');
  });
});

// зачем (ревью Ядра 21.10): отмена подарка = ручной возврат денег; владелец узнаёт об этом сразу,
// оповещение «Возврат средств» проходит проверку и очистку общего outbox, ключ — orderId.

describe('buildGiftCancelRefundAlert', () => {
  const order = { provider: 'paypal', plan: 'yearly', amountCents: 3999, currency: 'eur', email: 'buyer@example.com', activationCode: 'WEB-7QW8E9R2TY' };

  it('is a refund alert keyed by the order id', () => {
    const alert = buildGiftCancelRefundAlert('ord123', order, 1_700_000_000_000);
    expect(alert.eventType).toBe('refund');
    expect(alert.source).toBe('web.gift_cancel');
    expect(alert.sourceId).toBe('ord123');
    expect(alert.payload).toEqual(expect.objectContaining({ provider: 'PayPal', product: 'yearly', amount: 39.99, currency: 'EUR', status: 'cancel_requested', route: '#site-admin' }));
  });

  it('passes the outbox validation and never carries email or the code', () => {
    const doc = buildAdminAlertOutboxDocument(buildGiftCancelRefundAlert('ord123', order, 1_700_000_000_000), 1_700_000_000_001);
    const text = JSON.stringify(doc);
    expect(doc.eventType).toBe('refund');
    expect(text).not.toContain('buyer@example.com');
    expect(text).not.toContain('WEB-7QW8E9R2TY');
    expect(text).toContain('Причина возврата');
  });

  it('marks test payments as SANDBOX and everything else (incl. orders before the field) as PRODUCTION', () => {
    expect(buildGiftCancelRefundAlert('o1', { ...order, paymentLivemode: false }, 1).payload.environment).toBe('SANDBOX');
    expect(buildGiftCancelRefundAlert('o2', { ...order, paymentLivemode: true }, 1).payload.environment).toBe('PRODUCTION');
    expect(buildGiftCancelRefundAlert('o3', order, 1).payload.environment).toBe('PRODUCTION');
    const doc = buildAdminAlertOutboxDocument(buildGiftCancelRefundAlert('o4', { ...order, paymentLivemode: false }, 1), 2) as { payload: { environment?: string } };
    expect(doc.payload.environment).toBe('SANDBOX');
  });

  it('defaults to Stripe and tolerates a missing currency', () => {
    const alert = buildGiftCancelRefundAlert('ord9', { plan: 'monthly', amountCents: 799 }, 1_700_000_000_000);
    expect(alert.payload.provider).toBe('Stripe');
    expect(alert.payload.amount).toBe(7.99);
    expect(() => buildAdminAlertOutboxDocument(alert, 1_700_000_000_001)).not.toThrow();
  });
});

describe('buildGiftCancelEmail', () => {
  it('tells the buyer in Russian and English that the code is void and the refund is manual', () => {
    const { subject, text, html } = buildGiftCancelEmail({ plan: 'monthly', email: 'buyer@example.com' }, 'support.phraseman@gmail.com');
    expect(subject).toContain('отменён');
    expect(text).toContain('Месяц Phraseman Plus');
    expect(text).toContain('вернём вручную');
    expect(text).toContain('refund you manually');
    expect(html).toContain('support.phraseman@gmail.com');
    expect(text).not.toMatch(/\d+\s*(дн|day)/); // срок возврата не обещаем, пока владелец его не назвал
  });
});
