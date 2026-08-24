import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import sharp from 'sharp';

type RawImage = Awaited<ReturnType<typeof readRaw>>;

async function readRaw(filePath: string) {
  return sharp(filePath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function pixel(image: RawImage, x: number): number[] {
  const offset = x * image.info.channels;
  return Array.from(image.data.subarray(offset, offset + 4));
}

function alphaBytes(image: RawImage): number[] {
  const values: number[] = [];
  for (let offset = 3; offset < image.data.length; offset += image.info.channels) {
    values.push(image.data[offset]);
  }
  return values;
}

function luma(rgba: number[]): number {
  return 0.2126 * rgba[0] + 0.7152 * rgba[1] + 0.0722 * rgba[2];
}

describe('avatar 100 pair transform', () => {
  it('preserves geometry and alpha while separating neutral tone ramps', async () => {
    const root = path.resolve(__dirname, '..');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-100-pair-'));
    const fixturePath = path.join(tempDir, 'fixture.png');
    await sharp(Buffer.from([
      100, 100, 100, 255,
      0, 180, 255, 255,
      220, 120, 30, 180,
      0, 0, 0, 0,
    ]), { raw: { width: 4, height: 1, channels: 4 } }).png().toFile(fixturePath);

    execFileSync(
      process.execPath,
      [
        'scripts/avatar-100/build-pair.mjs',
        '--input', fixturePath,
        '--index', '63',
        '--out-dir', tempDir,
      ],
      { cwd: root },
    );

    const files = fs.readdirSync(tempDir)
      .filter((file) => file.startsWith('custom-idea-'))
      .sort();
    expect(files).toEqual([
      'custom-idea-63-black.png',
      'custom-idea-63-black.webp',
      'custom-idea-63-white.png',
      'custom-idea-63-white.webp',
    ]);

    const black = await readRaw(path.join(tempDir, 'custom-idea-63-black.png'));
    const white = await readRaw(path.join(tempDir, 'custom-idea-63-white.png'));
    expect(black.info.width).toBe(4);
    expect(white.info.width).toBe(4);
    expect(alphaBytes(black)).toEqual(alphaBytes(white));
    expect(luma(pixel(black, 0))).toBeLessThan(110);
    expect(luma(pixel(white, 0))).toBeGreaterThan(160);
    expect(pixel(black, 1)[2]).toBeGreaterThan(pixel(black, 1)[1]);
    expect(pixel(white, 1)[2]).toBeGreaterThan(pixel(white, 1)[1]);
    expect(pixel(black, 2)[0]).toBeGreaterThan(pixel(black, 2)[1]);
    expect(pixel(white, 2)[0]).toBeGreaterThan(pixel(white, 2)[1]);
    expect(pixel(black, 3)[3]).toBe(0);
    expect(pixel(white, 3)[3]).toBe(0);
  });
});
