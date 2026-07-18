import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function executableLegacyAdminSource(source: string): string {
  return source
    // Retired selectors may remain as inert styling until the legacy stylesheet is split.
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    // The locale dictionary is inert metadata; only live DOM and handlers are feature surfaces.
    .replace(
      /var translations = \{[\s\S]*?\n\s*\};\s*\n\s*function resolveLocale/,
      'var translations = {};\n    function resolveLocale',
    );
}

function listFiles(relativeRoot: string): string[] {
  const absoluteRoot = path.join(ROOT, relativeRoot);
  if (!fs.existsSync(absoluteRoot)) return [];

  const files: string[] = [];
  const visit = (absolutePath: string): void => {
    for (const entry of fs.readdirSync(absolutePath, { withFileTypes: true })) {
      const child = path.join(absolutePath, entry.name);
      if (entry.isDirectory()) visit(child);
      else files.push(path.relative(ROOT, child).replace(/\\/g, '/'));
    }
  };
  visit(absoluteRoot);
  return files;
}

const CLIENT_FEATURE_PATH = /(?:^|[\/_-])(?:arena|quiz(?:zes)?)(?:[\/_\.-]|[A-Z])|use[-_]matchmaking|MatchmakingContext/i;
const SERVER_FEATURE_PATH = /(?:^|[\/_-])(?:arena|quiz_challenge)(?:[\/_\.-]|[A-Z])|(?:^|\/)matchmaking\.|(?:^|\/)game_loop\.|(?:^|\/)explain_quiz\./i;

const LEGACY_COLLECTION_MATCHES = [
  'arena_profiles/{userId}',
  'arena_sessions/{sessionId}',
  'session_players/{docId}',
  'arena_rooms/{roomId}',
  'arena_invites/{inviteId}',
  'arena_session_results/{resultId}',
  'matchmaking_queue/{entryId}',
  'arena_questions/{qId}',
  'arena_question_history/{userId}',
  'arena_question_pool_publications/{publicationId}',
  'arena_ghost_challenges/{challengeId}',
  'arena_hill_thrones/{dayKey}',
  'arena_hill_attempts/{attemptId}',
  'arena_hill_player_wins/{winId}',
  'arena_hill_throne_rewards/{dayKey}',
  'arena_season_leaderboard/{seasonId}/entries/{uid}',
  'arena_seasons/{seasonId}',
  'arena_season_claims/{claimId}',
  'arena_season_hall/{seasonId}',
  'arena_club_events/{eventId}',
  'arena_club_contributions/{contributionId}',
  'arena_rooms_live/{roomCode}',
  'arena_room_runs/{runId}',
  'arena_room_members/{memberId}',
  'arena_pulse_events/{eventId}',
] as const;

describe('Quiz and Arena decommission contract', () => {
  test('has no client routes or feature-owned client modules', () => {
    const clientFiles = [
      ...listFiles('app'),
      ...listFiles('components'),
      ...listFiles('hooks'),
      ...listFiles('contexts'),
      ...listFiles('constants'),
    ];

    expect(clientFiles.filter((file) => CLIENT_FEATURE_PATH.test(file))).toEqual([]);
    expect(clientFiles).not.toContain('components/MatchFoundToast.tsx');
    expect(clientFiles).not.toContain('components/matchFoundToastPaths.ts');

    const entrypointSources = [
      'app/_layout.tsx',
      'app/(tabs)/_layout.tsx',
      'app/(tabs)/home.tsx',
      'app/daily_task_navigation.ts',
      'app/feature_gates.ts',
      'app/paywall_copy.ts',
      'app/paywall_personalization.ts',
      'app/product_analytics_screen_registry.ts',
    ].filter((file) => fs.existsSync(path.join(ROOT, file))).map(read).join('\n');

    expect(entrypointSources).not.toMatch(/\/(?:quizzes?(?:_screen)?|arena(?:[_/][a-z0-9_-]+)?)(?:['"?]|\b)/i);
    expect(entrypointSources).not.toMatch(/\b(?:quiz_(?:easy|medium|hard|score|perfect|hard_perfect)|arena_(?:play|win|rank_promoted|plays_wins_combo)|trainer_arena)\b/i);

    const dailyTasksSource = read('app/daily_tasks.ts');
    expect(dailyTasksSource).toContain('RETIRED_QUIZ_ARENA_TASK_TYPES');
    expect(dailyTasksSource).toContain('replaceRetiredQuizArenaTasks(adminTasks)');
    expect(dailyTasksSource).toContain('replaceRetiredQuizArenaTasks(result)');

    const achievementsSource = read('app/achievements.ts');
    expect(achievementsSource).toContain('isRetiredQuizArenaAchievement');
    expect(achievementsSource).toContain('ACHIEVEMENTS_WITH_RETIRED_FEATURES.filter');

    const nativeIntentSource = read('app/+native-intent.tsx');
    expect(nativeIntentSource).toContain("return '/home';");
    expect(nativeIntentSource).not.toContain('return `/arena_join');
  });

  test('keeps Arena and French names only in the fail-closed V2 hash deny-list', () => {
    const capabilities = read('admin/v2/scripts/admin-capabilities.js');
    const runtimeSources = [
      'admin/v2/scripts/admin-core.js',
      'admin/v2/scripts/admin-firebase.js',
      'admin/v2/scripts/content-factory/stage-renderers.js',
      'admin/v2/scripts/content-factory/state.js',
      'admin/v2/scripts/pages/content-generator.js',
    ].map(read).join('\n');

    expect(capabilities).toContain('EXCLUDED_V2_HASH_SEGMENTS');
    for (const segment of ['arena-ranks', 'arena-live', 'arena-bets', 'arena-rooms', 'arena-question-pool', 'arena-generator', 'arena-shadow', 'french-quizzes']) {
      expect(capabilities).toContain(`'${segment}'`);
    }
    expect(runtimeSources).not.toMatch(/(?:french-quizzes|arena-(?:ranks|live|bets|rooms|question-pool|generator|shadow))/i);
    expect(runtimeSources).not.toMatch(/admin(?:List|Publish|Remove|Restore|Update|Get)Arena/i);

    const serverFeatureFiles = listFiles('functions/src').filter(
      (file) => SERVER_FEATURE_PATH.test(file) && file !== 'functions/src/quiz_arena_decommission.ts',
    );
    expect(serverFeatureFiles).toEqual([]);
  });

  test('removes retired admin capabilities, direct writes, and stage renderers', () => {
    const capabilities = read('admin/v2/scripts/admin-capabilities.js');
    const adminRuntime = [
      'admin/v2/scripts/admin-core.js',
      'admin/v2/scripts/admin-firebase.js',
      'admin/v2/scripts/content-factory/stage-renderers.js',
      'admin/v2/scripts/content-factory/state.js',
      'admin/v2/scripts/pages/content-generator.js',
    ].map(read).join('\n');

    expect(capabilities).toContain('EXCLUDED_V2_HASH_SEGMENTS');
    expect(adminRuntime).not.toMatch(/(?:french-quizzes|arena-(?:ranks|live|bets|rooms|question-pool|generator|shadow))/i);
    expect(adminRuntime).not.toMatch(/(?:admin(?:List|Publish|Remove|Restore|Update|Get)Arena|getArenaConvergenceStatus|updateArenaConvergenceConfig)/);
    expect(adminRuntime).not.toMatch(/(?:quiz_(?:topic|questions|question_replacement)|arena_(?:topic|questions|question_replacement))/);
    expect(adminRuntime).toContain("'challenge_topic'");
    expect(adminRuntime).toContain("'challenge_questions'");
    expect(adminRuntime).toContain("'challenge_question_replacement'");
  });

  test('removes retired client preloads, paywall contexts, analytics surfaces, and bundle config', () => {
    const preloadSource = read('app/image_preload.ts');
    expect(preloadSource).not.toMatch(/ARENA_(?:RANK|ACTION)_IMAGES|assets\/images\/arena/i);

    const paywallSources = [
      'app/paywall_copy.ts',
      'app/paywall_trial_offer.ts',
      'app/premium_context.ts',
      'components/PremiumContext.tsx',
      'components/paywall/paywallShared.tsx',
      'components/paywall/PaywallProofCards.tsx',
    ].map(read).join('\n');
    expect(paywallSources).not.toMatch(/^\s*(?:arena|quiz_(?:limit|level|medium|hard))\s*:/m);
    expect(paywallSources).not.toMatch(/(?:Arena|duel|quiz(?:zes)?|квиз|дуэл)/i);

    const analyticsSources = [
      'app/activity_365_analytics.ts',
      'app/product_analytics_screen_registry.ts',
    ].map(read).join('\n');
    expect(analyticsSources).not.toMatch(/(?:arena|quizzes?(?:_screen)?|trainer_arena)/i);

    const overlaySource = read('hooks/use-global-bottom-overlay-offset.ts');
    expect(overlaySource).not.toContain("'/arena'");

    const appJson = read('app.json');
    const appConfig = read('app.config.js');
    const androidManifest = read('android/app/src/main/AndroidManifest.xml');
    expect(appJson).not.toMatch(/assets\/images\/(?:arena|quizzes)/i);
    expect(appJson).not.toMatch(/\/phraseman\/duel/i);
    expect(appConfig).not.toMatch(/assets\/images\/quizzes|QUIZ_THEME/i);
    expect(androidManifest).not.toMatch(/(?:arena|quiz|duel)/i);
  });

  test('removes retired deploy indexes and functions while preserving only explicit compatibility seams', () => {
    const indexes = JSON.parse(read('firestore.indexes.json')) as {
      indexes?: Array<{ collectionGroup?: string }>;
      fieldOverrides?: Array<{
        collectionGroup?: string;
        fieldPath?: string;
        indexes?: Array<{ order?: string; queryScope?: string }>;
      }>;
    };
    const functionsPackage = JSON.parse(read('functions/package.json')) as { scripts?: Record<string, string> };

    expect((indexes.indexes ?? []).filter((entry) => /^(?:arena_|match_history)/i.test(entry.collectionGroup ?? ''))).toEqual([]);
    expect((indexes.fieldOverrides ?? []).filter((entry) => /^(?:arena_|match_history)/i.test(entry.collectionGroup ?? ''))).toEqual([
      {
        collectionGroup: 'match_history',
        fieldPath: 'sessionId',
        indexes: [{ order: 'ASCENDING', queryScope: 'COLLECTION_GROUP' }],
      },
    ]);

    const deploySafe = functionsPackage.scripts?.['deploy:safe'] ?? '';
    [
      'arenaClubWarContribute',
      'arenaHillRecordAttempt',
      'arenaHillGetDailyTop',
      'arenaBotMatchRecord',
      'arenaSeasonGetTop',
      'arenaSeasonClaimReward',
      'arenaRoomCreate',
      'arenaRoomRecordRun',
      'arenaPulsePublish',
      'arenaRoomJoin',
      'arenaRoomLeave',
      'arenaRoomSetReady',
      'arenaRoomKick',
      'arenaRoomClose',
      'arenaGhostCreateChallenge',
      'arenaGhostRecordPlay',
      'explainQuiz',
      'adminListArenaQuestionPool',
      'adminPublishArenaQuestionBatch',
      'adminRemoveArenaPoolQuestion',
      'adminRestoreArenaPoolQuestion',
      'adminUpdateArenaConvergenceConfig',
      'adminGetArenaConvergenceStatus',
      'arenaSeasonRolloverCron',
      'arenaHillDailyRewardCron',
      'onMatchmakingWrite',
      'matchmakingCron',
      'onArenaRoomMatched',
      'onSessionGetReady',
      'onSessionPlayerLobby',
      'onSessionCountdown',
      'onAnswerSubmitted',
      'onArenaSessionFinished',
      'onArenaSessionAborted',
      'onArenaRematchAccepted',
      'questionTimeout',
    ].forEach((functionName) => expect(deploySafe).toContain(`functions:${functionName}`));

    const nativeIntentSource = read('app/+native-intent.tsx');
    expect(nativeIntentSource).toContain('Retired Quiz/Arena links');
    expect(nativeIntentSource).toContain("return '/home';");

    const firebaseConfig = JSON.parse(read('firebase.json')) as {
      hosting?: Array<{ target?: string; redirects?: Array<{ source?: string; destination?: string }> }>;
    };
    const publicHosting = firebaseConfig.hosting?.find((entry) => entry.target === 'knowlywww');
    const duelRedirects = (publicHosting?.redirects ?? []).filter((entry) => entry.source?.includes('duel'));
    expect(duelRedirects).toEqual([
      { source: '/duel', destination: '/download/', type: 302 },
      { source: '/duel/**', destination: '/download/', type: 302 },
      { source: '/phraseman/duel', destination: '/download/', type: 302 },
      { source: '/phraseman/duel/**', destination: '/download/', type: 302 },
    ]);

    expect(fs.existsSync(path.join(ROOT, 'knowly-www/start/index.html'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'knowly-www/assets/start.js'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'knowly-www/start/script.js'))).toBe(false);
  });

  test('removes retired backend reads, response fields, and reward mutations', () => {
    const adminProfile = read('functions/src/admin_user_profile.ts');
    const leaderboardStats = read('functions/src/compute_leaderboard_stats.ts');
    const indexSource = read('functions/src/index.ts');
    const dailyDigest = read('functions/src/admin_daily_digest.ts');
    const leagueChest = read('functions/src/league_chest.ts');
    const budgetDashboard = read('functions/src/openai_budget_dashboard.ts');
    const friendGifts = read('functions/src/friend_gifts.ts');
    const adminGrant = read('functions/src/admin_grant.ts');
    const globalBroadcast = read('functions/src/admin_global_broadcast.ts');

    expect(adminProfile).not.toContain("collection('arena_profiles')");
    expect(adminProfile).not.toMatch(/\barena:\s*(?:directSource|sources\.)/);
    expect(leaderboardStats).not.toContain("collection('arena_profiles')");
    expect(leaderboardStats).not.toContain('arenaXpThresholds');
    expect(indexSource).not.toContain('time/arena');
    expect(dailyDigest).not.toContain("byMs('arena_rooms_live'");
    expect(dailyDigest).not.toContain('arenaRooms');
    expect(leagueChest).not.toContain("collection('arena_club_events')");
    expect(leagueChest).not.toContain('arenaBonus');
    expect(leagueChest).not.toContain("'arena_plays'");
    expect(budgetDashboard).not.toContain("collection: 'quiz_explain_billing'");
    expect(friendGifts).not.toContain("'arena_extra_5'");
    expect(friendGifts).not.toContain('arena_daily_gift_bonus_v1');
    expect(adminGrant).not.toContain("'arena_extra_5'");
    expect(adminGrant).not.toContain('arena_extra_plays_today');
    expect(globalBroadcast).not.toContain("'arena_extra_5'");
  });

  test('retires Quiz and Arena Content Factory stages without removing generic challenges', () => {
    const factoryFiles = [
      'functions/src/admin_content_factory.ts',
      'functions/src/admin_content_factory_read.ts',
      'functions/src/admin_content_stages.ts',
      'functions/src/content_factory/stage_contracts.ts',
      'functions/src/content_factory/stage_capabilities.ts',
      'functions/src/content_factory/stage_runner.ts',
    ];
    const source = factoryFiles.map(read).join('\n');

    expect(source).not.toMatch(/(?:quiz_(?:topic|questions|question_replacement)|arena_(?:topic|questions|question_replacement))/);
    expect(source).not.toMatch(/(?:ArenaConvergence|ArenaQuestion|arena_(?:grounding|artifacts|question_ledger|stage_consumer))/);
    expect(source).toContain("'challenge_topic'");
    expect(source).toContain("'challenge_questions'");
    expect(source).toContain("'challenge_question_replacement'");

    const serverSources = listFiles('functions/src')
      .filter((file) => file.endsWith('.ts'))
      .map(read)
      .join('\n');
    expect(serverSources).not.toMatch(/(?:quiz_challenge_artifacts|quiz_challenge_grounding|arena_artifacts|arena_grounding|arena_question_ledger|arena_stage_consumer_adapter|arena_shadow_convergence|arena_timing_observability)/);
    expect(serverSources).toContain("from './content_factory/question_grounding'");
    expect(serverSources).toContain("from './content_factory/question_artifacts'");

    const legacySurfaceGenerator = [
      'functions/src/content_factory/surface_generation.ts',
      'functions/src/content_factory/generation_provider.ts',
    ].map(read).join('\n');
    expect(legacySurfaceGenerator).not.toMatch(/(?:quiz|arena)/i);

    const releaseSurfaceSources = [
      'functions/src/admin_content_release.ts',
      'functions/src/content_factory/course_release_contract.ts',
      'functions/src/content_factory/generation_plan.ts',
      'functions/src/content_factory/release_surface_delivery.ts',
    ].map(read).join('\n');
    expect(releaseSurfaceSources).not.toMatch(/(?:quiz|arena)/i);
  });

  test('keeps old callable names fail-closed without loading retired implementations', () => {
    const indexSource = read('functions/src/index.ts');
    const disabledSource = read('functions/src/quiz_arena_decommission.ts');

    expect(indexSource).not.toMatch(/(?:from|require\()['"]\.\/(?:arena|matchmaking|game_loop|explain_quiz|admin_arena)/);
    expect(indexSource).toContain("from './quiz_arena_decommission'");
    expect(disabledSource).toContain("throw new HttpsError('failed-precondition', QUIZ_ARENA_DISABLED_MESSAGE)");
    expect(disabledSource).toContain('QUIZ_ARENA_DECOMMISSIONED_EXPORTS');

    [
      'arenaClubWarContribute',
      'arenaHillRecordAttempt',
      'arenaHillGetDailyTop',
      'arenaBotMatchRecord',
      'arenaSeasonGetTop',
      'arenaSeasonClaimReward',
      'arenaRoomCreate',
      'arenaRoomRecordRun',
      'arenaPulsePublish',
      'arenaRoomJoin',
      'arenaRoomLeave',
      'arenaRoomSetReady',
      'arenaRoomKick',
      'arenaRoomClose',
      'arenaGhostCreateChallenge',
      'arenaGhostRecordPlay',
      'explainQuiz',
      'adminListArenaQuestionPool',
      'adminPublishArenaQuestionBatch',
      'adminRemoveArenaPoolQuestion',
      'adminRestoreArenaPoolQuestion',
      'adminUpdateArenaConvergenceConfig',
      'adminGetArenaConvergenceStatus',
    ].forEach((exportName) => {
      expect(disabledSource).toContain(`${exportName}: quizArenaDisabledCallable`);
    });
  });

  test('denies every retired Firestore collection while retaining account deletion cleanup', () => {
    const rules = read('firestore.rules');
    LEGACY_COLLECTION_MATCHES.forEach((matchPath) => {
      const escaped = matchPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(rules).toMatch(new RegExp(`match \/${escaped} \\{\\s*allow read, write: if false;`));
    });
    expect(rules).toMatch(
      /match \/arena_profiles\/\{userId\} \{[\s\S]*?match \/match_history\/\{matchId\} \{\s*allow read, write: if false;/,
    );
    expect(rules).toMatch(/match \/quiz_explanations\/\{quizHash\} \{\s*allow read, write: if false;/);

    const catchAll = rules.match(/match \/\{collection\}\/\{document=\*\*\} \{[\s\S]*?\n    \}/)?.[0] ?? '';
    [
      'arena_profiles',
      'arena_sessions',
      'session_players',
      'arena_rooms',
      'arena_invites',
      'arena_session_results',
      'matchmaking_queue',
      'arena_questions',
      'arena_question_history',
      'arena_question_pool_publications',
      'arena_ghost_challenges',
      'arena_hill_thrones',
      'arena_hill_attempts',
      'arena_hill_player_wins',
      'arena_hill_throne_rewards',
      'arena_season_leaderboard',
      'arena_seasons',
      'arena_season_claims',
      'arena_season_hall',
      'arena_club_events',
      'arena_club_contributions',
      'arena_rooms_live',
      'arena_room_runs',
      'arena_room_members',
      'arena_pulse_events',
      'quiz_explanations',
      'quiz_explain_billing',
    ].forEach((collection) => expect(catchAll).toContain(`collection != '${collection}'`));

    const accountDeleteSource = read('functions/src/account_delete.ts');
    expect(accountDeleteSource).toContain("collection: 'arena_sessions'");
    expect(accountDeleteSource).toContain("collection: 'matchmaking_queue'");
    expect(accountDeleteSource).toContain("collection: 'arena_hill_throne_rewards'");
    expect(accountDeleteSource).toContain("collection: 'arena_hill_thrones', field: 'previousChampionUid'");
    expect(accountDeleteSource).toContain("collection: 'arena_hill_player_wins'");
    expect(accountDeleteSource).toContain("collection: 'arena_season_claims'");
    expect(accountDeleteSource).toContain("'arena_question_history'");
    expect(accountDeleteSource).toContain("'arena_season_leaderboard'");
    expect(accountDeleteSource).toContain('deleteArenaSeasonEntries');
    expect(accountDeleteSource).toContain('deleteArenaSessionsAndMatchHistory');
    expect(accountDeleteSource).toContain('removeFromArenaClubEvents');
  });

  test('does not actively sync retired profile, task, achievement, or navigation state', () => {
    const cloudSyncSource = read('app/cloud_sync.ts');
    expect(cloudSyncSource).not.toContain('ensureArenaAuthUid');
    expect(cloudSyncSource).not.toMatch(/collection\(['"]arena_profiles['"]\)[\s\S]{0,300}\.set\(/);
    expect(cloudSyncSource).not.toContain('quizNavLevelKey');
    expect(cloudSyncSource).not.toContain("'achievement_arena_win_count'");
    expect(cloudSyncSource).not.toContain("'achievement_quiz_total_count'");
    expect(cloudSyncSource).not.toContain("'arena_daily_gift_bonus_v1'");
    expect(cloudSyncSource).not.toContain("'shards_arena_wins_total'");
    expect(cloudSyncSource).not.toContain("'lifetime_quiz_easy_v1'");
  });

  test('does not query or expose retired Quiz and Arena lifetime statistics', () => {
    const dailyBreakdownSource = read('app/stats_daily_breakdown.ts');
    expect(dailyBreakdownSource).not.toContain("from '@react-native-firebase/firestore'");
    expect(dailyBreakdownSource).not.toContain('ensureArenaAuthUid');
    expect(dailyBreakdownSource).not.toContain("collection('arena_profiles')");
    expect(dailyBreakdownSource).not.toContain("collection('match_history')");

    const lifetimeSource = read('app/lifetime_profile_stats.ts');
    expect(lifetimeSource).not.toContain("from '@react-native-firebase/firestore'");
    expect(lifetimeSource).not.toContain('ensureArenaAuthUid');
    expect(lifetimeSource).not.toContain("collection('arena_profiles')");
    expect(lifetimeSource).not.toMatch(/\b(?:quizzesTotal|arenaWins|arenaLosses)\b/);

    const statsScreenSource = read('app/streak_stats.tsx');
    expect(statsScreenSource).not.toMatch(
      /\b(?:quizzes_completed|arena_wins|arena_losses|quizzesTotal|arenaWins|arenaLosses)\b/,
    );
    expect(statsScreenSource).not.toMatch(/(?:Викторин пройдено|Побед на Арене|Поражений на Арене)/);

    const publicProfileSource = read('app/public_profile_snapshot.ts');
    expect(publicProfileSource).not.toMatch(/\b(?:cardArenaWins|cardArenaMatches)\b/);
    expect(publicProfileSource).not.toContain('ensureArenaAuthUid');
    expect(publicProfileSource).not.toContain("collection('arena_profiles')");

    const playerProfileSource = read('components/PlayerProfileModal.tsx');
    expect(playerProfileSource).not.toMatch(
      /\b(?:arenaWins|arenaMatches|cardArenaWins|cardArenaMatches|duelRank|seasonBadge)\b/,
    );
    expect(playerProfileSource).not.toContain("collection('arena_profiles')");
    expect(playerProfileSource).not.toMatch(/арена: победы|arena: victorias|arena: vitórias/i);

    const clientInsightsSource = read('app/stats_insights_client.ts');
    expect(clientInsightsSource).not.toMatch(/\b(?:quizzes|arenaWins)\b/);

    const serverInsightsSource = read('functions/src/stats_insights.ts');
    expect(serverInsightsSource).not.toMatch(/\b(?:quizzes|arenaWins)\b/);
  });
});
