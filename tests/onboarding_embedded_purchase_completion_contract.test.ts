import fs from 'node:fs';
import path from 'node:path';

const purchase = fs.readFileSync(path.join(process.cwd(), 'app', 'paywall_purchase.ts'), 'utf8');
const layout = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

function executableSource(source: string): string {
  return source
    .split('\n')
    .map((line) => line.slice(0, line.indexOf('//') === -1 ? line.length : line.indexOf('//')))
    .join('\n');
}

describe('embedded onboarding paywall completion', () => {
  it('never dismisses the route stack after an onboarding_plan purchase', () => {
    const start = purchase.indexOf("if (source === 'onboarding')", purchase.indexOf('const handlePurchase'));
    const end = purchase.indexOf('} catch (err: unknown)', start);
    const body = executableSource(purchase.slice(start, end));

    expect(body).toContain("if (source === 'onboarding_plan') return;");
    expect(body.indexOf("if (source === 'onboarding_plan') return;")).toBeLessThan(
      body.indexOf('dismissPaywallModal('),
    );
  });

  it('never dismisses the route stack after an onboarding_plan restore', () => {
    const start = purchase.indexOf("if (source === 'onboarding')", purchase.indexOf('const handleRestore'));
    const end = purchase.indexOf('} else {', start);
    const body = executableSource(purchase.slice(start, end));

    expect(body).toContain("if (source === 'onboarding_plan') return;");
    expect(body.indexOf("if (source === 'onboarding_plan') return;")).toBeLessThan(
      body.indexOf('dismissPaywallModal('),
    );
  });

  it('releases the onboarding overlay before optional entitlement work', () => {
    const start = layout.indexOf('const handleOnboardingDone = useCallback(async () => {');
    const end = layout.indexOf('const handleOnboardingIntroFullAccessStart', start);
    const body = executableSource(layout.slice(start, end));

    expect(body).toContain('finally {');
    expect(body.indexOf('setShow(false)')).toBeLessThan(body.indexOf('hasVerifiedRealPremiumOrVip()'));
    expect(body.indexOf("emitAppEvent('onboarding_completed')")).toBeLessThan(
      body.indexOf('hasVerifiedRealPremiumOrVip()'),
    );
  });
});
