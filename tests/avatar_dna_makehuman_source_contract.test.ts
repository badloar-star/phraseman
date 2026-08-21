import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const manifestPath = path.resolve(__dirname, '../config/avatar-dna/human_v2_cc0_source.v1.json');
const commit = '1f508f6083b2f823dab15de924b3bde72e08d77c';
const safeRelativePath = (value: unknown): value is string =>
  typeof value === 'string'
  && value.length > 0
  && !path.isAbsolute(value)
  && !value.includes('\\')
  && !value.includes('?')
  && !value.includes('#')
  && value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..' && !segment.includes(':'));

const expectedSource = (destination: string) => (
  destination === 'LICENSE.ASSETS.md' || destination === 'makehuman/data/3dobjs/base.obj'
    ? destination
    : `makehuman/data/targets/${destination}`
);

test('pins the complete, safe MakeHuman CC0 source packet', () => {
  expect(fs.existsSync(manifestPath)).toBe(true);

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    baseUrl?: unknown;
    sourceCommit?: unknown;
    license?: unknown;
    files?: Array<{ source?: unknown; destination?: unknown; bytes?: unknown; sha256?: unknown }>;
  };

  expect(manifest.baseUrl).toBe(`https://raw.githubusercontent.com/makehumancommunity/makehuman/${commit}/`);
  expect(manifest.sourceCommit).toBe(commit);
  expect(manifest.license).toBe('CC0-1.0');
  expect(manifest.files).toHaveLength(24);

  const destinations = manifest.files?.map((entry) => entry.destination) ?? [];
  expect(new Set(destinations).size).toBe(destinations.length);

  for (const entry of manifest.files ?? []) {
    expect(safeRelativePath(entry.source)).toBe(true);
    expect(safeRelativePath(entry.destination)).toBe(true);
    expect(entry.source).toBe(expectedSource(entry.destination as string));
    expect(typeof entry.bytes).toBe('number');
    expect(entry.bytes).toBeGreaterThan(0);
    expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
  }
});

test('rejects URL-boundary bypasses and incorrect MakeHuman source mappings', () => {
  for (const unsafePath of [
    'https://example.test/file.target',
    'http:127.0.0.1/file.target',
    '../file.target',
    'head\\file.target',
    'head/file.target?query',
    'head/file.target#fragment',
  ]) {
    expect(safeRelativePath(unsafePath)).toBe(false);
  }

  expect(expectedSource('head/head-scale-horiz-decr.target')).toBe(
    'makehuman/data/targets/head/head-scale-horiz-decr.target',
  );
  expect('makehuman/data/targets/head/other.target').not.toBe(
    expectedSource('head/head-scale-horiz-decr.target'),
  );
});

test('marks every byte-pinned vendor file as binary to preserve its exact hash', () => {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
    files: Array<{ destination: string }>;
  };
  const vendorPrefix = 'tools/avatar-dna/vendor/makehuman-v1.3.0/';
  const output = execFileSync(
    'git',
    ['check-attr', '-z', 'binary', 'text', '--stdin'],
    {
      cwd: path.resolve(__dirname, '..'),
      input: `${manifest.files.map(({ destination }) => `${vendorPrefix}${destination}`).join('\0')}\0`,
    },
  ).toString('utf8').split('\0').filter(Boolean);

  expect(output).toHaveLength(manifest.files.length * 6);
  for (let index = 0; index < output.length; index += 6) {
    expect(output[index + 1]).toBe('binary');
    expect(output[index + 2]).toBe('set');
    expect(output[index + 4]).toBe('text');
    expect(output[index + 5]).toBe('unset');
  }
});
