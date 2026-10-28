// ═══════════════════════════════════════════════════════════════════════════
// story_template_motion.tsx — входы, слова «лесенкой», счётчики и печать фразы для кадров историй (макет stories-templates-v1.html).
//
// зачем: макет описывает движение классами .a / .pop / .fade / .rise с задержкой --d, словами заголовка через 50 мс и счётчиками `cnt` (ease-out
// cubic, ≤ 1,2 с). Здесь те же кривые и длительности 1:1, но всё считается от часов кадра (story_frame_clock): пауза удержанием останавливает и
// входы, и счётчики; «Уменьшить движение» — сразу конечное состояние. Числа и печать обновляют только свой Text (лист), без перерисовки кадра.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedStyle } from 'react-native-reanimated';
import { EASE_CSS_OUT, EASE_OUT, EASE_SPRING, frameMs, groupThousands, phase, useStoryFrameClock } from './story_frame_clock';
import { balancedWidth } from './story_template_layout';

export type EnterKind = 'a' | 'pop' | 'fade' | 'rise';

/** Длительности входов макета, мс: stUp 460, stPop 560, stFade 420, stRise 700. */
export const ENTER_MS: Readonly<Record<EnterKind, number>> = { a: 460, pop: 560, fade: 420, rise: 700 };

type EnterProps = Readonly<{
  kind?: EnterKind;
  d?: number;
  /** Своя длительность входа, мс (клетки .grid100 / .cal31 макета всплывают stPop за 420, а не 560). */
  dur?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
}>;

/** Вход элемента: .a (вверх 16 + проявление), .pop (пружина .6 → 1), .fade, .rise (вверх 40 + .94 → 1). */
export const Enter = memo(function Enter({ kind = 'a', d = 0, dur, style, children, testID }: EnterProps) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const length = dur ?? ENTER_MS[kind];
  const animated = useAnimatedStyle(() => {
    const t = frameMs(progress.value, durationMs, final);
    const p = phase(t, d, length);
    if (kind === 'pop') {
      const e = EASE_SPRING(p);
      return { opacity: Math.max(0, Math.min(1, e)), transform: [{ scale: 0.6 + 0.4 * e }] };
    }
    if (kind === 'fade') return { opacity: EASE_CSS_OUT(p) };
    const e = EASE_OUT(p);
    if (kind === 'rise') return { opacity: e, transform: [{ translateY: 40 * (1 - e) }, { scale: 0.94 + 0.06 * e }] };
    return { opacity: e, transform: [{ translateY: 16 * (1 - e) }] };
  });
  return <Animated.View testID={testID} style={[style, animated]}>{children}</Animated.View>;
});

// ── заголовок «лесенкой» с выравниванием строк (CSS text-wrap: balance; ширина — balancedWidth в story_template_layout) ──

type WordsProps = Readonly<{
  text: string;
  /** Задержка первого слова, мс (words(text, d0) макета). */
  d0: number;
  /** Шаг между словами, мс (50 по макету). */
  step?: number;
  style: StyleProp<TextStyle>;
  /** max-width блока заголовка (334 у .h1). */
  maxWidth: number;
  /** Пробел между словами, px (≈ 0,26 кегля). */
  gap: number;
  testID?: string;
  accessibilityRole?: 'header';
}>;

/** Заголовок, слова которого входят по очереди (.w.a). Ширина блока выравнивается как text-wrap: balance после первого замера. */
export const Words = memo(function Words({ text, d0, step = 50, style, maxWidth, gap, testID, accessibilityRole }: WordsProps) {
  const words = useMemo(() => text.split(' ').filter(Boolean), [text]);
  const [widths, setWidths] = useState<readonly number[] | null>(null);
  const measured = useMemo(() => new Map<number, number>(), [text]); // eslint-disable-line react-hooks/exhaustive-deps -- зачем: замер заново на новый текст
  const onWord = useCallback((i: number, e: LayoutChangeEvent) => {
    // зачем (Сверка 28.10, кадр 13 «челове|к»): ширины слов меряются ОДИН раз — в строке шириной maxWidth, где слово не переносится.
    // После сужения до «balance» узкое слово (число + слово через неразрывный пробел) переносилось внутри себя, повторный замер давал
    // меньшую ширину, строка сужалась ещё — петля рвала слово посреди. Повторные замеры того же текста не учитываем.
    if (measured.has(i)) return;
    measured.set(i, e.nativeEvent.layout.width); // guard-ok: Map в памяти — ширины слов для выравнивания строк, не запись данных
    if (measured.size === words.length) setWidths(words.map((_, k) => measured.get(k) ?? 0));
  }, [measured, words]);
  const width = widths ? balancedWidth(widths, gap, maxWidth) : maxWidth;
  return (
    <View testID={testID} accessible accessibilityRole={accessibilityRole} accessibilityLabel={text} style={[w.row, { width, columnGap: gap }]}>
      {words.map((word, i) => (
        <Enter key={`${i}-${word}`} kind="a" d={d0 + i * step}>
          <Text style={style} onLayout={(e) => onWord(i, e)}>{word}</Text>
        </Enter>
      ))}
    </View>
  );
});

// ── счётчик (cnt макета) ──────────────────────────────────────────────────────────────────────────────────────────

type CountProps = Readonly<{
  to: number;
  /** Задержка, мс (data-d). */
  d: number;
  /** Длительность счёта, мс (data-dur, ≤ 1200). */
  dur: number;
  prefix?: string;
  suffix?: string;
  style: StyleProp<TextStyle>;
  testID?: string;
}>;

/** Число считает от 0 до `to` (ease-out cubic, как tick() макета). Обновляется только этот Text и только при смене показанного числа. */
export const CountUp = memo(function CountUp({ to, d, dur, prefix = '', suffix = '', style, testID }: CountProps) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const finalText = `${prefix}${groupThousands(to)}${suffix}`;
  const [shown, setShown] = useState(() => (final ? finalText : `${prefix}0${suffix}`));
  useAnimatedReaction(
    () => {
      const p = phase(frameMs(progress.value, durationMs, final), d, dur);
      const e = 1 - Math.pow(1 - p, 3);
      return Math.round(to * e);
    },
    (value, previous) => {
      if (value !== previous) runOnJS(setShown)(`${prefix}${groupThousands(value)}${suffix}`);
    },
    [to, d, dur, prefix, suffix, final, durationMs],
  );
  return <Text testID={testID} style={[w.tabular, style]} accessibilityLabel={finalText}>{shown}</Text>;
});

// ── печать фразы по буквам (data-type макета) ─────────────────────────────────────────────────────────────────────

type TypeProps = Readonly<{
  text: string;
  /** Начало печати, мс. */
  d: number;
  /** Букв в секунду (12 по макету). */
  cps: number;
  style: StyleProp<TextStyle>;
  caretColor: string;
  testID?: string;
}>;

/** Фраза печатается по буквам, за ней мигает каретка (900 мс, steps(1)); допечатала — каретка исчезает. */
export const TypeLine = memo(function TypeLine({ text, d, cps, style, caretColor, testID }: TypeProps) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const [count, setCount] = useState(() => (final ? text.length : 0));
  const [caretOn, setCaretOn] = useState(true);
  useAnimatedReaction(
    () => {
      const t = frameMs(progress.value, durationMs, final);
      const n = Math.max(0, Math.min(text.length, Math.floor(((t - d) * cps) / 1000)));
      // каретка: половина периода 900 мс видна, половина нет (stCaret: 50 % { opacity: 0 }, steps(1))
      const caret = Math.floor(t / 450) % 2 === 0;
      return n * 2 + (caret ? 1 : 0);
    },
    (value, previous) => {
      if (value === previous) return;
      runOnJS(setCount)(Math.floor(value / 2));
      runOnJS(setCaretOn)(value % 2 === 1);
    },
    [text, d, cps, final, durationMs],
  );
  const done = count >= text.length;
  return (
    <View testID={testID} style={w.typeRow} accessible accessibilityLabel={text}>
      <Text style={style}>{text.slice(0, count)}</Text>
      {done ? null : <View style={[w.caret, { backgroundColor: caretColor, opacity: caretOn ? 1 : 0 }]} />}
    </View>
  );
});

const w = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignSelf: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  typeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  // .caret: 3 px × 0,9 em цвета --acc-g, скругление 2, отступ 3
  caret: { width: 3, height: 41, borderRadius: 2, marginLeft: 3 },
});
