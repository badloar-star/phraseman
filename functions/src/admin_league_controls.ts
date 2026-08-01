import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createHash } from 'node:crypto';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, roleFromAdminToken } from './admin/permissions';
import { type AdminRole } from './admin/roles';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';

type Row = Record<string, unknown>;
const ID_RE = /^[A-Za-z0-9._-]{2,180}$/;
const MAX_GROUP_SIZE = 30;
const MAX_LEAGUE_ID = 11;

function record(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function command(data: Row) {
  const reason = text(data.reason, 500);
  const idempotencyKey = text(data.idempotencyKey, 120);
  const requestId = text(data.requestId, 160);
  if (!reason || !idempotencyKey || !requestId || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'reason, idempotencyKey and requestId are required');
  }
  return { reason, idempotencyKey, requestId };
}

function ids(data: Row) {
  const groupId = text(data.groupId, 180);
  const uid = text(data.uid, 160);
  if (!ID_RE.test(groupId) || !ID_RE.test(uid)) throw new HttpsError('invalid-argument', 'valid groupId and uid are required');
  return { groupId, uid };
}

export function normalizeAdminLeagueResetInput(data: unknown) {
  if (!record(data)) throw new HttpsError('invalid-argument', 'request object required');
  const value = { ...ids(data), ...command(data) };
  return Object.freeze({ ...value, requestFingerprint: JSON.stringify({ groupId: value.groupId, uid: value.uid }) });
}

export function normalizeAdminLeagueMoveInput(data: unknown) {
  if (!record(data)) throw new HttpsError('invalid-argument', 'request object required');
  const targetLeague = Number(data.targetLeague);
  if (!Number.isInteger(targetLeague) || targetLeague < 0 || targetLeague > MAX_LEAGUE_ID) {
    throw new HttpsError('invalid-argument', 'targetLeague must be 0-11');
  }
  const value = { ...ids(data), targetLeague, ...command(data) };
  return Object.freeze({ ...value, requestFingerprint: JSON.stringify({ groupId: value.groupId, uid: value.uid, targetLeague }) });
}

function finiteNonNegative(value: unknown): number | null {
  if (value === '' || value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1_000_000_000 ? parsed : null;
}

export function resolveAuthoritativeLeaguePoints(
  leaderboard: Row,
  user: Row,
  member: Row,
  weekId: string,
  currentGroupWeekId = '',
): { points: number; totalXp: number } {
  const progress = record(user.progress) ? user.progress : {};
  const pointCandidates: number[] = [];
  const leaderboardWeekPoints = finiteNonNegative(leaderboard.weekPoints);
  const memberPoints = finiteNonNegative(member.points);
  const leaderboardWeekMarkers = [leaderboard.weekKey, leaderboard.groupWeekId, leaderboard.weekId]
    .map((value) => text(value, 16))
    .filter(Boolean);
  const leaderboardMarkersAreCurrent = leaderboardWeekMarkers.length > 0
    && leaderboardWeekMarkers.every((marker) => marker === weekId);
  if (leaderboardWeekPoints != null && leaderboardMarkersAreCurrent) pointCandidates.push(leaderboardWeekPoints);
  if (memberPoints != null && currentGroupWeekId === weekId) pointCandidates.push(memberPoints);
  if (progress.week_points_v2 != null && String(progress.week_points_v2).trim()) {
    let parsed: unknown;
    try { parsed = JSON.parse(String(progress.week_points_v2)); } catch { parsed = null; }
    if (record(parsed) && parsed.weekKey === weekId) {
      const value = finiteNonNegative(parsed.points);
      if (value != null) pointCandidates.push(value);
    }
  }
  const totalCandidates = [leaderboard.points, progress.user_total_xp, member.totalXp]
    .map(finiteNonNegative).filter((value): value is number => value != null);
  if (!pointCandidates.length || !totalCandidates.length) throw new HttpsError('failed-precondition', 'authoritative_league_points_missing');
  return { points: Math.max(...pointCandidates), totalXp: Math.max(...totalCandidates) };
}

function weekId(now = new Date()): string {
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function visibleMemberCount(members: Row): number {
  return Object.values(members).filter((value) => record(value) && value.identityHidden !== true).length;
}

function leagueState(members: Row, movedUid: string): Row[] {
  return Object.entries(members)
    .filter(([, value]) => record(value) && value.identityHidden !== true)
    .map(([uid, value]): Row => ({ ...(value as Row), uid: text((value as Row).uid, 160) || uid, isMe: uid === movedUid }))
    .sort((a, b) => Number(b.points ?? 0) - Number(a.points ?? 0));
}

export function requireAdminLeagueActor(request: { app?: unknown; auth?: { uid: string; token?: Row } }): { actorUid: string; role: AdminRole } {
  requireAdminAppCheck(request);
  const role = roleFromAdminToken(request.auth?.token);
  if (!request.auth?.uid || !role || !hasPermission(role, 'application.config.write')) {
    throw new HttpsError('permission-denied', 'application.config.write required');
  }
  return { actorUid: request.auth.uid, role };
}

function replay(operation: Row, actorUid: string, fingerprint: string): Row | null {
  if (operation.actorUid !== actorUid || operation.requestFingerprint !== fingerprint) throw new HttpsError('already-exists', 'idempotency key replay mismatch');
  return record(operation.result) ? operation.result : null;
}

export const adminResetLeaguePoints = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  const input = normalizeAdminLeagueResetInput(request.data);
  const { actorUid, role } = requireAdminLeagueActor(request);
  const db = admin.firestore();
  const groupRef = db.collection('league_groups').doc(input.groupId);
  const userRef = db.collection('users').doc(input.uid);
  const leaderboardRef = db.collection('leaderboard').doc(input.uid);
  const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
  const auditRef = db.collection('admin_log').doc();
  return db.runTransaction(async (tx) => {
    const [groupSnap, userSnap, leaderboardSnap, operationSnap] = await Promise.all([tx.get(groupRef), tx.get(userRef), tx.get(leaderboardRef), tx.get(operationRef)]);
    if (operationSnap.exists) return { ok: true, ...(replay(operationSnap.data() ?? {}, actorUid, input.requestFingerprint) ?? {}), replayed: true };
    if (!groupSnap.exists || !userSnap.exists || !leaderboardSnap.exists) throw new HttpsError('not-found', 'league_reset_source_missing');
    const group = groupSnap.data() ?? {};
    const members = record(group.members) ? { ...group.members } : {};
    const member = record(members[input.uid]) ? { ...(members[input.uid] as Row) } : null;
    if (!member) throw new HttpsError('failed-precondition', 'league_group_member_missing');
    const currentWeek = weekId();
    if (text(group.weekId, 16) !== currentWeek) throw new HttpsError('failed-precondition', 'league_group_not_current_week');
    resolveAuthoritativeLeaguePoints(leaderboardSnap.data() ?? {}, userSnap.data() ?? {}, member, currentWeek, text(group.weekId, 16));
    const before = { groupId: input.groupId, uid: input.uid, member };
    members[input.uid] = { ...member, points: 0, adminResetAt: Date.now() };
    const user = userSnap.data() ?? {};
    const progress = record(user.progress) ? user.progress : {};
    const leagueId = Number(group.leagueId);
    const nowMs = Date.now();
    tx.set(groupRef, { members, memberCount: Object.keys(members).length, updatedAt: nowMs }, { merge: true });
    tx.set(leaderboardRef, { weekKey: currentWeek, weekPoints: 0, updatedAt: nowMs }, { merge: true });
    tx.set(userRef, { progress: { ...progress, league_state_v3: JSON.stringify({ leagueId, weekId: currentWeek, group: leagueState(members, input.uid) }), week_points_v2: JSON.stringify({ weekKey: currentWeek, points: 0 }), weekly_xp: '0' }, leagueRepair: { type: 'admin_league_reset', groupId: input.groupId, resetAt: nowMs }, updatedAt: nowMs }, { merge: true });
    const result = { groupId: input.groupId, uid: input.uid, points: 0 };
    const audit = createAuditRecord({ action: 'league.points.reset', actorUid, role, entity: { collection: 'league_groups', id: input.groupId }, reason: input.reason, before, after: result, requestId: input.requestId, rollbackReference: `${input.groupId}:${input.uid}`, timestamp: new Date(nowMs).toISOString() });
    tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
    tx.create(operationRef, { actorUid, requestFingerprint: input.requestFingerprint, result, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { ok: true, ...result, auditId: auditRef.id, replayed: false };
  });
});

export const adminMoveLeagueUser = onCall(ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
  const input = normalizeAdminLeagueMoveInput(request.data);
  const { actorUid, role } = requireAdminLeagueActor(request);
  const db = admin.firestore();
  const currentWeek = weekId();
  const candidates = await db.collection('league_groups').where('leagueId', '==', input.targetLeague).where('weekId', '==', currentWeek).limit(51).get();
  if (candidates.size > 50) throw new HttpsError('resource-exhausted', 'too_many_target_league_groups_retry_with_migration');
  const candidate = candidates.docs.find((snap) => snap.id !== input.groupId && visibleMemberCount(record(snap.data().members) ? snap.data().members : {}) < MAX_GROUP_SIZE);
  const suffix = createHash('sha256').update(input.idempotencyKey).digest('hex').slice(0, 12);
  const targetGroupId = candidate?.id ?? `${currentWeek}_${input.targetLeague}_admin_${suffix}`;
  const oldGroupRef = db.collection('league_groups').doc(input.groupId);
  const targetGroupRef = db.collection('league_groups').doc(targetGroupId);
  const userRef = db.collection('users').doc(input.uid);
  const leaderboardRef = db.collection('leaderboard').doc(input.uid);
  const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
  const auditRef = db.collection('admin_log').doc();
  return db.runTransaction(async (tx) => {
    const [oldSnap, targetSnap, userSnap, leaderboardSnap, operationSnap] = await Promise.all([tx.get(oldGroupRef), tx.get(targetGroupRef), tx.get(userRef), tx.get(leaderboardRef), tx.get(operationRef)]);
    if (operationSnap.exists) return { ok: true, ...(replay(operationSnap.data() ?? {}, actorUid, input.requestFingerprint) ?? {}), replayed: true };
    if (!oldSnap.exists || !userSnap.exists || !leaderboardSnap.exists) throw new HttpsError('not-found', 'league_move_source_missing');
    const oldGroup = oldSnap.data() ?? {};
    if (text(oldGroup.weekId, 16) !== currentWeek) throw new HttpsError('failed-precondition', 'league_group_not_current_week');
    const oldMembers = record(oldGroup.members) ? { ...oldGroup.members } : {};
    const previousMember = record(oldMembers[input.uid]) ? { ...(oldMembers[input.uid] as Row) } : null;
    if (!previousMember) throw new HttpsError('failed-precondition', 'league_group_member_missing');
    const target = targetSnap.exists ? (targetSnap.data() ?? {}) : {};
    if (targetSnap.exists && (Number(target.leagueId) !== input.targetLeague || text(target.weekId, 16) !== currentWeek)) throw new HttpsError('aborted', 'target_league_group_changed');
    const targetMembers = record(target.members) ? { ...target.members } : {};
    if (!targetMembers[input.uid] && visibleMemberCount(targetMembers) >= MAX_GROUP_SIZE) throw new HttpsError('resource-exhausted', 'target_league_group_full');
    const leaderboard = leaderboardSnap.data() ?? {};
    const user = userSnap.data() ?? {};
    const resolved = resolveAuthoritativeLeaguePoints(leaderboard, user, previousMember, currentWeek, text(oldGroup.weekId, 16));
    const nowMs = Date.now();
    const member = { ...previousMember, uid: input.uid, name: text(leaderboard.name, 80) || text(previousMember.name, 80) || input.uid, points: resolved.points, totalXp: resolved.totalXp, avatar: leaderboard.avatar ?? previousMember.avatar ?? null, frame: leaderboard.frame ?? previousMember.frame ?? null, aura: leaderboard.aura ?? previousMember.aura ?? null, isPremium: leaderboard.isPremium ?? previousMember.isPremium ?? false, streak: leaderboard.streak ?? previousMember.streak ?? 0, adminMoved: true, adminMovedAt: nowMs };
    delete oldMembers[input.uid];
    targetMembers[input.uid] = member;
    const progress = record(user.progress) ? user.progress : {};
    tx.set(oldGroupRef, { members: oldMembers, memberCount: Object.keys(oldMembers).length, updatedAt: nowMs }, { merge: true });
    tx.set(targetGroupRef, { leagueId: input.targetLeague, weekId: currentWeek, members: targetMembers, memberCount: Object.keys(targetMembers).length, createdAt: target.createdAt ?? nowMs, createdByAdmin: target.createdByAdmin ?? true, updatedAt: nowMs }, { merge: true });
    tx.set(leaderboardRef, { leagueId: input.targetLeague, groupId: targetGroupId, groupWeekId: currentWeek, weekKey: currentWeek, weekPoints: resolved.points, points: resolved.totalXp, updatedAt: nowMs }, { merge: true });
    tx.set(userRef, { progress: { ...progress, league_state_v3: JSON.stringify({ leagueId: input.targetLeague, weekId: currentWeek, group: leagueState(targetMembers, input.uid) }), week_points_v2: JSON.stringify({ weekKey: currentWeek, points: resolved.points }), weekly_xp: String(resolved.points), user_total_xp: String(resolved.totalXp) }, leagueRepair: { type: 'admin_league_move', fromGroupId: input.groupId, targetGroupId, targetLeague: input.targetLeague, movedAt: nowMs }, updatedAt: nowMs }, { merge: true });
    const result = { uid: input.uid, fromGroupId: input.groupId, targetGroupId, targetLeague: input.targetLeague, member };
    const audit = createAuditRecord({ action: 'league.user.move', actorUid, role, entity: { collection: 'league_groups', id: targetGroupId }, reason: input.reason, before: { groupId: input.groupId, member: previousMember }, after: result, requestId: input.requestId, rollbackReference: `${input.groupId}:${input.uid}`, timestamp: new Date(nowMs).toISOString() });
    tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
    tx.create(operationRef, { actorUid, requestFingerprint: input.requestFingerprint, result, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { ok: true, ...result, auditId: auditRef.id, replayed: false };
  });
});
