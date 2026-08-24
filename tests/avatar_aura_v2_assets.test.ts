import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { APPROVED_AVATAR_AURAS } from '../constants/avatar_auras';
import { APPROVED_AVATAR_AURA_LAYER_SHA256 } from './fixtures/avatar_aura_v2_sha256';

const ROOT = path.join(__dirname, '..');
const RUNTIME_ROOT = path.join(ROOT, 'assets', 'images', 'avatar-auras');
const REGISTRY_FILE = path.join(ROOT, 'app', 'avatar_aura_assets.ts');
const LAYERS = ['base', 'flow', 'accents'] as const;

async function visibleBounds(file: string) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  let radius = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * 4 + 3] <= 8) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      radius = Math.max(radius, Math.hypot(x - 159.5, y - 159.5));
    }
  }
  expect(maxX).toBeGreaterThanOrEqual(minX);
  return { minX, minY, maxX, maxY, radius };
}

describe('approved avatar aura static asset registry', () => {
  it('contains 39 runtime entries and exactly 117 unique literal static requires', () => {
    const source = fs.readFileSync(REGISTRY_FILE, 'utf8');
    const requires = [...source.matchAll(/require\('\.\.\/assets\/images\/avatar-auras\/([^']+\/(?:base|flow|accents)\.webp)'\)/g)]
      .map((match) => match[1]);
    expect(requires).toHaveLength(117);
    expect(new Set(requires).size).toBe(117);
    for (const aura of APPROVED_AVATAR_AURAS) {
      expect(requires.filter((item) => item.startsWith(`${aura.id}/`))).toHaveLength(3);
    }
  });

  it('matches the tracked approved hashes in a clean checkout and preserves rotation-safe alpha geometry', async () => {
    expect(Object.keys(APPROVED_AVATAR_AURA_LAYER_SHA256)).toHaveLength(117);
    const hashes = new Set<string>();
    for (const aura of APPROVED_AVATAR_AURAS) {
      expect(aura.designId).toBeDefined();
      const bounds = [];
      for (const layer of LAYERS) {
        const runtimeFile = path.join(RUNTIME_ROOT, aura.id, `${layer}.webp`);
        const runtimeBytes = fs.readFileSync(runtimeFile);
        expect(createHash('sha256').update(runtimeBytes).digest('hex'))
          .toBe(APPROVED_AVATAR_AURA_LAYER_SHA256[`${aura.id}/${layer}.webp`]);
        const metadata = await sharp(runtimeFile).metadata();
        expect(metadata).toMatchObject({ width: 320, height: 320, format: 'webp', hasAlpha: true });
        const geometry = await visibleBounds(runtimeFile);
        const padding = Math.min(geometry.minX, geometry.minY, 319 - geometry.maxX, 319 - geometry.maxY);
        expect(padding).toBeGreaterThanOrEqual(23);
        expect(geometry.radius).toBeLessThanOrEqual(137.71);
        bounds.push(geometry);
        hashes.add(createHash('sha256').update(runtimeBytes).digest('hex'));
      }
      const union = {
        minX: Math.min(...bounds.map((item) => item.minX)),
        minY: Math.min(...bounds.map((item) => item.minY)),
        maxX: Math.max(...bounds.map((item) => item.maxX)),
        maxY: Math.max(...bounds.map((item) => item.maxY)),
      };
      const centerOffset = Math.hypot(
        (union.minX + union.maxX) / 2 - 159.5,
        (union.minY + union.maxY) / 2 - 159.5,
      );
      expect(centerOffset).toBeLessThanOrEqual(0.71);
    }
    expect(hashes.size).toBe(117);
  });
});
