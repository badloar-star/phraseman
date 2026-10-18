import fs from 'node:fs';
import path from 'node:path';

const read = (name: string) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

describe('approved Plus plan rows', () => {
  it('uses rows and their matching skeleton in the live paywall', () => {
    const source = read('components/paywall/PaywallPlus.tsx');
    expect(source).toContain('<PaywallPlanRows');
    expect(source).toContain('<PaywallPlanRowsSkeleton');
    expect(source).toContain('paywall-promo-plate');
    expect(source).not.toContain('tileOuter(');
  });

  it('passes the real store saving to the rows, with no reference-price discount claim', () => {
    const screen = read('components/paywall/PaywallPlusScreen.tsx');
    expect(screen).toContain('savingsPct={p.savingsPct}');
    const rows = read('components/paywall/PaywallPlanRows.tsx');
    expect(rows).toContain("yearlyPriceSource !== 'reference'");
    expect(rows).toContain("monthlyPriceSource !== 'reference'");
    expect(rows).toContain('trialDays={yearlyTrialDays}');
    expect(rows).toContain('trialDays={monthlyTrialDays}');
  });
});
