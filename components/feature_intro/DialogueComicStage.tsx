import React, { memo, useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { INTRO, LUM } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useTheme } from '../ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette'; // зачем: сцена интро диалога на палитре стекла

/** Decorative conversation, not a simulated message or an instruction to transmit data. */
function Bubble({ reply = false }: { reply?: boolean }) {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    progress.value = reduceMotion ? 1 : withDelay(reply ? LUM.ladder[2] : LUM.ladder[1], withTiming(1, { duration: LUM.resolveMs, easing: Easing.out(Easing.cubic) }));
    return () => cancelAnimation(progress);
  }, [progress, reduceMotion, reply]);
  const style = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateX: (1 - progress.value) * (reply ? INTRO.comic.offset : -INTRO.comic.offset) }] }));
  return <Animated.View style={[styles.bubble, reply ? styles.reply : styles.question, { backgroundColor: reply ? glass.cta : glass.opaqueControl }, style]}>
    {[0, 1, 2].map(i => <View key={i} style={[styles.dot, { backgroundColor: reply ? glass.ctaInk : glass.secondary }]} />)}
  </Animated.View>;
}

function DialogueComicStage() {
  const { liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const { height, fontScale } = useWindowDimensions();
  const compact = height < 760 || fontScale > 1.2;
  return <View style={[styles.stage, compact && styles.compactStage]} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <View style={[styles.art, compact && styles.compactArt, styles.iconWrap]}>
      <Ionicons name="chatbubbles-outline" size={compact ? 52 : 100} color={glass.cta} />
    </View>
    <Bubble /><Bubble reply />
  </View>;
}
export default memo(DialogueComicStage);
const styles = StyleSheet.create({
  stage: { height: 160, alignItems: 'center', justifyContent: 'center' },
  art: { width: 155, height: 155 },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  compactStage: { height: 80 },
  compactArt: { width: 80, height: 80 },
  bubble: { position: 'absolute', flexDirection: 'row', gap: 7, paddingHorizontal: 20, paddingVertical: 17, borderRadius: 22 },
  question: { left: 10, top: 22, borderBottomLeftRadius: 5, transform: [{ rotate: '-6deg' }] },
  reply: { right: 10, bottom: 12, borderBottomRightRadius: 5, transform: [{ rotate: '5deg' }] },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
