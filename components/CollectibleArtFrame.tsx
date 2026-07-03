// Рамка карточки «Сокровищницы» по редкости: чем реже — тем «круче».
// Контейнер со скруглением + цветная рамка + свечение, внутри арт (CollectibleArt,
// cover, тот же радиус → без зазора и квадратных углов). Для rare/epic/legendary —
// лёгкая анимация (бегущий блик), у legendary/секретки — пульс свечения + искры.
//
// Производительность: в гриде из 330 карточек анимируются ТОЛЬКО видимые ячейки
// (FlatList removeClippedSubviews размонтирует невидимые). Чтобы не плодить лупы,
// блик включается лишь для tier >= rare, искры — только legendary/secret.
// Уважает «Уменьшить движение» (reduce motion) — тогда всё статично.
import React, { memo, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from './SafeLinearGradient';
import CollectibleArt from './CollectibleArt';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import {
  collectibleFrameProfile,
  collectibleTierColor,
  type CollectibleArtTier,
} from '../app/collectibles/rarity_style';

export { collectibleTierColor };
export type { CollectibleArtTier };

interface CollectibleArtFrameProps {
  cardId: string;
  svg?: string | null;
  tier: CollectibleArtTier;
  /** Сторона квадрата-области (ширина ячейки). Высота = width / aspect. */
  width: number;
  /** Пропорция арта. По умолчанию 200/160 (как webp 1024×819). */
  aspectRatio?: number;
  borderRadius?: number;
  /** Включить анимации (блик/пульс/искры). По умолчанию true. */
  animated?: boolean;
  fallback?: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/* ── бегущий блик (лёгкий, один проход с паузой) ───────────── */
const Sheen = memo(function Sheen({ w, h, radius, delay }: { w: number; h: number; radius: number; delay: number }) {
  const sweep = useSharedValue(0);
  const band = Math.max(28, w * 0.42);
  const isFocused = useIsScreenFocused();

  // Грид «Сокровищницы» держит десятки таких лупов сразу, а freezeOnBlur:false
  // переживает уход с экрана — гардим фокусом экрана и AppState (паттерн AvatarAura).
  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(sweep);
      sweep.value = 0;
      return;
    }

    const start = () => {
      cancelAnimation(sweep);
      sweep.value = 0;
      sweep.value = withDelay(
        delay,
        withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.ease) }), -1, false),
      );
    };
    const stop = () => {
      cancelAnimation(sweep);
      sweep.value = 0;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(sweep);
    };
  }, [sweep, delay, isFocused]);

  const bandStyle = useAnimatedStyle(() => {
    // Блик бежит только в первой трети цикла, остальное — пауза за краем.
    const t = Math.min(1, sweep.value / 0.34);
    const x = interpolate(t, [0, 1], [-band, w + band]);
    return { transform: [{ translateX: x }, { rotateZ: '18deg' }], opacity: t > 0 && t < 1 ? 1 : 0 };
  });

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <Animated.View style={[{ width: band, height: h * 2, marginTop: -h / 2 }, bandStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.32)', 'rgba(255,255,255,0.5)', 'rgba(255,255,255,0.32)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
});

/* ── мерцающая искорка в углу (для legendary/secret) ───────── */
const Sparkle = memo(function Sparkle({ color, delay, style }: { color: string; delay: number; style: StyleProp<ViewStyle> }) {
  const v = useSharedValue(0);
  const isFocused = useIsScreenFocused();
  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(v);
      v.value = 0;
      return;
    }

    const start = () => {
      cancelAnimation(v);
      v.value = 0;
      v.value = withDelay(
        delay,
        withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0, { duration: 900 })), -1, false),
      );
    };
    const stop = () => {
      cancelAnimation(v);
      v.value = 0;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(v);
    };
  }, [v, delay, isFocused]);
  const s = useAnimatedStyle(() => ({ opacity: v.value, transform: [{ scale: 0.5 + v.value * 0.7 }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute' }, style, s]}>
      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, shadowColor: color, shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } }} />
    </Animated.View>
  );
});

function CollectibleArtFrame({
  cardId,
  svg,
  tier,
  width,
  aspectRatio = 200 / 160,
  borderRadius = 13,
  animated = true,
  fallback,
  accessibilityLabel,
  style,
}: CollectibleArtFrameProps) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const isFocused = useIsScreenFocused();
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (mounted) setReduceMotion(v); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { mounted = false; sub.remove(); };
  }, []);

  const p = collectibleFrameProfile(tier);
  const color = collectibleTierColor(tier);
  const height = width / aspectRatio;
  const fxOn = animated && !reduceMotion;

  // Пульсация свечения (epic/legendary/secret) — мягко дышит тень.
  // Луп живёт только на видимом экране и активном приложении (паттерн AvatarAura).
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!fxOn || !p.pulse || !isFocused) {
      cancelAnimation(pulse);
      pulse.value = 0;
      return;
    }

    const start = () => {
      cancelAnimation(pulse);
      pulse.value = 0;
      pulse.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true);
    };
    const stop = () => {
      cancelAnimation(pulse);
      pulse.value = 0;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(pulse);
    };
  }, [fxOn, p.pulse, pulse, isFocused]);

  const glowStyle = useAnimatedStyle(() => {
    if (p.glow <= 0) return { shadowOpacity: 0, shadowRadius: 0 };
    const op = p.pulse ? interpolate(pulse.value, [0, 1], [p.glowOpacity * 0.55, p.glowOpacity]) : p.glowOpacity;
    const rad = p.pulse ? interpolate(pulse.value, [0, 1], [p.glow * 0.7, p.glow]) : p.glow;
    return { shadowColor: color, shadowOpacity: op, shadowRadius: rad, shadowOffset: { width: 0, height: 0 } };
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          borderWidth: p.borderWidth,
          borderColor: tier === 'common' ? `${color}66` : `${color}E6`,
          backgroundColor: `${color}14`,
          // elevation для теней на Android (свечение).
          elevation: p.glow > 0 ? p.power * 2 : 0,
        },
        glowStyle,
        style,
      ]}
    >
      <View style={{ width: '100%', height: '100%', borderRadius, overflow: 'hidden' }}>
        <CollectibleArt
          cardId={cardId}
          svg={svg}
          width="100%"
          height="100%"
          contentFit="cover"
          fallback={fallback}
          accessibilityLabel={accessibilityLabel}
        />
        {fxOn && p.sheen && <Sheen w={width} h={height} radius={borderRadius} delay={(p.power % 4) * 800} />}
      </View>

      {fxOn && p.sparkles && (
        <>
          <Sparkle color={color} delay={0} style={{ top: -2, right: -2 }} />
          <Sparkle color={color} delay={550} style={{ bottom: -2, left: -2 }} />
          <Sparkle color="#FFFFFF" delay={1100} style={{ top: '40%', right: -3 }} />
        </>
      )}
    </Animated.View>
  );
}

export default memo(CollectibleArtFrame);
