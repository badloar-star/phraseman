// ════════════════════════════════════════════════════════════════════════════
// PaywallMotion.tsx — премиальная микро-моушн обвязка пейволов A–G.
//
// Четыре переиспользуемых куска:
//   PaywallEntrance  — каскадный вход блока (fade + подъём 14px + scale 0.98),
//                      стаггер ~70мс на индекс, мягкий overshoot, один раз;
//   PaywallIdleFloat — парение герой-капсулы (±5px за ~4с) + пульс свечения;
//   PaywallCtaShine  — блик-полоса по CTA раз в ~5.6с (паттерн PremiumGoldButton);
//   PaywallBadgePop  — pop бейджа −N% (scale 0.6→1, overshoot-bezier) + опц. пульс.
//
// Инварианты Perf Bible (AGENTS.md):
//  • только transform/opacity, движок — react-native-reanimated (UI-тред),
//    без таймеров-циклов и без JS rAF;
//  • бесконечные лупы (withRepeat -1) гейтятся фокусом экрана
//    (useIsScreenFocused) + AppState и гаснут cancelAnimation — паттерн
//    components/AvatarAura.tsx / components/HoloFoilCard.tsx;
//  • reduce-motion (hooks/use_reduce_motion.ts): ни вход, ни лупы не стартуют —
//    сразу финальный статичный кадр.
// ════════════════════════════════════════════════════════════════════════════
import React, { useEffect } from 'react';
import {
  AppState, StyleSheet, View,
  type LayoutChangeEvent, type StyleProp, type ViewStyle,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { LinearGradient } from '../SafeLinearGradient';
import { useIsScreenFocused } from '../../hooks/use_is_screen_focused';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

/** Базовый стаггер каскада входа, мс на индекс блока. */
const ENTRANCE_STAGGER_MS = 70;
/** Полный цикл блика CTA (как в PremiumGoldButton). */
const CTA_SHINE_SWEEP_MS = 5600;

// ── 1. Каскадный вход блока: fade + подъём + лёгкий overshoot масштаба ───────
export function PaywallEntrance({ index = 0, style, onLayout, children }: {
  /** Позиция блока в каскаде: задержка = index × 70мс. */
  index?: number;
  style?: StyleProp<ViewStyle>;
  /** Проброс onLayout (sticky-CTA замеряет свою обёртку). */
  onLayout?: (event: LayoutChangeEvent) => void;
  children: React.ReactNode;
}) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(progress);
    if (reduceMotion) {
      // Reduce-motion: без движения — сразу финальный кадр.
      progress.value = 1;
      return;
    }
    progress.value = 0;
    progress.value = withDelay(
      Math.max(0, index) * ENTRANCE_STAGGER_MS,
      // Мягкая пружина: translateY/scale чуть перелетают финал и садятся на место.
      withSpring(1, { damping: 17, stiffness: 170, mass: 0.8 }),
    );
    return () => cancelAnimation(progress);
  }, [index, progress, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45], [0, 1], Extrapolation.CLAMP),
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [14, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.98, 1]) },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]} onLayout={onLayout}>
      {children}
    </Animated.View>
  );
}

// ── 2. Парение герой-капсулы: ±5px за ~4с + пульс гало 0.5↔0.9 ───────────────
export function PaywallIdleFloat({ children, style, haloColor = 'rgba(255,255,255,0.22)', haloRadius = 42, haloInset = 6 }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Цвет гало (лучше полупрозрачный акцент темы, напр. `${tc.heroAccent}2E`). */
  haloColor?: string;
  haloRadius?: number;
  /** На сколько px гало выступает за края контента. */
  haloInset?: number;
}) {
  const reduceMotion = useReduceMotion();
  const isFocused = useIsScreenFocused();
  const phase = useSharedValue(0);
  const active = isFocused && !reduceMotion;

  useEffect(() => {
    if (!active) {
      cancelAnimation(phase);
      phase.value = 0;
      return;
    }
    // Луп живёт только на видимом экране и на переднем плане (паттерн AvatarAura):
    // пейвол — модал, но под ним могут открываться экраны, а freeze останавливает
    // рендер, НЕ worklet-лупы — поэтому гейт обязателен.
    const start = () => {
      cancelAnimation(phase);
      phase.value = 0;
      phase.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    };
    const stop = () => {
      cancelAnimation(phase);
      phase.value = 0;
    };
    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(phase);
    };
  }, [active, phase]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(phase.value, [0, 0.25, 0.5, 0.75, 1], [0, -5, 0, 5, 0]) },
    ],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(phase.value, [0, 0.5, 1], [0.5, 0.9, 0.5]),
  }));

  return (
    <View style={[styles.idleWrap, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.idleHalo,
          {
            backgroundColor: haloColor,
            borderRadius: haloRadius,
            top: -haloInset,
            bottom: -haloInset,
            left: -haloInset,
            right: -haloInset,
          },
          haloStyle,
        ]}
      />
      <Animated.View style={floatStyle}>{children}</Animated.View>
    </View>
  );
}

// ── 3. Блик по CTA: скошенная полупрозрачная белая полоса раз в ~5.6с ────────
// Точный паттерн components/PremiumGoldButton.tsx (тот же цикл 5600мс и та же
// геометрия полосы), только на reanimated и с гейтом фокуса + reduce-motion.
export function PaywallCtaShine() {
  const reduceMotion = useReduceMotion();
  const isFocused = useIsScreenFocused();
  const phase = useSharedValue(0);
  const active = isFocused && !reduceMotion;

  useEffect(() => {
    if (!active) {
      cancelAnimation(phase);
      phase.value = 0;
      return;
    }
    const start = () => {
      cancelAnimation(phase);
      phase.value = 0;
      phase.value = withRepeat(
        withSequence(
          withTiming(1, { duration: CTA_SHINE_SWEEP_MS, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 0 }),
        ),
        -1,
      );
    };
    const stop = () => {
      cancelAnimation(phase);
      phase.value = 0;
    };
    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(phase);
    };
  }, [active, phase]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(phase.value, [0, 1], [-160, 560]) },
      { skewX: '-14deg' },
    ],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.ctaShineTrack, shineStyle]}>
      <LinearGradient
        colors={['transparent', 'rgba(255, 252, 235, 0.5)', 'rgba(255, 255, 255, 0.72)', 'rgba(255, 252, 235, 0.5)', 'transparent']}
        locations={[0, 0.35, 0.5, 0.65, 1]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
    </Animated.View>
  );
}

// ── 4. Бейдж −N%: pop scale 0.6→1 с overshoot + опциональный медленный пульс ─
export function PaywallBadgePop({ children, style, delay = 0, pulse = false }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Задержка pop-а, мс (подстроить под каскад входа родительского блока). */
  delay?: number;
  /** После pop-а — еле заметный «дыхательный» пульс масштаба (гейтится, луп). */
  pulse?: boolean;
}) {
  const reduceMotion = useReduceMotion();
  const isFocused = useIsScreenFocused();
  const pop = useSharedValue(0);
  const pulsePhase = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(pop);
    if (reduceMotion) {
      pop.value = 1;
      return;
    }
    pop.value = 0;
    pop.value = withDelay(
      Math.max(0, delay),
      // Классический back-out: бейдж чуть «перескакивает» 1 и садится на место.
      withTiming(1, { duration: 380, easing: Easing.bezier(0.34, 1.56, 0.64, 1) }),
    );
    return () => cancelAnimation(pop);
  }, [delay, pop, reduceMotion]);

  const pulseActive = pulse && isFocused && !reduceMotion;
  useEffect(() => {
    if (!pulseActive) {
      cancelAnimation(pulsePhase);
      pulsePhase.value = 0;
      return;
    }
    const start = () => {
      cancelAnimation(pulsePhase);
      pulsePhase.value = 0;
      pulsePhase.value = withRepeat(
        withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    };
    const stop = () => {
      cancelAnimation(pulsePhase);
      pulsePhase.value = 0;
    };
    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(pulsePhase);
    };
  }, [pulseActive, pulsePhase]);

  const animatedStyle = useAnimatedStyle(() => {
    const popScale = interpolate(pop.value, [0, 1], [0.6, 1]);
    const pulseScale = interpolate(pulsePhase.value, [0, 0.5, 1], [1, 1.045, 1]);
    return {
      opacity: interpolate(pop.value, [0, 0.35], [0, 1], Extrapolation.CLAMP),
      transform: [{ scale: popScale * pulseScale }],
    };
  });

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  idleWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleHalo: {
    position: 'absolute',
  },
  ctaShineTrack: {
    position: 'absolute',
    top: -16,
    bottom: -16,
    width: 110,
    left: 0,
  },
});
