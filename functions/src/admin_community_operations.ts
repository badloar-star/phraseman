import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import type { AdminPermission } from './admin/permissions';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  applyNativePatch, approveNativeMutation, asRecord, boundedLimit, cleanText, createNativePreview,
  documentVersion, parseMutationEnvelope, readBoundedCollection, requestNativeApproval,
  requireNativePermission, safeProjection, stableHash, type NativeRow,
} from './admin_native_operations';

if (admin.apps.length === 0) admin.initializeApp();
const REGION = 'us-central1';

const COMMUNITY_SOURCES = Object.freeze({
  'mod-queue': 'community_pack_submissions', 'help-board': 'help_board_topics', 'helpers-board': 'top_helpers',
  clubs: 'league_groups', 'league-chat': 'league_chat_moderation_queue', 'arena-ranks': 'arena_profiles',
  'arena-live': 'arena_sessions', 'arena-bets': 'app_meta', 'arena-rooms': 'arena_rooms_live',
} as const);
type CommunityCapability = keyof typeof COMMUNITY_SOURCES;

export function parseCommunityWorkspaceInput(value: unknown) {
  const data = asRecord(value); const capabilityId = cleanText(data.capabilityId || 'mod-queue', 60) as CommunityCapability;
  if (!Object.prototype.hasOwnProperty.call(COMMUNITY_SOURCES, capabilityId)) throw new Error('invalid_community_capability');
  return { capabilityId, limit: boundedLimit(data.limit), cursor: cleanText(data.cursor, 200) };
}

export function isSafeArenaPlaceholder(value: unknown): boolean {
  const row = asRecord(value); const stats = asRecord(row.stats); const name = cleanText(row.displayName, 120);
  return (!name || name === 'Игрок' || name === 'Гравець' || name === '—') && Number(stats.matchesPlayed || 0) === 0;
}

type CommunityPlan = { collection: string; requiredPermission: AdminPermission; consequence: string; allowMissing?: boolean; deletionTargets?: readonly string[] };
export function buildCommunityMutationPlan(action: string, _targetId: string, _before: NativeRow, _payload: NativeRow): CommunityPlan {
  switch (action) {
    case 'mod-queue-status': return { collection: 'community_pack_submissions', requiredPermission: 'community.moderate', consequence: 'Updates one community submission decision; global bans remain in Safety & Moderation.' };
    case 'help-topic-status': return { collection: 'help_board_topics', requiredPermission: 'community.help.write', consequence: 'Updates one Help Board topic workflow status.' };
    case 'helpers-description': return { collection: 'remote_config', requiredPermission: 'community.help.write', consequence: 'Updates the public helpers-board description only.' };
    case 'league-chat-status': return { collection: 'league_chat_moderation_queue', requiredPermission: 'community.chat.write', consequence: 'Approves or rejects one queued league-chat message; global bans are not available here.' };
    case 'arena-profile-resync': return { collection: 'arena_profiles', requiredPermission: 'community.arena.write', consequence: 'Copies a non-placeholder name from the canonical users profile into one Arena profile.' };
    case 'arena-placeholder-cleanup': return { collection: 'admin_native_bulk_manifests', requiredPermission: 'community.arena.destructive', consequence: 'Creates a resumable manifest that may delete only zero-match placeholder arena_profiles; users and Auth are never targets.', allowMissing: true, deletionTargets: ['arena_profiles'] };
    case 'arena-wager-flag': return { collection: 'app_meta', requiredPermission: 'community.arena.economy.write', consequence: 'Changes ranked wager availability and therefore Arena economy behavior.' };
    case 'arena-room-close': return { collection: 'arena_rooms_live', requiredPermission: 'community.arena.write', consequence: 'Closes one Arena room and deactivates its active member rows.' };
    default: throw new Error('unsupported_community_action');
  }
}

function planFor(input: ReturnType<typeof parseMutationEnvelope>) {
  try { return buildCommunityMutationPlan(input.action, input.targetId, {}, input.payload); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'unsupported_community_action'); }
}
function readPermission(capabilityId: CommunityCapability): AdminPermission { return capabilityId === 'help-board' || capabilityId === 'helpers-board' ? 'community.help.read' : 'community.read'; }

export const adminGetCommunityOperationsWorkspace = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  let input: ReturnType<typeof parseCommunityWorkspaceInput>; try { input = parseCommunityWorkspaceInput(request.data); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_community_input'); }
  const { role } = requireNativePermission(request, readPermission(input.capabilityId)); const source = COMMUNITY_SOURCES[input.capabilityId];
  try { const page = await readBoundedCollection(admin.firestore(), source, input.limit, input.cursor); return { ok: true, capabilityId: input.capabilityId, ...page, role, sourceHealth: [{ source, state: 'ready', count: page.items.length }], safetyRoute: '#safety-moderation' }; }
  catch (error) { return { ok: true, capabilityId: input.capabilityId, items: [], nextCursor: '', truncated: false, role, sourceHealth: [{ source, state: 'error', message: cleanText(error instanceof Error ? error.message : error, 240) }], safetyRoute: '#safety-moderation' }; }
});

export const adminGetCommunityOperationDetail = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const data = asRecord(request.data); const capabilityId = cleanText(data.capabilityId, 60) as CommunityCapability; const id = cleanText(data.id, 200);
  if (!id || !Object.prototype.hasOwnProperty.call(COMMUNITY_SOURCES, capabilityId)) throw new HttpsError('invalid-argument', 'valid capabilityId and id required');
  requireNativePermission(request, readPermission(capabilityId)); const snap = await admin.firestore().collection(COMMUNITY_SOURCES[capabilityId]).doc(id).get(); if (!snap.exists) throw new HttpsError('not-found', 'community_row_not_found');
  return { ok: true, item: { id: snap.id, ...asRecord(safeProjection(snap.data())), version: documentVersion(snap.id, snap.data()) }, safetyRoute: '#safety-moderation' };
});

export const adminPreviewCommunityMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const input = parseMutationEnvelope(request.data); const plan = planFor(input); const actor = requireNativePermission(request, plan.requiredPermission); let payload = input.payload;
  if (input.action === 'arena-placeholder-cleanup') {
    if (input.expectedVersion !== 'missing') throw new HttpsError('invalid-argument', 'new cleanup manifest requires expectedVersion=missing');
    const snap = await admin.firestore().collection('arena_profiles').orderBy(admin.firestore.FieldPath.documentId()).limit(500).get();
    const targetIds = snap.docs.filter((doc) => isSafeArenaPlaceholder(doc.data())).map((doc) => doc.id);
    const manifestFingerprint = stableHash({ collection: 'arena_profiles', targetIds });
    payload = { targetCollection: 'arena_profiles', targetIds, manifestFingerprint, nextIndex: 0, total: targetIds.length, status: 'prepared', usersDeletionAllowed: false, authDeletionAllowed: false };
  }
  return createNativePreview({ db: admin.firestore(), packageId: 'community', ...actor, collection: plan.collection, action: input.action, targetId: input.targetId, reason: input.reason, expectedVersion: input.expectedVersion, payload, consequence: plan.consequence, requiredPermission: plan.requiredPermission, requiresApproval: true, allowMissing: plan.allowMissing });
});

export const adminRequestCommunityApproval = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { actorUid } = requireNativePermission(request, 'community.read'); const data = asRecord(request.data); return requestNativeApproval(admin.firestore(), actorUid, cleanText(data.previewId, 160), cleanText(data.confirmation, 240));
});
export const adminApproveCommunityMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { actorUid } = requireNativePermission(request, 'community.approve'); const data = asRecord(request.data); return approveNativeMutation(admin.firestore(), actorUid, cleanText(data.previewId, 160), cleanText(data.reason, 500));
});

const COMMUNITY_ACTIONS = new Set(['mod-queue-status', 'help-topic-status', 'helpers-description', 'league-chat-status', 'arena-profile-resync', 'arena-placeholder-cleanup', 'arena-wager-flag', 'arena-room-close']);
export const adminApplyCommunityMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const actor = requireNativePermission(request, 'community.read'); const data = asRecord(request.data);
  return applyNativePatch({ db: admin.firestore(), packageId: 'community', ...actor, previewId: cleanText(data.previewId, 160), confirmation: cleanText(data.confirmation, 240), idempotencyKey: cleanText(data.idempotencyKey, 160), allowedActions: COMMUNITY_ACTIONS,
    transform: async ({ action, before, payload, nowMs, db, tx, targetId }) => {
      const iso = new Date(nowMs).toISOString();
      if (action === 'mod-queue-status') { const status = cleanText(payload.status, 40); if (!['approved', 'rejected', 'removed'].includes(status)) throw new HttpsError('invalid-argument', 'invalid moderation status'); return { status, moderatedAt: iso, moderatedByUid: actor.actorUid }; }
      if (action === 'help-topic-status') { const status = cleanText(payload.status, 40); if (!['open', 'resolved', 'hidden'].includes(status)) throw new HttpsError('invalid-argument', 'invalid help status'); return { status, moderatedAtMs: nowMs, moderatedByUid: actor.actorUid }; }
      if (action === 'helpers-description') { return { texts: { ...asRecord(before.texts), top_helpers_description: cleanText(payload.description, 500) }, updatedAtIso: iso, updatedByUid: actor.actorUid }; }
      if (action === 'league-chat-status') { const status = cleanText(payload.status, 40); if (!['approved', 'rejected'].includes(status)) throw new HttpsError('invalid-argument', 'invalid chat status'); return { decision: status, status, decidedAt: nowMs, decidedByUid: actor.actorUid }; }
      if (action === 'arena-profile-resync') { const userSnap = await tx.get(db.collection('users').doc(targetId)); const name = cleanText(asRecord(userSnap.data()?.progress).user_name, 120); if (!userSnap.exists || !name || ['Игрок', 'Гравець', '—'].includes(name)) throw new HttpsError('failed-precondition', 'canonical_name_unavailable'); return { displayName: name, updatedAt: nowMs, updatedByUid: actor.actorUid }; }
      if (action === 'arena-placeholder-cleanup') { const ids = Array.isArray(payload.targetIds) ? payload.targetIds.map((id) => cleanText(id, 160)).filter(Boolean) : []; const manifestFingerprint = stableHash({ collection: 'arena_profiles', targetIds: ids }); if (manifestFingerprint !== payload.manifestFingerprint) throw new HttpsError('failed-precondition', 'manifest_fingerprint_mismatch'); return { targetCollection: 'arena_profiles', targetIds: ids, manifestFingerprint, nextIndex: 0, total: ids.length, status: 'approved', usersDeletionAllowed: false, authDeletionAllowed: false, createdAtMs: nowMs, createdByUid: actor.actorUid }; }
      if (action === 'arena-wager-flag') return { rankedWagerEnabled: payload.enabled === true, updatedAt: nowMs, updatedByUid: actor.actorUid };
      if (action === 'arena-room-close') { const code = cleanText(before.code || targetId, 80); const members = await tx.get(db.collection('arena_room_members').where('code', '==', code).where('active', '==', true).limit(100)); for (const member of members.docs) tx.set(member.ref, { active: false, leftAt: nowMs, closedByAdminUid: actor.actorUid }, { merge: true }); return { status: 'closed', closedAt: nowMs, closedByUid: actor.actorUid }; }
      throw new HttpsError('invalid-argument', 'unsupported_community_action');
    },
  });
});

export const adminResumeCommunityBulk = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const actor = requireNativePermission(request, 'community.arena.destructive'); const data = asRecord(request.data); const manifestId = cleanText(data.manifestId, 160); const idempotencyKey = cleanText(data.idempotencyKey, 160);
  if (!manifestId || !idempotencyKey) throw new HttpsError('invalid-argument', 'manifestId and idempotencyKey required'); const db = admin.firestore(); const manifestRef = db.collection('admin_native_bulk_manifests').doc(manifestId); const operationRef = db.collection('admin_command_operations').doc(idempotencyKey);
  return db.runTransaction(async (tx) => {
    const [manifestSnap, operationSnap] = await Promise.all([tx.get(manifestRef), tx.get(operationRef)]); if (operationSnap.exists) return { ok: true, replayed: true, ...asRecord(operationSnap.data()) }; if (!manifestSnap.exists) throw new HttpsError('not-found', 'manifest_not_found');
    const manifest = asRecord(manifestSnap.data()); const ids = Array.isArray(manifest.targetIds) ? manifest.targetIds.map((id) => cleanText(id, 160)).filter(Boolean) : []; const manifestFingerprint = stableHash({ collection: 'arena_profiles', targetIds: ids }); if (manifest.targetCollection !== 'arena_profiles' || manifest.manifestFingerprint !== manifestFingerprint || manifest.usersDeletionAllowed !== false || manifest.authDeletionAllowed !== false) throw new HttpsError('failed-precondition', 'unsafe_manifest');
    const start = Math.max(0, Math.floor(Number(manifest.nextIndex) || 0)); const batchIds = ids.slice(start, start + 25); const profiles = await Promise.all(batchIds.map((id) => tx.get(db.collection('arena_profiles').doc(id)))); let deleted = 0;
    profiles.forEach((snap) => { if (snap.exists && isSafeArenaPlaceholder(snap.data())) { tx.delete(snap.ref); deleted += 1; } }); const nextIndex = start + batchIds.length; const done = nextIndex >= ids.length; tx.set(manifestRef, { nextIndex, status: done ? 'completed' : 'in_progress', lastBatchDeleted: deleted, updatedAtMs: Date.now(), updatedByUid: actor.actorUid }, { merge: true }); tx.create(operationRef, { packageId: 'community', action: 'arena-placeholder-cleanup.resume', manifestId, manifestFingerprint, actorUid: actor.actorUid, start, nextIndex, deleted, done, createdAtMs: Date.now() }); return { ok: true, replayed: false, manifestId, manifestFingerprint, nextIndex, deleted, done };
  });
});
