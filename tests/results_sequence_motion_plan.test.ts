import { getResultsSequenceMotionPlan } from '../components/feedback/results_sequence_motion_plan';

describe('results sequence motion plan', () => {
  test('reduced motion exposes the final state immediately without celebration cues', () => {
    expect(getResultsSequenceMotionPlan('major', true)).toEqual({
      immediate: true,
      confettiCount: 0,
      playMilestones: false,
      badgeDelayMs: 0,
      starsDelayMs: 0,
      xpDelayMs: 0,
      ctaDelayMs: 0,
    });
  });

  test.each([
    ['quiet', 0],
    ['milestone', 72],
    ['major', 120],
  ] as const)('%s uses proportional finite celebration', (intensity, confettiCount) => {
    const plan = getResultsSequenceMotionPlan(intensity, false);
    expect(plan.immediate).toBe(false);
    expect(plan.confettiCount).toBe(confettiCount);
    expect(plan.ctaDelayMs).toBeLessThanOrEqual(3000);
  });
});
