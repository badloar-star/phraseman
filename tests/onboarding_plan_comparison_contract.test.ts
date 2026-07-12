import fs from 'fs';
import path from 'path';

// Контракт нового экрана сравнения Free/Plus (planComparison), который вставлен
// МЕЖДУ выбором Plus (startMode) и ценами (onboardingPaywall). Проверяем, что шаг
// заведён во всех нужных местах и что после выбора Plus поток идёт через сравнение,
// а не сразу на пейвол.
const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('onboarding plan comparison screen contract', () => {
  it('registers planComparison in the step enum, order and progress map', () => {
    // enum
    expect(source).toContain("| 'planComparison'");
    // порядок: сравнение стоит между выбором старта и пейволом
    const order = source.slice(source.indexOf('CLEAN_ONBOARDING_ORDER'));
    const iStart = order.indexOf("'startMode'");
    const iCmp = order.indexOf("'planComparison'");
    const iPay = order.indexOf("'onboardingPaywall'");
    expect(iStart).toBeGreaterThan(-1);
    expect(iCmp).toBeGreaterThan(iStart);
    expect(iPay).toBeGreaterThan(iCmp);
    // прогресс-бар знает про новый шаг
    expect(source).toContain('getOnboardingProgress(enabledOrder, step)');
  });

  it('routes Plus -> planComparison -> onboardingPaywall (never Plus -> paywall directly)', () => {
    // выбор Plus ведёт на сравнение
    expect(source).toContain("decideOnboardingTransition(enabledOrder, 'startMode')");
    // единственный переход на пейвол — из обработчика сравнения
    expect(source).toContain('continueFromPlanComparison');
    // сам переход на цены существует ровно в одном месте (внутри continueFromPlanComparison)
    expect(source).toContain("decideOnboardingTransition(enabledOrder, 'planComparison')");
    expect(source).toContain('go(decision.destination)');
  });

  it('renders the comparison screen light with FREE/PLUS columns and real perks', () => {
    expect(source).toContain('renderPlanComparison');
    expect(source).toContain("case 'planComparison': return renderPlanComparison()");
    expect(source).toContain('PLAN_COMPARISON_BENEFITS');
    expect(source).toContain('PlanComparisonRow');
    // колонки
    expect(source).toContain('>FREE<');
    expect(source).toContain('>PLUS<');
    // реальные киллер-фичи (по нашим правкам)
    expect(source).toContain('Безлимит энергии');
    expect(source).toContain('Практика произношения');
    expect(source).toContain('Разговорная практика');
    expect(source).toContain('Аналитика 365 дней');
  });

  it('does not use the forbidden word «ИИ» on the comparison screen perks', () => {
    const benefitsBlock = source.slice(
      source.indexOf('PLAN_COMPARISON_BENEFITS'),
      source.indexOf('PLAN_COMPARISON_BENEFITS') + 700,
    );
    expect(benefitsBlock).not.toContain('ИИ');
    // и запрещённые по задаче фичи не попали в набор
    expect(benefitsBlock).not.toContain('Арена');
    expect(benefitsBlock).not.toContain('Все языки');
  });
});
