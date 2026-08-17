import fs from 'fs';
import path from 'path';
import {
  ONBOARDING_STEP_CATALOG,
  ONBOARDING_STEPS_CATALOG_MARK,
  MANDATORY_ONBOARDING_STEP,
  parseEnabledOnboardingSteps,
  resolveEnabledOnboardingOrder,
  resolveOnboardingAdvance,
  resolveOnboardingStep,
  decideOnboardingTransition,
  getOnboardingProgress,
  type OnboardingStepId,
} from '../app/onboarding_flow';

// зачем: главное требование владельца к тумблерам в админке — выключение одного или
// НЕСКОЛЬКИХ экранов не должно ничего ломать: путь просто идёт дальше без них.
// Здесь мы проходим онбординг целиком для всех практически важных комбинаций.
const ALL = ONBOARDING_STEP_CATALOG.map(({ id }) => id);

/** Полный проход «вперёд» от первого включённого шага до ПОСЛЕДНЕГО включённого
 *  (2026-08-17: финал — не «name», а конец списка; после «name» шагает
 *  resolveOnboardingAdvance — как клиент, и null там значит «онбординг окончен»). */
function walk(order: readonly OnboardingStepId[]): OnboardingStepId[] {
  const trail: OnboardingStepId[] = [];
  let cur = resolveOnboardingStep(order, ALL[0], 'current-or-forward');
  for (let guard = 0; guard < ALL.length + 5; guard++) {
    trail.push(cur);
    if (cur === order[order.length - 1]) return trail;
    const next = ALL.indexOf(cur) >= ALL.indexOf(MANDATORY_ONBOARDING_STEP)
      ? resolveOnboardingAdvance(order, cur)
      : resolveOnboardingStep(order, cur, 'forward');
    if (next === null || next === cur) return trail; // залипание — поймается проверкой ниже
    cur = next;
  }
  return trail;
}

function orderFor(disabled: readonly OnboardingStepId[]): OnboardingStepId[] {
  const enabled = ALL.filter((id) => !disabled.includes(id));
  // Метка каталога: список читается буквально (иначе новые экраны включаются по умолчанию).
  return resolveEnabledOnboardingOrder(parseEnabledOnboardingSteps(JSON.stringify([...enabled, ONBOARDING_STEPS_CATALOG_MARK])), true);
}

/** Как клиент: с «name» и дальше — только вперёд или финал (null), никогда назад. */
function assertNoBackwardAfterMandatory(order: readonly OnboardingStepId[]) {
  for (const from of order) {
    if (order.indexOf(from) < order.indexOf(MANDATORY_ONBOARDING_STEP)) continue;
    const next = resolveOnboardingAdvance(order, from);
    if (next === null) continue;
    expect(order.indexOf(next)).toBeGreaterThan(order.indexOf(from));
    expect(next).not.toBe(MANDATORY_ONBOARDING_STEP);
  }
}

describe('Onboarding survives disabling any screens', () => {
  it('walks to the finish with every single screen disabled, one at a time', () => {
    for (const off of ALL) {
      if (off === MANDATORY_ONBOARDING_STEP) continue;
      const order = orderFor([off]);
      const trail = walk(order);
      expect(trail).not.toContain(off);
      expect(trail).toContain(MANDATORY_ONBOARDING_STEP);
      expect(trail[trail.length - 1]).toBe(order[order.length - 1]);
      expect(new Set(trail).size).toBe(trail.length); // без петель
      assertNoBackwardAfterMandatory(order);
    }
  });

  it('walks to the finish for every pair of disabled screens', () => {
    const off = ALL.filter((id) => id !== MANDATORY_ONBOARDING_STEP);
    for (let i = 0; i < off.length; i++) {
      for (let j = i + 1; j < off.length; j++) {
        const order = orderFor([off[i], off[j]]);
        const trail = walk(order);
        expect(trail).not.toContain(off[i]);
        expect(trail).not.toContain(off[j]);
        expect(trail).toContain(MANDATORY_ONBOARDING_STEP);
        expect(trail[trail.length - 1]).toBe(order[order.length - 1]);
        assertNoBackwardAfterMandatory(order);
      }
    }
  });

  // зачем (К1): пейвол НЕ обязателен. Раньше «Продолжить» с trialReminder при
  // выключенном пейволе резолвился НАЗАД в 'name' (петля), а с выключенными
  // обоими хвостовыми экранами finish уводил name → name навсегда.
  it.each([
    [['onboardingPaywall']],
    [['onboardingPaywall', 'trialReminder']],
    [['trialReminder']],
  ] as Array<[OnboardingStepId[]]>)('never loops back after the mandatory step when the tail %p is off', (off) => {
    const order = orderFor(off);
    const trail = walk(order);
    expect(trail).toContain(MANDATORY_ONBOARDING_STEP);
    expect(trail[trail.length - 1]).toBe(order[order.length - 1]);
    expect(new Set(trail).size).toBe(trail.length);
    assertNoBackwardAfterMandatory(order);
    // Конец списка = завершение, а не 'name'.
    expect(resolveOnboardingAdvance(order, order[order.length - 1])).toBeNull();
  });

  it('completes (null) from name when both tail screens are off, and from trialReminder when the paywall is off', () => {
    expect(resolveOnboardingAdvance(orderFor(['onboardingPaywall', 'trialReminder']), 'name')).toBeNull();
    expect(resolveOnboardingAdvance(orderFor(['onboardingPaywall']), 'trialReminder')).toBeNull();
    expect(resolveOnboardingAdvance(orderFor(['onboardingPaywall']), 'name')).toBe('trialReminder');
    expect(resolveOnboardingAdvance(orderFor(['trialReminder']), 'name')).toBe('onboardingPaywall');
    expect(resolveOnboardingAdvance(orderFor([]), 'onboardingPaywall')).toBeNull();
  });

  it('completes instead of going back when a tail step is switched off while the user stands on it', () => {
    // Стоял на пейволе, пейвол выключили: не на name, а финал.
    expect(resolveOnboardingAdvance(orderFor(['onboardingPaywall']), 'onboardingPaywall')).toBeNull();
    // Стоял на trialReminder, его выключили, пейвол жив: вперёд на пейвол.
    expect(resolveOnboardingAdvance(orderFor(['trialReminder']), 'trialReminder')).toBe('onboardingPaywall');
  });

  it('wires finish, the trial reminder and live disabling through advanceOrComplete in the component', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');
    expect(source).toContain('const advanceOrComplete = useCallback(async (from: CleanOnboardingStep) => {');
    expect(source).toContain('const next = resolveOnboardingAdvance(enabledOrder, from);');
    expect(source).toContain('await completeOnboardingRef.current();');
    expect(source).toContain("await advanceOrComplete('name');");
    expect(source).toContain("await advanceOrComplete('trialReminder');");
    expect(source).toContain('void advanceOrComplete(step);');
    expect(source).not.toContain("go('trialReminder')");
  });

  it('still finishes when everything optional is disabled', () => {
    const order = orderFor(ALL.filter((id) => id !== MANDATORY_ONBOARDING_STEP));
    expect(order).toEqual([MANDATORY_ONBOARDING_STEP]);
    expect(walk(order)).toEqual([MANDATORY_ONBOARDING_STEP]);
    expect(resolveOnboardingAdvance(order, MANDATORY_ONBOARDING_STEP)).toBeNull();
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
    // 2026-08-17 (Bevel): финал прогресса — пейвол (любой его выход завершает
    // онбординг), обязательный «name» стоит раньше него.
    const finalStep = order[order.length - 1];
    expect(finalStep).toBe('onboardingPaywall');
    const { total } = getOnboardingProgress(order, finalStep);
    const last = getOnboardingProgress(order, finalStep).progress;
    expect(last).toBe(total); // финальный шаг = «N из N», без «5 из 12»
    for (const step of order) {
      const { progress } = getOnboardingProgress(order, step);
      expect(progress).toBeLessThanOrEqual(total);
    }
  });
});
