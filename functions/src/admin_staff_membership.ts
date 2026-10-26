import { createHash } from 'node:crypto';
import * as admin from 'firebase-admin';
import { defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ADMIN_SENSITIVE_WRITE_OPTIONS } from './callable_options';
import { assertOwner, type StaffIdentity } from './admin_staff_contract';
import {
  buildMembershipMutation,
  consumeRateWindow,
  membershipMutationDigest,
  parseMembershipMutationInput,
  parseStoredMembership,
  type MembershipMutationInput,
  type RateWindow,
  type StoredStaffMembership,
} from './admin_staff_membership_core';

const MEMBERS = 'admin_staff_members';
const AUDIT = 'admin_staff_audit';
const RATE_LIMITS = 'admin_staff_rate_limits';
const UID_RE = /^[A-Za-z0-9._-]{1,160}$/;

export const ADMIN_STAFF_OWNER_UID = defineString('ADMIN_STAFF_OWNER_UID', { default: '' });
export const ADMIN_STAFF_CALLABLE_OPTIONS = Object.freeze({
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

export interface StaffMembershipDependencies {
  readonly ownerUid: string;
  readonly now: () => number;
  readonly consumeRateLimit: (scope: string, uid: string, limit: number, windowMs: number, nowMs: number) => Promise<void>;
  readonly loadMember: (uid: string) => Promise<unknown | null>;
  readonly listMemberRows: (limit: number) => Promise<readonly Readonly<{ uid: string; data: unknown }>[]>;
  readonly loadAuthIdentityByEmail: (email: string) => Promise<StaffAuthIdentity | null>;
  readonly loadAuthIdentityByUid: (uid: string) => Promise<StaffAuthIdentity | null>;
  readonly loadAuthIdentitiesByUid: (uids: readonly string[]) => Promise<ReadonlyMap<string, StaffAuthIdentity>>;
  readonly loadMutationReplay: (args: Readonly<{
    actorUid: string;
    ownerUid: string;
    input: MembershipMutationInput;
  }>) => Promise<Readonly<{ revision: number; active: boolean; replayed: true }> | null>;
  readonly mutateMembership: (args: Readonly<{
    actorUid: string;
    ownerUid: string;
    input: MembershipMutationInput;
    nowMs: number;
  }>) => Promise<Readonly<{ revision: number; active: boolean; replayed: boolean }>>;
}

export interface StaffAuthIdentity {
  readonly uid: string;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly disabled: boolean;
}

function verifiedIdentity(request: StaffCallableRequest): StaffIdentity {
  const uid = request.auth?.uid;
  if (typeof uid !== 'string' || !UID_RE.test(uid)) throw new HttpsError('unauthenticated', 'authentication_required');
  if (request.auth?.token?.email_verified !== true) throw new HttpsError('permission-denied', 'verified_email_required');
  return Object.freeze({ uid, emailVerified: true });
}

function trustedOwnerUid(value: string): string {
  if (!UID_RE.test(value)) throw new HttpsError('failed-precondition', 'staff_owner_not_configured');
  return value;
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string' || value.length > 254) throw new Error('invalid_email');
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw new Error('invalid_email');
  return normalized;
}

function assertExactData(value: unknown, keys: readonly string[]): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Object.getPrototypeOf(value) !== Object.prototype) throw new Error('invalid_request');
  const actual = Object.keys(value);
  if (actual.length !== keys.length || !actual.every(key => keys.includes(key)) || !keys.every(key => Object.prototype.hasOwnProperty.call(value, key))) {
    throw new Error('invalid_request');
  }
}

function verifiedOwner(request: StaffCallableRequest, deps: StaffMembershipDependencies): Readonly<{ identity: StaffIdentity; ownerUid: string }> {
  const identity = verifiedIdentity(request);
  const ownerUid = trustedOwnerUid(deps.ownerUid);
  try {
    assertOwner(identity, ownerUid);
  } catch {
    throw new HttpsError('permission-denied', 'owner_required');
  }
  return Object.freeze({ identity, ownerUid });
}

function translate(error: unknown): never {
  if (error instanceof HttpsError) throw error;
  const code = error instanceof Error ? error.message : 'unknown';
  if (code === 'rate_limited') throw new HttpsError('resource-exhausted', 'staff_rate_limited');
  if (code === 'revision_conflict') throw new HttpsError('aborted', 'membership_revision_conflict');
  if (code === 'idempotency_conflict') throw new HttpsError('already-exists', 'membership_operation_conflict');
  if (code === 'auth_identity_not_found') throw new HttpsError('not-found', 'staff_identity_not_found');
  if (code === 'staff_target_not_eligible') throw new HttpsError('failed-precondition', 'staff_target_not_eligible');
  if (code === 'staff_activation_blocked_identity_isolation') throw new HttpsError('failed-precondition', code);
  if (code === 'owner_required') throw new HttpsError('permission-denied', 'owner_required');
  if (code === 'invalid_membership' || code === 'member_required') throw new HttpsError('permission-denied', 'staff_membership_required');
  if (code.startsWith('invalid_') || code === 'unsupported_section' || code === 'unsupported_mode' ||
      code === 'revoked_sections_forbidden' || code === 'cannot_create_inactive' ||
      code === 'owner_membership_forbidden') throw new HttpsError('invalid-argument', code);
  console.error('admin_staff_membership internal failure', { code });
  throw new HttpsError('internal', 'staff_membership_failed');
}

export async function handleAdminStaffGetSession(
  request: StaffCallableRequest,
  deps: StaffMembershipDependencies,
): Promise<Readonly<{ schemaVersion: 1; uid: string; active: true; revision: number; badge: string; sections: StoredStaffMembership['sections'] }>> {
  const identity = verifiedIdentity(request);
  const ownerUid = trustedOwnerUid(deps.ownerUid);
  if (identity.uid === ownerUid) throw new HttpsError('permission-denied', 'owner_staff_session_forbidden');
  const nowMs = deps.now();
  try {
    await deps.consumeRateLimit('session-read', identity.uid, 30, 60_000, nowMs);
    assertExactData(request.data, []);
    const currentIdentity = await deps.loadAuthIdentityByUid(identity.uid);
    if (!currentIdentity || currentIdentity.uid !== identity.uid || currentIdentity.disabled || !currentIdentity.emailVerified) {
      throw new Error('member_required');
    }
    const raw = await deps.loadMember(identity.uid);
    if (raw === null) throw new Error('member_required');
    const member = parseStoredMembership(raw, identity.uid);
    if (!member.active) throw new Error('member_required');
    return Object.freeze({ schemaVersion: 1, uid: member.uid, active: true, revision: member.revision,
      badge: member.badge, sections: member.sections });
  } catch (error) {
    return translate(error);
  }
}

export async function handleAdminStaffSetMembership(
  request: StaffCallableRequest,
  deps: StaffMembershipDependencies,
): Promise<Readonly<{ schemaVersion: 1; revision: number; active: boolean; replayed: boolean }>> {
  const { identity, ownerUid } = verifiedOwner(request, deps);
  const nowMs = deps.now();
  try {
    await deps.consumeRateLimit('membership-write', identity.uid, 10, 60_000, nowMs);
    const input = parseMembershipMutationInput(request.data);
    const replay = await deps.loadMutationReplay({ actorUid: identity.uid, ownerUid, input });
    if (replay) return Object.freeze({ schemaVersion: 1, ...replay });
    if (input.active) throw new Error('staff_activation_blocked_identity_isolation');
    const result = await deps.mutateMembership({ actorUid: identity.uid, ownerUid, input, nowMs });
    return Object.freeze({ schemaVersion: 1, ...result });
  } catch (error) {
    return translate(error);
  }
}

export async function handleAdminStaffResolveIdentity(
  request: StaffCallableRequest,
  deps: StaffMembershipDependencies,
): Promise<Readonly<{ schemaVersion: 1; uid: string; email: string; emailVerified: boolean; disabled: boolean }>> {
  const { identity, ownerUid } = verifiedOwner(request, deps);
  try {
    const nowMs = deps.now();
    await deps.consumeRateLimit('identity-lookup', identity.uid, 10, 60_000, nowMs);
    assertExactData(request.data, ['email']);
    const email = normalizeEmail(request.data.email);
    const target = await deps.loadAuthIdentityByEmail(email);
    if (!target) throw new Error('auth_identity_not_found');
    if (target.uid === ownerUid) throw new Error('owner_membership_forbidden');
    return Object.freeze({ schemaVersion: 1, uid: target.uid, email: normalizeEmail(target.email),
      emailVerified: target.emailVerified === true, disabled: target.disabled === true });
  } catch (error) {
    return translate(error);
  }
}

export async function handleAdminStaffListMemberships(
  request: StaffCallableRequest,
  deps: StaffMembershipDependencies,
): Promise<Readonly<{ schemaVersion: 1; truncated: boolean; members: readonly Readonly<{
  uid: string; email: string | null; emailVerified: boolean | null; disabled: boolean | null;
  active: boolean; revision: number; badge: string; sections: StoredStaffMembership['sections']; updatedAtMs: number;
}>[] }>> {
  const { identity } = verifiedOwner(request, deps);
  try {
    const nowMs = deps.now();
    await deps.consumeRateLimit('membership-list', identity.uid, 10, 60_000, nowMs);
    assertExactData(request.data, []);
    const rows = await deps.listMemberRows(101);
    if (!Array.isArray(rows)) throw new Error('invalid_member_list');
    const truncated = rows.length > 100;
    const members = rows.slice(0, 100).map(row => {
      if (!row || !UID_RE.test(row.uid)) throw new Error('invalid_member_list');
      return parseStoredMembership(row.data, row.uid);
    });
    const identities = await deps.loadAuthIdentitiesByUid(members.map(member => member.uid));
    const output = members.map(member => {
      const authIdentity = identities.get(member.uid) ?? null;
      if (authIdentity && authIdentity.uid !== member.uid) throw new Error('invalid_auth_identity');
      return Object.freeze({ uid: member.uid, email: authIdentity?.email ? normalizeEmail(authIdentity.email) : null,
        emailVerified: authIdentity ? authIdentity.emailVerified === true : null,
        disabled: authIdentity ? authIdentity.disabled === true : null, active: member.active,
        revision: member.revision, badge: member.badge, sections: member.sections, updatedAtMs: member.updatedAtMs });
    });
    return Object.freeze({ schemaVersion: 1, truncated, members: Object.freeze(output) });
  } catch (error) {
    return translate(error);
  }
}

export function createStaffMembershipFirestoreDependencies(
  db: admin.firestore.Firestore,
  ownerUid: string,
  now: () => number = () => Date.now(),
  authReader: Pick<admin.auth.Auth, 'getUser' | 'getUserByEmail' | 'getUsers'> | null = null,
): StaffMembershipDependencies {
  const toIdentity = (user: admin.auth.UserRecord): StaffAuthIdentity => Object.freeze({
    uid: user.uid,
    email: typeof user.email === 'string' ? user.email.trim().toLowerCase() : '',
    emailVerified: user.emailVerified === true,
    disabled: user.disabled === true,
  });
  const authOrFail = () => {
    if (!authReader) throw new Error('auth_reader_unavailable');
    return authReader;
  };
  const isMissingAuthUser = (error: unknown) => Boolean(error && typeof error === 'object' &&
    'code' in error && (error as { code?: unknown }).code === 'auth/user-not-found');
  const parseMutationReplay = (raw: unknown, actorUid: string, ownerUid: string, input: MembershipMutationInput) => {
    if (actorUid !== ownerUid || !raw || typeof raw !== 'object' || Object.getPrototypeOf(raw) !== Object.prototype) {
      throw new Error('invalid_audit');
    }
    const row = raw as Record<string, unknown>;
    const requestedDigest = membershipMutationDigest(actorUid, input);
    if (row.requestDigest !== requestedDigest || row.actorUid !== actorUid || row.targetUid !== input.targetUid) {
      throw new Error('idempotency_conflict');
    }
    if (!Number.isSafeInteger(row.resultRevision) || Number(row.resultRevision) < 1 || typeof row.resultActive !== 'boolean') {
      throw new Error('invalid_audit');
    }
    return Object.freeze({ revision: row.resultRevision as number, active: row.resultActive as boolean, replayed: true as const });
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
    async loadMember(uid) {
      const snap = await db.collection(MEMBERS).doc(uid).get();
      return snap.exists ? snap.data() ?? null : null;
    },
    async listMemberRows(limit) {
      if (!Number.isSafeInteger(limit) || limit < 1 || limit > 101) throw new Error('invalid_list_limit');
      const snap = await db.collection(MEMBERS).orderBy(admin.firestore.FieldPath.documentId()).limit(limit).get();
      return Object.freeze(snap.docs.map(doc => Object.freeze({ uid: doc.id, data: doc.data() })));
    },
    async loadAuthIdentityByEmail(email) {
      try { return toIdentity(await authOrFail().getUserByEmail(normalizeEmail(email))); }
      catch (error) { if (isMissingAuthUser(error)) return null; throw error; }
    },
    async loadAuthIdentityByUid(uid) {
      try { return toIdentity(await authOrFail().getUser(uid)); }
      catch (error) { if (isMissingAuthUser(error)) return null; throw error; }
    },
    async loadAuthIdentitiesByUid(uids) {
      if (!uids.length) return new Map();
      const result = await authOrFail().getUsers(uids.map(uid => ({ uid })));
      return new Map(result.users.map(user => {
        const identity = toIdentity(user);
        return [identity.uid, identity] as const;
      }));
    },
    async loadMutationReplay(args) {
      const snap = await db.collection(AUDIT).doc(args.input.operationId).get();
      return snap.exists ? parseMutationReplay(snap.data(), args.actorUid, args.ownerUid, args.input) : null;
    },
    async mutateMembership(args) {
      const memberRef = db.collection(MEMBERS).doc(args.input.targetUid);
      const auditRef = db.collection(AUDIT).doc(args.input.operationId);
      return db.runTransaction(async tx => {
        const auditSnap = await tx.get(auditRef);
        if (auditSnap.exists) {
          return parseMutationReplay(auditSnap.data(), args.actorUid, args.ownerUid, args.input);
        }
        const memberSnap = await tx.get(memberRef);
        const current = memberSnap.exists ? parseStoredMembership(memberSnap.data(), args.input.targetUid) : null;
        const plan = buildMembershipMutation({ ...args, current });
        tx.set(memberRef, plan.member, { merge: false });
        tx.create(auditRef, plan.audit);
        return Object.freeze({ revision: plan.member.revision, active: plan.member.active, replayed: false });
      });
    },
  };
}

function firestoreDependencies(): StaffMembershipDependencies {
  return createStaffMembershipFirestoreDependencies(admin.firestore(), ADMIN_STAFF_OWNER_UID.value(), () => Date.now(), admin.auth());
}

export const adminStaffGetSession = onCall(ADMIN_STAFF_CALLABLE_OPTIONS, request =>
  handleAdminStaffGetSession(request, firestoreDependencies()));

export const adminStaffSetMembership = onCall(ADMIN_STAFF_CALLABLE_OPTIONS, request =>
  handleAdminStaffSetMembership(request, firestoreDependencies()));

export const adminStaffResolveIdentity = onCall(ADMIN_STAFF_CALLABLE_OPTIONS, request =>
  handleAdminStaffResolveIdentity(request, firestoreDependencies()));

export const adminStaffListMemberships = onCall(ADMIN_STAFF_CALLABLE_OPTIONS, request =>
  handleAdminStaffListMemberships(request, firestoreDependencies()));
