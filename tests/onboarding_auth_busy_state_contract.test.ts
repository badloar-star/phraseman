import fs from 'fs';
import path from 'path';
import { ONBOARDING_COPY_SOURCE } from './helpers/onboarding_copy_source';

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
    const src = read('components/CleanOnboarding.tsx') + ONBOARDING_COPY_SOURCE; // зачем (координатор 12.10): тексты онбординга переехали в components/onboarding/*
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
    // зачем (шаг 3 auth-legacy-google-not-found, ревью L-1): онбординг просит сохранить пропуск для входа после смены.
    expect(src).toContain('signInWithProvider(provider, { captureAccountSwitchResume: true })');
    expect(src).not.toContain('Promise.race([');
    expect(src).not.toContain("new Error('signin_deadline-exceeded')");
    expect(src).toContain('return await task;');
    expect(src).toContain('onSlow();');
    expect(src).toContain('catch (error)');
    expect(src).toContain("code.includes('google_signin_timeout')");
    // зачем (Переводчик 18.10, acd0c034c): без «провайдера» — «Вход ещё идёт… когда ответит Google или Apple»
    expect(src).toContain('Вход ещё идёт');
    expect(src).toContain('Кнопки снова заработают');
    expect(src).toContain('const ONBOARDING_AUTH_UI_TIMEOUT_MS = 8_000;');
    expect(src).toContain('setAuthSlow(true)');
    expect(src).toContain('disabled={!!authLoading}');
  });

});
