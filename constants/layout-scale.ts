/**
 * Єдиний множник масштабу UI від розміру вікна (dp/pt).
 * Еталон телефона — вузька сторона ~390 (iPhone 14); менші пристрої зменшують шкалу,
 * планшети й широкі екрани — збільшують. Орієнтація враховується через min/max(width,height).
 */

export const BP_TABLET = 600;
export const BP_LARGE_TABLET = 840;

/** Логічна ширина «типового» телефона — звідси нормуємо шрифти й відступи */
export const REF_PHONE_MIN_DIMENSION = 390;

/**
 * Повертає множник ~0.82–1.22 для шрифтів, ds.spacing, висот таб-бару тощо.
 * Не замінює користувацький FONT_SCALE у ThemeContext — множиться з ним.
 */
export function computeUiScale(width: number, height: number): number {
  const narrow = Math.min(width, height);
  const wide = Math.max(width, height);
  const aspect = wide / Math.max(1, narrow);

  if (narrow >= BP_LARGE_TABLET) {
    return Math.min(1.22, Math.max(1.06, narrow / 820));
  }
  if (narrow >= BP_TABLET) {
    return Math.min(1.14, Math.max(1.02, narrow / 700));
  }

  let s = narrow / REF_PHONE_MIN_DIMENSION;
  // Альбом або дуже широке вікно — трохи зменшуємо, щоб текст не роздувався
  if (aspect >= 1.85) {
    s *= 0.94;
  }
  return Math.min(1.14, Math.max(0.82, s));
}
