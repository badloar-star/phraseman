/**
 * AuroraBackground — премиальный «дорогой» фон для празднования Premium/VIP.
 *
 * Стек намеренно лёгкий (целевая аудитория — дешёвые Android, см. память):
 * - градиент-подложка (expo LinearGradient)
 * - 3 аврора-ленты: статичная волнообразная форма (SVG Path), анимируется
 *   ТОЛЬКО transform (translateX/scaleY) + opacity на нативном потоке —
 *   без пересчёта path-строки на JS-потоке каждый кадр
 * - центральное радиальное свечение (SVG RadialGradient)
 * - золотые частицы на RN Animated (дешевле reanimated на Android — как в
 *   исходном PremiumCelebrationModal)
 *
 * Skia установлена, но нигде в проекте не используется — не вводим новый
 * рендер-стек ради одного экрана.
 */
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated as RNAnim, StyleSheet, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from '../SafeLinearGradient';

interface AuroraBackgroundProps {
  active: boolean;
  width: number;
  height: number;
  /** Базовые цвета градиента-подложки. */
  bg: [string, string, string];
  /** RGB-строки лент (без alpha), 3 шт. */
  auroraRgb: [string, string, string];
  /** Главный акцент для центрального свечения. */
  main: string;
}

const PARTICLE_COUNT = 22;

interface ParticleSeed {
  x: number;
  delay: number;
  size: number;
  duration: number;
  driftPhase: number;
}

function buildParticleSeeds(): ParticleSeed[] {
  const seeds: ParticleSeed[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    seeds.push({
      x: (i * 137.5) % 100, // золотое сечение → равномерный разброс
      delay: (i % 6) * 380,
      size: 1.5 + (i % 3),
      duration: 5200 + (i % 5) * 700,
      driftPhase: (i % 7) * 0.9,
    });
  }
  return seeds;
}

/** Одна частица: всплывает снизу вверх, мерцает. RN Animated — дёшево. */
function Particle({ seed, active, color, width, height }: {
  seed: ParticleSeed; active: boolean; color: string; width: number; height: number;
}) {
  const t = useRef(new RNAnim.Value(0)).current;
  useEffect(() => {
    if (!active) { t.setValue(0); return undefined; }
    const loop = RNAnim.loop(
      RNAnim.timing(t, {
        toValue: 1,
        duration: seed.duration,
        delay: seed.delay,
        useNativeDriver: true,
        easing: (x) => x,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [active, seed.delay, seed.duration, t]);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [height * 0.95, -20] });
  const translateX = t.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, Math.sin(seed.driftPhase) * 16, 0],
  });
  const opacity = t.interpolate({ inputRange: [0, 0.12, 0.8, 1], outputRange: [0, 0.9, 0.7, 0] });

  return (
    <RNAnim.View
      pointerEvents="none"
      style={[
        styles.particle,
        {
          left: (seed.x / 100) * width,
          opacity,
          transform: [{ translateY }, { translateX }],
        },
      ]}
    >
      <View
        style={{
          width: seed.size * 2,
          height: seed.size * 2,
          borderRadius: seed.size,
          backgroundColor: color,
          shadowColor: color,
          shadowOpacity: 0.9,
          shadowRadius: 4,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </RNAnim.View>
  );
}

/** Построить волнообразный path-«холм» во всю ширину на заданной высоте. */
function ribbonPath(w: number, h: number, baseY: number, amp: number, phase: number): string {
  const steps = 10;
  let d = `M0 ${h}`;
  d += ` L0 ${baseY}`;
  for (let i = 0; i <= steps; i += 1) {
    const x = (i / steps) * w;
    const y = baseY + Math.sin((i / steps) * Math.PI * 2 + phase) * amp;
    d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  d += ` L${w} ${h} Z`;
  return d;
}

/** Лента: статичная форма + анимация transform (нативный поток). */
function Ribbon({ active, width, height, rgb, baseFrac, amp, phase, dur, delay, opacityPeak }: {
  active: boolean; width: number; height: number; rgb: string;
  baseFrac: number; amp: number; phase: number; dur: number; delay: number; opacityPeak: number;
}) {
  const drift = useSharedValue(0);
  const breathe = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      cancelAnimation(drift);
      cancelAnimation(breathe);
      drift.value = 0;
      breathe.value = 0;
      return undefined;
    }
    drift.value = withDelay(delay, withRepeat(
      withTiming(1, { duration: dur, easing: Easing.inOut(Easing.sin) }),
      -1, true,
    ));
    breathe.value = withDelay(delay, withRepeat(
      withSequence(
        withTiming(1, { duration: dur * 0.6, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: dur * 0.6, easing: Easing.inOut(Easing.quad) }),
      ),
      -1, true,
    ));
    return () => {
      cancelAnimation(drift);
      cancelAnimation(breathe);
    };
  }, [active, drift, breathe, dur, delay]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: (drift.value - 0.5) * width * 0.18 },
      { translateY: (breathe.value - 0.5) * height * 0.03 },
      { scaleY: 1 + breathe.value * 0.08 },
    ],
    opacity: 0.55 + breathe.value * 0.45,
  }));

  const baseY = height * baseFrac;
  const d = ribbonPath(width * 1.4, height, baseY, amp, phase);

  return (
    <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, animStyle]}>
      <Svg width={width * 1.4} height={height} style={{ marginLeft: -width * 0.2 }}>
        <Defs>
          <RadialGradient id={`rb_${baseFrac}_${phase}`} cx="50%" cy={`${baseFrac * 100}%`} r="70%">
            <Stop offset="0" stopColor={`rgb(${rgb})`} stopOpacity={opacityPeak} />
            <Stop offset="1" stopColor={`rgb(${rgb})`} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path d={d} fill={`url(#rb_${baseFrac}_${phase})`} />
      </Svg>
    </Reanimated.View>
  );
}

function AuroraBackground({ active, width, height, bg, auroraRgb, main }: AuroraBackgroundProps) {
  const particles = useMemo(buildParticleSeeds, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient
        colors={bg}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Ribbon active={active} width={width} height={height} rgb={auroraRgb[0]} baseFrac={0.24} amp={height * 0.05} phase={0} dur={7000} delay={0} opacityPeak={0.12} />
      <Ribbon active={active} width={width} height={height} rgb={auroraRgb[1]} baseFrac={0.36} amp={height * 0.06} phase={1.8} dur={9000} delay={400} opacityPeak={0.09} />
      <Ribbon active={active} width={width} height={height} rgb={auroraRgb[2]} baseFrac={0.5} amp={height * 0.07} phase={3.4} dur={11000} delay={800} opacityPeak={0.07} />

      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="centerGlow" cx="50%" cy="30%" r="60%">
            <Stop offset="0" stopColor={main} stopOpacity="0.16" />
            <Stop offset="0.45" stopColor={main} stopOpacity="0.04" />
            <Stop offset="1" stopColor={main} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#centerGlow)" />
      </Svg>

      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particles.map((seed, i) => (
          <Particle key={`pt_${i}`} seed={seed} active={active} color={auroraRgb[2].includes(',') ? `rgb(${auroraRgb[2]})` : main} width={width} height={height} />
        ))}
      </View>
    </View>
  );
}

export default memo(AuroraBackground);

const styles = StyleSheet.create({
  particle: { position: 'absolute', top: 0 },
});
