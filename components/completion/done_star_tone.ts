import { legibleOn } from '../../constants/liquidGlassSurfaceRoles';

/**
 * Невыбитая звезда экрана итога: тон контрола, но не слабее макета (practice.html `.stars3 .i.off` #2C2C2E на чёрном ≈ 1,5).
 * зачем (контраст-гейт OTA 25.10, Темы): opaqueControl на фоне экрана давал 1,00 в светлых темах и до 1,09 в тёмных —
 * человек видел одну звезду и не понимал, что их три. Где тон уже ≥ 1,5, цвет не меняется (сходство с макетом сохранено).
 * Отдельный модуль: экран и сторож берут одну функцию, сторож не тянет за собой экран.
 */
export const DONE_STAR_OFF_MIN = 1.5;

export function doneStarOffTone(g: { opaqueControl: string; text: string; bg: string; bgTop?: string; bgBottom?: string }): string {
  const surfaces = [g.bg, g.bgTop, g.bgBottom].filter((x): x is string => typeof x === 'string');
  return legibleOn(g.opaqueControl, g.text, surfaces, DONE_STAR_OFF_MIN);
}
