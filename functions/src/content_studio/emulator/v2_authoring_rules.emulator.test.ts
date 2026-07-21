import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  setDoc,
  updateDoc,
  writeBatch,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-phraseman-rules';
const RULES_PATH = path.resolve(__dirname, '../../../../firestore.rules');

const SERVER_ONLY_COLLECTIONS = [
  // Learning V2 authoring state.
  'content_mode_templates',
  'content_mode_template_draft_revisions',
  'content_mode_template_versions',
  'content_mode_template_lifecycle',
  'content_mode_template_lifecycle_audit',
  'content_mode_template_lifecycle_operations',
  'content_season_drafts',
  'content_season_revisions',
  'content_season_lifecycle',
  'content_season_episode_pins',
  'content_episode_drafts',
  'content_episode_revisions',
  'content_episode_lifecycle',
  'content_episode_lifecycle_audit',
  'content_episode_lifecycle_operations',
  'content_studio_review_queue',
  'content_studio_localization_units',
  'content_studio_review_receipts',
  'content_studio_episode_review_operations',
  'content_studio_gate_operations',
  'content_studio_episode_validation_operations',
  'content_studio_episode_localization_operations',
  'content_studio_voice_receipts',
  'content_studio_episode_voice_operations',
  'content_studio_validation_receipts',
  'content_studio_waivers',
  'content_studio_preview_sessions',
  'content_studio_preview_receipts',
  'content_studio_gate_receipts',
  'content_app_support_manifests',
  // Reused server-owned Content Factory projections and ledgers.
  'content_factory_stages',
  'content_factory_correction_events',
  'content_factory_artifact_orphans',
  'content_factory_releases',
  'content_factory_catalog',
  'content_factory_catalog_releases',
  'content_factory_release_history',
  'admin_command_operations',
  // Learning V2 server-owned progress ledgers; clients never write these.
  'learning_v2_progress_operations',
  'learning_v2_progress_attempts',
  // Existing server-owned Content Factory state.
  'content_factory_jobs',
  'content_factory_job_units',
  'content_factory_job_reviews',
  'content_factory_source_registry',
  'content_factory_daily_budget',
  'content_factory_budget_reservations',
] as const;

const DIRECT_OPERATIONS = ['get', 'list', 'create', 'update', 'delete'] as const;

type DirectOperation = (typeof DIRECT_OPERATIONS)[number];

type LegacyOperation =
  | DirectOperation
  | 'set-merge-create'
  | 'set-merge-update'
  | 'batch-set-create'
  | 'batch-set-update'
  | 'collection-group-list'
  | 'transaction-update';

interface LegacyAccessCase {
  readonly label: string;
  readonly operation: LegacyOperation;
  readonly path: string;
  readonly seedPath?: string;
  readonly seedData?: DocumentData;
  readonly writeData?: DocumentData;
}

interface LegacyNamespaceSpec {
  readonly namespace: string;
  readonly documentPath: string;
  readonly operations: readonly DirectOperation[];
  readonly collectionPath?: string;
  readonly listMode?: 'collection' | 'collection-group';
  readonly seedData?: DocumentData;
  readonly writeData?: DocumentData;
}

/**
 * Legacy browser-admin operations that would regress immediately when the global
 * admin catch-all is removed. These are real admin/legacy.html call shapes, not a
 * synthetic all-operations grant.
 */
const CRITICAL_LEGACY_ACCESS_CASES: readonly LegacyAccessCase[] = [
  {
    label: 'admin_digest_runs latest run list',
    operation: 'list',
    path: 'admin_digest_runs',
    seedPath: 'admin_digest_runs/run-1',
  },
  {
    label: 'admin_digests daily fallback get',
    operation: 'get',
    path: 'admin_digests/2026-07-15',
    seedPath: 'admin_digests/2026-07-15',
  },
  {
    label: 'support_inbox latest list',
    operation: 'list',
    path: 'support_inbox',
    seedPath: 'support_inbox/ticket-1',
  },
  {
    label: 'admin_push_jobs list',
    operation: 'list',
    path: 'admin_push_jobs',
    seedPath: 'admin_push_jobs/job-list',
  },
  {
    label: 'admin_push_jobs create',
    operation: 'create',
    path: 'admin_push_jobs/job-create',
  },
  {
    label: 'revenuecat_premium_events list',
    operation: 'list',
    path: 'revenuecat_premium_events',
    seedPath: 'revenuecat_premium_events/event-1',
  },
  {
    label: 'revenuecat_shard_transactions list',
    operation: 'list',
    path: 'revenuecat_shard_transactions',
    seedPath: 'revenuecat_shard_transactions/transaction-1',
  },
  {
    label: 'users_dedup_archive set-merge create',
    operation: 'set-merge-create',
    path: 'users_dedup_archive/source-create',
  },
  {
    label: 'users_dedup_archive set-merge update',
    operation: 'set-merge-update',
    path: 'users_dedup_archive/source-update',
    seedPath: 'users_dedup_archive/source-update',
  },
  {
    label: 'French quiz draft batch-set create',
    operation: 'batch-set-create',
    path: 'adminContentDrafts/fr/quiz/draft-create',
  },
  {
    label: 'French quiz draft batch-set update',
    operation: 'batch-set-update',
    path: 'adminContentDrafts/fr/quiz/draft-update',
    seedPath: 'adminContentDrafts/fr/quiz/draft-update',
  },
  {
    label: 'French quiz rollback batch-set create',
    operation: 'batch-set-create',
    path: 'adminContentRollbacks/fr/quiz/rollback-create',
  },
  {
    label: 'French quiz rollback batch-set update',
    operation: 'batch-set-update',
    path: 'adminContentRollbacks/fr/quiz/rollback-update',
    seedPath: 'adminContentRollbacks/fr/quiz/rollback-update',
  },
  {
    label: 'card_packs unpublished get',
    operation: 'get',
    path: 'card_packs/draft-preview',
    seedPath: 'card_packs/draft-preview',
    seedData: { status: 'draft' },
  },
  {
    label: 'card_packs unfiltered draft list',
    operation: 'list',
    path: 'card_packs',
    seedPath: 'card_packs/draft-list',
    seedData: { status: 'draft' },
  },
  {
    label: 'arena_profiles admin update',
    operation: 'update',
    path: 'arena_profiles/player-update',
    seedPath: 'arena_profiles/player-update',
    writeData: { displayName: 'Updated by admin' },
  },
  {
    label: 'arena_profiles admin delete',
    operation: 'delete',
    path: 'arena_profiles/player-delete',
    seedPath: 'arena_profiles/player-delete',
  },
  {
    label: 'error_reports admin test-report create',
    operation: 'create',
    path: 'error_reports/test-report',
  },
  {
    label: 'referral_attributions admin revoke transaction update',
    operation: 'transaction-update',
    path: 'referral_attributions/referee-1',
    seedPath: 'referral_attributions/referee-1',
    writeData: { status: 'revoked' },
  },
  {
    label: 'arena_sessions admin force-finish update',
    operation: 'update',
    path: 'arena_sessions/session-1',
    seedPath: 'arena_sessions/session-1',
    seedData: { playerIds: ['other-player'], state: 'active' },
    writeData: { state: 'finished' },
  },
  {
    label: 'arena_rooms admin delete',
    operation: 'delete',
    path: 'arena_rooms/room-1',
    seedPath: 'arena_rooms/room-1',
    seedData: { hostId: 'other-player' },
  },
  {
    label: 'matchmaking_queue admin unfiltered list',
    operation: 'list',
    path: 'matchmaking_queue',
    seedPath: 'matchmaking_queue/other-player',
    seedData: { userId: 'other-player' },
  },
  {
    label: 'matchmaking_queue admin delete another player',
    operation: 'delete',
    path: 'matchmaking_queue/other-player-delete',
    seedPath: 'matchmaking_queue/other-player-delete',
    seedData: { userId: 'other-player' },
  },
] as const;

/**
 * Machine-checkable mirror of the direct legacy browser-admin inventory. The
 * operation list is intentionally limited to methods observed in admin files.
 */
const LEGACY_DIRECT_NAMESPACE_SPECS: readonly LegacyNamespaceSpec[] = [
  {
    namespace: 'admin_config',
    documentPath: 'admin_config/matrix-alerts',
    operations: ['get', 'create', 'update'],
  },
  {
    namespace: 'admin_digest_runs',
    documentPath: 'admin_digest_runs/matrix-run',
    operations: ['list'],
  },
  {
    namespace: 'admin_digests',
    documentPath: 'admin_digests/matrix-day',
    operations: ['get'],
  },
  {
    namespace: 'admin_log',
    documentPath: 'admin_log/matrix-entry',
    operations: ['list', 'create'],
  },
  {
    namespace: 'admin_push_jobs',
    documentPath: 'admin_push_jobs/matrix-job',
    operations: ['list', 'create'],
  },
  {
    namespace: 'adminContentDrafts',
    documentPath: 'adminContentDrafts/fr/quiz/matrix-draft',
    operations: ['create', 'update'],
  },
  {
    namespace: 'adminContentRollbacks',
    documentPath: 'adminContentRollbacks/fr/quiz/matrix-rollback',
    operations: ['create', 'update'],
  },
  {
    namespace: 'app_activity',
    documentPath: 'app_activity/matrix-event',
    operations: ['list'],
  },
  {
    namespace: 'app_errors',
    documentPath: 'app_errors/matrix-error',
    operations: ['list', 'update'],
  },
  {
    namespace: 'app_message_states(CG)',
    documentPath: 'users/matrix-user/app_message_states/matrix-state',
    collectionPath: 'app_message_states',
    listMode: 'collection-group',
    operations: ['list', 'update', 'delete'],
  },
  {
    namespace: 'app_messages',
    documentPath: 'app_messages/matrix-message',
    operations: ['list', 'create', 'update', 'delete'],
  },
  {
    namespace: 'app_meta',
    documentPath: 'app_meta/matrix-flags',
    operations: ['get', 'create', 'update'],
  },
  {
    namespace: 'arena_profiles',
    documentPath: 'arena_profiles/matrix-player',
    operations: ['list', 'update', 'delete'],
  },
  {
    namespace: 'arena_room_members',
    documentPath: 'arena_room_members/matrix-room_player',
    operations: ['list', 'update'],
  },
  {
    namespace: 'arena_rooms',
    documentPath: 'arena_rooms/matrix-room',
    operations: ['list', 'delete'],
    seedData: { hostId: 'other-player' },
  },
  {
    namespace: 'arena_rooms_live',
    documentPath: 'arena_rooms_live/matrix-room',
    operations: ['list', 'update', 'delete'],
  },
  {
    namespace: 'arena_session_results',
    documentPath: 'arena_session_results/matrix-result',
    operations: ['list'],
  },
  {
    namespace: 'arena_sessions',
    documentPath: 'arena_sessions/matrix-session',
    operations: ['list', 'update'],
    seedData: { playerIds: ['other-player'], state: 'active' },
    writeData: { state: 'finished' },
  },
  {
    namespace: 'banned_users',
    documentPath: 'banned_users/matrix-user',
    operations: ['get', 'list', 'create', 'update', 'delete'],
  },
  {
    namespace: 'card_packs',
    documentPath: 'card_packs/matrix-draft',
    operations: ['get', 'list', 'update'],
    seedData: { status: 'draft' },
  },
  {
    namespace: 'choice_explanations',
    documentPath: 'choice_explanations/matrix-choice',
    operations: ['get', 'list', 'delete'],
  },
  {
    namespace: 'community_pack_purchases',
    documentPath: 'community_pack_purchases/matrix-purchase',
    operations: ['list', 'update'],
  },
  {
    namespace: 'community_pack_reports',
    documentPath: 'community_pack_reports/matrix-report',
    operations: ['list', 'update'],
  },
  {
    namespace: 'community_pack_submissions',
    documentPath: 'community_pack_submissions/matrix-submission',
    operations: ['list'],
  },
  {
    namespace: 'community_packs',
    documentPath: 'community_packs/matrix-pack',
    operations: ['get', 'list'],
    seedData: { status: 'draft' },
  },
  {
    namespace: 'daily_phrase_save_counts',
    documentPath: 'daily_phrase_save_counts/matrix-day',
    operations: ['list'],
  },
  {
    namespace: 'daily_phrases',
    documentPath: 'daily_phrases/matrix-phrase',
    operations: ['list', 'create', 'update'],
  },
  {
    namespace: 'email_contacts',
    documentPath: 'email_contacts/matrix-contact',
    operations: ['list'],
  },
  {
    namespace: 'error_reports',
    documentPath: 'error_reports/matrix-report',
    operations: ['list', 'create', 'update', 'delete'],
  },
  {
    namespace: 'explain_report_entries',
    documentPath: 'explain_report_entries/matrix-entry',
    operations: ['list', 'update', 'delete'],
  },
  {
    namespace: 'explain_reports',
    documentPath: 'explain_reports/matrix-report',
    operations: ['list', 'delete'],
  },
  {
    namespace: 'global_broadcast_modals',
    documentPath: 'global_broadcast_modals/matrix-modal',
    operations: ['get', 'list', 'create', 'update'],
  },
  {
    namespace: 'help_board_comments',
    documentPath: 'help_board_comments/matrix-comment',
    operations: ['list', 'create'],
    seedData: { status: 'hidden' },
  },
  {
    namespace: 'help_board_compass_billing',
    documentPath: 'help_board_compass_billing/matrix-billing',
    operations: ['list'],
  },
  {
    namespace: 'help_board_moderation_queue',
    documentPath: 'help_board_moderation_queue/matrix-item',
    operations: ['list', 'update'],
  },
  {
    namespace: 'help_board_reports',
    documentPath: 'help_board_reports/matrix-report',
    operations: ['list'],
  },
  {
    namespace: 'help_board_restrictions',
    documentPath: 'help_board_restrictions/matrix-user',
    operations: ['list'],
  },
  {
    namespace: 'help_board_topics',
    documentPath: 'help_board_topics/matrix-topic',
    operations: ['get', 'list', 'create', 'update'],
    seedData: { status: 'hidden' },
  },
  {
    namespace: 'leaderboard',
    documentPath: 'leaderboard/matrix-user',
    operations: ['get', 'list', 'create', 'update', 'delete'],
  },
  {
    namespace: 'leaderboard_stats',
    documentPath: 'leaderboard_stats/global',
    operations: ['get'],
  },
  {
    namespace: 'league_chat_bans',
    documentPath: 'league_chat_bans/matrix-ban',
    operations: ['list', 'create', 'update'],
  },
  {
    namespace: 'league_chat_messages',
    documentPath: 'league_chat_messages/matrix-message',
    operations: ['list', 'create', 'update'],
  },
  {
    namespace: 'league_chat_moderation_queue',
    documentPath: 'league_chat_moderation_queue/matrix-item',
    operations: ['list', 'update'],
  },
  {
    namespace: 'league_chat_reports',
    documentPath: 'league_chat_reports/matrix-report',
    operations: ['list', 'update'],
  },
  {
    namespace: 'league_chest_events',
    documentPath: 'league_chest_events/matrix-event',
    operations: ['list'],
  },
  {
    namespace: 'league_crowns',
    documentPath: 'league_crowns/matrix-crown',
    operations: ['list'],
  },
  {
    namespace: 'league_groups',
    documentPath: 'league_groups/matrix-group',
    operations: ['get', 'list', 'create', 'update'],
  },
  {
    namespace: 'matchmaking_queue',
    documentPath: 'matchmaking_queue/matrix-other-player',
    operations: ['list', 'delete'],
    seedData: { userId: 'other-player' },
  },
  {
    namespace: 'mistake_explanations',
    documentPath: 'mistake_explanations/matrix-mistake',
    operations: ['get', 'list', 'delete'],
  },
  {
    namespace: 'name_index',
    documentPath: 'name_index/matrix-name',
    operations: ['get'],
  },
  {
    namespace: 'paywall_funnel',
    documentPath: 'paywall_funnel/matrix-event',
    operations: ['list'],
  },
  {
    namespace: 'phrase_explanations',
    documentPath: 'phrase_explanations/matrix-phrase',
    operations: ['get', 'list', 'delete'],
  },
  {
    namespace: 'promo_codes',
    documentPath: 'promo_codes/matrix-code',
    operations: ['get', 'list'],
  },
  {
    namespace: 'promo_redemptions(CG)',
    documentPath: 'users/matrix-user/promo_redemptions/matrix-code',
    collectionPath: 'promo_redemptions',
    listMode: 'collection-group',
    operations: ['list'],
  },
  {
    namespace: 'public_profiles',
    documentPath: 'public_profiles/matrix-user',
    operations: ['list'],
  },
  {
    namespace: 'quiz_explanations',
    documentPath: 'quiz_explanations/matrix-quiz',
    operations: ['get', 'list', 'delete'],
  },
  {
    namespace: 'referral_attributions',
    documentPath: 'referral_attributions/matrix-referee',
    operations: ['get', 'list', 'update'],
  },
  {
    namespace: 'remote_config',
    documentPath: 'remote_config/matrix-config',
    operations: ['get', 'create', 'update'],
  },
  {
    namespace: 'remote_config_history',
    documentPath: 'remote_config_history/matrix-history',
    operations: ['list', 'create'],
  },
  {
    namespace: 'revenuecat_premium_events',
    documentPath: 'revenuecat_premium_events/matrix-event',
    operations: ['list'],
  },
  {
    namespace: 'revenuecat_shard_transactions',
    documentPath: 'revenuecat_shard_transactions/matrix-transaction',
    operations: ['list'],
  },
  {
    namespace: 'safety_flags',
    documentPath: 'safety_flags/matrix-flag',
    operations: ['list', 'update'],
  },
  {
    namespace: 'shard_survey_responses',
    documentPath: 'shard_survey_responses/matrix-response',
    operations: ['list'],
  },
  {
    namespace: 'shard_survey_stats',
    documentPath: 'shard_survey_stats/matrix-stats',
    operations: ['list'],
  },
  {
    namespace: 'shard_surveys',
    documentPath: 'shard_surveys/matrix-survey',
    operations: ['list'],
  },
  {
    namespace: 'site_stats',
    documentPath: 'site_stats/totals',
    operations: ['get'],
  },
  {
    namespace: 'subscription_cancel_surveys',
    documentPath: 'subscription_cancel_surveys/matrix-response',
    operations: ['list'],
  },
  {
    namespace: 'support_inbox',
    documentPath: 'support_inbox/matrix-ticket',
    operations: ['list'],
  },
  {
    namespace: 'top_helpers',
    documentPath: 'top_helpers/matrix-user',
    operations: ['list'],
  },
  {
    namespace: 'user_consents',
    documentPath: 'user_consents/matrix-user',
    operations: ['list'],
  },
  {
    namespace: 'user_ideas',
    documentPath: 'user_ideas/matrix-idea',
    operations: ['list'],
  },
  {
    namespace: 'user_reports',
    documentPath: 'user_reports/matrix-report',
    operations: ['list', 'update'],
  },
  {
    namespace: 'user_warnings',
    documentPath: 'user_warnings/matrix-warning',
    operations: ['create'],
  },
  {
    namespace: 'users',
    documentPath: 'users/matrix-user-root',
    operations: ['get', 'list', 'create', 'update', 'delete'],
  },
  {
    namespace: 'users_dedup_archive',
    documentPath: 'users_dedup_archive/matrix-source',
    operations: ['create', 'update'],
  },
  {
    namespace: 'vip_survey_responses',
    documentPath: 'vip_survey_responses/matrix-user',
    operations: ['list'],
  },
  {
    namespace: 'web_premium_orders',
    documentPath: 'web_premium_orders/matrix-order',
    operations: ['list'],
  },
  {
    namespace: 'website_contact_inbox',
    documentPath: 'website_contact_inbox/matrix-message',
    operations: ['list', 'update'],
  },
] as const;

const NESTED_DYNAMIC_LEGACY_ACCESS_CASES: readonly LegacyAccessCase[] = [
  {
    label: 'dynamic app_messages reactions list',
    operation: 'list',
    path: 'app_messages/matrix-parent/reactions',
    seedPath: 'app_messages/matrix-parent/reactions/matrix-user',
  },
  {
    label: 'dynamic app_messages reactions delete',
    operation: 'delete',
    path: 'app_messages/matrix-parent/reactions/matrix-user-delete',
    seedPath: 'app_messages/matrix-parent/reactions/matrix-user-delete',
  },
  {
    label: 'dynamic app_messages poll_votes list',
    operation: 'list',
    path: 'app_messages/matrix-parent/poll_votes',
    seedPath: 'app_messages/matrix-parent/poll_votes/matrix-user',
  },
  {
    label: 'dynamic app_messages poll_votes delete',
    operation: 'delete',
    path: 'app_messages/matrix-parent/poll_votes/matrix-user-delete',
    seedPath: 'app_messages/matrix-parent/poll_votes/matrix-user-delete',
  },
  {
    label: 'users shard_log list',
    operation: 'list',
    path: 'users/matrix-user/shard_log',
    seedPath: 'users/matrix-user/shard_log/matrix-entry',
  },
  {
    label: 'users shard_log transaction create',
    operation: 'create',
    path: 'users/matrix-user/shard_log/matrix-create',
  },
] as const;

function legacyNamespaceCases(
  specs: readonly LegacyNamespaceSpec[],
): readonly LegacyAccessCase[] {
  return specs.flatMap((spec) => {
    const collectionPath =
      spec.collectionPath ?? spec.documentPath.slice(0, spec.documentPath.lastIndexOf('/'));

    return spec.operations.map((operation): LegacyAccessCase => {
      const lastSlash = spec.documentPath.lastIndexOf('/');
      const operationDocumentPath =
        `${spec.documentPath.slice(0, lastSlash)}/` +
        `${spec.documentPath.slice(lastSlash + 1)}-${operation}`;

      return {
        label: `${spec.namespace} ${operation}`,
        operation:
          operation === 'list' && spec.listMode === 'collection-group'
            ? 'collection-group-list'
            : operation,
        path: operation === 'list' ? collectionPath : operationDocumentPath,
        seedPath: operation === 'create' ? undefined : operationDocumentPath,
        seedData: spec.seedData,
        writeData: spec.writeData,
      };
    });
  });
}

const LEGACY_DIRECT_ACCESS_CASES: readonly LegacyAccessCase[] = [
  ...CRITICAL_LEGACY_ACCESS_CASES,
  ...legacyNamespaceCases(LEGACY_DIRECT_NAMESPACE_SPECS),
  ...NESTED_DYNAMIC_LEGACY_ACCESS_CASES,
] as const;

jest.setTimeout(60_000);

describe('Learning V2 direct Firestore authoring security', () => {
  let testEnv: RulesTestEnvironment;
  let adminDb: Firestore;

  beforeAll(async () => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error(
        'FIRESTORE_EMULATOR_HOST is required; run this test through firebase emulators:exec.',
      );
    }

    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(RULES_PATH, 'utf8'),
      },
    });

    await testEnv.clearFirestore();
    adminDb = testEnv
      .authenticatedContext('admin-rules-test', {
        admin: true,
        email: 'admin@example.test',
        email_verified: true,
      })
      .firestore() as unknown as Firestore;
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
      await testEnv.cleanup();
    }
  });

  async function seed(pathValue: string, data: DocumentData = {}): Promise<void> {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const firestore = context.firestore() as unknown as Firestore;
      await setDoc(doc(firestore, pathValue), {
        marker: 'seed',
        ...data,
      });
    });
  }

  async function runDirectOperation(
    collectionName: string,
    operation: DirectOperation,
  ): Promise<unknown> {
    const targetPath = `${collectionName}/direct-${operation}`;

    if (operation !== 'create') {
      await seed(targetPath);
    }

    switch (operation) {
      case 'get':
        return getDoc(doc(adminDb, targetPath));
      case 'list':
        return getDocs(query(collection(adminDb, collectionName), limit(10)));
      case 'create':
        return setDoc(doc(adminDb, targetPath), { marker: 'created' });
      case 'update':
        return updateDoc(doc(adminDb, targetPath), { marker: 'updated' });
      case 'delete':
        return deleteDoc(doc(adminDb, targetPath));
    }
  }

  async function runLegacyOperation(testCase: LegacyAccessCase): Promise<unknown> {
    if (testCase.seedPath) {
      await seed(testCase.seedPath, testCase.seedData);
    }

    const writeData = testCase.writeData ?? { marker: 'legacy-write' };

    switch (testCase.operation) {
      case 'get':
        return getDoc(doc(adminDb, testCase.path));
      case 'list':
        return getDocs(query(collection(adminDb, testCase.path), limit(10)));
      case 'create':
        return setDoc(doc(adminDb, testCase.path), writeData);
      case 'update':
        return updateDoc(doc(adminDb, testCase.path), writeData);
      case 'delete':
        return deleteDoc(doc(adminDb, testCase.path));
      case 'set-merge-create':
      case 'set-merge-update':
        return setDoc(doc(adminDb, testCase.path), writeData, { merge: true });
      case 'batch-set-create':
      case 'batch-set-update': {
        const batch = writeBatch(adminDb);
        batch.set(doc(adminDb, testCase.path), writeData);
        return batch.commit();
      }
      case 'collection-group-list':
        return getDocs(query(collectionGroup(adminDb, testCase.path), limit(10)));
      case 'transaction-update':
        return runTransaction(adminDb, async (transaction) => {
          const target = doc(adminDb, testCase.path);
          await transaction.get(target);
          transaction.update(target, writeData);
        });
    }
  }

  test.each(
    SERVER_ONLY_COLLECTIONS.flatMap((collectionName) =>
      DIRECT_OPERATIONS.map((operation) => ({ collectionName, operation })),
    ),
  )('$collectionName denies direct admin $operation', async ({ collectionName, operation }) => {
    await assertFails(runDirectOperation(collectionName, operation));
  });

  test.each(['get', 'create', 'update', 'delete'] as const)('owner client cannot access nested V2 progress $0', async (operation) => {
    const path = 'users/progress-owner/v2_progress/season-r1/episodes/episode-1/evidence/letk1-tuple';
    const run = operation === 'get' ? getDoc(doc(adminDb, path)) : operation === 'create' ? setDoc(doc(adminDb, path), { marker: 'client' }) : operation === 'update' ? updateDoc(doc(adminDb, path), { marker: 'client' }) : deleteDoc(doc(adminDb, path));
    await assertFails(run);
  });

  test('legacy direct-access inventory has 78 unique named namespaces', () => {
    const namespaces = LEGACY_DIRECT_NAMESPACE_SPECS.map((spec) => spec.namespace);
    expect(namespaces).toHaveLength(78);
    expect(new Set(namespaces).size).toBe(78);
  });

  test('matchmaking_queue denies admin get of another player', async () => {
    const targetPath = 'matchmaking_queue/admin-get-denied';
    await seed(targetPath, { userId: 'other-player' });

    await assertFails(getDoc(doc(adminDb, targetPath)));
  });

  test.each(LEGACY_DIRECT_ACCESS_CASES)(
    'preserves legacy admin operation: $label',
    async (testCase) => {
      await assertSucceeds(runLegacyOperation(testCase));
    },
  );
});
