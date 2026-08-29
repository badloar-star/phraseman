import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { upsertEmailContact } from './email_contacts';
import {
  ACCOUNT_DELETE_AUTH_MARKERS,
  ACCOUNT_DELETE_PERMANENT_DENIALS,
  ACCOUNT_DELETE_TOMBSTONES,
  accountDeletePermanentDenialId,
} from './account_delete_job';
import {
  writeFirstAuthLinkGrowthAggregate,
} from './growth_daily_aggregate';

const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const LEADERBOARD = 'leaderboard';
const LEAGUE_GROUPS = 'league_groups';
const CLEANUP_CANDIDATES = 'identity_cleanup_candidates';
const IDENTITY_CLEANUP_THROTTLE_MS = 6 * 60 * 60 * 1000;

type AuthProvider = 'google' | 'apple';

type IdentityCleanupStats = {
  leaderboardMerged: number;
  leaderboardHidden: number;
  usersHidden: number;
  nameIndexHidden: number;
  candidatesRecorded: number;
  leagueGroupsTouched: number;
  leagueMembersHidden: number;
  skipped: boolean;
};

type ResolveStableUidForAuthOptions = {
  requireKnownIdentity?: boolean;
  allowProviderRelink?: boolean;
  allowAnonRelink?: boolean;
  repairLinks?: boolean;
};

type StableIdentityCandidate = {
  id: string;
  sourceStableIds: string[];
  hidden: boolean;
  hasAuthoritativeOwner: boolean;
  hasProviderLink: boolean;
  xp: number;
  updatedAt: number;
};

type StableIdentitySelection = {
  stableUid: string;
  sourceStableIds: string[];
};

type AuthLinkAnchor = {
  anchorStableId: string;
  selection: StableIdentitySelection | null;
};

type AuthLinkMetadata = {
  email?: string | null;
  displayName?: string | null;
  lastSignInAt?: number;
  devicePlatform?: 'ios' | 'android' | 'web';
};

function shouldRepairIdentityLinks(options?: ResolveStableUidForAuthOptions): boolean {
  return options?.repairLinks !== false;
}

type RetiredIdentitySubject = 'auth' | 'stable' | 'closure';

function throwIdentityRetired(subject: RetiredIdentitySubject): never {
  throw new HttpsError('failed-precondition', 'identity_retired', {
    subject,
    recovery: 'create_fresh_anonymous',
  });
}

function throwIdentityCheckUnavailable(error: unknown): never {
  if (error instanceof HttpsError) throw error;
  throw new HttpsError('unavailable', 'identity_check_unavailable');
}

async function readIdentityOrThrow<T>(read: Promise<T>): Promise<T> {
  try {
    return await read;
  } catch (error) {
    return throwIdentityCheckUnavailable(error);
  }
}

async function assertAccountDeletionNotPending(
  db: admin.firestore.Firestore,
  authUid: string,
): Promise<void> {
  const [marker, permanentDenial] = await Promise.all([
    readIdentityOrThrow(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid).get()),
    readIdentityOrThrow(
      db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
        .doc(accountDeletePermanentDenialId(authUid))
        .get(),
    ),
  ]);
  if (marker.exists || permanentDenial.exists) {
    throwIdentityRetired('auth');
  }
}

async function assertStableDeletionNotPending(
  db: admin.firestore.Firestore,
  stableId: string,
): Promise<void> {
  const [tombstone, permanentDenial] = await Promise.all([
    readIdentityOrThrow(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableId).get()),
    readIdentityOrThrow(
      db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
        .doc(accountDeletePermanentDenialId(stableId))
        .get(),
    ),
  ]);
  if (tombstone.exists || permanentDenial.exists) {
    throwIdentityRetired('stable');
  }
}

async function assertStableAccountMergeNotPending(
  db: admin.firestore.Firestore,
  stableIds: readonly string[],
): Promise<void> {
  for (const stableId of [...new Set(stableIds.map(normalizeStableId).filter(Boolean))]) {
    const snapshot = await readIdentityOrThrow(db.collection(USERS).doc(stableId).get());
    if (snapshot.exists && snapshot.data()?.mistakePracticeMergePending === true) {
      throw new HttpsError('failed-precondition', 'account_merge_pending');
    }
  }
}

async function assertSelectionDeletionNotPending(
  db: admin.firestore.Firestore,
  selection: StableIdentitySelection,
): Promise<void> {
  const stableIds = [...new Set([...selection.sourceStableIds, selection.stableUid])];
  for (const stableId of stableIds) {
    await assertStableDeletionNotPending(db, stableId);
  }
}

function readHeaderValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] ?? '');
  return typeof value === 'string' ? value : '';
}

export function describeAppCheckHeader(value: unknown): Record<string, unknown> {
  const token = readHeaderValue(value).trim();
  const dotCount = token ? token.split('.').length - 1 : 0;
  let kind = 'missing';
  if (token) {
    const lower = token.toLowerCase();
    if (lower === 'null' || lower === 'undefined') kind = lower;
    else if (lower.startsWith('bearer ')) kind = 'bearer_prefixed';
    else if (dotCount === 2 && token.length > 80) kind = 'jwt_like';
    else if (token.length < 80) kind = 'short_non_jwt';
    else kind = 'long_non_jwt';
  }
  return {
    kind,
    present: token.length > 0,
    length: token.length,
    dotCount,
  };
}

function normalizeStableId(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanNullableString(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const clean = String(value).trim();
  return clean ? clean.slice(0, maxLength) : null;
}

function normalizeAuthLinkMetadata(value: unknown): AuthLinkMetadata | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  const out: AuthLinkMetadata = {};
  const email = cleanNullableString(raw.email, 320);
  const displayName = cleanNullableString(raw.displayName, 160);
  if (email !== undefined) out.email = email;
  if (displayName !== undefined) out.displayName = displayName;
  const lastSignInAt = typeof raw.lastSignInAt === 'number' && Number.isFinite(raw.lastSignInAt)
    ? raw.lastSignInAt
    : 0;
  if (lastSignInAt > 0) out.lastSignInAt = lastSignInAt;
  if (raw.devicePlatform === 'ios' || raw.devicePlatform === 'android' || raw.devicePlatform === 'web') {
    out.devicePlatform = raw.devicePlatform;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

/**
 * Дополняет metadata email/displayName из Firebase Auth, если клиент их не прислал.
 *
 * Корень бага «пустой linkedAuth.email у google/apple»: старые клиенты (и часть
 * путей входа) не клали email в linkMetadata, и он записывался как null, хотя в
 * Firebase Auth email ЕСТЬ и достоверен. Firebase Auth — источник правды для
 * провайдерского email, поэтому добираем его здесь на сервере. Значения, которые
 * клиент прислал явно, НЕ перезаписываем.
 */
async function enrichMetadataFromAuth(
  authUid: string,
  provider: AuthProvider | null,
  metadata?: AuthLinkMetadata,
): Promise<AuthLinkMetadata | undefined> {
  if (!provider) return metadata;
  const hasEmail = metadata != null
    && Object.prototype.hasOwnProperty.call(metadata, 'email')
    && cleanNullableString(metadata.email, 320) != null;
  const hasDisplayName = metadata != null
    && Object.prototype.hasOwnProperty.call(metadata, 'displayName')
    && cleanNullableString(metadata.displayName, 160) != null;
  if (hasEmail && hasDisplayName) return metadata;

  let rec: admin.auth.UserRecord | null = null;
  try {
    rec = await admin.auth().getUser(authUid);
  } catch {
    return metadata; // auth недоступен — оставляем как есть (не рушим вход)
  }
  const authEmail = cleanNullableString(rec.email, 320)
    ?? cleanNullableString(rec.providerData.find((p) => p.email)?.email, 320);
  const authDisplayName = cleanNullableString(rec.displayName, 160);

  const out: AuthLinkMetadata = { ...(metadata ?? {}) };
  if (!hasEmail && authEmail) out.email = authEmail;
  if (!hasDisplayName && authDisplayName) out.displayName = authDisplayName;
  return Object.keys(out).length > 0 ? out : metadata;
}

function readProgressXp(data: FirebaseFirestore.DocumentData | undefined): number {
  const raw = (data?.progress as { user_total_xp?: unknown } | undefined)?.user_total_xp;
  const n = parseInt(String(raw ?? '0'), 10);
  return Number.isFinite(n) ? n : 0;
}

function readUpdatedAt(data: FirebaseFirestore.DocumentData | undefined): number {
  const n = Number((data ?? {}).updatedAt);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function mergeStableIdentityCandidate(
  byId: Map<string, StableIdentityCandidate>,
  candidate: StableIdentityCandidate,
): void {
  const current = byId.get(candidate.id);
  if (!current) {
    byId.set(candidate.id, { ...candidate });
    return;
  }

  current.hasAuthoritativeOwner = current.hasAuthoritativeOwner || candidate.hasAuthoritativeOwner;
  current.hasProviderLink = current.hasProviderLink || candidate.hasProviderLink;
  current.xp = Math.max(current.xp, candidate.xp);
  current.updatedAt = Math.max(current.updatedAt, candidate.updatedAt);
  current.hidden = current.hidden && candidate.hidden;
  current.sourceStableIds = [...new Set([
    ...current.sourceStableIds,
    ...candidate.sourceStableIds,
  ])];
}

function pickBestStableIdentityCandidate(
  candidates: Iterable<StableIdentityCandidate>,
): StableIdentityCandidate | null {
  const list = Array.from(candidates);
  if (list.length === 0) return null;

  list.sort((a, b) => {
    if (a.hasAuthoritativeOwner !== b.hasAuthoritativeOwner) return a.hasAuthoritativeOwner ? -1 : 1;
    if (a.hidden !== b.hidden) return a.hidden ? 1 : -1;
    if (a.hasProviderLink !== b.hasProviderLink) return a.hasProviderLink ? -1 : 1;
    if (a.xp !== b.xp) return b.xp - a.xp;
    if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
    return a.id.localeCompare(b.id);
  });

  return list[0] ?? null;
}

function collectStableIdentityCandidates(
  docs: { id: string; data: () => FirebaseFirestore.DocumentData | undefined }[],
  authUid: string,
  liveCanonicalIds?: ReadonlySet<string>,
): Map<string, StableIdentityCandidate> {
  const out = new Map<string, StableIdentityCandidate>();
  for (const doc of docs) {
    const data = doc.data() ?? {};
    const canonicalStableId = normalizeStableId(data.canonicalStableId);
    const hidden = data.identityHidden === true;
    const linkedAuth = data.linkedAuth as { providerUid?: unknown } | undefined;
    const candidate: StableIdentityCandidate = {
      id: hidden && canonicalStableId && (!liveCanonicalIds || liveCanonicalIds.has(canonicalStableId))
        ? canonicalStableId
        : doc.id,
      sourceStableIds: [doc.id],
      hidden,
      hasAuthoritativeOwner: normalizeStableId(data.firebaseAuthUid) === authUid,
      hasProviderLink: normalizeStableId(linkedAuth?.providerUid) === authUid,
      xp: readProgressXp(data),
      updatedAt: readUpdatedAt(data),
    };
    mergeStableIdentityCandidate(out, candidate);
  }
  return out;
}

async function findStableUidForProviderAuth(
  db: admin.firestore.Firestore,
  authUid: string,
  authoritativeOnly = false,
): Promise<StableIdentitySelection | null> {
  const [byFirebaseAuthUidSnap, byLinkedAuthUidSnap] = await Promise.all([
    readIdentityOrThrow(db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(20).get()),
    authoritativeOnly
      ? Promise.resolve(null)
      : readIdentityOrThrow(db.collection(USERS).where('linkedAuth.providerUid', '==', authUid).limit(20).get()),
  ]);

  const docs: { id: string; data: () => FirebaseFirestore.DocumentData | undefined }[] = [];
  const seen = new Set<string>();

  for (const snap of [byFirebaseAuthUidSnap, byLinkedAuthUidSnap]) {
    for (const doc of snap?.docs ?? []) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      docs.push(doc);
    }
  }

  if (docs.length === 0) return null;

  // A hidden identity may point at a canonical document that was deleted or was
  // never created after an interrupted merge. Never return that dead id: the
  // live provider-owned document is safer than routing the caller to an empty
  // profile. Canonical documents already present in the provider queries cost no
  // extra reads; only out-of-query pointers need a targeted existence check.
  const liveCanonicalIds = new Set(docs.map((doc) => doc.id));
  const canonicalIdsToCheck = new Set<string>();
  for (const doc of docs) {
    const data = doc.data() ?? {};
    const canonicalStableId = normalizeStableId(data.canonicalStableId);
    if (data.identityHidden === true && canonicalStableId && !liveCanonicalIds.has(canonicalStableId)) {
      canonicalIdsToCheck.add(canonicalStableId);
    }
  }
  const candidateStableIds = new Set<string>(docs.map((doc) => doc.id));
  for (const canonicalStableId of canonicalIdsToCheck) candidateStableIds.add(canonicalStableId);
  await Promise.all(
    [...candidateStableIds].map((candidateStableId) => (
      assertStableDeletionNotPending(db, candidateStableId)
    )),
  );
  await Promise.all([...canonicalIdsToCheck].map(async (canonicalStableId) => {
    const snap = await readIdentityOrThrow(db.collection(USERS).doc(canonicalStableId).get());
    if (snap.exists) liveCanonicalIds.add(canonicalStableId);
  }));

  const candidatesById = collectStableIdentityCandidates(docs, authUid, liveCanonicalIds);
  const selected = pickBestStableIdentityCandidate(candidatesById.values());
  if (!selected) return null;
  return {
    stableUid: selected.id,
    // Carry every provider-owned candidate into the final repair transaction so
    // a concurrent permanent denial on any alias invalidates the whole relink.
    sourceStableIds: [...new Set([
      ...candidateStableIds,
      ...selected.sourceStableIds,
      selected.id,
    ])],
  };
}

async function findLiveAuthLinkAnchor(
  db: admin.firestore.Firestore,
  authUid: string,
): Promise<AuthLinkAnchor | null> {
  const linkSnap = await readIdentityOrThrow(db.collection(AUTH_LINKS).doc(authUid).get());
  const anchoredStableId = normalizeStableId(linkSnap?.data()?.stable_id);
  if (!anchoredStableId) return null;
  await assertStableDeletionNotPending(db, anchoredStableId);
  const anchoredUserSnap = await readIdentityOrThrow(db.collection(USERS).doc(anchoredStableId).get());
  if (!anchoredUserSnap.exists) {
    return { anchorStableId: anchoredStableId, selection: null };
  }
  const anchoredUserData = anchoredUserSnap.data() ?? {};
  const canonicalStableId = normalizeStableId(anchoredUserData.canonicalStableId);
  if (anchoredUserData.identityHidden === true && canonicalStableId && canonicalStableId !== anchoredStableId) {
    await assertStableDeletionNotPending(db, canonicalStableId);
    const canonicalSnap = await readIdentityOrThrow(db.collection(USERS).doc(canonicalStableId).get());
    const canonicalAuthUid = normalizeStableId(canonicalSnap?.data()?.firebaseAuthUid);
    if (canonicalSnap?.exists && canonicalAuthUid === authUid) {
      return {
        anchorStableId: anchoredStableId,
        selection: {
          stableUid: canonicalStableId,
          sourceStableIds: [anchoredStableId, canonicalStableId],
        },
      };
    }
  }
  return {
    anchorStableId: anchoredStableId,
    selection: { stableUid: anchoredStableId, sourceStableIds: [anchoredStableId] },
  };
}

type StableOwnerProof = {
  userExists: boolean;
  userAuthUid: string;
  linkedAuthUid: string;
  anonClaimAuthUid: string;
  anonClaimAt: number | null;
  authLinkExists: boolean;
  authLinkStableId: string;
  existingOwnerIds: readonly string[];
  authorization: 'self' | 'user' | 'link' | 'anon_relink';
};

function readAnonClaimFingerprint(userData: FirebaseFirestore.DocumentData): {
  authUid: string;
  at: number | null;
} {
  const claim = userData.anon_merge_claim;
  if (!claim || typeof claim !== 'object') return { authUid: '', at: null };
  const authUid = normalizeStableId((claim as { authUid?: unknown }).authUid);
  const atValue = Number((claim as { at?: unknown }).at);
  return { authUid, at: Number.isFinite(atValue) ? atValue : null };
}

function stableOwnerProofFromSnapshots(
  userSnap: FirebaseFirestore.DocumentSnapshot,
  linkSnap: FirebaseFirestore.DocumentSnapshot,
  authorization: StableOwnerProof['authorization'],
  existingOwnerIds: readonly string[] = [],
): StableOwnerProof {
  const userData = userSnap.data() ?? {};
  const claim = readAnonClaimFingerprint(userData);
  return {
    userExists: userSnap.exists,
    userAuthUid: normalizeStableId(userData.firebaseAuthUid),
    linkedAuthUid: normalizeStableId(
      (userData.linkedAuth as { providerUid?: unknown } | undefined)?.providerUid,
    ),
    anonClaimAuthUid: claim.authUid,
    anonClaimAt: claim.at,
    authLinkExists: linkSnap.exists,
    authLinkStableId: normalizeStableId(linkSnap.data()?.stable_id),
    existingOwnerIds: [...existingOwnerIds].sort(),
    authorization,
  };
}

async function assertStableOwner(
  db: admin.firestore.Firestore,
  authUid: string,
  stableId: string,
  options?: {
    allowProviderRelink?: boolean;
    allowAnonRelink?: boolean;
    allowedAuthLinkStableIds?: readonly string[];
  },
): Promise<StableOwnerProof> {
  if (!stableId || stableId.length > 160) {
    throw new HttpsError('invalid-argument', 'stable_id_required');
  }
  const [userSnap, linkSnap] = await Promise.all([
    readIdentityOrThrow(db.collection(USERS).doc(stableId).get()),
    readIdentityOrThrow(db.collection(AUTH_LINKS).doc(authUid).get()),
  ]);
  const userData = userSnap?.data() ?? {};
  const userAuthUid = String(userData.firebaseAuthUid ?? '').trim();
  const linkedStableId = String(linkSnap?.data()?.stable_id ?? '').trim();
  if (linkedStableId && linkedStableId !== stableId) {
    await assertStableDeletionNotPending(db, linkedStableId);
  }
  const allowedAuthLinkStableIds = new Set([
    stableId,
    ...(options?.allowedAuthLinkStableIds ?? []),
  ]);
  if (linkedStableId && allowedAuthLinkStableIds.has(linkedStableId)) {
    return stableOwnerProofFromSnapshots(userSnap, linkSnap, 'link');
  }
  const canonicalLinkConflicts = Boolean(linkedStableId && linkedStableId !== stableId);

  const linkedAuth = userData.linkedAuth;
  const hasProviderLink =
    linkedAuth != null &&
    typeof linkedAuth === 'object' &&
    typeof (linkedAuth as { providerUid?: unknown }).providerUid === 'string' &&
    String((linkedAuth as { providerUid?: unknown }).providerUid ?? '').trim().length > 0;
  const linkedAuthUid = hasProviderLink
    ? String((linkedAuth as { providerUid?: unknown }).providerUid ?? '').trim()
    : '';
  if (!canonicalLinkConflicts && userAuthUid === authUid) {
    return stableOwnerProofFromSnapshots(userSnap, linkSnap, 'user');
  }
  if (stableId === authUid && !canonicalLinkConflicts) {
    return stableOwnerProofFromSnapshots(userSnap, linkSnap, 'self');
  }

  const anonClaim = readAnonMergeClaim(userData, Date.now());
  const hasFreshPreviousOwnerProof = Boolean(userAuthUid && anonClaim?.authUid === userAuthUid);

  // Переустановка приложения пересоздаёт анонимный Firebase uid, но stable_id
  // остаётся в Keychain/AsyncStorage. Разрешаем перепривязать анонимный uid к тому
  // же stable_id, если: (а) аккаунт не имеет provider-привязки (чисто анонимный),
  // (б) новый uid ещё не занят другим stable_id, (в) явно запрошен allowAnonRelink.
  if (
    !canonicalLinkConflicts &&
    (options?.allowAnonRelink === true || options?.allowProviderRelink === true) &&
    hasFreshPreviousOwnerProof &&
    !linkedAuthUid
  ) {
    const existingByAuth = await readIdentityOrThrow(
      db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(1).get(),
    );
    const existingOwnerIds = (existingByAuth?.docs ?? []).map((doc) => doc.id).sort();
    if (existingOwnerIds.length === 0 || existingOwnerIds.every((id) => id === stableId)) {
      return stableOwnerProofFromSnapshots(userSnap, linkSnap, 'anon_relink', existingOwnerIds);
    }
  }

  // Диагностика: брошенный HttpsError НЕ попадает в functions:log сам по себе
  // (виден только на клиенте через Crashlytics). Логируем причину отказа, чтобы
  // массовые потери привязки (вход создаёт новый аккаунт) были видны на сервере.
  // PII не пишем — только короткие идентификаторы для корреляции.
  console.warn(JSON.stringify({
    event: 'assert_stable_owner_mismatch',
    authUid,
    stableId,
    userAuthUid: userAuthUid || null,
    linkedStableId: linkedStableId || null,
    linkedAuthUid: linkedAuthUid || null,
    allowProviderRelink: options?.allowProviderRelink === true,
    allowAnonRelink: options?.allowAnonRelink === true,
  }));
  throw new HttpsError('permission-denied', 'stable_id_mismatch');
}

/**
 * Гарантирует auth_links/{authUid}.stable_id === stableId.
 *
 * Раньше auth_links писался ТОЛЬКО на провайдер-входе (Google/Apple), поэтому у
 * анонимного юзера документа не было — а callable, читающие auth_links
 * (referralEnsureMyCode → assertAuthStableLink, friend_codes, premium_status),
 * падали с LINK_ACCOUNT_REQUIRED. Из-за этого реф-код не выдавался анонимам.
 *
 * НАМЕРЕННО отдельно от linkStableAuthUid: та зовётся внутри account-merge для
 * КАЖДОГО кандидата ДО выбора победителя, и запись auth_links там отравила бы
 * проверку владения (assertStableOwner читает auth_links) второго кандидата.
 * Зовётся только из authEnsureStableLink callable, где authUid изолирован.
 * merge'ом — чтобы не затирать provider/email существующего провайдерского линка.
 */
export async function ensureAuthLinkDoc(
  db: admin.firestore.Firestore,
  authUid: string,
  stableId: string,
  provider?: AuthProvider | null,
  metadata?: AuthLinkMetadata,
): Promise<void> {
  await repairIdentityDocumentsAtomically(db, authUid, stableId, {
    writeUser: false,
    writeAuthLink: true,
    provider,
    metadata,
  });
}

type IdentityRepairTransactionOptions = {
  writeUser: boolean;
  writeAuthLink: boolean;
  provider?: AuthProvider | null;
  metadata?: AuthLinkMetadata;
  sourceStableIds?: readonly string[];
  ownerProof?: StableOwnerProof;
};

type IdentityRepairTransactionResult = {
  userAuthUidChanged: boolean;
};

async function repairIdentityDocumentsAtomically(
  db: admin.firestore.Firestore,
  authUid: string,
  stableId: string,
  options: IdentityRepairTransactionOptions,
): Promise<IdentityRepairTransactionResult> {
  const now = Date.now();
  const userRef = db.collection(USERS).doc(stableId);
  const authLinkRef = db.collection(AUTH_LINKS).doc(authUid);
  const authMarkerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
  const authPermanentDenialRef = db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
    .doc(accountDeletePermanentDenialId(authUid));
  const existingOwnerQuery = db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(2);
  const protectedStableIds = [...new Set([
    ...(options.sourceStableIds ?? []),
    stableId,
  ])];
  const tombstoneRefs = protectedStableIds.map((id) => (
    db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(id)
  ));
  const permanentDenialRefs = protectedStableIds.map((id) => (
    db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS).doc(accountDeletePermanentDenialId(id))
  ));
  let transactionBaseline: StableOwnerProof | null = null;

  try {
    return await db.runTransaction(async (transaction) => {
      const [
        authMarkerSnap,
        authPermanentDenialSnap,
        tombstoneSnaps,
        permanentDenialSnaps,
        userSnap,
        authLinkSnap,
        existingOwnerSnap,
      ] = await Promise.all([
        transaction.get(authMarkerRef),
        transaction.get(authPermanentDenialRef),
        Promise.all(tombstoneRefs.map((ref) => transaction.get(ref))),
        Promise.all(permanentDenialRefs.map((ref) => transaction.get(ref))),
        transaction.get(userRef),
        transaction.get(authLinkRef),
        options.writeUser ? transaction.get(existingOwnerQuery) : Promise.resolve(null),
      ]);

      if (authMarkerSnap.exists || authPermanentDenialSnap.exists) {
        throwIdentityRetired('auth');
      }
      if (
        tombstoneSnaps.some((snap) => snap.exists)
        || permanentDenialSnaps.some((snap) => snap.exists)
      ) {
        throwIdentityRetired('stable');
      }

      const currentUserData = userSnap?.data() ?? {};
      const currentUserAuthUid = String(currentUserData.firebaseAuthUid ?? '').trim();
      const currentLinkedAuthUid = normalizeStableId(
        (currentUserData.linkedAuth as { providerUid?: unknown } | undefined)?.providerUid,
      );
      const currentLinkStableId = normalizeStableId(authLinkSnap?.data()?.stable_id);
      if (currentLinkStableId && !protectedStableIds.includes(currentLinkStableId)) {
        const [currentLinkTombstone, currentLinkPermanentDenial] = await Promise.all([
          transaction.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(currentLinkStableId)),
          transaction.get(
            db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
              .doc(accountDeletePermanentDenialId(currentLinkStableId)),
          ),
        ]);
        if (currentLinkTombstone.exists || currentLinkPermanentDenial.exists) {
          throwIdentityRetired('stable');
        }
      }
      const currentOwnerIds = (existingOwnerSnap?.docs ?? []).map((doc) => doc.id).sort();
      const userAlreadyTarget = Boolean(
        userSnap.exists &&
        (
          currentUserAuthUid === authUid ||
          currentLinkedAuthUid === authUid
        )
      );
      const linkAlreadyTarget = authLinkSnap.exists && currentLinkStableId === stableId;
      const authoritativeNow = userAlreadyTarget || linkAlreadyTarget;
      const currentProof = stableOwnerProofFromSnapshots(
        userSnap,
        authLinkSnap,
        options.ownerProof?.authorization ?? 'user',
        currentOwnerIds,
      );
      const expectedProof = options.ownerProof ?? transactionBaseline;

      if (!expectedProof) {
        if (!authoritativeNow) {
          throw new HttpsError('permission-denied', 'stable_id_mismatch');
        }
        transactionBaseline = currentProof;
      } else {
        const userOwnershipFullyTarget = Boolean(
          userSnap.exists &&
          currentUserAuthUid === authUid &&
          currentLinkedAuthUid === authUid
        );
        const peerCompletedHiddenCanonicalization = Boolean(
          expectedProof.authorization === 'link' &&
          expectedProof.authLinkStableId &&
          expectedProof.authLinkStableId !== stableId &&
          userOwnershipFullyTarget &&
          linkAlreadyTarget
        );
        const exactSecurityState =
          currentProof.userExists === expectedProof.userExists &&
          currentProof.userAuthUid === expectedProof.userAuthUid &&
          currentProof.linkedAuthUid === expectedProof.linkedAuthUid &&
          currentProof.anonClaimAuthUid === expectedProof.anonClaimAuthUid &&
          currentProof.anonClaimAt === expectedProof.anonClaimAt &&
          currentProof.authLinkExists === expectedProof.authLinkExists &&
          currentProof.authLinkStableId === expectedProof.authLinkStableId;
        if (
          (expectedProof.userExists && !userSnap.exists) ||
          (expectedProof.authLinkExists && !authLinkSnap.exists) ||
          (!exactSecurityState && !peerCompletedHiddenCanonicalization)
        ) {
          throw new HttpsError('permission-denied', 'stable_id_mismatch');
        }
        if (
          expectedProof.authorization === 'anon_relink' &&
          !peerCompletedHiddenCanonicalization &&
          (
            !userSnap.exists ||
            !readAnonMergeClaim(currentUserData, Date.now()) ||
            currentProof.anonClaimAuthUid !== expectedProof.userAuthUid ||
            currentProof.linkedAuthUid !== '' ||
            currentOwnerIds.join('\u0000') !== expectedProof.existingOwnerIds.join('\u0000')
          )
        ) {
          throw new HttpsError('permission-denied', 'stable_id_mismatch');
        }
      }
      if (options.writeUser && !userSnap.exists) {
        throw new HttpsError('permission-denied', 'stable_id_mismatch');
      }
      const userAuthUidChanged = !userSnap.exists || currentUserAuthUid !== authUid;
      if (options.writeUser && (userAuthUidChanged || options.provider)) {
        const userPatch: Record<string, unknown> = {
          firebaseAuthUid: authUid,
          updatedAt: now,
        };
        if (options.provider) {
          userPatch.linkedAuth = {
            provider: options.provider,
            providerUid: authUid,
            email: options.metadata && Object.prototype.hasOwnProperty.call(options.metadata, 'email')
              ? options.metadata.email ?? null
              : null,
            displayName: options.metadata && Object.prototype.hasOwnProperty.call(options.metadata, 'displayName')
              ? options.metadata.displayName ?? null
              : null,
            linkedAt: now,
            lastSignInAt: options.metadata?.lastSignInAt ?? now,
            devicePlatform: options.metadata?.devicePlatform ?? 'web',
          };
        }
        transaction.set(userRef, userPatch, { merge: true });
      }

      if (options.writeAuthLink) {
        const current = authLinkSnap?.data() ?? {};
        const linkPatch: Record<string, unknown> = { stable_id: stableId, updatedAt: now };
        if (options.provider) {
          linkPatch.providerUid = authUid;
          linkPatch.provider = options.provider;
          if (typeof current.linkedAt !== 'number' || current.linkedAt <= 0) {
            linkPatch.linkedAt = now;
          }
          linkPatch.lastSignInAt = options.metadata?.lastSignInAt ?? now;
          if (options.metadata?.devicePlatform) linkPatch.devicePlatform = options.metadata.devicePlatform;
          if (options.metadata && Object.prototype.hasOwnProperty.call(options.metadata, 'email')) {
            linkPatch.email = options.metadata.email ?? null;
          }
          if (options.metadata && Object.prototype.hasOwnProperty.call(options.metadata, 'displayName')) {
            linkPatch.displayName = options.metadata.displayName ?? null;
          }
        }
        const providerNeedsBackfill =
          Boolean(options.provider) &&
          (
            String(current.providerUid ?? '').trim() !== authUid ||
            String(current.provider ?? '').trim() !== options.provider ||
            typeof current.linkedAt !== 'number' ||
            current.linkedAt <= 0
          );
        const metadataNeedsRefresh = Boolean(
          options.provider && options.metadata && Object.keys(options.metadata).length > 0,
        );
        if (
          !authLinkSnap?.exists ||
          currentLinkStableId !== stableId ||
          providerNeedsBackfill ||
          metadataNeedsRefresh
        ) {
          transaction.set(authLinkRef, linkPatch, { merge: true });
          if (!authLinkSnap.exists) {
            writeFirstAuthLinkGrowthAggregate(db, transaction, now);
          }
        }
      }

      return { userAuthUidChanged };
    });
  } catch (error) {
    return throwIdentityCheckUnavailable(error);
  }
}

async function finishUserIdentityRepairBestEffort(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
  userAuthUidChanged: boolean,
): Promise<void> {
  const now = Date.now();
  let repairedIdentityLink = userAuthUidChanged;
  const lbRef = db.collection(LEADERBOARD).doc(stableId);
  const lbSnap = await lbRef.get().catch(() => null);
  if (lbSnap?.exists) {
    const currentLeaderboardAuthUid = String(lbSnap.data()?.firebaseAuthUid ?? '').trim();
    if (currentLeaderboardAuthUid !== authUid) {
      await lbRef.set({ firebaseAuthUid: authUid, updatedAt: now }, { merge: true });
      repairedIdentityLink = true;
    }
  }

  if (repairedIdentityLink) {
    await cleanupLegacyAuthIdentityDuplicates(db, stableId, authUid, {
      reason: 'stable_link',
      throttleMs: IDENTITY_CLEANUP_THROTTLE_MS,
    }).catch((e) => {
      console.warn(JSON.stringify({
        event: 'identity_legacy_cleanup_failed',
        stableId,
        authUid,
        message: String(e?.message ?? e).slice(0, 160),
      }));
    });
  }
}

async function repairStableAuthUid(
  db: admin.firestore.Firestore,
  selection: StableIdentitySelection,
  authUid: string,
  ownerProof?: StableOwnerProof,
): Promise<void> {
  const repair = await repairIdentityDocumentsAtomically(db, authUid, selection.stableUid, {
    writeUser: true,
    writeAuthLink: false,
    sourceStableIds: selection.sourceStableIds,
    ownerProof,
  });
  await finishUserIdentityRepairBestEffort(
    db,
    selection.stableUid,
    authUid,
    repair.userAuthUidChanged,
  );
}

async function ensureStableIdentityPair(
  db: admin.firestore.Firestore,
  authUid: string,
  selection: StableIdentitySelection,
  provider: AuthProvider | null,
  metadata?: AuthLinkMetadata,
): Promise<void> {
  await assertStableAccountMergeNotPending(db, selection.sourceStableIds);
  const ownerProof = await assertStableOwner(db, authUid, selection.stableUid, {
    allowProviderRelink: Boolean(provider),
    allowAnonRelink: !provider,
    allowedAuthLinkStableIds: selection.sourceStableIds,
  });
  const repair = await repairIdentityDocumentsAtomically(db, authUid, selection.stableUid, {
    writeUser: true,
    writeAuthLink: true,
    provider,
    metadata,
    sourceStableIds: selection.sourceStableIds,
    ownerProof,
  });
  await finishUserIdentityRepairBestEffort(
    db,
    selection.stableUid,
    authUid,
    repair.userAuthUidChanged,
  );
  if (!provider) return;
  await upsertEmailContact(db, {
    email: metadata?.email,
    source: 'app',
    provider,
    providerUid: authUid,
    stableId: selection.stableUid,
    displayName: metadata?.displayName,
    devicePlatform: metadata?.devicePlatform ?? 'web',
    lastSignInAt: metadata?.lastSignInAt ?? Date.now(),
  }).catch((error) => {
    console.warn(JSON.stringify({
      event: 'email_contact_app_upsert_failed',
      stableId: selection.stableUid,
      authUid,
      provider,
      message: String(error?.message ?? error).slice(0, 160),
    }));
  });
}

export async function linkStableAuthUid(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
): Promise<void> {
  await repairStableAuthUid(db, { stableUid: stableId, sourceStableIds: [stableId] }, authUid);
}

function readNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function chooseMaxNumber(a: unknown, b: unknown): number | undefined {
  const na = readNumber(a);
  const nb = readNumber(b);
  if (na === null && nb === null) return undefined;
  if (na === null) return nb ?? undefined;
  if (nb === null) return na;
  return Math.max(na, nb);
}

function legacyLeaderboardMerge(
  stableData: FirebaseFirestore.DocumentData,
  legacyData: FirebaseFirestore.DocumentData,
  authUid: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = {
    firebaseAuthUid: authUid,
    updatedAt: Date.now(),
    identityCanonicalizedAt: Date.now(),
  };

  ['points', 'streak', 'daily7xp', 'daily7time_ms', 'profileCardLevel'].forEach((field) => {
    const next = chooseMaxNumber(stableData[field], legacyData[field]);
    if (next !== undefined) out[field] = next;
  });

  const stableWeekKey = String(stableData.weekKey ?? '').trim();
  const legacyWeekKey = String(legacyData.weekKey ?? '').trim();
  if (!stableWeekKey && legacyWeekKey) {
    out.weekKey = legacyWeekKey;
    out.weekPoints = Math.max(0, readNumber(legacyData.weekPoints) ?? 0);
  } else if (stableWeekKey && legacyWeekKey && stableWeekKey === legacyWeekKey) {
    out.weekPoints = Math.max(
      Math.max(0, readNumber(stableData.weekPoints) ?? 0),
      Math.max(0, readNumber(legacyData.weekPoints) ?? 0),
    );
  }

  [
    'name',
    'nameLower',
    'lang',
    'avatar',
    'frame',
    'aura',
    'leagueId',
    'isPremium',
    'isVip',
    'profileCardTheme',
    'profileCardMotion',
    'profileCardPublicFocus',
  ].forEach((field) => {
    const stableValue = stableData[field];
    const legacyValue = legacyData[field];
    const stableEmpty = stableValue === undefined || stableValue === null || String(stableValue).trim() === '';
    if (stableEmpty && legacyValue !== undefined && legacyValue !== null && String(legacyValue).trim() !== '') {
      out[field] = legacyValue;
    }
  });

  return out;
}

function mergeLegacyMemberIntoStable(
  stable: Record<string, unknown> | undefined,
  legacy: Record<string, unknown>,
  stableId: string,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(legacy || {}), ...(stable || {}), uid: stableId };
  const stablePoints = readNumber(stable?.points);
  const legacyPoints = readNumber(legacy?.points);
  if (stablePoints !== null || legacyPoints !== null) out['points'] = Math.max(stablePoints ?? 0, legacyPoints ?? 0);
  const stableTotalXp = readNumber(stable?.totalXp);
  const legacyTotalXp = readNumber(legacy?.totalXp);
  if (stableTotalXp !== null || legacyTotalXp !== null) out['totalXp'] = Math.max(stableTotalXp ?? 0, legacyTotalXp ?? 0);
  return out;
}

async function stableMemberExistsInWeek(
  db: admin.firestore.Firestore,
  weekId: string,
  stableId: string,
): Promise<boolean> {
  const snap = await readIdentityOrThrow(db
    .collection(LEAGUE_GROUPS)
    .where('weekId', '==', weekId)
    .limit(500)
    .get());
  return snap.docs.some((doc) => {
    const members = doc.data()?.members;
    return members && typeof members === 'object' && Object.prototype.hasOwnProperty.call(members, stableId);
  });
}

async function cleanupDuplicateLeagueMembers(
  db: admin.firestore.Firestore,
  stableId: string,
  duplicateUid: string,
): Promise<Pick<IdentityCleanupStats, 'leagueGroupsTouched' | 'leagueMembersHidden'>> {
  let leagueGroupsTouched = 0;
  let leagueMembersHidden = 0;
  const memberUidPath = new admin.firestore.FieldPath('members', duplicateUid, 'uid');

  for (;;) {
    const snap = await db.collection(LEAGUE_GROUPS).where(memberUidPath, '==', duplicateUid).limit(50).get();
    if (snap.empty) break;

    let madeProgress = false;
    const batch = db.batch();
    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const members = data.members && typeof data.members === 'object'
        ? { ...(data.members as Record<string, Record<string, unknown>>) }
        : {};
      const legacyMember = members[duplicateUid];
      if (!legacyMember) continue;
      if (legacyMember.identityHidden === true && legacyMember.canonicalStableId === stableId) continue;

      const weekId = String(data.weekId ?? '').trim();
      const stableInSameDoc = members[stableId];
      const stableInWeek = stableInSameDoc ? true : weekId ? await stableMemberExistsInWeek(db, weekId, stableId) : false;

      if (stableInSameDoc) {
        members[stableId] = mergeLegacyMemberIntoStable(stableInSameDoc, legacyMember, stableId);
      } else if (!stableInWeek) {
        members[stableId] = mergeLegacyMemberIntoStable(undefined, legacyMember, stableId);
      }
      members[duplicateUid] = {
        ...legacyMember,
        identityHidden: true,
        canonicalStableId: stableId,
        identityCanonicalizedAt: Date.now(),
      };

      const memberCount = Object.values(members).filter((m) => (m as Record<string, unknown>)?.identityHidden !== true).length;
      batch.set(doc.ref, {
        members,
        memberCount,
        updatedAt: Date.now(),
        identityCanonicalizedAt: Date.now(),
      }, { merge: true });
      leagueGroupsTouched += 1;
      leagueMembersHidden += 1;
      madeProgress = true;
    }

    if (!madeProgress) break;
    await batch.commit();
  }

  return { leagueGroupsTouched, leagueMembersHidden };
}

async function cleanupLegacyLeagueMembers(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
): Promise<Pick<IdentityCleanupStats, 'leagueGroupsTouched' | 'leagueMembersHidden'>> {
  return cleanupDuplicateLeagueMembers(db, stableId, authUid);
}

async function hideNameIndexForDuplicateUid(
  db: admin.firestore.Firestore,
  duplicateUid: string,
  stableId: string,
): Promise<number> {
  const snap = await db.collection('name_index').where('uid', '==', duplicateUid).limit(50).get().catch(() => null);
  if (!snap || snap.empty) return 0;
  const batch = db.batch();
  const now = Date.now();
  let hidden = 0;
  snap.docs.forEach((doc) => {
    batch.set(doc.ref, {
      identityHidden: true,
      canonicalStableId: stableId,
      identityCanonicalizedAt: now,
      updatedAt: now,
    }, { merge: true });
    hidden += 1;
  });
  await batch.commit();
  return hidden;
}

async function cleanupSiblingStableIdentityDuplicates(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
): Promise<Pick<IdentityCleanupStats, 'leaderboardMerged' | 'leaderboardHidden' | 'usersHidden' | 'nameIndexHidden' | 'leagueGroupsTouched' | 'leagueMembersHidden'>> {
  const out = {
    leaderboardMerged: 0,
    leaderboardHidden: 0,
    usersHidden: 0,
    nameIndexHidden: 0,
    leagueGroupsTouched: 0,
    leagueMembersHidden: 0,
  };
  const siblingsSnap = await db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(50).get().catch(() => null);
  if (!siblingsSnap || siblingsSnap.empty) return out;

  for (const sibling of siblingsSnap.docs) {
    const duplicateUid = sibling.id;
    if (!duplicateUid || duplicateUid === stableId) continue;
    const siblingData = sibling.data() || {};
    if (siblingData.identityHidden === true && siblingData.canonicalStableId === stableId) continue;

    const stableLbRef = db.collection(LEADERBOARD).doc(stableId);
    const duplicateLbRef = db.collection(LEADERBOARD).doc(duplicateUid);
    await db.runTransaction(async (tx) => {
      const [stableLbSnap, duplicateLbSnap] = await Promise.all([
        tx.get(stableLbRef),
        tx.get(duplicateLbRef),
      ]);
      if (duplicateLbSnap.exists) {
        const merge = legacyLeaderboardMerge(stableLbSnap.data() || {}, duplicateLbSnap.data() || {}, authUid);
        tx.set(stableLbRef, merge, { merge: true });
        tx.set(duplicateLbRef, {
          identityHidden: true,
          canonicalStableId: stableId,
          duplicateOfStableId: stableId,
          identityCanonicalizedAt: Date.now(),
          updatedAt: Date.now(),
        }, { merge: true });
        out.leaderboardMerged += 1;
        out.leaderboardHidden += 1;
      }
      tx.set(sibling.ref, {
        identityHidden: true,
        canonicalStableId: stableId,
        identityCanonicalizedAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
      out.usersHidden += 1;
    });

    out.nameIndexHidden += await hideNameIndexForDuplicateUid(db, duplicateUid, stableId).catch(() => 0);
    const leagueStats = await cleanupDuplicateLeagueMembers(db, stableId, duplicateUid);
    out.leagueGroupsTouched += leagueStats.leagueGroupsTouched;
    out.leagueMembersHidden += leagueStats.leagueMembersHidden;
  }

  return out;
}

async function recordIdentityCleanupCandidate(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
  reason: string,
  context: Record<string, unknown>,
): Promise<void> {
  const candidateId = `${stableId.slice(0, 80)}__${authUid.slice(0, 80)}`.replace(/[^A-Za-z0-9_-]/g, '_');
  await db.collection(CLEANUP_CANDIDATES).doc(candidateId).set({
    stableId,
    authUid,
    reason,
    context,
    updatedAt: Date.now(),
  }, { merge: true });
}

export async function cleanupLegacyAuthIdentityDuplicates(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
  opts?: { reason?: string; throttleMs?: number },
): Promise<IdentityCleanupStats> {
  const stats: IdentityCleanupStats = {
    leaderboardMerged: 0,
    leaderboardHidden: 0,
    usersHidden: 0,
    nameIndexHidden: 0,
    candidatesRecorded: 0,
    leagueGroupsTouched: 0,
    leagueMembersHidden: 0,
    skipped: false,
  };
  if (!stableId || !authUid || stableId === authUid) return { ...stats, skipped: true };

  const now = Date.now();
  const userRef = db.collection(USERS).doc(stableId);
  const userSnap = await userRef.get().catch(() => null);
  const userData = userSnap?.data() || {};
  if (String(userData.firebaseAuthUid ?? '').trim() !== authUid) return { ...stats, skipped: true };
  const lastCleanupAt = readNumber(userData.identityCleanupAt) ?? 0;
  if (opts?.throttleMs && lastCleanupAt > 0 && now - lastCleanupAt < opts.throttleMs) {
    return { ...stats, skipped: true };
  }

  const stableLbRef = db.collection(LEADERBOARD).doc(stableId);
  const legacyLbRef = db.collection(LEADERBOARD).doc(authUid);
  const [stableLbSnap, legacyLbSnap, authLinkSnap] = await Promise.all([
    readIdentityOrThrow(stableLbRef.get()),
    legacyLbRef.get().catch(() => null),
    readIdentityOrThrow(db.collection(AUTH_LINKS).doc(authUid).get()),
  ]);
  const stableLeaderboardAuthUid = String(stableLbSnap?.data()?.firebaseAuthUid ?? '').trim();
  const linkedStableId = String(authLinkSnap?.data()?.stable_id ?? '').trim();
  const hasStrongIdentityProof =
    stableLeaderboardAuthUid === authUid ||
    linkedStableId === stableId;

  if (!hasStrongIdentityProof) {
    if (legacyLbSnap?.exists) {
      await recordIdentityCleanupCandidate(db, stableId, authUid, 'missing_strong_identity_proof', {
        userFirebaseAuthUid: authUid,
        stableLeaderboardAuthUid,
        linkedStableId,
        legacyLeaderboardExists: true,
        reason: opts?.reason ?? 'unknown',
      }).catch(() => {});
      stats.candidatesRecorded += 1;
    }
    return { ...stats, skipped: true };
  }

  if (legacyLbSnap?.exists) {
    const merge = legacyLeaderboardMerge(stableLbSnap?.data() || {}, legacyLbSnap.data() || {}, authUid);
    await db.runTransaction(async (tx) => {
      tx.set(stableLbRef, merge, { merge: true });
      tx.set(legacyLbRef, {
        identityHidden: true,
        canonicalStableId: stableId,
        identityCanonicalizedAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
    });
    stats.leaderboardMerged += 1;
    stats.leaderboardHidden += 1;
  }

  const leagueStats = await cleanupLegacyLeagueMembers(db, stableId, authUid);
  stats.leagueGroupsTouched += leagueStats.leagueGroupsTouched;
  stats.leagueMembersHidden += leagueStats.leagueMembersHidden;

  if (linkedStableId === stableId) {
    const siblingStats = await cleanupSiblingStableIdentityDuplicates(db, stableId, authUid);
    stats.leaderboardMerged += siblingStats.leaderboardMerged;
    stats.leaderboardHidden += siblingStats.leaderboardHidden;
    stats.usersHidden += siblingStats.usersHidden;
    stats.nameIndexHidden += siblingStats.nameIndexHidden;
    stats.leagueGroupsTouched += siblingStats.leagueGroupsTouched;
    stats.leagueMembersHidden += siblingStats.leagueMembersHidden;
  }

  if (
    stats.leaderboardHidden > 0 ||
    stats.usersHidden > 0 ||
    stats.nameIndexHidden > 0 ||
    stats.leagueGroupsTouched > 0 ||
    stats.candidatesRecorded > 0
  ) {
    await userRef.set({
      identityCleanupAt: now,
      identityCleanupReason: opts?.reason ?? 'unknown',
      updatedAt: now,
    }, { merge: true });
  }

  return stats;
}

function selectionFromUserData(
  stableId: string,
  userData: FirebaseFirestore.DocumentData,
): StableIdentitySelection {
  const canonicalStableId = normalizeStableId(userData.canonicalStableId);
  if (userData.identityHidden === true && canonicalStableId && canonicalStableId !== stableId) {
    return {
      stableUid: canonicalStableId,
      sourceStableIds: [stableId, canonicalStableId],
    };
  }
  return { stableUid: stableId, sourceStableIds: [stableId] };
}

async function finalizeStableIdentitySelection(
  db: admin.firestore.Firestore,
  authUid: string,
  selection: StableIdentitySelection,
  options: ResolveStableUidForAuthOptions | undefined,
  verifyOwner: boolean,
): Promise<string> {
  await assertSelectionDeletionNotPending(db, selection);
  const ownerProof = verifyOwner || shouldRepairIdentityLinks(options)
    ? await assertStableOwner(db, authUid, selection.stableUid, {
      ...options,
      allowedAuthLinkStableIds: selection.sourceStableIds,
    })
    : undefined;
  if (shouldRepairIdentityLinks(options)) {
    await repairStableAuthUid(db, selection, authUid, ownerProof);
  }
  return selection.stableUid;
}

async function resolveRequestedStableIdentity(
  db: admin.firestore.Firestore,
  authUid: string,
  stableId: string,
  options?: ResolveStableUidForAuthOptions,
): Promise<string> {
  const requestedUserSnap = await readIdentityOrThrow(db.collection(USERS).doc(stableId).get());
  const selection = selectionFromUserData(stableId, requestedUserSnap?.data() ?? {});
  return finalizeStableIdentitySelection(db, authUid, selection, options, true);
}

export async function resolveStableUidForAuth(
  db: admin.firestore.Firestore,
  authUid: string,
  requestedStableId?: unknown,
  options?: ResolveStableUidForAuthOptions,
): Promise<string> {
  await assertAccountDeletionNotPending(db, authUid);
  const stableId = normalizeStableId(requestedStableId);
  const authLinkAnchor = await findLiveAuthLinkAnchor(db, authUid);
  if (authLinkAnchor?.selection) {
    return finalizeStableIdentitySelection(db, authUid, authLinkAnchor.selection, options, false);
  }
  if (authLinkAnchor && stableId === authLinkAnchor.anchorStableId) {
    throw new HttpsError('permission-denied', 'stable_id_mismatch');
  }

  // Account-merge ownership probes must evaluate the exact requested identity,
  // not collapse two candidates into the same globally ranked provider owner.
  if (stableId && options?.repairLinks === false) {
    return resolveRequestedStableIdentity(db, authUid, stableId, options);
  }
  const authoritativeByAuth = await findStableUidForProviderAuth(db, authUid, true);
  if (authoritativeByAuth) {
    return finalizeStableIdentitySelection(db, authUid, authoritativeByAuth, options, true);
  }
  if (stableId) {
    return resolveRequestedStableIdentity(db, authUid, stableId, options);
  }

  const direct = await readIdentityOrThrow(db.collection(USERS).doc(authUid).get());
  if (direct?.exists) {
    const directSelection = selectionFromUserData(authUid, direct.data() ?? {});
    if (directSelection.stableUid !== authUid) {
      return finalizeStableIdentitySelection(db, authUid, directSelection, options, true);
    }
  }

  const byAuth = await findStableUidForProviderAuth(db, authUid);
  if (byAuth) {
    return finalizeStableIdentitySelection(db, authUid, byAuth, options, true);
  }

  if (options?.requireKnownIdentity) {
    throw new HttpsError('failed-precondition', 'stable_id_required');
  }
  return authUid;
}

type MissingIdentityBootstrapResult =
  | { status: 'bootstrapped'; stableUid: string }
  | { status: 'authoritative'; stableUid: string; identityReady: boolean }
  | { status: 'not_candidate' };

async function bootstrapMissingStableIdentity(
  db: admin.firestore.Firestore,
  authUid: string,
  stableId: string,
  provider: AuthProvider | null,
  metadata?: AuthLinkMetadata,
): Promise<MissingIdentityBootstrapResult> {
  let previouslyObservedMissingTarget = false;
  const now = Date.now();
  const userRef = db.collection(USERS).doc(stableId);
  const authLinkRef = db.collection(AUTH_LINKS).doc(authUid);
  const authMarkerRef = db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid);
  const tombstoneRef = db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableId);
  const authPermanentDenialRef = db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
    .doc(accountDeletePermanentDenialId(authUid));
  const stablePermanentDenialRef = db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
    .doc(accountDeletePermanentDenialId(stableId));
  const existingIdentityQuery = db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(2);

  try {
    return await db.runTransaction(async (transaction) => {
      const [
        userSnap,
        authLinkSnap,
        authMarkerSnap,
        tombstoneSnap,
        authPermanentDenialSnap,
        stablePermanentDenialSnap,
        existingIdentitySnap,
      ] = await Promise.all([
        transaction.get(userRef),
        transaction.get(authLinkRef),
        transaction.get(authMarkerRef),
        transaction.get(tombstoneRef),
        transaction.get(authPermanentDenialRef),
        transaction.get(stablePermanentDenialRef),
        transaction.get(existingIdentityQuery),
      ]);

      if (authMarkerSnap.exists || authPermanentDenialSnap.exists) {
        throwIdentityRetired('auth');
      }
      if (tombstoneSnap.exists || stablePermanentDenialSnap.exists) {
        throwIdentityRetired('stable');
      }

      if (authLinkSnap.exists) {
        const linkedStableId = normalizeStableId(authLinkSnap.data()?.stable_id);
        if (!linkedStableId) {
          throw new HttpsError('permission-denied', 'stable_id_mismatch');
        }
        const [linkedUserSnap, linkedTombstoneSnap, linkedPermanentDenialSnap] = linkedStableId === stableId
          ? [userSnap, tombstoneSnap, stablePermanentDenialSnap]
          : await Promise.all([
            transaction.get(db.collection(USERS).doc(linkedStableId)),
            transaction.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(linkedStableId)),
            transaction.get(
              db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
                .doc(accountDeletePermanentDenialId(linkedStableId)),
            ),
          ]);
        if (linkedTombstoneSnap.exists || linkedPermanentDenialSnap.exists) {
          throwIdentityRetired('stable');
        }
        if (!linkedUserSnap.exists) {
          throw new HttpsError('permission-denied', 'stable_id_mismatch');
        }
        return { status: 'authoritative', stableUid: linkedStableId, identityReady: true };
      }

      if (userSnap.exists) {
        if (previouslyObservedMissingTarget) {
          throw new HttpsError('permission-denied', 'stable_id_mismatch');
        }
        return { status: 'not_candidate' };
      }

      const existingIdentityDocs = existingIdentitySnap.docs ?? [];
      if (existingIdentityDocs.length > 1) {
        throw new HttpsError('permission-denied', 'stable_id_mismatch');
      }
      if (existingIdentityDocs.length === 1) {
        const authoritativeStableId = existingIdentityDocs[0].id;
        const [authoritativeTombstoneSnap, authoritativePermanentDenialSnap] = authoritativeStableId === stableId
          ? [tombstoneSnap, stablePermanentDenialSnap]
          : await Promise.all([
            transaction.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(authoritativeStableId)),
            transaction.get(
              db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
                .doc(accountDeletePermanentDenialId(authoritativeStableId)),
            ),
          ]);
        if (authoritativeTombstoneSnap.exists || authoritativePermanentDenialSnap.exists) {
          throwIdentityRetired('stable');
        }
        return { status: 'authoritative', stableUid: authoritativeStableId, identityReady: false };
      }

      previouslyObservedMissingTarget = true;
      const userData: Record<string, unknown> = {
        firebaseAuthUid: authUid,
        updatedAt: now,
      };
      const authLinkData: Record<string, unknown> = {
        stable_id: stableId,
        updatedAt: now,
      };
      if (provider) {
        userData.linkedAuth = {
          provider,
          providerUid: authUid,
          email: metadata && Object.prototype.hasOwnProperty.call(metadata, 'email') ? metadata.email ?? null : null,
          displayName: metadata && Object.prototype.hasOwnProperty.call(metadata, 'displayName')
            ? metadata.displayName ?? null
            : null,
          linkedAt: now,
          lastSignInAt: metadata?.lastSignInAt ?? now,
          devicePlatform: metadata?.devicePlatform ?? 'web',
        };
        authLinkData.providerUid = authUid;
        authLinkData.provider = provider;
        authLinkData.linkedAt = now;
        authLinkData.lastSignInAt = metadata?.lastSignInAt ?? now;
        if (metadata?.devicePlatform) authLinkData.devicePlatform = metadata.devicePlatform;
        if (metadata && Object.prototype.hasOwnProperty.call(metadata, 'email')) {
          authLinkData.email = metadata.email ?? null;
        }
        if (metadata && Object.prototype.hasOwnProperty.call(metadata, 'displayName')) {
          authLinkData.displayName = metadata.displayName ?? null;
        }
      }

      transaction.create(userRef, userData);
      transaction.create(authLinkRef, authLinkData);
      writeFirstAuthLinkGrowthAggregate(db, transaction, now);
      return { status: 'bootstrapped', stableUid: stableId };
    });
  } catch (error) {
    return throwIdentityCheckUnavailable(error);
  }
}

async function rotateRetiredProviderStableLink(
  db: admin.firestore.Firestore,
  authUid: string,
  retiredStableId: string,
  freshStableId: string,
  provider: AuthProvider,
  metadata?: AuthLinkMetadata,
): Promise<void> {
  const now = Date.now();
  const authLinkRef = db.collection(AUTH_LINKS).doc(authUid);
  const freshUserRef = db.collection(USERS).doc(freshStableId);
  const retiredUserRef = db.collection(USERS).doc(retiredStableId);
  const existingIdentityQuery = db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(2);
  const refs = {
    authMarker: db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid),
    authDenial: db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
      .doc(accountDeletePermanentDenialId(authUid)),
    retiredTombstone: db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(retiredStableId),
    retiredDenial: db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
      .doc(accountDeletePermanentDenialId(retiredStableId)),
    freshTombstone: db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(freshStableId),
    freshDenial: db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
      .doc(accountDeletePermanentDenialId(freshStableId)),
  };
  try {
    await db.runTransaction(async (transaction) => {
      const [
        authLinkSnap,
        freshUserSnap,
        existingIdentitySnap,
        authMarkerSnap,
        authDenialSnap,
        retiredTombstoneSnap,
        retiredDenialSnap,
        freshTombstoneSnap,
        freshDenialSnap,
      ] = await Promise.all([
        transaction.get(authLinkRef),
        transaction.get(freshUserRef),
        transaction.get(existingIdentityQuery),
        transaction.get(refs.authMarker),
        transaction.get(refs.authDenial),
        transaction.get(refs.retiredTombstone),
        transaction.get(refs.retiredDenial),
        transaction.get(refs.freshTombstone),
        transaction.get(refs.freshDenial),
      ]);
      if (authMarkerSnap.exists || authDenialSnap.exists) throwIdentityRetired('auth');
      if (freshTombstoneSnap.exists || freshDenialSnap.exists) throwIdentityRetired('stable');
      if (!retiredTombstoneSnap.exists && !retiredDenialSnap.exists) {
        throw new HttpsError('aborted', 'identity_rotation_raced');
      }
      if (normalizeStableId(authLinkSnap.data()?.stable_id) !== retiredStableId) {
        throw new HttpsError('aborted', 'identity_rotation_raced');
      }
      const existingIdentityDocs = existingIdentitySnap.docs ?? [];
      const hasUnexpectedLiveIdentity = existingIdentityDocs.some((doc) => (
        doc.id !== retiredStableId
        || doc.data()?.firebaseAuthUid !== authUid
      ));
      if (freshUserSnap.exists || hasUnexpectedLiveIdentity) {
        throw new HttpsError('permission-denied', 'stable_id_mismatch');
      }
      const userData: Record<string, unknown> = {
        firebaseAuthUid: authUid,
        linkedAuth: {
          provider,
          providerUid: authUid,
          email: metadata && Object.prototype.hasOwnProperty.call(metadata, 'email') ? metadata.email ?? null : null,
          displayName: metadata && Object.prototype.hasOwnProperty.call(metadata, 'displayName')
            ? metadata.displayName ?? null
            : null,
          linkedAt: now,
          lastSignInAt: metadata?.lastSignInAt ?? now,
          devicePlatform: metadata?.devicePlatform ?? 'web',
        },
        updatedAt: now,
      };
      const authLinkData: Record<string, unknown> = {
        stable_id: freshStableId,
        providerUid: authUid,
        provider,
        linkedAt: now,
        lastSignInAt: metadata?.lastSignInAt ?? now,
        updatedAt: now,
      };
      if (metadata?.devicePlatform) authLinkData.devicePlatform = metadata.devicePlatform;
      if (metadata && Object.prototype.hasOwnProperty.call(metadata, 'email')) {
        authLinkData.email = metadata.email ?? null;
      }
      if (metadata && Object.prototype.hasOwnProperty.call(metadata, 'displayName')) {
        authLinkData.displayName = metadata.displayName ?? null;
      }
      if (existingIdentityDocs.some((doc) => doc.id === retiredStableId)) {
        // Remove only the exact denied old root. Subcollections remain under
        // the frozen deletion worker; none of their fields are copied.
        transaction.delete(retiredUserRef);
      }
      transaction.create(freshUserRef, userData);
      transaction.set(authLinkRef, authLinkData);
    });
  } catch (error) {
    throwIdentityCheckUnavailable(error);
  }
}

export async function ensureStableLinkForAuth(
  db: admin.firestore.Firestore,
  authUid: string,
  requestedStableId: unknown,
  signInProvider: string,
  metadata?: AuthLinkMetadata,
): Promise<{ ok: true; stableUid: string; authUid: string; identityReady: true }> {
  const stableId = normalizeStableId(requestedStableId);
  const provider: AuthProvider | null =
    signInProvider === 'google.com'
      ? 'google'
      : signInProvider === 'apple.com'
        ? 'apple'
        : null;
  const allowProviderRelink = Boolean(provider);
  const allowAnonRelink = !allowProviderRelink;

  if (stableId.length > 160) {
    throw new HttpsError('invalid-argument', 'stable_id_required');
  }

  await assertAccountDeletionNotPending(db, authUid);
  if (stableId) await assertStableDeletionNotPending(db, stableId);

  // Добираем email/displayName из Firebase Auth, если клиент их не прислал —
  // иначе linkedAuth.email пишется null и юзера не найти по почте в админке.
  metadata = await enrichMetadataFromAuth(authUid, provider, metadata);

  if (provider) {
    const existingLinkSnap = await readIdentityOrThrow(db.collection(AUTH_LINKS).doc(authUid).get());
    const linkedStableId = normalizeStableId(existingLinkSnap?.data()?.stable_id);
    if (linkedStableId) {
      const [linkedTombstone, linkedDenial] = await Promise.all([
        readIdentityOrThrow(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(linkedStableId).get()),
        readIdentityOrThrow(
          db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
            .doc(accountDeletePermanentDenialId(linkedStableId))
            .get(),
        ),
      ]);
      const linkedStableRetired = linkedTombstone.exists || linkedDenial.exists;
      if (linkedStableRetired && stableId && linkedStableId !== stableId) {
        await rotateRetiredProviderStableLink(
          db,
          authUid,
          linkedStableId,
          stableId,
          provider,
          metadata,
        );
        return { ok: true, stableUid: stableId, authUid, identityReady: true };
      }
      if (linkedStableRetired) throwIdentityRetired('stable');
    }
    // Хвост E: auth_links может указывать на УДАЛЁННЫЙ users-док (осиротевшая
    // привязка после deleteAccountAndWipe — серверная чистка fire-and-forget могла
    // снести users/{stableId}, но не auth_links). Повторный вход тем же Google/Apple
    // цеплялся за мёртвый id → resolveStableUidForAuth привязывал к пустому доку →
    // пользователь на пустом «новом» аккаунте. Если целевой users-док НЕ существует,
    // игнорируем осиротевшую привязку и идём обычным путём (на текущий stableId или
    // на живой аккаунт по providerUid). providerUid криптографически принадлежит
    // юзеру, мёртвый док всё равно пуст — захвата чужого нет.
    const linkedUserExists = linkedStableId
      ? (await readIdentityOrThrow(db.collection(USERS).doc(linkedStableId).get())).exists
      : false;
    if (linkedStableId && linkedStableId !== stableId && !linkedUserExists) {
      console.warn(JSON.stringify({
        event: 'auth_link_orphan_ignored',
        authUid,
        deadStableId: linkedStableId,
        requestedStableId: stableId || null,
        provider,
      }));
      // не используем мёртвый linkedStableId — провалимся к обычному resolve ниже.
    } else if (linkedStableId && linkedStableId !== stableId) {
      const linkedStableUid = await resolveStableUidForAuth(db, authUid, linkedStableId, {
        allowProviderRelink: true,
        repairLinks: false,
      });
      await ensureStableIdentityPair(db, authUid, {
        stableUid: linkedStableUid,
        sourceStableIds: [linkedStableId, linkedStableUid],
      }, provider, metadata);
      return { ok: true, stableUid: linkedStableUid, authUid, identityReady: true };
    }
    if (!linkedStableId) {
      const existingUserSelection = await findStableUidForProviderAuth(db, authUid);
      if (existingUserSelection && existingUserSelection.stableUid !== stableId) {
        const stableUid = await resolveStableUidForAuth(db, authUid, existingUserSelection.stableUid, {
          allowProviderRelink: true,
          repairLinks: false,
        });
        await ensureStableIdentityPair(db, authUid, {
          stableUid,
          sourceStableIds: [...existingUserSelection.sourceStableIds, stableUid],
        }, provider, metadata);
        return { ok: true, stableUid, authUid, identityReady: true };
      }
    }
  }

  if (stableId) {
    const existingAnchor = await findLiveAuthLinkAnchor(db, authUid);
    if (existingAnchor?.selection) {
      const stableUid = await resolveStableUidForAuth(db, authUid, existingAnchor.selection.stableUid, {
        allowProviderRelink,
        allowAnonRelink,
        repairLinks: false,
      });
      await ensureStableIdentityPair(db, authUid, {
        stableUid,
        sourceStableIds: [...existingAnchor.selection.sourceStableIds, stableUid],
      }, provider, metadata);
      return { ok: true, stableUid, authUid, identityReady: true };
    }

    const existingUserSelection = await findStableUidForProviderAuth(db, authUid);
    if (existingUserSelection) {
      const stableUid = await resolveStableUidForAuth(db, authUid, existingUserSelection.stableUid, {
        allowProviderRelink,
        allowAnonRelink,
        repairLinks: false,
      });
      await ensureStableIdentityPair(db, authUid, {
        stableUid,
        sourceStableIds: [...existingUserSelection.sourceStableIds, stableUid],
      }, provider, metadata);
      return { ok: true, stableUid, authUid, identityReady: true };
    }

    const bootstrap = await bootstrapMissingStableIdentity(db, authUid, stableId, provider, metadata);
    if (bootstrap.status === 'bootstrapped') {
      if (provider) {
        await upsertEmailContact(db, {
          email: metadata?.email,
          source: 'app',
          provider,
          providerUid: authUid,
          stableId,
          displayName: metadata?.displayName,
          devicePlatform: metadata?.devicePlatform ?? 'web',
          lastSignInAt: metadata?.lastSignInAt ?? Date.now(),
        }).catch((error) => {
          console.warn(JSON.stringify({
            event: 'email_contact_app_upsert_failed',
            stableId,
            authUid,
            provider,
            message: String(error?.message ?? error).slice(0, 160),
          }));
        });
      }
      return { ok: true, stableUid: bootstrap.stableUid, authUid, identityReady: true };
    }
    if (bootstrap.status === 'authoritative') {
      await assertStableDeletionNotPending(db, bootstrap.stableUid);
      await assertStableAccountMergeNotPending(db, [bootstrap.stableUid]);
      if (!bootstrap.identityReady) {
        await ensureStableIdentityPair(db, authUid, {
          stableUid: bootstrap.stableUid,
          sourceStableIds: [bootstrap.stableUid],
        }, provider, metadata);
      }
      return { ok: true, stableUid: bootstrap.stableUid, authUid, identityReady: true };
    }
  }

  const relinkOptions = { allowProviderRelink, allowAnonRelink };
  const stableUid = await resolveStableUidForAuth(db, authUid, stableId, {
    ...relinkOptions,
    repairLinks: false,
  });
  await ensureStableIdentityPair(db, authUid, {
    stableUid,
    sourceStableIds: [...new Set([stableId, stableUid].filter(Boolean))],
  }, provider, metadata);
  return { ok: true, stableUid, authUid, identityReady: true };
}

export const authEnsureStableLink = onCall({
  // зачем: владелец 2026-08-22 — вход через Google висел 10–30 с. Этот callable
  // стоит в серийной цепочке КАЖДОГО входа, а холодный старт добавлял 3–10 с
  // (плюс клиентские ретраи по таймауту). Один тёплый инстанс убирает главный
  // тормоз входа.
  //
  // ЦЕНА: ~$8.2/мес на дефолте gen2 (256MiB + 1 vCPU), НЕ $2–3 — оценка в
  // первой редакции этого комментария была занижена втрое (аудит тёплых
  // инстансов 2026-08-22, память project_warm_instances_cost_audit).
  // Когда трафик входов станет плотным, фикс можно снять: админка →
  // Пульт → «🌡️ Тёплые инстансы» (warm_instance_gauge.ts) отвечает цифрами,
  // сколько холодных стартов в активные часы поймали бы пользователи.
  ...HOT_CALLABLE_OPTIONS,
  minInstances: 1,
}, async (request) => {
  // зачем: прогрев с экрана входа (warmAuthSignInCallables, 2026-08-22). Ветка
  // стоит ДО auth-чека: смысл вызова — только поднять контейнер, пока юзер
  // выбирает аккаунт в окне Google. Firestore не трогаем, данных не отдаём.
  if (request.data?.warmup === true) return { ok: true, warm: true };
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  if (!request.app) {
    console.warn(JSON.stringify({
      event: 'app_check_header_shape',
      function: 'authEnsureStableLink',
      header: describeAppCheckHeader(request.rawRequest.headers['x-firebase-appcheck']),
    }));
  }
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const signInProvider = String(request.auth.token?.firebase?.sign_in_provider ?? '').trim();
  const metadata = normalizeAuthLinkMetadata(request.data?.linkMetadata);
  return ensureStableLinkForAuth(db, authUid, request.data?.stableId, signInProvider, metadata);
});

// ── Recovery hint: каким аккаунтом входить (маскированный email) ─────────────
// После переустановки юзер видит recovery-модалку, но не помнит, КАКОЙ Google/
// Apple аккаунт привязан к прогрессу — и тычет вслепую в один из нескольких на
// устройстве (инцидент 2026-07-21). По stable_id (UUID, уже есть на устройстве —
// это доказательство владения локальными данными) отдаём ТОЛЬКО маску email
// (usk***@gmail.com) и провайдера. Индустриальный стандарт (Google/банки);
// полный email никогда не покидает сервер.
export function maskEmailForRecoveryHint(email: unknown): string | null {
  const value = String(email ?? '').trim();
  const at = value.indexOf('@');
  if (at <= 0 || at === value.length - 1) return null;
  const local = value.slice(0, at);
  const domain = value.slice(at + 1);
  return `${local.slice(0, 3)}***@${domain}`;
}

export type RecoveryHintResult = {
  found: boolean;
  linked: boolean;
  provider: 'google' | 'apple' | null;
  maskedEmail: string | null;
};

const NEUTRAL_RECOVERY_HINT: RecoveryHintResult = {
  found: false,
  linked: false,
  provider: null,
  maskedEmail: null,
};

export function buildRecoveryHintFromUserData(
  userData: FirebaseFirestore.DocumentData | undefined,
): RecoveryHintResult {
  if (!userData) return NEUTRAL_RECOVERY_HINT;
  const linkedAuth = userData.linkedAuth;
  const providerRaw = linkedAuth && typeof linkedAuth === 'object'
    ? String((linkedAuth as { provider?: unknown }).provider ?? '').trim()
    : '';
  const provider: 'google' | 'apple' | null =
    providerRaw === 'google' ? 'google' : providerRaw === 'apple' ? 'apple' : null;
  if (!provider) return { found: true, linked: false, provider: null, maskedEmail: null };
  const maskedEmail = maskEmailForRecoveryHint((linkedAuth as { email?: unknown }).email);
  return { found: true, linked: true, provider, maskedEmail };
}

export const authRecoveryHint = onCall({
  ...HOT_CALLABLE_OPTIONS,
  enforceAppCheck: false,
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  if (!request.app) throw new HttpsError('failed-precondition', 'app_check_required');
  const stableId = normalizeStableId(request.data?.stableId);
  if (!stableId) return NEUTRAL_RECOVERY_HINT;
  const db = admin.firestore();
  const authLinkSnap = await readIdentityOrThrow(
    db.collection(AUTH_LINKS).doc(request.auth.uid).get(),
  );
  const linkedStableId = authLinkSnap.exists
    ? normalizeStableId(authLinkSnap.data()?.stable_id)
    : '';
  if (!linkedStableId || linkedStableId !== stableId) return NEUTRAL_RECOVERY_HINT;
  const snap = await readIdentityOrThrow(db.collection(USERS).doc(stableId).get());
  return buildRecoveryHintFromUserData(snap?.exists ? snap.data() : undefined);
});

// ── Anonymous-ownership claim (closes #11 safely) ────────────────────────────
// Перед входом через Google/Apple клиент (ещё анонимный) ставит на свой
// users/{localStableId} короткоживущую метку anon_merge_claim. После входа
// authMergeStableAccounts (под новым provider uid) поглощает локальный анонимный
// аккаунт ТОЛЬКО при наличии этой свежей метки — что доказывает «то же устройство,
// что держало анонимный аккаунт, прямо сейчас делает merge». Атакующий с утёкшим
// чужим stable_id метку поставить НЕ может (нет анонимного токена жертвы), поэтому
// чужой аккаунт поглотить нельзя. Метка пишется только владельцем дока.
export const ANON_MERGE_CLAIM_TTL_MS = 10 * 60 * 1000;

export function readAnonMergeClaim(
  userData: FirebaseFirestore.DocumentData | undefined,
  now: number,
  ttlMs: number = ANON_MERGE_CLAIM_TTL_MS,
): { authUid: string } | null {
  const claim = (userData ?? {}).anon_merge_claim;
  if (!claim || typeof claim !== 'object') return null;
  const authUid = String((claim as { authUid?: unknown }).authUid ?? '').trim();
  const at = Number((claim as { at?: unknown }).at);
  if (!authUid || !Number.isFinite(at) || at <= 0) return null;
  if (now - at > ttlMs) return null; // stale → not a valid proof
  return { authUid };
}

export async function stampAnonOwnershipForAuth(
  db: admin.firestore.Firestore,
  authUid: string,
  requestedStableId: unknown,
  now: number = Date.now(),
): Promise<{ ok: true; stableUid: string }> {
  const stableId = normalizeStableId(requestedStableId);
  if (!stableId || stableId.length > 160) {
    throw new HttpsError('invalid-argument', 'stable_id_required');
  }
  const stableUid = await resolveStableUidForAuth(db, authUid, stableId, {
    requireKnownIdentity: true,
    repairLinks: false,
  });
  await db.collection(USERS).doc(stableUid).set(
    { anon_merge_claim: { authUid, at: now }, updatedAt: now },
    { merge: true },
  );
  return { ok: true, stableUid };
}

export const authStampAnonOwnership = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  // зачем: прогрев с экрана входа — см. warmup-ветку authEnsureStableLink.
  if (request.data?.warmup === true) return { ok: true, warm: true };
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  if (!request.app) {
    console.warn(JSON.stringify({
      event: 'app_check_header_shape',
      function: 'authStampAnonOwnership',
      header: describeAppCheckHeader(request.rawRequest.headers['x-firebase-appcheck']),
    }));
  }
  const db = admin.firestore();
  const authUid = request.auth.uid;
  try {
    return await stampAnonOwnershipForAuth(db, authUid, request.data?.stableId);
  } catch (error) {
    if ((error as { code?: unknown })?.code === 'permission-denied') {
      console.warn(JSON.stringify({
        event: 'stamp_anon_ownership_not_owner',
        authUid,
        stableId: normalizeStableId(request.data?.stableId) || null,
      }));
    }
    throw error;
  }
});
