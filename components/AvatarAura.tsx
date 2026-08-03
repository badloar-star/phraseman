import React, { memo, useEffect, useRef } from 'react';
import { Animated, AppState, Easing, View, type ViewStyle } from 'react-native';
import { getAvatarAuraById } from '../constants/avatar_auras';
import { getSeasonAuraAssetForAvatarId } from '../app/season_pass_track_config';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LinearGradient as ExpoLinearGradient } from './SafeLinearGradient';
import { useTheme } from './ThemeContext';
import SeasonAuraRing from './SeasonAuraRing';

type Props = {
  auraId?: string | null;
  size: number;
  children: React.ReactNode;
  style?: ViewStyle;
  /** Disable the loop for small avatars mounted in scrollable lists. */
  animate?: boolean;
  ownerActive?: boolean;
};

// Exported layers keep a rotation-safe transparent margin. At 1.40x the
// canvas stays compact while the visible art sits just outside the avatar.
const SEASON_AURA_RING_SCALE = 1.40;
const SEASON_AURA_LAYOUT_GUTTER = 12;

function AvatarAura({ auraId, size, children, style, animate = true, ownerActive }: Props) {
  const aura = getAvatarAuraById(auraId);
  const { themeMode } = useTheme();
  const seasonAsset = getSeasonAuraAssetForAvatarId(aura?.id, themeMode);
  const auraPhase = useRef(new Animated.Value(0)).current;
  const isFocused = useIsScreenFocused();
  const reduceMotion = useReduceMotion();
  const runtimeActive = isFocused && (ownerActive ?? true);
  const shouldAnimate = animate && runtimeActive && !reduceMotion && size >= 42 && aura !== undefined && seasonAsset === undefined;

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

  if (seasonAsset) {
    const outer = size + SEASON_AURA_LAYOUT_GUTTER;
    const ringSize = Math.round(size * SEASON_AURA_RING_SCALE);
    return (
      <View
        style={[
          {
            width: outer,
            height: outer,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'visible',
          },
          style,
        ]}
      >
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: ringSize,
            height: ringSize,
            left: (outer - ringSize) / 2,
            top: (outer - ringSize) / 2,
          }}
        >
          <SeasonAuraRing
            asset={seasonAsset}
            size={ringSize}
            active={animate && runtimeActive}
          />
        </View>
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
          {children}
        </View>
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
    outputRange: [0.34, 0.54, 0.34],
  });
  const softOuterOpacity = auraPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.06, 0.13, 0.06],
  });
  const softInnerOpacity = auraPhase.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.12, 0.22, 0.12],
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
          overflow: 'visible',
        },
        style,
      ]}
    >
      <Animated.View
        testID="avatar-aura-soft-edge-outer"
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer + 18,
          height: outer + 18,
          borderRadius: (outer + 18) / 2,
          backgroundColor: aura.color,
          opacity: softOuterOpacity,
          shadowColor: aura.color,
          shadowOpacity: 0.18,
          shadowRadius: 14,
          transform: [{ scale: haloScale }],
        }}
      />
      <Animated.View
        testID="avatar-aura-soft-edge-inner"
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer + 10,
          height: outer + 10,
          borderRadius: (outer + 10) / 2,
          backgroundColor: aura.color,
          opacity: softInnerOpacity,
          shadowColor: aura.color,
          shadowOpacity: 0.24,
          shadowRadius: 10,
          transform: [{ scale: haloScale }],
        }}
      />
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer,
          height: outer,
          borderRadius: outer / 2,
          opacity: haloOpacity,
          overflow: 'hidden',
          shadowColor: aura.color,
          shadowOpacity: 0.2,
          shadowRadius: 9,
          transform: [{ rotate: rotation }, { scale: haloScale }],
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
