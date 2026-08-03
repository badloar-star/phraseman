import React, { memo, useEffect, useRef } from 'react';
import { Animated, AppState, Easing, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';
import type { LeagueHubPalette } from './leagueHubPalette';

/**
 * Пульсирующий красный чип «Горячие 2 часа» для шапки Лиги.
 * Пульс — цикл, загажен useIsScreenFocused + AppState (паттерн AvatarAura,
 * файл зарегистрирован в runtime_lifecycle_ratchet).
 */

interface LeagueHotHoursChipProps {
  text: string;
  palette: LeagueHubPalette;
}

function LeagueHotHoursChipComponent({ text, palette }: LeagueHotHoursChipProps) {
  const reduceMotion = useReduceMotion();
  const isFocused = useIsScreenFocused();
  const pulse = useRef(new Animated.Value(1)).current;

  const shouldAnimate = !reduceMotion && isFocused;
  useEffect(() => {
    if (!shouldAnimate) {
      pulse.setValue(1);
      return undefined;
    }
    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      pulse.setValue(1);
      loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 550, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]));
      loop.start();
    };
    const stop = () => {
      loop?.stop();
      loop = null;
    };

    // Анимируем только на переднем плане — в фоне нет смысла перерисовывать.
    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      stop();
    };
  }, [shouldAnimate, pulse]);

  // зачем: на светлой теме бледно-красная плашка под обводкой не читалась.
  // Плотная заливка тоном (и без обводки — запрет владельца) даёт тот же
  // «горячий» сигнал, но чип видно на любом фоне.
  const chipFill = palette.isLight ? 'rgba(176,58,68,0.14)' : 'rgba(255,91,108,0.2)';

  return (
    <Animated.View
      testID="league-hot-hours-chip"
      accessibilityLabel={text}
      style={[styles.chip, { backgroundColor: chipFill, transform: [{ scale: pulse }] }]}
    >
      <Ionicons name="flame" size={13} color={palette.negative} />
      <Text style={[styles.text, { color: palette.negative }]}>{text}</Text>
    </Animated.View>
  );
}

export const LeagueHotHoursChip = memo(LeagueHotHoursChipComponent);

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  text: { fontSize: 12, fontWeight: '900' },
});
