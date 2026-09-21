/**
 * OfflineDataNotice — «нет интернета, эти цифры от 14:20».
 *
 * зачем (аудит 2026-09-21, одобрено владельцем): экран молча показывал кэш,
 * когда сети нет, и человек не понимал, что видит вчерашние данные. Владелец
 * уточнил: показывать ТОЛЬКО при отсутствии интернета и БЕЗ кнопки «Обновить» —
 * без сети она ничего не сделает и только обманет.
 *
 * Чем отличается от глобального OfflineBanner: тот говорит «нет соединения»
 * вообще, этот — КОНКРЕТНО про данные на экране («чужие очки от 14:20»).
 * Источник состояния у них ОДИН (subscribeNetStatus) — второго детектора сети
 * в приложении заводить нельзя.
 *
 * Сеть вернулась → плашка уезжает сама, данные подтягиваются молча, без тоста:
 * результат виден на самом экране.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import Reanimated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';

import { useTheme } from '../../ThemeContext';
import { MOTION_SPRING } from '../../../constants/motion';
import { useReduceMotion } from '../../../hooks/use_reduce_motion';
import { subscribeNetStatus } from '../../../app/net_status';

export type OfflineDataNoticeProps = Readonly<{
  /**
   * Готовый текст с временем данных: «Чужие очки от 14:20».
   * Экран сам знает, ЧТО у него устарело — компонент это не угадывает.
   * Пустая строка/undefined → плашка не показывается даже в офлайне: нечего
   * сообщать, если кэша ещё нет.
   */
  message?: string | null;
}>;

export default function OfflineDataNotice({ message }: OfflineDataNoticeProps) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotion();
  const [online, setOnline] = useState(true);
  const enter = useSharedValue(0);

  useEffect(() => {
    // Тот же источник, что у глобального OfflineBanner — один детектор сети.
    const unsubscribe = subscribeNetStatus((next) => setOnline(next));
    return unsubscribe;
  }, []);

  const visible = !online && !!message;

  useEffect(() => {
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

  if (!visible) return null;

  return (
    <Reanimated.View
      accessibilityRole="alert"
      accessibilityLabel={message ?? undefined}
      // Тон золотой, а не красный: ничего не сломалось, данные просто старые.
      style={[styles.wrap, { backgroundColor: t.goldBg }, style]}
      testID="offline-data-notice"
    >
      <Ionicons name="cloud-offline-outline" size={19} color={t.gold} />
      <Text style={[styles.text, { color: t.textPrimary, fontSize: f.caption }]} numberOfLines={2}>
        {message}
      </Text>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  text: { flex: 1, minWidth: 0, fontWeight: '700', lineHeight: 19 },
});
