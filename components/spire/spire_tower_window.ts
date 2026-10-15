// ═══════════════════════════════════════════════════════════════════════════
// spire_tower_window.ts — высота окна башни Пика и режим карточки «Этаж N», чтобы окно, карточка и «Играть» не налезали друг на друга.
//
// зачем (координатор 13.10, строка 25 R1_BACKLOG; кадры spirecheck-001…004): после переноса «Комнаты недели» наверх окно башни начинается ниже,
// и на первом показе (страница в самом верху) его нижние этажи лежали под доком с кнопкой. Окно по макету — 400 dp; если до дока места меньше — окно ровно настолько ниже.
// зачем (координатор 15.10, 🔴 кадр Pixel 8, шрифт 1.0): модель верха окна считалась ДО загрузки подиума (306 dp), а с подиумом верх окна 554 dp — окно 116, карточка «Этаж 1» под «Играть».
// Теперь три режима по реальному месту (rawFit — окно, какое вышло бы при ПОЛНОЙ карточке):
//   • rawFit ≥ 180 — обычный: окно по месту (до 400), карточка полная;
//   • 88 ≤ rawFit < 180 — компактный: карточка одна строка (−32 dp), окно получает эти 32 dp и не ниже 120 — первый экран вмещает башню, карточку и «Играть»;
//   • rawFit < 88 — места нет и в компактном виде (подиум и шрифт съели экран): окно 220 и обычная прокрутка страницы (как на 360×640), карточка полная.
// Чистые функции: ни React, ни измерений — только числа из onLayout.
// ═══════════════════════════════════════════════════════════════════════════

/** Высота окна по макету (.tview). */
export const SPIRE_WINDOW_MAX = 400;
/** Режим прокрутки страницы (места на первом экране нет): окно не ниже 220 — башня читаема, остальное — прокруткой страницы. */
export const SPIRE_WINDOW_MIN = 220;
/** Компактный режим: окно не ниже 120 — иначе он не нужен (см. SPIRE_COMPACT_MIN_RAW_FIT). */
export const SPIRE_WINDOW_MIN_COMPACT = 120;

/** Высота обёртки полной карточки «Этаж N» вместе с верхним отступом: minHeight 72 + marginTop 12 (SpireFloorInfo). До первого замера — это значение. */
export const SPIRE_FLOOR_INFO_FULL_H = 84;
/** Высота обёртки компактной карточки: minHeight 44 + marginTop 8 (SpireFloorInfo). */
export const SPIRE_FLOOR_INFO_COMPACT_H = 52;

export const SPIRE_COMPACT_FLOOR_INFO_ENABLED = true;
/** Компактный режим включается при rawFit < 180 … */
export const SPIRE_COMPACT_WINDOW_H = 180;
/** … гистерезис (Ревизор 15.10): выключается только при rawFit > 196 — раскладка не качается на границе. */
export const SPIRE_COMPACT_WINDOW_H_OFF = 196;
/** … и только если компактная карточка даёт окну ≥ 120: rawFit + экономия ≥ SPIRE_WINDOW_MIN_COMPACT. Ниже — режим прокрутки страницы. */
export const SPIRE_COMPACT_MIN_RAW_FIT = SPIRE_WINDOW_MIN_COMPACT - (SPIRE_FLOOR_INFO_FULL_H - SPIRE_FLOOR_INFO_COMPACT_H);
/** Нижний гистерезис: уже компактная карточка держится до rawFit 80, чтобы дрожь замера не качала раскладку. */
export const SPIRE_COMPACT_MIN_RAW_FIT_HOLD = SPIRE_COMPACT_MIN_RAW_FIT - 8;

/** rawFit — высота окна башни, какая вышла бы при полной карточке (0 = не измерено). */
export function spireFloorInfoCompact(rawFit: number, wasCompact: boolean = false, enabled: boolean = SPIRE_COMPACT_FLOOR_INFO_ENABLED): boolean {
  if (!enabled || !Number.isFinite(rawFit)) return false;
  return wasCompact
    ? rawFit >= SPIRE_COMPACT_MIN_RAW_FIT_HOLD && rawFit <= SPIRE_COMPACT_WINDOW_H_OFF
    : rawFit >= SPIRE_COMPACT_MIN_RAW_FIT && rawFit < SPIRE_COMPACT_WINDOW_H;
}

/** Окно при полной карточке без нижней границы — нужно только для решения «компактно или нет». Не измерено — NaN (режим «обычный»). */
export function spireTowerRawFit(towerTop: number, dockTop: number, gap: number, fullInfoH: number = SPIRE_FLOOR_INFO_FULL_H): number {
  if (!(towerTop > 0) || !(dockTop > 0)) return Number.NaN;
  return Math.floor(dockTop - towerTop - gap - fullInfoH);
}

/**
 * towerTop — верх окна башни в содержимом страницы; dockTop — верх дока в той же системе координат (страница в положении 0); gap — зазор над доком + высота карточки под окном.
 * Не измерено (0) — прежняя высота по макету, чтобы первый кадр не прыгал в сторону уменьшения без данных.
 */
export function spireTowerWindowHeight(towerTop: number, dockTop: number, gap: number, compact: boolean = false): number {
  if (!(towerTop > 0) || !(dockTop > 0)) return SPIRE_WINDOW_MAX;
  const fit = Math.floor(dockTop - towerTop - gap);
  return Math.min(SPIRE_WINDOW_MAX, Math.max(compact ? SPIRE_WINDOW_MIN_COMPACT : SPIRE_WINDOW_MIN, fit));
}
