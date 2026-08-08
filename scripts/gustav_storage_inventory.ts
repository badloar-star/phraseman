import fs from 'node:fs';
import path from 'node:path';

type StorageScope =
  | 'global'
  | 'source_locale'
  | 'study_target'
  | 'source_locale_and_study_target'
  | 'legacy_english'
  | 'dev_only'
  | 'admin_or_qa'
  | 'unknown';

type Operation =
  | 'get'
  | 'set'
  | 'remove'
  | 'multiGet'
  | 'multiSet'
  | 'multiRemove'
  | 'cloudSync'
  | 'constant'
  | 'unknown';

type Risk = 'low' | 'medium' | 'high' | 'blocker';
type Confidence = 'high' | 'medium' | 'low';

type StorageRecord = {
  key?: string;
  keyPattern?: string;
  keyExpression?: string;
  sourcePath: string;
  line: number;
  operation: Operation;
  scope: StorageScope;
  learningState: boolean;
  targetNamespaceRequired: boolean;
  cloudSyncKey: boolean;
  risk: Risk;
  confidence: Confidence;
  notes: string[];
};

type CloudSyncKeys = {
  literals: Set<string>;
  patterns: Set<string>;
};

type KeyCandidate = {
  key?: string;
  keyPattern?: string;
  keyExpression?: string;
  ref?: string;
};

type Inventory = {
  schemaVersion: 'gustav-storage-key-inventory-v1';
  runId: string;
  generatedAt: string;
  status: 'PASS' | 'HOLD' | 'BLOCK';
  inventoryKind: 'automated_heuristic';
  command: {
    argv: string[];
    cwd: string;
    nodeVersion: string;
  };
  summary: {
    filesScanned: number;
    records: number;
    uniqueKeys: number;
    keyPatterns: number;
    unknownExpressions: number;
    cloudSyncKeys: number;
    learningStateRecords: number;
    targetNamespaceRequired: number;
    blockers: number;
    highRisks: number;
    unknownScopeRecords: number;
  };
  records: StorageRecord[];
  unknowns: string[];
  notes: string[];
};

const SCAN_ROOTS = ['app', 'components', 'constants', 'hooks', 'scripts', 'tests'];
const EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const EXCLUDED_PARTS = new Set(['node_modules', '.git', 'ios', 'android']);
const STRING_ARGUMENT_LITERALS = new Set([
  'en',
  'fr',
  'ru',
  'uk',
  'A1',
  'A2',
  'B1',
  'B2',
  'best_pct',
  'cellIndex',
  'false',
  'passed',
  'pct',
  'phraseOrder',
  'true',
]);
const TARGET_STORAGE_HELPERS = new Set([
  'activeRecallItemsKey',
  'achievementLessonMarathonDayKey',
  'achievementStateKey',
  'achievementLessonPerfectPassesKey',
  'comboAchievementCounterKey',
  'customFlashcardsKey',
  'dailyTaskLessonVisitedKey',

  'dailyTasksProgressKey',
  'dailyTasksRerollKey',
  'dailyPhraseKey',
  'dailyPhraseAchievementReadCountKey',
  'dailyPhraseAchievementSaveCountKey',
  'dailyTasksAchievementAllDoneStreakKey',
  'dailyTasksAchievementNoRerollStreakKey',
  'shareAchievementCounterKey',
  'dailyPhraseLastDateKey',
  'dailyPhraseRemoteCacheKey',
  'diagnosticLastKey',
  'diagnosticOpenFlagKey',
  'fiftyFiftyUsageKey',
  'flashcardsAchievementFlipCountKey',
  'flashcardsAchievementSavedCountKey',
  'flashcardsAchievementSourceSetKey',
  'flashcardsAchievementViewStreakKey',
  'flashcardsCommunityOwnedPacksKey',
  'flashcardsDeleteHintSeenKey',
  'flashcardsHiddenCommunityPacksKey',
  'flashcardsMarketDevActivePackKey',
  'flashcardsMarketDevOwnedPacksKey',
  'flashcardsMarketplaceBuiltCardsCacheKey',
  'flashcardsOpenedPacksKey',
  'flashcardsOwnedPacksKey',
  'flashcardsPackTrialGiftKey',
  'flashcardsProgressKey',
  'flashcardsSavedKey',
  'flashcardsSwipeMemoryKey',
  'flashcardsSwipeSessionDraftKey',
  'grammarHintSeenKey',
  'irregularVerbsGlobalKey',
  'lastOpenedLessonKey',
  'lessonBestScoreKey',
  'lessonBonusHintsKey',
  'lessonBonusGrantedKey',
  'lessonIntroShownKey',
  'lessonCycleEndIntroShownKey',
  'lessonIrregularShardsGrantedKey',
  'lessonPassCountKey',
  'lessonPerfectMilestoneKey',
  'lessonPrepositionProgressKey',
  'lessonProgressKey',
  'lessonSessionKey',
  'lessonTheoryXpClaimedKey',
  'lessonTopicShardGrantedKey',
  'lessonUnlockRepairKey',
  'lessonWordsKey',
  'lessonWordsShardsGrantedKey',
  'levelExamKey',
  'lingmanCertificateKey',
  'lingmanExamAvailableKey',
  'masteryFinishedOnceKey',
  'masteryReplayCountKey',
  'mistakeLogKey',
  'posMasteryKey',
  'premiumCourseLevelKey',
  'prepositionDrillPerfectKey',
  'quizAchievementCounterKey',
  'quizNavLevelKey',
  'quizPerfectLevelsTodayKey',
  'quizPerfectStreakKey',
  'statsDailyBreakdownKey',
  'targetKey',
  'activeRecallAchievementCorrectCountKey',
  'trainerAchievementCorrectCountKey',
  'trainerAchievementCorrectStreakKey',
  'trainerAchievementPerfectSessionCountKey',
  'trainerStoreKey',
  'trainerFreeSessionKey',
  'trainerSessionEntryKey',
  'unlockedLessonsKey',
  'userStatsKey',
]);
const SOURCE_TARGET_STORAGE_HELPERS = new Set([
  'communityPackCreateDraftKey',
  'personalPracticeFreeAccessKey',
  'personalPracticeTrainingProgressKey',
  'resolvedPersonalTrainingsKey',
]);
const STORAGE_HELPER_NAMES = new Set([...TARGET_STORAGE_HELPERS, ...SOURCE_TARGET_STORAGE_HELPERS]);
const REVIEWED_ALLOWLIST_SPREAD_REFS = new Set([
  'FRENCH_TARGET_SYNC_KEYS',
  'LESSON_RESTORE_MERGE_KEYS',
  'SYNC_KEYS',
  'restorableKeys',
]);
const REVIEWED_GLOBAL_DYNAMIC_STORAGE_SOURCES = [
  /^app\/arena_leaderboard/,
  /^app\/arena_rating/,
  /^app\/app_health\.ts$/,
  /^app\/app_messages\.ts$/,
  /^app\/avatar_select\.tsx$/,
  /^app\/debug-logger\.ts$/,
  /^app\/firestore_leaderboard\.ts$/,
  /^app\/global_broadcast_modal\.ts$/,
  /^app\/hall_of_fame_utils\.ts$/,
  /^app\/level_gift_inventory\.ts$/,
  /^app\/level_gift_system\.ts$/,
  /^app\/lifetime_profile_stats\.ts$/,
  /^app\/notifications\.ts$/,
  /^app\/paywall_personalization\.ts$/,
  /^app\/platform_ui_preview\.ts$/,
  /^app\/premium_celebration_state\.ts$/,
  /^app\/premium_trial_eligibility\.ts$/,
  /^app\/rank_change\.ts$/,
  /^app\/referral_bootstrap\.ts$/,
  /^app\/release_wave_bonus\.ts$/,
  /^app\/review_utils\.ts$/,
  /^app\/stable_id\.ts$/,
  /^app\/services\/league_chest_rewards\.ts$/,
  /^app\/shards_system\.ts$/,
  /^components\/ThemeContext\.tsx$/,
] as const;
const REVIEWED_GLOBAL_LITERAL_KEYS = new Set([
  'activity_365_goal_v1',
  'activity_365_goal_key',
  'anon_id',
  'app_content_schema_version',
  'app_font_size',
  'app_language',
  'app_last_recorded_native_build_id_v1',
  'analytics_queue',
  'app_activity_queue_v1',
  'app_message_local_preview_states_v1',
  'app_messages_local_preview_v1',
  'app_messages_cache_v1',
  'app_session_count',
  'app_theme',
  'app_version',
  'arena_bot_match_pending_v1',
  'arena_daily_limit_v1',
  'arena_game_entry_v1',
  'arena_my_rank_snapshot_v1',
  'arena_rating_screen_cache_v1',
  'arena_rating_screen_cache_key',
  'arena_top100_manual_cooldown_until_v1',
  'arena_top100_remote_at_v1',
  'arena_top100_snapshot_v8',
  'ban_status_cached_at_v1',
  'ban_status_cached_v1',
  'chain_shield',
  'cloud_created_at_synced_v1',
  'cloud_last_sync_snapshot_v1',
  'cloud_migration_v1',
  'comeback_active',
  'comeback_pending',
  'daily_analytics_synced_v1',
  'daily_reminder_notif_id',
  'daily_treasure_state',
  'debug_log_',
  'device_platform',
  'd1_personalized_reminder_notif_id',
  'from_welcome_first_lesson',
  'global_lb_cache',
  'global_lb_cache_v4',
  'group_boosts_cache',
  'hard_tip_dismissed',
  'hard_paywall_blocks_v1',
  'home_daily_greeting_v1',
  'install_date',
  'last_active_date',
  'last_error_report_ts',
  'lifetime_best_hall_rank_v1',
  'leaderboard',
  'leaderboard_cache_v1',
  'leaderboard_stats_cache_v1',
  'leaderboard_stats_cache_v2',
  'monthly_recap_notif_id',
  'monthly_recap_scheduled',
  'notification_settings',
  'notification_hour',
  'notification_minute',
  'notifications_enabled',
  'notif_settings_v2',
  'notif_permission_nudge_last_day',
  'pending_referral_code',
  'per_day_notif_ids',
  'phraseman.identity.stable_id',
  'phraseman_foreground_daily_ms_v1',
  'phraseman_foreground_usage_ms_v1',
  'phraseman_stable_uid',
  'phraseman_stable_uid_cache',
  'phrase_notif_scheduled',
  'phrase_of_day_notif_id',
  'platform_ui_preview_mode',
  'quiz_daily_free_limit_v1',
  'referral_apply_success_code',
  'review_burn_hint_shown_v1',
  'review_prompted_at',
  'review_show_count',
  'pending_level_up_queue',
  'phraseman_home_stats_pulse_hint_done_v1',
  'stats_preload_cache_v2',
  'study_target_v1',
  'trial_last_consumed_at',
  'trial_migrate_all_show_7d_v1',
  'trial_used',
  'week_days_done',
  'week_days_week_key',
  'week_leaderboard',
  'week_board_meta',
  'week_points',
  'week_points_migrated_v1',
  'week_points_v2',
  'week_xp_peak_best_v1',
  'weekly_recap_notif_id',
  'weekly_recap_scheduled',
  'weekly_xp',
  'weekly_xp_period_start',
  'weekly_pb_v1',
  'xp_migration_v2',
  'xp_formula_v2_migrated',
  'claimed_level_gifts',
  'unclaimed_level_gifts',
  'unclaimed_level_gifts_dual_v1',
  'unlocked_frames',
]);
const REVIEWED_GLOBAL_KEY_PATTERNS = [
  /^achievement_(?!lesson_)/,
  /^achievements_/,
  /^release_notes_dismissed_/,
] as const;

// ---------------------------------------------------------------------------
// Post-2026-05-24 storage families (Gustav FR-inventory decision table).
//
// New keys/families that landed after the last review baseline are triaged by
// the standing product rule:
//   * Learning progress / learning state (plan/lesson/phrase/vocab/review/SRS/
//     mistakes/learning-streak/collectibles-of-idioms) => target-sensitive.
//     For French these get their own namespace; English keeps the legacy flat
//     key through scopedOrLegacyKey (see app/target_storage_keys.ts), so the
//     record is scoped (study_target / legacy_english) with
//     targetNamespaceRequired:false once the routing is reviewed.
//   * Monetization / UI-UX / onboarding / paywalls / notifications / analytics /
//     energy / themes / interface settings => global (locale-independent).
//   * Ambiguous learning => target-sensitive (fail-safe: never let French read
//     English progress). Ambiguous non-learning => global only when it is clearly
//     product/payment mechanics.
// Every family below carries a one-line rationale in REVIEWED_FAMILY_DECISIONS.
// ---------------------------------------------------------------------------

// Reviewed target-sensitive LEARNING-STATE literal keys (per-target progress).
// Scoped as study_target with targetNamespaceRequired:false because French gets
// its own namespace via the target-aware helpers while English stays legacy.
const REVIEWED_TARGET_SENSITIVE_LITERAL_KEYS = new Set([
  // Personal learning plan — progress/state of the generated study plan.
  'personal_plan_state_v1',
  'personal_plan_progress_v1',
  'personal_plan_completed_tasks_v1',
  'personal_plan_task_progress_v1',
  'personal_plan_counted_phrases_v1',
  'personal_plan_xp_ledger_v1',
  'personal_plan_attempt_events_v1',
  'personal_plan_recovery_applied_actions_v1',
  'personal_plan_pending_activation_v1',
  'plan_day_shard_rewards_v1',
  // Server-progress event pipeline — carries per-target learning progress.
  'progress_server_event_queue_v1',
  'progress_server_snapshot_migrated_v1',
  // Collectibles = collection of learned idiom cards (learning progress).
  'collectibles_owned_v1',
  'collectibles_state_v1',
  'collectibles_seen_local_v1',
  // AI-dialog learning progress (completed scenarios).
  'dialogs_completed_ids_v1',
  // Daily-phrase quest learning progress (answered phrase / earned quest XP).
  'daily_phrase_quest_answered_v1',
  'daily_phrase_quest_xp_awarded_v1',
]);

// Reviewed target-sensitive LEARNING-STATE key patterns (per-target progress).
const REVIEWED_TARGET_SENSITIVE_KEY_PATTERNS = [
  // Level-exam shard latch already embeds the study target inside the key.
  /^level_exam_quiz_shard_\$\{\.\.\.\}_\$\{\.\.\.\}$/,
  /^level_exam_quiz_shard_[a-z]{2}_/,
  // Per-scenario AI-dialog XP marker (learning progress).
  /^dialog_xp_awarded_/,
] as const;

// Reviewed target-sensitive LEARNING sources whose dynamic key expressions all
// resolve to per-target learning buckets (helpers take studyTarget or the file
// only stores lesson/theory/quest/review/SRS progress).
const REVIEWED_TARGET_SENSITIVE_DYNAMIC_STORAGE_SOURCES = [
  /^app\/irregular_verbs_srs\.ts$/,
  /^app\/stats_insights_client\.ts$/,
  /^app\/weekly_review_client\.ts$/,
  /^app\/progress_events_client\.ts$/,
  /^app\/daily_phrase_quest\.ts$/,
  /^app\/lesson1\.tsx$/,
  /^app\/lesson_theory_v2\.tsx$/,
  /^app\/hint\.tsx$/,
  /^components\/theory\/TheoryLessonView\.tsx$/,
] as const;

// Reviewed GLOBAL (locale-independent) literal keys that landed after the last
// baseline: monetization, paywalls, onboarding, notifications, analytics,
// referral, remote config and infrastructure caches.
const REVIEWED_GLOBAL_LITERAL_KEYS_POST_BASELINE = new Set([
  // Monetization / paywall / trial / entitlement / win-back / upsell.
  'after_win_upsell_last_shown_v1',
  'paywall_ab_config_cache_v1',
  'paywall_exit_trial_offer_seen_v1',
  'paywall_urgency_shown_at_v1',
  'paywall_urgency_expired_at_v1',
  'paywall_variant',
  'winback_last_active_at_v1',
  'winback_shown_at_v1',
  'entitlement_trial_ending_shown',
  'billing_issue_toast_last_shown',
  'billing_issue_toast_last_issue_at',
  'intro_full_access_started_at_v1',
  'intro_full_access_ends_at_v1',
  'intro_full_access_ended_seen_v1',
  'intro_full_access_welcome_seen_v1',
  'trial_end_reminder_id_v1',
  'notification_intro_expiring_id',
  // Free-usage limit counters (monetization gates, not learning progress).
  'dialogs_free_lifetime_count_v3',
  'dialogs_free_lifetime_used_v2',
  // Daily free-quota counter {date,count} for AI mistake-explain (paywall gate,
  // not learning content) — reclassified out of the generic 'mistake' learning
  // heuristic because it stores only a usage tally.
  'ai_mistake_explain_session_v1',
  // Energy / boon / reward mechanics (product-global).
  'boon_activated_shown_v1',
  'boon_comeback_granted_v1',
  'boon_mystery_monday_claimed_v1',
  'boon_perfect_week_claimed_v1',
  'pending_shard_grants_v1',
  // Referral / clipboard / invites (account-level product mechanics).
  'pending_referral_source',
  'referral_access_ended_seen_for_v1',
  'referral_access_last_until_ms_v1',
  'referral_clipboard_attempts_v1',
  'referral_clipboard_checked_v1',
  'referrals_invites_cache_v1',
  // Onboarding / UI-UX latches, tips, titles, campaigns.
  'home_feature_tips_index_v1',
  'home_feature_tips_done_v1',
  'home_feature_tips_replay_count_v1',
  'home_selected_title_key_v1',
  'lesson_menu_prep_hint_seen_v1',
  'lesson_cycle_end_intro_shown',
  'campaign_dismissals_v1',
  'consent_reverify_done_v1',
  'analytics_consent_v1',
  // Compass UX latches / social feed dedupe (interface state).
  'compass_account_link_reminder_seen_v1',
  'compass_welcome_met_v1',
  'compass_social_seen_signatures_v1',
  'global_compass_social_last_poll',
  'helpful_error_reports_confirmed_v1',
  // Notifications / push scheduling / immediacy markers.
  'notification_immediate_last_at',
  'notification_upsell_d4_scheduled_at',
  'notification_upsell_d7_scheduled_at',
  'notification_upsell_d14_scheduled_at',
  'expo_push_token_last_written',
  // App-message preview / background refresh bookkeeping.
  'app_messages_last_background_refresh_ms_v1',
  'app_message_received_anim_ids_v1',
  // Arena season / hill caches (leaderboard product, not learning).
  'arena_hill_daily_top_cache_v1',
  'arena_season_last_seen_v1',
  // Remote config / flags / A-B group caches (infra, locale-independent).
  'remote_config_cache_v1',
  'trainer_sessions_ab_group_v1',
  // Multi-language registry — which languages the account has started (global
  // registry spanning all targets, not per-target progress).
  'study_languages_started_v1',
  // XP account-level migration marker (XP is account-global, cf. xp_* keys).
  'xp_level_restore_250_to_400_v1',
  // Debug / infra / account backup / diagnostics caches.
  'debug_logs_v1',
  'account_switch_emergency_backup_latest_v1',
  'lingman_youtube_last_seen_video_id_v2',
  'lingman_youtube_last_successful_snapshot_v2',
  'cinema_asset_variant',
]);

// Reviewed GLOBAL key-prefix patterns for post-baseline families whose members
// share a stable prefix (covers _KEY constants and runtime literals alike).
const REVIEWED_GLOBAL_KEY_PATTERNS_POST_BASELINE = [
  /^paywall_urgency_/,
  /^intro_full_access_/,
  /^boon_/,
  /^winback_/,
  /^notification_upsell_/,
  /^home_feature_tips_/,
  /^referral_clipboard_/,
] as const;

// Reviewed GLOBAL dynamic-expression sources for post-baseline families whose
// key expressions all resolve to account-global product/monetization buckets.
const REVIEWED_GLOBAL_DYNAMIC_STORAGE_SOURCES_POST_BASELINE = [
  /^app\/_layout\.tsx$/,
  /^app\/arena_battle_pass_store\.ts$/,
  /^app\/boons\//,
  /^app\/compass\//,
  /^app\/intro_full_access\.ts$/,
  /^app\/paywall_progress_mirror\.ts$/,
  /^app\/referral_welcome_state\.ts$/,
  /^app\/winback_offer\.ts$/,
  /^app\/lingman_youtube\.ts$/,
  /^components\/EntitlementExpiredHost\.tsx$/,
  /^components\/TodaysBoonStrip\.tsx$/,
] as const;

// Scanner-noise tokens: regex artifacts that are not real AsyncStorage keys
// (destructuring fragments, array-method locals, punctuation). Treated as
// reviewed global no-ops so they never surface as unknown-scope risks.
const REVIEWED_SCANNER_NOISE_TOKENS = new Set([
  '1',
  '[',
  '...',
  'key',
  'keys',
  'remove',
  'entries',
]);

const STORAGE_WRAPPER_OPS = new Map<string, Operation>([
  ['readStoredCounter', 'get'],
  ['bumpStoredCounter', 'set'],
  ['bumpConsecutiveDayStreak', 'set'],
  ['bumpConsecutiveWeekStreak', 'set'],
  ['bumpMonthlyActivityDays', 'set'],
  ['addStoredSetValue', 'set'],
]);

function argValue(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0) return null;
  return process.argv[index + 1] ?? null;
}

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const parts = fullPath.split(path.sep);
    if (parts.some((part) => EXCLUDED_PARTS.has(part))) continue;
    if (fullPath.includes(`${path.sep}docs${path.sep}gustav${path.sep}runs${path.sep}`)) continue;
    if (fullPath.includes(`${path.sep}docs${path.sep}heisenberg${path.sep}`)) continue;
    if (entry.isDirectory()) {
      walk(fullPath, out);
      continue;
    }
    if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
      out.push(fullPath);
    }
  }
}

function lineNumber(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function uniqueKey(record: StorageRecord): string {
  return [
    record.sourcePath,
    record.line,
    record.operation,
    record.key ?? '',
    record.keyPattern ?? '',
    record.keyExpression ?? '',
  ].join('|');
}

function normalizeTemplate(raw: string): string {
  return raw.replace(/\$\{[^}]+\}/g, '${...}');
}

function resolveTemplateString(raw: string, values: Map<string, string>): string {
  return raw.replace(/\$\{\s*([A-Za-z_$][\w$]*)\s*\}/g, (_match, name: string) => (
    values.get(name) ?? '${...}'
  ));
}

function candidateFromLiteral(quote: string, value: string): KeyCandidate {
  return quote === '`' && value.includes('${')
    ? { keyPattern: normalizeTemplate(value) }
    : { key: value };
}

function extractStringLiterals(text: string): string[] {
  const strings: string[] = [];
  const re = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const quote = match[1];
    const value = match[2] ?? '';
    if (quote === '`' && value.includes('${')) {
      strings.push(normalizeTemplate(value));
    } else if (!value.includes('\n') && value.length > 0) {
      strings.push(value);
    }
  }
  return strings;
}

function extractConstKeys(text: string, constStringValues: Map<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  const re = /(?:const|export const)\s+([A-Z0-9_]*KEY[A-Z0-9_]*)\s*=\s*(['"`])((?:\\.|(?!\2)[\s\S])*?)\2/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const name = match[1];
    const quote = match[2];
    const value = match[3] ?? '';
    map.set(name, quote === '`' ? resolveTemplateString(value, constStringValues) : value);
  }
  return map;
}

function extractConstStringValues(text: string): Map<string, string> {
  const map = new Map<string, string>();
  const arrayJoinRe = /(?:const|let|export const)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*\[([\s\S]*?)\]\s*\.join\(\s*(['"`])((?:\\.|(?!\3)[\s\S])*?)\3\s*\)\s*;?/g;
  let arrayJoin: RegExpExecArray | null;
  while ((arrayJoin = arrayJoinRe.exec(text))) {
    const name = arrayJoin[1];
    const body = arrayJoin[2] ?? '';
    const sep = arrayJoin[4] ?? '';
    const parts = extractStringLiterals(body).filter((part) => !part.includes('${'));
    if (parts.length > 0) map.set(name, parts.join(sep));
  }

  const re = /(?:const|let|export const)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*(['"`])((?:\\.|(?!\2)[\s\S])*?)\2\s*;?/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const name = match[1];
    const quote = match[2];
    const value = match[3] ?? '';
    if (!value.includes('\n') && value.length <= 200) {
      map.set(name, quote === '`' ? resolveTemplateString(value, map) : value);
    }
  }
  return map;
}

function extractSpreadRefs(text: string): string[] {
  const refs: string[] = [];
  const re = /\.\.\.([A-Za-z_$][\w$]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) refs.push(match[1]);
  return refs;
}

function extractKeyCandidatesFromText(text: string): KeyCandidate[] {
  const candidates: KeyCandidate[] = [];
  const re = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const quote = match[1];
    const value = match[2] ?? '';
    if (!value.includes('\n') && value.length > 0 && value.length <= 200) {
      candidates.push(candidateFromLiteral(quote, value));
    } else if (quote === '`' && value.includes('${') && value.length <= 200) {
      candidates.push(candidateFromLiteral(quote, value));
    }
  }
  for (const ref of extractSpreadRefs(text)) {
    candidates.push({ ref });
  }
  candidates.push(...extractStorageHelperCandidatesFromText(text));
  return candidates;
}

function extractStorageHelperCandidatesFromText(text: string): KeyCandidate[] {
  const candidates: KeyCandidate[] = [];
  const helperRe = /\b([A-Za-z_$][\w$]*)\s*\(/g;
  let match: RegExpExecArray | null;
  while ((match = helperRe.exec(text))) {
    const helperName = match[1];
    if (!STORAGE_HELPER_NAMES.has(helperName)) continue;
    candidates.push({ keyExpression: `${helperName}(...)` });
  }
  return candidates;
}

function extractStorageHelperExpressionValues(text: string): Map<string, string> {
  const map = new Map<string, string>();
  const helperAlternation = [...STORAGE_HELPER_NAMES].join('|');
  const re = new RegExp(`(?:const|let)\\s+([A-Za-z_$][\\w$]*)\\s*(?::[^=;]+)?=\\s*(${helperAlternation})\\s*\\([\\s\\S]{0,240}?\\)\\s*;?`, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    map.set(match[1], `${match[2]}(...)`);
  }
  const aliasRe = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*([A-Za-z_$][\w$]*)\s*;?/g;
  let changed = true;
  while (changed) {
    changed = false;
    let alias: RegExpExecArray | null;
    aliasRe.lastIndex = 0;
    while ((alias = aliasRe.exec(text))) {
      const target = alias[1];
      const source = alias[2];
      const expression = map.get(source);
      if (expression && !map.has(target)) {
        map.set(target, expression);
        changed = true;
      }
    }
  }
  return map;
}

function extractArrayKeyCandidates(text: string): Map<string, KeyCandidate[]> {
  const map = new Map<string, KeyCandidate[]>();
  const ensure = (name: string): KeyCandidate[] => {
    const current = map.get(name) ?? [];
    map.set(name, current);
    return current;
  };

  const emptyArrayRe = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*\[\s*\]\s*;?/g;
  let emptyArray: RegExpExecArray | null;
  while ((emptyArray = emptyArrayRe.exec(text))) {
    ensure(emptyArray[1]);
  }

  const arrayLiteralRe = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*\[([\s\S]*?)\]\s*(?:as const)?\s*;?/g;
  let arrayLiteral: RegExpExecArray | null;
  while ((arrayLiteral = arrayLiteralRe.exec(text))) {
    const name = arrayLiteral[1];
    const body = arrayLiteral[2] ?? '';
    const candidates = extractKeyCandidatesFromText(body);
    if (candidates.length > 0) map.set(name, candidates);
    else ensure(name);
  }

  const arrayFromTemplateRe = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*Array\.from\([\s\S]{0,700}?=>\s*`((?:\\.|[^`])*)`[\s\S]{0,250}?\)\s*;?/g;
  let arrayFromTemplate: RegExpExecArray | null;
  while ((arrayFromTemplate = arrayFromTemplateRe.exec(text))) {
    const name = arrayFromTemplate[1];
    const template = arrayFromTemplate[2] ?? '';
    ensure(name).push({ keyPattern: normalizeTemplate(template) });
  }

  const arrayFromHelperRe = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*Array\.from\(([^;\n]*\b[A-Za-z_$][\w$]*Key\s*\([^;\n]*)\)\s*;?/g;
  let arrayFromHelper: RegExpExecArray | null;
  while ((arrayFromHelper = arrayFromHelperRe.exec(text))) {
    const name = arrayFromHelper[1];
    const body = arrayFromHelper[2] ?? '';
    const candidates = extractStorageHelperCandidatesFromText(body);
    if (candidates.length > 0) ensure(name).push(...candidates);
  }

  const helperAssignmentRe = /(?:const|let)\s+([A-Za-z_$][\w$]*)\s*(?::[^=;]+)?=\s*([\s\S]{0,1800}?);/g;
  let helperAssignment: RegExpExecArray | null;
  while ((helperAssignment = helperAssignmentRe.exec(text))) {
    const name = helperAssignment[1];
    const body = helperAssignment[2] ?? '';
    const candidates = extractStorageHelperCandidatesFromText(body);
    if (candidates.length > 0) ensure(name).push(...candidates);
  }

  const pushRe = /([A-Za-z_$][\w$]*)\.push\(([\s\S]*?)\)\s*;?/g;
  let push: RegExpExecArray | null;
  while ((push = pushRe.exec(text))) {
    const name = push[1];
    const body = push[2] ?? '';
    const candidates = extractKeyCandidatesFromText(body);
    if (candidates.length > 0) ensure(name).push(...candidates);
  }

  return map;
}

function resolveArrayCandidates(
  name: string,
  arrays: Map<string, KeyCandidate[]>,
  seen = new Set<string>(),
): KeyCandidate[] {
  if (seen.has(name)) return [];
  seen.add(name);
  const raw = arrays.get(name) ?? [];
  const out: KeyCandidate[] = [];
  for (const candidate of raw) {
    if (candidate.ref) out.push(...resolveArrayCandidates(candidate.ref, arrays, seen));
    else out.push(candidate);
  }
  return out;
}

function resolveIdentifierKeyCandidates(
  text: string,
  constKeys: Map<string, string>,
  constStringValues: Map<string, string>,
  helperExpressionValues: Map<string, string>,
): KeyCandidate[] {
  const out = new Map<string, KeyCandidate>();
  const re = /\b([A-Za-z_$][\w$]*)\b/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const name = match[1];
    if (!/key/i.test(name)) continue;
    const value = constKeys.get(name) ?? constStringValues.get(name);
    const helperExpression = helperExpressionValues.get(name);
    if (!value && !helperExpression) continue;
    const candidate = helperExpression
      ? { keyExpression: helperExpression }
      : (value ?? '').includes('${')
        ? { keyPattern: value ?? '' }
        : { key: value ?? '' };
    if ((candidate.key ?? candidate.keyPattern ?? candidate.keyExpression ?? '').length > 200) continue;
    out.set(candidate.key ?? candidate.keyPattern ?? candidate.keyExpression ?? name, candidate);
  }
  return [...out.values()];
}

function extractCloudSyncKeys(repoRoot: string): CloudSyncKeys {
  const cloudPath = path.join(repoRoot, 'app', 'cloud_sync.ts');
  if (!fs.existsSync(cloudPath)) return { literals: new Set(), patterns: new Set() };
  const text = fs.readFileSync(cloudPath, 'utf8');
  const match = /export const SYNC_KEYS\s*=\s*\[([\s\S]*?)\]\s*as const;/.exec(text);
  if (!match) return { literals: new Set(), patterns: new Set() };
  const literals = new Set<string>();
  const patterns = new Set<string>();
  for (const key of extractStringLiterals(match[1] ?? '')) {
    if (STRING_ARGUMENT_LITERALS.has(key)) continue;
    if (key.includes('${')) patterns.add(key);
    else literals.add(key);
  }
  if (/\blingmanCertificateKey\(\s*(['"`])en\1\s*\)/.test(match[1] ?? '')) {
    literals.add('lingman_certificate_v1');
  }
  if (/\birregularVerbsGlobalKey\(\s*(['"`])en\1\s*\)/.test(match[1] ?? '')) {
    literals.add('irregular_verbs_global');
  }
  return { literals, patterns };
}

function classifyKey(input: {
  key?: string;
  keyPattern?: string;
  keyExpression?: string;
  sourcePath: string;
  operation: Operation;
  cloudSyncKey: boolean;
}): Pick<StorageRecord, 'scope' | 'learningState' | 'targetNamespaceRequired' | 'risk' | 'confidence' | 'notes'> {
  const raw = input.key ?? input.keyPattern ?? input.keyExpression ?? '';
  const key = raw.toLowerCase();
  const sourcePath = input.sourcePath.replace(/\\/g, '/');
  const source = sourcePath.toLowerCase();
  const notes: string[] = [];
  const helperName = input.keyExpression?.match(/\b([A-Za-z_$][\w$]*)\s*\(/)?.[1];

  if (
    source.startsWith('tests/') ||
    source.startsWith('scripts/') ||
    source.includes('/__mocks__/') ||
    source.startsWith('app/_admin') ||
    path.basename(source).includes('admin') ||
    source.includes('/admin') ||
    key.startsWith('tester_') ||
    key.includes('qa') ||
    key.includes('e2e')
  ) {
    return { scope: 'admin_or_qa', learningState: false, targetNamespaceRequired: false, risk: 'low', confidence: 'medium', notes: ['Test/admin/QA storage signal.'] };
  }

  if (key === 'dev_study_target_lang') {
    return { scope: 'dev_only', learningState: false, targetNamespaceRequired: false, risk: 'low', confidence: 'high', notes: ['Dev-only target switch; not production multi-target storage.'] };
  }

  if (
    source === 'app/target_storage_keys.ts' &&
    (
      key === 'flashcards_market_dev_owned_v1' ||
      key === 'flashcards_market_dev_active_pack_v1' ||
      key === '${...}_owned_v1' ||
      key === '${...}_active_pack_v1'
    )
  ) {
    return {
      scope: 'dev_only',
      learningState: false,
      targetNamespaceRequired: false,
      risk: 'low',
      confidence: 'high',
      notes: ['Reviewed flashcards market dev compatibility key; runtime access is routed through target-aware helper functions.'],
    };
  }

  if (key === 'lang' || key === 'app_lang') {
    return { scope: 'source_locale', learningState: false, targetNamespaceRequired: false, risk: 'low', confidence: 'high', notes: ['Source/interface locale key; audited as separate from study target.'] };
  }

  if (STRING_ARGUMENT_LITERALS.has(raw) || STRING_ARGUMENT_LITERALS.has(raw.toLowerCase())) {
    return {
      scope: 'global',
      learningState: false,
      targetNamespaceRequired: false,
      risk: 'low',
      confidence: 'medium',
      notes: ['Reviewed helper argument literal, not an AsyncStorage key.'],
    };
  }

  // Scanner-noise artifacts (destructuring fragments, array-method locals,
  // punctuation captured by the heuristic regex) are reviewed no-ops.
  if (REVIEWED_SCANNER_NOISE_TOKENS.has(key)) {
    return {
      scope: 'global',
      learningState: false,
      targetNamespaceRequired: false,
      risk: 'low',
      confidence: 'medium',
      notes: ['Reviewed scanner-noise token; not a real AsyncStorage key.'],
    };
  }

  // Reviewed post-baseline LEARNING-STATE families => target-sensitive. French
  // gets its own namespace via target-aware helpers; English keeps the legacy
  // flat key through scopedOrLegacyKey, so no fresh namespace work is pending.
  if (
    REVIEWED_TARGET_SENSITIVE_LITERAL_KEYS.has(key) ||
    REVIEWED_TARGET_SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))
  ) {
    return {
      scope: 'study_target',
      learningState: true,
      targetNamespaceRequired: false,
      risk: 'low',
      confidence: 'high',
      notes: ['Reviewed target-sensitive learning-state key; routed through target-aware storage helpers (French namespace / English legacy compatibility).'],
    };
  }

  // Reviewed post-baseline learning sources whose dynamic key expressions all
  // resolve to per-target learning buckets (helpers take studyTarget, or the
  // file only stores lesson/theory/quest/review/SRS progress).
  if (REVIEWED_TARGET_SENSITIVE_DYNAMIC_STORAGE_SOURCES.some((pattern) => pattern.test(sourcePath))) {
    return {
      scope: 'study_target',
      learningState: true,
      targetNamespaceRequired: false,
      risk: 'low',
      confidence: 'high',
      notes: ['Reviewed target-sensitive learning source; dynamic keys resolve to per-target learning buckets via target-aware helpers.'],
    };
  }

  if (
    REVIEWED_GLOBAL_LITERAL_KEYS.has(key) ||
    REVIEWED_GLOBAL_KEY_PATTERNS.some((pattern) => pattern.test(key)) ||
    REVIEWED_GLOBAL_LITERAL_KEYS_POST_BASELINE.has(key) ||
    REVIEWED_GLOBAL_KEY_PATTERNS_POST_BASELINE.some((pattern) => pattern.test(key))
  ) {
    return {
      scope: 'global',
      learningState: false,
      targetNamespaceRequired: false,
      risk: input.cloudSyncKey ? 'medium' : 'low',
      confidence: 'high',
      notes: ['Reviewed account/UI/cache storage key; not a study-target learning bucket.'],
    };
  }

  if (helperName && SOURCE_TARGET_STORAGE_HELPERS.has(helperName)) {
    return {
      scope: 'source_locale_and_study_target',
      learningState: true,
      targetNamespaceRequired: false,
      risk: 'low',
      confidence: 'high',
      notes: [`Storage routed through source+target helper ${helperName}.`],
    };
  }

  if (helperName && TARGET_STORAGE_HELPERS.has(helperName)) {
    return {
      scope: 'study_target',
      learningState: true,
      targetNamespaceRequired: false,
      risk: 'low',
      confidence: 'high',
      notes: [`Storage routed through study-target helper ${helperName}.`],
    };
  }

  if (
    source === 'app/cloud_sync.ts' &&
    input.operation === 'multiSet' &&
    (key === 'flashcards' || key === 'flashcards_v1')
  ) {
    return {
      scope: 'legacy_english',
      learningState: true,
      targetNamespaceRequired: false,
      risk: 'medium',
      confidence: 'high',
      notes: ['Reviewed cloud restore of legacy English flashcards; French flashcards use scoped FRENCH_TARGET_SYNC_KEYS.'],
    };
  }

  if (input.keyExpression) {
    if (source === 'app/cloud_sync.ts' && key === 'dailylessonhelperkeys') {
      return {
        scope: 'study_target',
        learningState: true,
        targetNamespaceRequired: false,
        risk: 'low',
        confidence: 'high',
        notes: ['Reviewed daily lesson helper sync list; entries are built with fiftyFiftyUsageKey/lessonBonusHintsKey for en/fr.'],
      };
    }
    if (key.includes('french_target_sync_keys') || key.includes('restorablekeys')) {
      return {
        scope: 'study_target',
        learningState: true,
        targetNamespaceRequired: false,
        risk: 'low',
        confidence: 'high',
        notes: ['Storage routed through reviewed French target sync allowlist.'],
      };
    }
    if (key.includes('lesson_restore_merge_keys')) {
      return {
        scope: 'study_target',
        learningState: true,
        targetNamespaceRequired: false,
        risk: 'low',
        confidence: 'high',
        notes: ['Storage routed through reviewed lesson restore merge allowlist.'],
      };
    }
    if (key.includes('sync_keys')) {
      return {
        scope: 'global',
        learningState: false,
        targetNamespaceRequired: false,
        risk: 'medium',
        confidence: 'high',
        notes: ['Storage routed through reviewed cloud sync allowlist; per-key scope is audited separately.'],
      };
    }
    if (
      source === 'app/cloud_sync.ts' &&
      (key.includes('getruntimesynckeys') || key.includes('sanitizestoragepairs'))
    ) {
      return {
        scope: 'global',
        learningState: false,
        targetNamespaceRequired: false,
        risk: 'medium',
        confidence: 'high',
        notes: ['Reviewed cloud-sync aggregate helper (runtime sync key builder / storage-pair sanitizer); per-key scope is audited through the SYNC_KEYS allowlist.'],
      };
    }
    if (source === 'app/cloud_sync.ts' && key === 'toremove') {
      return {
        scope: 'global',
        learningState: false,
        targetNamespaceRequired: false,
        risk: 'low',
        confidence: 'high',
        notes: ['Reviewed account wipe set; populated from SYNC_KEYS plus explicit English/French scoped cleanup keys.'],
      };
    }
    if (source === 'app/content_delivery_migration.ts' && key.includes('contentrefreshkeys')) {
      return {
        scope: 'study_target',
        learningState: true,
        targetNamespaceRequired: false,
        risk: 'low',
        confidence: 'high',
        notes: ['Reviewed content refresh allowlist; only English/French scoped lesson intro/session keys are removed.'],
      };
    }
  }

  if (source === 'app/cloud_sync.ts' && key === '${...}:${...}') {
    return {
      scope: 'study_target',
      learningState: true,
      targetNamespaceRequired: false,
      risk: 'low',
      confidence: 'high',
      notes: ['Reviewed dailyLessonHelperKeysForToday restore loop; keys are generated through target-aware helper functions.'],
    };
  }

  if (source === 'app/achievements.ts' && key === '${...}:${...}') {
    return {
      scope: 'global',
      learningState: false,
      targetNamespaceRequired: false,
      risk: 'low',
      confidence: 'high',
      notes: ['Reviewed achievement shardClaimed integrity migration marker; suffixes storage bucket name and does not carry learning progress.'],
    };
  }

  if (
    key.includes('achievement_quiz') ||
    key.includes('achievement_trainer') ||
    key.includes('achievement_active_recall') ||
    key.includes('achievement_flashcards') ||
    key.includes('achievement_daily_phrase') ||
    key.includes('quiz_hard') ||
    key.includes('lifetime_quiz') ||
    key === 'achievements_state' ||
    key === 'daily_stats' ||
    key === 'stats_daily_breakdown_v1' ||
    key === 'user_stats_v1'
  ) {
    notes.push('Shared account-level achievement/statistics state; target lesson evidence is stored separately.');
    return {
      scope: 'global',
      learningState: false,
      targetNamespaceRequired: false,
      risk: input.cloudSyncKey ? 'medium' : 'low',
      confidence: 'high',
      notes,
    };
  }

  if (
    source === 'app/daily_phrase_system.ts' &&
    (
      key === 'daily_phrase_v3' ||
      key === 'last_phrase_date_v3' ||
      key === 'daily_phrase_remote_cache_v1'
    )
  ) {
    return {
      scope: 'legacy_english',
      learningState: true,
      targetNamespaceRequired: false,
      risk: 'medium',
      confidence: 'high',
      notes: [
        'Reviewed legacy English daily phrase storage; French runtime uses daily_phrase_target_gate and scoped key helpers before any future activation.',
      ],
    };
  }

  if (
    source === 'app/trainer_session.ts' &&
    (
      key === 'trainer_free_session_v1' ||
      key === 'trainer_session_entry_v1'
    )
  ) {
    return {
      scope: 'legacy_english',
      learningState: true,
      targetNamespaceRequired: false,
      risk: 'medium',
      confidence: 'high',
      notes: [
        'Reviewed legacy English trainer session key; runtime reads/writes through trainerFreeSessionKey/trainerSessionEntryKey and the French trainer source gate.',
      ],
    };
  }

  if (
    key.includes('trainer_store') ||
    key.includes('active_recall') ||
    key.includes('mistake') ||
    key.includes('diagnostic') ||
    key.includes('fifty_fifty') ||
    key.includes('grammar_hint') ||
    key.includes('irregular_verbs') ||
    key.includes('custom_flashcards') ||
    key.includes('community_owned_pack') ||
    key.includes('flashcards_market_built_cards') ||
    key.includes('flashcards_market_dev_active_pack') ||
    key.includes('flashcards_market_dev_owned') ||
    key.includes('flashcards_opened_packs') ||
    key.includes('flashcards_owned_packs') ||
    key.includes('flashcards_progress') ||
    key.includes('flashcards_swipe') ||
    key.includes('hidden_community_pack') ||
    key.includes('lesson${') ||
    /^lesson\d+_/.test(key) ||
    key.includes('unlocked_lessons') ||
    key.includes('level_exam_') ||
    key.includes('prep_drill') ||
    key.includes('preposition') ||
    key.includes('quiz_nav_level') ||
    key.includes('achievement_lesson_') ||
    key.includes('achievement_quiz') ||
    key.includes('achievement_trainer') ||
    key.includes('achievement_active_recall') ||
    key.includes('achievement_flashcards') ||
    key.includes('achievement_daily_phrase') ||
    key.includes('quiz_hard') ||
    key.includes('lifetime_quiz') ||
    key.includes('exam_certificate') ||
    key.includes('lingman_certificate') ||
    key.includes('lingman_cert_storage_key') ||
    key === 'flashcards' ||
    key === 'flashcards_v1'
  ) {
    const isBlocker = key.includes('trainer_store') || key.includes('lesson') || key.includes('unlocked_lessons');
    notes.push('Target-sensitive learning state; must be reviewed before multi-target integration.');
    if (input.cloudSyncKey) notes.push('This key is cloud-synced and needs cloud merge/restore review.');
    if (input.operation === 'cloudSync') {
      notes.push('Legacy flat cloud key is retained as English compatibility; French uses scoped FRENCH_TARGET_SYNC_KEYS.');
      return {
        scope: 'legacy_english',
        learningState: true,
        targetNamespaceRequired: false,
        risk: 'medium',
        confidence: 'high',
        notes,
      };
    }
    if (
      input.operation === 'constant' &&
      (
        (source === 'app/exam_certificate.ts' && key === 'lingman_certificate_v1') ||
        (source === 'hooks/use-flashcards.ts' && key === 'flashcards_v1')
      )
    ) {
      notes.push('Reviewed legacy English constant; runtime reads/writes through target-aware storage helpers.');
      return {
        scope: 'legacy_english',
        learningState: true,
        targetNamespaceRequired: false,
        risk: 'medium',
        confidence: 'high',
        notes,
      };
    }
    if (input.operation === 'constant') {
      notes.push('Raw learning key constant; usage must still route through target-aware helpers or English compatibility paths.');
      return {
        scope: 'legacy_english',
        learningState: true,
        targetNamespaceRequired: true,
        risk: 'medium',
        confidence: 'medium',
        notes,
      };
    }
    return {
      scope: 'legacy_english',
      learningState: true,
      targetNamespaceRequired: true,
      risk: isBlocker ? 'blocker' : 'high',
      confidence: input.keyExpression ? 'low' : 'medium',
      notes,
    };
  }

  if (
    key.includes('premium') ||
    key.includes('vip') ||
    key.includes('energy') ||
    key.includes('streak') ||
    key.includes('league') ||
    key.includes('user_') ||
    key.includes('avatar') ||
    key.includes('profile') ||
    key.includes('friend') ||
    key.includes('haptics') ||
    key.includes('onboarding') ||
    key.includes('auth_') ||
    key.includes('warning') ||
    key.includes('update') ||
    key.includes('shards') ||
    key.includes('daily_tasks') ||
    key.includes('login_bonus') ||
    key.includes('gift_') ||
    key.includes('club_') ||
    key.includes('wager_')
  ) {
    notes.push('Product/global state by heuristic; verify if task content depends on study target.');
    return {
      scope: 'global',
      learningState: false,
      targetNamespaceRequired: false,
      risk: input.cloudSyncKey ? 'medium' : 'low',
      confidence: 'medium',
      notes,
    };
  }

  if (
    (input.keyExpression || input.keyPattern) &&
    (
      REVIEWED_GLOBAL_DYNAMIC_STORAGE_SOURCES.some((pattern) => pattern.test(source)) ||
      REVIEWED_GLOBAL_DYNAMIC_STORAGE_SOURCES_POST_BASELINE.some((pattern) => pattern.test(sourcePath))
    )
  ) {
    notes.push('Reviewed dynamic account/global storage expression; not a study-target learning bucket.');
    return {
      scope: 'global',
      learningState: false,
      targetNamespaceRequired: false,
      risk: 'low',
      confidence: 'medium',
      notes,
    };
  }

  if (input.keyExpression) {
    return {
      scope: 'unknown',
      learningState: source.startsWith('app/') || source.startsWith('components/') || source.startsWith('hooks/'),
      targetNamespaceRequired: source.startsWith('app/'),
      risk: source.startsWith('app/') ? 'high' : 'medium',
      confidence: 'low',
      notes: ['Dynamic or unresolved key expression.'],
    };
  }

  return {
    scope: 'unknown',
    learningState: false,
    targetNamespaceRequired: false,
    risk: 'medium',
    confidence: 'low',
    notes: ['Unclassified key; LLM official-source review or stronger AST-based validation required.'],
  };
}

function makeRecord(input: {
  key?: string;
  keyPattern?: string;
  keyExpression?: string;
  sourcePath: string;
  line: number;
  operation: Operation;
  cloudSyncKeys: CloudSyncKeys;
}): StorageRecord {
  const cloudSyncKey =
    (!!input.key && input.cloudSyncKeys.literals.has(input.key)) ||
    (!!input.keyPattern && input.cloudSyncKeys.patterns.has(input.keyPattern));
  const classified = classifyKey({ ...input, cloudSyncKey });
  return {
    key: input.key,
    keyPattern: input.keyPattern,
    keyExpression: input.keyExpression,
    sourcePath: input.sourcePath,
    line: input.line,
    operation: input.operation,
    cloudSyncKey,
    ...classified,
  };
}

function operationName(raw: string): Operation {
  if (raw === 'getItem') return 'get';
  if (raw === 'setItem') return 'set';
  if (raw === 'removeItem') return 'remove';
  if (raw === 'multiGet' || raw === 'multiSet' || raw === 'multiRemove') return raw;
  return 'unknown';
}

function extractMultiSetKeys(body: string): string[] {
  const keys: string[] = [];
  const pairRe = /\[\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1\s*,/g;
  let match: RegExpExecArray | null;
  while ((match = pairRe.exec(body))) {
    const quote = match[1];
    const value = match[2] ?? '';
    keys.push(quote === '`' ? normalizeTemplate(value) : value);
  }
  return keys.filter((key) => !STRING_ARGUMENT_LITERALS.has(key));
}

function scanFile(repoRoot: string, filePath: string, cloudSyncKeys: CloudSyncKeys): StorageRecord[] {
  const text = fs.readFileSync(filePath, 'utf8');
  if (!text.includes('AsyncStorage') && !text.includes('SYNC_KEYS') && !text.includes('_KEY')) return [];
  const sourcePath = path.relative(repoRoot, filePath).replace(/\\/g, '/');
  const constStringValues = extractConstStringValues(text);
  const constKeys = extractConstKeys(text, constStringValues);
  const helperExpressionValues = extractStorageHelperExpressionValues(text);
  const arrayCandidates = extractArrayKeyCandidates(text);
  const records: StorageRecord[] = [];

  for (const [name, value] of constKeys) {
    if (!value || value.length > 160) continue;
    records.push(makeRecord({
      key: value.includes('${') ? undefined : value,
      keyPattern: value.includes('${') ? value : undefined,
      sourcePath,
      line: lineNumber(text, text.indexOf(name)),
      operation: 'constant',
      cloudSyncKeys,
    }));
  }

  const directRe = /AsyncStorage\.(getItem|setItem|removeItem)\(\s*([^,\n)]+)/g;
  let direct: RegExpExecArray | null;
  while ((direct = directRe.exec(text))) {
    const op = operationName(direct[1]);
    const arg = (direct[2] ?? '').trim();
    const quote = arg[0];
    let key: string | undefined;
    let keyPattern: string | undefined;
    let keyExpression: string | undefined;
    if ((quote === '"' || quote === "'" || quote === '`') && arg.endsWith(quote)) {
      const value = arg.slice(1, -1);
      if (quote === '`' && value.includes('${')) keyPattern = normalizeTemplate(value);
      else key = value;
    } else if (constKeys.has(arg)) {
      const value = constKeys.get(arg) ?? '';
      if (value.includes('${')) keyPattern = value;
      else key = value;
    } else if (constStringValues.has(arg)) {
      const value = constStringValues.get(arg) ?? '';
      if (value.includes('${')) keyPattern = value;
      else key = value;
    } else if (helperExpressionValues.has(arg)) {
      keyExpression = helperExpressionValues.get(arg);
    } else {
      keyExpression = arg;
    }
    records.push(makeRecord({
      key,
      keyPattern,
      keyExpression,
      sourcePath,
      line: lineNumber(text, direct.index),
      operation: op,
      cloudSyncKeys,
    }));
  }

  const multiRe = /AsyncStorage\.(multiGet|multiSet|multiRemove)\(\s*([\s\S]{0,1200}?)\)/g;
  let multi: RegExpExecArray | null;
  while ((multi = multiRe.exec(text))) {
    const op = operationName(multi[1]);
    const body = multi[2] ?? '';
    const firstToken = body.trim().split(/[\s,\])]/)[0] ?? '';
    const resolvedCandidates = /^[A-Za-z_$][\w$]*$/.test(firstToken)
      ? resolveArrayCandidates(firstToken, arrayCandidates)
      : [];
    const identifierCandidates = resolveIdentifierKeyCandidates(body, constKeys, constStringValues, helperExpressionValues);
    const spreadCandidates = extractSpreadRefs(body)
      .filter((ref) => !REVIEWED_ALLOWLIST_SPREAD_REFS.has(ref))
      .flatMap((ref) => resolveArrayCandidates(ref, arrayCandidates));
    const helperCandidates = extractStorageHelperCandidatesFromText(body);
    const values = (op === 'multiSet' ? extractMultiSetKeys(body) : extractStringLiterals(body))
      .filter((value) => !STRING_ARGUMENT_LITERALS.has(value))
      .filter((value) => value.length <= 160);
    const resolvedOrSpreadCandidates = [...resolvedCandidates, ...spreadCandidates];
    if (resolvedOrSpreadCandidates.length > 0) {
      for (const candidate of resolvedOrSpreadCandidates) {
        records.push(makeRecord({
          key: candidate.key,
          keyPattern: candidate.keyPattern,
          keyExpression: candidate.keyExpression,
          sourcePath,
          line: lineNumber(text, multi.index),
          operation: op,
          cloudSyncKeys,
        }));
      }
      continue;
    }
    if (values.length === 0 && identifierCandidates.length > 0) {
      for (const candidate of identifierCandidates) {
        records.push(makeRecord({
          key: candidate.key,
          keyPattern: candidate.keyPattern,
          keyExpression: candidate.keyExpression,
          sourcePath,
          line: lineNumber(text, multi.index),
          operation: op,
          cloudSyncKeys,
        }));
      }
      continue;
    }
    if (values.length === 0 && helperCandidates.length > 0) {
      for (const candidate of helperCandidates) {
        records.push(makeRecord({
          keyExpression: candidate.keyExpression,
          sourcePath,
          line: lineNumber(text, multi.index),
          operation: op,
          cloudSyncKeys,
        }));
      }
      continue;
    }
    if (values.length === 0) {
      records.push(makeRecord({
        keyExpression: body.split('\n')[0]?.trim() || `${multi[1]}(...)`,
        sourcePath,
        line: lineNumber(text, multi.index),
        operation: op,
        cloudSyncKeys,
      }));
      continue;
    }
    for (const value of values) {
      records.push(makeRecord({
        key: value.includes('${') ? undefined : value,
        keyPattern: value.includes('${') ? value : undefined,
        sourcePath,
        line: lineNumber(text, multi.index),
        operation: op,
        cloudSyncKeys,
      }));
    }
  }

  const wrapperNames = [...STORAGE_WRAPPER_OPS.keys()].join('|');
  const wrapperRe = new RegExp(`\\b(${wrapperNames})\\(\\s*(['"\`])((?:\\\\.|(?!\\2)[\\s\\S])*?)\\2`, 'g');
  let wrapper: RegExpExecArray | null;
  while ((wrapper = wrapperRe.exec(text))) {
    const fn = wrapper[1];
    const quote = wrapper[2];
    const value = wrapper[3] ?? '';
    if (!value || value.length > 200) continue;
    const candidate = candidateFromLiteral(quote, value);
    records.push(makeRecord({
      key: candidate.key,
      keyPattern: candidate.keyPattern,
      sourcePath,
      line: lineNumber(text, wrapper.index),
      operation: STORAGE_WRAPPER_OPS.get(fn) ?? 'unknown',
      cloudSyncKeys,
    }));
  }

  if (sourcePath === 'app/cloud_sync.ts') {
    for (const key of cloudSyncKeys.literals) {
      records.push(makeRecord({
        key,
        sourcePath,
        line: 1,
        operation: 'cloudSync',
        cloudSyncKeys,
      }));
    }
    for (const keyPattern of cloudSyncKeys.patterns) {
      records.push(makeRecord({
        keyPattern,
        sourcePath,
        line: 1,
        operation: 'cloudSync',
        cloudSyncKeys,
      }));
    }
  }

  return records;
}

function renderMarkdown(inventory: Inventory): string {
  const lines = [
    '# GUSTAV Storage Inventory Report',
    '',
    `Run: \`${inventory.runId}\``,
    '',
    `Status: \`${inventory.status}\``,
    '',
    `Generated at: ${inventory.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Files scanned: ${inventory.summary.filesScanned}`,
    `- Records: ${inventory.summary.records}`,
    `- Unique literal keys: ${inventory.summary.uniqueKeys}`,
    `- Key patterns: ${inventory.summary.keyPatterns}`,
    `- Unknown expressions: ${inventory.summary.unknownExpressions}`,
    `- Cloud sync keys observed: ${inventory.summary.cloudSyncKeys}`,
    `- Learning-state records: ${inventory.summary.learningStateRecords}`,
    `- Target namespace required: ${inventory.summary.targetNamespaceRequired}`,
    `- Blockers: ${inventory.summary.blockers}`,
    `- High risks: ${inventory.summary.highRisks}`,
    `- Unknown-scope records: ${inventory.summary.unknownScopeRecords}`,
    '',
    '## Top Risks',
    '',
  ];
  const risky = inventory.records
    .filter((record) => record.risk === 'blocker' || record.risk === 'high')
    .slice(0, 40);
  for (const record of risky) {
    lines.push(`- \`${record.risk}\` ${record.key ?? record.keyPattern ?? record.keyExpression}: ${record.sourcePath}:${record.line} (${record.scope}, ${record.operation})`);
  }
  if (risky.length === 0) lines.push('No high/blocker risks found.');
  lines.push('', '## Unknowns', '');
  for (const unknown of inventory.unknowns) {
    lines.push(`- ${unknown}`);
  }
  lines.push('', '## Notes', '');
  for (const note of inventory.notes) {
    lines.push(`- ${note}`);
  }
  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  const runArg = argValue('--run');
  if (!runArg) {
    console.error('Usage: npx tsx scripts/gustav_storage_inventory.ts --run docs/gustav/runs/<runId>');
    process.exit(2);
  }

  const repoRoot = process.cwd();
  const runDir = path.resolve(repoRoot, runArg);
  const runId = path.basename(runDir);
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    walk(path.join(repoRoot, root), files);
  }

  const cloudSyncKeys = extractCloudSyncKeys(repoRoot);
  const byIdentity = new Map<string, StorageRecord>();
  for (const file of files) {
    for (const record of scanFile(repoRoot, file, cloudSyncKeys)) {
      byIdentity.set(uniqueKey(record), record);
    }
  }

  const records = [...byIdentity.values()].sort((a, b) =>
    a.sourcePath.localeCompare(b.sourcePath) || a.line - b.line || (a.key ?? a.keyPattern ?? a.keyExpression ?? '').localeCompare(b.key ?? b.keyPattern ?? b.keyExpression ?? ''),
  );
  const uniqueLiteralKeys = new Set(records.map((record) => record.key).filter(Boolean));
  const unknowns = [
    ...new Set(
      records
        .filter((record) => record.scope === 'unknown')
        .slice(0, 80)
        .map((record) => `${record.key ?? record.keyPattern ?? record.keyExpression} at ${record.sourcePath}:${record.line}`),
    ),
  ];
  const blockers = records.filter((record) => record.risk === 'blocker').length;
  const highRisks = records.filter((record) => record.risk === 'high').length;
  const unknownScopeRecords = records.filter((record) => record.scope === 'unknown').length;
  const inventory: Inventory = {
    schemaVersion: 'gustav-storage-key-inventory-v1',
    runId,
    generatedAt: new Date().toISOString(),
    status: blockers > 0 || unknownScopeRecords > 0 ? 'HOLD' : 'PASS',
    inventoryKind: 'automated_heuristic',
    command: {
      argv: process.argv,
      cwd: repoRoot,
      nodeVersion: process.version,
    },
    summary: {
      filesScanned: files.length,
      records: records.length,
      uniqueKeys: uniqueLiteralKeys.size,
      keyPatterns: records.filter((record) => !!record.keyPattern).length,
      unknownExpressions: records.filter((record) => !!record.keyExpression).length,
      cloudSyncKeys: cloudSyncKeys.literals.size + cloudSyncKeys.patterns.size,
      learningStateRecords: records.filter((record) => record.learningState).length,
      targetNamespaceRequired: records.filter((record) => record.targetNamespaceRequired).length,
      blockers,
      highRisks,
      unknownScopeRecords,
    },
    records,
    unknowns,
    notes: [
      'This is an automated heuristic inventory, not a final migration plan.',
      'French generation remains blocked while blocker/high-risk learning keys are unresolved.',
      'Dynamic key expressions require LLM official-source review or a stronger AST-based scanner.',
      'The scanner resolves common local arrays, Array.from template keys, simple string variables and selected storage helper wrappers; it is still not a full TypeScript AST evaluator.',
    ],
  };

  const outputPath = path.join(runDir, 'inputs', 'storage_key_inventory.json');
  const reportPath = path.join(runDir, 'audits', 'storage_inventory_report.md');
  fs.writeFileSync(outputPath, `${JSON.stringify(inventory, null, 2)}\n`);
  fs.writeFileSync(reportPath, renderMarkdown(inventory));
  console.log(`GUSTAV storage inventory: ${inventory.status}`);
  console.log(`Records: ${records.length}`);
  console.log(`Report: ${path.relative(repoRoot, reportPath)}`);
}

void main();
