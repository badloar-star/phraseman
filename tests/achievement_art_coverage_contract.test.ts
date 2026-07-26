import fs from 'node:fs';
import path from 'node:path';

/**
 * Контракт: у КАЖДОГО достижения всегда есть источник арта.
 *
 * зачем: арт вынесен в Firebase Storage (−5.9 МБ из бандла). Требование
 * владельца — пользователь не должен НИКОГДА увидеть отсутствие иконки.
 * Этот тест стережёт все три слоя защиты:
 *   1) «ядро» первых достижений реально лежит в бандле (офлайн, мгновенно);
 *   2) для остальных есть URL в сгенерированной карте;
 *   3) ни одно достижение не осталось вообще без источника.
 */

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const coreSrc = read('constants/achievementCoreArt.ts');
const registrySrc = read('constants/achievementImageAssets.ts');
const urlMapSrc = read('constants/achievementImageUrlMap.generated.ts');
const achievementsSrc = read('app/achievements.ts');

const CORE_IDS = [...coreSrc.matchAll(/^\s*'([a-z0-9_]+)',/gm)].map((m) => m[1]);
const BUNDLED = new Map(
  [...registrySrc.matchAll(/^\s{2}([a-z0-9_]+):\s*require\('\.\.\/assets\/images\/achievements\/([^']+)'\)/gm)]
    .map((m) => [m[1], m[2]] as const),
);
const REMOTE_IDS = new Set(
  [...urlMapSrc.matchAll(/^\s{2}"([a-z0-9_]+)":\s*"https:/gm)].map((m) => m[1]),
);

describe('achievement art coverage', () => {
  it('каждый CORE id реально забандлен и файл лежит на диске', () => {
    expect(CORE_IDS.length).toBeGreaterThan(0);
    for (const id of CORE_IDS) {
      const file = BUNDLED.get(id);
      expect(file).toBeTruthy();
      expect(fs.existsSync(path.join(ROOT, 'assets/images/achievements', file!))).toBe(true);
    }
  });

  it('в бандле остаётся ТОЛЬКО ядро — иначе экономия веса потеряна', () => {
    expect([...BUNDLED.keys()].sort()).toEqual([...CORE_IDS].sort());
  });

  it('ядровой арт перечислен в app.json (попадёт в OTA и в бинарь)', () => {
    const appJson = read('app.json');
    for (const file of BUNDLED.values()) {
      expect(appJson).toContain(`assets/images/achievements/${file}`);
    }
    // Общий паттерн вернул бы все 223 файла в бандл — он должен остаться убранным.
    expect(appJson).not.toContain('"assets/images/achievements/*"');
  });

  it('у каждого достижения из логики есть арт: бандл или URL', () => {
    // Только настоящие объявления достижений: `id:` в одной строке с `category:`.
    // Иначе в выборку попадают локализации, где `id:` — это код языка
    // (индонезийский), а не идентификатор достижения.
    const declared = [...achievementsSrc.matchAll(/id:\s*'([a-z0-9_]+)'\s*,[^\n]*\bcategory:/g)]
      .map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(50);

    const missing = [...new Set(declared)].filter(
      (id) => !BUNDLED.has(id) && !REMOTE_IDS.has(id),
    );
    expect(missing).toEqual([]);
  });

  it('URL-карта ссылается на публичный бакет достижений', () => {
    expect(REMOTE_IDS.size).toBeGreaterThan(100);
    expect(urlMapSrc).toContain('/achievement-images%2F');
    // Правило чтения обязано существовать, иначе арт не отдастся приложению.
    expect(read('storage.rules')).toContain('match /achievement-images/{allPaths=**}');
  });

  it('фоновый прогрев кэша подключён к старту приложения', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toContain('prefetchAchievementArtInBackground');
    // Прогрев обязан идти после первого кадра, а не блокировать старт.
    expect(layout).toMatch(/runAfterInteractions\(\(\) => \{\s*prefetchAchievementArtInBackground\(\);/);
  });
});
