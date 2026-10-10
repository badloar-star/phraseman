import React, { memo, useEffect } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { KIT_MOTION } from '../constants/motionHybrid';

const PROGRESS_EASE = Easing.bezier(
  KIT_MOTION.progressEase[0],
  KIT_MOTION.progressEase[1],
  KIT_MOTION.progressEase[2],
  KIT_MOTION.progressEase[3],
);

type Props = Readonly<{
  /** Доля 0..1; вне диапазона и NaN зажимаются. */
  ratio: number;
  /** Цвет/скругление заливки; ширина и высота — 100 % трека, левый край неподвижен. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
  accessible?: boolean;
}>;

/**
 * Заливка полосы прогресса кита 2.0: `.trk > i` — width 800 мс cubic-bezier(.2,.8,.2,1) (kit.css:134).
 * зачем (координатор 10.10, гейт «приложение = макет»): полосы практики/слов/глаголов/предлогов/опроса ставили
 * scaleX мгновенно (скачок на каждый ответ) — теперь одна заливка на всех: число и кривая из KIT_MOTION, едет через
 * transform (UI-поток, без layout), первый кадр — сразу в нужной доле (без «роста с нуля» при заходе на экран),
 * reduce-motion — без движения.
 */
function KitProgressFillBase({ ratio, style, testID, accessible }: Props) {
  const target = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(target);

  useEffect(() => {
    if (reduceMotion) {
      cancelAnimation(scale);
      scale.value = target;
      return undefined;
    }
    scale.value = withTiming(target, { duration: KIT_MOTION.progressMs, easing: PROGRESS_EASE });
    return () => cancelAnimation(scale);
  }, [reduceMotion, scale, target]);

  const animated = useAnimatedStyle(() => ({ transform: [{ scaleX: scale.value }] }));

  return (
    <Reanimated.View
      testID={testID}
      accessible={accessible}
      style={[{ width: '100%', height: '100%', borderRadius: 3, transformOrigin: 'left' }, style, animated]}
    />
  );
}

export const KitProgressFill = memo(KitProgressFillBase);
export default KitProgressFill;
