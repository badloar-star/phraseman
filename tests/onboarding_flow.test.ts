import {
  MANDATORY_ONBOARDING_STEP,
  ONBOARDING_STEP_CATALOG,
  ONBOARDING_STEPS_CATALOG_MARK,
  ONBOARDING_STEPS_DEFAULT_ON,
  decideOnboardingTransition,
  getOnboardingProgress,
  parseEnabledOnboardingSteps,
  resolveEnabledOnboardingOrder,
  resolveRuntimeOnboardingSteps,
  resolveOnboardingStep,
  runOnboardingTransitionEffects,
  type OnboardingStepId,
} from '../app/onboarding_flow';

describe('configurable onboarding flow', () => {
  it('keeps the mandatory legal step enabled when remote config omits it', () => {
    expect(parseEnabledOnboardingSteps(JSON.stringify([ONBOARDING_STEPS_CATALOG_MARK]))).toEqual([MANDATORY_ONBOARDING_STEP]);
  });

  // зачем (2026-08-17): сохранённый список — allowlist; экраны, добавленные в
  // каталог позже сохранения, иначе молча выключались бы на проде. Список без
  // метки каталога = старое сохранение → новые id включены; с меткой — буквально.
  // letsBuild убран владельцем 2026-08-17 (пустой экран-переход, никуда не вёл) —
  // ни в DEFAULT_ON, ни в каталоге его больше нет.
  it('treats catalog ids added after an old save as enabled until the toggles are re-saved', () => {
    // Набор = все id, которых не знал последний РЕЛИЗНЫЙ каталог, а не только 17.08:
    // панель тумблеров публиковалась с 12.07, старый список не содержит ни одного из них.
    expect(ONBOARDING_STEPS_DEFAULT_ON).toEqual([
      'privacy',
      'niceToMeet',
      'promise',
      'improve',
      'trialReminder',
    ]);
    // Старое сохранение (без метки): новых id нет в списке — они всё равно включены,
    // а релизные (source, notifications, onboardingPaywall) — нет, раз их не сохранили.
    expect(parseEnabledOnboardingSteps('["welcome","name"]')).toEqual([
      'welcome',
      'privacy',
      'niceToMeet',
      'promise',
      'improve',
      'name',
      'trialReminder',
    ]);
    // Новое сохранение (с меткой): владелец выключил их явно — уважаем.
    expect(parseEnabledOnboardingSteps(JSON.stringify(['welcome', 'promise', ONBOARDING_STEPS_CATALOG_MARK]))).toEqual([
      'welcome',
      'promise',
      'name',
    ]);
    // Метка — не шаг: в результат не попадает.
    expect(parseEnabledOnboardingSteps(JSON.stringify(['welcome', 'improve', ONBOARDING_STEPS_CATALOG_MARK]))).toEqual([
      'welcome',
      'improve',
      'name',
    ]);
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
    expect(parseEnabledOnboardingSteps(JSON.stringify(['promise', 'future', 'welcome', ONBOARDING_STEPS_CATALOG_MARK]))).toEqual([
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

  it('forces the full local catalog only for the explicit QA runtime', () => {
    const remote = ['welcome', 'name'] as OnboardingStepId[];

    expect(resolveRuntimeOnboardingSteps(remote, false)).toEqual(remote);
    expect(resolveRuntimeOnboardingSteps(remote, true)).toEqual(
      ONBOARDING_STEP_CATALOG.map(({ id }) => id),
    );
  });

  it('skips adjacent disabled steps in both directions', () => {
    const order = resolveEnabledOnboardingOrder(['welcome', 'promise', 'name'], false);
    expect(resolveOnboardingStep(order, 'welcome', 'forward')).toBe('promise');
    expect(resolveOnboardingStep(order, 'name', 'backward')).toBe('promise');
  });

  it('resolves a disabled restored step to the nearest following step', () => {
    // 'niceToMeet' выключен, якорь на него → отдаём ближайший следующий живой шаг.
    const order = resolveEnabledOnboardingOrder(['welcome', 'promise', 'name'], false);
    expect(resolveOnboardingStep(order, 'niceToMeet', 'current-or-forward')).toBe('promise');
    // 'source' теперь стоит после promise (Bevel) — ближайший живой справа = name.
    expect(resolveOnboardingStep(order, 'source', 'current-or-forward')).toBe('name');
  });

  // Эффекты пейвола (подготовка, pending-план, трекинг показа) обязаны сработать
  // РОВНО тогда, когда следующий шаг — сам пейвол, и ни на шаг раньше.
  // 2026-08-17 (Bevel): хвост флоу — name → trialReminder → onboardingPaywall,
  // поэтому якорь — обязательный «name»; пустой хвост оставляет на «name».
  it.each([
    [[], 'name', false],
    [['trialReminder'], 'trialReminder', false],
    [['onboardingPaywall'], 'onboardingPaywall', true],
    [['trialReminder', 'onboardingPaywall'], 'trialReminder', false],
  ] as Array<[OnboardingStepId[], OnboardingStepId, boolean]>) (
    'chooses destination and paywall effects for enabled tail %p',
    (tail, destination, paywallEffects) => {
      const order = resolveEnabledOnboardingOrder(['notifications', 'name', ...tail], false);
      const decision = decideOnboardingTransition(order, 'name');
      expect(decision).toEqual({
        destination,
        preparePaywall: paywallEffects,
        createPendingPlan: paywallEffects,
        trackPaywallView: paywallEffects,
      });
    },
  );

  it('never fires paywall effects on the way into the mandatory consent step', () => {
    // notifications → name: цены ещё впереди, эффекты пейвола здесь — ошибка.
    // (letsBuild убран владельцем 2026-08-17 — пустой экран-переход, который
    // никуда не вёл; тест держит ту же проверку на живом соседнем шаге.)
    const order = resolveEnabledOnboardingOrder(['notifications', 'name', 'trialReminder', 'onboardingPaywall'], false);
    expect(decideOnboardingTransition(order, 'notifications')).toEqual({
      destination: 'name',
      preparePaywall: false,
      createPendingPlan: false,
      trackPaywallView: false,
    });
  });

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
