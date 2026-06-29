import fs from 'fs';
import path from 'path';

describe('intro full access layout orchestration', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
  const onboardingSource = fs.readFileSync(path.join(process.cwd(), 'components', 'onboarding.tsx'), 'utf8');

  it('starts the intro gift from onboarding completion and shows the welcome modal once', () => {
    expect(source).toContain('startIntroFullAccessAfterOnboarding');
    expect(source).toContain('shouldShowIntroFullAccessWelcome');
    expect(source).toContain('markIntroFullAccessWelcomeSeen');
    expect(source).toContain("setIntroFullAccessModal('welcome')");
  });

  it('shows the expired gift modal without stacking it over onboarding', () => {
    expect(source).toContain('getIntroFullAccessState');
    expect(source).toContain('expiredUnseen');
    expect(source).toContain('IntroFullAccessModal');
    // FirstLessonSheet был удалён отдельной сессией — гейт стэкинга к нему больше
    // не относится; достаточно проверить, что модал интро рисуется по состоянию.
    expect(source).toContain('setIntroFullAccessModal');
  });

  it('suppresses intro gift modals for users who already have real Premium or VIP', () => {
    expect(source).toContain('hasVerifiedRealPremiumOrVip');
    expect(source).toContain('getVerifiedRealPremiumStatus().catch(() => false)');
    expect(source).toContain('getVerifiedVipStatus().catch(() => false)');
    expect(source).toContain('const hasPaidOrVipAfterOnboarding = await hasVerifiedRealPremiumOrVip()');
    expect(source).toContain('!hasPaidOrVipAfterOnboarding && await shouldShowIntroFullAccessWelcome()');
    expect(source).toContain('await markIntroFullAccessEndedSeen().catch(() => {})');
  });

  it('routes the expiration CTA to the existing paywall context', () => {
    expect(source).toContain("context: 'intro_ended'");
    expect(source).toContain('markIntroFullAccessEndedSeen');
  });

  it('unlocks the personal-plan onboarding branch through the intro gift before falling back to paywall', () => {
    expect(source).toContain('handleOnboardingIntroFullAccessStart');
    expect(source).toContain('onIntroFullAccessStart={handleOnboardingIntroFullAccessStart}');
    expect(onboardingSource).toContain('onIntroFullAccessStart?: () => Promise<boolean> | boolean');
    // Пейвол пропускаем ТОЛЬКО при реальном Premium-доступе. Раньше тут был
    // `hasPremiumAccess || introFullAccessStarted`, но onIntroFullAccessStart()
    // всегда возвращал true → пейвол не показывался никогда (баг монетизации).
    expect(onboardingSource).toContain('if (hasPremiumAccess && !FORCE_PREMIUM) {');
  });
});
