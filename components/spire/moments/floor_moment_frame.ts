// floor_moment_frame.ts — кадр башни в окне момента «Этаж пройден» (280 × 240): масштаб, ширина и сдвиг так, чтобы вся башня — от острия и ореола до основания — была в окне целиком.
//
// зачем (координатор 15.10, условие 3; правило владельца 14.10 «пик башни не обрезается, свет тоже»): статичные показы башни — всегда вся башня, вписанная масштабом, без прокрутки и затухания. Раньше окно
// центрировалось на следующем этаже и режело верх (шпиль, ореол) на 13–15 этаже, а нижние этажи резались по бокам кадра. Чистая функция — проверяется числами для всех 12 лиг и всех этажей
// (tests/spire_floor_moment_frame.test.ts), без React и измерений.
import type { SpireTowerSkin } from '../../../modules/spire/tower_skins';
import { spireTowerHeadroom } from '../spire_tower_bounds';
import { SPIRE_TOWER_GEOM, SPIRE_TW } from '../spire_tower_model';

export type FloorMomentFrame = Readonly<{
  /** Масштаб: px на единицу SVG. */
  k: number;
  /** Ширина башни, px. */
  towerW: number;
  /** translateY содержимого башни в окне, px (≤ 0: содержимое выше острия не показываем). */
  shift: number;
}>;

export function floorMomentFrame(skin: SpireTowerSkin, windowW: number, windowH: number): FloorMomentFrame {
  const crownTop = SPIRE_TOWER_GEOM.top - spireTowerHeadroom(skin, false); // верх границы башни (острие, ореол, поле) в единицах SVG
  const bottom = SPIRE_TOWER_GEOM.height; // низ содержимого: основание и земля
  const k = Math.min(windowW / SPIRE_TW, windowH / Math.max(1, bottom - Math.max(0, crownTop)));
  return { k, towerW: Math.round(SPIRE_TW * k), shift: -Math.round(Math.max(0, crownTop) * k) };
}
