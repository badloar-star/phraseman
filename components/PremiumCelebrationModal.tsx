import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
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
import { LinearGradient } from './SafeLinearGradient';
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

type CelebrationVariant = 'premium' | 'vip';

const CELEBRATION_PALETTES: Record<CelebrationVariant, {
  backdrop: string;
  main: string;
  bright: string;
  text: string;
  dark: string;
  cta: [string, string, string];
  title: Record<string, string>;
  subtitle: Record<string, string>;
  emblem: string;
}> = {
  premium: {
    backdrop: '#0b0700',
    main: '#FFD700',
    bright: '#FFE680',
    text: '#FFE07A',
    dark: '#1a1208',
    cta: ['#B8860B', '#FFD700', '#B8860B'],
    emblem: '👑',
    title: {
      ru: '👑 Premium активирован',
      uk: '👑 Premium активовано',
      es: '👑 Premium activado',
      'pt-BR': '👑 Premium ativado',
      vi: '👑 Đã kích hoạt Premium',
      id: '👑 Premium aktif',
      tr: '👑 Premium etkinleştirildi',
      pl: '👑 Premium aktywowany',
    },
    subtitle: {
      ru: 'Все возможности разблокированы — поехали',
      uk: 'Усі можливості розблоковано — поїхали',
      es: 'Todo desbloqueado — empieza ahora',
      'pt-BR': 'Tudo desbloqueado — vamos começar',
      vi: 'Đã mở khóa mọi thứ — bắt đầu thôi',
      id: 'Semua fitur terbuka — mulai',
      tr: 'Tüm özellikler açıldı — başlayalım',
      pl: 'Wszystko odblokowane — zaczynamy',
    },
  },
  vip: {
    backdrop: '#03120a',
    main: '#22C55E',
    bright: '#86EFAC',
    text: '#BBF7D0',
    dark: '#04140A',
    cta: ['#047857', '#22C55E', '#065F46'],
    emblem: 'VIP',
    title: {
      ru: 'VIP активирован',
      uk: 'VIP активовано',
      es: 'VIP activado',
      'pt-BR': 'VIP ativado',
      vi: 'Đã kích hoạt VIP',
      id: 'VIP aktif',
      tr: 'VIP etkinleştirildi',
      pl: 'VIP aktywowany',
    },
    subtitle: {
      ru: 'VIP-доступ открыт: энергия и все функции разблокированы',
      uk: 'VIP-доступ відкрито: енергію й усі функції розблоковано',
      es: 'Acceso VIP abierto: energía y funciones desbloqueadas',
      'pt-BR': 'Acesso VIP aberto: energia e recursos desbloqueados',
      vi: 'Đã mở VIP: năng lượng và tính năng đều mở khóa',
      id: 'Akses VIP aktif: energi dan fitur terbuka',
      tr: 'VIP erişim açık: enerji ve özellikler açıldı',
      pl: 'Dostęp VIP otwarty: energia i funkcje odblokowane',
    },
  },
};

interface FeatureRow {
  emoji: string;
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
}

const FEATURES: FeatureRow[] = [
  { emoji: '⚡', ru: 'Безлимит энергии', uk: 'Безліміт енергії', es: 'Energía ilimitada', 'pt-BR': 'Energia ilimitada', vi: 'Năng lượng không giới hạn', id: 'Energi tanpa batas', tr: 'Sınırsız enerji', pl: 'Nielimitowana energia' },
  { emoji: '🔁', ru: 'Повтор уроков неограниченно', uk: 'Повтор уроків необмежено', es: 'Lecciones sin límites', 'pt-BR': 'Repetição ilimitada de lições', vi: 'Ôn bài không giới hạn', id: 'Ulangi pelajaran tanpa batas', tr: 'Sınırsız ders tekrarı', pl: 'Nieograniczone powtórki lekcji' },
  { emoji: '📊', ru: 'Моя практика слабых мест', uk: 'Моя практика слабких місць', es: 'Mi práctica de puntos débiles', 'pt-BR': 'Minha prática de pontos fracos', vi: 'Luyện điểm yếu của tôi', id: 'Latihan titik lemah saya', tr: 'Zayıf noktalar pratiğim', pl: 'Moja praktyka słabych miejsc' },
  { emoji: '🧠', ru: 'Аналитика прогресса', uk: 'Аналітика прогресу', es: 'Analítica del progreso', 'pt-BR': 'Análise do progresso', vi: 'Phân tích tiến độ', id: 'Analitik kemajuan', tr: 'İlerleme analitiği', pl: 'Analityka postępów' },
  { emoji: '🥇', ru: 'Сложные квизы', uk: 'Складні квізи', es: 'Quizzes difíciles', 'pt-BR': 'Quizzes difíceis', vi: 'Quiz khó', id: 'Kuis sulit', tr: 'Zor quizler', pl: 'Trudne quizy' },
  { emoji: '🛡️', ru: 'Защита цепочки', uk: 'Захист ланцюжка', es: 'Protección de racha', 'pt-BR': 'Proteção da sequência', vi: 'Bảo vệ chuỗi', id: 'Perlindungan rangkaian', tr: 'Seri koruması', pl: 'Ochrona serii' },
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
function Particle({ seed, started, color }: { seed: ParticleSeed; started: boolean; color: string }) {
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
      <View style={{ width: seed.size * 2, height: seed.size * 2, borderRadius: seed.size, backgroundColor: color }} />
    </RNAnim.View>
  );
}

function ShockWave({ active, color }: { active: boolean; color: string }) {
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
        <Circle cx={100} cy={100} r={92} stroke={color} strokeWidth={4} fill="none" />
      </Svg>
    </Animated.View>
  );
}

function Crown({ visible, emblem, color }: { visible: boolean; emblem: string; color: string }) {
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
      <Text style={[emblem === 'VIP' ? styles.vipEmblem : styles.crownEmoji, { color }]}>{emblem}</Text>
    </Animated.View>
  );
}

function scheduleHaptic(delayMs: number): void {
  setTimeout(() => { try { hapticTap(); } catch { /* noop */ } }, Math.max(0, delayMs));
}

function LockRow({
  feature,
  isUK,
  isES,
  index,
  startedAt,
  mainColor,
  darkColor,
  featureTextColor,
  visible,
  forceOpen,
}: {
  feature: FeatureRow;
  isUK: boolean;
  isES: boolean;
  index: number;
  startedAt: number;
  mainColor: string;
  darkColor: string;
  featureTextColor: string;
  visible: boolean;
  forceOpen: boolean;
}) {
  const { theme: t, f } = useTheme();
  const t1 = useSharedValue(0);
  const flash = useSharedValue(0);
  const iconPop = useSharedValue(0);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    cancelAnimation(t1);
    cancelAnimation(flash);
    cancelAnimation(iconPop);
    if (!visible) {
      t1.value = 0;
      flash.value = 0;
      iconPop.value = 0;
      setUnlocked(false);
      return undefined;
    }
    if (forceOpen) {
      setUnlocked(true);
      t1.value = withTiming(1, { duration: 140, easing: REasing.out(REasing.quad) });
      iconPop.value = withSpring(1, { mass: 0.45, damping: 7, stiffness: 160 });
      flash.value = withTiming(1, { duration: 180, easing: REasing.out(REasing.quad) });
      return undefined;
    }

    const delay = Math.max(0, STAGE.LOCKS_START - startedAt + index * STAGE.LOCKS_STAGGER);
    t1.value = 0;
    flash.value = 0;
    iconPop.value = 0;
    setUnlocked(false);
    t1.value = withDelay(delay, withSpring(1, { mass: 0.6, damping: 11, stiffness: 130 }));
    iconPop.value = withDelay(
      delay + 130,
      withSequence(
        withTiming(0.35, { duration: 90, easing: REasing.out(REasing.quad) }),
        withSpring(1, { mass: 0.45, damping: 7, stiffness: 160 }),
      ),
    );
    flash.value = withDelay(delay + 130, withTiming(1, { duration: 420, easing: REasing.out(REasing.quad) }));
    const unlockTimer = setTimeout(() => setUnlocked(true), delay + 120);
    runOnJS(scheduleHaptic)(delay + 60);
    return () => clearTimeout(unlockTimer);
  }, [t1, flash, iconPop, index, startedAt, visible, forceOpen]);

  const rowStyle = useAnimatedStyle(() => ({
    opacity: t1.value,
    transform: [{ translateX: interpolate(t1.value, [0, 1], [-32, 0]) }, { scale: interpolate(t1.value, [0, 1], [0.92, 1]) }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(iconPop.value, [0, 0.35, 1], [0, -6, 0]) },
      { rotate: `${interpolate(iconPop.value, [0, 1], [0, -12])}deg` },
      { scale: interpolate(iconPop.value, [0, 0.35, 1], [1, 0.82, 1.16]) },
    ],
  }));
  const flashStyle = useAnimatedStyle(() => ({
    opacity: interpolate(flash.value, [0, 0.25, 1], [0, 1, 0]),
    transform: [{ scale: interpolate(flash.value, [0, 1], [0.6, 1.6]) }],
  }));

  const label = isUK ? feature.uk : isES ? feature.es : feature.ru;

  return (
    <Animated.View style={[styles.row, rowStyle]}>
      <View style={[styles.lockBadge, { backgroundColor: darkColor, borderColor: mainColor }]}>
        <Animated.View style={[styles.lockIcon, iconStyle]}>
          <Ionicons
            name={unlocked ? 'lock-open' : 'lock-closed'}
            size={22}
            color={unlocked ? mainColor : featureTextColor}
          />
        </Animated.View>
        <Animated.View pointerEvents="none" style={[styles.lockFlash, flashStyle]}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: mainColor, opacity: 0.45 }} />
        </Animated.View>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.featureEmoji, { fontSize: f.bodyLg }]}>{feature.emoji}</Text>
        <Text style={[styles.featureLabel, { color: featureTextColor, fontSize: f.body }]}>{label}</Text>
      </View>
    </Animated.View>
  );
}

interface PremiumCelebrationModalProps {
  visible: boolean;
  onClose: () => void;
  variant?: CelebrationVariant;
}

export default function PremiumCelebrationModal({ visible, onClose, variant = 'premium' }: PremiumCelebrationModalProps) {
  const { width: winW, height: winH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const isUK = lang === 'uk';
  const isES = lang === 'es';
  const palette = CELEBRATION_PALETTES[variant];
  const isVip = variant === 'vip';
  const headlineColor = isVip ? '#F7FFF9' : palette.main;
  const subtitleColor = isVip ? '#E9FFF0' : palette.text;
  const featureTextColor = isVip ? '#F4FFF7' : palette.main;
  const counterTextColor = isVip ? '#FFFFFF' : palette.main;
  const ctaTextColor = isVip ? '#FFFFFF' : palette.dark;

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
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { backgroundColor: palette.backdrop }, backdropStyle]} />
        <Pressable
          style={[StyleSheet.absoluteFill, styles.skipLayer]}
          onPress={skipped ? handleClose : skip}
          accessibilityRole="button"
        />

        <Animated.View pointerEvents="none" style={[styles.glowWrap, glowStyle, { top: winH / 2 - winW / 2, width: winW, height: winW }]}>
          <Svg width={winW} height={winW} viewBox="0 0 100 100">
            <Circle cx={50} cy={50} r={48} fill={palette.main} opacity={0.18} />
            <Circle cx={50} cy={50} r={32} fill={palette.main} opacity={0.32} />
            <Circle cx={50} cy={50} r={18} fill={palette.bright} opacity={0.55} />
          </Svg>
        </Animated.View>

        <View pointerEvents="none" style={[styles.particleField, { top: winH / 2, left: winW / 2 }]}>
          {particles.map((seed, i) => (
            <Particle key={`p_${sessionKey}_${i}`} seed={seed} started={visible} color={palette.main} />
          ))}
        </View>

        <View pointerEvents="none" style={[styles.shockWaveWrap, { top: winH / 2 - 100, left: winW / 2 - 100 }]}>
          <ShockWave active={visible} color={palette.main} />
        </View>

        <View pointerEvents="none" style={[styles.crownAnchor, { top: winH / 2 - 200, width: winW }]}>
          <Crown visible={visible} emblem={palette.emblem} color={palette.main} />
        </View>

        <View pointerEvents="none" style={[styles.headlineWrap, { top: winH / 2 - 90, left: 24, right: 24 }]}>
          <Text
            style={[
              styles.headline,
              isVip && styles.vipReadableText,
              { color: headlineColor, fontSize: Math.max(24, f.h1) },
            ]}
          >
            {variant === 'vip'
              ? triLang(lang, {
                ru: 'VIP активирован',
                uk: 'VIP активовано',
                es: 'VIP activado',
                'pt-BR': 'VIP ativado',
                vi: 'Đã kích hoạt VIP',
                id: 'VIP aktif',
                tr: 'VIP etkinleştirildi',
                pl: 'VIP aktywowany',
              })
              : triLang(lang, {
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
          <Text
            style={[
              styles.subtitle,
              isVip && styles.vipReadableText,
              { color: subtitleColor, fontSize: f.body },
            ]}
          >
            {variant === 'vip'
              ? triLang(lang, {
                ru: 'VIP-доступ открыт: энергия и все функции разблокированы',
                uk: 'VIP-доступ відкрито: енергію й усі функції розблоковано',
                es: 'Acceso VIP abierto: energía y funciones desbloqueadas',
                'pt-BR': 'Acesso VIP aberto: energia e recursos desbloqueados',
                vi: 'Đã mở VIP: năng lượng và tính năng đều mở khóa',
                id: 'Akses VIP aktif: energi dan fitur terbuka',
                tr: 'VIP erişim açık: enerji ve özellikler açıldı',
                pl: 'Dostęp VIP otwarty: energia i funkcje odblokowane',
              })
              : triLang(lang, {
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
            <LockRow
              key={`${sessionKey}_${fe.ru}`}
              feature={fe}
              isUK={isUK}
              isES={isES}
              index={idx}
              startedAt={startedAt}
              mainColor={palette.main}
              darkColor={palette.dark}
              featureTextColor={featureTextColor}
              visible={visible}
              forceOpen={skipped}
            />
          ))}
          <Animated.View style={[styles.counterWrap, counterStyle]} pointerEvents="none">
            <Text
              style={[
                styles.counterText,
                isVip && styles.vipReadableText,
                { color: counterTextColor, fontSize: f.label },
              ]}
            >
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

        <Animated.View style={[styles.ctaWrap, styles.ctaLayer, ctaStyle, { bottom: ctaBottom }]}>
          <TouchableOpacity
            testID={`${variant}-celebration-cta`}
            accessibilityRole="button"
            hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            activeOpacity={0.88}
            onPress={() => { hapticSuccess(); handleClose(); }}
            style={styles.ctaTouch}
          >
            <LinearGradient
              colors={palette.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
            >
              <Text
                style={[
                  styles.ctaText,
                  isVip && styles.vipCtaText,
                  { color: ctaTextColor, fontSize: f.bodyLg },
                ]}
              >
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
  skipLayer: { zIndex: 0, elevation: 0 },
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
  vipEmblem: { fontSize: 54, fontWeight: '900', letterSpacing: 0 },
  headlineWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  headline: { color: '#FFD700', fontWeight: '900', textAlign: 'center', letterSpacing: 0 },
  subtitle: { color: '#FFE07A', textAlign: 'center', marginTop: 6, opacity: 0.85 },
  vipReadableText: {
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  /** Список + счётчик в одном столбце (счётчик не абсолютный — не наезжает на последний пункт) */
  featuresScroll: {
    position: 'absolute',
    left: 28,
    right: 28,
    zIndex: 12,
    elevation: 12,
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
  lockIcon: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  lockFlash: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  featureEmoji: { fontSize: 18, marginBottom: 0 },
  featureLabel: {
    fontWeight: '800',
    lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  counterWrap: { alignItems: 'center', marginTop: 6, paddingTop: 2 },
  counterText: { color: '#FFD700', fontWeight: '700', textAlign: 'center' },
  ctaWrap: { position: 'absolute', left: 28, right: 28 },
  ctaLayer: { zIndex: 30, elevation: 30 },
  ctaTouch: { borderRadius: 18, overflow: 'hidden' },
  ctaGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 56,
  },
  ctaText: { color: '#1a1208', fontWeight: '900', letterSpacing: 0 },
  vipCtaText: {
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ctaShimmerMask: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: 18,
  },
  ctaShimmer: { position: 'absolute', top: 0, bottom: 0, width: 140 },
});
