import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

describe('Super Sunday live earn source wiring', () => {
  it('covers every gameplay award boundary without multiplying practice twice on the server', () => {
    const learningComposite = read(
      'modules/learning-v2/progress/learning_session_rune_reward_composite_v1.ts',
    );
    const learningServer = read(
      'functions/src/learning_v2/required_session_performance_award.ts',
    );
    const spin = read('app/level_spin_star_grants.ts');
    const mistake = read(
      'modules/learning-v2/progress/mistake_correction_wallet_composite.ts',
    );
    const practiceClient = read('app/practice_rune_settlement.ts');
    const practiceServer = read('functions/src/practice_rune_grant.ts');
    const learningPlayer = read('app/learning_v2_direct_session_player_v1.tsx');
    const levelGift = read('app/level_gift_system.ts');
    const dailyJourney = read('app/daily_journey_gift_activation.ts');
    const quests = read('app/quests_client.ts');
    const reportCompensation = read('app/report_reward_bundle.ts');

    expect(learningComposite).toContain(
      'applySuperSundayRuneMultiplier(candidate.totalRunes, candidate.earnedAtMs)',
    );
    expect(learningServer).toContain(
      'applySuperSundayRuneMultiplier(baseAwardedSubunits, awardedAtMs)',
    );
    expect(spin).toContain(
      'applySuperSundayRuneMultiplier(baseAmount, createdAtMs)',
    );
    expect(mistake).toContain(
      'applySuperSundayRuneMultiplier(1, candidate.earnedAtMs)',
    );
    expect(practiceClient).toContain(
      'applySuperSundayRuneMultiplier(input.earnings.pendingRunes, createdAtMs)',
    );
    expect(practiceServer).not.toContain('applySuperSundayRuneMultiplier');
    expect(learningPlayer).toContain(
      'runeRewardEarnedAtMsRef.current',
    );
    expect(learningPlayer).toContain(
      'runSummary?.targetLanguage === "en"',
    );
    for (const gameplayGateway of [levelGift, dailyJourney, quests]) {
      expect(gameplayGateway).toContain("promotionEligibility: 'gameplay'");
    }
    expect(reportCompensation).toContain(
      "promotionEligibility: 'excluded_compensation'",
    );
  });

  it('finalizes every server-owned Arena and Friends rune award before receipts', () => {
    const arena = read('functions/src/arena_v2.ts');
    const expansion = read('functions/src/arena_expansion.ts');
    const friends = read('functions/src/friends_together.ts');

    expect(arena).toContain('applySuperSundayRuneMultiplier(baseStarsEarned, now)');
    expect(arena).toContain('applySuperSundayRuneMultiplier(baseMasteryWalletAward, now)');
    expect(expansion).toContain('applySuperSundayRuneMultiplier(baseTodayEarned, now)');
    expect(expansion).toContain('applySuperSundayRuneMultiplier(baseMasteryWalletAward, now)');
    expect(expansion).toContain('applySuperSundayRuneMultiplier(award.walletStars, now)');
    expect(friends).toContain('applySuperSundayRuneMultiplier(baseStars, now)');
    expect(friends).toContain('applySuperSundayRuneMultiplier(baseStarsAwarded, now)');

    expect(arena).toContain('delta: starsEarned');
    expect(arena).toContain('delta: masteryWalletAward');
    expect(arena).toContain('masteryStarsEarned: masteryWalletAward');
    expect(arena).toContain('dailyStarsCredited: dailyStarsBefore + settle.baseStarsEarned');
    expect(arena).toContain('+ settle.baseMasteryWalletAward');

    expect(expansion).toContain('delta: todayEarned');
    expect(expansion).toContain('delta: masteryWalletAward');
    expect(expansion).toContain('starsEarned: partnerRunesAwarded');
    expect(expansion).toContain('delta: partnerRunesAwarded');
    expect(expansion).toContain('+ baseMasteryWalletAward');

    expect(friends).toContain('delta: stars');
    expect(friends).toContain('delta: starsAwarded');
    expect(friends).toContain('rewards: { drops, stars: starsAwarded }');
  });

  it('doubles video wallet grants without turning video into league earnings', () => {
    const video = read('functions/src/video_watch_runes.ts');
    const videoCounter = read('hooks/use_video_watch_energy_boost.ts');
    const ledger = read('functions/src/stars_ledger.ts');

    expect(video).toContain("from '../../modules/economy/super_sunday_runes'");
    expect(video).toContain('resolveVideoWatchRuneAward(duration.completeMinutes, grantedToday, now)');
    expect(video).toContain('delta: award.walletGranted');
    expect(video).toContain('ruleVersion: 4');
    expect(video).toContain('meta: { requestId, sessionId, observedMinutes: duration.completeMinutes');
    expect(video).toContain('granted: grantedToday + appliedBase');
    expect(videoCounter).toContain("from '../modules/economy/super_sunday_runes'");
    expect(videoCounter).toContain('const runesEarned = applySuperSundayRuneMultiplier(baseRunesEarned, Date.now())');
    expect(ledger).toContain("video_watch: 'grant'");
  });

  it('resolves immutable video replay before checking current Premium access', () => {
    const video = read('functions/src/video_watch_runes.ts');
    const ownershipCheck = video.indexOf('if (!userMatchesAuth(stableUid, data, request.auth!.uid))');
    const priorReceiptRead = video.indexOf("const priorReceiptSnap = action === 'claim'");
    const replayBranch = video.indexOf('if (priorReceiptSnap?.exists)');
    const premiumCheck = video.indexOf('const premiumOk = await resolvePremiumAccess(');

    expect(ownershipCheck).toBeGreaterThan(-1);
    expect(priorReceiptRead).toBeGreaterThan(ownershipCheck);
    expect(replayBranch).toBeGreaterThan(priorReceiptRead);
    expect(replayBranch).toBeLessThan(premiumCheck);
    expect(video.slice(replayBranch, premiumCheck)).toContain("reason: 'already_applied'");
    expect(video.slice(replayBranch, premiumCheck)).toContain("throw new HttpsError('failed-precondition', 'op_conflict')");
  });

  it('derives the whole optimistic pending video batch from the current multiplier', () => {
    const videoCounter = read('hooks/use_video_watch_energy_boost.ts');

    expect(videoCounter).toContain('const [baseUnclaimedMinutes, setBaseUnclaimedMinutes] = useState(0)');
    expect(videoCounter).toContain(
      'const baseRunesEarned = Math.min(\n'
      + '    baseUnclaimedMinutes * VIDEO_WATCH_RUNES_PER_MINUTE,\n'
      + '    Math.max(0, VIDEO_WATCH_RUNES_DAILY_CAP - grantedToday),\n'
      + '  )',
    );
    expect(videoCounter).toContain(
      'const runesEarned = applySuperSundayRuneMultiplier(baseRunesEarned, Date.now())',
    );
    expect(videoCounter).not.toContain('setRunesEarned(');
  });
});
