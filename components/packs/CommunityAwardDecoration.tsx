import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, interpolate, Keyframe, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';

// theme-exempt: gold rays and confetti are the approved award illustration.
const raysArrival = new Keyframe({
  0: { opacity: 0, transform: [{ rotate: '-35deg' }, { scale: 0.7 }] },
  30: { opacity: 1 },
  100: { opacity: 1, transform: [{ rotate: '35deg' }, { scale: 1 }], easing: Easing.out(Easing.cubic) },
}).duration(3600);

const rayPaths = Array.from({ length: 17 }, (_, i) => {
  const start = (i * 22 + 17) * Math.PI / 180;
  const end = (i * 22 + 22) * Math.PI / 180;
  return `M120 120 L${120 + 120 * Math.sin(start)} ${120 - 120 * Math.cos(start)} A120 120 0 0 1 ${120 + 120 * Math.sin(end)} ${120 - 120 * Math.cos(end)} Z`;
});

export function CommunityAwardRays({ reduced }: Readonly<{ reduced: boolean }>): React.JSX.Element {
  return <Animated.View pointerEvents="none" accessible={false} entering={reduced ? undefined : raysArrival} style={s.rays}>
    <Svg width={240} height={240} viewBox="0 0 240 240">
      <Defs><RadialGradient id="awardRayFade" gradientUnits="userSpaceOnUse" cx={120} cy={120} r={84}><Stop offset="15%" stopColor="#F5BD58" stopOpacity={0.14} /><Stop offset="100%" stopColor="#F5BD58" stopOpacity={0} /></RadialGradient><RadialGradient id="awardGlow"><Stop offset="0%" stopColor="#F5BD58" stopOpacity={0.19} /><Stop offset="68%" stopColor="#F5BD58" stopOpacity={0} /></RadialGradient></Defs>
      <Circle cx={120} cy={120} r={120} fill="url(#awardGlow)" />
      {rayPaths.map((d, i) => <Path key={i} d={d} fill="url(#awardRayFade)" />)}
    </Svg>
  </Animated.View>;
}

function FallingPiece({ index, color }: Readonly<{ index: number; color: string }>): React.JSX.Element {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(150 + (index * 67) % 1100, withTiming(1, { duration: 3100, easing: Easing.bezier(0.2, 0.55, 0.55, 1) }));
    return () => cancelAnimation(progress);
  }, [index, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.08, 0.78, 1], [0, 1, 1, 0]),
    transform: [{ translateX: progress.value * ((index * 29) % 140 - 70) }, { translateY: -20 + progress.value * 640 }, { rotate: `${progress.value * (180 + (index * 53) % 540)}deg` }],
  }));
  return <Animated.View style={[s.piece, { left: `${3 + (index * 23) % 94}%`, height: index % 3 === 0 ? 7 : 12, borderRadius: index % 3 === 0 ? 3.5 : 3, backgroundColor: color }, style]} />;
}

export function CommunityAwardConfetti({ accent }: Readonly<{ accent: string }>): React.JSX.Element {
  const colors = ['#F5BD58', '#FFE7AB', accent, '#A6DCEB'];
  return <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={s.confetti}>
    {Array.from({ length: 64 }, (_, index) => <FallingPiece key={index} index={index} color={colors[index % colors.length]} />)}
  </View>;
}

const s = StyleSheet.create({
  rays: { position: 'absolute', width: 240, height: 240 },
  confetti: { ...StyleSheet.absoluteFillObject, zIndex: 2, overflow: 'hidden' },
  piece: { position: 'absolute', top: 0, width: 7 },
});
