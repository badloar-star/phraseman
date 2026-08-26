import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { getSessionAttemptsCopy } from '../../app/session_attempts/session_attempts_copy';
import { SESSION_ATTEMPTS_MAX } from '../../app/session_attempts/session_attempts_domain';
import { SESSION_ATTEMPTS_MOTION } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTheme } from '../ThemeContext';

type Props = {
  remaining: number;
  locale: string;
  total?: number;
  testID?: string;
};

type HeartSlotProps = {
  filled: boolean;
  activeColor: string;
  emptyColor: string;
};

function HeartSlot({ filled, activeColor, emptyColor }: HeartSlotProps) {
  const reduceMotion = useReduceMotion();
  const previousFilled = useRef(filled);
  const opacity = useSharedValue(filled ? 1 : 0);
  const scale = useSharedValue(1);
  const x = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(scale);
    cancelAnimation(x);

    if (filled) {
      opacity.value = 1;
      scale.value = 1;
      x.value = 0;
    } else if (previousFilled.current && !reduceMotion) {
      x.value = withSequence(
        ...SESSION_ATTEMPTS_MOTION.shakeOffsetsPx.map((offset) =>
          withTiming(offset, { duration: SESSION_ATTEMPTS_MOTION.shakeSegmentMs })),
      );
      scale.value = withTiming(SESSION_ATTEMPTS_MOTION.consumedScale, {
        duration: SESSION_ATTEMPTS_MOTION.consumedFadeMs,
      });
      opacity.value = withTiming(0, { duration: SESSION_ATTEMPTS_MOTION.consumedFadeMs });
    } else {
      opacity.value = 0;
      scale.value = SESSION_ATTEMPTS_MOTION.consumedScale;
      x.value = 0;
    }

    previousFilled.current = filled;
  }, [filled, opacity, reduceMotion, scale, x]);

  const filledStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: x.value }, { scale: scale.value }],
  }));

  return (
    <View style={styles.slot} accessible={false}>
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
});

export default memo(SessionAttemptsHud);
