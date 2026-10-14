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
import { useLv2Glass, type Lv2Glass } from '../learning-v2/LearningV2Glass';
import { mpColors } from './panelPaint';
import { nestedBoxShadow, PlateFill, plateBoxShadow } from '../v2/ShadowSurface';
import { GlassRim } from './GlassRim';

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
      style={({ pressed }) => [styles.round, { backgroundColor: g.buttonFill }, pressed && styles.pressed]}>
      <Ionicons name={icon} size={20} color={g.text} />
      <GlassRim radius={21} />
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

/** «Стакан»: панель внизу экрана с ответами — плашка стиля «Тень» (градиент 180°), без кромки. */
export const Tray = memo(function Tray({ g, children, testID }: Readonly<{ g: Lv2Glass; children: React.ReactNode; testID?: string }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const insets = useStableSafeAreaInsets();
  return (
    <View testID={testID} style={[styles.tray, { paddingBottom: Math.max(20, insets.bottom + 12), boxShadow: plateBoxShadow(g) }]}>
      <PlateFill g={g} radius={30} />
      {children}
    </View>
  );
});

export type OptionMark = 'ok' | 'no' | undefined;

/** Варианты ответа сеткой 2 колонки; после ответа верный подсвечен зелёным, выбранный неверный — красным. */
/**
 * зачем (координатор 13.10, mistakes-panel-014/015): робот Сверки выбирал вариант координатами. testIDPrefix даёт `<prefix>-N`;
 * devIsCorrect (передаётся ТОЛЬКО в dev-сборке) даёт `<prefix>-correct` / `<prefix>-wrong-N` — в стор-сборке признака верного нет.
 */
export const OptionGrid = memo(function OptionGrid({ g, options, marks, onPick, disabled, testIDPrefix, devIsCorrect }: Readonly<{ g: Lv2Glass; options: readonly string[]; marks?: Readonly<Record<string, OptionMark>>; onPick?: (option: string) => void; disabled?: boolean; testIDPrefix?: string; devIsCorrect?: (option: string) => boolean }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  // зачем (владелец 12.10, стиль «Тень»): плита варианта — плашка (градиент 180° и тень), без кромки; плитки верно/неверно рисуют своё
  // кольцо-состояние (это индикатор исхода ответа, а не обводка контейнера) и без градиента.
  return (
    <View style={styles.grid}>
      {options.map((option, index) => {
        const mark = marks?.[option];
        const testID = !testIDPrefix
          ? undefined
          : devIsCorrect
            ? (devIsCorrect(option) ? `${testIDPrefix}-correct` : `${testIDPrefix}-wrong-${index}`)
            : `${testIDPrefix}-${index}`;
        return (
          <Pressable
            key={option}
            testID={testID}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!(disabled || !onPick) }}
            disabled={disabled || !onPick}
            onPress={() => onPick?.(option)}
            style={({ pressed }) => [
              styles.cell,
              { boxShadow: plateBoxShadow(g) },
              // зачем (замечание владельца 10.10): верно/неверно — семантика mpColors(g).ok / .bad с альфой, а не отдельные литералы rgba
              mark === 'ok' && { backgroundColor: `${mpColors(g).ok}33`, boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1.5, color: `${mpColors(g).ok}B3` }] }, // shadow-ok: кольцо отметки верно/неверно у выбранного ответа — семантика, не контейнер
              mark === 'no' && { backgroundColor: `${mpColors(g).bad}2E`, boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1.5, color: `${mpColors(g).bad}B3` }] }, // shadow-ok: кольцо отметки верно/неверно у выбранного ответа — семантика, не контейнер
              pressed && styles.pressed,
            ]}>
            {mark === undefined ? (
              <>
                <PlateFill g={g} radius={18} />
              </>
            ) : null}
            <Text style={[styles.cellText, { color: g.text }]}>{option}</Text>
          </Pressable>
        );
      })}
    </View>
  );
});

/** Область собранной фразы (конструктор): капсула 20 — плашка с тенью, без кольца. */
export const AnswerSlot = memo(function AnswerSlot({ children, style }: Readonly<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const g = useLv2Glass();
  return (
    <View style={[styles.slot, { boxShadow: plateBoxShadow(g) }, style]}>
      <PlateFill g={g} radius={20} />
      {children}
    </View>
  );
});

export const Token = memo(function Token({ g, label, used, onPress }: Readonly<{ g: Lv2Glass; label: string; used?: boolean; onPress?: () => void }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <Pressable disabled={used || !onPress} accessibilityState={{ disabled: !!(used || !onPress) }} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.token, { backgroundColor: g.buttonFill, boxShadow: nestedBoxShadow(g) }, used && styles.tokenUsed, pressed && styles.pressed]}>
      <Text style={[styles.tokenText, { color: g.text }]}>{label}</Text>
    </Pressable>
  );
});

/** Плашка поля ввода: высота от 60, капсула 18, тень без обводки; сам TextInput (стиль fieldInputStyle) кладёт экран внутрь. */
export const AnswerField = memo(function AnswerField({ children }: Readonly<{ children: React.ReactNode }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const g = useLv2Glass();
  return (
    <View style={[styles.field, { boxShadow: plateBoxShadow(g) }]}>
      <PlateFill g={g} radius={18} />
      {children}
    </View>
  );
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
        if (segment.tone === 'gap') return <Text key={`gap-${index}`} style={{ color: mpColors(g).badText }}>{`${space}_____`}</Text>;
        if (segment.tone === 'wrong') return <Text key={`w-${index}`} style={{ color: mpColors(g).badText, textDecorationLine: 'line-through' }}>{`${space}${segment.text}`}</Text>;
        if (segment.tone === 'right') return <Text key={`r-${index}`} style={{ color: mpColors(g).okText }}>{`${space}${segment.text}`}</Text>;
        return <Text key={`p-${index}`} style={{ color: baseColor }}>{`${space}${segment.text}`}</Text>;
      })}
    </Text>
  );
});

/** Строка результата: кружок 40 с иконкой, «Верно» / «Почти», справа — шаги. */
export const ResultRow = memo(function ResultRow({ g, ok, label, right }: Readonly<{ g: Lv2Glass; ok: boolean; label: string; right?: React.ReactNode }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const tone = ok ? mpColors(g).ok : mpColors(g).bad;
  return (
    <View style={styles.result}>
      <View style={[styles.resultDot, { backgroundColor: ok ? `${mpColors(g).ok}38` : `${mpColors(g).bad}38` }]}>
        <Ionicons name={ok ? 'checkmark' : 'close'} size={20} color={tone} />
      </View>
      <Text style={[styles.resultText, { color: g.text }]}>{label}</Text>
      {right ? <View style={styles.resultRight}>{right}</View> : null}
    </View>
  );
});

/** Три шага цепочки дней (кружок 26, линии 2): закрашены те, что засчитаны. */
export const StepDots = memo(function StepDots({ g, n, compact }: Readonly<{ g: Lv2Glass; n: number; /** В строке результата (макет `.stp` width 96): кружки 18.5, линии схлопнуты — как в вёрстке макета. */ compact?: boolean }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  return (
    <View style={[styles.steps, compact && styles.stepsCompact]}>
      {[0, 1, 2].map((index) => {
        const done = index < n;
        return (
          <React.Fragment key={`step-${index}`}>
            {index > 0 ? <View style={[styles.stepLine, { backgroundColor: done ? g.accent : g.hairlineSoft }]} /> : null}
            <View style={[styles.stepDot, compact && styles.stepDotCompact, { backgroundColor: done ? g.accent : g.glassEdge }]}>
              {done ? <Ionicons name="checkmark" size={compact ? 11 : 14} color={g.accentInk} /> : <Text style={[styles.stepNum, compact && styles.stepNumCompact, { color: g.secondary }]}>{index + 1}</Text>}
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
  field: { minHeight: 60, borderRadius: 18, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center' },
  question: { marginTop: 30, alignItems: 'center' },
  kind: { fontSize: 16, lineHeight: 22, textAlign: 'center' },
  value: { marginTop: 10, fontWeight: '700', textAlign: 'center' },
  hint: { marginTop: 10, fontSize: 16, lineHeight: 26, textAlign: 'center' },
  tray: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: 18, paddingHorizontal: 16, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  cell: { width: '48.6%', flexGrow: 1, minHeight: 62, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' },
  cellText: { fontSize: 16, lineHeight: 24, fontWeight: '600', textAlign: 'center' },
  slot: { minHeight: 70, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', padding: 12, borderRadius: 20 },
  token: { minHeight: 46, paddingHorizontal: 17, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  tokenUsed: { opacity: 0.22 },
  tokenText: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  result: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  resultDot: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  resultText: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  resultRight: { marginLeft: 'auto', width: 96 },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  // зачем (сверка 02:30, «точки крупнее, «3» обрезана краем»): в макете `.stp` ширина 96, кружки сжимаются до (96−4·10)/3 ≈ 18.7, линии — нулевой длины
  stepsCompact: { width: '100%' },
  stepDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  stepNum: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  stepDotCompact: { width: 18.5, height: 18.5, borderRadius: 9.25 },
  stepNumCompact: { fontSize: 13, lineHeight: 17 },
  stepLine: { flex: 1, height: 2 },
});
