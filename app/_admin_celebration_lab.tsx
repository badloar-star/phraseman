/**
 * _admin_celebration_lab.tsx — DEV-превью «дорогого» празднования победы урока.
 *
 * Цель: показать заказчику новый, насыщенный экран завершения урока, который
 * по уровню juice не уступает PremiumCelebrationModal (покупка), а превосходит
 * текущий молчаливый lesson_complete (медаль просто качается).
 *
 * ВАЖНО: это ИЗОЛИРОВАННОЕ превью. Оно НЕ подключено к реальному прохождению
 * урока. Открывается только из настроек под ENABLE_DEV_TOOLS. Кнопка «Ещё раз»
 * перезапускает анимацию, чтобы можно было пересматривать.
 *
 * Состав сцены (стейджи по времени):
 *   0мс   — затемнение фона + мягкое свечение из центра
 *   200мс — трофей влетает с пружиной + лучи света раскрываются
 *   500мс — конфетти-взрыв
 *   700мс — кольцо прогресса заполняется по дуге
 *   1100мс— счётчик XP докручивается с 0 до итогового
 *   1500мс— карточки метрик (звёзды / точность / время) выезжают каскадом
 *   1900мс— CTA-кнопка появляется с лёгким shimmer
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from '../components/SafeLinearGradient';
import Animated, {
  Easing as REasing,
  cancelAnimation,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { hapticSuccess, hapticTap, hapticMediumImpact } from '../hooks/use-haptics';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Палитра «дорогого» праздника победы ──────────────────────────────────────
// Тёплое золото + изумрудный акцент успеха. Глубокий, не кричащий фон.
const PALETTE = {
  backdrop: '#070b10',
  glow: 'rgba(255, 206, 120, 0.22)',
  gold: '#FFD27A',
  goldBright: '#FFE9B8',
  emerald: '#36E6A0',
  emeraldDeep: '#0F8F66',
  ring: '#FFD27A',
  ringTrack: 'rgba(255,255,255,0.10)',
  text: '#FFF6E6',
  textDim: 'rgba(255,246,230,0.62)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,210,122,0.22)',
  cta: ['#0F8F66', '#36E6A0', '#0F8F66'] as [string, string, string],
};

const STAGE = {
  GLOW: 0,
  TROPHY: 200,
  CONFETTI: 500,
  RING: 700,
  COUNTER: 1100,
  METRICS_START: 1500,
  METRICS_STAGGER: 160,
  CTA: 1900,
} as const;

const CONFETTI_COUNT = 22;
const RAY_COUNT = 10;
const FINAL_XP = 240;

// Детерминированный псевдослучай (без Math.random в рендере — стабильно при ремаунте).
function seeded(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ── Одна конфетти-частица ─────────────────────────────────────────────────────
function ConfettiPiece({ index, play }: { index: number; play: number }) {
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);

  const angle = seeded(index, 1) * Math.PI * 2;
  const distance = 120 + seeded(index, 2) * (width * 0.42);
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance - 60; // лёгкий апвард-байас
  const rot = (seeded(index, 3) - 0.5) * 1080;
  const size = 7 + seeded(index, 4) * 8;
  const color = [PALETTE.gold, PALETTE.goldBright, PALETTE.emerald, '#FF9EC4', '#7CC8FF'][index % 5];
  const isCircle = index % 3 === 0;

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(STAGE.CONFETTI, withTiming(1, { duration: 1400, easing: REasing.out(REasing.cubic) }));
  }, [play, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: interpolate(p, [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
      transform: [
        { translateX: interpolate(p, [0, 1], [0, dx]) },
        { translateY: interpolate(p, [0, 0.6, 1], [0, dy, dy + 80]) },
        { rotate: `${interpolate(p, [0, 1], [0, rot])}deg` },
        { scale: interpolate(p, [0, 0.2, 1], [0.4, 1, 0.9]) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: isCircle ? size : size * 0.5,
          borderRadius: isCircle ? size / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

// ── Луч света за трофеем ──────────────────────────────────────────────────────
function LightRay({ index, play }: { index: number; play: number }) {
  const grow = useSharedValue(0);
  const rotation = (360 / RAY_COUNT) * index;

  useEffect(() => {
    grow.value = 0;
    grow.value = withDelay(STAGE.TROPHY, withTiming(1, { duration: 600, easing: REasing.out(REasing.quad) }));
  }, [play, grow]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(grow.value, [0, 1], [0, 0.5]),
    transform: [
      { rotate: `${rotation}deg` },
      { scaleY: interpolate(grow.value, [0, 1], [0.2, 1]) },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: 14,
          height: 220,
          borderRadius: 7,
          backgroundColor: PALETTE.glow,
        },
        style,
      ]}
    />
  );
}

// ── Карточка метрики (звёзды / точность / время) ──────────────────────────────
function MetricCard({
  index,
  icon,
  value,
  label,
  play,
}: {
  index: number;
  icon: string;
  value: string;
  label: string;
  play: number;
}) {
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = 0;
    enter.value = withDelay(
      STAGE.METRICS_START + index * STAGE.METRICS_STAGGER,
      withSpring(1, { damping: 13, stiffness: 140 }),
    );
  }, [play, index, enter]);

  const style = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: interpolate(enter.value, [0, 1], [26, 0]) },
      { scale: interpolate(enter.value, [0, 1], [0.85, 1]) },
    ],
  }));

  return (
    <Animated.View style={[styles.metricCard, style]}>
      <Text style={styles.metricIcon}>{icon}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function CelebrationLabScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [play, setPlay] = useState(0);
  const [xpDisplay, setXpDisplay] = useState(0);

  // Shared values
  const backdrop = useSharedValue(0);
  const glow = useSharedValue(0);
  const trophyScale = useSharedValue(0);
  const trophyFloat = useSharedValue(0);
  const ringProgress = useSharedValue(0);
  const ctaIn = useSharedValue(0);
  const shimmer = useSharedValue(0);

  const xpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const RING_SIZE = Math.min(width * 0.56, 230);
  const RING_R = (RING_SIZE - 18) / 2;
  const RING_C = 2 * Math.PI * RING_R;

  const runSequence = useCallback(() => {
    // reset
    backdrop.value = 0;
    glow.value = 0;
    trophyScale.value = 0;
    ringProgress.value = 0;
    ctaIn.value = 0;
    setXpDisplay(0);
    if (xpTimerRef.current) clearInterval(xpTimerRef.current);

    // backdrop + glow
    backdrop.value = withTiming(1, { duration: 350 });
    glow.value = withDelay(STAGE.GLOW, withTiming(1, { duration: 700, easing: REasing.out(REasing.quad) }));

    // trophy pop + idle float
    trophyScale.value = withDelay(
      STAGE.TROPHY,
      withSpring(1, { damping: 9, stiffness: 150, mass: 0.7 }),
    );
    trophyFloat.value = withDelay(
      STAGE.TROPHY + 600,
      withRepeat(withSequence(
        withTiming(1, { duration: 1600, easing: REasing.inOut(REasing.sin) }),
        withTiming(0, { duration: 1600, easing: REasing.inOut(REasing.sin) }),
      ), -1, false),
    );

    // ring fill
    ringProgress.value = withDelay(
      STAGE.RING,
      withTiming(1, { duration: 1100, easing: REasing.out(REasing.cubic) }),
    );

    // CTA + shimmer loop
    ctaIn.value = withDelay(STAGE.CTA, withSpring(1, { damping: 14, stiffness: 130 }));
    shimmer.value = withDelay(
      STAGE.CTA + 300,
      withRepeat(withTiming(1, { duration: 1800, easing: REasing.inOut(REasing.quad) }), -1, false),
    );

    // haptics timeline
    const hTrophy = setTimeout(() => { void hapticSuccess(); }, STAGE.TROPHY);
    const hConfetti = setTimeout(() => { void hapticMediumImpact(); }, STAGE.CONFETTI);

    // XP counter (JS-driven, синхронно с ringProgress)
    const xpStart = Date.now() + STAGE.COUNTER;
    const xpDuration = 1200;
    xpTimerRef.current = setInterval(() => {
      const now = Date.now();
      if (now < xpStart) return;
      const t = Math.min(1, (now - xpStart) / xpDuration);
      const eased = 1 - Math.pow(1 - t, 3);
      setXpDisplay(Math.round(eased * FINAL_XP));
      if (t >= 1 && xpTimerRef.current) {
        clearInterval(xpTimerRef.current);
        xpTimerRef.current = null;
      }
    }, 16);

    return () => {
      clearTimeout(hTrophy);
      clearTimeout(hConfetti);
    };
  }, [backdrop, glow, trophyScale, trophyFloat, ringProgress, ctaIn, shimmer]);

  useEffect(() => {
    const cleanup = runSequence();
    return () => {
      cleanup?.();
      cancelAnimation(trophyFloat);
      cancelAnimation(shimmer);
      if (xpTimerRef.current) clearInterval(xpTimerRef.current);
    };
  }, [play, runSequence, trophyFloat, shimmer]);

  // ── Animated styles ─────────────────────────────────────────────────────────
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.6, 1.15]) }],
  }));
  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { translateY: interpolate(trophyFloat.value, [0, 1], [0, -10]) },
    ],
  }));
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - ringProgress.value * 0.85), // 85% — «отличный» результат
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaIn.value,
    transform: [{ translateY: interpolate(ctaIn.value, [0, 1], [20, 0]) }, { scale: ctaIn.value }],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [0, 1], [-180, 180]) }],
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.5, 0]),
  }));

  const rays = useMemo(() => Array.from({ length: RAY_COUNT }, (_, i) => i), []);
  const confetti = useMemo(() => Array.from({ length: CONFETTI_COUNT }, (_, i) => i), []);

  return (
    <View style={styles.root}>
      {/* фон */}
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <LinearGradient
          colors={[PALETTE.backdrop, '#0c1219', PALETTE.backdrop]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* DEV-бейдж + назад */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPressIn={() => hapticTap()}
          onPress={() => { if (router.canGoBack()) router.back(); }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Назад"
        >
          <Ionicons name="chevron-back" size={22} color={PALETTE.text} />
        </TouchableOpacity>
        <View style={styles.devBadge}>
          <Text style={styles.devBadgeText}>DEV PREVIEW</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* центральная сцена */}
      <View style={styles.stage}>
        {/* свечение */}
        <Animated.View style={[styles.glowOrb, glowStyle]} pointerEvents="none">
          <LinearGradient
            colors={[PALETTE.glow, 'rgba(255,206,120,0.0)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        {/* лучи */}
        <View style={styles.rayLayer} pointerEvents="none">
          {rays.map(i => <LightRay key={`ray-${i}-${play}`} index={i} play={play} />)}
        </View>

        {/* кольцо прогресса + трофей */}
        <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
          <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
            <Circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={PALETTE.ringTrack}
              strokeWidth={9}
              fill="none"
            />
            <AnimatedCircle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RING_R}
              stroke={PALETTE.ring}
              strokeWidth={9}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={RING_C}
              animatedProps={ringProps}
              transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
            />
          </Svg>

          {/* конфетти исходит из центра трофея */}
          <View style={styles.confettiLayer} pointerEvents="none">
            {confetti.map(i => <ConfettiPiece key={`c-${i}-${play}`} index={i} play={play} />)}
          </View>

          <Animated.View style={trophyStyle}>
            <Text style={styles.trophy}>🏆</Text>
          </Animated.View>
        </View>

        {/* заголовок */}
        <Text style={styles.title}>Урок пройден!</Text>
        <Text style={styles.subtitle}>Отличный результат — так держать</Text>

        {/* XP счётчик */}
        <View style={styles.xpRow}>
          <Text style={styles.xpPlus}>+</Text>
          <Text style={styles.xpValue}>{xpDisplay}</Text>
          <Text style={styles.xpUnit}>XP</Text>
        </View>

        {/* метрики */}
        <View style={styles.metricsRow}>
          <MetricCard index={0} play={play} icon="⭐" value="3/3" label="Звёзды" />
          <MetricCard index={1} play={play} icon="🎯" value="92%" label="Точность" />
          <MetricCard index={2} play={play} icon="⚡" value="1:48" label="Время" />
        </View>
      </View>

      {/* CTA + повтор */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Animated.View style={[{ width: '100%' }, ctaStyle]}>
          <TouchableOpacity activeOpacity={0.9} onPressIn={() => hapticTap()} style={styles.ctaWrap}>
            <LinearGradient colors={PALETTE.cta} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cta}>
              <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none" />
              <Text style={styles.ctaText}>Продолжить</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity
          onPress={() => { hapticTap(); setPlay(p => p + 1); }}
          style={styles.replayBtn}
          accessibilityRole="button"
        >
          <Ionicons name="refresh" size={16} color={PALETTE.textDim} />
          <Text style={styles.replayText}>Проиграть анимацию ещё раз</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: PALETTE.backdrop },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)',
  },
  devBadge: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999,
    backgroundColor: 'rgba(255,210,122,0.12)',
    borderWidth: 1, borderColor: 'rgba(255,210,122,0.4)',
  },
  devBadgeText: { color: PALETTE.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  glowOrb: {
    position: 'absolute',
    width: 340, height: 340, borderRadius: 170,
    top: '18%',
    overflow: 'hidden',
  },
  rayLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center', top: '6%' },
  confettiLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  trophy: { fontSize: 96, textAlign: 'center' },
  title: { color: PALETTE.text, fontSize: 30, fontWeight: '900', marginTop: 26, letterSpacing: 0.3 },
  subtitle: { color: PALETTE.textDim, fontSize: 15, marginTop: 8, textAlign: 'center' },
  xpRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 22 },
  xpPlus: { color: PALETTE.gold, fontSize: 26, fontWeight: '900', marginBottom: 6 },
  xpValue: { color: PALETTE.goldBright, fontSize: 56, fontWeight: '900', lineHeight: 60, marginHorizontal: 2 },
  xpUnit: { color: PALETTE.gold, fontSize: 20, fontWeight: '800', marginBottom: 8, marginLeft: 4 },
  metricsRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  metricCard: {
    width: 96, paddingVertical: 16, borderRadius: 18,
    alignItems: 'center',
    backgroundColor: PALETTE.card,
    borderWidth: 1, borderColor: PALETTE.cardBorder,
  },
  metricIcon: { fontSize: 24 },
  metricValue: { color: PALETTE.text, fontSize: 20, fontWeight: '900', marginTop: 6 },
  metricLabel: { color: PALETTE.textDim, fontSize: 12, marginTop: 3 },
  bottom: { paddingHorizontal: 24, alignItems: 'center' },
  ctaWrap: { width: '100%', borderRadius: 18, overflow: 'hidden' },
  cta: {
    height: 58, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaText: { color: '#04261A', fontSize: 18, fontWeight: '900', letterSpacing: 0.3 },
  shimmer: {
    position: 'absolute',
    top: 0, bottom: 0, width: 80,
    backgroundColor: 'rgba(255,255,255,0.35)',
    transform: [{ skewX: '-20deg' }],
  },
  replayBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 18, paddingVertical: 8 },
  replayText: { color: PALETTE.textDim, fontSize: 13, fontWeight: '600' },
});
