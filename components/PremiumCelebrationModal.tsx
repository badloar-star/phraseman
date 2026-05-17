import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated as RNAnim,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing as REasing,
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from './ThemeContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STAGE = {
  GLOW: 0,
  PARTICLES: 250,
  CROWN: 850,
  SHOCKWAVE: 1300,
  LOCKS_START: 1500,
  LOCKS_STAGGER: 250,
  COUNTER: 3100,
  CTA: 3400,
} as const;

// Уменьшено с 64 до 16 — каждая частица в reanimated = ~2 анимируемых значения.
// 64 частицы = ~128 shared values → лаги на Android mid-range.
const PARTICLE_COUNT = 16;

interface FeatureRow {
  emoji: string;
  ru: string;
  uk: string;
  es: string;
}

const FEATURES: FeatureRow[] = [
  { emoji: '⚡', ru: 'Безлимит энергии', uk: 'Безліміт енергії', es: 'Energía ilimitada' },
  { emoji: '🔁', ru: 'Повтор уроков неограниченно', uk: 'Повтор уроків необмежено', es: 'Lecciones sin límites' },
  { emoji: '📊', ru: 'Моя практика слабых мест', uk: 'Моя практика слабких місць', es: 'Mi práctica de puntos débiles' },
  { emoji: '🧠', ru: 'Аналитика прогресса', uk: 'Аналітика прогресу', es: 'Analítica del progreso' },
  { emoji: '🥇', ru: 'Сложные квизы', uk: 'Складні квізи', es: 'Quizzes difíciles' },
  { emoji: '🛡️', ru: 'Защита цепочки', uk: 'Захист ланцюжка', es: 'Protección de racha' },
];

interface ParticleSeed {
  angle: number;
  distance: number;
  delay: number;
  size: number;
  duration: number;
}

function buildParticleSeeds(): ParticleSeed[] {
  const seeds: ParticleSeed[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + (i % 3) * 0.2;
    seeds.push({
      angle,
      distance: 80 + (i % 5) * 24,
      delay: (i % 4) * 100,
      size: 2 + (i % 3),
      duration: 900 + (i % 4) * 150,
    });
  }
  return seeds;
}

// Частицы через RN Animated (не reanimated) — намного дешевле на Android
function Particle({ seed, started }: { seed: ParticleSeed; started: boolean }) {
  const t = useRef(new RNAnim.Value(0)).current;
  useEffect(() => {
    if (!started) { t.setValue(0); return; }
    const anim = RNAnim.timing(t, {
      toValue: 1,
      duration: seed.duration,
      delay: seed.delay,
      useNativeDriver: true,
      easing: (x) => 1 - Math.pow(1 - x, 3),
    });
    anim.start();
    return () => anim.stop();
  }, [started, seed.delay, seed.duration, t]);

  const x = t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(seed.angle) * seed.distance] });
  const y = t.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(seed.angle) * seed.distance] });
  const opacity = t.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 1, 0.8, 0] });

  return (
    <RNAnim.View
      style={[styles.particle, { opacity, transform: [{ translateX: x }, { translateY: y }] }]}
      pointerEvents="none"
    >
      <View style={{ width: seed.size * 2, height: seed.size * 2, borderRadius: seed.size, backgroundColor: '#FFD700' }} />
    </RNAnim.View>
  );
}

function ShockWave({ active }: { active: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => {
    if (!active) { t.value = 0; return; }
    t.value = 0;
    t.value = withTiming(1, { duration: 700, easing: REasing.out(REasing.quad) });
  }, [active, t]);
  const props = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(t.value, [0, 1], [0.4, 3.6]) }],
    opacity: interpolate(t.value, [0, 0.05, 0.85, 1], [0, 0.9, 0.3, 0]),
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.shockWave, props]}>
      <Svg width={200} height={200} viewBox="0 0 200 200">
        <Circle cx={100} cy={100} r={92} stroke="#FFD700" strokeWidth={4} fill="none" />
      </Svg>
    </Animated.View>
  );
}

function Crown({ visible }: { visible: boolean }) {
  const scale = useSharedValue(0);
  const rot = useSharedValue(0);
  useEffect(() => {
    if (!visible) { scale.value = 0; rot.value = 0; return; }
    scale.value = withSpring(1, { mass: 0.7, damping: 7, stiffness: 110 });
    rot.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: REasing.inOut(REasing.sin) }),
        withTiming(0, { duration: 2400, easing: REasing.inOut(REasing.sin) }),
      ),
      -1,
      true,
    );
  }, [visible, scale, rot]);
  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { perspective: 600 },
      { rotateY: `${interpolate(rot.value, [0, 1], [-12, 12])}deg` },
    ],
  }));
  return (
    <Animated.View style={[styles.crownWrap, animStyle]} pointerEvents="none">
      <Text style={styles.crownEmoji}>👑</Text>
    </Animated.View>
  );
}

function scheduleHaptic(delayMs: number): void {
  setTimeout(() => { try { hapticTap(); } catch { /* noop */ } }, Math.max(0, delayMs));
}

function LockRow({
  feature, isUK, isES, index, startedAt,
}: {
  feature: FeatureRow; isUK: boolean; isES: boolean; index: number; startedAt: number;
}) {
  const { theme: t, f } = useTheme();
  const t1 = useSharedValue(0);
  const flash = useSharedValue(0);

  useEffect(() => {
    const delay = Math.max(0, STAGE.LOCKS_START - startedAt + index * STAGE.LOCKS_STAGGER);
    t1.value = withDelay(delay, withSpring(1, { mass: 0.6, damping: 11, stiffness: 130 }));
    flash.value = withDelay(delay + 80, withTiming(1, { duration: 420, easing: REasing.out(REasing.quad) }));
    runOnJS(scheduleHaptic)(delay + 60);
  }, [t1, flash, index, startedAt]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: t1.value,
    transform: [{ translateX: interpolate(t1.value, [0, 1], [-32, 0]) }, { scale: interpolate(t1.value, [0, 1], [0.92, 1]) }],
  }));
  const lockStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t1.value, [0, 0.6, 1], [1, 0.7, 0]),
    transform: [{ scale: interpolate(t1.value, [0, 1], [1, 0.4]) }],
  }));
  const unlockStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t1.value, [0, 0.55, 1], [0, 0.5, 1]),
    transform: [{ scale: interpolate(t1.value, [0, 1], [0.4, 1]) }],
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flash.value, [0, 0.25, 1], [0, 1, 0]),
    transform: [{ scale: interpolate(flash.value, [0, 1], [0.6, 1.6]) }],
  }));

  const label = isUK ? feature.uk : isES ? feature.es : feature.ru;

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={[styles.lockBadge, { backgroundColor: '#1a1208', borderColor: '#FFD700' }]}>
        <Animated.Text style={[styles.lockIcon, lockStyle]}>🔒</Animated.Text>
        <Animated.Text style={[styles.lockIcon, unlockStyle, { position: 'absolute' }]}>🔓</Animated.Text>
        <Animated.View pointerEvents="none" style={[styles.lockFlash, flashStyle]}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFD700', opacity: 0.45 }} />
        </Animated.View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureEmoji, { fontSize: f.bodyLg }]}>{feature.emoji}</Text>
        <Text style={[styles.featureLabel, { color: '#FFD700', fontSize: f.body }]}>{label}</Text>
      </View>
    </Animated.View>
  );
}

interface PremiumCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PremiumCelebrationModal({ visible, onClose }: PremiumCelebrationModalProps) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const isES = lang === 'es';

  /** Кнопка снизу + отступ: на фолде/планшете окно низкое — список должен иметь реальную высоту и скролл. */
  const ctaBottom = 24 + insets.bottom;
  const featuresScrollBottom = ctaBottom + 80;

  const [skipped, setSkipped] = useState(false);
  const [startedAt] = useState<number>(0);
  const particles = useMemo(buildParticleSeeds, []);

  const glow = useSharedValue(0);
  const counterT = useSharedValue(0);
  const ctaT = useSharedValue(0);
  const ctaShimmer = useSharedValue(0);
  const backdropT = useSharedValue(0);

  // Защита от повторного глюка: при каждом visible=true генерируем новый ключ
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    if (!visible) {
      cancelAnimation(glow);
      cancelAnimation(counterT);
      cancelAnimation(ctaT);
      cancelAnimation(ctaShimmer);
      cancelAnimation(backdropT);
      glow.value = 0;
      counterT.value = 0;
      ctaT.value = 0;
      ctaShimmer.value = 0;
      backdropT.value = 0;
      setSkipped(false);
      return;
    }
    // Новая сессия — сбрасываем ключ чтобы LockRow-ы перемонтировались
    setSessionKey(k => k + 1);
    backdropT.value = withTiming(1, { duration: 320, easing: REasing.out(REasing.quad) });
    glow.value = withTiming(1, { duration: 600, easing: REasing.out(REasing.quad) });
    counterT.value = withDelay(STAGE.COUNTER, withSpring(1, { mass: 0.5, damping: 10, stiffness: 120 }));
    ctaT.value = withDelay(STAGE.CTA, withSpring(1, { mass: 0.6, damping: 11, stiffness: 130 }));
    ctaShimmer.value = withDelay(
      STAGE.CTA + 200,
      withRepeat(withTiming(1, { duration: 2200, easing: REasing.linear }), -1, false),
    );
    runOnJS(hapticSuccess)();
  }, [visible, glow, counterT, ctaT, ctaShimmer, backdropT]);

  const skip = useCallback(() => {
    setSkipped(true);
    counterT.value = withTiming(1, { duration: 180 });
    ctaT.value = withTiming(1, { duration: 180 });
  }, [counterT, ctaT]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropT.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 0.7]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.6, 1]) }],
  }));
  const counterStyle = useAnimatedStyle(() => ({
    opacity: counterT.value,
    transform: [{ translateY: interpolate(counterT.value, [0, 1], [12, 0]) }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaT.value,
    transform: [{ translateY: interpolate(ctaT.value, [0, 1], [16, 0]) }, { scale: interpolate(ctaT.value, [0, 1], [0.94, 1]) }],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(ctaShimmer.value, [0, 1], [-160, 320]) }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        <Pressable style={StyleSheet.absoluteFill} onPress={skipped ? handleClose : skip} accessibilityRole="button" />

        <Animated.View pointerEvents="none" style={[styles.glowWrap, glowStyle, { top: winH / 2 - winW / 2, width: winW, height: winW }]}>
          <Svg width={winW} height={winW} viewBox="0 0 100 100">
            <Circle cx={50} cy={50} r={48} fill="#FFD700" opacity={0.18} />
            <Circle cx={50} cy={50} r={32} fill="#FFD700" opacity={0.32} />
            <Circle cx={50} cy={50} r={18} fill="#FFE680" opacity={0.55} />
          </Svg>
        </Animated.View>

        <View pointerEvents="none" style={[styles.particleField, { top: winH / 2, left: winW / 2 }]}>
          {particles.map((seed, i) => (
            <Particle key={`p_${sessionKey}_${i}`} seed={seed} started={visible} />
          ))}
        </View>

        <View pointerEvents="none" style={[styles.shockWaveWrap, { top: winH / 2 - 100, left: winW / 2 - 100 }]}>
          <ShockWave active={visible} />
        </View>

        <View pointerEvents="none" style={[styles.crownAnchor, { top: winH / 2 - 200, width: winW }]}>
          <Crown visible={visible} />
        </View>

        <View pointerEvents="none" style={[styles.headlineWrap, { top: winH / 2 - 90, left: 24, right: 24 }]}>
          <Text style={[styles.headline, { fontSize: Math.max(24, f.h1) }]}>
            {triLang(lang, {
              ru: '👑 Premium активирован',
              uk: '👑 Premium активовано',
              es: '👑 Premium activado',
              'pt-BR': '👑 Premium ativado',
              vi: '👑 Đã kích hoạt Premium',
              id: '👑 Premium aktif',
              tr: '👑 Premium etkinleştirildi',
              pl: '👑 Premium aktywowany',
            })}
          </Text>
          <Text style={[styles.subtitle, { fontSize: f.body }]}>
            {triLang(lang, {
              ru: 'Все возможности разблокированы — поехали',
              uk: 'Усі можливості розблоковано — поїхали',
              es: 'Todo desbloqueado — empieza ahora',
              'pt-BR': 'Tudo desbloqueado — vamos começar',
              vi: 'Đã mở khóa mọi thứ — bắt đầu thôi',
              id: 'Semua fitur terbuka — mulai',
              tr: 'Tüm özellikler açıldı — başlayalım',
              pl: 'Wszystko odblokowane — zaczynamy',
            })}
          </Text>
        </View>

        <ScrollView
          key={`locks_${sessionKey}`}
          style={[styles.featuresScroll, { top: winH / 2 + 10, bottom: featuresScrollBottom }]}
          contentContainerStyle={styles.featuresScrollContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          bounces
        >
          {FEATURES.map((fe, idx) => (
            <LockRow key={`${sessionKey}_${fe.ru}`} feature={fe} isUK={isUK} isES={isES} index={idx} startedAt={startedAt} />
          ))}
          <Animated.View style={[styles.counterWrap, counterStyle]} pointerEvents="none">
            <Text style={[styles.counterText, { fontSize: f.label }]}>
              ✨ {triLang(lang, {
                ru: `${FEATURES.length}/${FEATURES.length} разблокировано`,
                uk: `${FEATURES.length}/${FEATURES.length} розблоковано`,
                es: `${FEATURES.length}/${FEATURES.length} desbloqueado`,
                'pt-BR': `${FEATURES.length}/${FEATURES.length} desbloqueado`,
                vi: `${FEATURES.length}/${FEATURES.length} đã mở khóa`,
                id: `${FEATURES.length}/${FEATURES.length} terbuka`,
                tr: `${FEATURES.length}/${FEATURES.length} açıldı`,
                pl: `${FEATURES.length}/${FEATURES.length} odblokowano`,
              })} ✨
            </Text>
          </Animated.View>
        </ScrollView>

        <Animated.View style={[styles.ctaWrap, ctaStyle, { bottom: ctaBottom }]}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => { hapticSuccess(); handleClose(); }}
            style={styles.ctaTouch}
          >
            <LinearGradient
              colors={['#B8860B', '#FFD700', '#B8860B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <Text style={[styles.ctaText, { fontSize: f.bodyLg }]}>
                {triLang(lang, {
                  ru: 'Начать',
                  uk: 'Розпочати',
                  es: 'Comenzar',
                  'pt-BR': 'Começar',
                  vi: 'Bắt đầu',
                  id: 'Mulai',
                  tr: 'Başla',
                  pl: 'Zacznij',
                })}
              </Text>
              <View style={styles.ctaShimmerMask} pointerEvents="none">
                <Animated.View style={[styles.ctaShimmer, shimmerStyle]}>
                  <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={{ flex: 1, width: 140 }}
                  />
                </Animated.View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { backgroundColor: '#0b0700' },
  glowWrap: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleField: { position: 'absolute', width: 0, height: 0 },
  particle: { position: 'absolute', top: 0, left: 0 },
  shockWaveWrap: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shockWave: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  crownAnchor: {
    position: 'absolute',
    left: 0,
    alignItems: 'center',
  },
  crownWrap: { alignItems: 'center' },
  crownEmoji: { fontSize: 80 },
  headlineWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  headline: { color: '#FFD700', fontWeight: '900', textAlign: 'center', letterSpacing: 0.3 },
  subtitle: { color: '#FFE07A', textAlign: 'center', marginTop: 6, opacity: 0.85 },
  /** Список + счётчик в одном столбце (счётчик не абсолютный — не наезжает на последний пункт) */
  featuresScroll: {
    position: 'absolute',
    left: 28,
    right: 28,
  },
  featuresScrollContent: {
    gap: 10,
    paddingBottom: 4,
    /** Запас под въезд рядов с translateX −32 — иначе замки/эмодзи обрезает ScrollView */
    paddingLeft: 40,
    paddingRight: 8,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  lockBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  lockIcon: { fontSize: 20, position: 'absolute' },
  lockFlash: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  featureEmoji: { fontSize: 18, marginBottom: 0 },
  featureLabel: { fontWeight: '700', lineHeight: 20 },
  counterWrap: { alignItems: 'center', marginTop: 6, paddingTop: 2 },
  counterText: { color: '#FFD700', fontWeight: '700', textAlign: 'center' },
  ctaWrap: { position: 'absolute', left: 28, right: 28 },
  ctaTouch: { borderRadius: 18, overflow: 'hidden' },
  ctaGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 56,
  },
  ctaText: { color: '#1a1208', fontWeight: '900', letterSpacing: 0.5 },
  ctaShimmerMask: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 18,
  },
  ctaShimmer: { position: 'absolute', top: 0, bottom: 0, width: 140 },
});
