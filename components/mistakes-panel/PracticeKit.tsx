/**
 * Элементы экрана отработки «Панели»: шапка задания, вопрос, «стакан» с ответами, жетоны, поле ввода, строка результата, шаги.
 * Макет docs/design/v2-app/mistakes-panel.html, кадры «Выбери перевод», «Собери фразу», «Напиши», «Скажи вслух», «Верно», «Неверно», «Почему», «Меню задания».
 *
 * зачем (владелец: «1 в 1, без малейших потерь»): размеры взяты замером макета (430×932); ответы лежат в «стакане» внизу экрана под большим пальцем,
 * результат и разбор выезжают в том же «стакане» (нижней шторки поверх экрана нет).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';

import type { MistakeDiffSegment } from '../../app/mistake_answer_diff';
import type { Lv2Glass } from '../learning-v2/LearningV2Glass';
import { LinearGradient } from '../SafeLinearGradient';
import { MP_COLORS, bevelShadow, mixDark, ringShadow, themePair } from './panelPaint';

export const RoundButton = memo(function RoundButton({ g, icon, label, onPress, testID }: Readonly<{ g: Lv2Glass; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; testID?: string }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.round, { backgroundColor: g.opaqueControl }, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={g.text} />
    </Pressable>
  );
});

/** Вопрос по центру: подпись вида задания и само задание; кегль подбирается по длине, чтобы длинная фраза переносилась, а не ужималась. */
export const QuestionBlock = memo(function QuestionBlock({ g, kind, value, hint }: Readonly<{ g: Lv2Glass; kind: string; value: string; hint?: string }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const len = value.length;
  const size = len <= 14 ? { fontSize: 44, lineHeight: 50, letterSpacing: -1 } : len <= 26 ? { fontSize: 36, lineHeight: 42, letterSpacing: -0.8 } : { fontSize: 28, lineHeight: 34, letterSpacing: -0.4 };
  return (
    <View style={styles.question}>
      <Text style={[styles.kind, { color: g.secondary }]}>{kind}</Text>
      <Text style={[styles.value, size, { color: g.text }]}>{value}</Text>
      {hint ? <Text style={[styles.hint, { color: g.secondary }]}>{hint}</Text> : null}
    </View>
  );
});

/** «Стакан»: панель внизу экрана с ответами, градиент цвета темы и подсветка верхней кромки. */
export const Tray = memo(function Tray({ g, children, testID }: Readonly<{ g: Lv2Glass; children: React.ReactNode; testID?: string }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const insets = useStableSafeAreaInsets();
  const [a] = themePair(g);
  return (
    <View testID={testID} style={[styles.tray, { paddingBottom: Math.max(20, insets.bottom + 12) }]}>
      <LinearGradient
        pointerEvents="none"
        colors={[`${mixDark(a, '#1A1A20', 0.16)}F5`, 'rgba(14,14,18,0.97)']}
        start={{ x: 0.42, y: 0.01 }}
        end={{ x: 0.58, y: 0.99 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.trayEdge, { boxShadow: [{ inset: true, offsetX: 0, offsetY: 1, blurRadius: 0, spreadDistance: 0, color: 'rgba(255,255,255,0.12)' }] }]} />
    </View>
  );
});

export type OptionMark = 'ok' | 'no' | undefined;

/** Варианты ответа сеткой 2 колонки; после ответа верный подсвечен зелёным, выбранный неверный — красным. */
export const OptionGrid = memo(function OptionGrid({ g, options, marks, onPick, disabled }: Readonly<{ g: Lv2Glass; options: readonly string[]; marks?: Readonly<Record<string, OptionMark>>; onPick?: (option: string) => void; disabled?: boolean }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <View style={styles.grid}>
      {options.map((option) => {
        const mark = marks?.[option];
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!(disabled || !onPick) }}
            disabled={disabled || !onPick}
            onPress={() => onPick?.(option)}
            style={({ pressed }) => [
              styles.cell,
              mark === 'ok' && { backgroundColor: 'rgba(111,208,140,0.2)', boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1.5, color: 'rgba(111,208,140,0.7)' }] },
              mark === 'no' && { backgroundColor: 'rgba(242,118,107,0.18)', boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1.5, color: 'rgba(242,118,107,0.7)' }] },
              pressed && styles.pressed,
            ]}>
            <Text style={[styles.cellText, { color: g.text }]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

/** Область собранной фразы (конструктор): капсула 20 с внутренним кольцом. */
export const AnswerSlot = memo(function AnswerSlot({ children, style }: Readonly<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return <View style={[styles.slot, style]}>{children}</View>;
});

export const Token = memo(function Token({ g, label, used, onPress }: Readonly<{ g: Lv2Glass; label: string; used?: boolean; onPress?: () => void }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <Pressable disabled={used || !onPress} accessibilityState={{ disabled: !!(used || !onPress) }} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.token, used && styles.tokenUsed, pressed && styles.pressed]}>
      <Text style={[styles.tokenText, { color: g.text }]}>{label}</Text>
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tokenEdge, { boxShadow: bevelShadow('rgba(255,255,255,0.22)', 'rgba(255,255,255,0)') }]} />
    </Pressable>
  );
});

/** Рамка поля ввода: высота от 60, капсула 18, внутреннее кольцо; сам TextInput (стиль fieldInputStyle) кладёт экран внутрь. */
export const AnswerField = memo(function AnswerField({ children }: Readonly<{ children: React.ReactNode }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return <View style={styles.field}>{children}</View>;
});
export const fieldInputStyle = { flex: 1, minHeight: 60, fontSize: 20, paddingVertical: 0 } as const;

/**
 * Фраза с подсветкой расхождения (владелец 2026-09-14, макет промаха А): в «Твой выбор» неверные слова красные и зачёркнуты, в «Правильно» —
 * упущенные слова зелёные; на месте пропущенного слова — чёрточки. Сама разметка приходит из buildMistakeAnswerDiff (чистая функция).
 */
export const DiffValue = memo(function DiffValue({ g, segments, baseColor, style }: Readonly<{ g: Lv2Glass; segments: readonly MistakeDiffSegment[]; baseColor: string; style?: StyleProp<import('react-native').TextStyle> }>) {
  return (
    <Text style={style}>
      {segments.map((segment, index) => {
        const space = index > 0 ? ' ' : '';
        if (segment.tone === 'gap') return <Text key={`gap-${index}`} style={{ color: MP_COLORS.badText }}>{`${space}_____`}</Text>;
        if (segment.tone === 'wrong') return <Text key={`w-${index}`} style={{ color: MP_COLORS.badText, textDecorationLine: 'line-through' }}>{`${space}${segment.text}`}</Text>;
        if (segment.tone === 'right') return <Text key={`r-${index}`} style={{ color: MP_COLORS.okText }}>{`${space}${segment.text}`}</Text>;
        return <Text key={`p-${index}`} style={{ color: baseColor }}>{`${space}${segment.text}`}</Text>;
      })}
    </Text>
  );
});

/** Строка результата: кружок 40 с иконкой, «Верно» / «Почти», справа — шаги. */
export const ResultRow = memo(function ResultRow({ g, ok, label, right }: Readonly<{ g: Lv2Glass; ok: boolean; label: string; right?: React.ReactNode }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const tone = ok ? MP_COLORS.ok : MP_COLORS.bad;
  return (
    <View style={styles.result}>
      <View style={[styles.resultDot, { backgroundColor: ok ? 'rgba(111,208,140,0.22)' : 'rgba(242,118,107,0.22)' }]}>
        <Ionicons name={ok ? 'checkmark' : 'close'} size={20} color={tone} />
      </View>
      <Text style={[styles.resultText, { color: g.text }]}>{label}</Text>
      {right ? <View style={styles.resultRight}>{right}</View> : null}
    </View>
  );
});

/** Три шага цепочки дней (кружок 26, линии 2): закрашены те, что засчитаны. */
export const StepDots = memo(function StepDots({ g, n }: Readonly<{ g: Lv2Glass; n: number }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <View style={styles.steps}>
      {[0, 1, 2].map((index) => {
        const done = index < n;
        return (
          <React.Fragment key={`step-${index}`}>
            {index > 0 ? <View style={[styles.stepLine, { backgroundColor: done ? g.accent : 'rgba(255,255,255,0.12)' }]} /> : null}
            <View style={[styles.stepDot, { backgroundColor: done ? g.accent : MP_COLORS.ghost }]}>
              {done ? <Ionicons name="checkmark" size={14} color={g.accentInk} /> : <Text style={[styles.stepNum, { color: g.secondary }]}>{index + 1}</Text>}
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
});

const baseStyles = StyleSheet.create({
  pressed: { opacity: 0.82 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  field: { minHeight: 60, borderRadius: 18, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', boxShadow: ringShadow('rgba(255,255,255,0.1)') },
  question: { marginTop: 30, alignItems: 'center' },
  kind: { fontSize: 17, lineHeight: 22, textAlign: 'center' },
  value: { marginTop: 10, fontWeight: '700', textAlign: 'center' },
  hint: { marginTop: 10, fontSize: 18, lineHeight: 26, textAlign: 'center' },
  tray: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 18, paddingHorizontal: 16, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  trayEdge: { borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '48.6%', flexGrow: 1, minHeight: 62, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
  cellText: { fontSize: 18, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
  slot: { minHeight: 70, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.06)', boxShadow: ringShadow('rgba(255,255,255,0.08)') },
  token: { minHeight: 46, paddingHorizontal: 17, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  tokenUsed: { opacity: 0.22 },
  tokenEdge: { borderRadius: 14 },
  tokenText: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  resultDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  resultText: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  resultRight: { marginLeft: 'auto', width: 96 },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 13, lineHeight: 16, fontWeight: '700' },
  stepLine: { flex: 1, height: 2 },
});
