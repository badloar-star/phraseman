/**
 * UndoSnackbar — отмена удаления с ВИДИМЫМ таймером.
 *
 * зачем (аудит 2026-09-21): undo в коллекции карточек уже есть, но без таймера —
 * человек не знает, сколько у него секунд, и снэкбар исчезает «вдруг». Кольцо
 * отсчитывает вслух. Удаление набора (сейчас необратимо) получает тот же путь.
 * Макет: docs/v2/mockups/33-new-ui-system-catalog.html, элемент 3.
 *
 * ⚠️ СКЕЛЕТ. Пока НИ ОДИН экран его не импортирует.
 *
 * Контракт (важно для того, кто подключает):
 *   · элемент исчезает из списка СРАЗУ (Optimistic), запрос на удаление НЕ
 *     уходит, пока идёт окно отмены;
 *   · «Вернуть» → элемент на место, запрос не уходит ВООБЩЕ (а не «удалили и
 *     создали заново» — это породило бы новый id и потерю истории);
 *   · таймаут → onCommit, удаление уходит на сервер.
 *
 * Геометрия и хром — как у ActionToast (minHeight 66, radius 18, padding 12/14,
 * gap 12), чтобы на экране не появился второй визуальный язык уведомлений.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useTheme } from '../../ThemeContext';
import { MOTION_SPRING } from '../../../constants/motion';
import { useReduceMotion } from '../../../hooks/use_reduce_motion';

const AnimatedCircle = Reanimated.createAnimatedComponent(Circle);

/** Окно отмены. 5 секунд — успеть прочитать и передумать, но не держать экран. */
const UNDO_WINDOW_MS = 5000;
const RING_R = 14;
const RING_LEN = 2 * Math.PI * RING_R; // 87.96 → dasharray 88 в макете

export type UndoSnackbarProps = Readonly<{
  visible: boolean;
  /** Что удалили — показываем сам предмет, а не «элемент удалён». */
  message: string;
  label: string;
  undoLabel: string;
  /** Человек передумал: вернуть на место, запрос НЕ отправлять. */
  onUndo: () => void;
  /** Окно вышло: теперь можно удалять на сервере. */
  onCommit: () => void;
  bottomOffset?: number;
}>;

export default function UndoSnackbar({
  visible,
  message,
  label,
  undoLabel,
  onUndo,
  onCommit,
  bottomOffset = 22,
}: UndoSnackbarProps) {
  const { theme: t, f } = useTheme();
  const reduceMotion = useReduceMotion();

  const enter = useSharedValue(0);
  const drain = useSharedValue(0);
  const [secondsLeft, setSecondsLeft] = useState(Math.round(UNDO_WINDOW_MS / 1000));

  // зачем: один и тот же коммит не должен уйти дважды (таймаут + размонтирование).
  const committedRef = useRef(false);
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (commitTimerRef.current) { clearTimeout(commitTimerRef.current); commitTimerRef.current = null; }
    if (tickTimerRef.current) { clearInterval(tickTimerRef.current); tickTimerRef.current = null; }
  }, []);

  useEffect(() => {
    if (!visible) {
      enter.value = withTiming(0, { duration: 180 });
      clearTimers();
      return;
    }

    committedRef.current = false;
    setSecondsLeft(Math.round(UNDO_WINDOW_MS / 1000));

    // Вход — spring toast {damping 18, stiffness 250} из constants/motion.
    enter.value = reduceMotion
      ? 1
      : withSpring(1, { damping: MOTION_SPRING.toast.damping, stiffness: MOTION_SPRING.toast.stiffness, mass: MOTION_SPRING.toast.mass });

    drain.value = 0;
    drain.value = withTiming(1, { duration: UNDO_WINDOW_MS, easing: Easing.linear });

    tickTimerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    commitTimerRef.current = setTimeout(() => {
      if (committedRef.current) return;
      committedRef.current = true;
      if (__DEV__) console.log('[UNDO] commit:timeout', JSON.stringify({ message }));
      onCommit();
    }, UNDO_WINDOW_MS);

    return () => {
      clearTimers();
      cancelAnimation(drain);
    };
  }, [clearTimers, drain, enter, message, onCommit, reduceMotion, visible]);

  const handleUndo = useCallback(() => {
    if (committedRef.current) {
      // guard-ok: ранний return всегда объясняет причину. Тап после коммита —
      // редкая гонка, и без лога она выглядит как «кнопка не работает».
      console.warn('[UNDO] undo:ignored_already_committed', JSON.stringify({ message })); // guard-ok
      return;
    }
    committedRef.current = true;
    clearTimers();
    if (__DEV__) console.log('[UNDO] undo', JSON.stringify({ message, secondsLeft }));
    onUndo();
  }, [clearTimers, message, onUndo, secondsLeft]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateY: (1 - enter.value) * 90 }],
  }));

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_LEN * drain.value,
  }));

  if (!visible) return null;

  return (
    <Reanimated.View
      style={[styles.wrap, { bottom: bottomOffset }, cardStyle]}
      pointerEvents="box-none"
    >
      <View style={[styles.card, { backgroundColor: t.bgSurface }]}>
        <View style={styles.ring}>
          <Svg width={34} height={34} viewBox="0 0 34 34">
            <Circle cx={17} cy={17} r={RING_R} stroke="rgba(255,255,255,0.10)" strokeWidth={3} fill="none" />
            <AnimatedCircle
              cx={17}
              cy={17}
              r={RING_R}
              stroke={t.accent}
              strokeWidth={3}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={RING_LEN}
              animatedProps={ringProps}
              // Кольцо стартует сверху, как циферблат.
              transform="rotate(-90 17 17)"
            />
          </Svg>
          <View style={styles.ringLabel} pointerEvents="none">
            <Text style={[styles.count, { color: t.textMuted }]}>{secondsLeft}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[styles.label, { color: t.accent }]}>{label.toUpperCase()}</Text>
          <Text style={[styles.msg, { color: t.textPrimary, fontSize: f.bodyLg }]} numberOfLines={2}>
            {message}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${undoLabel}. ${secondsLeft}`}
          hitSlop={8}
          onPress={handleUndo}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: t.accentBg, transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
        >
          <Text style={[styles.actionText, { color: t.accent }]}>{undoLabel}</Text>
        </Pressable>
      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 14, right: 14 },
  // Геометрия дословно из ActionToast — один визуальный язык уведомлений.
  card: {
    minHeight: 66,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ring: { width: 34, height: 34, flexShrink: 0 },
  ringLabel: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  count: { fontSize: 11.5, fontWeight: '800', fontVariant: ['tabular-nums'] },
  body: { flex: 1, minWidth: 0, gap: 2 },
  label: { fontSize: 12, fontWeight: '800', letterSpacing: 0.4 },
  msg: { fontWeight: '700' },
  action: { flexShrink: 0, borderRadius: 12, paddingHorizontal: 15, paddingVertical: 10 },
  actionText: { fontSize: 13.5, fontWeight: '800' },
});
