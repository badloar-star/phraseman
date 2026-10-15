// ═══════════════════════════════════════════════════════════════════════════
// spire_tower_window.ts — высота окна башни Пика и ступени ужатия верха экрана, чтобы окно, карточка «Этаж N» и «Играть» не налезали друг на друга.
//
// зачем (координатор 13.10, строка 25 R1_BACKLOG; кадры spirecheck-001…004): после переноса «Комнаты недели» наверх окно башни начинается ниже,
// и на первом показе (страница в самом верху) его нижние этажи лежали под доком с кнопкой. Окно по макету — 400 dp; если до дока места меньше — окно ровно настолько ниже.
// зачем (координатор 15.10, 🔴 кадр Pixel 8, шрифт 1.0): модель верха окна считалась ДО загрузки подиума (306 dp), а с подиумом верх окна 554 dp — окно 116, карточка «Этаж 1» под «Играть».
// Порядок ужатия (решение координатора 15.10), rawFit — окно, какое вышло бы при ПОЛНОМ подиуме и ПОЛНОЙ карточке:
//   • уровень 0: rawFit ≥ 180 — всё полное, окно по месту (до 400);
//   • уровень 1: 140 ≤ rawFit < 180 — компактный подиум (−40 dp), карточка полная;
//   • уровень 2: 48 ≤ rawFit < 140 — компактный подиум и карточка одной строкой (ещё −32 dp); окно не ниже 120;
//   • уровень 3: rawFit < 48 — места нет и так: всё полное, окно 220, обычная прокрутка страницы (как на 360×640).
// Решение считается от rawFit, а не от текущего окна: компактный подиум и компактная карточка меняют само окно, и от него зависящее решение качало бы раскладку. Гистерезис 16 dp на каждой границе.
// Чистые функции: ни React, ни измерений — только числа из onLayout.
// ═══════════════════════════════════════════════════════════════════════════

/** Высота окна по макету (.tview). */
export const SPIRE_WINDOW_MAX = 400;
/** Нижняя граница, пока всё помещается на первый экран (уровни 0–2): окно не ниже 120 — иначе уровень выше. */
export const SPIRE_WINDOW_MIN_FIT = 120;
/** Режим прокрутки страницы (уровень 3): окно не ниже 220 — башня читаема, остальное — прокруткой страницы. */
export const SPIRE_WINDOW_MIN = 220;

/** Высота обёртки полной карточки «Этаж N» вместе с верхним отступом: minHeight 72 + marginTop 12 (SpireFloorInfo). До первого замера — это значение. */
export const SPIRE_FLOOR_INFO_FULL_H = 84;
/** Высота обёртки компактной карточки: minHeight 44 + marginTop 8 (SpireFloorInfo). */
export const SPIRE_FLOOR_INFO_COMPACT_H = 52;
/** Сколько dp экономит компактный подиум: самая высокая колонка 56+8+21+8+16+8+88 = 205 → 44+8+21+8+16+8+60 = 165 (SpirePodium). */
export const SPIRE_PODIUM_COMPACT_SAVE = 40;

export const SPIRE_COMPACT_FLOOR_INFO_ENABLED = true;
/** Границы уровней по rawFit (см. шапку): ниже 180 — компактный подиум; ниже 140 (= окно после подиума < 180) — ещё и строка этажа; ниже 48 (= 120 − 40 − 32) — режим прокрутки. */
export const SPIRE_LEVEL_PODIUM_BELOW = 180;
export const SPIRE_LEVEL_CARD_BELOW = SPIRE_LEVEL_PODIUM_BELOW - SPIRE_PODIUM_COMPACT_SAVE;
export const SPIRE_LEVEL_SCROLL_BELOW = SPIRE_WINDOW_MIN_FIT - SPIRE_PODIUM_COMPACT_SAVE - (SPIRE_FLOOR_INFO_FULL_H - SPIRE_FLOOR_INFO_COMPACT_H);
/** Гистерезис (Ревизор 15.10): на границе уже ужатый уровень держится, пока rawFit не уйдёт выше границы на эту величину. */
export const SPIRE_LEVEL_HYSTERESIS = 16;

export type SpireLayoutLevel = 0 | 1 | 2 | 3;

/** prev — уровень предыдущего расчёта (гистерезис). rawFit не измерен (NaN) — уровень 0. */
export function spireLayoutLevel(rawFit: number, prev: SpireLayoutLevel = 0, enabled: boolean = SPIRE_COMPACT_FLOOR_INFO_ENABLED): SpireLayoutLevel {
  if (!enabled || !Number.isFinite(rawFit)) return 0;
  const below = (limit: number, wasBelow: boolean): boolean => rawFit < limit + (wasBelow ? SPIRE_LEVEL_HYSTERESIS : 0);
  if (!below(SPIRE_LEVEL_PODIUM_BELOW, prev >= 1)) return 0;
  if (!below(SPIRE_LEVEL_CARD_BELOW, prev >= 2)) return 1;
  if (!below(SPIRE_LEVEL_SCROLL_BELOW, prev >= 3)) return 2;
  return 3;
}

export const spirePodiumCompact = (level: SpireLayoutLevel): boolean => level === 1 || level === 2;
export const spireCardCompact = (level: SpireLayoutLevel): boolean => level === 2;
export const spireScrollMode = (level: SpireLayoutLevel): boolean => level === 3;

/**
 * rawFit — окно при полном подиуме и полной карточке без нижней границы. fullTowerTop — верх окна башни В ПОЛНОМ подиуме (если подиум сейчас компактный, вызывающий прибавляет SPIRE_PODIUM_COMPACT_SAVE).
 * Не измерено — NaN (уровень 0).
 */
export function spireTowerRawFit(fullTowerTop: number, dockTop: number, gap: number, fullInfoH: number = SPIRE_FLOOR_INFO_FULL_H): number {
  if (!(fullTowerTop > 0) || !(dockTop > 0)) return Number.NaN;
  return Math.floor(dockTop - fullTowerTop - gap - fullInfoH);
}

/**
 * towerTop — верх окна башни в содержимом страницы (как есть, с текущим подиумом); dockTop — верх дока в той же системе координат (страница в положении 0);
 * gap — зазор над доком + высота карточки под окном. Не измерено (0) — прежняя высота по макету, чтобы первый кадр не прыгал в сторону уменьшения без данных.
 */
export function spireTowerWindowHeight(towerTop: number, dockTop: number, gap: number, scrollMode: boolean = false): number {
  if (!(towerTop > 0) || !(dockTop > 0)) return SPIRE_WINDOW_MAX;
  const fit = Math.floor(dockTop - towerTop - gap);
  return Math.min(SPIRE_WINDOW_MAX, Math.max(scrollMode ? SPIRE_WINDOW_MIN : SPIRE_WINDOW_MIN_FIT, fit));
}
