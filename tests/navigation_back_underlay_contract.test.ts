import fs from 'fs';
import path from 'path';

describe('navigation back underlay', () => {
  it('keeps real tab content mounted under full-screen stack routes', () => {
    const tabLayoutFile = path.join(__dirname, '..', 'app', '(tabs)', '_layout.tsx');
    const source = fs.readFileSync(tabLayoutFile, 'utf8');

    expect(source).not.toContain('ph-home-hidden');
    expect(source).not.toContain('hiddenStackUnderlay');
    expect(source).not.toMatch(/if\s*\(!currentRouteIsTab\)\s*\{\s*return\s+<View/);
  });

  it('keeps the root native stack on an opaque app background during route pops', () => {
    const rootLayoutFile = path.join(__dirname, '..', 'app', '_layout.tsx');
    const source = fs.readFileSync(rootLayoutFile, 'utf8');

    expect(source).toContain('backgroundColor: appShellReady ? tTheme.bgPrimary : STARTUP_SPLASH_BG');
    expect(source).toContain('contentStyle: { backgroundColor: appShellReady ? tTheme.bgPrimary : STARTUP_SPLASH_BG }');
    expect(source).toContain("animation: 'none'");
  });
});
