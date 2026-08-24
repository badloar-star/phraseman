import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import sharp from 'sharp';

jest.setTimeout(30_000);

let testSequence = 0;

function nextTestId() {
  testSequence += 1;
  return `jest-${process.pid}-${testSequence}`;
}

function runProcessor(input: string, output: string, testId: string, failPublish = false) {
  return spawnSync(process.execPath, [
    'scripts/process-friends-flame-asset.mjs',
    '--input', input,
    '--output', output,
    '--matte', '128,128,128',
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: {
      ...process.env,
      PHRASEMAN_FRIENDS_FLAME_TEST_OPERATION_ID: testId,
      ...(failPublish ? { PHRASEMAN_FRIENDS_FLAME_TEST_FAIL_PUBLISH: '1' } : {}),
    },
  });
}

const processedDirectory = resolve('.codex-tmp/friends-shared-flame/processed');

function hasErrnoCode(error: unknown, code: string) {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === code;
}

function processedFiles() {
  try {
    return readdirSync(processedDirectory).sort();
  } catch (error: unknown) {
    if (hasErrnoCode(error, 'ENOENT')) return [];
    throw error;
  }
}

function expectNoOperationTemporaryFiles(output: string, testId: string) {
  expect(processedFiles()).not.toContain(`friends-flame-${testId}.png`);
  expect(processedFiles()).not.toContain(`friends-flame-${testId}.webp`);
  expect(existsSync(join(dirname(output), `.${basename(output)}.${testId}.pending`))).toBe(false);
}

async function writeFixture(input: string, objectX: number, objectY: number, width = 100, height = 100) {
  const objectSvg = Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="${objectX}" y="${objectY}" width="30" height="30" rx="5" fill="#F2DFC7"/>
    </svg>
  `);
  await sharp({
    create: { width, height, channels: 3, background: '#808080' },
  })
    .composite([{ input: objectSvg, blend: 'over' }])
    .png()
    .toFile(input);
}

describe('friends shared flame asset processing', () => {
  test('publishes a centered neutral-matte cutout as a same-size alpha WebP', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-friends-flame-success-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'flame.webp');

    try {
      await writeFixture(input, 35, 35);
      const testId = nextTestId();
      const result = runProcessor(input, output, testId);
      expect(result.status).toBe(0);

      const metadata = await sharp(readFileSync(output)).metadata();
      const { data, info } = await sharp(readFileSync(output))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];

      expect(output.endsWith('.webp')).toBe(true);
      expect(metadata.format).toBe('webp');
      expect(metadata.hasAlpha).toBe(true);
      expect([info.width, info.height]).toEqual([1024, 1024]);
      expect(info.channels).toBe(4);
      expect(alphaAt(0, 0)).toBeLessThanOrEqual(2);
      expect(alphaAt(512, 512)).toBeGreaterThanOrEqual(250);
      expectNoOperationTemporaryFiles(output, testId);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('normalizes a square 1254px neutral-matte input to a 1024px alpha WebP', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-friends-flame-1254-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'flame.webp');

    try {
      await writeFixture(input, 600, 600, 1254, 1254);
      const testId = nextTestId();
      const result = runProcessor(input, output, testId);

      expect(result.status).toBe(0);
      const metadata = await sharp(readFileSync(output)).metadata();
      expect(metadata.width).toBe(1024);
      expect(metadata.height).toBe(1024);
      expect(metadata.format).toBe('webp');
      expect(metadata.hasAlpha).toBe(true);
      expectNoOperationTemporaryFiles(output, testId);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('rejects a foreground that clears 1% but not the 12% safe margin without publishing it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-friends-flame-margin-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'flame.webp');

    try {
      await writeFixture(input, 4, 35);
      const testId = nextTestId();
      const result = runProcessor(input, output, testId);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/12% safe-margin gate failed/i);
      expect(() => readFileSync(output)).toThrow();
      expectNoOperationTemporaryFiles(output, testId);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('preserves existing final bytes when a reprocess fails validation', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-friends-flame-preserve-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'flame.webp');
    const existing = Buffer.from('keep-the-existing-flame-bytes');

    try {
      await writeFixture(input, 4, 35);
      writeFileSync(output, existing);
      const testId = nextTestId();
      const result = runProcessor(input, output, testId);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/12% safe-margin gate failed/i);
      expect(readFileSync(output)).toEqual(existing);
      expectNoOperationTemporaryFiles(output, testId);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('leaves no pending publication file beside the final output after failure', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-friends-flame-pending-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'flame.webp');

    try {
      await writeFixture(input, 4, 35);
      const testId = nextTestId();
      const result = runProcessor(input, output, testId);

      expect(result.status).not.toBe(0);
      expect(readdirSync(dir).filter((entry) => entry.startsWith(`.${basename(output)}.`) && entry.endsWith('.pending'))).toEqual([]);
      expectNoOperationTemporaryFiles(output, testId);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('uses independent horizontal and vertical 12% margins for non-square assets', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-friends-flame-nonsquare-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'flame.webp');

    try {
      await writeFixture(input, 15, 20, 100, 200);
      const testId = nextTestId();
      const result = runProcessor(input, output, testId);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/12% safe-margin gate failed/i);
      expect(() => readFileSync(output)).toThrow();
      expectNoOperationTemporaryFiles(output, testId);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('keeps existing output when test-only atomic rename failure occurs before publication', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-friends-flame-atomic-publish-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'flame.webp');
    const existing = Buffer.from('existing-output-survives-interrupted-publish');

    try {
      await writeFixture(input, 35, 35);
      writeFileSync(output, existing);
      const testId = nextTestId();
      const result = runProcessor(input, output, testId, true);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toMatch(/simulated atomic rename failure before publication/i);
      expect(readFileSync(output)).toEqual(existing);
      expectNoOperationTemporaryFiles(output, testId);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
