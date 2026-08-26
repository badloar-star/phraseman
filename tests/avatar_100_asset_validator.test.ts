import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync, spawnSync } from 'child_process';
import sharp from 'sharp';

const ROOT = path.resolve(__dirname, '..');

function avatarSvg(fill: string, options: { size?: number; radius?: number; outside?: boolean } = {}) {
  const size = options.size ?? 512;
  const radius = options.radius ?? Math.round(size * 0.25);
  const outside = options.outside ? '<rect x="0" y="0" width="4" height="4" fill="#ff0000"/>' : '';
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="${fill}"/>${outside}</svg>`,
  );
}

async function writePair(
  dir: string,
  index: number,
  options: { size?: number; whiteRadius?: number; outside?: boolean; webp?: boolean } = {},
) {
  const extension = options.webp ? 'webp' : 'png';
  const blackPath = path.join(dir, `custom-idea-${index}-black.${extension}`);
  const whitePath = path.join(dir, `custom-idea-${index}-white.${extension}`);
  const black = sharp(avatarSvg('#30343b', { size: options.size, outside: options.outside }));
  const white = sharp(avatarSvg('#ece7dc', {
    size: options.size,
    radius: options.whiteRadius,
    outside: options.outside,
  }));
  if (options.webp) {
    await black.webp({ quality: 76 }).toFile(blackPath);
    await white.webp({ quality: 76 }).toFile(whitePath);
  } else {
    await black.png().toFile(blackPath);
    await white.png().toFile(whitePath);
  }
  return { blackPath, whitePath };
}

function validate(dir: string, reportPath: string) {
  return spawnSync(process.execPath, [
    'scripts/avatar-100/validate-assets.mjs', dir, '--json', reportPath,
  ], { cwd: ROOT, encoding: 'utf8' });
}

describe('avatar 100 asset validator', () => {
  it('accepts complete two- and three-digit PNG/WebP pairs', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-100-valid-'));
    await writePair(dir, 63);
    await writePair(dir, 100);
    await writePair(dir, 63, { webp: true });
    await writePair(dir, 100, { webp: true });
    const reportPath = path.join(dir, 'report.json');

    execFileSync(process.execPath, [
      'scripts/avatar-100/validate-assets.mjs', dir, '--json', reportPath,
    ], { cwd: ROOT });

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(report.checked).toBe(8);
    expect(report.rejected).toBe(0);
  });

  it.each([
    ['missing partner', async (dir: string) => {
      await sharp(avatarSvg('#30343b')).png().toFile(path.join(dir, 'custom-idea-63-black.png'));
    }],
    ['outside safe zone', async (dir: string) => {
      await writePair(dir, 63, { outside: true });
    }],
    ['wrong dimensions', async (dir: string) => {
      await writePair(dir, 63, { size: 64 });
    }],
  ])('rejects %s', async (_label, prepare) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-100-invalid-'));
    await prepare(dir);
    const reportPath = path.join(dir, 'report.json');
    const result = validate(dir, reportPath);
    expect(result.status).toBe(1);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(report.rejected).toBeGreaterThan(0);
  });

  it('accepts independently generated variants with different alpha masks', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-100-independent-'));
    await writePair(dir, 63, { whiteRadius: 96, webp: true });
    const reportPath = path.join(dir, 'report.json');
    const result = validate(dir, reportPath);
    expect(result.status).toBe(0);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(report.rejected).toBe(0);
  });

  it('rejects WebP files over 50 KB', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'avatar-100-heavy-'));
    const { blackPath, whitePath } = await writePair(dir, 100, { webp: true });
    const padding = Buffer.alloc(60_000);
    fs.appendFileSync(blackPath, padding);
    fs.appendFileSync(whitePath, padding);
    const reportPath = path.join(dir, 'report.json');
    const result = validate(dir, reportPath);
    expect(result.status).toBe(1);
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    expect(report.results.some((entry: { errors: string[] }) =>
      entry.errors.some((error) => error.includes('50 KB')))).toBe(true);
  });
});
