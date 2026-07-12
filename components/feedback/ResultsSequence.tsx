/**
 * ResultsSequence — полноэкранная секвенция наград (спек §2 ResultsSequence, §2.1, AC 6/10).
 *
 * Таймлайн: медаль/бейдж (spring, fk.milestone('medal')) → звёзды по одной
 * (fk.milestone('star1..3')) → XP-каунтер ~900мс (fk.tick троттлинг ≥70мс) →
 * конфетти (fk.milestone('chord')) → CTA slide-up. Тап пропускает к финальному
 * состоянию. CTA активны максимум с 3000мс (спек §2.1: не блокировать дольше 3с).
 * intensity 'quiet' — без конфетти (для экзаменов/диагностики: тихо, без грозы).
 *
 * Perf Bible §2.1: монтируется только на финальном экране, всё на UI-треде,
 * конфетти конечное (ConfettiBurst), XP-таймер чистится на unmount/скип, ноль
 * фоновых циклов. Цвета из useTheme; тексты/бейдж/подписи CTA — через props.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useTheme } from '../ThemeContext';
import fk from '../../app/feedback/feedback_kit';
import ConfettiBurst from './ConfettiBurst';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { getResultsSequenceMotionPlan } from './results_sequence_motion_plan';

export type ResultsIntensity = 'quiet' | 'milestone' | 'major';

export interface ResultsSequenceProps {
  /** Число звёзд 0-3. */
  stars: number;
  xp: number;
  title: string;
  subtitle?: string;
  /** Слот медали/бейджа (обычно картинка/иконка). */
  badge?: React.ReactNode;
  onCtaPrimary: () => void;
  ctaPrimaryLabel: string;
  onCtaSecondary?: () => void;
  ctaSecondaryLabel?: string;
  /** 'quiet' — без конфетти-грозы (экзамены). */
  intensity?: ResultsIntensity;
}

// Таймлайн (мс).
const T_BADGE = 0;
const T_STARS = 500;
const T_STAR_GAP = 260;
const T_XP = 1400;
const XP_REVEAL_DELAY = 900;
const T_CTA = 2500;
const CTA_HARD_UNLOCK = 3000; // спек §2.1: CTA доступны не позже 3с

function Star({
  filled,
  progress,
  color,
  dim,
}: {
  filled: boolean;
  progress: SharedValue<number>;
  color: string;
  dim: string;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 1], [0.3, 1]) },
      { rotate: `${interpolate(progress.value, [0, 1], [-40, 0])}deg` },
    ],
  }));
  return (
    <Animated.View style={style}>
      <Text style={[styles.star, { color: filled ? color : dim }]}>★</Text>
    </Animated.View>
  );
}

export function ResultsSequence({
  stars,
  xp,
  title,
  subtitle,
  badge,
  onCtaPrimary,
  ctaPrimaryLabel,
  onCtaSecondary,
  ctaSecondaryLabel,
  intensity = 'major',
}: ResultsSequenceProps) {
  const { theme: t } = useTheme();
  const reduceMotion = useReduceMotion();
  const motionPlan = useMemo(
    () => getResultsSequenceMotionPlan(intensity, reduceMotion),
    [intensity, reduceMotion],
  );

  const clampedStars = Math.max(0, Math.min(3, Math.floor(stars)));

  const badgeSV = useSharedValue(0);
  const star0 = useSharedValue(0);
  const star1 = useSharedValue(0);
  const star2 = useSharedValue(0);
  const ctaSV = useSharedValue(0);
  const starSVs = useMemo(() => [star0, star1, star2], [star0, star1, star2]);

  const [xpDisplay, setXpDisplay] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ctaReady, setCtaReady] = useState(false);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const skippedRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  // Прыжок в финальное состояние (тап-скип).
  // Первый тап по экрану — доигрывает анимацию до конца и разблокирует CTA.
  // Повторный тап (когда всё уже показано) — сразу закрывает секвенцию через
  // onCtaPrimary. Это ключевой фикс «залипания»: раньше юзер тапал по
  // просвечивающим снизу кнопкам («Следующий урок» и т.п.), попадал в
  // прозрачный оверлей и ничего не происходило. Теперь любой повторный тап по
  // экрану гарантированно уводит к рабочим кнопкам.
  const skipToEnd = useCallback(() => {
    if (skippedRef.current) {
      onCtaPrimary();
      return;
    }
    skippedRef.current = true;
    clearAllTimers();
    badgeSV.value = withTiming(1, { duration: 120 });
    starSVs.forEach((sv) => (sv.value = withTiming(1, { duration: 120 })));
    ctaSV.value = withTiming(1, { duration: 160 });
    setXpDisplay(xp > 0 ? xp : 0);
    if (intensity !== 'quiet' && !reduceMotion) setShowConfetti(true);
    setCtaReady(true);
  }, [badgeSV, starSVs, ctaSV, xp, intensity, reduceMotion, clearAllTimers, onCtaPrimary]);

  useEffect(() => {
    clearAllTimers();
    cancelAnimation(badgeSV);
    starSVs.forEach((sv) => cancelAnimation(sv));
    cancelAnimation(ctaSV);
    skippedRef.current = false;
    badgeSV.value = 0;
    starSVs.forEach((sv) => { sv.value = 0; });
    ctaSV.value = 0;
    setXpDisplay(0);
    setShowConfetti(false);
    setCtaReady(false);

    const push = (fn: () => void, ms: number) => {
      timeoutsRef.current.push(setTimeout(fn, ms));
    };

    if (motionPlan.immediate) {
      skippedRef.current = true;
      badgeSV.value = 1;
      starSVs.forEach((sv) => { sv.value = 1; });
      ctaSV.value = 1;
      setXpDisplay(xp > 0 ? xp : 0);
      setCtaReady(true);
      return () => {
        clearAllTimers();
        cancelAnimation(badgeSV);
        starSVs.forEach((sv) => cancelAnimation(sv));
        cancelAnimation(ctaSV);
      };
    }

    // Медаль/бейдж.
    badgeSV.value = withDelay(
      T_BADGE,
      withSpring(1, { damping: 10, stiffness: 150, mass: 0.7 }),
    );
    if (motionPlan.playMilestones) push(() => fk.milestone('medal'), T_BADGE + 40);

    // Звёзды по одной (только заполненные звучат восходящей нотой).
    for (let i = 0; i < 3; i++) {
      const at = T_STARS + i * T_STAR_GAP;
      starSVs[i].value = withDelay(
        at,
        withSpring(1, { damping: 11, stiffness: 170 }),
      );
      if (motionPlan.playMilestones && i < clampedStars) {
        const kind = (i === 0 ? 'star1' : i === 1 ? 'star2' : 'star3') as
          | 'star1'
          | 'star2'
          | 'star3';
        push(() => fk.milestone(kind), at + 30);
      }
    }

    // XP-каунтер.
    push(() => setXpDisplay(xp > 0 ? xp : 0), T_XP);

    // Конфетти на пике (кроме quiet).
    if (motionPlan.confettiCount > 0) {
      push(() => {
        setShowConfetti(true);
        fk.milestone('chord');
      }, T_XP + XP_REVEAL_DELAY);
    }

    // CTA slide-up + разблокировка.
    ctaSV.value = withDelay(T_CTA, withSpring(1, { damping: 14, stiffness: 130 }));
    push(() => setCtaReady(true), Math.min(T_CTA, CTA_HARD_UNLOCK));
    // Жёсткая гарантия: не позже 3с.
    push(() => {
      ctaSV.value = withTiming(1, { duration: 150 });
      setCtaReady(true);
    }, CTA_HARD_UNLOCK);

    return () => {
      clearAllTimers();
      cancelAnimation(badgeSV);
      starSVs.forEach((sv) => cancelAnimation(sv));
      cancelAnimation(ctaSV);
    };
  }, [
    badgeSV,
    clampedStars,
    clearAllTimers,
    ctaSV,
    motionPlan,
    starSVs,
    xp,
  ]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeSV.value,
    transform: [
      { scale: interpolate(badgeSV.value, [0, 1], [0.4, 1]) },
      { translateY: interpolate(badgeSV.value, [0, 1], [20, 0]) },
    ],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaSV.value,
    transform: [{ translateY: interpolate(ctaSV.value, [0, 1], [26, 0]) }],
  }));

  return (
    <Pressable style={styles.root} onPress={skipToEnd} accessibilityRole="button">
      {showConfetti ? (
        <ConfettiBurst
          count={motionPlan.confettiCount}
          durationMs={1200}
          seed={11}
        />
      ) : null}

      <View style={styles.center}>
        {badge ? (
          <Animated.View style={[styles.badgeSlot, badgeStyle]}>{badge}</Animated.View>
        ) : null}

        <View style={styles.starsRow}>
          {[0, 1, 2].map((i) => (
            <Star
              key={`rs-star-${i}`}
              filled={i < clampedStars}
              progress={starSVs[i]}
              color={t.gold}
              dim={t.border}
            />
          ))}
        </View>

        <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: t.textMuted }]}>{subtitle}</Text>
        ) : null}

        {xp > 0 ? (
          <View style={styles.xpRow}>
            <Text style={[styles.xpPlus, { color: t.gold }]}>+</Text>
            <Text style={[styles.xpValue, { color: t.gold }]}>{xpDisplay}</Text>
            <Text style={[styles.xpUnit, { color: t.gold }]}>XP</Text>
          </View>
        ) : null}
      </View>

      <Animated.View style={[styles.ctaWrap, ctaStyle]}>
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={!ctaReady}
          onPress={onCtaPrimary}
          style={[styles.ctaPrimary, { backgroundColor: t.accent }]}
          accessibilityRole="button"
        >
          <Text style={[styles.ctaPrimaryText, { color: t.correctText }]}>
            {ctaPrimaryLabel}
          </Text>
        </TouchableOpacity>
        {onCtaSecondary && ctaSecondaryLabel ? (
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!ctaReady}
            onPress={onCtaSecondary}
            style={styles.ctaSecondary}
            accessibilityRole="button"
          >
            <Text style={[styles.ctaSecondaryText, { color: t.textMuted }]}>
              {ctaSecondaryLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 48, paddingHorizontal: 28 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badgeSlot: { marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  star: { fontSize: 44, fontWeight: '900' },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 0.3 },
  subtitle: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 8, lineHeight: 21 },
  xpRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 20 },
  xpPlus: { fontSize: 22, fontWeight: '900', marginBottom: 5 },
  xpValue: { fontSize: 50, fontWeight: '900', lineHeight: 54, marginHorizontal: 2 },
  xpUnit: { fontSize: 18, fontWeight: '800', marginBottom: 6, marginLeft: 4 },
  ctaWrap: { width: '100%', gap: 10 },
  ctaPrimary: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimaryText: { fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  ctaSecondary: { height: 44, alignItems: 'center', justifyContent: 'center' },
  ctaSecondaryText: { fontSize: 15, fontWeight: '700' },
});

export default ResultsSequence;
