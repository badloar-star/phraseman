import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { KIT_MOTION } from '../constants/motionHybrid';
import { useSystemReduceMotion } from '../hooks/use_system_reduce_motion';

// зачем: кривая создаётся лениво, при первом запуске анимации, а не при загрузке модуля — тесты, которые импортируют экран
// с урезанным react-native (без Easing), не должны падать на импорте.
let progressEase: ((t: number) => number) | null = null;
function getProgressEase(): (t: number) => number {
  if (!progressEase) {
    progressEase = Easing.bezier(
      KIT_MOTION.progressEase[0],
      KIT_MOTION.progressEase[1],
      KIT_MOTION.progressEase[2],
      KIT_MOTION.progressEase[3],
    );
  }
  return progressEase;
}

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
 * transform на нативном драйвере (без layout), первый кадр — сразу в нужной доле (без «роста с нуля» при заходе на
 * экран), reduce-motion — без движения. Намеренно на core Animated, а не на Reanimated: заливка стоит в экранах и
 * окнах, которые импортируются тестами без reanimated-мока.
 */
function KitProgressFillBase({ ratio, style, testID, accessible }: Props) {
  const target = Number.isFinite(ratio) ? Math.max(0, Math.min(1, ratio)) : 0;
  const reduceMotion = useSystemReduceMotion();
  const scale = useRef(new Animated.Value(target)).current;

  useEffect(() => {
    if (reduceMotion) {
      scale.stopAnimation();
      scale.setValue(target);
      return undefined;
    }
    Animated.timing(scale, {
      toValue: target,
      duration: KIT_MOTION.progressMs,
      easing: getProgressEase(),
      useNativeDriver: true,
    }).start();
    return () => scale.stopAnimation();
  }, [reduceMotion, scale, target]);

  return (
    <Animated.View
      testID={testID}
      accessible={accessible}
      style={[{ width: '100%', height: '100%', borderRadius: 3, transformOrigin: 'left' }, style, { transform: [{ scaleX: scale }] }]}
    />
  );
}

export const KitProgressFill = memo(KitProgressFillBase);
export default KitProgressFill;
