import fs from 'fs';
import path from 'path';

// Контракт таблицы сравнения Free/Plus.
//
// зачем 2026-08-16: раньше сравнение было ОТДЕЛЬНЫМ шагом (planComparison) между
// выбором Plus (startMode) и ценами. В утверждённом минимальном флоу оба этих шага
// удалены, а сама таблица никуда не делась — она переехала НА экран цен, чтобы
// человек видел, что именно добавится к бесплатному, прямо рядом с тарифами.
// Тест сторожит именно это: колонки, живые выгоды и запреты владельца обязаны
// пережить переезд. Пропадёт таблица с пейвола — тест упадёт.
const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('onboarding plan comparison contract', () => {
  it('drops the standalone comparison step together with the plan questionnaire', () => {
    expect(source).not.toContain("| 'planComparison'");
    expect(source).not.toContain("| 'startMode'");
    expect(source).not.toContain('renderPlanComparison');
    // Переход на цены остаётся ровно один — с экрана «предупредим до конца пробного».
    expect(source).toContain("decideOnboardingTransition(enabledOrder, 'trialReminder')");
    expect(source.match(/runOnboardingTransitionEffects\(decision/g)).toHaveLength(1);
    expect(source).toContain('go(decision.destination)');
  });

  it('keeps the FREE/PLUS columns and real perks on the paywall screen', () => {
    expect(source).toContain('PAYWALL_COMPARISON_BENEFITS');
    expect(source).toContain('PlanComparisonRow');
    expect(source).toContain('>FREE<');
    expect(source).toContain('>PLUS<');
    // Реальные киллер-фичи — набор владельца, менять только сознательно.
    expect(source).toContain('Безлимит энергии');
    expect(source).toContain('Практика произношения');
    expect(source).toContain('Разговорная практика');
    expect(source).toContain('Аналитика 365 дней');
  });

  it('does not use the forbidden word «ИИ» on the comparison perks', () => {
    const start = source.indexOf('PAYWALL_COMPARISON_BENEFITS');
    expect(start).toBeGreaterThan(-1);
    const benefitsBlock = source.slice(start, start + 700);
    expect(benefitsBlock).not.toContain('ИИ');
    // Запрещённые по задаче фичи не попали в набор.
    expect(benefitsBlock).not.toContain('Арена');
    expect(benefitsBlock).not.toContain('Все языки');
  });
});
