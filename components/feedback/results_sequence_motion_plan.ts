import type { ResultsIntensity } from './ResultsSequence';
import { SOUND_EVENTS } from '../../modules/audio/sound_events';

const COMPLETION_SOUND_GAP_MS = 100;
const completionSoundEndsAt = (startsAtMs: number, eventId: keyof typeof SOUND_EVENTS): number => (
  startsAtMs + SOUND_EVENTS[eventId].durationMs
);

export type ResultsSequenceMotionPlan = {
  immediate: boolean;
  confettiCount: number;
  playMilestones: boolean;
  badgeDelayMs: number;
  starsDelayMs: number;
  xpDelayMs: number;
  ctaDelayMs: number;
};

export type ResultsSequenceAudioPlan = {
  medalSoundAtMs: null;
  starSoundAtMs: readonly number[];
  xpStartAtMs: number;
  xpTickAtMs: readonly [number];
  xpCompleteAtMs: number;
  spinRewardAtMs?: number;
  activeGiftUnlockAtMs?: number;
  multiplierUpgradeAtMs?: number;
  multiplierUpgradeAtMsList: readonly number[];
  finaleAtMs: number;
  startAtMs: readonly number[];
};

export function getResultsSequenceAudioPlan(rewards: {
  activeGift: boolean;
  showStars?: boolean;
  spinReward?: boolean;
  multiplier?: boolean;
  multiplierCount?: number;
}): ResultsSequenceAudioPlan {
  // Every sound begins only after the previous completion sound has finished,
  // plus a short silence. This protects the single-slot SoundArbiter from
  // cutting a cue off while its matching visual is still on screen.
  const showStars = rewards.showStars !== false;
  const starSoundAtMs: readonly number[] = showStars ? [500, 940, 1500] : [];
  const xpStartAtMs = showStars
    ? completionSoundEndsAt(starSoundAtMs[2], 'pm.complete.star_3_perfect') + COMPLETION_SOUND_GAP_MS
    : 500;
  const xpTickAtMs: readonly [number] = [
    completionSoundEndsAt(xpStartAtMs, 'pm.complete.xp_counter_start') + COMPLETION_SOUND_GAP_MS,
  ];
  const xpCompleteAtMs = completionSoundEndsAt(xpTickAtMs[0], 'pm.complete.xp_counter_tick')
    + COMPLETION_SOUND_GAP_MS;
  const afterXpCompleteAtMs = completionSoundEndsAt(
    xpCompleteAtMs,
    'pm.complete.xp_counter_complete',
  ) + COMPLETION_SOUND_GAP_MS;
  const spinRewardAtMs = rewards.spinReward ? afterXpCompleteAtMs : undefined;
  const afterSpinRewardAtMs = spinRewardAtMs === undefined
    ? afterXpCompleteAtMs
    : spinRewardAtMs + 2700 + COMPLETION_SOUND_GAP_MS;
  const activeGiftUnlockAtMs = rewards.activeGift ? afterSpinRewardAtMs : undefined;
  const multiplierCount = Math.max(0, Math.floor(rewards.multiplierCount ?? (rewards.multiplier ? 1 : 0)));
  const multiplierUpgradeAtMs = multiplierCount > 0
    ? activeGiftUnlockAtMs === undefined
      ? afterSpinRewardAtMs
      : completionSoundEndsAt(activeGiftUnlockAtMs, 'pm.complete.active_gift_unlock')
        + COMPLETION_SOUND_GAP_MS
    : undefined;
  const multiplierUpgradeAtMsList = multiplierUpgradeAtMs === undefined
    ? []
    : Array.from(
      { length: multiplierCount },
      (_, index) => multiplierUpgradeAtMs + index * (
        SOUND_EVENTS['pm.complete.multiplier_upgrade'].durationMs + COMPLETION_SOUND_GAP_MS
      ),
    );
  const finalRewardEndsAtMs = Math.max(
    spinRewardAtMs ? spinRewardAtMs + 2700 : 0,
    activeGiftUnlockAtMs
      ? completionSoundEndsAt(activeGiftUnlockAtMs, 'pm.complete.active_gift_unlock')
      : 0,
    multiplierUpgradeAtMsList.length > 0
      ? completionSoundEndsAt(
          multiplierUpgradeAtMsList[multiplierUpgradeAtMsList.length - 1],
          'pm.complete.multiplier_upgrade',
        )
      : 0,
  );
  const finaleAtMs = (finalRewardEndsAtMs || completionSoundEndsAt(
    xpCompleteAtMs,
    'pm.complete.xp_counter_complete',
  )) + COMPLETION_SOUND_GAP_MS;

  return {
    medalSoundAtMs: null,
    starSoundAtMs,
    xpStartAtMs,
    xpTickAtMs,
    xpCompleteAtMs,
    spinRewardAtMs,
    activeGiftUnlockAtMs,
    multiplierUpgradeAtMs,
    multiplierUpgradeAtMsList,
    finaleAtMs,
    startAtMs: [
      ...starSoundAtMs,
      xpStartAtMs,
      ...xpTickAtMs,
      xpCompleteAtMs,
      ...(spinRewardAtMs ? [spinRewardAtMs] : []),
      ...(activeGiftUnlockAtMs ? [activeGiftUnlockAtMs] : []),
      ...multiplierUpgradeAtMsList,
      finaleAtMs,
    ],
  };
}

export function getResultsSequenceMotionPlan(
  intensity: ResultsIntensity,
  reduceMotion: boolean,
): ResultsSequenceMotionPlan {
  if (reduceMotion) {
    return {
      immediate: true,
      confettiCount: 0,
      playMilestones: false,
      badgeDelayMs: 0,
      starsDelayMs: 0,
      xpDelayMs: 0,
      ctaDelayMs: 0,
    };
  }

  return {
    immediate: false,
    confettiCount: intensity === 'major' ? 120 : intensity === 'milestone' ? 72 : 0,
    playMilestones: intensity !== 'quiet',
    badgeDelayMs: 0,
    starsDelayMs: 500,
    xpDelayMs: 1400,
    ctaDelayMs: 2500,
  };
}
