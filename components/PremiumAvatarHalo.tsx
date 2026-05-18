import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';

const HALO_PADDING = 2;
const HALO_STROKE = 1.1;

function hexPoints(cx: number, cy: number, circumRadius: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    pts.push(`${cx + circumRadius * Math.cos(a)},${cy + circumRadius * Math.sin(a)}`);
  }
  return pts.join(' ');
}

type Props = {
  enabled: boolean;
  avatarSize: number;
  maskColor: string;
  children: React.ReactNode;
  style?: ViewStyle;
  animateShimmer?: boolean;
};

export default function PremiumAvatarHalo({
  enabled,
  avatarSize,
  children,
  style,
  animateShimmer = true,
}: Props) {
  const phase = useRef(new Animated.Value(0)).current;
  const ids = useMemo(
    () => ({
      warm: `phHaloW_${Math.random().toString(36).slice(2, 11)}`,
      cool: `phHaloC_${Math.random().toString(36).slice(2, 11)}`,
    }),
    [],
  );

  useEffect(() => {
    if (!enabled || !animateShimmer) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(phase, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [enabled, animateShimmer, phase]);

  if (!enabled) {
    return <View style={style}>{children}</View>;
  }

  const outer = avatarSize + HALO_PADDING * 2;
  const cx = outer / 2;
  const cy = outer / 2;
  const radius = outer / 2 - HALO_STROKE;
  const points = hexPoints(cx, cy, radius);

  const warmOpacity = animateShimmer
    ? phase.interpolate({ inputRange: [0, 1], outputRange: [0.88, 0.26] })
    : 0.72;
  const coolOpacity = animateShimmer
    ? phase.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.82] })
    : 0;
  const glintOpacity = animateShimmer
    ? phase.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.38] })
    : 0.24;

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
        style={{ position: 'absolute', width: outer, height: outer, opacity: warmOpacity }}
      >
        <Svg width={outer} height={outer}>
          <Defs>
            <LinearGradient id={ids.warm} x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#C99716" />
              <Stop offset="45%" stopColor="#FFE58A" />
              <Stop offset="100%" stopColor="#D7A10E" />
            </LinearGradient>
          </Defs>
          <Polygon
            points={points}
            fill="none"
            stroke={`url(#${ids.warm})`}
            strokeWidth={HALO_STROKE}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: outer, height: outer, opacity: coolOpacity }}
      >
        <Svg width={outer} height={outer}>
          <Defs>
            <LinearGradient id={ids.cool} x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFF6C2" />
              <Stop offset="42%" stopColor="#FACC15" />
              <Stop offset="100%" stopColor="#F59E0B" />
            </LinearGradient>
          </Defs>
          <Polygon
            points={points}
            fill="none"
            stroke={`url(#${ids.cool})`}
            strokeWidth={0.9}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', width: outer, height: outer, opacity: glintOpacity }}
      >
        <Svg width={outer} height={outer}>
          <Polygon
            points={points}
            fill="none"
            stroke="#FFF2A8"
            strokeWidth={0.55}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>

      <View style={{ width: avatarSize, height: avatarSize, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}
