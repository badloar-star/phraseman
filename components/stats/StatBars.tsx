import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, type ViewStyle } from 'react-native';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  cancelAnimation,
} from 'react-native-reanimated';
import { AdaptiveLabel } from '../text-integrity/AdaptiveLabel';

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
  /** Значение для скраб-пузыря (видно только пока палец на графике). */
  scrubLabel?: string;
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
  /**
   * Скраб-режим: постоянных подписей над столбиками нет; пока палец на
   * графике — зажатый столбик подсвечен, над ним пузырь со значением и датой.
   */
  scrubEnabled?: boolean;
  /** Цвет вспышки-подсветки зажатого столбика. */
  scrubHighlightColor?: string;
  scrubBubbleBg?: string;
  scrubBubbleBorder?: string;
  scrubValueColor?: string;
  scrubCaptionColor?: string;
  /** Первый скраб за сессию (экран гасит подсказку и пишет флаг в сторадж). */
  onScrubStart?: () => void;
};

const PLOT_H_DEFAULT = 88;
const MIN_ACTIVE_H = 14;
const STUMP_H = 8;
const BUBBLE_W = 96;
const BUBBLE_ZONE_H = 42;
const ROW_GAP = 7;

function Bar({
  bar,
  index,
  plotH,
  accent,
  accentSoft,
  inactiveColor,
  delayMs,
  pressed,
  pressedColor,
}: {
  bar: StatBar;
  index: number;
  plotH: number;
  accent: string;
  accentSoft?: string;
  inactiveColor: string;
  delayMs: number;
  pressed?: boolean;
  pressedColor?: string;
}) {
  const targetH = bar.active
    ? Math.max(MIN_ACTIVE_H, Math.round(bar.ratio * plotH))
    : STUMP_H;
  const grow = useSharedValue(0);
  const pressGlow = useSharedValue(0);

  useEffect(() => {
    grow.value = 0;
    grow.value = withDelay(
      delayMs + index * 55,
      withSpring(1, { damping: 14, stiffness: 130, mass: 0.7 }),
    );
    return () => cancelAnimation(grow);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetH, index, delayMs]);

  useEffect(() => {
    pressGlow.value = withTiming(pressed ? 1 : 0, { duration: 110 });
    return () => cancelAnimation(pressGlow);
  }, [pressed, pressGlow]);

  const animStyle = useAnimatedStyle(() => ({
    height: Math.max(2, targetH * grow.value),
  }));

  const pressStyle = useAnimatedStyle(() => ({
    opacity: pressGlow.value * 0.3,
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
        {pressedColor ? (
          // Вспышка подсветки зажатого столбика (скраб-режим).
          <Reanimated.View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: pressedColor }, pressStyle]}
          />
        ) : null}
      </Reanimated.View>
    </View>
  );
}

/**
 * Killer бар-чарт недели: столбики «вырастают» пружиной каскадом при появлении,
 * активные — с градиентной шапкой, «сегодня» подсвечен точкой-маркером.
 * В скраб-режиме постоянных значений нет: зажал палец — подсветка и пузырь
 * со значением и датой, отпустил — исчезло. Без JS-интервалов: позиция и
 * видимость пузыря — shared values, React-стейт меняется только на границе
 * столбиков.
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
  scrubEnabled = false,
  scrubHighlightColor,
  scrubBubbleBg,
  scrubBubbleBorder,
  scrubValueColor,
  scrubCaptionColor,
  onScrubStart,
}: StatBarsProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  const scrubIndexRef = useRef<number | null>(null);
  const scrubStartedRef = useRef(false);
  const bubbleOpacity = useSharedValue(0);
  const bubbleX = useSharedValue(0);

  const gap = ROW_GAP;
  const columnCount = bars.length;
  const columnWidth = columnCount > 0 && rowWidth > 0
    ? Math.max(1, (rowWidth - gap * (columnCount - 1)) / columnCount)
    : 1;

  const scrubResponder = useMemo(() => {
    if (!scrubEnabled) return null;
    const indexForX = (x: number): number => {
      const n = bars.length;
      if (n === 0 || rowWidth <= 0) return 0;
      const colW = (rowWidth - gap * (n - 1)) / n;
      if (colW <= 0) return 0;
      return Math.max(0, Math.min(n - 1, Math.floor(x / (colW + gap))));
    };
    const centerForIndex = (i: number): number => {
      const n = bars.length;
      const colW = (rowWidth - gap * (n - 1)) / n;
      return i * (colW + gap) + colW / 2;
    };
    const handleScrub = (x: number) => {
      const idx = indexForX(x);
      const center = centerForIndex(idx);
      const clamped = Math.max(BUBBLE_W / 2, Math.min(Math.max(BUBBLE_W / 2, rowWidth - BUBBLE_W / 2), center));
      bubbleX.value = clamped - BUBBLE_W / 2;
      bubbleOpacity.value = withTiming(1, { duration: 120 });
      if (scrubIndexRef.current !== idx) {
        scrubIndexRef.current = idx;
        setScrubIndex(idx);
      }
      if (!scrubStartedRef.current) {
        scrubStartedRef.current = true;
        onScrubStart?.();
      }
    };
    const endScrub = () => {
      bubbleOpacity.value = withTiming(0, { duration: 140 });
      if (scrubIndexRef.current !== null) {
        scrubIndexRef.current = null;
        setScrubIndex(null);
      }
    };
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Вертикальный скролл экрана забирает жест себе — пузырь при этом гасим.
      onPanResponderTerminationRequest: () => true,
      onPanResponderGrant: (evt) => handleScrub(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => handleScrub(evt.nativeEvent.locationX),
      onPanResponderRelease: endScrub,
      onPanResponderTerminate: endScrub,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrubEnabled, rowWidth, bars.length, gap, onScrubStart]);

  const bubbleStyle = useAnimatedStyle(() => ({
    opacity: bubbleOpacity.value,
    transform: [{ translateX: bubbleX.value }],
  }));

  const columns = bars.map((bar, i) => (
    <View key={bar.key} style={styles.col}>
      {!scrubEnabled ? (
        bar.topLabel ? (
          <AdaptiveLabel testID={`stat-bar-top-${bar.key}`} provenance="authored" availableWidth={columnWidth} compactLineLimit={1} style={[styles.topLabel, { color: bar.highlight ? topLabelColor : topLabelMutedColor }]}>
            {bar.topLabel}
          </AdaptiveLabel>
        ) : <View style={{ height: 12 }} />
      ) : null}
      <Bar
        bar={bar}
        index={i}
        plotH={height}
        accent={accent}
        accentSoft={accentSoft}
        inactiveColor={inactiveColor}
        delayMs={delayMs}
        pressed={scrubEnabled && scrubIndex === i}
        pressedColor={scrubEnabled ? scrubHighlightColor : undefined}
      />
      <View style={styles.bottomWrap}>
        <AdaptiveLabel testID={`stat-bar-bottom-${bar.key}`} provenance="authored" availableWidth={columnWidth} compactLineLimit={1} style={[styles.bottomLabel, { color: bar.highlight ? bottomLabelColor : bottomLabelMutedColor, fontWeight: bar.highlight ? '900' : '700' }]}>
          {bar.bottomLabel}
        </AdaptiveLabel>
        {bar.highlight && todayDotColor ? (
          <View style={[styles.todayDot, { backgroundColor: todayDotColor }]} />
        ) : <View style={{ height: 4, marginTop: 3 }} />}
      </View>
    </View>
  ));

  if (!scrubEnabled) {
    return <View style={[styles.row, style]}>{columns}</View>;
  }

  const activeBar = scrubIndex !== null ? bars[scrubIndex] : undefined;

  return (
    <View
      style={style}
      onLayout={(event) => setRowWidth(event.nativeEvent.layout.width)}
    >
      <View style={styles.bubbleZone} pointerEvents="none">
        <Reanimated.View
          style={[
            styles.bubble,
            { backgroundColor: scrubBubbleBg, borderColor: scrubBubbleBorder },
            bubbleStyle,
          ]}
        >
          <Text style={[styles.bubbleValue, { color: scrubValueColor }]}>
            {activeBar ? (activeBar.scrubLabel ?? activeBar.topLabel ?? '') : ''}
          </Text>
          <Text style={[styles.bubbleCaption, { color: scrubCaptionColor }]}>
            {activeBar ? activeBar.bottomLabel : ''}
          </Text>
        </Reanimated.View>
      </View>
      <View style={styles.row} {...(scrubResponder?.panHandlers ?? {})}>
        {columns}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: ROW_GAP, paddingHorizontal: 2 },
  col: { flex: 1, alignItems: 'center', gap: 5 },
  topLabel: { fontSize: 9, fontWeight: '800' },
  bottomWrap: { alignItems: 'center' },
  bottomLabel: { fontSize: 10 },
  todayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  bubbleZone: { height: BUBBLE_ZONE_H, justifyContent: 'flex-end' },
  bubble: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    width: BUBBLE_W,
    borderRadius: 11,
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  bubbleValue: { fontSize: 13, fontWeight: '800', fontVariant: ['tabular-nums'] },
  bubbleCaption: { fontSize: 10, fontWeight: '700', marginTop: 1 },
});

export default StatBars;
