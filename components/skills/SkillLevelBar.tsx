import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, { Easing, cancelAnimation, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { KIT_MOTION } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

type Props = Readonly<{ ratio: number; delayMs?: number; trackColor: string; fillColor: string }>;

/**
 * Полоска уровня навыка. Макет: заливка доезжает за 800 мс (kit.css `.trk > i`), строки стартуют лесенкой по 80 мс.
 * зачем: высота и дорожка заданы сразу — первый кадр имеет конечную геометрию, растёт только заливка.
 */
function SkillLevelBar({ ratio, delayMs = 0, trackColor, fillColor }: Props) {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
  const reduceMotion = useReduceMotion();
  const fill = useSharedValue(reduceMotion ? clamped : 0);

  useEffect(() => {
    if (reduceMotion) {
      fill.value = clamped;
      return undefined;
    }
    fill.value = withDelay(delayMs, withTiming(clamped, { duration: KIT_MOTION.progressMs, easing: Easing.bezier(...KIT_MOTION.progressEase) }));
    return () => cancelAnimation(fill);
  }, [clamped, delayMs, reduceMotion, fill]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));

  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }} style={[styles.track, { backgroundColor: trackColor }]}>
      <Reanimated.View style={[styles.fill, { backgroundColor: fillColor }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});

export default memo(SkillLevelBar);
