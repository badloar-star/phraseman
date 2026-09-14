import fs from 'fs';
import path from 'path';

function read(relativePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8');
}

describe('Super Sunday live earn source wiring', () => {
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
    expect(video).toContain('resolveVideoWatchRuneAward(minutes, grantedToday, now)');
    expect(video).toContain('delta: award.walletGranted');
    expect(video).toContain('ruleVersion: 2');
    expect(video).toContain('granted: grantedToday + appliedBase');
    expect(videoCounter).toContain("from '../modules/economy/super_sunday_runes'");
    expect(videoCounter).toContain(
      'applySuperSundayRuneMultiplier(baseUnclaimedMinutes * VIDEO_WATCH_RUNES_PER_MINUTE, Date.now())',
    );
    expect(ledger).toContain("video_watch: 'grant'");
  });

  it('resolves immutable video replay before checking current Premium access', () => {
    const video = read('functions/src/video_watch_runes.ts');
    const ownershipCheck = video.indexOf('if (!userMatchesAuth(stableUid, data, request.auth!.uid))');
    const priorReceiptRead = video.indexOf('const priorReceiptSnap = await tx.get(');
    const replayBranch = video.indexOf('if (priorReceiptSnap.exists)');
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
      'const runesEarned = applySuperSundayRuneMultiplier('
      + 'baseUnclaimedMinutes * VIDEO_WATCH_RUNES_PER_MINUTE, Date.now())',
    );
    expect(videoCounter).not.toContain('setRunesEarned(');
  });
});
