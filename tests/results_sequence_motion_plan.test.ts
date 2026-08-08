import {
  getResultsSequenceAudioPlan,
  getResultsSequenceMotionPlan,
} from '../components/feedback/results_sequence_motion_plan';
import { SoundArbiter } from '../modules/audio/sound_arbiter';
import type { SoundClock } from '../modules/audio/sound_clock';
import { SOUND_EVENTS, type SoundEventId } from '../modules/audio/sound_events';

class FakeClock implements SoundClock {
  nowMs = 0;
  now = () => this.nowMs;
}

type CompletionEventId = Extract<SoundEventId, `pm.complete.${string}`>;

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

  test('keeps the first star clear of medal audio and finishes after factual rewards', () => {
    const plan = getResultsSequenceAudioPlan({ activeGift: true, multiplier: true });
    const activeGiftUnlockAtMs = plan.activeGiftUnlockAtMs;
    const multiplierUpgradeAtMs = plan.multiplierUpgradeAtMs;

    expect(plan.medalSoundAtMs).toBeNull();
    expect(plan.starSoundAtMs[0]).toBeGreaterThanOrEqual(500);
    expect(plan.starSoundAtMs).toEqual([500, 940, 1500]);
    expect(plan.xpTickAtMs).toEqual([2950]);
    expect(plan.xpCompleteAtMs - plan.xpStartAtMs).toBe(1650);
    expect(plan.xpCompleteAtMs).toBeGreaterThan(plan.xpTickAtMs[0]);
    expect(activeGiftUnlockAtMs).toBeDefined();
    expect(multiplierUpgradeAtMs).toBeDefined();
    if (activeGiftUnlockAtMs === undefined || multiplierUpgradeAtMs === undefined) throw new Error('reward sound timing missing');
    expect(activeGiftUnlockAtMs).toBeGreaterThan(plan.xpCompleteAtMs);
    expect(activeGiftUnlockAtMs).toBeGreaterThanOrEqual(plan.xpCompleteAtMs + 1000);
    expect(multiplierUpgradeAtMs).toBeGreaterThanOrEqual(activeGiftUnlockAtMs + 1300);
    expect(plan.finaleAtMs).toBeGreaterThanOrEqual(multiplierUpgradeAtMs + 1500);

    for (const startAtMs of plan.startAtMs) {
      expect(plan.startAtMs.filter((candidate) => candidate >= startAtMs && candidate < startAtMs + 1000).length).toBeLessThanOrEqual(2);
    }
  });

  test('schedules each multiplier sound sequentially before the finale', () => {
    const plan = getResultsSequenceAudioPlan({ activeGift: false, multiplierCount: 3 });

    expect(plan.multiplierUpgradeAtMsList).toEqual([5050, 6650, 8250]);
    expect(plan.finaleAtMs).toBeGreaterThanOrEqual(9850);
    for (const startAtMs of plan.startAtMs) {
      expect(plan.startAtMs.filter((candidate) => candidate >= startAtMs && candidate < startAtMs + 1000).length).toBeLessThanOrEqual(2);
    }
  });

  test('places a presentation-only spin between base XP and factual reward reveals', () => {
    const plan = getResultsSequenceAudioPlan({
      activeGift: true,
      spinReward: true,
      multiplierCount: 1,
    });

    expect(plan.spinRewardAtMs).toBeGreaterThan(plan.xpCompleteAtMs);
    expect(plan.activeGiftUnlockAtMs).toBeGreaterThan((plan.spinRewardAtMs ?? 0) + 2700);
    expect(plan.multiplierUpgradeAtMs).toBeGreaterThan(plan.activeGiftUnlockAtMs ?? 0);
  });

  test('never preempts or drops a completion sound in the full reward sequence', () => {
    const plan = getResultsSequenceAudioPlan({ activeGift: true, multiplierCount: 3 });
    const clock = new FakeClock();
    const arbiter = new SoundArbiter(clock);
    const events = [
      ...plan.starSoundAtMs.map((at, index) => ({
        at,
        eventId: index === 0
          ? 'pm.complete.star_1'
          : index === 1
            ? 'pm.complete.star_2'
            : 'pm.complete.star_3_perfect',
      })),
      { at: plan.xpStartAtMs, eventId: 'pm.complete.xp_counter_start' },
      ...plan.xpTickAtMs.map((at) => ({ at, eventId: 'pm.complete.xp_counter_tick' })),
      { at: plan.xpCompleteAtMs, eventId: 'pm.complete.xp_counter_complete' },
      ...(plan.activeGiftUnlockAtMs === undefined
        ? []
        : [{ at: plan.activeGiftUnlockAtMs, eventId: 'pm.complete.active_gift_unlock' }]),
      ...plan.multiplierUpgradeAtMsList.map((at) => ({
        at,
        eventId: 'pm.complete.multiplier_upgrade',
      })),
      { at: plan.finaleAtMs, eventId: 'pm.complete.rewards_finale' },
    ] as { at: number; eventId: CompletionEventId }[];
    events.sort((a, b) => a.at - b.at);

    for (const event of events) {
      clock.nowMs = event.at;
      expect(arbiter.request(event.eventId)).toMatchObject({
        kind: 'play',
        eventId: event.eventId,
        preempt: false,
      });
    }
  });

  test('keeps the full-length XP tick metadata in sync with its generated WAV', () => {
    expect(SOUND_EVENTS['pm.complete.xp_counter_tick'].durationMs).toBe(1000);
  });

  test('keeps spin-only finale after the plaque presentation and its reward sound', () => {
    const plan = getResultsSequenceAudioPlan({ activeGift: false, spinReward: true });

    expect(plan.spinRewardAtMs).toBeDefined();
    expect(plan.finaleAtMs).toBeGreaterThanOrEqual((plan.spinRewardAtMs ?? 0) + 2700);
  });

  test('plays every spin-only sequence sound without an arbiter collision', () => {
    const plan = getResultsSequenceAudioPlan({ activeGift: false, spinReward: true });
    const clock = new FakeClock();
    const arbiter = new SoundArbiter(clock);
    const events = [
      { at: plan.starSoundAtMs[0], eventId: 'pm.complete.star_1' },
      { at: plan.starSoundAtMs[1], eventId: 'pm.complete.star_2' },
      { at: plan.starSoundAtMs[2], eventId: 'pm.complete.star_3_perfect' },
      { at: plan.xpStartAtMs, eventId: 'pm.complete.xp_counter_start' },
      { at: plan.xpTickAtMs[0], eventId: 'pm.complete.xp_counter_tick' },
      { at: plan.xpCompleteAtMs, eventId: 'pm.complete.xp_counter_complete' },
      { at: plan.spinRewardAtMs ?? 0, eventId: 'pm.reward.small' },
      { at: plan.finaleAtMs, eventId: 'pm.complete.rewards_finale' },
    ] as { at: number; eventId: SoundEventId }[];
    events.sort((a, b) => a.at - b.at);

    for (const event of events) {
      clock.nowMs = event.at;
      expect(arbiter.request(event.eventId)).toMatchObject({
        kind: 'play',
        eventId: event.eventId,
        preempt: false,
      });
    }
  });
});
