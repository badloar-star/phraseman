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
  clearPersonalPlanState,
  PERSONAL_PLAN_STATE_KEY,
  readPersonalPlanState,
} from '../app/personal_plan_state';

describe('personal plan premium activation contract', () => {
  beforeEach(async () => {
    (AsyncStorage as any).__reset?.();
    await clearPersonalPlanState();
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

  it('sends a bought personal plan directly to the existing auth prompt host', () => {
    const purchase = readFileSync(path.join(process.cwd(), 'app', 'paywall_purchase.ts'), 'utf8');
    const layout = readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');
    const thankYouPath = path.join(process.cwd(), 'app', 'personal_plan_thank_you.tsx');
    const thankYou = readFileSync(thankYouPath, 'utf8');

    expect(purchase).toContain('finishPersonalPlanActivationFlow');
    expect(purchase).toContain("router.replace('/personal_plan_thank_you' as any)");
    expect(layout).toContain('<Stack.Screen name="personal_plan_thank_you" options={{ headerShown: false }} />');
    expect(thankYou).toContain('RegistrationPromptModal');
    expect(thankYou).toContain('context="onboarding"');
    expect(thankYou).toContain('visible={true}');
    expect(thankYou).not.toContain('setAuthVisible(true)');
    expect(thankYou).not.toContain('personal-plan-thank-you-auth');
    expect(thankYou).not.toContain('personal-plan-thank-you-later');
    expect(thankYou).not.toContain('TouchableOpacity');
  });

  it('connects onboarding plan flow to pending personal plan paywall without restoring the old entry path', () => {
    const onboarding = readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');
    const layout = readFileSync(path.join(process.cwd(), 'app', '_layout.tsx'), 'utf8');

    expect(onboarding).toContain('export type CleanOnboardingStep =');
    for (const step of ['goal', 'level', 'minutes', 'notifications', 'startMode', 'plusBenefits', 'onboardingPaywall', 'name']) {
      expect(onboarding).toContain(`'${step}'`);
    }
    expect(onboarding).not.toContain("'miniAha'");
    expect(onboarding).not.toContain("'trialReminder'");
    expect(onboarding).not.toContain("'ageConsent'");
    expect(onboarding).not.toContain("'promise'");
    expect(onboarding).not.toContain("'planResult'");
    expect(onboarding).not.toContain("if (step === 'planEntry')");
    expect(onboarding).not.toContain('onboarding-plan-entry-screen');
    expect(onboarding).toContain("'onboardingPaywall'");
    expect(onboarding).not.toContain("'planPaywall'");
    expect(onboarding).not.toContain("'planPicker'");
    expect(onboarding).not.toContain("'planDetails'");
    expect(onboarding).toContain('resolvePersonalPlanForGoal');
    expect(onboarding).toContain('selectedMinutes');
    expect(onboarding).toContain('queuePendingPersonalPlanActivation');
    expect(onboarding).toContain('PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY');
    // CTA Ð¿ÐµÐ¹Ð²Ð¾Ð»Ð° Ð”ÐžÐ›Ð–Ð•Ð Ð´ÐµÐ»Ð°Ñ‚ÑŒ Ñ€ÐµÐ°Ð»ÑŒÐ½ÑƒÑŽ Ð¿Ð¾ÐºÑƒÐ¿ÐºÑƒ, Ð° Ð½Ðµ Ð¿Ð¾Ð´Ð¼ÐµÐ½ÑÑ‚ÑŒ ÐµÑ‘ ÑÑ‚Ð°Ñ€Ñ‚Ð¾Ð¼ intro-Ð´Ð¾ÑÑ‚ÑƒÐ¿Ð°.
    // Ð Ð°Ð½ÑŒÑˆÐµ Ð²ÐµÑ‚ÐºÐ° `if (hasPremiumAccess || introFullAccessStarted)` Ð²ÑÐµÐ³Ð´Ð° ÑÑ€Ð°Ð±Ð°Ñ‚Ñ‹Ð²Ð°Ð»Ð°
    // (onIntroFullAccessStart Ð²ÑÐµÐ³Ð´Ð° true) â†’ Ð¿Ð¾ÐºÑƒÐ¿ÐºÐ° Ð¿Ñ€Ð¾Ð¿ÑƒÑÐºÐ°Ð»Ð°ÑÑŒ, ÑÐºÑ€Ð°Ð½ Ð¿Ñ€Ð¾ÑÑ‚Ð¾ Ð¿ÐµÑ€ÐµÐºÐ¸Ð´Ñ‹Ð²Ð°Ð»
    // Ð½Ð° Ð²Ð²Ð¾Ð´ Ð¸Ð¼ÐµÐ½Ð¸. ÐŸÐ¾ÐºÑƒÐ¿ÐºÑƒ Ð¿Ñ€Ð¾Ð¿ÑƒÑÐºÐ°ÐµÐ¼ Ð¢ÐžÐ›Ð¬ÐšÐž Ð¿Ñ€Ð¸ Ñ€ÐµÐ°Ð»ÑŒÐ½Ð¾Ð¼ Premium.
    expect(onboarding).not.toContain('if (hasPremiumAccess || introFullAccessStarted)');
    expect(onboarding).not.toContain('const paywallOpened = await onPersonalPlanPaywallStart?.();');
    expect(onboarding).not.toContain('if (paywallOpened === false) {');
    expect(onboarding).toContain('usePaywallPurchase');
    expect(onboarding).toContain("source: 'onboarding_plan'");
    expect(onboarding).toContain("source: 'onboarding'");
    expect(onboarding).toContain('onPersonalPlanPaywallStart');
    expect(onboarding).toContain('[PLAN_BILLING_KEY, billing]');
    expect(onboarding).not.toContain('Составить план под мою цель');
    expect(onboarding).not.toContain('Просто посмотреть приложение');
    expect(onboarding).toContain('testID="onboarding-plus-benefits-continue"');
    expect(onboarding).not.toContain("onPress={() => go('planPaywall')}");
    expect(onboarding).not.toContain("planId: 'gavan',\n        minutesPerDay,");
    expect(onboarding).toContain('planId,');
    expect(onboarding).toContain('minutesPerDay: selectedMinutes');
    expect(onboarding).toContain("go('name')");
    expect(layout).toContain('handleOnboardingPersonalPlanPaywall');
    expect(layout).toContain("pathname: '/premium_modal'");
    expect(layout).toContain("context: 'personal_plan'");
    const freeBranchStart = layout.indexOf("if (isFeatureFreeForEveryone('personal_plan')) {");
    expect(freeBranchStart).toBeGreaterThan(-1);
    const freeBranch = layout.slice(freeBranchStart, layout.indexOf('// ÐžÐÐ‘ÐžÐ Ð”Ð˜ÐÐ“', freeBranchStart));
    expect(freeBranch).toContain('return false;');
    expect(freeBranch).not.toContain("router.replace('/(tabs)/home' as any)");
  });

  it('keeps A/B paywalls wired to personal-plan activation after purchase or restore', () => {
    const purchase = readFileSync(path.join(process.cwd(), 'app', 'paywall_purchase.ts'), 'utf8');

    expect(purchase).toContain('finishPersonalPlanActivationFlow');
    expect(purchase).toContain('activatePendingPersonalPlanAfterPremium');
    expect(purchase).toContain("context === 'personal_plan'");
    expect(purchase).toContain('PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY');
    expect(purchase).toContain("emitAppEvent('personal_plan_onboarding_nickname_ready')");
    expect(purchase).toContain("router.replace('/personal_plan_thank_you' as any)");
    expect(purchase).not.toContain("router.replace('/(tabs)/home' as any)");
  });

  it('keeps onboarding paywall state external to the full app paywalls', () => {
    const onboarding = readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');

    expect(onboarding).toContain('const [paywallBusy, setPaywallBusy] = useState(false)');
    expect(onboarding).not.toContain('onPersonalPlanPaywallStart?.()');
    expect(onboarding).toContain('queueSelectedPlan');
    expect(onboarding).toContain('paywallRestoring');
    expect(onboarding).not.toContain('styles.planPaywallTrustItemDisabled');
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
