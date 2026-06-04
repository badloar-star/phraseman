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
    const source = readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');

    expect(source).toContain("| 'personal_plan'");
    expect(source).toContain("'personal_plan',");
    expect(source).toContain('activatePendingPersonalPlanAfterPremium');
    expect(source).toContain("ctx === 'personal_plan'");
    expect(source).toContain('markPremiumCelebrationIfNeeded');
  });

  it('sends a bought personal plan through thank-you support and the existing auth prompt', () => {
    const paywall = readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');
    const layout = readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
    const thankYouPath = path.join(process.cwd(), 'app', 'personal_plan_thank_you.tsx');
    const thankYou = readFileSync(thankYouPath, 'utf8');

    expect(paywall).toContain('finishPersonalPlanActivationFlow');
    expect(paywall).toContain("router.replace('/personal_plan_thank_you' as any)");
    expect(layout).toContain('<Stack.Screen name="personal_plan_thank_you" options={{ headerShown: false }} />');
    expect(thankYou).toContain('RegistrationPromptModal');
    expect(thankYou).toContain('context="onboarding"');
    expect(thankYou).toContain('setAuthVisible(true)');
  });

  it('connects onboarding entry to pending personal plan paywall without changing the old standalone path', () => {
    const onboarding = readFileSync(path.join(process.cwd(), 'components', 'onboarding.tsx'), 'utf8');
    const layout = readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

    expect(onboarding).toContain("type OnboardingStepKey = 'beta' | 'planEntry' | 'planGoal' | 'planLevel' | 'planMinutes' | 'planPhrase' | 'planLoading' | 'planResult' | 'planPaywall' | 'planPicker' | 'planDetails'");
    expect(onboarding).not.toContain('planPermission');
    expect(onboarding).toContain("ONBOARDING_PLAN_MOCKUP_SOURCE = '.codex-tmp/onboarding-plan-theme-mockup-v3.html'");
    expect(onboarding).toContain('PERSONAL_PLAN_ONBOARDING_PLANS');
    expect(onboarding).toContain('resolveOnboardingPlanId');
    expect(onboarding).toContain('selectedPlanMinutes');
    expect(onboarding).toContain('queuePendingPersonalPlanActivation');
    expect(onboarding).toContain('activatePendingPersonalPlanAfterPremium');
    expect(onboarding).toContain('hasPremiumAccess');
    expect(onboarding).toContain('if (hasPremiumAccess)');
    expect(onboarding).toContain("source: 'onboarding'");
    expect(onboarding).toContain('onPersonalPlanPaywallStart');
    expect(onboarding).toContain('Составить мой план');
    expect(onboarding).toContain('Продолжить самостоятельно');
    expect(onboarding).toContain('Получить мой план');
    expect(onboarding).toContain('Посмотреть другие планы');
    expect(onboarding).toContain('data-plan-result-cta');
    expect(onboarding).not.toContain("planId: 'gavan',\n        minutesPerDay,");
    expect(onboarding).toContain('planId: selectedPlanId');
    expect(onboarding).toContain('minutesPerDay: selectedPlanMinutes');
    expect(onboarding).toContain("goToStep('welcome')");
    expect(layout).toContain('handleOnboardingPersonalPlanPaywall');
    expect(layout).toContain("router.push({ pathname: '/premium_modal', params: { context: 'personal_plan'");
  });

  it('does not leave already-premium personal plan users on the paywall manage screen', () => {
    const paywall = readFileSync(path.join(process.cwd(), 'app', 'premium_modal.tsx'), 'utf8');

    expect(paywall).toContain(".then(async ({ isPremium, plan, expiry, isAdmin }) => {");
    expect(paywall).toContain("if (ctx === 'personal_plan') {");
    expect(paywall).toContain('await activatePendingPersonalPlanAfterPremium();');
    expect(paywall).toContain('await activatePersonalPlanAfterPremiumIfNeeded();');
    expect(paywall).toContain('finishPersonalPlanActivationFlow();');
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
