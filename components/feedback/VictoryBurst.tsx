/**
 * VictoryBurst — «мини-победа» для коротких заданий (спек §2 VictoryBurst, §2.1).
 *
 * Не полноэкранная секвенция, а карточка по центру с пружиной: заголовок + итог,
 * короткий конфетти-бурст (count 60), haptic success, звук через fk.milestone
 * (medal|chord). Уходит сам (autoHideMs) или по тапу. Стиль — язык PALETTE
 * DialogVictoryCelebration, но через токены useTheme (без хардкод-фона;
 * полупрозрачный backdrop допустим).
 *
 * Perf Bible §2.1: монтируется только на показ, конфетти конечное (ConfettiBurst),
 * автостоп, демонтаж по onDone. Без вечных циклов.
 */
import React, { useCallback, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import fk, { type MilestoneKind } from '../../app/feedback/feedback_kit';
import ConfettiBurst from './ConfettiBurst';

export interface VictoryStat {
  label: string;
  value: string;
}

export interface VictoryBurstProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  stats?: VictoryStat[];
  onDone: () => void;
  autoHideMs?: number;
  /** Какой финальный звук/веху сыграть на появление. */
  celebrateSound?: Extract<MilestoneKind, 'medal' | 'chord'>;
  /** Эмодзи-герой по центру карточки. */
  heroEmoji?: string;
  /**
   * Число частиц конфетти (усиление для «перфект»-финалов). Дефолт 60;
   * ConfettiBurst сам капит на ≤120 и делит на слабых устройствах (Perf Bible).
   */
  confettiCount?: number;
}

export function VictoryBurst({
  visible,
  title,
  subtitle,
  stats,
  onDone,
  autoHideMs = 2200,
  celebrateSound = 'medal',
  heroEmoji = '🎉',
  confettiCount = 60,
}: VictoryBurstProps) {
  const { theme: t } = useTheme();
  const shown = useSharedValue(0);
  const backdrop = useSharedValue(0);

  const dismiss = useCallback(() => {
    onDone();
  }, [onDone]);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(shown);
      cancelAnimation(backdrop);
      shown.value = 0;
      backdrop.value = 0;
      return;
    }
    // Звук/веха на появление (fk сам уважает тумблеры).
    fk.milestone(celebrateSound);

    backdrop.value = withTiming(1, { duration: 220 });
    shown.value = withSpring(1, { damping: 12, stiffness: 150, mass: 0.7 });

    // Авто-уход.
    backdrop.value = withDelay(
      Math.max(600, autoHideMs),
      withTiming(1, { duration: 0 }, (finished) => {
        'worklet';
        if (finished) runOnJS(dismiss)();
      }),
    );
    return () => {
      cancelAnimation(shown);
      cancelAnimation(backdrop);
    };
  }, [visible, autoHideMs, celebrateSound, shown, backdrop, dismiss]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value * 0.66 }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [
      { scale: interpolate(shown.value, [0, 1], [0.8, 1]) },
      { translateY: interpolate(shown.value, [0, 1], [20, 0]) },
    ],
  }));

  if (!visible) return null;

  return (
    <Pressable style={styles.overlay} onPress={dismiss} accessibilityRole="button">
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }, backdropStyle]}
      />
      <ConfettiBurst count={confettiCount} durationMs={1100} seed={7} />
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: t.bgCard, borderColor: t.accent },
          cardStyle,
        ]}
      >
        <Text style={styles.hero}>{heroEmoji}</Text>
        <Text style={[styles.title, { color: t.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: t.textMuted }]} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
        {stats && stats.length > 0 ? (
          <View style={styles.statsRow}>
            {stats.map((s, i) => (
              <View key={`vs-${i}`} style={[styles.statCard, { backgroundColor: t.bgSurface, borderColor: t.border }]}>
                <Text style={[styles.statValue, { color: t.accent }]}>{s.value}</Text>
                <Text style={[styles.statLabel, { color: t.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 28,
    borderRadius: 26,
    borderWidth: 1.5,
    maxWidth: 380,
    width: '100%',
  },
  hero: { fontSize: 60, textAlign: 'center' },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', marginTop: 8, letterSpacing: 0.2 },
  subtitle: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 6, lineHeight: 21 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statCard: {
    minWidth: 84,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '600', marginTop: 3 },
});

export default VictoryBurst;
