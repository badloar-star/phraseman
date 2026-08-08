import fs from 'fs';
import path from 'path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'components', 'CleanOnboarding.tsx'), 'utf8');
const wrapper = fs.readFileSync(path.join(root, 'components', 'onboarding.tsx'), 'utf8');

describe('clean midnight onboarding contract', () => {
  it('uses CleanOnboarding as the only active onboarding implementation', () => {
    expect(wrapper).toContain("export { default } from './CleanOnboarding'");
    expect(source).toContain('CLEAN_ONBOARDING_FLOW_VERSION');
    expect(source).toContain("'clean_midnight_aha_flow_2026_07_02b'");
    expect(source).toContain('normalizedStoredStep');
    expect(source).toContain("if (value === 'start') return 'welcome'");
  });

  it('keeps the approved order without old task, trial reminder, or separate age screens', () => {
    const expectedOrder = [
      "'welcome'",
      "'source'",
      "'level'",
      "'goal'",
      "'minutes'",
      "'aha'",
      "'notifications'",
      "'plusBenefits'",
      "'startMode'",
      "'onboardingPaywall'",
      "'name'",
    ];

    expectedOrder.forEach((step) => expect(source).toContain(step));
    // Экран-филлер «intro» удалён — welcome ведёт прямо к вопросам.
    expect(source).not.toContain("'intro'");
    expect(source).toContain('const SHOW_ONBOARDING_LANGUAGE_STEP = false');
    expect(source).toContain("...(SHOW_ONBOARDING_LANGUAGE_STEP ? ['language' as const] : [])");
    expect(source).toContain("if (!SHOW_ONBOARDING_LANGUAGE_STEP && value === 'language') return 'level'");
    expect(source).not.toContain("'miniAha'");
    expect(source).not.toContain("'trialReminder'");
    expect(source).not.toContain("'ageConsent'");
    expect(source).not.toContain("'promise'");
    expect(source).not.toContain("'planResult'");
  });

  it('keeps monetization inside onboarding and finishes with age, analytics, legal consent, and an automatic nickname', () => {
    [
      'testID="onboarding-start-mode-plus"',
      'testID="onboarding-start-mode-free"',
      'testID="onboarding-plus-benefits-continue"',
      'testID="onboarding-paywall-plan-yearly"',
      'testID="onboarding-paywall-plan-monthly"',
      'testID="onboarding-paywall-plan-lifetime"',
      'testID="onboarding-paywall-continue"',
      'queuePendingPersonalPlanActivation',
      'PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY',
      'usePaywallPurchase',
      "go('name')",
      'testID="onboarding-age-yes"',
      'testID="onboarding-analytics-checkbox"',
      'testID="onboarding-legal-checkbox"',
    ].forEach((text) => expect(source).toContain(text));
    expect(source).not.toContain('testID="onboarding-name-input"');
    expect(source).toContain('resumePendingGeneratedNickname');
    expect(source).toContain('GENERATED_NICKNAME_PENDING_KEY');
    expect(source).not.toContain('Подтверди два пункта — и начинаем');
    expect(source).not.toContain('Имя создадим автоматически — изменить можно позже');
    expect(source).not.toContain('Не удалось создать уникальное имя');
    expect(source).not.toContain('loading={finishBusy}');
    expect(source.indexOf('onDone();')).toBeLessThan(source.indexOf('resumePendingGeneratedNickname()'));

    expect(source).toContain('Phraseman Plus');
    expect(source).not.toContain('testID="onboarding-exit-app"');
    expect(source).toContain('label="Начать обучение"');
    expect(source).toContain('trackOnboardingPlanPaywallView');
    expect(source).toContain("trackEvent('onboarding_plan_paywall_view'");
    expect(source).toContain("trackEvent('onboarding_plan_trial_cta'");
    expect(source).toContain("writeToFirestore: action === 'onboarding_source_select'");
    expect(source).toContain("consented: true");
    expect(source).toContain('[PLAN_BILLING_KEY, billing]');
    expect(source).not.toContain('const paywallOpened = await onPersonalPlanPaywallStart?.();');
  });

  it('uses the midnight liquid visual system without legacy onboarding assets', () => {
    [
      'function Background()',
      "colors={['#050711', '#080914', '#02030A']}",
      'liquidBlobOne',
      'liquidBlobTwo',
      "['#E3ECFF', '#7B8CFF', '#C95CFF']",
      'LOGO_SOURCE',
    ].forEach((text) => expect(source).toContain(text));

    [
      "require('../assets/images/onboarding/",
      'ONBOARDING_BG_LIBRARY',
      'onboarding-bg-welcome',
      'onboarding-streak-screen',
      'onboarding-auth-screen',
      'onboarding-continue-independently',
      'planPicker',
      'planDetails',
    ].forEach((text) => expect(source).not.toContain(text));
  });

  it('removes auxiliary copy, mini task screens, and trial reminder choice from onboarding', () => {
    [
      'subtitle?:',
      'renderMiniAha',
      'miniAhaForGoal',
      'onboarding-miniAha-screen',
      'onboarding-mini-choice-correct',
      'onboarding-trialReminder-screen',
      'TRIAL_REMINDER_CHOICE_KEY',
      'chooseTrialReminder',
      'onboarding-ageConsent-screen',
    ].forEach((text) => expect(source).not.toContain(text));

    expect(source).toContain('NotificationMock');
    expect(source).toContain('requestNotificationPermission');
    expect(source).toContain('scheduleDailyReminder');
    expect(source).not.toContain('scheduleTrialEndReminder');
  });
});
