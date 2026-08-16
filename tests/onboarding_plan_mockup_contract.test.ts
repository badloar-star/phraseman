import fs from 'fs';
import path from 'path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'components', 'CleanOnboarding.tsx'), 'utf8');
const wrapper = fs.readFileSync(path.join(root, 'components', 'onboarding.tsx'), 'utf8');

// Контракт утверждённого минимального флоу (владелец, 2026-08-16): анкета про
// построение плана удалена вместе с планами; вместо вопросов — вау-обещание
// (promise), честный триал (trialReminder) и пересобранный пейвол с кодами.
describe('clean minimal wow onboarding contract', () => {
  it('uses CleanOnboarding as the only active onboarding implementation', () => {
    expect(wrapper).toContain("export { default } from './CleanOnboarding'");
    expect(source).toContain('CLEAN_ONBOARDING_FLOW_VERSION');
    expect(source).toContain("'clean_minimal_wow_flow_2026_08_16'");
    expect(source).toContain('normalizedStoredStep');
    expect(source).toContain("if (value === 'start') return 'welcome'");
  });

  it('keeps the approved minimal order without the removed plan questionnaire', () => {
    const expectedOrder = [
      "'welcome'",
      "'promise'",
      "'aha'",
      "'notifications'",
      "'trialReminder'",
      "'onboardingPaywall'",
      "'name'",
    ];
    expectedOrder.forEach((step) => expect(source).toContain(step));

    // Вопросы анкеты плана удалены: источник, цель, минуты, выбор старта,
    // сравнение планов и «обещание 3 месяцев» больше не существуют как шаги.
    expect(source).not.toContain("'source'");
    expect(source).not.toContain("'goal'");
    expect(source).not.toContain("'minutes'");
    expect(source).not.toContain("'plusBenefits'");
    expect(source).not.toContain("'startMode'");
    expect(source).not.toContain("'planComparison'");

    // Блок языка выключен локально, но остаётся отключаемым экраном каталога.
    expect(source).toContain('const SHOW_ONBOARDING_LANGUAGE_STEP = false');
    expect(source).toContain("...(SHOW_ONBOARDING_LANGUAGE_STEP ? (['language', 'level'] as const) : [])");
    expect(source).toContain("if (!SHOW_ONBOARDING_LANGUAGE_STEP && (value === 'language' || value === 'level')) return 'promise'");
  });

  it('sells without a questionnaire: promise chart, aha scene, honest trial timeline', () => {
    [
      'const renderPromise',
      'function PromiseChart',
      'Повторяешь с Phraseman',
      'testID="onboarding-promise-continue"',
      'const renderTrialReminder',
      'function TrialTimelineRow',
      'testID="onboarding-trial-reminder-continue"',
      'Сейчас ничего не спишем',
      'continueFromTrialReminder',
      "decideOnboardingTransition(enabledOrder, 'trialReminder')",
    ].forEach((text) => expect(source).toContain(text));
  });

  it('keeps the rebuilt paywall: close on the left, codes menu on the right, texts at the bottom', () => {
    [
      'testID="onboarding-paywall-menu"',
      'testID="onboarding-paywall-menu-promo"',
      'testID="onboarding-paywall-menu-referral"',
      'testID="onboarding-paywall-restore"',
      'testID="onboarding-code-input"',
      'testID="onboarding-code-submit"',
      'redeemPromoCodeWithPersist',
      'applyManualReferralCode',
      'testID="onboarding-paywall-plan-yearly"',
      'testID="onboarding-paywall-plan-monthly"',
      'testID="onboarding-paywall-plan-lifetime"',
      'testID="onboarding-paywall-continue"',
      'testID="onboarding-paywall-continue-free"',
      'PAYWALL_COMPARISON_BENEFITS',
      '>FREE<',
      '>PLUS<',
      'PlanComparisonRow',
      'usePaywallPurchase',
      'Продолжить бесплатно',
    ].forEach((text) => expect(source).toContain(text));

    // Личные планы удалены: постановка плана в очередь исчезла, но возврат в
    // онбординг после покупки (pending-nickname ключ) обязан жить.
    expect(source).not.toContain('queuePendingPersonalPlanActivation');
    expect(source).toContain('PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY');
    expect(source).toContain('queuePostPurchaseReturn');
    expect(source).toContain('[PLAN_BILLING_KEY, billing]');
  });

  it('finishes with age attestation, analytics choice, pre-checked newsletter row, and auto nickname', () => {
    [
      'testID="onboarding-age-yes"',
      'testID="onboarding-age-no"',
      'testID="onboarding-analytics-checkbox"',
      'testID="onboarding-newsletter-row"',
      'useState(true)',
      'NEWSLETTER_OPTIN_KEY',
      "trackOnboarding('onboarding_newsletter_optin'",
      "go('name')",
    ].forEach((text) => expect(source).toContain(text));

    // Обязательная галочка условий заменена sign-in-wrap строкой на welcome.
    expect(source).not.toContain('testID="onboarding-legal-checkbox"');
    expect(source).toContain('Продолжая, ты принимаешь');
    expect(source).toContain("[LEGAL_ACCEPTED_KEY, '1']");

    expect(source).not.toContain('testID="onboarding-name-input"');
    expect(source).toContain('resumePendingGeneratedNickname');
    expect(source).toContain('GENERATED_NICKNAME_PENDING_KEY');
    expect(source).not.toContain('Имя создадим автоматически — изменить можно позже');
    expect(source.indexOf('onDone();')).toBeLessThan(source.indexOf('resumePendingGeneratedNickname()'));

    expect(source).toContain('Phraseman Plus');
    expect(source).not.toContain('testID="onboarding-exit-app"');
    expect(source).toContain('label="Начать обучение"');
    expect(source).toContain('trackOnboardingPlanPaywallView');
    expect(source).toContain("trackEvent('onboarding_plan_paywall_view'");
    expect(source).toContain("trackEvent('onboarding_plan_trial_cta'");
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
});
