import AsyncStorage from '@react-native-async-storage/async-storage';
import { readFileSync } from 'fs';
import path from 'path';
import {
  activatePendingPersonalPlanAfterPremium,
  clearPendingPersonalPlanActivation,
  PERSONAL_PLAN_PENDING_ACTIVATION_KEY,
  queuePendingPersonalPlanActivation,
  readPendingPersonalPlanActivation,
} from '../app/personal_plan_activation';
import {
  PERSONAL_PLAN_STATE_KEY,
  readPersonalPlanState,
} from '../app/personal_plan_state';

describe('personal plan premium activation contract', () => {
  beforeEach(async () => {
    (AsyncStorage as any).__reset?.();
    await AsyncStorage.multiRemove([
      PERSONAL_PLAN_PENDING_ACTIVATION_KEY,
      PERSONAL_PLAN_STATE_KEY,
    ]);
  });

  it('queues a selected plan without activating it before Premium is confirmed', async () => {
    const pending = await queuePendingPersonalPlanActivation({
      planId: 'gavan',
      minutesPerDay: 15,
      source: 'onboarding',
    });

    expect(pending.planId).toBe('gavan');
    expect(pending.minutesPerDay).toBe(15);
    expect(pending.source).toBe('onboarding');
    expect(await readPendingPersonalPlanActivation()).toMatchObject({
      planId: 'gavan',
      minutesPerDay: 15,
      source: 'onboarding',
    });
    expect(await AsyncStorage.getItem(PERSONAL_PLAN_STATE_KEY)).toBeNull();
    expect(await readPersonalPlanState()).toBeNull();
  });

  it('activates the queued plan after Premium and clears the pending slot', async () => {
    await queuePendingPersonalPlanActivation({
      planId: 'gavan',
      minutesPerDay: 20,
      source: 'onboarding',
    });

    const activated = await activatePendingPersonalPlanAfterPremium();

    expect(activated?.planId).toBe('gavan');
    expect(activated?.minutesPerDay).toBe(20);
    expect(activated?.planInstanceId).toBe(activated?.id);
    expect(await readPendingPersonalPlanActivation()).toBeNull();
    expect(await readPersonalPlanState()).toMatchObject({
      planId: 'gavan',
      minutesPerDay: 20,
      status: 'active',
    });
  });

  it('drops malformed pending data instead of activating a broken plan', async () => {
    await AsyncStorage.setItem(PERSONAL_PLAN_PENDING_ACTIVATION_KEY, JSON.stringify({
      planId: 'unknown',
      minutesPerDay: 99,
      source: 'onboarding',
    }));

    await expect(activatePendingPersonalPlanAfterPremium()).resolves.toBeNull();
    expect(await readPendingPersonalPlanActivation()).toBeNull();
    expect(await readPersonalPlanState()).toBeNull();
  });

  it('keeps the paywall wired to the personal plan flow instead of generic premium', () => {
    const dispatcher = readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');
    const purchase = readFileSync(path.join(process.cwd(), 'app', 'paywall_purchase.ts'), 'utf8');

    expect(dispatcher).toContain('firstParam(params.context)');
    expect(dispatcher).toContain("'personal_plan'");
    expect(dispatcher).toContain('activatePendingPersonalPlanAfterPremium');
    expect(dispatcher).toContain('maybeFinishAlreadyPremiumPersonalPlan');
    expect(purchase).toContain("context === 'personal_plan'");
    expect(purchase).toContain('markCelebrationPending');
  });

  it('sends a bought personal plan through thank-you support and the existing auth prompt', () => {
    const purchase = readFileSync(path.join(process.cwd(), 'app', 'paywall_purchase.ts'), 'utf8');
    const layout = readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
    const thankYouPath = path.join(process.cwd(), 'app', 'personal_plan_thank_you.tsx');
    const thankYou = readFileSync(thankYouPath, 'utf8');

    expect(purchase).toContain('finishPersonalPlanActivationFlow');
    expect(purchase).toContain("router.replace('/personal_plan_thank_you' as any)");
    expect(layout).toContain('<Stack.Screen name="personal_plan_thank_you" options={{ headerShown: false }} />');
    expect(thankYou).toContain('RegistrationPromptModal');
    expect(thankYou).toContain('context="onboarding"');
    expect(thankYou).toContain('setAuthVisible(true)');
  });

  it('connects onboarding entry to pending personal plan paywall without changing the old standalone path', () => {
    const onboarding = readFileSync(path.join(process.cwd(), 'components', 'onboarding.tsx'), 'utf8');
    const layout = readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

    expect(onboarding).toContain("type OnboardingStepKey = 'beta' | 'planEntry' | 'planGoal' | 'planLevel' | 'planMinutes' | 'planLoading' | 'planResult' | 'planPaywall' | 'planPicker' | 'planDetails'");
    expect(onboarding).not.toContain('planPhrase');
    expect(onboarding).not.toContain('planPermission');
    expect(onboarding).toContain("ONBOARDING_PLAN_MOCKUP_SOURCE = '.codex-tmp/onboarding-plan-theme-mockup-v3.html'");
    expect(onboarding).toContain('PERSONAL_PLAN_ONBOARDING_PLANS');
    expect(onboarding).toContain('resolveOnboardingPlanId');
    expect(onboarding).toContain('selectedPlanMinutes');
    expect(onboarding).toContain('queuePendingPersonalPlanActivation');
    expect(onboarding).toContain('activatePendingPersonalPlanAfterPremium');
    expect(onboarding).toContain('hasPremiumAccess');
    // CTA пейвола ДОЛЖЕН делать реальную покупку, а не подменять её стартом intro-доступа.
    // Раньше ветка `if (hasPremiumAccess || introFullAccessStarted)` всегда срабатывала
    // (onIntroFullAccessStart всегда true) → покупка пропускалась, экран просто перекидывал
    // на ввод имени. Покупку пропускаем ТОЛЬКО при реальном Premium.
    expect(onboarding).toContain('if (hasPremiumAccess && !FORCE_PREMIUM)');
    expect(onboarding).not.toContain('if (hasPremiumAccess || introFullAccessStarted)');
    expect(onboarding).toContain("source: 'onboarding'");
    expect(onboarding).toContain('onPersonalPlanPaywallStart');
    expect(onboarding).toContain('openSelectedPlanAbPaywall');
    expect(onboarding).toContain("['onboarding_plan_billing', paywallPlan]");
    expect(onboarding).toContain('Составить план под мою цель');
    expect(onboarding).toContain('Просто посмотреть приложение');
    expect(onboarding).toContain('Это мой план — вперёд');
    expect(onboarding).toContain('Другие планы');
    expect(onboarding).toContain('data-plan-result-cta');
    expect(onboarding).not.toContain("onPress={() => goToStep('planPaywall')}");
    expect(onboarding).not.toContain("planId: 'gavan',\n        minutesPerDay,");
    expect(onboarding).toContain('planId: selectedPlanId');
    expect(onboarding).toContain('minutesPerDay: selectedPlanMinutesForPlan');
    expect(onboarding).toContain("goToStep('name')");
    expect(layout).toContain('handleOnboardingPersonalPlanPaywall');
    expect(layout).toContain("pathname: '/premium_modal'");
    expect(layout).toContain("context: 'personal_plan'");
  });

  it('keeps A/B paywalls wired to personal-plan activation after purchase or restore', () => {
    const purchase = readFileSync(path.join(process.cwd(), 'app', 'paywall_purchase.ts'), 'utf8');

    expect(purchase).toContain('finishPersonalPlanActivationFlow');
    expect(purchase).toContain('activatePendingPersonalPlanAfterPremium');
    expect(purchase).toContain("context === 'personal_plan'");
    expect(purchase).toContain('PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY');
    expect(purchase).toContain("emitAppEvent('personal_plan_onboarding_nickname_ready')");
    expect(purchase).toContain("router.replace('/personal_plan_thank_you' as any)");
    expect(purchase).toContain("router.replace('/(tabs)/home' as any)");
  });

  it('does not leave already-premium personal plan users on the paywall manage screen', () => {
    const dispatcher = readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');

    expect(dispatcher).toContain('maybeFinishAlreadyPremiumPersonalPlan');
    expect(dispatcher).toContain('getVerifiedPremiumAccessStatus');
    expect(dispatcher).toContain('ACCESS_CHECK_TIMEOUT_MS');
    expect(dispatcher).toContain('await finishPersonalPlanActivation(router)');
  });

  it('exposes an explicit clear helper for cancelled onboarding/paywall flows', async () => {
    await queuePendingPersonalPlanActivation({
      planId: 'gavan',
      minutesPerDay: 10,
      source: 'onboarding',
    });

    await clearPendingPersonalPlanActivation();

    expect(await readPendingPersonalPlanActivation()).toBeNull();
  });
});
