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
    expect(src).toContain("new Error('signin_deadline-exceeded')");
    expect(src).toContain('catch (error)');
    expect(src).toContain("result.error.includes('google_signin_timeout')");
    expect(src).toContain('Google не ответил вовремя');
    expect(src).toContain('const ONBOARDING_AUTH_UI_TIMEOUT_MS = 8_000;');
    expect(src).toContain("new Error('signin_deadline-exceeded')");
    expect(src).toContain('Вход занимает слишком много времени');
  });

});
