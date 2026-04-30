import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, View, ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Polygon, Stop } from 'react-native-svg';

const RING = 3;

/** Pointy-top regular hexagon: vertex at top (−90° + k·60°). */
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
  /** Inner avatar / badge size (square bounding box) */
  avatarSize: number;
  /** Fill for inner hex — hides gradient so only the gold edge shows */
  maskColor: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Premium gold hex frame — stationary, rich gold with two gradients
 * cross-fading ("перелив") + soft edge stroke. useNativeDriver: false so SVG always animates.
 */
export default function PremiumAvatarHalo({ enabled, avatarSize, maskColor, children, style }: Props) {
  const phase = useRef(new Animated.Value(0)).current;
  const ids = useMemo(
    () => ({
      warm: `phHaloW_${Math.random().toString(36).slice(2, 11)}`,
      cool: `phHaloC_${Math.random().toString(36).slice(2, 11)}`,
    }),
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(phase, {
          toValue: 1,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
        Animated.timing(phase, {
          toValue: 0,
          duration: 2800,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: false,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [enabled, phase]);

  if (!enabled) {
    return <View style={style}>{children}</View>;
  }

  const outer = avatarSize + RING * 2;
  const cx = outer / 2;
  const cy = outer / 2;
  const rOuter = outer / 2;
  const rInner = avatarSize / 2;
  const outerPts = hexPoints(cx, cy, rOuter);

  /** Тёплый насыщенный золотой — в минимуме не уходит в «грязь». */
  const warmOpacity = phase.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.32],
  });
  /** Светлый золотой блик — без белого, чтобы кольцо всегда читалось как золото. */
  const coolOpacity = phase.interpolate({
    inputRange: [0, 1],
    outputRange: [0.58, 1],
  });
  /** Кайма чуть дышит отдельно. */
  const rimOpacity = phase.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });

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
          opacity: warmOpacity,
        }}
      >
        <Svg width={outer} height={outer}>
          <Defs>
            <LinearGradient id={ids.warm} x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#B8860B" />
              <Stop offset="28%" stopColor="#D4AF37" />
              <Stop offset="50%" stopColor="#FFC400" />
              <Stop offset="72%" stopColor="#FFD700" />
              <Stop offset="100%" stopColor="#E6AC00" />
            </LinearGradient>
          </Defs>
          <Polygon points={outerPts} fill={`url(#${ids.warm})`} />
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer,
          height: outer,
          opacity: coolOpacity,
        }}
      >
        <Svg width={outer} height={outer}>
          <Defs>
            <LinearGradient id={ids.cool} x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#FFE566" />
              <Stop offset="25%" stopColor="#FFD700" />
              <Stop offset="50%" stopColor="#FFCC00" />
              <Stop offset="75%" stopColor="#FFF159" />
              <Stop offset="100%" stopColor="#F0C419" />
            </LinearGradient>
          </Defs>
          <Polygon points={outerPts} fill={`url(#${ids.cool})`} />
        </Svg>
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: outer,
          height: outer,
          opacity: rimOpacity,
        }}
      >
        <Svg width={outer} height={outer}>
          <Polygon
            points={outerPts}
            fill="none"
            stroke="#FFDF40"
            strokeWidth={1.55}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>

      <Svg
        pointerEvents="none"
        style={{ position: 'absolute', width: outer, height: outer }}
        width={outer}
        height={outer}
      >
        <Polygon points={hexPoints(cx, cy, rInner)} fill={maskColor} />
      </Svg>
      <View style={{ width: avatarSize, height: avatarSize, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}
