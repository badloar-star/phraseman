// ═══ АВТОГЕНЕРАЦИЯ: npx tsx scripts/gen_scene_assets.mts — не править руками ═══
// Запечённые ассеты первого кадра Главной (фон сцены, ореол, угли, затемнение, маски теней плит). Сторож: tests/home_scene_baked_assets.test.ts.
// Подключает 3 · МАКЕТЫ: вместо LinearGradient + SVG-радиала сцены — <Image source={homeSceneBackdrop(...)} style=absoluteFill resizeMode="stretch" />; вместо boxShadow плит — маска, окрашенная tintColor (plateShadow / plateShadowSoft).

/** Размер запечённого фона сцены (растягивается на любую сцену). */
export const HOME_SCENE_BACKDROP_SIZE = { width: 232, height: 225 } as const;

/** Ключ: `${themeId}|${appearance}|${day|eve}`. */
export const HOME_SCENE_BACKDROPS: Readonly<Record<string, number>> = Object.freeze({
  'graphite|dark|day': require('../../../../assets/images/v2scene/scene_bg_graphite_dark_day.webp'),
  'graphite|dark|eve': require('../../../../assets/images/v2scene/scene_bg_graphite_dark_eve.webp'),
  'polar|dark|day': require('../../../../assets/images/v2scene/scene_bg_polar_dark_day.webp'),
  'polar|dark|eve': require('../../../../assets/images/v2scene/scene_bg_polar_dark_eve.webp'),
  'slate|dark|day': require('../../../../assets/images/v2scene/scene_bg_slate_dark_day.webp'),
  'slate|dark|eve': require('../../../../assets/images/v2scene/scene_bg_slate_dark_eve.webp'),
  'ink|dark|day': require('../../../../assets/images/v2scene/scene_bg_ink_dark_day.webp'),
  'ink|dark|eve': require('../../../../assets/images/v2scene/scene_bg_ink_dark_eve.webp'),
  'lavender|dark|day': require('../../../../assets/images/v2scene/scene_bg_lavender_dark_day.webp'),
  'lavender|dark|eve': require('../../../../assets/images/v2scene/scene_bg_lavender_dark_eve.webp'),
  'iris|dark|day': require('../../../../assets/images/v2scene/scene_bg_iris_dark_day.webp'),
  'iris|dark|eve': require('../../../../assets/images/v2scene/scene_bg_iris_dark_eve.webp'),
  'rose|dark|day': require('../../../../assets/images/v2scene/scene_bg_rose_dark_day.webp'),
  'rose|dark|eve': require('../../../../assets/images/v2scene/scene_bg_rose_dark_eve.webp'),
  'terracotta|dark|day': require('../../../../assets/images/v2scene/scene_bg_terracotta_dark_day.webp'),
  'terracotta|dark|eve': require('../../../../assets/images/v2scene/scene_bg_terracotta_dark_eve.webp'),
  'taupe|dark|day': require('../../../../assets/images/v2scene/scene_bg_taupe_dark_day.webp'),
  'taupe|dark|eve': require('../../../../assets/images/v2scene/scene_bg_taupe_dark_eve.webp'),
  'olive|dark|day': require('../../../../assets/images/v2scene/scene_bg_olive_dark_day.webp'),
  'olive|dark|eve': require('../../../../assets/images/v2scene/scene_bg_olive_dark_eve.webp'),
  'sage|dark|day': require('../../../../assets/images/v2scene/scene_bg_sage_dark_day.webp'),
  'sage|dark|eve': require('../../../../assets/images/v2scene/scene_bg_sage_dark_eve.webp'),
  'eucalyptus|dark|day': require('../../../../assets/images/v2scene/scene_bg_eucalyptus_dark_day.webp'),
  'eucalyptus|dark|eve': require('../../../../assets/images/v2scene/scene_bg_eucalyptus_dark_eve.webp'),
  'marine|dark|day': require('../../../../assets/images/v2scene/scene_bg_marine_dark_day.webp'),
  'marine|dark|eve': require('../../../../assets/images/v2scene/scene_bg_marine_dark_eve.webp'),
  'grad_aurora|dark|day': require('../../../../assets/images/v2scene/scene_bg_grad_aurora_dark_day.webp'),
  'grad_aurora|dark|eve': require('../../../../assets/images/v2scene/scene_bg_grad_aurora_dark_eve.webp'),
  'grad_iris|dark|day': require('../../../../assets/images/v2scene/scene_bg_grad_iris_dark_day.webp'),
  'grad_iris|dark|eve': require('../../../../assets/images/v2scene/scene_bg_grad_iris_dark_eve.webp'),
  'grad_magma|dark|day': require('../../../../assets/images/v2scene/scene_bg_grad_magma_dark_day.webp'),
  'grad_magma|dark|eve': require('../../../../assets/images/v2scene/scene_bg_grad_magma_dark_eve.webp'),
  'grad_midnight|dark|day': require('../../../../assets/images/v2scene/scene_bg_grad_midnight_dark_day.webp'),
  'grad_midnight|dark|eve': require('../../../../assets/images/v2scene/scene_bg_grad_midnight_dark_eve.webp'),
  'grad_champagne|dark|day': require('../../../../assets/images/v2scene/scene_bg_grad_champagne_dark_day.webp'),
  'grad_champagne|dark|eve': require('../../../../assets/images/v2scene/scene_bg_grad_champagne_dark_eve.webp'),
  'grad_jade|dark|day': require('../../../../assets/images/v2scene/scene_bg_grad_jade_dark_day.webp'),
  'grad_jade|dark|eve': require('../../../../assets/images/v2scene/scene_bg_grad_jade_dark_eve.webp'),
  'grad_orchid|dark|day': require('../../../../assets/images/v2scene/scene_bg_grad_orchid_dark_day.webp'),
  'grad_orchid|dark|eve': require('../../../../assets/images/v2scene/scene_bg_grad_orchid_dark_eve.webp'),
  'grad_ice|dark|day': require('../../../../assets/images/v2scene/scene_bg_grad_ice_dark_day.webp'),
  'grad_ice|dark|eve': require('../../../../assets/images/v2scene/scene_bg_grad_ice_dark_eve.webp'),
  'grad_coral|dark|day': require('../../../../assets/images/v2scene/scene_bg_grad_coral_dark_day.webp'),
  'grad_coral|dark|eve': require('../../../../assets/images/v2scene/scene_bg_grad_coral_dark_eve.webp'),
  'grad_lilac|dark|day': require('../../../../assets/images/v2scene/scene_bg_grad_lilac_dark_day.webp'),
  'grad_lilac|dark|eve': require('../../../../assets/images/v2scene/scene_bg_grad_lilac_dark_eve.webp'),
  'graphite|light|day': require('../../../../assets/images/v2scene/scene_bg_graphite_light_day.webp'),
  'graphite|light|eve': require('../../../../assets/images/v2scene/scene_bg_graphite_light_eve.webp'),
  'polar|light|day': require('../../../../assets/images/v2scene/scene_bg_polar_light_day.webp'),
  'polar|light|eve': require('../../../../assets/images/v2scene/scene_bg_polar_light_eve.webp'),
  'slate|light|day': require('../../../../assets/images/v2scene/scene_bg_slate_light_day.webp'),
  'slate|light|eve': require('../../../../assets/images/v2scene/scene_bg_slate_light_eve.webp'),
  'ink|light|day': require('../../../../assets/images/v2scene/scene_bg_ink_light_day.webp'),
  'ink|light|eve': require('../../../../assets/images/v2scene/scene_bg_ink_light_eve.webp'),
  'lavender|light|day': require('../../../../assets/images/v2scene/scene_bg_lavender_light_day.webp'),
  'lavender|light|eve': require('../../../../assets/images/v2scene/scene_bg_lavender_light_eve.webp'),
  'iris|light|day': require('../../../../assets/images/v2scene/scene_bg_iris_light_day.webp'),
  'iris|light|eve': require('../../../../assets/images/v2scene/scene_bg_iris_light_eve.webp'),
  'rose|light|day': require('../../../../assets/images/v2scene/scene_bg_rose_light_day.webp'),
  'rose|light|eve': require('../../../../assets/images/v2scene/scene_bg_rose_light_eve.webp'),
  'terracotta|light|day': require('../../../../assets/images/v2scene/scene_bg_terracotta_light_day.webp'),
  'terracotta|light|eve': require('../../../../assets/images/v2scene/scene_bg_terracotta_light_eve.webp'),
  'taupe|light|day': require('../../../../assets/images/v2scene/scene_bg_taupe_light_day.webp'),
  'taupe|light|eve': require('../../../../assets/images/v2scene/scene_bg_taupe_light_eve.webp'),
  'olive|light|day': require('../../../../assets/images/v2scene/scene_bg_olive_light_day.webp'),
  'olive|light|eve': require('../../../../assets/images/v2scene/scene_bg_olive_light_eve.webp'),
  'sage|light|day': require('../../../../assets/images/v2scene/scene_bg_sage_light_day.webp'),
  'sage|light|eve': require('../../../../assets/images/v2scene/scene_bg_sage_light_eve.webp'),
  'eucalyptus|light|day': require('../../../../assets/images/v2scene/scene_bg_eucalyptus_light_day.webp'),
  'eucalyptus|light|eve': require('../../../../assets/images/v2scene/scene_bg_eucalyptus_light_eve.webp'),
  'marine|light|day': require('../../../../assets/images/v2scene/scene_bg_marine_light_day.webp'),
  'marine|light|eve': require('../../../../assets/images/v2scene/scene_bg_marine_light_eve.webp'),
  'grad_aurora|light|day': require('../../../../assets/images/v2scene/scene_bg_grad_aurora_light_day.webp'),
  'grad_aurora|light|eve': require('../../../../assets/images/v2scene/scene_bg_grad_aurora_light_eve.webp'),
  'grad_iris|light|day': require('../../../../assets/images/v2scene/scene_bg_grad_iris_light_day.webp'),
  'grad_iris|light|eve': require('../../../../assets/images/v2scene/scene_bg_grad_iris_light_eve.webp'),
  'grad_magma|light|day': require('../../../../assets/images/v2scene/scene_bg_grad_magma_light_day.webp'),
  'grad_magma|light|eve': require('../../../../assets/images/v2scene/scene_bg_grad_magma_light_eve.webp'),
  'grad_midnight|light|day': require('../../../../assets/images/v2scene/scene_bg_grad_midnight_light_day.webp'),
  'grad_midnight|light|eve': require('../../../../assets/images/v2scene/scene_bg_grad_midnight_light_eve.webp'),
  'grad_champagne|light|day': require('../../../../assets/images/v2scene/scene_bg_grad_champagne_light_day.webp'),
  'grad_champagne|light|eve': require('../../../../assets/images/v2scene/scene_bg_grad_champagne_light_eve.webp'),
  'grad_jade|light|day': require('../../../../assets/images/v2scene/scene_bg_grad_jade_light_day.webp'),
  'grad_jade|light|eve': require('../../../../assets/images/v2scene/scene_bg_grad_jade_light_eve.webp'),
  'grad_orchid|light|day': require('../../../../assets/images/v2scene/scene_bg_grad_orchid_light_day.webp'),
  'grad_orchid|light|eve': require('../../../../assets/images/v2scene/scene_bg_grad_orchid_light_eve.webp'),
  'grad_ice|light|day': require('../../../../assets/images/v2scene/scene_bg_grad_ice_light_day.webp'),
  'grad_ice|light|eve': require('../../../../assets/images/v2scene/scene_bg_grad_ice_light_eve.webp'),
  'grad_coral|light|day': require('../../../../assets/images/v2scene/scene_bg_grad_coral_light_day.webp'),
  'grad_coral|light|eve': require('../../../../assets/images/v2scene/scene_bg_grad_coral_light_eve.webp'),
  'grad_lilac|light|day': require('../../../../assets/images/v2scene/scene_bg_grad_lilac_light_day.webp'),
  'grad_lilac|light|eve': require('../../../../assets/images/v2scene/scene_bg_grad_lilac_light_eve.webp'),
});

export function homeSceneBackdropKey(themeId: string, appearance: 'dark' | 'light', evening: boolean): string {
  return `${themeId}|${appearance}|${evening ? 'eve' : 'day'}`;
}

/** Фон сцены или null (тема без запечённого файла — вызывающий рисует прежние шейдеры). */
export function homeSceneBackdrop(themeId: string, appearance: 'dark' | 'light', evening: boolean): number | null {
  return HOME_SCENE_BACKDROPS[homeSceneBackdropKey(themeId, appearance, evening)] ?? null;
}

/** Белый ореол за героем: 128×128, радиальный, альфа 22 % в центре (положение/размер задаёт сцена: 168×168, x 57 %, y = topInset + HERO_TOP). */
export const HOME_SCENE_HALO: number = require('../../../../assets/images/v2scene/scene_halo.webp');
/** Угли вечера: 256×256 (на сцене 260×260, x −40, y = stageH − 200). */
export const HOME_SCENE_EMBER: number = require('../../../../assets/images/v2scene/scene_ember.webp');
/** Затемнение низа светлой сцены: 4×64, альфа 0 → 40 % сверху вниз; растягивается на высоту 300 у нижнего края. */
export const HOME_SCENE_SCRIM: number = require('../../../../assets/images/v2scene/scene_scrim.webp');

export type HomeSceneShadowMask = Readonly<{ source: number; width: number; height: number; margin: number; offsetY: number }>;
/**
 * Маски теней плит (белые, альфа = тень). Класс: tile (86×92, r20) · today (358×209, r28) · phrase (358×80, r18). Слой: dark · light · lightSoft.
 * Рисовать: Image позади плиты, разместить на (−margin) от каждого края плиты, растянуть на (ширина плиты + 2·margin) × (высота + 2·margin), tintColor = токен
 * (dark/light → g.plateShadow, lightSoft → g.plateShadowSoft); тёмная тема — один слой dark, светлая — light + lightSoft.
 */
export const HOME_SCENE_SHADOW_MASKS: Readonly<Record<'tile' | 'today' | 'phrase', Readonly<Record<'dark' | 'light' | 'lightSoft', HomeSceneShadowMask>>>> = Object.freeze({
  tile: Object.freeze({
    dark: { source: require('../../../../assets/images/v2scene/shadow_tile_dark.webp'), width: 174, height: 180, margin: 44, offsetY: 16 },
    light: { source: require('../../../../assets/images/v2scene/shadow_tile_light.webp'), width: 164, height: 170, margin: 39, offsetY: 14 },
    lightSoft: { source: require('../../../../assets/images/v2scene/shadow_tile_lightSoft.webp'), width: 98, height: 104, margin: 6, offsetY: 1 },
  }),
  today: Object.freeze({
    dark: { source: require('../../../../assets/images/v2scene/shadow_today_dark.webp'), width: 446, height: 297, margin: 44, offsetY: 16 },
    light: { source: require('../../../../assets/images/v2scene/shadow_today_light.webp'), width: 436, height: 287, margin: 39, offsetY: 14 },
    lightSoft: { source: require('../../../../assets/images/v2scene/shadow_today_lightSoft.webp'), width: 370, height: 221, margin: 6, offsetY: 1 },
  }),
  phrase: Object.freeze({
    dark: { source: require('../../../../assets/images/v2scene/shadow_phrase_dark.webp'), width: 446, height: 168, margin: 44, offsetY: 16 },
    light: { source: require('../../../../assets/images/v2scene/shadow_phrase_light.webp'), width: 436, height: 158, margin: 39, offsetY: 14 },
    lightSoft: { source: require('../../../../assets/images/v2scene/shadow_phrase_lightSoft.webp'), width: 370, height: 92, margin: 6, offsetY: 1 },
  }),
});
