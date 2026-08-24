import fs from 'node:fs';
import path from 'node:path';

/**
 * Контракт Foundation V2: все 70 активных статуэток имеют bundled fallback,
 * а legacy comeback остаётся отдельным офлайн-ассетом. Remote URL и prefetch
 * сохраняются как более свежий первый источник для non-core наград.
 */

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const coreSrc = read('constants/achievementCoreArt.ts');
const registrySrc = read('constants/achievementImageAssets.ts');
const urlMapSrc = read('constants/achievementImageUrlMap.generated.ts');
const manifest = JSON.parse(read('content/achievement-art-v2/manifest.json')) as {
  assets: Array<{ id: string; status: string; output: string }>;
};

const CORE_IDS = [...coreSrc.matchAll(/^\s*'([a-z0-9_]+)',/gm)].map((match) => match[1]);
const REGISTRY = new Map(
  [...registrySrc.matchAll(/^\s{2}([a-z0-9_]+):\s*require\('\.\.\/(assets\/images\/[^']+)'\)/gm)]
    .map((match) => [match[1], match[2]] as const),
);
const REMOTE_IDS = new Set(
  [...urlMapSrc.matchAll(/^\s{2}"([a-z0-9_]+)":\s*"https:/gm)].map((match) => match[1]),
);
const ACTIVE_IDS = manifest.assets.map((row) => row.id).sort();

describe('achievement art coverage', () => {
  it('каждый CORE id реально забандлен и файл лежит на диске', () => {
    expect(CORE_IDS.length).toBeGreaterThan(0);
    for (const id of CORE_IDS) {
      const file = REGISTRY.get(id);
      expect(file).toBeTruthy();
      expect(fs.existsSync(path.join(ROOT, file!))).toBe(true);
    }
  });

  it('ровно 70 активных V2 статуэток имеют один static require и один WebP', () => {
    expect(ACTIVE_IDS).toHaveLength(70);
    expect(manifest.assets.every((row) => row.status === 'connected')).toBe(true);

    const bundledActive = [...REGISTRY.entries()]
      .filter(([, file]) => file.startsWith('assets/images/achievements/'))
      .map(([id]) => id)
      .sort();
    expect(bundledActive).toEqual(ACTIVE_IDS);

    for (const id of ACTIVE_IDS) {
      const expected = `assets/images/achievements/${id}.webp`;
      expect(REGISTRY.get(id)).toBe(expected);
      expect(fs.existsSync(path.join(ROOT, expected))).toBe(true);
    }

    const files = fs.readdirSync(path.join(ROOT, 'assets/images/achievements'))
      .filter((name) => name.endsWith('.webp'))
      .map((name) => name.slice(0, -5))
      .sort();
    expect(files).toEqual(ACTIVE_IDS);
  });

  it('legacy comeback сохраняет отдельный bundled fallback вне набора V2', () => {
    expect(ACTIVE_IDS).not.toContain('comeback');
    expect(REGISTRY.get('comeback')).toBe('assets/images/legacy-achievements/comeback.webp');
    expect(fs.existsSync(path.join(ROOT, REGISTRY.get('comeback')!))).toBe(true);
  });

  it('URL-карта по-прежнему ссылается на публичный бакет достижений', () => {
    expect(REMOTE_IDS.size).toBe(35);
    expect(urlMapSrc).toContain('/achievement-images%2F');
    expect(read('storage.rules')).toContain('match /achievement-images/{allPaths=**}');
  });

  it('фоновый прогрев кэша подключён к старту приложения', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toContain('prefetchAchievementArtInBackground');
    expect(layout).toMatch(/runAfterInteractions\(\(\) => \{\s*prefetchAchievementArtInBackground\(\);/);
  });
});
