import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const REPO_ROOT = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'asset-hygiene-safe.mjs');
const fixtures: string[] = [];

sharp.cache(false);

type Report = {
  schemaVersion: number;
  script: { name: string; version: string; sha256: string };
  startState: {
    head: string;
    gitStatusSha256: string;
    trackedPathsSha256: string;
    sourceFilesSha256: string;
    referenceMapSha256: string;
    assetInventorySha256: string;
  };
  protectedRuntimeAssets: string[];
  sourceValidation: { boundaryChecks: number; referenceMapComputations: number };
  recoveryArtifacts: string[];
  root: string;
  mode: 'audit' | 'delete' | 'compress';
  dryRun: boolean;
  audit: {
    scanned: number;
    used: string[];
    unused: string[];
    deletable: string[];
    bytes: number;
  };
  compression: {
    candidates: {
      path: string;
      outputPath: string;
      before: number;
      after: number;
      resized: boolean;
      converted: boolean;
    }[];
  };
  skipped: {
    dirty: string[];
    untracked: string[];
    excluded: string[];
    configPng: string[];
    unsafeReference: string[];
  };
  deleted: string[];
  compressed: string[];
  converted: { from: string; to: string; references: string[] }[];
  failed: { path: string; reason: string }[];
  backups: { path: string; bytes: number; sourceSha256: string; backupSha256: string; reused: boolean }[];
  recoveryRequired: boolean;
};

function makeFixture(): string {
  const root = mkdtempSync(path.join(tmpdir(), 'phraseman-asset-hygiene-'));
  fixtures.push(root);
  mkdirSync(path.join(root, 'app'), { recursive: true });
  mkdirSync(path.join(root, 'assets', 'images'), { recursive: true });
  writeFileSync(path.join(root, 'app.json'), JSON.stringify({ expo: {} }, null, 2));
  writeFileSync(path.join(root, 'app.config.js'), 'module.exports = {}\n');
  writeFileSync(path.join(root, 'eas.json'), '{}\n');
  writeFileSync(path.join(root, 'package.json'), '{}\n');
  git(root, ['init']);
  git(root, ['config', 'user.email', 'asset-hygiene@example.invalid']);
  git(root, ['config', 'user.name', 'Asset Hygiene Test']);
  mkdirSync(path.join(root, '.git', 'disabled-hooks'), { recursive: true });
  git(root, ['config', 'core.hooksPath', '.git/disabled-hooks']);
  return root;
}

function git(root: string, args: string[]): void {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || `git ${args.join(' ')} failed`);
  }
}

function commitAll(root: string): void {
  git(root, ['add', '.']);
  git(root, ['commit', '-m', 'fixture']);
}

function writeAsset(root: string, relativePath: string, body = 'fixture'): void {
  const absolute = path.join(root, ...relativePath.split('/'));
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, body);
}

function run(
  root: string,
  args: string[] = [],
  environment: Record<string, string | undefined> = {},
  preloadPath?: string,
): { status: number | null; report?: Report; stderr: string } {
  const nodeArguments = preloadPath ? ['--require', preloadPath, SCRIPT] : [SCRIPT];
  const result = spawnSync(process.execPath, [...nodeArguments, '--root', root, '--json', ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: { ...process.env, ...environment },
  });
  let report: Report | undefined;
  if (result.stdout.trim()) {
    report = JSON.parse(result.stdout) as Report;
  }
  return { status: result.status, report, stderr: result.stderr };
}

function noisyPixels(width: number, height: number): Buffer {
  const pixels = Buffer.alloc(width * height * 4);
  let value = 0x12345678;
  for (let index = 0; index < pixels.length; index += 4) {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    pixels[index] = value & 0xff;
    pixels[index + 1] = (value >>> 8) & 0xff;
    pixels[index + 2] = (value >>> 16) & 0xff;
    pixels[index + 3] = 255;
  }
  return pixels;
}

async function writeImage(
  root: string,
  relativePath: string,
  width: number,
  height: number,
  format: 'png' | 'webp' | 'jpeg',
): Promise<void> {
  const absolute = path.join(root, ...relativePath.split('/'));
  mkdirSync(path.dirname(absolute), { recursive: true });
  let pipeline = sharp(noisyPixels(width, height), { raw: { width, height, channels: 4 } });
  if (format === 'png') pipeline = pipeline.png({ compressionLevel: 1 });
  if (format === 'jpeg') pipeline = pipeline.jpeg({ quality: 100 });
  if (format === 'webp') pipeline = pipeline.webp({ quality: 100, alphaQuality: 100 });
  await pipeline.toFile(absolute);
}

async function makeConversionFixture(): Promise<{ root: string; sourcePath: string; backup: string }> {
  const root = makeFixture();
  await writeImage(root, 'assets/images/runtime/convert.png', 640, 480, 'png');
  const sourcePath = path.join(root, 'app', 'assets.ts');
  writeFileSync(sourcePath, "export const asset = require('../assets/images/runtime/convert.png');\n");
  commitAll(root);
  return { root, sourcePath, backup: path.join(root, '.codex-tmp', 'backup') };
}

function writePreload(root: string, name: string, lines: string[]): string {
  const preload = path.join(root, '.codex-tmp', name);
  mkdirSync(path.dirname(preload), { recursive: true });
  writeFileSync(preload, [...lines, "require('node:module').syncBuiltinESMExports();", ''].join('\n'));
  return preload;
}

afterEach(() => {
  for (const root of fixtures.splice(0)) {
    rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

describe('safe runtime asset hygiene CLI', () => {
  test('reports versioned start-state fingerprints and protected-set parity with the Android runtime contract', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/flow_clean_202607/source_tiktok.webp');
    commitAll(root);

    const result = run(root);
    const contract = readFileSync(path.join(REPO_ROOT, 'tests', 'android_bundle_hygiene_contract.test.ts'), 'utf8');
    const block = contract.match(/const RUNTIME_PNGS = \[([\s\S]*?)\] as const;/)?.[1] ?? '';
    const expectedProtected = [...block.matchAll(/'([^']+\.png)'/g)]
      .map(match => match[1].replace(/\.png$/, '.webp'))
      .sort();

    expect(result.status).toBe(0);
    expect(result.report?.schemaVersion).toBeGreaterThanOrEqual(2);
    expect(result.report?.script).toMatchObject({ name: 'asset-hygiene-safe' });
    expect(result.report?.script.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(result.report?.script.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.report?.startState.head).toMatch(/^[a-f0-9]{40}$/);
    for (const fingerprint of [
      result.report?.startState.gitStatusSha256,
      result.report?.startState.trackedPathsSha256,
      result.report?.startState.sourceFilesSha256,
      result.report?.startState.referenceMapSha256,
      result.report?.startState.assetInventorySha256,
    ]) expect(fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.report?.protectedRuntimeAssets).toEqual(expectedProtected);
  });

  test('audits canonical roots and formats using exact path or filename references', async () => {
    const root = makeFixture();
    await writeImage(root, 'assets/images/used/path.webp', 32, 32, 'webp');
    await writeImage(root, 'assets/images/used/by-name.png', 32, 32, 'png');
    writeAsset(root, 'assets/images/unused/extensionless.jpg');
    writeAsset(root, 'assets/images/unused/vector.svg', '<svg/>');
    writeAsset(root, 'assets/images/unused/photo.avif');
    writeAsset(root, 'assets/images/unused/dirty.gif');
    writeAsset(root, 'assets/images/raw/source.png');
    writeAsset(root, 'assets/images/dalli_sources/history.webp');
    writeAsset(root, 'assets/images/output/render.jpeg');
    writeFileSync(
      path.join(root, 'app', 'assets.ts'),
      [
        "export const pathAsset = require('../assets/images/used/path.webp');",
        "export const byName = 'by-name.png';",
        "export const notAReference = 'extensionless';",
      ].join('\n'),
    );
    mkdirSync(path.join(root, 'plugins'), { recursive: true });
    writeFileSync(
      path.join(root, 'plugins', 'not-runtime.js'),
      "module.exports = require('../assets/images/unused/vector.svg');\n",
    );
    commitAll(root);
    writeFileSync(path.join(root, 'assets', 'images', 'unused', 'dirty.gif'), 'dirty');
    writeAsset(root, 'assets/images/unused/untracked.jpeg');

    const reportPath = path.join(root, '.codex-tmp', 'audit.json');
    const result = run(root, ['--report', reportPath]);

    expect(result.status).toBe(0);
    expect(result.report?.audit.used).toEqual(expect.arrayContaining([
      'assets/images/used/path.webp',
      'assets/images/used/by-name.png',
    ]));
    expect(result.report?.audit.unused).toEqual(expect.arrayContaining([
      'assets/images/unused/extensionless.jpg',
      'assets/images/unused/vector.svg',
      'assets/images/unused/photo.avif',
      'assets/images/unused/dirty.gif',
      'assets/images/unused/untracked.jpeg',
    ]));
    expect(result.report?.skipped.excluded).toEqual(expect.arrayContaining([
      'assets/images/raw/source.png',
      'assets/images/dalli_sources/history.webp',
      'assets/images/output/render.jpeg',
    ]));
    expect(result.report?.skipped.dirty).toContain('assets/images/unused/dirty.gif');
    expect(result.report?.skipped.untracked).toContain('assets/images/unused/untracked.jpeg');
    expect(JSON.parse(readFileSync(reportPath, 'utf8'))).toEqual(result.report);
  }, 30_000);

  test('requires an explicit absolute backup directory for destructive modes', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/unused.webp');
    commitAll(root);

    const noBackup = run(root, ['--delete']);
    const relativeBackup = run(root, ['--write', '--backup-dir', 'relative-backup']);

    expect(noBackup.status).not.toBe(0);
    expect(noBackup.stderr).toContain('--backup-dir');
    expect(relativeBackup.status).not.toBe(0);
    expect(relativeBackup.stderr).toContain('absolute');
    expect(existsSync(path.join(root, 'assets', 'images', 'unused.webp'))).toBe(true);
  });

  test('reports an asset that disappears after directory enumeration without mutating anything', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/race.webp', 'transient');
    commitAll(root);
    const preload = path.join(root, '.codex-tmp', 'remove-during-stat.cjs');
    mkdirSync(path.dirname(preload), { recursive: true });
    writeFileSync(preload, [
      "const fs = require('node:fs');",
      'const original = fs.statSync;',
      'fs.statSync = function(target, ...args) {',
      "  if (String(target).replace(/\\\\/g, '/').endsWith('/assets/images/race.webp')) {",
      '    fs.rmSync(target, { force: true });',
      '  }',
      '  return original.call(this, target, ...args);',
      '};',
      "require('node:module').syncBuiltinESMExports();",
      '',
    ].join('\n'));

    const result = run(root, [], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.failed).toEqual([
      { path: 'assets/images/race.webp', reason: 'asset disappeared during scan' },
    ]);
    expect(result.report?.deleted).toEqual([]);
    expect(result.report?.compressed).toEqual([]);
    expect(result.report?.converted).toEqual([]);
  });

  test('aborts delete before the first mutation when scan preflight has a failure', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/a-clean.webp', 'clean');
    writeAsset(root, 'assets/images/race.webp', 'transient');
    commitAll(root);
    const preload = path.join(root, '.codex-tmp', 'remove-during-delete-stat.cjs');
    mkdirSync(path.dirname(preload), { recursive: true });
    writeFileSync(preload, [
      "const fs = require('node:fs');",
      'const original = fs.statSync;',
      'fs.statSync = function(target, ...args) {',
      "  if (String(target).replace(/\\\\/g, '/').endsWith('/assets/images/race.webp')) {",
      '    fs.rmSync(target, { force: true });',
      '  }',
      '  return original.call(this, target, ...args);',
      '};',
      "require('node:module').syncBuiltinESMExports();",
      '',
    ].join('\n'));
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--delete', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.deleted).toEqual([]);
    expect(readFileSync(path.join(root, 'assets', 'images', 'a-clean.webp'), 'utf8')).toBe('clean');
    expect(existsSync(path.join(backup, 'assets', 'images', 'a-clean.webp'))).toBe(false);
  });

  test('backs up and deletes only clean unused assets while preserving dirty and untracked files', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/unused/clean.webp', 'clean');
    writeAsset(root, 'assets/images/unused/dirty.webp', 'original');
    commitAll(root);
    writeFileSync(path.join(root, 'assets', 'images', 'unused', 'dirty.webp'), 'changed');
    writeAsset(root, 'assets/images/unused/untracked.webp', 'untracked');
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--delete', '--backup-dir', backup]);

    expect(result.status).toBe(0);
    expect(result.report?.deleted).toEqual(['assets/images/unused/clean.webp']);
    expect(result.report?.backups).toEqual([
      expect.objectContaining({
        path: 'assets/images/unused/clean.webp',
        bytes: 5,
        sourceSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
        backupSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    ]);
    expect(result.report?.backups[0].sourceSha256).toBe(result.report?.backups[0].backupSha256);
    expect(existsSync(path.join(root, 'assets', 'images', 'unused', 'clean.webp'))).toBe(false);
    expect(readFileSync(path.join(backup, 'assets', 'images', 'unused', 'clean.webp'), 'utf8')).toBe('clean');
    expect(readFileSync(path.join(root, 'assets', 'images', 'unused', 'dirty.webp'), 'utf8')).toBe('changed');
    expect(readFileSync(path.join(root, 'assets', 'images', 'unused', 'untracked.webp'), 'utf8')).toBe('untracked');
  });

  test('aborts before mutation when an existing backup does not match its exact source snapshot', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/a-clean.webp', 'clean');
    writeAsset(root, 'assets/images/z-stale.webp', 'current-source');
    commitAll(root);
    const backup = path.join(root, '.codex-tmp', 'backup');
    writeAsset(backup, 'assets/images/z-stale.webp', 'stale-backup');

    const result = run(root, ['--delete', '--backup-dir', backup]);

    expect(result.status).not.toBe(0);
    expect(result.report?.deleted).toEqual([]);
    expect(result.report?.failed).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'assets/images/z-stale.webp' }),
    ]));
    expect(readFileSync(path.join(root, 'assets', 'images', 'a-clean.webp'), 'utf8')).toBe('clean');
    expect(readFileSync(path.join(root, 'assets', 'images', 'z-stale.webp'), 'utf8')).toBe('current-source');
    expect(readFileSync(path.join(backup, 'assets', 'images', 'z-stale.webp'), 'utf8')).toBe('stale-backup');
  });

  test('aborts compression before the first mutation when metadata preflight fails', async () => {
    const root = makeFixture();
    await writeImage(root, 'assets/images/runtime/a-valid.webp', 640, 480, 'webp');
    writeAsset(root, 'assets/images/runtime/z-corrupt.webp', 'not-an-image');
    writeFileSync(path.join(root, 'app', 'assets.ts'), [
      "export const valid = require('../assets/images/runtime/a-valid.webp');",
      "export const corrupt = require('../assets/images/runtime/z-corrupt.webp');",
    ].join('\n'));
    commitAll(root);
    const validPath = path.join(root, 'assets', 'images', 'runtime', 'a-valid.webp');
    const before = readFileSync(validPath);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--write', '--backup-dir', backup]);

    expect(result.status).not.toBe(0);
    expect(result.report?.failed).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'assets/images/runtime/z-corrupt.webp' }),
    ]));
    expect(result.report?.compressed).toEqual([]);
    expect(result.report?.converted).toEqual([]);
    expect(readFileSync(validPath)).toEqual(before);
    expect(result.report?.backups).toEqual([]);
  }, 30_000);

  test('fails preflight on quarantine and owned partial crash artifacts before mutation', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/runtime/victim.webp', 'victim');
    writeAsset(root, 'assets/images/runtime/.victim.webp.asset-hygiene-123.quarantine', 'quarantine');
    writeAsset(root, 'assets/images/runtime/.owned.asset-hygiene-456.partial', 'partial');
    commitAll(root);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--delete', '--backup-dir', backup]);

    expect(result.status).not.toBe(0);
    expect(result.report?.recoveryRequired).toBe(true);
    expect(result.report?.recoveryArtifacts).toEqual([
      'assets/images/runtime/.owned.asset-hygiene-456.partial',
      'assets/images/runtime/.victim.webp.asset-hygiene-123.quarantine',
    ]);
    expect(result.report?.deleted).toEqual([]);
    expect(result.report?.backups).toEqual([]);
    expect(readFileSync(path.join(root, 'assets', 'images', 'runtime', 'victim.webp'), 'utf8')).toBe('victim');
  });

  test('fails preflight on canonical source and root config recovery artifacts', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/runtime/victim.webp', 'victim');
    writeFileSync(path.join(root, 'app', '.assets.ts.asset-hygiene-111.quarantine'), 'source quarantine');
    writeFileSync(path.join(root, '.app.json.asset-hygiene-222.quarantine'), 'config quarantine');
    writeFileSync(path.join(root, '.package.json.asset-hygiene-333.partial'), 'config partial');
    commitAll(root);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--delete', '--backup-dir', backup]);

    expect(result.status).not.toBe(0);
    expect(result.report?.recoveryRequired).toBe(true);
    expect(result.report?.recoveryArtifacts).toEqual([
      '.app.json.asset-hygiene-222.quarantine',
      '.package.json.asset-hygiene-333.partial',
      'app/.assets.ts.asset-hygiene-111.quarantine',
    ]);
    expect(result.report?.deleted).toEqual([]);
    expect(result.report?.backups).toEqual([]);
    expect(readFileSync(path.join(root, 'assets', 'images', 'runtime', 'victim.webp'), 'utf8')).toBe('victim');
  });

  test('treats an ignored untracked asset as untracked and never deletes it', () => {
    const root = makeFixture();
    writeFileSync(path.join(root, '.gitignore'), 'assets/images/ignored.webp\n');
    commitAll(root);
    writeAsset(root, 'assets/images/ignored.webp', 'ignored-untracked');
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--delete', '--backup-dir', backup]);

    expect(result.status).toBe(0);
    expect(result.report?.deleted).toEqual([]);
    expect(result.report?.skipped.untracked).toContain('assets/images/ignored.webp');
    expect(readFileSync(path.join(root, 'assets', 'images', 'ignored.webp'), 'utf8')).toBe('ignored-untracked');
  });

  test('rechecks Git state and preserves a clean asset that becomes dirty during the scan', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/race.webp', 'original');
    commitAll(root);
    const preload = path.join(root, '.codex-tmp', 'dirty-during-stat.cjs');
    mkdirSync(path.dirname(preload), { recursive: true });
    writeFileSync(preload, [
      "const fs = require('node:fs');",
      'const original = fs.statSync;',
      'let changed = false;',
      'fs.statSync = function(target, ...args) {',
      "  if (!changed && String(target).replace(/\\\\/g, '/').endsWith('/assets/images/race.webp')) {",
      "    fs.appendFileSync(target, '-changed');",
      '    changed = true;',
      '  }',
      '  return original.call(this, target, ...args);',
      '};',
      "require('node:module').syncBuiltinESMExports();",
      '',
    ].join('\n'));
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--delete', '--backup-dir', backup], {}, preload);

    expect(result.status).toBe(0);
    expect(result.report?.deleted).toEqual([]);
    expect(result.report?.skipped.dirty).toContain('assets/images/race.webp');
    expect(readFileSync(path.join(root, 'assets', 'images', 'race.webp'), 'utf8')).toBe('original-changed');
    expect(existsSync(path.join(backup, 'assets', 'images', 'race.webp'))).toBe(false);
  });

  test('aborts delete when a brand-new canonical source adds a reference after preflight', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/runtime/race.webp', 'asset');
    commitAll(root);
    const newSource = path.join(root, 'app', 'late-reference.ts');
    const preload = writePreload(root, 'delete-new-source-race.cjs', [
      "const fs = require('node:fs');",
      'const originalCopy = fs.copyFileSync;',
      'let injected = false;',
      'fs.copyFileSync = function(source, destination, ...args) {',
      '  const result = originalCopy.call(this, source, destination, ...args);',
      '  if (!injected) {',
      `    fs.writeFileSync(${JSON.stringify(newSource)}, "export const late = require('../assets/images/runtime/race.webp');\\n");`,
      '    injected = true;',
      '  }',
      '  return result;',
      '};',
    ]);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--delete', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.deleted).toEqual([]);
    expect(result.report?.failed[0].reason).toContain('source inventory changed after preflight');
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'race.webp'))).toBe(true);
    expect(readFileSync(newSource, 'utf8')).toContain('race.webp');
  });

  test('aborts delete when an unrelated canonical source gains a reference after preflight', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/runtime/race.webp', 'asset');
    const existingSource = path.join(root, 'app', 'unrelated.ts');
    writeFileSync(existingSource, "export const unrelated = 'before';\n");
    commitAll(root);
    const preload = writePreload(root, 'delete-existing-source-race.cjs', [
      "const fs = require('node:fs');",
      'const originalCopy = fs.copyFileSync;',
      'let injected = false;',
      'fs.copyFileSync = function(source, destination, ...args) {',
      '  const result = originalCopy.call(this, source, destination, ...args);',
      '  if (!injected) {',
      `    fs.writeFileSync(${JSON.stringify(existingSource)}, "export const late = require('../assets/images/runtime/race.webp');\\n");`,
      '    injected = true;',
      '  }',
      '  return result;',
      '};',
    ]);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--delete', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.deleted).toEqual([]);
    expect(result.report?.failed[0].reason).toContain('source inventory changed after preflight');
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'race.webp'))).toBe(true);
    expect(readFileSync(existingSource, 'utf8')).toContain('race.webp');
  });

  test('quarantines and restores a delete target changed at the final path-operation window', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/runtime/race.webp', 'original');
    commitAll(root);
    const assetPath = path.join(root, 'assets', 'images', 'runtime', 'race.webp');
    const preload = writePreload(root, 'delete-final-path-race.cjs', [
      "const fs = require('node:fs');",
      'const originalRename = fs.renameSync;',
      'const originalUnlink = fs.unlinkSync;',
      'let injected = false;',
      'function inject(target) {',
      `  if (!injected && String(target) === ${JSON.stringify(assetPath)}) { fs.appendFileSync(target, '-concurrent'); injected = true; }`,
      '}',
      'fs.renameSync = function(from, to) { inject(from); return originalRename.call(this, from, to); };',
      'fs.unlinkSync = function(target) { inject(target); return originalUnlink.call(this, target); };',
    ]);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--delete', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.deleted).toEqual([]);
    expect(readFileSync(assetPath, 'utf8')).toBe('original-concurrent');
  });

  test('never replaces a destination that appears immediately before quarantine restoration', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/runtime/race.webp', 'original');
    commitAll(root);
    const assetPath = path.join(root, 'assets', 'images', 'runtime', 'race.webp');
    const preload = writePreload(root, 'restore-destination-race.cjs', [
      "const fs = require('node:fs');",
      'const originalRename = fs.renameSync;',
      'const originalLink = fs.linkSync;',
      'let changed = false;',
      'let destinationCreated = false;',
      'fs.renameSync = function(from, to) {',
      `  if (!changed && String(from) === ${JSON.stringify(assetPath)}) { fs.appendFileSync(from, '-changed'); changed = true; }`,
      '  return originalRename.call(this, from, to);',
      '};',
      'fs.linkSync = function(existing, destination) {',
      `  if (!destinationCreated && String(destination) === ${JSON.stringify(assetPath)}) { fs.writeFileSync(destination, 'concurrent-destination'); destinationCreated = true; }`,
      '  return originalLink.call(this, existing, destination);',
      '};',
    ]);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--delete', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.recoveryRequired).toBe(true);
    expect(readFileSync(assetPath, 'utf8')).toBe('concurrent-destination');
    expect(readdirSync(path.dirname(assetPath)).filter(name => name.endsWith('.quarantine'))).toHaveLength(1);
    expect(result.report?.deleted).toEqual([]);
  });

  test('does not run compression analysis after deleting an unused bundled asset', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/unused/bundled.webp', 'unused-bundled');
    writeFileSync(path.join(root, 'app.json'), JSON.stringify({
      expo: {
        updates: {
          assetPatternsToBeBundled: ['assets/images/unused/*.webp'],
        },
      },
    }, null, 2));
    commitAll(root);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--delete', '--backup-dir', backup]);

    expect(result.status).toBe(0);
    expect(result.report?.deleted).toEqual(['assets/images/unused/bundled.webp']);
    expect(result.report?.compression.candidates).toEqual([]);
    expect(result.report?.failed).toEqual([]);
  });

  test('preserves explicit runtime-contract artwork even when it has no static source reference', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/flow_clean_202607/minutes_5.webp', 'runtime-contract');
    commitAll(root);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--delete', '--backup-dir', backup]);

    expect(result.status).toBe(0);
    expect(result.report?.deleted).toEqual([]);
    expect(result.report?.audit.used).toContain('assets/images/flow_clean_202607/minutes_5.webp');
    expect(readFileSync(path.join(root, 'assets', 'images', 'flow_clean_202607', 'minutes_5.webp'), 'utf8'))
      .toBe('runtime-contract');
  });

  test('checks protected assets before directory exclusions and audits legitimate source/history filenames', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/flow_clean_202607/source_tiktok.webp');
    writeAsset(root, 'assets/images/runtime/history-badge.webp');
    writeAsset(root, 'assets/images/runtime/source-guide.webp');
    writeAsset(root, 'assets/images/source/raw-input.webp');
    writeAsset(root, 'assets/images/history/old-input.webp');
    commitAll(root);

    const result = run(root);

    expect(result.status).toBe(0);
    expect(result.report?.audit.used).toContain('assets/images/flow_clean_202607/source_tiktok.webp');
    expect(result.report?.audit.unused).toEqual(expect.arrayContaining([
      'assets/images/runtime/history-badge.webp',
      'assets/images/runtime/source-guide.webp',
    ]));
    expect(result.report?.skipped.excluded).toEqual(expect.arrayContaining([
      'assets/images/source/raw-input.webp',
      'assets/images/history/old-input.webp',
    ]));
    expect(result.report?.skipped.excluded).not.toContain('assets/images/flow_clean_202607/source_tiktok.webp');
  });

  test('excludes source-family directories and exact source suffixes without hiding legitimate runtime names', () => {
    const root = makeFixture();
    writeAsset(root, 'assets/images/header_glyphs/vector_sources_3d_aligned_20260605/glyph.svg', '<svg/>');
    writeAsset(root, 'assets/images/header_glyphs/vector_sources_outline_v1/outline.svg', '<svg/>');
    writeAsset(root, 'assets/images/league/league_crown_source.webp');
    writeAsset(root, 'assets/images/streak_overlays/streak-freeze-ice-source.png');
    writeAsset(root, 'assets/images/flow_clean_202607/source_tiktok.webp');
    writeAsset(root, 'assets/images/runtime/source-guide.webp');
    writeAsset(root, 'assets/images/runtime/resourceful-badge.webp');
    writeAsset(root, 'assets/images/runtime/history-book.webp');
    commitAll(root);

    const result = run(root);

    expect(result.status).toBe(0);
    expect(result.report?.skipped.excluded).toEqual(expect.arrayContaining([
      'assets/images/header_glyphs/vector_sources_3d_aligned_20260605/glyph.svg',
      'assets/images/header_glyphs/vector_sources_outline_v1/outline.svg',
      'assets/images/league/league_crown_source.webp',
      'assets/images/streak_overlays/streak-freeze-ice-source.png',
    ]));
    expect(result.report?.audit.used).toContain('assets/images/flow_clean_202607/source_tiktok.webp');
    expect(result.report?.skipped.excluded).not.toContain('assets/images/flow_clean_202607/source_tiktok.webp');
    expect(result.report?.audit.unused).toEqual(expect.arrayContaining([
      'assets/images/runtime/source-guide.webp',
      'assets/images/runtime/resourceful-badge.webp',
      'assets/images/runtime/history-book.webp',
    ]));
  });

  test('re-encodes a clean WebP without treating its untouched dirty source reference as a blocker', async () => {
    const root = makeFixture();
    await writeImage(root, 'assets/images/runtime/clean.webp', 640, 480, 'webp');
    const sourcePath = path.join(root, 'app', 'assets.ts');
    writeFileSync(sourcePath, "export const clean = require('../assets/images/runtime/clean.webp');\n");
    commitAll(root);
    writeFileSync(sourcePath, [
      "export const clean = require('../assets/images/runtime/clean.webp');",
      "export const concurrentUserEdit = 'preserve me';",
      '',
    ].join('\n'));
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--write', '--backup-dir', backup]);

    expect(result.status).toBe(0);
    expect(result.report?.compressed).toEqual(['assets/images/runtime/clean.webp']);
    expect(readFileSync(sourcePath, 'utf8')).toContain("concurrentUserEdit = 'preserve me'");
    expect(existsSync(path.join(backup, 'assets', 'images', 'runtime', 'clean.webp'))).toBe(true);
    expect(existsSync(path.join(backup, 'app', 'assets.ts'))).toBe(false);
  }, 30_000);

  test('restores a WebP changed at its final recompression replacement window', async () => {
    const root = makeFixture();
    await writeImage(root, 'assets/images/runtime/race.webp', 640, 480, 'webp');
    writeFileSync(path.join(root, 'app', 'assets.ts'), "export const race = require('../assets/images/runtime/race.webp');\n");
    commitAll(root);
    const assetPath = path.join(root, 'assets', 'images', 'runtime', 'race.webp');
    const before = readFileSync(assetPath);
    const preload = writePreload(root, 'webp-final-path-race.cjs', [
      "const fs = require('node:fs');",
      'const originalRename = fs.renameSync;',
      'let injected = false;',
      'fs.renameSync = function(from, to) {',
      `  if (!injected && (String(from) === ${JSON.stringify(assetPath)} || String(to) === ${JSON.stringify(assetPath)})) {`,
      `    fs.appendFileSync(${JSON.stringify(assetPath)}, Buffer.from('concurrent'));`,
      '    injected = true;',
      '  }',
      '  return originalRename.call(this, from, to);',
      '};',
    ]);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.compressed).toEqual([]);
    expect(readFileSync(assetPath)).toEqual(Buffer.concat([before, Buffer.from('concurrent')]));
  }, 30_000);

  test('patches only the matched backslash asset literal and preserves raw regex and string text', async () => {
    const root = makeFixture();
    await writeImage(root, 'assets/images/runtime/convert.png', 640, 480, 'png');
    const sourcePath = path.join(root, 'app', 'windowsAsset.ts');
    const before = [
      'export const asset = String.raw`..\\assets\\images\\runtime\\convert.png`;',
      'export const pathPattern = /assets\\\\images\\\\runtime\\\\convert\\.png/;',
      "export const escapedText = 'keep\\\\n-and-\\\\t-verbatim';",
      '',
    ].join('\r\n');
    writeFileSync(sourcePath, before);
    commitAll(root);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--write', '--backup-dir', backup]);

    expect(result.status).toBe(0);
    expect(result.report?.converted).toEqual([
      {
        from: 'assets/images/runtime/convert.png',
        to: 'assets/images/runtime/convert.webp',
        references: ['app/windowsAsset.ts'],
      },
    ]);
    const after = readFileSync(sourcePath, 'utf8');
    expect(after).toContain('String.raw`..\\assets\\images\\runtime\\convert.webp`');
    expect(after).toContain('/assets\\\\images\\\\runtime\\\\convert\\.png/');
    expect(after).toContain("'keep\\\\n-and-\\\\t-verbatim'");
    expect(after.split('\r\n')).toHaveLength(before.split('\r\n').length);
  }, 30_000);

  test('aborts conversion when a source reference changes after preflight and preserves the concurrent edit', async () => {
    const root = makeFixture();
    await writeImage(root, 'assets/images/runtime/convert.png', 640, 480, 'png');
    const sourcePath = path.join(root, 'app', 'assets.ts');
    writeFileSync(sourcePath, "export const asset = require('../assets/images/runtime/convert.png');\n");
    commitAll(root);
    const preload = path.join(root, '.codex-tmp', 'source-race.cjs');
    mkdirSync(path.dirname(preload), { recursive: true });
    writeFileSync(preload, [
      "const fs = require('node:fs');",
      'const originalOpen = fs.openSync;',
      'const originalWrite = fs.writeFileSync;',
      'let injected = false;',
      'fs.openSync = function(target, flags, ...args) {',
      '  const result = originalOpen.call(this, target, flags, ...args);',
      "  if (!injected && flags === 'wx' && String(target).replace(/\\\\/g, '/').endsWith('/assets/images/runtime/convert.webp')) {",
      `    originalWrite.call(this, ${JSON.stringify(sourcePath)}, "export const asset = require('../assets/images/runtime/convert.png');\\nexport const concurrent = 'preserve';\\n");`,
      '    injected = true;',
      '  }',
      '  return result;',
      '};',
      "require('node:module').syncBuiltinESMExports();",
      '',
    ].join('\n'));
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.converted).toEqual([]);
    expect(readFileSync(sourcePath, 'utf8')).toContain("concurrent = 'preserve'");
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.png'))).toBe(true);
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.webp'))).toBe(false);
  }, 30_000);

  test('aborts conversion when a brand-new canonical source adds a reference after preflight', async () => {
    const { root, sourcePath, backup } = await makeConversionFixture();
    const newSource = path.join(root, 'components', 'late-reference.tsx');
    mkdirSync(path.dirname(newSource), { recursive: true });
    const preload = writePreload(root, 'convert-new-source-race.cjs', [
      "const fs = require('node:fs');",
      'const originalCopy = fs.copyFileSync;',
      'let injected = false;',
      'fs.copyFileSync = function(source, destination, ...args) {',
      '  const result = originalCopy.call(this, source, destination, ...args);',
      '  if (!injected) {',
      `    fs.writeFileSync(${JSON.stringify(newSource)}, "export const late = require('../assets/images/runtime/convert.png');\\n");`,
      '    injected = true;',
      '  }',
      '  return result;',
      '};',
    ]);

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.converted).toEqual([]);
    expect(result.report?.failed[0].reason).toContain('source inventory changed after preflight');
    expect(readFileSync(sourcePath, 'utf8')).toContain('convert.png');
    expect(readFileSync(newSource, 'utf8')).toContain('convert.png');
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.png'))).toBe(true);
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.webp'))).toBe(false);
  }, 30_000);

  test('aborts conversion when an unrelated canonical source gains a reference after preflight', async () => {
    const { root, sourcePath, backup } = await makeConversionFixture();
    const unrelatedSource = path.join(root, 'app', 'unrelated.ts');
    writeFileSync(unrelatedSource, "export const unrelated = 'before';\n");
    git(root, ['add', 'app/unrelated.ts']);
    git(root, ['commit', '-m', 'unrelated source']);
    const preload = writePreload(root, 'convert-existing-source-race.cjs', [
      "const fs = require('node:fs');",
      'const originalCopy = fs.copyFileSync;',
      'let injected = false;',
      'fs.copyFileSync = function(source, destination, ...args) {',
      '  const result = originalCopy.call(this, source, destination, ...args);',
      '  if (!injected) {',
      `    fs.writeFileSync(${JSON.stringify(unrelatedSource)}, "export const late = require('../assets/images/runtime/convert.png');\\n");`,
      '    injected = true;',
      '  }',
      '  return result;',
      '};',
    ]);

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.converted).toEqual([]);
    expect(result.report?.failed[0].reason).toContain('source inventory changed after preflight');
    expect(readFileSync(sourcePath, 'utf8')).toContain('convert.png');
    expect(readFileSync(unrelatedSource, 'utf8')).toContain('convert.png');
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.png'))).toBe(true);
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.webp'))).toBe(false);
  }, 30_000);

  test('restores a source reference changed at its final replacement window', async () => {
    const { root, sourcePath, backup } = await makeConversionFixture();
    const preload = writePreload(root, 'source-final-path-race.cjs', [
      "const fs = require('node:fs');",
      'const originalRename = fs.renameSync;',
      'let injected = false;',
      'fs.renameSync = function(from, to) {',
      `  if (!injected && (String(from) === ${JSON.stringify(sourcePath)} || String(to) === ${JSON.stringify(sourcePath)})) {`,
      `    fs.appendFileSync(${JSON.stringify(sourcePath)}, "export const finalWindowEdit = 'preserve';\\n");`,
      '    injected = true;',
      '  }',
      '  return originalRename.call(this, from, to);',
      '};',
    ]);

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.converted).toEqual([]);
    expect(readFileSync(sourcePath, 'utf8')).toContain("finalWindowEdit = 'preserve'");
    expect(readFileSync(sourcePath, 'utf8')).toContain('convert.png');
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.webp'))).toBe(false);
  }, 30_000);

  test('restores a converted original changed at its final unlink window', async () => {
    const { root, sourcePath, backup } = await makeConversionFixture();
    const assetPath = path.join(root, 'assets', 'images', 'runtime', 'convert.png');
    const preload = writePreload(root, 'convert-original-final-race.cjs', [
      "const fs = require('node:fs');",
      'const originalRename = fs.renameSync;',
      'const originalUnlink = fs.unlinkSync;',
      'let injected = false;',
      'function inject(target) {',
      `  if (!injected && String(target) === ${JSON.stringify(assetPath)}) { fs.appendFileSync(target, Buffer.from('concurrent')); injected = true; }`,
      '}',
      'fs.renameSync = function(from, to) { inject(from); return originalRename.call(this, from, to); };',
      'fs.unlinkSync = function(target) { inject(target); return originalUnlink.call(this, target); };',
    ]);

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.converted).toEqual([]);
    expect(readFileSync(assetPath).subarray(-10).toString()).toBe('concurrent');
    expect(readFileSync(sourcePath, 'utf8')).toContain('convert.png');
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.webp'))).toBe(false);
  }, 30_000);

  test('aborts conversion when the asset changes inside the commit window', async () => {
    const { root, sourcePath, backup } = await makeConversionFixture();
    const assetPath = path.join(root, 'assets', 'images', 'runtime', 'convert.png');
    const preload = writePreload(root, 'asset-race.cjs', [
      "const fs = require('node:fs');",
      'const originalOpen = fs.openSync;',
      'let injected = false;',
      'fs.openSync = function(target, flags, ...args) {',
      '  const result = originalOpen.call(this, target, flags, ...args);',
      "  if (!injected && flags === 'wx') {",
      `    fs.appendFileSync(${JSON.stringify(assetPath)}, Buffer.from('concurrent'));`,
      '    injected = true;',
      '  }',
      '  return result;',
      '};',
    ]);

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.converted).toEqual([]);
    expect(readFileSync(assetPath).subarray(-10).toString()).toBe('concurrent');
    expect(readFileSync(sourcePath, 'utf8')).toContain('convert.png');
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.webp'))).toBe(false);
  }, 30_000);

  test('uses exclusive target creation and never replaces a concurrently created WebP', async () => {
    const { root, sourcePath, backup } = await makeConversionFixture();
    const targetPath = path.join(root, 'assets', 'images', 'runtime', 'convert.webp');
    const preload = writePreload(root, 'target-race.cjs', [
      "const fs = require('node:fs');",
      'const originalOpen = fs.openSync;',
      'const originalWrite = fs.writeFileSync;',
      'let injected = false;',
      'fs.openSync = function(target, flags, ...args) {',
      "  if (!injected && flags === 'wx') {",
      "    originalWrite.call(this, target, Buffer.from('concurrent-target'));",
      '    injected = true;',
      '  }',
      '  return originalOpen.call(this, target, flags, ...args);',
      '};',
    ]);

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.converted).toEqual([]);
    expect(readFileSync(targetPath, 'utf8')).toBe('concurrent-target');
    expect(readFileSync(sourcePath, 'utf8')).toContain('convert.png');
  }, 30_000);

  test('rolls back target creation when the first source write fails', async () => {
    const { root, sourcePath, backup } = await makeConversionFixture();
    const preload = writePreload(root, 'source-write-fault.cjs', [
      "const fs = require('node:fs');",
      'const originalOpen = fs.openSync;',
      'let injected = false;',
      'fs.openSync = function(target, flags, ...args) {',
      `  if (!injected && String(target) === ${JSON.stringify(sourcePath)} && flags === 'wx') { injected = true; throw new Error('source-write-fault'); }`,
      '  return originalOpen.call(this, target, flags, ...args);',
      '};',
    ]);

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.recoveryRequired).toBe(false);
    expect(readFileSync(sourcePath, 'utf8')).toContain('convert.png');
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.png'))).toBe(true);
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.webp'))).toBe(false);
  }, 30_000);

  test('rolls back source writes and target creation when source unlink fails', async () => {
    const { root, sourcePath, backup } = await makeConversionFixture();
    const assetPath = path.join(root, 'assets', 'images', 'runtime', 'convert.png');
    const preload = writePreload(root, 'source-unlink-fault.cjs', [
      "const fs = require('node:fs');",
      'const originalRename = fs.renameSync;',
      'fs.renameSync = function(from, to) {',
      `  if (String(from) === ${JSON.stringify(assetPath)}) throw new Error('source-unlink-fault');`,
      '  return originalRename.call(this, from, to);',
      '};',
    ]);

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.recoveryRequired).toBe(false);
    expect(readFileSync(sourcePath, 'utf8')).toContain('convert.png');
    expect(existsSync(assetPath)).toBe(true);
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.webp'))).toBe(false);
  }, 30_000);

  test('marks rollback failure as fatal recovery-required state', async () => {
    const { root, sourcePath, backup } = await makeConversionFixture();
    const assetPath = path.join(root, 'assets', 'images', 'runtime', 'convert.png');
    const preload = writePreload(root, 'rollback-fault.cjs', [
      "const fs = require('node:fs');",
      'const originalRename = fs.renameSync;',
      'const originalLink = fs.linkSync;',
      'fs.renameSync = function(from, to) {',
      `  if (String(from) === ${JSON.stringify(assetPath)}) throw new Error('source-unlink-fault');`,
      '  return originalRename.call(this, from, to);',
      '};',
      'fs.linkSync = function(existing, destination) {',
      `  if (String(destination) === ${JSON.stringify(sourcePath)}) throw new Error('rollback-write-fault');`,
      '  return originalLink.call(this, existing, destination);',
      '};',
    ]);

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.recoveryRequired).toBe(true);
    expect(result.report?.failed[0].reason).toContain('recovery-required');
    expect(existsSync(assetPath)).toBe(true);
  }, 30_000);

  test('never overwrites a concurrent source edit during rollback', async () => {
    const { root, sourcePath, backup } = await makeConversionFixture();
    const assetPath = path.join(root, 'assets', 'images', 'runtime', 'convert.png');
    const preload = writePreload(root, 'rollback-source-race.cjs', [
      "const fs = require('node:fs');",
      'const originalRename = fs.renameSync;',
      'const originalWrite = fs.writeFileSync;',
      'fs.renameSync = function(from, to) {',
      `  if (String(from) === ${JSON.stringify(assetPath)}) {`,
      `    originalWrite.call(this, ${JSON.stringify(sourcePath)}, fs.readFileSync(${JSON.stringify(sourcePath)}, 'utf8') + "export const concurrentRollbackEdit = 'preserve';\\n");`,
      "    throw new Error('source-unlink-fault');",
      '  }',
      '  return originalRename.call(this, from, to);',
      '};',
    ]);

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.recoveryRequired).toBe(true);
    expect(result.report?.failed[0].reason).toContain('recovery-required');
    expect(readFileSync(sourcePath, 'utf8')).toContain("concurrentRollbackEdit = 'preserve'");
    expect(existsSync(assetPath)).toBe(true);
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.webp'))).toBe(true);
  }, 30_000);

  test('removes an owned partial conversion target when exclusive fd writing fails', async () => {
    const { root, sourcePath, backup } = await makeConversionFixture();
    const preload = writePreload(root, 'partial-target-write.cjs', [
      "const fs = require('node:fs');",
      'const originalWrite = fs.writeSync;',
      'let injected = false;',
      'fs.writeSync = function(fd, buffer, offset, length, position) {',
      '  if (!injected) {',
      '    injected = true;',
      '    originalWrite.call(this, fd, buffer, offset, Math.min(16, length), position);',
      "    throw new Error('partial-write-fault');",
      '  }',
      '  return originalWrite.call(this, fd, buffer, offset, length, position);',
      '};',
    ]);

    const result = run(root, ['--write', '--backup-dir', backup], {}, preload);

    expect(result.status).not.toBe(0);
    expect(result.report?.converted).toEqual([]);
    expect(result.report?.recoveryRequired).toBe(false);
    expect(readFileSync(sourcePath, 'utf8')).toContain('convert.png');
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.png'))).toBe(true);
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.webp'))).toBe(false);
  }, 30_000);

  test('preserves PNG literals declared by every supported config file', async () => {
    const root = makeFixture();
    const rows = [
      ['app.json', 'config-app-json.png'],
      ['app.config.js', 'config-app-js.png'],
      ['app.config.ts', 'config-app-ts.png'],
      ['eas.json', 'config-eas.png'],
      ['package.json', 'config-package.png'],
    ] as const;
    for (const [, fileName] of rows) {
      await writeImage(root, `assets/images/runtime/${fileName}`, 320, 240, 'png');
    }
    writeFileSync(path.join(root, 'app.json'), JSON.stringify({
      expo: { icon: './assets/images/runtime/config-app-json.png' },
    }));
    writeFileSync(
      path.join(root, 'app.config.js'),
      "module.exports = { image: './assets/images/runtime/config-app-js.png' };\n",
    );
    writeFileSync(
      path.join(root, 'app.config.ts'),
      "export default { image: './assets/images/runtime/config-app-ts.png' };\n",
    );
    writeFileSync(path.join(root, 'eas.json'), JSON.stringify({ image: './assets/images/runtime/config-eas.png' }));
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ image: './assets/images/runtime/config-package.png' }));
    writeFileSync(
      path.join(root, 'app', 'assets.ts'),
      rows.map(([, fileName], index) => (
        `export const asset${index} = require('../assets/images/runtime/${fileName}');`
      )).join('\n'),
    );
    commitAll(root);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--write', '--backup-dir', backup]);

    expect(result.status).toBe(0);
    expect(result.report?.converted).toEqual([]);
    expect(result.report?.skipped.configPng).toEqual(
      rows.map(([, fileName]) => `assets/images/runtime/${fileName}`).sort(),
    );
    for (const [, fileName] of rows) {
      expect(existsSync(path.join(root, 'assets', 'images', 'runtime', fileName))).toBe(true);
      expect(existsSync(path.join(root, 'assets', 'images', 'runtime', fileName.replace(/\.png$/, '.webp'))))
        .toBe(false);
    }
  }, 30_000);

  test('protects an exact config PNG literal containing spaces and delimiters', async () => {
    const root = makeFixture();
    const relative = 'assets/images/runtime/config art (final), v2.png';
    await writeImage(root, relative, 320, 240, 'png');
    writeFileSync(path.join(root, 'app.config.js'), [
      'module.exports = {',
      `  image: './${relative}',`,
      '};',
      '',
    ].join('\n'));
    writeFileSync(
      path.join(root, 'app', 'assets.ts'),
      `export const art = require('../${relative}');\n`,
    );
    commitAll(root);
    const backup = path.join(root, '.codex-tmp', 'backup');

    const result = run(root, ['--write', '--backup-dir', backup]);

    expect(result.status).toBe(0);
    expect(result.report?.skipped.configPng).toContain(relative);
    expect(result.report?.converted).toEqual([]);
    expect(existsSync(path.join(root, ...relative.split('/')))).toBe(true);
    expect(existsSync(path.join(root, ...relative.replace(/\.png$/, '.webp').split('/')))).toBe(false);
  }, 30_000);

  test('compresses only clean runtime images, preserves geometry rules, and atomically converts references', async () => {
    const root = makeFixture();
    await writeImage(root, 'assets/images/runtime/static-large.webp', 800, 600, 'webp');
    await writeImage(root, 'assets/images/bundled/resize.webp', 900, 700, 'webp');
    await writeImage(root, 'assets/images/levels/league-v6-icons/fixed.webp', 700, 700, 'webp');
    await writeImage(root, 'assets/images/runtime/convert.png', 640, 480, 'png');
    await writeImage(root, 'assets/images/icon.png', 512, 512, 'png');
    await writeImage(root, 'assets/images/runtime/dirty.webp', 700, 500, 'webp');
    writeAsset(root, 'assets/images/raw/history.webp', 'raw-history');
    writeFileSync(
      path.join(root, 'app', 'assets.ts'),
      [
        "export const staticLarge = require('../assets/images/runtime/static-large.webp');",
        "export const convert = require('../assets/images/runtime/convert.png');",
        "export const dirty = require('../assets/images/runtime/dirty.webp');",
      ].join('\n'),
    );
    writeFileSync(path.join(root, 'app.json'), JSON.stringify({
      expo: {
        icon: './assets/images/icon.png',
        android: {
          adaptiveIcon: {
            foregroundImage: './assets/images/icon.png',
            monochromeImage: './assets/images/icon.png',
          },
        },
        updates: {
          assetPatternsToBeBundled: [
            'assets/images/bundled/*.webp',
            'assets/images/levels/league-v6-icons/*.webp',
          ],
        },
      },
    }, null, 2));
    commitAll(root);
    const dirtyPath = path.join(root, 'assets', 'images', 'runtime', 'dirty.webp');
    writeFileSync(dirtyPath, Buffer.concat([readFileSync(dirtyPath), Buffer.from('dirty')]));
    await writeImage(root, 'assets/images/runtime/untracked.webp', 700, 500, 'webp');
    const dirtySize = statSync(dirtyPath).size;
    const untrackedSize = statSync(path.join(root, 'assets', 'images', 'runtime', 'untracked.webp')).size;
    const backup = path.join(root, '.codex-tmp', 'backup');

    const dryRun = run(root);

    expect(dryRun.status).toBe(0);
    expect(dryRun.report?.dryRun).toBe(true);
    expect(dryRun.report?.compression.candidates.map(item => item.path)).toEqual(expect.arrayContaining([
      'assets/images/runtime/static-large.webp',
      'assets/images/bundled/resize.webp',
      'assets/images/levels/league-v6-icons/fixed.webp',
      'assets/images/runtime/convert.png',
    ]));
    expect(dryRun.report?.skipped.configPng).toContain('assets/images/icon.png');
    expect(dryRun.report?.skipped.dirty).toContain('assets/images/runtime/dirty.webp');
    expect(dryRun.report?.skipped.untracked).toContain('assets/images/runtime/untracked.webp');

    const write = run(root, ['--write', '--backup-dir', backup]);

    expect(write.status).toBe(0);
    expect(write.report?.sourceValidation.referenceMapComputations).toBe(1);
    expect(write.report?.sourceValidation.boundaryChecks).toBeGreaterThan(0);
    expect(write.report?.compressed).toEqual(expect.arrayContaining([
      'assets/images/runtime/static-large.webp',
      'assets/images/bundled/resize.webp',
      'assets/images/levels/league-v6-icons/fixed.webp',
    ]));
    expect(write.report?.converted).toEqual([
      {
        from: 'assets/images/runtime/convert.png',
        to: 'assets/images/runtime/convert.webp',
        references: ['app/assets.ts'],
      },
    ]);
    expect(await sharp(path.join(root, 'assets', 'images', 'runtime', 'static-large.webp')).metadata())
      .toMatchObject({ width: 800, height: 600 });
    expect(await sharp(path.join(root, 'assets', 'images', 'bundled', 'resize.webp')).metadata())
      .toMatchObject({ width: 512, height: 398 });
    expect(await sharp(path.join(root, 'assets', 'images', 'levels', 'league-v6-icons', 'fixed.webp')).metadata())
      .toMatchObject({ width: 700, height: 700 });
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.png'))).toBe(false);
    expect(existsSync(path.join(root, 'assets', 'images', 'runtime', 'convert.webp'))).toBe(true);
    expect(readFileSync(path.join(root, 'app', 'assets.ts'), 'utf8')).toContain('assets/images/runtime/convert.webp');
    expect(existsSync(path.join(root, 'assets', 'images', 'icon.png'))).toBe(true);
    expect(statSync(dirtyPath).size).toBe(dirtySize);
    expect(statSync(path.join(root, 'assets', 'images', 'runtime', 'untracked.webp')).size).toBe(untrackedSize);
    expect(readFileSync(path.join(root, 'assets', 'images', 'raw', 'history.webp'), 'utf8')).toBe('raw-history');
    for (const relativePath of [
      'assets/images/runtime/static-large.webp',
      'assets/images/bundled/resize.webp',
      'assets/images/levels/league-v6-icons/fixed.webp',
      'assets/images/runtime/convert.png',
      'app/assets.ts',
    ]) {
      expect(existsSync(path.join(backup, ...relativePath.split('/')))).toBe(true);
    }
  }, 30_000);
});
