import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const DELETE_BATCH_LIMIT = 100;
const MAX_ID_LEN = 180;

const ACCOUNT_DELETE_OPTIONS = {
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 540,
  memory: '1GiB' as const,
  maxInstances: 20,
} as const;

type DeleteStats = {
  docsDeleted: number;
  docsUpdated: number;
  queriesRun: number;
  authDeleted: boolean;
};

type QueryValueKind = 'stable' | 'auth' | 'both';
type QueryOp = '==' | 'array-contains';

export type AccountDeleteQuerySpec = {
  collection: string;
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
  { collection: 'league_chat_messages', field: 'authorUid', values: 'stable' },
  { collection: 'league_chat_messages', field: 'authUid', values: 'auth' },
  { collection: 'league_chat_moderation_queue', field: 'authorUid', values: 'stable' },
  { collection: 'league_chat_moderation_queue', field: 'authUid', values: 'auth' },
  { collection: 'league_chat_reports', field: 'authorUid', values: 'stable' },
  { collection: 'league_chat_reports', field: 'reporterUid', values: 'stable' },
  { collection: 'league_chat_reports', field: 'reporterAuthUid', values: 'auth' },
  { collection: 'league_chat_bans', field: 'authUid', values: 'auth' },
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
  { collection: 'subscription_cancel_surveys', field: 'uid', values: 'stable' },
  { collection: 'revenuecat_premium_events', field: 'uid', values: 'both' },
  { collection: 'revenuecat_premium_events', field: 'candidates', values: 'both', op: 'array-contains' },
  { collection: 'revenuecat_shard_transactions', field: 'uid', values: 'both' },
  { collection: 'revenuecat_shard_transactions', field: 'candidates', values: 'both', op: 'array-contains' },
  { collection: 'league_chest_claims', field: 'uid', values: 'stable' },
  { collection: 'league_chest_claims', field: 'authUid', values: 'auth' },
  { collection: 'league_crowns', field: 'uid', values: 'stable' },
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
    const direct = await db.collection('users').doc(authUid).get().catch(() => null);
    if (direct?.exists) return authUid;

    const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
    if (!byAuth.empty) return byAuth.docs[0].id;

    const authLinkSnap = await db.collection('auth_links').doc(authUid).get().catch(() => null);
    const linkedStableId = cleanId(authLinkSnap?.data()?.stable_id);
    if (linkedStableId) return linkedStableId;

    return authUid;
  };

  const requested = cleanId(requestedStableId);
  if (requested) {
    if (requested === authUid) return requested;
    const [userSnap, authLinkSnap] = await Promise.all([
      db.collection('users').doc(requested).get().catch(() => null),
      db.collection('auth_links').doc(authUid).get().catch(() => null),
    ]);
    const linkedAuthUid = cleanId(userSnap?.data()?.firebaseAuthUid);
    const linkedStableId = cleanId(authLinkSnap?.data()?.stable_id);
    if (linkedAuthUid && linkedAuthUid !== authUid && linkedStableId !== requested) {
      throw new HttpsError('permission-denied', 'stable_id_mismatch');
    }
    if (userSnap?.exists || linkedStableId === requested) return requested;
    return resolveKnownStableUid();
  }

  return resolveKnownStableUid();
}

async function deleteDocTree(
  ref: FirebaseFirestore.DocumentReference,
  stats: DeleteStats,
  seen: Set<string>,
): Promise<void> {
  if (seen.has(ref.path)) return;
  seen.add(ref.path);

  const subcollections = await ref.listCollections();
  for (const col of subcollections) {
    await deleteQuery(col, stats, seen);
  }
  await ref.delete();
  stats.docsDeleted += 1;
}

async function deleteQuery(
  query: FirebaseFirestore.Query,
  stats: DeleteStats,
  seen: Set<string>,
): Promise<void> {
  for (;;) {
    stats.queriesRun += 1;
    const snap = await query.limit(DELETE_BATCH_LIMIT).get();
    if (snap.empty) return;
    for (const doc of snap.docs) {
      await deleteDocTree(doc.ref, stats, seen);
    }
  }
}

async function deleteDirectDocs(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  stats: DeleteStats,
  seen: Set<string>,
): Promise<void> {
  const ids = Array.from(new Set([stableUid, authUid].filter(Boolean)));
  const directCollections = [
    'users',
    'leaderboard',
    'arena_profiles',
    'matchmaking_queue',
    'arena_room_chat_rate',
    'league_chat_bans',
    'referral_owners',
    'referral_attributions',
    'auth_links',
  ];
  for (const collection of directCollections) {
    for (const id of ids) {
      await deleteDocTree(db.collection(collection).doc(id), stats, seen);
    }
  }
  await deleteDocTree(db.collection('league_chat_members').doc(authUid), stats, seen);
}

async function deleteFieldMatches(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  stats: DeleteStats,
  seen: Set<string>,
): Promise<void> {
  for (const spec of accountDeleteQueryPlan(stableUid, authUid)) {
    const q = db.collection(spec.collection).where(spec.field, spec.op, spec.value);
    await deleteQuery(q, stats, seen);
  }
}

async function deleteEmailMatches(
  db: admin.firestore.Firestore,
  emails: string[],
  stats: DeleteStats,
  seen: Set<string>,
): Promise<void> {
  for (const email of emails) {
    await deleteQuery(db.collection('website_contact_inbox').where('email', '==', email), stats, seen);
    await deleteQuery(db.collection('auth_links').where('email', '==', email), stats, seen);
  }
}

async function deleteCollectionGroupMatches(
  db: admin.firestore.Firestore,
  stableUid: string,
  authUid: string,
  stats: DeleteStats,
  seen: Set<string>,
): Promise<void> {
  const values = Array.from(new Set([stableUid, authUid].filter(Boolean)));
  for (const value of values) {
    await deleteQuery(db.collectionGroup('messages').where('authorUid', '==', value), stats, seen);
    await deleteQuery(db.collectionGroup('messages').where('authorStableUid', '==', value), stats, seen);
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
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const members = data.members && typeof data.members === 'object' ? data.members as Record<string, unknown> : {};
      const nextCount = Math.max(0, Object.keys(members).length - (members[stableUid] ? 1 : 0));
      if (nextCount <= 0) {
        batch.delete(doc.ref);
        stats.docsDeleted += 1;
      } else {
        batch.set(doc.ref, {
          [`members.${stableUid}`]: admin.firestore.FieldValue.delete(),
          memberCount: nextCount,
          updatedAt: Date.now(),
        }, { merge: true });
        stats.docsUpdated += 1;
      }
    }
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

export const accountDeleteMine = onCall(ACCOUNT_DELETE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');

  const db = admin.firestore();
  const authUid = request.auth.uid;
  const stableUid = await resolveStableUidForDelete(db, authUid, request.data?.stableId);
  const stats: DeleteStats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };
  const seen = new Set<string>();
  const emails = await getEmailsForDeletion(db, authUid, stableUid);

  await deleteDirectDocs(db, stableUid, authUid, stats, seen);
  await deleteFieldMatches(db, stableUid, authUid, stats, seen);
  await deleteCollectionGroupMatches(db, stableUid, authUid, stats, seen);
  await deleteEmailMatches(db, emails, stats, seen);
  await removeFromLeagueGroups(db, stableUid, stats);
  await markAccountDeletionTombstone(db, stableUid, authUid, stats);

  try {
    await admin.auth().deleteUser(authUid);
    stats.authDeleted = true;
  } catch (e: any) {
    if (e?.code !== 'auth/user-not-found') {
      throw new HttpsError('internal', 'auth_delete_failed');
    }
  }

  return { ok: true, stableUid, authUid, ...stats };
});

export const __accountDeleteTestHooks = {
  accountDeleteQueryPlan,
  FIELD_QUERY_SPECS,
  resolveStableUidForDelete,
};
