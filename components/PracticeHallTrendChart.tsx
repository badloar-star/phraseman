import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import {
  clampPracticeHallTrendOffset,
  type PracticeHallTrendPoint,
  visiblePracticeHallTrendWindow,
} from '../app/trainer_practice_hall';

const RANGES = [7, 14, 30] as const;
const CHART_WIDTH = 300;
const CHART_HEIGHT = 132;

type Props = {
  points: readonly PracticeHallTrendPoint[];
  accent: string;
  text: string;
  muted: string;
  surface: string;
  onSurface: string;
  accessibilityLabel: string;
};

function shortDate(iso: string): string {
  return iso.slice(5).replace('-', '.');
}

/**
 * Direct manipulation chart. A horizontal one-finger pan changes its date
 * window; pinch changes its density. The pan fails on vertical movement so the
 * parent ScrollView continues to feel native.
 */
export default function PracticeHallTrendChart({
  points,
  accent,
  text,
  muted,
  surface,
  onSurface,
  accessibilityLabel,
}: Props) {
  const [range, setRange] = useState<(typeof RANGES)[number]>(14);
  const [offset, setOffset] = useState(() => clampPracticeHallTrendOffset(points.length, 14, points.length));

  useEffect(() => {
    setOffset((current) => clampPracticeHallTrendOffset(points.length, range, current || points.length));
  }, [points.length, range]);

  const visible = useMemo(() => visiblePracticeHallTrendWindow(points, range, offset), [offset, points, range]);
  const selected = visible[visible.length - 1] ?? null;
  const activeDays = visible.filter((point) => point.value === 1).length;
  const maxOffset = Math.max(0, points.length - range);

  const moveWindow = (translationX: number) => {
    if (Math.abs(translationX) < 20) return;
    const step = Math.max(1, Math.floor(range / 2));
    setOffset((current) => clampPracticeHallTrendOffset(points.length, range, current + (translationX < 0 ? -step : step)));
  };
  const changeZoom = (scale: number) => {
    if (scale > 1.08) setRange((current) => RANGES[Math.max(0, RANGES.indexOf(current) - 1)]!);
    if (scale < 0.92) setRange((current) => RANGES[Math.min(RANGES.length - 1, RANGES.indexOf(current) + 1)]!);
  };

  const pan = useMemo(() => Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .activeOffsetX([-10, 10])
    .failOffsetY([-16, 16])
    .runOnJS(true)
    .onEnd((event) => moveWindow(event.translationX)), [points.length, range]);
  const pinch = useMemo(() => Gesture.Pinch()
    .runOnJS(true)
    .onEnd((event) => changeZoom(event.scale)), []);
  const gesture = useMemo(() => Gesture.Simultaneous(pan, pinch), [pan, pinch]);

  const chart = useMemo(() => {
    if (visible.length === 0) return null;
    const x = (index: number) => visible.length === 1 ? CHART_WIDTH / 2 : (index / (visible.length - 1)) * CHART_WIDTH;
    const y = (value: 0 | 1) => value ? 28 : 102;
    const line = visible.map((point, index) => `${x(index)},${y(point.value)}`).join(' ');
    const area = `M 0 ${CHART_HEIGHT} L ${line.replaceAll(' ', ' L ')} L ${CHART_WIDTH} ${CHART_HEIGHT} Z`;
    return { line, area, x, y };
  }, [visible]);

  if (points.length === 0) return null;

  return (
    <View style={[styles.shell, { backgroundColor: surface }]}>
      <View style={styles.topline}>
        <Text style={[styles.value, { color: text }]}>{activeDays}<Text style={[styles.unit, { color: muted }]}> / {visible.length}</Text></Text>
        <View style={[styles.livePill, { backgroundColor: `${accent}1F` }]}>
          <View style={[styles.liveDot, { backgroundColor: accent }]} />
          <Text style={[styles.liveText, { color: text }]}>{selected ? shortDate(selected.date) : '—'}</Text>
        </View>
      </View>

      <GestureDetector gesture={gesture}>
        <View accessibilityLabel={accessibilityLabel} style={styles.chartTouchArea}>
          <Svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} preserveAspectRatio="none" style={styles.chart}>
            <Defs><LinearGradient id="practiceHallArea" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={accent} stopOpacity="0.34" /><Stop offset="1" stopColor={accent} stopOpacity="0.02" /></LinearGradient></Defs>
            {[28, 65, 102].map((lineY) => <Line key={lineY} x1="0" x2={CHART_WIDTH} y1={lineY} y2={lineY} stroke={onSurface} strokeOpacity="0.18" strokeWidth="1" />)}
            {chart ? <><Path d={chart.area} fill="url(#practiceHallArea)" /><Path d={`M ${chart.line.replaceAll(' ', ' L ')}`} fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />{visible.map((point, index) => <Circle key={point.date} cx={chart.x(index)} cy={chart.y(point.value)} r={index === visible.length - 1 ? 6 : 4} fill={surface} stroke={accent} strokeWidth={index === visible.length - 1 ? 4 : 2} />)}</> : null}
          </Svg>
        </View>
      </GestureDetector>

      <View style={styles.axis}>{visible.map((point, index) => (index === 0 || index === visible.length - 1 || index === Math.floor((visible.length - 1) / 2)) ? <Text key={point.date} style={[styles.axisText, { color: muted }]}>{shortDate(point.date)} · {point.value}</Text> : null)}</View>
      <View style={styles.rangeRow}>{RANGES.map((candidate) => <Pressable key={candidate} accessibilityRole="button" onPress={() => setRange(candidate)} style={[styles.range, { backgroundColor: candidate === range ? accent : 'transparent', borderColor: candidate === range ? accent : `${muted}44` }]}><Text style={{ color: candidate === range ? '#07110A' : muted, fontWeight: '800', fontSize: 12 }}>{candidate}</Text></Pressable>)}</View>
      <Text style={[styles.windowNote, { color: muted }]}>{offset > 0 ? `${offset + 1}–${Math.min(points.length, offset + range)} / ${points.length}` : maxOffset > 0 ? '←  →' : `${visible.length} / ${points.length}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { borderRadius: 16, padding: 14, gap: 10 },
  topline: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  value: { fontSize: 22, fontWeight: '900' },
  unit: { fontSize: 13, fontWeight: '700' },
  livePill: { minHeight: 32, paddingHorizontal: 10, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: 12, fontWeight: '800' },
  chartTouchArea: { height: 132, borderRadius: 12, overflow: 'hidden' },
  chart: { width: '100%', height: '100%' },
  axis: { minHeight: 18, flexDirection: 'row', justifyContent: 'space-between' },
  axisText: { fontSize: 11, fontWeight: '700' },
  rangeRow: { flexDirection: 'row', gap: 8 },
  range: { minWidth: 48, minHeight: 36, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  windowNote: { fontSize: 11, lineHeight: 15 },
});
