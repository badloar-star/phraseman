import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

sharp.cache(false);

const ROOT = path.resolve(__dirname, '..');
const EXTRACT = path.join(ROOT, 'scripts/avatar-dna/extract_annulus_layer.mjs');

const run = (args: string[]) => {
  try {
    execFileSync(process.execPath, [EXTRACT, ...args], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    return false;
  }
};

describe('Avatar DNA annulus extractor', () => {
  const roots: string[] = [];
  afterEach(() => { for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true }); });

  it('keeps iris rings while leaving pupil holes and outside pixels transparent', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-annulus-')); roots.push(root);
    const input = path.join(root, 'eyes.png'); const output = path.join(root, 'iris.png'); const manifest = path.join(root, 'annulus.json');
    await sharp({ create: { width: 2048, height: 2048, channels: 4, background: '#7b431fff' } }).png().toFile(input);
    fs.writeFileSync(manifest, JSON.stringify({ annulusVersion: 1, canvas: [2048, 2048], featherPx: 2, ellipses: [{ center: [0.5, 0.4], outerRadius: [0.08, 0.09], innerRadius: [0.04, 0.045] }] }));
    expect(run(['--input', input, '--manifest', manifest, '--output', output])).toBe(true);
    const { data, info } = await sharp(output).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const alphaAt = (x: number, y: number) => data[((y * info.width) + x) * 4 + 3];
    expect(alphaAt(1024, Math.round(0.4 * 2048))).toBe(0);
    expect(alphaAt(1024 + Math.round(0.06 * 2048), Math.round(0.4 * 2048))).toBeGreaterThan(240);
    expect(alphaAt(1024 + Math.round(0.1 * 2048), Math.round(0.4 * 2048))).toBe(0);
  });

  it('rejects an inner radius that is not smaller than the outer radius', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-annulus-')); roots.push(root);
    const input = path.join(root, 'eyes.png'); const manifest = path.join(root, 'annulus.json');
    await sharp({ create: { width: 2048, height: 2048, channels: 4, background: '#7b431fff' } }).png().toFile(input);
    fs.writeFileSync(manifest, JSON.stringify({ annulusVersion: 1, canvas: [2048, 2048], featherPx: 2, ellipses: [{ center: [0.5, 0.4], outerRadius: [0.08, 0.09], innerRadius: [0.09, 0.09] }] }));
    expect(run(['--input', input, '--manifest', manifest, '--output', path.join(root, 'iris.png')])).toBe(false);
  });
});
