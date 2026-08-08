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
exports.adminMoveLeagueUser = exports.adminResetLeaguePoints = void 0;
exports.normalizeAdminLeagueResetInput = normalizeAdminLeagueResetInput;
exports.normalizeAdminLeagueMoveInput = normalizeAdminLeagueMoveInput;
exports.resolveAuthoritativeLeaguePoints = resolveAuthoritativeLeaguePoints;
exports.requireAdminLeagueActor = requireAdminLeagueActor;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const node_crypto_1 = require("node:crypto");
const audit_contract_1 = require("./admin/audit_contract");
const permissions_1 = require("./admin/permissions");
const callable_options_1 = require("./callable_options");
const ID_RE = /^[A-Za-z0-9._-]{2,180}$/;
const MAX_GROUP_SIZE = 30;
const MAX_LEAGUE_ID = 11;
function record(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function text(value, max) {
    return String(value ?? '').trim().slice(0, max);
}
function command(data) {
    const reason = text(data.reason, 500);
    const idempotencyKey = text(data.idempotencyKey, 120);
    const requestId = text(data.requestId, 160);
    if (!reason || !idempotencyKey || !requestId || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) {
        throw new https_1.HttpsError('invalid-argument', 'reason, idempotencyKey and requestId are required');
    }
    return { reason, idempotencyKey, requestId };
}
function ids(data) {
    const groupId = text(data.groupId, 180);
    const uid = text(data.uid, 160);
    if (!ID_RE.test(groupId) || !ID_RE.test(uid))
        throw new https_1.HttpsError('invalid-argument', 'valid groupId and uid are required');
    return { groupId, uid };
}
function normalizeAdminLeagueResetInput(data) {
    if (!record(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    const value = { ...ids(data), ...command(data) };
    return Object.freeze({ ...value, requestFingerprint: JSON.stringify({ groupId: value.groupId, uid: value.uid }) });
}
function normalizeAdminLeagueMoveInput(data) {
    if (!record(data))
        throw new https_1.HttpsError('invalid-argument', 'request object required');
    const targetLeague = Number(data.targetLeague);
    if (!Number.isInteger(targetLeague) || targetLeague < 0 || targetLeague > MAX_LEAGUE_ID) {
        throw new https_1.HttpsError('invalid-argument', 'targetLeague must be 0-11');
    }
    const value = { ...ids(data), targetLeague, ...command(data) };
    return Object.freeze({ ...value, requestFingerprint: JSON.stringify({ groupId: value.groupId, uid: value.uid, targetLeague }) });
}
function finiteNonNegative(value) {
    if (value === '' || value == null)
        return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1000000000 ? parsed : null;
}
function resolveAuthoritativeLeaguePoints(leaderboard, user, member, weekId, currentGroupWeekId = '') {
    const progress = record(user.progress) ? user.progress : {};
    const pointCandidates = [];
    const leaderboardWeekPoints = finiteNonNegative(leaderboard.weekPoints);
    const memberPoints = finiteNonNegative(member.points);
    const leaderboardWeekMarkers = [leaderboard.weekKey, leaderboard.groupWeekId, leaderboard.weekId]
        .map((value) => text(value, 16))
        .filter(Boolean);
    const leaderboardMarkersAreCurrent = leaderboardWeekMarkers.length > 0
        && leaderboardWeekMarkers.every((marker) => marker === weekId);
    if (leaderboardWeekPoints != null && leaderboardMarkersAreCurrent)
        pointCandidates.push(leaderboardWeekPoints);
    if (memberPoints != null && currentGroupWeekId === weekId)
        pointCandidates.push(memberPoints);
    if (progress.week_points_v2 != null && String(progress.week_points_v2).trim()) {
        let parsed;
        try {
            parsed = JSON.parse(String(progress.week_points_v2));
        }
        catch {
            parsed = null;
        }
        if (record(parsed) && parsed.weekKey === weekId) {
            const value = finiteNonNegative(parsed.points);
            if (value != null)
                pointCandidates.push(value);
        }
    }
    const totalCandidates = [leaderboard.points, progress.user_total_xp, member.totalXp]
        .map(finiteNonNegative).filter((value) => value != null);
    if (!pointCandidates.length || !totalCandidates.length)
        throw new https_1.HttpsError('failed-precondition', 'authoritative_league_points_missing');
    return { points: Math.max(...pointCandidates), totalXp: Math.max(...totalCandidates) };
}
function weekId(now = new Date()) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
function visibleMemberCount(members) {
    return Object.values(members).filter((value) => record(value) && value.identityHidden !== true).length;
}
function leagueState(members, movedUid) {
    return Object.entries(members)
        .filter(([, value]) => record(value) && value.identityHidden !== true)
        .map(([uid, value]) => ({ ...value, uid: text(value.uid, 160) || uid, isMe: uid === movedUid }))
        .sort((a, b) => Number(b.points ?? 0) - Number(a.points ?? 0));
}
function requireAdminLeagueActor(request) {
    (0, callable_options_1.requireAdminAppCheck)(request);
    const role = (0, permissions_1.roleFromAdminToken)(request.auth?.token);
    if (!request.auth?.uid || !role || !(0, permissions_1.hasPermission)(role, 'application.config.write')) {
        throw new https_1.HttpsError('permission-denied', 'application.config.write required');
    }
    return { actorUid: request.auth.uid, role };
}
function replay(operation, actorUid, fingerprint) {
    if (operation.actorUid !== actorUid || operation.requestFingerprint !== fingerprint)
        throw new https_1.HttpsError('already-exists', 'idempotency key replay mismatch');
    return record(operation.result) ? operation.result : null;
}
exports.adminResetLeaguePoints = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
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
        if (operationSnap.exists)
            return { ok: true, ...(replay(operationSnap.data() ?? {}, actorUid, input.requestFingerprint) ?? {}), replayed: true };
        if (!groupSnap.exists || !userSnap.exists || !leaderboardSnap.exists)
            throw new https_1.HttpsError('not-found', 'league_reset_source_missing');
        const group = groupSnap.data() ?? {};
        const members = record(group.members) ? { ...group.members } : {};
        const member = record(members[input.uid]) ? { ...members[input.uid] } : null;
        if (!member)
            throw new https_1.HttpsError('failed-precondition', 'league_group_member_missing');
        const currentWeek = weekId();
        if (text(group.weekId, 16) !== currentWeek)
            throw new https_1.HttpsError('failed-precondition', 'league_group_not_current_week');
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
        const audit = (0, audit_contract_1.createAuditRecord)({ action: 'league.points.reset', actorUid, role, entity: { collection: 'league_groups', id: input.groupId }, reason: input.reason, before, after: result, requestId: input.requestId, rollbackReference: `${input.groupId}:${input.uid}`, timestamp: new Date(nowMs).toISOString() });
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.create(operationRef, { actorUid, requestFingerprint: input.requestFingerprint, result, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true, ...result, auditId: auditRef.id, replayed: false };
    });
});
exports.adminMoveLeagueUser = (0, https_1.onCall)(callable_options_1.ADMIN_SENSITIVE_WRITE_OPTIONS, async (request) => {
    const input = normalizeAdminLeagueMoveInput(request.data);
    const { actorUid, role } = requireAdminLeagueActor(request);
    const db = admin.firestore();
    const currentWeek = weekId();
    const candidates = await db.collection('league_groups').where('leagueId', '==', input.targetLeague).where('weekId', '==', currentWeek).limit(51).get();
    if (candidates.size > 50)
        throw new https_1.HttpsError('resource-exhausted', 'too_many_target_league_groups_retry_with_migration');
    const candidate = candidates.docs.find((snap) => snap.id !== input.groupId && visibleMemberCount(record(snap.data().members) ? snap.data().members : {}) < MAX_GROUP_SIZE);
    const suffix = (0, node_crypto_1.createHash)('sha256').update(input.idempotencyKey).digest('hex').slice(0, 12);
    const targetGroupId = candidate?.id ?? `${currentWeek}_${input.targetLeague}_admin_${suffix}`;
    const oldGroupRef = db.collection('league_groups').doc(input.groupId);
    const targetGroupRef = db.collection('league_groups').doc(targetGroupId);
    const userRef = db.collection('users').doc(input.uid);
    const leaderboardRef = db.collection('leaderboard').doc(input.uid);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
        const [oldSnap, targetSnap, userSnap, leaderboardSnap, operationSnap] = await Promise.all([tx.get(oldGroupRef), tx.get(targetGroupRef), tx.get(userRef), tx.get(leaderboardRef), tx.get(operationRef)]);
        if (operationSnap.exists)
            return { ok: true, ...(replay(operationSnap.data() ?? {}, actorUid, input.requestFingerprint) ?? {}), replayed: true };
        if (!oldSnap.exists || !userSnap.exists || !leaderboardSnap.exists)
            throw new https_1.HttpsError('not-found', 'league_move_source_missing');
        const oldGroup = oldSnap.data() ?? {};
        if (text(oldGroup.weekId, 16) !== currentWeek)
            throw new https_1.HttpsError('failed-precondition', 'league_group_not_current_week');
        const oldMembers = record(oldGroup.members) ? { ...oldGroup.members } : {};
        const previousMember = record(oldMembers[input.uid]) ? { ...oldMembers[input.uid] } : null;
        if (!previousMember)
            throw new https_1.HttpsError('failed-precondition', 'league_group_member_missing');
        const target = targetSnap.exists ? (targetSnap.data() ?? {}) : {};
        if (targetSnap.exists && (Number(target.leagueId) !== input.targetLeague || text(target.weekId, 16) !== currentWeek))
            throw new https_1.HttpsError('aborted', 'target_league_group_changed');
        const targetMembers = record(target.members) ? { ...target.members } : {};
        if (!targetMembers[input.uid] && visibleMemberCount(targetMembers) >= MAX_GROUP_SIZE)
            throw new https_1.HttpsError('resource-exhausted', 'target_league_group_full');
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
        const audit = (0, audit_contract_1.createAuditRecord)({ action: 'league.user.move', actorUid, role, entity: { collection: 'league_groups', id: targetGroupId }, reason: input.reason, before: { groupId: input.groupId, member: previousMember }, after: result, requestId: input.requestId, rollbackReference: `${input.groupId}:${input.uid}`, timestamp: new Date(nowMs).toISOString() });
        tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
        tx.create(operationRef, { actorUid, requestFingerprint: input.requestFingerprint, result, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
        return { ok: true, ...result, auditId: auditRef.id, replayed: false };
    });
});
//# sourceMappingURL=admin_league_controls.js.map