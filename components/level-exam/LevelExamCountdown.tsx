import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { soundDirector } from '../../modules/audio/sound_director';
import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';
import ScreenGradient from '../ScreenGradient';
import { useTheme } from '../ThemeContext';
import TonalSurface from '../TonalSurface';
import { COUNTDOWN_STEP_MS, COUNTDOWN_TOTAL_MS } from './levelExamMotion';

type Props = {
  attemptId: string;
  level: string;
  active?: boolean;
  onComplete: () => void;
};

export default function LevelExamCountdown({ attemptId, level, active = true, onComplete }: Props) {
  const { theme: t, f, ds } = useTheme();
  const reducedMotion = useReducedMotion();
  const isFocused = useIsScreenFocused();
  const [step, setStep] = useState<3 | 2 | 1>(3);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const soundStartedRef = useRef(false);
  const completedRef = useRef(false);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!active || !isFocused || completedRef.current) return undefined;
    if (!soundStartedRef.current) {
      soundStartedRef.current = true;
      soundDirector.request('pm.exam.begin', { scope: 'level-exam', dedupeKey: attemptId });
    }

    if (reducedMotion) {
      const reducedTimer = setTimeout(finish, 220);
      return () => clearTimeout(reducedTimer);
    }

    setStep(3);
    const timers: ReturnType<typeof setTimeout>[] = [
      setTimeout(() => setStep(2), COUNTDOWN_STEP_MS),
      setTimeout(() => setStep(1), COUNTDOWN_STEP_MS * 2),
      setTimeout(finish, COUNTDOWN_TOTAL_MS),
    ];
    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [active, attemptId, finish, isFocused, reducedMotion]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(String(step));
    cancelAnimation(opacity);
    cancelAnimation(scale);
    if (reducedMotion) {
      opacity.value = withTiming(1, { duration: 120 });
      scale.value = 1;
      return;
    }
    opacity.value = 0.18;
    scale.value = 0.76;
    opacity.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(0.82, { duration: 320, easing: Easing.inOut(Easing.quad) }),
    );
    scale.value = withSequence(
      withTiming(1.08, { duration: 210, easing: Easing.out(Easing.back(1.4)) }),
      withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
    );
  }, [opacity, reducedMotion, scale, step]);

  useEffect(() => () => {
    cancelAnimation(opacity);
    cancelAnimation(scale);
  }, [opacity, scale]);

  const numberStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <ScreenGradient artBackdrop="exam">
      <View style={[styles.root, { padding: ds.spacing.xl }]}>
        <Text style={{ color: t.textMuted, fontSize: f.label, fontFamily: ds.fontFamily, fontWeight: '800' }}>
          {level}
        </Text>
        <TonalSurface
          tone="raised"
          radius={ds.radius.xl}
          accessibilityLiveRegion="assertive"
          accessibilityLabel={`${level}: ${step}`}
          style={[styles.numberSurface, { backgroundColor: t.accentBg }]}
        >
          <Animated.View style={[styles.numberWrap, numberStyle]}>
            <Text style={{ color: t.accent, fontSize: f.numLg * 3, fontFamily: ds.fontFamily, fontWeight: '900' }}>
              {step}
            </Text>
          </Animated.View>
        </TonalSurface>
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  numberSurface: { width: 176, height: 176, alignItems: 'center', justifyContent: 'center' },
  numberWrap: { alignItems: 'center', justifyContent: 'center' },
});
