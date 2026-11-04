// DoneTick.tsx — общий «успех» для итоговых моментов (волна 3 UX-приятностей, владелец 04.11): мягкое появление пружиной + один лёгкий хаптик.
//
// зачем: галочки и итоговые значки появлялись мгновенно и без отклика (промокод принят, обращение отправлено, итог теста, задача дня выполнена).
// PopIn оборачивает любой значок: transform scale (0.6 → 1, пружина SUITE.pulse) + opacity, больше ничего — раскладка не меняется, цвета и размеры приходят от вызывающего.
// Без «движения»: при системной настройке «уменьшить движение» значок появляется сразу, хаптик остаётся (это обратная связь, а не анимация).
// `play` = false — значок уже был показан раньше (повторное открытие экрана): рисуем сразу, без пружины и без хаптика.
import React, { useEffect, useRef } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SUITE } from '../constants/motionHybrid';
import { hapticSuccess } from '../hooks/use-haptics';
import { useSystemReduceMotion } from '../hooks/use_system_reduce_motion';

const POP_FROM_SCALE = 0.6;
const POP_FADE_MS = 140;

type PopInProps = Readonly<{
  children: React.ReactNode;
  /** Проиграть появление и хаптик. false — показать сразу (уже виденный успех). */
  play?: boolean;
  /** Лёгкий хаптик успеха в момент появления (по умолчанию да). */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function PopIn({ children, play = true, haptic = true, style }: PopInProps): React.JSX.Element {
  const reduceMotion = useSystemReduceMotion();
  const animate = play && !reduceMotion;
  const scale = useRef(new Animated.Value(animate ? POP_FROM_SCALE : 1)).current;
  const opacity = useRef(new Animated.Value(animate ? 0 : 1)).current;
  useEffect(() => {
    if (!play) return undefined;
    if (haptic) void hapticSuccess().catch((error: unknown) => console.warn('[DONE-TICK] haptic failed', error instanceof Error ? error.message : String(error)));
    if (!animate) return undefined;
    const spring = Animated.spring(scale, { toValue: 1, ...SUITE.pulse, useNativeDriver: true });
    const fade = Animated.timing(opacity, { toValue: 1, duration: POP_FADE_MS, useNativeDriver: true });
    Animated.parallel([spring, fade]).start();
    return () => { spring.stop(); fade.stop(); };
    // зачем: один раз на появление; смена play/haptic после показа ничего не должна перезапускать
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>;
}

type DoneTickProps = Readonly<{
  size?: number;
  color: string;
  /** Имя значка Ionicons; по умолчанию галочка. */
  name?: React.ComponentProps<typeof Ionicons>['name'];
  play?: boolean;
  haptic?: boolean;
  testID?: string;
}>;

/** Галочка «готово»: PopIn вокруг Ionicons. Скрыта от скринридера — состояние называет родитель. */
export function DoneTick({ size = 18, color, name = 'checkmark', play = true, haptic = true, testID }: DoneTickProps): React.JSX.Element {
  return (
    <PopIn play={play} haptic={haptic} style={styles.box}>
      <Ionicons testID={testID} name={name} size={size} color={color} accessible={false} />
    </PopIn>
  );
}

// зачем: обычный объект вместо StyleSheet.create — модуль безопасно импортируется и там, где react-native урезан (тесты)
const styles = { box: { alignItems: 'center', justifyContent: 'center' } } as const satisfies Record<string, ViewStyle>;
