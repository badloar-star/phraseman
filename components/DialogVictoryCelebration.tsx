/**
 * DialogVictoryCelebration — «дорогой» салют финала ИИ-диалога (кнопка «Сделано!»).
 *
 * По фидбеку бета-теста: после разбора фраз не было чувства завершённости —
 * кнопка «К диалогам» просто уводила с экрана. Этот оверлей — праздничная
 * «точка»: свечение → эмодзи-герой с пружиной → конфетти → кольцо целей →
 * XP-счётчик → карточки метрик → CTA «К диалогам».
 *
 * Таймлайн, палитра и анимации — по утверждённому макету; тот же стиль
 * используется у финала урока как единый язык праздников в приложении.
 *
 * Контракты (Performance Bible):
 * - Монтируется ТОЛЬКО на время показа (родитель: {celebrating && <...>}),
 *   размонтируется по CTA — фоновой работы нет.
 * - Повторяемые анимации КОНЕЧНЫЕ (withRepeat с положительным счётчиком),
 *   поэтому файл не попадает в allowlist perf_freeze_contract.
 * - Без Math.random в рендере — детерминированный seeded() (стабильно при
 *   ремаунте), паттерн celebration lab.
 *
 * Показывать только при честном терминальном исходе 'success' (Plus-ветка) —
 * решение владельца: при выходе на полпути и в пейвол-ветке салюта нет.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
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
import { triLang, type Lang } from '../constants/i18n';
import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { hapticMediumImpact, hapticSuccess } from '../hooks/use-haptics';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ── Палитра «дорогого» праздника (единая с celebration lab) ──────────────────
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

// Стадии по времени (мс) — утверждённый макет.
const STAGE = {
  GLOW: 0,
  HERO: 200,
  CONFETTI: 500,
  RING: 700,
  COUNTER: 1100,
  METRICS_START: 1500,
  METRICS_STAGGER: 160,
  CTA: 1900,
} as const;

const CONFETTI_COUNT = 26;
const RAY_COUNT = 10;
// Конечные повторы: салют живёт секунды, вечные циклы не нужны
// (и не требуют гардов focus/AppState по perf_freeze_contract).
const FLOAT_REPEATS = 8;
const SHIMMER_REPEATS = 4;

// Детерминированный псевдослучай (без Math.random в рендере).
function seeded(i: number, salt: number): number {
  const x = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

// ── Одна конфетти-частица ─────────────────────────────────────────────────────
function ConfettiPiece({ index }: { index: number }) {
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);

  const angle = seeded(index, 1) * Math.PI * 2;
  const distance = 110 + seeded(index, 2) * (width * 0.4);
  const dx = Math.cos(angle) * distance;
  const dy = Math.sin(angle) * distance - 60; // лёгкий апвард-байас
  const rot = (seeded(index, 3) - 0.5) * 1080;
  const size = 7 + seeded(index, 4) * 8;
  const color = [PALETTE.gold, PALETTE.goldBright, PALETTE.emerald, '#FF9EC4', '#7CC8FF'][index % 5];
  const isCircle = index % 3 === 0;

  useEffect(() => {
    progress.value = withDelay(
      STAGE.CONFETTI,
      withTiming(1, { duration: 1400, easing: REasing.out(REasing.cubic) }),
    );
    return () => cancelAnimation(progress);
  }, [progress]);

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

// ── Луч света за героем ───────────────────────────────────────────────────────
function LightRay({ index }: { index: number }) {
  const grow = useSharedValue(0);
  const rotation = (360 / RAY_COUNT) * index;

  useEffect(() => {
    grow.value = withDelay(
      STAGE.HERO,
      withTiming(1, { duration: 600, easing: REasing.out(REasing.quad) }),
    );
    return () => cancelAnimation(grow);
  }, [grow]);

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
      style={[styles.ray, style]}
    />
  );
}

// ── Карточка метрики (реплики / цели / настроение) ────────────────────────────
function MetricCard({
  index,
  icon,
  value,
  label,
}: {
  index: number;
  icon: string;
  value: string;
  label: string;
}) {
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.value = withDelay(
      STAGE.METRICS_START + index * STAGE.METRICS_STAGGER,
      withSpring(1, { damping: 13, stiffness: 140 }),
    );
    return () => cancelAnimation(enter);
  }, [index, enter]);

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

export type DialogVictoryCelebrationProps = {
  lang: Lang;
  /** Реально начисленный XP; при 0 (повтор сценария, анти-фарм) строка скрыта. */
  xp: number;
  /** Реплик пользователя в диалоге. */
  replies: number;
  goalsMet: number;
  goalsTotal: number;
  /** Эмодзи-герой салюта. */
  heroEmoji?: string;
  /** Финальное настроение собеседника (эмодзи в карточке метрики). */
  moodEmoji?: string;
  /** CTA «К диалогам». */
  onDone: () => void;
};

export function DialogVictoryCelebration({
  lang,
  xp,
  replies,
  goalsMet,
  goalsTotal,
  heroEmoji = '🎉',
  moodEmoji = '😊',
  onDone,
}: DialogVictoryCelebrationProps) {
  const insets = useStableSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [xpDisplay, setXpDisplay] = useState(0);

  const backdrop = useSharedValue(0);
  const glow = useSharedValue(0);
  const heroScale = useSharedValue(0);
  const heroFloat = useSharedValue(0);
  const ringProgress = useSharedValue(0);
  const ctaIn = useSharedValue(0);
  const shimmer = useSharedValue(0);

  const xpTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const RING_SIZE = Math.min(width * 0.56, 220);
  const RING_R = (RING_SIZE - 18) / 2;
  const RING_C = 2 * Math.PI * RING_R;
  const goalsFraction = goalsTotal > 0 ? Math.min(1, goalsMet / goalsTotal) : 1;

  useEffect(() => {
    backdrop.value = withTiming(1, { duration: 350 });
    glow.value = withDelay(
      STAGE.GLOW,
      withTiming(1, { duration: 700, easing: REasing.out(REasing.quad) }),
    );

    heroScale.value = withDelay(
      STAGE.HERO,
      withSpring(1, { damping: 9, stiffness: 150, mass: 0.7 }),
    );
    heroFloat.value = withDelay(
      STAGE.HERO + 600,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 1600, easing: REasing.inOut(REasing.sin) }),
          withTiming(0, { duration: 1600, easing: REasing.inOut(REasing.sin) }),
        ),
        FLOAT_REPEATS,
        false,
      ),
    );

    ringProgress.value = withDelay(
      STAGE.RING,
      withTiming(1, { duration: 1100, easing: REasing.out(REasing.cubic) }),
    );

    ctaIn.value = withDelay(STAGE.CTA, withSpring(1, { damping: 14, stiffness: 130 }));
    shimmer.value = withDelay(
      STAGE.CTA + 300,
      withRepeat(
        withTiming(1, { duration: 1800, easing: REasing.inOut(REasing.quad) }),
        SHIMMER_REPEATS,
        false,
      ),
    );

    // Хаптики по таймлайну макета: success на герое, impact на конфетти.
    const hHero = setTimeout(() => {
      void hapticSuccess();
    }, STAGE.HERO);
    const hConfetti = setTimeout(() => {
      void hapticMediumImpact();
    }, STAGE.CONFETTI);

    // XP-счётчик (JS-driven, синхронно с кольцом); при xp<=0 строка скрыта.
    if (xp > 0) {
      const xpStart = Date.now() + STAGE.COUNTER;
      const xpDuration = 1200;
      xpTimerRef.current = setInterval(() => {
        const now = Date.now();
        if (now < xpStart) return;
        const t = Math.min(1, (now - xpStart) / xpDuration);
        const eased = 1 - Math.pow(1 - t, 3);
        setXpDisplay(Math.round(eased * xp));
        if (t >= 1 && xpTimerRef.current) {
          clearInterval(xpTimerRef.current);
          xpTimerRef.current = null;
        }
      }, 16);
    }

    return () => {
      clearTimeout(hHero);
      clearTimeout(hConfetti);
      cancelAnimation(backdrop);
      cancelAnimation(glow);
      cancelAnimation(heroScale);
      cancelAnimation(heroFloat);
      cancelAnimation(ringProgress);
      cancelAnimation(ctaIn);
      cancelAnimation(shimmer);
      if (xpTimerRef.current) clearInterval(xpTimerRef.current);
    };
  }, [backdrop, glow, heroScale, heroFloat, ringProgress, ctaIn, shimmer, xp]);

  const handleDone = useCallback(() => {
    onDone();
  }, [onDone]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(glow.value, [0, 1], [0, 1]),
    transform: [{ scale: interpolate(glow.value, [0, 1], [0.6, 1.15]) }],
  }));
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: heroScale.value },
      { translateY: interpolate(heroFloat.value, [0, 1], [0, -10]) },
    ],
  }));
  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_C * (1 - ringProgress.value * goalsFraction),
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaIn.value,
    transform: [
      { translateY: interpolate(ctaIn.value, [0, 1], [20, 0]) },
      { scale: ctaIn.value },
    ],
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { skewX: '-20deg' },
      { translateX: interpolate(shimmer.value, [0, 1], [-180, 180]) },
    ],
    opacity: interpolate(shimmer.value, [0, 0.5, 1], [0, 0.5, 0]),
  }));

  const rays = useMemo(() => Array.from({ length: RAY_COUNT }, (_, i) => i), []);
  const confetti = useMemo(() => Array.from({ length: CONFETTI_COUNT }, (_, i) => i), []);

  const title = triLang(lang, {
    ru: 'Диалог пройден!',
    uk: 'Діалог пройдено!',
    es: '¡Diálogo superado!',
    'pt-BR': 'Diálogo concluído!',
    vi: 'Hoàn thành hội thoại!',
    id: 'Dialog selesai!',
    tr: 'Diyalog tamamlandı!',
    pl: 'Dialog zaliczony!',
  });
  const subtitle =
    goalsTotal > 0 && goalsMet >= goalsTotal
      ? triLang(lang, {
          ru: 'Все цели выполнены — блестяще',
          uk: 'Усі цілі виконано — блискуче',
          es: 'Todas las metas cumplidas — brillante',
          'pt-BR': 'Todas as metas cumpridas — brilhante',
          vi: 'Đạt mọi mục tiêu — xuất sắc',
          id: 'Semua tujuan tercapai — cemerlang',
          tr: 'Tüm hedefler tamam — harika',
          pl: 'Wszystkie cele osiągnięte — świetnie',
        })
      : triLang(lang, {
          ru: 'Отличный разговор — так держать',
          uk: 'Чудова розмова — так тримати',
          es: 'Gran conversación — sigue así',
          'pt-BR': 'Ótima conversa — continue assim',
          vi: 'Cuộc trò chuyện tuyệt vời — cứ thế nhé',
          id: 'Percakapan hebat — pertahankan',
          tr: 'Harika sohbet — böyle devam',
          pl: 'Świetna rozmowa — tak trzymać',
        });

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      {/* фон */}
      <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
        <LinearGradient
          colors={[PALETTE.backdrop, '#0c1219', PALETTE.backdrop]}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* центральная сцена */}
      <View style={styles.stage}>
        <Animated.View style={[styles.glowOrb, glowStyle]} pointerEvents="none">
          <LinearGradient
            colors={[PALETTE.glow, 'rgba(255,206,120,0.0)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0.5 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View>

        <View style={styles.rayLayer} pointerEvents="none">
          {rays.map((i) => (
            <LightRay key={`ray-${i}`} index={i} />
          ))}
        </View>

        {/* кольцо целей + герой */}
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

          <View style={styles.confettiLayer} pointerEvents="none">
            {confetti.map((i) => (
              <ConfettiPiece key={`c-${i}`} index={i} />
            ))}
          </View>

          <Animated.View style={heroStyle}>
            <Text style={styles.hero}>{heroEmoji}</Text>
          </Animated.View>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        {xp > 0 && (
          <View style={styles.xpRow}>
            <Text style={styles.xpPlus}>+</Text>
            <Text style={styles.xpValue}>{xpDisplay}</Text>
            <Text style={styles.xpUnit}>XP</Text>
          </View>
        )}

        <View style={styles.metricsRow}>
          <MetricCard
            index={0}
            icon="💬"
            value={String(replies)}
            label={triLang(lang, {
              ru: 'Реплик',
              uk: 'Реплік',
              es: 'Frases',
              'pt-BR': 'Falas',
              vi: 'Lượt nói',
              id: 'Ucapan',
              tr: 'Replik',
              pl: 'Kwestie',
            })}
          />
          <MetricCard
            index={1}
            icon="🎯"
            value={goalsTotal > 0 ? `${goalsMet}/${goalsTotal}` : '—'}
            label={triLang(lang, {
              ru: 'Цели',
              uk: 'Цілі',
              es: 'Metas',
              'pt-BR': 'Metas',
              vi: 'Mục tiêu',
              id: 'Tujuan',
              tr: 'Hedefler',
              pl: 'Cele',
            })}
          />
          <MetricCard
            index={2}
            icon={moodEmoji}
            value={triLang(lang, {
              ru: 'Доволен',
              uk: 'Задоволений',
              es: 'Contento',
              'pt-BR': 'Contente',
              vi: 'Hài lòng',
              id: 'Senang',
              tr: 'Memnun',
              pl: 'Zadowolony',
            })}
            label={triLang(lang, {
              ru: 'Настроение',
              uk: 'Настрій',
              es: 'Ánimo',
              'pt-BR': 'Humor',
              vi: 'Tâm trạng',
              id: 'Suasana',
              tr: 'Ruh hali',
              pl: 'Nastrój',
            })}
          />
        </View>
      </View>

      {/* CTA */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <Animated.View style={[{ width: '100%' }, ctaStyle]}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleDone}
            style={styles.ctaWrap}
            accessibilityRole="button"
          >
            <LinearGradient
              colors={PALETTE.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.cta}
            >
              <Animated.View style={[styles.shimmer, shimmerStyle]} pointerEvents="none" />
              <Text style={styles.ctaText}>
                {triLang(lang, {
                  ru: 'К диалогам',
                  uk: 'До діалогів',
                  es: 'A los diálogos',
                  'pt-BR': 'Aos diálogos',
                  vi: 'Về hội thoại',
                  id: 'Ke dialog',
                  tr: 'Diyaloglara',
                  pl: 'Do dialogów',
                })}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  glowOrb: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    top: '16%',
    overflow: 'hidden',
  },
  rayLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center', top: '4%' },
  ray: {
    position: 'absolute',
    width: 14,
    height: 220,
    borderRadius: 7,
    backgroundColor: PALETTE.glow,
  },
  confettiLayer: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  hero: { fontSize: 86, textAlign: 'center' },
  title: { color: PALETTE.text, fontSize: 28, fontWeight: '900', marginTop: 24, letterSpacing: 0.3 },
  subtitle: { color: PALETTE.textDim, fontSize: 15, marginTop: 7, textAlign: 'center' },
  xpRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 18 },
  xpPlus: { color: PALETTE.gold, fontSize: 24, fontWeight: '900', marginBottom: 5 },
  xpValue: { color: PALETTE.goldBright, fontSize: 52, fontWeight: '900', lineHeight: 56, marginHorizontal: 2 },
  xpUnit: { color: PALETTE.gold, fontSize: 18, fontWeight: '800', marginBottom: 6, marginLeft: 4 },
  metricsRow: { flexDirection: 'row', gap: 12, marginTop: 26 },
  metricCard: {
    width: 96,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
    backgroundColor: PALETTE.card,
    borderWidth: 0,
    borderColor: PALETTE.cardBorder,
  },
  metricIcon: { fontSize: 22 },
  metricValue: { color: PALETTE.text, fontSize: 16, fontWeight: '900', marginTop: 6 },
  metricLabel: { color: PALETTE.textDim, fontSize: 12, marginTop: 3 },
  bottom: { paddingHorizontal: 24, alignItems: 'center' },
  ctaWrap: { width: '100%', borderRadius: 18, overflow: 'hidden' },
  cta: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  ctaText: { color: '#04261A', fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  shimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});

export default DialogVictoryCelebration;
