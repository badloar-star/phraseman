import React, { useEffect, useRef } from 'react';
import { Animated, Easing, type StyleProp, type ViewStyle, type ViewProps } from 'react-native';
import { useSystemReduceMotion } from '../../hooks/use_system_reduce_motion';

/**
 * Один общий пульс на ГРУППУ статичных скелетонов (Волна 2, пункт 18; владелец одобрил 04.11): вместо N мёртвых серых плашек —
 * мягкое дыхание всей группы (opacity 1 ↔ .62, ~1,1 с на ход, нативный драйвер), одно значение анимации на группу, а не на строку.
 * Только opacity: геометрия обёртки и детей не меняется (первый кадр = финальная раскладка, как требует layout_stability).
 * Reduce Motion — статично. Пульс живёт, пока скелетон смонтирован, и останавливается при размонтировании.
 */
const PULSE_LOW = 0.62;
const PULSE_HALF_MS = 1100;

export function SkeletonPulse({ children, style, ...rest }: Readonly<ViewProps & { children?: React.ReactNode; style?: StyleProp<ViewStyle> }>): React.JSX.Element {
  const reduceMotion = useSystemReduceMotion();
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return undefined;
    }
    let alive = true;
    const step = (to: number) => {
      if (!alive) return;
      Animated.timing(opacity, { toValue: to, duration: PULSE_HALF_MS, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
        if (finished && alive) step(to === PULSE_LOW ? 1 : PULSE_LOW);
      });
    };
    try {
      step(PULSE_LOW);
    } catch (error) {
      console.warn('[SKELETON-PULSE] пульс не запущен — скелетон остаётся статичным', error instanceof Error ? error.message : String(error)); // guard-ok: catch с причиной
    }
    return () => { alive = false; opacity.stopAnimation(); };
  }, [opacity, reduceMotion]);

  return <Animated.View {...rest} style={[style, { opacity }]}>{children}</Animated.View>;
}

export default SkeletonPulse;
