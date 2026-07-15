import fs from 'fs';
import path from 'path';

describe('onboarding activation analytics contract', () => {
  it('emits onboarding completion only after the granted-consent await resolves', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'CleanOnboarding.tsx'), 'utf8');
    const finishStart = source.indexOf('const finish = useCallback(async () =>');
    const finishEnd = source.indexOf('  }, [', finishStart);
    const finish = source.slice(finishStart, finishEnd);
    const consent = finish.indexOf("await setAnalyticsConsent('granted')");
    const complete = finish.indexOf("trackOnboarding('onboarding_complete'");
    const onDone = finish.indexOf('onDone();');
    const grantedBranch = finish.indexOf('if (analyticsAllowed) {');
    const deniedBranch = finish.indexOf('} else {', grantedBranch);

    expect(consent).toBeGreaterThan(-1);
    expect(complete).toBeGreaterThan(consent);
    expect(onDone).toBeGreaterThan(complete);
    expect(finish.slice(consent, onDone)).not.toContain('void (async () =>');
    expect(grantedBranch).toBeGreaterThan(-1);
    expect(consent).toBeGreaterThan(grantedBranch);
    expect(complete).toBeGreaterThan(consent);
    expect(deniedBranch).toBeGreaterThan(complete);
    expect(finish.slice(deniedBranch, onDone)).not.toContain("trackOnboarding('onboarding_complete'");
  });
});
