// зачем: владелец попросил кнопку сохранения на КАЖДОЙ фразе и слове, которая
// пульсирует, пока человек ни разу ею не пользовался, а после нажатия отвечает
// анимацией. Раньше сохранение было спрятано за правильным ответом — человек не
// мог отложить слово, которое как раз не знает.
//
// зачем маленькая иконка, а не кнопка с текстом (владелец, 2026-08-17): текст
// «Сохранить фразу в карточки» растягивал кнопку почти на весь ряд действий и
// обрезал соседнюю «Ответить голосом». Смысл действия и так понятен по иконке
// закладки (тот же язык, что у платформенных «сохранить»); полная подпись
// осталась для программ чтения с экрана через accessibilityLabel.
//
// Правила владельца соблюдены: контейнер без обводки (разделяем тоном), подписи
// мелким шрифтом под названием нет, размер текста не ужимается.
import Ionicons from '@expo/vector-icons/Ionicons';
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
  // зачем 48×48 (владелец, 2026-08-17): та же высота, что у соседней кнопки
  // «Ответить голосом» (compactAction, minHeight: 48) — обе смотрятся парой,
  // а не разного размера. 48 — минимальная зона касания на iOS/Android.
  button: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
});

export default SaveToCardsButton;
