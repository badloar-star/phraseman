import fs from 'fs';
import path from 'path';

const manifestPath = path.resolve(__dirname, '../config/avatar-dna/human_v2_cc0_source.v1.json');
const commit = '1f508f6083b2f823dab15de924b3bde72e08d77c';
const safeRelativePath = (value: unknown): value is string =>
  typeof value === 'string'
  && value.length > 0
  && !path.isAbsolute(value)
  && !value.includes('\\')
  && value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');

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
    expect(typeof entry.bytes).toBe('number');
    expect(entry.bytes).toBeGreaterThan(0);
    expect(entry.sha256).toMatch(/^[a-f0-9]{64}$/);
  }
});
