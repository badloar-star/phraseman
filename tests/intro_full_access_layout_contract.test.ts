import fs from 'fs';
import path from 'path';
import { normalizeEol } from './helpers/read_source';

// зачем (D186, владелец 14.10; этап 2 — координатор 15.10): «Бонус на старт» 72 ч снят (INTRO_FULL_ACCESS_REMOVED). Окно «72 часа» не рисуется,
// а его разводка в корневом layout (состояние, проверка «закончилось», открытие «welcome», запрос слота очереди окон) удалена: при возврате флага
// без окна слот занял бы невидимый держатель и заблокировал остальные окна. Сторож держит именно это; запуск из онбординга остаётся (no-op под флагом).
describe('intro full access — root layout after D186', () => {
  const source = normalizeEol(fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8'));
  const onboardingSource = normalizeEol(fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8'));

  it('mounts no intro window and asks for no overlay slot', () => {
    expect(source).not.toContain('<IntroFullAccessModal');
    expect(source).not.toContain("useOverlayVisible(\n    'introFullAccess'");
    expect(source).not.toMatch(/useOverlayVisible\(\s*'introFullAccess'/);
    expect(source).not.toContain('introFullAccessModal');
    expect(source).not.toContain('setIntroFullAccessModal');
  });

  it('runs no «72 hours ended» check and opens no welcome window', () => {
    expect(source).not.toContain('checkIntroFullAccessEndedModal');
    expect(source).not.toContain('shouldShowIntroFullAccessWelcome');
    expect(source).not.toContain('markIntroFullAccessEndedSeen');
    expect(source).not.toContain('markIntroFullAccessWelcomeSeen');
    expect(source).not.toContain("trackEvent('intro_ended_shown'");
    expect(source).not.toContain("context: 'intro_ended'");
  });

  it('still starts the (retired, no-op) intro from onboarding completion for paid-or-VIP-aware flow', () => {
    expect(source).toContain('const hasPaidOrVipAfterOnboarding = await hasVerifiedRealPremiumOrVip()');
    expect(source).toContain('startIntroFullAccessAfterOnboarding');
    expect(source).toMatch(/getVerifiedRealPremiumStatus\(\)\.catch\((\(\) => false|noteSwallowedAs\('[^']+', false\))\)/);
    expect(source).toMatch(/getVerifiedVipStatus\(\)\.catch\((\(\) => false|noteSwallowedAs\('[^']+', false\))\)/);
  });

  it('does not use the intro gift to skip the onboarding paywall', () => {
    expect(source).toContain('handleOnboardingIntroFullAccessStart');
    expect(source).toContain('onIntroFullAccessStart={handleOnboardingIntroFullAccessStart}');
    expect(onboardingSource).toContain('onIntroFullAccessStart?: () => Promise<boolean | void> | boolean | void');
    expect(onboardingSource).not.toContain('onPersonalPlanPaywallStart');
    expect(onboardingSource).not.toContain('queuePendingPersonalPlanActivation');
    expect(onboardingSource).not.toContain('if (hasPremiumAccess || introFullAccessStarted)');
    expect(onboardingSource).not.toContain('introFullAccessStarted');
  });
});
