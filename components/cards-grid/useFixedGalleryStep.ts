/**
 * Шаг сетки карточек — всегда нормальный вид (шаг 0): одна горизонтальная карточка на строку.
 *
 * зачем (владелец 22.10: «ползунок и щипок убираем, оставляем только нормальный вид»): прежний хук useCardsGridStep (щипок двумя пальцами, перетекание плиток 380 мс, запись выбора)
 * удалён. Галерея по-прежнему принимает step и morph, поэтому здесь отдаются постоянные значения: шаг 0 и «перетекания нет» (прогресс 1, масштаб 1, без сдвигов).
 * Сохранённый шаг прошлых версий сбрасывается на 0 (gallery_step_prefs, журнал [CARDS-GRID]).
 */
import { useMemo } from 'react';
import { useSharedValue, type SharedValue } from 'react-native-reanimated';

import { GALLERY_OPEN_STEP } from './cardsGalleryLayout';
import './gallery_step_prefs';

/** Состояние «перетекания» плиток; при фиксированном шаге всегда неподвижно (from = to, t = 1). */
export type GridMorph = Readonly<{
  from: SharedValue<number>;
  to: SharedValue<number>;
  t: SharedValue<number>;
  shift: SharedValue<number>;
  live: SharedValue<number>;
  fx: SharedValue<number>;
  fy: SharedValue<number>;
}>;

export function useFixedGalleryStep(): Readonly<{ step: number; morph: GridMorph }> {
  const from = useSharedValue<number>(GALLERY_OPEN_STEP);
  const to = useSharedValue<number>(GALLERY_OPEN_STEP);
  const t = useSharedValue<number>(1);
  const shift = useSharedValue<number>(0);
  const live = useSharedValue<number>(1);
  const fx = useSharedValue<number>(0);
  const fy = useSharedValue<number>(0);
  const morph = useMemo<GridMorph>(() => ({ from, to, t, shift, live, fx, fy }), [from, fx, fy, live, shift, t, to]);
  return useMemo(() => ({ step: GALLERY_OPEN_STEP, morph }), [morph]);
}
