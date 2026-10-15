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
/** Режим прокрутки страницы (последний уровень): окно не ниже 220 — башня читаема, остальное — прокруткой страницы. */
export const SPIRE_WINDOW_MIN = 220;

/** Высота обёртки полной карточки «Этаж N» вместе с верхним отступом: minHeight 72 + marginTop 12 (SpireFloorInfo). До первого замера — это значение. */
export const SPIRE_FLOOR_INFO_FULL_H = 84;
/** Высота обёртки компактной карточки: minHeight 44 + marginTop 8 (SpireFloorInfo). */
export const SPIRE_FLOOR_INFO_COMPACT_H = 52;
/** Сколько dp экономит компактный подиум: самая высокая колонка 56+8+21+8+16+8+88 = 205 → 44+8+21+8+16+8+60 = 165 (SpirePodium). */
export const SPIRE_PODIUM_COMPACT_SAVE = 40;

export const SPIRE_COMPACT_FLOOR_INFO_ENABLED = true;
/**
 * «Тонкая шапка» (координатор 15.10): первая ступень ужатия — заголовок «Пик» 34/40 → 24/30 и отступы 6 → 0 (−22 dp). ПОДГОТОВЛЕНА и ВЫКЛЮЧЕНА: включает координатор по реальным кадрам
 * (iPhone 390×844 при шрифте 1.0 уходит в режим прокрутки — слишком частый телефон). Башню над подиум не поднимаем (решение владельца 13.10).
 */
export const SPIRE_THIN_HEADER_ENABLED = false;
export const SPIRE_HEADER_THIN_SAVE = 22;

export type SpireStepId = 'header' | 'podium' | 'card';
/** Экономия каждой ступени, dp. header и podium лежат ВЫШЕ башни (двигают её верх), card — ниже башни (уменьшает карточку под окном). */
export const SPIRE_STEP_SAVE: Readonly<Record<SpireStepId, number>> = { header: SPIRE_HEADER_THIN_SAVE, podium: SPIRE_PODIUM_COMPACT_SAVE, card: SPIRE_FLOOR_INFO_FULL_H - SPIRE_FLOOR_INFO_COMPACT_H };
/** Порядок применения: что режем первым. Тонкая шапка — первая, когда включена. */
const STEPS_BASE: readonly SpireStepId[] = ['podium', 'card'];
const STEPS_WITH_HEADER: readonly SpireStepId[] = ['header', 'podium', 'card'];
// зачем: массивы стабильны по ссылке — хук бюджета держит их в зависимостях колбэков, новый массив на каждый рендер пересоздавал бы onLayout-колбэки
export function spireSteps(headerEnabled: boolean = SPIRE_THIN_HEADER_ENABLED): readonly SpireStepId[] {
  return headerEnabled ? STEPS_WITH_HEADER : STEPS_BASE;
}

/** Первый экран «вмещается», когда окно башни ≥ этого значения при ещё не применённых ступенях: ступень i включается при rawFit + экономия предыдущих ступеней < 180. */
export const SPIRE_LEVEL_FIT_BELOW = 180;
/** Гистерезис (Ревизор 15.10): на границе уже ужатый уровень держится, пока rawFit не уйдёт выше границы на эту величину. */
export const SPIRE_LEVEL_HYSTERESIS = 16;

/** Уровень = число применённых ступеней (0…steps.length); steps.length + 1 — режим прокрутки страницы. */
export type SpireLayoutLevel = number;

/** Границы по rawFit для набора ступеней: [включение 1-й ступени, 2-й, …, режим прокрутки]. Для ['podium','card']: [180, 140, 48]; с тонкой шапкой: [180, 158, 118, 26]. */
export function spireLevelLimits(steps: readonly SpireStepId[] = spireSteps()): readonly number[] {
  const limits: number[] = [];
  let saved = 0;
  for (const id of steps) {
    limits.push(SPIRE_LEVEL_FIT_BELOW - saved);
    saved += SPIRE_STEP_SAVE[id];
  }
  limits.push(SPIRE_WINDOW_MIN_FIT - saved);
  return limits;
}

/** prev — уровень предыдущего расчёта (гистерезис). rawFit не измерен (NaN) — уровень 0. */
export function spireLayoutLevel(rawFit: number, prev: SpireLayoutLevel = 0, steps: readonly SpireStepId[] = spireSteps(), enabled: boolean = SPIRE_COMPACT_FLOOR_INFO_ENABLED): SpireLayoutLevel {
  if (!enabled || !Number.isFinite(rawFit)) return 0;
  const limits = spireLevelLimits(steps);
  const below = (i: number): boolean => rawFit < limits[i] + (prev > i ? SPIRE_LEVEL_HYSTERESIS : 0);
  let level = 0;
  while (level < limits.length && below(level)) level += 1;
  return level;
}

/** Ступень применена на этом уровне (режим прокрутки — все полное). */
export function spireStepActive(level: SpireLayoutLevel, id: SpireStepId, steps: readonly SpireStepId[] = spireSteps()): boolean {
  const index = steps.indexOf(id);
  return index >= 0 && level > index && level <= steps.length;
}
export const spireHeaderThin = (level: SpireLayoutLevel, steps: readonly SpireStepId[] = spireSteps()): boolean => spireStepActive(level, 'header', steps);
export const spirePodiumCompact = (level: SpireLayoutLevel, steps: readonly SpireStepId[] = spireSteps()): boolean => spireStepActive(level, 'podium', steps);
export const spireCardCompact = (level: SpireLayoutLevel, steps: readonly SpireStepId[] = spireSteps()): boolean => spireStepActive(level, 'card', steps);
export const spireScrollMode = (level: SpireLayoutLevel, steps: readonly SpireStepId[] = spireSteps()): boolean => level === steps.length + 1;
/** Сколько dp применённые ступени выше башни (шапка, подиум) сняли с верха окна — прибавляется к измеренному верху, чтобы получить верх при полной раскладке. */
export function spireAboveTowerSaved(level: SpireLayoutLevel, steps: readonly SpireStepId[] = spireSteps()): number {
  return (['header', 'podium'] as const).reduce((sum, id) => sum + (spireStepActive(level, id, steps) ? SPIRE_STEP_SAVE[id] : 0), 0);
}

/**
 * rawFit — окно при полном подиуме и полной карточке без нижней границы. fullTowerTop — верх окна башни при ПОЛНОЙ раскладке (применённые ступени выше башни вызывающий прибавляет: spireAboveTowerSaved).
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
