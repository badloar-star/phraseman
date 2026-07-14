import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK_SENSITIVE } from './callable_options';
import { enqueueAccountDeletionJob } from './account_delete_job';

const REGION = 'us-central1';
const DELETE_BATCH_LIMIT = 100;
const ACCOUNT_DELETE_TIMEOUT_SECONDS = 540;
const ACCOUNT_DELETE_PROGRESS_LOG_DOCS = 500;
const MAX_ID_LEN = 180;

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
  lastProgressLogDocs: number;
  writerClosed: boolean;
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
  { collection: 'arena_room_chat_rate', field: 'authUid', values: 'auth' },
  { collection: 'arena_pulse_events', field: 'authUid', values: 'auth' },
  { collection: 'arena_pulse_events', field: 'stableUid', values: 'stable' },
  { collection: 'arena_ghost_challenges', field: 'ownerUid', values: 'auth' },
  { collection: 'arena_ghost_challenges', field: 'ownerStableUid', values: 'stable' },
  { collection: 'arena_ghost_challenges', field: 'lastPlayedBy', values: 'auth' },
  { collection: 'arena_ghost_challenges', field: 'lastPlayedStableUid', values: 'stable' },
  { collection: 'arena_hill_attempts', field: 'stableUid', values: 'stable' },
  { collection: 'arena_hill_thrones', field: 'championUid', values: 'stable' },
  { collection: 'arena_hill_thrones', field: 'championAuthUid', values: 'auth' },
  { collection: 'arena_club_contributions', field: 'arenaUid', values: 'auth' },
  { collection: 'arena_club_contributions', field: 'stableUid', values: 'stable' },
  { collection: 'league_chat_messages', field: 'authorUid', values: 'stable' },
  { collection: 'league_chat_messages', field: 'authUid', values: 'auth' },
  { collection: 'league_chat_messages', field: 'authorAuthUid', values: 'auth' },
  { collection: 'league_chat_moderation_queue', field: 'authorUid', values: 'stable' },
  { collection: 'league_chat_moderation_queue', field: 'authUid', values: 'auth' },
  { collection: 'league_chat_moderation_queue', field: 'authorAuthUid', values: 'auth' },
  { collection: 'league_chat_reports', field: 'authorUid', values: 'stable' },
  { collection: 'league_chat_reports', field: 'reporterUid', values: 'stable' },
  { collection: 'league_chat_reports', field: 'reporterAuthUid', values: 'auth' },
  { collection: 'league_chat_bans', field: 'authUid', values: 'auth' },
  { collection: 'help_board_topics', field: 'authorUid', values: 'stable' },
  { collection: 'help_board_topics', field: 'authorAuthUid', values: 'auth' },
  { collection: 'help_board_comments', field: 'authorUid', values: 'stable' },
  { collection: 'help_board_comments', field: 'authorAuthUid', values: 'auth' },
  { collection: 'help_board_reports', field: 'authorUid', values: 'stable' },
  { collection: 'help_board_reports', field: 'reporterUid', values: 'stable' },
  { collection: 'help_board_reports', field: 'reporterAuthUid', values: 'auth' },
  { collection: 'help_board_votes', field: 'stableUid', values: 'stable' },
  { collection: 'help_board_votes', field: 'authUid', values: 'auth' },
  { collection: 'help_board_restrictions', field: 'uid', values: 'stable' },
  { collection: 'help_board_compass_billing', field: 'uid', values: 'stable' },
  { collection: 'help_board_compass_billing', field: 'authUid', values: 'auth' },
  { collection: 'help_board_moderation_queue', field: 'authorUid', values: 'stable' },
  { collection: 'help_board_moderation_queue', field: 'authorAuthUid', values: 'auth' },
  { collection: 'user_reports', field: 'reportedUid', values: 'both' },
  { collection: 'user_reports', field: 'reporterUid', values: 'both' },
  { collection: 'community_pack_reports', field: 'authorStableId', values: 'stable' },
  { collection: 'community_pack_reports', field: 'reporterUid', values: 'both' },
  { collection: 'community_pack_submissions', field: 'authorStableId', values: 'stable' },
  { collection: 'community_pack_submissions', field: 'callerAuthUid', values: 'auth' },
  { collection: 'community_packs', field: 'authorStableId', values: 'stable' },
  { collection: 'community_pack_purchases', field: 'buyerStableId', values: 'stable' },
  { collection: 'community_pack_purchases', field: 'authorStableId', values: 'stable' },
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
  { collection: 'review_promo_claims', field: 'uid', values: 'stable' },
  { collection: 'vip_survey_responses', field: 'uid', values: 'stable' },
  { collection: 'shard_survey_responses', field: 'uid', values: 'stable' },
  { collection: 'subscription_cancel_surveys', field: 'uid', values: 'stable' },
  { collection: 'revenuecat_premium_events', field: 'uid', values: 'both' },
  { collection: 'revenuecat_premium_events', field: 'candidates', values: 'both', op: 'array-contains' },
  { collection: 'revenuecat_shard_transactions', field: 'uid', values: 'both' },
  { collection: 'revenuecat_shard_transactions', field: 'candidates', values: 'both', op: 'array-contains' },
  { collection: 'league_chest_claims', field: 'uid', values: 'stable' },
  { collection: 'league_chest_claims', field: 'authUid', values: 'auth' },
  { collection: 'league_crowns', field: 'uid', values: 'stable' },
  { collection: 'daily_phrase_saves', field: 'uid', values: 'stable' },
  { collection: 'daily_phrase_saves', field: 'authUid', values: 'auth' },
];

const COLLECTION_GROUP_QUERY_SPECS: AccountDeleteCollectionGroupSpec[] = [
  { collectionGroup: 'messages', field: 'authorUid', values: 'both' },
  { collectionGroup: 'messages', field: 'authorStableUid', values: 'both' },
  { collectionGroup: 'reactions', field: 'userId', values: 'stable' },
  { collectionGroup: 'poll_votes', field: 'userId', values: 'stable' },
  { collectionGroup: 'activity_likes_received', field: 'fromUid', values: 'stable' },
  { collectionGroup: 'friend_activity_like_daily_limits', field: 'targetUid', values: 'stable' },
  { collectionGroup: 'friend_gifts_received', field: 'fromUid', values: 'stable' },
  { collectionGroup: 'friend_gifts_sent', field: 'toUid', values: 'stable' },
  { collectionGroup: 'friend_gift_history', field: 'peerUid', values: 'stable' },
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

function createDeleteContext(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  stats: DeleteStats,
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
    lastProgressLogDocs: 0,
    writerClosed: false,
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

async function runDeleteStage(
  ctx: DeleteContext,
  stats: DeleteStats,
  stage: string,
  fn: () => Promise<void>,
): Promise<void> {
  accountDeleteLog(ctx, `${stage}:start`, stats);
  await fn();
  accountDeleteLog(ctx, `${stage}:done`, stats);
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
    if (linkedStableId) return linkedStableId;
    if (linkedAuthUid === authUid) return requested;
    if (linkedAuthUid && linkedAuthUid !== authUid) {
      throw new HttpsError('permission-denied', 'stable_id_mismatch');
    }
    return resolveKnownStableUid();
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

async function deleteDirectDocs(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  ctx: DeleteContext,
): Promise<void> {
  const ids = Array.from(new Set([stableUid, authUid].filter(Boolean)));
  const directCollections = [
    'users',
    'leaderboard',
    'arena_profiles',
    'matchmaking_queue',
    'arena_room_chat_rate',
    'league_chat_rate_limits',
    'league_chat_report_rate_limits',
    'league_chat_bans',
    'league_chat_members',
    'help_board_rate_limits',
    'help_board_restrictions',
    'shard_survey_rate_limits',
    'user_consents',
    'referral_owners',
    'referral_attributions',
    'auth_links',
  ];
  for (const collection of directCollections) {
    for (const id of ids) {
      await deleteDocTree(ctx, db.collection(collection).doc(id));
    }
  }
}

async function deleteFieldMatches(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  ctx: DeleteContext,
  stats: DeleteStats,
): Promise<void> {
  for (const spec of accountDeleteQueryPlan(stableUid, authUid)) {
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
    await deleteQuery(db.collection('website_contact_inbox').where('email', '==', email), ctx, stats);
    await deleteQuery(db.collection('auth_links').where('email', '==', email), ctx, stats);
  }
}

async function deleteCollectionGroupMatches(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  ctx: DeleteContext,
  stats: DeleteStats,
): Promise<void> {
  for (const spec of accountDeleteCollectionGroupPlan(stableUid, authUid)) {
    const q = db.collectionGroup(spec.collectionGroup).where(spec.field, spec.op, spec.value);
    await deleteQuery(q, ctx, stats);
  }
  await deleteCrossUserDocumentIdMatches(db, stableUid, authUid, ctx, stats);
}

async function deleteCrossUserDocumentIdMatches(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  ctx: DeleteContext,
  stats: DeleteStats,
): Promise<void> {
  const plan = accountDeleteCollectionGroupDocumentIdPlan(stableUid, authUid);
  const userRefs = await db.collection('users').listDocuments();
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
): Promise<void> {
  const recipientPath = new admin.firestore.FieldPath('recipients', stableUid);
  // `recipients.<stableUid>` is a dynamic map path. Firestore cannot cover every
  // possible uid with one collection-group index, so query each fixed sender
  // subcollection instead. Collection-scoped map-field indexes are automatic.
  const senderRefs = await db.collection('users').listDocuments();
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
      if (!hadMember && nextCount > 0) continue;
      if (nextCount <= 0) {
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
): Promise<DeleteStats> {
  const stats: DeleteStats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };
  const ctx = createDeleteContext(db, stableUid, authUid, stats);
  const emails = await getEmailsForDeletion(db, authUid, stableUid);

  try {
    accountDeleteLog(ctx, 'start', stats, { emailCount: emails.length });
    await runDeleteStage(ctx, stats, 'direct_docs', () => deleteDirectDocs(db, stableUid, authUid, ctx));
    await runDeleteStage(ctx, stats, 'arena_sessions_and_match_history', () => deleteArenaSessionsAndMatchHistory(db, stableUid, authUid, ctx, stats));
    await runDeleteStage(ctx, stats, 'field_matches', () => deleteFieldMatches(db, stableUid, authUid, ctx, stats));
    await runDeleteStage(ctx, stats, 'collection_group_matches', () => deleteCollectionGroupMatches(db, stableUid, authUid, ctx, stats));
    await runDeleteStage(ctx, stats, 'email_matches', () => deleteEmailMatches(db, emails, ctx, stats));
    await runDeleteStage(ctx, stats, 'league_groups', () => removeFromLeagueGroups(db, stableUid, stats));
    await runDeleteStage(ctx, stats, 'arena_club_events', () => removeFromArenaClubEvents(db, stableUid, stats));
    await runDeleteStage(ctx, stats, 'activity_like_stats', () => anonymizeActivityLikeStats(db, stableUid, stats));
    await runDeleteStage(ctx, stats, 'friend_gift_daily_limits', () => removeFromFriendGiftDailyLimits(db, stableUid, stats));
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
    return stats;
  } catch (e: any) {
    accountDeleteLog(ctx, 'failed', stats, {
      code: e?.code ?? 'unknown',
      message: String(e?.message ?? e).slice(0, 160),
    });
    if (e instanceof HttpsError) throw e;
    throw new HttpsError('internal', 'account_delete_failed');
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
) {
  const stableUid = await resolveStableUidForDelete(db, authUid, requestedStableId);
  const result = await enqueue(db, authUid, stableUid);
  return { ok: true as const, ...result };
}

export const accountDeleteEnqueue = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK_SENSITIVE,
  timeoutSeconds: 15,
  memory: '256MiB' as const,
  maxInstances: 80,
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  return enqueueForAuthenticatedAccount(
    admin.firestore(),
    request.auth.uid,
    request.data?.stableId,
  );
});

export const accountDeleteMine = onCall(ACCOUNT_DELETE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForDelete(db, authUid, request.data?.stableId);
  const stats = await executeAccountDeletion(db, stableUid, authUid);
  return { ok: true, stableUid, authUid, ...stats };
});

export const __accountDeleteTestHooks = {
  accountDeleteQueryPlan,
  accountDeleteCollectionGroupPlan,
  accountDeleteCollectionGroupDocumentIdPlan,
  FIELD_QUERY_SPECS,
  COLLECTION_GROUP_QUERY_SPECS,
  COLLECTION_GROUP_DOCUMENT_ID_SPECS,
  resolveStableUidForDelete,
  enqueueForAuthenticatedAccount,
  removeFromFriendGiftDailyLimits,
  deleteCrossUserDocumentIdMatches,
  deleteQuery,
  ACCOUNT_DELETE_OPTIONS,
};
