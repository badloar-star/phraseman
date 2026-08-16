// зачем: владелец попросил кнопку сохранения на КАЖДОЙ фразе и слове, которая
// пульсирует, пока человек ни разу ею не пользовался, а после нажатия отвечает
// анимацией. Раньше сохранение было спрятано за правильным ответом — человек не
// мог отложить слово, которое как раз не знает.
//
// Правила владельца соблюдены: контейнер без обводки (разделяем тоном), подписи
// мелким шрифтом под названием нет, размер текста не ужимается.
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { useReduceMotion } from '../hooks/use_reduce_motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SaveToCardsButtonProps {
  readonly label: string;
  readonly savedLabel: string;
  /** Карточка уже в наборе — кнопка показывает это и больше не зовёт. */
  readonly saved: boolean;
  /** Человек ещё ни разу ничего не сохранял: зовём вниманием. */
  readonly pulse: boolean;
  readonly disabled?: boolean;
  readonly onSave: () => void;
  readonly colors: {
    readonly surface: string;
    readonly text: string;
    readonly muted: string;
    readonly accent: string;
  };
  readonly testID?: string;
}

export function SaveToCardsButton({
  label,
  savedLabel,
  saved,
  pulse,
  disabled = false,
  onSave,
  colors,
  testID,
}: SaveToCardsButtonProps) {
  const reduceMotion = useReduceMotion();
  // зачем: владелец жаловался, что приложение греет телефон. Бесконечный пульс
  // обязан замирать на невидимом экране — экраны в табах не размонтируются,
  // и без этой привязки анимация крутилась бы в фоне вечно.
  const focused = useIsScreenFocused();
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  // Пульс — это приглашение, а не украшение: живёт до первого сохранения и
  // глохнет при системном «уменьшить движение».
  const invite = pulse && !saved && !disabled && !reduceMotion && focused;

  useEffect(() => {
    if (!invite) {
      cancelAnimation(glow);
      glow.value = withTiming(0, { duration: 180 });
      return;
    }
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(0.15, { duration: 900, easing: Easing.in(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(glow);
  }, [glow, invite]);

  const handlePress = useCallback(() => {
    if (disabled || saved) return;
    // Optimistic UI: отклик мгновенный — пружина и хаптик срабатывают до того,
    // как карточка реально записана. Сеть догоняет фоном.
    void hapticTap();
    scale.value = withSequence(
      withTiming(0.92, { duration: 90, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 9, stiffness: 220 }),
    );
    void hapticSuccess();
    onSave();
  }, [disabled, onSave, saved, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  // Зов рисуем отдельным слоем под кнопкой: сама кнопка не меняет размер,
  // поэтому соседние элементы не дёргаются.
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.5,
    transform: [{ scale: 1 + glow.value * 0.08 }],
  }));

  return (
    <View style={styles.wrap}>
      {invite ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.glow,
            glowStyle,
            { backgroundColor: colors.accent },
          ]}
        />
      ) : null}
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={saved ? savedLabel : label}
        accessibilityState={{ disabled, selected: saved }}
        disabled={disabled}
        onPress={handlePress}
        testID={testID}
        style={({ pressed }) => [
          styles.button,
          animatedStyle,
          {
            backgroundColor: colors.surface,
            opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
          },
        ]}
      >
        <Ionicons
          name={saved ? 'bookmark' : 'bookmark-outline'}
          size={20}
          color={saved ? colors.accent : colors.text}
        />
        <Text
          numberOfLines={1}
          style={[styles.text, { color: saved ? colors.accent : colors.text }]}
        >
          {saved ? savedLabel : label}
        </Text>
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative', alignSelf: 'flex-start' },
  glow: {
    position: 'absolute',
    left: -6,
    right: -6,
    top: -6,
    bottom: -6,
    borderRadius: 22,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 16,
  },
  text: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
});

export default SaveToCardsButton;
