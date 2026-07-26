import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, type AdminPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { ACCOUNT_DELETE_AUTH_MARKERS, ACCOUNT_DELETE_TOMBSTONES } from './account_delete_job';

/**
 * Ручная диагностика/починка/перепривязка auth-привязок из админки.
 *
 * Дополняет самообслуживаемое восстановление (auth_recovery.ts): когда юзер не
 * может доказать владение email-кодом (потерял почту, Apple private relay и
 * т.п.), владелец/админ чинит привязку вручную. Каждая операция:
 *   — gated permission'ом users.auth_repair (owner/admin, НЕ support);
 *   — идемпотентна через admin_command_operations (повтор с тем же
 *     idempotencyKey возвращает сохранённый result с replayed:true);
 *   — пишет аудит в admin_log через createAuditRecord (before/after).
 *
 * Форма записей повторяет ensureAuthLinkDoc / ensureProviderLinkedAuth из
 * auth_identity.ts (auth_links/{uid}.stable_id + users/{stableId}.firebaseAuthUid/
 * linkedAuth). Меняя ту форму — синхронно менять здесь.
 * Read-диагностики отдельным callable НЕТ намеренно: adminGetUserProfile уже
 * отдаёт auth_links в админ-UI (admin_user_profile.ts).
 */

const REGION = 'us-central1';
const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const TOKEN_RE = /^[A-Za-z0-9._-]{1,160}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AUTH_REPAIR_PERMISSION: AdminPermission = 'users.auth_repair';

type Row = Record<string, unknown>;

function record(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function numeric(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function actor(request: { auth?: { uid?: string; token?: Row } | null }): { actorUid: string; role: AdminRole; email: string } {
  const actorUid = text(request.auth?.uid, 160);
  const token = request.auth?.token;
  // зачем: adminRole в проекте никем не выдаётся — флага admin достаточно, роль по умолчанию owner.
  const role: AdminRole = hasAdminRole(token?.adminRole) ? token.adminRole : 'owner';
  if (!actorUid || token?.admin !== true || !hasPermission(role, AUTH_REPAIR_PERMISSION)) {
    throw new HttpsError('permission-denied', 'Admin permission required');
  }
  return { actorUid, role, email: text(token.email, 320) || actorUid };
}

function normalizeProvider(value: unknown): 'google' | 'apple' | null {
  const raw = text(value, 20);
  return raw === 'google' || raw === 'apple' ? raw : null;
}

/** Провайдер из Firebase Auth record (providerData → google.com/apple.com). */
function providerFromAuthRecord(userRecord: admin.auth.UserRecord | null): 'google' | 'apple' | null {
  for (const providerData of userRecord?.providerData ?? []) {
    const providerId = text(providerData?.providerId, 40).toLowerCase();
    if (providerId === 'google.com') return 'google';
    if (providerId === 'apple.com') return 'apple';
  }
  return null;
}

type LinkedAuthShape = {
  provider: 'google' | 'apple' | null;
  providerUid: string;
  email: string | null;
  displayName: string | null;
  devicePlatform: string | null;
};

function readLinkedAuth(userData: Row): LinkedAuthShape {
  const linked = record(userData.linkedAuth) ? userData.linkedAuth : {};
  return {
    provider: normalizeProvider(linked.provider),
    providerUid: text(linked.providerUid, 160),
    email: text(linked.email, 320) || null,
    displayName: text(linked.displayName, 160) || null,
    devicePlatform: text(linked.devicePlatform, 20) || null,
  };
}

function summarizeLinkDoc(linkSnap: FirebaseFirestore.DocumentSnapshot | null): Row | null {
  if (!linkSnap?.exists) return null;
  const data = linkSnap.data() ?? {};
  return {
    stable_id: data.stable_id ?? null,
    providerUid: data.providerUid ?? null,
    provider: data.provider ?? null,
    linkedAt: data.linkedAt ?? null,
  };
}

// ── adminRepairAuthLink: починка дрифта users ↔ auth_links ───────────────────

export interface AdminAuthLinkRepairInput {
  readonly uid: string;
  readonly reason: string;
  readonly requestId: string;
  readonly idempotencyKey: string;
}

export function normalizeAuthLinkRepairInput(data: unknown): AdminAuthLinkRepairInput {
  if (!record(data)) throw new HttpsError('invalid-argument', 'auth link repair command required');
  const uid = text(data.uid, 160);
  const reason = text(data.reason, 500);
  const requestId = text(data.requestId, 160);
  const idempotencyKey = text(data.idempotencyKey, 160);
  if (!UID_RE.test(uid)) throw new HttpsError('invalid-argument', 'uid is invalid');
  if (!reason || !TOKEN_RE.test(requestId) || !TOKEN_RE.test(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'reason and request ids are required');
  }
  return Object.freeze({ uid, reason, requestId, idempotencyKey });
}

export const adminRepairAuthLink = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  if (!request.app) throw new HttpsError('failed-precondition', 'app_check_required');
  const input = normalizeAuthLinkRepairInput(request.data);
  const a = actor(request as { auth?: { uid?: string; token?: Row } });
  const db = admin.firestore();
  const userRef = db.collection(USERS).doc(input.uid);
  const targetTombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(input.uid);
  const opRef = db.collection('admin_command_operations').doc(`auth_link_repair_${input.idempotencyKey}`);
  const auditRef = db.collection('admin_log').doc();
  const now = Date.now();
  const fingerprint = JSON.stringify({ action: 'auth_link_repair', uid: input.uid, reason: input.reason });

  return db.runTransaction(async (tx) => {
    const op = await tx.get(opRef);
    if (op.exists) {
      const d = op.data() ?? {};
      if (d.requestFingerprint !== fingerprint || d.actorUid !== a.actorUid) {
        throw new HttpsError('already-exists', 'idempotency key replay mismatch');
      }
      return { ...(record(d.result) ? d.result : {}), replayed: true };
    }

    const [userSnap, targetTombstoneSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(targetTombstoneRef),
    ]);
    if (targetTombstoneSnap.exists) {
      throw new HttpsError('failed-precondition', 'account_delete_pending');
    }
    if (!userSnap.exists) throw new HttpsError('not-found', 'user not found');
    const userData = userSnap.data() ?? {};
    const linked = readLinkedAuth(userData);
    const firebaseAuthUid = text(userData.firebaseAuthUid, 160);
    // Канонический uid привязки: firebaseAuthUid, а если его нет — providerUid из linkedAuth.
    const canonicalAuthUid = firebaseAuthUid || linked.providerUid;
    if (!canonicalAuthUid) {
      throw new HttpsError('failed-precondition', 'no_provider_link');
    }

    const linkRef = db.collection(AUTH_LINKS).doc(canonicalAuthUid);
    const markerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(canonicalAuthUid);
    const [linkSnap, markerSnap] = await Promise.all([
      tx.get(linkRef),
      tx.get(markerRef),
    ]);
    if (markerSnap.exists) {
      throw new HttpsError('failed-precondition', 'account_delete_pending');
    }
    const linkData = linkSnap.data() ?? {};
    const linkedStableId = text(linkData.stable_id, 160);
    if (linkSnap.exists && linkedStableId && linkedStableId !== input.uid) {
      const displacedUserRef = db.collection(USERS).doc(linkedStableId);
      const displacedTombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(linkedStableId);
      const [displacedUserSnap, displacedTombstoneSnap] = await Promise.all([
        tx.get(displacedUserRef),
        tx.get(displacedTombstoneRef),
      ]);
      if (displacedTombstoneSnap.exists) {
        throw new HttpsError('failed-precondition', 'account_delete_pending');
      }
      if (displacedUserSnap.exists && displacedUserSnap.data()?.identityHidden !== true) {
        throw new HttpsError('failed-precondition', 'provider_link_conflict');
      }
    }

    // Дрифт-анализ: док привязки отсутствует / указывает не на тот stable_id /
    // не совпадают provider-поля / users-поля не консистентны.
    const driftReasons: string[] = [];
    if (!linkSnap.exists) {
      driftReasons.push('auth_link_missing');
    } else {
      if (text(linkData.stable_id, 160) !== input.uid) driftReasons.push('auth_link_stable_mismatch');
      if (linked.provider && text(linkData.providerUid, 160) !== canonicalAuthUid) driftReasons.push('auth_link_provider_uid_mismatch');
      if (linked.provider && normalizeProvider(linkData.provider) !== linked.provider) driftReasons.push('auth_link_provider_mismatch');
      if (linked.provider && numeric(linkData.linkedAt) <= 0) driftReasons.push('auth_link_linked_at_missing');
    }
    if (firebaseAuthUid !== canonicalAuthUid) driftReasons.push('users_firebase_auth_uid_missing');

    const before: Row = {
      users: {
        firebaseAuthUid: firebaseAuthUid || null,
        linkedAuthProviderUid: linked.providerUid || null,
        linkedAuthProvider: linked.provider,
      },
      authLink: summarizeLinkDoc(linkSnap),
    };

    let auditId: string | null = null;
    if (driftReasons.length > 0) {
      const linkedAt = numeric(linkData.linkedAt) > 0 ? numeric(linkData.linkedAt) : now;
      // Форма ensureAuthLinkDoc (merge, linkedAt сохраняем).
      tx.set(linkRef, {
        stable_id: input.uid,
        updatedAt: now,
        ...(linked.provider
          ? {
            providerUid: canonicalAuthUid,
            provider: linked.provider,
            linkedAt,
            lastSignInAt: numeric(linkData.lastSignInAt) > 0 ? numeric(linkData.lastSignInAt) : now,
          }
          : {}),
      }, { merge: true });
      if (firebaseAuthUid !== canonicalAuthUid) {
        tx.update(userRef, { firebaseAuthUid: canonicalAuthUid, updatedAt: now });
      }
      const after: Row = {
        users: {
          firebaseAuthUid: canonicalAuthUid,
          linkedAuthProviderUid: linked.providerUid || null,
          linkedAuthProvider: linked.provider,
        },
        authLink: {
          stable_id: input.uid,
          providerUid: linked.provider ? canonicalAuthUid : (linkData.providerUid ?? null),
          provider: linked.provider ?? (linkData.provider ?? null),
          linkedAt,
        },
        driftReasons,
      };
      const audit = createAuditRecord({
        action: 'auth_link_repair',
        actorUid: a.actorUid,
        role: a.role,
        entity: { collection: USERS, id: input.uid },
        reason: input.reason,
        before,
        after,
        requestId: input.requestId,
        timestamp: new Date(now).toISOString(),
      });
      tx.create(auditRef, { ...audit, operationId: opRef.id });
      auditId = auditRef.id;
    }

    const result = { ok: true, uid: input.uid, repaired: driftReasons.length > 0, driftReasons, auditId };
    tx.create(opRef, {
      action: 'auth_link_repair',
      requestFingerprint: fingerprint,
      actorUid: a.actorUid,
      auditId,
      result,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return result;
  });
});

// ── adminRelinkProvider: ручная перепривязка provider uid к stable_id ────────

export interface AdminProviderRelinkInput {
  readonly uid: string;
  readonly providerEmail: string | null;
  readonly providerUid: string | null;
  readonly reason: string;
  readonly requestId: string;
  readonly idempotencyKey: string;
}

export function normalizeProviderRelinkInput(data: unknown): AdminProviderRelinkInput {
  if (!record(data)) throw new HttpsError('invalid-argument', 'provider relink command required');
  const uid = text(data.uid, 160);
  const providerEmail = text(data.providerEmail, 320).toLowerCase() || null;
  const providerUid = text(data.providerUid, 160) || null;
  const reason = text(data.reason, 500);
  const requestId = text(data.requestId, 160);
  const idempotencyKey = text(data.idempotencyKey, 160);
  if (!UID_RE.test(uid)) throw new HttpsError('invalid-argument', 'uid is invalid');
  // Ровно один идентификатор провайдера: email ИЛИ uid.
  if ((providerEmail ? 1 : 0) + (providerUid ? 1 : 0) !== 1) {
    throw new HttpsError('invalid-argument', 'exactly_one_provider_identifier_required');
  }
  if (providerEmail && !EMAIL_RE.test(providerEmail)) throw new HttpsError('invalid-argument', 'provider_email_invalid');
  if (providerUid && !UID_RE.test(providerUid)) throw new HttpsError('invalid-argument', 'provider_uid_invalid');
  if (!reason || !TOKEN_RE.test(requestId) || !TOKEN_RE.test(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'reason and request ids are required');
  }
  return Object.freeze({ uid, providerEmail, providerUid, reason, requestId, idempotencyKey });
}

export const adminRelinkProvider = onCall({ region: REGION, enforceAppCheck: true }, async (request) => {
  if (!request.app) throw new HttpsError('failed-precondition', 'app_check_required');
  const input = normalizeProviderRelinkInput(request.data);
  const a = actor(request as { auth?: { uid?: string; token?: Row } });

  // Email → provider uid через Firebase Auth (источник правды для провайдерского
  // email — тот же принцип, что enrichMetadataFromAuth в auth_identity.ts).
  let resolvedProviderUid: string | null = null;
  let authRecord: admin.auth.UserRecord | null = null;
  try {
    if (input.providerEmail) {
      authRecord = await admin.auth().getUserByEmail(input.providerEmail);
    } else if (input.providerUid) {
      authRecord = await admin.auth().getUser(input.providerUid);
    }
    resolvedProviderUid = text(authRecord?.uid, 160);
  } catch {
    throw new HttpsError('not-found', 'provider_not_found');
  }
  if (!resolvedProviderUid) throw new HttpsError('not-found', 'provider_not_found');
  const resolvedProvider = providerFromAuthRecord(authRecord);
  if (!resolvedProvider) throw new HttpsError('failed-precondition', 'provider_unsupported');

  const db = admin.firestore();
  const userRef = db.collection(USERS).doc(input.uid);
  const linkRef = db.collection(AUTH_LINKS).doc(resolvedProviderUid);
  const markerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(resolvedProviderUid);
  const targetTombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(input.uid);
  const opRef = db.collection('admin_command_operations').doc(`auth_provider_relink_${input.idempotencyKey}`);
  const auditRef = db.collection('admin_log').doc();
  const now = Date.now();
  const fingerprint = JSON.stringify({
    action: 'auth_provider_relink',
    uid: input.uid,
    providerUid: resolvedProviderUid,
    reason: input.reason,
  });

  return db.runTransaction(async (tx) => {
    const op = await tx.get(opRef);
    if (op.exists) {
      const d = op.data() ?? {};
      if (d.requestFingerprint !== fingerprint || d.actorUid !== a.actorUid) {
        throw new HttpsError('already-exists', 'idempotency key replay mismatch');
      }
      return { ...(record(d.result) ? d.result : {}), replayed: true };
    }

    const [userSnap, linkSnap, markerSnap, targetTombstoneSnap] = await Promise.all([
      tx.get(userRef),
      tx.get(linkRef),
      tx.get(markerRef),
      tx.get(targetTombstoneRef),
    ]);
    if (!userSnap.exists) throw new HttpsError('not-found', 'user not found');
    if (markerSnap.exists || targetTombstoneSnap.exists) {
      // Инвариант ensureAuthLinkDoc: uid с незавершённым удалением не привязываем.
      throw new HttpsError('failed-precondition', 'account_delete_pending');
    }

    const userData = userSnap.data() ?? {};
    const linked = readLinkedAuth(userData);
    const oldFirebaseAuthUid = text(userData.firebaseAuthUid, 160);
    const previousProviderUids = Array.from(new Set(
      [oldFirebaseAuthUid, linked.providerUid].filter((value) => value && value !== resolvedProviderUid),
    ));
    const previousProviderLinkRefs = previousProviderUids.map((uid) => db.collection(AUTH_LINKS).doc(uid));
    const previousProviderMarkerRefs = previousProviderUids.map(
      (uid) => db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(uid),
    );
    const [previousProviderLinkSnaps, previousProviderMarkerSnaps] = await Promise.all([
      Promise.all(previousProviderLinkRefs.map((ref) => tx.get(ref))),
      Promise.all(previousProviderMarkerRefs.map((ref) => tx.get(ref))),
    ]);
    if (previousProviderMarkerSnaps.some((snapshot) => snapshot.exists)) {
      throw new HttpsError('failed-precondition', 'account_delete_pending');
    }
    const linkData = linkSnap.data() ?? {};
    const previousLinkedStableId = text(linkData.stable_id, 160);
    const displacedStableId = previousLinkedStableId && previousLinkedStableId !== input.uid
      ? previousLinkedStableId
      : null;

    if (displacedStableId) {
      const displacedUserRef = db.collection(USERS).doc(displacedStableId);
      const displacedTombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(displacedStableId);
      const [displacedUserSnap, displacedTombstoneSnap] = await Promise.all([
        tx.get(displacedUserRef),
        tx.get(displacedTombstoneRef),
      ]);
      if (displacedTombstoneSnap.exists) {
        throw new HttpsError('failed-precondition', 'account_delete_pending');
      }
      if (displacedUserSnap.exists && displacedUserSnap.data()?.identityHidden !== true) {
        throw new HttpsError('failed-precondition', 'provider_link_conflict');
      }
    }

    const provider = resolvedProvider;
    const email = input.providerEmail ?? (text(authRecord?.email, 320) || null) ?? linked.email;
    const displayName = text(authRecord?.displayName, 160) || linked.displayName;

    const before: Row = {
      users: {
        firebaseAuthUid: oldFirebaseAuthUid || null,
        linkedAuthProviderUid: linked.providerUid || null,
        linkedAuthProvider: linked.provider,
      },
      authLink: summarizeLinkDoc(linkSnap),
      previousProviderUids,
    };

    // auth_links/{providerUid} — форма ensureAuthLinkDoc (merge, linkedAt сохраняем).
    const linkedAt = numeric(linkData.linkedAt) > 0 ? numeric(linkData.linkedAt) : now;
    previousProviderLinkSnaps.forEach((snapshot, index) => {
      if (snapshot.exists && text(snapshot.data()?.stable_id, 160) === input.uid) {
        tx.delete(previousProviderLinkRefs[index]);
      }
    });
    tx.set(linkRef, {
      stable_id: input.uid,
      updatedAt: now,
      ...(provider
        ? {
          providerUid: resolvedProviderUid,
          provider,
          linkedAt,
          lastSignInAt: now,
          email: email ?? null,
          displayName: displayName ?? null,
        }
        : {}),
    }, { merge: true });

    // users/{stableId} — форма ensureProviderLinkedAuth.
    tx.set(userRef, {
      firebaseAuthUid: resolvedProviderUid,
      ...(provider
        ? {
          linkedAuth: {
            provider,
            providerUid: resolvedProviderUid,
            email: email ?? null,
            displayName: displayName ?? null,
            linkedAt: now,
            lastSignInAt: now,
            devicePlatform: linked.devicePlatform ?? 'web',
          },
        }
        : {}),
      updatedAt: now,
    }, { merge: true });

    const after: Row = {
      users: {
        firebaseAuthUid: resolvedProviderUid,
        linkedAuthProviderUid: provider ? resolvedProviderUid : (linked.providerUid || null),
        linkedAuthProvider: provider,
      },
      authLink: {
        stable_id: input.uid,
        providerUid: provider ? resolvedProviderUid : (linkData.providerUid ?? null),
        provider: provider ?? (linkData.provider ?? null),
        linkedAt,
      },
      previousProviderUids,
      ...(displacedStableId ? { displacedStableId } : {}),
    };
    const audit = createAuditRecord({
      action: 'auth_provider_relink',
      actorUid: a.actorUid,
      role: a.role,
      entity: { collection: USERS, id: input.uid },
      reason: input.reason,
      before,
      after,
      requestId: input.requestId,
      timestamp: new Date(now).toISOString(),
    });
    tx.create(auditRef, { ...audit, operationId: opRef.id });

    const result = {
      ok: true,
      uid: input.uid,
      providerUid: resolvedProviderUid,
      previousProviderUids,
      auditId: auditRef.id,
    };
    tx.create(opRef, {
      action: 'auth_provider_relink',
      requestFingerprint: fingerprint,
      actorUid: a.actorUid,
      auditId: auditRef.id,
      result,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return result;
  });
});
