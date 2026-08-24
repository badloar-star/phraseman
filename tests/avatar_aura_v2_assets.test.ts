import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { APPROVED_AVATAR_AURAS } from '../constants/avatar_auras';
import { CORE_AVATAR_AURA_IDS } from '../constants/avatar_aura_core_art';
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
  // зачем (Фаза 4 «Бандл-диеты», 2026-08-24): сторож ПЕРЕВЁРНУТ. Раньше он
  // требовал ровно 117 static require; теперь 111 слоёв стримятся из Storage, и
  // требование обратное — в бандле остаётся ТОЛЬКО «ядро» (ауры подписки).
  // Геометрия и sha256 всех 117 файлов проверяются ниже без изменений.
  it('бандлит ровно ядро (aura-plus/aura-pro), остальные слои — из Storage', () => {
    const source = fs.readFileSync(REGISTRY_FILE, 'utf8');
    const requires = [...source.matchAll(/require\('\.\.\/assets\/images\/avatar-auras\/([^']+\/(?:base|flow|accents)\.webp)'\)/g)]
      .map((match) => match[1]);
    expect(requires).toHaveLength(CORE_AVATAR_AURA_IDS.length * 3);
    expect(new Set(requires).size).toBe(CORE_AVATAR_AURA_IDS.length * 3);
    for (const coreId of CORE_AVATAR_AURA_IDS) {
      expect(requires.filter((item) => item.startsWith(`${coreId}/`))).toHaveLength(3);
    }
    // Ни одного слоя не-ядровой ауры в бандле быть не должно.
    for (const aura of APPROVED_AVATAR_AURAS) {
      if ((CORE_AVATAR_AURA_IDS as readonly string[]).includes(aura.id)) continue;
      expect(requires.filter((item) => item.startsWith(`${aura.id}/`))).toHaveLength(0);
    }
  });

  it('каждая одобренная аура имеет запись в каталоге движения', () => {
    const source = fs.readFileSync(REGISTRY_FILE, 'utf8');
    const catalogIds = [...source.matchAll(/^  '(aura-[a-z0-9-]+)':/gm)].map((match) => match[1]);
    for (const aura of APPROVED_AVATAR_AURAS) {
      expect(catalogIds).toContain(aura.id);
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
