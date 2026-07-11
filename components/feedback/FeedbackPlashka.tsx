/**
 * FeedbackPlashka — плашка разбора снизу (спек §2, AC 2/3).
 *
 * Въезжает снизу пружиной (Duolingo-мягкость), зелёная/красная по исходу,
 * заголовок + разбор. Цвета из useTheme() (t.correct/t.wrong + тёмный фон
 * карточки) — hex не хардкодим (кроме прозрачностей наложения). Тексты — через
 * props (никаких сырых строк в компоненте).
 *
 * Perf: анимация на UI-треде, монтируется только пока visible; при visible=false
 * уезжает вниз и зовёт onHidden. Без вечных циклов.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';

export type PlashkaKind = 'good' | 'bad';

export interface FeedbackPlashkaProps {
  visible: boolean;
  kind: PlashkaKind;
  title: string;
  subtitle?: string;
  /** Вызывается после того, как плашка полностью уехала вниз. */
  onHidden?: () => void;
  style?: StyleProp<ViewStyle>;
}

const IN_SPRING = { damping: 16, stiffness: 180, mass: 0.9 } as const;

export function FeedbackPlashka({
  visible,
  kind,
  title,
  subtitle,
  onHidden,
  style,
}: FeedbackPlashkaProps) {
  const { theme: t } = useTheme();
  const shown = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      shown.value = withSpring(1, IN_SPRING);
    } else {
      shown.value = withTiming(0, { duration: 200 }, (finished) => {
        'worklet';
        if (finished && onHidden) runOnJS(onHidden)();
      });
    }
    return () => cancelAnimation(shown);
  }, [visible, shown, onHidden]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: interpolate(shown.value, [0, 1], [140, 0]) }],
  }));

  const good = kind === 'good';
  const accent = good ? t.correct : t.wrong;
  const tintBg = good ? t.correctBg : t.wrongBg;

  return (
    <Animated.View
      pointerEvents={visible ? 'auto' : 'none'}
      style={[
        styles.wrap,
        {
          backgroundColor: t.bgCard,
          borderColor: accent,
          shadowColor: '#000',
        },
        animatedStyle,
        style,
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />
      <View style={[styles.iconDot, { backgroundColor: tintBg, borderColor: accent }]}>
        <Text style={[styles.iconGlyph, { color: accent }]}>{good ? '✓' : '!'}</Text>
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: accent }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: t.textPrimary }]} numberOfLines={4}>
            {subtitle}
          </Text>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 0,
    overflow: 'hidden',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  accentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  iconDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  iconGlyph: { fontSize: 18, fontWeight: '900', lineHeight: 22 },
  textCol: { flex: 1, paddingTop: 1 },
  title: { fontSize: 17, fontWeight: '900', letterSpacing: 0.2 },
  subtitle: { fontSize: 14, fontWeight: '600', marginTop: 4, lineHeight: 20 },
});

export default FeedbackPlashka;
