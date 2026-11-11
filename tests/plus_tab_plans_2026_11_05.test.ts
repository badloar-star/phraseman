// Governance-ID: TG-B42465FCD922
import * as fs from 'node:fs';
import * as path from 'node:path';

// зачем (владелец 11.11, макет plus-screens-duo-2026-11-11, «в точности как на макете»): свои плитки вкладки (PlusTabPlans, обводка выбранной)
// заменены кнопками-тарифами пейвола «Два пути» — тот же компонент, что в окне оплаты. Порядок теперь по макету: Ultra (год) сверху, Plus (месяц) под ним.
const plans = fs.readFileSync(path.join(__dirname, '..', 'components', 'paywall', 'duo', 'PaywallDuoPlans.tsx'), 'utf8');
const screen = fs.readFileSync(path.join(__dirname, '..', 'components', 'plus-tab', 'PlusTabScreen.tsx'), 'utf8');

describe('плитки планов вкладки Plus', () => {
  test('порядок по макету: Ultra (год) сверху, Plus (месяц) под ним', () => {
    const yearly = plans.indexOf('<Row lang={lang} g={g} plan="yearly" tier="ultra"');
    expect(yearly).toBeGreaterThan(-1);
    expect(yearly).toBeLessThan(plans.indexOf('<Row lang={lang} g={g} plan="monthly" tier="plus"'));
  });

  test('выбранный тариф залит градиентом своего уровня, без обводок; цена видна целиком', () => {
    expect(plans).toContain('const colors = DUO_TIER_COLORS[tier];');
    expect(plans).not.toMatch(/borderWidth|borderColor/);
    expect(plans).toContain('paywallPriceFontSize(shown, fontScale)');
    expect(plans).not.toContain('numberOfLines=');
  });

  test('экран использует кнопки-тарифы пейвола и годовой план по умолчанию (хук выбирает yearly)', () => {
    expect(screen).toContain('<PaywallDuoPlans ');
    expect(screen).not.toContain('<PlusTabPlans');
    expect(screen).not.toContain('<PaywallPlusPlans ');
    expect(fs.existsSync(path.join(__dirname, '..', 'components', 'plus-tab', 'PlusTabPlans.tsx'))).toBe(false);
    const hook = fs.readFileSync(path.join(__dirname, '..', 'app', 'paywall_purchase.ts'), 'utf8');
    expect(hook).toContain("useState<PaywallPlan>('yearly')");
  });
});
