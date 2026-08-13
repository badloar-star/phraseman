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
    expect(parseEnabledOnboardingSteps('["goal","future","welcome"]')).toEqual([
      'welcome',
      'goal',
      'name',
    ]);
  });

  it('applies local product availability after remote config', () => {
    expect(resolveEnabledOnboardingOrder(['welcome', 'language', 'name'], false)).toEqual([
      'welcome',
      'name',
    ]);
  });

  it('skips adjacent disabled steps in both directions', () => {
    const order = resolveEnabledOnboardingOrder(['welcome', 'goal', 'name'], false);
    expect(resolveOnboardingStep(order, 'welcome', 'forward')).toBe('goal');
    expect(resolveOnboardingStep(order, 'name', 'backward')).toBe('goal');
  });

  it('resolves a disabled restored step to the nearest following step', () => {
    const order = resolveEnabledOnboardingOrder(['welcome', 'minutes', 'name'], false);
    expect(resolveOnboardingStep(order, 'goal', 'current-or-forward')).toBe('minutes');
  });

  it.each([
    [[], 'name', false],
    [['startMode'], 'startMode', false],
    [['planComparison'], 'planComparison', false],
    [['onboardingPaywall'], 'onboardingPaywall', true],
    [['startMode', 'planComparison'], 'startMode', false],
    [['startMode', 'onboardingPaywall'], 'startMode', false],
    [['planComparison', 'onboardingPaywall'], 'planComparison', false],
    [['startMode', 'planComparison', 'onboardingPaywall'], 'startMode', false],
  ] as Array<[OnboardingStepId[], OnboardingStepId, boolean]>) (
    'chooses destination and paywall effects for enabled tail %p',
    (tail, destination, paywallEffects) => {
      const order = resolveEnabledOnboardingOrder(['plusBenefits', ...tail, 'name'], false);
      const decision = decideOnboardingTransition(order, 'plusBenefits');
      expect(decision).toEqual({
        destination,
        preparePaywall: paywallEffects,
        trackPaywallView: paywallEffects,
      });
    },
  );

  it('prepares paywall when plan comparison is skipped after start mode', () => {
    const order = resolveEnabledOnboardingOrder(
      ['startMode', 'onboardingPaywall', 'name'],
      false,
    );
    expect(decideOnboardingTransition(order, 'startMode')).toEqual({
      destination: 'onboardingPaywall',
      preparePaywall: true,
      trackPaywallView: true,
    });
  });

  it('calculates progress from enabled visible progress steps', () => {
    expect(getOnboardingProgress(['welcome', 'goal', 'aha', 'name'], 'goal')).toEqual({ progress: 1, total: 2 });
    expect(getOnboardingProgress(['name'], 'name')).toEqual({ progress: 1, total: 1 });
  });

  it('runs paywall effects exactly once while a repeated transition is busy', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const effects = {
      preparePaywall: jest.fn(() => gate),
      trackPaywallView: jest.fn(),
    };
    const busy = { current: false };
    const decision = decideOnboardingTransition(['startMode', 'onboardingPaywall', 'name'], 'startMode');
    const first = runOnboardingTransitionEffects(decision, busy, effects);
    const second = runOnboardingTransitionEffects(decision, busy, effects);
    release();
    await Promise.all([first, second]);
    expect(effects.preparePaywall).toHaveBeenCalledTimes(1);
    expect(effects.trackPaywallView).toHaveBeenCalledTimes(1);
  });
});
