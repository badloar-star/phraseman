import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'components', 'ConsentReverifyHost.tsx'), 'utf8');
const onboardingSource = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');
const rootLayoutSource = fs.readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

describe('consent reverify modal contract', () => {
  it('does not auto-show a reverify modal for existing users at runtime', () => {
    expect(source).toContain('admin preview only');
    expect(source).toContain('const shown = forceVisible === true;');
    expect(source).toContain('if (!shown) return null;');
    expect(rootLayoutSource).not.toContain("import ConsentReverifyHost from '../components/ConsentReverifyHost'");
    expect(rootLayoutSource).not.toContain('<ConsentReverifyHost />');
    expect(source).not.toContain('setVisible(true)');
    expect(source).not.toContain('AsyncStorage.getItem');
    expect(source).not.toContain('restoreConsentStateFromCloud');
    expect(source).not.toContain('hydrateAgeGateFromStorage');
    expect(source).not.toContain('consent_reverify_done_v1');
  });

  it('keeps forceVisible as a non-persisting admin preview only', () => {
    expect(source).toContain('forceVisible?: boolean');
    expect(source).toContain('onForceClose?.();');
    expect(source).not.toContain('AsyncStorage.multiSet');
    expect(source).not.toContain('setBirthYear');
    expect(source).not.toContain('setAnalyticsConsent');
    expect(source).not.toContain('recordConsentToCloud');
  });

  it('keeps the under-16 correction path only in new-user onboarding', () => {
    expect(onboardingSource).toContain('testID="onboarding-age-yes"');
    expect(onboardingSource).toContain('testID="onboarding-age-no"');
    // зачем: возраст берётся из MIN_FULL_ACCESS_AGE (единый источник правды), а не
    // хардкодится в копирайте — проверяем шаблонную форму той же самой фразы.
    expect(onboardingSource).toContain('Приложение доступно с ${MIN_FULL_ACCESS_AGE} лет.');
    expect(onboardingSource).toContain("if (ageAnswer !== 'yes')");
    expect(onboardingSource).not.toContain('BackHandler.exitApp()');
    expect(onboardingSource).not.toContain("label={ageAnswer === 'no'");
    expect(onboardingSource).not.toContain("loading={ageAnswer === 'no'");
  });
});
