import fs from 'fs';
import path from 'path';

// зачем: воронка «где чаще всего выходят» в админке живёт на ОДНОМ событии
// onboarding_exit. Показы каждого шага в Firestore сознательно НЕ пишутся — это
// было бы ~10 платных записей на каждого нового пользователя вместо одной.
// Контракт держит и сам факт записи, и её дешевизну.
const source = fs.readFileSync(path.join(process.cwd(), 'components', 'CleanOnboarding.tsx'), 'utf8');

describe('CleanOnboarding exit tracking', () => {
  it('writes a single onboarding_exit record with the last seen step', () => {
    expect(source).toContain("trackActivity('onboarding_exit'");
    expect(source).toContain('writeToFirestore: true');
    expect(source).toContain('tags: { step }');
  });

  it('logs on background only, once, and never after completion', () => {
    expect(source).toContain("AppState.addEventListener('change'");
    expect(source).toContain("if (next === 'active') { exitLoggedRef.current = false; return; }");
    expect(source).toContain('if (exitLoggedRef.current || finishingRef.current) return;');
  });

  it('keeps per-step views off Firestore so the funnel stays cheap', () => {
    // Показ шага уходит только в Firebase Analytics (trackEvent) и в локальную
    // очередь — никакого writeToFirestore рядом с onboarding_step_view.
    const start = source.indexOf('function trackOnboardingStepView');
    expect(start).toBeGreaterThan(-1);
    const stepView = source.slice(start, source.indexOf('\nfunction ', start + 1));
    expect(stepView).toContain("trackEvent('onboarding_step_view'");
    expect(stepView).not.toContain('writeToFirestore');
  });
});
