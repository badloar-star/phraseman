import fs from 'fs';
import path from 'path';

const purchase = fs.readFileSync(path.join(process.cwd(), 'app', 'paywall_purchase.ts'), 'utf8');
const planCards = fs.readFileSync(path.join(process.cwd(), 'components', 'paywall', 'PaywallPlanCards.tsx'), 'utf8');

describe('A/B/C paywall yearly monthly equivalent display', () => {
  it('derives the monthly equivalent from RevenueCat store product pricing', () => {
    expect(purchase).toContain('storePricePerMonthTrim');
    expect(purchase).toContain('pricePerMonthString');
    expect(purchase).toContain('const yearlyPerMonth');
  });

  it('keeps the annual billed amount available as secondary copy', () => {
    expect(planCards).toContain('yearlyPerMonth');
    expect(planCards).toContain('yearlyFull');
    expect(planCards).toContain('yearSubParts.push');
    expect(planCards.indexOf('yearlyPerMonth')).toBeLessThan(planCards.indexOf('yearlyFull'));
  });

  it('does not keep dev-only browser price injection in the retired premium_modal route', () => {
    const dispatcher = fs.readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');
    expect(dispatcher).not.toContain('params._mock_yearly_price');
    expect(dispatcher).not.toContain('params._mock_yearly_monthly');
  });
});
