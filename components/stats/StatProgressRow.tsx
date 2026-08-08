import React, { useEffect } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import { StatCountUpText } from './StatCountUpText';

type StatProgressRowProps = {
  /** 0..100 — заполнение дорожки. */
  percent: number;
  label: string;
  /** Иконка слева (Ionicons). Если не задана — без чипа. */
  icon?: keyof typeof Ionicons.glyphMap;
  accent: string;
  accentSoft?: string;
  trackColor: string;
  iconChipBg?: string;
  labelColor: string;
  valueColor: string;
  /** Суффикс значения справа (по умолчанию «%»). */
  valueSuffix?: string;
  /** Показывать значение справа как count-up. */
  showValue?: boolean;
  delayMs?: number;
  style?: ViewStyle;
};

/**
 * Горизонтальная дорожка-прогресс: заполняется пружиной до `percent` при
 * появлении, с count-up значением справа. Для перцентилей, целей, прогресса
 * пари — везде, где данные это доля 0..100.
 */
export function StatProgressRow({
  percent,
  label,
  icon,
  accent,
  accentSoft,
  trackColor,
  iconChipBg,
  labelColor,
  valueColor,
  valueSuffix = '%',
  showValue = true,
  delayMs = 0,
  style,
}: StatProgressRowProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = 0;
    fill.value = withDelay(delayMs, withSpring(clamped / 100, { damping: 15, stiffness: 120, mass: 0.8 }));
    return () => cancelAnimation(fill);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, delayMs]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, fill.value * 100))}%`,
  }));

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.headerRow}>
        {icon ? (
          <View style={[styles.chip, { backgroundColor: iconChipBg ?? accent + '24' }]}>
            <Ionicons name={icon} size={16} color={accent} />
          </View>
        ) : null}
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          {label}
        </Text>
        {showValue ? (
          <StatCountUpText
            value={clamped}
            suffix={valueSuffix}
            delayMs={delayMs}
            style={[styles.value, { color: valueColor }]}
          />
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <Reanimated.View style={[styles.fill, { backgroundColor: accent }, fillStyle]}>
          {accentSoft ? (
            <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '45%', backgroundColor: accentSoft, opacity: 0.85 }} />
          ) : null}
        </Reanimated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 7 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: '800' },
  value: { fontSize: 15, fontWeight: '900' },
  track: { height: 9, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6, overflow: 'hidden', minWidth: 6 },
});

export default StatProgressRow;
