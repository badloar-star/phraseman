// coin_flight_bulge.ts — вынос дуги полёта монеты вправо (чистая функция, без React Native).
//
// зачем (Ревизор eb6f98f9f 🟡): крайняя правая точка пути dx·p + bulge·sin(πp) при dx > 0 приходится ПОЗЖЕ середины p = 0,5,
// поэтому расчёт «по середине» мог вынести монету за правый край окна. Считаем по точкам p вдоль всего пути, один раз на полёт.
export const COIN_SIZE = 18;
export const EDGE_MARGIN = 14;
export const MAX_BULGE = 160;
export const BULGE_SAMPLES = 20;

/**
 * Наибольший bulge (px), при котором ни в одной из BULGE_SAMPLES точек пути монета не заходит за правый край окна
 * (с зазором EDGE_MARGIN от центра монеты и её половиной), не больше MAX_BULGE и не меньше 0.
 */
export function coinFlightBulge(fromX: number, dx: number, windowWidth: number): number {
  const limit = windowWidth - EDGE_MARGIN - COIN_SIZE / 2;
  let bulge = MAX_BULGE;
  for (let i = 1; i < BULGE_SAMPLES; i += 1) {
    const p = i / BULGE_SAMPLES;
    const room = limit - fromX - dx * p;
    bulge = Math.min(bulge, room / Math.sin(Math.PI * p));
  }
  return Math.max(0, bulge);
}
