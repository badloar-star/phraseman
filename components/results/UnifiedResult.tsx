/**
 * Общий итог всех режимов (макет docs/design/v2-app/elevate-flow.js → раздел «Экраны завершения: один итог на все режимы»,
 * отрисовка elevate-core.js `result()` и `P.*`; стили elevate-mechanics.css `.ringw/.panel2/.kv/.mist`,
 * elevate-extra.css `.ringw.sm/.hero2/.chipr/.cta2`).
 *
 * зачем (владелец 11–12.11.2026): «сейчас у каждого режима свой итог с тремя цифрами. Новый итог один: кольцо с главным
 * числом режима, одна фраза о результате, разбор ошибок и рост навыка. Меняется только содержимое». Экран не знает, какой
 * режим его показывает: режим отдаёт кольцо, две строки, панели и кнопки.
 *
 * Числа макета: кольцо 176 × 176, обвод 12, круглые концы; число 58/60 жирность 800 (дробь «7 / 8» — 40 px); подпись 14.
 * Заполнение кольца и счёт — 1400 мс с задержкой 350 мс, кривая (.2,.8,.2,1) у кольца и «ease-out cubic» у счёта.
 * Строки: 26/31 жирность 800 и 15/20. Панель: отступы 16 × 18, заголовок 17/22 жирность 700, между панелями 12.
 * Низ: главная кнопка 54 (общая V2Button) и вторая 48 — стекло.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { Easing, cancelAnimation, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { V2 } from '../../constants/v2Style';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { V2Button, V2Card, V2IconButton } from '../v2/V2Kit';
import V2Pressable from '../v2/V2Pressable';
import { useV2Palette } from '../v2/useV2Palette';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

/** Числа макета итога — одно место, их же читает сверка. */
export const UNIFIED_RESULT_SPEC = {
  ringSize: 176,
  ringStroke: 12,
  ringDelayMs: 350,
  ringMs: 1400,
  valueSize: 58,
  valueLine: 60,
  fractionSize: 40,
} as const;

const RADIUS = (UNIFIED_RESULT_SPEC.ringSize - UNIFIED_RESULT_SPEC.ringStroke) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export type UnifiedResultRing = Readonly<{
  /** Главное число режима. */
  value: number;
  /** «из скольких» — число рисуется дробью «7 / 8». */
  of?: number;
  /** Хвост числа, например «%». */
  suffix?: string;
  /** Заполнение кольца, 0…1. */
  progress: number;
  label: string;
}>;

export type UnifiedResultAction = Readonly<{ label: string; onPress: () => void; testID?: string }>;

type Props = Readonly<{
  title: string;
  ring: UnifiedResultRing;
  headline: string;
  subline?: string;
  /** Правый край шапки (монеты режима). */
  topRight?: ReactNode;
  /** Панели под строками: разбор ошибок, слова, рекорд, «Навыки растут». */
  children?: ReactNode;
  primary: UnifiedResultAction;
  secondary?: UnifiedResultAction;
  /** «×» слева в шапке (elevate-core.js:28 `top()` — у итога всегда «закрыть»). */
  onClose: () => void;
  closeLabel: string;
  testID?: string;
}>;

function ringText(ring: UnifiedResultRing, shown: number): string {
  return ring.of !== undefined ? `${shown} / ${ring.of}` : `${shown}${ring.suffix ?? ''}`;
}

function UnifiedResult({ title, ring, headline, subline, topRight, children, primary, secondary, onClose, closeLabel, testID }: Props) {
  const p = useV2Palette();
  const reduceMotion = useReduceMotion();
  const target = Math.max(0, Math.min(1, ring.progress));
  const fill = useSharedValue(reduceMotion ? target : 0);
  const [shown, setShown] = useState(reduceMotion ? ring.value : 0);

  useEffect(() => {
    if (reduceMotion) {
      fill.value = target;
      setShown(ring.value);
      return undefined;
    }
    fill.value = withDelay(UNIFIED_RESULT_SPEC.ringDelayMs, withTiming(target, { duration: UNIFIED_RESULT_SPEC.ringMs, easing: Easing.bezier(0.2, 0.8, 0.2, 1) }));
    // зачем (макет elevate-core.js:49): счёт идёт кадрами вместе с кольцом, «ease-out cubic», и останавливается ровно на числе
    let raf = 0;
    let started = 0;
    const timer = setTimeout(() => {
      const tick = (now: number) => {
        if (!started) started = now;
        const k = Math.min(1, (now - started) / UNIFIED_RESULT_SPEC.ringMs);
        setShown(Math.round(ring.value * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, UNIFIED_RESULT_SPEC.ringDelayMs);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
      cancelAnimation(fill);
    };
  }, [fill, reduceMotion, ring.value, target]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * (1 - fill.value) }));
  const fraction = ring.of !== undefined;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']} testID={testID}>
      <View style={s.top}>
        <V2IconButton icon="close" onPress={onClose} accessibilityLabel={closeLabel} testID={testID ? `${testID}-close` : undefined} />
        <Text style={[s.title, { color: p.text }]}>{title}</Text>
        {/* зачем: правый край держит место, даже когда монет нет, — название остаётся по центру экрана */}
        <View style={s.topRight}>{topRight}</View>
      </View>
      <ScrollView style={s.flex} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.ring} accessible accessibilityLabel={`${ringText(ring, ring.value)} ${ring.label}`}>
          <Svg width={UNIFIED_RESULT_SPEC.ringSize} height={UNIFIED_RESULT_SPEC.ringSize} style={s.ringSvg}>
            <Circle cx={UNIFIED_RESULT_SPEC.ringSize / 2} cy={UNIFIED_RESULT_SPEC.ringSize / 2} r={RADIUS} stroke={p.track} strokeWidth={UNIFIED_RESULT_SPEC.ringStroke} fill="none" />
            <AnimatedCircle
              cx={UNIFIED_RESULT_SPEC.ringSize / 2}
              cy={UNIFIED_RESULT_SPEC.ringSize / 2}
              r={RADIUS}
              stroke={p.text}
              strokeWidth={UNIFIED_RESULT_SPEC.ringStroke}
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              fill="none"
              animatedProps={ringProps}
            />
          </Svg>
          <View style={s.ringMid} pointerEvents="none">
            <Text style={[s.value, fraction && s.valueFraction, { color: p.text }]}>{ringText(ring, shown)}</Text>
            <Text style={[s.ringLabel, { color: p.textSecondary }]}>{ring.label}</Text>
          </View>
        </View>
        <View style={s.hero}>
          <Text style={[s.headline, { color: p.text }]}>{headline}</Text>
          {subline ? <Text style={[s.subline, { color: p.textSecondary }]}>{subline}</Text> : null}
        </View>
        <View style={s.panels}>{children}</View>
      </ScrollView>
      <View style={s.dock}>
        <V2Button testID={primary.testID} label={primary.label} icon="play" iconPosition="leading" onPress={primary.onPress} />
        {secondary ? (
          <V2Pressable testID={secondary.testID} accessibilityLabel={secondary.label} onPress={secondary.onPress} withHaptic scaleTo={0.97} style={[s.cta2, { backgroundColor: p.glass }]}>
            <Text style={[s.cta2Text, { color: p.text }]}>{secondary.label}</Text>
          </V2Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

/** Карточка-панель итога (`.gl.panel2`): заголовок 17/22 и содержимое. */
export const ResultPanel = memo(function ResultPanel({ title, right, children, style }: Readonly<{ title: string; right?: ReactNode; children?: ReactNode; style?: StyleProp<ViewStyle> }>) {
  const p = useV2Palette();
  return (
    <V2Card style={[s.panel, style]}>
      <View style={s.panelHead}>
        <Text style={[s.panelTitle, { color: p.text }]}>{title}</Text>
        {right}
      </View>
      {children}
    </V2Card>
  );
});

export type ResultMistakeRow = Readonly<{ key: string; text: string; detail: string; onPress?: () => void }>;

/** «Разбор ошибок» (`P.mistakes`): счётчик справа, строки с красной плашкой «×». */
export const ResultMistakesPanel = memo(function ResultMistakesPanel({ title, rows }: Readonly<{ title: string; rows: readonly ResultMistakeRow[] }>) {
  const p = useV2Palette();
  if (rows.length === 0) return null;
  return (
    <ResultPanel title={title} right={<View style={[s.count, { backgroundColor: p.glass }]}><Text style={[s.countText, { color: p.text }]}>{rows.length}</Text></View>}>
      {rows.map((row) => (
        <V2Pressable key={row.key} accessibilityLabel={`${row.text}. ${row.detail}`} onPress={row.onPress} disabled={!row.onPress} style={s.mist}>
          <View style={[s.mistTile, { backgroundColor: `${p.wrong}24` }]}>
            <Ionicons name="close" size={18} color={p.wrong} />
          </View>
          <View style={s.flex}>
            <Text style={[s.mistText, { color: p.text }]}>{row.text}</Text>
            <Text style={[s.mistDetail, { color: p.textSecondary }]}>{row.detail}</Text>
          </View>
          {row.onPress ? <Ionicons name="chevron-forward" size={18} color={p.textMuted} /> : null}
        </V2Pressable>
      ))}
    </ResultPanel>
  );
});

/** Слова-плашки (`P.chips`): «Новые слова», «Ещё повторим завтра». */
export const ResultChipsPanel = memo(function ResultChipsPanel({ title, chips }: Readonly<{ title: string; chips: readonly string[] }>) {
  const p = useV2Palette();
  if (chips.length === 0) return null;
  return (
    <ResultPanel title={title}>
      <View style={s.chips}>
        {chips.map((chip) => (
          <View key={chip} style={[s.chip, { backgroundColor: p.glass }]}>
            <Text style={[s.chipText, { color: p.text }]}>{chip}</Text>
          </View>
        ))}
      </View>
    </ResultPanel>
  );
});

/** Заметка (`P.note`): заголовок и строка пояснения. */
export const ResultNotePanel = memo(function ResultNotePanel({ title, text }: Readonly<{ title: string; text: string }>) {
  const p = useV2Palette();
  return (
    <ResultPanel title={title}>
      <Text style={[s.note, { color: p.textSecondary }]}>{text}</Text>
    </ResultPanel>
  );
});

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  top: { flexDirection: 'row', alignItems: 'center', minHeight: 54, paddingHorizontal: 20, gap: 12 },
  // elevate-mechanics.css:58 `.top .ttl` 20/700; в итоге — по центру (elevate-core.js:47)
  title: { flex: 1, fontSize: 20, lineHeight: 26, fontWeight: '700', textAlign: 'center' },
  topRight: { minWidth: V2.iconButton, alignItems: 'flex-end' },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  ring: { width: UNIFIED_RESULT_SPEC.ringSize, height: UNIFIED_RESULT_SPEC.ringSize, alignSelf: 'center', marginTop: 4 },
  ringSvg: { transform: [{ rotate: '-90deg' }] },
  ringMid: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: UNIFIED_RESULT_SPEC.valueSize, lineHeight: UNIFIED_RESULT_SPEC.valueLine, fontWeight: '800', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  valueFraction: { fontSize: UNIFIED_RESULT_SPEC.fractionSize, lineHeight: 46, letterSpacing: -1 },
  ringLabel: { fontSize: 14, lineHeight: 18, marginTop: 2 },
  hero: { alignItems: 'center', marginTop: 14, marginBottom: 18 },
  headline: { fontSize: 26, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5, textAlign: 'center' },
  subline: { fontSize: 15, lineHeight: 20, marginTop: 4, textAlign: 'center' },
  panels: { gap: 12 },
  panel: { paddingVertical: 16, paddingHorizontal: 18 },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  panelTitle: { flex: 1, minWidth: 0, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  count: { height: 26, paddingHorizontal: 10, borderRadius: 13, justifyContent: 'center' },
  countText: { fontSize: 14, lineHeight: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  mist: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  mistTile: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  mistText: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  mistDetail: { fontSize: 13, lineHeight: 18, marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { minHeight: 34, paddingHorizontal: 13, borderRadius: 12, justifyContent: 'center' },
  chipText: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  note: { fontSize: 15, lineHeight: 20, marginTop: 4 },
  dock: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  // elevate-extra.css:54 `.cta2` — 48, радиус 24, стекло, 16/700, отступ 12
  cta2: { minHeight: 48, borderRadius: 24, marginTop: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  cta2Text: { fontSize: 16, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
});

export default memo(UnifiedResult);
