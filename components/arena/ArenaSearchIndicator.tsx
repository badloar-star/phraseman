/**
 * Тихий индикатор «идёт поиск соперника» — в углу, поверх любого экрана.
 *
 * зачем (владелец 2026-09-20): «когда идет поиск то где в углу где не будет
 * мешать должен быть индикатор что идет поиск». Поиск теперь живёт вне экрана
 * Арены, и без такой метки человек не знает, что он вообще идёт: узнал бы
 * только когда прилетит тост находки.
 *
 * Намеренно НЕ кнопка и не карточка: маленькая метка у нижнего края, которая
 * не перехватывает касания (pointerEvents="none") и не закрывает содержимое.
 * Тап по ней не нужен — управление поиском живёт на экране Арены, а тост
 * находки придёт сам.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTournamentPalette } from '../ui/v2_theme';

export type ArenaSearchIndicatorProps = Readonly<{
  label: string;
  /** Пауза (приложение было свёрнуто) — пульс гаснет, метка остаётся. */
  paused: boolean;
  reduceMotion: boolean;
  bottomOffset: number;
}>;

export function ArenaSearchIndicator({
  label,
  paused,
  reduceMotion,
  bottomOffset,
}: ArenaSearchIndicatorProps) {
  const P = useTournamentPalette();
  const enter = useSharedValue(0);
  const pulse = useSharedValue(1);

  useEffect(() => {
    enter.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    return () => { cancelAnimation(enter); };
  }, [enter]);

  useEffect(() => {
    if (paused || reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 160 });
      return undefined;
    }
    // Дыхание точки: живёт циклами, как пульс поиска на экране Арены.
    pulse.value = withRepeat(
      withSequence(
        withTiming(0.45, { duration: 850, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => { cancelAnimation(pulse); };
  }, [paused, pulse, reduceMotion]);

  const shell = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 8 }],
  }));

  const dot = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Reanimated.View
      style={[styles.host, { bottom: bottomOffset }, shell]}
      pointerEvents="none"
    >
      <View style={[styles.pill, { backgroundColor: P.elev2 }]}>
        <Reanimated.View
          style={[styles.dot, { backgroundColor: paused ? P.muted : P.accent }, dot]}
        />
        <Text numberOfLines={1} style={[styles.label, { color: P.muted }]}>{label}</Text>
      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  // Левый нижний угол: правый занят плавающими кнопками экранов.
  host: { position: 'absolute', left: 12 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    maxWidth: 200,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  label: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
});
