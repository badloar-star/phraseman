// ═══════════════════════════════════════════════════════════════════════════
// spire_tower_bounds.ts — внешняя граница башни Пика: острие, навершие, древко флага и ореол света.
//
// зачем (закон владельца 14.10, скрин «ИТОГ НЕДЕЛИ · Ты поднимаешься в Базальт»: «ПИК БАШНИ НЕ ДОЛЖЕН НИЧЕМ ОБРЕЗАТЬСЯ ВООБЩЕ (СВЕТ ТОЖЕ)»):
// контейнер башни (viewBox, запас сверху, окно, тур, карточка) считается ИЗ ЭТОЙ границы, а не из магических чисел. Нет места — масштаб ниже, не клип.
// Числа геометрии — те же, что в SpireTowerSvg.Crown: барабан 34, конус 168, ореол — круг с центром apex − 14 и радиусом glowR
// (у «вершины недели» премиум-лиги ×2.6), навершие — apex − 16, древко флага — apex − 34 (с флажком) или apex − 12.
// Сторож: tests/spire_tower_no_clip_contract.test.ts (12 лиг × {обычное, вершина}).
// ═══════════════════════════════════════════════════════════════════════════
import type { SpireTowerSkin } from '../../modules/spire/tower_skins';
import { SPIRE_CX, SPIRE_TOWER_GEOM, SPIRE_TW } from './spire_tower_model';
import { spireFinialTopY } from './SpireTowerFinial';

/** Высота барабана и конуса кровли над верхним этажом (Crown: yd = top − 34, apex = yd − 168). */
export const SPIRE_CROWN_DRUM = 34;
export const SPIRE_CROWN_CONE = 168;
/** Запас от самой границы до края контейнера, ед. SVG: свет не упирается в край. Решение координатора 15.10 (правило владельца 14.10): не меньше 16 до края — острие и ореол не касаются шапки окна. */
export const SPIRE_TOWER_EDGE_MARGIN = 16;
/** Во сколько раз ореол «вершины недели» крупнее обычного (Crown: skin.glowR * 2.6). */
export const SPIRE_SUMMIT_GLOW_SCALE = 2.6;
/** Ширина флажка вправо от древка (Crown: h18). */
const PENNANT_W = 19;

export type SpireTowerBounds = Readonly<{ minX: number; maxX: number; minY: number; apex: number; glowR: number; cx: number }>;

/** Граница башни: summit = «вершина недели» (ореол ×2.6 и навершие ×1.25 только у премиум-лиг). */
export function spireTowerBounds(skin: SpireTowerSkin, summit: boolean, top: number = SPIRE_TOWER_GEOM.top): SpireTowerBounds {
  const apex = top - SPIRE_CROWN_DRUM - SPIRE_CROWN_CONE;
  const big = skin.premium && summit;
  const glowR = big ? skin.glowR * SPIRE_SUMMIT_GLOW_SCALE : skin.glowR;
  const glowTop = apex - 14 - glowR; // guard-ok: геометрия SVG, не баланс
  const finialTop = skin.premium ? spireFinialTopY(skin.finial, apex - 16, big) : apex - 16 - 5.5; // guard-ok: геометрия SVG, не баланс
  const poleTop = skin.premium ? apex - (skin.pennant ? 34 : 12) : apex - 12;
  const half = Math.max(glowR, skin.pennant && skin.premium ? PENNANT_W + 2 : 0);
  return { minX: SPIRE_CX - half, maxX: SPIRE_CX + half, minY: Math.min(glowTop, finialTop, poleTop), apex, glowR, cx: SPIRE_CX };
}

/** Запас над верхним этажом, который нужен башне этой лиги и состояния (от верха верхнего этажа вверх до границы + поле), ед. SVG. */
export function spireTowerHeadroom(skin: SpireTowerSkin, summit: boolean): number {
  return SPIRE_TOWER_GEOM.top - spireTowerBounds(skin, summit).minY + SPIRE_TOWER_EDGE_MARGIN;
}

/** Наибольший запас среди всех переданных лиг в обоих состояниях — столько обязана давать геометрия башни сверху (TOP_PAD). */
export function spireMaxTowerHeadroom(skins: readonly SpireTowerSkin[]): number {
  let max = 0;
  for (const skin of skins) {
    for (const summit of [false, true]) max = Math.max(max, spireTowerHeadroom(skin, summit));
  }
  return max;
}

export type SpireViewBox = Readonly<{ x: number; y: number; w: number; h: number }>;

/**
 * viewBox верхушки башни для карточки «Итог недели»: вся граница (острие, навершие, древко, ореол) + поле внутри; низ — как прежде (верх этажей 14–15).
 * Ширина не уже прежних 192 и не уже ореолу; сверху ничего не обрезается.
 */
export function spireWeekTopViewBox(skin: SpireTowerSkin, summit: boolean): SpireViewBox {
  const b = spireTowerBounds(skin, summit);
  const half = Math.max(96, b.glowR + SPIRE_TOWER_EDGE_MARGIN, SPIRE_CX - b.minX + SPIRE_TOWER_EDGE_MARGIN);
  const y = b.minY - SPIRE_TOWER_EDGE_MARGIN;
  const bottom = SPIRE_TOWER_GEOM.top + 106; // как у прежнего viewBox: верх 14-го этажа и Стража-15
  return { x: SPIRE_CX - half, y, w: half * 2, h: bottom - y };
}

/** Ширина башни целиком в её системе координат: границы не должны выходить за [0, SPIRE_TW]. */
export const SPIRE_TOWER_VIEW_WIDTH = SPIRE_TW;

/**
 * Сколько единиц SVG нужно окну, чтобы показать башню целиком с ореолом и свой этаж: от верха границы (с полем) до низа своего этажа.
 * floorBottomOffset — низ своего этажа относительно верха верхнего этажа (fl.y + fl.h − geom.top).
 */
export function spireTowerNeedUnits(headroom: number, floorBottomOffset: number): number {
  return headroom + floorBottomOffset;
}

/**
 * Масштаб башни под окно (закон владельца 14.10: «ничем не обрезаться вообще»; координатор: «при нехватке места — меньше масштаб»):
 * не больше базового (по ширине), но так, чтобы нужные единицы влезли в высоту окна. Срез допустим только при ручной прокрутке человеком.
 */
export function spireTowerFitScale(baseScale: number, windowH: number, needUnits: number): number {
  return needUnits > 0 && windowH > 0 ? Math.min(baseScale, windowH / needUnits) : baseScale;
}
