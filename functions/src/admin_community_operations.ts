import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission, type AdminPermission } from './admin/permissions';
import { createAuditRecord } from './admin/audit_contract';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  applyCommunitySubmissionModerationInTransaction,
  type CommunitySubmissionModerationAction,
} from './community_packs';
import {
  buildHelpBoardAdminContentPatch,
  buildHelpBoardAdminReportResolutionPatch,
  buildHelpBoardAdminRestrictionPatch,
  buildHelpBoardAdminTopic,
  type HelpBoardAdminContentAction,
  type HelpBoardAdminRestrictionAction,
} from './help_board';
import {
  buildLeagueChatAdminMessage,
  buildLeagueChatAdminMessageModerationPatch,
  buildLeagueChatAdminRestrictionPatch,
  type LeagueChatAdminMessageAction,
  type LeagueChatAdminRestrictionAction,
} from './league_chat';
import {
  applyNativePatch, approveNativeMutation, asRecord, boundedLimit, cleanText, createNativePreview,
  documentVersion, parseMutationEnvelope, projectNativeRow, readBoundedCollection, requestNativeApproval,
  requireNativePermission, stableHash, type NativeRow,
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
  return { capabilityId, limit: boundedLimit(data.limit), cursor: cleanText(data.cursor, 200), query: cleanText(data.query, 120).toLowerCase(), status: cleanText(data.status, 40) };
}

function filterCommunityRows(items: NativeRow[], query: string, status: string): NativeRow[] { return items.filter((item) => (!status || cleanText(item.status || item.decision || item.state, 40) === status) && (!query || JSON.stringify(item).toLowerCase().includes(query))); }

const LEAGUE_CHAT_MESSAGE_FIELDS = Object.freeze([
  'groupId', 'weekId', 'leagueId', 'authorUid', 'authorAuthUid', 'authorName', 'authorAvatar', 'authorAura',
  'text', 'normalizedText', 'moderationCategories', 'moderationReasons', 'replyToMessageId', 'replyToAuthorUid',
  'replyToAuthorName', 'replyToText', 'replyToKind', 'platform', 'appVersion', 'createdAt',
] as const);

export function buildApprovedLeagueChatMessage(queueRow: NativeRow, queueId: string, nowMs: number): NativeRow {
  const message: NativeRow = {};
  for (const field of LEAGUE_CHAT_MESSAGE_FIELDS) if (queueRow[field] !== undefined) message[field] = queueRow[field];
  if (!cleanText(message.groupId, 160) || !cleanText(message.weekId, 160) || !cleanText(message.authorUid, 160) || !cleanText(message.text, 2000)) {
    throw new HttpsError('failed-precondition', 'queued_league_message_missing_canonical_fields');
  }
  return { ...message, status: 'visible', reportCount: 0, updatedAt: nowMs, approvedFromQueueId: queueId };
}

export function isSafeArenaPlaceholder(value: unknown): boolean {
  const row = asRecord(value); const stats = asRecord(row.stats); const name = cleanText(row.displayName, 120);
  const playedValues = [stats.matchesPlayed, row['stats.matchesPlayed'], row.matchesPlayed]
    .map((item) => Number(item || 0))
    .filter(Number.isFinite);
  const matchesPlayed = playedValues.length ? Math.max(...playedValues) : 0;
  return (!name || name === 'Игрок' || name === 'Гравець' || name === '—') && matchesPlayed === 0;
}

async function loadSafeArenaPlaceholderIds(db: FirebaseFirestore.Firestore): Promise<string[]> {
  const ids: string[] = []; let cursor = ''; let scanned = 0; const pageSize = 400; const hardCap = 20_000; const scanCap = 100_000;
  while (scanned <= scanCap) {
    let query: FirebaseFirestore.Query = db.collection('arena_profiles').orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    for (const doc of snapshot.docs) if (isSafeArenaPlaceholder(doc.data())) ids.push(doc.id);
    scanned += snapshot.size;
    if (ids.length > hardCap) throw new HttpsError('resource-exhausted', 'arena_profile_manifest_exceeds_safe_cap');
    if (snapshot.size < pageSize) return ids;
    cursor = snapshot.docs[snapshot.docs.length - 1]?.id || '';
    if (!cursor) return ids;
  }
  throw new HttpsError('resource-exhausted', 'arena_profile_scan_exceeds_safe_cap');
}

type CommunityPlan = { collection: string; requiredPermission: AdminPermission; consequence: string; allowMissing?: boolean; deletionTargets?: readonly string[] };
export function buildCommunityMutationPlan(action: string, _targetId: string, _before: NativeRow, _payload: NativeRow): CommunityPlan {
  switch (action) {
    case 'mod-queue-status': return { collection: 'community_pack_submissions', requiredPermission: 'community.moderate', consequence: 'Updates one community submission decision; global bans remain in Safety & Moderation.' };
    case 'help-topic-status': return { collection: 'help_board_topics', requiredPermission: 'community.help.write', consequence: 'Updates one Help Board topic workflow status.' };
    case 'help-comment-status': return { collection: 'help_board_comments', requiredPermission: 'community.help.write', consequence: 'Hides or restores one Help Board comment.' };
    case 'help-report-resolve': return { collection: 'help_board_reports', requiredPermission: 'community.help.write', consequence: 'Resolves one Help Board report without creating a global ban.' };
    case 'help-queue-status': return { collection: 'help_board_moderation_queue', requiredPermission: 'community.help.write', consequence: 'Records the moderator decision for one Help Board review-queue item.' };
    case 'help-restriction': return { collection: 'help_board_restrictions', requiredPermission: 'community.help.write', consequence: 'Creates or removes a Help Board-only posting restriction.', allowMissing: true };
    case 'help-admin-post': return { collection: 'help_board_topics', requiredPermission: 'community.help.write', consequence: 'Creates an administrator Help Board topic.', allowMissing: true };
    case 'helpers-description': return { collection: 'remote_config', requiredPermission: 'community.help.write', consequence: 'Updates the public helpers-board description only.' };
    case 'league-chat-status': return { collection: 'league_chat_moderation_queue', requiredPermission: 'community.chat.write', consequence: 'Approves or rejects one queued league-chat message; global bans are not available here.' };
    case 'league-chat-report': return { collection: 'league_chat_reports', requiredPermission: 'community.chat.write', consequence: 'Resolves one league-chat report.' };
    case 'league-chat-message-status': return { collection: 'league_chat_messages', requiredPermission: 'community.chat.write', consequence: 'Deletes or restores one already-published league-chat message.' };
    case 'league-chat-restriction': return { collection: 'league_chat_bans', requiredPermission: 'community.chat.write', consequence: 'Changes a league-chat-only restriction; global bans remain in Safety.', allowMissing: true };
    case 'league-chat-admin-message': return { collection: 'league_chat_messages', requiredPermission: 'community.chat.write', consequence: 'Posts an audited administrator message to one league room.', allowMissing: true };
    case 'arena-profile-resync': return { collection: 'arena_profiles', requiredPermission: 'community.arena.write', consequence: 'Copies a non-placeholder name from the canonical users profile into one Arena profile.' };
    case 'arena-placeholder-cleanup': return { collection: 'admin_native_bulk_manifests', requiredPermission: 'community.arena.destructive', consequence: 'Creates a resumable manifest that may delete only zero-match placeholder arena_profiles; users and Auth are never targets.', allowMissing: true, deletionTargets: ['arena_profiles'] };
    case 'arena-wager-flag': return { collection: 'app_meta', requiredPermission: 'community.arena.economy.write', consequence: 'Changes ranked wager availability and therefore Arena economy behavior.' };
    case 'arena-room-close': return { collection: 'arena_rooms_live', requiredPermission: 'community.arena.write', consequence: 'Closes one Arena room and deactivates its active member rows.' };
    case 'arena-room-delete': return { collection: 'arena_rooms_live', requiredPermission: 'community.arena.destructive', consequence: 'Deletes one stale Arena room after second-admin approval.' };
    case 'arena-session-finish': return { collection: 'arena_sessions', requiredPermission: 'community.arena.write', consequence: 'Explicitly aborts one stuck Arena session; reads never trigger this action.' };
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
  const { role } = requireNativePermission(request, readPermission(input.capabilityId)); const source = COMMUNITY_SOURCES[input.capabilityId]; const db = admin.firestore(); const revealIdentity = hasPermission(role, 'users.read');
  try {
    const sourceMap: Partial<Record<CommunityCapability, string[]>> = {
      'mod-queue': ['community_pack_submissions', 'help_board_reports', 'league_chat_moderation_queue'],
      'help-board': ['help_board_topics', 'help_board_comments', 'help_board_reports', 'help_board_moderation_queue', 'help_board_restrictions'],
      'helpers-board': ['top_helpers'],
      clubs: ['league_groups', 'league_chest_events', 'league_crowns'],
      'league-chat': ['league_groups', 'league_chat_moderation_queue', 'league_chat_reports', 'league_chat_messages', 'league_chat_bans'],
      'arena-live': ['matchmaking_queue', 'arena_sessions', 'arena_rooms'],
      'arena-rooms': ['arena_rooms_live', 'arena_room_members'],
    };
    const sources = sourceMap[input.capabilityId];
    if (sources) { const pages = await Promise.all(sources.map((name) => readBoundedCollection(db, name, input.limit, '', revealIdentity))); const allItems = pages.flatMap((page, index) => page.items.map((item) => ({ ...item, source: sources[index] }))); return { ok: true, capabilityId: input.capabilityId, items: filterCommunityRows(allItems, input.query, input.status), sections: Object.fromEntries(sources.map((name, index) => [name, pages[index].items])), truncated: pages.some((page) => page.truncated), nextCursor: '', role, sourceHealth: sources.map((name, index) => ({ source: name, state: 'ready', count: pages[index].items.length })), safetyRoute: '#safety-moderation' }; }
    const page = await readBoundedCollection(db, source, input.limit, input.cursor, revealIdentity); return { ok: true, capabilityId: input.capabilityId, ...page, items: filterCommunityRows(page.items, input.query, input.status), role, sourceHealth: [{ source, state: 'ready', count: page.items.length }], safetyRoute: '#safety-moderation' };
  }
  catch (error) { return { ok: true, capabilityId: input.capabilityId, items: [], nextCursor: '', truncated: false, role, sourceHealth: [{ source, state: 'error', message: cleanText(error instanceof Error ? error.message : error, 240) }], safetyRoute: '#safety-moderation' }; }
});

export const adminGetCommunityOperationDetail = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const data = asRecord(request.data); const capabilityId = cleanText(data.capabilityId, 60) as CommunityCapability; const id = cleanText(data.id, 200); const requestedSource = cleanText(data.source, 120);
  if (!id || !Object.prototype.hasOwnProperty.call(COMMUNITY_SOURCES, capabilityId)) throw new HttpsError('invalid-argument', 'valid capabilityId and id required');
  const allowedSources: Partial<Record<CommunityCapability, readonly string[]>> = { 'mod-queue': ['community_pack_submissions', 'help_board_reports', 'league_chat_moderation_queue'], 'help-board': ['help_board_topics', 'help_board_comments', 'help_board_reports', 'help_board_moderation_queue', 'help_board_restrictions'], 'helpers-board': ['top_helpers'], clubs: ['league_groups', 'league_chest_events', 'league_crowns'], 'league-chat': ['league_groups', 'league_chat_moderation_queue', 'league_chat_reports', 'league_chat_messages', 'league_chat_bans'], 'arena-live': ['matchmaking_queue', 'arena_sessions', 'arena_rooms'], 'arena-rooms': ['arena_rooms_live', 'arena_room_members'] };
  const source = requestedSource && allowedSources[capabilityId]?.includes(requestedSource) ? requestedSource : COMMUNITY_SOURCES[capabilityId];
  const { role } = requireNativePermission(request, readPermission(capabilityId)); const snap = await admin.firestore().collection(source).doc(id).get(); if (!snap.exists) throw new HttpsError('not-found', 'community_row_not_found');
  return { ok: true, item: { id: snap.id, ...asRecord(projectNativeRow(snap.data(), hasPermission(role, 'users.read'))), version: documentVersion(snap.id, snap.data()) }, safetyRoute: '#safety-moderation' };
});

export const adminPreviewCommunityMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const input = parseMutationEnvelope(request.data); const plan = planFor(input); const actor = requireNativePermission(request, plan.requiredPermission); let payload = input.payload;
  if (['help-admin-post', 'league-chat-admin-message'].includes(input.action) && input.expectedVersion !== 'missing') {
    throw new HttpsError('invalid-argument', `${input.action} requires expectedVersion=missing`);
  }
  if (input.action === 'arena-placeholder-cleanup') {
    if (input.expectedVersion !== 'missing') throw new HttpsError('invalid-argument', 'new cleanup manifest requires expectedVersion=missing');
    const targetIds = await loadSafeArenaPlaceholderIds(admin.firestore());
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

const COMMUNITY_ACTIONS = new Set(['mod-queue-status', 'help-topic-status', 'help-comment-status', 'help-report-resolve', 'help-queue-status', 'help-restriction', 'help-admin-post', 'helpers-description', 'league-chat-status', 'league-chat-report', 'league-chat-message-status', 'league-chat-restriction', 'league-chat-admin-message', 'arena-profile-resync', 'arena-placeholder-cleanup', 'arena-wager-flag', 'arena-room-close', 'arena-room-delete', 'arena-session-finish']);
export const adminApplyCommunityMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const actor = requireNativePermission(request, 'community.read'); const data = asRecord(request.data);
  return applyNativePatch({ db: admin.firestore(), packageId: 'community', ...actor, previewId: cleanText(data.previewId, 160), confirmation: cleanText(data.confirmation, 240), idempotencyKey: cleanText(data.idempotencyKey, 160), allowedActions: COMMUNITY_ACTIONS,
    transform: async ({ action, before, canonicalBefore, payload, reason, nowMs, db, tx, targetId }) => {
      const iso = new Date(nowMs).toISOString();
      if (action === 'mod-queue-status') {
        const rawDecision = cleanText(payload.decision || payload.status, 40);
        const decision = (rawDecision === 'approved' ? 'approve' : rawDecision === 'rejected' ? 'reject' : rawDecision) as CommunitySubmissionModerationAction;
        if (!['approve', 'reject', 'request_changes'].includes(decision)) throw new HttpsError('invalid-argument', 'invalid moderation decision');
        const result = await applyCommunitySubmissionModerationInTransaction({ db, tx, submissionId: targetId, submission: canonicalBefore, action: decision, moderatorMessage: cleanText(payload.message || payload.moderatorMessage, 3500), now: nowMs });
        return result.patch;
      }
      if (action === 'help-topic-status' || action === 'help-comment-status') {
        const status = cleanText(payload.status, 40);
        const contentAction = (status === 'visible' ? 'restore' : status === 'hidden' ? 'hide' : status === 'deleted' ? 'delete' : '') as HelpBoardAdminContentAction;
        if (!contentAction) throw new HttpsError('invalid-argument', 'invalid help content status');
        return buildHelpBoardAdminContentPatch({ targetType: action === 'help-topic-status' ? 'topic' : 'comment', action: contentAction, reason, adminId: actor.actorUid, now: nowMs });
      }
      if (action === 'help-report-resolve') return { ...buildHelpBoardAdminReportResolutionPatch(actor.actorUid, nowMs), resolution: cleanText(payload.resolution, 500) };
      if (action === 'help-queue-status') { const decision = cleanText(payload.decision || payload.status, 40); if (!['approved', 'rejected'].includes(decision)) throw new HttpsError('invalid-argument', 'invalid help queue decision'); return { decision, status: decision, decidedAt: nowMs, decidedBy: actor.actorUid, updatedAt: nowMs }; }
      if (action === 'help-restriction') {
        const restriction = cleanText(payload.restriction, 40) as HelpBoardAdminRestrictionAction;
        if (!['restrict', 'clear'].includes(restriction)) throw new HttpsError('invalid-argument', 'invalid help restriction');
        return buildHelpBoardAdminRestrictionPatch({ uid: targetId, name: canonicalBefore.name, action: restriction, reason, sourceTargetType: 'admin', sourceTargetId: targetId, adminId: actor.actorUid, now: nowMs });
      }
      if (action === 'help-admin-post') return buildHelpBoardAdminTopic({ title: payload.title, text: payload.body || payload.text, targetLang: payload.targetLang, uiLang: payload.uiLang, postAsName: payload.postAsName, adminId: actor.actorUid, adminAuthUid: actor.actorUid, compassEnabled: payload.compassEnabled === true, now: nowMs });
      if (action === 'helpers-description') { return { texts: { ...asRecord(before.texts), top_helpers_description: cleanText(payload.description, 500) }, updatedAtIso: iso, updatedByUid: actor.actorUid }; }
      if (action === 'league-chat-status') {
        const status = cleanText(payload.status, 40);
        if (!['approved', 'rejected'].includes(status)) throw new HttpsError('invalid-argument', 'invalid chat status');
        if (!['review', 'pending'].includes(cleanText(before.status, 40)) || !['', 'pending'].includes(cleanText(before.decision, 40))) throw new HttpsError('failed-precondition', 'league_chat_queue_row_already_decided');
        const patch: NativeRow = { decision: status, status, decidedAt: nowMs, decidedByUid: actor.actorUid };
        if (status === 'approved') {
          const messageRef = db.collection('league_chat_messages').doc();
          tx.create(messageRef, buildApprovedLeagueChatMessage(canonicalBefore, targetId, nowMs));
          patch.publishedMessageId = messageRef.id;
        }
        return patch;
      }
      if (action === 'league-chat-report') return { status: 'resolved', resolution: cleanText(payload.resolution, 500), resolvedAt: nowMs, resolvedByUid: actor.actorUid };
      if (action === 'league-chat-message-status') { const status = cleanText(payload.status, 40); const messageAction = (status === 'deleted' ? 'delete' : status === 'visible' ? 'restore' : '') as LeagueChatAdminMessageAction; if (!messageAction) throw new HttpsError('invalid-argument', 'invalid league chat message status'); return buildLeagueChatAdminMessageModerationPatch({ action: messageAction, adminId: actor.actorUid, now: nowMs }); }
      if (action === 'league-chat-restriction') { const restriction = cleanText(payload.restriction, 40) as LeagueChatAdminRestrictionAction; if (!['mute', 'ban', 'clear'].includes(restriction)) throw new HttpsError('invalid-argument', 'invalid league chat restriction'); return buildLeagueChatAdminRestrictionPatch({ uid: targetId, action: restriction, reason, durationHours: payload.durationHours, adminId: actor.actorUid, now: nowMs }); }
      if (action === 'league-chat-admin-message') return buildLeagueChatAdminMessage({ groupId: payload.roomId || payload.groupId, weekId: payload.weekId, leagueId: payload.leagueId, text: payload.text, postAsName: payload.postAsName, adminId: actor.actorUid, now: nowMs });
      if (action === 'arena-profile-resync') { const userSnap = await tx.get(db.collection('users').doc(targetId)); const name = cleanText(asRecord(userSnap.data()?.progress).user_name, 120); if (!userSnap.exists || !name || ['Игрок', 'Гравець', '—'].includes(name)) throw new HttpsError('failed-precondition', 'canonical_name_unavailable'); return { displayName: name, updatedAt: nowMs, updatedByUid: actor.actorUid }; }
      if (action === 'arena-placeholder-cleanup') { const ids = Array.isArray(payload.targetIds) ? payload.targetIds.map((id) => cleanText(id, 160)).filter(Boolean) : []; const manifestFingerprint = stableHash({ collection: 'arena_profiles', targetIds: ids }); if (manifestFingerprint !== payload.manifestFingerprint) throw new HttpsError('failed-precondition', 'manifest_fingerprint_mismatch'); return { targetCollection: 'arena_profiles', targetIds: ids, manifestFingerprint, nextIndex: 0, total: ids.length, status: 'approved', usersDeletionAllowed: false, authDeletionAllowed: false, createdAtMs: nowMs, createdByUid: actor.actorUid }; }
      if (action === 'arena-wager-flag') return { rankedWagerEnabled: payload.enabled === true, rollbackBefore: before, updatedAt: nowMs, updatedByUid: actor.actorUid };
      if (action === 'arena-room-close') { const code = cleanText(before.code || targetId, 80); const members = await tx.get(db.collection('arena_room_members').where('code', '==', code).where('active', '==', true).limit(101)); if (members.size > 100) throw new HttpsError('resource-exhausted', 'arena_room_has_more_than_100_active_members'); for (const member of members.docs) tx.set(member.ref, { active: false, leftAt: nowMs, closedByAdminUid: actor.actorUid }, { merge: true }); return { status: 'closed', closedAt: nowMs, closedByUid: actor.actorUid, deactivatedMembers: members.size }; }
      if (action === 'arena-room-delete') return { __deleteTarget: true, deletedAt: nowMs, deletedByUid: actor.actorUid };
      if (action === 'arena-session-finish') { if (['finished', 'aborted'].includes(cleanText(before.state, 40))) throw new HttpsError('failed-precondition', 'session_already_closed'); return { state: 'aborted', abortReason: cleanText(payload.reason, 500), abortedAt: nowMs, abortedByUid: actor.actorUid }; }
      throw new HttpsError('invalid-argument', 'unsupported_community_action');
    },
  });
});

export const adminResumeCommunityBulk = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const actor = requireNativePermission(request, 'community.arena.destructive'); const data = asRecord(request.data); const manifestId = cleanText(data.manifestId, 160); const idempotencyKey = cleanText(data.idempotencyKey, 160);
  if (!manifestId || !idempotencyKey) throw new HttpsError('invalid-argument', 'manifestId and idempotencyKey required'); const db = admin.firestore(); const manifestRef = db.collection('admin_native_bulk_manifests').doc(manifestId); const operationRef = db.collection('admin_command_operations').doc(idempotencyKey);
  return db.runTransaction(async (tx) => {
    const [manifestSnap, operationSnap] = await Promise.all([tx.get(manifestRef), tx.get(operationRef)]); if (!manifestSnap.exists) throw new HttpsError('not-found', 'manifest_not_found');
    const manifest = asRecord(manifestSnap.data()); const ids = Array.isArray(manifest.targetIds) ? manifest.targetIds.map((id) => cleanText(id, 160)).filter(Boolean) : []; const manifestFingerprint = stableHash({ collection: 'arena_profiles', targetIds: ids }); if (manifest.targetCollection !== 'arena_profiles' || manifest.manifestFingerprint !== manifestFingerprint || manifest.usersDeletionAllowed !== false || manifest.authDeletionAllowed !== false) throw new HttpsError('failed-precondition', 'unsafe_manifest');
    if (operationSnap.exists) { const prior = asRecord(operationSnap.data()); if (prior.actorUid !== actor.actorUid || prior.manifestId !== manifestId || prior.manifestFingerprint !== manifestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict'); return { ok: true, replayed: true, ...prior }; }
    const start = Math.max(0, Math.floor(Number(manifest.nextIndex) || 0)); const batchIds = ids.slice(start, start + 25); const profiles = await Promise.all(batchIds.map((id) => tx.get(db.collection('arena_profiles').doc(id)))); let deleted = 0;
    profiles.forEach((snap) => { if (snap.exists && isSafeArenaPlaceholder(snap.data())) { tx.delete(snap.ref); deleted += 1; } }); const nextIndex = start + batchIds.length; const done = nextIndex >= ids.length; const nowMs = Date.now(); const after = { ...manifest, nextIndex, status: done ? 'completed' : 'in_progress', lastBatchDeleted: deleted, updatedAtMs: nowMs, updatedByUid: actor.actorUid }; const auditRef = db.collection('admin_log').doc(); const audit = createAuditRecord({ action: 'community.arena-placeholder-cleanup.resume', actorUid: actor.actorUid, role: actor.role, entity: { collection: 'admin_native_bulk_manifests', id: manifestId }, reason: 'Resume approved Arena placeholder cleanup manifest', before: manifest, after, rollbackReference: `admin_native_bulk_manifests/${manifestId}`, requestId: idempotencyKey, timestamp: new Date(nowMs).toISOString() }); tx.set(manifestRef, after, { merge: true }); tx.create(auditRef, { ...audit, operationId: operationRef.id }); tx.create(operationRef, { packageId: 'community', action: 'arena-placeholder-cleanup.resume', manifestId, manifestFingerprint, actorUid: actor.actorUid, start, nextIndex, deleted, done, auditId: auditRef.id, createdAtMs: nowMs }); return { ok: true, replayed: false, manifestId, manifestFingerprint, nextIndex, deleted, done };
  });
});
