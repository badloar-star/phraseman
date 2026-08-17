export type OnboardingStepId =
  | 'welcome'
  | 'privacy'
  | 'niceToMeet'
  | 'source'
  | 'language'
  | 'level'
  | 'promise'
  | 'improve'
  | 'notifications'
  | 'letsBuild'
  | 'trialReminder'
  | 'onboardingPaywall'
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

// Флоу ровно по скриншотам Bevel (владелец, 2026-08-17): «privacy» — экран-сейф
// (предложение входа), «niceToMeet» — приветствие по имени, «promise» — график
// роста на весь экран, «improve» — зачем анонимная статистика, «source» —
// откуда узнал, язык — отдельным отключаемым блоком (language+level), пока не
// добавлены языки, «notifications» — макет телефона с пушем, «letsBuild» —
// пустой экран-переход, затем ОБЯЗАТЕЛЬНЫЙ «name» (согласия и возраст), честное
// «trialReminder» и цены. Онбординг завершает пейвол (любой из его выходов),
// а не «name» — поэтому финал прогресса = onboardingPaywall.
// Порядок ВАЖЕН: он же — порядок экранов в приложении и в админке.
export const ONBOARDING_STEP_CATALOG: readonly {
  id: OnboardingStepId;
  label: string;
  description: string;
  mandatory?: boolean;
}[] = [
  { id: 'welcome', label: 'Приветствие', description: 'Первый экран знакомства и вход.' },
  { id: 'privacy', label: 'Приватность и вход', description: 'Экран-сейф: предложение входа, данные не передаются.' },
  { id: 'niceToMeet', label: 'Приятно познакомиться', description: 'Приветствие по имени после входа/сейфа.' },
  { id: 'promise', label: 'Обещание результата', description: 'Анимированный график роста на весь экран.' },
  { id: 'improve', label: 'Помоги улучшить', description: 'Зачем нужна анонимная статистика — перед вопросом об источнике.' },
  { id: 'source', label: 'Источник', description: 'Откуда пользователь узнал о приложении.' },
  { id: 'language', label: 'Язык', description: 'Выбор изучаемого языка (выключен, пока язык один).' },
  { id: 'level', label: 'Уровень', description: 'Уровень выбранного языка (блок языка).' },
  { id: 'notifications', label: 'Уведомления', description: 'Предложение включить уведомления с макетом пуша.' },
  { id: 'letsBuild', label: 'Настроим под тебя', description: 'Пустой экран-переход перед согласиями («Теперь настроим всё под тебя»).' },
  {
    id: 'name',
    label: 'Имя и согласия',
    description: 'Возраст и согласие на статистику — до пробного и цен.',
    mandatory: true,
  },
  { id: 'trialReminder', label: 'Напоминание о пробном', description: 'Обещание предупредить до конца пробного.' },
  { id: 'onboardingPaywall', label: 'Предложение подписки', description: 'Экран покупки; любой его выход завершает онбординг.' },
];

const ALL_STEP_IDS = ONBOARDING_STEP_CATALOG.map(({ id }) => id);
const KNOWN_STEP_IDS = new Set<OnboardingStepId>(ALL_STEP_IDS);

// зачем: сохранённый в админке список тумблеров — allowlist. Новые экраны
// каталога в нём отсутствуют и молча выключались бы на проде, если владелец
// хоть раз пересохранял тумблеры. Эти id считаются включёнными, даже когда их
// нет в сохранённом массиве. Включены по умолчанию до первого пересохранения:
// новая админка кладёт в массив метку ONBOARDING_STEPS_CATALOG_MARK, и с ней
// список читается буквально (иначе владелец не смог бы выключить новые экраны
// вовсе). Старые клиенты метку отбрасывают как неизвестный id. Зеркало —
// onboardingParseEnabled в admin/v2/legacy.html.
//
// Набор = ВСЕ id, которых не знал последний РЕЛИЗНЫЙ каталог (welcome, source,
// language, level, notifications, onboardingPaywall, name). Панель тумблеров в
// админке живёт с 12.07 — если список хоть раз публиковался, в нём нет ни одного
// экрана из добавленных позже, а не только niceToMeet/letsBuild от 17.08.
export const ONBOARDING_STEPS_DEFAULT_ON: readonly OnboardingStepId[] = [
  'privacy',
  'niceToMeet',
  'promise',
  'improve',
  'letsBuild',
  'trialReminder',
];
export const ONBOARDING_STEPS_CATALOG_MARK = 'catalog_2026_08_17';

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
    if (!parsed.includes(ONBOARDING_STEPS_CATALOG_MARK)) {
      for (const id of ONBOARDING_STEPS_DEFAULT_ON) requested.add(id);
    }
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

/**
 * Куда идти «вперёд» с шага `from` ПОСЛЕ обязательного шага, или null — вперёд
 * некуда, онбординг надо ЗАВЕРШИТЬ.
 *
 * зачем (2026-08-17): хвост флоу name → trialReminder → onboardingPaywall
 * необязателен целиком. resolveOnboardingStep(...,'forward') за концом списка
 * возвращает MANDATORY ('name') — для шагов после name это «назад», и клиент
 * запирал человека в петле name ↔ trialReminder (или name → name навсегда, если
 * выключены оба хвостовых экрана). Правило: назад/на месте/на обязательный =
 * завершение. Сравниваем по каталогу — enabledOrder его подпоследовательность,
 * поэтому это верно и когда сам `from` только что выключили на лету.
 * Использовать ТОЛЬКО для шагов от name и дальше: до name «вперёд» на name —
 * законный переход, а не финал.
 */
export function resolveOnboardingAdvance(
  enabledOrder: readonly OnboardingStepId[],
  from: OnboardingStepId,
): OnboardingStepId | null {
  const next = resolveOnboardingStep(enabledOrder, from, 'forward');
  if (next === from || next === MANDATORY_ONBOARDING_STEP) return null;
  if (ALL_STEP_IDS.indexOf(next) <= ALL_STEP_IDS.indexOf(from)) return null;
  return next;
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
