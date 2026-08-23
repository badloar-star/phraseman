import React, { memo, useEffect, useMemo } from 'react';
import { View } from 'react-native';
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
import { useTournamentPalette } from '../ui/v2_theme';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useArenaSound } from '../../hooks/use_arena_sound';

/**
 * Кольцо таймера ответа.
 *
 * Владелец (2026-08-12): вместо голой цифры — кольцо и полоса, с нарастанием
 * напряжения. Кольцо тает против часовой стрелки, цвет уходит от акцентного к
 * тревожному, на последних трёх секундах добавляется пульс.
 *
 * зачем: владелец (2026-08-23) убрал отсчёт секунд цифрами — остаётся только
 * индикатор. Цифра тикала раз в 250 мс через setState и была единственным
 * источником перерисовок этого узла; без неё таймер живёт целиком на UI-потоке
 * и не даёт ни одного JS-кадра за задание.
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
  const playSound = useArenaSound();
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

  /**
   * Тик последних секунд.
   *
   * Звук отдельным эффектом, а не внутри пульса, нарочно: пульс выключается
   * при «уменьшить движение», а звук к движению отношения не имеет — глушить
   * его вместе с анимацией значило бы отнимать у человека ещё и подсказку.
   *
   * Каденция — раз в секунду, ровно та, под которую в каталоге задана пауза
   * между повторами (700 мс). Тиков ровно столько, сколько секунд в тревожной
   * фазе: бесконечный интервал пережил бы конец задания.
   */
  useEffect(() => {
    if (paused || remaining <= 0) return;
    const untilAlarmMs = Math.max(0, remaining - ALARM_AT_MS);
    const limit = Math.ceil(Math.min(ALARM_AT_MS, remaining) / 1_000);
    let played = 0;
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = setTimeout(() => {
      playSound('timerTick');
      played += 1;
      interval = setInterval(() => {
        if (played >= limit) {
          if (interval) clearInterval(interval);
          return;
        }
        played += 1;
        playSound('timerTick');
      }, 1_000);
    }, untilAlarmMs);
    return () => {
      clearTimeout(start);
      if (interval) clearInterval(interval);
    };
  }, [paused, playSound, remaining]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
    stroke: interpolateColor(progress.value, [0, 0.18, 0.45, 1], [P.danger, P.danger, P.gold, P.accent]),
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + alarm.value * 0.07 }],
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
    </Animated.View>
  );
}

export const ArenaTimerRing = memo(ArenaTimerRingBase);
