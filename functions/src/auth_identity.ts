import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { upsertEmailContact } from './email_contacts';

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
  hidden: boolean;
  hasProviderLink: boolean;
  xp: number;
  updatedAt: number;
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

  current.hasProviderLink = current.hasProviderLink || candidate.hasProviderLink;
  current.xp = Math.max(current.xp, candidate.xp);
  current.updatedAt = Math.max(current.updatedAt, candidate.updatedAt);
  current.hidden = current.hidden && candidate.hidden;
}

function pickBestStableIdentityCandidate(
  candidates: Iterable<StableIdentityCandidate>,
): string | null {
  const list = Array.from(candidates);
  if (list.length === 0) return null;

  list.sort((a, b) => {
    if (a.hidden !== b.hidden) return a.hidden ? 1 : -1;
    if (a.hasProviderLink !== b.hasProviderLink) return a.hasProviderLink ? -1 : 1;
    if (a.xp !== b.xp) return b.xp - a.xp;
    if (a.updatedAt !== b.updatedAt) return b.updatedAt - a.updatedAt;
    return a.id.localeCompare(b.id);
  });

  return list[0]?.id ?? null;
}

function collectStableIdentityCandidates(
  docs: Array<{ id: string; data: () => FirebaseFirestore.DocumentData | undefined }>,
  authUid: string,
): Map<string, StableIdentityCandidate> {
  const out = new Map<string, StableIdentityCandidate>();
  const dataById = new Map<string, FirebaseFirestore.DocumentData>();
  for (const doc of docs) dataById.set(doc.id, doc.data() ?? {});

  for (const doc of docs) {
    const data = dataById.get(doc.id) ?? {};
    const canonicalStableId = normalizeStableId(data.canonicalStableId);
    const hidden = data.identityHidden === true;
    const canonicalData = canonicalStableId ? dataById.get(canonicalStableId) : undefined;
    const followsOwnedCanonical =
      hidden &&
      canonicalStableId.length > 0 &&
      canonicalStableId !== doc.id &&
      canonicalTargetOwnedByAuth(canonicalStableId, canonicalData, authUid);
    const linkedAuth = data.linkedAuth as { providerUid?: unknown } | undefined;
    const candidate: StableIdentityCandidate = {
      id: followsOwnedCanonical ? canonicalStableId : doc.id,
      hidden,
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
): Promise<string | null> {
  const [byFirebaseAuthUidSnap, byLinkedAuthUidSnap] = await Promise.all([
    db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(20).get().catch(() => null),
    db.collection(USERS).where('linkedAuth.providerUid', '==', authUid).limit(20).get().catch(() => null),
  ]);

  const docs: Array<{ id: string; data: () => FirebaseFirestore.DocumentData | undefined }> = [];
  const seen = new Set<string>();

  for (const snap of [byFirebaseAuthUidSnap, byLinkedAuthUidSnap]) {
    for (const doc of snap?.docs ?? []) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      docs.push(doc);
    }
  }

  if (docs.length === 0) return null;

  const candidatesById = collectStableIdentityCandidates(docs, authUid);
  return pickBestStableIdentityCandidate(candidatesById.values());
}

function userDocumentOwnedByAuth(
  data: FirebaseFirestore.DocumentData,
  authUid: string,
): boolean {
  if (normalizeStableId(data.firebaseAuthUid) === authUid) return true;
  const linkedAuth = data.linkedAuth as { providerUid?: unknown } | undefined;
  return normalizeStableId(linkedAuth?.providerUid) === authUid;
}

function canonicalTargetOwnedByAuth(
  canonicalStableId: string,
  canonicalData: FirebaseFirestore.DocumentData | undefined,
  authUid: string,
): boolean {
  return canonicalStableId === authUid || Boolean(canonicalData && userDocumentOwnedByAuth(canonicalData, authUid));
}

async function findLiveAuthLinkAnchor(
  db: admin.firestore.Firestore,
  authUid: string,
): Promise<string | null> {
  const linkSnap = await db.collection(AUTH_LINKS).doc(authUid).get().catch(() => null);
  const anchoredStableId = normalizeStableId(linkSnap?.data()?.stable_id);
  if (!anchoredStableId) return null;
  const anchoredUserSnap = await db.collection(USERS).doc(anchoredStableId).get().catch(() => null);
  if (!anchoredUserSnap?.exists) return null;
  const anchoredUserData = anchoredUserSnap.data() ?? {};
  const canonicalStableId = normalizeStableId(anchoredUserData.canonicalStableId);
  if (anchoredUserData.identityHidden === true && canonicalStableId && canonicalStableId !== anchoredStableId) {
    const canonicalSnap = await db.collection(USERS).doc(canonicalStableId).get().catch(() => null);
    if (canonicalSnap?.exists) {
      const canonicalData = canonicalSnap.data() ?? {};
      if (canonicalTargetOwnedByAuth(canonicalStableId, canonicalData, authUid)) {
        return canonicalStableId;
      }
      throw new HttpsError('permission-denied', 'stable_id_mismatch');
    }
  }
  return anchoredStableId;
}

async function assertStableOwner(
  db: admin.firestore.Firestore,
  authUid: string,
  stableId: string,
  options?: { allowProviderRelink?: boolean; allowAnonRelink?: boolean },
): Promise<void> {
  if (!stableId || stableId.length > 160) {
    throw new HttpsError('invalid-argument', 'stable_id_required');
  }
  if (stableId === authUid) return;

  const [userSnap, linkSnap] = await Promise.all([
    db.collection(USERS).doc(stableId).get().catch(() => null),
    db.collection(AUTH_LINKS).doc(authUid).get().catch(() => null),
  ]);
  const userData = userSnap?.data() ?? {};
  const userAuthUid = String(userData.firebaseAuthUid ?? '').trim();
  const linkedStableId = String(linkSnap?.data()?.stable_id ?? '').trim();
  if (linkedStableId === stableId) return;
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
  if (!canonicalLinkConflicts && userAuthUid === authUid) return;
  if (!canonicalLinkConflicts && linkedAuthUid === authUid) return;

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
    const existingByAuth = await db.collection(USERS).where('firebaseAuthUid', '==', authUid).limit(1).get().catch(() => null);
    const existingStableId = String(existingByAuth?.docs?.[0]?.id ?? '').trim();
    if (!existingStableId || existingStableId === stableId) return;
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
  const linkRef = db.collection(AUTH_LINKS).doc(authUid);
  const linkSnap = await linkRef.get().catch(() => null);
  const currentLinkStableId = String(linkSnap?.data()?.stable_id ?? '').trim();
  const current = linkSnap?.data() ?? {};
  const now = Date.now();
  const patch: Record<string, unknown> = { stable_id: stableId, updatedAt: now };
  if (provider) {
    patch.providerUid = authUid;
    patch.provider = provider;
    if (typeof current.linkedAt !== 'number' || current.linkedAt <= 0) {
      patch.linkedAt = now;
    }
    patch.lastSignInAt = metadata?.lastSignInAt ?? now;
    if (metadata?.devicePlatform) patch.devicePlatform = metadata.devicePlatform;
    if (metadata && Object.prototype.hasOwnProperty.call(metadata, 'email')) {
      patch.email = metadata.email ?? null;
    }
    if (metadata && Object.prototype.hasOwnProperty.call(metadata, 'displayName')) {
      patch.displayName = metadata.displayName ?? null;
    }
  }
  const providerNeedsBackfill =
    Boolean(provider) &&
    (
      String(current.providerUid ?? '').trim() !== authUid ||
      String(current.provider ?? '').trim() !== provider ||
      typeof current.linkedAt !== 'number' ||
      current.linkedAt <= 0
    );
  const metadataNeedsRefresh = Boolean(provider && metadata && Object.keys(metadata).length > 0);
  if (!linkSnap?.exists || currentLinkStableId !== stableId || providerNeedsBackfill || metadataNeedsRefresh) {
    await linkRef.set(patch, { merge: true });
  }
}

async function ensureProviderLinkedAuth(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
  provider: AuthProvider | null,
  metadata?: AuthLinkMetadata,
): Promise<void> {
  if (!provider) return;
  const now = Date.now();
  await db.collection(USERS).doc(stableId).set({
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
  }, { merge: true });
  await upsertEmailContact(db, {
    email: metadata?.email,
    source: 'app',
    provider,
    providerUid: authUid,
    stableId,
    displayName: metadata?.displayName,
    devicePlatform: metadata?.devicePlatform ?? 'web',
    lastSignInAt: metadata?.lastSignInAt ?? now,
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

export async function linkStableAuthUid(
  db: admin.firestore.Firestore,
  stableId: string,
  authUid: string,
): Promise<void> {
  const now = Date.now();
  const userRef = db.collection(USERS).doc(stableId);
  const userSnap = await userRef.get().catch(() => null);
  const currentUserAuthUid = String(userSnap?.data()?.firebaseAuthUid ?? '').trim();
  let repairedIdentityLink = false;
  if (!userSnap?.exists || currentUserAuthUid !== authUid) {
    await userRef.set({
      firebaseAuthUid: authUid,
      updatedAt: now,
    }, { merge: true });
    repairedIdentityLink = true;
  }

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
  const snap = await db
    .collection(LEAGUE_GROUPS)
    .where('weekId', '==', weekId)
    .limit(500)
    .get()
    .catch(() => null);
  return !!snap?.docs.some((doc) => {
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
    stableLbRef.get().catch(() => null),
    legacyLbRef.get().catch(() => null),
    db.collection(AUTH_LINKS).doc(authUid).get().catch(() => null),
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

export async function resolveStableUidForAuth(
  db: admin.firestore.Firestore,
  authUid: string,
  requestedStableId?: unknown,
  options?: ResolveStableUidForAuthOptions,
): Promise<string> {
  const stableId = normalizeStableId(requestedStableId);
  const authLinkAnchor = await findLiveAuthLinkAnchor(db, authUid);
  if (authLinkAnchor) {
    if (shouldRepairIdentityLinks(options)) {
      await linkStableAuthUid(db, authLinkAnchor, authUid);
    }
    return authLinkAnchor;
  }
  if (stableId) {
    const requestedUserSnap = await db.collection(USERS).doc(stableId).get().catch(() => null);
    const requestedUserData = requestedUserSnap?.data() || {};
    const canonicalStableId = normalizeStableId(requestedUserData.canonicalStableId);
    if (requestedUserData.identityHidden === true && canonicalStableId && canonicalStableId !== stableId) {
      await assertStableOwner(db, authUid, canonicalStableId, options);
      if (shouldRepairIdentityLinks(options)) {
        await linkStableAuthUid(db, canonicalStableId, authUid);
      }
      return canonicalStableId;
    }
    await assertStableOwner(db, authUid, stableId, options);
    if (shouldRepairIdentityLinks(options)) {
      await linkStableAuthUid(db, stableId, authUid);
    }
    return stableId;
  }

  const direct = await db.collection(USERS).doc(authUid).get().catch(() => null);
  if (direct?.exists) {
    const requestedUserData = direct.data() || {};
    const canonicalStableId = normalizeStableId(requestedUserData.canonicalStableId);
    if (requestedUserData.identityHidden === true && canonicalStableId && canonicalStableId !== authUid) {
      const canonicalSnap = await db.collection(USERS).doc(canonicalStableId).get().catch(() => null);
      const canonicalData = canonicalSnap?.exists ? canonicalSnap.data() ?? {} : undefined;
      if (canonicalTargetOwnedByAuth(canonicalStableId, canonicalData, authUid)) return canonicalStableId;
      return authUid;
    }
  }

  const byAuth = await findStableUidForProviderAuth(db, authUid);
  if (byAuth) return byAuth;

  if (options?.requireKnownIdentity) {
    throw new HttpsError('failed-precondition', 'stable_id_required');
  }
  return authUid;
}

export async function ensureStableLinkForAuth(
  db: admin.firestore.Firestore,
  authUid: string,
  requestedStableId: unknown,
  signInProvider: string,
  metadata?: AuthLinkMetadata,
): Promise<{ ok: true; stableUid: string; authUid: string }> {
  const stableId = normalizeStableId(requestedStableId);
  const provider: AuthProvider | null =
    signInProvider === 'google.com'
      ? 'google'
      : signInProvider === 'apple.com'
        ? 'apple'
        : null;
  const allowProviderRelink = Boolean(provider);
  const allowAnonRelink = !allowProviderRelink;

  // Добираем email/displayName из Firebase Auth, если клиент их не прислал —
  // иначе linkedAuth.email пишется null и юзера не найти по почте в админке.
  metadata = await enrichMetadataFromAuth(authUid, provider, metadata);

  if (provider) {
    const existingLinkSnap = await db.collection(AUTH_LINKS).doc(authUid).get().catch(() => null);
    const linkedStableId = normalizeStableId(existingLinkSnap?.data()?.stable_id);
    // Хвост E: auth_links может указывать на УДАЛЁННЫЙ users-док (осиротевшая
    // привязка после deleteAccountAndWipe — серверная чистка fire-and-forget могла
    // снести users/{stableId}, но не auth_links). Повторный вход тем же Google/Apple
    // цеплялся за мёртвый id → resolveStableUidForAuth привязывал к пустому доку →
    // пользователь на пустом «новом» аккаунте. Если целевой users-док НЕ существует,
    // игнорируем осиротевшую привязку и идём обычным путём (на текущий stableId или
    // на живой аккаунт по providerUid). providerUid криптографически принадлежит
    // юзеру, мёртвый док всё равно пуст — захвата чужого нет.
    const linkedUserExists = linkedStableId
      ? Boolean((await db.collection(USERS).doc(linkedStableId).get().catch(() => null))?.exists)
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
      const linkedStableUid = await resolveStableUidForAuth(db, authUid, linkedStableId, { allowProviderRelink: true });
      await ensureAuthLinkDoc(db, authUid, linkedStableUid, provider, metadata);
      await ensureProviderLinkedAuth(db, linkedStableUid, authUid, provider, metadata);
      return { ok: true, stableUid: linkedStableUid, authUid };
    }
    if (!linkedStableId) {
      const existingUserStableUid = await findStableUidForProviderAuth(db, authUid);
      if (existingUserStableUid && existingUserStableUid !== stableId) {
        const stableUid = await resolveStableUidForAuth(db, authUid, existingUserStableUid, { allowProviderRelink: true });
        await ensureAuthLinkDoc(db, authUid, stableUid, provider, metadata);
        await ensureProviderLinkedAuth(db, stableUid, authUid, provider, metadata);
        return { ok: true, stableUid, authUid };
      }
    }
  }

  const stableUid = await resolveStableUidForAuth(db, authUid, stableId, { allowProviderRelink, allowAnonRelink });
  await ensureAuthLinkDoc(db, authUid, stableUid, provider, metadata);
  await ensureProviderLinkedAuth(db, stableUid, authUid, provider, metadata);
  return { ok: true, stableUid, authUid };
}

export const authEnsureStableLink = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
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
