import { getTrialInfo, trialDaysOrDefault } from '../app/paywall_trial_info';
import type { PurchasesPackage } from 'react-native-purchases';

const pkg = (product: Record<string, unknown>): PurchasesPackage =>
  ({ product } as unknown as PurchasesPackage);

describe('paywall_trial_info — getTrialInfo', () => {
  it('нет пакета → нет триала', () => {
    expect(getTrialInfo(null)).toEqual({ hasTrial: false, days: null });
    expect(getTrialInfo(undefined)).toEqual({ hasTrial: false, days: null });
  });

  it('не показывает non-7 intro как обещанный trial', () => {
    const info = getTrialInfo(pkg({ introPrice: { price: 0, periodNumberOfUnits: 3, periodUnit: 'DAY' } }));
    expect(info).toEqual({ hasTrial: false, days: null });
  });

  it('неделя → 7 дней', () => {
    expect(getTrialInfo(pkg({ introPrice: { price: 0, periodNumberOfUnits: 1, periodUnit: 'WEEK' } })))
      .toEqual({ hasTrial: true, days: 7 });
  });

  it('месячный и lifetime планы не получают trial framing даже с бесплатной фазой', () => {
    const weekly = pkg({ introductoryPrice: { price: 0, period: 'P1W' } });
    expect(getTrialInfo(weekly, 'monthly')).toEqual({ hasTrial: false, days: null });
    expect(getTrialInfo(weekly, 'lifetime')).toEqual({ hasTrial: false, days: null });
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
    expect(trialDaysOrDefault({ hasTrial: true, days: 7 })).toBe(7);
  });
  it('не подменяет неизвестную длительность fallback-значением', () => {
    expect(trialDaysOrDefault({ hasTrial: true, days: null })).toBeNull();
  });
});
