import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');

describe('onboarding finish navigation', () => {
  it('keeps the app stack mounted behind onboarding instead of returning only onboarding', () => {
    expect(source).not.toContain('if (effectiveShowOnboarding) {\n    return (');
    expect(source).toContain('{ready && effectiveShowOnboarding && (');
    expect(source.indexOf('<Stack')).toBeLessThan(source.indexOf('{ready && effectiveShowOnboarding && ('));
  });

  it('replaces the stack with home before removing the onboarding overlay', () => {
    const finishStart = source.indexOf('const handleOnboardingDone = useCallback(async () => {');
    const finishEnd = source.indexOf('}, [armPostOnboardingGoldBridge, router]);', finishStart);
    const finishBody = source.slice(finishStart, finishEnd);

    expect(finishBody).toContain("router.replace('/(tabs)/home' as any);");
    expect(finishBody.indexOf("router.replace('/(tabs)/home' as any);")).toBeLessThan(
      finishBody.indexOf('setShow(false);'),
    );
    expect(finishBody).toContain("setTimeout(() => router.replace('/(tabs)/home' as any), 120);");
  });
});
