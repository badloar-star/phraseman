import * as admin from 'firebase-admin';
import { createHash, timingSafeEqual } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK_SENSITIVE } from './callable_options';
import {
  ACCOUNT_DELETE_PERMANENT_DENIALS,
  ACCOUNT_DELETE_CREDENTIAL_RECEIPTS,
  accountDeleteJobId,
  accountDeleteCredentialReceiptId,
  accountDeletePermanentDenialId,
  enqueueAccountDeletionJob,
  fenceAccountDeletionCredential,
  fenceAccountDeletionRoots,
} from './account_delete_job';
// Префикс синтетических жителей: комната без ЖИВЫХ считается пустой и удаляется,
// иначе после ухода последнего человека остался бы призрак из ботов.
import { RESIDENT_UID_PREFIX } from './league_residents';
// Обратный индекс исходящих заявок в друзья — без него удаление аккаунта
// перебирало всю коллекцию users (см. shared/friend_requests_index_contract.ts).
import {
  FRIEND_REQUESTS_SENT_INDEX,
  FRIEND_REQUESTS_SENT_MARKER_ID,
} from '../../shared/friend_requests_index_contract';

const REGION = 'us-central1';
const DELETE_BATCH_LIMIT = 100;
const ACCOUNT_DELETE_TIMEOUT_SECONDS = 540;
const ACCOUNT_DELETE_PROGRESS_LOG_DOCS = 500;
const MAX_ID_LEN = 180;
const MAX_ACCOUNT_DELETE_IDENTITIES = 64;
const ACCOUNT_DELETE_RECEIPT_MAX_ATTEMPTS = 64;
const ACCOUNT_DELETE_RECEIPT_RATE_WINDOW_MS = 60_000;

const ACCOUNT_DELETE_OPTIONS = {
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_SENSITIVE,
  timeoutSeconds: ACCOUNT_DELETE_TIMEOUT_SECONDS,
  memory: '1GiB' as const,
  maxInstances: 20,
} as const;

export type DeleteStats = {
  docsDeleted: number;
  docsUpdated: number;
  queriesRun: number;
  authDeleted: boolean;
};

type DeleteContext = {
  db: admin.firestore.Firestore;
  writer: FirebaseFirestore.BulkWriter;
  seen: Set<string>;
  runId: string;
  stableUidHash: string;
  authUidHash: string;
  startedAtMs: number;
  closureCutoffMs: number;
  lastProgressLogDocs: number;
  writerClosed: boolean;
  /**
   * Диагностика последней упавшей стадии (ИНЦИДЕНТ 2026-08-29).
   *
   * зачем: имя стадии известно ТОЛЬКО внутри runDeleteStage. Общий catch ниже
   * его уже не видит, поэтому раньше в job.lastError попадало безликое
   * `account_delete_failed` без указания места. Держим здесь, чтобы записать
   * в job — документ Firestore виден владельцу и админке без доступа в GCP.
   */
  failedStage?: string;
  failedStageCode?: string;
  failedStageMessage?: string;
  /** Пройденные стадии с длительностью — попадают в диагностику одним полем. */
  stageTrace: AccountDeleteStageTrace[];
};

type QueryValueKind = 'stable' | 'auth' | 'both';
type QueryOp = '==' | 'array-contains';

export type AccountDeleteQuerySpec = {
  collection: string;
  field: string;
  values: QueryValueKind;
  op?: QueryOp;
};

export type AccountDeleteCollectionGroupSpec = {
  collectionGroup: string;
  field: string;
  values: QueryValueKind;
  op?: QueryOp;
};

export type AccountDeleteDirectDocumentSpec = {
  collection: string;
  values: QueryValueKind;
};

const FIELD_QUERY_SPECS: AccountDeleteQuerySpec[] = [
  { collection: 'auth_links', field: 'stable_id', values: 'stable' },
  { collection: 'auth_links', field: 'providerUid', values: 'auth' },
  { collection: 'name_index', field: 'uid', values: 'both' },
  { collection: 'name_index', field: 'authUid', values: 'auth' },
  { collection: 'friend_code_index', field: 'uid', values: 'both' },
  { collection: 'friend_code_index', field: 'authUid', values: 'auth' },
  { collection: 'leaderboard', field: 'firebaseAuthUid', values: 'auth' },
  { collection: 'arena_profiles', field: 'mirrorStableId', values: 'stable' },
  { collection: 'arena_profiles', field: 'userId', values: 'both' },
  { collection: 'matchmaking_queue', field: 'userId', values: 'auth' },
  { collection: 'arena_rooms', field: 'hostId', values: 'auth' },
  { collection: 'arena_rooms', field: 'guestId', values: 'auth' },
  { collection: 'arena_sessions', field: 'playerIds', values: 'both', op: 'array-contains' },
  { collection: 'session_players', field: 'playerId', values: 'both' },
  { collection: 'arena_session_results', field: 'userId', values: 'both' },
  { collection: 'arena_invites', field: 'fromUid', values: 'auth' },
  { collection: 'arena_invites', field: 'toUid', values: 'auth' },
  { collection: 'arena_invites', field: 'friendStableUid', values: 'stable' },
  { collection: 'arena_rooms_live', field: 'ownerUid', values: 'auth' },
  { collection: 'arena_rooms_live', field: 'ownerStableUid', values: 'stable' },
  { collection: 'arena_room_runs', field: 'userId', values: 'auth' },
  { collection: 'arena_room_runs', field: 'stableUid', values: 'stable' },
  { collection: 'arena_room_members', field: 'authUid', values: 'auth' },
  { collection: 'arena_room_members', field: 'stableUid', values: 'stable' },
  { collection: 'arena_pulse_events', field: 'authUid', values: 'auth' },
  { collection: 'arena_pulse_events', field: 'stableUid', values: 'stable' },
  { collection: 'arena_ghost_challenges', field: 'ownerUid', values: 'auth' },
  { collection: 'arena_ghost_challenges', field: 'ownerStableUid', values: 'stable' },
  { collection: 'arena_ghost_challenges', field: 'lastPlayedBy', values: 'auth' },
  { collection: 'arena_ghost_challenges', field: 'lastPlayedStableUid', values: 'stable' },
  { collection: 'arena_hill_attempts', field: 'stableUid', values: 'stable' },
  { collection: 'arena_hill_thrones', field: 'championUid', values: 'stable' },
  { collection: 'arena_hill_thrones', field: 'championAuthUid', values: 'auth' },
  { collection: 'arena_hill_thrones', field: 'previousChampionUid', values: 'stable' },
  { collection: 'arena_hill_player_wins', field: 'stableUid', values: 'stable' },
  { collection: 'arena_hill_throne_rewards', field: 'championUid', values: 'stable' },
  { collection: 'arena_hill_throne_rewards', field: 'championAuthUid', values: 'auth' },
  { collection: 'arena_season_claims', field: 'uid', values: 'both' },
  { collection: 'arena_club_contributions', field: 'arenaUid', values: 'auth' },
  { collection: 'arena_club_contributions', field: 'stableUid', values: 'stable' },
  // Arena V2 keeps public live state and private answer material in separate
  // roots. Both identity forms are indexed so account deletion cannot leave a
  // live opponent, invite, bot blueprint, or settlement ledger behind.
  { collection: 'arena_v2_profiles', field: 'authUid', values: 'auth' },
  { collection: 'arena_v2_queue', field: 'stableUid', values: 'stable' },
  { collection: 'arena_v2_queue', field: 'authUid', values: 'auth' },
  { collection: 'arena_v2_match_private', field: 'participantStableUids', values: 'stable', op: 'array-contains' },
  { collection: 'arena_v2_match_private', field: 'participantAuthUids', values: 'auth', op: 'array-contains' },
  { collection: 'arena_v2_pair_limits', field: 'participantStableUids', values: 'stable', op: 'array-contains' },
  { collection: 'arena_v2_invites', field: 'fromStableUid', values: 'stable' },
  { collection: 'arena_v2_invites', field: 'toStableUid', values: 'stable' },
  { collection: 'arena_v2_invites', field: 'fromAuthUid', values: 'auth' },
  { collection: 'arena_v2_invites', field: 'toAuthUid', values: 'auth' },
  // Arena Expansion social roots are shared server-owned documents. Identity
  // arrays intentionally remain indexed so deletion can discover every edge.
  { collection: 'arena_v2_ghosts', field: 'participantStableUids', values: 'stable', op: 'array-contains' },
  { collection: 'arena_v2_ghosts', field: 'participantAuthUids', values: 'auth', op: 'array-contains' },
  { collection: 'arena_v2_series', field: 'participantStableUids', values: 'stable', op: 'array-contains' },
  { collection: 'arena_v2_series', field: 'participantAuthUids', values: 'auth', op: 'array-contains' },
  { collection: 'arena_v2_partnerships', field: 'participantStableUids', values: 'stable', op: 'array-contains' },
  { collection: 'arena_v2_partnerships', field: 'participantAuthUids', values: 'auth', op: 'array-contains' },
  { collection: 'user_reports', field: 'reportedUid', values: 'both' },
  { collection: 'user_reports', field: 'reporterUid', values: 'both' },
  { collection: 'community_pack_reports', field: 'authorStableId', values: 'stable' },
  { collection: 'community_pack_reports', field: 'reporterUid', values: 'both' },
  { collection: 'community_pack_submissions', field: 'authorStableId', values: 'stable' },
  { collection: 'community_pack_submissions', field: 'callerAuthUid', values: 'auth' },
  { collection: 'community_packs', field: 'authorStableId', values: 'stable' },
  { collection: 'community_pack_purchases', field: 'buyerStableId', values: 'stable' },
  { collection: 'community_pack_purchases', field: 'authorStableId', values: 'stable' },
  { collection: 'community_pack_gift_claims', field: 'buyerStableId', values: 'stable' },
  { collection: 'flashcard_pack_gift_claims', field: 'buyerStableId', values: 'stable' },
  { collection: 'flashcard_pack_gift_claims', field: 'ownerAliases', values: 'stable', op: 'array-contains' },
  { collection: 'flashcard_pack_gift_entitlements', field: 'buyerStableId', values: 'stable' },
  { collection: 'flashcard_pack_gift_grants', field: 'ownerStableUid', values: 'stable' },
  { collection: 'level_gift_reservations', field: 'ownerStableUid', values: 'stable' },
  { collection: 'friend_quests', field: 'participantUids', values: 'stable', op: 'array-contains' },
  { collection: 'community_pack_ratings', field: 'stableId', values: 'stable' },
  { collection: 'community_pack_ratings', field: 'userStableId', values: 'stable' },
  { collection: 'referral_codes', field: 'ownerStableId', values: 'stable' },
  { collection: 'referral_owners', field: 'ownerStableId', values: 'stable' },
  { collection: 'referral_attributions', field: 'referrerStableId', values: 'stable' },
  { collection: 'referral_attributions', field: 'refereeStableId', values: 'stable' },
  { collection: 'friend_code_index', field: 'ownerStableId', values: 'stable' },
  { collection: 'app_activity', field: 'uid', values: 'stable' },
  { collection: 'app_errors', field: 'uid', values: 'stable' },
  { collection: 'error_reports', field: 'uid', values: 'stable' },
  // Free-form feedback can contain personal data. Both the stable product
  // identity and the current Firebase Auth identity are queryable so deletion
  // remains complete across account linking and retries.
  { collection: 'feedback_entries', field: 'uid', values: 'stable' },
  { collection: 'feedback_entries', field: 'authUid', values: 'auth' },
  { collection: 'max_voice_feedback', field: 'uid', values: 'stable' },
  { collection: 'max_voice_feedback', field: 'authUid', values: 'auth' },
  { collection: 'feedback_submission_quotas', field: 'stableUid', values: 'stable' },
  { collection: 'feedback_submission_quotas', field: 'authUid', values: 'auth' },
  // Legacy MAX safety rows used both identities before the content-free 2026-08-21 boundary.
  { collection: 'safety_flags', field: 'uid', values: 'stable' },
  { collection: 'safety_flags', field: 'authUid', values: 'auth' },
  { collection: 'review_promo_claims', field: 'uid', values: 'stable' },
  { collection: 'vip_survey_responses', field: 'uid', values: 'stable' },
  { collection: 'shard_survey_responses', field: 'uid', values: 'stable' },
  { collection: 'subscription_cancel_surveys', field: 'uid', values: 'stable' },
  { collection: 'revenuecat_premium_lineages', field: 'ownerUid', values: 'both' },
  { collection: 'revenuecat_premium_denials', field: 'ownerUid', values: 'both' },
  { collection: 'revenuecat_premium_denials', field: 'candidates', values: 'both', op: 'array-contains' },
  { collection: 'revenuecat_premium_events', field: 'uid', values: 'both' },
  { collection: 'revenuecat_premium_events', field: 'candidates', values: 'both', op: 'array-contains' },
  { collection: 'revenuecat_premium_events', field: 'recipientId', values: 'both' },
  { collection: 'revenuecat_premium_events', field: 'donorIds', values: 'both', op: 'array-contains' },
  { collection: 'revenuecat_premium_events', field: 'transferredFrom', values: 'both', op: 'array-contains' },
  { collection: 'revenuecat_premium_events', field: 'transferredTo', values: 'both', op: 'array-contains' },
  { collection: 'revenuecat_shard_transactions', field: 'uid', values: 'both' },
  { collection: 'revenuecat_shard_transactions', field: 'candidates', values: 'both', op: 'array-contains' },
  { collection: 'revenuecat_shard_refunds', field: 'uid', values: 'both' },
  { collection: 'revenuecat_shard_refunds', field: 'sourceUid', values: 'both' },
  { collection: 'voice_minute_events', field: 'ownerStableId', values: 'stable' },
  { collection: 'voice_minute_denials', field: 'candidates', values: 'both', op: 'array-contains' },
  { collection: 'league_chest_claims', field: 'uid', values: 'stable' },
  { collection: 'league_chest_claims', field: 'authUid', values: 'auth' },
  { collection: 'league_crowns', field: 'uid', values: 'stable' },
  { collection: 'daily_phrase_saves', field: 'uid', values: 'stable' },
  { collection: 'daily_phrase_saves', field: 'authUid', values: 'auth' },
  // MAX-звонок: память учителя (факты об ученике из разговоров — персональные
  // данные) и квота минут; docId — хэш, поэтому удаляем по полям.
  { collection: 'voice_tutor_memory', field: 'stableUid', values: 'stable' },
  { collection: 'voice_tutor_memory', field: 'authUid', values: 'auth' },
  { collection: 'voice_call_reviews', field: 'stableUid', values: 'stable' },
  { collection: 'voice_call_reviews', field: 'authUid', values: 'auth' },
  { collection: 'voice_call_quotas', field: 'stableUid', values: 'stable' },
  { collection: 'voice_call_quotas', field: 'authUid', values: 'auth' },
];

type MutableIdentityIndexCollection = 'auth_links' | 'name_index' | 'friend_code_index';
const MUTABLE_IDENTITY_INDEX_COLLECTIONS = new Set<MutableIdentityIndexCollection>([
  'auth_links',
  'name_index',
  'friend_code_index',
]);

const COLLECTION_GROUP_QUERY_SPECS: AccountDeleteCollectionGroupSpec[] = [
  { collectionGroup: 'messages', field: 'authorUid', values: 'both' },
  { collectionGroup: 'messages', field: 'authorStableUid', values: 'both' },
  { collectionGroup: 'reactions', field: 'userId', values: 'stable' },
  { collectionGroup: 'poll_votes', field: 'userId', values: 'stable' },
  { collectionGroup: 'activity_likes_received', field: 'fromUid', values: 'stable' },
  { collectionGroup: 'friend_activity_like_daily_limits', field: 'targetUid', values: 'stable' },
  { collectionGroup: 'friend_activity_likes_sent', field: 'targetUid', values: 'stable' },
  { collectionGroup: 'friend_gifts_received', field: 'fromUid', values: 'stable' },
  { collectionGroup: 'friend_gifts_sent', field: 'toUid', values: 'stable' },
  { collectionGroup: 'friend_gift_history', field: 'peerUid', values: 'stable' },
  { collectionGroup: 'friend_quest_meta', field: 'peerUid', values: 'stable' },
  { collectionGroup: 'friend_quest_weekly', field: 'peerUid', values: 'stable' },
  { collectionGroup: 'notifications', field: 'fromUid', values: 'stable' },
  { collectionGroup: 'shard_rewards', field: 'fromUid', values: 'stable' },
  { collectionGroup: 'shard_log', field: 'targetUid', values: 'stable' },
  { collectionGroup: 'my_events', field: 'payload.fromUid', values: 'stable' },
  { collectionGroup: 'my_events', field: 'payload.targetUid', values: 'stable' },
  { collectionGroup: 'boosts', field: 'activatedBy', values: 'stable' },
];

const COLLECTION_GROUP_DOCUMENT_ID_SPECS: Array<{ collectionGroup: string; values: QueryValueKind }> = [
  { collectionGroup: 'friends', values: 'both' },
  { collectionGroup: 'friend_requests', values: 'both' },
];

const DIRECT_DOCUMENT_SPECS: AccountDeleteDirectDocumentSpec[] = [
  { collection: 'users', values: 'both' },
  { collection: 'public_profiles', values: 'both' },
  { collection: 'leaderboard', values: 'both' },
  { collection: 'arena_profiles', values: 'both' },
  { collection: 'arena_question_history', values: 'both' },
  { collection: 'matchmaking_queue', values: 'both' },
  { collection: 'arena_v2_profiles', values: 'both' },
  { collection: 'arena_v2_queue', values: 'both' },
  { collection: 'shard_survey_rate_limits', values: 'both' },
  { collection: 'user_consents', values: 'both' },
  { collection: 'referral_owners', values: 'both' },
  { collection: 'referral_attributions', values: 'both' },
  { collection: 'voice_minute_wallets', values: 'stable' },
];

// `users/{stableUid}` is removed through deleteDocTree, which recursively
// deletes every nested document. Keep this explicit audit list in sync with
// Arena Expansion so a schema change cannot silently escape deletion review.
export const ARENA_EXPANSION_USER_SUBCOLLECTIONS = Object.freeze([
  'arena_v2_daily_attempts',
  'arena_v2_expansion_runs',
  'arena_v2_match_labs',
  'arena_v2_mastery_signatures',
  'arena_v2_activity_days',
  'arena_v2_partner_weeks',
  'arena_v2_star_ledger',
  'arena_v2_entitlements',
  'arena_v2_expansion_receipts',
  // Расписки единого журнала звёзд (владелец 2026-08-12). Коллекция общая для
  // всего приложения, а не только для Арены, но живёт под тем же документом
  // игрока и обязана удаляться вместе с ним.
  'star_operations',
] as const);

function cleanId(value: unknown): string {
  return String(value ?? '').trim().slice(0, MAX_ID_LEN);
}

function queryValues(spec: AccountDeleteQuerySpec, stableUid: string, authUid: string): string[] {
  if (spec.values === 'stable') return [stableUid].filter(Boolean);
  if (spec.values === 'auth') return [authUid].filter(Boolean);
  return Array.from(new Set([stableUid, authUid].filter(Boolean)));
}

export function accountDeleteQueryPlan(stableUid: string, authUid: string): Array<AccountDeleteQuerySpec & { value: string; op: QueryOp }> {
  const out: Array<AccountDeleteQuerySpec & { value: string; op: QueryOp }> = [];
  for (const spec of FIELD_QUERY_SPECS) {
    for (const value of queryValues(spec, stableUid, authUid)) {
      out.push({ ...spec, value, op: spec.op ?? '==' });
    }
  }
  return out;
}

export function accountDeleteCollectionGroupPlan(
  stableUid: string,
  authUid: string,
): Array<AccountDeleteCollectionGroupSpec & { value: string; op: QueryOp }> {
  const out: Array<AccountDeleteCollectionGroupSpec & { value: string; op: QueryOp }> = [];
  for (const spec of COLLECTION_GROUP_QUERY_SPECS) {
    for (const value of queryValues({ collection: spec.collectionGroup, field: spec.field, values: spec.values, op: spec.op }, stableUid, authUid)) {
      out.push({ ...spec, value, op: spec.op ?? '==' });
    }
  }
  return out;
}

export function accountDeleteCollectionGroupDocumentIdPlan(
  stableUid: string,
  authUid: string,
): Array<{ collectionGroup: string; value: string }> {
  const out: Array<{ collectionGroup: string; value: string }> = [];
  for (const spec of COLLECTION_GROUP_DOCUMENT_ID_SPECS) {
    for (const value of queryValues({ collection: spec.collectionGroup, field: '__name__', values: spec.values }, stableUid, authUid)) {
      out.push({ collectionGroup: spec.collectionGroup, value });
    }
  }
  return out;
}

export function accountDeleteDirectDocumentPlan(
  stableUid: string,
  authUid: string,
): Array<{ collection: string; id: string }> {
  const out: Array<{ collection: string; id: string }> = [];
  for (const spec of DIRECT_DOCUMENT_SPECS) {
    for (const id of queryValues({ collection: spec.collection, field: '__name__', values: spec.values }, stableUid, authUid)) {
      out.push({ collection: spec.collection, id });
    }
  }
  return out;
}

function hashId(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function accountDeleteLog(
  ctx: Pick<DeleteContext, 'runId' | 'stableUidHash' | 'authUidHash' | 'startedAtMs'>,
  stage: string,
  stats: DeleteStats,
  extra: Record<string, unknown> = {},
): void {
  console.log(JSON.stringify({
    event: 'account_delete',
    runId: ctx.runId,
    stage,
    stableUidHash: ctx.stableUidHash.slice(0, 16),
    authUidHash: ctx.authUidHash.slice(0, 16),
    elapsedMs: Date.now() - ctx.startedAtMs,
    ...stats,
    ...extra,
  }));
}

/**
 * Коллекция диагностики удалений — ВИДНА ВЛАДЕЛЬЦУ БЕЗ ДОСТУПА В GCP.
 *
 * зачем (правило владельца «сперва логи, потом починка», ИНЦИДЕНТ 2026-08-29):
 * вся трассировка удаления уходила в console.log, то есть в Cloud Logging.
 * Туда нет доступа ни у владельца из админки, ни у сессии-ассистента (проверено:
 * PERMISSION_DENIED). Из-за этого пять боевых удалений подряд падали, а в базе
 * лежало только безликое `account_delete_failed` — понять, ЧТО чинить, было
 * физически невозможно, и баг `__index__` прожил незамеченным.
 *
 * Теперь каждый прогон удаления оставляет здесь документ: какие стадии прошли,
 * сколько заняли, на какой упало, с каким кодом и сообщением.
 *
 * Приватность: НИКАКИХ uid, email и имён — только SHA-256 хеши (16 символов) и
 * технические поля. По документу нельзя узнать, чей это аккаунт, но можно
 * сопоставить с job по тем же хешам. Коллекция закрыта правилами наглухо
 * (allow read, write: if false) — доступ только Admin SDK и админке.
 *
 * Стоимость: РОВНО ОДНА запись на прогон удаления, в самом конце. Не в цикле,
 * не по стадиям — иначе на аккаунт с большим прогрессом набегали бы десятки
 * записей. Живёт 90 дней, столько же, сколько сам job.
 */
export const ACCOUNT_DELETE_DIAGNOSTICS = 'account_deletion_diagnostics';

const ACCOUNT_DELETE_DIAGNOSTICS_RETENTION_MS = 90 * 24 * 60 * 60_000;

type AccountDeleteStageTrace = {
  stage: string;
  ms: number;
  ok: boolean;
};

/**
 * Одна запись с полной картиной прогона.
 *
 * Никогда не бросает: диагностика не имеет права уронить удаление. Отказ
 * записи логируется (запрет немого catch), но результат удаления не меняет.
 */
async function persistAccountDeleteDiagnostics(
  db: admin.firestore.Firestore,
  ctx: DeleteContext,
  stats: DeleteStats,
  outcome: 'completed' | 'failed',
): Promise<void> {
  const nowMs = Date.now();
  try {
    await db.collection(ACCOUNT_DELETE_DIAGNOSTICS).doc(ctx.runId).set({
      runId: ctx.runId,
      outcome,
      stableUidHash: ctx.stableUidHash.slice(0, 16),
      authUidHash: ctx.authUidHash.slice(0, 16),
      startedAtMs: ctx.startedAtMs,
      finishedAtMs: nowMs,
      totalMs: nowMs - ctx.startedAtMs,
      stages: ctx.stageTrace,
      docsDeleted: stats.docsDeleted,
      docsUpdated: stats.docsUpdated,
      queriesRun: stats.queriesRun,
      authDeleted: stats.authDeleted,
      ...(outcome === 'failed' ? {
        failedStage: ctx.failedStage ?? 'unknown_stage',
        failedCode: ctx.failedStageCode ?? 'unknown',
        failedMessage: ctx.failedStageMessage ?? '',
      } : {}),
      retentionUntilMs: nowMs + ACCOUNT_DELETE_DIAGNOSTICS_RETENTION_MS,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e: any) {
    // зачем: запрет немого catch. Диагностика не смогла записаться — это само
    // по себе диагноз (правила/квота/сеть), и он обязан быть виден.
    console.warn(JSON.stringify({
      event: 'account_delete_diagnostics_write_failed',
      runId: ctx.runId,
      code: e?.code ?? 'unknown',
      message: String(e?.message ?? e).slice(0, 160),
    }));
  }
}

function createDeleteContext(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  stats: DeleteStats,
  closureCutoffMs = Date.now(),
): DeleteContext {
  const stableUidHash = hashId(stableUid);
  const authUidHash = hashId(authUid);
  const ctx: DeleteContext = {
    db,
    writer: null as unknown as FirebaseFirestore.BulkWriter,
    seen: new Set<string>(),
    runId: `${stableUidHash.slice(0, 8)}_${Date.now()}`,
    stableUidHash,
    authUidHash,
    startedAtMs: Date.now(),
    closureCutoffMs,
    lastProgressLogDocs: 0,
    writerClosed: false,
    stageTrace: [],
  };

  const writer = db.bulkWriter({
    throttling: {
      initialOpsPerSecond: 200,
      maxOpsPerSecond: 500,
    },
  });
  writer.onWriteResult(() => {
    stats.docsDeleted += 1;
    if (stats.docsDeleted - ctx.lastProgressLogDocs >= ACCOUNT_DELETE_PROGRESS_LOG_DOCS) {
      ctx.lastProgressLogDocs = stats.docsDeleted;
      accountDeleteLog(ctx, 'progress', stats);
    }
  });
  writer.onWriteError((error) => {
    console.warn(JSON.stringify({
      event: 'account_delete_write_error',
      runId: ctx.runId,
      path: error.documentRef.path,
      code: error.code,
      failedAttempts: error.failedAttempts,
    }));
    return error.failedAttempts < 3;
  });
  ctx.writer = writer;
  return ctx;
}

async function closeDeleteWriter(ctx: DeleteContext): Promise<void> {
  if (ctx.writerClosed) return;
  ctx.writerClosed = true;
  await ctx.writer.close();
}

/**
 * Стадия удаления с ПОЛНОЙ трассировкой.
 *
 * зачем (ИНЦИДЕНТ 2026-08-29, правило владельца «сперва логи, потом починка»):
 * раньше стадия писала только `:start` и `:done`, а при падении — НИЧЕГО.
 * Из-за этого по логу нельзя было понять, на каком шаге умерло удаление, и
 * баг `__index__` прожил пять боевых удалений подряд: в job лежало безликое
 * `account_delete_failed`, а настоящая причина терялась.
 *
 * Теперь фиксируем и провал: имя стадии, код, сообщение, сколько заняло и
 * какая статистика была на этот момент. Ошибку пробрасываем дальше без
 * изменений — лог не должен менять поведение.
 */
async function runDeleteStage<T = void>(
  ctx: DeleteContext,
  stats: DeleteStats,
  stage: string,
  fn: () => Promise<T>,
): Promise<T> {
  const stageStartedAtMs = Date.now();
  accountDeleteLog(ctx, `${stage}:start`, stats);
  try {
    const result = await fn();
    const okMs = Date.now() - stageStartedAtMs;
    ctx.stageTrace.push({ stage, ms: okMs, ok: true });
    accountDeleteLog(ctx, `${stage}:done`, stats, { stageMs: okMs });
    return result;
  } catch (e: any) {
    // зачем: единственное место, где ещё известно ИМЯ упавшей стадии. Выше по
    // стеку остаётся только общий catch, который её уже не знает.
    const failMs = Date.now() - stageStartedAtMs;
    ctx.failedStage = stage;
    ctx.failedStageCode = String(e?.code ?? 'unknown');
    ctx.failedStageMessage = String(e?.message ?? e).slice(0, 200);
    ctx.stageTrace.push({ stage, ms: failMs, ok: false });
    accountDeleteLog(ctx, `${stage}:failed`, stats, {
      stageMs: failMs,
      code: ctx.failedStageCode,
      message: ctx.failedStageMessage,
    });
    throw e;
  }
}

async function getEmailsForDeletion(
  db: admin.firestore.Firestore,
  authUid: string,
  stableUid: string,
): Promise<string[]> {
  const emails = new Set<string>();
  const add = (value: unknown) => {
    const email = String(value ?? '').trim().toLowerCase();
    if (email && email.includes('@') && email.length <= 320) emails.add(email);
  };

  const [authUser, stableUserSnap, authUserSnap, authLinkSnap] = await Promise.all([
    admin.auth().getUser(authUid).catch(() => null),
    db.collection('users').doc(stableUid).get().catch(() => null),
    stableUid === authUid ? Promise.resolve(null) : db.collection('users').doc(authUid).get().catch(() => null),
    db.collection('auth_links').doc(authUid).get().catch(() => null),
  ]);

  add(authUser?.email);
  authUser?.providerData?.forEach((p) => add(p.email));
  add(stableUserSnap?.data()?.linkedAuth?.email);
  add(authUserSnap?.data()?.linkedAuth?.email);
  add(authLinkSnap?.data()?.email);

  return Array.from(emails);
}

async function resolveStableUidForDelete(
  db: admin.firestore.Firestore,
  authUid: string,
  requestedStableId: unknown,
): Promise<string> {
  const resolveKnownStableUid = async (): Promise<string> => {
    const authLinkSnap = await db.collection('auth_links').doc(authUid).get().catch(() => null);
    const linkedStableId = cleanId(authLinkSnap?.data()?.stable_id);
    if (linkedStableId) return linkedStableId;

    const direct = await db.collection('users').doc(authUid).get().catch(() => null);
    if (direct?.exists) return authUid;

    const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
    if (!byAuth.empty) return byAuth.docs[0].id;

    return authUid;
  };

  const requested = cleanId(requestedStableId);
  if (requested) {
    const [userSnap, authLinkSnap] = await Promise.all([
      db.collection('users').doc(requested).get().catch(() => null),
      db.collection('auth_links').doc(authUid).get().catch(() => null),
    ]);
    const linkedAuthUid = cleanId(userSnap?.data()?.firebaseAuthUid);
    const linkedStableId = cleanId(authLinkSnap?.data()?.stable_id);
    // зачем: ИНЦИДЕНТ 2026-08-25 — уничтожение живого аккаунта владельца.
    // Раньше `if (linkedStableId) return linkedStableId` МОЛЧА ПОДМЕНЯЛ
    // запрошенный stable_id на якорь ТЕКУЩЕЙ сессии: протухший клиентский замок
    // удаления (от удаления ДРУГОГО аккаунта 2026-08-23) прислал старый
    // stable_id, сервер подменил его на живой якорь только что вошедшего
    // владельца — и поставил ЖИВОЙ аккаунт в очередь на стирание + disable.
    // Дизайн 2026-08-20 (post-deletion-fresh-identity, Task 2) прямо требовал:
    // «must not silently replace the client-requested stable ID with the
    // current auth_links anchor... causes a safe rejection; never silently
    // substituted». Теперь удаляется ТОЛЬКО тот аккаунт, который клиент явно
    // назвал И владение которым доказано; всё остальное — отказ. Отказ летит
    // ДО disable-hardening в accountDeleteEnqueue, поэтому чужая сессия не
    // блокируется. Легитимный путь не страдает: приложение передаёт свой
    // текущий stable_id, совпадающий с якорем (или доказанный через
    // users.firebaseAuthUid у анонимов).
    if (linkedStableId === requested) return requested;
    if (linkedStableId) {
      throw new HttpsError('permission-denied', 'stable_id_mismatch');
    }
    if (linkedAuthUid === authUid) return requested;
    throw new HttpsError('permission-denied', 'stable_id_mismatch');
  }

  return resolveKnownStableUid();
}

async function deleteDocTree(
  ctx: DeleteContext,
  ref: FirebaseFirestore.DocumentReference,
): Promise<boolean> {
  if (ctx.seen.has(ref.path)) return false;
  ctx.seen.add(ref.path);
  await ctx.db.recursiveDelete(ref, ctx.writer);
  return true;
}

async function deleteQuery(
  query: FirebaseFirestore.Query,
  ctx: DeleteContext,
  stats: DeleteStats,
): Promise<void> {
  for (;;) {
    stats.queriesRun += 1;
    const snap = await query.limit(DELETE_BATCH_LIMIT).get();
    if (snap.empty) return;
    let scheduledDeletes = 0;
    for (const doc of snap.docs) {
      if (await deleteDocTree(ctx, doc.ref)) scheduledDeletes += 1;
    }
    if (scheduledDeletes === 0) return;
    if (typeof ctx.writer.flush === 'function') {
      await ctx.writer.flush();
    }
  }
}

function mutableIdentityIndexBelongsToFrozenClosure(
  collection: MutableIdentityIndexCollection,
  data: Record<string, unknown>,
  identityClosure: ReadonlySet<string>,
): boolean {
  if (collection === 'auth_links') {
    return identityClosure.has(cleanId(data.stable_id));
  }
  const currentStableOwner = cleanId(data.uid);
  if (currentStableOwner) return identityClosure.has(currentStableOwner);
  // Legacy index rows may predate `uid`; only those rows fall back to authUid.
  // A reclaimed row with a fresh uid is never deleted merely because its
  // historical authUid still names the retired provider generation.
  return identityClosure.has(cleanId(data.authUid));
}

async function deleteMutableIdentityIndexSnapshotIfStillOwned(
  db: FirebaseFirestore.Firestore,
  ref: FirebaseFirestore.DocumentReference,
  collection: MutableIdentityIndexCollection,
  identities: string[],
): Promise<boolean> {
  const identityClosure = new Set(identities.map(cleanId).filter(Boolean));
  return db.runTransaction(async (transaction) => {
    const current = await transaction.get(ref);
    if (!current.exists) return false;
    if (!mutableIdentityIndexBelongsToFrozenClosure(
      collection,
      current.data() as Record<string, unknown>,
      identityClosure,
    )) return false;
    transaction.delete(ref);
    return true;
  });
}

async function deleteMutableIdentityIndexMatches(
  db: FirebaseFirestore.Firestore,
  spec: AccountDeleteQuerySpec & { value: string; op: QueryOp },
  identities: string[],
  stats: DeleteStats,
): Promise<void> {
  stats.queriesRun += 1;
  const snapshot = await db.collection(spec.collection).where(spec.field, spec.op, spec.value).get();
  for (const doc of snapshot.docs) {
    if (await deleteMutableIdentityIndexSnapshotIfStillOwned(
      db,
      doc.ref,
      spec.collection as MutableIdentityIndexCollection,
      identities,
    )) stats.docsDeleted += 1;
  }
}

async function deleteDirectDocs(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  ctx: DeleteContext,
): Promise<void> {
  for (const spec of accountDeleteDirectDocumentPlan(stableUid, authUid)) {
    await deleteDocTree(ctx, db.collection(spec.collection).doc(spec.id));
  }
}

export async function resolveAccountDeleteIdentityClosure(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  authUid: string,
  transaction?: FirebaseFirestore.Transaction,
): Promise<string[]> {
  const identities = new Set<string>();
  const queue: string[] = [];
  const add = (raw: unknown) => {
    const id = cleanId(raw);
    if (!id || identities.has(id)) return;
    if (identities.size >= MAX_ACCOUNT_DELETE_IDENTITIES) {
      throw new HttpsError('resource-exhausted', 'account_delete_identity_limit');
    }
    identities.add(id);
    queue.push(id);
  };
  add(stableUid);
  add(authUid);
  const read = (source: FirebaseFirestore.DocumentReference | FirebaseFirestore.Query): Promise<any> => (
    transaction ? transaction.get(source as any) : source.get()
  );

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const canonicalId = queue[cursor];
    const userRef = db.collection('users').doc(canonicalId);
    const directOwnerMapRef = db.collection('account_identity_owner_map').doc(canonicalId);
    const hiddenUsersQuery = db.collection('users')
      .where('canonicalStableId', '==', canonicalId)
      .limit(MAX_ACCOUNT_DELETE_IDENTITIES + 1);
    const reverseOwnerMapsQuery = db.collection('account_identity_owner_map')
      .where('canonicalStableId', '==', canonicalId)
      .limit(MAX_ACCOUNT_DELETE_IDENTITIES + 1);
    const mergeOutboxAsWinnerQuery = db.collection('account_merge_outbox')
      .where('winnerStableId', '==', canonicalId)
      .limit(MAX_ACCOUNT_DELETE_IDENTITIES + 1);
    const mergeOutboxAsLoserQuery = db.collection('account_merge_outbox')
      .where('loserStableId', '==', canonicalId)
      .limit(MAX_ACCOUNT_DELETE_IDENTITIES + 1);
    const [
      userSnap,
      directOwnerMap,
      hiddenUsers,
      reverseOwnerMaps,
      mergeOutboxAsWinner,
      mergeOutboxAsLoser,
    ] = await Promise.all([
      read(userRef),
      read(directOwnerMapRef),
      read(hiddenUsersQuery),
      read(reverseOwnerMapsQuery),
      read(mergeOutboxAsWinnerQuery),
      read(mergeOutboxAsLoserQuery),
    ]);
    if (hiddenUsers.docs.length > MAX_ACCOUNT_DELETE_IDENTITIES
      || reverseOwnerMaps.docs.length > MAX_ACCOUNT_DELETE_IDENTITIES
      || mergeOutboxAsWinner.docs.length > MAX_ACCOUNT_DELETE_IDENTITIES
      || mergeOutboxAsLoser.docs.length > MAX_ACCOUNT_DELETE_IDENTITIES) {
      throw new HttpsError('resource-exhausted', 'account_delete_identity_limit');
    }
    if (userSnap.exists && userSnap.data()?.identityHidden === true) {
      add(userSnap.data()?.canonicalStableId);
    }
    if (directOwnerMap.exists) add(directOwnerMap.data()?.canonicalStableId);
    hiddenUsers.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => add(doc.id));
    reverseOwnerMaps.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => add(doc.id));
    mergeOutboxAsWinner.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => add(doc.data()?.loserStableId));
    mergeOutboxAsLoser.docs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => add(doc.data()?.winnerStableId));
  }

  return [...identities];
}

async function persistPermanentDeletionDenials(
  db: FirebaseFirestore.Firestore,
  identities: string[],
): Promise<void> {
  const uniqueIdentities = Array.from(new Set(identities.map(cleanId).filter(Boolean)));
  await db.runTransaction(async (transaction) => {
    const refs = uniqueIdentities.map((identity) => (
      db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS).doc(accountDeletePermanentDenialId(identity))
    ));
    const snapshots = await Promise.all(refs.map((ref) => transaction.get(ref)));
    snapshots.forEach((snapshot, index) => {
      if (snapshot.exists) return;
      const identity = uniqueIdentities[index];
      transaction.create(refs[index], {
        identityHash: hashId(identity),
        status: 'denied',
        identityKind: 'account_delete_alias_closure',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  });
}

async function deleteMergeIdentityRecords(
  db: FirebaseFirestore.Firestore,
  identities: string[],
  ctx: DeleteContext,
  stats: DeleteStats,
): Promise<void> {
  for (const identity of identities) {
    await deleteDocTree(ctx, db.collection('account_identity_owner_map').doc(identity));
    await deleteQuery(
      db.collection('account_merge_outbox').where('winnerStableId', '==', identity),
      ctx,
      stats,
    );
    await deleteQuery(
      db.collection('account_merge_outbox').where('loserStableId', '==', identity),
      ctx,
      stats,
    );
  }
}

async function deleteFieldMatches(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  identities: string[],
  ctx: DeleteContext,
  stats: DeleteStats,
): Promise<void> {
  for (const spec of accountDeleteQueryPlan(stableUid, authUid)) {
    if (MUTABLE_IDENTITY_INDEX_COLLECTIONS.has(spec.collection as MutableIdentityIndexCollection)) {
      await deleteMutableIdentityIndexMatches(db, spec, identities, stats);
      continue;
    }
    const q = db.collection(spec.collection).where(spec.field, spec.op, spec.value);
    await deleteQuery(q, ctx, stats);
  }
}

async function deleteEmailMatches(
  db: admin.firestore.Firestore,
  emails: string[],
  ctx: DeleteContext,
  stats: DeleteStats,
): Promise<void> {
  for (const email of emails) {
    stats.queriesRun += 1;
    const snapshot = await db.collection('website_contact_inbox').where('email', '==', email).get();
    for (const doc of snapshot.docs) {
      if (emailMatchDocumentBelongsToDeletionGeneration(doc.data(), ctx.closureCutoffMs)) {
        await deleteDocTree(ctx, doc.ref);
      }
    }
  }
}

function accountDeleteEmailQueryCollections(): string[] {
  return ['website_contact_inbox'];
}

function emailMatchDocumentBelongsToDeletionGeneration(
  data: Record<string, unknown>,
  cutoffMs: number,
): boolean {
  const raw = data.createdAt as { toMillis?: () => number } | number | undefined;
  const createdAtMs = typeof raw === 'number'
    ? raw
    : typeof raw?.toMillis === 'function'
      ? raw.toMillis()
      : null;
  return createdAtMs === null || !Number.isFinite(createdAtMs) || createdAtMs <= cutoffMs;
}

async function deleteCollectionGroupMatches(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  ctx: DeleteContext,
  stats: DeleteStats,
  peerUids?: string[] | null,
): Promise<void> {
  for (const spec of accountDeleteCollectionGroupPlan(stableUid, authUid)) {
    const q = db.collectionGroup(spec.collectionGroup).where(spec.field, spec.op, spec.value);
    await deleteQuery(q, ctx, stats);
  }
  await deleteCrossUserDocumentIdMatches(db, stableUid, authUid, ctx, stats, peerUids);
}

/**
 * Маркер «этот аккаунт ведёт обратный индекс исходящих заявок».
 *
 * зачем: пустая подколлекция `friend_requests_sent` неотличима от «индекса не
 * существует» — в обоих случаях запрос вернёт ноль документов. Маркер ставит
 * `ensureFriendRequestsSentIndexMarker` (app/firestore_friend_requests.ts) при
 * первом заходе на вкладку «Друзья», один раз на аккаунт на устройство.
 * Наличие маркера означает «узкому пути можно верить», отсутствие — «аккаунт
 * старше индекса, честно платим за полный перебор один раз».
 */
async function hasFriendRequestsSentIndexMarker(
  db: admin.firestore.Firestore,
  identities: string[],
  stats: DeleteStats,
): Promise<boolean> {
  for (const identity of identities) {
    if (!identity) continue;
    stats.queriesRun += 1;
    try {
      const snap = await db
        .collection('users').doc(identity)
        .collection(FRIEND_REQUESTS_SENT_INDEX)
        .doc(FRIEND_REQUESTS_SENT_MARKER_ID)
        .get();
      if (snap.exists) return true;
    } catch (e: any) {
      // зачем (ИНЦИДЕНТ 2026-08-29): бросок отсюда валил стадию collect_peers,
      // а через неё ВСЁ удаление аккаунта (корень — зарезервированный id
      // `__index__`). Маркер — это лишь подсказка «можно ли верить узкому
      // пути»; его недоступность обязана лишь понизить нас до честного полного
      // перебора, но никогда не отменять удаление данных человека.
      console.warn(JSON.stringify({
        event: 'account_delete_sent_index_marker_unreadable',
        identityHash: hashId(identity),
        markerId: FRIEND_REQUESTS_SENT_MARKER_ID,
        code: e?.code ?? 'unknown',
        message: String(e?.message ?? e).slice(0, 160),
      }));
      return false;
    }
  }
  return false;
}

/**
 * Собирает peer-uid, у которых МОГУТ лежать документы про удаляемого игрока.
 *
 * зачем: раньше обе функции ниже перебирали `users.listDocuments()` — всю базу
 * целиком, на каждое удаление аккаунта. При 100k игроков это ~700k чтений и
 * почти гарантированный таймаут функции. Дружба и подарки симметричны:
 * `users/{me}/friends/{peer}` существует ровно тогда, когда существует
 * `users/{peer}/friends/{me}` (см. acceptFriendRequest/deleteFriend в
 * app/firestore_friend_requests.ts), а подарок физически невозможен без
 * двусторонней дружбы (functions/src/friend_gifts.ts проверяет ОБА документа).
 * Поэтому свой же список друзей — это и есть готовый обратный индекс: десятки
 * документов вместо сотен тысяч.
 *
 * Вызывать ДО удаления `users/{uid}` (стадия direct_docs), иначе список уже мёртв.
 */
async function collectFriendPeerUids(
  db: admin.firestore.Firestore,
  identities: string[],
  stats: DeleteStats,
): Promise<string[]> {
  const peers = new Set<string>();
  for (const identity of identities) {
    if (!identity) continue;
    stats.queriesRun += 1;
    const snap = await db.collection('users').doc(identity).collection('friends').get();
    for (const doc of snap.docs) {
      if (doc.id && !identities.includes(doc.id)) peers.add(doc.id);
    }
  }
  return Array.from(peers);
}

/**
 * Добирает peer-uid из СВОЕЙ истории подарков.
 *
 * зачем: список друзей покрывает только действующую дружбу. Если Аня подарила
 * подарок Боре, а потом дружбу разорвали, счётчик `recipients.<Боря>` остаётся
 * в `users/Аня/friend_gift_daily_limits/{дата}` — но Ани уже нет в списке
 * друзей Бори, и при удалении его аккаунта этот uid уцелел бы навсегда.
 * История подарков лежит у ОБОИХ участников с полем `peerUid` и разрыв дружбы
 * переживает, поэтому закрывает ровно эту дыру.
 *
 * Стоит один индексированный запрос по своей подколлекции — не перебор базы.
 */
async function collectGiftPeerUids(
  db: admin.firestore.Firestore,
  identities: string[],
  stats: DeleteStats,
): Promise<string[]> {
  const peers = new Set<string>();
  for (const identity of identities) {
    if (!identity) continue;
    stats.queriesRun += 1;
    const snap = await db
      .collection('users').doc(identity)
      .collection('friend_gift_history')
      .get();
    for (const doc of snap.docs) {
      const peerUid = String(doc.data()?.peerUid ?? '').trim();
      if (peerUid && !identities.includes(peerUid)) peers.add(peerUid);
    }
  }
  return Array.from(peers);
}

/**
 * Односторонние заявки в друзья симметрии не имеют: `sendFriendRequest` пишет
 * только `users/{toUid}/friend_requests/{myUid}`, у отправителя не остаётся
 * следа. Обратный индекс `users/{myUid}/friend_requests_sent/{toUid}` пишется
 * с этого коммита; для аккаунтов, заведённых раньше, индекса нет — на них
 * работает fallback на полный перебор (гибрид, решение владельца 2026-08-23).
 */
async function collectSentRequestPeerUids(
  db: admin.firestore.Firestore,
  identities: string[],
  stats: DeleteStats,
): Promise<{ peers: string[]; indexPresent: boolean }> {
  const peers = new Set<string>();
  let indexPresent = false;
  for (const identity of identities) {
    if (!identity) continue;
    stats.queriesRun += 1;
    // зачем (ИНЦИДЕНТ 2026-08-29): любой отказ чтения обратного индекса обязан
    // понизить нас до полного перебора, а НЕ отменить удаление целиком.
    let snap: FirebaseFirestore.QuerySnapshot;
    try {
      snap = await db
        .collection('users').doc(identity)
        .collection(FRIEND_REQUESTS_SENT_INDEX)
        .get();
    } catch (e: any) {
      console.warn(JSON.stringify({
        event: 'account_delete_sent_index_unreadable',
        identityHash: hashId(identity),
        code: e?.code ?? 'unknown',
        message: String(e?.message ?? e).slice(0, 160),
      }));
      return { peers: [], indexPresent: false };
    }
    for (const doc of snap.docs) {
      if (doc.id === FRIEND_REQUESTS_SENT_MARKER_ID) {
        indexPresent = true;
        continue;
      }
      if (doc.id && !identities.includes(doc.id)) {
        indexPresent = true;
        peers.add(doc.id);
      }
    }
  }
  return { peers: Array.from(peers), indexPresent };
}

async function deleteCrossUserDocumentIdMatches(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  ctx: DeleteContext,
  stats: DeleteStats,
  peerUids?: string[] | null,
): Promise<void> {
  const plan = accountDeleteCollectionGroupDocumentIdPlan(stableUid, authUid);
  // зачем: узкий путь — идём только по известным peer-uid. Полный перебор базы
  // остаётся аварийным fallback для старых аккаунтов без обратного индекса.
  const userRefs = peerUids
    ? peerUids.map((uid) => db.collection('users').doc(uid))
    : await db.collection('users').listDocuments();
  const concurrency = 20;
  for (let offset = 0; offset < userRefs.length; offset += concurrency) {
    await Promise.all(userRefs.slice(offset, offset + concurrency).map(async (userRef) => {
      const refs = plan.map((spec) => userRef.collection(spec.collectionGroup).doc(spec.value));
      stats.queriesRun += 1;
      const snapshots = await db.getAll(...refs);
      for (const snapshot of snapshots) {
        if (snapshot.exists) await deleteDocTree(ctx, snapshot.ref);
      }
    }));
    if (typeof ctx.writer.flush === 'function') await ctx.writer.flush();
  }
}

async function deleteArenaSessionsAndMatchHistory(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  ctx: DeleteContext,
  stats: DeleteStats,
): Promise<void> {
  const values = Array.from(new Set([stableUid, authUid].filter(Boolean)));
  for (const value of values) {
    for (;;) {
      stats.queriesRun += 1;
      const snap = await db
        .collection('arena_sessions')
        .where('playerIds', 'array-contains', value)
        .limit(DELETE_BATCH_LIMIT)
        .get();
      if (snap.empty) break;
      let scheduledDeletes = 0;
      for (const doc of snap.docs) {
        await deleteQuery(db.collectionGroup('match_history').where('sessionId', '==', doc.id), ctx, stats);
        if (await deleteDocTree(ctx, doc.ref)) scheduledDeletes += 1;
      }
      if (scheduledDeletes === 0) break;
      if (typeof ctx.writer.flush === 'function') {
        await ctx.writer.flush();
      }
    }
  }
}

/**
 * Arena V2 deliberately keeps raw identities only in the sealed private root.
 * Discover matches there first, then remove the public match tree (including
 * opaque member markers) and the private evidence with the same id.
 */
async function deleteArenaV2MatchesForIdentity(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  ctx: DeleteContext,
  stats: DeleteStats,
): Promise<void> {
  const queries: FirebaseFirestore.Query[] = [];
  if (stableUid) {
    queries.push(db.collection('arena_v2_match_private')
      .where('participantStableUids', 'array-contains', stableUid));
  }
  if (authUid) {
    queries.push(db.collection('arena_v2_match_private')
      .where('participantAuthUids', 'array-contains', authUid));
  }
  for (const query of queries) {
    for (;;) {
      stats.queriesRun += 1;
      const snap = await query.limit(DELETE_BATCH_LIMIT).get();
      if (snap.empty) break;
      let scheduled = 0;
      for (const privateDoc of snap.docs) {
        if (await deleteDocTree(ctx, db.collection('arena_v2_matches').doc(privateDoc.id))) scheduled += 1;
        if (await deleteDocTree(ctx, privateDoc.ref)) scheduled += 1;
      }
      if (scheduled === 0) break;
      if (typeof ctx.writer.flush === 'function') await ctx.writer.flush();
    }
  }
}

async function anonymizeActivityLikeStats(
  db: admin.firestore.Firestore,
  stableUid: string,
  stats: DeleteStats,
): Promise<void> {
  for (;;) {
    stats.queriesRun += 1;
    const snap = await db
      .collectionGroup('activity_like_stats')
      .where('lastFromUid', '==', stableUid)
      .limit(DELETE_BATCH_LIMIT)
      .get();
    if (snap.empty) return;
    const batch = db.batch();
    for (const doc of snap.docs) {
      batch.update(doc.ref, {
        lastFromUid: admin.firestore.FieldValue.delete(),
        lastFromName: admin.firestore.FieldValue.delete(),
        updatedAt: Date.now(),
      });
      stats.docsUpdated += 1;
    }
    await batch.commit();
  }
}

async function removeFromFriendGiftDailyLimits(
  db: admin.firestore.Firestore,
  stableUid: string,
  stats: DeleteStats,
  peerUids?: string[] | null,
): Promise<void> {
  const recipientPath = new admin.firestore.FieldPath('recipients', stableUid);
  // `recipients.<stableUid>` is a dynamic map path. Firestore cannot cover every
  // possible uid with one collection-group index, so query each fixed sender
  // subcollection instead. Collection-scoped map-field indexes are automatic.
  //
  // зачем: отправитель подарка обязан быть подтверждённым другом получателя —
  // friend_gifts.ts падает с 'Users are not friends', если нет ОБОИХ документов
  // дружбы. Значит достаточно обойти список друзей, а не всю базу.
  const senderRefs = peerUids
    ? peerUids.map((uid) => db.collection('users').doc(uid))
    : await db.collection('users').listDocuments();
  const concurrency = 20;
  for (let offset = 0; offset < senderRefs.length; offset += concurrency) {
    await Promise.all(senderRefs.slice(offset, offset + concurrency).map(async (senderRef) => {
      for (;;) {
        stats.queriesRun += 1;
        const snap = await senderRef
          .collection('friend_gift_daily_limits')
          .where(recipientPath, '>', 0)
          .limit(DELETE_BATCH_LIMIT)
          .get();
        if (snap.empty) return;
        const batch = db.batch();
        for (const doc of snap.docs) {
          batch.update(
            doc.ref,
            recipientPath,
            admin.firestore.FieldValue.delete(),
            'updatedAt',
            Date.now(),
          );
          stats.docsUpdated += 1;
        }
        await batch.commit();
      }
    }));
  }
}

async function deleteArenaSeasonEntries(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  ctx: DeleteContext,
  stats: DeleteStats,
): Promise<void> {
  const ids = Array.from(new Set([stableUid, authUid].filter(Boolean)));
  stats.queriesRun += 1;
  const seasonRefs = await db.collection('arena_season_leaderboard').listDocuments();
  let scheduledDeletes = 0;
  for (const seasonRef of seasonRefs) {
    for (const id of ids) {
      if (await deleteDocTree(ctx, seasonRef.collection('entries').doc(id))) {
        scheduledDeletes += 1;
      }
    }
  }
  if (scheduledDeletes > 0 && typeof ctx.writer.flush === 'function') {
    await ctx.writer.flush();
  }
}

async function removeFromLeagueGroups(
  db: admin.firestore.Firestore,
  stableUid: string,
  stats: DeleteStats,
): Promise<void> {
  const path = new admin.firestore.FieldPath('members', stableUid, 'uid');
  for (;;) {
    stats.queriesRun += 1;
    const snap = await db.collection('league_groups').where(path, '==', stableUid).limit(DELETE_BATCH_LIMIT).get();
    if (snap.empty) return;
    const batch = db.batch();
    let madeProgress = false;
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const members = data.members && typeof data.members === 'object' ? data.members as Record<string, unknown> : {};
      const hadMember = Object.prototype.hasOwnProperty.call(members, stableUid);
      const nextCount = Math.max(0, Object.keys(members).length - (hadMember ? 1 : 0));
      // зачем (аудит 2026-08-04): комнаты дозаполняются синтетическими жителями.
      // Раньше «остался 0 участников» означало пустую комнату, и она удалялась.
      // Теперь после ухода последнего ЖИВОГО в документе остаётся ~27 жителей,
      // nextCount = 27, и комната-призрак навсегда оседала бы в базе (мусор +
      // деньги за хранение и за то, что её продолжает обходить крон жителей).
      // Решает судьбу документа число живых, а не общее число ключей.
      const nextLiveCount = Object.entries(members).filter(([uid, member]) => (
        uid !== stableUid
        && !uid.startsWith(RESIDENT_UID_PREFIX)
        && (member as Record<string, unknown>)?.isResident !== true
      )).length;
      if (!hadMember && nextCount > 0) continue;
      if (nextLiveCount <= 0) {
        batch.delete(doc.ref);
        stats.docsDeleted += 1;
        madeProgress = true;
      } else {
        batch.update(
          doc.ref,
          new admin.firestore.FieldPath('members', stableUid),
          admin.firestore.FieldValue.delete(),
          'memberCount',
          nextCount,
          'liveMemberCount',
          nextLiveCount,
          'updatedAt',
          Date.now(),
        );
        stats.docsUpdated += 1;
        madeProgress = true;
      }
    }
    if (!madeProgress) throw new HttpsError('internal', 'league_group_delete_no_progress');
    await batch.commit();
  }
}

async function removeFromArenaClubEvents(
  db: admin.firestore.Firestore,
  stableUid: string,
  stats: DeleteStats,
): Promise<void> {
  const path = new admin.firestore.FieldPath('members', stableUid, 'uid');
  for (;;) {
    stats.queriesRun += 1;
    const snap = await db.collection('arena_club_events').where(path, '==', stableUid).limit(DELETE_BATCH_LIMIT).get();
    if (snap.empty) return;
    const batch = db.batch();
    let madeProgress = false;
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const members = data.members && typeof data.members === 'object' ? data.members as Record<string, unknown> : {};
      if (!Object.prototype.hasOwnProperty.call(members, stableUid)) continue;
      batch.update(
        doc.ref,
        new admin.firestore.FieldPath('members', stableUid),
        admin.firestore.FieldValue.delete(),
        'updatedAt',
        Date.now(),
      );
      stats.docsUpdated += 1;
      madeProgress = true;
    }
    if (!madeProgress) return;
    await batch.commit();
  }
}

async function markAccountDeletionTombstone(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  stats: DeleteStats,
): Promise<void> {
  const stableHash = createHash('sha256').update(stableUid).digest('hex');
  const authHash = createHash('sha256').update(authUid).digest('hex');
  await db.collection('account_deletion_log').doc(`${stableHash.slice(0, 16)}_${Date.now()}`).set({
    stableUidHash: stableHash,
    authUidHash: authHash,
    deletedAt: admin.firestore.FieldValue.serverTimestamp(),
    reason: 'user_requested_in_app',
  });
  stats.docsUpdated += 1;
}

export async function executeAccountDeletion(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  authUid: string,
  closureCutoffMs = Date.now(),
  frozenIdentityClosure?: readonly string[],
): Promise<DeleteStats> {
  const stats: DeleteStats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };
  // Queued deletion consumes the closure frozen before credential release. It
  // must not rediscover aliases that may now belong to a fresh generation.
  const identities = frozenIdentityClosure
    ? [...frozenIdentityClosure]
    : await resolveAccountDeleteIdentityClosure(db, stableUid, authUid);
  const ctx = createDeleteContext(db, stableUid, authUid, stats, closureCutoffMs);

  try {
    await runDeleteStage(ctx, stats, 'permanent_denials', () => persistPermanentDeletionDenials(db, identities));
    const emails = [...new Set((await Promise.all(
      identities.map((identity) => getEmailsForDeletion(db, authUid, identity)),
    )).flat())];
    accountDeleteLog(ctx, 'start', stats, { emailCount: emails.length, identityCount: identities.length });
    // зачем: peer-uid обязаны быть собраны ДО стадии direct_docs — она сносит
    // users/{uid} вместе с подколлекцией friends, и после неё обратный индекс
    // прочитать уже неоткуда. peerUids === null означает «индекса нет, работай
    // по-старому полным перебором» (гибрид для аккаунтов до 2026-08-23).
    const peerUids = await runDeleteStage(ctx, stats, 'collect_peers', async () => {
      const friendPeers = await collectFriendPeerUids(db, identities, stats);
      // Подарки переживают разрыв дружбы — история закрывает эту дыру.
      const giftPeers = await collectGiftPeerUids(db, identities, stats);
      const sent = await collectSentRequestPeerUids(db, identities, stats);
      const hasIndex = sent.indexPresent || await hasFriendRequestsSentIndexMarker(db, identities, stats);
      const merged = Array.from(new Set([...friendPeers, ...giftPeers, ...sent.peers]));
      accountDeleteLog(ctx, 'collect_peers', stats, {
        peerCount: merged.length,
        sentIndexPresent: hasIndex,
        fallbackFullScan: !hasIndex,
      });
      // Без индекса исходящих заявок узкий путь может пропустить чужие
      // friend_requests — честнее один раз заплатить за полный перебор.
      return hasIndex ? merged : null;
    });
    await runDeleteStage(ctx, stats, 'direct_docs', async () => {
      for (const identity of identities) await deleteDirectDocs(db, identity, authUid, ctx);
    });
    await runDeleteStage(ctx, stats, 'arena_sessions_and_match_history', async () => {
      for (const identity of identities) await deleteArenaSessionsAndMatchHistory(db, identity, authUid, ctx, stats);
    });
    await runDeleteStage(ctx, stats, 'arena_v2_matches_and_members', async () => {
      for (const identity of identities) await deleteArenaV2MatchesForIdentity(db, identity, authUid, ctx, stats);
    });
    await runDeleteStage(ctx, stats, 'arena_season_entries', async () => {
      for (const identity of identities) await deleteArenaSeasonEntries(db, identity, authUid, ctx, stats);
    });
    await runDeleteStage(ctx, stats, 'field_matches', async () => {
      for (const identity of identities) {
        await deleteFieldMatches(db, identity, authUid, identities, ctx, stats);
      }
    });
    await runDeleteStage(ctx, stats, 'collection_group_matches', async () => {
      for (const identity of identities) {
        await deleteCollectionGroupMatches(db, identity, authUid, ctx, stats, peerUids);
      }
    });
    await runDeleteStage(ctx, stats, 'email_matches', () => deleteEmailMatches(db, emails, ctx, stats));
    await runDeleteStage(ctx, stats, 'league_groups', async () => {
      for (const identity of identities) await removeFromLeagueGroups(db, identity, stats);
    });
    await runDeleteStage(ctx, stats, 'arena_club_events', async () => {
      for (const identity of identities) await removeFromArenaClubEvents(db, identity, stats);
    });
    await runDeleteStage(ctx, stats, 'activity_like_stats', async () => {
      for (const identity of identities) await anonymizeActivityLikeStats(db, identity, stats);
    });
    await runDeleteStage(ctx, stats, 'friend_gift_daily_limits', async () => {
      for (const identity of identities) {
        await removeFromFriendGiftDailyLimits(db, identity, stats, peerUids);
      }
    });
    await runDeleteStage(ctx, stats, 'merge_identity_records', () => (
      deleteMergeIdentityRecords(db, identities, ctx, stats)
    ));
    await closeDeleteWriter(ctx);
    await runDeleteStage(ctx, stats, 'tombstone', () => markAccountDeletionTombstone(db, stableUid, authUid, stats));

    try {
      await admin.auth().deleteUser(authUid);
      stats.authDeleted = true;
    } catch (e: any) {
      if (e?.code !== 'auth/user-not-found') {
        throw new HttpsError('internal', 'auth_delete_failed');
      }
    }

    accountDeleteLog(ctx, 'done', stats);
    // зачем: диагностика в Firestore — единственный след, который владелец
    // видит без доступа в Cloud Logging. Пишем и на успехе тоже: без «как
    // выглядит норма» невозможно понять, что именно сломалось в отказе.
    await persistAccountDeleteDiagnostics(db, ctx, stats, 'completed');
    return stats;
  } catch (e: any) {
    accountDeleteLog(ctx, 'failed', stats, {
      failedStage: ctx.failedStage ?? 'unknown_stage',
      code: ctx.failedStageCode ?? e?.code ?? 'unknown',
      message: (ctx.failedStageMessage ?? String(e?.message ?? e)).slice(0, 200),
      totalMs: Date.now() - ctx.startedAtMs,
    });
    await persistAccountDeleteDiagnostics(db, ctx, stats, 'failed');
    if (e instanceof HttpsError) throw e;
    // зачем (ИНЦИДЕНТ 2026-08-29): раньше здесь стояло голое
    // 'account_delete_failed'. Настоящая причина уходила только в Cloud
    // Logging, а в job.lastError попадала безликая строка — из-за этого баг
    // `__index__` прожил незамеченным пять боевых удалений подряд. Причину
    // обязаны видеть и владелец, и админка, НЕ открывая GCP.
    //
    // Формат «стадия|код|сообщение» выбран так, чтобы по одному полю job было
    // видно ГДЕ упало (стадия), ПОЧЕМУ (код) и ЧТО именно (сообщение).
    const stage = ctx.failedStage ?? 'unknown_stage';
    const code = ctx.failedStageCode ?? String(e?.code ?? 'unknown');
    const message = ctx.failedStageMessage ?? String(e?.message ?? e);
    throw new HttpsError(
      'internal',
      `account_delete_failed at ${stage} | ${code} | ${message}`.slice(0, 240),
    );
  } finally {
    if (!ctx.writerClosed) {
      await closeDeleteWriter(ctx).catch((e) => {
        console.warn(JSON.stringify({
          event: 'account_delete_writer_close_failed',
          runId: ctx.runId,
          message: String(e?.message ?? e).slice(0, 160),
        }));
      });
    }
  }
}

export async function enqueueForAuthenticatedAccount(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  requestedStableId: unknown,
  enqueue: typeof enqueueAccountDeletionJob = enqueueAccountDeletionJob,
  deps: {
    fence?: typeof fenceAccountDeletionRoots;
    resolveClosure?: typeof resolveAccountDeleteIdentityClosure;
  } = {},
) {
  const stableUid = await resolveStableUidForDelete(db, authUid, requestedStableId);
  await (deps.fence ?? fenceAccountDeletionRoots)(db, authUid, stableUid);
  const identityClosure = await (deps.resolveClosure ?? resolveAccountDeleteIdentityClosure)(
    db, stableUid, authUid,
  );
  const result = await enqueue(db, authUid, stableUid, Date.now(), undefined, identityClosure);
  return { ok: true as const, ...result };
}

type AccountDeleteCredentialProof = {
  operationId: string;
  capability: string;
};

function cleanCredentialProof(input: AccountDeleteCredentialProof): AccountDeleteCredentialProof {
  const operationId = typeof input?.operationId === 'string' ? input.operationId.trim() : '';
  const capability = typeof input?.capability === 'string' ? input.capability.trim() : '';
  if (
    operationId.length < 16
    || operationId.length > 220
    || operationId.includes('/')
    || capability.length < 43
    || capability.length > 256
  ) {
    throw new HttpsError('permission-denied', 'account_delete_credential_pending');
  }
  return { operationId, capability };
}

function credentialCapabilityHash(capability: string): string {
  return createHash('sha256').update(capability).digest('hex');
}

function constantTimeHashEquals(left: unknown, right: string): boolean {
  const actual = Buffer.from(typeof left === 'string' ? left : '', 'utf8');
  const expected = Buffer.from(right, 'utf8');
  if (actual.length !== expected.length) {
    timingSafeEqual(expected, Buffer.alloc(expected.length));
    return false;
  }
  return timingSafeEqual(actual, expected);
}

function credentialReceiptDecision(
  data: Record<string, unknown>,
  expectedHash: string,
  nowMs: number,
):
  | { kind: 'credential_safe'; jobId: string }
  | { kind: 'repair_fenced'; jobId: string; authUid: string; stableUid: string; attempts: number; rateWindowStartedAtMs: number }
  | { kind: 'repair'; jobId: string; attempts: number; rateWindowStartedAtMs: number }
  | { kind: 'rate_limited' }
  | { kind: 'denied' } {
  const jobId = typeof data.jobId === 'string' ? data.jobId : '';
  const storedAttempts = Math.max(0, Math.floor(Number(data.attempts) || 0));
  const storedWindowStartedAtMs = Number(data.rateWindowStartedAtMs ?? 0);
  const windowActive = Number.isFinite(storedWindowStartedAtMs)
    && storedWindowStartedAtMs > 0
    && nowMs - storedWindowStartedAtMs < ACCOUNT_DELETE_RECEIPT_RATE_WINDOW_MS;
  const attempts = windowActive ? storedAttempts : 0;
  const rateWindowStartedAtMs = windowActive ? storedWindowStartedAtMs : nowMs;
  const expiresAtMs = Number(data.expiresAtMs ?? 0);
  if (
    !constantTimeHashEquals(data.capabilityHash, expectedHash)
    || !jobId
  ) return { kind: 'denied' };
  if (data.stage === 'credential_safe') return { kind: 'credential_safe', jobId };
  // `closure_fenced` is irreversible. Expiry may bound receipt retention, but
  // it must not strand an already-fenced deletion after a long offline period.
  // A valid sealed capability can only finish deletion and reveals no identity.
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= 0) return { kind: 'denied' };
  if (attempts >= ACCOUNT_DELETE_RECEIPT_MAX_ATTEMPTS) return { kind: 'rate_limited' };
  if (data.stage === 'closure_fenced') {
    const authUid = typeof data.authUid === 'string' ? data.authUid : '';
    const stableUid = typeof data.stableUid === 'string' ? data.stableUid : '';
    if (
      !authUid
      || !stableUid
      || jobId !== accountDeleteJobId(authUid)
      || data.authUidHash !== credentialCapabilityHash(authUid)
      || data.stableUidHash !== credentialCapabilityHash(stableUid)
    ) return { kind: 'denied' };
    return {
      kind: 'repair_fenced',
      jobId,
      authUid,
      stableUid,
      attempts,
      rateWindowStartedAtMs,
    };
  }
  if (data.stage !== 'closure_committed') return { kind: 'denied' };
  return { kind: 'repair', jobId, attempts, rateWindowStartedAtMs };
}

async function publishCredentialSafeReceipt(
  db: FirebaseFirestore.Firestore,
  operationId: string,
  nowMs = Date.now(),
): Promise<void> {
  await db.collection(ACCOUNT_DELETE_CREDENTIAL_RECEIPTS)
    .doc(accountDeleteCredentialReceiptId(operationId))
    .set({
      stage: 'credential_safe',
      credentialSafeAtMs: nowMs,
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}

export async function enqueueAndReleaseAuthenticatedAccount(
  db: FirebaseFirestore.Firestore,
  authUid: string,
  requestedStableId: unknown,
  rawProof: AccountDeleteCredentialProof,
  deps: {
    enqueue?: typeof enqueueAccountDeletionJob;
    fence?: typeof fenceAccountDeletionCredential;
    resolveClosure?: typeof resolveAccountDeleteIdentityClosure;
    deleteUser?: (uid: string) => Promise<unknown>;
    publishCredentialSafe?: (operationId: string) => Promise<void>;
  } = {},
) {
  const proof = cleanCredentialProof(rawProof);
  const stableUid = await resolveStableUidForDelete(db, authUid, requestedStableId);
  const enqueue = deps.enqueue ?? enqueueAccountDeletionJob;
  const receipt = {
    operationId: proof.operationId,
    capabilityHash: credentialCapabilityHash(proof.capability),
  };
  await (deps.fence ?? fenceAccountDeletionCredential)(
    db,
    authUid,
    stableUid,
    Date.now(),
    receipt,
  );
  const identityClosure = await (deps.resolveClosure ?? resolveAccountDeleteIdentityClosure)(
    db,
    stableUid,
    authUid,
  );
  const result = await enqueue(
    db,
    authUid,
    stableUid,
    Date.now(),
    receipt,
    identityClosure,
  );
  try {
    await (deps.deleteUser ?? ((uid: string) => admin.auth().deleteUser(uid)))(authUid);
  } catch (error: any) {
    if (error?.code !== 'auth/user-not-found') {
      throw new HttpsError('unavailable', 'account_delete_auth_release_failed');
    }
  }
  await (deps.publishCredentialSafe
    ?? ((operationId: string) => publishCredentialSafeReceipt(db, operationId)))(proof.operationId);
  return {
    ok: true as const,
    ...result,
    authReleased: true as const,
    credentialSafe: true as const,
  };
}

async function readCredentialReceiptForRepair(
  db: FirebaseFirestore.Firestore,
  proof: AccountDeleteCredentialProof,
  nowMs = Date.now(),
): Promise<
  | { stage: 'closure_fenced'; jobId: string; authUid: string; stableUid: string }
  | { stage: 'closure_committed' | 'credential_safe'; jobId: string }
> {
  const ref = db.collection(ACCOUNT_DELETE_CREDENTIAL_RECEIPTS)
    .doc(accountDeleteCredentialReceiptId(proof.operationId));
  return db.runTransaction(async (tx) => {
    const snapshot = await tx.get(ref);
    const data = snapshot.exists ? snapshot.data() ?? {} : {};
    const expectedHash = credentialCapabilityHash(proof.capability);
    if (!snapshot.exists) {
      throw new HttpsError('permission-denied', 'account_delete_credential_pending');
    }
    const decision = credentialReceiptDecision(data, expectedHash, nowMs);
    if (decision.kind === 'denied') {
      throw new HttpsError('permission-denied', 'account_delete_credential_pending');
    }
    if (decision.kind === 'rate_limited') {
      throw new HttpsError('resource-exhausted', 'account_delete_credential_pending');
    }
    if (decision.kind === 'credential_safe') {
      return { stage: 'credential_safe' as const, jobId: decision.jobId };
    }
    tx.update(ref, {
      attempts: decision.attempts + 1,
      rateWindowStartedAtMs: decision.rateWindowStartedAtMs,
      lastCheckedAtMs: nowMs,
      updatedAtMs: nowMs,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return decision.kind === 'repair_fenced'
      ? {
        stage: 'closure_fenced' as const,
        jobId: decision.jobId,
        authUid: decision.authUid,
        stableUid: decision.stableUid,
      }
      : { stage: 'closure_committed' as const, jobId: decision.jobId };
  });
}

export async function repairAccountDeleteCredentialSafety(
  db: FirebaseFirestore.Firestore,
  rawProof: AccountDeleteCredentialProof,
  deleteUser: (uid: string) => Promise<unknown> = (uid) => admin.auth().deleteUser(uid),
  deps: {
    readReceipt?: typeof readCredentialReceiptForRepair;
    resolveClosure?: typeof resolveAccountDeleteIdentityClosure;
    enqueue?: typeof enqueueAccountDeletionJob;
    publishCredentialSafe?: (operationId: string) => Promise<void>;
  } = {},
): Promise<{ status: 'credential_safe' }> {
  const proof = cleanCredentialProof(rawProof);
  const receipt = await (deps.readReceipt ?? readCredentialReceiptForRepair)(db, proof);
  if (receipt.stage === 'credential_safe') return { status: 'credential_safe' };

  let authUid: string;
  if (receipt.stage === 'closure_fenced') {
    authUid = receipt.authUid;
    const identityClosure = await (deps.resolveClosure ?? resolveAccountDeleteIdentityClosure)(
      db,
      receipt.stableUid,
      receipt.authUid,
    );
    await (deps.enqueue ?? enqueueAccountDeletionJob)(
      db,
      receipt.authUid,
      receipt.stableUid,
      Date.now(),
      {
        operationId: proof.operationId,
        capabilityHash: credentialCapabilityHash(proof.capability),
      },
      identityClosure,
    );
  } else {
    const jobSnapshot = await db.collection('account_deletion_jobs').doc(receipt.jobId).get();
    const job = jobSnapshot.exists ? jobSnapshot.data() ?? {} : {};
    authUid = typeof job.authUid === 'string' ? job.authUid : '';
    if (job.status !== 'completed' && !authUid) {
      throw new HttpsError('failed-precondition', 'account_delete_credential_pending');
    }
  }
  if (authUid) {
    try {
      await deleteUser(authUid);
    } catch (error: any) {
      if (error?.code !== 'auth/user-not-found') {
        throw new HttpsError('unavailable', 'account_delete_credential_pending');
      }
    }
  }
  await (deps.publishCredentialSafe
    ?? ((operationId: string) => publishCredentialSafeReceipt(db, operationId)))(proof.operationId);
  return { status: 'credential_safe' };
}

export const accountDeleteEnqueue = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_SENSITIVE,
  timeoutSeconds: 15,
  memory: '256MiB' as const,
  maxInstances: 80,
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const result = await enqueueAndReleaseAuthenticatedAccount(
    admin.firestore(),
    request.auth.uid,
    request.data?.stableId,
    {
      operationId: request.data?.operationId,
      capability: request.data?.capability,
    },
  );
  return result;
});

export const accountDeleteCredentialStatus = onCall({
  region: REGION,
  // Owner seal: capability security replaces App Check for this unauthenticated receipt.
  enforceAppCheck: false,
  timeoutSeconds: 15,
  memory: '256MiB' as const,
  maxInstances: 40,
}, async (request) => repairAccountDeleteCredentialSafety(
  admin.firestore(),
  {
    operationId: request.data?.operationId,
    capability: request.data?.capability,
  },
));

export const accountDeleteMine = onCall(ACCOUNT_DELETE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForDelete(db, authUid, request.data?.stableId);
  const closureCutoffMs = Date.now();
  await fenceAccountDeletionRoots(db, authUid, stableUid, closureCutoffMs);
  const identityClosure = await resolveAccountDeleteIdentityClosure(db, stableUid, authUid);
  const stats = await executeAccountDeletion(
    db,
    stableUid,
    authUid,
    closureCutoffMs,
    identityClosure,
  );
  return { ok: true, stableUid, authUid, ...stats };
});

export const __accountDeleteTestHooks = {
  accountDeleteQueryPlan,
  accountDeleteCollectionGroupPlan,
  accountDeleteCollectionGroupDocumentIdPlan,
  accountDeleteDirectDocumentPlan,
  FIELD_QUERY_SPECS,
  COLLECTION_GROUP_QUERY_SPECS,
  COLLECTION_GROUP_DOCUMENT_ID_SPECS,
  DIRECT_DOCUMENT_SPECS,
  resolveStableUidForDelete,
  resolveAccountDeleteIdentityClosure,
  enqueueForAuthenticatedAccount,
  enqueueAndReleaseAuthenticatedAccount,
  repairAccountDeleteCredentialSafety,
  credentialReceiptDecision,
  accountDeleteEmailQueryCollections,
  emailMatchDocumentBelongsToDeletionGeneration,
  removeFromFriendGiftDailyLimits,
  deleteCrossUserDocumentIdMatches,
  deleteArenaSeasonEntries,
  deleteQuery,
  deleteMutableIdentityIndexSnapshotIfStillOwned,
  persistPermanentDeletionDenials,
  deleteDirectDocs,
  deleteMergeIdentityRecords,
  ACCOUNT_DELETE_OPTIONS,
};
