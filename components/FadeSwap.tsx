// FadeSwap.tsx — скелет → контент без «щелчка» (ТОП-20 №18, владелец 04.11 «всё сделать», координатор 05.11).
//
// зачем: пока данные не готовы, экран рисует скелет, и в момент готовности контент подменял его жёстко — мигание. Здесь подмена мягкая: контент выходит из opacity 0 за 160 мс (transform/opacity,
// нативный драйвер, ни одного лишнего View сверх обёртки контента). Важно для скорости: если контент готов уже в первый кадр (кэш) — НИКАКОЙ анимации и никакой задержки первого кадра;
// играет только переход «скелет был показан → стал контент». Reduce Motion — мгновенно.
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle } from 'react-native';
import { useSystemReduceMotion } from '../hooks/use_system_reduce_motion';

export const FADE_SWAP_MS = 160;

type Props = Readonly<{
  /** Данные готовы — показываем children, иначе skeleton. */
  ready: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}>;

export function FadeSwap({ ready, skeleton, children, style }: Props): React.JSX.Element {
  const reduceMotion = useSystemReduceMotion();
  // скелет реально показывали → при готовности контент проявляется; если готово с первого кадра — сразу 1
  const skeletonShown = useRef(!ready);
  const opacity = useRef(new Animated.Value(ready ? 1 : 0)).current;
  useEffect(() => {
    if (!ready) { skeletonShown.current = true; opacity.setValue(0); return undefined; }
    if (!skeletonShown.current || reduceMotion) { opacity.setValue(1); return undefined; }
    const timing = Animated.timing(opacity, { toValue: 1, duration: FADE_SWAP_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    timing.start();
    return () => timing.stop();
  }, [ready, reduceMotion, opacity]);
  if (!ready) return <>{skeleton}</>;
  return <Animated.View style={[style, { opacity }]}>{children}</Animated.View>;
}

export default FadeSwap;
