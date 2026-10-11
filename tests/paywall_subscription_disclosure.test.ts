import { buildSubscriptionDisclosureRu } from '../app/paywall_trial_info';
import { buildSubscriptionDisclosure } from '../app/paywall_subscription_disclosure';
import { formatOnboardingDateLong, formatOnboardingLockDate, onboardingDaysWord, ONBOARDING_LANG_KEYS } from '../components/onboarding/clean_onboarding_dates';

// зачем (координатор 12.10, требование сторов): условия подписки показываются на языке человека; русский остаётся прежним байт в байт.
describe('subscription disclosure on every interface language', () => {
  it('Russian output is identical to the legacy builder', () => {
    for (const trialDays of [null, 1, 3, 7, 11, 14, 21]) {
      expect(buildSubscriptionDisclosure('ru', { trialDays, price: '€24,99', period: 'year' }))
        .toBe(buildSubscriptionDisclosureRu({ trialDays, price: '€24,99', period: 'год' }));
      expect(buildSubscriptionDisclosure('ru', { trialDays, price: '€4,99', period: 'month' }))
        .toBe(buildSubscriptionDisclosureRu({ trialDays, price: '€4,99', period: 'месяц' }));
    }
  });

  it('English and Ukrainian read naturally', () => {
    expect(buildSubscriptionDisclosure('en', { trialDays: 3, price: '$24.99', period: 'year' }))
      .toBe('3 days free, then $24.99 per year. The subscription renews automatically. You can cancel in your store settings.');
    expect(buildSubscriptionDisclosure('en', { trialDays: 1, price: '$4.99', period: 'month' }))
      .toBe('1 day free, then $4.99 per month. The subscription renews automatically. You can cancel in your store settings.');
    expect(buildSubscriptionDisclosure('uk', { trialDays: 3, price: '€24,99', period: 'year' }))
      .toBe('3 дні безкоштовно, потім €24,99 на рік. Підписка продовжується автоматично. Скасувати можна в налаштуваннях магазину.');
    expect(buildSubscriptionDisclosure('uk', { trialDays: null, price: '€4,99', period: 'month' }))
      .toBe('€4,99 на місяць. Підписка продовжується автоматично. Скасувати можна в налаштуваннях магазину.');
  });

  it('every language states price, the renewal and the cancel route, with and without a trial', () => {
    for (const lang of ONBOARDING_LANG_KEYS) {
      for (const trialDays of [null, 3]) {
        for (const period of ['year', 'month'] as const) {
          const text = buildSubscriptionDisclosure(lang, { trialDays, price: '€9,99', period });
          expect(text).toContain('€9,99');
          expect(text.length).toBeGreaterThan(60);
          if (trialDays) expect(text).toContain('3');
          // Автопродление и отмена — отдельным предложением после условий цены.
          expect(text.split('. ').length).toBeGreaterThanOrEqual(2);
        }
      }
    }
  });

  it('an unknown language falls back to English instead of Russian', () => {
    expect(buildSubscriptionDisclosure('xx', { trialDays: null, price: '$1', period: 'month' })).toContain('renews automatically');
  });
});

describe('onboarding dates and day words', () => {
  const date = new Date(2026, 7, 20); // четверг, 20 августа 2026

  it('keeps the Russian output unchanged', () => {
    expect(formatOnboardingDateLong(date, 'ru')).toBe('20 августа 2026');
    expect(formatOnboardingLockDate(date, 'ru')).toBe('Чт, 20 авг');
    expect([1, 2, 5, 11, 21].map((n) => onboardingDaysWord(n, 'ru'))).toEqual(['день', 'дня', 'дней', 'дней', 'день']);
  });

  it('formats the long date per language', () => {
    expect(formatOnboardingDateLong(date, 'en')).toBe('August 20, 2026');
    expect(formatOnboardingDateLong(date, 'uk')).toBe('20 серпня 2026');
    expect(formatOnboardingDateLong(date, 'es')).toBe('20 de agosto de 2026');
    expect(formatOnboardingDateLong(date, 'pt-BR')).toBe('20 de agosto de 2026');
    expect(formatOnboardingDateLong(date, 'pl')).toBe('20 sierpnia 2026');
    expect(formatOnboardingDateLong(date, 'xx')).toBe('August 20, 2026');
  });

  it('forms the day word with the right plural', () => {
    expect([1, 3, 5].map((n) => onboardingDaysWord(n, 'uk'))).toEqual(['день', 'дні', 'днів']);
    expect([1, 3].map((n) => onboardingDaysWord(n, 'en'))).toEqual(['day', 'days']);
    expect([1, 3].map((n) => onboardingDaysWord(n, 'pl'))).toEqual(['dzień', 'dni']);
  });
});
