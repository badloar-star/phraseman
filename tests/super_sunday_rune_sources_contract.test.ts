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
    // D49: «Дневной путь» удалён целиком — его шлюза больше нет.
    // D140: «Задания» (quests_client) удалены целиком — их шлюза тоже нет.
    // D147: «Супер-воскресенье» снято; подарки уровня больше не начисляют монеты с удвоением.
    expect(levelGift).not.toContain('applySuperSundayRuneMultiplier');
    expect(reportCompensation).toContain(
      "promotionEligibility: 'excluded_compensation'",
    );
  });

  // зачем (01.10): награды «Вместе» монетами сняты вместе с подарками; сторож — что удвоение не вернулось.
  it('Friends together no longer awards doubled runes (D147)', () => {
    // зачем: D78 — серверная Арена (arena_v2.ts/arena_expansion.ts) удалена; её рунные награды больше не начисляются.
    const friends = read('functions/src/friends_together.ts');

    // D147: «Супер-воскресенье» снято — награды «Вместе» без удвоения.
    expect(friends).not.toContain('applySuperSundayRuneMultiplier');

  });

  it('doubles video wallet grants without turning video into league earnings', () => {
    const video = read('functions/src/video_watch_runes.ts');
    const ledger = read('functions/src/stars_ledger.ts');

    expect(video).toContain("from '../../modules/economy/super_sunday_runes'");
    expect(video).toContain('resolveVideoWatchRuneAward(duration.completeMinutes, grantedToday, now)');
    expect(video).toContain('delta: award.walletGranted');
    expect(video).toContain('ruleVersion: 4');
    expect(video).toContain('meta: { requestId, sessionId, observedMinutes: duration.completeMinutes');
    expect(video).toContain('granted: grantedToday + appliedBase');
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

  it('has no client video-watch rune source left (Q9)', () => {
    // зачем: Q9 — видео не источник монет (список D104/D105/D109)
    for (const removed of [
      'hooks/use_video_watch_energy_boost.ts',
      'app/video_watch_runes_client.ts',
      'app/energy_video_watch_credit.ts',
    ]) {
      expect(fs.existsSync(path.resolve(__dirname, '..', removed))).toBe(false);
    }
    const player = read('components/youtube/YoutubeInlinePlayer.tsx');
    expect(player).not.toMatch(/from ['"][^'"]*(use_video_watch_energy_boost|video_watch_runes_client|energy_video_watch_credit)['"]/);
  });
});
