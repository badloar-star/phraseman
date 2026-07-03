import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
/**
 * _anim_demo_lab.tsx — DEV-демо: что текущий стек (Reanimated 4 + SVG + haptics)
 * умеет БЕЗ Lottie/Rive/Skia. Доказательство к ответу «можем ли мы делать
 * анимации как в Telegram Business / Duolingo».
 *
 * 4 эффекта на одном экране:
 *   1) FLIP иконки      — 3D rotateY + perspective (как иконка Telegram Business)
 *   2) SHINE / блеск    — полоса света бежит по иконке (бегущий LinearGradient под маской)
 *   3) BURST / разлёт   — элементы вылетают из иконки по кругу с пружиной
 *   4) Duolingo-кнопка  — пружинит при нажатии + успех-haptic + рисующаяся галочка
 *
 * ИЗОЛИРОВАНО: не подключено к реальным экранам. Открывается как route /\_anim_demo_lab.
 * Все анимации крутятся на UI-потоке (worklet), 0 новых зависимостей.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { LinearGradient } from '../components/SafeLinearGradient';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';

const AnimatedPath = Reanimated.createAnimatedComponent(Path);

const ICON_SIZE = 120;
const BURST_COUNT = 12; // держим <=16: каждый элемент ~2 shared values (см. PremiumCelebrationModal)
const BURST_EMOJIS = ['✨', '⭐', '💎', '🔥', '🎯', '💜'];

const PALETTE = {
  bg: '#0b1020',
  card: '#161c30',
  accent: '#7C5CFF',
  accentBright: '#A99BFF',
  good: '#22C55E',
  text: '#EAEBF5',
  textDim: '#9AA0C0',
};

/* ─────────────────────────────────────────────────────────────────────────
 * 1) FLIP — 3D переворот иконки (эффект иконки Telegram Business)
 * ──────────────────────────────────────────────────────────────────────── */
function FlipIcon({ trigger }: { trigger: number }) {
  const spin = useSharedValue(0);

  useEffect(() => {
    spin.value = 0;
    spin.value = withSequence(
      withTiming(1, { duration: 620, easing: Easing.inOut(Easing.cubic) }),
      withDelay(80, withTiming(0, { duration: 0 })),
    );
  }, [trigger, spin]);

  const style = useAnimatedStyle(() => {
    const rotateY = `${interpolate(spin.value, [0, 1], [0, 360])}deg`;
    // лёгкий «вдох» по размеру в середине флипа — глубина 3D
    const scale = interpolate(spin.value, [0, 0.5, 1], [1, 1.16, 1]);
    return {
      transform: [{ perspective: 800 }, { rotateY }, { scale }],
    };
  });

  return (
    <Reanimated.View style={[styles.iconBase, style]}>
      <Text style={styles.iconGlyph}>💼</Text>
    </Reanimated.View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * 2) SHINE — полоса света пробегает по иконке (бегущий градиент)
 * ──────────────────────────────────────────────────────────────────────── */
function ShineIcon({ trigger }: { trigger: number }) {
  const sweep = useSharedValue(0);

  useEffect(() => {
    sweep.value = -1;
    sweep.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(sweep);
  }, [trigger, sweep]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(sweep.value, [-1, 1], [-ICON_SIZE, ICON_SIZE]) },
      { rotateZ: '18deg' },
    ],
  }));

  return (
    <View style={[styles.iconBase, styles.iconClip]}>
      <Text style={styles.iconGlyph}>🏆</Text>
      <Reanimated.View style={[StyleSheet.absoluteFillObject, shineStyle]} pointerEvents="none">
        <LinearGradient
          colors={['transparent', 'rgba(255,255,255,0.85)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.shineBand}
        />
      </Reanimated.View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * 3) BURST — элементы вылетают из центра по кругу (разлёт «лучей» Telegram)
 * ──────────────────────────────────────────────────────────────────────── */
function BurstParticle({ index, trigger }: { index: number; trigger: number }) {
  const p = useSharedValue(0);
  const angle = (index / BURST_COUNT) * Math.PI * 2;
  const distance = 96;
  const emoji = BURST_EMOJIS[index % BURST_EMOJIS.length];

  useEffect(() => {
    p.value = 0;
    p.value = withDelay(
      index * 18,
      withSpring(1, { damping: 9, stiffness: 120, mass: 0.6 }),
    );
  }, [trigger, p, index]);

  const style = useAnimatedStyle(() => {
    const t = p.value;
    return {
      transform: [
        { translateX: Math.cos(angle) * distance * t },
        { translateY: Math.sin(angle) * distance * t },
        { scale: interpolate(t, [0, 0.6, 1], [0, 1.2, 0.95]) },
        { rotateZ: `${t * 180}deg` },
      ],
      opacity: interpolate(t, [0, 0.1, 0.85, 1], [0, 1, 1, 0.7]),
    };
  });

  return (
    <Reanimated.Text style={[styles.particle, style]} pointerEvents="none">
      {emoji}
    </Reanimated.Text>
  );
}

function BurstIcon({ trigger }: { trigger: number }) {
  const pop = useSharedValue(0);
  useEffect(() => {
    pop.value = 0;
    pop.value = withSequence(
      withSpring(1, { damping: 6, stiffness: 200 }),
      withTiming(0, { duration: 260 }),
    );
  }, [trigger, pop]);

  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pop.value, [0, 1], [1, 1.28]) }],
  }));

  const particles = useMemo(
    () => Array.from({ length: BURST_COUNT }, (_, i) => i),
    [],
  );

  return (
    <View style={[styles.iconBase, styles.burstStage]}>
      {particles.map((i) => (
        <BurstParticle key={`${trigger}-${i}`} index={i} trigger={trigger} />
      ))}
      <Reanimated.View style={coreStyle}>
        <Text style={styles.iconGlyph}>🎁</Text>
      </Reanimated.View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * 4) Duolingo-кнопка: пружинит при нажатии + рисующаяся галочка + haptic
 * ──────────────────────────────────────────────────────────────────────── */
const CHECK_LENGTH = 48; // длина пути галочки для stroke-dash анимации

function DuoButton() {
  const press = useSharedValue(0);
  const success = useSharedValue(0);
  const [done, setDone] = useState(false);

  const onPressIn = useCallback(() => {
    press.value = withSpring(1, { damping: 15, stiffness: 320 });
  }, [press]);

  const onPressOut = useCallback(() => {
    press.value = withSpring(0, { damping: 15, stiffness: 320 });
  }, [press]);

  const onPress = useCallback(() => {
    hapticSuccess();
    setDone(true);
    success.value = 0;
    success.value = withSequence(
      withSpring(1, { damping: 10, stiffness: 140 }),
      withDelay(900, withTiming(0, { duration: 280, easing: Easing.in(Easing.quad) })),
    );
    // авто-сброс лейбла, чтобы можно было жать повторно
    success.value = withDelay(1400, withTiming(0));
    setTimeout(() => setDone(false), 1400);
  }, [success]);

  const btnStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(press.value, [0, 1], [1, 0.94]) },
      { translateY: interpolate(press.value, [0, 1], [0, 3]) },
    ],
  }));

  // «3D»-нижняя кромка Duolingo: при нажатии кнопка «вдавливается» в свою тень
  const shadowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(press.value, [0, 1], [6, 1]) }],
    opacity: interpolate(press.value, [0, 1], [1, 0.6]),
  }));

  const checkProps = useAnimatedProps(() => ({
    strokeDashoffset: interpolate(success.value, [0, 1], [CHECK_LENGTH, 0]),
    opacity: success.value > 0.02 ? 1 : 0,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(success.value, [0, 0.5, 1], [1, 0.3, 0]),
  }));

  return (
    <View style={styles.duoWrap}>
      <Reanimated.View style={[styles.duoShadow, shadowStyle]} />
      <Reanimated.View style={btnStyle}>
        <Pressable
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          onPress={onPress}
          style={styles.duoBtn}
          accessibilityRole="button"
        >
          <Reanimated.Text style={[styles.duoLabel, labelStyle]}>
            {done ? '' : 'ПРОВЕРИТЬ'}
          </Reanimated.Text>
          {done ? (
            <Svg width={40} height={40} viewBox="0 0 40 40" style={StyleSheet.absoluteFill}>
              <AnimatedPath
                d="M11 21 L18 28 L30 13"
                stroke="#fff"
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={CHECK_LENGTH}
                animatedProps={checkProps}
              />
            </Svg>
          ) : null}
        </Pressable>
      </Reanimated.View>
    </View>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
 * Карточка-обёртка эффекта
 * ──────────────────────────────────────────────────────────────────────── */
function EffectCard({
  title,
  subtitle,
  children,
  onReplay,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  onReplay?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSub}>{subtitle}</Text>
      <View style={styles.stage}>{children}</View>
      {onReplay ? (
        <Pressable
          onPress={() => {
            hapticTap();
            onReplay();
          }}
          style={styles.replayBtn}
        >
          <Text style={styles.replayText}>↻ Ещё раз</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function AnimDemoLab() {
  const insets = useStableSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [flipN, setFlipN] = useState(0);
  const [burstN, setBurstN] = useState(0);
  const [shineN] = useState(0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: PALETTE.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 48,
        paddingHorizontal: 16,
        gap: 16,
      }}
    >
      <Text style={styles.h1}>Демо анимаций</Text>
      <Text style={styles.h2}>
        Текущий стек: Reanimated 4 + SVG + haptics. Без Lottie/Rive. Всё на UI-потоке.
      </Text>

      <EffectCard
        title="1 · Флип иконки (3D)"
        subtitle="rotateY + perspective — как иконка Telegram Business"
        onReplay={() => setFlipN((n) => n + 1)}
      >
        <FlipIcon trigger={flipN} />
      </EffectCard>

      <EffectCard
        title="2 · Блеск / Shine"
        subtitle="полоса света бежит по иконке (бегущий градиент, луп)"
      >
        <ShineIcon trigger={shineN} />
      </EffectCard>

      <EffectCard
        title="3 · Разлёт элементов"
        subtitle="частицы вылетают из иконки по кругу с пружиной"
        onReplay={() => setBurstN((n) => n + 1)}
      >
        <BurstIcon trigger={burstN} />
      </EffectCard>

      <EffectCard
        title="4 · Кнопка Duolingo"
        subtitle="пружинит при нажатии + рисующаяся галочка + success-haptic"
      >
        <DuoButton />
      </EffectCard>

      <Text style={[styles.h2, { textAlign: 'center', marginTop: 8 }]}>
        Нажми «Ещё раз» / на кнопку, чтобы пересмотреть.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  h1: { color: PALETTE.text, fontSize: 26, fontWeight: '800' },
  h2: { color: PALETTE.textDim, fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: PALETTE.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(124,92,255,0.18)',
  },
  cardTitle: { color: PALETTE.text, fontSize: 18, fontWeight: '700' },
  cardSub: { color: PALETTE.textDim, fontSize: 13, marginTop: 2 },
  stage: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBase: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 28,
    backgroundColor: 'rgba(124,92,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconClip: { overflow: 'hidden' },
  iconGlyph: { fontSize: 64 },
  shineBand: { width: 40, height: ICON_SIZE * 2, marginTop: -ICON_SIZE / 2 },
  burstStage: { backgroundColor: 'transparent', overflow: 'visible' },
  particle: { position: 'absolute', fontSize: 26 },
  replayBtn: {
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(124,92,255,0.22)',
    marginTop: 4,
  },
  replayText: { color: PALETTE.accentBright, fontWeight: '700', fontSize: 14 },
  duoWrap: { alignItems: 'center', justifyContent: 'center' },
  duoShadow: {
    position: 'absolute',
    width: 200,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#3f7d12',
    top: 6,
  },
  duoBtn: {
    width: 200,
    height: 56,
    borderRadius: 16,
    backgroundColor: PALETTE.good,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duoLabel: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.5 },
});
