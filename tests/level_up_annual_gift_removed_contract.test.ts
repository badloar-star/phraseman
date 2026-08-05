import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE_ROOTS = [
  'app',
  'components',
  'constants',
  'contexts',
  'hooks',
  'lib',
  'modules',
  'functions/src',
  'admin/v2',
] as const;
const RELEASE_CONFIG_FILES = ['app.json', 'eas.json', 'package.json'] as const;
const SOURCE_EXTENSIONS = new Set(['.cjs', '.html', '.js', '.jsx', '.mjs', '.ts', '.tsx']);

const REMOVED_PATHS = [
  'app/level_up_annual_gift.ts',
  'app/level_up_annual_gift_assets.ts',
  'app/level_up_annual_gift_offer.tsx',
  'components/LevelUpAnnualGiftToast.tsx',
  'functions/src/level_up_annual_gift.test.ts',
  'functions/src/level_up_annual_gift.ts',
  'functions/src/level_up_annual_gift_server.test.ts',
  'functions/src/level_up_annual_gift_server.ts',
  'jest.level-up-annual-gift.config.cjs',
  'tests/level_up_annual_gift_client.test.ts',
  'tests/level_up_annual_gift_ui_contract.test.ts',
  'assets/images/level_up_annual_gift',
  'docs/superpowers/specs/2026-07-29-level-up-annual-premium-gift-design.md',
  'docs/superpowers/plans/2026-07-29-level-up-annual-premium-gift-plan.md',
] as const;

const FORBIDDEN_SOURCE_PATTERNS = [
  /level_up_annual_gift/i,
  /level-up-annual-gift/i,
  /LevelUpAnnualGift/,
  /levelUpAnnualGift/,
  /18 месяцев Premium/i,
  /Premium на 18 месяцев/i,
  /18 месяцев Plus/i,
  /Plus на 18 месяцев/i,
  /18 months? (?:of )?(?:Premium|Plus)/i,
  /(?:Premium|Plus) for 18 months?/i,
  /18 месяцев за цену (?:года|12 месяцев)/i,
  /Получить 18 месяцев/i,
  /\+6 месяцев к годовому доступу/i,
] as const;

function listSourceFiles(relativeRoot: string): string[] {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  if (!existsSync(absoluteRoot)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(absoluteRoot)) {
    const absolutePath = path.join(absoluteRoot, entry);
    if (statSync(absolutePath).isDirectory()) {
      files.push(...listSourceFiles(path.relative(ROOT, absolutePath)));
    } else if (SOURCE_EXTENSIONS.has(path.extname(entry))) {
      files.push(path.relative(ROOT, absolutePath).replaceAll('\\', '/'));
    }
  }
  return files;
}

describe('removed level-up annual Premium gift offer', () => {
  test('has no feature-owned files, bundled art, or resurrection docs', () => {
    const remainingPaths = REMOVED_PATHS.filter((relativePath) => existsSync(path.join(ROOT, relativePath)));
    expect(remainingPaths).toEqual([]);
  });

  test('has no feature identifiers, route, or approved offer copy in runtime, admin, or Functions source', () => {
    const offenders = SOURCE_ROOTS
      .flatMap(listSourceFiles)
      .concat(RELEASE_CONFIG_FILES)
      .flatMap((relativePath) => {
        const source = readFileSync(path.join(ROOT, relativePath), 'utf8');
        return FORBIDDEN_SOURCE_PATTERNS
          .filter((pattern) => pattern.test(source))
          .map((pattern) => `${relativePath}: ${pattern.source}`);
      });

    expect(offenders).toEqual([]);
  });
});
