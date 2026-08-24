import fs from 'node:fs';
import path from 'node:path';

/**
 * Контракт Foundation V2 после Фазы 4 «Бандл-диеты» (2026-08-24).
 *
 * Сторож ПЕРЕВЁРНУТ: раньше требовал bundled fallback для всех 70 статуэток,
 * теперь требует ОБРАТНОГО — в бандле остаётся только «ядро», остальной арт
 * приходит из Storage. Файлы на диске и полнота набора проверяются как прежде:
 * они остаются источником для скрипта заливки.
 */

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const coreSrc = read('constants/achievementCoreArt.ts');
const registrySrc = read('constants/achievementImageAssets.ts');
const urlsSrc = read('constants/achievement_image_urls.ts');
const manifest = JSON.parse(read('content/achievement-art-v2/manifest.json')) as {
  assets: Array<{ id: string; status: string; output: string }>;
};

const CORE_IDS = [...coreSrc.matchAll(/^\s*'([a-z0-9_]+)',/gm)].map((match) => match[1]);
const REGISTRY = new Map(
  [...registrySrc.matchAll(/^\s{2}([a-z0-9_]+):\s*require\('\.\.\/(assets\/images\/[^']+)'\)/gm)]
    .map((match) => [match[1], match[2]] as const),
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

  it('ровно 70 активных V2 статуэток имеют WebP на диске', () => {
    expect(ACTIVE_IDS).toHaveLength(70);
    expect(manifest.assets.every((row) => row.status === 'connected')).toBe(true);

    for (const id of ACTIVE_IDS) {
      expect(fs.existsSync(path.join(ROOT, `assets/images/achievements/${id}.webp`))).toBe(true);
    }

    const files = fs.readdirSync(path.join(ROOT, 'assets/images/achievements'))
      .filter((name) => name.endsWith('.webp'))
      .map((name) => name.slice(0, -5))
      .sort();
    expect(files).toEqual(ACTIVE_IDS);
  });

  it('в бандле остаётся ТОЛЬКО ядро — остальной арт стримится из Storage', () => {
    const bundled = [...REGISTRY.keys()].sort();
    expect(bundled).toEqual([...CORE_IDS].sort());
    for (const id of ACTIVE_IDS) {
      if (CORE_IDS.includes(id)) continue;
      expect(REGISTRY.has(id)).toBe(false);
    }
  });

  it('legacy comeback сохраняет отдельный bundled fallback вне набора V2', () => {
    expect(ACTIVE_IDS).not.toContain('comeback');
    expect(REGISTRY.get('comeback')).toBe('assets/images/legacy-achievements/comeback.webp');
    expect(fs.existsSync(path.join(ROOT, REGISTRY.get('comeback')!))).toBe(true);
  });

  it('URL выводится формулой из id и ссылается на публичный бакет достижений', () => {
    // зачем: прежняя AUTO-GENERATED карта перечисляла 35 записей из 70 и молча
    // расходилась с бакетом. Формула такой рассинхронизации не допускает.
    expect(urlsSrc).toContain("const STORAGE_PREFIX = 'achievement-images'");
    expect(urlsSrc).toContain('isCoreAchievementArt');
    expect(read('storage.rules')).toContain('match /achievement-images/{allPaths=**}');
  });

  it('фоновый прогрев кэша подключён к старту приложения', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toContain('prefetchAchievementArtInBackground');
    expect(layout).toMatch(/runAfterInteractions\(\(\) => \{\s*prefetchAchievementArtInBackground\(\);/);
  });

  it('событийный прогрев подключён: экран достижений и повышение уровня', () => {
    // зачем (правило владельца): греем ПО СОБЫТИЯМ, а не по таймеру — к моменту
    // награды арт уже на диске, и щит-заглушка пользователю не показывается.
    expect(read('app/achievements_screen.tsx')).toContain('prefetchAllAchievementArt()');
    expect(read('app/_layout.tsx')).toContain('prefetchAllAchievementArt()');
  });
});
