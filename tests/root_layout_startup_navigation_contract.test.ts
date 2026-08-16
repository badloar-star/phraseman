import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
const premiumModalSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'premium_modal.tsx'), 'utf8');
const languageWelcomeSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'language_welcome.tsx'), 'utf8');

describe('root layout startup navigation contract', () => {
  it('mounts the root stack on first render and keeps startup states as overlays', () => {
    expect(source).not.toMatch(/if\s*\(!ready\)\s*\{\s*return\s*\(/);
    expect(source).not.toMatch(/if\s*\(isBanned\)\s*\{\s*return\s*\(/);
    expect(source).toContain('const startupSplashVisible = !fontsReady || !ready');
    expect(source).toContain('|| (!effectiveShowOnboarding && !isBanned && !firstContentReady)');
    expect(source).toContain('const FIRST_CONTENT_READY_FALLBACK_MS = 900;');
    expect(source).toContain('setTimeout(() => setFirstContentReady(true), FIRST_CONTENT_READY_FALLBACK_MS)');
    expect(source.indexOf('<Stack')).toBeGreaterThan(-1);
    expect(source.indexOf('<Stack')).toBeLessThan(
      source.indexOf('<StartupSplashHold visible={startupSplashVisible}'),
    );
  });

  it('defers premium dispatcher replace navigation until after the root mount settles', () => {
    expect(premiumModalSource).toContain('useRootNavigationState');
    expect(premiumModalSource).toContain('scheduleAfterRootNavigationReady');
    expect(premiumModalSource).toContain('InteractionManager.runAfterInteractions');
    expect(premiumModalSource).not.toContain('useLayoutEffect');

    const manageStart = premiumModalSource.indexOf('if (!isManageContext) return;');
    expect(manageStart).toBeGreaterThan(-1);
    const manageBlock = premiumModalSource.slice(manageStart, manageStart + 350);
    expect(manageBlock).toContain('scheduleAfterRootNavigationReady');
    expect(manageBlock).toContain('replaceToPaywall(params, router)');
  });

  it('defers the language welcome deep-link gate until after the root mount settles', () => {
    expect(languageWelcomeSource).toContain('useRootNavigationState');

    const gateStart = languageWelcomeSource.indexOf('// Эффект-гейт');
    expect(gateStart).toBeGreaterThan(-1);
    const gateBlock = languageWelcomeSource.slice(gateStart, gateStart + 1400);
    expect(gateBlock).toContain('if (!rootNavReady) return;');
    expect(gateBlock).toContain('scheduleAfterRootNavigationReady(() => {');
    // markNextNavigationAsReplace живёт ВНУТРИ отложенного колбэка — метка не должна
    // «протухать» до реального replace (см. navigation_back.ts).
    expect(gateBlock.indexOf('scheduleAfterRootNavigationReady(() => {'))
      .toBeLessThan(gateBlock.indexOf('markNextNavigationAsReplace()'));
  });
});
