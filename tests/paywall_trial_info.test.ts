import { buildSubscriptionDisclosureRu, getTrialInfo } from '../app/paywall_trial_info';
import type { PurchasesPackage } from 'react-native-purchases';

const pkg = (product: Record<string, unknown>): PurchasesPackage =>
  ({ product } as unknown as PurchasesPackage);

describe('paywall_trial_info — getTrialInfo', () => {
  it('нет пакета → нет триала', () => {
    expect(getTrialInfo(null)).toEqual({ hasTrial: false, days: null });
    expect(getTrialInfo(undefined)).toEqual({ hasTrial: false, days: null });
  });

  it('iOS показывает бесплатный introPrice только при подтверждённой eligibility', () => {
    const product = pkg({ introPrice: { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' } });
    expect(getTrialInfo(product, 'unknown')).toEqual({ hasTrial: false, days: null });
    expect(getTrialInfo(product, 'ineligible')).toEqual({ hasTrial: false, days: null });
    const info = getTrialInfo(product, 'eligible');
    expect(info).toEqual({ hasTrial: true, days: 3 });
  });

  it('неделя → 7 дней', () => {
    expect(getTrialInfo(pkg({ introPrice: { price: 0, periodNumberOfUnits: 1, periodUnit: 'WEEK' } }), 'eligible'))
      .toEqual({ hasTrial: true, days: 7 });
  });

  it('Android использует применимую defaultOption.freePhase без синтетического fallback', () => {
    expect(getTrialInfo(pkg({
      defaultOption: {
        freePhase: {
          price: { amountMicros: 0 },
          billingPeriod: { unit: 'DAY', value: 3, iso8601: 'P3D' },
        },
      },
    })))
      .toEqual({ hasTrial: true, days: 3 });
  });

  it('платная intro-фаза (price>0) НЕ триал', () => {
    expect(getTrialInfo(pkg({ introPrice: { price: 1.99, periodNumberOfUnits: 7, periodUnit: 'DAY' } }), 'eligible'))
      .toEqual({ hasTrial: false, days: null });
  });

  it('не показывает триал, если магазин не сообщил его длительность', () => {
    expect(getTrialInfo(pkg({ introPrice: { price: 0 } }), 'eligible'))
      .toEqual({ hasTrial: false, days: null });
  });
});

describe('paywall_trial_info — обязательное раскрытие условий', () => {
  it('показывает длительность, следующую цену, период, автопродление и отмену', () => {
    expect(buildSubscriptionDisclosureRu({ trialDays: 3, price: '€24,99', period: 'год' })).toBe(
      '3 дня бесплатно, затем €24,99 в год. Подписка продлевается автоматически. Отменить можно в настройках магазина.',
    );
  });

  it('без подтверждённого триала показывает обычные условия подписки', () => {
    expect(buildSubscriptionDisclosureRu({ trialDays: null, price: '€4,99', period: 'месяц' })).toBe(
      '€4,99 в месяц. Подписка продлевается автоматически. Отменить можно в настройках магазина.',
    );
  });
});
