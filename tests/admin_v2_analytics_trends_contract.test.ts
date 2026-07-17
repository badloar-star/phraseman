import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

type AssetEntry = {
  package: string;
  version: string;
  source: string;
  destination: string;
  sha256: string;
};

type LicenseEntry = {
  package: string;
  version: string;
  source: string;
  sha256: string;
};

type ChartAssetsManifest = {
  schemaVersion: number;
  assets: AssetEntry[];
  licenses: LicenseEntry[];
  noticeDestination: string;
};

const root = path.resolve(__dirname, '..');
const manifestPath = 'scripts/admin-v2-chart-assets.manifest.json';
const syncScriptPath = 'scripts/sync-admin-v2-chart-assets.mjs';
const noticePath = 'admin/v2/vendor/THIRD_PARTY_NOTICES.txt';
const resolve = (file: string): string => path.join(root, file);
const exists = (file: string): boolean => fs.existsSync(resolve(file));
const read = (file: string): string => fs.readFileSync(resolve(file), 'utf8');
const sha256 = (bytes: Buffer | string): string => crypto.createHash('sha256').update(bytes).digest('hex');
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function cssRuleBody(css: string, selector: string): string {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = source.matchAll(new RegExp(
    `(?:^|\\r?\\n)\\s*[^@\\r\\n{}]*${escapeRegExp(selector)}[^\\r\\n{}]*\\{([^{}]*)\\}`,
    'gm',
  ));
  return [...rules].map((rule) => rule[1]).join(' ');
}

function cssMediaSection(css: string, query: string): string {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const start = source.indexOf(`@media ${query}`);
  if (start < 0) return '';
  const next = source.indexOf('@media ', start + 7);
  return source.slice(start, next < 0 ? source.length : next);
}

const dependencyVersions = {
  'chart.js': '4.4.3',
  'chartjs-plugin-zoom': '2.0.1',
  hammerjs: '2.0.8',
} as const;

const expectedManifest: ChartAssetsManifest = {
  schemaVersion: 1,
  assets: [
    {
      package: 'chart.js',
      version: '4.4.3',
      source: 'node_modules/chart.js/dist/chart.umd.js',
      destination: 'admin/v2/vendor/chart.umd.js',
      sha256: '6e708cb2c2b41604db1f5dec01724856ec53ac867899a1e4e2cfb8f0ace6bed9',
    },
    {
      package: 'chartjs-plugin-zoom',
      version: '2.0.1',
      source: 'node_modules/chartjs-plugin-zoom/dist/chartjs-plugin-zoom.min.js',
      destination: 'admin/v2/vendor/chartjs-plugin-zoom.min.js',
      sha256: '503c709802be285c676afe0369bf5f72066d0b0c23929188c3158f35c0327a9c',
    },
    {
      package: 'hammerjs',
      version: '2.0.8',
      source: 'node_modules/hammerjs/hammer.min.js',
      destination: 'admin/v2/vendor/hammer.min.js',
      sha256: '7953631f0e54794d2352a3cfa591c0914d73e14f90141058e3cf16bee7939bcf',
    },
  ],
  licenses: [
    {
      package: 'chart.js',
      version: '4.4.3',
      source: 'node_modules/chart.js/LICENSE.md',
      sha256: '41a84aa2caba645f966a18d9c2056b73e6d3a81d80bc0046bc0011a2634d4cce',
    },
    {
      package: 'chartjs-plugin-zoom',
      version: '2.0.1',
      source: 'node_modules/chartjs-plugin-zoom/LICENSE.md',
      sha256: 'faf50ba4a21e0c740c96e9bbce1b862273cfe5dd2cdf200d3271a781094c6ba9',
    },
    {
      package: 'hammerjs',
      version: '2.0.8',
      source: 'node_modules/hammerjs/LICENSE.md',
      sha256: '4d93df6544df47a49b25add3aff67ff9ff47e4756d85dd0c3e1beba8520ab9f2',
    },
    {
      package: '@kurkle/color',
      version: '0.3.4',
      source: 'node_modules/@kurkle/color/LICENSE.md',
      sha256: '89ba0032731489153d552db918b727feb05128cf9eca20092875a9ad14147671',
    },
  ],
  noticeDestination: noticePath,
};

const vendorMarkers = new Map<string, RegExp>([
  ['admin/v2/vendor/chart.umd.js', /Chart\.js v4\.4\.3/],
  ['admin/v2/vendor/chartjs-plugin-zoom.min.js', /chartjs-plugin-zoom v2\.0\.1/],
  ['admin/v2/vendor/hammer.min.js', /Hammer\.JS/],
]);

const normalizeLicense = (value: string): string => value
  .replace(/^\uFEFF/, '')
  .replace(/\r\n?/g, '\n')
  .replace(/\n+$/g, '');

function buildExpectedNotice(manifest: ChartAssetsManifest, sourceRoot = root): string {
  const sections = manifest.licenses.map((license) => [
    '================================================================================',
    `${license.package}@${license.version}`,
    `License source: ${license.source}`,
    '================================================================================',
    '',
    normalizeLicense(fs.readFileSync(path.join(sourceRoot, license.source), 'utf8')),
  ].join('\n'));

  return [
    'Phraseman Admin v2 third-party notices',
    'Generated from pinned npm packages. Do not edit manually.',
    '',
    sections.join('\n\n'),
    '',
  ].join('\n');
}

function readManifest(): ChartAssetsManifest | null {
  if (!exists(manifestPath)) return null;
  return JSON.parse(read(manifestPath)) as ChartAssetsManifest;
}

function copyFixtureFile(tempRoot: string, relativePath: string): void {
  const destination = path.join(tempRoot, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.writeFileSync(destination, fs.readFileSync(resolve(relativePath)));
}

function createFixtureRoot(manifest: ChartAssetsManifest): string {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-admin-v2-chart-'));
  for (const entry of [...manifest.assets, ...manifest.licenses]) {
    copyFixtureFile(tempRoot, entry.source);
  }
  copyFixtureFile(tempRoot, manifestPath);
  return tempRoot;
}

function runImportedSync(
  explicitRoot: string,
  options: { failPublishRenameIndex?: number } = {},
) {
  const moduleUrl = pathToFileURL(resolve(syncScriptPath)).href;
  const failPublishRenameIndex = options.failPublishRenameIndex;
  const testOnlyHooks = Number.isInteger(failPublishRenameIndex)
    ? `{ beforePublishRename: async ({ index }) => {
      if (index === ${failPublishRenameIndex}) throw new Error('Injected publish rename failure at index ${failPublishRenameIndex}');
    } }`
    : 'undefined';
  const runner = [
    `import { syncAdminV2ChartAssets } from ${JSON.stringify(moduleUrl)};`,
    'try {',
    `  const result = await syncAdminV2ChartAssets(${JSON.stringify(explicitRoot)}, ${testOnlyHooks});`,
    '  process.stdout.write(JSON.stringify(result));',
    '} catch (error) {',
    "  process.stderr.write(error instanceof Error ? error.message : String(error));",
    '  process.exitCode = 1;',
    '}',
  ].join('\n');
  return spawnSync(process.execPath, ['--input-type=module', '--eval', runner], {
    cwd: root,
    encoding: 'utf8',
  });
}

function listVendorFiles(tempRoot: string): string[] {
  const vendorDirectory = path.join(tempRoot, 'admin/v2/vendor');
  if (!fs.existsSync(vendorDirectory)) return [];
  return fs.readdirSync(vendorDirectory).sort();
}

describe('Admin v2 local chart runtime contract', () => {
  test('pins the three runtime dependencies and lockfile packages to exact versions', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      dependencies?: Record<string, string>;
    };
    const packageLock = JSON.parse(read('package-lock.json')) as {
      packages?: Record<string, { dependencies?: Record<string, string>; version?: string }>;
    };

    for (const [name, version] of Object.entries(dependencyVersions)) {
      expect(packageJson.dependencies?.[name]).toBe(version);
      expect(packageLock.packages?.['']?.dependencies?.[name]).toBe(version);
      expect(packageLock.packages?.[`node_modules/${name}`]?.version).toBe(version);
    }
  });

  test('loads only local Hammer, Chart.js and zoom scripts in dependency order before the module router', () => {
    const html = read('admin/v2/index.html');
    const scriptSources = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
      .map((match) => match[1]);
    const chartRuntimeSources = scriptSources.filter((source) => /(?:hammer|chart)/i.test(source));
    const expectedSources = [
      '/v2/vendor/hammer.min.js',
      '/v2/vendor/chart.umd.js',
      '/v2/vendor/chartjs-plugin-zoom.min.js',
    ];

    expect(chartRuntimeSources).toEqual(expectedSources);
    expect(scriptSources).toContain('/v2/scripts/admin-router.js');

    const routerIndex = scriptSources.indexOf('/v2/scripts/admin-router.js');
    for (const source of expectedSources) {
      expect(scriptSources.indexOf(source)).toBeLessThan(routerIndex);
    }

    expect(html).not.toMatch(/(?:unpkg|jsdelivr|cdnjs|cdn\.)/i);
    expect(html).not.toMatch(/https?:\/\/[^"']*(?:chart(?:\.js|js)|hammer)/i);
  });

  test('vendors nonempty, recognizable byte-for-byte copies of the npm artifacts', () => {
    for (const asset of expectedManifest.assets) {
      expect(exists(asset.source)).toBe(true);
      expect(exists(asset.destination)).toBe(true);

      if (!exists(asset.source) || !exists(asset.destination)) continue;

      const sourceBytes = fs.readFileSync(resolve(asset.source));
      const destinationBytes = fs.readFileSync(resolve(asset.destination));
      expect(destinationBytes.byteLength).toBeGreaterThan(1_000);
      expect(destinationBytes.toString('utf8')).toMatch(vendorMarkers.get(asset.destination) as RegExp);
      expect(destinationBytes.equals(sourceBytes)).toBe(true);
    }
  });

  test('uses a fixed, local-only copy allowlist and fails clearly when a source is missing', async () => {
    expect(exists(syncScriptPath)).toBe(true);

    if (!exists(syncScriptPath)) return;

    const source = read(syncScriptPath);
    expect(source).toContain("from 'node:fs/promises'");
    expect(source).toContain('const assets = [');
    expect(source).toContain('await access(');
    expect(source).toContain('await mkdir(');
    expect(source).toContain('await copyFile(');
    expect(source).toContain('await rename(');
    expect(source).toMatch(/Missing vendor source[^\n]*\$\{source\}/);

    const allowlistedPairs = [...source.matchAll(/\[\s*'([^']+)'\s*,\s*'([^']+)'\s*\]/g)]
      .map((match) => [match[1], match[2]]);
    expect(allowlistedPairs).toEqual(expectedManifest.assets.map((asset) => [asset.source, asset.destination]));
    expect(source.match(/\bcopyFile\s*\(/g)?.length).toBeGreaterThanOrEqual(3);
    expect(source).toContain('await lstat(');
    expect(source).not.toMatch(/\brm\([^\n]*recursive\s*:\s*true/);

    for (const asset of expectedManifest.assets) {
      expect(source).toContain(`['${asset.source}', '${asset.destination}']`);
      expect(source.match(new RegExp(asset.source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1);
      expect(source.match(new RegExp(asset.destination.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))).toHaveLength(1);
    }

    expect(source).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket|https?|download)\b/i);
    expect(source).not.toMatch(/node:(?:child_process|http|https|net|tls)/);
    expect(source).not.toMatch(/\b(?:exec|execFile|spawn|spawnSync)\s*\(/);
    expect(source).not.toMatch(/process\.argv\.(?:slice|splice)/);
    expect(source).not.toMatch(/process\.argv\[(?:2|[3-9]|\d{2,})\]/);
    expect(source).toContain('export async function syncAdminV2ChartAssets');

    if (!source.includes('export async function syncAdminV2ChartAssets') || !exists(manifestPath)) return;

    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phraseman-admin-v2-chart-missing-'));
    try {
      copyFixtureFile(tempRoot, manifestPath);
      const result = runImportedSync(tempRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Missing vendor source: node_modules/chart.js/dist/chart.umd.js');
      expect(listVendorFiles(tempRoot)).toEqual([]);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('exposes one exact package script for deterministic vendor synchronization', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['admin:v2:sync-chart-assets'])
      .toBe('node scripts/sync-admin-v2-chart-assets.mjs');
  });

  test('commits the reviewed manifest with exact asset and license source hashes', () => {
    expect(exists(manifestPath)).toBe(true);
    const manifest = readManifest();
    if (!manifest) return;

    expect(manifest).toEqual(expectedManifest);
    const packageLock = JSON.parse(read('package-lock.json')) as {
      packages?: Record<string, { version?: string }>;
    };
    const pinnedPackages = new Map(
      [...manifest.assets, ...manifest.licenses].map((entry) => [entry.package, entry.version]),
    );
    for (const [packageName, version] of pinnedPackages) {
      expect(packageLock.packages?.[`node_modules/${packageName}`]?.version).toBe(version);
    }
    for (const asset of manifest.assets) {
      expect(sha256(fs.readFileSync(resolve(asset.source)))).toBe(asset.sha256);
      expect(sha256(fs.readFileSync(resolve(asset.destination)))).toBe(asset.sha256);
    }
    for (const license of manifest.licenses) {
      expect(sha256(fs.readFileSync(resolve(license.source)))).toBe(license.sha256);
    }
  });

  test('imports the sync function into a temporary root and produces an idempotent four-file vendor set', async () => {
    const manifest = readManifest();
    const source = exists(syncScriptPath) ? read(syncScriptPath) : '';
    expect(manifest).not.toBeNull();
    expect(source).toContain('export async function syncAdminV2ChartAssets');
    if (!manifest || !source.includes('export async function syncAdminV2ChartAssets')) return;

    const tempRoot = createFixtureRoot(manifest);
    const expectedFiles = [
      'THIRD_PARTY_NOTICES.txt',
      'chart.umd.js',
      'chartjs-plugin-zoom.min.js',
      'hammer.min.js',
    ];

    try {
      const firstResult = runImportedSync(tempRoot);
      expect(firstResult.status).toBe(0);
      expect(firstResult.stderr).toBe('');
      expect(listVendorFiles(tempRoot)).toEqual(expectedFiles);

      const firstRun = new Map<string, Buffer>();
      for (const relativePath of [...manifest.assets.map((asset) => asset.destination), manifest.noticeDestination]) {
        firstRun.set(relativePath, fs.readFileSync(path.join(tempRoot, relativePath)));
      }
      for (const asset of manifest.assets) {
        expect(sha256(firstRun.get(asset.destination) as Buffer)).toBe(asset.sha256);
      }

      const secondResult = runImportedSync(tempRoot);
      expect(secondResult.status).toBe(0);
      expect(secondResult.stderr).toBe('');
      expect(listVendorFiles(tempRoot)).toEqual(expectedFiles);
      for (const [relativePath, firstBytes] of firstRun) {
        expect(fs.readFileSync(path.join(tempRoot, relativePath)).equals(firstBytes)).toBe(true);
      }
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('rejects a mutated extracted source without changing published bytes or leaving temp files', async () => {
    const manifest = readManifest();
    const source = exists(syncScriptPath) ? read(syncScriptPath) : '';
    expect(manifest).not.toBeNull();
    expect(source).toContain('export async function syncAdminV2ChartAssets');
    if (!manifest || !source.includes('export async function syncAdminV2ChartAssets')) return;

    const tempRoot = createFixtureRoot(manifest);
    const publishedPaths = [...manifest.assets.map((asset) => asset.destination), manifest.noticeDestination];
    const publishedBytes = new Map<string, Buffer>();

    try {
      for (const relativePath of publishedPaths) {
        const absolutePath = path.join(tempRoot, relativePath);
        const bytes = Buffer.from(`preexisting:${relativePath}`, 'utf8');
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, bytes);
        publishedBytes.set(relativePath, bytes);
      }
      fs.appendFileSync(path.join(tempRoot, manifest.assets[0].source), '\nmutated-after-extraction\n');

      const result = runImportedSync(tempRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(`SHA-256 mismatch for ${manifest.assets[0].source}`);

      for (const [relativePath, bytes] of publishedBytes) {
        expect(fs.readFileSync(path.join(tempRoot, relativePath)).equals(bytes)).toBe(true);
      }
      expect(listVendorFiles(tempRoot)).toEqual([
        'THIRD_PARTY_NOTICES.txt',
        'chart.umd.js',
        'chartjs-plugin-zoom.min.js',
        'hammer.min.js',
      ]);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('rejects manifest path traversal before creating any vendor output', async () => {
    const manifest = readManifest();
    const source = exists(syncScriptPath) ? read(syncScriptPath) : '';
    expect(manifest).not.toBeNull();
    expect(source).toContain('export async function syncAdminV2ChartAssets');
    if (!manifest || !source.includes('export async function syncAdminV2ChartAssets')) return;

    const tempRoot = createFixtureRoot(manifest);
    try {
      const unsafeManifest = structuredClone(manifest);
      unsafeManifest.assets[0].destination = '../outside-vendor.js';
      fs.writeFileSync(
        path.join(tempRoot, manifestPath),
        `${JSON.stringify(unsafeManifest, null, 2)}\n`,
        'utf8',
      );

      const result = runImportedSync(tempRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('manifest does not match pinned allowlist');
      expect(listVendorFiles(tempRoot)).toEqual([]);
      expect(fs.existsSync(path.join(tempRoot, 'outside-vendor.js'))).toBe(false);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('rolls back all four published files when the second publish rename fails', async () => {
    const manifest = readManifest();
    const source = exists(syncScriptPath) ? read(syncScriptPath) : '';
    expect(manifest).not.toBeNull();
    expect(source).toContain('export async function syncAdminV2ChartAssets');
    if (!manifest || !source.includes('export async function syncAdminV2ChartAssets')) return;

    const tempRoot = createFixtureRoot(manifest);
    const publishedPaths = [...manifest.assets.map((asset) => asset.destination), manifest.noticeDestination];
    const originalBytes = new Map<string, Buffer>();
    try {
      for (const relativePath of publishedPaths) {
        const absolutePath = path.join(tempRoot, relativePath);
        const bytes = Buffer.from(`original-before-rename-failure:${relativePath}`, 'utf8');
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        fs.writeFileSync(absolutePath, bytes);
        originalBytes.set(relativePath, bytes);
      }

      const result = runImportedSync(tempRoot, { failPublishRenameIndex: 1 });
      expect(result.status).toBe(1);
      expect(result.stderr).toContain('Injected publish rename failure at index 1');
      for (const [relativePath, bytes] of originalBytes) {
        expect(fs.readFileSync(path.join(tempRoot, relativePath)).equals(bytes)).toBe(true);
      }
      expect(listVendorFiles(tempRoot)).toEqual([
        'THIRD_PARTY_NOTICES.txt',
        'chart.umd.js',
        'chartjs-plugin-zoom.min.js',
        'hammer.min.js',
      ]);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('rejects a directory at destination two before changing any published file', async () => {
    const manifest = readManifest();
    const source = exists(syncScriptPath) ? read(syncScriptPath) : '';
    expect(manifest).not.toBeNull();
    expect(source).toContain('export async function syncAdminV2ChartAssets');
    if (!manifest || !source.includes('export async function syncAdminV2ChartAssets')) return;

    const tempRoot = createFixtureRoot(manifest);
    const publishedPaths = [...manifest.assets.map((asset) => asset.destination), manifest.noticeDestination];
    const directoryDestination = manifest.assets[1].destination;
    const originalBytes = new Map<string, Buffer>();
    try {
      for (const relativePath of publishedPaths) {
        const absolutePath = path.join(tempRoot, relativePath);
        fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
        if (relativePath === directoryDestination) {
          fs.mkdirSync(absolutePath);
        } else {
          const bytes = Buffer.from(`original-before-directory-preflight:${relativePath}`, 'utf8');
          fs.writeFileSync(absolutePath, bytes);
          originalBytes.set(relativePath, bytes);
        }
      }

      const result = runImportedSync(tempRoot);
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(
        `Unsafe existing vendor destination: ${directoryDestination}; expected a regular file or absence`,
      );
      for (const [relativePath, bytes] of originalBytes) {
        expect(fs.readFileSync(path.join(tempRoot, relativePath)).equals(bytes)).toBe(true);
      }
      expect(fs.lstatSync(path.join(tempRoot, directoryDestination)).isDirectory()).toBe(true);
      expect(listVendorFiles(tempRoot)).toEqual([
        'THIRD_PARTY_NOTICES.txt',
        'chart.umd.js',
        'chartjs-plugin-zoom.min.js',
        'hammer.min.js',
      ]);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  test('deploys deterministic complete license notices for all four pinned packages', () => {
    const manifest = readManifest();
    expect(manifest).not.toBeNull();
    expect(exists(noticePath)).toBe(true);
    if (!manifest || !exists(noticePath)) return;

    const notice = read(noticePath);
    expect(notice).toBe(buildExpectedNotice(manifest));
    for (const license of manifest.licenses) {
      expect(notice).toContain(`${license.package}@${license.version}`);
      expect(notice).toContain(normalizeLicense(read(license.source)));
    }
    expect(notice.match(/Permission is hereby granted/g)).toHaveLength(4);
    expect(notice.match(/THE SOFTWARE IS PROVIDED [“\"]AS IS[”\"]/g)).toHaveLength(4);
  });

  test('executes Hammer, Chart.js and zoom as browser globals in their deployed order', () => {
    const document = {
      createElement: () => ({ style: {} }),
      createEvent: () => ({ initEvent: () => undefined }),
      defaultView: null as unknown,
    };
    const sandbox: Record<string, unknown> = {
      console,
      document,
      navigator: { userAgent: '' },
      setTimeout,
      clearTimeout,
      devicePixelRatio: 1,
    };
    sandbox.window = sandbox;
    sandbox.self = sandbox;
    sandbox.globalThis = sandbox;
    document.defaultView = sandbox;
    vm.createContext(sandbox);

    for (const file of [
      'admin/v2/vendor/hammer.min.js',
      'admin/v2/vendor/chart.umd.js',
      'admin/v2/vendor/chartjs-plugin-zoom.min.js',
    ]) {
      vm.runInContext(read(file), sandbox, { filename: file });
    }

    const hammer = sandbox.Hammer as { VERSION?: string };
    const chart = sandbox.Chart as {
      version?: string;
      registry?: { plugins?: { get: (id: string) => unknown } };
    };
    const zoom = sandbox.ChartZoom as { version?: string };
    expect(hammer.VERSION).toBe('2.0.7');
    expect(chart.version).toBe('4.4.3');
    expect(zoom.version).toBe('2.0.1');
    expect(chart.registry?.plugins?.get('zoom')).toBe(zoom);
  });
});

describe('Admin v2 paywall analytics category contract', () => {
  const rendererPath = 'admin/v2/scripts/admin-analytics-trends-view.js';
  const renderer = exists(rendererPath) ? read(rendererPath) : '';
  const analyticsView = read('admin/v2/scripts/admin-analytics-view.js');
  const core = read('admin/v2/scripts/admin-core.js');

  test('adds a pure local renderer with safe chart descriptor and mount helpers', () => {
    expect(exists(rendererPath)).toBe(true);
    expect(renderer).toContain('export function escapeAnalyticsHtml');
    expect(renderer).toContain('export function renderPaywallAnalyticsCategory');
    expect(renderer).toContain('export function createPaywallAnalyticsChartDescriptors');
    expect(renderer).toContain('export function mountPaywallAnalyticsChartsWhenCurrent');
    expect(renderer).toContain("from './components/admin-time-series-chart.js'");
    expect(renderer).toContain("from './components/admin-bar-chart.js'");
    expect(renderer).not.toMatch(/\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/i);
    expect(renderer).not.toMatch(/from\s+['"][^'"]*(?:firebase|firestore)/i);
  });

  test('adds a compact truthful Overview payment summary without mixing money and counts', () => {
    expect(renderer).toContain('export function renderOverviewPaymentSummary');
    expect(renderer).toContain('Что происходит с оплатой');
    expect(renderer).toContain('Показы предложения');
    expect(renderer).toContain('Подтверждённые начала пробного периода');
    expect(renderer).toContain('Подтверждённые первичные покупки');
    expect(renderer).toContain('Валовая выручка с полным покрытием');
    expect(renderer).toContain('overview-payment-count-chart');
    expect(renderer).toContain('Компактная поведенческая воронка');
    expect(renderer).toContain('Состояние источников оплаты');
    expect(renderer).toContain('href="#analytics"');
    expect(renderer).toContain('Открыть всю аналитику');

    const countMetricIdsSource = renderer.match(
      /const OVERVIEW_COUNT_METRIC_IDS = Object\.freeze\(\[([\s\S]*?)\]\);/,
    )?.[1] || '';
    const countMetricIds = [...countMetricIdsSource.matchAll(/'([^']+)'/g)]
      .map((match) => match[1]);
    expect(countMetricIds).toEqual([
      'paywall.shown.v1',
      'paywall.cta_click.v1',
      'paywall.trial_started.v1',
      'paywall.purchase_completed.v1',
    ]);
    expect(countMetricIds).toHaveLength(4);
    expect(countMetricIds).not.toContain('revenue.gross_usd_micros.v1');
    expect(renderer).toContain("series.unit === 'count'");
    expect(renderer).toContain('formatAdminChartValue');
    expect(renderer).not.toContain("overviewSeries: ['paywall.shown.v1', 'revenue.gross_usd_micros.v1']");
  });

  test('integrates the payment summary into Overview without replacing existing content', () => {
    expect(core).toContain('renderOverviewPaymentSummary');
    expect(core).toMatch(/function renderOverview\(\)[\s\S]*renderOverviewPaymentSummary/);
    expect(core).toContain('Требует решения');
    expect(core).toContain('Быстрые переходы');
    expect(core).toContain('renderOverviewOperationalState(view)');
  });

  test('quietly refreshes only the Overview scope through the existing TTL cache', () => {
    const quietLoad = core.match(
      /function maybeLoadOverviewAnalyticsTrends\(\) \{([\s\S]*?)\n\}/,
    )?.[1] || '';
    expect(quietLoad).toContain("state.route !== 'overview'");
    expect(quietLoad).toContain("state.analyticsTrends.overview.status === 'loading'");
    expect(quietLoad).not.toContain("status !== 'idle'");
    expect(quietLoad).toContain("defaultTrendRequest('overview')");
    expect(quietLoad).toContain("beginAnalyticsTrendRequest('overview'");
    expect(quietLoad).toContain('token.cached');
    expect(quietLoad).toContain('completeAnalyticsTrendRequest(token)');
    expect(quietLoad).not.toContain("'paywall'");
    expect(core).toContain('lookupTrendCache(current, request)');
  });

  test('guards quiet Overview completion and chart mounts by request, auth, route and render generation', () => {
    expect(core).toMatch(/maybeLoadOverviewAnalyticsTrends[\s\S]*isCurrentAnalyticsTrendRequest\('overview', token\.generation\)/);
    expect(core).toMatch(/maybeLoadOverviewAnalyticsTrends[\s\S]*authStillValid\(token\.authGeneration, 'money\.read'\)/);
    expect(core).toMatch(/maybeLoadOverviewAnalyticsTrends[\s\S]*state\.route === 'overview'[\s\S]*renderCurrentPage\(\)/);
    expect(core).toContain("capturedRenderGeneration !== renderGeneration || state.route !== 'overview'");
    expect(core).toMatch(/createOverviewPaymentChartDescriptors[\s\S]*mountPaywallAnalyticsChartsWhenCurrent/);
  });

  test('renders bounded date controls, scoped filters and explicit chart actions', () => {
    for (const value of ['7', '28', '90']) {
      expect(renderer).toContain(`value="${value}"`);
    }
    for (const id of [
      'analytics-trends-from', 'analytics-trends-to', 'analytics-trends-granularity',
      'analytics-trends-compare', 'analytics-trends-context', 'analytics-trends-variant',
      'analytics-trends-plan', 'analytics-trends-store', 'analytics-trends-product',
      'analytics-trends-platform',
    ]) {
      expect(renderer).toContain(`id="${id}"`);
    }
    expect(renderer).toContain('data-action="load-analytics-trends"');
    expect(renderer).toContain('data-action="reset-analytics-zoom"');
    expect(renderer).toContain('data-action="toggle-analytics-series"');
    expect(renderer).toContain('paywall_funnel');
    expect(renderer).toContain('Только на поведенческую воронку');
    expect(renderer).toContain('Только на подтверждённые события RevenueCat и деньги');
    expect(renderer).toContain('Только на причины ошибок из управляемого хранилища');
    expect(renderer.match(/renderScopeNote\(/g)?.length).toBeGreaterThanOrEqual(5);
    expect(renderer).toContain('tabindex="0"');
  });

  test('keeps behavioral signals and confirmed store truth visibly separate', () => {
    for (const heading of [
      'Поведенческие сигналы приложения',
      'Семантическая воронка paywall',
      'Разрезы поведенческих сигналов',
      'Подтверждённые покупки RevenueCat',
      'Валовая выручка по валютной шкале',
      'Покупки осколков',
      'Причины ошибок покупки',
      'Свежесть и состояние источников',
    ]) {
      expect(renderer).toContain(heading);
    }
    expect(renderer).toContain('сигнал покупки, не подтверждение магазина');
    expect(renderer).toContain('подтверждённая покупка магазина');
    expect(renderer).toContain('PAYWALL_DEFAULT_VISIBLE_METRIC_IDS');
  });

  test('integrates trends beside the existing analytics without removing totals or workspaces', () => {
    expect(analyticsView).toContain("from './admin-analytics-trends-view.js'");
    expect(analyticsView).toContain('renderPaywallAnalyticsCategory');
    expect(analyticsView).toContain('Активные доступы');
    expect(analyticsView).toContain('События магазина');
    expect(analyticsView).toContain('Сигналы экрана оплаты');
    expect(analyticsView).toContain('Активность приложения');
    expect(core).toContain('renderDetailedAnalyticsWorkspace');
    expect(core).toContain('loadProductAnalytics');
    expect(core).toContain('loadSubscriptionAnalytics');
  });

  test('loads snapshot and paywall trends independently and isolates scope generations', () => {
    expect(core).toContain('analyticsTrends: createAnalyticsTrendScopesState()');
    expect(core).toContain('actions.loadAnalyticsTrends(input)');
    expect(analyticsView).toContain('Promise.allSettled');
    expect(core).toContain('beginTrendLoad');
    expect(core).toContain('completeTrendLoad');
    expect(core).toContain('failTrendLoad');
    expect(core).toContain('toggleVisibleSeries');
    expect(core).toContain("defaultTrendRequest('overview')");
    expect(core).toContain("analyticsTrendInputFromControls('paywall')");
    expect(core).toMatch(/analyticsTrendRequestGeneration\.(?:overview|paywall)/);
  });

  test('keeps the primary snapshot refresh independent from invalid trend controls and stale feedback', () => {
    expect(analyticsView).toContain('export async function settleIndependentAnalyticsRefreshes');
    expect(analyticsView).toContain('export function classifyAnalyticsRefreshResults');
    expect(core).toContain('settleIndependentAnalyticsRefreshes');
    expect(core).toMatch(/trendOperation[\s\S]*analyticsTrendInputFromControls\('paywall'\)[\s\S]*failTrendLoad/);
    expect(core).toMatch(/settleIndependentAnalyticsRefreshes\([\s\S]*actions\.loadAnalytics\(\{ rangeDays \}\)[\s\S]*trendOperation/);
    expect(core).toContain("if (outcome === 'stale') return results;");
    expect(core).toContain('Один источник аналитики не обновился; другой и последние успешные данные сохранены.');
  });

  test('destroys charts before every render and mounts only the captured current generation', () => {
    expect(core).toContain('let renderGeneration = 0');
    expect(core).toMatch(/function renderCurrentPage\(\)\s*{\s*renderGeneration \+= 1;\s*destroyAdminCharts\(\);/);
    expect(core).toContain('const capturedRenderGeneration = renderGeneration');
    expect(core).toContain('queueMicrotask');
    expect(core).toContain('capturedRenderGeneration === renderGeneration');
    expect(core).toContain('mountPaywallAnalyticsChartsWhenCurrent');
    expect(core).toContain('resetAllAdminChartZoom()');
  });

  test('preserves legacy analytics workspaces and hydrates only the selected detailed report', () => {
    expect(analyticsView).toContain('export function captureLegacyAnalyticsWorkspaces');
    expect(analyticsView).toContain('export function restoreLegacyAnalyticsWorkspaces');
    expect(core).toContain('captureLegacyAnalyticsWorkspaces(target)');
    expect(core).toContain('restoreLegacyAnalyticsWorkspaces(target, legacyAnalyticsWorkspaces)');
    expect(core).toContain('syncAnalyticsReportVisibility(target)');
    expect(core).toContain("if (state.activeAnalyticsReport === 'product') globalThis.loadProductAnalytics?.()");
    expect(core).toContain("if (state.activeAnalyticsReport === 'subscriptions') globalThis.loadSubscriptionAnalytics?.()");
    expect(core).toContain("if (state.activeAnalyticsReport === 'exports') globalThis.initializeMonthlyDecisionPack?.()");
    expect(core).not.toContain(`globalThis.loadProductAnalytics?.();
        globalThis.loadSubscriptionAnalytics?.();
        globalThis.initializeMonthlyDecisionPack?.();`);
    expect(core).not.toMatch(/globalThis\.load(?:Product|Subscription)Analytics\?\.\(true\)/);
  });

  test('keeps series toggles local instead of replacing the full analytics page', () => {
    const start = core.indexOf("if (action === 'toggle-analytics-series')");
    const end = core.indexOf("if (action === 'load-analytics-trends')", start);
    const toggleBranch = start >= 0 && end > start ? core.slice(start, end) : '';
    expect(toggleBranch).toContain('toggleVisibleSeries');
    expect(toggleBranch).toContain('mountPaywallAnalyticsChartsWhenCurrent');
    expect(toggleBranch).not.toContain('renderCurrentPage');
  });

  test('defines real CSS rules for planned and mounted analytics hooks', () => {
    const css = read('admin/v2/styles/admin.css');
    const selectors = [
      '.analytics-trend-toolbar',
      '.analytics-trends-toolbar',
      '.analytics-chart-frame',
      '.analytics-trends-chart-host',
      '.analytics-chart-canvas',
      '.admin-chart__canvas',
      '.analytics-filter-grid',
      '.analytics-trends-filter-grid',
      '.analytics-funnel',
      '.analytics-semantic-funnel',
      '.analytics-funnel-stage',
      '.analytics-semantic-funnel > li',
      '.analytics-source-scope',
      '.analytics-filter-scope',
      '.overview-payment-headlines',
      '.overview-payment-detail-grid',
      '.overview-payment-chart-skeleton',
      '.overview-payment-headline-value-skeleton',
      '.overview-payment-funnel-label-skeleton',
      '.overview-payment-source-status-skeleton',
    ];

    for (const selector of selectors) {
      expect(cssRuleBody(css, selector)).not.toBe('');
    }

    expect(cssRuleBody(css, '.analytics-chart-frame')).toMatch(/position\s*:\s*relative/);
    expect(cssRuleBody(css, '.analytics-chart-frame')).toMatch(/min-height\s*:\s*0/);
    expect(cssRuleBody(css, '.analytics-chart-canvas')).toMatch(/height\s*:\s*14\.375rem/);
    expect(cssRuleBody(css, '.analytics-filter-grid')).toMatch(/repeat\(auto-fit,\s*minmax\(/);
    expect(cssRuleBody(css, '.analytics-trends-chart-host')).toMatch(/max-width\s*:\s*100%/);
    expect(cssRuleBody(css, '.analytics-semantic-funnel > li > span')).toMatch(/background\s*:\s*var\(--lime\)/);
    expect(cssRuleBody(css, '.analytics-semantic-funnel > li > span')).toMatch(/color\s*:\s*var\(--lime-ink\)/);
  });

  test('materially adapts analytics at phone, tablet, 1024 and wide desktop widths', () => {
    const css = read('admin/v2/styles/admin.css');
    const phone = cssMediaSection(css, '(max-width: 420px)');
    const tablet = cssMediaSection(css, '(max-width: 768px)');
    const compactDesktop = cssMediaSection(css, '(max-width: 1080px)');
    const wide = cssMediaSection(css, '(min-width: 1280px)');

    expect(phone).toContain('.analytics-filter-grid');
    expect(phone).toMatch(/grid-template-columns\s*:\s*1fr/);
    expect(phone).toContain('.analytics-trends-chart-host');
    expect(phone).toMatch(/overflow-x\s*:\s*(?:auto|hidden)/);
    expect(tablet).toContain('.analytics-chart-frame');
    expect(tablet).toMatch(/height\s*:\s*14\.375rem/);
    expect(tablet).toContain('.analytics-trend-toolbar');
    expect(compactDesktop).toContain('.overview-payment-detail-grid');
    expect(compactDesktop).toContain('.analytics-trends-breakdown-grid');
    expect(wide).toContain('.analytics-trends-breakdown-grid');
    expect(wide).toContain('.overview-payment-detail-grid');
    expect(cssRuleBody(css, '.page')).toMatch(/width\s*:\s*min\(1480px,\s*100%\)/);
  });

  test('keeps chart controls keyboard-visible and disables analytics motion on request', () => {
    const css = read('admin/v2/styles/admin.css');
    const reducedMotion = cssMediaSection(css, '(prefers-reduced-motion: reduce)');

    expect(cssRuleBody(css, '.admin-chart__canvas:focus-visible')).toMatch(/outline\s*:/);
    expect(cssRuleBody(css, '.admin-chart__legend-button')).toMatch(/min-height\s*:\s*44px/);
    expect(cssRuleBody(css, '.analytics-trends-series-toggles .button.small')).toMatch(/min-height\s*:\s*44px/);
    expect(cssRuleBody(css, '.analytics-filter-group input')).toMatch(/min-width\s*:\s*0/);
    expect(cssRuleBody(css, '.table-scroll')).toMatch(/overflow-x\s*:\s*auto/);
    expect(cssRuleBody(css, '.admin-chart__table-details')).toMatch(/overflow-x\s*:\s*auto/);
    expect(reducedMotion).toContain('.overview-payment-skeleton');
    expect(reducedMotion).toContain('.admin-chart');
    expect(reducedMotion).toMatch(/animation\s*:\s*none/);
    expect(reducedMotion).toMatch(/transition\s*:\s*none/);
  });
});
