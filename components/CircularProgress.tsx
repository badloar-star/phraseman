import React, { memo, useEffect } from 'react';
import { View, Text, type TextProps } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LUM } from '../constants/motionHybrid';

const AnimatedText = Reanimated.createAnimatedComponent(Text);

interface Props {
  pct: number;      // 0-100
  size?: number;
  sw?: number;      // stroke width
  color: string;
  bg: string;
  textColor: string;
  fontSize?: number;
  innerBg?: string;
  cardBg?: string;  // устарело, игнорируется
}

/**
 * Circular progress ring — colored fill technique.
 * Fills CW from 12 o\'clock.
 *
 * All fill layers are clipped to a circle via the outer borderRadius+overflow:hidden
 * wrapper, so the ring edges are always smooth.
 *
 * зачем: заливка не прыгает на новое значение, а едет через Reanimated
 * (UI-поток, withTiming LUM.resolveMs) — тот же приём "только transform",
 * что и остальной гибрид. Геометрия (три rotated View) НЕ менялась — это
 * не SVG, strokeDashoffset здесь неприменим технически; анимируется deg
 * через shared value на UI-потоке, а не JS setState на каждый кадр (см.
 * историю лагов в SpeakingScoreRing.tsx — там тот же компонент чинили от
 * per-frame Animated-листенера на JS-потоке; Reanimated таких лагов не
 * даёт, т.к. пересчёт transform идёт без моста).
 */
function CircularProgress({
  pct, size = 52, sw = 4, color, bg, textColor, fontSize = 11, innerBg,
}: Props) {
  const clamped = Math.min(100, Math.max(0, pct));
  const h       = size / 2;
  const holeBg  = innerBg ?? bg;
  const reduceMotion = useReducedMotion();

  const deg = useSharedValue(reduceMotion ? (clamped / 100) * 360 : 0);

  useEffect(() => {
    const target = (clamped / 100) * 360;
    if (reduceMotion) {
      cancelAnimation(deg);
      deg.value = target;
      return;
    }
    deg.value = withTiming(target, { duration: LUM.resolveMs, easing: Easing.out(Easing.quad) });
    return () => cancelAnimation(deg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clamped, reduceMotion]);

  const leftVisibleStyle = useAnimatedStyle(() => ({ opacity: deg.value > 180 ? 1 : 0 }));
  const rightVisibleStyle = useAnimatedStyle(() => ({ opacity: deg.value > 0 ? 1 : 0 }));
  const leftFillStyle = useAnimatedStyle(() => {
    const leftFillRot = deg.value > 180 ? deg.value - 360 : -180;
    return {
      transform: [
        { translateX: h / 2 },
        { rotate: `${leftFillRot}deg` },
        { translateX: -(h / 2) },
      ],
    };
  });
  const rightFillStyle = useAnimatedStyle(() => {
    const rightFillRot = Math.min(180, deg.value) - 180;
    return {
      transform: [
        { translateX: -(h / 2) },
        { rotate: `${rightFillRot}deg` },
        { translateX: h / 2 },
      ],
    };
  });
  // зачем: AnimatedText — обёртка над RN Text (не TextInput), паттерн
  // text+defaultValue как в LeagueResultHybrid.tsx rankTextProps — приведение
  // к Partial<TextProps> единственное, что useAnimatedProps обязан вернуть.
  const labelProps = useAnimatedProps<Partial<TextProps>>(() => {
    const pctNow = `${Math.round((deg.value / 360) * 100)}%`;
    return { text: pctNow, defaultValue: pctNow } as Partial<TextProps>;
  });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>

      {/* Circular clip wrapper — clamps all fill layers to the circle boundary */}
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: h, overflow: 'hidden',
      }}>
        {/* 1. Gray track disc */}
        <View style={{
          position: 'absolute', width: size, height: size,
          backgroundColor: bg,
        }} />

        {/* 2. Left colored fill — sweeps CW 6→9→12 (active after 50%) */}
        <Reanimated.View
          pointerEvents="none"
          style={[leftVisibleStyle, {
            position: 'absolute', left: 0, top: 0,
            width: h, height: size, overflow: 'hidden',
          }]}
        >
          <Reanimated.View style={[leftFillStyle, {
            position: 'absolute', left: 0, top: 0,
            width: h, height: size,
            backgroundColor: color,
          }]} />
        </Reanimated.View>

        {/* 3. Right colored fill — sweeps CW 12→3→6 */}
        <Reanimated.View
          pointerEvents="none"
          style={[rightVisibleStyle, {
            position: 'absolute', left: h, top: 0,
            width: h, height: size, overflow: 'hidden',
          }]}
        >
          <Reanimated.View style={[rightFillStyle, {
            position: 'absolute', left: 0, top: 0,
            width: h, height: size,
            backgroundColor: color,
          }]} />
        </Reanimated.View>

        {/* 4. Inner hole — creates the ring */}
        <View style={{
          position: 'absolute',
          left: sw, top: sw,
          width: size - sw * 2,
          height: size - sw * 2,
          borderRadius: (size - sw * 2) / 2,
          backgroundColor: holeBg,
        }} />
      </View>

      {/* 5. Percentage label — outside clip wrapper so it\'s not cut. Text is
          the initial/SSR-safe value; animatedProps overrides it on the UI
          thread as deg ticks, so RTL/measure never see an empty string. */}
      <AnimatedText
        animatedProps={labelProps}
        style={{ color: textColor, fontSize, fontWeight: '700', textAlign: 'center' }}
        numberOfLines={1}
      >
        {Math.round(clamped)}%
      </AnimatedText>
    </View>
  );
}

export default memo(CircularProgress);
