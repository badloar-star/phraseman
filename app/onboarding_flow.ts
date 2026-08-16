export type OnboardingStepId =
  | 'welcome'
  | 'privacy'
  | 'source'
  | 'language'
  | 'level'
  | 'promise'
  | 'notifications'
  | 'trialReminder'
  | 'onboardingPaywall'
  | 'improve'
  | 'name';

export type OnboardingFlowDirection = 'forward' | 'backward' | 'current-or-forward';

export type OnboardingTransitionDecision = {
  destination: OnboardingStepId;
  preparePaywall: boolean;
  createPendingPlan: boolean;
  trackPaywallView: boolean;
};

export type OnboardingTransitionEffects = {
  preparePaywall: () => Promise<void> | void;
  createPendingPlan: () => Promise<void> | void;
  trackPaywallView: () => Promise<void> | void;
};

export const MANDATORY_ONBOARDING_STEP: OnboardingStepId = 'name';
export const ONBOARDING_ENABLED_STEPS_TEXT_KEY = 'onboarding_enabled_steps_v1';

// Минимальный флоу (владелец, 2026-08-16): анкета про построение плана удалена
// вместе с планами; язык — отдельным отключаемым блоком (language+level), пока
// не добавлены языки. «privacy» — экран-сейф в духе Bevel (предложение входа),
// «promise» — обязательный анимированный экран прогресса (график роста и два
// раскрывающихся факта), затем «trialReminder» перед ценами и «improve» перед
// согласиями.
export const ONBOARDING_STEP_CATALOG: readonly {
  id: OnboardingStepId;
  label: string;
  description: string;
  mandatory?: boolean;
}[] = [
  { id: 'welcome', label: 'Приветствие', description: 'Первый экран знакомства и вход.' },
  { id: 'privacy', label: 'Приватность и вход', description: 'Экран-сейф: предложение входа, данные не передаются.' },
  { id: 'source', label: 'Источник', description: 'Откуда пользователь узнал о приложении.' },
  { id: 'language', label: 'Язык', description: 'Выбор изучаемого языка (выключен, пока язык один).' },
  { id: 'level', label: 'Уровень', description: 'Уровень выбранного языка (блок языка).' },
  { id: 'promise', label: 'Обещание результата', description: 'Анимированный график роста и два раскрывающихся факта.' },
  { id: 'notifications', label: 'Уведомления', description: 'Предложение включить уведомления.' },
  { id: 'trialReminder', label: 'Напоминание о пробном', description: 'Обещание предупредить до конца пробного.' },
  { id: 'onboardingPaywall', label: 'Предложение подписки', description: 'Экран покупки.' },
  { id: 'improve', label: 'Помоги улучшить', description: 'Объяснение перед согласиями: аналитика и возраст.' },
  {
    id: 'name',
    label: 'Имя и согласия',
    description: 'Возраст и обязательные юридические условия.',
    mandatory: true,
  },
];

const ALL_STEP_IDS = ONBOARDING_STEP_CATALOG.map(({ id }) => id);
const KNOWN_STEP_IDS = new Set<OnboardingStepId>(ALL_STEP_IDS);

export function parseEnabledOnboardingSteps(raw: string | null | undefined): OnboardingStepId[] {
  if (!raw) return [...ALL_STEP_IDS];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.some((value) => typeof value !== 'string')) {
      return [...ALL_STEP_IDS];
    }

    const requested = new Set(
      parsed.filter((value): value is OnboardingStepId => KNOWN_STEP_IDS.has(value as OnboardingStepId)),
    );
    requested.add(MANDATORY_ONBOARDING_STEP);
    return ALL_STEP_IDS.filter((id) => requested.has(id));
  } catch {
    return [...ALL_STEP_IDS];
  }
}

export function resolveEnabledOnboardingOrder(
  remotelyEnabled: readonly OnboardingStepId[],
  showLanguageStep: boolean,
): OnboardingStepId[] {
  const enabled = new Set(remotelyEnabled);
  enabled.add(MANDATORY_ONBOARDING_STEP);
  // Блок языка целиком (выбор + уровень): продукт ещё не добавил вторые языки,
  // поэтому локальный рубильник глушит оба экрана независимо от админки.
  if (!showLanguageStep) {
    enabled.delete('language');
    enabled.delete('level');
  }
  return ALL_STEP_IDS.filter((id) => enabled.has(id));
}

export function resolveOnboardingStep(
  enabledOrder: readonly OnboardingStepId[],
  anchor: OnboardingStepId,
  direction: OnboardingFlowDirection,
): OnboardingStepId {
  const safeOrder = enabledOrder.length > 0 ? enabledOrder : [MANDATORY_ONBOARDING_STEP];
  const anchorEnabledIndex = safeOrder.indexOf(anchor);

  if (direction === 'backward') {
    if (anchorEnabledIndex > 0) return safeOrder[anchorEnabledIndex - 1];
    const anchorCatalogIndex = ALL_STEP_IDS.indexOf(anchor);
    return [...safeOrder].reverse().find((id) => ALL_STEP_IDS.indexOf(id) < anchorCatalogIndex) ?? safeOrder[0];
  }

  if (direction === 'current-or-forward' && anchorEnabledIndex >= 0) return anchor;
  if (direction === 'forward' && anchorEnabledIndex >= 0) {
    return safeOrder[anchorEnabledIndex + 1] ?? MANDATORY_ONBOARDING_STEP;
  }

  const anchorCatalogIndex = ALL_STEP_IDS.indexOf(anchor);
  return safeOrder.find((id) => ALL_STEP_IDS.indexOf(id) >= anchorCatalogIndex)
    ?? MANDATORY_ONBOARDING_STEP;
}

export function decideOnboardingTransition(
  enabledOrder: readonly OnboardingStepId[],
  anchor: OnboardingStepId,
): OnboardingTransitionDecision {
  const destination = resolveOnboardingStep(enabledOrder, anchor, 'forward');
  const opensPaywall = destination === 'onboardingPaywall';
  return {
    destination,
    preparePaywall: opensPaywall,
    createPendingPlan: opensPaywall,
    trackPaywallView: opensPaywall,
  };
}

export function getOnboardingProgress(
  enabledOrder: readonly OnboardingStepId[],
  step: OnboardingStepId,
): { progress: number; total: number } {
  const progressOrder: readonly OnboardingStepId[] = enabledOrder.filter((id) => id !== 'welcome' && id !== 'privacy');
  return { progress: Math.max(0, progressOrder.indexOf(step) + 1), total: Math.max(1, progressOrder.length) };
}

export async function runOnboardingTransitionEffects(
  decision: OnboardingTransitionDecision,
  busy: { current: boolean },
  effects: OnboardingTransitionEffects,
): Promise<boolean> {
  if (!decision.preparePaywall || busy.current) return false;
  busy.current = true;
  try {
    if (decision.createPendingPlan) await effects.createPendingPlan();
    await effects.preparePaywall();
    if (decision.trackPaywallView) await effects.trackPaywallView();
    return true;
  } finally {
    busy.current = false;
  }
}
