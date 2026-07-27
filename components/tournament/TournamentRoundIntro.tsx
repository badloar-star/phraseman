// ═══════════════════════════════════════════════════════════════════════════
// TournamentRoundIntro.tsx — отсчёт «3 · 2 · 1» перед каждым раундом.
//
// зачем 2026-07-27 (владелец: «потом отсчёт перед началом типа 3 2 1, потом
// начинается первый вопрос… снова таблица, снова отсчёт, снова 4 вопроса»):
// раньше между таблицей и вопросом висела статичная надпись «Раунд N» на
// 1600 мс — игрок не понимал, сколько ещё ждать, и первый вопрос появлялся
// внезапно. Отсчёт задаёт общий старт: все 16 участников входят в раунд
// синхронно и успевают собраться.
//
// Движение — язык Learning V2: цифра приходит с перелётом (spring), уходит
// вверх с ростом, кольцо стягивается за один шаг. Тайминги и кривые из
// v2motion, чтобы отсчёт не выбивался из ритма остальных режимов.
// ═══════════════════════════════════════════════════════════════════════════

import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';

import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { useTournamentPalette, v2motion } from './tournament_theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 168;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** С какой цифры начинаем. Три шага — привычный старт, как на табло. */
const COUNT_FROM = 3;

type Props = {
  /** Номер раунда — подпись над отсчётом. */
  roundNo: number;
  /** Название режима раунда: игрок заранее знает, что его ждёт. */
  modeLabel: string;
  /** Отсчёт закончился — экран раунда показывает первый вопрос. */
  onDone: () => void;
};

/**
 * Экран-заставка раунда с отсчётом.
 *
 * Один таймер на компонент, чистится при уходе (Performance Bible: guarded
 * loops) — иначе отсчёт продолжал бы тикать в фоне и греть телефон.
 */
export const TournamentRoundIntro = memo(function TournamentRoundIntro({
  roundNo, modeLabel, onDone,
}: Props) {
  const P = useTournamentPalette();
  const styles = React.useMemo(() => makeStyles(P), [P]);
  const runtimeActive = useRuntimeActive();

  const [count, setCount] = useState(COUNT_FROM);

  // Шаг отсчёта. Экран ушёл в фон — таймер не создаём вовсе.
  useEffect(() => {
    if (!runtimeActive) return;
    if (count <= 0) {
      onDone();
      return;
    }
    const id = setTimeout(() => setCount((value) => value - 1), v2motion.countdownStepMs);
    return () => clearTimeout(id);
  }, [count, onDone, runtimeActive]);

  // Тик — короткая вибрация: отсчёт чувствуется телом, а не только глазами.
  // зачем вибрация, а не звук: правило владельца — клик-звук только на
  // управляющих кнопках, здесь ничего не нажимают.
  useEffect(() => {
    if (!runtimeActive || count <= 0) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [count, runtimeActive]);

  return (
    <View style={styles.root}>
      <Text style={styles.round}>Раунд {roundNo}</Text>
      <Text style={styles.mode}>{modeLabel}</Text>

      <View style={styles.ringBox}>
        <CountRing key={count} palette={P} active={runtimeActive} />
        <CountDigit key={`d${count}`} value={count} styles={styles} />
      </View>
    </View>
  );
});

/**
 * Кольцо, стягивающееся за один шаг отсчёта.
 * key={count} снаружи пересоздаёт компонент на каждой цифре — анимация
 * стартует заново без ручного сброса значений.
 */
const CountRing = memo(function CountRing({
  palette, active,
}: { palette: ReturnType<typeof useTournamentPalette>; active: boolean }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: v2motion.countdownStepMs,
      easing: Easing.linear,
    });
    // Останавливаем анимацию при уходе: незавершённый таймер на UI-потоке
    // продолжал бы работать и после размонтирования.
    return () => cancelAnimation(progress);
  }, [active, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LENGTH * progress.value,
  }));

  return (
    <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
      {/* Подложка кольца — тоном, без обводки контейнера. */}
      <Circle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        stroke={palette.accentSoft}
        strokeWidth={RING_STROKE}
        fill="none"
      />
      <AnimatedCircle
        cx={RING_SIZE / 2}
        cy={RING_SIZE / 2}
        r={RING_RADIUS}
        stroke={palette.accent}
        strokeWidth={RING_STROKE}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={RING_LENGTH}
        animatedProps={animatedProps}
        // Старт сверху, а не справа.
        transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
      />
    </Svg>
  );
});

/** Цифра: приходит с перелётом, уходит вверх растворяясь. */
const CountDigit = memo(function CountDigit({
  value, styles,
}: { value: number; styles: ReturnType<typeof makeStyles> }) {
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.08, {
        duration: v2motion.fast,
        easing: Easing.bezier(...v2motion.bezierSpring),
      }),
      withTiming(1, {
        duration: v2motion.press,
        easing: Easing.bezier(...v2motion.bezierOutQuint),
      }),
    );
    opacity.value = withTiming(1, { duration: v2motion.press });
    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, [scale, opacity]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.digitBox, style]}>
      <Text style={styles.digit} allowFontScaling={false}>
        {value > 0 ? value : 'Старт'}
      </Text>
    </Animated.View>
  );
});

function makeStyles(P: ReturnType<typeof useTournamentPalette>) {
  return StyleSheet.create({
    root: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      backgroundColor: P.bg,
    },
    round: { ...typeTitle, color: P.text },
    // Режим — полноценная строка, а не мелкая подпись-расшифровка под
    // заголовком (запрет владельца): тот же вес, акцентный цвет.
    mode: { fontSize: 17, fontWeight: '800', color: P.accent, marginBottom: 22 },
    ringBox: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    digitBox: { alignItems: 'center', justifyContent: 'center' },
    digit: {
      fontSize: 76,
      fontWeight: '900',
      color: P.text,
      letterSpacing: -2,
      // Моноширинные цифры: 3 и 2 не должны менять ширину блока.
      fontVariant: ['tabular-nums'],
    },
  });
}

const typeTitle = { fontSize: 28, fontWeight: '900' as const, letterSpacing: -0.8 };
