import React, { useEffect } from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';

export type StatBar = {
  /** Уникальный ключ (например дата дня). */
  key: string;
  /** Нормализованная высота 0..1. */
  ratio: number;
  /** Активен ли столбик (неактивные — приглушённый «пенёк»). */
  active: boolean;
  /** Подпись над столбиком (например «25 XP» / «3 мин»). */
  topLabel?: string;
  /** Подпись под столбиком (например «Пн»). */
  bottomLabel: string;
  /** Выделить как «сегодня». */
  highlight?: boolean;
};

type StatBarsProps = {
  bars: StatBar[];
  accent: string;
  /** Светлый цвет верхушки для вертикального градиента. */
  accentSoft?: string;
  /** Фон неактивного «пенька». */
  inactiveColor: string;
  /** Цвет точки-маркера под «сегодня». */
  todayDotColor?: string;
  height?: number;
  /** Цвета подписей. */
  topLabelColor: string;
  topLabelMutedColor: string;
  bottomLabelColor: string;
  bottomLabelMutedColor: string;
  /** Задержка старта (для каскада карточек). */
  delayMs?: number;
  style?: ViewStyle;
};

const PLOT_H_DEFAULT = 88;
const MIN_ACTIVE_H = 14;
const STUMP_H = 8;

function Bar({
  bar,
  index,
  plotH,
  accent,
  accentSoft,
  inactiveColor,
  delayMs,
}: {
  bar: StatBar;
  index: number;
  plotH: number;
  accent: string;
  accentSoft?: string;
  inactiveColor: string;
  delayMs: number;
}) {
  const targetH = bar.active
    ? Math.max(MIN_ACTIVE_H, Math.round(bar.ratio * plotH))
    : STUMP_H;
  const grow = useSharedValue(0);

  useEffect(() => {
    grow.value = 0;
    grow.value = withDelay(
      delayMs + index * 55,
      withSpring(1, { damping: 14, stiffness: 130, mass: 0.7 }),
    );
    return () => cancelAnimation(grow);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetH, index, delayMs]);

  const animStyle = useAnimatedStyle(() => ({
    height: Math.max(2, targetH * grow.value),
  }));

  return (
    <View style={{ height: plotH, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
      <Reanimated.View
        style={[
          {
            width: '78%',
            maxWidth: 30,
            borderRadius: 9,
            backgroundColor: bar.active ? accent : inactiveColor,
            opacity: bar.active ? 1 : 0.55,
            overflow: 'hidden',
          },
          animStyle,
        ]}
      >
        {bar.active && accentSoft ? (
          // Имитация вертикального градиента двумя слоями (без SVG):
          // светлая «шапка» сверху на фоне основного accent.
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '55%', backgroundColor: accentSoft, opacity: 0.9 }} />
        ) : null}
      </Reanimated.View>
    </View>
  );
}

/**
 * Killer бар-чарт недели: столбики «вырастают» пружиной каскадом при появлении,
 * активные — с градиентной шапкой, «сегодня» подсвечен точкой-маркером.
 */
export function StatBars({
  bars,
  accent,
  accentSoft,
  inactiveColor,
  todayDotColor,
  height = PLOT_H_DEFAULT,
  topLabelColor,
  topLabelMutedColor,
  bottomLabelColor,
  bottomLabelMutedColor,
  delayMs = 0,
  style,
}: StatBarsProps) {
  return (
    <View style={[styles.row, style]}>
      {bars.map((bar, i) => (
        <View key={bar.key} style={styles.col}>
          {bar.topLabel ? (
            <Text style={[styles.topLabel, { color: bar.highlight ? topLabelColor : topLabelMutedColor }]} numberOfLines={1}>
              {bar.topLabel}
            </Text>
          ) : <View style={{ height: 12 }} />}
          <Bar
            bar={bar}
            index={i}
            plotH={height}
            accent={accent}
            accentSoft={accentSoft}
            inactiveColor={inactiveColor}
            delayMs={delayMs}
          />
          <View style={styles.bottomWrap}>
            <Text style={[styles.bottomLabel, { color: bar.highlight ? bottomLabelColor : bottomLabelMutedColor, fontWeight: bar.highlight ? '900' : '700' }]} numberOfLines={1}>
              {bar.bottomLabel}
            </Text>
            {bar.highlight && todayDotColor ? (
              <View style={[styles.todayDot, { backgroundColor: todayDotColor }]} />
            ) : <View style={{ height: 4, marginTop: 3 }} />}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: 7, paddingHorizontal: 2 },
  col: { flex: 1, alignItems: 'center', gap: 5 },
  topLabel: { fontSize: 9, fontWeight: '800' },
  bottomWrap: { alignItems: 'center' },
  bottomLabel: { fontSize: 10 },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
});

export default StatBars;
