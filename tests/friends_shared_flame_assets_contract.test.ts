import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const ROOT = process.cwd();
const SOURCE_PATH = path.join(
  ROOT,
  'components/friends_together/friends_flame_assets.ts',
);
const THEMES = [
  'dark',
  'gold',
  'olive',
  'midnight',
  'ember',
  'aurora',
  'volt',
  'indigo',
  'sagePorcelain',
] as const;
const STAGES = [1, 2, 3] as const;

function expectedAssetPaths(): string[] {
  return THEMES.flatMap((theme) => STAGES.map(
    (stage) => `../../assets/images/friends-shared-flame/${theme}/stage-${stage}.webp`,
  )).sort();
}

function evaluateAssetResolver(): (theme: string, stage: number) => string {
  const source = fs.readFileSync(SOURCE_PATH, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports: Record<string, unknown> = {};
  const fakeRequire = (assetPath: string) => assetPath;

  new Function('exports', 'require', compiled)(exports, fakeRequire);

  return exports.resolveFriendsSharedFlameAsset as (theme: string, stage: number) => string;
}

describe('friends shared flame asset map', () => {
  it('wires exactly one literal bundled WebP for every active theme and flame stage', () => {
    expect(fs.existsSync(SOURCE_PATH)).toBe(true);
    const source = fs.readFileSync(SOURCE_PATH, 'utf8');
    const assetPaths = [...source.matchAll(
      /require\(['\"](\.\.\/\.\.\/assets\/images\/friends-shared-flame\/[^'\"]+\.webp)['\"]\)/g,
    )].map((match) => match[1]).sort();

    expect(assetPaths).toEqual(expectedAssetPaths());
    expect(source.match(/require\(/g)).toHaveLength(27);
  });

  it('exports a typed resolver with dark fallback and bounded three-stage access', () => {
    expect(fs.existsSync(SOURCE_PATH)).toBe(true);
    const source = fs.readFileSync(SOURCE_PATH, 'utf8');

    expect(source).toMatch(/export\s+type\s+FriendsSharedFlameTheme/);
    expect(source).toMatch(/export\s+function\s+resolveFriendsSharedFlameAsset/);
    expect(source).toMatch(/import\s+type\s+\{\s*ThemeMode\s*\}\s+from\s+['\"]\.\.\/\.\.\/constants\/theme['\"]/);
    expect(source).toMatch(/Record<\s*ThemeMode,/);
    expect(source).toMatch(/Object\.prototype\.hasOwnProperty\.call\(\s*FRIENDS_SHARED_FLAME_ASSETS,\s*theme,?\s*\)/);
    expect(source).toMatch(/Math\.min\(3,\s*Math\.max\(1,/);
  });

  it('resolves known themes and normalizes every stage boundary without loading asset files', () => {
    expect(fs.existsSync(SOURCE_PATH)).toBe(true);
    const resolveAsset = evaluateAssetResolver();

    expect(resolveAsset('gold', 2)).toBe(
      '../../assets/images/friends-shared-flame/gold/stage-2.webp',
    );
    expect(resolveAsset('unknown', 2)).toBe(
      '../../assets/images/friends-shared-flame/dark/stage-2.webp',
    );
    expect(resolveAsset('dark', -4)).toBe(
      '../../assets/images/friends-shared-flame/dark/stage-1.webp',
    );
    expect(resolveAsset('dark', 8)).toBe(
      '../../assets/images/friends-shared-flame/dark/stage-3.webp',
    );
    expect(resolveAsset('dark', 2.9)).toBe(
      '../../assets/images/friends-shared-flame/dark/stage-2.webp',
    );
    expect(resolveAsset('dark', Number.NaN)).toBe(
      '../../assets/images/friends-shared-flame/dark/stage-1.webp',
    );
    expect(resolveAsset('dark', Number.POSITIVE_INFINITY)).toBe(
      '../../assets/images/friends-shared-flame/dark/stage-1.webp',
    );
    expect(resolveAsset('dark', Number.NEGATIVE_INFINITY)).toBe(
      '../../assets/images/friends-shared-flame/dark/stage-1.webp',
    );
    expect(resolveAsset('toString', 2)).toBe(
      '../../assets/images/friends-shared-flame/dark/stage-2.webp',
    );
    expect(resolveAsset('constructor', 3)).toBe(
      '../../assets/images/friends-shared-flame/dark/stage-3.webp',
    );
    expect(resolveAsset('__proto__', 1)).toBe(
      '../../assets/images/friends-shared-flame/dark/stage-1.webp',
    );
  });

  it('keeps the asset registry focused on the shared flame, without chest terminology', () => {
    expect(fs.existsSync(SOURCE_PATH)).toBe(true);
    const source = fs.readFileSync(SOURCE_PATH, 'utf8');

    expect(source).not.toMatch(/сундук|chest/i);
  });
});
