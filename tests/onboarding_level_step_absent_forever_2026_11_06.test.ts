// ЗАМОК ВЛАДЕЛЬЦА 06.11 (TestFlight 150, через координатора, дословно): «онбординг всё ещё показывает экран „какой у вас уровень" с вариантами ответа — УДАЛИТЬ и чтобы оно больше НИКОГДА не
// возвращалось вообще, я говорил тысячу раз». Реестр docs/work/OWNER_LOCKS.md, строка 06.11. Возвращать — только по новому слову владельца.
import { ONBOARDING_STEP_CATALOG, resolveEnabledOnboardingOrder, type OnboardingStepId } from '../app/onboarding_flow';
import { readSource } from './helpers/read_source';

describe('ЗАМОК ВЛАДЕЛЬЦА 06.11 — шага «уровень» в онбординге нет навсегда', () => {
  const onboarding = readSource('components/CleanOnboarding.tsx');

  it('нет ни флага, ни ключа шага, ни экрана, ни выбора уровня в CleanOnboarding', () => {
    expect(onboarding).not.toContain('SHOW_ONBOARDING_LEVEL_STEP');
    expect(onboarding).not.toContain("| 'level'");
    expect(onboarding).not.toContain("['level'] as const");
    expect(onboarding).not.toContain('renderLevel');
    expect(onboarding).not.toContain('chooseLevel');
    expect(onboarding).not.toContain('LEVEL_OPTIONS');
    expect(onboarding).not.toContain('onboarding-level-');
    expect(onboarding).not.toContain('go(\'level\')');
    expect(onboarding).not.toContain('onboarding_level_stats');
  });

  it('сохранённый шаг level из прошлой сессии уводит на уведомления, а не обратно на удалённый экран', () => {
    expect(onboarding).toContain("if (value === 'level') return 'notifications';");
  });

  it('тексты экрана уровня удалены (вопрос, пять вариантов, пять реакций)', () => {
    const copy = readSource('components/onboarding/clean_onboarding_copy_core.ts');
    expect(copy).not.toMatch(/^\s+level(Question|A0|A1|A2|B1|B2|ReactionA0|ReactionA1|ReactionA2|ReactionB1|ReactionB2):/m);
    const options = readSource('components/onboarding/clean_onboarding_options.ts');
    expect(options).not.toContain('levelTitleOf');
    expect(options).not.toContain('levelReaction');
  });

  it('каталог шагов (и панель админки) не содержит level; level из старого списка игнорируется', () => {
    expect(ONBOARDING_STEP_CATALOG.map((s) => s.id as string)).not.toContain('level');
    const order = resolveEnabledOnboardingOrder(['welcome', 'language', 'level' as OnboardingStepId, 'name'], true);
    expect(order as string[]).not.toContain('level');
  });

  it('журнал [ONBOARDING] steps пишется на старте', () => {
    expect(onboarding).toContain("console.log('[ONBOARDING]', JSON.stringify({ steps: enabledOrder, count: enabledOrder.length }));");
  });
});
