import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasClaimedPermission } from './admin/permissions';
import { ENFORCE_APP_CHECK_ADMIN } from './callable_options';

const REGION = 'us-central1';
export const ADMIN_USER_BRIEFS_MAX_UIDS = 80;
export const ADMIN_USER_BRIEFS_RATE_LIMIT_COLLECTION = 'admin_user_briefs_rate_limits';
export const ADMIN_USER_BRIEFS_RATE_LIMIT_WINDOW_MS = 60_000;
export const ADMIN_USER_BRIEFS_RATE_LIMIT_MAX_UIDS = 400;

type AdminUserBriefsAuth = {
  uid?: string;
  token?: Record<string, unknown>;
} | null | undefined;

type Data = FirebaseFirestore.DocumentData | undefined;

export interface AdminUserBrief {
  readonly uid: string;
  readonly name: string;
  readonly nameIndex: string;
  readonly avatar: string;
  readonly found: boolean;
}

function clean(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function object(value: unknown): FirebaseFirestore.DocumentData {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as FirebaseFirestore.DocumentData
    : {};
}

function first(max: number, ...values: unknown[]): string {
  for (const value of values) {
    const text = clean(value, max);
    if (text) return text;
  }
  return '';
}

export function assertAdminUserBriefsAccess(auth: AdminUserBriefsAuth): void {
  if (!clean(auth?.uid, 128) || auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  if (!hasClaimedPermission(auth.token, 'users.read')) {
    throw new HttpsError('permission-denied', 'Role cannot read users');
  }
}

export function parseAdminUserBriefsRequest(data: unknown): string[] {
  const input = object(data);
  if (!Array.isArray(input.uids)) {
    throw new HttpsError('invalid-argument', 'admin_user_briefs_uids_required');
  }
  if (input.uids.length > ADMIN_USER_BRIEFS_MAX_UIDS) {
    throw new HttpsError('invalid-argument', 'admin_user_briefs_too_many_uids');
  }
  const unique = [...new Set(input.uids.map((value) => clean(value, 129)).filter(Boolean))];
  for (const uid of unique) {
    if (uid.length > 128 || uid === '.' || uid === '..' || uid.includes('/')) {
      throw new HttpsError('invalid-argument', 'admin_user_briefs_uid_invalid');
    }
  }
  return unique;
}

export function planAdminUserBriefsRateLimit(
  persisted: Data,
  input: { actorUid: string; requestedCount: number; nowMs: number },
): Record<string, unknown> & { usedUids: number } {
  const actorUid = clean(input.actorUid, 128);
  const requestedCount = Number(input.requestedCount);
  const nowMs = Number(input.nowMs);
  if (!actorUid || !Number.isSafeInteger(requestedCount) || requestedCount < 0
    || requestedCount > ADMIN_USER_BRIEFS_RATE_LIMIT_MAX_UIDS
    || !Number.isSafeInteger(nowMs) || nowMs <= 0) {
    throw new HttpsError('invalid-argument', 'admin_user_briefs_rate_limit_input_invalid');
  }
  const current = object(persisted);
  const hasCurrent = Object.keys(current).length > 0;
  if (hasCurrent && (current.schemaVersion !== 'admin-user-briefs-rate-limit.v1'
    || clean(current.actorUid, 128) !== actorUid
    || !Number.isSafeInteger(Number(current.windowStartedAtMs))
    || !Number.isSafeInteger(Number(current.usedUids)))) {
    throw new HttpsError('internal', 'admin_user_briefs_rate_limit_corrupt');
  }
  const currentWindowStartedAtMs = Number(current.windowStartedAtMs ?? 0);
  const sameWindow = hasCurrent
    && nowMs >= currentWindowStartedAtMs
    && nowMs - currentWindowStartedAtMs < ADMIN_USER_BRIEFS_RATE_LIMIT_WINDOW_MS;
  const usedUids = (sameWindow ? Number(current.usedUids) : 0) + requestedCount;
  if (usedUids > ADMIN_USER_BRIEFS_RATE_LIMIT_MAX_UIDS) {
    throw new HttpsError('resource-exhausted', 'admin_user_briefs_rate_limited');
  }
  return {
    schemaVersion: 'admin-user-briefs-rate-limit.v1',
    actorUid,
    windowStartedAtMs: sameWindow ? currentWindowStartedAtMs : nowMs,
    usedUids,
    updatedAtMs: nowMs,
  };
}

export function projectAdminUserBrief(uid: string, userData: Data, publicData: Data): AdminUserBrief {
  const user = object(userData);
  const progress = object(user.progress);
  const profile = object(publicData);
  const name = first(
    120,
    progress.user_name,
    progress.userName,
    user.user_name,
    user.userName,
    profile.name,
    profile.user_name,
    profile.userName,
    profile.displayName,
    user.displayName,
    user.name,
  );
  const nameIndex = first(
    40,
    progress.user_name_index,
    progress.userNameIndex,
    progress.nameIndex,
    user.user_name_index,
    user.userNameIndex,
    user.nameIndex,
    profile.user_name_index,
    profile.userNameIndex,
    profile.nameIndex,
    profile.userIndex,
    profile.profileIndex,
  );
  const avatar = first(
    120,
    progress.user_avatar,
    progress.userAvatar,
    progress.avatar,
    user.user_avatar,
    user.userAvatar,
    user.avatar,
    profile.avatar,
    profile.avatarKey,
  );
  return Object.freeze({
    uid: clean(uid, 128),
    name,
    nameIndex,
    avatar,
    found: Boolean(Object.keys(user).length || Object.keys(profile).length),
  });
}

export const adminUserBriefs = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK_ADMIN },
  async (request) => {
    assertAdminUserBriefsAccess(request.auth as AdminUserBriefsAuth);
    const rawCount = Array.isArray(request.data?.uids) ? request.data.uids.length : 0;
    const uids = parseAdminUserBriefsRequest(request.data);
    if (!uids.length) return { ok: true, briefs: [] as AdminUserBrief[] };

    const db = getFirestore();
    const actorUid = clean(request.auth?.uid, 128);
    const quotaRef = db.collection(ADMIN_USER_BRIEFS_RATE_LIMIT_COLLECTION).doc(actorUid);
    await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(quotaRef);
      tx.set(quotaRef, planAdminUserBriefsRateLimit(snapshot.data(), {
        actorUid,
        requestedCount: rawCount,
        nowMs: Date.now(),
      }));
    });
    const [userSnapshots, publicSnapshots] = await Promise.all([
      db.getAll(...uids.map((uid) => db.collection('users').doc(uid))),
      db.getAll(...uids.map((uid) => db.collection('public_profiles').doc(uid))),
    ]);
    const briefs = uids.map((uid, index) => projectAdminUserBrief(
      uid,
      userSnapshots[index]?.data(),
      publicSnapshots[index]?.data(),
    ));
    return { ok: true, briefs };
  },
);
