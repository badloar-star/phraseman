// ═══════════════════════════════════════════════════════════════════════════
// tournament_v2_ui.tsx — примитивы турниров в дизайн-языке Learning V2.
//
// зачем: владелец утвердил макеты «Турниры в языке V2» (эталон
// docs/v2/mockups/02-phrase-builder.html). Здесь ровно те же материалы:
// градиентный чип с 3D-кромкой, CTA с переливом и полкой, счётчик-пилюля,
// стрик-пилюля с ярусами накала, карточка-поверхность, полоса рейтинга.
//
// ПРАВИЛА ВЛАДЕЛЬЦА: без обводок (глубина — градиент+тень+блик), без
// подписей-расшифровок мелким шрифтом, без adjustsFontSizeToFit, без эмодзи.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useCallback } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { hapticMediumImpact, hapticTap } from '../../hooks/use-haptics';
import { METAL, radius, useTournamentPalette, v2motion, type TournamentV2 } from './v2_theme';
import { StarGlyph } from './V2Fx';
import { useTheme } from '../ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Диагональ 160° из макета: from/end подобраны так, чтобы совпасть с CSS.
const DIAG_START = { x: 0.15, y: 0 } as const;
const DIAG_END = { x: 0.85, y: 1 } as const;
const VERT_START = { x: 0.5, y: 0 } as const;
const VERT_END = { x: 0.5, y: 1 } as const;

// ── Карточка-поверхность ────────────────────────────────────────────────────

/**
 * Поверхность V2: диагональный градиент surface + верхний блик вместо бордера.
 * Глубина строится тоном и тенью — обводки в режиме запрещены.
 */
export const V2Card = memo(function V2Card({
  children, pad = 20, style,
}: { children: React.ReactNode; pad?: number; style?: StyleProp<ViewStyle> }) {
  const P = useTournamentPalette();
  return (
    <View style={[styles.card, { padding: pad }, style]}>
      <LinearGradient
        colors={[P.surfaceGradA, P.surfaceGradB]}
        start={DIAG_START}
        end={DIAG_END}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.topHi, { backgroundColor: P.chipHi }]} pointerEvents="none" />
      {children}
    </View>
  );
});

// ── CTA с переливом и полкой ────────────────────────────────────────────────

type CtaProps = {
  children: React.ReactNode;
  onPress?: () => void;
  /** Тон: акцент (по умолчанию), нейтральная поверхность или золотой приз. */
  tone?: 'accent' | 'ghost' | 'gold';
  disabled?: boolean;
  /** Прогресс-заливка автоперехода «Дальше» (1400 мс). */
  autoNext?: boolean;
  style?: StyleProp<ViewStyle>;
  left?: React.ReactNode;
  right?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/**
 * Главная кнопка V2: объёмная «полка» снизу, при нажатии кнопка съезжает на её
 * глубину — нажатие ощущается физически (эталон: translateY 4px за 120 мс).
 */
export const V2Cta = memo(function V2Cta({
  children, onPress, tone = 'accent', disabled, autoNext, style, left, right, accessibilityLabel, accessibilityHint,
}: CtaProps) {
  const P = useTournamentPalette();
  const { themeMode } = useTheme();
  const isOlive = themeMode === 'olive';
  const depth = useSharedValue(0);
  const fill = useSharedValue(0);

  const shellStyle = useAnimatedStyle(() => ({ transform: [{ translateY: depth.value }] }));
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: fill.value }] }));

  React.useEffect(() => {
    if (!autoNext) { fill.value = 0; return; }
    fill.value = 0;
    fill.value = withTiming(1, { duration: v2motion.autoNextMs });
  }, [autoNext, fill]);

  const handlePressIn = useCallback(() => {
    depth.value = withTiming(4, { duration: v2motion.press });
  }, [depth]);
  const handlePressOut = useCallback(() => {
    depth.value = withSpring(0, { damping: 20, stiffness: 400 });
  }, [depth]);
  const handlePress = useCallback(() => {
    if (disabled) return;
    // Хаптик только на управляющих кнопках — правило владельца.
    void hapticMediumImpact();
    onPress?.();
  }, [disabled, onPress]);

  const gradient: readonly [string, string, ...string[]] = tone === 'gold'
    ? METAL.ctaGold
    : tone === 'ghost'
      ? [P.surfaceGradA, P.surfaceGradB]
      : [P.ctaGradA, P.ctaGradB, P.ctaGradC];
  const shelf = tone === 'gold' ? METAL.ctaGoldShelf : tone === 'ghost' ? P.chipEdge : P.ctaShelf;
  const ink = tone === 'gold' ? METAL.ctaGoldInk : tone === 'ghost' ? P.text : P.okInk;

  return (
    <View style={[{ borderRadius: radius.md + 2, backgroundColor: disabled ? P.elev2 : shelf, paddingBottom: 5 }, style]}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={disabled ? accessibilityHint : undefined}
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[styles.cta, { backgroundColor: disabled ? P.elev2 : 'transparent' }, shellStyle]}
      >
        {!disabled ? (
          <LinearGradient colors={gradient} start={VERT_START} end={VERT_END} style={StyleSheet.absoluteFill} />
        ) : null}
        {!disabled ? <View style={[styles.topHi, { backgroundColor: P.ctaHi }]} pointerEvents="none" /> : null}
        {autoNext ? (
          <Animated.View style={[styles.autoFill, { backgroundColor: isOlive ? 'rgba(227,204,136,0.14)' : 'rgba(255,255,255,0.22)' }, fillStyle]} pointerEvents="none" />
        ) : null}
        <View style={styles.ctaRow}>
          {left}
          <Text style={[styles.ctaText, { color: disabled ? P.ghost : ink }]}>
            {children}
          </Text>
          {right}
        </View>
      </AnimatedPressable>
    </View>
  );
});

// ── Чип / плита-опция ───────────────────────────────────────────────────────

export type ChipVerdict = 'idle' | 'ok' | 'bad' | 'dim';

type ChipProps = {
  children: React.ReactNode;
  onPress?: () => void;
  verdict?: ChipVerdict;
  /** Плита на всю ширину (вариант ответа) vs компактный чип (слово). */
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  disabled?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  selected?: boolean;
  /** Читалка экрана: без метки вариант ответа звучит как «кнопка». */
  accessibilityLabel?: string;
};

/**
 * Чип V2: диагональный градиент, нижняя 3D-кромка, блик сверху.
 * Нажатие — просадка на кромку (translateY 3px), как в эталоне.
 */
export const V2Chip = memo(function V2Chip({
  children, onPress, verdict = 'idle', block, style, textStyle, disabled,
  accessibilityLabel, left, right, selected,
}: ChipProps) {
  const P = useTournamentPalette();
  const depth = useSharedValue(0);
  const pop = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: depth.value }, { scale: pop.value }] as const,
  }));

  React.useEffect(() => {
    if (verdict !== 'ok') return;
    // okPop: сквош 1.04/0.94 → 1 (эталон 340 мс spring).
    pop.value = withSpring(1.03, { damping: 9, stiffness: 320 }, () => {
      pop.value = withSpring(1, { damping: 14, stiffness: 260 });
    });
  }, [verdict, pop]);

  const handlePressIn = useCallback(() => {
    depth.value = withTiming(3, { duration: v2motion.press });
  }, [depth]);
  const handlePressOut = useCallback(() => {
    depth.value = withSpring(0, { damping: 20, stiffness: 400 });
  }, [depth]);
  const handlePress = useCallback(() => {
    if (disabled) return;
    // Плитки/слова — вибрация, НЕ клик-звук (правило владельца).
    void hapticTap();
    onPress?.();
  }, [disabled, onPress]);

  const isOk = verdict === 'ok';
  const colors: readonly [string, string] = isOk ? [P.okGradA, P.okGradB] : [P.chipGradA, P.chipGradB];
  const ink = isOk ? P.okInk : P.text;

  return (
    <View style={[
      { borderRadius: block ? radius.md + 2 : radius.md, backgroundColor: isOk ? P.ctaShelf : P.chipEdge, paddingBottom: 4 },
      block ? styles.blockWrap : null,
      verdict === 'dim' ? styles.dim : null,
      style,
    ]}>
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: disabled || verdict === 'dim', selected: verdict === 'ok' }}
        disabled={disabled || verdict === 'dim'}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[block ? styles.optBody : styles.chipBody, animStyle]}
      >
        <LinearGradient colors={colors} start={DIAG_START} end={DIAG_END} style={StyleSheet.absoluteFill} />
        {verdict === 'bad' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: P.dangerSoft }]} pointerEvents="none" />
        ) : null}
        {selected && verdict === 'idle' ? (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: P.accentSoft }]} pointerEvents="none" />
        ) : null}
        <View style={[styles.topHi, { backgroundColor: P.chipHi }]} pointerEvents="none" />
        {left || right ? (
          <View style={styles.optRow}>
            {left}
            <View style={styles.optCopy}>{children}</View>
            {right}
          </View>
        ) : (
          <Text style={[block ? styles.optText : styles.chipText, { color: ink }, textStyle]}>
            {children}
          </Text>
        )}
      </AnimatedPressable>
    </View>
  );
});

/** Гнездо в банке слов: место чипа сохранено, банк не «прыгает». */
export const V2ChipGhost = memo(function V2ChipGhost({ label }: { label: string }) {
  const P = useTournamentPalette();
  return (
    <View style={[styles.chipBody, styles.ghostChip, { backgroundColor: P.elev }]}>
      <Text style={[styles.chipText, { color: 'transparent' }]}>{label}</Text>
    </View>
  );
});

// ── Счётчик-пилюля ──────────────────────────────────────────────────────────

export type CounterTone = 'stars' | 'gems' | 'miss' | 'plain';

/**
 * Пилюля счётчика с bump-анимацией (scale 1.28) при изменении значения —
 * тот же язык, что у звёзд/ошибок в V2.
 */
export const V2Counter = memo(React.forwardRef<View, {
  value: number | string;
  tone?: CounterTone;
  icon?: React.ReactNode;
  dimmed?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
}>(function V2Counter({
  value, tone = 'plain', icon, dimmed, style, accessibilityLabel, accessibilityLiveRegion,
}, ref) {
  const P = useTournamentPalette();
  const scale = useSharedValue(1);
  const prev = React.useRef(value);

  React.useEffect(() => {
    if (prev.current === value) return;
    prev.current = value;
    scale.value = withSpring(1.28, { damping: 8, stiffness: 340 }, () => {
      scale.value = withSpring(1, { damping: 15, stiffness: 260 });
    });
  }, [value, scale]);

  const inner = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bg = tone === 'stars' ? P.goldSoft : tone === 'gems' ? P.accentSoft : tone === 'miss' ? P.dangerSoft : P.card;
  const fg = tone === 'stars' ? P.gold : tone === 'gems' ? P.accent : tone === 'miss' ? P.danger : P.text;

  return (
    <View
      ref={ref}
      style={[styles.pill, { backgroundColor: bg, opacity: dimmed ? 0.4 : 1 }, style]}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion={accessibilityLiveRegion}
    >
      <View style={[styles.topHi, { backgroundColor: P.chipHi }]} pointerEvents="none" />
      <Animated.View style={[styles.pillRow, inner]}>
        {icon ?? (tone === 'stars' ? <StarGlyph size={14} color={fg} /> : null)}
        <Text style={[styles.pillText, { color: fg }]}>{value}</Text>
      </Animated.View>
    </View>
  );
}));

/**
 * Пилюля серии: три яруса накала (2-3 / 4-5 / 6+). На максимуме — сплошное
 * золото с тёмным текстом. Появление — spring-пружина, как в эталоне.
 */
export const V2StreakPill = memo(React.forwardRef<View, { streak: number }>(
  function V2StreakPill({ streak }, ref) {
    const P = useTournamentPalette();
    const scale = useSharedValue(0.6);
    const opacity = useSharedValue(0);
    const visible = streak >= 2;

    React.useEffect(() => {
      if (!visible) { opacity.value = withTiming(0, { duration: v2motion.fast }); return; }
      opacity.value = withTiming(1, { duration: v2motion.fast });
      scale.value = withSpring(1.12, { damping: 9, stiffness: 300 }, () => {
        scale.value = withSpring(1, { damping: 14, stiffness: 260 });
      });
    }, [visible, streak, scale, opacity]);

    const anim = useAnimatedStyle(() => ({
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    }));

    if (!visible) return null;
    const tier = streak >= 6 ? 3 : streak >= 4 ? 2 : 1;
    const bg = tier === 3 ? P.gold : tier === 2 ? P.goldSoft : P.goldSoft;
    const fg = tier === 3 ? P.onGold : P.gold;

    return (
      <Animated.View ref={ref} style={[styles.pill, { backgroundColor: bg }, anim]}>
        <View style={[styles.topHi, { backgroundColor: P.chipHi }]} pointerEvents="none" />
        <View style={styles.pillRow}>
          <StarGlyph size={13} color={fg} />
          <Text style={[styles.pillText, { color: fg }]}>{streak}</Text>
        </View>
      </Animated.View>
    );
  },
));

// ── Сегменты прогресса вопроса ──────────────────────────────────────────────

/** Сегментированный трек: заполнение слева направо за 320 мс (ease-slide). */
export const V2Segments = memo(function V2Segments({
  total, done, style,
}: { total: number; done: number; style?: StyleProp<ViewStyle> }) {
  const P = useTournamentPalette();
  return (
    <View style={[styles.segTrack, style]}>
      {Array.from({ length: total }, (_, i) => (
        <V2Segment key={`seg-${total}-${i}`} filled={i < done} palette={P} />
      ))}
    </View>
  );
});

const V2Segment = memo(function V2Segment({ filled, palette }: { filled: boolean; palette: TournamentV2 }) {
  const w = useSharedValue(filled ? 1 : 0);
  React.useEffect(() => {
    w.value = withTiming(filled ? 1 : 0, { duration: v2motion.slow });
  }, [filled, w]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: w.value }] }));
  return (
    <View style={[styles.seg, { backgroundColor: palette.elev2 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.segFillWrap, style]}>
        <LinearGradient
          colors={[palette.accent, palette.okGradA]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
});

// ── Строка рейтинга с полосой ───────────────────────────────────────────────

/**
 * Строка таблицы: полоса-рейтинг под контентом, длина пропорциональна звёздам,
 * оттенок — своя ступень акцента активной темы (требование владельца
 * 2026-07-26: «не только очки справа, а каждая полоска длиннее по звёздам,
 * и у каждой свой оттенок основных цветов темы»).
 */
export const V2RatingRow = memo(function V2RatingRow({
  ratio, mix, highlighted, children, style,
}: {
  /** Доля от лидера, 0..1. */
  ratio: number;
  /** Насыщенность акцента в полосе, 0..1 (ступень оттенка). */
  mix: number;
  highlighted?: boolean;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const P = useTournamentPalette();
  const width = useSharedValue(0);

  React.useEffect(() => {
    width.value = withTiming(Math.max(0.12, Math.min(1, ratio)), { duration: v2motion.slow });
  }, [ratio, width]);

  const barStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  return (
    <View style={[styles.row, { backgroundColor: highlighted ? P.accentSoft : P.card }, style]}>
      <Animated.View style={[styles.rowBar, barStyle]} pointerEvents="none">
        <LinearGradient
          colors={[
            mixWithAlpha(P.accent, mix + (highlighted ? 0.1 : 0)),
            mixWithAlpha(P.accent, Math.max(0, mix - 0.08)),
          ]}
          start={DIAG_START}
          end={DIAG_END}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View style={[styles.topHi, { backgroundColor: P.chipHi }]} pointerEvents="none" />
      <View style={styles.rowContent}>{children}</View>
    </View>
  );
});

/** rgba от акцента: ступень прозрачности = ступень оттенка на фоне карточки. */
function mixWithAlpha(hex: string, alpha: number): string {
  const p = parseInt(hex.slice(1), 16);
  return `rgba(${(p >> 16) & 255},${(p >> 8) & 255},${p & 255},${Math.max(0.04, Math.min(0.6, alpha))})`;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg - 2,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  topHi: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  cta: {
    borderRadius: radius.md + 2,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  ctaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },
  autoFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    right: 0,
    backgroundColor: 'transparent',
    transformOrigin: 'left',
  },
  blockWrap: { width: '100%' },
  chipBody: {
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 13,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostChip: {
    borderRadius: radius.md,
    opacity: 0.7,
  },
  chipText: { fontSize: 17.5, fontWeight: '700', letterSpacing: 0.2 },
  optBody: {
    borderRadius: radius.md + 2,
    paddingHorizontal: 18,
    paddingVertical: 15,
    overflow: 'hidden',
    minHeight: 56,
    justifyContent: 'center',
  },
  optText: { fontSize: 16.5, fontWeight: '700', letterSpacing: 0.1, lineHeight: 22 },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 14, minWidth: 0 },
  optCopy: { flex: 1, minWidth: 0 },
  dim: { opacity: 0.38 },
  pill: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillText: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  segTrack: { flex: 1, flexDirection: 'row', gap: 5, height: 10 },
  seg: { flex: 1, borderRadius: 5, overflow: 'hidden' },
  segFillWrap: { transformOrigin: 'left', borderRadius: 5, overflow: 'hidden' },
  row: {
    borderRadius: radius.md + 2,
    overflow: 'hidden',
    minHeight: 56,
    justifyContent: 'center',
  },
  rowBar: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  rowContent: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 10 },
});
