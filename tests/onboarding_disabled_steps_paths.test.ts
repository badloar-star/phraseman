import {
  ONBOARDING_STEP_CATALOG,
  MANDATORY_ONBOARDING_STEP,
  parseEnabledOnboardingSteps,
  resolveEnabledOnboardingOrder,
  resolveOnboardingStep,
  decideOnboardingTransition,
  getOnboardingProgress,
  type OnboardingStepId,
} from '../app/onboarding_flow';

// зачем: главное требование владельца к тумблерам в админке — выключение одного или
// НЕСКОЛЬКИХ экранов не должно ничего ломать: путь просто идёт дальше без них.
// Здесь мы проходим онбординг целиком для всех практически важных комбинаций.
const ALL = ONBOARDING_STEP_CATALOG.map(({ id }) => id);

/** Полный проход «вперёд» от первого включённого шага до обязательного финала. */
function walk(order: readonly OnboardingStepId[]): OnboardingStepId[] {
  const path: OnboardingStepId[] = [];
  let cur = resolveOnboardingStep(order, ALL[0], 'current-or-forward');
  for (let guard = 0; guard < ALL.length + 5; guard++) {
    path.push(cur);
    if (cur === MANDATORY_ONBOARDING_STEP) return path;
    const next = resolveOnboardingStep(order, cur, 'forward');
    if (next === cur) return path; // залипание — поймается проверкой ниже
    cur = next;
  }
  return path;
}

function orderFor(disabled: readonly OnboardingStepId[]): OnboardingStepId[] {
  const enabled = ALL.filter((id) => !disabled.includes(id));
  return resolveEnabledOnboardingOrder(parseEnabledOnboardingSteps(JSON.stringify(enabled)), true);
}

describe('Onboarding survives disabling any screens', () => {
  it('walks to the finish with every single screen disabled, one at a time', () => {
    for (const off of ALL) {
      if (off === MANDATORY_ONBOARDING_STEP) continue;
      const path = walk(orderFor([off]));
      expect(path).not.toContain(off);
      expect(path[path.length - 1]).toBe(MANDATORY_ONBOARDING_STEP);
      expect(new Set(path).size).toBe(path.length); // без петель
    }
  });

  it('walks to the finish for every pair of disabled screens', () => {
    const off = ALL.filter((id) => id !== MANDATORY_ONBOARDING_STEP);
    for (let i = 0; i < off.length; i++) {
      for (let j = i + 1; j < off.length; j++) {
        const path = walk(orderFor([off[i], off[j]]));
        expect(path).not.toContain(off[i]);
        expect(path).not.toContain(off[j]);
        expect(path[path.length - 1]).toBe(MANDATORY_ONBOARDING_STEP);
      }
    }
  });

  it('still finishes when everything optional is disabled', () => {
    const order = orderFor(ALL.filter((id) => id !== MANDATORY_ONBOARDING_STEP));
    expect(order).toEqual([MANDATORY_ONBOARDING_STEP]);
    expect(walk(order)).toEqual([MANDATORY_ONBOARDING_STEP]);
  });

  it('never strands a user parked on a screen that was just turned off', () => {
    // Пользователь стоял на экране, который владелец выключил из админки:
    // клиент обязан увести его вперёд, а не показать пустоту.
    for (const parked of ALL) {
      if (parked === MANDATORY_ONBOARDING_STEP) continue;
      const order = orderFor([parked]);
      const resolved = resolveOnboardingStep(order, parked, 'current-or-forward');
      expect(order).toContain(resolved);
    }
  });

  it('keeps the back button on enabled screens only', () => {
    const order = orderFor(['source', 'level', 'promise']);
    for (const step of order) {
      const back = resolveOnboardingStep(order, step, 'backward');
      expect(order).toContain(back);
    }
  });

  it('still triggers paywall side effects when the screens before it are off', () => {
    const order = orderFor(['trialReminder', 'improve']);
    // Экран оплаты включён, значит переход к нему обязан готовить paywall.
    const anchor = resolveOnboardingStep(order, 'onboardingPaywall', 'backward');
    expect(decideOnboardingTransition(order, anchor).destination).toBe('onboardingPaywall');
    expect(decideOnboardingTransition(order, anchor).preparePaywall).toBe(true);
  });

  it('does not fire paywall effects when the paywall screen itself is off', () => {
    const order = orderFor(['onboardingPaywall']);
    for (const step of order) {
      expect(decideOnboardingTransition(order, step).preparePaywall).toBe(false);
    }
  });

  it('reports honest progress numbers for a shortened flow', () => {
    const order = orderFor(['source', 'promise', 'improve']);
    const { total } = getOnboardingProgress(order, MANDATORY_ONBOARDING_STEP);
    const last = getOnboardingProgress(order, MANDATORY_ONBOARDING_STEP).progress;
    expect(last).toBe(total); // финальный шаг = «N из N», без «5 из 12»
    for (const step of order) {
      const { progress } = getOnboardingProgress(order, step);
      expect(progress).toBeLessThanOrEqual(total);
    }
  });
});
