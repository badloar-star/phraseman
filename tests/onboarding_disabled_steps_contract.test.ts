import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('CleanOnboarding disabled step integration', () => {
  it('uses the shared remote flow for navigation, restore and live changes', () => {
    expect(source).toContain('getEnabledOnboardingSteps');
    expect(source).toContain('resolveEnabledOnboardingOrder');
    expect(source).toContain("resolveOnboardingStep(enabledOrder, savedStep, 'current-or-forward')");
    expect(source).toContain("onAppEvent('remote_config_changed'");
    expect(source).not.toContain('go(CLEAN_ONBOARDING_ORDER[index - 1])');
    expect(source).toContain('if (!FORCE_ONBOARDING_QA && savedVersion === CLEAN_ONBOARDING_FLOW_VERSION && savedStep)');
    // зачем 2026-08-16: полоски прогресса в утверждённом макете нет, но позиция
    // во флоу обязана остаться доступной незрячим — номер шага переехал внутрь
    // подписи кнопки «Назад». Пропадёт номер — скринридер потеряет место.
    expect(source).toContain('`Назад. Шаг ${progress} из ${total}`');
    expect(source).not.toContain('PROGRESS_TOTAL');
  });

  it('decides paywall side effects from the actual destination', () => {
    // 2026-08-17: к ценам ведёт единая точка advanceOrComplete(from) — с
    // trialReminder или прямо с «name», если напоминание выключено. Эффекты
    // пейвола не должны дублироваться, поэтому вызов ровно один; появится
    // второй вход — тест обязан упасть.
    expect(source).toContain('decideOnboardingTransition(enabledOrder, from)');
    expect(source.match(/runOnboardingTransitionEffects\(decision/g)).toHaveLength(1);
    // Цель берётся из общего решателя (вперёд или финал), а не из захардкоженного шага.
    expect(source).toContain('const next = resolveOnboardingAdvance(enabledOrder, from);');
    expect(source).toContain('go(next);');
  });
});
