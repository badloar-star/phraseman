import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

sharp.cache(false);

const ROOT = path.resolve(__dirname, '..');
const SPLIT = path.join(ROOT, 'scripts/avatar-dna/split_feature_sheet.mjs');

const run = (args: string[]) => {
  try {
    execFileSync(process.execPath, [SPLIT, ...args], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
};

const alphaBounds = async (file: string) => {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let left = info.width; let top = info.height; let right = -1; let bottom = -1;
  for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
    if (data[((y * info.width) + x) * 4 + 3] === 0) continue;
    left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y);
  }
  return { left, top, right, bottom, width: info.width, height: info.height };
};

describe('Avatar DNA feature sheet splitter', () => {
  const roots: string[] = [];

  afterEach(() => {
    for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
  });

  it('places every isolated feature into its immutable rig target box', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-feature-split-')); roots.push(root);
    const input = path.join(root, 'sheet.png'); const out = path.join(root, 'out'); const manifest = path.join(root, 'split.json');
    const part = await sharp({ create: { width: 220, height: 120, channels: 4, background: '#9c432fff' } }).png().toBuffer();
    await sharp({ create: { width: 2048, height: 2048, channels: 4, background: '#00000000' } })
      .composite([{ input: part, left: 160, top: 160 }, { input: part, left: 160, top: 620 }])
      .png().toFile(input);
    fs.writeFileSync(manifest, JSON.stringify({
      splitVersion: 1,
      canvas: [2048, 2048],
      features: [
        { id: 'brows_01', file: 'brows.png', sourceRect: [0.05, 0.05, 0.25, 0.2], targetBox: [0.3, 0.28, 0.4, 0.1] },
        { id: 'mouth_01', file: 'mouth.png', sourceRect: [0.05, 0.25, 0.25, 0.2], targetBox: [0.4, 0.58, 0.2, 0.08] },
      ],
    }));

    expect(run(['--input', input, '--manifest', manifest, '--out', out])).toBe(true);
    await expect(alphaBounds(path.join(out, 'brows.png'))).resolves.toMatchObject({ left: expect.any(Number), top: expect.any(Number), width: 2048, height: 2048 });
    const brows = await alphaBounds(path.join(out, 'brows.png'));
    expect(brows.left).toBeGreaterThanOrEqual(Math.floor(0.3 * 2048));
    expect(brows.right).toBeLessThan(Math.ceil(0.7 * 2048));
    expect(brows.top).toBeGreaterThanOrEqual(Math.floor(0.28 * 2048));
    expect(brows.bottom).toBeLessThan(Math.ceil(0.38 * 2048));
  });

  it('rejects an unsafe output path', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-feature-split-')); roots.push(root);
    const input = path.join(root, 'sheet.png'); const manifest = path.join(root, 'split.json');
    await sharp({ create: { width: 2048, height: 2048, channels: 4, background: '#9c432fff' } }).png().toFile(input);
    fs.writeFileSync(manifest, JSON.stringify({ splitVersion: 1, canvas: [2048, 2048], features: [{ id: 'eyes_01', file: '../escape.png', sourceRect: [0, 0, 1, 1], targetBox: [0, 0, 1, 1] }] }));
    expect(run(['--input', input, '--manifest', manifest, '--out', path.join(root, 'out')])).toBe(false);
  });
});
