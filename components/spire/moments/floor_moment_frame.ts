// floor_moment_frame.ts — кадр башни в окне момента «Этаж пройден» (280 × 240): масштаб, ширина и сдвиг так, чтобы на верхних этажах башня со шпилем и ореолом не резалась.
//
// зачем (Ревизор 15.10, R02; закон владельца 14.10 «пик башни не обрезается, свет тоже»): центровка окна на следующем этаже срезала верх башни на 13–15 этаже. Чистая функция — проверяется
// числами для всех 12 лиг (tests/spire_floor_moment_frame.test.ts), без React и измерений.
import type { SpireTowerSkin } from '../../../modules/spire/tower_skins';
import { spireTowerFitScale, spireTowerHeadroom, spireTowerNeedUnits } from '../spire_tower_bounds';
import { spireCrownTopY, spireWindowScrollY } from '../spire_tower_crown';
import { SPIRE_FLOOR_COUNT, SPIRE_TOWER_GEOM, SPIRE_TW } from '../spire_tower_model';

export type FloorMomentFrame = Readonly<{
  /** Масштаб: px на единицу SVG. */
  k: number;
  /** Ширина башни, px. */
  towerW: number;
  /** translateY содержимого башни в окне, px (≤ 0 на верхних этажах). */
  shift: number;
  /** Верхние этажи (13–15): включены вписывание масштабом и прижатие к верху башни. */
  nearTop: boolean;
}>;

export function floorMomentFrame(skin: SpireTowerSkin, nextFloor: number, windowW: number, windowH: number): FloorMomentFrame {
  const floorIdx = Math.max(0, Math.min(SPIRE_FLOOR_COUNT, nextFloor) - 1);
  const focus = SPIRE_TOWER_GEOM.floors[floorIdx]!;
  const nearTop = nextFloor >= SPIRE_FLOOR_COUNT - 2;
  const baseK = windowW / SPIRE_TW;
  if (!nearTop) {
    return { k: baseK, towerW: Math.round(SPIRE_TW * baseK), shift: Math.round(windowH / 2 - (focus.y + focus.h / 2) * baseK), nearTop };
  }
  const headroom = spireTowerHeadroom(skin, false);
  const k = spireTowerFitScale(baseK, windowH, spireTowerNeedUnits(headroom, focus.y + focus.h - SPIRE_TOWER_GEOM.top));
  const cy = (focus.y + focus.h / 2) * k;
  const scrollY = spireWindowScrollY({ cy, windowH, crownTopY: spireCrownTopY(SPIRE_TOWER_GEOM.top, k, headroom), floorHalf: (focus.h / 2) * k, nearTop: true });
  return { k, towerW: Math.round(SPIRE_TW * k), shift: -Math.round(scrollY), nearTop };
}
