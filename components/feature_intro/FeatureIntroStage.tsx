import React, { memo, useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { getFeatureIntroArt, type FeatureIntroArt } from '../../app/feature_intro_art';
import { INTRO, LUM } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTheme } from '../ThemeContext';
import { LinearGradient } from '../SafeLinearGradient';

export type FeatureIntroFamily = 'premiere' | 'orbit';

/** The owner-approved two compositions. Finite entrance only: no idle GPU loop. */
function FeatureIntroStage({ family, art }: { family: FeatureIntroFamily; art: FeatureIntroArt }) {
  const { theme: t, themeMode } = useTheme();
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
          <LinearGradient colors={[`${t.accent}00`, `${t.accent}40`, `${t.accent}00`]} style={styles.beam} />
          <View style={[styles.horizon, { backgroundColor: t.accent }]} />
          {[0, 1, 2, 3].map(i => <View key={i} style={[styles.dust, { backgroundColor: t.accent, left: 34 + i * 69, top: 24 + (i % 2) * 96 }]} />)}
        </> : <>
          <Svg width="100%" height="200" viewBox="0 0 320 200">
            <Ellipse cx="160" cy="100" rx="150" ry="43" stroke={t.accent} strokeOpacity={0.34} strokeWidth={1} fill="none" />
            <Ellipse cx="160" cy="100" rx="137" ry="58" rotation="65" origin="160,100" stroke={t.accent} strokeOpacity={0.18} strokeWidth={1} fill="none" />
          </Svg>
          <View style={[styles.satellite, { backgroundColor: t.accent }]} />
        </>}
      </Animated.View>
      <Animated.View style={[styles.art, hero]}>
        <Image source={getFeatureIntroArt(themeMode, art)} style={styles.image} resizeMode="contain" fadeDuration={0} />
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
  art: { width: 190, height: 190 },
  image: { width: '100%', height: '100%' },
});
