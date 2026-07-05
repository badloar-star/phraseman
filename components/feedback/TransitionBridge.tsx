/**
 * TransitionBridge — универсальный мостик между заданиями (спек §2 TransitionBridge, AC 5).
 *
 * Обобщение по ОБРАЗЦУ app/personal_plan_exercise_transition.tsx (иконка типа +
 * подпись, короткий показ, уходит сам), но самостоятельный компонент — старый
 * экран плана НЕ редактируется и остаётся визуально прежним (спек §10.3). На
 * показ зовёт fk.transition() («вжух»). Fade + scale появление, авто-уход через
 * durationMs, затем onDone.
 *
 * Perf: монтируется только пока visible; анимации на UI-треде, отменяются на
 * unmount. Без вечных циклов.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import fk from '../../app/feedback/feedback_kit';

export interface TransitionBridgeProps {
  visible: boolean;
  /** Иконка типа задания (обычно <Ionicons/>). Передаётся хостом. */
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Сколько держать мостик до авто-ухода. */
  durationMs?: number;
  onDone: () => void;
  style?: StyleProp<ViewStyle>;
}

export function TransitionBridge({
  visible,
  icon,
  title,
  subtitle,
  durationMs = 800,
  onDone,
  style,
}: TransitionBridgeProps) {
  const { theme: t } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    // «Вжух» на показ.
    fk.transition();
    const hold = Math.max(200, durationMs);
    // появление (spring) → держим → уход (fade) → onDone
    progress.value = withSequence(
      withSpring(1, { damping: 15, stiffness: 160, mass: 0.8 }),
      withDelay(
        hold,
        withTiming(0, { duration: 220 }, (finished) => {
          'worklet';
          if (finished) runOnJS(onDone)();
        }),
      ),
    );
    return () => cancelAnimation(progress);
  }, [visible, durationMs, progress, onDone]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.85, 1]) },
      { translateY: interpolate(progress.value, [0, 1], [24, 0]) },
    ],
  }));

  if (!visible) return null;

  return (
    <View style={[styles.overlay, style]} pointerEvents="none">
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: t.bgCard, borderColor: t.border },
          cardStyle,
        ]}
      >
        {icon ? (
          <View style={[styles.iconRing, { backgroundColor: t.accentBg, borderColor: t.accent }]}>
            {icon}
          </View>
        ) : null}
        <Text style={[styles.title, { color: t.textPrimary }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: t.textMuted }]} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 32,
    borderRadius: 24,
    borderWidth: 1,
    maxWidth: 360,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '900', textAlign: 'center', letterSpacing: 0.2 },
  subtitle: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 8, lineHeight: 21 },
});

export default TransitionBridge;
