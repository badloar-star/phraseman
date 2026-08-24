import fs from 'node:fs';
import path from 'node:path';

const onboarding = fs.readFileSync(path.join(process.cwd(), 'components/CleanOnboarding.tsx'), 'utf8');
const purchase = fs.readFileSync(path.join(process.cwd(), 'app/paywall_purchase.ts'), 'utf8');

describe('onboarding trial truth contract', () => {
  it('never fabricates trial days while the store is loading or failed', () => {
    expect(onboarding).not.toContain('return loading || offeringsFailed ? DEFAULT_TRIAL_DAYS : null');
    expect(onboarding).not.toContain('const DEFAULT_TRIAL_DAYS = 3');
    expect(purchase).toContain('checkTrialOrIntroductoryPriceEligibility');
  });

  it('shows the selected subscription disclosure beside the purchase CTA', () => {
    expect(onboarding).toContain('subscriptionDisclosure');
    expect(onboarding).toContain('Подписка продлевается автоматически');
    expect(onboarding).toContain('Отменить можно в настройках магазина');
  });

  it('does not expose a live secondary purchase CTA after offerings failure', () => {
    expect(onboarding).toContain('offeringsFailed={paywallOfferingsFailed}');
    expect(onboarding).toContain('disabled={loading || purchasing || offeringsFailed || !selectedAvailable}');
  });
});
