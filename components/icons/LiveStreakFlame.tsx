import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { Image } from 'expo-image';
import type { ThemeMode } from '../../constants/theme';
import { STREAK_ICON_TIERS, getStreakFireIconVariant } from '../../constants/streakIconAssets';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

// зачем: макет-эталон (.motion-mockups/phraseman-hybrid.html, сцена B6 «Иконки ·
// 8 событий») описывает огонь как ПОКАДРОВУЮ анимацию по готовым кадрам
// streakfireaurora010..100. Таких кадров как отдельного спрайт-цикла в
// репозитории нет — под этим именем существует только 10-тировый набор
// статичных иконок (constants/streakIconAssets.ts → assets/images/streak_icons/
// <тема>/streak-fire-<тема>-NNN.webp), уже используемый StreakChainIcon по
// длине серии. Поэтому «покадровость» здесь честно построена на РЕАЛЬНЫХ
// доступных ассетах: burst прогоняет тир текущей темы через соседние тиры
// (кроссфейд + рост + колыхание skewX), а не выдумывает несуществующий файл.
const BURST_STEPS = [
  { scale: 1.28, duration: 260, ease: Easing.out(Easing.cubic) },
  { scale: 1.18, duration: 130, ease: Easing.inOut(Easing.cubic) },
  { scale: 1.24, duration: 130, ease: Easing.inOut(Easing.cubic) },
  { scale: 1.1, duration: 130, ease: Easing.inOut(Easing.cubic) },
  { scale: 1, duration: 130, ease: Easing.inOut(Easing.cubic) },
] as const;
const SKEW_STEPS = [5, -6, 4, 0] as const;
const SKEW_STEP_MS = 130;
const SKEW_START_DELAY_MS = 420;
const GLOW_IN_MS = 240;
const GLOW_OUT_MS = 600;

interface LiveStreakFlameProps {
  themeMode: ThemeMode;
  streakDays: number;
  size: number;
  /** Меняется на каждое реальное событие «серия продлена сегодня» —
   *  проигрывает burst. Гарды фокуса/reduce-motion внутри. */
  burstToken?: number;
  style?: StyleProp<ImageStyle>;
}

function LiveStreakFlameBase({ themeMode, streakDays, size, burstToken, style }: LiveStreakFlameProps) {
  const reduceMotion = useReduceMotion();
  const variant = useMemo(() => getStreakFireIconVariant(themeMode, streakDays), [themeMode, streakDays]);
  const scale = useRef(new Animated.Value(1)).current;
  const skewDeg = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const isMountedRef = useRef(true);
  const isFocusedRef = useRef(true);
  const [tick, setTick] = useState(0);
  const lastBurstTokenRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      isFocusedRef.current = false;
      scale.stopAnimation();
      skewDeg.stopAnimation();
      glow.stopAnimation();
    };
  }, [glow, scale, skewDeg]);

  useEffect(() => {
    if (burstToken === undefined) return;
    if (lastBurstTokenRef.current === burstToken) return;
    lastBurstTokenRef.current = burstToken;
    if (!isMountedRef.current || !isFocusedRef.current) return;
    if (reduceMotion) {
      // Reduce Motion = один финальный кадр, без цикла колыхания/роста.
      setTick((t) => t + 1);
      return;
    }

    scale.stopAnimation();
    skewDeg.stopAnimation();
    glow.stopAnimation();
    scale.setValue(1);
    skewDeg.setValue(0);
    glow.setValue(0);

    const scaleSeq = Animated.sequence(
      BURST_STEPS.map((step) =>
        Animated.timing(scale, { toValue: step.scale, duration: step.duration, easing: step.ease, useNativeDriver: true }),
      ),
    );
    const skewSeq = Animated.sequence([
      Animated.delay(SKEW_START_DELAY_MS),
      ...SKEW_STEPS.map((deg) =>
        Animated.timing(skewDeg, { toValue: deg, duration: SKEW_STEP_MS, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
      ),
    ]);
    const glowSeq = Animated.sequence([
      Animated.timing(glow, { toValue: 0.8, duration: GLOW_IN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: GLOW_OUT_MS, easing: Easing.linear, useNativeDriver: true }),
    ]);

    Animated.parallel([scaleSeq, skewSeq, glowSeq]).start(({ finished }) => {
      if (finished && isMountedRef.current) setTick((t) => t + 1);
    });
  }, [burstToken, glow, reduceMotion, scale, skewDeg]);

  const skewInterpolated = skewDeg.interpolate({ inputRange: [-10, 10], outputRange: ['-10deg', '10deg'] });

  return (
    <View style={[styles.root, { width: size, height: size }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.glow,
          {
            backgroundColor: variant.glowColor,
            opacity: glow,
            transform: [{ scale: 1.5 }],
          },
        ]}
      />
      <Animated.Image
        key={tick}
        source={variant.source}
        resizeMode="contain"
        // Декоративный элемент: соседний текст/счётчик серии несёт смысл озвучиваемый
        // скринридером (StreakChainIcon-паттерн), сама иконка — визуальный акцент.
        accessible={false}
        importantForAccessibility="no"
        style={[
          { width: size, height: size },
          { transform: [{ scale }, { skewX: skewInterpolated }] },
          style as StyleProp<ImageStyle>,
        ]}
      />
    </View>
  );
}

// Кадр покоя (без burst) рендерится через expo-image (кэш/декодирование в отдельном потоке);
// сам burst — через Animated.Image, чтобы transform анимировался на UI-потоке без setState в тик.
function LiveStreakFlameIdle({ themeMode, streakDays, size, style }: Omit<LiveStreakFlameProps, 'burstToken'>) {
  const variant = useMemo(() => getStreakFireIconVariant(themeMode, streakDays), [themeMode, streakDays]);
  return (
    <Image
      source={variant.source}
      contentFit="contain"
      accessibilityIgnoresInvertColors
      style={[{ width: size, height: size }, style]}
    />
  );
}

function LiveStreakFlameImpl(props: LiveStreakFlameProps) {
  // Без активного burst — лёгкий путь (expo-image, без Animated-обвязки).
  if (props.burstToken === undefined) {
    const { burstToken: _unused, ...idleProps } = props;
    return <LiveStreakFlameIdle {...idleProps} />;
  }
  return <LiveStreakFlameBase {...props} />;
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: '100%', height: '100%', borderRadius: 999 },
});

export { STREAK_ICON_TIERS };
export default memo(LiveStreakFlameImpl);
