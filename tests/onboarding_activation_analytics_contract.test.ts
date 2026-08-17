import fs from 'fs';
import path from 'path';

describe('onboarding activation analytics contract', () => {
  // зачем 2026-08-17: финал согласий («name») стоит ДО пробного и цен (Bevel),
  // поэтому finish отдаёт управление не onDone(), а advanceOrComplete('name')
  // (дальше по хвосту или сразу финал, если хвост выключен). Порядок внутри
  // finish: согласие → onboarding_consent_done → передача хода. Событие
  // onboarding_complete здесь НЕ шлётся — оно ушло в completeOnboarding, на
  // реальный финал (после пейвола), и гейтится сохранённым согласием.
  it('emits consent-done only after the granted-consent await resolves, and completion only at the real finish', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'CleanOnboarding.tsx'), 'utf8');
    const finishStart = source.indexOf('const finish = useCallback(async () =>');
    const finishEnd = source.indexOf('  }, [', finishStart);
    const finish = source.slice(finishStart, finishEnd);
    const consent = finish.indexOf("await setAnalyticsConsent('granted')");
    const consentDone = finish.indexOf("trackOnboarding('onboarding_consent_done'");
    const handoff = finish.indexOf("await advanceOrComplete('name');");
    const grantedBranch = finish.indexOf('if (analyticsAllowed) {');
    const deniedBranch = finish.indexOf('} else {', grantedBranch);

    expect(consent).toBeGreaterThan(-1);
    expect(consentDone).toBeGreaterThan(consent);
    expect(handoff).toBeGreaterThan(consentDone);
    expect(finish.slice(consent, handoff)).not.toContain('void (async () =>');
    expect(grantedBranch).toBeGreaterThan(-1);
    expect(consent).toBeGreaterThan(grantedBranch);
    expect(deniedBranch).toBeGreaterThan(consentDone);
    expect(finish.slice(deniedBranch, handoff)).not.toContain("trackOnboarding('onboarding_consent_done'");
    // До пейвола onboarding_complete не срабатывает.
    expect(finish).not.toContain("trackOnboarding('onboarding_complete'");
    // Сам финал онбординга (onboarding_done, воронка, ник, onboarding_complete)
    // уехал в completeOnboarding — его зовут три выхода с пейвола, а не кнопка согласий.
    expect(finish).not.toContain('onDone();');
    const completeStart = source.indexOf('const completeOnboarding = useCallback(async () => {');
    expect(completeStart).toBeGreaterThan(-1);
    const complete = source.slice(completeStart, source.indexOf('  }, [', completeStart));
    const storedConsent = complete.indexOf("const analyticsAllowed = storedHelp === '1';");
    const doneWrite = complete.indexOf("[DONE_KEY, '1']");
    const completeEvent = complete.indexOf("trackOnboarding('onboarding_complete'");
    expect(storedConsent).toBeGreaterThan(-1);
    expect(doneWrite).toBeGreaterThan(storedConsent);
    expect(completeEvent).toBeGreaterThan(doneWrite);
    expect(complete.slice(0, completeEvent)).toContain('if (analyticsAllowed) {');
    // Событие объявлено в каталоге аналитики.
    const analytics = fs.readFileSync(path.join(__dirname, '..', 'app', 'analytics.ts'), 'utf8');
    expect(analytics).toContain("| 'onboarding_consent_done'");
  });
});
