// ═══════════════════════════════════════════════════════════════════════════
// spire_tower_window.ts — высота окна башни Пика, чтобы низ окна не уходил под кнопку «Играть».
//
// зачем (координатор 13.10, строка 25 R1_BACKLOG; кадры spirecheck-001…004): после переноса «Комнаты недели» наверх окно башни начинается ниже,
// и на первом показе (страница в самом верху) его нижние этажи (1 скрыт, 2 наполовину) лежали под доком с кнопкой. Окно по макету — 400 dp;
// если до дока места меньше, окно ровно настолько ниже (не меньше MIN: остаются видны ≥ 5 этажей), а запас низа страницы не трогаем.
// Чистая функция: ни React, ни измерений — только числа из onLayout.
// ═══════════════════════════════════════════════════════════════════════════

/** Высота окна по макету (.tview). */
export const SPIRE_WINDOW_MAX = 400;
/** Ниже окно не сжимаем: башня остаётся читаемой, нижние этажи доступны прокруткой внутри окна. */
export const SPIRE_WINDOW_MIN = 220;
/**
 * Обычные телефоны (Pixel 8 412×915, iPhone 390×844 и крупнее, высота окна ≥ 800 dp): окно ужимается до 120, чтобы в начальном положении карточка «Этаж N» и «Играть» целиком стояли над доком
 * при шрифте 1.0 и 1.3 (решение координатора 15.10: макет не ломаем, автопрокрутки нет). На малых экранах (360×640) минимум 220 и обычная прокрутка — контент уходит под док с мягким затуханием.
 */
export const SPIRE_WINDOW_MIN_TALL = 120;
export const SPIRE_TALL_SCREEN_H = 800;

/**
 * Запасной вариант (решение координатора 15.10, ВЫКЛЮЧЕН до кадров Макетов): при крупном шрифте и узком окне башни карточка «Этаж N» переходит в компактную строку (этаж + прогресс), а окно
 * башни получает освободившееся место. Включается ОДНИМ флагом — когда на кадре Макетов этаж в окне ~130 dp не читается.
 */
export const SPIRE_COMPACT_FLOOR_INFO_ENABLED = false;
export const SPIRE_COMPACT_FONT_SCALE = 1.3;
export const SPIRE_COMPACT_WINDOW_H = 180;

export function spireFloorInfoCompact(fontScale: number, windowH: number, enabled: boolean = SPIRE_COMPACT_FLOOR_INFO_ENABLED): boolean {
  return enabled && fontScale >= SPIRE_COMPACT_FONT_SCALE && windowH > 0 && windowH < SPIRE_COMPACT_WINDOW_H;
}

/**
 * towerTop — верх окна башни в содержимом страницы; dockTop — верх дока в той же системе координат (страница в положении 0); gap — зазор над доком.
 * Не измерено (0) — прежняя высота по макету, чтобы первый кадр не прыгал в сторону уменьшения без данных.
 */
export function spireTowerWindowHeight(towerTop: number, dockTop: number, gap: number, screenH: number = 0): number {
  if (!(towerTop > 0) || !(dockTop > 0)) return SPIRE_WINDOW_MAX;
  const fit = Math.floor(dockTop - towerTop - gap);
  const min = screenH >= SPIRE_TALL_SCREEN_H ? SPIRE_WINDOW_MIN_TALL : SPIRE_WINDOW_MIN;
  return Math.min(SPIRE_WINDOW_MAX, Math.max(min, fit));
}
