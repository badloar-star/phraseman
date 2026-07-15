import { getTrialInfo, trialDaysOrDefault } from '../app/paywall_trial_info';
import type { PurchasesPackage } from 'react-native-purchases';

const pkg = (product: Record<string, unknown>): PurchasesPackage =>
  ({ product } as unknown as PurchasesPackage);

describe('paywall_trial_info — getTrialInfo', () => {
  it('нет пакета → нет триала', () => {
    expect(getTrialInfo(null)).toEqual({ hasTrial: false, days: null });
    expect(getTrialInfo(undefined)).toEqual({ hasTrial: false, days: null });
  });

  it('показывает подтверждённый трёхдневный trial', () => {
    const info = getTrialInfo(pkg({ introPrice: { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' } }));
    expect(info).toEqual({ hasTrial: true, days: 3 });
  });

  it('recognizes the selected Android default option with a three-day free phase', () => {
    const info = getTrialInfo(pkg({
      defaultOption: {
        freePhase: {
          billingPeriod: { unit: 'DAY', value: 3, iso8601: 'P3D' },
        },
      },
    }));
    expect(info).toEqual({ hasTrial: true, days: 3 });
  });

  it('does not frame a seven-day Android free phase as the current three-day trial', () => {
    const info = getTrialInfo(pkg({
      defaultOption: { freePhase: { billingPeriod: 'P1W' } },
    }));
    expect(info).toEqual({ hasTrial: false, days: null });
  });

  it('does not treat a paid Android intro phase as a free trial', () => {
    const info = getTrialInfo(pkg({
      defaultOption: {
        freePhase: null,
        introPhase: {
          billingPeriod: { unit: 'DAY', value: 3, iso8601: 'P3D' },
          price: { amountMicros: 990000 },
        },
      },
    }));
    expect(info).toEqual({ hasTrial: false, days: null });
  });

  it('не показывает недельную intro-фазу как трёхдневный trial', () => {
    expect(getTrialInfo(pkg({ introPrice: { price: 0, periodNumberOfUnits: 1, periodUnit: 'WEEK' } })))
      .toEqual({ hasTrial: false, days: null });
  });

  it('месячный и lifetime планы не получают trial framing даже с бесплатной фазой', () => {
    const threeDays = pkg({ introductoryPrice: { price: 0, period: 'P3D' } });
    expect(getTrialInfo(threeDays, 'monthly')).toEqual({ hasTrial: false, days: null });
    expect(getTrialInfo(threeDays, 'lifetime')).toEqual({ hasTrial: false, days: null });
  });

  it('платная intro-фаза (price>0) НЕ триал', () => {
    expect(getTrialInfo(pkg({ introPrice: { price: 1.99, periodNumberOfUnits: 7, periodUnit: 'DAY' } })))
      .toEqual({ hasTrial: false, days: null });
  });

  it('неизвестная длина не получает trial framing', () => {
    expect(getTrialInfo(pkg({ introPrice: { price: 0 } })))
      .toEqual({ hasTrial: false, days: null });
  });

  it('неизвестная цена не считается бесплатным trial', () => {
    expect(getTrialInfo(pkg({ introPrice: { periodNumberOfUnits: 1, periodUnit: 'WEEK' } })))
      .toEqual({ hasTrial: false, days: null });
  });
});

describe('paywall_trial_info — trialDaysOrDefault', () => {
  it('возвращает дни если известны', () => {
    expect(trialDaysOrDefault({ hasTrial: true, days: 3 })).toBe(3);
  });
  it('не подменяет неизвестную длительность fallback-значением', () => {
    expect(trialDaysOrDefault({ hasTrial: true, days: null })).toBeNull();
  });
});
