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
import { HOME_RUNE_ICON_SOURCE } from '../home/homeRuneAsset';
import {
  getResultsSequenceAudioPlan,
  getResultsSequenceMotionPlan,
} from './results_sequence_motion_plan';
import { getResultsSequenceFinalRevealPlan } from './results_sequence_final_reveal_plan';

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
  /** Premium card layout used by the owner-approved Learning V2 completion. */
  layoutVariant?: 'default' | 'learning-v2-pulse' | 'learning-v2-orbit';
  /** Small completion context above the main title. */
  eyebrow?: string;
  /** Factual session metrics shown inside the Pulse reward ledger. */
  summaryMetrics?: readonly Readonly<{ value: string; label: string }>[];
  /** Restarts the reward choreography without remounting the feedback form. */
  replayKey?: string | number;
  /** Lets locally committed XP/runes join an already-mounted result without replaying its stars. */
  animateLateRewards?: boolean;
  /** Authoritative screen-level motion preference, available before async system lookup settles. */
  reducedMotion?: boolean;
  /** Bottom safe-area inset for non-scrolling, full-screen result layouts. */
  bottomInset?: number;
  /** True only after the local XP/rune completion transaction has settled. */
  rewardsSettled?: boolean;
  xpLabel?: string;
  runesLabel?: string;
  runesAccessibilityLabel?: string;
  onCtaPrimary: () => void;
  ctaPrimaryLabel: string;
  /** Accessible name for tapping the hero to reveal the settled result. */
  skipAnimationA11yLabel?: string;
  ctaPrimaryTestID?: string;
  onCtaSecondary?: () => void;
  ctaSecondaryLabel?: string;
  secondaryShowsEnergyCost?: boolean;
  onCtaTertiary?: () => void;
  ctaTertiaryLabel?: string;
  ctaTertiaryTestID?: string;
  /** 'quiet' — без конфетти-грозы (экзамены). */
  intensity?: ResultsIntensity;
}

// Таймлайн (мс).
const T_BADGE = 0;
const RESULTS_XP_COUNT_DURATION_MS = 1000;
const LATE_REWARD_COUNT_DURATION_MS = 460;
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
  compact = false,
}: {
  progress: SharedValue<number>;
  xpWidth: number;
  color: string;
  accessibilityLabel: string;
  compact?: boolean;
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
      style={[compact ? styles.pulseRewardValue : styles.xpValue, { color, width: xpWidth }]}
    />
  );
});

function Star({
  filled,
  progress,
  color,
  dim,
  compact = false,
}: {
  filled: boolean;
  progress: SharedValue<number>;
  color: string;
  dim: string;
  compact?: boolean;
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
      <Text style={[styles.star, compact ? styles.orbitStar : null, { color: filled ? color : dim }]}>★</Text>
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
  layoutVariant = 'default',
  eyebrow,
  summaryMetrics = [],
  replayKey,
  animateLateRewards = false,
  reducedMotion,
  bottomInset = 0,
  rewardsSettled = true,
  xpLabel = 'XP',
  runesLabel = 'RUNES',
  runesAccessibilityLabel,
  onCtaPrimary,
  ctaPrimaryLabel,
  skipAnimationA11yLabel = 'Show full result',
  ctaPrimaryTestID,
  onCtaSecondary,
  ctaSecondaryLabel,
  secondaryShowsEnergyCost = false,
  onCtaTertiary,
  ctaTertiaryLabel,
  ctaTertiaryTestID,
  intensity = 'major',
}: ResultsSequenceProps) {
  const { theme: t } = useTheme();
  const systemReduceMotion = useReduceMotion();
  const effectiveReducedMotion = reducedMotion ?? systemReduceMotion;
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
  const runesValue = Math.max(0, Math.round(Number(runes) || 0));
  const timelineRewardSnapshotRef = useRef({
    replayKey,
    xp,
    runes: runesValue,
  });
  if (!Object.is(timelineRewardSnapshotRef.current.replayKey, replayKey)) {
    timelineRewardSnapshotRef.current = { replayKey, xp, runes: runesValue };
  }
  const timelineXp = animateLateRewards
    ? timelineRewardSnapshotRef.current.xp
    : xp;
  const timelineRunesValue = animateLateRewards
    ? timelineRewardSnapshotRef.current.runes
    : runesValue;
  const finalXp = xp + multiplierRewards.reduce(
    (total, reward) => total + reward.xpDelta,
    0,
  );
  const timelineFinalXp = timelineXp + multiplierRewards.reduce(
    (total, reward) => total + reward.xpDelta,
    0,
  );
  const motionPlan = useMemo(
    () => getResultsSequenceMotionPlan(intensity, effectiveReducedMotion),
    [intensity, effectiveReducedMotion],
  );
  const hasRunes = Number.isFinite(runes) && Number(runes) > 0;
  const timelineHasRunes = timelineRunesValue > 0;
  const audioPlan = useMemo(
    () => getResultsSequenceAudioPlan({
      activeGift: Boolean(activeGiftLabel),
      showStars,
      spinReward: Boolean(spinReward?.receiptId),
      multiplier: Boolean(legacyMultiplierLabel),
      multiplierCount: multiplierRewards.length,
      runes: timelineHasRunes,
    }),
    [activeGiftLabel, legacyMultiplierLabel, multiplierRewards.length, showStars, spinReward?.receiptId, timelineHasRunes],
  );
  const presentationFinaleAtMs = useMemo(() => {
    const hasTimelineReward = timelineXp > 0 || timelineHasRunes;
    const hasExtraReward = Boolean(
      activeGiftLabel || spinReward?.receiptId || multiplierRewards.length > 0,
    );
    if (hasTimelineReward || hasExtraReward) return audioPlan.finaleAtMs;
    const lastStarAtMs = audioPlan.starSoundAtMs[
      audioPlan.starSoundAtMs.length - 1
    ] ?? T_BADGE;
    return lastStarAtMs + 220;
  }, [
    activeGiftLabel,
    audioPlan.finaleAtMs,
    audioPlan.starSoundAtMs,
    multiplierRewards.length,
    spinReward?.receiptId,
    timelineHasRunes,
    timelineXp,
  ]);

  const clampedStars = Math.max(0, Math.min(3, Math.floor(stars)));
  // Reduced motion is a true first-frame final state. Secondary local reward
  // receipts may enrich the counters later, but never own the result screen.
  const initiallySettled = motionPlan.immediate;

  const badgeSV = useSharedValue(initiallySettled ? 1 : 0);
  const star0 = useSharedValue(initiallySettled ? 1 : 0);
  const star1 = useSharedValue(initiallySettled ? 1 : 0);
  const star2 = useSharedValue(initiallySettled ? 1 : 0);
  const ctaSV = useSharedValue(initiallySettled ? 1 : 0);
  const xpProgress = useSharedValue(initiallySettled ? finalXp : 0);
  const xpRevealSV = useSharedValue(initiallySettled && finalXp > 0 ? 1 : 0);
  // зачем (владелец, 2026-08-27): руны — параллельный трек той же формы, что
  // XP (свой shared value для count-up, своя видимость), но со звуком строго
  // после того, как звук XP закончился (см. results_sequence_motion_plan.ts).
  const runesProgress = useSharedValue(initiallySettled ? runesValue : 0);
  const runesRevealSV = useSharedValue(initiallySettled && runesValue > 0 ? 1 : 0);
  const finaleSV = useSharedValue(initiallySettled ? 1 : 0);
  const detailsSV = useSharedValue(initiallySettled ? 1 : 0);
  const starSVs = useMemo(() => [star0, star1, star2], [star0, star1, star2]);
  const rewardSlotCount = (activeGiftLabel ? 1 : 0) + multiplierRewards.length;
  const rewardStackHeight = rewardSlotCount * REWARD_PILL_SLOT_HEIGHT
    + (spinReward?.receiptId ? SPIN_REWARD_SLOT_HEIGHT : 0);
  const xpWidth = Math.max(84, String(Math.max(xp, finalXp)).length * 32 + 20);
  const runesWidth = Math.max(84, String(runesValue).length * 32 + 20);

  const [xpVisible, setXpVisible] = useState(initiallySettled && finalXp > 0);
  const [runesVisible, setRunesVisible] = useState(initiallySettled && runesValue > 0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [ctaReady, setCtaReady] = useState(initiallySettled);
  const [activeGiftVisible, setActiveGiftVisible] = useState(initiallySettled && Boolean(activeGiftLabel));
  const [visibleMultiplierCount, setVisibleMultiplierCount] = useState(
    initiallySettled ? multiplierRewards.length : 0,
  );
  const [spinRewardVisible, setSpinRewardVisible] = useState(
    initiallySettled && Boolean(spinReward?.receiptId),
  );
  const [spinRewardStatic, setSpinRewardStatic] = useState(
    initiallySettled && Boolean(spinReward?.receiptId),
  );
  const [finaleVisible, setFinaleVisible] = useState(initiallySettled);
  const [detailsReady, setDetailsReady] = useState(initiallySettled);

  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const skippedRef = useRef(false);
  const forcedUnlockedRef = useRef(initiallySettled);
  const lateXpAnimatedRef = useRef(timelineXp > 0);
  const lateRunesAnimatedRef = useRef(timelineRunesValue > 0);
  const rewardSequenceCursorEndsAtRef = useRef(0);
  const lateDetailsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sequenceMountedAtRef = useRef(Date.now());

  const clearAllTimers = useCallback(() => {
    timeoutsRef.current.forEach((id) => clearTimeout(id));
    timeoutsRef.current = [];
    if (lateDetailsTimeoutRef.current) {
      clearTimeout(lateDetailsTimeoutRef.current);
      lateDetailsTimeoutRef.current = null;
    }
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
    forcedUnlockedRef.current = true;
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
    detailsSV.value = withTiming(1, { duration: 120 });
    setDetailsReady(true);
    setXpVisible(finalXp > 0);
    setRunesVisible(runesValue > 0);
    setActiveGiftVisible(Boolean(activeGiftLabel));
    setVisibleMultiplierCount(multiplierRewards.length);
    setSpinRewardVisible(Boolean(spinReward?.receiptId));
    setSpinRewardStatic(Boolean(spinReward?.receiptId));
    if (intensity !== 'quiet' && !effectiveReducedMotion) setShowConfetti(true);
    setCtaReady(true);
  }, [activeGiftLabel, badgeSV, starSVs, ctaSV, xpProgress, xpRevealSV, runesProgress, runesRevealSV, runesValue, finaleSV, detailsSV, finalXp, multiplierRewards.length, spinReward?.receiptId, intensity, effectiveReducedMotion, clearAllTimers, handleCtaPrimary]);

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
    cancelAnimation(detailsSV);
    skippedRef.current = false;
    forcedUnlockedRef.current = motionPlan.immediate;
    badgeSV.value = 0;
    starSVs.forEach((sv) => { sv.value = 0; });
    ctaSV.value = 0;
    xpProgress.value = 0;
    xpRevealSV.value = 0;
    runesProgress.value = 0;
    runesRevealSV.value = 0;
    finaleSV.value = 0;
    detailsSV.value = 0;
    setXpVisible(false);
    setRunesVisible(false);
    setShowConfetti(false);
    setCtaReady(false);
    setActiveGiftVisible(false);
    setVisibleMultiplierCount(0);
    setSpinRewardVisible(false);
    setSpinRewardStatic(false);
    setFinaleVisible(false);
    setDetailsReady(false);
    sequenceMountedAtRef.current = Date.now();
    lateXpAnimatedRef.current = timelineXp > 0;
    lateRunesAnimatedRef.current = timelineRunesValue > 0;
    rewardSequenceCursorEndsAtRef.current = 0;

    const push = (fn: () => void, ms: number) => {
      timeoutsRef.current.push(setTimeout(fn, ms));
    };

    if (motionPlan.immediate) {
      skippedRef.current = true;
      badgeSV.value = 1;
      starSVs.forEach((sv) => { sv.value = 1; });
      ctaSV.value = 1;
      xpProgress.value = timelineFinalXp > 0 ? timelineFinalXp : 0;
      xpRevealSV.value = 1;
      runesProgress.value = timelineRunesValue;
      runesRevealSV.value = 1;
      finaleSV.value = 1;
      detailsSV.value = 1;
      setXpVisible(timelineFinalXp > 0);
      setRunesVisible(timelineRunesValue > 0);
      setActiveGiftVisible(Boolean(activeGiftLabel));
      setVisibleMultiplierCount(multiplierRewards.length);
      setSpinRewardVisible(Boolean(spinReward?.receiptId));
      setSpinRewardStatic(Boolean(spinReward?.receiptId));
      setFinaleVisible(true);
      setDetailsReady(true);
      setCtaReady(true);
      return () => {
        clearAllTimers();
        cancelAnimation(badgeSV);
        starSVs.forEach((sv) => cancelAnimation(sv));
        cancelAnimation(ctaSV);
        cancelAnimation(xpProgress);
        cancelAnimation(xpRevealSV);
        cancelAnimation(runesProgress);
        cancelAnimation(runesRevealSV);
        cancelAnimation(finaleSV);
        cancelAnimation(detailsSV);
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
    if (timelineXp > 0) {
      push(() => {
        setXpVisible(true);
        xpRevealSV.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.6 });
        fk.xpCounterStart(RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, audioPlan.xpStartAtMs);
      audioPlan.xpTickAtMs.forEach((at) => push(() => {
        xpProgress.value = withTiming(timelineXp, { duration: RESULTS_XP_COUNT_DURATION_MS });
        fk.tick(RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, at));
      push(() => {
        xpProgress.value = timelineXp;
        fk.xpCounterComplete(RESULTS_SEQUENCE_SOUND_OPTIONS);
        if (!timelineHasRunes && motionPlan.confettiCount > 0) setShowConfetti(true);
      }, audioPlan.xpCompleteAtMs);
    }

    // Руны — тот же приём, что XP выше, но начинается только после того, как
    // звук XP закончился целиком (владелец, 2026-08-27: «анимация начисления
    // рун точно такая же, как в Learning V2», встроена в общую секвенцию, а
    // не отдельным всплывающим тостом).
    if (timelineHasRunes && audioPlan.runesStartAtMs !== undefined) {
      push(() => {
        setRunesVisible(true);
        runesRevealSV.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.6 });
        fk.xpCounterStart(RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, audioPlan.runesStartAtMs);
      (audioPlan.runesTickAtMs ?? []).forEach((at) => push(() => {
        runesProgress.value = withTiming(timelineRunesValue, { duration: RESULTS_XP_COUNT_DURATION_MS });
        fk.tick(RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, at));
      if (audioPlan.runesCompleteAtMs !== undefined) {
        push(() => {
          runesProgress.value = timelineRunesValue;
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
      const multiplierXpTotal = timelineXp + multiplierRewards
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
    }, presentationFinaleAtMs);

    rewardSequenceCursorEndsAtRef.current = Date.now() + presentationFinaleAtMs;

    return () => {
      clearAllTimers();
      cancelAnimation(badgeSV);
      starSVs.forEach((sv) => cancelAnimation(sv));
      cancelAnimation(ctaSV);
      cancelAnimation(xpProgress);
      cancelAnimation(xpRevealSV);
      cancelAnimation(runesProgress);
      cancelAnimation(runesRevealSV);
      cancelAnimation(finaleSV);
      cancelAnimation(detailsSV);
      fk.cancelResultsSequenceAudio();
    };
  }, [
    badgeSV,
    clampedStars,
    clearAllTimers,
    ctaSV,
    motionPlan,
    audioPlan,
    presentationFinaleAtMs,
    activeGiftLabel,
    starSVs,
    timelineXp,
    timelineFinalXp,
    multiplierRewardsSignature,
    multiplierRewards,
    showStars,
    spinReward?.receiptId,
    replayKey,
    timelineHasRunes,
    runesProgress,
    runesRevealSV,
    timelineRunesValue,
    xpProgress,
    xpRevealSV,
    finaleSV,
    detailsSV,
  ]);

  useEffect(() => {
    if (!animateLateRewards) return;
    const pendingXp = xp > timelineXp && !lateXpAnimatedRef.current;
    const pendingRunes = runesValue > timelineRunesValue
      && !lateRunesAnimatedRef.current;
    if (!pendingXp && !pendingRunes) return;
    if (pendingXp) lateXpAnimatedRef.current = true;
    if (pendingRunes) lateRunesAnimatedRef.current = true;

    if (skippedRef.current || forcedUnlockedRef.current || motionPlan.immediate) {
      if (pendingXp) {
        xpProgress.value = finalXp;
        xpRevealSV.value = 1;
        setXpVisible(finalXp > 0);
      }
      if (pendingRunes) {
        runesProgress.value = runesValue;
        runesRevealSV.value = 1;
        setRunesVisible(true);
      }
      return;
    }

    const schedule = (fn: () => void, delayMs: number) => {
      timeoutsRef.current.push(setTimeout(fn, delayMs));
    };
    let cursorMs = Math.max(
      0,
      rewardSequenceCursorEndsAtRef.current - Date.now() + 120,
    );

    if (pendingXp) {
      schedule(() => {
        setXpVisible(true);
        xpProgress.value = 0;
        xpRevealSV.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.6 });
        xpProgress.value = withTiming(finalXp, { duration: LATE_REWARD_COUNT_DURATION_MS });
        fk.xpCounterStart(RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, cursorMs);
      schedule(
        () => fk.tick(RESULTS_SEQUENCE_SOUND_OPTIONS),
        cursorMs + Math.round(LATE_REWARD_COUNT_DURATION_MS * 0.45),
      );
      cursorMs += LATE_REWARD_COUNT_DURATION_MS;
      schedule(() => {
        xpProgress.value = finalXp;
        fk.xpCounterComplete(RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, cursorMs);
      cursorMs += 120;
    }

    if (pendingRunes) {
      schedule(() => {
        setRunesVisible(true);
        runesProgress.value = 0;
        runesRevealSV.value = withSpring(1, { damping: 14, stiffness: 200, mass: 0.6 });
        runesProgress.value = withTiming(runesValue, { duration: LATE_REWARD_COUNT_DURATION_MS });
        fk.xpCounterStart(RESULTS_SEQUENCE_SOUND_OPTIONS);
      }, cursorMs);
      schedule(
        () => fk.tick(RESULTS_SEQUENCE_SOUND_OPTIONS),
        cursorMs + Math.round(LATE_REWARD_COUNT_DURATION_MS * 0.45),
      );
      cursorMs += LATE_REWARD_COUNT_DURATION_MS;
      schedule(() => {
        runesProgress.value = runesValue;
        fk.xpCounterComplete(RESULTS_SEQUENCE_SOUND_OPTIONS);
        if (motionPlan.confettiCount > 0) setShowConfetti(true);
      }, cursorMs);
    }

    rewardSequenceCursorEndsAtRef.current = Date.now() + cursorMs;
  }, [
    animateLateRewards,
    finalXp,
    motionPlan,
    runesProgress,
    runesRevealSV,
    runesValue,
    timelineRunesValue,
    timelineXp,
    xp,
    xpProgress,
    xpRevealSV,
  ]);

  useEffect(() => {
    if (forcedUnlockedRef.current) {
      xpProgress.value = finalXp;
      xpRevealSV.value = finalXp > 0 ? 1 : 0;
      runesProgress.value = runesValue;
      runesRevealSV.value = runesValue > 0 ? 1 : 0;
      setXpVisible(finalXp > 0);
      setRunesVisible(runesValue > 0);
      return;
    }
    if (lateDetailsTimeoutRef.current) {
      clearTimeout(lateDetailsTimeoutRef.current);
      lateDetailsTimeoutRef.current = null;
    }

    const revealPlan = getResultsSequenceFinalRevealPlan({
      nowMs: Date.now(),
      mountedAtMs: sequenceMountedAtRef.current,
      rewardCursorEndsAtMs: rewardSequenceCursorEndsAtRef.current,
      hardUnlockMs: CTA_HARD_UNLOCK,
      immediate: motionPlan.immediate,
      rewardsSettled,
    });
    const phaseTimers: ReturnType<typeof setTimeout>[] = [];

    lateDetailsTimeoutRef.current = setTimeout(() => {
      const hardSettle = revealPlan.mode !== 'animated';
      if (revealPlan.mode === 'hard-settle') fk.cancelResultsSequenceAudio();
      if (revealPlan.mode === 'hard-settle') forcedUnlockedRef.current = true;
      badgeSV.value = 1;
      starSVs.forEach((sv) => { sv.value = 1; });
      xpProgress.value = finalXp;
      xpRevealSV.value = 1;
      runesProgress.value = runesValue;
      runesRevealSV.value = 1;
      finaleSV.value = 1;
      setXpVisible(finalXp > 0);
      setRunesVisible(runesValue > 0);
      setFinaleVisible(true);
      setActiveGiftVisible(Boolean(activeGiftLabel));
      setVisibleMultiplierCount(multiplierRewards.length);
      setSpinRewardVisible(Boolean(spinReward?.receiptId));
      setSpinRewardStatic(Boolean(spinReward?.receiptId));
      lateDetailsTimeoutRef.current = null;

      if (hardSettle) {
        detailsSV.value = 1;
        ctaSV.value = 1;
        setDetailsReady(true);
        setCtaReady(true);
        return;
      }

      detailsSV.value = withTiming(1, { duration: revealPlan.detailsDurationMs });
      phaseTimers.push(setTimeout(() => {
        setDetailsReady(true);
        ctaSV.value = withTiming(1, { duration: revealPlan.ctaDurationMs });
        phaseTimers.push(setTimeout(() => {
          setCtaReady(true);
        }, revealPlan.ctaDurationMs));
      }, revealPlan.detailsDurationMs));
    }, revealPlan.revealDelayMs);

    return () => {
      if (lateDetailsTimeoutRef.current) {
        clearTimeout(lateDetailsTimeoutRef.current);
        lateDetailsTimeoutRef.current = null;
      }
      phaseTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [
    activeGiftLabel,
    badgeSV,
    ctaSV,
    detailsSV,
    finalXp,
    finaleSV,
    motionPlan.immediate,
    multiplierRewards.length,
    rewardsSettled,
    runesProgress,
    runesRevealSV,
    runesValue,
    spinReward?.receiptId,
    starSVs,
    xpProgress,
    xpRevealSV,
  ]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeSV.value,
    transform: [
      { scale: interpolate(badgeSV.value, [0, 1], [0.4, 1]) },
      { translateY: interpolate(badgeSV.value, [0, 1], [20, 0]) },
    ],
  }));
  const orbitRingStyle = useAnimatedStyle(() => ({
    opacity: interpolate(badgeSV.value, [0, 1], [0, 0.36]),
    transform: [
      { scale: interpolate(badgeSV.value, [0, 1], [0.72, 1]) },
      { rotate: `${interpolate(badgeSV.value, [0, 1], [-24, 0])}deg` },
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
  const orbitDetailsStyle = useAnimatedStyle(() => ({
    opacity: detailsSV.value,
    transform: [
      { translateY: interpolate(detailsSV.value, [0, 1], [10, 0]) },
    ],
  }));
  const orbitMode = layoutVariant === 'learning-v2-orbit';
  const pulseMode = layoutVariant === 'learning-v2-pulse' || orbitMode;

  return (
    <ScrollView decelerationRate="fast"
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
      scrollEnabled={!orbitMode}
      bounces={!orbitMode}
      showsVerticalScrollIndicator={false}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
    <View
      style={[
        styles.root,
        pulseMode ? styles.pulseRoot : null,
        orbitMode ? styles.orbitRoot : null,
        orbitMode ? { paddingBottom: Math.max(10, bottomInset + 8) } : null,
      ]}
    >
      {showConfetti ? (
        <ConfettiBurst
          count={motionPlan.confettiCount}
          durationMs={1200}
          seed={11}
        />
      ) : null}

      {pulseMode ? (
        <Pressable
          style={[styles.center, styles.pulseCenter, orbitMode ? styles.orbitCenter : null]}
          onPress={skipToEnd}
          accessibilityRole="button"
          accessibilityLabel={skipAnimationA11yLabel}
        >
          <View
            testID="results-sequence-pulse-hero"
            style={[styles.pulseHero, orbitMode ? styles.orbitHero : null, { backgroundColor: t.bgCard }]}
          >
            <View
              pointerEvents="none"
              style={[styles.pulseGlow, { backgroundColor: t.accent }]}
            />
            {orbitMode ? (
              <Animated.View pointerEvents="none" style={[styles.orbitRings, orbitRingStyle]}>
                <View
                  style={[styles.orbitRing, styles.orbitRingWide, { borderColor: t.accent }]}
                />
                <View
                  style={[styles.orbitRing, styles.orbitRingTall, { borderColor: t.gold }]}
                />
              </Animated.View>
            ) : null}
            {badge ? (
              <Animated.View style={[styles.pulseBadgeSlot, orbitMode ? styles.orbitBadgeSlot : null, badgeStyle]}>{badge}</Animated.View>
            ) : null}
            {showStars ? (
              <View style={[styles.starsRow, styles.pulseStarsRow, orbitMode ? styles.orbitStarsRow : null]}>
                {[0, 1, 2].map((i) => (
                  <Star
                    key={`rs-star-${i}`}
                    filled={i < clampedStars}
                    progress={starSVs[i]}
                    color={t.gold}
                    dim={t.border}
                    compact={orbitMode}
                  />
                ))}
              </View>
            ) : null}
            {eyebrow ? (
              <Text style={[styles.pulseEyebrow, orbitMode ? styles.orbitEyebrow : null, { color: t.accent }]}>{eyebrow}</Text>
            ) : null}
            <Text style={[styles.title, styles.pulseTitle, orbitMode ? styles.orbitTitle : null, { color: t.textPrimary }]}>{title}</Text>
            {subtitle ? (
              <Text style={[styles.subtitle, styles.pulseSubtitle, orbitMode ? styles.orbitSubtitle : null, { color: t.textMuted }]}>{subtitle}</Text>
            ) : null}
          </View>

          <View
            testID="results-sequence-pulse-ledger"
            style={[styles.pulseLedger, orbitMode ? styles.orbitLedger : null, { backgroundColor: t.bgSurface2 }]}
          >
            {finalXp > 0 || hasRunes ? <View style={styles.pulseRewardGrid}>
              {finalXp > 0 ? <Animated.View
                style={[
                  styles.pulseRewardCard,
                  orbitMode ? styles.orbitRewardCard : null,
                  { backgroundColor: t.bgCard },
                  finalXp > 0 ? xpRevealStyle : null,
                ]}
              >
                <Text style={[styles.pulseRewardLabel, { color: t.textMuted }]}>{xpLabel}</Text>
                <View style={styles.pulseRewardValueRow}>
                  <Text style={[styles.pulseRewardPlus, { color: t.gold }]}>+</Text>
                  <ResultsXpValue
                    progress={xpProgress}
                    xpWidth={Math.max(48, String(finalXp).length * 19 + 16)}
                    color={t.gold}
                    accessibilityLabel={`${finalXp} XP`}
                    compact
                  />
                </View>
              </Animated.View> : null}
              {hasRunes ? <Animated.View
                style={[
                  styles.pulseRewardCard,
                  orbitMode ? styles.orbitRewardCard : null,
                  { backgroundColor: t.bgCard },
                  hasRunes ? runesRevealStyle : null,
                ]}
              >
                <Text style={[styles.pulseRewardLabel, { color: t.textMuted }]}>{runesLabel}</Text>
                <View style={styles.pulseRewardValueRow}>
                  <Image
                    source={HOME_RUNE_ICON_SOURCE}
                    style={styles.pulseRuneAsset}
                    contentFit="contain"
                    accessible={false}
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <ResultsXpValue
                    progress={runesProgress}
                    xpWidth={Math.max(48, String(runesValue).length * 19 + 16)}
                    color={t.gold}
                    accessibilityLabel={runesAccessibilityLabel ?? `${runesValue} ${runesLabel}`}
                    compact
                  />
                </View>
              </Animated.View> : null}
            </View> : null}
            {summaryMetrics.length > 0 ? (
              <Animated.View
                pointerEvents={detailsReady ? 'auto' : 'none'}
                accessibilityElementsHidden={!detailsReady}
                importantForAccessibility={detailsReady ? 'auto' : 'no-hide-descendants'}
                style={[styles.pulseMetrics, orbitMode ? styles.orbitMetrics : null, orbitMode ? [styles.orbitDetails, orbitDetailsStyle] : null, { backgroundColor: t.bgCard }]}
              >
                {summaryMetrics.map((metric, index) => (
                  <View key={`${metric.label}-${index}`} style={styles.pulseMetric}>
                    <Text style={[styles.pulseMetricValue, { color: t.textPrimary }]}>{metric.value}</Text>
                    <Text style={[styles.pulseMetricLabel, { color: t.textMuted }]}>{metric.label}</Text>
                  </View>
                ))}
              </Animated.View>
            ) : null}
          </View>

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
              <RewardPill backgroundColor={t.bgSurface} immediate={effectiveReducedMotion}>
                <Text style={[styles.rewardText, { color: t.textPrimary }]}>🎁 {activeGiftLabel}</Text>
              </RewardPill>
            ) : null}
            {multiplierRewards.slice(0, visibleMultiplierCount).map((multiplier, index) => (
              <RewardPill key={`${multiplier.label}-${index}`} backgroundColor={t.bgSurface} immediate={effectiveReducedMotion}>
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
      ) : (
      <Pressable style={styles.center} onPress={skipToEnd} accessibilityRole="button" accessibilityLabel={skipAnimationA11yLabel}>
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
              source={HOME_RUNE_ICON_SOURCE}
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
            <RewardPill backgroundColor={t.bgSurface} immediate={effectiveReducedMotion}>
              <Text style={[styles.rewardText, { color: t.textPrimary }]}>🎁 {activeGiftLabel}</Text>
            </RewardPill>
          ) : null}
          {multiplierRewards.slice(0, visibleMultiplierCount).map((multiplier, index) => (
            <RewardPill key={`${multiplier.label}-${index}`} backgroundColor={t.bgSurface} immediate={effectiveReducedMotion}>
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
      )}

      {feedbackSlot ? (
        <Animated.View
          pointerEvents={detailsReady ? 'auto' : 'none'}
          accessibilityElementsHidden={!detailsReady}
          importantForAccessibility={detailsReady ? 'auto' : 'no-hide-descendants'}
          style={[
            styles.feedbackSlot,
            orbitMode ? styles.orbitFeedbackSlot : null,
            orbitMode ? [styles.orbitDetails, orbitDetailsStyle] : null,
          ]}
        >
          {feedbackSlot}
        </Animated.View>
      ) : null}

      <Animated.View
        pointerEvents={ctaReady ? 'auto' : 'none'}
        accessibilityElementsHidden={!ctaReady}
        importantForAccessibility={ctaReady ? 'auto' : 'no-hide-descendants'}
        style={[styles.ctaWrap, orbitMode ? styles.orbitCtaWrap : null, ctaStyle]}
      >
        <TouchableOpacity
          testID={ctaPrimaryTestID}
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
            {secondaryShowsEnergyCost ? <EnergyCostBadge activity="arena_match" testID="results-secondary-energy-cost" /> : null}
          </TouchableOpacity>
        ) : null}
        {onCtaTertiary && ctaTertiaryLabel ? (
          <TouchableOpacity
            testID={ctaTertiaryTestID}
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
  pulseRoot: { paddingTop: 8, paddingBottom: 34, paddingHorizontal: 20 },
  orbitRoot: { flex: 1, paddingTop: 2, paddingBottom: 10, paddingHorizontal: 16 },
  center: { width: '100%', maxWidth: 584, flexGrow: 1, flexShrink: 0, alignItems: 'center', justifyContent: 'center' },
  pulseCenter: { justifyContent: 'flex-start' },
  orbitCenter: { flexGrow: 0, flexShrink: 1 },
  pulseHero: {
    width: '100%',
    overflow: 'hidden',
    alignItems: 'center',
    borderRadius: 34,
    paddingHorizontal: 15,
    paddingTop: 18,
    paddingBottom: 23,
  },
  orbitHero: { borderRadius: 28, paddingTop: 9, paddingBottom: 11, paddingHorizontal: 12 },
  pulseGlow: {
    position: 'absolute',
    top: -110,
    width: 310,
    height: 240,
    borderRadius: 155,
    opacity: 0.09,
  },
  orbitRings: {
    position: 'absolute',
    top: 5,
    left: 0,
    right: 0,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbitRing: { position: 'absolute', borderWidth: 1 },
  orbitRingWide: { width: 190, height: 68, borderRadius: 95, transform: [{ rotate: '-9deg' }] },
  orbitRingTall: { width: 78, height: 112, borderRadius: 56, transform: [{ rotate: '31deg' }] },
  pulseBadgeSlot: { width: '100%', minHeight: 112, alignItems: 'center', justifyContent: 'center' },
  orbitBadgeSlot: { minHeight: 84 },
  pulseStarsRow: { marginTop: 15, marginBottom: 12 },
  orbitStarsRow: { marginTop: 3, marginBottom: 2, gap: 6 },
  pulseEyebrow: { fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 1.35, textAlign: 'center', marginBottom: 8 },
  orbitEyebrow: { fontSize: 9, lineHeight: 12, marginBottom: 3 },
  pulseTitle: { fontSize: 31, lineHeight: 36, letterSpacing: -0.7 },
  orbitTitle: { fontSize: 25, lineHeight: 29 },
  pulseSubtitle: { fontSize: 14, lineHeight: 20, marginTop: 7, maxWidth: 310 },
  orbitSubtitle: { fontSize: 12, lineHeight: 16, marginTop: 2, maxWidth: 340 },
  pulseLedger: { width: '100%', borderRadius: 29, padding: 10, marginTop: 12 },
  orbitLedger: { borderRadius: 24, padding: 7, marginTop: 7 },
  pulseRewardGrid: { flexDirection: 'row', gap: 10 },
  pulseRewardCard: { flex: 1, minHeight: 91, borderRadius: 22, padding: 15, justifyContent: 'space-between' },
  orbitRewardCard: { minHeight: 63, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  pulseRewardLabel: { fontSize: 10, lineHeight: 13, fontWeight: '900', letterSpacing: 1.1 },
  pulseRewardValueRow: { minHeight: 39, flexDirection: 'row', alignItems: 'center' },
  pulseRewardPlus: { fontSize: 20, lineHeight: 28, fontWeight: '900' },
  pulseRewardValue: { minWidth: 48, height: 39, padding: 0, fontSize: 30, lineHeight: 36, fontWeight: '900', textAlign: 'center' },
  pulseRuneAsset: { width: 31, height: 31, marginRight: 3 },
  pulseMetrics: { flexDirection: 'row', borderRadius: 20, minHeight: 68, marginTop: 10, paddingHorizontal: 6, paddingVertical: 11 },
  orbitMetrics: { borderRadius: 17, minHeight: 48, marginTop: 6, paddingVertical: 5 },
  orbitDetails: { width: '100%' },
  pulseMetric: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  pulseMetricValue: { fontSize: 17, lineHeight: 22, fontWeight: '900', fontVariant: ['tabular-nums'] },
  pulseMetricLabel: { fontSize: 9, lineHeight: 12, fontWeight: '700', textAlign: 'center', marginTop: 2 },
  badgeSlot: { width: '100%', marginBottom: 20 },
  starsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  star: { fontSize: 44, fontWeight: '900' },
  orbitStar: { fontSize: 34, lineHeight: 38 },
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
  orbitFeedbackSlot: { marginTop: 7, marginBottom: 7 },
  ctaWrap: { width: '100%', flexShrink: 0, gap: 10 },
  orbitCtaWrap: { gap: 0 },
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
