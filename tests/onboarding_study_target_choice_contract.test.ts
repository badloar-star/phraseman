import fs from 'fs';
import path from 'path';

const root = process.cwd();
const wrapperSource = fs.readFileSync(path.join(root, 'components', 'onboarding.tsx'), 'utf8');
const source = fs.readFileSync(path.join(root, 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('clean onboarding study-target and order contract', () => {
  it('keeps the active onboarding wrapper free of legacy implementation code', () => {
    expect(wrapperSource.trim()).toBe("export { default } from './CleanOnboarding';\nexport type { OnboardingProps as Props } from './CleanOnboarding';");
    expect(wrapperSource).not.toContain('studyTargetRoot');
    expect(wrapperSource).not.toContain('planPaywall');
    expect(wrapperSource).not.toContain("require('../assets/images/onboarding");
  });

  it('uses the approved English-only screen order with the aha scene', () => {
    [
      "'welcome'",
      "'source'",
      "'level'",
      "'goal'",
      "'minutes'",
      "'aha'",
      "'notifications'",
      "'plusBenefits'",
      "'startMode'",
      "'name'",
    ].forEach((step) => expect(source).toContain(step));

    expect(source).toContain('CLEAN_ONBOARDING_ORDER');
    expect(source).toContain('const SHOW_ONBOARDING_LANGUAGE_STEP = false');
    expect(source).toContain("...(SHOW_ONBOARDING_LANGUAGE_STEP ? ['language' as const] : [])");
    expect(source).not.toContain("'streak'");
    expect(source).not.toContain("'auth'");
    expect(source).not.toContain("'studyTarget'");
    expect(source).not.toContain("'planPaywall'");
    expect(source).not.toContain("'planPicker'");
  });

  it('starts with branded welcome and same-screen existing-account auth', () => {
    expect(source).toContain('testID="onboarding-welcome-screen"');
    expect(source).toContain('testID="onboarding-start"');
    expect(source).toContain('testID="onboarding-existing-account"');
    expect(source).toContain('GoogleSignInButton');
    expect(source).toContain('AppleSignInButton');
    expect(source).toContain('signInWithProvider(provider)');
  });

  it('captures source, defaults to English while language screen is hidden, then asks level/goal/minutes', () => {
    expect(source).toContain('DISCOVERY_OPTIONS');
    expect(source).toContain('onboarding_source_select');
    expect(source).toContain('ensureEnglishStudyTarget');
    expect(source).toContain("go('level')");
    expect(source).toContain("if (SHOW_ONBOARDING_LANGUAGE_STEP)");
    expect(source).toContain('LANGUAGE_OPTIONS');
    expect(source).toContain('testID="onboarding-language-continue"');
    expect(source).toContain('LEVEL_OPTIONS');
    expect(source).toContain('GOAL_OPTIONS');
    expect(source).toContain('MINUTE_OPTIONS');
  });

  it('persists requested English/French target without old onboarding image assets', () => {
    expect(source).toContain('ONBOARDING_REQUESTED_STUDY_TARGET_KEY');
    expect(source).toContain("[ONBOARDING_REQUESTED_STUDY_TARGET_KEY, 'en']");
    expect(source).toContain('setStoredStudyTarget(target, lang)');
    expect(source).toContain("setStoredStudyTarget('en', lang)");
    expect(source).toContain('setDevStudyTargetLang(target, lang)');
    expect(source).toContain("setDevStudyTargetLang('en', lang)");
    expect(source).toContain("prefetchAndRecordStudyTargetServerPack('fr', lang)");
    expect(source).toContain("id: 'en'");
    expect(source).toContain("id: 'fr'");
    expect(source).not.toContain("require('../assets/images/onboarding/");
    expect(source).not.toContain('ONBOARDING_STUDY_TARGET_ICONS');
  });

  it('keeps final legal as one terms/privacy checkbox plus optional analytics', () => {
    expect(source).toContain('testID="onboarding-age-yes"');
    expect(source).toContain('testID="onboarding-age-no"');
    expect(source).toContain('testID="onboarding-legal-checkbox"');
    expect(source).toContain('testID="onboarding-analytics-checkbox"');
    expect(source).toContain('KNOWLY_LEGAL_TERMS_URL');
    expect(source).toContain('KNOWLY_LEGAL_PRIVACY_URL');
    expect(source).not.toContain('YearWheel');
    expect(source).not.toContain('onboarding-age-year-wheel');
  });
});
