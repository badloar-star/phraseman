/**
 * ResultsSequence — полноэкранная секвенция наград (спек §2 ResultsSequence, §2.1, AC 6/10).
 *
 * Таймлайн: медаль/бейдж (spring + haptic) → звёзды по одной
 * (fk.milestone('star1..3')) → XP-каунтер ~900мс (fk.tick троттлинг ≥70мс) →
 * конфетти → финальный reward-sound → CTA slide-up. Тап пропускает к финальному
 * состоянию. CTA активны максимум с 3000мс (спек §2.1: не блокировать дольше 3с).
 * intensity 'quiet' — без конфетти (для экзаменов/диагностики: тихо, без грозы).
 *
 * Perf Bible §2.1: монтируется только на финальном экране, всё на UI-треде,
 * конфетти конечное (ConfettiBurst), XP-таймер чистится на unmount/скип, ноль
 * фоновых циклов. Цвета из useTheme; тексты/бейдж/подписи CTA — через props.
 */
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Image } from 'expo-image';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedProps,
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
import { SpinRewardPlaque } from '../SpinRewardPlaque';
import EnergyCostBadge from '../EnergyCostBadge';
import {
  getResultsSequenceAudioPlan,
  getResultsSequenceMotionPlan,
} from './results_sequence_motion_plan';

export type ResultsIntensity = 'quiet' | 'milestone' | 'major';

export type ResultsSequenceRewards = {
  activeGift?: { label: string };
  multiplier?: { label: string };
  multipliers?: { label: string; xpDelta: number }[];
};

export type ResultsSequenceSpinReward = Readonly<{
  amount: 1;
  receiptId: string;
}>;

type NormalizedMultiplierReward = Readonly<{
  label: string;
  xpDelta: number;
}>;

const MAX_RESULTS_MULTIPLIERS = 8;

/** Stable primitive identity for reward content; caller object identity is irrelevant. */
export function getResultsSequenceMultiplierSignature(
  multipliers: ResultsSequenceRewards['multipliers'],
  legacyMultiplierLabel: string,
): string {
  const normalized = Array.isArray(multipliers)
    ? multipliers.slice(0, MAX_RESULTS_MULTIPLIERS).flatMap((reward) => {
        const label = String(reward?.label ?? '').trim().slice(0, 80);
        const xpDelta = Number.isFinite(reward?.xpDelta)
          ? Math.max(0, Math.round(reward.xpDelta))
          : 0;
        return label ? [{ label, xpDelta }] : [];
      })
    : legacyMultiplierLabel
      ? [{ label: legacyMultiplierLabel.slice(0, 80), xpDelta: 0 }]
      : [];
  return JSON.stringify(normalized);
}

function multiplierRewardsFromSignature(signature: string): readonly NormalizedMultiplierReward[] {
  try {
    return JSON.parse(signature) as NormalizedMultiplierReward[];
  } catch {
    return [];
  }
}

export interface ResultsSequenceProps {
  /** Число звёзд 0-3. */
  stars: number;
  /** XP-only surfaces hide the whole star row instead of presenting zero stars. */
  showStars?: boolean;
  /** Completion mark is meaningful in lessons, but Arena already states the outcome. */
  showFinaleMark?: boolean;
  xp: number;
  /**
   * Руны, заработанные в сессии (владелец, 2026-08-27). Опционально — экраны
   * без копилки практики (курс V2 без учебных активностей, Арена) просто не
   * передают это поле, и трек рун в таймлайне не появляется вовсе.
   */
  runes?: number;
  title: string;
  subtitle?: string;
  /** Optional, factual completion rewards. Omit when no reward was granted. */
  rewards?: ResultsSequenceRewards;
  /** Presentation-only spin receipt; never grants or persists a balance. */
  spinReward?: ResultsSequenceSpinReward;
  /** Слот медали/бейджа (обычно картинка/иконка). */
  badge?: React.ReactNode;
  /** Optional form/content kept in normal scroll flow before the result actions. */
  feedbackSlot?: React.ReactNode;
  onCtaPrimary: () => void;
  ctaPrimaryLabel: string;
  onCtaSecondary?: () => void;
  ctaSecondaryLabel?: string;
  secondaryShowsEnergyCost?: boolean;
  onCtaTertiary?: () => void;
  ctaTertiaryLabel?: string;
  /** 'quiet' — без конфетти-грозы (экзамены). */
  intensity?: ResultsIntensity;
}

// Таймлайн (мс).
const T_BADGE = 0;
const RESULTS_XP_COUNT_DURATION_MS = 1000;
const T_CTA = 2500;
const CTA_HARD_UNLOCK = 3000; // спек §2.1: CTA доступны не позже 3с
const REWARD_PILL_SLOT_HEIGHT = 50;
const SPIN_REWARD_SLOT_HEIGHT = 86;
const RESULTS_SEQUENCE_SOUND_OPTIONS = { scope: 'results-sequence' } as const;
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const ResultsXpValue = memo(function ResultsXpValue({
  progress,
  xpWidth,
  color,
  accessibilityLabel,
}: {
  progress: SharedValue<number>;
  xpWidth: number;
  color: string;
  accessibilityLabel: string;
}) {
  const animatedProps = useAnimatedProps(() => ({
    text: `${Math.max(0, Math.round(progress.value))}`,
    defaultValue: '0',
  }));
  return (
    <AnimatedTextInput
      accessibilityLabel={accessibilityLabel}
      animatedProps={animatedProps as never}
      editable={false}
      pointerEvents="none"
      style={[styles.xpValue, { color, width: xpWidth }]}
    />
  );
});

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

function RewardPill({
  children,
  backgroundColor,
  immediate,
}: {
  children: React.ReactNode;
  backgroundColor: string;
  immediate: boolean;
}) {
  const reveal = useSharedValue(0);
  useEffect(() => {
    reveal.value = immediate
      ? 1
      : withSpring(1, { damping: 14, stiffness: 210, mass: 0.55 });
  }, [immediate, reveal]);
  const style = useAnimatedStyle(() => ({
    opacity: reveal.value,
    transform: [
      { translateY: interpolate(reveal.value, [0, 1], [14, 0]) },
      { scale: interpolate(reveal.value, [0, 1], [0.92, 1]) },
    ],
  }));
  return <Animated.View style={[styles.rewardPill, { backgroundColor }, style]}>{children}</Animated.View>;
}

export function ResultsSequence({
  stars,
  showStars = true,
  showFinaleMark = true,
  xp,
  runes,
  title,
  subtitle,
  rewards,
  spinReward,
  badge,
  feedbackSlot,
  onCtaPrimary,
  ctaPrimaryLabel,
  onCtaSecondary,
  ctaSecondaryLabel,
  secondaryShowsEnergyCost = false,
  onCtaTertiary,
  ctaTertiaryLabel,
  intensity = 'major',
}: ResultsSequenceProps) {
  const { theme: t } = useTheme();
  const reduceMotion = useReduceMotion();
  const activeGiftLabel = String(rewards?.activeGift?.label ?? '').trim();
  const legacyMultiplierLabel = String(rewards?.multiplier?.label ?? '').trim();
  const multiplierRewardsSignature = getResultsSequenceMultiplierSignature(
    rewards?.multipliers,
    legacyMultiplierLabel,
  );
  const multiplierRewards = useMemo<readonly NormalizedMultiplierReward[]>(
    () => multiplierRewardsFromSignature(multiplierRewardsSignature),
    [multiplierRewardsSignature],
  );
  const finalXp = xp + multiplierRewards.reduce(
    (total, reward) => total + reward.xpDelta,
    0,
  );
  const motionPlan = useMemo(
    () => getResultsSequenceMotionPlan(intensity, reduceMotion),
    [intensity, reduceMotion],
  );
  const hasRunes = Number.isFinite(runes) && Number(runes) > 0;
  const audioPlan = useMemo(
    () => getResultsSequenceAudioPlan({
      activeGift: Boolean(activeGiftLabel),
      showStars,
      spinReward: Boolean(spinReward?.receiptId),
      multiplier: Boolean(legacyMultiplierLabel),
      multiplierCount: multiplierRewards.length,
      runes: hasRunes,
    }),
    [activeGiftLabel, hasRunes, legacyMultiplierLabel, multiplierRewards.length, showStars, spinReward?.receiptId],
  );

  const clampedStars = Math.max(0, Math.min(3, Math.floor(stars)));

  const badgeSV = useSharedValue(0);
  const star0 = useSharedValue(0);
  const star1 = useSharedValue(0);
  const star2 = useSharedValue(0);
  const ctaSV = useSharedValue(0);
  const xpProgress = useSharedValue(0);
  const xpRevealSV = useSharedValue(0);
  // зачем (владелец, 2026-08-27): руны — параллельный трек той же формы, что
  // XP (свой shared value для count-up, своя видимость), но со звуком строго
  // после того, как звук XP закончился (см. results_sequence_motion_plan.ts).
  const runesProgress = useSharedValue(0);
  const runesRevealSV = useSharedValue(0);
  const finaleSV = useSharedValue(0);
  const starSVs = useMemo(() => [star0, star1, star2], [star0, star1, star2]);
  const rewardSlotCount = (activeGiftLabel ? 1 : 0) + multiplierRewards.length;
  const rewardStackHeight = rewardSlotCount * REWARD_PILL_SLOT_HEIGHT
    + (spinReward?.receiptId ? SPIN_REWARD_SLOT_HEIGHT : 0);
  const xpWidth = Math.max(84, String(Math.max(xp, finalXp)).length * 32 + 20);
  const runesValue = Math.max(0, Math.round(Number(runes) || 0));
  const runesWidth = Math.max(84, String(runesValue).length * 32 + 20);

  const [xpVisible, setXpVisible] = useState(false);
  const [runesVisible, setRunesVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ctaReady, setCtaReady] = useState(false);
  const [activeGiftVisible, setActiveGiftVisible] = useState(false);
  const [visibleMultiplierCount, setVisibleMultiplierCount] = useState(0);
  const [spinRewardVisible, setSpinRewardVisible] = useState(false);
  const [spinRewardStatic, setSpinRewardStatic] = useState(false);
  const [finaleVisible, setFinaleVisible] = useState(false);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const skippedRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
  }, []);

  const handleCtaPrimary = useCallback(() => {
    fk.cancelResultsSequenceAudio();
    onCtaPrimary();
  }, [onCtaPrimary]);

  const handleCtaSecondary = useCallback(() => {
    fk.cancelResultsSequenceAudio();
    onCtaSecondary?.();
  }, [onCtaSecondary]);

  const handleCtaTertiary = useCallback(() => {
    fk.cancelResultsSequenceAudio();
    onCtaTertiary?.();
  }, [onCtaTertiary]);

  // Прыжок в финальное состояние (тап-скип).
  // Первый тап по экрану — доигрывает анимацию до конца и разблокирует CTA.
  // Повторный тап по неинтерактивной области результата (когда всё уже
  // показано) — сразу закрывает секвенцию через
  // onCtaPrimary. Это ключевой фикс «залипания»: раньше юзер тапал по
  // просвечивающим снизу кнопкам («Следующий урок» и т.п.), попадал в
  // прозрачный оверлей и ничего не происходило. Форма и CTA живут вне
  // Pressable-зоны, чтобы ввод и прокрутка никогда не запускали переход.
  const skipToEnd = useCallback(() => {
    if (skippedRef.current) {
      handleCtaPrimary();
      return;
    }
    skippedRef.current = true;
    fk.cancelResultsSequenceAudio();
    clearAllTimers();
    badgeSV.value = withTiming(1, { duration: 120 });
    starSVs.forEach((sv) => (sv.value = withTiming(1, { duration: 120 })));
    ctaSV.value = withTiming(1, { duration: 160 });
    xpProgress.value = finalXp > 0 ? finalXp : 0;
    xpRevealSV.value = withTiming(1, { duration: 120 });
    runesProgress.value = runesValue;
    runesRevealSV.value = withTiming(1, { duration: 120 });
    finaleSV.value = withTiming(1, { duration: 120 });
    setXpVisible(finalXp > 0);
    setRunesVisible(runesValue > 0);
    setActiveGiftVisible(Boolean(activeGiftLabel));
    setVisibleMultiplierCount(multiplierRewards.length);
    setSpinRewardVisible(Boolean(spinReward?.receiptId));
    setSpinRewardStatic(Boolean(spinReward?.receiptId));
    if (intensity !== 'quiet' && !reduceMotion) setShowConfetti(true);
    setCtaReady(true);
  }, [activeGiftLabel, badgeSV, starSVs, ctaSV, xpProgress, xpRevealSV, runesProgress, runesRevealSV, runesValue, finaleSV, finalXp, multiplierRewards.length, spinReward?.receiptId, intensity, reduceMotion, clearAllTimers, handleCtaPrimary]);

  useEffect(() => {
    clearAllTimers();
    cancelAnimation(badgeSV);
    starSVs.forEach((sv) => cancelAnimation(sv));
    cancelAnimation(ctaSV);
    cancelAnimation(xpProgress);
    cancelAnimation(xpRevealSV);
    cancelAnimation(runesProgress);
    cancelAnimation(runesRevealSV);
    cancelAnimation(finaleSV);
    skippedRef.current = false;
    badgeSV.value = 0;
    starSVs.forEach((sv) => { sv.value = 0; });
    ctaSV.value = 0;
    xpProgress.value = 0;
    xpRevealSV.value = 0;
    runesProgress.value = 0;
    runesRevealSV.value = 0;
    finaleSV.value = 0;
    setXpVisible(false);
    setRunesVisible(false);
    setShowConfetti(false);
    setCtaReady(false);
    setActiveGiftVisible(false);
    setVisibleMultiplierCount(0);
    setSpinRewardVisible(false);
    setSpinRewardStatic(false);
    setFinaleVisible(false);

    const push = (fn: () => void, ms: number) => {
      timeoutsRef.current.push(setTimeout(fn, ms));
    };

    if (motionPlan.immediate) {
      skippedRef.current = true;
      badgeSV.value = 1;
      starSVs.forEach((sv) => { sv.value = 1; });
      ctaSV.value = 1;
      xpProgress.value = finalXp > 0 ? finalXp : 0;
      xpRevealSV.value = 1;
      runesProgress.value = runesValue;
      runesRevealSV.value = 1;
      finaleSV.value = 1;
      setXpVisible(finalXp > 0);
      setRunesVisible(runesValue > 0);
      setActiveGiftVisible(Boolean(activeGiftLabel));
      setVisibleMultiplierCount(multiplierRewards.length);
      setSpinRewardVisible(Boolean(spinReward?.receiptId));
      setSpinRewardStatic(Boolean(spinReward?.receiptId));
      setFinaleVisible(true);
      setCtaReady(true);
      return () => {
        clearAllTimers();
        cancelAnimation(badgeSV);
        starSVs.forEach((sv) => cancelAnimation(sv));
        cancelAnimation(ctaSV);
        cancelAnimation(xpProgress);
        cancelAnimation(xpRevealSV);
        cancelAnimation(finaleSV);
        fk.cancelResultsSequenceAudio();
      };
    }

    // Медаль/бейдж.
    badgeSV.value = withDelay(
      T_BADGE,
      withSpring(1, { damping: 10, stiffness: 150, mass: 0.7 }),
    );
    if (motionPlan.playMilestones) push(() => fk.successHaptic(), T_BADGE + 40);

    // Звёзды по одной (только заполненные звучат восходящей нотой).
    if (showStars) {
      for (let i = 0; i < 3; i++) {
        const at = audioPlan.starSoundAtMs[i];
        push(() => {
          starSVs[i].value = withSpring(1, { damping: 11, stiffness: 170 });
          if (!motionPlan.playMilestones || i >= clampedStars) return;
          const kind = (i === 0 ? 'star1' : i === 1 ? 'star2' : 'star3') as
            | 'star1'
            | 'star2'
            | 'star3';
          fk.milestone(kind, RESULTS_SEQUENCE_SOUND_OPTIONS);
        }, at);
      }
    }

    // XP-каунтер идёт на UI thread; звук старта и первое видимое состояние
    // запускаются одним событием, а не независимыми таймерами.
    if (xp > 0) {
      push(() => {
        setXpVisible(true);
        xpRevealSV.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.6 });
        fk.xpCounterStart(RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, audioPlan.xpStartAtMs);
      audioPlan.xpTickAtMs.forEach((at) => push(() => {
        xpProgress.value = withTiming(xp, { duration: RESULTS_XP_COUNT_DURATION_MS });
        fk.tick(RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, at));
      push(() => {
        xpProgress.value = xp;
        fk.xpCounterComplete(RESULTS_SEQUENCE_SOUND_OPTIONS);
        if (!hasRunes && motionPlan.confettiCount > 0) setShowConfetti(true);
      }, audioPlan.xpCompleteAtMs);
    }

    // Руны — тот же приём, что XP выше, но начинается только после того, как
    // звук XP закончился целиком (владелец, 2026-08-27: «анимация начисления
    // рун точно такая же, как в Learning V2», встроена в общую секвенцию, а
    // не отдельным всплывающим тостом).
    if (hasRunes && audioPlan.runesStartAtMs !== undefined) {
      push(() => {
        setRunesVisible(true);
        runesRevealSV.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.6 });
        fk.xpCounterStart(RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, audioPlan.runesStartAtMs);
      (audioPlan.runesTickAtMs ?? []).forEach((at) => push(() => {
        runesProgress.value = withTiming(runesValue, { duration: RESULTS_XP_COUNT_DURATION_MS });
        fk.tick(RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, at));
      if (audioPlan.runesCompleteAtMs !== undefined) {
        push(() => {
          runesProgress.value = runesValue;
          fk.xpCounterComplete(RESULTS_SEQUENCE_SOUND_OPTIONS);
          if (motionPlan.confettiCount > 0) setShowConfetti(true);
        }, audioPlan.runesCompleteAtMs);
      }
    }

    if (audioPlan.activeGiftUnlockAtMs && activeGiftLabel) {
      push(() => {
        setActiveGiftVisible(true);
        fk.resultsReward('activeGiftUnlock', RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, audioPlan.activeGiftUnlockAtMs);
    }
    if (audioPlan.spinRewardAtMs && spinReward?.receiptId) {
      push(() => {
        setSpinRewardStatic(false);
        setSpinRewardVisible(true);
      }, audioPlan.spinRewardAtMs);
    }
    audioPlan.multiplierUpgradeAtMsList.forEach((at, index) => {
      const multiplierXpTotal = xp + multiplierRewards
        .slice(0, index + 1)
        .reduce((total, reward) => total + reward.xpDelta, 0);
      push(() => {
        setVisibleMultiplierCount(index + 1);
        xpProgress.value = withTiming(multiplierXpTotal, { duration: 420 });
        fk.resultsReward('multiplierUpgrade', RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, at);
    });

    // Конфетти на пике (кроме quiet).
    if (motionPlan.playMilestones) push(() => {
      setFinaleVisible(true);
      finaleSV.value = withSpring(1, { damping: 12, stiffness: 180, mass: 0.55 });
      fk.resultsFinale(RESULTS_SEQUENCE_SOUND_OPTIONS);
    }, audioPlan.finaleAtMs);

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
      cancelAnimation(xpProgress);
      cancelAnimation(xpRevealSV);
      cancelAnimation(finaleSV);
      fk.cancelResultsSequenceAudio();
    };
  }, [
    badgeSV,
    clampedStars,
    clearAllTimers,
    ctaSV,
    motionPlan,
    audioPlan,
    activeGiftLabel,
    starSVs,
    xp,
    finalXp,
    multiplierRewardsSignature,
    showStars,
    spinReward?.receiptId,
    xpProgress,
    xpRevealSV,
    finaleSV,
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
  const xpRevealStyle = useAnimatedStyle(() => ({
    opacity: xpRevealSV.value,
    transform: [
      { translateY: interpolate(xpRevealSV.value, [0, 1], [16, 0]) },
      { scale: interpolate(xpRevealSV.value, [0, 1], [0.9, 1]) },
    ],
  }));
  const runesRevealStyle = useAnimatedStyle(() => ({
    opacity: runesRevealSV.value,
    transform: [
      { translateY: interpolate(runesRevealSV.value, [0, 1], [16, 0]) },
      { scale: interpolate(runesRevealSV.value, [0, 1], [0.9, 1]) },
    ],
  }));
  const finaleStyle = useAnimatedStyle(() => ({
    opacity: finaleSV.value,
    transform: [
      { translateY: interpolate(finaleSV.value, [0, 1], [10, 0]) },
      { scale: interpolate(finaleSV.value, [0, 1], [0.7, 1]) },
    ],
  }));

  return (
    <ScrollView decelerationRate="fast"
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
    <View style={styles.root}>
      {showConfetti ? (
        <ConfettiBurst
          count={motionPlan.confettiCount}
          durationMs={1200}
          seed={11}
        />
      ) : null}

      <Pressable style={styles.center} onPress={skipToEnd} accessibilityRole="button">
        {badge ? (
          <Animated.View style={[styles.badgeSlot, badgeStyle]}>{badge}</Animated.View>
        ) : null}

        {showStars ? (
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
        ) : null}

        <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: t.textMuted }]}>{subtitle}</Text>
        ) : null}

        {xpVisible ? (
          <Animated.View style={[styles.xpRow, xpRevealStyle]}>
            <Text style={[styles.xpPlus, { color: t.gold }]}>+</Text>
            <ResultsXpValue
              progress={xpProgress}
              xpWidth={xpWidth}
              color={t.gold}
              accessibilityLabel={`${finalXp} XP`}
            />
            <Text style={[styles.xpUnit, { color: t.gold }]}>XP</Text>
          </Animated.View>
        ) : null}
        {runesVisible ? (
          <Animated.View style={[styles.xpRow, runesRevealStyle]}>
            <Text style={[styles.xpPlus, { color: t.gold }]}>+</Text>
            <ResultsXpValue
              progress={runesProgress}
              xpWidth={runesWidth}
              color={t.gold}
              accessibilityLabel={`${runesValue} рун`}
            />
            {/* guard-ok: декоративный ассет, смысл несёт accessibilityLabel выше */}
            <Image
              source={require('../../assets/images/level-spin-rewards/stars_10.webp')}
              style={styles.runesAsset}
              contentFit="contain"
              accessible={false}
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </Animated.View>
        ) : null}
        <View
          style={[
            styles.rewardStack,
            rewardStackHeight > 0 ? styles.rewardStackWithRewards : null,
            { height: rewardStackHeight },
          ]}
        >
          {spinReward?.receiptId ? (
            <SpinRewardPlaque
              amount={spinReward.amount}
              receiptId={spinReward.receiptId}
              visible={spinRewardVisible}
              staticPresentation={spinRewardStatic}
              onComplete={() => setSpinRewardVisible(false)}
              soundScope="results-sequence-spin"
              testID="results-sequence-spin-reward"
            />
          ) : null}
          {activeGiftVisible && activeGiftLabel ? (
            <RewardPill backgroundColor={t.bgSurface} immediate={reduceMotion}>
              <Text style={[styles.rewardText, { color: t.textPrimary }]}>🎁 {activeGiftLabel}</Text>
            </RewardPill>
          ) : null}
          {multiplierRewards.slice(0, visibleMultiplierCount).map((multiplier, index) => (
            <RewardPill key={`${multiplier.label}-${index}`} backgroundColor={t.bgSurface} immediate={reduceMotion}>
              <Text style={[styles.rewardText, { color: t.gold }]}>{multiplier.label}</Text>
            </RewardPill>
          ))}
        </View>
        {showFinaleMark ? (
          <View style={styles.finaleSlot}>
            {finaleVisible ? (
            <Animated.View style={[styles.finaleMark, finaleStyle]}>
              <Text style={[styles.finaleText, { color: t.gold }]}>✓</Text>
            </Animated.View>
            ) : null}
          </View>
        ) : null}
      </Pressable>

      {feedbackSlot ? <View style={styles.feedbackSlot}>{feedbackSlot}</View> : null}

      <Animated.View style={[styles.ctaWrap, ctaStyle]}>
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={!ctaReady}
          onPress={handleCtaPrimary}
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
            onPress={handleCtaSecondary}
            style={styles.ctaSecondary}
            accessibilityRole="button"
          >
            <Text style={[styles.ctaSecondaryText, { color: t.textMuted }]}>
              {ctaSecondaryLabel}
            </Text>
            {secondaryShowsEnergyCost ? <EnergyCostBadge testID="results-secondary-energy-cost" /> : null}
          </TouchableOpacity>
        ) : null}
        {onCtaTertiary && ctaTertiaryLabel ? (
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={!ctaReady}
            onPress={handleCtaTertiary}
            style={styles.ctaSecondary}
            accessibilityRole="button"
          >
            <Text style={[styles.ctaSecondaryText, { color: t.textMuted }]}>
              {ctaTertiaryLabel}
            </Text>
          </TouchableOpacity>
        ) : null}
      </Animated.View>
    </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  root: { flexGrow: 1, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 48, paddingHorizontal: 28 },
  center: { width: '100%', maxWidth: 584, flexGrow: 1, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  badgeSlot: { width: '100%', marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  star: { fontSize: 44, fontWeight: '900' },
  title: { fontSize: 28, fontWeight: '900', textAlign: 'center', letterSpacing: 0.3 },
  subtitle: { fontSize: 15, fontWeight: '600', textAlign: 'center', marginTop: 8, lineHeight: 21 },
  xpRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 20 },
  xpPlus: { fontSize: 22, fontWeight: '900', marginBottom: 5 },
  xpValue: { minWidth: 84, height: 58, padding: 0, fontSize: 50, fontWeight: '900', lineHeight: 54, marginHorizontal: 2, textAlign: 'center' },
  xpUnit: { fontSize: 18, fontWeight: '800', marginBottom: 6, marginLeft: 4 },
  runesAsset: { width: 28, height: 28, marginBottom: 8, marginLeft: 4 },
  rewardStack: { alignItems: 'center' },
  rewardStackWithRewards: { marginTop: 10 },
  rewardPill: { minHeight: 40, marginBottom: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center' },
  rewardText: { fontSize: 14, fontWeight: '800' },
  finaleSlot: { height: 34, alignItems: 'center', justifyContent: 'center' },
  finaleMark: { alignItems: 'center', justifyContent: 'center' },
  finaleText: { fontSize: 26, fontWeight: '900' },
  feedbackSlot: { width: '100%', maxWidth: 584, flexShrink: 0, marginBottom: 16 },
  ctaWrap: { width: '100%', flexShrink: 0, gap: 10 },
  ctaPrimary: {
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimaryText: { fontSize: 17, fontWeight: '900', letterSpacing: 0.3 },
  ctaSecondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  ctaSecondaryText: { fontSize: 15, fontWeight: '700' },
});

export default ResultsSequence;
