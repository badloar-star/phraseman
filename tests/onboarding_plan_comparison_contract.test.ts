import fs from 'fs';
import path from 'path';

// Контракт списка выгод пейвола.
//
// зачем 2026-08-16: раньше сравнение было ОТДЕЛЬНЫМ шагом (planComparison) между
// выбором Plus (startMode) и ценами. В минимальном флоу оба шага удалены, а выгоды
// переехали НА экран цен. 2026-08-17 (владелец, макет Bevel): таблица FREE/PLUS
// снята — вместо неё список «плитка-иконка + заголовок + подпись» (PAYWALL_BENEFITS
// → PaywallBenefitRow), контурные SVG вместо Ionicons. Тест сторожит: выгоды живут
// на пейволе, набор владельца и его запреты пережили переезд, таблица не вернулась.
const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('onboarding plan comparison contract', () => {
  it('drops the standalone comparison step together with the plan questionnaire', () => {
    expect(source).not.toContain("| 'planComparison'");
    expect(source).not.toContain("| 'startMode'");
    expect(source).not.toContain('renderPlanComparison');
    // Переход на цены остаётся ровно один — единая точка advanceOrComplete(from)
    // (2026-08-17: с trialReminder, либо прямо с «name», если напоминание выключено).
    expect(source).toContain('decideOnboardingTransition(enabledOrder, from)');
    expect(source.match(/runOnboardingTransitionEffects\(decision/g)).toHaveLength(1);
    expect(source).toContain("await advanceOrComplete('trialReminder');");
  });

  it('keeps the benefit list with real perks on the paywall screen', () => {
    expect(source).toContain('PAYWALL_BENEFITS');
    expect(source).toContain('PaywallBenefitRow');
    expect(source).toContain('BenefitGlyph');
    // Таблица FREE/PLUS снята владельцем 2026-08-17 — вернётся, тест упадёт.
    expect(source).not.toContain('>FREE<');
    expect(source).not.toContain('>PLUS<');
    expect(source).not.toContain('PAYWALL_COMPARISON_BENEFITS');
    // Реальные киллер-фичи — набор владельца, менять только сознательно.
    expect(source).toContain('Безлимит энергии');
    expect(source).toContain('Практика произношения');
    expect(source).toContain('Разговорная практика');
    expect(source).toContain('Аналитика 365 дней');
  });

  it('does not use the forbidden word «ИИ» on the paywall perks', () => {
    const start = source.indexOf('const PAYWALL_BENEFITS');
    expect(start).toBeGreaterThan(-1);
    const benefitsBlock = source.slice(start, start + 900);
    expect(benefitsBlock).not.toContain('ИИ');
    // Запрещённые по задаче фичи не попали в набор.
    expect(benefitsBlock).not.toContain('Арена');
    expect(benefitsBlock).not.toContain('Все языки');
  });
});
