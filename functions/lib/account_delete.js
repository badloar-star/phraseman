"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.__accountDeleteTestHooks = exports.accountDeleteMine = void 0;
exports.accountDeleteQueryPlan = accountDeleteQueryPlan;
const admin = __importStar(require("firebase-admin"));
const crypto_1 = require("crypto");
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const REGION = 'us-central1';
const DELETE_BATCH_LIMIT = 100;
const ACCOUNT_DELETE_TIMEOUT_SECONDS = 540;
const ACCOUNT_DELETE_PROGRESS_LOG_DOCS = 500;
const MAX_ID_LEN = 180;
const ACCOUNT_DELETE_OPTIONS = {
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: ACCOUNT_DELETE_TIMEOUT_SECONDS,
    memory: '1GiB',
    maxInstances: 20,
};
const FIELD_QUERY_SPECS = [
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
function cleanId(value) {
    return String(value ?? '').trim().slice(0, MAX_ID_LEN);
}
function queryValues(spec, stableUid, authUid) {
    if (spec.values === 'stable')
        return [stableUid].filter(Boolean);
    if (spec.values === 'auth')
        return [authUid].filter(Boolean);
    return Array.from(new Set([stableUid, authUid].filter(Boolean)));
}
function accountDeleteQueryPlan(stableUid, authUid) {
    const out = [];
    for (const spec of FIELD_QUERY_SPECS) {
        for (const value of queryValues(spec, stableUid, authUid)) {
            out.push({ ...spec, value, op: spec.op ?? '==' });
        }
    }
    return out;
}
function hashId(value) {
    return (0, crypto_1.createHash)('sha256').update(value).digest('hex');
}
function accountDeleteLog(ctx, stage, stats, extra = {}) {
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
function createDeleteContext(db, stableUid, authUid, stats) {
    const stableUidHash = hashId(stableUid);
    const authUidHash = hashId(authUid);
    const ctx = {
        db,
        writer: null,
        seen: new Set(),
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
async function closeDeleteWriter(ctx) {
    if (ctx.writerClosed)
        return;
    ctx.writerClosed = true;
    await ctx.writer.close();
}
async function runDeleteStage(ctx, stats, stage, fn) {
    accountDeleteLog(ctx, `${stage}:start`, stats);
    await fn();
    accountDeleteLog(ctx, `${stage}:done`, stats);
}
async function getEmailsForDeletion(db, authUid, stableUid) {
    const emails = new Set();
    const add = (value) => {
        const email = String(value ?? '').trim().toLowerCase();
        if (email && email.includes('@') && email.length <= 320)
            emails.add(email);
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
async function resolveStableUidForDelete(db, authUid, requestedStableId) {
    const resolveKnownStableUid = async () => {
        const direct = await db.collection('users').doc(authUid).get().catch(() => null);
        if (direct?.exists)
            return authUid;
        const byAuth = await db.collection('users').where('firebaseAuthUid', '==', authUid).limit(1).get();
        if (!byAuth.empty)
            return byAuth.docs[0].id;
        const authLinkSnap = await db.collection('auth_links').doc(authUid).get().catch(() => null);
        const linkedStableId = cleanId(authLinkSnap?.data()?.stable_id);
        if (linkedStableId)
            return linkedStableId;
        return authUid;
    };
    const requested = cleanId(requestedStableId);
    if (requested) {
        if (requested === authUid)
            return requested;
        const [userSnap, authLinkSnap] = await Promise.all([
            db.collection('users').doc(requested).get().catch(() => null),
            db.collection('auth_links').doc(authUid).get().catch(() => null),
        ]);
        const linkedAuthUid = cleanId(userSnap?.data()?.firebaseAuthUid);
        const linkedStableId = cleanId(authLinkSnap?.data()?.stable_id);
        if (linkedAuthUid && linkedAuthUid !== authUid && linkedStableId !== requested) {
            throw new https_1.HttpsError('permission-denied', 'stable_id_mismatch');
        }
        if (userSnap?.exists || linkedStableId === requested)
            return requested;
        return resolveKnownStableUid();
    }
    return resolveKnownStableUid();
}
async function deleteDocTree(ctx, ref) {
    if (ctx.seen.has(ref.path))
        return;
    ctx.seen.add(ref.path);
    await ctx.db.recursiveDelete(ref, ctx.writer);
}
async function deleteQuery(query, ctx, stats) {
    for (;;) {
        const docsDeletedBefore = stats.docsDeleted;
        stats.queriesRun += 1;
        const snap = await query.limit(DELETE_BATCH_LIMIT).get();
        if (snap.empty)
            return;
        for (const doc of snap.docs) {
            await deleteDocTree(ctx, doc.ref);
        }
        if (stats.docsDeleted === docsDeletedBefore) {
            throw new https_1.HttpsError('internal', 'account_delete_no_progress');
        }
    }
}
async function deleteDirectDocs(db, stableUid, authUid, ctx) {
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
            await deleteDocTree(ctx, db.collection(collection).doc(id));
        }
    }
    await deleteDocTree(ctx, db.collection('league_chat_members').doc(authUid));
}
async function deleteFieldMatches(db, stableUid, authUid, ctx, stats) {
    for (const spec of accountDeleteQueryPlan(stableUid, authUid)) {
        const q = db.collection(spec.collection).where(spec.field, spec.op, spec.value);
        await deleteQuery(q, ctx, stats);
    }
}
async function deleteEmailMatches(db, emails, ctx, stats) {
    for (const email of emails) {
        await deleteQuery(db.collection('website_contact_inbox').where('email', '==', email), ctx, stats);
        await deleteQuery(db.collection('auth_links').where('email', '==', email), ctx, stats);
    }
}
async function deleteCollectionGroupMatches(db, stableUid, authUid, ctx, stats) {
    const values = Array.from(new Set([stableUid, authUid].filter(Boolean)));
    for (const value of values) {
        await deleteQuery(db.collectionGroup('messages').where('authorUid', '==', value), ctx, stats);
        await deleteQuery(db.collectionGroup('messages').where('authorStableUid', '==', value), ctx, stats);
    }
}
async function removeFromLeagueGroups(db, stableUid, stats) {
    const path = new admin.firestore.FieldPath('members', stableUid, 'uid');
    for (;;) {
        stats.queriesRun += 1;
        const snap = await db.collection('league_groups').where(path, '==', stableUid).limit(DELETE_BATCH_LIMIT).get();
        if (snap.empty)
            return;
        const batch = db.batch();
        let madeProgress = false;
        for (const doc of snap.docs) {
            const data = doc.data() || {};
            const members = data.members && typeof data.members === 'object' ? data.members : {};
            const hadMember = Object.prototype.hasOwnProperty.call(members, stableUid);
            const nextCount = Math.max(0, Object.keys(members).length - (hadMember ? 1 : 0));
            if (!hadMember && nextCount > 0)
                continue;
            if (nextCount <= 0) {
                batch.delete(doc.ref);
                stats.docsDeleted += 1;
                madeProgress = true;
            }
            else {
                batch.update(doc.ref, new admin.firestore.FieldPath('members', stableUid), admin.firestore.FieldValue.delete(), 'memberCount', nextCount, 'updatedAt', Date.now());
                stats.docsUpdated += 1;
                madeProgress = true;
            }
        }
        if (!madeProgress)
            throw new https_1.HttpsError('internal', 'league_group_delete_no_progress');
        await batch.commit();
    }
}
async function markAccountDeletionTombstone(db, stableUid, authUid, stats) {
    const stableHash = (0, crypto_1.createHash)('sha256').update(stableUid).digest('hex');
    const authHash = (0, crypto_1.createHash)('sha256').update(authUid).digest('hex');
    await db.collection('account_deletion_log').doc(`${stableHash.slice(0, 16)}_${Date.now()}`).set({
        stableUidHash: stableHash,
        authUidHash: authHash,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        reason: 'user_requested_in_app',
    });
    stats.docsUpdated += 1;
}
exports.accountDeleteMine = (0, https_1.onCall)(ACCOUNT_DELETE_OPTIONS, async (request) => {
    if (!request.auth?.uid)
        throw new https_1.HttpsError('unauthenticated', 'auth_required');
    const db = admin.firestore();
    const authUid = request.auth.uid;
    const stableUid = await resolveStableUidForDelete(db, authUid, request.data?.stableId);
    const stats = { docsDeleted: 0, docsUpdated: 0, queriesRun: 0, authDeleted: false };
    const ctx = createDeleteContext(db, stableUid, authUid, stats);
    const emails = await getEmailsForDeletion(db, authUid, stableUid);
    try {
        accountDeleteLog(ctx, 'start', stats, { emailCount: emails.length });
        await runDeleteStage(ctx, stats, 'direct_docs', () => deleteDirectDocs(db, stableUid, authUid, ctx));
        await runDeleteStage(ctx, stats, 'field_matches', () => deleteFieldMatches(db, stableUid, authUid, ctx, stats));
        await runDeleteStage(ctx, stats, 'collection_group_matches', () => deleteCollectionGroupMatches(db, stableUid, authUid, ctx, stats));
        await runDeleteStage(ctx, stats, 'email_matches', () => deleteEmailMatches(db, emails, ctx, stats));
        await runDeleteStage(ctx, stats, 'league_groups', () => removeFromLeagueGroups(db, stableUid, stats));
        await closeDeleteWriter(ctx);
        await runDeleteStage(ctx, stats, 'tombstone', () => markAccountDeletionTombstone(db, stableUid, authUid, stats));
        try {
            await admin.auth().deleteUser(authUid);
            stats.authDeleted = true;
        }
        catch (e) {
            if (e?.code !== 'auth/user-not-found') {
                throw new https_1.HttpsError('internal', 'auth_delete_failed');
            }
        }
        accountDeleteLog(ctx, 'done', stats);
        return { ok: true, stableUid, authUid, ...stats };
    }
    catch (e) {
        accountDeleteLog(ctx, 'failed', stats, {
            code: e?.code ?? 'unknown',
            message: String(e?.message ?? e).slice(0, 160),
        });
        if (e instanceof https_1.HttpsError)
            throw e;
        throw new https_1.HttpsError('internal', 'account_delete_failed');
    }
    finally {
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
});
exports.__accountDeleteTestHooks = {
    accountDeleteQueryPlan,
    FIELD_QUERY_SPECS,
    resolveStableUidForDelete,
    deleteQuery,
    ACCOUNT_DELETE_OPTIONS,
};
//# sourceMappingURL=account_delete.js.map