// АВТОГЕНЕРАЦИЯ — не править руками.
// Источник: scripts/avatar100/build_fit_table.mjs по файлам admin/v2/avatars/avatar100-v1/.
//
// зачем: макет-эталон приводит КАЖДЫЙ вырез к одному видимому силуэту, иначе
// одни существа выглядят крошечными, а другие огромными (замер по 106 файлам
// дал разброс 2.1x). Формула та же, что в макете: силуэт -> TARGET_SILHOUETTE,
// низ существа -> TARGET_BOTTOM, центр по X. Доли, а не пиксели, — размер гекса
// на разных экранах разный.

export type Avatar100Fit = Readonly<{ scale: number; translateX: number; translateY: number }>;

/** Доля гекса, которую занимает силуэт существа. */
export const AVATAR100_TARGET_SILHOUETTE = 1;
/** Низ существа прижат сюда — «воздуха» над нижней V не остаётся. */
export const AVATAR100_TARGET_BOTTOM = 0.965;

export const AVATAR100_FITS: Readonly<Record<string, Avatar100Fit>> = Object.freeze({
  'custom-gen-94:white': { scale: 1.969, translateX: -0.0038, translateY: -0.1273 },
  'custom-gen-101:white': { scale: 1.816, translateX: -0.0035, translateY: -0.0811 },
  'custom-gen-102:white': { scale: 2.048, translateX: 0, translateY: -0.151 },
  'custom-gen-112:white': { scale: 1.313, translateX: 0, translateY: 0.0701 },
});
