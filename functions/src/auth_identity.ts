import * as admin from 'firebase-admin';
import { restoreBanFromIdentityHash } from './banned_identity_hash';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { upsertEmailContact } from './email_contacts';
import {
  ACCOUNT_ID_FIELD,
  ACCOUNT_ID_INDEX,
  newAccountId,
  accountIdIndexDocId,
  cleanAliases,
} from './account_id';
import {
  accountStateFromSnapshots,
  assertAccountUsable,
} from './account_gate';
import {
  ACCOUNT_DELETE_AUTH_MARKERS,
  ACCOUNT_DELETE_PERMANENT_DENIALS,
  ACCOUNT_DELETE_TOMBSTONES,
  accountDeletePermanentDenialId,
} from './account_delete_job';
import {
  writeFirstAuthLinkGrowthAggregate,
} from './growth_daily_aggregate';
import { swallowed } from './swallowed_error';
import {
  commitAccountMergeStarsTransfer,
  prepareAccountMergeStarsTransfer,
  type PreparedAccountMergeStarsTransfer,
} from './auth_merge_stars_transfer';
import { beginStarLedgerTransactionAttempt, normalizeStars } from './stars_ledger';
import { enforceCallerRateWindow } from './caller_rate_window';

const USERS = 'users';
const AUTH_LINKS = 'auth_links';
// зачем (M-1): серверный аудит перепривязок по метке — для отката; клиентам закрыт (rules правит координатор).
const ANON_RELINK_AUDIT = 'anon_relink_audit';
const ANON_RELINK_AUDIT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LEADERBOARD = 'leaderboard';
const LEAGUE_GROUPS = 'league_groups';
const CLEANUP_CANDIDATES = 'identity_cleanup_candidates';
const IDENTITY_CLEANUP_THROTTLE_MS = 6 * 60 * 60 * 1000;
const SERVER_AUTH_UID_RE = /^(?=.{1,128}$)[^/\u0000-\u001f\u007f]+$/;

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
  // зачем (M-1 HIGH-1): nonce метки anon_merge_claim — вторая дверь (anon_relink) открывается
  // только при его предъявлении, как и слияние в auth_merge.
  anonMergeNonce?: string | null;
  anonMergeCaller?: AnonMergeCaller | null;
  repairLinks?: boolean;
};

type StableIdentityCandidate = {
  id: string;
  sourceStableIds: string[];
  hidden: boolean;
  hasAuthoritativeOwner: boolean;
  hasProviderLink: boolean;
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

/**
 * 8F: класс и код ошибки для логов — без сообщения (Firestore может вставить в него пути с uid).
 * зачем: 8D — TypeError в эмуляторе (admin.firestore.FieldValue undefined) выглядел как
 * «identity_check_unavailable» без единой строки причины (правило владельца «немой catch»).
 */
function identityErrorTag(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : 'none';
  return `name=${name} code=${code}`;
}

function throwIdentityCheckUnavailable(error: unknown): never {
  if (error instanceof HttpsError) throw error;
  console.warn(JSON.stringify({ event: 'identity_check_unavailable', cause: identityErrorTag(error) }));
  throw new HttpsError('unavailable', 'identity_check_unavailable');
}

async function readIdentityOrThrow<T>(read: Promise<T>): Promise<T> {
  try {
    return await read;
  } catch (error) {
    return throwIdentityCheckUnavailable(error);
  }
}

/**
 * Minimal server-only read surface shared by ordinary and transaction-bound
 * identity resolution. Keeping discovery behind this seam prevents the
 * transactional caller from growing a second ownership algorithm.
 */
type StableIdentityReadAccess = Readonly<{
  getDocument(
    ref: admin.firestore.DocumentReference,
  ): Promise<admin.firestore.DocumentSnapshot>;
  getQuery(
    query: admin.firestore.Query,
  ): Promise<admin.firestore.QuerySnapshot>;
}>;

function databaseIdentityReads(): StableIdentityReadAccess {
  return {
    getDocument: (ref) => ref.get(),
    getQuery: (query) => query.get(),
  };
}

function transactionIdentityReads(
  transaction: admin.firestore.Transaction,
): StableIdentityReadAccess {
  return {
    getDocument: (ref) => transaction.get(ref),
    getQuery: (query) => transaction.get(query),
  };
}

function hasFullFirestoreTransactionSurface(value: unknown): value is admin.firestore.Transaction {
  if (!value || typeof value !== 'object') return false;
  return ['get', 'getAll', 'create', 'set', 'update', 'delete']
    .every((method) => typeof Reflect.get(value, method) === 'function');
}

async function assertAuthDeletionNotPendingFromReads(
  db: admin.firestore.Firestore,
  reads: StableIdentityReadAccess,
  authUid: string,
): Promise<void> {
  const [marker, denial] = await Promise.all([
    readIdentityOrThrow(reads.getDocument(
      db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(authUid),
    )),
    readIdentityOrThrow(reads.getDocument(
      db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
        .doc(accountDeletePermanentDenialId(authUid)),
    )),
  ]);
  assertAccountUsable(accountStateFromSnapshots({ marker, denial, subject: 'auth' }));
}

async function assertStableDeletionNotPendingFromReads(
  db: admin.firestore.Firestore,
  reads: StableIdentityReadAccess,
  stableId: string,
): Promise<void> {
  const [marker, denial] = await Promise.all([
    readIdentityOrThrow(reads.getDocument(
      db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(stableId),
    )),
    readIdentityOrThrow(reads.getDocument(
      db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS)
        .doc(accountDeletePermanentDenialId(stableId)),
    )),
  ]);
  assertAccountUsable(accountStateFromSnapshots({ marker, denial, subject: 'stable' }));
}

async function assertAccountDeletionNotPending(
  db: admin.firestore.Firestore,
  authUid: string,
): Promise<void> {
  // зачем через ЕДИНУЮ ДВЕРЬ (этап 1, владелец 01.09.2026): раньше каждая из
  // 122 проверок читала метки сама, своей формой — и 01.09 сразу две из них
  // оказались с дырами. Теперь смысл «пускать ли» живёт в одном месте
  // (account_gate.ts), а здесь остаётся только обёртка недоступности базы.
  //
  // readIdentityOrThrow обязателен: сбой сети НЕ должен выглядеть как «аккаунт
  // жив» — иначе при отвале Firestore открылся бы доступ к удаляемому аккаунту.
  await assertAuthDeletionNotPendingFromReads(db, databaseIdentityReads(), authUid);
}

async function assertStableDeletionNotPending(
  db: admin.firestore.Firestore,
  stableId: string,
): Promise<void> {
  await assertStableDeletionNotPendingFromReads(db, databaseIdentityReads(), stableId);
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
  reads: StableIdentityReadAccess = databaseIdentityReads(),
): Promise<void> {
  const stableIds = [...new Set([...selection.sourceStableIds, selection.stableUid])];
  for (const stableId of stableIds) {
    await assertStableDeletionNotPendingFromReads(db, reads, stableId);
  }
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
  } catch (error) {
    // auth недоступен — оставляем как есть (не рушим вход); 8F: причина в лог, без uid.
    console.warn(JSON.stringify({ event: 'auth_metadata_enrich_unavailable', cause: identityErrorTag(error) }));
    return metadata;
  }
  const authEmail = cleanNullableString(rec.email, 320)
    ?? cleanNullableString(rec.providerData.find((p) => p.email)?.email, 320);
  const authDisplayName = cleanNullableString(rec.displayName, 160);

  const out: AuthLinkMetadata = { ...(metadata ?? {}) };
  if (!hasEmail && authEmail) out.email = authEmail;
  if (!hasDisplayName && authDisplayName) out.displayName = authDisplayName;
  return Object.keys(out).length > 0 ? out : metadata;
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
  reads: StableIdentityReadAccess = databaseIdentityReads(),
): Promise<StableIdentitySelection | null> {
  const [byFirebaseAuthUidSnap, byLinkedAuthUidSnap] = await Promise.all([
    readIdentityOrThrow(reads.getQuery(
      db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(20),
    )),
    authoritativeOnly
      ? Promise.resolve(null)
      : readIdentityOrThrow(reads.getQuery(
        db.collection(USERS).where('linkedAuth.providerUid', '==', authUid).limit(20),
      )),
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
      assertStableDeletionNotPendingFromReads(db, reads, candidateStableId)
    )),
  );
  await Promise.all([...canonicalIdsToCheck].map(async (canonicalStableId) => {
    const snap = await readIdentityOrThrow(reads.getDocument(
      db.collection(USERS).doc(canonicalStableId),
    ));
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
  reads: StableIdentityReadAccess = databaseIdentityReads(),
): Promise<AuthLinkAnchor | null> {
  const linkSnap = await readIdentityOrThrow(reads.getDocument(
    db.collection(AUTH_LINKS).doc(authUid),
  ));
  const anchoredStableId = normalizeStableId(linkSnap?.data()?.stable_id);
  if (!anchoredStableId) return null;
  await assertStableDeletionNotPendingFromReads(db, reads, anchoredStableId);
  const anchoredUserSnap = await readIdentityOrThrow(reads.getDocument(
    db.collection(USERS).doc(anchoredStableId),
  ));
  if (!anchoredUserSnap.exists) {
    return { anchorStableId: anchoredStableId, selection: null };
  }
  const anchoredUserData = anchoredUserSnap.data() ?? {};
  const canonicalStableId = normalizeStableId(anchoredUserData.canonicalStableId);
  if (anchoredUserData.identityHidden === true && canonicalStableId && canonicalStableId !== anchoredStableId) {
    await assertStableDeletionNotPendingFromReads(db, reads, canonicalStableId);
    const canonicalSnap = await readIdentityOrThrow(reads.getDocument(
      db.collection(USERS).doc(canonicalStableId),
    ));
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
  anonClaimNonceHash: string;
  authLinkExists: boolean;
  authLinkStableId: string;
  existingOwnerIds: readonly string[];
  authorization: 'self' | 'user' | 'link' | 'anon_relink';
};

function readAnonClaimFingerprint(userData: FirebaseFirestore.DocumentData): {
  authUid: string;
  at: number | null;
  nonceHash: string;
} {
  const claim = userData.anon_merge_claim;
  if (!claim || typeof claim !== 'object') return { authUid: '', at: null, nonceHash: '' };
  const authUid = normalizeStableId((claim as { authUid?: unknown }).authUid);
  const atValue = Number((claim as { at?: unknown }).at);
  const rawHash = (claim as { nonceHash?: unknown }).nonceHash;
  return {
    authUid,
    at: Number.isFinite(atValue) ? atValue : null,
    // зачем: подмена хэша между assert и транзакцией должна ломать сверку отпечатка.
    nonceHash: typeof rawHash === 'string' ? rawHash : '',
  };
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
    anonClaimNonceHash: claim.nonceHash,
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
    anonMergeNonce?: string | null;
    anonMergeCaller?: AnonMergeCaller | null;
    allowedAuthLinkStableIds?: readonly string[];
  },
  reads: StableIdentityReadAccess = databaseIdentityReads(),
): Promise<StableOwnerProof> {
  if (!stableId || stableId.length > 160) {
    throw new HttpsError('invalid-argument', 'stable_id_required');
  }
  const [userSnap, linkSnap] = await Promise.all([
    readIdentityOrThrow(reads.getDocument(db.collection(USERS).doc(stableId))),
    readIdentityOrThrow(reads.getDocument(db.collection(AUTH_LINKS).doc(authUid))),
  ]);
  const userData = userSnap?.data() ?? {};
  const userAuthUid = String(userData.firebaseAuthUid ?? '').trim();
  const linkedStableId = String(linkSnap?.data()?.stable_id ?? '').trim();
  if (linkedStableId && linkedStableId !== stableId) {
    await assertStableDeletionNotPendingFromReads(db, reads, linkedStableId);
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
  // зачем (M-1 HIGH-1): свежая метка с хэшем nonce — это ещё и «предъяви nonce»; иначе любой
  // вошедший (свежий Google / анонимный allowAnonRelink) получал аккаунт жертвы без слияния.
  let anonRelinkNonceDenied: string | null = null;
  if (
    !canonicalLinkConflicts &&
    (options?.allowAnonRelink === true || options?.allowProviderRelink === true) &&
    hasFreshPreviousOwnerProof &&
    !linkedAuthUid &&
    anonClaim
  ) {
    const relinkCaller = options?.anonMergeCaller ? { ...options.anonMergeCaller, door: 'relink' as const } : undefined;
    const verdict = verifyAnonMergeClaimNonce(anonClaim, options?.anonMergeNonce, relinkCaller);
    if (!verdict.ok) anonRelinkNonceDenied = verdict.reason;
  }
  if (
    !canonicalLinkConflicts &&
    (options?.allowAnonRelink === true || options?.allowProviderRelink === true) &&
    hasFreshPreviousOwnerProof &&
    !linkedAuthUid &&
    anonRelinkNonceDenied === null
  ) {
    const existingByAuth = await readIdentityOrThrow(
      reads.getQuery(db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(1)),
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
    anonRelinkNonceDenied,
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

      // Решение принимает ЕДИНАЯ ДВЕРЬ по уже прочитанным снапшотам: логика
      // «grace или смерть» не должна дублироваться на каждой транзакции —
      // именно из такого дублирования и рождались дыры.
      assertAccountUsable(accountStateFromSnapshots({
        marker: authMarkerSnap, denial: authPermanentDenialSnap, subject: 'auth',
      }));
      assertAccountUsable(accountStateFromSnapshots({
        markers: tombstoneSnaps, denials: permanentDenialSnaps, subject: 'stable',
      }));

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
        assertAccountUsable(accountStateFromSnapshots({
          marker: currentLinkTombstone, denial: currentLinkPermanentDenial, subject: 'stable',
        }));
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
          currentProof.anonClaimNonceHash === expectedProof.anonClaimNonceHash &&
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
        // зачем (M-1, решение координатора): перепривязка по метке одноразовая — метка гасится в
        // той же транзакции, а для отката пишется серверный аудит (30 дней).
        if (expectedProof?.authorization === 'anon_relink' && userAuthUidChanged) {
          userPatch.anon_merge_claim = admin.firestore.FieldValue.delete();
          transaction.set(db.collection(ANON_RELINK_AUDIT).doc(), {
            stableId,
            previousAuthUid: currentUserAuthUid,
            newAuthUid: authUid,
            provider: options.provider ?? 'anonymous',
            claimAt: currentProof.anonClaimAt,
            at: now,
            mode: expectedProof.anonClaimNonceHash ? 'nonce' : 'legacy',
            // зачем (security-ревью №2): TTL Firestore работает только по Timestamp (политика в firestore.indexes.json).
            expiresAt: admin.firestore.Timestamp.fromMillis(now + ANON_RELINK_AUDIT_TTL_MS),
          });
          console.warn(`[ANON-MERGE-CLAIM] anon_relink_done stable=${stableId.slice(0, 8)} mode=${expectedProof.anonClaimNonceHash ? 'nonce' : 'legacy'}`);
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

      // ── САМОПОДДЕРЖАНИЕ КАРТЫ ИМЁН (этап 3) ────────────────────────────
      // зачем: без этого таблица соответствия устаревает с первого же нового
      // человека — новые аккаунты и новые привязки в неё не попадут, и
      // опознание по одному имени тихо перестанет работать для всех, кто
      // пришёл после миграции. Это ровно класс бага «механизм есть, а данных
      // не дали», который в проекте повторялся многократно.
      //
      // Пишем В ТОЙ ЖЕ транзакции, что и сами документы личности: карта не
      // имеет права разойтись с реальностью даже на мгновение.
      const accountIdForIndex = String(
        (currentUserData as Record<string, unknown>)[ACCOUNT_ID_FIELD] ?? '',
      ).trim();
      if (accountIdForIndex) {
        for (const { alias, kind } of cleanAliases([
          { alias: stableId, kind: 'stable' },
          { alias: authUid, kind: 'auth' },
        ])) {
          transaction.set(db.collection(ACCOUNT_ID_INDEX).doc(accountIdIndexDocId(alias)), {
            accountId: accountIdForIndex, alias, kind, stableId, updatedAt: now,
          }, { merge: true });
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
  const lbSnap = await lbRef.get().catch(swallowed('auth_identity:lbRef.get()', null));
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
  anonMergeNonce: string | null = null,
  anonMergeCaller: AnonMergeCaller | null = null,
): Promise<void> {
  await assertStableAccountMergeNotPending(db, selection.sourceStableIds);
  const ownerProof = await assertStableOwner(db, authUid, selection.stableUid, {
    allowProviderRelink: Boolean(provider),
    allowAnonRelink: !provider,
    anonMergeNonce,
    anonMergeCaller,
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

  ['points', 'streak', 'daily7time_ms'].forEach((field) => {
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
  const snap = await db.collection('name_index').where('uid', '==', duplicateUid).limit(50).get().catch(swallowed('auth_identity:ex).where(uid, ==, duplicateUid).limit(50).get()', null));
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

const DEDUP_STARS_LOG = '[ACCOUNT-DEDUP-STARS]';

/**
 * зачем (L-1, координатор 03.10): монеты дубля при скрытии переезжают на stableId тем же
 * механизмом 8T. Якорь opId — детерминированный `dedup_<sha256(stable\u0000duplicate)>`
 * (70 символов + `.N` ≤ 96 — проходит OP_ID_RE журнала), повтор чистки не удваивает.
 */
export function dedupStarsSourceId(stableId: string, duplicateUid: string): string {
  return `dedup_${createHash('sha256').update(`${stableId}\u0000${duplicateUid}`).digest('hex')}`;
}

/** Только чтения (prepare). Любая неувязка → null: перенос пропущен, скрытие дубля идёт как раньше. */
async function prepareDuplicateStarsTransfer(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
  duplicateSnap: admin.firestore.DocumentSnapshot,
  stableUserRef: admin.firestore.DocumentReference,
): Promise<DuplicateStarsPreparation> {
  const tag = `stable=${stableId.slice(0, 8)} duplicate=${duplicateSnap.id.slice(0, 8)}`;
  const duplicateData = duplicateSnap.data() || {};
  const balance = normalizeStars(duplicateData.stars).balance;
  const skip = (reason: string): DuplicateStarsPreparation => ({ prepared: null, skipReason: reason, balance });
  // Ноль монет — ни одного лишнего чтения (ни документа стабильного, ни расписок).
  if (balance <= 0) return { prepared: null, skipReason: null, balance };
  if (duplicateData.identityHidden === true && duplicateData.canonicalStableId !== stableId) {
    console.warn(`${DEDUP_STARS_LOG} skip ${tag} reason=hidden_under_other_canonical balance=${balance}`);
    return skip('hidden_under_other_canonical');
  }
  try {
    const stableSnap = await tx.get(stableUserRef);
    if (!stableSnap.exists) {
      console.warn(`${DEDUP_STARS_LOG} skip ${tag} reason=stable_user_missing balance=${balance}`);
      return skip('stable_user_missing');
    }
    // зачем (ревью L-1, LOW-2): в скрытый аккаунт монеты переносить нельзя — там они застрянут.
    if (stableSnap.data()?.identityHidden === true) {
      console.warn(`${DEDUP_STARS_LOG} skip ${tag} reason=stable_hidden balance=${balance}`);
      return skip('stable_hidden');
    }
    const prepared = await prepareAccountMergeStarsTransfer(tx, db, {
      winnerStableId: stableId,
      loserStableId: duplicateSnap.id,
      winnerSnap: stableSnap,
      loserSnap: duplicateSnap,
      outboxId: dedupStarsSourceId(stableId, duplicateSnap.id),
      authUid,
      nowMs: Date.now(),
    });
    console.log(`${DEDUP_STARS_LOG} prepared ${tag} balance=${balance} status=${prepared.record.status} reason=${prepared.record.reason ?? '-'} chunks=${prepared.record.chunks} remainder=${prepared.record.remainder}`);
    const status = prepared.record.status as string;
    const transferredFully = status === 'transferred' && !(prepared.record.remainder > 0);
    return {
      prepared,
      skipReason: transferredFully || status === 'already_applied' || status === 'nothing_to_transfer'
        ? null
        : `${status}:${prepared.record.reason ?? (prepared.record.remainder > 0 ? 'remainder' : '-')}`,
      balance,
    };
  } catch (error) {
    console.error(`${DEDUP_STARS_LOG} skip ${tag} reason=prepare_threw balance=${balance} message=${String((error as { message?: unknown })?.message ?? error).slice(0, 120)}`);
    return skip('prepare_threw');
  }
}

type DuplicateStarsPreparation = {
  prepared: PreparedAccountMergeStarsTransfer | null;
  /** Не null — монеты (или их часть) остались на дубле; нужен ручной разбор. */
  skipReason: string | null;
  balance: number;
};

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
  const siblingsSnap = await db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(50).get().catch(swallowed('auth_identity:re(firebaseAuthUid, ==, authUid).limit(50).get()', null));
  if (!siblingsSnap || siblingsSnap.empty) return out;

  for (const sibling of siblingsSnap.docs) {
    const duplicateUid = sibling.id;
    if (!duplicateUid || duplicateUid === stableId) continue;
    const siblingData = sibling.data() || {};
    if (siblingData.identityHidden === true && siblingData.canonicalStableId === stableId) continue;

    const stableUserRef = db.collection(USERS).doc(stableId);
    const stableLbRef = db.collection(LEADERBOARD).doc(stableId);
    const duplicateLbRef = db.collection(LEADERBOARD).doc(duplicateUid);
    let starsSkip: { reason: string; balance: number } | null = null;
    let ownerChanged = false;
    await db.runTransaction(async (tx) => {
      starsSkip = null;
      ownerChanged = false;
      // зачем (L-1): журнал разрешает один prepare на uid за попытку; Admin SDK повторяет колбэк
      // с тем же tx — сбрасываем защиту в начале каждой попытки.
      beginStarLedgerTransactionAttempt(tx);
      const [stableLbSnap, duplicateLbSnap, duplicateUserSnap] = await Promise.all([
        tx.get(stableLbRef),
        tx.get(duplicateLbRef),
        tx.get(sibling.ref),
      ]);
      // зачем (ревью L-1, MEDIUM-1): список дублей получен запросом ВНЕ транзакции. Если дубль успели
      // перепривязать к другому входу (relink/merge), его монеты и скрытие — уже не наше дело.
      const currentOwner = String(duplicateUserSnap.data()?.firebaseAuthUid ?? '');
      if (!duplicateUserSnap.exists || currentOwner !== authUid) {
        console.warn(`${DEDUP_STARS_LOG} skip stable=${stableId.slice(0, 8)} duplicate=${duplicateUid.slice(0, 8)} reason=auth_uid_changed exists=${duplicateUserSnap.exists}`);
        ownerChanged = true;
        return;
      }
      // Все чтения (включая расписки журнала) — до первой записи транзакции.
      const starsPreparation = await prepareDuplicateStarsTransfer(
        tx, db, stableId, authUid, duplicateUserSnap, stableUserRef,
      );
      const starsPrepared = starsPreparation.prepared;
      if (starsPreparation.skipReason) {
        starsSkip = { reason: starsPreparation.skipReason, balance: starsPreparation.balance };
      }
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
      // Журнал пишет stars+расписки (merge) ДО скрытия: поле stars скрытие не трогает.
      if (starsPrepared) commitAccountMergeStarsTransfer(tx, starsPrepared);
      tx.set(sibling.ref, {
        identityHidden: true,
        canonicalStableId: stableId,
        identityCanonicalizedAt: Date.now(),
        updatedAt: Date.now(),
      }, { merge: true });
      out.usersHidden += 1;
    });
    if (ownerChanged) continue;
    // зачем (ревью L-1, LOW-3): дубль скрыт, а монеты (часть) остались на нём — следующие чистки
    // его пропускают, поэтому оставляем кандидата на ручной разбор, а не только строку лога.
    const skipped = starsSkip as { reason: string; balance: number } | null;
    if (skipped) {
      await recordIdentityCleanupCandidate(db, stableId, authUid, 'dedup_stars_skipped', {
        duplicateUid, balance: skipped.balance, skipReason: skipped.reason,
      }).catch(swallowed('auth_identity:record_dedup_stars_skipped', undefined));
    }

    out.nameIndexHidden += await hideNameIndexForDuplicateUid(db, duplicateUid, stableId).catch(swallowed('auth_identity:hide_name_index_for_duplicate_uid', 0));
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
  const userSnap = await userRef.get().catch(swallowed('auth_identity:userRef.get()', null));
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
    legacyLbRef.get().catch(swallowed('auth_identity:legacyLbRef.get()', null)),
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
      }).catch(swallowed('auth_identity:)', undefined));
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

type StableIdentityDiscovery = Readonly<{
  selection: StableIdentitySelection;
  verifyOwner: boolean;
}>;

async function findVerifiedAccountAliasSelection(
  db: admin.firestore.Firestore,
  reads: StableIdentityReadAccess,
  authUid: string,
): Promise<StableIdentitySelection | null> {
  let indexSnap: admin.firestore.DocumentSnapshot;
  try {
    indexSnap = await reads.getDocument(
      db.collection(ACCOUNT_ID_INDEX).doc(accountIdIndexDocId(authUid)),
    );
  } catch (error) {
    // The alias map is an optimization layer. Preserve the canonical resolver's
    // fail-open-to-the-established-ladder behavior when the index is unavailable.
    console.warn(JSON.stringify({ event: 'account_id_lookup_unavailable', cause: identityErrorTag(error) }));
    return null;
  }
  if (!indexSnap.exists) return null;
  const indexData = indexSnap.data() ?? {};
  const accountId = normalizeStableId(indexData.accountId);
  const stableId = normalizeStableId(indexData.stableId);
  if (!accountId || !stableId) {
    console.warn(JSON.stringify({
      event: 'account_id_index_incomplete',
      hasAccountId: Boolean(accountId),
      hasStableId: Boolean(stableId),
    }));
    return null;
  }

  let userSnap: admin.firestore.DocumentSnapshot;
  try {
    userSnap = await reads.getDocument(db.collection(USERS).doc(stableId));
  } catch (error) {
    console.warn(JSON.stringify({ event: 'account_id_lookup_verify_failed', cause: identityErrorTag(error) }));
    return null;
  }
  if (!userSnap.exists) return null;
  const userData = userSnap.data() ?? {};
  if (userData.identityHidden === true) return null;
  if (normalizeStableId(userData[ACCOUNT_ID_FIELD]) !== accountId) return null;
  const owner = normalizeStableId(userData.firebaseAuthUid);
  if (owner !== authUid) {
    console.log(JSON.stringify({
      event: 'account_id_lookup_not_owned',
      matchedKind: normalizeStableId(indexData.kind) || 'unknown',
      ownerPresent: Boolean(owner),
      selfKeyed: stableId === authUid,
    }));
    return null;
  }
  return { stableUid: stableId, sourceStableIds: [stableId] };
}

/**
 * One discovery ladder for both the legacy database reader and the new
 * transaction-bound reader. The caller decides whether it may repair links;
 * identity ranking and authority precedence stay identical.
 */
async function discoverStableIdentityForAuth(
  db: admin.firestore.Firestore,
  reads: StableIdentityReadAccess,
  authUid: string,
): Promise<StableIdentityDiscovery | null> {
  const authLinkAnchor = await findLiveAuthLinkAnchor(db, authUid, reads);
  if (authLinkAnchor?.selection) {
    return { selection: authLinkAnchor.selection, verifyOwner: false };
  }

  const aliasSelection = await findVerifiedAccountAliasSelection(db, reads, authUid);
  if (aliasSelection) return { selection: aliasSelection, verifyOwner: true };

  const authoritativeByAuth = await findStableUidForProviderAuth(db, authUid, true, reads);
  if (authoritativeByAuth) {
    return { selection: authoritativeByAuth, verifyOwner: true };
  }

  const direct = await readIdentityOrThrow(
    reads.getDocument(db.collection(USERS).doc(authUid)),
  );
  if (direct.exists) {
    const directSelection = selectionFromUserData(authUid, direct.data() ?? {});
    if (directSelection.stableUid !== authUid) {
      return { selection: directSelection, verifyOwner: true };
    }
  }

  const byAuth = await findStableUidForProviderAuth(db, authUid, false, reads);
  if (byAuth) return { selection: byAuth, verifyOwner: true };
  return null;
}

async function authorizeStableIdentitySelection(
  db: admin.firestore.Firestore,
  reads: StableIdentityReadAccess,
  authUid: string,
  discovery: StableIdentityDiscovery,
  options?: ResolveStableUidForAuthOptions,
): Promise<StableOwnerProof | undefined> {
  await assertSelectionDeletionNotPending(db, discovery.selection, reads);
  if (!discovery.verifyOwner && !shouldRepairIdentityLinks(options)) return undefined;
  return assertStableOwner(db, authUid, discovery.selection.stableUid, {
    ...options,
    allowedAuthLinkStableIds: discovery.selection.sourceStableIds,
  }, reads);
}

async function finalizeStableIdentitySelection(
  db: admin.firestore.Firestore,
  authUid: string,
  selection: StableIdentitySelection,
  options: ResolveStableUidForAuthOptions | undefined,
  verifyOwner: boolean,
): Promise<string> {
  const ownerProof = await authorizeStableIdentitySelection(
    db,
    databaseIdentityReads(),
    authUid,
    { selection, verifyOwner },
    options,
  );
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

  if (!stableId) {
    const discovery = await discoverStableIdentityForAuth(
      db,
      databaseIdentityReads(),
      authUid,
    );
    if (discovery) {
      return finalizeStableIdentitySelection(
        db,
        authUid,
        discovery.selection,
        options,
        discovery.verifyOwner,
      );
    }
    if (options?.requireKnownIdentity) {
      throw new HttpsError('failed-precondition', 'stable_id_required');
    }
    return authUid;
  }

  // Живая привязка auth_links идёт ПЕРВОЙ — это то, чем человек реально входит
  // сегодня (её пишет сам вход с устройства), и это одно точечное чтение.
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

  // ── ЕДИНОЕ ИМЯ: опознание по карте (этап 3) — ПОСЛЕ живой привязки ──────
  // зачем именно здесь, а не первой ступенью (аудит 2026-09-02): карта имён —
  // это снимок, посчитанный офлайн; привязка auth_links — то, чем человек
  // входит прямо сейчас. Когда они расходятся, правда у привязки. Пока карта
  // стояла ПЕРВОЙ, у 62 живых аккаунтов (среди них двое с подпиской) она вела
  // на другой документ, чем auth_links, и assertStableOwner отвечал
  // stable_id_mismatch — клиент на этот код ротирует локальную личность, то
  // есть человек получал пустой профиль. Ровно та беда, ради которой всё
  // затевалось. Расходиться карта будет и дальше: слияние, восстановление и
  // админская починка перепривязывают auth_links, не трогая карту.
  //
  // Здесь карта заменяет findStableUidForProviderAuth — два запроса с
  // limit(20) — одним точечным чтением. Принимаем только документ, которым
  // этот uid ВЛАДЕЕТ (firebaseAuthUid совпал): ровно то, что нашёл бы
  // авторитетный запрос ниже. Не нашли, карта устарела или документ чужой —
  // молча идём прежним путём, ступень по-прежнему обратима.
  const aliasSelection = await findVerifiedAccountAliasSelection(
    db,
    databaseIdentityReads(),
    authUid,
  );
  if (aliasSelection) {
    await assertStableDeletionNotPending(db, aliasSelection.stableUid);
    return finalizeStableIdentitySelection(
      db,
      authUid,
      aliasSelection,
      options,
      true,
    );
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

/**
 * Resolve the caller's stable account using only reads owned by the supplied
 * Firestore transaction. No client-requested stable id is accepted and this
 * read-only boundary never repairs links or writes identity documents.
 */
export async function resolveStableUidForAuthInTransaction(
  db: admin.firestore.Firestore,
  transaction: admin.firestore.Transaction,
  authUid: unknown,
): Promise<string> {
  if (
    typeof authUid !== 'string'
    || authUid.trim() !== authUid
    || !SERVER_AUTH_UID_RE.test(authUid)
  ) {
    throw new HttpsError('invalid-argument', 'auth_uid_invalid');
  }
  if (!hasFullFirestoreTransactionSurface(transaction)) {
    throw new HttpsError('failed-precondition', 'identity_transaction_required');
  }

  const reads = transactionIdentityReads(transaction);
  await assertAuthDeletionNotPendingFromReads(db, reads, authUid);
  const discovery = await discoverStableIdentityForAuth(db, reads, authUid);
  if (discovery) {
    await authorizeStableIdentitySelection(
      db,
      reads,
      authUid,
      discovery,
      { repairLinks: false },
    );
    return discovery.selection.stableUid;
  }

  // The established resolver falls back to the auth uid. The transaction path
  // preserves that compatibility while adding the stable deletion fence needed
  // by an atomic authorization decision.
  await assertStableDeletionNotPendingFromReads(db, reads, authUid);
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

      assertAccountUsable(accountStateFromSnapshots({
        marker: authMarkerSnap, denial: authPermanentDenialSnap, subject: 'auth',
      }));
      assertAccountUsable(accountStateFromSnapshots({
        marker: tombstoneSnap, denial: stablePermanentDenialSnap, subject: 'stable',
      }));

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
        assertAccountUsable(accountStateFromSnapshots({
          marker: linkedTombstoneSnap, denial: linkedPermanentDenialSnap, subject: 'stable',
        }));
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
        assertAccountUsable(accountStateFromSnapshots({
          marker: authoritativeTombstoneSnap, denial: authoritativePermanentDenialSnap, subject: 'stable',
        }));
        return { status: 'authoritative', stableUid: authoritativeStableId, identityReady: false };
      }

      previouslyObservedMissingTarget = true;
      // зачем имя СРАЗУ при рождении аккаунта (этап 3): иначе новые люди
      // остаются вне новой схемы, карта имён устаревает с первого же дня, и
      // опознание по одному имени работает только для тех, кто был до
      // миграции. Класс «механизм есть, а данных не дали».
      const freshAccountId = newAccountId();
      const userData: Record<string, unknown> = {
        firebaseAuthUid: authUid,
        [ACCOUNT_ID_FIELD]: freshAccountId,
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
      // Новый аккаунт сразу попадает в карту имён — в ТОЙ ЖЕ транзакции,
      // чтобы карта не могла разойтись с реальностью даже на мгновение.
      for (const { alias, kind } of cleanAliases([
        { alias: stableId, kind: 'stable' },
        { alias: authUid, kind: 'auth' },
      ])) {
        transaction.set(db.collection(ACCOUNT_ID_INDEX).doc(accountIdIndexDocId(alias)), {
          accountId: freshAccountId, alias, kind, stableId, updatedAt: now,
        }, { merge: true });
      }
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
      // зачем БЕЗ grace-ветки (в отличие от всех прочих проверок): сюда входят
      // только после доказанной смерти старой личности (см. проверку её
      // надгробия ниже), а grace на ней отсекается ещё вызывающей стороной.
      // Проверяем здесь auth-метку и СВЕЖИЙ id — на свежем grace невозможен.
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

// ── [AUTH-ENSURE-LINK] (координатор 14.10, ACC-SPEED: тёплый вызов 3,3–3,6 с, один — 10,7 с) ───────────────────────────
// зачем: «сперва логи» — до ускорения знать, какая стадия держит ответ: проверки удаления, данные из Auth, чтение связки,
// ветка решения. Только стадии, ветка и миллисекунды; без uid/почты.
export type AuthEnsureLinkTrace = { mark(stage: string, extra?: Record<string, unknown>): void };
export function createAuthEnsureLinkTrace(now: () => number = Date.now): AuthEnsureLinkTrace & { total(): number } {
  const startedAtMs = now();
  let stageStartedAtMs = startedAtMs;
  return {
    mark(stage, extra = {}) {
      const t = now();
      console.log(JSON.stringify({ event: 'auth_ensure_link_stage', tag: '[AUTH-ENSURE-LINK]', stage, ms: t - stageStartedAtMs, sinceStartMs: t - startedAtMs, ...extra }));
      stageStartedAtMs = t;
    },
    total: () => now() - startedAtMs,
  };
}

export async function ensureStableLinkForAuth(
  db: admin.firestore.Firestore,
  authUid: string,
  requestedStableId: unknown,
  signInProvider: string,
  metadata?: AuthLinkMetadata,
  anonMergeNonce: string | null = null,
  callerAuthTimeMs: number | null = null,
  trace?: AuthEnsureLinkTrace,
): Promise<{ ok: true; stableUid: string; authUid: string; identityReady: true }> {
  const stableId = normalizeStableId(requestedStableId);
  // зачем ([AUTH-ENSURE-LINK]): каждый выход функции называет свою ветку.
  const done = <T>(branch: string, result: T): T => { trace?.mark(`return:${branch}`); return result; };
  const provider: AuthProvider | null =
    signInProvider === 'google.com'
      ? 'google'
      : signInProvider === 'apple.com'
        ? 'apple'
        : null;
  const anonMergeCaller: AnonMergeCaller = { provider: signInProvider, authTimeMs: callerAuthTimeMs };
  const allowProviderRelink = Boolean(provider);
  const allowAnonRelink = !allowProviderRelink;

  if (stableId.length > 160) {
    throw new HttpsError('invalid-argument', 'stable_id_required');
  }

  await assertAccountDeletionNotPending(db, authUid);
  if (stableId) await assertStableDeletionNotPending(db, stableId);
  trace?.mark('deletion_checks', { provider: provider ?? 'anonymous', hasStableId: Boolean(stableId) });

  // Добираем email/displayName из Firebase Auth, если клиент их не прислал —
  // иначе linkedAuth.email пишется null и юзера не найти по почте в админке.
  metadata = await enrichMetadataFromAuth(authUid, provider, metadata);
  trace?.mark('metadata_enriched');

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
      // зачем ДО ротации (владелец, 2026-09-01): это главный путь входа через
      // Google/Apple. Внутри grace аккаунт ЖИВ — ротировать привязку на свежий
      // пустой профиль здесь нельзя, иначе человек получит чистый экран вместо
      // предложения вернуть свой прогресс, и вернуть его будет уже некуда.
      const linkedState = accountStateFromSnapshots({
        marker: linkedTombstone, denial: linkedDenial, subject: 'stable',
      });
      if (linkedState.kind === 'grace') assertAccountUsable(linkedState);
      if (linkedStableRetired && stableId && linkedStableId !== stableId) {
        await rotateRetiredProviderStableLink(
          db,
          authUid,
          linkedStableId,
          stableId,
          provider,
          metadata,
        );
        return done('b1', { ok: true, stableUid: stableId, authUid, identityReady: true });
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
        anonMergeNonce,
        anonMergeCaller,
        repairLinks: false,
      });
      await ensureStableIdentityPair(db, authUid, {
        stableUid: linkedStableUid,
        sourceStableIds: [linkedStableId, linkedStableUid],
      }, provider, metadata, anonMergeNonce, anonMergeCaller);
      return done('b2', { ok: true, stableUid: linkedStableUid, authUid, identityReady: true });
    }
    if (!linkedStableId) {
      const existingUserSelection = await findStableUidForProviderAuth(db, authUid);
      if (existingUserSelection && existingUserSelection.stableUid !== stableId) {
        const stableUid = await resolveStableUidForAuth(db, authUid, existingUserSelection.stableUid, {
          allowProviderRelink: true,
          anonMergeNonce,
          anonMergeCaller,
          repairLinks: false,
        });
        await ensureStableIdentityPair(db, authUid, {
          stableUid,
          sourceStableIds: [...existingUserSelection.sourceStableIds, stableUid],
        }, provider, metadata, anonMergeNonce, anonMergeCaller);
        return done('b3', { ok: true, stableUid, authUid, identityReady: true });
      }
    }
  }

  if (stableId) {
    const existingAnchor = await findLiveAuthLinkAnchor(db, authUid);
    if (existingAnchor?.selection) {
      const stableUid = await resolveStableUidForAuth(db, authUid, existingAnchor.selection.stableUid, {
        allowProviderRelink,
        allowAnonRelink,
        anonMergeNonce,
        anonMergeCaller,
        repairLinks: false,
      });
      await ensureStableIdentityPair(db, authUid, {
        stableUid,
        sourceStableIds: [...existingAnchor.selection.sourceStableIds, stableUid],
      }, provider, metadata, anonMergeNonce, anonMergeCaller);
      return done('b4', { ok: true, stableUid, authUid, identityReady: true });
    }

    const existingUserSelection = await findStableUidForProviderAuth(db, authUid);
    if (existingUserSelection) {
      const stableUid = await resolveStableUidForAuth(db, authUid, existingUserSelection.stableUid, {
        allowProviderRelink,
        allowAnonRelink,
        anonMergeNonce,
        anonMergeCaller,
        repairLinks: false,
      });
      await ensureStableIdentityPair(db, authUid, {
        stableUid,
        sourceStableIds: [...existingUserSelection.sourceStableIds, stableUid],
      }, provider, metadata, anonMergeNonce, anonMergeCaller);
      return done('b5', { ok: true, stableUid, authUid, identityReady: true });
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
      return done('b6', { ok: true, stableUid: bootstrap.stableUid, authUid, identityReady: true });
    }
    if (bootstrap.status === 'authoritative') {
      await assertStableDeletionNotPending(db, bootstrap.stableUid);
      await assertStableAccountMergeNotPending(db, [bootstrap.stableUid]);
      if (!bootstrap.identityReady) {
        await ensureStableIdentityPair(db, authUid, {
          stableUid: bootstrap.stableUid,
          sourceStableIds: [bootstrap.stableUid],
        }, provider, metadata, anonMergeNonce, anonMergeCaller);
      }
      return done('b7', { ok: true, stableUid: bootstrap.stableUid, authUid, identityReady: true });
    }
  }

  const relinkOptions = { allowProviderRelink, allowAnonRelink, anonMergeNonce, anonMergeCaller };
  const stableUid = await resolveStableUidForAuth(db, authUid, stableId, {
    ...relinkOptions,
    repairLinks: false,
  });
  await ensureStableIdentityPair(db, authUid, {
    stableUid,
    sourceStableIds: [...new Set([stableId, stableUid].filter(Boolean))],
  }, provider, metadata, anonMergeNonce, anonMergeCaller);
  return done('b8', { ok: true, stableUid, authUid, identityReady: true });
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
  // зачем (ревизия тёплых инстансов 2026-08-29, память 22.08): постоянный
  // тёплый инстанс стоит заметных денег каждый месяц, а вход и так делает
  // несколько сетевых раунд-трипов — лишняя секунда холодного старта функции
  // раз в десятки минут на этом фоне не читается. Тёплым остаётся только
  // maxVoiceMint: старт звонка MAX — премиум-момент, где секунда слышна.
  minInstances: 0,
}, async (request) => {
  // зачем: прогрев с экрана входа (warmAuthSignInCallables, 2026-08-22). Ветка
  // стоит ДО auth-чека: смысл вызова — только поднять контейнер, пока юзер
  // выбирает аккаунт в окне Google. Firestore не трогаем, данных не отдаём.
  if (request.data?.warmup === true) return { ok: true, warm: true };
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  // зачем (App Check запломбирован навсегда, клиентский App Check удалён): request.app теперь ВСЕГДА пуст, и прежняя
  // диагностика формы заголовка писала warn на каждый вызов (~200/15 мин на проде — шум и деньги за логи). Убрана.
  const db = admin.firestore();
  const authUid = request.auth.uid;
  const signInProvider = String(request.auth.token?.firebase?.sign_in_provider ?? '').trim();
  const metadata = normalizeAuthLinkMetadata(request.data?.linkMetadata);
  // зачем (M-1 HIGH-1): необязательный nonce из authStampAnonOwnership (клиент 2.0+).
  const anonMergeNonce = parseAnonMergeNonce(request.data?.anonMergeNonce);
  logDeviceHeaderPresence('authEnsureStableLink', request.rawRequest?.headers);
  // зачем (координатор 18.10, защита от накрутки): привязка в цепочке каждого входа — потолки щедрые (мобильный NAT делит IP
  // на многих людей), но ферма анонимных аккаунтов с одного адреса упирается в окно. Сбой счётчика вход не ломает (fail-open).
  await enforceCallerRateWindow({ scope: 'ensure_link', authUid, rawRequest: request.rawRequest, maxPerUid: 120, maxPerIp: 1200 });
  const trace = createAuthEnsureLinkTrace();
  trace.mark('start', { provider: signInProvider || 'none', hasMetadata: Boolean(metadata), hasNonce: Boolean(anonMergeNonce) });
  let linked: Awaited<ReturnType<typeof ensureStableLinkForAuth>>;
  try {
    linked = await ensureStableLinkForAuth(
      db, authUid, request.data?.stableId, signInProvider, metadata, anonMergeNonce,
      authTimeMsFromToken(request.auth.token), trace,
    );
  } catch (error) {
    console.warn(JSON.stringify({
      event: 'auth_ensure_link_failed', tag: '[AUTH-ENSURE-LINK]', totalMs: trace.total(),
      code: typeof (error as { code?: unknown } | null)?.code === 'string' ? (error as { code: string }).code : null,
      message: (error instanceof Error ? error.message : String(error)).slice(0, 120),
    }));
    throw error;
  }
  // зачем (PM-252, координатор 04.10): забаненный удалил аккаунт и вошёл тем же Google/Apple — бан возвращается.
  // Только для входа с почтой: одно чтение документа по id; сбой проверки вход не ломает (лог [BAN-HASH]).
  if (signInProvider === 'google.com' || signInProvider === 'apple.com') {
    await restoreBanFromIdentityHash(db, {
      stableUid: linked.stableUid,
      email: request.auth.token?.email,
      provider: signInProvider,
    });
    trace.mark('ban_hash_checked');
  }
  console.log(JSON.stringify({ event: 'auth_ensure_link_done', tag: '[AUTH-ENSURE-LINK]', totalMs: trace.total() }));
  return linked;
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

// ── [AUTH-RECOVERY-HINT] (Ядро 14.10, координатор; выкладка 17.10 — ТОЛЬКО словом владельца) ─────────────────────────────
// зачем: здесь стояло `if (!request.app) throw 'app_check_required'`, а клиентский App Check удалён (пломба 2026-08-17) —
// request.app всегда пуст, и подсказка «каким аккаунтом входить» ВСЕГДА отказывала. Проверку App Check снимать голой нельзя:
// она стояла против перебора. Замена: обязательный вход (как и было) + лимит 5 в час на uid и на IP (счётчики в окне,
// как в auth_recovery.ts) + ответ ТОЛЬКО с типом входа, без почты и идентификаторов (клиент уже умеет: «привязан к
// аккаунту Google — выбери его при входе»). Связка «вызывающий ↔ stableId» по-прежнему проверяется до чтения профиля.
const RECOVERY_HINT_RATE_LIMITS = 'auth_recovery_hint_rate_limits';
export const RECOVERY_HINT_RATE_MAX = 5;
export const RECOVERY_HINT_RATE_WINDOW_MS = 60 * 60 * 1000;

function recoveryHintLog(outcome: string, extra: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ event: 'auth_recovery_hint', tag: '[AUTH-RECOVERY-HINT]', outcome, ...extra }));
}

/** IP вызывающего: первый адрес из x-forwarded-for, иначе rawRequest.ip; нет — пусто (лимит тогда только по uid). */
export function recoveryHintClientIp(rawRequest: unknown): string {
  const req = (rawRequest ?? {}) as { headers?: Record<string, unknown>; ip?: unknown };
  const forwarded = req.headers?.['x-forwarded-for'];
  const first = (Array.isArray(forwarded) ? String(forwarded[0] ?? '') : String(forwarded ?? '')).split(',')[0].trim();
  const ip = first || (typeof req.ip === 'string' ? req.ip.trim() : '');
  return ip.slice(0, 64);
}

/** Ответ наружу: только найден/привязан/тип входа — без почты (даже маскированной) и без идентификаторов. */
export function publicRecoveryHint(hint: RecoveryHintResult): RecoveryHintResult {
  return { found: hint.found, linked: hint.linked, provider: hint.provider, maskedEmail: null };
}

/** Фиксированное окно на uid и на IP; документы — по хэшу, без uid/IP в открытом виде. */
export async function consumeRecoveryHintRate(
  db: admin.firestore.Firestore,
  authUid: string,
  ip: string,
  nowMs = Date.now(),
): Promise<'ok' | 'limited_uid' | 'limited_ip'> {
  const hash = (value: string) => createHash('sha256').update(value).digest('hex').slice(0, 32);
  const refs = [
    { kind: 'uid' as const, ref: db.collection(RECOVERY_HINT_RATE_LIMITS).doc(`uid_${hash(authUid)}`) },
    ...(ip ? [{ kind: 'ip' as const, ref: db.collection(RECOVERY_HINT_RATE_LIMITS).doc(`ip_${hash(ip)}`) }] : []),
  ];
  return db.runTransaction(async (tx) => {
    const snaps = await Promise.all(refs.map(({ ref }) => tx.get(ref)));
    const states = snaps.map((snap) => {
      const data = snap.exists ? snap.data() ?? {} : {};
      const windowStartMs = Number(data.windowStartMs ?? 0);
      const sameWindow = Number.isFinite(windowStartMs) && nowMs - windowStartMs < RECOVERY_HINT_RATE_WINDOW_MS;
      return { sameWindow, windowStartMs, count: sameWindow ? Number(data.count ?? 0) : 0 };
    });
    const limitedAt = states.findIndex((s) => s.count >= RECOVERY_HINT_RATE_MAX);
    if (limitedAt >= 0) return refs[limitedAt].kind === 'uid' ? 'limited_uid' : 'limited_ip';
    refs.forEach(({ ref }, i) => {
      tx.set(ref, {
        count: states[i].count + 1,
        windowStartMs: states[i].sameWindow ? states[i].windowStartMs : nowMs,
        updatedAtMs: nowMs,
      }, { merge: true });
    });
    return 'ok';
  });
}

export const authRecoveryHint = onCall({
  ...HOT_CALLABLE_OPTIONS,
  enforceAppCheck: false,
}, async (request) => {
  if (!request.auth?.uid) {
    recoveryHintLog('rejected_unauthenticated');
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const db = admin.firestore();
  const ip = recoveryHintClientIp(request.rawRequest);
  const rate = await consumeRecoveryHintRate(db, request.auth.uid, ip);
  if (rate !== 'ok') {
    recoveryHintLog(rate, { hasIp: Boolean(ip) });
    throw new HttpsError('resource-exhausted', 'recovery_hint_rate_limited');
  }
  const stableId = normalizeStableId(request.data?.stableId);
  if (!stableId) {
    recoveryHintLog('neutral_no_stable_id');
    return NEUTRAL_RECOVERY_HINT;
  }
  const authLinkSnap = await readIdentityOrThrow(
    db.collection(AUTH_LINKS).doc(request.auth.uid).get(),
  );
  const linkedStableId = authLinkSnap.exists
    ? normalizeStableId(authLinkSnap.data()?.stable_id)
    : '';
  if (!linkedStableId || linkedStableId !== stableId) {
    recoveryHintLog('neutral_not_linked_to_caller', { anchor: linkedStableId ? 'mismatch' : 'missing' });
    return NEUTRAL_RECOVERY_HINT;
  }
  const snap = await readIdentityOrThrow(db.collection(USERS).doc(stableId).get());
  const hint = publicRecoveryHint(buildRecoveryHintFromUserData(snap?.exists ? snap.data() : undefined));
  recoveryHintLog('answered', { found: hint.found, linked: hint.linked, provider: hint.provider });
  return hint;
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

// зачем (M-1, координатор 03.10): метка {authUid, at} доказывала лишь «анонимный владелец
// её поставил», но не привязывала слияние к вызывающему: знающий stableId жертвы мог в
// 10-минутное окно поглотить её аккаунт. Теперь stamp по запросу выдаёт клиенту одноразовый
// nonce, а на документе лежит только sha256. Старый клиент (1.6.24) nonce не просит —
// его метка без nonceHash идёт прежним путём, пока включён выключатель ниже.
// Выключить (false) после min_app_version 2.0: тогда метка без nonceHash слияние не открывает.
export const ANON_MERGE_CLAIM_LEGACY_PATH_ENABLED: boolean = true;
export const ANON_MERGE_NONCE_MAX_LENGTH = 128;

export function hashAnonMergeNonce(nonce: string): string {
  return createHash('sha256').update(nonce, 'utf8').digest('hex');
}

export function generateAnonMergeNonce(): string {
  return randomBytes(32).toString('base64url');
}

export function readAnonMergeClaim(
  userData: FirebaseFirestore.DocumentData | undefined,
  now: number,
  ttlMs: number = ANON_MERGE_CLAIM_TTL_MS,
): { authUid: string; nonceHash: string | null; at: number } | null {
  const claim = (userData ?? {}).anon_merge_claim;
  if (!claim || typeof claim !== 'object') return null;
  const authUid = String((claim as { authUid?: unknown }).authUid ?? '').trim();
  const at = Number((claim as { at?: unknown }).at);
  if (!authUid || !Number.isFinite(at) || at <= 0) return null;
  if (now - at > ttlMs) return null; // stale → not a valid proof
  const rawHash = (claim as { nonceHash?: unknown }).nonceHash;
  const nonceHash = typeof rawHash === 'string' && rawHash.length > 0 ? rawHash : null;
  return { authUid, nonceHash, at };
}

export type AnonMergeNonceVerdict =
  | { ok: true; mode: 'nonce' | 'legacy'; nonceHash: string | null }
  | {
    ok: false;
    reason:
      | 'nonce_required'
      | 'nonce_mismatch'
      | 'legacy_disabled'
      | 'legacy_anonymous_caller'
      | 'legacy_signed_in_before_claim';
  };

/** Кто вызывает: провайдер входа и момент входа (auth_time×1000). Нужен только legacy-ветке. */
export type AnonMergeCaller = {
  provider: string | null;
  authTimeMs: number | null;
  skipLegacyCallerChecks?: boolean;
  // зачем (security-ревью №2): какая дверь — по логу legacy_path решим, нужна ли relink-дверь для legacy.
  door?: 'merge' | 'relink';
};

/** Допуск часов между auth_time вызывающего и меткой. */
export const ANON_MERGE_LEGACY_AUTH_SKEW_MS = 5000;

/**
 * Только измерение (решение координатора): есть ли у вызова заголовки устройства — чтобы понять,
 * можно ли потом сверять «то же устройство». Значения заголовков НЕ логируются.
 */
export function logDeviceHeaderPresence(
  fn: string,
  headers: Record<string, unknown> | undefined,
): void {
  const has = (name: string): boolean => {
    const value = headers?.[name];
    return Array.isArray(value) ? value.length > 0 : String(value ?? '').length > 0;
  };
  console.log(
    `[ANON-MERGE-CLAIM] device_headers fn=${fn} hasInstanceIdHeader=${has('firebase-instance-id-token')}` +
    ` hasGmpIdHeader=${has('x-firebase-gmpid')}`,
  );
}

/** auth_time (секунды) из токена вызывающего → миллисекунды, либо null. */
export function authTimeMsFromToken(token: { auth_time?: unknown } | undefined): number | null {
  const seconds = Number(token?.auth_time);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : null;
}

function shortUid(uid: string): string {
  return uid.slice(0, 8);
}

/**
 * Единая проверка nonce для метки anon_merge_claim. Вызывается в каждом месте, где метка
 * открывает слияние. nonce НЕ логируется. Метка с nonceHash никогда не понижается до legacy.
 */
export function verifyAnonMergeClaimNonce(
  claim: { authUid: string; nonceHash: string | null; at?: number },
  presentedNonce: string | null | undefined,
  caller?: AnonMergeCaller | null,
  legacyEnabled: boolean = ANON_MERGE_CLAIM_LEGACY_PATH_ENABLED,
): AnonMergeNonceVerdict {
  const uid = shortUid(claim.authUid);
  if (claim.nonceHash) {
    if (!presentedNonce) {
      console.warn(`[ANON-MERGE-CLAIM] nonce_required uid=${uid}`);
      return { ok: false, reason: 'nonce_required' };
    }
    const presented = Buffer.from(hashAnonMergeNonce(presentedNonce), 'utf8');
    const stored = Buffer.from(claim.nonceHash, 'utf8');
    if (presented.length !== stored.length || !timingSafeEqual(presented, stored)) {
      console.warn(`[ANON-MERGE-CLAIM] nonce_mismatch uid=${uid} stored=${claim.nonceHash.slice(0, 6)}`);
      return { ok: false, reason: 'nonce_mismatch' };
    }
    const nonceAgeMs = typeof caller?.authTimeMs === 'number' && typeof claim.at === 'number'
      ? caller.authTimeMs - claim.at
      : 'unknown';
    console.log(`[ANON-MERGE-CLAIM] nonce_ok uid=${uid} authAgeMs=${nonceAgeMs}`);
    return { ok: true, mode: 'nonce', nonceHash: claim.nonceHash };
  }
  if (!legacyEnabled) {
    console.warn(`[ANON-MERGE-CLAIM] legacy_disabled uid=${uid}`);
    return { ok: false, reason: 'legacy_disabled' };
  }
  // зачем (M-1 HIGH-1, решение координатора): клиент 1.6.24 nonce не шлёт, но законный вызывающий
  // в его пути ВСЕГДА провайдерский (google/apple) и вошёл ПОСЛЕ постановки метки. Анонимный
  // вызывающий или давно открытая сессия атакующего — отказ. На публикации (триггер/cron,
  // без запроса) эти проверки уже прошли при резервировании — там их пропускаем.
  if (!caller?.skipLegacyCallerChecks) {
    const provider = String(caller?.provider ?? '').trim();
    if (provider !== 'google.com' && provider !== 'apple.com') {
      console.warn(`[ANON-MERGE-CLAIM] legacy_anonymous_caller uid=${uid} provider=${provider || 'none'}`);
      return { ok: false, reason: 'legacy_anonymous_caller' };
    }
    const authTimeMs = caller?.authTimeMs;
    const claimAt = claim.at;
    if (
      typeof authTimeMs !== 'number' || !Number.isFinite(authTimeMs) ||
      typeof claimAt !== 'number' || !Number.isFinite(claimAt) ||
      authTimeMs < claimAt - ANON_MERGE_LEGACY_AUTH_SKEW_MS
    ) {
      console.warn(
        `[ANON-MERGE-CLAIM] legacy_signed_in_before_claim uid=${uid} provider=${provider}` +
        ` authAgeMs=${typeof authTimeMs === 'number' && typeof claimAt === 'number' ? authTimeMs - claimAt : 'unknown'}`,
      );
      return { ok: false, reason: 'legacy_signed_in_before_claim' };
    }
    console.warn(`[ANON-MERGE-CLAIM] legacy_path uid=${uid} door=${caller?.door ?? 'unknown'} provider=${provider} authAgeMs=${authTimeMs - claimAt}`);
    return { ok: true, mode: 'legacy', nonceHash: null };
  }
  console.warn(`[ANON-MERGE-CLAIM] legacy_path uid=${uid} publication=1`);
  return { ok: true, mode: 'legacy', nonceHash: null };
}

/** Валидация необязательного nonce из запроса merge: строка ≤ 128 или отсутствует. */
export function parseAnonMergeNonce(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length === 0 || value.length > ANON_MERGE_NONCE_MAX_LENGTH) {
    throw new HttpsError('invalid-argument', 'anon_merge_nonce_invalid');
  }
  return value;
}

export async function stampAnonOwnershipForAuth(
  db: admin.firestore.Firestore,
  authUid: string,
  requestedStableId: unknown,
  now: number = Date.now(),
  nonceRequested: boolean = false,
): Promise<{ ok: true; stableUid: string; mergeNonce?: string }> {
  const stableId = normalizeStableId(requestedStableId);
  if (!stableId || stableId.length > 160) {
    throw new HttpsError('invalid-argument', 'stable_id_required');
  }
  const stableUid = await resolveStableUidForAuth(db, authUid, stableId, {
    requireKnownIdentity: true,
    repairLinks: false,
  });
  // зачем (M-1): nonce существует только в ответе клиенту; в документ идёт один sha256.
  // Без флага — прежняя метка без nonceHash и прежняя форма ответа (клиент 1.6.24).
  // mergeFields заменяет поле метки ЦЕЛИКОМ (set+merge:true слил бы вложенные карты и оставил
  // бы старый nonceHash после повторного stamp без флага).
  const mergeNonce = nonceRequested ? generateAnonMergeNonce() : null;
  const claim: Record<string, unknown> = { authUid, at: now };
  if (mergeNonce) claim.nonceHash = hashAnonMergeNonce(mergeNonce);
  await db.collection(USERS).doc(stableUid).set(
    { anon_merge_claim: claim, updatedAt: now },
    { mergeFields: ['anon_merge_claim', 'updatedAt'] },
  );
  console.log(`[ANON-MERGE-CLAIM] stamped uid=${shortUid(authUid)} nonce=${mergeNonce ? 'issued' : 'none'}`);
  return mergeNonce ? { ok: true, stableUid, mergeNonce } : { ok: true, stableUid };
}

export function requireAnonymousOwnershipStampProvider(signInProvider: unknown): void {
  if (String(signInProvider ?? '').trim() !== 'anonymous') {
    throw new HttpsError('permission-denied', 'anonymous_auth_required');
  }
}

export const authStampAnonOwnership = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  // зачем: прогрев с экрана входа — см. warmup-ветку authEnsureStableLink.
  // Как и там, это намеренно unauthenticated/read-only: ветка только поднимает
  // контейнер и выходит до Firestore и любых ownership-проверок/записей.
  if (request.data?.warmup === true) return { ok: true, warm: true };
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  requireAnonymousOwnershipStampProvider(
    request.auth.token?.firebase?.sign_in_provider,
  );
  logDeviceHeaderPresence('authStampAnonOwnership', request.rawRequest?.headers);
  const db = admin.firestore();
  const authUid = request.auth.uid;
  try {
    return await stampAnonOwnershipForAuth(
      db, authUid, request.data?.stableId, Date.now(), request.data?.nonceRequested === true,
    );
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
