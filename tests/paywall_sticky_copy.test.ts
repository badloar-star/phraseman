import { periodLabelFor, stickyStringsFor } from '../components/paywall/paywallScreenCopy';

describe('paywall sticky copy', () => {
  it('spells out the monthly period in the Russian sticky bar', () => {
    const copy = stickyStringsFor('ru', {
      trialDays: null,
      price: '€5,99',
      period: periodLabelFor('ru', 'monthly'),
    });

    expect(copy.title).toBe('Plus');
    expect(copy.sub).toBe('€5,99 в месяц · отмена в любой момент');
    expect(copy.sub).not.toContain('/мес');
    expect(copy.button).toBe('Открыть доступ');
  });

  it('keeps trial sticky copy about the real period without inventing a date', () => {
    const copy = stickyStringsFor('ru', {
      trialDays: 3,
      price: '€5,99',
      period: periodLabelFor('ru', 'monthly'),
    });

    expect(copy.title).toBe('3 дн. бесплатно');
    expect(copy.sub).toBe('затем €5,99 в месяц · отмена в любой момент');
    expect(copy.sub).not.toMatch(/\d{4}|январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр/i);
  });
});
