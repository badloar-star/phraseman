import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('lesson results reward SFX', () => {
  test('registers the generated results sounds and routes them through FeedbackKit', () => {
    const events = read('modules/audio/sound_events.ts');
    const feedback = read('app/feedback/feedback_kit.ts');

    expect(events).toContain("'pm.complete.xp_counter_start'");
    expect(events).toContain("'pm.complete.xp_counter_tick'");
    expect(events).toContain("'pm.complete.xp_counter_complete'");
    expect(events).toContain("'pm.complete.rewards_finale'");
    expect(feedback).toContain("soundDirector.request('pm.complete.xp_counter_start'");
    expect(feedback).toContain("soundDirector.request('pm.complete.xp_counter_tick'");
    expect(feedback).toContain("soundDirector.request('pm.complete.xp_counter_complete'");
  });

  test('counts XP smoothly on the UI thread and reveals each reward with its own sound', () => {
    const sequence = read('components/feedback/ResultsSequence.tsx');

    expect(sequence).toContain('const RESULTS_XP_COUNT_DURATION_MS');
    expect(sequence).toContain('useAnimatedProps');
    expect(sequence).toContain('xpProgress.value = withTiming');
    expect(sequence).toContain('setXpVisible(true)');
    expect(sequence).toContain('const xpRevealSV = useSharedValue(0)');
    expect(sequence).toContain('function RewardPill');
    expect(sequence).toContain('setActiveGiftVisible(true)');
    expect(sequence).toContain("fk.resultsReward('activeGiftUnlock', RESULTS_SEQUENCE_SOUND_OPTIONS)");
    expect(sequence).toContain('setVisibleMultiplierCount(index + 1)');
    expect(sequence).toContain("fk.resultsReward('multiplierUpgrade', RESULTS_SEQUENCE_SOUND_OPTIONS)");
    expect(sequence).not.toContain('const [rewardsVisible');
    expect(sequence).not.toContain('setXpDisplay(Math.round');
    expect(sequence).toContain('rewards?: ResultsSequenceRewards');
    expect(sequence).toContain('rewards?.activeGift');
    expect(sequence).toContain('rewards?.multiplier');
    expect(sequence).toContain('if (motionPlan.immediate)');
    expect(sequence).not.toContain("fk.milestone('medal')");
    expect(sequence).not.toContain("fk.milestone('chord')");
    expect(sequence).toContain('fk.successHaptic()');
    expect(sequence).toContain('const REWARD_PILL_SLOT_HEIGHT = 50');
    expect(sequence).toContain('styles.rewardStack');
    expect(sequence).toContain('const rewardStackHeight = rewardSlotCount * REWARD_PILL_SLOT_HEIGHT');
    expect(sequence).toContain('fk.cancelResultsSequenceAudio()');
    expect(sequence).toContain('const finaleSV = useSharedValue(0)');
    expect(sequence).toContain('setFinaleVisible(true)');
    expect(sequence).toContain('fk.resultsFinale(RESULTS_SEQUENCE_SOUND_OPTIONS)');
    expect(sequence).toContain('immediate={reduceMotion}');
    expect(sequence).toContain("const RESULTS_SEQUENCE_SOUND_OPTIONS = { scope: 'results-sequence' } as const");
    expect(sequence).toContain('staticPresentation={spinRewardStatic}');
  });

  test('reveals multiplier deltas cumulatively without changing legacy multiplier XP', () => {
    const sequence = read('components/feedback/ResultsSequence.tsx');

    expect(sequence).toContain('multipliers?: { label: string; xpDelta: number }[]');
    expect(sequence).toContain('const multiplierRewards =');
    expect(sequence).toContain('const finalXp = xp +');
    expect(sequence).toContain('xpProgress.value = withTiming(multiplierXpTotal');
    expect(sequence).toContain('setVisibleMultiplierCount');
    expect(sequence).toContain('getResultsSequenceMultiplierSignature');
  });

  test('keys reward normalization and the main sequence effect by stable primitive content', () => {
    const sequence = read('components/feedback/ResultsSequence.tsx');
    const effectStart = sequence.indexOf('useEffect(() => {', sequence.indexOf('const skipToEnd'));
    const effectEnd = sequence.indexOf('const badgeStyle', effectStart);
    const mainEffect = sequence.slice(effectStart, effectEnd);

    expect(sequence).toContain('const multiplierRewardsSignature = getResultsSequenceMultiplierSignature(');
    expect(sequence).toContain('[multiplierRewardsSignature]');
    expect(mainEffect).not.toMatch(/^\s*rewards,\s*$/m);
    expect(mainEffect).not.toMatch(/^\s*multiplierRewards,\s*$/m);
  });

  test('keeps the native XP counter isolated from reward rerenders and monotonic', () => {
    const sequence = read('components/feedback/ResultsSequence.tsx');

    expect(sequence).toContain('const ResultsXpValue = memo(function ResultsXpValue');
    expect(sequence).not.toContain('defaultValue="0"');
    expect(sequence).toContain('xpProgress.value = withTiming(multiplierXpTotal');
    expect(sequence).toContain('width: xpWidth');
  });
});
