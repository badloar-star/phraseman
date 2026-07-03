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

  // Реферальная система (Фаза 2, односторонний VIP) — теперь штатная: контракт
  // защищает конвейер от случайного выпиливания при cleanup (как было с VIP-кнопкой).
  it('keeps the referral callables wired into exports and the deploy whitelist', () => {
    const indexSource = read('functions/src/index.ts');
    const packageJson = read('functions/package.json');

    for (const name of [
      'referralEnsureMyCode',
      'referralApply',
      'referralClaimVipReward',
      'referralListMyInvites',
    ]) {
      expect(indexSource).toContain(name);
      expect(packageJson).toContain(`functions:${name}`);
    }
  });

  it('keeps referral cost guardrails: no code generation on sign-in, lazy invite link on share, no referral reads in friends sync', () => {
    const authProviderSource = read('app/auth_provider.ts');
    const inviteSource = read('app/settings_invite_friend.tsx');
    const friendsSource = read('app/firestore_friends.ts');

    // Код выдаётся лениво (по «Пригласить»), а не на каждый вход.
    expect(authProviderSource).not.toContain("import('./referral_system')");
    expect(authProviderSource).not.toContain('generateReferralCode');
    // Экран настроек делает cloud invite только по явному нажатию Share, не при render/load.
    expect(inviteSource).toContain('const onSendInvite = useCallback(async () => {');
    expect(inviteSource).toContain('await buildCloudReferralInviteShare');
    expect(inviteSource).not.toContain('isReferralCloudEnabled');
    // Синк друзей не читает реферальные коллекции.
    expect(friendsSource).not.toContain("collection('referral_codes')");
    expect(friendsSource).not.toContain("'referral_code'");
  });

  it('keeps Friends referral and quest cloud reads cached, single-flight, and TTL-gated', () => {
    const friendsScreenSource = read('app/(tabs)/friends.tsx');
    const referralVipSource = read('app/referral_vip.ts');
    const referralCloudSource = read('app/referral_cloud.ts');
    const friendQuestsSource = read('app/friend_quests.ts');
    const serverReferralSource = read('functions/src/referral.ts');
    const serverFriendGiftsSource = read('functions/src/friend_gifts.ts');

    expect(friendsScreenSource).toContain('FRIENDS_REFERRAL_REFRESH_TTL_MS = 15 * 60 * 1000');
    expect(friendsScreenSource).toContain('FRIENDS_QUEST_REFRESH_TTL_MS = 2 * 60 * 1000');
    expect(friendsScreenSource).toContain('referralRefreshInFlightRef');
    expect(friendsScreenSource).toContain('friendQuestRefreshInFlightRef');
    expect(friendsScreenSource).toContain('getClaimableReferralState({ force: options.force })');
    expect(friendsScreenSource).toContain('getActiveFriendQuest({ force: options.force })');
    expect(friendsScreenSource).toContain('referralInvitesKey(prev) === referralInvitesKey(state.invites)');
    expect(friendsScreenSource).toContain('friendQuestKey(prev) === friendQuestKey(next)');

    expect(referralVipSource).toContain('REFERRAL_INVITES_CACHE_TTL_MS = 15 * 60 * 1000');
    expect(referralVipSource).toContain('referralInvitesInFlight');
    expect(referralVipSource).toContain('invalidateClaimableReferralStateCache');
    expect(referralCloudSource).toContain('force: options.force === true');

    expect(friendQuestsSource).toContain('FRIEND_QUEST_STATUS_CACHE_TTL_MS = 60 * 1000');
    expect(friendQuestsSource).toContain('friendQuestStatusInFlight');
    expect(friendQuestsSource).toContain('invalidateActiveFriendQuestCache');
    expect(friendQuestsSource).toContain('force: options.force === true');

    expect(serverReferralSource).toContain('LIST_MY_INVITES_SERVER_CACHE_TTL_MS = 60_000');
    expect(serverReferralSource).toContain('listMyInvitesServerCache');
    expect(serverReferralSource).toContain('const force = request.data?.force === true');

    expect(serverFriendGiftsSource).toContain('FRIEND_GET_ACTIVE_QUEST_SERVER_CACHE_TTL_MS = 30_000');
    expect(serverFriendGiftsSource).toContain('friendGetActiveQuestServerCache');
    expect(serverFriendGiftsSource).toContain('const force = request.data?.force === true');
  });

  it('keeps new web and admin/background cost controls cheap by default', () => {
    const adminPushSource = read('functions/src/admin_push_jobs.ts');
    const helpBoardSource = read('functions/src/help_board.ts');
    const siteStatsSource = read('functions/src/site_stats.ts');
    const webStatsSource = read('knowly-www/assets/stats.js');
    const startSource = read('knowly-www/assets/start.js');
    const thanksSource = read('knowly-www/start/thanks/index.html');

    expect(adminPushSource).toContain("schedule: '*/30 * * * *'");
    expect(adminPushSource).not.toContain("schedule: '*/5 * * * *'");
    expect(helpBoardSource).toContain("schedule: '0 * * * *'");
    expect(siteStatsSource).toContain('const rawEvents = Array.isArray(body.events)');
    expect(webStatsSource).toContain('{ events: initialEvents }');
    expect(startSource).toContain("PRICE_CACHE_KEY = 'pm_web_prices_cache_v1'");
    expect(startSource).toContain('PRICE_CACHE_TTL_MS = 60 * 60 * 1000');
    expect(thanksSource).toContain('var MAX_ATTEMPTS = 12');
    expect(thanksSource).toContain('function nextPollDelayMs()');
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

  it('defers non-critical avatar cosmetics while profile-card Pro purchase syncs immediately', () => {
    const avatarSource = read('app/avatar_select.tsx');
    const profileCardSource = read('app/profile_card_upgrade.tsx');

    expect(avatarSource).toContain('AVATAR_DISPLAY_CLOUD_SYNC_DEFER_MS = 30_000');
    expect(avatarSource).toContain('syncToCloud({ deferMs: AVATAR_DISPLAY_CLOUD_SYNC_DEFER_MS })');
    expect(avatarSource).toContain("cost > 0 ? 'immediate' : 'deferred'");
    expect(avatarSource).toContain("purchasedAura ? 'immediate' : 'deferred'");

    expect(profileCardSource).not.toContain('PROFILE_CARD_DISPLAY_CLOUD_SYNC_DEFER_MS');
    expect(profileCardSource).toContain('syncToCloud({ forceNow: true })');
    expect((profileCardSource.match(/syncProfileCardDisplayToCloud\(\);/g) ?? []).length).toBe(2);
    expect(profileCardSource).not.toContain("syncProfileCardDisplayToCloud('deferred')");
  });

  it('updates percentile stats daily and keeps full-scan friend/premium cron cadence modest', () => {
    const indexSource = read('functions/src/index.ts');
    const friendActivitySource = read('functions/src/friend_activity_mirror.ts');
    const premiumExpirySource = read('functions/src/premium_expiry_cron.ts');
    const friendsFeedSource = read('app/firestore_friend_activity.ts');
    const friendsScreenSource = read('app/(tabs)/friends.tsx');

    expect(indexSource).toContain("schedule: '0 3 * * *'");
    expect(indexSource).toContain('syncFriendActivityMirrorCron');
    expect(friendActivitySource).toContain("schedule: 'every 12 hours'");
    expect(premiumExpirySource).toContain("schedule: 'every 12 hours'");
    expect(friendsFeedSource).toContain('const CACHE_TTL_MS = 6 * 60 * 60 * 1000');
    expect(friendsScreenSource).toContain('useEffect(() => { void load(false); }, [load]);');
  });

  it('does not let native App Check mint placeholder tokens before a real provider is configured', () => {
    const firebaseJson = JSON.parse(read('firebase.json')) as {
      'react-native'?: { app_check_token_auto_refresh?: boolean };
    };
    const appCheckSource = read('app/app_check_init.ts');
    const layoutSource = read('app/_layout.tsx');
    const callableOptionsSource = read('functions/src/callable_options.ts');
    const indexSource = read('functions/src/index.ts');
    const accountDeleteSource = read('functions/src/account_delete.ts');
    const vipRevokeSource = read('functions/src/vip_revoke.ts');
    const premiumDialogSource = read('functions/src/premium_dialog.ts');
    const explainPhraseSource = read('functions/src/explain_phrase.ts');

    expect(firebaseJson['react-native']?.app_check_token_auto_refresh).toBe(false);
    expect(appCheckSource).toContain('APP_CHECK_TOKEN_TIMEOUT_MS = 3500');
    expect(appCheckSource).toContain('EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN');
    expect(appCheckSource).toContain('EXPO_PUBLIC_ENABLE_APP_CHECK_DEBUG');
    expect(appCheckSource).toContain("provider: 'debug'");
    expect(appCheckSource).toContain("provider: 'playIntegrity'");
    expect(appCheckSource).toContain("provider: 'appAttestWithDeviceCheckFallback'");
    expect(appCheckSource).toContain('appCheck().getToken(false)');
    expect(appCheckSource).toContain('appCheck().getToken(true)');
    expect(appCheckSource).toContain('isJwtLikeToken');
    expect(appCheckSource).toContain('isTokenAutoRefreshEnabled: false');
    expect(appCheckSource).toContain('setAppCheckAutoRefreshEnabled(false)');
    expect(appCheckSource).toContain('setAppCheckAutoRefreshEnabled(true)');
    expect(appCheckSource).toContain('appCheckInitPromise = null');

    expect(layoutSource).toContain('const appCheckWarmup = Promise.race([');
    expect(layoutSource).toContain('initFirebaseAppCheckIfAvailable(),');
    expect(layoutSource).toContain('new Promise<void>((resolve) => setTimeout(resolve, 1200))');

    expect(callableOptionsSource).toContain("ENFORCE_APP_CHECK = process.env.ENFORCE_APP_CHECK === 'true'");
    expect(callableOptionsSource).toContain("appCheckGroup('ENFORCE_APP_CHECK_SENSITIVE')");
    expect(callableOptionsSource).toContain("appCheckGroup('ENFORCE_APP_CHECK_OPENAI')");
    expect(callableOptionsSource).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(accountDeleteSource).toContain('ENFORCE_APP_CHECK_SENSITIVE');
    expect(vipRevokeSource).toContain('ENFORCE_APP_CHECK_SENSITIVE');
    expect(premiumDialogSource).toContain('ENFORCE_APP_CHECK_OPENAI');
    expect(explainPhraseSource).toContain('ENFORCE_APP_CHECK_OPENAI');

    expect(indexSource).toContain("req.headers['x-firebase-appcheck']");
    expect(indexSource).toContain('admin.appCheck().verifyToken(appCheckToken)');
  });

  it('keeps second-layer cost guards for low-value reads and callables', () => {
    const dailyPhraseSource = read('app/daily_phrase_system.ts');
    const compassModalSource = read('app/compass/compass_briefing_modal.tsx');
    const arenaHillSource = read('app/services/arena_hill.ts');
    const indexes = read('firestore.indexes.json');

    expect(dailyPhraseSource).toContain("where('scheduledDate', '==', date)");
    expect(dailyPhraseSource).toContain("where('scheduledDate', '==', today)");
    expect(dailyPhraseSource).toContain('REMOTE_DAILY_PHRASE_QUERY_LIMIT = 10');
    expect(dailyPhraseSource).not.toContain('.limit(500)');
    expect(indexes).toContain('"collectionGroup": "daily_phrases"');
    expect(indexes).toContain('"fieldPath": "scheduledDate"');

    expect(compassModalSource).toContain('useCompassVoice(visible && !isDayClosing ? day : null)');

    expect(arenaHillSource).toContain("ARENA_HILL_TOP_CACHE_KEY = 'arena_hill_daily_top_cache_v1'");
    expect(arenaHillSource).toContain('ARENA_HILL_TOP_CACHE_TTL_MS = 30 * 60 * 1000');
    expect(arenaHillSource).toContain('readStoredArenaHillTopCache');
    expect(arenaHillSource).toContain('writeStoredArenaHillTopCache');
  });

  it('keeps hot progress and league callables from repairing identity links on every call', () => {
    const identitySource = read('functions/src/auth_identity.ts');
    const progressSource = read('functions/src/progress_events.ts');
    const leagueSource = read('functions/src/league_groups.ts');

    expect(identitySource).toContain('repairLinks?: boolean');
    expect(identitySource).toContain('options?.repairLinks !== false');
    expect(progressSource).toContain('repairLinks: false');
    expect((leagueSource.match(/repairLinks: false/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });

  it('lets live progress events qualify referrals before removing the broad users trigger', () => {
    const referralSource = read('functions/src/referral.ts');
    const progressSource = read('functions/src/progress_events.ts');

    expect(referralSource).toContain('export async function markRefereeQualified');
    expect(progressSource).toContain("import { markRefereeQualified } from './referral'");
    expect(progressSource).toContain('shouldQualifyReferralFromProgressEvent(event)');
    expect(progressSource).toContain('await markRefereeQualified(db, stableUid)');
  });

  it('retires broad users document triggers from source exports and safe deploys', () => {
    const indexSource = read('functions/src/index.ts');
    const packageJson = read('functions/package.json');

    expect(indexSource).not.toContain('exports.referralOnUserProgressUpdated');
    expect(indexSource).not.toContain("export { vipReconcileOrphanGrant }");
    expect(packageJson).not.toContain('functions:referralOnUserProgressUpdated');
    expect(packageJson).not.toContain('functions:vipReconcileOrphanGrant');
  });

  it('keeps admin VIP writes canonical so the orphan reconcile trigger can be retired', () => {
    // Раньше существовали отдельные admin/legacy/index.html и admin/v2/* —
    // их объединили в один канонический admin/index.html (v2 удалена). Проверяем
    // канонические VIP-записи в нём.
    const adminSource = read('admin/index.html');

    expect(adminSource).toContain('resolveAdminVipWriteTarget');
    expect(adminSource).toContain('identityHidden: data.identityHidden === true');
    expect(adminSource).toContain('canonicalStableId: data.canonicalStableId || null');
    expect(adminSource).toContain('requestedUid: uid');
    expect(adminSource.split("updateDoc(doc(db, 'users', writeUid)").length - 1).toBeGreaterThanOrEqual(3);
  });
});
