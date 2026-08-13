import React, { memo, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, StyleProp, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTournamentPalette } from '../tournament/tournament_theme';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

/**
 * Кольцо таймера ответа.
 *
 * Владелец (2026-08-12): вместо голой цифры — кольцо и полоса, с нарастанием
 * напряжения. Кольцо тает против часовой стрелки, цвет уходит от акцентного к
 * тревожному, на последних трёх секундах добавляется пульс и цифра дышит.
 *
 * Анимация целиком на UI-потоке: прогресс считается один раз при монтировании
 * из длительности задания, дальше JS не участвует — ни одного кадра не теряется
 * даже когда клиент занят проверкой ответа.
 */

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const ALARM_AT_MS = 3_000;

function ArenaTimerRingBase({
  /** Полная длительность задания в миллисекундах. */
  durationMs,
  /** Сколько уже прошло на момент монтирования — для восстановления после сворачивания. */
  elapsedMs = 0,
  size = 84,
  stroke = 7,
  paused = false,
  onExpire,
}: {
  durationMs: number;
  elapsedMs?: number;
  size?: number;
  stroke?: number;
  paused?: boolean;
  onExpire?: () => void;
}) {
  const P = useTournamentPalette();
  const reduceMotion = useReduceMotion();
  const radius = (size - stroke) / 2;
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);

  const total = Math.max(1, Math.trunc(durationMs));
  const startAt = Math.max(0, Math.min(total, Math.trunc(elapsedMs)));
  const remaining = Math.max(0, total - startAt);

  /** 1 — полное кольцо, 0 — время вышло. */
  const progress = useSharedValue(remaining / total);
  const alarm = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    progress.value = remaining / total;
    if (paused || remaining <= 0) return;
    progress.value = withTiming(0, { duration: remaining, easing: Easing.linear }, (finished) => {
      if (finished && onExpire) onExpire();
    });
  }, [onExpire, paused, progress, remaining, total]);

  useEffect(() => {
    cancelAnimation(alarm);
    alarm.value = 0;
    if (paused || reduceMotion) return;
    const untilAlarmMs = Math.max(0, remaining - ALARM_AT_MS);
    const timer = setTimeout(() => {
      alarm.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      );
    }, untilAlarmMs);
    return () => { clearTimeout(timer); cancelAnimation(alarm); };
  }, [alarm, paused, reduceMotion, remaining]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
    stroke: interpolateColor(progress.value, [0, 0.18, 0.45, 1], [P.danger, P.danger, P.gold, P.accent]),
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + alarm.value * 0.07 }],
  }));

  const digitStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + alarm.value * 0.1 }],
    color: interpolateColor(progress.value, [0, 0.18, 1], [P.danger, P.danger, P.text]),
  }));

  return (
    <Animated.View style={[{ width: size, height: size }, pulseStyle]}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={P.elev2}
          strokeWidth={stroke}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={ringProps}
          /* Старт сверху и таяние по часовой стрелке. */
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <ArenaTimerDigits durationMs={total} elapsedMs={startAt} paused={paused} style={digitStyle} />
      </View>
    </Animated.View>
  );
}

/**
 * Цифра секунд. Отдельный компонент: перерисовывается раз в секунду и не тянет
 * за собой перерисовку кольца, которое живёт на UI-потоке.
 */
function ArenaTimerDigits({
  durationMs,
  elapsedMs,
  paused,
  style,
}: {
  durationMs: number;
  elapsedMs: number;
  paused: boolean;
  /**
   * Стиль для Animated.Text, а не для Animated.View: он несёт `color`, поэтому
   * его тип обязан быть текстовым. `ReturnType<typeof useAnimatedStyle>` здесь
   * разъезжается с типом свойства и роняет проверку типов.
   */
  style: StyleProp<TextStyle>;
}) {
  const [seconds, setSeconds] = React.useState(
    () => Math.max(0, Math.ceil((durationMs - elapsedMs) / 1_000)),
  );

  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now() - elapsedMs;
    const tick = () => {
      const left = Math.max(0, Math.ceil((durationMs - (Date.now() - startedAt)) / 1_000));
      setSeconds(left);
    };
    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [durationMs, elapsedMs, paused]);

  return <Animated.Text style={[styles.digits, style]}>{seconds}</Animated.Text>;
}

export const ArenaTimerRing = memo(ArenaTimerRingBase);

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  digits: { fontSize: 27, fontWeight: '900', fontVariant: ['tabular-nums'] },
});
