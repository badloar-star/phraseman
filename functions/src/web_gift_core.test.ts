// зачем (владелец 21.10, подарок Plus через сайт): два способа — письмом с кодом и ссылкой /g/<КОД>; «по нику» снят.
// Тесты держат контракт: подарок только месяц/год, неизвестный способ (в т.ч. старое «nick») — письмом,
// письмо «ссылкой» содержит ссылку-подарок, письмо «письмом» — нет.
jest.mock('firebase-functions/logger', () => ({ info: jest.fn(), warn: jest.fn() }));

import { parseGiftDelivery, resolveGiftOrderDelivery } from './web_gift_core';
import { buildActivationEmail, GIFT_LINK_ORIGIN } from './web_checkout';

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
