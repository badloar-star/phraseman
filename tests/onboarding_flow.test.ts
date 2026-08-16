import {
  MANDATORY_ONBOARDING_STEP,
  ONBOARDING_STEP_CATALOG,
  decideOnboardingTransition,
  getOnboardingProgress,
  parseEnabledOnboardingSteps,
  resolveEnabledOnboardingOrder,
  resolveOnboardingStep,
  runOnboardingTransitionEffects,
  type OnboardingStepId,
} from '../app/onboarding_flow';

describe('configurable onboarding flow', () => {
  it('keeps the mandatory legal step enabled when remote config omits it', () => {
    expect(parseEnabledOnboardingSteps('[]')).toEqual([MANDATORY_ONBOARDING_STEP]);
  });

  it.each([null, undefined, '', '{broken', '{}', '[1]']) (
    'fails safe to the full catalog for invalid config %p',
    (raw) => {
      expect(parseEnabledOnboardingSteps(raw)).toEqual(
        ONBOARDING_STEP_CATALOG.map(({ id }) => id),
      );
    },
  );

  it('ignores unknown ids and restores canonical order', () => {
    expect(parseEnabledOnboardingSteps('["promise","future","welcome"]')).toEqual([
      'welcome',
      'promise',
      'name',
    ]);
  });

  it('applies local product availability after remote config', () => {
    // Блок языка (language + level) глушится локальным рубильником целиком,
    // даже если админка оставила его включённым.
    expect(resolveEnabledOnboardingOrder(['welcome', 'language', 'level', 'name'], false)).toEqual([
      'welcome',
      'name',
    ]);
    expect(resolveEnabledOnboardingOrder(['welcome', 'language', 'level', 'name'], true)).toEqual([
      'welcome',
      'language',
      'level',
      'name',
    ]);
  });

  it('skips adjacent disabled steps in both directions', () => {
    const order = resolveEnabledOnboardingOrder(['welcome', 'promise', 'name'], false);
    expect(resolveOnboardingStep(order, 'welcome', 'forward')).toBe('promise');
    expect(resolveOnboardingStep(order, 'name', 'backward')).toBe('promise');
  });

  it('resolves a disabled restored step to the nearest following step', () => {
    const order = resolveEnabledOnboardingOrder(['welcome', 'notifications', 'name'], false);
    expect(resolveOnboardingStep(order, 'promise', 'current-or-forward')).toBe('notifications');
  });

  it.each([
    [[], 'name', false],
    [['trialReminder'], 'trialReminder', false],
    [['onboardingPaywall'], 'onboardingPaywall', true],
    [['trialReminder', 'onboardingPaywall'], 'trialReminder', false],
  ] as Array<[OnboardingStepId[], OnboardingStepId, boolean]>) (
    'chooses destination and paywall effects for enabled tail %p',
    (tail, destination, paywallEffects) => {
      const order = resolveEnabledOnboardingOrder(['notifications', ...tail, 'name'], false);
      const decision = decideOnboardingTransition(order, 'notifications');
      expect(decision).toEqual({
        destination,
        preparePaywall: paywallEffects,
        createPendingPlan: paywallEffects,
        trackPaywallView: paywallEffects,
      });
    },
  );

  it('prepares paywall when the trial reminder screen is skipped', () => {
    const order = resolveEnabledOnboardingOrder(
      ['notifications', 'onboardingPaywall', 'name'],
      false,
    );
    expect(decideOnboardingTransition(order, 'notifications')).toEqual({
      destination: 'onboardingPaywall',
      preparePaywall: true,
      createPendingPlan: true,
      trackPaywallView: true,
    });
  });

  it('calculates progress from enabled visible progress steps', () => {
    expect(getOnboardingProgress(['welcome', 'privacy', 'notifications', 'name'], 'notifications')).toEqual({ progress: 1, total: 2 });
    expect(getOnboardingProgress(['name'], 'name')).toEqual({ progress: 1, total: 1 });
  });

  it('runs paywall effects exactly once while a repeated transition is busy', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const effects = {
      createPendingPlan: jest.fn(() => gate),
      preparePaywall: jest.fn(),
      trackPaywallView: jest.fn(),
    };
    const busy = { current: false };
    const decision = decideOnboardingTransition(['trialReminder', 'onboardingPaywall', 'name'], 'trialReminder');
    const first = runOnboardingTransitionEffects(decision, busy, effects);
    const second = runOnboardingTransitionEffects(decision, busy, effects);
    release();
    await Promise.all([first, second]);
    expect(effects.createPendingPlan).toHaveBeenCalledTimes(1);
    expect(effects.preparePaywall).toHaveBeenCalledTimes(1);
    expect(effects.trackPaywallView).toHaveBeenCalledTimes(1);
  });
});
