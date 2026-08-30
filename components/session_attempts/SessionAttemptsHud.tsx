import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { getSessionAttemptsCopy } from '../../app/session_attempts/session_attempts_copy';
import { SESSION_ATTEMPTS_MAX } from '../../app/session_attempts/session_attempts_domain';
import { SESSION_ATTEMPTS_MOTION } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { soundDirector } from '../../modules/audio/sound_director';
import { useTheme } from '../ThemeContext';

type Props = {
  remaining: number;
  locale: string;
  total?: number;
  testID?: string;
};

type HeartSlotProps = {
  index: number;
  filled: boolean;
  activeColor: string;
  emptyColor: string;
};

function HeartSlot({ index, filled, activeColor, emptyColor }: HeartSlotProps) {
  const reduceMotion = useReduceMotion();
  const previousFilled = useRef(filled);
  const opacity = useSharedValue(filled ? 1 : 0);
  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const rotation = useSharedValue(0);
  const haloOpacity = useSharedValue(0);
  // зачем <number> (2026-08-30): as const в MOTION давал литеральный тип
  // 0.55, и анимация к haloEndScale не типизировалась.
  const haloScale = useSharedValue<number>(SESSION_ATTEMPTS_MOTION.haloStartScale);

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(scale);
    cancelAnimation(x);
    cancelAnimation(y);
    cancelAnimation(rotation);
    cancelAnimation(haloOpacity);
    cancelAnimation(haloScale);

    const wasFilled = previousFilled.current;
    haloOpacity.value = 0;
    haloScale.value = SESSION_ATTEMPTS_MOTION.haloStartScale;

    if (filled) {
      x.value = 0;
      if (!wasFilled && !reduceMotion) {
        const delayMs = index * SESSION_ATTEMPTS_MOTION.refillStaggerMs;
        opacity.value = 0;
        scale.value = SESSION_ATTEMPTS_MOTION.refillStartScale;
        y.value = SESSION_ATTEMPTS_MOTION.refillLiftPx;
        rotation.value = -SESSION_ATTEMPTS_MOTION.lossTiltDeg;
        opacity.value = withDelay(
          delayMs,
          withTiming(1, { duration: SESSION_ATTEMPTS_MOTION.refillFadeMs }),
        );
        scale.value = withDelay(
          delayMs,
          withSpring(1, SESSION_ATTEMPTS_MOTION.refillSpring),
        );
        y.value = withDelay(
          delayMs,
          withSpring(0, SESSION_ATTEMPTS_MOTION.refillSpring),
        );
        rotation.value = withDelay(
          delayMs,
          withSequence(
            withTiming(8, { duration: 90 }),
            withSpring(0, SESSION_ATTEMPTS_MOTION.refillSpring),
          ),
        );
        haloOpacity.value = withDelay(
          delayMs,
          withSequence(
            withTiming(0.72, { duration: 70 }),
            withTiming(0, { duration: SESSION_ATTEMPTS_MOTION.haloMs - 70 }),
          ),
        );
        haloScale.value = withDelay(
          delayMs,
          withTiming(SESSION_ATTEMPTS_MOTION.haloEndScale, {
            duration: SESSION_ATTEMPTS_MOTION.haloMs,
          }),
        );
      } else {
        opacity.value = 1;
        scale.value = 1;
        y.value = 0;
        rotation.value = 0;
      }
    } else if (wasFilled && !reduceMotion) {
      x.value = withSequence(
        ...SESSION_ATTEMPTS_MOTION.shakeOffsetsPx.map((offset) =>
          withTiming(offset, { duration: SESSION_ATTEMPTS_MOTION.shakeSegmentMs })),
      );
      scale.value = withSequence(
        withTiming(SESSION_ATTEMPTS_MOTION.lossPopScale, {
          duration: SESSION_ATTEMPTS_MOTION.lossPopMs,
        }),
        withTiming(SESSION_ATTEMPTS_MOTION.consumedScale, {
          duration: SESSION_ATTEMPTS_MOTION.lossExitMs,
        }),
      );
      y.value = withSequence(
        withTiming(SESSION_ATTEMPTS_MOTION.lossLiftPx, {
          duration: SESSION_ATTEMPTS_MOTION.lossPopMs,
        }),
        withTiming(SESSION_ATTEMPTS_MOTION.lossDropPx, {
          duration: SESSION_ATTEMPTS_MOTION.lossExitMs,
        }),
      );
      rotation.value = withSequence(
        withTiming(-SESSION_ATTEMPTS_MOTION.lossTiltDeg, { duration: 60 }),
        withTiming(10, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(0, { duration: 120 }),
      );
      opacity.value = withDelay(
        SESSION_ATTEMPTS_MOTION.lossPopMs,
        withTiming(0, { duration: SESSION_ATTEMPTS_MOTION.consumedFadeMs }),
      );
      haloOpacity.value = withSequence(
        withTiming(0.68, { duration: 60 }),
        withTiming(0, { duration: SESSION_ATTEMPTS_MOTION.haloMs - 60 }),
      );
      haloScale.value = withTiming(SESSION_ATTEMPTS_MOTION.haloEndScale, {
        duration: SESSION_ATTEMPTS_MOTION.haloMs,
      });
    } else {
      opacity.value = 0;
      scale.value = SESSION_ATTEMPTS_MOTION.consumedScale;
      x.value = 0;
      y.value = 0;
      rotation.value = 0;
    }

    previousFilled.current = filled;
  }, [filled, haloOpacity, haloScale, index, opacity, reduceMotion, rotation, scale, x, y]);

  const filledStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  return (
    <View style={styles.slot} accessible={false}>
      <Reanimated.View
        pointerEvents="none"
        style={[styles.halo, { borderColor: activeColor }, haloStyle]}
      />
      <Ionicons name="heart-outline" size={20} color={emptyColor} accessible={false} />
      <Reanimated.View style={[styles.filledHeart, filledStyle]} pointerEvents="none">
        <Ionicons name="heart" size={20} color={activeColor} accessible={false} />
      </Reanimated.View>
    </View>
  );
}

function SessionAttemptsHud({ remaining, locale, total = SESSION_ATTEMPTS_MAX, testID = 'session-attempts-hud' }: Props) {
  const { theme: t } = useTheme();
  const safeTotal = Math.max(1, Math.floor(total));
  const safeRemaining = Math.min(safeTotal, Math.max(0, Math.floor(remaining)));
  const accessibilityLabel = getSessionAttemptsCopy(locale).attemptsStatus(safeRemaining, safeTotal);

  // зачем: звук сердечек живёт в HUD, а не в 10 экранах-хостах — потеря и
  // восстановление видны здесь как смена remaining. Первый рендер молчит
  // (prev=null): при входе в сессию текущее состояние не озвучивается.
  const prevRemainingRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevRemainingRef.current;
    prevRemainingRef.current = safeRemaining;
    if (prev === null || safeRemaining === prev) return undefined;
    if (safeRemaining < prev) {
      // зачем: потеря совпадает по времени с pm.learn.needs_work неверного
      // ответа; задержка 300мс разводит их в последовательность «ответ →
      // сердечко ушло» и попадает в shake-фазу анимации HeartSlot.
      const timer = setTimeout(() => {
        soundDirector.request('pm.hearts.lost', { scope: 'session-attempts' });
      }, 300);
      return () => clearTimeout(timer);
    }
    // Восстановление (за руны/подарком) звучит сразу: модалка уже закрылась,
    // конкурирующих звуков в этот момент нет.
    soundDirector.request('pm.hearts.restored', { scope: 'session-attempts' });
    return undefined;
  }, [safeRemaining]);

  return (
    <View
      testID={testID}
      style={styles.row}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      {Array.from({ length: safeTotal }, (_, index) => (
        <HeartSlot
          key={index}
          index={index}
          filled={index < safeRemaining}
          activeColor={t.wrong}
          emptyColor={t.textGhost}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  slot: {
    width: 22,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledHeart: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
});

export default memo(SessionAttemptsHud);
