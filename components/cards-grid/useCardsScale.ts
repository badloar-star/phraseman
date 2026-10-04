/**
 * Масштаб галереи карточек: общее значение 0…1, щипок двумя пальцами и плавный переход (макет cards-gallery, LOCKED:cards-engine).
 *
 * зачем: щипок меняет масштаб покадрово «вживую» (как setScale(live) макета), а программная смена (ползунок, кнопка) идёт плавным переходом 460 мс.
 * Расхождение пальцев (scale > 1) делает карточки крупнее: масштаб уменьшается на (ratio − 1) · 0.8.
 */
import { Easing, runOnJS, useSharedValue, withTiming } from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { useMemo } from 'react';

const clamp01 = (value: number): number => {
  'worklet';
  return Math.max(0, Math.min(1, value));
};

export function useCardsScale(initial = 0.3, onSettled?: (value: number) => void) {
  const scale = useSharedValue(clamp01(initial));
  const startScale = useSharedValue(clamp01(initial));
  const gesture = useMemo(() => Gesture.Pinch()
    .onStart(() => { startScale.value = scale.value; })
    .onUpdate((event) => { scale.value = clamp01(startScale.value - (event.scale - 1) * 0.8); })
    .onEnd(() => { if (onSettled) runOnJS(onSettled)(scale.value); }), [onSettled, scale, startScale]);
  const animateTo = (value: number) => {
    scale.value = withTiming(clamp01(value), { duration: 460, easing: Easing.bezier(0.2, 1, 0.3, 1) });
    if (onSettled) onSettled(clamp01(value));
  };
  return { scale, gesture, animateTo };
}
