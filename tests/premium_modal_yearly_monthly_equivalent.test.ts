import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');

describe('premium modal yearly monthly equivalent display', () => {
  it('derives the monthly equivalent from RevenueCat store product pricing', () => {
    expect(source).toContain('storePricePerMonthTrim');
    expect(source).toContain('pricePerMonthString');
    expect(source).toContain('const yearlyMonthlyEquivalent');
  });

  it('keeps the annual billed amount primary and shows monthly equivalent as secondary copy', () => {
    expect(source).toContain('monthlyEquivalentLabel');
    expect(source).toContain('yearlyBillingNote');
    expect(source).toContain('selected === \'yearly\' ? yearlyMonthlyEquivalent : \'\'');
    expect(source.indexOf('{priceStr}')).toBeLessThan(source.indexOf('{monthlyEquivalentLabel}'));
  });

  it('limits browser preview price injection to dev builds only', () => {
    expect(source).toContain('allowMockStorePricePreview');
    expect(source).toContain('__DEV__ && !IS_STORE_RELEASE');
    expect(source).toContain('params._mock_yearly_price');
    expect(source).toContain('params._mock_yearly_monthly');
  });
});
