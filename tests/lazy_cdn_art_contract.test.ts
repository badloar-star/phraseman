import fs from 'node:fs';
import path from 'node:path';

import { achievementObjectPath, getAchievementImageUrl } from '../constants/achievement_image_urls';
import { CORE_ACHIEVEMENT_IDS } from '../constants/achievementCoreArt';

/**
 * Контракт ленивой CDN-загрузки арта (Фаза 4 «Бандл-диеты», решение владельца
 * 2026-08-24): достижения едут из Storage, экономя вес бинаря.
 *
 * Главное правило владельца, которое здесь и сторожим: пользователь НИКОГДА не
 * видит незагруженную картинку. Значит обязаны выполняться четыре вещи:
 *   1) «ядро» остаётся в бандле и работает офлайн;
 *   2) путь заливки и путь скачивания совпадают побайтово (иначе 404 у всех);
 *   3) прогрев идёт ПО СОБЫТИЯМ, а не по таймеру;
 *   4) пока не загружено — заглушка той же геометрии, НЕ спиннер.
 *
 * зачем (PM-062/D61, владелец 2026-09-24): ауры аватара («ауры удаляем без
 * замены») и весь их CDN-путь (avatar_aura_image_urls.ts, avatar_aura_core_art.ts,
 * avatar_aura_art_prefetch.ts, ассеты avatar-auras/avatar-auras-hd) удалены —
 * соответствующие проверки убраны из этого файла, достижения не затронуты.
 */

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('ленивая CDN-загрузка арта: ядро остаётся офлайн', () => {
  it('первые достижения бандлятся и не имеют удалённого URL', () => {
    expect(CORE_ACHIEVEMENT_IDS.length).toBeGreaterThan(0);
    for (const id of CORE_ACHIEVEMENT_IDS) {
      expect(getAchievementImageUrl(id)).toBeUndefined();
    }
  });

  it('не-ядровой арт получает публичный URL без токена', () => {
    const achievementUrl = getAchievementImageUrl('xp_1000');
    expect(achievementUrl).toContain('/achievement-images%2F');
    // Токена быть не должно: путь публичен по storage.rules, и отсутствие
    // токена делает адрес детерминированным (карта не может «отстать»).
    expect(achievementUrl).not.toContain('&token=');
  });
});

describe('ленивая CDN-загрузка арта: путь заливки == путь скачивания', () => {
  it('формула пути достижений совпадает со скриптом заливки', () => {
    expect(achievementObjectPath('xp_1000')).toBe('achievement-images/xp_1000.webp');
    const uploader = read('scripts/upload_achievement_images_to_storage.mjs');
    expect(uploader).toContain('`${STORAGE_PREFIX}/${id}.webp`');
    // Карта URL больше не генерируется — расходиться нечему.
    expect(uploader).not.toContain('achievementImageUrlMap.generated');
  });

  it('storage.rules открывают префикс достижений на публичное чтение', () => {
    const rules = read('storage.rules');
    expect(rules).toContain('match /achievement-images/{allPaths=**}');
  });

  it('каталог подготовки чистится, иначе в Storage уедет мусор', () => {
    // зачем (аудит 2026-08-25): каталог НЕ очищался и накопил 199 файлов при 70
    // актуальных. Скрипт заливки берёт из него ВСЕ .webp подряд — 166 мусорных
    // объектов уехали бы в бакет: лишние деньги и шум при аудите.
    const prepare = read('scripts/prepare_achievement_images_for_storage.mjs');
    expect(prepare).toContain('fs.rmSync(OUT_DIR');
    expect(prepare).toContain('recursive: true, force: true');
  });

  it('скрипт очистки сирот читает НАСТОЯЩИЙ каталог достижений', () => {
    // зачем (аудит 2026-08-25): раньше он regex-ом читал app/achievements.ts —
    // файл рантайм-логики, а не каталог. Совпадений ноль → LIVE пустой →
    // скрипт всегда падал на guard-е и не работал вообще.
    const prune = read('scripts/prune_achievement_images_in_storage.mjs');
    expect(prune).toContain('achievement-art-v2');
    expect(prune).toContain('manifest.json');
    expect(prune).toContain('achievementCoreArt.ts');
    expect(prune).not.toContain("'app', 'achievements.ts'");
  });
});

describe('ленивая CDN-загрузка арта: прогрев по событиям, а не по таймеру', () => {
  it('достижения греются на входе на экран и при повышении уровня', () => {
    expect(read('app/achievements_screen.tsx')).toContain('prefetchAllAchievementArt()');
    expect(read('app/_layout.tsx')).toContain('prefetchAllAchievementArt()');
  });

  it('каталог достижений греется в фоне после первого кадра', () => {
    const layout = read('app/_layout.tsx');
    expect(layout).toContain('prefetchAchievementArtInBackground()');
  });

  it('офлайн-провал догоняется при возврате приложения из фона', () => {
    // зачем (аудит 2026-08-25): без этого неудачный офлайн-прогрев ждал бы
    // следующего захода на экран, а награда могла всплыть раньше.
    const src = read('app/achievement_art_prefetch.ts');
    expect(src).toContain("AppState.addEventListener('change'");
    expect(src).toContain("state === 'active'");
  });

  it('прогрев не качает один и тот же URL дважды за сессию', () => {
    const src = read('app/achievement_art_prefetch.ts');
    // Экономия трафика и стоимости Storage — помним прогретое.
    expect(src).toContain('warmed');
    expect(src).toContain("cachePolicy: 'disk'");
    // Неудачу забываем, чтобы следующее событие попробовало снова.
    expect(src).toContain('warmed.delete');
  });
});

describe('ленивая CDN-загрузка арта: пустоты и спиннера не бывает', () => {
  // зачем (PM-062/D61, владелец 2026-09-24): проверки рендера кольца ауры
  // (AvatarAura.tsx) убраны — компонент больше не рисует ни ореол, ни кольцо,
  // «ауры удаляем без замены». Season Pass кольца (SeasonAuraRing.tsx) — вне
  // периметра этой задачи, их отдельный кэш-контракт не менялся.

  it('арт достижения показывает щит той же геометрии, а не пустоту', () => {
    const src = read('components/AchievementArt.tsx');
    expect(src).toContain('cachePolicy="memory-disk"');
    expect(src).toContain('SHIELD');
    expect(src).not.toMatch(/ActivityIndicator|Spinner/);
    // Геометрия зарезервирована с первого кадра (Performance Bible).
    expect(src).toContain('width: size, height: h');
  });
});
