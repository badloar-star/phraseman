import type { ResultsIntensity } from './ResultsSequence';

export type ResultsSequenceMotionPlan = {
  immediate: boolean;
  confettiCount: number;
  playMilestones: boolean;
  badgeDelayMs: number;
  starsDelayMs: number;
  xpDelayMs: number;
  ctaDelayMs: number;
};

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
