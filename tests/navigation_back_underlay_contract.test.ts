import fs from 'fs';
import path from 'path';

const SOURCE_ROOTS = [
  path.join(__dirname, '..', 'app'),
  path.join(__dirname, '..', 'components'),
];

function listSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(fullPath);
    }
  }
  return results;
}

function isAllowedNativeBackFile(file: string): boolean {
  const baseName = path.basename(file);
  return baseName.startsWith('_admin_');
}

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

  it('keeps production screens off native router.back()', () => {
    const offenders: string[] = [];
    const sourceFiles = SOURCE_ROOTS.flatMap(listSourceFiles);

    for (const file of sourceFiles) {
      if (isAllowedNativeBackFile(file)) continue;
      const source = fs.readFileSync(file, 'utf8');
      source.split(/\r?\n/).forEach((line, index) => {
        const code = line.replace(/\/\/.*$/, '');
        if (/\brouter\.back\s*\(/.test(code)) {
          const relativePath = path.relative(path.join(__dirname, '..'), file);
          offenders.push(`${relativePath}:${index + 1}`);
        }
      });
    }

    expect(offenders).toEqual([]);
  });
});
