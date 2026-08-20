import { spawnSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = path.resolve(__dirname, '..');
const auditorPath = path.join(
  repoRoot,
  'scripts',
  'theme_assets',
  'audit-theme-assets.mjs',
);

const LIVE_THEMES = [
  'indigo',
  'sagePorcelain',
  'olive',
  'midnight',
  'ember',
  'aurora',
  'volt',
  'dark',
  'gold',
] as const;

type AuditReport = {
  liveThemes: string[];
  slots: Record<string, Record<string, string>>;
  violations: Array<{
    code: string;
    path?: string;
    slotId?: string;
    theme?: string;
  }>;
};

const fixtureRoots: string[] = [];

function createFixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'phraseman-theme-audit-'));
  fixtureRoots.push(root);
  mkdirSync(path.join(root, 'app'), { recursive: true });
  return root;
}

function writeThemeAsset(root: string, theme: string, fileName = 'menu.webp'): string {
  const relativePath = path.posix.join('assets', 'images', 'sample', theme, fileName);
  const absolutePath = path.join(root, ...relativePath.split('/'));
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, theme);
  return relativePath;
}

function writeRegistry(
  root: string,
  rows: ReadonlyArray<{ theme: string; assetPath: string }>,
): void {
  const entries = rows
    .map(({ theme, assetPath }) => `  ${theme}: require('../${assetPath}'),`)
    .join('\n');
  writeFileSync(
    path.join(root, 'app', 'sampleThemeAssets.ts'),
    [
      "import type { ThemeMode } from '../constants/theme';",
      'export const SAMPLE_MENU: Record<ThemeMode, unknown> = {',
      entries,
      '};',
      '',
    ].join('\n'),
  );
}

function auditFixture(root: string): AuditReport {
  const moduleUrl = pathToFileURL(auditorPath).href;
  const program = [
    `import(${JSON.stringify(moduleUrl)})`,
    `.then(({ auditThemeAssets }) => auditThemeAssets(${JSON.stringify({
      rootDir: root,
      sourceRoots: ['app'],
    })}))`,
    '.then(report => process.stdout.write(JSON.stringify(report)))',
  ].join('');
  const result = spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', program],
    { cwd: repoRoot, encoding: 'utf8' },
  );

  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'theme asset auditor failed');
  }
  return JSON.parse(result.stdout) as AuditReport;
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe('theme asset source-first auditor', () => {
  test('builds a complete nine-theme slot from static require entries', () => {
    const root = createFixture();
    const rows = LIVE_THEMES.map(theme => ({
      theme,
      assetPath: writeThemeAsset(root, theme),
    }));
    writeRegistry(root, rows);

    const report = auditFixture(root);

    expect(report.liveThemes).toEqual(LIVE_THEMES);
    expect(report.slots['sample/menu']).toEqual(
      Object.fromEntries(rows.map(({ theme, assetPath }) => [theme, assetPath])),
    );
    expect(report.violations).toEqual([]);
  });

  test('reports missing files and live-theme aliases', () => {
    const root = createFixture();
    const rows = LIVE_THEMES.map(theme => ({
      theme,
      assetPath: writeThemeAsset(root, theme),
    }));
    rows.find(row => row.theme === 'gold')!.assetPath = rows.find(
      row => row.theme === 'indigo',
    )!.assetPath;
    rows.find(row => row.theme === 'volt')!.assetPath =
      'assets/images/sample/volt/missing.webp';
    writeRegistry(root, rows);

    const report = auditFixture(root);
    const codes = report.violations.map(item => item.code);

    expect(codes).toContain('live_theme_alias');
    expect(codes).toContain('missing_asset_file');
  });

  test('reports legacy theme keys and owner-retired raster families', () => {
    const root = createFixture();
    const indigoPath = writeThemeAsset(root, 'indigo');
    const retiredPath = 'assets/images/weekly_boon_icons/png/dark/double_xp.webp';
    const retiredAbsolutePath = path.join(root, ...retiredPath.split('/'));
    mkdirSync(path.dirname(retiredAbsolutePath), { recursive: true });
    writeFileSync(retiredAbsolutePath, 'retired');
    writeRegistry(root, [
      { theme: 'minimalDark', assetPath: indigoPath },
      { theme: 'dark', assetPath: retiredPath },
    ]);

    const report = auditFixture(root);
    const codes = report.violations.map(item => item.code);

    expect(codes).toContain('legacy_theme_key');
    expect(codes).toContain('retired_raster_reference');
  });

  test('groups nested per-theme maps by their inner semantic slot key', () => {
    const root = createFixture();
    const darkPath = writeThemeAsset(root, 'dark', 'streak-dark-001.webp');
    const goldPath = writeThemeAsset(root, 'gold', 'streak-gold-001.webp');
    writeFileSync(
      path.join(root, 'app', 'nestedThemeAssets.ts'),
      [
        "import type { ThemeMode } from '../constants/theme';",
        'const STREAKS: Record<ThemeMode, Record<number, unknown>> = {',
        '  dark: {',
        `    1: require('../${darkPath}'),`,
        '  },',
        '  gold: {',
        `    1: require('../${goldPath}'),`,
        '  },',
        '};',
        '',
      ].join('\n'),
    );

    const report = auditFixture(root);

    expect(report.slots['sample/1']).toMatchObject({
      dark: darkPath,
      gold: goldPath,
    });
  });

  test('uses explicit return-object keys to group theme branches with different filenames', () => {
    const root = createFixture();
    const rows = LIVE_THEMES.map(theme => ({
      theme,
      assetPath: writeThemeAsset(root, theme, `art-${theme}.webp`),
    }));
    const branches = rows.map(({ theme, assetPath }) => [
      `  if (themeMode === '${theme}') {`,
      '    return {',
      `      lesson: require('../${assetPath}'),`,
      '    };',
      '  }',
    ].join('\n'));
    writeFileSync(
      path.join(root, 'app', 'branchThemeAssets.ts'),
      [
        "import type { ThemeMode } from '../constants/theme';",
        'export function getArt(themeMode: ThemeMode) {',
        ...branches,
        '  throw new Error(`missing theme: ${themeMode}`);',
        '}',
        '',
      ].join('\n'),
    );

    const report = auditFixture(root);

    expect(report.slots['sample/lesson']).toEqual(
      Object.fromEntries(rows.map(({ theme, assetPath }) => [theme, assetPath])),
    );
  });
});
