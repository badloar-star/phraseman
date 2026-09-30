import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Svg, { Ellipse } from 'react-native-svg';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { getFeatureIntroArt, type FeatureIntroArt } from '../../app/feature_intro_art';
import { INTRO, LUM } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette'; // зачем: сцена интро на палитре стекла, не на акценте темы
import { LinearGradient } from '../SafeLinearGradient';

export type FeatureIntroFamily = 'premiere' | 'orbit';

/** The owner-approved two compositions. Finite entrance only: no idle GPU loop. */
function FeatureIntroStage({ family, art }: { family: FeatureIntroFamily; art: FeatureIntroArt }) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const tone = glass.lightTint.slice(0, 7);
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const motion = INTRO[family];
  useEffect(() => {
    progress.value = reduceMotion ? 1 : withTiming(1, { duration: LUM.bloomDriftMs, easing: Easing.out(Easing.cubic) });
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion]);
  const hero = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * motion.lift },
      { scale: motion.scaleFrom + progress.value * (1 - motion.scaleFrom) },
      { rotate: `${(1 - progress.value) * motion.rotateFrom}deg` },
    ],
  }));
  const atmosphere = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ rotate: `${motion.atmosphereFrom + progress.value * (motion.atmosphereTo - motion.atmosphereFrom)}deg` }],
  }));
  return (
    <View style={styles.stage} accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Animated.View style={[styles.atmosphere, atmosphere]}>
        {family === 'premiere' ? <>
          <LinearGradient colors={[`${tone}00`, `${tone}40`, `${tone}00`]} style={styles.beam} />
          <View style={[styles.horizon, { backgroundColor: tone }]} />
          {[0, 1, 2, 3].map(i => <View key={i} style={[styles.dust, { backgroundColor: tone, left: 34 + i * 69, top: 24 + (i % 2) * 96 }]} />)}
        </> : <>
          <Svg width="100%" height="200" viewBox="0 0 320 200">
            <Ellipse cx="160" cy="100" rx="150" ry="43" stroke={tone} strokeOpacity={0.34} strokeWidth={1} fill="none" />
            <Ellipse cx="160" cy="100" rx="137" ry="58" rotation="65" origin="160,100" stroke={tone} strokeOpacity={0.18} strokeWidth={1} fill="none" />
          </Svg>
          <View style={[styles.satellite, { backgroundColor: tone }]} />
        </>}
      </Animated.View>
      <Animated.View style={[styles.art, hero]}>
        <Ionicons name={getFeatureIntroArt(art)} size={94} color={tone} />
      </Animated.View>
    </View>
  );
}
export default memo(FeatureIntroStage);
const styles = StyleSheet.create({
  stage: { height: 200, width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  atmosphere: { position: 'absolute', width: 320, height: 200, alignItems: 'center', justifyContent: 'center' },
  beam: { position: 'absolute', width: 125, height: 320, borderRadius: 60 },
  horizon: { position: 'absolute', width: 230, height: 1, bottom: 25, opacity: 0.18 },
  dust: { position: 'absolute', width: 3, height: 3, borderRadius: 2, opacity: 0.55 },
  satellite: { position: 'absolute', left: 19, top: 81, width: 9, height: 9, borderRadius: 5 },
  art: { width: 190, height: 190, alignItems: 'center', justifyContent: 'center' },
});
