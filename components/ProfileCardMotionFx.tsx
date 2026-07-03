import React, { memo, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from './SafeLinearGradient';
import { fxKindForProfileCard, type ProfileCardFxKind } from '../app/profile_card_system';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';

export { fxKindForProfileCard };
export type { ProfileCardFxKind };

type Props = {
  kind: ProfileCardFxKind;
  radius: number;
  accent: string;
  secondary: string;
  accentSoft: string;
  enabled?: boolean;
};

function SheenBand({ radius }: { radius: number }) {
  const sweep = useSharedValue(0);
  const [w, setW] = useState(0);
  const isFocused = useIsScreenFocused();

  // Луп живёт только на видимом экране и активном приложении: freezeOnBlur:false
  // держит ушедшие экраны живыми, без гарда блик грел бы телефон в фоне
  // (паттерн components/AvatarAura.tsx).
  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(sweep);
      sweep.value = 0;
      return;
    }

    const start = () => {
      cancelAnimation(sweep);
      sweep.value = 0;
      sweep.value = withRepeat(
        withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      );
    };
    const stop = () => {
      cancelAnimation(sweep);
      sweep.value = 0;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(sweep);
    };
  }, [sweep, w, isFocused]);

  const band = Math.max(56, w * 0.4);
  const style = useAnimatedStyle(() => {
    const pass = 0.6;
    const t = Math.min(1, sweep.value / pass);
    const x = interpolate(t, [0, 1], [-band, w + band]);
    return { transform: [{ translateX: x }, { rotateZ: '16deg' }] } as any;
  });

  return (
    <View
      pointerEvents="none"
      onLayout={(e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      {w > 0 && (
        <Reanimated.View style={[{ width: band, height: '200%', marginTop: '-50%' }, style]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.32)', 'rgba(255,255,255,0.22)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Reanimated.View>
      )}
    </View>
  );
}

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(v));
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

function ProfileCardMotionFxBase({ kind, radius, enabled = true }: Props) {
  const reduceMotion = useReduceMotion();
  if (!enabled || reduceMotion || kind === 'none') return null;
  if (kind === 'sheen') return <SheenBand radius={radius} />;
  return null;
}

export default memo(ProfileCardMotionFxBase);
