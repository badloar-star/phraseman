import fs from 'fs';
import path from 'path';

const root = process.cwd();
const wrapperSource = fs.readFileSync(path.join(root, 'components', 'onboarding.tsx'), 'utf8');
const source = fs.readFileSync(path.join(root, 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('clean onboarding study-target and order contract', () => {
  it('keeps the active onboarding wrapper free of legacy implementation code', () => {
    expect(wrapperSource.replace(/\r\n/g, '\n').trim()).toBe("export { default } from './CleanOnboarding';\nexport type { OnboardingProps as Props } from './CleanOnboarding';");
    expect(wrapperSource).not.toContain('studyTargetRoot');
    expect(wrapperSource).not.toContain('planPaywall');
    expect(wrapperSource).not.toContain("require('../assets/images/onboarding");
  });

  it('uses the approved minimal screen order with the aha scene', () => {
    [
      "'welcome'",
      "'privacy'",
      "'promise'",
      "'notifications'",
      "'trialReminder'",
      "'onboardingPaywall'",
      "'name'",
    ].forEach((step) => expect(source).toContain(step));

    expect(source).toContain('CLEAN_ONBOARDING_ORDER');
    expect(source).toContain('const SHOW_ONBOARDING_LANGUAGE_STEP = false');
    expect(source).toContain("...(SHOW_ONBOARDING_LANGUAGE_STEP ? (['language', 'level'] as const) : [])");
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

  it('defaults to English while the language block is hidden and keeps the toggleable screens', () => {
    // Вопрос «откуда узнал» и анкета плана удалены (владелец, 2026-08-16):
    // английский фиксируется на welcome, а блок языка ждёт вторых языков.
    expect(source).not.toContain('DISCOVERY_OPTIONS');
    expect(source).not.toContain('GOAL_OPTIONS');
    expect(source).not.toContain('MINUTE_OPTIONS');
    expect(source).toContain('ensureEnglishStudyTarget');
    expect(source).toContain('if (!SHOW_ONBOARDING_LANGUAGE_STEP) void ensureEnglishStudyTarget();');
    expect(source).toContain('LANGUAGE_OPTIONS');
    expect(source).toContain('testID="onboarding-language-continue"');
    expect(source).toContain('LEVEL_OPTIONS');
    expect(source).toContain("go('promise')");
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

  it('keeps final step as analytics choice plus a yes/no age question', () => {
    expect(source).toContain('testID="onboarding-age-yes"');
    expect(source).toContain('testID="onboarding-age-no"');
    // Согласие с условиями — sign-in-wrap строкой на welcome, не галочкой в финале.
    expect(source).not.toContain('testID="onboarding-legal-checkbox"');
    expect(source).toContain('testID="onboarding-analytics-checkbox"');
    // Рассылки нет в принципе (владелец, 2026-08-16).
    expect(source).not.toContain('testID="onboarding-newsletter-row"');
    expect(source).toContain('KNOWLY_LEGAL_TERMS_URL');
    expect(source).toContain('KNOWLY_LEGAL_PRIVACY_URL');
    expect(source).not.toContain('YearWheel');
    expect(source).not.toContain('onboarding-age-year-wheel');
  });
});
