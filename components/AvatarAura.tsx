import React, { memo, useEffect, useRef } from 'react';
import { Animated, AppState, Easing, View, type ViewStyle } from 'react-native';
import { getAvatarAuraById } from '../constants/avatar_auras';
import { noAndroidOutline } from '../constants/androidGlow';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LinearGradient as ExpoLinearGradient } from './SafeLinearGradient';

type Props = {
  auraId?: string | null;
  size: number;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Disable the loop for small avatars mounted in scrollable lists. */
  animate?: boolean;
  ownerActive?: boolean;
};

function AvatarAura({ auraId, size, children, style, animate = true, ownerActive }: Props) {
  const aura = getAvatarAuraById(auraId);
  const auraPhase = useRef(new Animated.Value(0)).current;
  const isFocused = useIsScreenFocused();
  const reduceMotion = useReduceMotion();
  const runtimeActive = isFocused && (ownerActive ?? true);
  const shouldAnimate = animate && runtimeActive && !reduceMotion && size >= 42 && aura !== undefined;

  useEffect(() => {
    if (!shouldAnimate) {
      auraPhase.setValue(0);
      return;
    }

    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      auraPhase.setValue(0);
      loop = Animated.loop(Animated.timing(auraPhase, {
        toValue: 1,
        duration: 7200,
        easing: Easing.linear,
        useNativeDriver: true,
      }));
      loop.start();
    };
    const stop = () => {
      loop?.stop();
      loop = null;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      stop();
    };
  }, [auraPhase, shouldAnimate]);

  if (!aura || size < 36) {
    return (
      <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
        {children}
      </View>
    );
  }

  const outer = size + 8;
  const haloScale = auraPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.98, 1.04, 0.98],
  });
  const haloOpacity = auraPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.42, 0.68, 0.42],
  });
  const rotation = auraPhase.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const bright = aura.color2 ?? aura.color;
  const deep = aura.color3 ?? aura.color;
  const isSatin = aura.material === 'satin';
  const satinColors = [deep, aura.color, bright, aura.color, deep] as const;
  const satinLocations = [0, 0.28, 0.5, 0.72, 1] as const;
  const haloColors = [aura.softColor, aura.color, bright, deep] as const;
  const haloLocations = [0, 0.34, 0.68, 1] as const;

  return (
    <View
      style={[
        {
          width: outer,
          height: outer,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          borderWidth: 1,
          borderColor: bright,
          opacity: haloOpacity,
          overflow: 'hidden',
          shadowColor: aura.color,
          shadowOpacity: 0.38,
          shadowRadius: 8,
          elevation: 4,
          transform: [{ rotate: rotation }, { scale: haloScale }],
          ...noAndroidOutline,
        }}
      >
        <ExpoLinearGradient
          colors={isSatin ? satinColors : haloColors}
          locations={isSatin ? satinLocations : haloLocations}
          start={isSatin ? { x: 0, y: 0.35 } : { x: 0, y: 0 }}
          end={isSatin ? { x: 1, y: 0.65 } : { x: 1, y: 1 }}
          style={{ width: '100%', height: '100%' }}
        />
      </Animated.View>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

export default memo(AvatarAura);
