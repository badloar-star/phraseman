import { getTrialInfo, trialDaysOrDefault } from '../app/paywall_trial_info';
import type { PurchasesPackage } from 'react-native-purchases';

const pkg = (product: Record<string, unknown>): PurchasesPackage =>
  ({ product } as unknown as PurchasesPackage);

describe('paywall_trial_info — getTrialInfo', () => {
  it('нет пакета → нет триала', () => {
    expect(getTrialInfo(null)).toEqual({ hasTrial: false, days: null });
    expect(getTrialInfo(undefined)).toEqual({ hasTrial: false, days: null });
  });

  it('iOS introPrice бесплатный, дни из periodNumberOfUnits+periodUnit', () => {
    const info = getTrialInfo(pkg({ introPrice: { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' } }));
    expect(info).toEqual({ hasTrial: true, days: 3 });
  });

  it('неделя → 7 дней', () => {
    expect(getTrialInfo(pkg({ introPrice: { price: 0, periodNumberOfUnits: 1, periodUnit: 'WEEK' } })))
      .toEqual({ hasTrial: true, days: 7 });
  });

  it('Android introductoryPrice ISO-период P3D', () => {
    expect(getTrialInfo(pkg({ introductoryPrice: { price: 0, period: 'P3D' } })))
      .toEqual({ hasTrial: true, days: 3 });
  });

  it('платная intro-фаза (price>0) НЕ триал', () => {
    expect(getTrialInfo(pkg({ introPrice: { price: 1.99, periodNumberOfUnits: 7, periodUnit: 'DAY' } })))
      .toEqual({ hasTrial: false, days: null });
  });

  it('есть триал, но длина не парсится → days=null', () => {
    expect(getTrialInfo(pkg({ introPrice: { price: 0 } })))
      .toEqual({ hasTrial: true, days: null });
  });
});

describe('paywall_trial_info — trialDaysOrDefault', () => {
  it('возвращает дни если известны', () => {
    expect(trialDaysOrDefault({ hasTrial: true, days: 7 })).toBe(7);
  });
  it('fallback 3 если триал есть, но дни неизвестны', () => {
    expect(trialDaysOrDefault({ hasTrial: true, days: null })).toBe(3);
  });
  it('кастомный fallback', () => {
    expect(trialDaysOrDefault({ hasTrial: true, days: null }, 14)).toBe(14);
  });
});
