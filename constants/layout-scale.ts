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
 * Повертає множник ~0.74–1.22 для шрифтів, ds.spacing, висот таб-бару тощо.
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
  if (wide < 640) {
    s *= 0.90;
  } else if (wide < 700) {
    s *= 0.95;
  }
  // Альбом або дуже широке вікно — трохи зменшуємо, щоб текст не роздувався
  if (aspect >= 1.85) {
    s *= 0.94;
  }
  return Math.min(1.14, Math.max(0.74, s));
}

/**
 * Эталонная ВЫСОТА телефона — iPhone 14/15 (844pt). От неё нормируем всё,
 * что упирается в вертикаль: высоту иллюстраций, макетов устройств, каруселей.
 */
export const REF_PHONE_HEIGHT = 844;

/**
 * Множитель ~0.80–1.0 по ВЫСОТЕ окна.
 *
 * зачем (владелец, 2026-08-23): computeUiScale считает от УЗКОЙ стороны
 * (ширины), и на iPhone SE она даёт ~0.87 — потому что ширина SE (375) почти
 * равна эталонной (390). Но короткая у SE именно ВЫСОТА: 667 против 844 = 0.79.
 * Из-за этого элементы, чей размер упирается в вертикаль (макет телефона в
 * онбординге, крупные иллюстрации), на низких экранах не ужимались и налезали
 * на текст. Ширинная шкала этот класс бага физически не видит.
 *
 * Верхняя граница 1.0: на высоких экранах ничего не раздуваем — там места и
 * так хватает, а рост иллюстраций ломал бы согласованный ритм макета.
 */
export function computeHeightScale(height: number): number {
  return Math.min(1, Math.max(0.8, height / REF_PHONE_HEIGHT));
}

/** Экран ниже 700pt — iPhone SE/8 и подобные. Целевой минимум — 667pt. */
export const BP_SHORT_SCREEN = 700;

export function isShortScreen(height: number): boolean {
  return height < BP_SHORT_SCREEN;
}
