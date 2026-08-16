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
    // Рубильник глушит ВЕСЬ языковой блок — и выбор языка, и уровень.
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
    // 'source' выключен, якорь на него → отдаём ближайший следующий живой шаг.
    const order = resolveEnabledOnboardingOrder(['welcome', 'promise', 'name'], false);
    expect(resolveOnboardingStep(order, 'source', 'current-or-forward')).toBe('promise');
  });

  // Эффекты пейвола (подготовка, pending-план, трекинг показа) обязаны сработать
  // РОВНО тогда, когда следующий шаг — сам пейвол, и ни на шаг раньше.
  it.each([
    [[], 'name', false],
    [['trialReminder'], 'trialReminder', false],
    [['improve'], 'improve', false],
    [['onboardingPaywall'], 'onboardingPaywall', true],
    [['trialReminder', 'onboardingPaywall'], 'trialReminder', false],
    [['onboardingPaywall', 'improve'], 'onboardingPaywall', true],
    [['trialReminder', 'onboardingPaywall', 'improve'], 'trialReminder', false],
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

  it('prepares paywall when the trial reminder leads straight into prices', () => {
    const order = resolveEnabledOnboardingOrder(
      ['trialReminder', 'onboardingPaywall', 'name'],
      false,
    );
    expect(decideOnboardingTransition(order, 'trialReminder')).toEqual({
      destination: 'onboardingPaywall',
      preparePaywall: true,
      createPendingPlan: true,
      trackPaywallView: true,
    });
  });

  it('calculates progress from enabled visible progress steps', () => {
    // welcome и privacy не считаются шагами прогресса.
    expect(getOnboardingProgress(['welcome', 'privacy', 'promise', 'name'], 'promise'))
      .toEqual({ progress: 1, total: 2 });
    expect(getOnboardingProgress(['name'], 'name')).toEqual({ progress: 1, total: 1 });
  });

  it('runs paywall effects exactly once while a repeated transition is busy', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const effects = {
      preparePaywall: jest.fn(() => gate),
      createPendingPlan: jest.fn(),
      trackPaywallView: jest.fn(),
    };
    const busy = { current: false };
    const decision = decideOnboardingTransition(['trialReminder', 'onboardingPaywall', 'name'], 'trialReminder');
    const first = runOnboardingTransitionEffects(decision, busy, effects);
    const second = runOnboardingTransitionEffects(decision, busy, effects);
    release();
    await Promise.all([first, second]);
    expect(effects.preparePaywall).toHaveBeenCalledTimes(1);
    expect(effects.createPendingPlan).toHaveBeenCalledTimes(1);
    expect(effects.trackPaywallView).toHaveBeenCalledTimes(1);
  });
});
