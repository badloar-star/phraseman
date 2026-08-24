import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';

jest.setTimeout(30_000);

describe('home theme neutral-matte processing', () => {
  test('extracts a warm object from neutral gray without colored edge contamination', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-home-alpha-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'output.png');

    try {
      const objectSvg = Buffer.from(`
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <rect x="18" y="18" width="28" height="28" rx="8" fill="#F2DFC7"/>
        </svg>
      `);

      await sharp({
        create: { width: 64, height: 64, channels: 3, background: '#808080' },
      })
        .composite([{ input: objectSvg, blend: 'over' }])
        .png()
        .toFile(input);

      execFileSync(process.execPath, [
        'scripts/process-home-theme-asset.mjs',
        '--input', input,
        '--output', output,
        '--matte', '128,128,128',
      ], { cwd: process.cwd(), stdio: 'pipe' });

      const { data, info } = await sharp(readFileSync(output))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      expect(info.channels).toBe(4);

      const pixel = (x: number, y: number) => {
        const offset = (y * info.width + x) * info.channels;
        return Array.from(data.subarray(offset, offset + info.channels));
      };

      expect(pixel(0, 0)[3]).toBeLessThanOrEqual(2);
      expect(pixel(32, 32)[3]).toBeGreaterThanOrEqual(250);

      const edgePixels: number[][] = [];
      for (let y = 0; y < info.height; y += 1) {
        for (let x = 0; x < info.width; x += 1) {
          const rgba = pixel(x, y);
          if (rgba[3] >= 24 && rgba[3] <= 232) edgePixels.push(rgba);
        }
      }

      expect(edgePixels.length).toBeGreaterThan(0);
      for (const [r, g, b] of edgePixels) {
        expect(g - Math.max(r, b)).toBeLessThanOrEqual(6);
        expect(r - g).toBeLessThanOrEqual(55);
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('preserves a neutral foreground object instead of classifying every gray pixel as background', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-home-alpha-neutral-object-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'output.png');

    try {
      const objectSvg = Buffer.from(`
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <rect x="18" y="18" width="28" height="28" rx="8" fill="#303030"/>
        </svg>
      `);

      await sharp({
        create: { width: 64, height: 64, channels: 3, background: '#808080' },
      })
        .composite([{ input: objectSvg, blend: 'over' }])
        .png()
        .toFile(input);

      execFileSync(process.execPath, [
        'scripts/process-home-theme-asset.mjs',
        '--input', input,
        '--output', output,
        '--matte', '128,128,128',
      ], { cwd: process.cwd(), stdio: 'pipe' });

      const { data, info } = await sharp(readFileSync(output))
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      const alphaAt = (x: number, y: number) => data[(y * info.width + x) * info.channels + 3];

      expect(alphaAt(0, 0)).toBeLessThanOrEqual(2);
      expect(alphaAt(32, 32)).toBeGreaterThanOrEqual(250);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('rejects an input whose border does not match the declared matte color', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-home-alpha-wrong-matte-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'output.png');

    try {
      await sharp({
        create: { width: 64, height: 64, channels: 3, background: '#E8E8E8' },
      })
        .png()
        .toFile(input);

      expect(() => execFileSync(process.execPath, [
        'scripts/process-home-theme-asset.mjs',
        '--input', input,
        '--output', output,
        '--matte', '128,128,128',
      ], { cwd: process.cwd(), stdio: 'pipe' })).toThrow(/matte-background gate failed/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('check-only gate rejects an RGBA cutout that removed definite foreground pixels', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-home-alpha-foreground-gate-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'output.png');

    try {
      const objectSvg = Buffer.from(`
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <rect x="18" y="18" width="28" height="28" rx="8" fill="#303030"/>
        </svg>
      `);
      await sharp({
        create: { width: 64, height: 64, channels: 3, background: '#808080' },
      })
        .composite([{ input: objectSvg, blend: 'over' }])
        .png()
        .toFile(input);
      await sharp({
        create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
      })
        .png()
        .toFile(output);

      expect(() => execFileSync(process.execPath, [
        'scripts/process-home-theme-asset.mjs',
        '--input', input,
        '--output', output,
        '--matte', '128,128,128',
        '--check-only',
      ], { cwd: process.cwd(), stdio: 'pipe' })).toThrow(/foreground-preservation gate failed/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('check-only gate rejects an RGBA file that kept the matte background opaque', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-home-alpha-background-gate-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'output.png');

    try {
      const objectSvg = Buffer.from(`
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <rect x="18" y="18" width="28" height="28" rx="8" fill="#303030"/>
        </svg>
      `);
      await sharp({
        create: { width: 64, height: 64, channels: 3, background: '#808080' },
      })
        .composite([{ input: objectSvg, blend: 'over' }])
        .png()
        .toFile(input);
      await sharp(input).ensureAlpha(1).png().toFile(output);

      expect(() => execFileSync(process.execPath, [
        'scripts/process-home-theme-asset.mjs',
        '--input', input,
        '--output', output,
        '--matte', '128,128,128',
        '--check-only',
      ], { cwd: process.cwd(), stdio: 'pipe' })).toThrow(/background-removal gate failed/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('processing rejects a foreground object that touches the canvas edge', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-home-alpha-margin-gate-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'output.png');

    try {
      const objectSvg = Buffer.from(`
        <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
          <circle cx="3" cy="32" r="4" fill="#303030"/>
        </svg>
      `);
      await sharp({
        create: { width: 64, height: 64, channels: 3, background: '#808080' },
      })
        .composite([{ input: objectSvg, blend: 'over' }])
        .png()
        .toFile(input);

      expect(() => execFileSync(process.execPath, [
        'scripts/process-home-theme-asset.mjs',
        '--input', input,
        '--output', output,
        '--matte', '128,128,128',
      ], { cwd: process.cwd(), stdio: 'pipe' })).toThrow(/safe-margin gate failed/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('rejects a chromatic matte that can contaminate generated shadows and edges', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'phraseman-home-alpha-chroma-matte-'));
    const input = join(dir, 'input.png');
    const output = join(dir, 'output.png');

    try {
      await sharp({
        create: { width: 64, height: 64, channels: 3, background: '#FF6A00' },
      })
        .png()
        .toFile(input);

      expect(() => execFileSync(process.execPath, [
        'scripts/process-home-theme-asset.mjs',
        '--input', input,
        '--output', output,
        '--matte', '255,106,0',
      ], { cwd: process.cwd(), stdio: 'pipe' })).toThrow(/neutral-matte gate failed/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
