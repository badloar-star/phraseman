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
// добавлены языки, «notifications» — макет телефона с пушем, затем ОБЯЗАТЕЛЬНЫЙ
// «name» (согласия и возраст), честное «trialReminder» и цены. Онбординг
// завершает пейвол (любой из его выходов), а не «name» — поэтому финал
// прогресса = onboardingPaywall.
// Порядок ВАЖЕН: он же — порядок экранов в приложении и в админке.
//
// зачем «letsBuild» больше нет (владелец, 2026-08-17): пустой экран-переход
// «Теперь настроим всё под тебя» никуда не вёл и ничего не давал. Старые
// сохранённые в remote_config списки с этим id безопасны — KNOWN_STEP_IDS
// в parseEnabledOnboardingSteps молча отфильтрует неизвестный id.
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
  { id: 'language', label: 'Язык', description: 'Выбор изучаемого языка (включён в коде по D126).' },
  { id: 'level', label: 'Уровень', description: 'Уровень выбранного языка (выключен в коде).' },
  { id: 'notifications', label: 'Уведомления', description: 'Предложение включить уведомления с макетом пуша.' },
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
// экрана из добавленных позже, а не только niceToMeet от 17.08.
export const ONBOARDING_STEPS_DEFAULT_ON: readonly OnboardingStepId[] = [
  'privacy',
  'niceToMeet',
  'promise',
  'improve',
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
    // Битый JSON — полный каталог; причину называет explainEnabledOnboardingSteps (лог [ONB-FLAGS]).
    return [...ALL_STEP_IDS];
  }
}

export type OnboardingStepDecisionReason = 'no_list_all_on' | 'bad_list_all_on' | 'mandatory' | 'on_in_pult' | 'default_on_old_list' | 'off_in_pult';
export type OnboardingStepsExplanation = Readonly<{
  listState: 'empty' | 'invalid' | 'with_catalog_mark' | 'without_catalog_mark';
  steps: readonly Readonly<{ id: OnboardingStepId; on: boolean; why: OnboardingStepDecisionReason }>[];
}>;

/**
 * То же решение, что parseEnabledOnboardingSteps, но с причиной по каждому шагу — для лога [ONB-FLAGS].
 * зачем (координатор 28.10, «выключил в Пульте — ничего не изменилось»): лог обязан показать, почему шаг включён или выключен.
 */
export function explainEnabledOnboardingSteps(raw: string | null | undefined): OnboardingStepsExplanation {
  const enabled = new Set(parseEnabledOnboardingSteps(raw));
  let parsed: unknown = null;
  let listState: OnboardingStepsExplanation['listState'] = 'empty';
  if (raw) {
    try {
      parsed = JSON.parse(raw);
      listState = Array.isArray(parsed) && parsed.every((value) => typeof value === 'string')
        ? (parsed.includes(ONBOARDING_STEPS_CATALOG_MARK) ? 'with_catalog_mark' : 'without_catalog_mark')
        : 'invalid';
    } catch {
      listState = 'invalid'; // битый JSON — так и пишем в лог
    }
  }
  const listed = new Set(Array.isArray(parsed) ? parsed : []);
  const steps = ALL_STEP_IDS.map((id) => {
    const why: OnboardingStepDecisionReason = listState === 'empty' ? 'no_list_all_on'
      : listState === 'invalid' ? 'bad_list_all_on'
        : id === MANDATORY_ONBOARDING_STEP ? 'mandatory'
          : listed.has(id) ? 'on_in_pult'
            : enabled.has(id) ? 'default_on_old_list' : 'off_in_pult';
    return { id, on: enabled.has(id), why };
  });
  return { listState, steps };
}

export function resolveEnabledOnboardingOrder(
  remotelyEnabled: readonly OnboardingStepId[],
  showLanguageStep: boolean,
  // зачем: D126 (владелец 2026-09-30) — «только включаем экран с выбором языка»,
  // уровень остаётся выключенным. Раньше один рубильник глушил оба экрана;
  // теперь уровень — отдельный. Дефолт = showLanguageStep, чтобы старые вызовы
  // с двумя аргументами вели себя как прежде (блок целиком).
  showLevelStep: boolean = showLanguageStep,
): OnboardingStepId[] {
  const enabled = new Set(remotelyEnabled);
  enabled.add(MANDATORY_ONBOARDING_STEP);
  // Локальные рубильники сильнее админки: выключенный в коде экран не
  // показывается, даже если в remote_config он включён.
  if (!showLanguageStep) enabled.delete('language');
  if (!showLevelStep) enabled.delete('level');
  return ALL_STEP_IDS.filter((id) => enabled.has(id));
}

/**
 * The explicit DEV QA launch must expose the complete local flow even when the
 * production Remote Config has screens disabled. Outside that one runtime the
 * server-provided allowlist stays authoritative.
 */
export function resolveRuntimeOnboardingSteps(
  remotelyEnabled: readonly OnboardingStepId[],
  forceFullCatalogForQa: boolean,
): OnboardingStepId[] {
  return forceFullCatalogForQa ? [...ALL_STEP_IDS] : [...remotelyEnabled];
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
  // зачем (координатор 12.10, 🔴 пустой экран 20–35 с перед пейволом; СПЕРВА ЛОГИ): чего ждёт переход и сколько каждое звено.
  if (!decision.preparePaywall || busy.current) {
    console.log(`[ONB-PAYWALL-WAIT] effects:skip preparePaywall=${String(decision.preparePaywall)} busy=${String(busy.current)}`); // guard-ok: ранний выход логируется
    return false;
  }
  busy.current = true;
  const t0 = Date.now();
  const lap = (label: string) => console.log(`[ONB-PAYWALL-WAIT] effects:${label} +${Date.now() - t0}ms`); // guard-ok: единичный лог на переход
  try {
    lap(`start createPending=${String(decision.createPendingPlan)} trackView=${String(decision.trackPaywallView)}`);
    if (decision.createPendingPlan) { await effects.createPendingPlan(); lap('createPendingPlan_done'); }
    await effects.preparePaywall();
    lap('preparePaywall_done');
    if (decision.trackPaywallView) { await effects.trackPaywallView(); lap('trackPaywallView_done'); }
    return true;
  } catch (error) {
    console.warn(`[ONB-PAYWALL-WAIT] effects:failed +${Date.now() - t0}ms ${error instanceof Error ? error.message : String(error)}`); // guard-ok: причина не глотается
    throw error;
  } finally {
    busy.current = false;
  }
}
