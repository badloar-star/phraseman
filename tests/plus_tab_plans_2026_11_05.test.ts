// Governance-ID: TG-B42465FCD922
import * as fs from 'node:fs';
import * as path from 'node:path';

// зачем (замечание координатора 06.11, макет plus_tab_approved): слева «Plus · месяц», справа «Ultra · год» с бейджем «Выгоднее», Ultra выбрана
// по умолчанию, выбор — тонкое кольцо цвета плана (boxShadow 0 0 0 2px), толстых и чёрных рамок у плиток нет.
const plans = fs.readFileSync(path.join(__dirname, '..', 'components', 'plus-tab', 'PlusTabPlans.tsx'), 'utf8');
const screen = fs.readFileSync(path.join(__dirname, '..', 'components', 'plus-tab', 'PlusTabScreen.tsx'), 'utf8');

describe('плитки планов вкладки Plus', () => {
  test('порядок: Plus (месяц) слева, Ultra (год) справа', () => {
    expect(plans.indexOf('plus-tab-plan-monthly')).toBeGreaterThan(-1);
    expect(plans.indexOf('plus-tab-plan-monthly')).toBeLessThan(plans.indexOf('plus-tab-plan-yearly'));
  });

  test('у Ultra бейдж «Выгоднее», у Plus бейджа нет', () => {
    const monthlyBlock = plans.slice(plans.indexOf('plus-tab-plan-monthly'), plans.indexOf('plus-tab-plan-yearly'));
    expect(monthlyBlock).not.toContain('badge=');
    expect(plans.slice(plans.indexOf('plus-tab-plan-yearly'))).toContain('badge={word(lang, BETTER)}');
    expect(plans).toContain("'Выгоднее'");
  });

  test('выбор — кольцо цвета плана 2 px, без рамок', () => {
    expect(plans).toContain('0 0 0 2px');
    expect(plans).not.toMatch(/borderWidth|borderColor|borderLeftWidth|borderTopWidth/);
    expect(plans).toContain('const ultraPin = ULTRA_PALETTE.pin;');
    expect(plans).toContain('ring={ultraPin[0]}');
  });

  test('экран использует свои плитки и годовой план по умолчанию (хук выбирает yearly)', () => {
    expect(screen).toContain('<PlusTabPlans');
    expect(screen).not.toContain('<PaywallPlusPlans ');
    const hook = fs.readFileSync(path.join(__dirname, '..', 'app', 'paywall_purchase.ts'), 'utf8');
    expect(hook).toContain("useState<PaywallPlan>('yearly')");
  });
});
