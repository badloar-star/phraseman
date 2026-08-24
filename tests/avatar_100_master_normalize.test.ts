import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');

function normalize(input: string, output: string) {
  execFileSync(process.execPath, [
    'scripts/avatar-100/normalize-master.mjs', '--input', input, '--output', output,
  ], { cwd: ROOT });
}

describe('avatar 100 master normalization', () => {
  it('removes generated checkerboard backgrounds and fits the subject into 512 px safe bounds', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-master-grid-'));
    const input = path.join(root, 'input.png');
    const output = path.join(root, 'output.png');
    const pixels = Buffer.alloc(96 * 96 * 3);
    for (let y = 0; y < 96; y += 1) {
      for (let x = 0; x < 96; x += 1) {
        const offset = (y * 96 + x) * 3;
        const background = ((x >> 3) + (y >> 3)) % 2 === 0 ? 250 : 238;
        const subject = x >= 28 && x < 68 && y >= 12 && y < 84;
        pixels[offset] = subject ? 38 : background;
        pixels[offset + 1] = subject ? 92 : background;
        pixels[offset + 2] = subject ? 138 : background;
      }
    }
    await sharp(pixels, { raw: { width: 96, height: 96, channels: 3 } }).png().toFile(input);

    normalize(input, output);
    const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height, info.channels]).toEqual([512, 512, 4]);
    expect(data[3]).toBe(0);
    expect(data[((256 * 512 + 256) * 4) + 3]).toBeGreaterThan(240);
  });

  it('removes a border-connected magenta chroma background', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-master-chroma-'));
    const input = path.join(root, 'input.png');
    const output = path.join(root, 'output.png');
    const svg = `<svg width="80" height="80"><rect width="80" height="80" fill="#ff00ff"/><circle cx="40" cy="40" r="22" fill="#256090"/><circle cx="40" cy="40" r="10" fill="#ff00ff"/></svg>`;
    await sharp(Buffer.from(svg)).png().toFile(input);
    normalize(input, output);
    const { data } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(data[3]).toBe(0);
    expect(data[((256 * 512 + 256) * 4) + 3]).toBe(0);
    expect(data[((256 * 512 + 240) * 4) + 3]).toBeGreaterThan(240);
  });
});
