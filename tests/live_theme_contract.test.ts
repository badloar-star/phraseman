import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const LIVE_THEME_UNION =
  "export type ThemeMode = 'dark' | 'gold' | 'olive' | 'midnight' | 'ember' | 'aurora' | 'volt' | 'indigo' | 'sagePorcelain';";
const LEGACY_THEME_TOMBSTONES = [
  'minimalDark',
  'candyBlue',
  'business',
  'businessLight',
] as const;

describe('live interface theme contract', () => {
  const themeSource = read('constants/theme.ts');
  const contextSource = read('components/ThemeContext.tsx');
  const accessPolicySource = read('app/theme_access_policy.ts');

  test('exposes exactly the nine owner-approved runtime themes', () => {
    const union = themeSource.match(/export type ThemeMode\s*=\s*[^;]+;/)?.[0];

    expect(union).toBe(LIVE_THEME_UNION);
    expect(accessPolicySource).toContain("  'indigo',");
    expect(accessPolicySource).toContain("  'sagePorcelain',");
    expect(accessPolicySource).toContain("  'gold',");
    for (const removed of LEGACY_THEME_TOMBSTONES) {
      expect(accessPolicySource).not.toContain(`  '${removed}',`);
    }
  });

  test('keeps removed names only as persisted-value migration tombstones', () => {
    const themeMapStart = contextSource.indexOf('const THEME_MAP');
    const themeMapEnd = contextSource.indexOf('const CYCLE');
    const themeMap = contextSource.slice(themeMapStart, themeMapEnd);
    const removedSetLine = contextSource
      .split(/\r?\n/)
      .find(line => line.includes('const REMOVED_THEME_MODES')) ?? '';

    expect(contextSource).toContain("const DEFAULT_THEME_MODE: ThemeMode = 'indigo';");
    for (const removed of LEGACY_THEME_TOMBSTONES) {
      expect(removedSetLine).toContain(`'${removed}'`);
      expect(themeMap).not.toMatch(new RegExp(`\\b${removed}\\b`));
    }
    expect(contextSource).toContain('migrated = DEFAULT_THEME_MODE;');
    expect(contextSource).toContain("void AsyncStorage.setItem('app_theme', DEFAULT_THEME_MODE);");
  });

  test('removes legacy palettes and business-only flat-mode selection', () => {
    for (const identifier of [
      'MINIMAL_DARK',
      'CANDY_BLUE',
      'BUSINESS',
      'BUSINESS_LIGHT',
    ]) {
      expect(themeSource).not.toMatch(new RegExp(`export const ${identifier}\\b`));
      expect(contextSource).not.toMatch(new RegExp(`\\b${identifier}\\b`));
    }
    expect(contextSource).not.toMatch(/effectiveThemeMode === 'business(?:Light)?'/);
    expect(contextSource).not.toContain('isFlat');
    expect(fs.existsSync(path.join(root, 'constants/flatDesign.ts'))).toBe(false);
  });

  test('removes the business-only icon color adapter and its imports', () => {
    expect(fs.existsSync(path.join(root, 'constants/monoIcon.ts'))).toBe(false);

    const sourceRoots = ['app', 'components', 'constants', 'hooks', 'lib', 'modules'];
    const offenders: string[] = [];
    const visit = (directory: string) => {
      if (!fs.existsSync(directory)) return;
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(absolutePath);
        else if (/\.[cm]?[jt]sx?$/.test(entry.name)) {
          const source = fs.readFileSync(absolutePath, 'utf8');
          if (/constants\/monoIcon|\bmonoIcon\s*\(|\bisBusinessMode\s*\(/.test(source)) {
            offenders.push(path.relative(root, absolutePath).replace(/\\/g, '/'));
          }
        }
      }
    };
    sourceRoots.forEach(relativePath => visit(path.join(root, relativePath)));

    expect(offenders).toEqual([]);
  });
});
