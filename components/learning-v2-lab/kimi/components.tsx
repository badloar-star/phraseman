// зачем: RN-порт общих компонентов Kimi — OptionGrid (components/OptionGrid.tsx),
// SignalButton (components/SignalButton.tsx), FeedbackNote (components/FeedbackNote.tsx)
// и Chip (.chip из base.css). Размеры/цвета взяты дословно из base.css + cinema-токенов.
import React, { memo, useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useRuntimeActive } from '../../../hooks/use_runtime_active';
import { GraphemeText, IntentButton, ScriptAnnotation } from './primitives';
import { useLab } from './LabState';
import { C, LEADING, RADIUS, SPACE, TEXT, WEIGHT } from './tokens';

/** Вариант ответа из фикстур Kimi (contracts/viewModels → ActivityOption). */
export interface ActivityOption {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly annotation?: string;
}

export interface OptionGridProps {
  readonly surfaceId: string;
  readonly options: readonly ActivityOption[];
  /** Заранее запечённый правильный id из фикстуры — только для раскрытия. */
  readonly correctOptionId?: string;
  readonly selectedId: string | null;
  readonly onSelected: (optionId: string) => void;
  /** Варианты принимают ввод (canonicalState === 'active'). */
  readonly enabled: boolean;
  /** Раскрытие ответа: success/needs_work помечают запечённый вариант. */
  readonly reveal?: boolean;
  readonly intentType?: string;
  readonly columns?: 1 | 2 | 4;
}

/**
 * OptionGrid — сетка вариантов. Выбор хранится локально (мгновенно, без сети),
 * подсветка правильности появляется только когда состояние это раскрывает.
 */
export const OptionGrid = memo(function OptionGrid(props: OptionGridProps) {
  const {
    surfaceId,
    options,
    correctOptionId,
    selectedId,
    onSelected,
    enabled,
    reveal,
    intentType = 'activity.select_option',
    columns = 1,
  } = props;
  const lab = useLab();

  return (
    <View style={[grid.wrap, columns !== 1 ? grid.twoUp : null]}>
      {options.map((option) => {
        const selected = option.id === selectedId;
        const isCorrect = Boolean(reveal) && option.id === correctOptionId;
        const isWrongPick = Boolean(reveal) && selected && option.id !== correctOptionId;
        return (
          <View key={option.id} style={columns !== 1 ? grid.cell : undefined}>
            <IntentButton
              surfaceId={surfaceId}
              intent={intentType}
              payload={{ optionId: option.id, correctOptionIdBaked: correctOptionId ?? null }}
              onIntent={lab.logIntent}
              onPress={() => onSelected(option.id)}
              variant="option"
              disabled={!enabled}
              pressed={selected}
              reveal={isCorrect ? 'correct' : isWrongPick ? 'incorrect' : undefined}
              accessibilityLabel={option.label}
              testID={`kimi-option-${option.id}`}
            >
              <View style={grid.optionBody}>
                <View style={grid.optionText}>
                  <ScriptAnnotation
                    base={option.label}
                    annotation={option.annotation}
                    baseStyle={grid.label}
                  />
                  {option.hint ? (
                    <GraphemeText text={option.hint} maxGraphemes={48} style={grid.hint} />
                  ) : null}
                </View>
                {isCorrect ? <Mark tone="correct" glyph="✓" /> : null}
                {isWrongPick ? <Mark tone="incorrect" glyph="✕" /> : null}
                {!reveal && selected ? <Mark tone="selected" glyph="✓" /> : null}
              </View>
            </IntentButton>
          </View>
        );
      })}
    </View>
  );
});

const Mark = memo(function Mark({ tone, glyph }: { readonly tone: 'selected' | 'correct' | 'incorrect'; readonly glyph: string }) {
  const bg = tone === 'selected' ? C.accentPrimary : tone === 'correct' ? C.correct : C.wrong;
  const fg = tone === 'selected' ? C.accentOnPrimary : tone === 'correct' ? '#182B31' : '#2A1B2B';
  return (
    <View style={[grid.mark, { backgroundColor: bg }]}>
      <Text style={[grid.markGlyph, { color: fg }]}>{glyph}</Text>
    </View>
  );
});

const grid = StyleSheet.create({
  wrap: { gap: SPACE.s3 },
  twoUp: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '48%' },
  optionBody: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACE.s2 },
  optionText: { flex: 1, gap: 2 },
  label: {
    fontSize: TEXT.lg,
    fontWeight: WEIGHT.semibold,
    color: C.fgPrimary,
    lineHeight: TEXT.lg * LEADING.snug,
  },
  hint: {
    fontSize: TEXT.sm,
    color: C.fgSecondary,
    fontWeight: WEIGHT.regular,
  },
  mark: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markGlyph: { fontSize: TEXT.sm, fontWeight: WEIGHT.bold },
});

/**
 * SignalButton — симулированный плеер Kimi. Никаких аудиофайлов и TTS: только
 * типизированные интенты play/pause и эквалайзер, отражающий условие сигнала.
 */
export const SignalButton = memo(function SignalButton(props: {
  readonly surfaceId: string;
  readonly label: string;
  readonly disabled?: boolean;
}) {
  const lab = useLab();
  const { signal } = lab.conditions;
  const playing = signal === 'playing';

  return (
    <View style={sig.wrap}>
      <IntentButton
        surfaceId={props.surfaceId}
        intent={playing ? 'signal.pause' : 'signal.play'}
        payload={{ simulated: true, signal }}
        onIntent={lab.logIntent}
        onPress={() => lab.setSignal(playing ? 'paused' : 'playing')}
        variant="secondary"
        disabled={props.disabled}
        accessibilityLabel={playing ? 'Пауза симулированного сигнала' : 'Играть симулированный сигнал'}
        testID={`kimi-signal-${props.surfaceId}`}
        style={sig.button}
      >
        <Text style={sig.icon}>{playing ? '⏸' : '▶'}</Text>
        <Text style={sig.buttonLabel}>
          {playing ? 'Pause' : 'Play'} · {props.label}
        </Text>
      </IntentButton>
      <Equalizer playing={playing} />
      <Text style={sig.state}>{signal === 'none' ? 'no signal' : signal}</Text>
    </View>
  );
});

const Equalizer = memo(function Equalizer({ playing }: { readonly playing: boolean }) {
  return (
    <View style={sig.eq} accessible accessibilityRole="image" accessibilityLabel={playing ? 'Сигнал играет' : 'Сигнал остановлен'}>
      {EQ_BARS.map((bar) => (
        <EqBar key={bar.id} playing={playing} delay={bar.delay} />
      ))}
    </View>
  );
});

/** Стабильные id столбиков — чтобы React не переиспользовал строки по индексу. */
const EQ_BARS = [
  { id: 'eq-1', delay: 0 },
  { id: 'eq-2', delay: 150 },
  { id: 'eq-3', delay: 300 },
  { id: 'eq-4', delay: 450 },
] as const;

const EqBar = memo(function EqBar({ playing, delay }: { readonly playing: boolean; readonly delay: number }) {
  const value = useRef(new Animated.Value(0)).current;
  // зачем: perf-контракт — бесконечная анимация обязана глохнуть на фоне
  const runtimeActive = useRuntimeActive();

  useEffect(() => {
    if (!playing || !runtimeActive) {
      value.stopAnimation();
      value.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, { toValue: 1, duration: 450, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
        Animated.timing(value, { toValue: 0, duration: 450, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [playing, runtimeActive, value, delay]);

  // зачем: высота на нативном потоке не анимируется — тот же визуал даём через scaleY
  // от нижнего края (столбик «растёт» снизу вверх, как эквалайзер в макете Kimi).
  return (
    <Animated.View
      style={[
        sig.bar,
        {
          backgroundColor: playing ? C.accentEdge : C.fgSecondary,
          transform: [
            { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [9, 0] }) },
            { scaleY: value.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) },
          ],
        },
      ]}
    />
  );
});

const sig = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.s3,
    flexWrap: 'wrap',
    padding: SPACE.s3,
    borderRadius: RADIUS.lg,
    backgroundColor: C.bgSurface,
  },
  button: { flexShrink: 1 },
  icon: { fontSize: TEXT.lg, color: C.fgPrimary },
  buttonLabel: { fontSize: TEXT.base, fontWeight: WEIGHT.semibold, color: C.fgPrimary },
  eq: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 24 },
  bar: { width: 4, height: 24, borderRadius: RADIUS.pill },
  state: { fontSize: TEXT.xs, color: C.fgSecondary, fontFamily: undefined },
});

/**
 * FeedbackNote — заметка в feedback lane. Тон задаёт состояние; текст всегда из
 * фикстуры (никогда не «НЕВЕРНО» — Kimi держит спокойный тон в needs_work).
 */
export const FeedbackNote = memo(function FeedbackNote(props: {
  readonly success?: string;
  readonly needsWork?: string;
  readonly recovery?: string;
  readonly state: 'prompt' | 'active' | 'processing' | 'success' | 'needs_work' | 'recovery';
}) {
  const { success, needsWork, recovery, state } = props;
  const text = state === 'success' ? success : state === 'needs_work' ? needsWork : state === 'recovery' ? recovery : undefined;
  if (!text) return null;
  const border = state === 'success' ? C.correct : state === 'needs_work' ? C.gold : C.wrong;
  return (
    <View style={[note.wrap, { borderColor: border }]}>{/* guard-ok: тональная граница FeedbackNote из дизайн-системы Kimi (.fbnote) */}
      <GraphemeText text={text} maxGraphemes={220} style={note.text} />
    </View>
  );
});

const note = StyleSheet.create({
  wrap: {
    paddingVertical: SPACE.s2,
    paddingHorizontal: SPACE.s3,
    borderRadius: RADIUS.md,
    borderWidth: 1, // guard-ok: .fbnote из base.css
    backgroundColor: C.bgSurface,
    gap: SPACE.s1,
  },
  text: {
    fontSize: TEXT.sm,
    lineHeight: TEXT.sm * LEADING.snug,
    color: C.fgPrimary,
  },
});

/** Chip — .chip из base.css (тона ok/warn/info/muted). */
export const Chip = memo(function Chip(props: {
  readonly text: string;
  readonly tone?: 'ok' | 'warn' | 'info' | 'muted';
}) {
  const { text, tone = 'muted' } = props;
  const palette =
    tone === 'ok'
      ? { bg: '#182B31', fg: C.correct }
      : tone === 'warn'
        ? { bg: '#2A1B2B', fg: C.wrong }
        : tone === 'info'
          ? { bg: '#192040', fg: '#B9C8FF' }
          : { bg: C.bgSubtle, fg: C.fgSecondary };
  return (
    <View style={[chip.wrap, { backgroundColor: palette.bg }]}>
      <Text style={[chip.text, { color: palette.fg }]}>{text}</Text>
    </View>
  );
});

const chip = StyleSheet.create({
  wrap: {
    minHeight: 28,
    paddingVertical: 2,
    paddingHorizontal: SPACE.s2,
    borderRadius: RADIUS.pill,
    justifyContent: 'center',
  },
  text: { fontSize: TEXT.xs, fontWeight: WEIGHT.medium },
});
