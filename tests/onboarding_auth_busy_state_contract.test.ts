import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('clean onboarding auth placement contract', () => {
  it('does not keep provider auth as a separate onboarding step', () => {
    const src = read('components/CleanOnboarding.tsx');

    expect(src).not.toContain('function AuthOnboardingStep');
    expect(src).not.toContain('onboarding-auth-screen');
    expect(src).not.toContain("'auth'");
    expect(src).not.toContain("'streak'");
    expect(src).toContain('testID="onboarding-existing-account"');
    expect(src).toContain('authMode ?');
  });

  it('keeps existing-account sign-in only inside the branded welcome screen', () => {
    const src = read('components/CleanOnboarding.tsx');
    const welcomeIdx = src.indexOf('const renderWelcome = () =>');
    // Граница блока welcome — следующий экран флоу (источник трафика).
    const nextIdx = src.indexOf('const renderSource = () =>');
    const welcomeBlock = src.slice(welcomeIdx, nextIdx);

    expect(welcomeIdx).toBeGreaterThan(-1);
    expect(nextIdx).toBeGreaterThan(welcomeIdx);
    expect(welcomeBlock).toContain('testID="onboarding-existing-account"');
    expect(welcomeBlock).toContain('GoogleSignInButton');
    expect(welcomeBlock).toContain('AppleSignInButton');
    expect(src).toContain('const handleAuth = useCallback(async (provider: AuthProviderId)');
    expect(src).toContain('signInWithProvider(provider)');
  });

  it('keeps account linking in the existing Compass registration prompt', () => {
    const compass = read('app/compass/compass_briefing_host.tsx');
    const compassModal = read('app/compass/compass_briefing_modal.tsx');
    const registration = read('components/RegistrationPromptModal.tsx');

    expect(compass).toContain('RegistrationPromptModal');
    expect(compass).toContain('context="compass"');
    expect(compass).toContain('markAccountReminderSeen()');
    expect(compassModal).toContain('accountReminder?:');
    expect(compassModal).toContain('testID="compass-account-link-reminder"');
    expect(compassModal).toContain('testID="compass-account-link-cta"');
    expect(registration).toContain("'home_banner' | 'compass'");
  });
});
