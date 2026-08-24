import { spawnSync } from 'child_process';
import { mkdtemp, mkdir, readdir, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import sharp from 'sharp';

const script = join(process.cwd(), 'scripts', 'validate-level-spin-reward-asset.mjs');

async function transparentCanvasWithSquare(path: string, left: number, top: number): Promise<void> {
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{
    input: { create: { width: 320, height: 320, channels: 4, background: { r: 200, g: 90, b: 50, alpha: 1 } } },
    left,
    top,
  }]).png().toFile(path);
}

function runValidator(source: string, qaDir: string) {
  return spawnSync(process.execPath, [script, '--id', 'xp_250', '--source', source, '--qa-dir', qaDir], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

describe('level spin reward asset validator', () => {
  let root = '';

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'level-spin-reward-validator-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  test('accepts a genuine 1024px RGBA cutout and creates eight unchanged-source QA views', async () => {
    const source = join(root, 'valid.png');
    const qaDir = join(root, 'qa');
    await transparentCanvasWithSquare(source, 352, 352);

    const result = runValidator(source, qaDir);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      id: 'xp_250', width: 1024, height: 1024, channels: 4, hasAlpha: true, qaCount: 8,
    });
    expect((await readdir(qaDir)).sort()).toEqual([
      'xp_250-app-118.png',
      'xp_250-app-300.png',
      'xp_250-black-118.png',
      'xp_250-black-300.png',
      'xp_250-blue-118.png',
      'xp_250-blue-300.png',
      'xp_250-white-118.png',
      'xp_250-white-300.png',
    ]);
  });

  test('accepts a square high-resolution generator source up to 1400px', async () => {
    const source = join(root, 'generator-source.png');
    const qaDir = join(root, 'qa');
    await sharp({
      create: { width: 1254, height: 1254, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).composite([{
      input: { create: { width: 500, height: 500, channels: 4, background: { r: 30, g: 180, b: 210, alpha: 1 } } },
      left: 377,
      top: 377,
    }]).png().toFile(source);

    const result = runValidator(source, qaDir);

    expect(result.status).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      id: 'xp_250', width: 1254, height: 1254, channels: 4, hasAlpha: true, qaCount: 8,
    });
  });

  test('rejects RGB sources without trying to invent alpha', async () => {
    const source = join(root, 'rgb.png');
    await sharp({
      create: { width: 1024, height: 1024, channels: 3, background: { r: 200, g: 90, b: 50 } },
    }).png().toFile(source);

    const result = runValidator(source, join(root, 'qa'));

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('reward_asset_alpha_required');
  });

  test('rejects an opaque corner', async () => {
    const source = join(root, 'opaque.png');
    await sharp({
      create: { width: 1024, height: 1024, channels: 4, background: { r: 200, g: 90, b: 50, alpha: 1 } },
    }).png().toFile(source);

    const result = runValidator(source, join(root, 'qa'));

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('reward_asset_corner_not_transparent');
  });

  test('rejects non-transparent content touching a canvas edge', async () => {
    const source = join(root, 'edge.png');
    await transparentCanvasWithSquare(source, 0, 352);

    const result = runValidator(source, join(root, 'qa'));

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('reward_asset_bounds_touch_canvas');
  });
});
