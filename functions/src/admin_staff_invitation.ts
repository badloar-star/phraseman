import { createHash } from 'node:crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ADMIN_SENSITIVE_WRITE_OPTIONS } from './callable_options';
import { ADMIN_STAFF_OWNER_UID, type StaffAuthIdentity } from './admin_staff_membership';
import { consumeRateWindow, type RateWindow } from './admin_staff_membership_core';
import {
  buildInvitationCreate,
  buildInvitationRevoke,
  invitationCreateDigest,
  invitationReservationId,
  invitationRevokeDigest,
  maskInvitationEmail,
  normalizeInvitationEmail,
  parseCreateInvitationInput,
  parseRevokeInvitationInput,
  parseStaffInvitationAudit,
  parseStoredInvitation,
  type CreateInvitationInput,
  type EffectiveInvitationStatus,
  type RevokeInvitationInput,
} from './admin_staff_invitation_core';

const INVITATIONS = 'admin_staff_invitations';
const AUDIT = 'admin_staff_invitation_audit';
const RATE_LIMITS = 'admin_staff_rate_limits';
const UID_RE = /^[A-Za-z0-9._-]{1,160}$/;

export const ADMIN_STAFF_INVITATION_OPTIONS = Object.freeze({
  ...ADMIN_SENSITIVE_WRITE_OPTIONS,
  timeoutSeconds: 15,
  memory: '256MiB' as const,
  maxInstances: 1,
  concurrency: 1,
  cpu: 'gcf_gen1' as const,
});

interface StaffCallableRequest {
  readonly auth?: { readonly uid?: unknown; readonly token?: Readonly<Record<string, unknown>> } | null;
  readonly data?: unknown;
}

type InvitationMutationReceipt = Readonly<{ reservationId: string; revision: number; status: 'pending' | 'revoked';
  createdAtMs: number; replayed: boolean }>;
type InvitationRow = Readonly<{ id: string; data: unknown }>;

export interface StaffInvitationDependencies {
  readonly ownerUid: string;
  readonly now: () => number;
  readonly consumeRateLimit: (scope: string, uid: string, limit: number, windowMs: number, nowMs: number) => Promise<void>;
  readonly loadAuthIdentityByUid: (uid: string) => Promise<StaffAuthIdentity | null>;
  readonly authIdentityExistsByEmail: (email: string) => Promise<boolean>;
  readonly loadMutationReplay: (args: Readonly<{ actorUid: string; operationId: string; action: 'reserve' | 'revoke';
    requestDigest: string }>) => Promise<InvitationMutationReceipt | null>;
  readonly reserveInvitation: (args: Readonly<{ actorUid: string; ownerUid: string; reservationId: string;
    input: CreateInvitationInput; nowMs: number }>) => Promise<InvitationMutationReceipt>;
  readonly revokeInvitation: (args: Readonly<{ actorUid: string; ownerUid: string; input: RevokeInvitationInput;
    nowMs: number }>) => Promise<InvitationMutationReceipt>;
  readonly listInvitations: (limit: number) => Promise<readonly InvitationRow[]>;
}

function verifiedOwner(request: StaffCallableRequest, deps: StaffInvitationDependencies): Readonly<{ uid: string; ownerUid: string }> {
  const uid = request.auth?.uid;
  if (typeof uid !== 'string' || !UID_RE.test(uid)) throw new HttpsError('unauthenticated', 'authentication_required');
  if (request.auth?.token?.email_verified !== true) throw new HttpsError('permission-denied', 'verified_email_required');
  if (!UID_RE.test(deps.ownerUid)) throw new HttpsError('failed-precondition', 'staff_owner_not_configured');
  if (uid !== deps.ownerUid) throw new HttpsError('permission-denied', 'owner_required');
  return Object.freeze({ uid, ownerUid: deps.ownerUid });
}

function exactEmptyData(value: unknown): void {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype || Object.keys(value).length !== 0) {
    throw new Error('invalid_request');
  }
}

async function assertCurrentOwner(deps: StaffInvitationDependencies, uid: string): Promise<void> {
  const identity = await deps.loadAuthIdentityByUid(uid);
  if (!identity || identity.uid !== uid || identity.disabled || !identity.emailVerified) throw new Error('owner_required');
}

function translate(error: unknown): never {
  if (error instanceof HttpsError) throw error;
  const code = error instanceof Error ? error.message : 'unknown';
  if (code === 'rate_limited') throw new HttpsError('resource-exhausted', 'staff_rate_limited');
  if (code === 'owner_required') throw new HttpsError('permission-denied', 'owner_required');
  if (code === 'invitation_email_already_registered' || code === 'invitation_already_pending' || code === 'invitation_expired') {
    throw new HttpsError('failed-precondition', code);
  }
  if (code === 'invitation_not_found') throw new HttpsError('not-found', code);
  if (code === 'revision_conflict') throw new HttpsError('aborted', code);
  if (code === 'idempotency_conflict') throw new HttpsError('already-exists', code);
  if (code.startsWith('invalid_') || code === 'invitation_not_pending') throw new HttpsError('invalid-argument', code);
  console.error('admin_staff_invitation internal failure', { code });
  throw new HttpsError('internal', 'staff_invitation_failed');
}

function ownerProjection(invitation: unknown, expectedReservationId: string, nowMs: number): Readonly<{
  reservationId: string; revision: number; status: EffectiveInvitationStatus; emailMasked: string; badge: string;
  reservationCode: string; createdAtMs: number; expiresAtMs: number; activation: 'blocked_identity_isolation_required';
}> {
  if (!UID_RE.test(expectedReservationId)) throw new Error('invalid_invitation');
  const parsed = parseStoredInvitation(invitation, expectedReservationId, nowMs);
  return Object.freeze({ reservationId: parsed.reservationId, reservationCode: parsed.reservationId.slice(0, 8).toUpperCase(),
    revision: parsed.revision, status: parsed.effectiveStatus,
    emailMasked: parsed.emailMasked, badge: parsed.badge, createdAtMs: parsed.createdAtMs, expiresAtMs: parsed.expiresAtMs,
    activation: 'blocked_identity_isolation_required' });
}

export async function handleAdminStaffCreateInvitation(request: StaffCallableRequest, deps: StaffInvitationDependencies) {
  const { uid, ownerUid } = verifiedOwner(request, deps);
  const nowMs = deps.now();
  try {
    await deps.consumeRateLimit('invitation-create', uid, 5, 60_000, nowMs);
    await assertCurrentOwner(deps, uid);
    const input = parseCreateInvitationInput(request.data);
    const replay = await deps.loadMutationReplay({ actorUid: uid, operationId: input.operationId, action: 'reserve',
      requestDigest: invitationCreateDigest(uid, input) });
    if (replay) return Object.freeze({ schemaVersion: 1 as const, reservationId: replay.reservationId,
      reservationCode: replay.reservationId.slice(0, 8).toUpperCase(), revision: replay.revision, status: replay.status,
      emailMasked: maskInvitationEmail(input.email), badge: input.badge,
      createdAtMs: replay.createdAtMs, expiresAtMs: replay.createdAtMs + input.expiresInHours * 60 * 60 * 1000,
      activation: 'blocked_identity_isolation_required' as const, replayed: true });
    if (await deps.authIdentityExistsByEmail(input.email)) throw new Error('invitation_email_already_registered');
    const result = await deps.reserveInvitation({ actorUid: uid, ownerUid, reservationId: invitationReservationId(input.email), input, nowMs });
    return Object.freeze({ schemaVersion: 1 as const, reservationId: result.reservationId,
      reservationCode: result.reservationId.slice(0, 8).toUpperCase(), revision: result.revision, status: result.status,
      emailMasked: maskInvitationEmail(input.email), badge: input.badge,
      createdAtMs: result.createdAtMs, expiresAtMs: result.createdAtMs + input.expiresInHours * 60 * 60 * 1000,
      activation: 'blocked_identity_isolation_required' as const, replayed: result.replayed });
  } catch (error) { return translate(error); }
}

export async function handleAdminStaffListInvitations(request: StaffCallableRequest, deps: StaffInvitationDependencies) {
  const { uid } = verifiedOwner(request, deps);
  const nowMs = deps.now();
  try {
    await deps.consumeRateLimit('invitation-list', uid, 10, 60_000, nowMs);
    await assertCurrentOwner(deps, uid);
    exactEmptyData(request.data);
    const rows = await deps.listInvitations(101);
    if (!Array.isArray(rows)) throw new Error('invalid_invitation_list');
    const truncated = rows.length > 100;
    const invitations = rows.slice(0, 100).map(row => {
      if (!row || !UID_RE.test(row.id)) throw new Error('invalid_invitation_list');
      return ownerProjection(row.data, row.id, nowMs);
    });
    return Object.freeze({ schemaVersion: 1 as const, truncated, invitations: Object.freeze(invitations) });
  } catch (error) { return translate(error); }
}

export async function handleAdminStaffRevokeInvitation(request: StaffCallableRequest, deps: StaffInvitationDependencies) {
  const { uid, ownerUid } = verifiedOwner(request, deps);
  const nowMs = deps.now();
  try {
    await deps.consumeRateLimit('invitation-revoke', uid, 10, 60_000, nowMs);
    await assertCurrentOwner(deps, uid);
    const input = parseRevokeInvitationInput(request.data);
    const replay = await deps.loadMutationReplay({ actorUid: uid, operationId: input.operationId, action: 'revoke',
      requestDigest: invitationRevokeDigest(uid, input) });
    if (replay) return Object.freeze({ schemaVersion: 1 as const, reservationId: replay.reservationId,
      revision: replay.revision, status: replay.status, replayed: true });
    const result = await deps.revokeInvitation({ actorUid: uid, ownerUid, input, nowMs });
    return Object.freeze({ schemaVersion: 1 as const, reservationId: result.reservationId,
      revision: result.revision, status: result.status, replayed: result.replayed });
  } catch (error) { return translate(error); }
}

export function createStaffInvitationFirestoreDependencies(
  db: admin.firestore.Firestore,
  ownerUid: string,
  now: () => number = () => Date.now(),
  authReader: Pick<admin.auth.Auth, 'getUser' | 'getUserByEmail'> | null = null,
): StaffInvitationDependencies {
  const authOrFail = () => { if (!authReader) throw new Error('auth_reader_unavailable'); return authReader; };
  const missingAuth = (error: unknown) => Boolean(error && typeof error === 'object' && 'code' in error &&
    (error as { code?: unknown }).code === 'auth/user-not-found');
  const toIdentity = (user: admin.auth.UserRecord): StaffAuthIdentity => Object.freeze({ uid: user.uid,
    email: typeof user.email === 'string' ? user.email.trim().toLowerCase() : '', emailVerified: user.emailVerified === true,
    disabled: user.disabled === true });
  const replayReceipt = (raw: unknown, operationId: string, action: 'reserve' | 'revoke', actorUid: string,
    digest: string): InvitationMutationReceipt => {
    const audit = parseStaffInvitationAudit(raw, operationId);
    if (audit.action !== action || audit.actorUid !== actorUid || audit.requestDigest !== digest) throw new Error('idempotency_conflict');
    return Object.freeze({ reservationId: audit.reservationId, revision: audit.resultRevision,
      status: audit.resultStatus, createdAtMs: audit.createdAtMs, replayed: true });
  };
  return {
    ownerUid,
    now,
    async consumeRateLimit(scope, uid, limit, windowMs, nowMs) {
      const key = createHash('sha256').update(`${scope}\u0000${uid}`).digest('hex');
      const ref = db.collection(RATE_LIMITS).doc(key);
      await db.runTransaction(async tx => {
        const snap = await tx.get(ref);
        const raw = snap.exists ? snap.data() : null;
        let current: RateWindow | null = null;
        if (raw !== null) {
          if (!raw || typeof raw.windowStartedAtMs !== 'number' || typeof raw.count !== 'number') throw new Error('invalid_rate_state');
          current = { windowStartedAtMs: raw.windowStartedAtMs, count: raw.count };
        }
        const next = consumeRateWindow(current, nowMs, limit, windowMs);
        tx.set(ref, { schemaVersion: 1, scope, ...next, updatedAtMs: nowMs }, { merge: false });
      });
    },
    async loadAuthIdentityByUid(uid) {
      try { return toIdentity(await authOrFail().getUser(uid)); }
      catch (error) { if (missingAuth(error)) return null; throw error; }
    },
    async authIdentityExistsByEmail(email) {
      try { await authOrFail().getUserByEmail(normalizeInvitationEmail(email)); return true; }
      catch (error) { if (missingAuth(error)) return false; throw error; }
    },
    async loadMutationReplay(args) {
      const snapshot = await db.collection(AUDIT).doc(args.operationId).get();
      return snapshot.exists ? replayReceipt(snapshot.data(), args.operationId, args.action, args.actorUid, args.requestDigest) : null;
    },
    async reserveInvitation(args) {
      const invitationRef = db.collection(INVITATIONS).doc(args.reservationId);
      const auditRef = db.collection(AUDIT).doc(args.input.operationId);
      return db.runTransaction(async tx => {
        const auditSnap = await tx.get(auditRef);
        if (auditSnap.exists) {
          return replayReceipt(auditSnap.data(), args.input.operationId, 'reserve', args.actorUid,
            invitationCreateDigest(args.actorUid, args.input));
        }
        const invitationSnap = await tx.get(invitationRef);
        const existing = invitationSnap.exists ? parseStoredInvitation(invitationSnap.data(), args.reservationId, args.nowMs) : null;
        const plan = buildInvitationCreate({ ...args, current: invitationSnap.exists ? invitationSnap.data() : null });
        tx.set(invitationRef, plan.invitation, { merge: false });
        tx.create(auditRef, plan.audit);
        return Object.freeze({ reservationId: plan.invitation.reservationId, revision: plan.invitation.revision,
          status: plan.invitation.status, createdAtMs: plan.audit.createdAtMs, replayed: false });
      });
    },
    async revokeInvitation(args) {
      const invitationRef = db.collection(INVITATIONS).doc(args.input.reservationId);
      const auditRef = db.collection(AUDIT).doc(args.input.operationId);
      return db.runTransaction(async tx => {
        const auditSnap = await tx.get(auditRef);
        if (auditSnap.exists) return replayReceipt(auditSnap.data(), args.input.operationId, 'revoke', args.actorUid,
          invitationRevokeDigest(args.actorUid, args.input));
        const invitationSnap = await tx.get(invitationRef);
        if (!invitationSnap.exists) throw new Error('invitation_not_found');
        const existing = parseStoredInvitation(invitationSnap.data(), args.input.reservationId, args.nowMs);
        const plan = buildInvitationRevoke({ ...args, current: invitationSnap.data() });
        tx.set(invitationRef, plan.invitation, { merge: false });
        tx.create(auditRef, plan.audit);
        return Object.freeze({ reservationId: plan.invitation.reservationId, revision: plan.invitation.revision,
          status: plan.invitation.status, createdAtMs: plan.audit.createdAtMs, replayed: false });
      });
    },
    async listInvitations(limit) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 101) throw new Error('invalid_list_limit');
      const snapshot = await db.collection(INVITATIONS).orderBy(admin.firestore.FieldPath.documentId()).limit(limit).get();
      return Object.freeze(snapshot.docs.map(doc => Object.freeze({ id: doc.id, data: doc.data() })));
    },
  };
}

function firestoreDependencies(): StaffInvitationDependencies {
  return createStaffInvitationFirestoreDependencies(admin.firestore(), ADMIN_STAFF_OWNER_UID.value(), () => Date.now(), admin.auth());
}

export const adminStaffCreateInvitation = onCall(ADMIN_STAFF_INVITATION_OPTIONS, request =>
  handleAdminStaffCreateInvitation(request, firestoreDependencies()));
export const adminStaffListInvitations = onCall(ADMIN_STAFF_INVITATION_OPTIONS, request =>
  handleAdminStaffListInvitations(request, firestoreDependencies()));
export const adminStaffRevokeInvitation = onCall(ADMIN_STAFF_INVITATION_OPTIONS, request =>
  handleAdminStaffRevokeInvitation(request, firestoreDependencies()));
