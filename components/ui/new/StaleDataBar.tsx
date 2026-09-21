/**
 * StaleDataBar — честная плашка «данные могли устареть».
 *
 * зачем (аудит 2026-09-21): баннер ошибки показывается ТОЛЬКО при полном провале
 * первой загрузки (`loadFailedNoData`). Если сеть отвалилась при фоновом
 * обновлении — человек молча смотрит вчерашние цифры и не знает об этом.
 * Макет: docs/v2/mockups/34-new-ui-scenes.html, сцена 10.
 *
 * ⚠️ СКЕЛЕТ. Пока НИ ОДИН экран его не импортирует.
 *
 * Почему золотой, а не красный: ничего не сломалось, данные просто старые.
 * Красный тон здесь был бы враньём о масштабе проблемы.
 *
 * Firebase-экономия (важно при подключении): плашка НЕ инициирует обновление
 * сама и не держит таймеров. Она лишь показывает состояние, которое экран уже
 * знает. «Обновить» — жест пользователя, единственный законный повод обойти
 * троттл (для лиги правило 6 часов остаётся, см. CLAUDE.md).
 */
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../ThemeContext';
import { MOTION_SPRING } from '../../../constants/motion';
import { useReduceMotion } from '../../../hooks/use_reduce_motion';

export type StaleDataBarProps = Readonly<{
  visible: boolean;
  /** Готовый текст с временем: «Чужие очки от 14:20 — обновить не удалось». */
  message: string;
  actionLabel: string;
  /** Идёт повторная попытка: текст меняется, ГЕОМЕТРИЯ нет (без прыжка). */
  busy?: boolean;
  busyLabel?: string;
  onRetry: () => void;
}>;

export default function StaleDataBar({
  visible,
  message,
  actionLabel,
  busy = false,
  busyLabel,
  onRetry,
}: StaleDataBarProps) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotion();
  const enter = useSharedValue(0);

  React.useEffect(() => {
    if (reduceMotion) {
      enter.value = visible ? 1 : 0;
      return;
    }
    enter.value = visible
      ? withSpring(1, {
          damping: MOTION_SPRING.ui.damping,
          stiffness: MOTION_SPRING.ui.stiffness,
          mass: MOTION_SPRING.ui.mass,
        })
      : withTiming(0, { duration: 180 });
  }, [enter, reduceMotion, visible]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * -8 }],
  }));

  const handleRetry = useCallback(() => {
    if (busy) {
      // guard-ok: ранний выход объясняет причину навсегда. Иначе «кнопка не
      // работает» — а она просто занята предыдущей попыткой.
      console.warn('[STALE-BAR] retry:ignored_busy'); // guard-ok
      return;
    }
    if (__DEV__) console.log('[STALE-BAR] retry');
    onRetry();
  }, [busy, onRetry]);

  if (!visible) return null;

  return (
    <Reanimated.View
      style={[styles.wrap, { backgroundColor: t.goldBg }, style]}
      accessibilityRole="alert"
    >
      <Ionicons name="time-outline" size={20} color={t.gold} />
      <Text style={[styles.text, { color: t.textPrimary, fontSize: f.caption }]} numberOfLines={2}>
        {message}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={busy ? busyLabel : actionLabel}
        accessibilityState={{ disabled: busy }}
        hitSlop={10}
        onPress={handleRetry}
        style={({ pressed }) => [styles.action, { opacity: pressed && !busy ? 0.55 : 1 }]}
      >
        <Text style={[styles.actionText, { color: busy ? t.textGhost : t.gold, fontSize: f.caption }]}>
          {busy ? busyLabel : actionLabel}
        </Text>
      </Pressable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  text: { flex: 1, minWidth: 0, fontWeight: '700', lineHeight: 19 },
  action: { paddingHorizontal: 2, paddingVertical: 4 },
  actionText: { fontWeight: '800' },
});
