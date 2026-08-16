import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('CleanOnboarding disabled step integration', () => {
  it('uses the shared remote flow for navigation, restore and live changes', () => {
    expect(source).toContain('getEnabledOnboardingSteps');
    expect(source).toContain('resolveEnabledOnboardingOrder');
    expect(source).toContain("resolveOnboardingStep(enabledOrder, savedStep, 'current-or-forward')");
    expect(source).toContain("onAppEvent('remote_config_changed'");
    expect(source).not.toContain('go(CLEAN_ONBOARDING_ORDER[index - 1])');
    expect(source).toContain('accessibilityLabel={`Шаг ${progress} из ${total}`}');
    expect(source).not.toContain('PROGRESS_TOTAL');
  });

  it('decides paywall side effects from the actual destination', () => {
    // Единственный переход к ценам — с экрана «предупредим до конца пробного».
    expect(source).toContain("decideOnboardingTransition(enabledOrder, 'trialReminder')");
    expect(source.match(/runOnboardingTransitionEffects\(decision/g)).toHaveLength(1);
  });
});
