import fs from 'node:fs';
import path from 'node:path';

import { CORE_AVATAR_AURA_IDS, isCoreAvatarAuraArt } from '../constants/avatar_aura_core_art';
import { getAvatarAuraLayerUrl, avatarAuraObjectPath, AVATAR_AURA_ART_VERSION } from '../constants/avatar_aura_image_urls';
import { achievementObjectPath, getAchievementImageUrl } from '../constants/achievement_image_urls';
import { CORE_ACHIEVEMENT_IDS } from '../constants/achievementCoreArt';

/**
 * Контракт ленивой CDN-загрузки арта (Фаза 4 «Бандл-диеты», решение владельца
 * 2026-08-24): достижения и ауры едут из Storage, −6.22 МБ из бинаря.
 *
 * Главное правило владельца, которое здесь и сторожим: пользователь НИКОГДА не
 * видит незагруженную картинку. Значит обязаны выполняться четыре вещи:
 *   1) «ядро» остаётся в бандле и работает офлайн;
 *   2) путь заливки и путь скачивания совпадают побайтово (иначе 404 у всех);
 *   3) прогрев идёт ПО СОБЫТИЯМ, а не по таймеру;
 *   4) пока не загружено — заглушка/ореол той же геометрии, НЕ спиннер.
 */

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

describe('ленивая CDN-загрузка арта: ядро остаётся офлайн', () => {
  it('ауры подписки бандлятся и не имеют удалённого URL', () => {
    expect([...CORE_AVATAR_AURA_IDS]).toEqual(['aura-plus', 'aura-pro']);
    for (const id of CORE_AVATAR_AURA_IDS) {
      expect(isCoreAvatarAuraArt(id)).toBe(true);
      // Ядро не должно уводить рантайм в сеть ни одним слоем.
      expect(getAvatarAuraLayerUrl(id, 'base')).toBeUndefined();
      expect(getAvatarAuraLayerUrl(id, 'flow')).toBeUndefined();
      expect(getAvatarAuraLayerUrl(id, 'accents')).toBeUndefined();
    }
  });

  it('первые достижения бандлятся и не имеют удалённого URL', () => {
    expect(CORE_ACHIEVEMENT_IDS.length).toBeGreaterThan(0);
    for (const id of CORE_ACHIEVEMENT_IDS) {
      expect(getAchievementImageUrl(id)).toBeUndefined();
    }
  });

  it('не-ядровой арт получает публичный URL без токена', () => {
    const auraUrl = getAvatarAuraLayerUrl('aura-aurora', 'base');
    expect(auraUrl).toContain('/aura-images%2F');
    expect(auraUrl).toContain('alt=media');
    // Токена быть не должно: путь публичен по storage.rules, и отсутствие
    // токена делает адрес детерминированным (карта не может «отстать»).
    expect(auraUrl).not.toContain('&token=');

    const achievementUrl = getAchievementImageUrl('xp_1000');
    expect(achievementUrl).toContain('/achievement-images%2F');
    expect(achievementUrl).not.toContain('&token=');
  });
});

describe('ленивая CDN-загрузка арта: путь заливки == путь скачивания', () => {
  it('скрипт заливки аур берёт версию арта из рантайм-модуля', () => {
    const uploader = read('scripts/upload_avatar_aura_images_to_storage.mjs');
    expect(uploader).toContain("constants', 'avatar_aura_image_urls.ts'");
    expect(uploader).toContain('AVATAR_AURA_ART_VERSION');
    expect(uploader).toContain('${STORAGE_PREFIX}/${ART_VERSION}/${key}.webp');
    // Пережатие запрещено: sha256 и геометрию слоёв сторожит
    // tests/avatar_aura_v2_assets.test.ts.
    expect(uploader).not.toContain("from 'sharp'");
    expect(uploader).not.toContain('.resize(');
  });

  it('формула пути аур совпадает с тем, что собирает скрипт', () => {
    expect(avatarAuraObjectPath('aura-aurora', 'base'))
      .toBe(`aura-images/${AVATAR_AURA_ART_VERSION}/aura-aurora/base.webp`);
    expect(getAvatarAuraLayerUrl('aura-aurora', 'base'))
      .toContain(encodeURIComponent(avatarAuraObjectPath('aura-aurora', 'base')));
  });

  it('формула пути достижений совпадает со скриптом заливки', () => {
    expect(achievementObjectPath('xp_1000')).toBe('achievement-images/xp_1000.webp');
    const uploader = read('scripts/upload_achievement_images_to_storage.mjs');
    expect(uploader).toContain('`${STORAGE_PREFIX}/${id}.webp`');
    // Карта URL больше не генерируется — расходиться нечему.
    expect(uploader).not.toContain('achievementImageUrlMap.generated');
  });

  it('storage.rules открывают оба префикса на публичное чтение', () => {
    const rules = read('storage.rules');
    expect(rules).toContain('match /achievement-images/{allPaths=**}');
    expect(rules).toContain('match /aura-images/{allPaths=**}');
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
  it('ауры греются на входе в студию и при повышении уровня', () => {
    expect(read('app/avatar_select.tsx')).toContain('prefetchAllAvatarAuraArt()');
    const layout = read('app/_layout.tsx');
    expect(layout).toContain("onAppEvent('level_up_pending'");
    expect(layout).toContain('prefetchAllAvatarAuraArt()');
  });

  it('достижения греются на входе на экран и при повышении уровня', () => {
    expect(read('app/achievements_screen.tsx')).toContain('prefetchAllAchievementArt()');
    expect(read('app/_layout.tsx')).toContain('prefetchAllAchievementArt()');
  });

  it('оба каталога греются в фоне после первого кадра', () => {
    // зачем (аудит 2026-08-25): ауры видны НЕ только в студии — своя на Главной,
    // чужие в друзьях, Арене, лиге, клубе. Без старта юзер, который просто
    // листает эти экраны, видел бы ореол вместо кольца.
    const layout = read('app/_layout.tsx');
    expect(layout).toContain('prefetchAchievementArtInBackground()');
    expect(layout).toContain('prefetchAvatarAuraArtInBackground()');
  });

  it('своя аура на Главной запрашивается вне очереди', () => {
    // Иначе её слои ждали бы прогрева всего каталога (111 слоёв).
    expect(read('app/(tabs)/home.tsx')).toContain('prefetchAvatarAuraArtNow(');
    expect(read('app/avatar_aura_art_prefetch.ts')).toContain('queue.unshift(url)');
  });

  it('офлайн-провал догоняется при возврате приложения из фона', () => {
    // зачем (аудит 2026-08-25): без этого неудачный офлайн-прогрев ждал бы
    // следующего захода на экран, а награда могла всплыть раньше.
    for (const file of ['app/avatar_aura_art_prefetch.ts', 'app/achievement_art_prefetch.ts']) {
      const src = read(file);
      expect(src).toContain("AppState.addEventListener('change'");
      expect(src).toContain("state === 'active'");
    }
  });

  it('прогрев не качает один и тот же URL дважды за сессию', () => {
    for (const file of ['app/avatar_aura_art_prefetch.ts', 'app/achievement_art_prefetch.ts']) {
      const src = read(file);
      // Экономия трафика и стоимости Storage — помним прогретое.
      expect(src).toContain('warmed');
      expect(src).toContain("cachePolicy: 'disk'");
      // Неудачу забываем, чтобы следующее событие попробовало снова.
      expect(src).toContain('warmed.delete');
    }
  });
});

describe('ленивая CDN-загрузка арта: пустоты и спиннера не бывает', () => {
  it('кольцо ауры держит ореол-подложку до загрузки слоя', () => {
    const src = read('components/AvatarAura.tsx');
    expect(src).toContain('avatar-aura-ring-placeholder');
    expect(src).toContain('onBaseLoaded');
    expect(src).toContain('onBaseFailed');
    // Ошибка загрузки = остаёмся на ореоле, а не показываем пустоту.
    expect(src).toContain('setPaintedAuraId(null)');
    expect(src).not.toMatch(/ActivityIndicator|Spinner/);
  });

  it('поздний onLoad прошлой ауры не снимает ореол у новой', () => {
    // зачем (аудит 2026-08-25): известный в проекте класс бага «поздний ответ
    // затирает свежее значение». Состояние обязано хранить ID ауры, чей слой
    // отрисован, а не голый boolean — иначе быстрое переключение колец в студии
    // показывало бы новую ауру «готовой», пока её слой ещё едет.
    const src = read('components/AvatarAura.tsx');
    expect(src).toContain('paintedAuraId');
    expect(src).toContain('paintedAuraId === aura.id');
    // Голый boolean-флаг вернул бы гонку.
    expect(src).not.toMatch(/setRingPainted\(true\)/);
  });

  it('слои кольца кэшируются на диск, иначе кольцо не переживёт перезапуск', () => {
    const src = read('components/SeasonAuraRing.tsx');
    expect(src).toContain('expo-image');
    expect(src).toContain('cachePolicy="memory-disk"');
    // RN-Image для удалённых URL не даёт гарантированного дискового кэша.
    expect(src).not.toContain('<Animated.Image');
  });

  it('арт достижения показывает щит той же геометрии, а не пустоту', () => {
    const src = read('components/AchievementArt.tsx');
    expect(src).toContain('cachePolicy="memory-disk"');
    expect(src).toContain('SHIELD');
    expect(src).not.toMatch(/ActivityIndicator|Spinner/);
    // Геометрия зарезервирована с первого кадра (Performance Bible).
    expect(src).toContain('width: size, height: h');
  });
});
