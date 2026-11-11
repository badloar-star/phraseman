// Governance-ID: TG-B42465FCD922
import * as fs from 'node:fs';
import * as path from 'node:path';

const plans = fs.readFileSync(path.join(__dirname, '..', 'components', 'plus-tab', 'PlusTabPlans.tsx'), 'utf8');
const screen = fs.readFileSync(path.join(__dirname, '..', 'components', 'plus-tab', 'PlusTabScreen.tsx'), 'utf8');

describe('плитки планов вкладки Plus', () => {
  test('порядок: Plus (месяц) слева, Ultra (год) справа', () => {
    expect(plans.indexOf('plus-tab-plan-monthly')).toBeGreaterThan(-1);
    expect(plans.indexOf('plus-tab-plan-monthly')).toBeLessThan(plans.indexOf('plus-tab-plan-yearly'));
  });

  test('uses the current theme for the selected tile and keeps the full price visible', () => {
    expect(plans).toContain('borderColor: selected ? g.accentGraphic : g.line');
    expect(plans).toContain('paywallPriceFontSize(price, fontScale)');
    expect(plans).not.toContain('numberOfLines=');
  });

  test('экран использует свои плитки и годовой план по умолчанию (хук выбирает yearly)', () => {
    expect(screen).toContain('<PlusTabPlans');
    expect(screen).not.toContain('<PaywallPlusPlans ');
    const hook = fs.readFileSync(path.join(__dirname, '..', 'app', 'paywall_purchase.ts'), 'utf8');
    expect(hook).toContain("useState<PaywallPlan>('yearly')");
  });
});
