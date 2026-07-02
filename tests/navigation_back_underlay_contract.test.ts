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

  it('keeps the root native stack on an opaque CONSTANT app background during route pops', () => {
    const rootLayoutFile = path.join(__dirname, '..', 'app', '_layout.tsx');
    const source = fs.readFileSync(rootLayoutFile, 'utf8');

    // Фон стека и корневого View — константа темы. Производные от асинхронных флагов
    // (appShellReady и т.п.) давали «чёрный кадр» при гонке — запрещены контрактом.
    expect(source).toContain('contentStyle: { backgroundColor: tTheme.bgPrimary }');
    expect(source).not.toContain('contentStyle: { backgroundColor: appShellReady');
    expect(source).toContain("animation: 'none'");
  });

  it('keeps per-screen stack animations behind the global transition flags', () => {
    const rootLayoutFile = path.join(__dirname, '..', 'app', '_layout.tsx');
    const source = fs.readFileSync(rootLayoutFile, 'utf8');
    const stackScreenLines = source.split(/\r?\n/).filter((line) => line.includes('<Stack.Screen'));
    const directSlideScreens = stackScreenLines.filter((line) => /animation:\s*'slide_from_(right|bottom)'/.test(line));

    expect(source).toContain('const defaultScreenAnimationOptions = ENABLE_SCREEN_TRANSITIONS');
    expect(source).toContain('const bottomModalAnimationOptions = ENABLE_SCREEN_TRANSITIONS');
    expect(source).toContain('...pushScreenAnimationOptions');
    expect(source).toContain('...bottomModalAnimationOptions');
    // Fade — только через флаг SCREEN_FADE_TRANSITIONS и только iOS (см. config.ts).
    expect(source).toContain("SCREEN_FADE_TRANSITIONS && Platform.OS === 'ios'");
    expect(directSlideScreens).toEqual([]);
  });
});
