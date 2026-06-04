import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('Firebase cost controls', () => {
  it('does not export removed stale production handlers from current source or deploy script', () => {
    const indexSource = read('functions/src/index.ts');
    const packageJson = read('functions/package.json');

    for (const name of [
      'communityGetPackRatingSummary',
      'communitySubmitPackRating',
      'leagueChatToggleLike',
    ]) {
      expect(indexSource).not.toContain(name);
      expect(packageJson).not.toContain(`functions:${name}`);
    }
  });

  it('does not run the referral reward scanner on every user document write', () => {
    const indexSource = read('functions/src/index.ts');
    const packageJson = read('functions/package.json');

    expect(indexSource).not.toContain('referralOnUserProgressUpdated');
    expect(packageJson).not.toContain('functions:referralOnUserProgressUpdated');
  });

  it('does not keep removed referral callables wired into the app or deploy list', () => {
    const indexSource = read('functions/src/index.ts');
    const packageJson = read('functions/package.json');
    const authProviderSource = read('app/auth_provider.ts');
    const inviteSource = read('app/settings_invite_friend.tsx');
    const friendsSource = read('app/firestore_friends.ts');
    const friendsScreenSource = read('app/(tabs)/friends.tsx');
    const legacyFriendsScreenSource = read('app/friends_screen.tsx');

    for (const name of ['referralEnsureMyCode', 'referralApply']) {
      expect(indexSource).not.toContain(name);
      expect(packageJson).not.toContain(`functions:${name}`);
    }

    expect(authProviderSource).not.toContain("import('./referral_system')");
    expect(authProviderSource).not.toContain('generateReferralCode');
    expect(inviteSource).not.toContain('buildCloudReferralInviteShare');
    expect(inviteSource).not.toContain('isReferralCloudEnabled');
    expect(friendsSource).not.toContain("collection('referral_codes')");
    expect(friendsSource).not.toContain("'referral_code'");
    expect(friendsScreenSource).not.toContain('captureReferralCodeFromManualInput');
    expect(legacyFriendsScreenSource).not.toContain('captureReferralCodeFromManualInput');
  });

  it('keeps duplicate identity cleanup callable-driven but not scheduled', () => {
    const indexSource = read('functions/src/index.ts');
    const packageJson = read('functions/package.json');

    expect(indexSource).toContain('authEnsureStableLink');
    expect(indexSource).not.toContain('cleanupLegacyIdentityDuplicatesCron');
    expect(packageJson).not.toContain('functions:cleanupLegacyIdentityDuplicatesCron');
  });

  it('does not run the removed hall-of-fame/global leaderboard sync on a schedule', () => {
    const indexSource = read('functions/src/index.ts');
    const packageJson = read('functions/package.json');

    expect(indexSource).not.toContain('syncLeaderboardCron');
    expect(indexSource).not.toContain('syncLeaderboardFromUsers');
    expect(packageJson).not.toContain('functions:syncLeaderboardCron');
  });

  it('does not push XP or premium changes through the removed global leaderboard callables', () => {
    const indexSource = read('functions/src/index.ts');
    const packageJson = read('functions/package.json');
    const xpSource = read('app/xp_manager.ts');
    const avatarSource = read('app/avatar_select.tsx');
    const layoutSource = read('app/_layout.tsx');
    const surveySource = read('app/vip_survey.ts');
    const publicProfileSource = read('app/public_profile_snapshot.ts');

    for (const name of ['leaderboardPushMyScore', 'leaderboardUpdatePremium']) {
      expect(indexSource).not.toContain(name);
      expect(packageJson).not.toContain(`functions:${name}`);
    }

    expect(xpSource).not.toContain('pushMyScore(');
    expect(avatarSource).not.toContain('pushMyScoreImmediate');
    expect(layoutSource).not.toContain('updateMyPremiumInLeaderboard');
    expect(layoutSource).not.toContain('updateMyVipInLeaderboard');
    expect(surveySource).not.toContain('updateMyVipInLeaderboard');
    expect(publicProfileSource).not.toContain('leaderboardPushMyScore');
    expect(publicProfileSource).not.toContain('leaderboardUpdatePremium');
  });

  it('uses a throttled public profile snapshot instead of the old leaderboard write path', () => {
    const xpSource = read('app/xp_manager.ts');
    const avatarSource = read('app/avatar_select.tsx');
    const layoutSource = read('app/_layout.tsx');
    const rulesSource = read('firestore.rules');
    const publicProfileSource = read('app/public_profile_snapshot.ts');

    expect(publicProfileSource).toContain("PUBLIC_PROFILE_SNAPSHOT_CACHE_KEY = 'public_profile_snapshot_v1'");
    expect(publicProfileSource).toContain('PUBLIC_PROFILE_XP_TTL_MS = 24 * 60 * 60 * 1000');
    expect(publicProfileSource).toContain("collection('public_profiles').doc(stableId).set");
    expect(publicProfileSource).toContain("collection('arena_profiles').doc(arenaAuth).set");
    expect(publicProfileSource).toContain('displayHash');
    expect(xpSource).toMatch(/syncPublicProfileSnapshot\(\{[\s\S]*?reason: 'daily_xp'/);
    expect(avatarSource).toMatch(/syncPublicProfileSnapshot\(\{[\s\S]*?reason: 'display_change'/);
    expect(layoutSource).toMatch(/syncPublicProfileSnapshot\(\{[\s\S]*?reason: 'entitlement_change'/);
    expect(rulesSource).toContain('match /public_profiles/{userId}');
    expect(rulesSource).toContain('allow read: if request.auth != null;');
    expect(rulesSource).toContain('allow create, update: if canonicalUserMatchesAuth(userId);');
  });

  it('updates percentile stats daily and friend activity snapshots every six hours', () => {
    const indexSource = read('functions/src/index.ts');
    const friendActivitySource = read('functions/src/friend_activity_mirror.ts');
    const friendsFeedSource = read('app/firestore_friend_activity.ts');
    const friendsScreenSource = read('app/(tabs)/friends.tsx');

    expect(indexSource).toContain("schedule: '0 3 * * *'");
    expect(indexSource).toContain('syncFriendActivityMirrorCron');
    expect(friendActivitySource).toContain("schedule: 'every 6 hours'");
    expect(friendsFeedSource).toContain('const CACHE_TTL_MS = 6 * 60 * 60 * 1000');
    expect(friendsScreenSource).toContain('useEffect(() => { void load(false); }, [load]);');
  });

  it('does not let native App Check mint placeholder tokens before a real provider is configured', () => {
    const firebaseJson = JSON.parse(read('firebase.json')) as {
      'react-native'?: { app_check_token_auto_refresh?: boolean };
    };
    const appCheckSource = read('app/app_check_init.ts');

    expect(firebaseJson['react-native']?.app_check_token_auto_refresh).toBe(false);
    expect(appCheckSource).toContain('setAppCheckAutoRefreshEnabled(false)');
    expect(appCheckSource).toContain('setAppCheckAutoRefreshEnabled(true)');
  });
});
