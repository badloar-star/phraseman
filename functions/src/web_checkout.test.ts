import {
  activationRewardForPlan,
  buildActivationEmail,
  generateActivationCode,
  GIFT_CODE_TTL_DAYS,
  giftCodeExpiryMs,
  giftPlanTitle,
  productNameForPlan,
} from './web_checkout';
import {
  GIFT_CERTIFICATE_PHRASES,
  resolveGiftPhrase,
} from './gift_certificate_phrases';

describe('resolveGiftPhrase', () => {
  it('keeps a valid phrase inside its purchased plan', () => {
    const phrase = GIFT_CERTIFICATE_PHRASES.yearly[17];
    expect(resolveGiftPhrase('yearly', phrase.id)).toEqual(phrase);
  });

  it('does not accept a phrase identifier from another plan', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0);
    expect(resolveGiftPhrase('yearly', 'monthly-01')).toEqual(GIFT_CERTIFICATE_PHRASES.yearly[0]);
    random.mockRestore();
  });

  it('falls back within the purchased plan for a missing identifier', () => {
    const random = jest.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(resolveGiftPhrase('lifetime', undefined)).toEqual(GIFT_CERTIFICATE_PHRASES.lifetime[49]);
    random.mockRestore();
  });
});

describe('activationRewardForPlan', () => {
  it('monthly → 31 день', () => {
    expect(activationRewardForPlan('monthly')).toEqual({ rewardDays: 31, rewardKind: 'days' });
  });
  it('yearly → 366 дней', () => {
    expect(activationRewardForPlan('yearly')).toEqual({ rewardDays: 366, rewardKind: 'days' });
  });
  it('lifetime → бессрочный VIP', () => {
    expect(activationRewardForPlan('lifetime')).toEqual({ rewardDays: 0, rewardKind: 'lifetime' });
  });
});

describe('generateActivationCode', () => {
  it('формат WEB-XXXXXXXXXX, совместим с promoCodeRedeem (CODE_RE), без похожих символов', () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateActivationCode();
      // Тот же контракт, что CODE_RE в promo_codes.ts: A-Z 0-9 _ - длиной 3..32.
      expect(code).toMatch(/^WEB-[A-HJ-NP-Z2-9]{10}$/);
      expect(code).not.toMatch(/[01IO]/);
      expect(code.length).toBeLessThanOrEqual(32);
    }
  });
  it('коды не повторяются', () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateActivationCode()));
    expect(seen.size).toBe(200);
  });
});

// зачем: витрина/письма называют продукты Plus/Pro (решение владельца 2026-07-26),
// внутренние ключи планов не меняются — проверяем только видимые имена.
describe('productNameForPlan / giftPlanTitle', () => {
  it('monthly/yearly → Phraseman Plus, lifetime → Phraseman Pro', () => {
    expect(productNameForPlan('monthly', false)).toBe('Phraseman Plus — месяц');
    expect(productNameForPlan('yearly', false)).toBe('Phraseman Plus — год');
    expect(productNameForPlan('lifetime', false)).toBe('Phraseman Pro — навсегда');
  });
  it('подарочный вариант получает пометку (подарок)', () => {
    expect(productNameForPlan('yearly', true)).toBe('Phraseman Plus — год (подарок)');
    expect(productNameForPlan('lifetime', true)).toBe('Phraseman Pro — навсегда (подарок)');
  });
  it('названия подарка на сертификате', () => {
    expect(giftPlanTitle('monthly')).toBe('Месяц Phraseman Plus');
    expect(giftPlanTitle('yearly')).toBe('Год Phraseman Plus');
    expect(giftPlanTitle('lifetime')).toBe('Phraseman Pro — навсегда');
  });
});

describe('giftCodeExpiryMs', () => {
  it('подарочный код живёт ровно 365 дней', () => {
    const now = 1_753_500_000_000;
    expect(giftCodeExpiryMs(now, true)).toBe(now + GIFT_CODE_TTL_DAYS * 24 * 60 * 60 * 1000);
  });
  it('обычная покупка «себе» — код бессрочный (0), как раньше', () => {
    expect(giftCodeExpiryMs(1_753_500_000_000, false)).toBe(0);
  });
});

describe('buildActivationEmail', () => {
  const support = 'support.phraseman@gmail.com';

  it.each([
    ['monthly', 'gift-certificate-monthly.webp'],
    ['yearly', 'gift-certificate-yearly.webp'],
    ['lifetime', 'gift-certificate-lifetime.webp'],
  ] as const)('uses the deployed %s certificate art in paid gift email', (plan, filename) => {
    const { html } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan,
      gift: true,
      codeExpiresAtMs: Date.UTC(2027, 0, 1),
    }, support);

    expect(html).toContain(`https://knowlyapps.com/assets/gift-certificates/${filename}`);
    expect(html).toContain('data-gift-certificate-art="true"');
  });

  it('keeps the recipient-facing gift certificate free of payment commentary', () => {
    const { html, text } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'yearly',
      gift: true,
      codeExpiresAtMs: Date.UTC(2027, 0, 1),
    }, support);

    expect(html).not.toContain('Разовый платёж');
    expect(text).not.toContain('Разовый платёж');
  });

  it('именной сертификат: Для/От, название подарка, код, срок действия', () => {
    const { subject, text, html } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'yearly',
      gift: true,
      giftTo: 'Маша',
      giftFrom: 'Саша',
      codeExpiresAtMs: Date.UTC(2027, 6, 26),
    }, support);
    expect(subject).toContain('Подарочный сертификат');
    expect(subject).toContain('WEB-ABCDEFGHJK');
    expect(html).toContain('ПОДАРОЧНЫЙ СЕРТИФИКАТ');
    expect(html).toContain('Для: Маша');
    expect(html).toContain('от Саша');
    expect(html).toContain('Год Phraseman Plus');
    expect(html).toContain('WEB-ABCDEFGHJK');
    expect(html).toContain('26.07.2027');
    expect(text).toContain('Для: Маша');
    expect(text).toContain('Сертификат действует до 26.07.2027');
  });

  it('без имён — заголовок называет конкретный подарок, без дубля и без «вам подарили английский»', () => {
    const { html, text } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'monthly',
      gift: true,
      codeExpiresAtMs: Date.UTC(2027, 0, 1),
    }, support);
    expect(html).not.toContain('Вам подарили');
    expect(html).not.toContain('Для: ');
    expect(text).not.toContain('Для: ');
    expect((html.match(/Месяц Phraseman Plus/g) ?? []).length).toBe(1);
  });

  it('keeps only gift identity, phrase, code and expiry inside the decorated certificate', () => {
    const phrase = GIFT_CERTIFICATE_PHRASES.yearly[17];
    const { html, text } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'yearly',
      gift: true,
      giftTo: 'Маша',
      giftFrom: 'Саша',
      giftPhraseId: phrase.id,
      testIssue: true,
      codeExpiresAtMs: Date.UTC(2027, 6, 26),
    }, support);
    const certificate = html.match(/<table data-gift-certificate-art="true"[\s\S]*?<\/table>/)?.[0] ?? '';
    const instructions = html.match(/<div data-gift-instructions="true"[\s\S]*?<\/div>/)?.[0] ?? '';

    expect(certificate).toContain('Для: Маша');
    expect(certificate).toContain('от Саша');
    expect(certificate).toContain('Год Phraseman Plus');
    expect(certificate).toContain(phrase.text);
    expect(certificate).toContain('WEB-ABCDEFGHJK');
    expect(certificate).toContain('26.07.2027');
    expect(certificate).not.toContain('Как включить доступ');
    expect(certificate).not.toContain('Скачайте Phraseman');
    expect(certificate).not.toContain('Перешлите это письмо');
    expect(certificate).not.toContain(support);
    expect(certificate).not.toContain('ТЕСТОВАЯ ВЫДАЧА');

    expect(instructions).toContain('ТЕСТОВАЯ ВЫДАЧА');
    expect(instructions).toContain('Как включить доступ');
    expect(instructions).toContain('Скачайте Phraseman');
    expect(instructions).toContain('Перешлите это письмо');
    expect(instructions).toContain(support);
    expect(html.indexOf(instructions)).toBeGreaterThan(html.indexOf('</table>'));
    expect(text).toContain(phrase.text);
    expect(text.indexOf(phrase.text)).toBeLessThan(text.indexOf('Код активации'));
  });

  it('оплаченный подарочный код стоит простой строкой внизу без плашки', () => {
    const { html } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'lifetime',
      gift: true,
      giftTo: 'Маша',
      codeExpiresAtMs: Date.UTC(2027, 0, 1),
    }, support);
    const codeLine = html.match(/<div data-gift-code="true"[^>]*>WEB-ABCDEFGHJK<\/div>/)?.[0] ?? '';

    expect(codeLine).not.toBe('');
    expect(codeLine).not.toContain('background:');
    expect(codeLine).not.toContain('border-radius:');
    expect(codeLine).not.toContain('padding:');
    expect(html.indexOf(codeLine)).toBeLessThan(html.indexOf('Как включить доступ:'));
  });

  it('обычная покупка: нейминг Plus/Pro, без слова «сертификат», без срока', () => {
    const { subject, html, text } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'lifetime',
      gift: false,
      codeExpiresAtMs: 0,
    }, support);
    expect(subject).toBe('Ваш код активации Phraseman: WEB-ABCDEFGHJK');
    expect(html).toContain('Phraseman Pro — навсегда');
    expect(html).not.toContain('СЕРТИФИКАТ');
    expect(html).not.toContain('действует до');
    expect(text).not.toContain('действует до');
  });

  it('вёрстка без рамок-обводок и имена экранируются', () => {
    const { html } = buildActivationEmail({
      activationCode: 'WEB-ABCDEFGHJK',
      plan: 'yearly',
      gift: true,
      giftTo: '<script>alert(1)</script>',
      giftFrom: 'A&B',
      codeExpiresAtMs: Date.UTC(2027, 0, 1),
    }, support);
    expect(html).not.toMatch(/border:\s*1px/);
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('A&amp;B');
  });
});
