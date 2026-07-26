import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';

const REGION = 'us-central1';
const MAX_SEARCH_RESULTS = 20;
const MAX_SEARCH_CANDIDATES = 40;
const SOURCE_LIMIT = 25;
const UID_RE = /^[A-Za-z0-9._-]{2,160}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Row = Record<string, unknown>;

export interface UserSearchRequest {
  readonly query: string;
  readonly normalizedQuery: string;
  readonly kind: 'email' | 'uid_or_name';
  readonly limit: number;
}

export interface UserProfileRequest { readonly uid: string; }

function isRecord(value: unknown): value is Row {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function text(value: unknown, max = 500): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function errorText(error: unknown): string {
  return (error instanceof Error ? error.message : String(error ?? 'unknown error')).slice(0, 300);
}

function millis(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (isRecord(value)) {
    if (typeof value.toMillis === 'function') {
      try { return Number((value.toMillis as () => number)()) || 0; } catch { return 0; }
    }
    if (typeof value.seconds === 'number') return value.seconds * 1000;
  }
  return 0;
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return null; }
}

function isIsoDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
}

function boundedDailyMap(value: unknown, objectNumberKey = ''): Readonly<Record<string, number>> {
  const parsed = parseJson(value);
  if (!isRecord(parsed)) return Object.freeze({});
  const rows: Array<[string, number]> = [];
  for (const [date, raw] of Object.entries(parsed)) {
    if (!isIsoDateKey(date)) continue;
    const candidate = objectNumberKey && isRecord(raw) ? raw[objectNumberKey] : raw;
    const number = typeof candidate === 'number' ? candidate : Number(candidate);
    if (Number.isFinite(number) && number >= 0) rows.push([date, number]);
  }
  return Object.freeze(Object.fromEntries(rows.sort(([left], [right]) => right.localeCompare(left)).slice(0, 30)));
}

export interface LearningSnapshot {
  readonly xp: number;
  readonly streak: number;
  readonly streakLastDate: string | null;
  readonly placementLevel: string | null;
  readonly dailyStats: Readonly<Record<string, number>>;
  readonly foregroundDailyMs: Readonly<Record<string, number>>;
}

export function buildLearningSnapshot(progress: Row): LearningSnapshot {
  return Object.freeze({
    xp: finiteNumber(progress.user_total_xp),
    streak: finiteNumber(progress.streak_count),
    streakLastDate: text(progress.streak_last_date, 40) || null,
    placementLevel: text(progress.placement_level, 40) || null,
    dailyStats: boundedDailyMap(progress.daily_stats, 'points'),
    foregroundDailyMs: boundedDailyMap(progress.phraseman_foreground_daily_ms_v1),
  });
}

function roleFromToken(token: Row): AdminRole | null {
  return /* зачем: adminRole в проекте никем не выдаётся (setCustomUserClaims нет) — флага admin достаточно, роль по умолчанию owner */ hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
}

function requireUserReader(request: { auth?: { token?: Row } }): void {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = roleFromToken(request.auth.token);
  if (!role || !hasPermission(role, 'users.read')) throw new HttpsError('permission-denied', 'Role cannot read users');
}

export function parseUserSearchRequest(data: unknown): UserSearchRequest {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'search request required');
  const query = text(data.query, 161);
  if (query.length < 2 || query.length > 160) throw new HttpsError('invalid-argument', 'query must contain 2-160 characters');
  const requestedLimit = finiteNumber(data.limit, 10);
  const limit = Math.max(1, Math.min(MAX_SEARCH_RESULTS, Math.floor(requestedLimit)));
  const normalizedQuery = query.toLocaleLowerCase('en-US');
  return Object.freeze({ query, normalizedQuery, kind: EMAIL_RE.test(query) ? 'email' : 'uid_or_name', limit });
}

export function parseUserProfileRequest(data: unknown): UserProfileRequest {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'profile request required');
  const uid = text(data.uid, 161);
  if (!UID_RE.test(uid)) throw new HttpsError('invalid-argument', 'uid is invalid');
  return Object.freeze({ uid });
}

export function isSafeDocumentId(value: string): boolean {
  return Boolean(value) && value !== '.' && value !== '..' && !value.includes('/');
}

export function resolveCanonicalStableId(input: {
  requestedUid: string;
  user: Row;
  authLink: Row | null;
  existingUserIds: ReadonlySet<string>;
}): { canonicalUid: string; reason: 'auth_link' | 'canonical_field' | 'provider_uid' | 'requested' | 'unresolved'; providerUid: string } {
  const providerUid = text(input.user.firebaseAuthUid || (isRecord(input.user.linkedAuth) ? input.user.linkedAuth.providerUid : ''), 160);
  const linkedStableId = text(input.authLink?.stable_id ?? input.authLink?.stableUid, 160);
  if (linkedStableId && input.existingUserIds.has(linkedStableId)) return { canonicalUid: linkedStableId, reason: 'auth_link', providerUid };
  const canonicalField = text(input.user.canonicalStableId, 160);
  if (canonicalField && input.existingUserIds.has(canonicalField)) return { canonicalUid: canonicalField, reason: 'canonical_field', providerUid };
  if (providerUid && input.existingUserIds.has(providerUid)) return { canonicalUid: providerUid, reason: 'provider_uid', providerUid };
  if (input.existingUserIds.has(input.requestedUid)) return { canonicalUid: input.requestedUid, reason: 'requested', providerUid };
  return { canonicalUid: input.requestedUid, reason: 'unresolved', providerUid };
}

export function buildUserProfileSummary(uid: string, user: Row): Row {
  const progress = isRecord(user.progress) ? user.progress : {};
  const linkedAuth = isRecord(user.linkedAuth) ? user.linkedAuth : {};
  const lessons = parseJson(progress.unlocked_lessons);
  const email = text(linkedAuth.email, 320);
  return Object.freeze({
    uid,
    name: text(progress.user_name, 120) || `User ${uid.slice(0, 8)}`,
    xp: finiteNumber(progress.user_total_xp),
    streak: finiteNumber(progress.streak_count),
    streakLastDate: text(progress.streak_last_date, 40) || null,
    premiumPlan: text(progress.premium_plan, 40) || null,
    premiumExpiryMs: Math.max(0, finiteNumber(progress.premium_expiry)),
    language: text(progress.lang || progress.app_lang, 16) || 'unknown',
    appVersion: text(progress.app_version, 40) || null,
    platform: text(progress.device_platform, 20) || null,
    theme: text(progress.app_theme, 40) || null,
    lessonsCompleted: Array.isArray(lessons) ? lessons.length : 0,
    placementLevel: text(progress.placement_level, 40) || null,
    shards: finiteNumber(user.shards),
    banned: user.banned === true,
    identityHidden: user.identityHidden === true,
    createdAtMs: millis(user.created_at || user.createdAt),
    lastActiveAtMs: millis(user.last_active_at || user.lastActiveAt || user.updatedAt),
    updatedAtMs: millis(user.updatedAt),
    auth: Object.freeze({
      provider: text(linkedAuth.provider, 30) || null,
      email: email || null,
      displayName: text(linkedAuth.displayName, 120) || null,
      providerUid: text(linkedAuth.providerUid || user.firebaseAuthUid, 160) || null,
    }),
  });
}

export function applyAuthoritativeBan(summary: Row, bannedDocumentExists: boolean): Row {
  return Object.freeze({ ...summary, banned: summary.banned === true || bannedDocumentExists });
}

export function applySearchBanState(summary: Row, bannedDocumentExists: boolean, sourceFailed: boolean): Row {
  if (sourceFailed) return Object.freeze({ ...summary, banState: 'unknown' });
  const banned = summary.banned === true || bannedDocumentExists;
  return Object.freeze({ ...summary, banned, banState: banned ? 'banned' : 'active' });
}

export function sourceResult<T>(source: string, data: readonly T[], options: {
  limit: number;
  error?: unknown;
  degradedReason?: string;
  sourceUpdatedAtMs?: number;
}): Row {
  const error = options.error instanceof Error ? options.error.message : options.error ? String(options.error) : '';
  const truncated = data.length >= options.limit;
  const state = error ? 'error' : options.degradedReason || truncated ? 'partial' : data.length ? 'ready' : 'empty';
  return Object.freeze({
    source,
    state,
    count: data.length,
    truncated,
    fetchedAtMs: Date.now(),
    sourceUpdatedAtMs: options.sourceUpdatedAtMs ?? 0,
    data: Object.freeze([...data]),
    ...(error ? { error: error.slice(0, 300) } : {}),
    ...(options.degradedReason ? { degradedReason: options.degradedReason.slice(0, 200) } : {}),
  });
}

function withId(doc: FirebaseFirestore.DocumentSnapshot): Row {
  return { ...(doc.data() as Row | undefined ?? {}), id: doc.id };
}

function addCandidate(set: Set<string>, value: unknown): void {
  const uid = text(value, 160);
  if (UID_RE.test(uid) && set.size < MAX_SEARCH_CANDIDATES) set.add(uid);
}

async function safeSearchGet(query: FirebaseFirestore.Query, label: string, errors: string[]): Promise<FirebaseFirestore.QuerySnapshot | null> {
  try { return await query.get(); } catch (error) { errors.push(`${label}: ${errorText(error)}`); return null; }
}

async function existingDocs(db: FirebaseFirestore.Firestore, ids: readonly string[], errors?: string[]): Promise<Map<string, Row>> {
  const unique = [...new Set(ids)].filter((id) => UID_RE.test(id)).slice(0, MAX_SEARCH_CANDIDATES);
  const snapshots = await Promise.all(unique.map((id) => db.collection('users').doc(id).get().catch((error) => {
    errors?.push(`users/${id}: ${errorText(error)}`);
    return null;
  })));
  const result = new Map<string, Row>();
  snapshots.forEach((snapshot) => { if (snapshot?.exists) result.set(snapshot.id, snapshot.data() as Row); });
  return result;
}

function searchSummary(summary: Row, matchReasons: readonly string[], identityReason: string): Row {
  return Object.freeze({
    uid: summary.uid,
    name: summary.name,
    email: isRecord(summary.auth) ? summary.auth.email ?? null : null,
    xp: summary.xp,
    streak: summary.streak,
    premiumPlan: summary.premiumPlan,
    language: summary.language,
    appVersion: summary.appVersion,
    platform: summary.platform,
    banned: summary.banned,
    lastActiveAtMs: summary.lastActiveAtMs,
    matchReasons: Object.freeze([...new Set(matchReasons)]),
    identityReason,
  });
}

export const adminSearchUsers = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 15, memory: '256MiB' },
  async (request) => {
    requireUserReader(request as { auth?: { token?: Row } });
    const input = parseUserSearchRequest(request.data);
    const db = admin.firestore();
    const searchErrors: string[] = [];
    const candidates = new Set<string>();
    const reasons = new Map<string, string[]>();
    const add = (uid: unknown, reason: string): void => {
      const before = candidates.size;
      addCandidate(candidates, uid);
      const clean = text(uid, 160);
      if ((candidates.has(clean) || candidates.size > before) && UID_RE.test(clean)) reasons.set(clean, [...(reasons.get(clean) ?? []), reason]);
    };

    if (input.kind === 'email') {
      const authUser = await admin.auth().getUserByEmail(input.normalizedQuery).catch((error: unknown) => {
        const code = isRecord(error) ? String(error.code ?? '') : '';
        if (code !== 'auth/user-not-found') searchErrors.push(`firebase_auth: ${errorText(error)}`);
        return null;
      });
      if (authUser) {
        const link = await db.collection('auth_links').doc(authUser.uid).get().catch((error) => { searchErrors.push(`auth_links: ${errorText(error)}`); return null; });
        if (link?.exists) add(link.data()?.stable_id ?? link.data()?.stableUid, 'email_auth_link');
        add(authUser.uid, 'email_provider_uid');
      }
      const emailSnaps = await Promise.all([
        safeSearchGet(db.collection('users').where('linkedAuth.email', '==', input.query).limit(input.limit), 'users.email', searchErrors),
        input.query === input.normalizedQuery ? Promise.resolve(null) : safeSearchGet(db.collection('users').where('linkedAuth.email', '==', input.normalizedQuery).limit(input.limit), 'users.email_normalized', searchErrors),
      ]);
      emailSnaps.forEach((snapshot) => snapshot?.docs.forEach((doc) => add(doc.id, 'email_user')));
    } else {
      const exact = isSafeDocumentId(input.query) ? await db.collection('users').doc(input.query).get().catch((error) => { searchErrors.push(`users.exact: ${errorText(error)}`); return null; }) : null;
      if (exact?.exists) add(exact.id, 'uid_exact');
      const prefix = isSafeDocumentId(input.query) ? await safeSearchGet(db.collection('users')
        .orderBy(admin.firestore.FieldPath.documentId())
        .startAt(input.query)
        .endAt(`${input.query}\uf8ff`)
        .limit(input.limit), 'users.uid_prefix', searchErrors) : null;
      prefix?.docs.forEach((doc) => add(doc.id, doc.id === input.query ? 'uid_exact' : 'uid_prefix'));

      const nameIndex = isSafeDocumentId(input.normalizedQuery) ? await db.collection('name_index').doc(input.normalizedQuery).get().catch((error) => { searchErrors.push(`name_index: ${errorText(error)}`); return null; }) : null;
      if (nameIndex?.exists) add(nameIndex.data()?.uid, 'name_index');
      const nameVariants = [...new Set([input.query, input.normalizedQuery, input.normalizedQuery.charAt(0).toLocaleUpperCase('en-US') + input.normalizedQuery.slice(1)])];
      const nameQueries: Promise<FirebaseFirestore.QuerySnapshot | null>[] = [
        safeSearchGet(db.collection('users').where('progress.user_name_lower', '==', input.normalizedQuery).limit(input.limit), 'users.name_lower', searchErrors),
        safeSearchGet(db.collection('public_profiles').where('nameLower', '==', input.normalizedQuery).limit(input.limit), 'public_profiles.name_lower', searchErrors),
        safeSearchGet(db.collection('leaderboard').where('nameLower', '==', input.normalizedQuery).limit(input.limit), 'leaderboard.name_lower', searchErrors),
        ...nameVariants.map((name) => safeSearchGet(db.collection('users').where('progress.user_name', '==', name).limit(input.limit), 'users.name', searchErrors)),
      ];
      (await Promise.all(nameQueries)).forEach((snapshot, index) => snapshot?.docs.forEach((doc) => add(doc.data()?.uid ?? doc.id, index === 0 ? 'name_lower' : 'name')));
    }

    const userDocs = await existingDocs(db, [...candidates], searchErrors);
    const providerUids = [...userDocs.values()].map((user) => text(user.firebaseAuthUid || (isRecord(user.linkedAuth) ? user.linkedAuth.providerUid : ''), 160)).filter(Boolean);
    const authLinks = new Map<string, Row>();
    await Promise.all([...new Set(providerUids)].slice(0, MAX_SEARCH_CANDIDATES).map(async (providerUid) => {
      const link = await db.collection('auth_links').doc(providerUid).get().catch((error) => { searchErrors.push(`auth_links/${providerUid}: ${errorText(error)}`); return null; });
      if (link?.exists) authLinks.set(providerUid, link.data() as Row);
    }));
    const linkedIds = [...authLinks.values()].map((link) => text(link.stable_id ?? link.stableUid, 160)).filter(Boolean);
    const canonicalFieldIds = [...userDocs.values()].map((user) => text(user.canonicalStableId, 160)).filter(Boolean);
    const allDocs = new Map([...userDocs, ...await existingDocs(db, [...linkedIds, ...canonicalFieldIds, ...providerUids], searchErrors)]);
    const existingIds = new Set(allDocs.keys());
    const results = new Map<string, Row>();
    for (const [requestedUid, requestedUser] of userDocs) {
      const providerUid = text(requestedUser.firebaseAuthUid || (isRecord(requestedUser.linkedAuth) ? requestedUser.linkedAuth.providerUid : ''), 160);
      const identity = resolveCanonicalStableId({ requestedUid, user: requestedUser, authLink: authLinks.get(providerUid) ?? null, existingUserIds: existingIds });
      const canonicalUser = allDocs.get(identity.canonicalUid) ?? requestedUser;
      const prior = results.get(identity.canonicalUid);
      const combinedReasons = [...(isRecord(prior) && Array.isArray(prior.matchReasons) ? prior.matchReasons as string[] : []), ...(reasons.get(requestedUid) ?? [])];
      results.set(identity.canonicalUid, searchSummary(buildUserProfileSummary(identity.canonicalUid, canonicalUser), combinedReasons, identity.reason));
    }
    const baseItems = [...results.values()].sort((left, right) => finiteNumber(right.lastActiveAtMs) - finiteNumber(left.lastActiveAtMs)).slice(0, input.limit);
    const items = await Promise.all(baseItems.map(async (item) => {
      const uid = text(item.uid, 160);
      try {
        const bannedSnap = await db.collection('banned_users').doc(uid).get();
        return applySearchBanState(item, bannedSnap.exists, false);
      } catch (error) {
        searchErrors.push(`banned_users/${uid}: ${errorText(error)}`);
        return applySearchBanState(item, false, true);
      }
    }));
    return { ok: true, state: searchErrors.length ? (items.length ? 'partial' : 'error') : 'ready', query: input.query, normalizedQuery: input.normalizedQuery, items, count: items.length, truncated: results.size > input.limit, errors: [...new Set(searchErrors)].slice(0, 12), fetchedAtMs: Date.now() };
  },
);

interface AdapterResult { rows: Row[]; error?: unknown; degradedReason?: string; }

async function readRecentUserSubcollection(
  db: FirebaseFirestore.Firestore,
  uid: string,
  collectionName: string,
  timeField = 'ts',
  limit = SOURCE_LIMIT,
): Promise<AdapterResult> {
  const collection = db.collection('users').doc(uid).collection(collectionName);
  try {
    const snapshot = await collection.orderBy(timeField, 'desc').limit(limit).get();
    return { rows: snapshot.docs.map(withId) };
  } catch (orderedError) {
    try {
      const snapshot = await collection.limit(limit).get();
      return { rows: snapshot.docs.map(withId).sort((left, right) => millis(right[timeField]) - millis(left[timeField])), degradedReason: `ordered query unavailable: ${orderedError instanceof Error ? orderedError.message : String(orderedError)}` };
    } catch (error) {
      return { rows: [], error };
    }
  }
}

async function readRecentByField(
  db: FirebaseFirestore.Firestore,
  collectionName: string,
  field: string,
  value: string,
  timeField = 'createdAt',
  limit = SOURCE_LIMIT,
): Promise<AdapterResult> {
  try {
    const snapshot = await db.collection(collectionName).where(field, '==', value).orderBy(timeField, 'desc').limit(limit).get();
    return { rows: snapshot.docs.map(withId) };
  } catch (orderedError) {
    try {
      const snapshot = await db.collection(collectionName).where(field, '==', value).limit(limit).get();
      return {
        rows: snapshot.docs.map(withId).sort((left, right) => millis(right[timeField]) - millis(left[timeField])),
        degradedReason: `ordered query unavailable: ${orderedError instanceof Error ? orderedError.message : String(orderedError)}`,
      };
    } catch (error) {
      return { rows: [], error };
    }
  }
}

export function projectAdminRow(id: string, row: Row, fields: readonly string[], textFields: readonly string[] = []): Row {
  const projected: Row = {};
  for (const field of fields) {
    if (field === 'id') { projected.id = id; continue; }
    if (!(field in row)) continue;
    const value = row[field];
    if (textFields.includes(field)) {
      projected[field] = text(value, field === 'text' || field === 'comment' || field === 'messageText' ? 500 : 200);
    } else if (typeof value === 'string') {
      projected[field] = value.slice(0, 300);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      projected[field] = value;
    } else if (typeof value === 'boolean' || value === null) {
      projected[field] = value;
    } else if (isRecord(value) && millis(value) > 0) {
      projected[field] = millis(value);
    }
  }
  return projected;
}

function projectRows(rows: readonly Row[], fields: readonly string[], textFields: readonly string[] = []): Row[] {
  return rows.map((row) => projectAdminRow(text(row.id, 160), row, fields, textFields));
}

function adapterSource(source: string, result: AdapterResult, fields: readonly string[], textFields: readonly string[] = []): Row {
  const rows = projectRows(result.rows, fields, textFields);
  const updatedAtMs = rows.reduce((latest, row) => Math.max(latest, millis(row.updatedAt || row.createdAt || row.eventTimestampMs)), 0);
  return sourceResult(source, rows, { limit: SOURCE_LIMIT, error: result.error, degradedReason: result.degradedReason, sourceUpdatedAtMs: updatedAtMs });
}

export const adminGetUserProfile = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 20, memory: '512MiB' },
  async (request) => {
    requireUserReader(request as { auth?: { token?: Row } });
    const { uid: requestedUid } = parseUserProfileRequest(request.data);
    const db = admin.firestore();
    const requestedSnap = await db.collection('users').doc(requestedUid).get();
    if (!requestedSnap.exists) throw new HttpsError('not-found', 'user_not_found');
    const requestedUser = requestedSnap.data() as Row;
    const providerUid = text(requestedUser.firebaseAuthUid || (isRecord(requestedUser.linkedAuth) ? requestedUser.linkedAuth.providerUid : ''), 160);
    const identityErrors: string[] = [];
    const authLinkSnap = providerUid ? await db.collection('auth_links').doc(providerUid).get().catch((error) => {
      identityErrors.push(`auth_links/${providerUid}: ${errorText(error)}`);
      return null;
    }) : null;
    const hintedIds = [requestedUid, providerUid, text(requestedUser.canonicalStableId, 160), text(authLinkSnap?.data()?.stable_id ?? authLinkSnap?.data()?.stableUid, 160)].filter(Boolean);
    const users = await existingDocs(db, hintedIds, identityErrors);
    if (identityErrors.length) throw new HttpsError('unavailable', 'identity_resolution_failed');
    const identity = resolveCanonicalStableId({ requestedUid, user: requestedUser, authLink: authLinkSnap?.exists ? authLinkSnap.data() as Row : null, existingUserIds: new Set(users.keys()) });
    const canonicalUser = users.get(identity.canonicalUid) ?? requestedUser;
    const uid = identity.canonicalUid;

    const [leaderboardSnap, arenaSnap, banRead, statsSnap, errorReports, reportsAgainst, reportsBy, premiumEvents, shardTransactions, adminRewardHistory, ugcBuys, ugcSells, referralsBy, invitedByRead] = await Promise.all([
      db.collection('leaderboard').doc(uid).get().catch(() => null),
      db.collection('arena_profiles').doc(uid).get().catch(() => null),
      db.collection('banned_users').doc(uid).get().then((snap) => ({ snap, error: null as unknown })).catch((error: unknown) => ({ snap: null, error })),
      db.collection('leaderboard_stats').doc('global').get().catch(() => null),
      readRecentByField(db, 'error_reports', 'uid', uid),
      readRecentByField(db, 'user_reports', 'reportedUid', uid),
      readRecentByField(db, 'user_reports', 'reporterUid', uid),
      readRecentByField(db, 'revenuecat_premium_events', 'uid', uid, 'eventTimestampMs'),
      readRecentByField(db, 'revenuecat_shard_transactions', 'uid', uid),
      readRecentUserSubcollection(db, uid, 'shard_rewards'),
      readRecentByField(db, 'community_pack_purchases', 'buyerStableId', uid),
      readRecentByField(db, 'community_pack_purchases', 'sellerStableId', uid),
      readRecentByField(db, 'referral_attributions', 'referrerStableId', uid),
      db.collection('referral_attributions').doc(uid).get().then((snap) => ({ snap, error: null as unknown })).catch((error: unknown) => ({ snap: null, error })),
    ]);
    if (banRead.error || !banRead.snap) throw new HttpsError('unavailable', 'ban_status_unavailable');
    const banSnap = banRead.snap;

    const summary = applyAuthoritativeBan(buildUserProfileSummary(uid, canonicalUser), banSnap?.exists === true);
    const progress = isRecord(canonicalUser.progress) ? canonicalUser.progress : {};
    const learning = Object.freeze({ ...buildLearningSnapshot(progress), lessonsCompleted: summary.lessonsCompleted });
    const directSource = (source: string, snap: FirebaseFirestore.DocumentSnapshot | null, fields: readonly string[]): Row => {
      if (!snap) return sourceResult(source, [], { limit: 1, error: new Error('source unavailable') });
      if (!snap.exists) return sourceResult(source, [], { limit: 1 });
      return sourceResult(source, projectRows([withId(snap)], fields), { limit: 2, sourceUpdatedAtMs: millis(snap.data()?.updatedAt) });
    };

    const sources = {
      leaderboard: directSource('leaderboard', leaderboardSnap, ['id', 'name', 'points', 'weekPoints', 'streak', 'daily7xp', 'daily7time_ms', 'updatedAt', 'dailyAnalyticsUpdatedAt']),
      arena: directSource('arena_profiles', arenaSnap, ['id', 'name', 'xp', 'rank', 'tier', 'wins', 'losses', 'updatedAt']),
      percentileStats: directSource('leaderboard_stats', statsSnap, ['totalUsers', 'updatedAt']),
      errorReports: adapterSource('error_reports', errorReports, ['id', 'screen', 'category', 'status', 'fixed', 'dataId', 'comment', 'createdAt'], ['screen', 'category', 'status', 'dataId', 'comment']),
      reportsAgainst: adapterSource('user_reports_against', reportsAgainst, ['id', 'reporterUid', 'reporterName', 'reason', 'category', 'status', 'createdAt'], ['reporterName', 'reason', 'category', 'status']),
      reportsBy: adapterSource('user_reports_by', reportsBy, ['id', 'reportedUid', 'reportedName', 'reason', 'category', 'status', 'createdAt'], ['reportedName', 'reason', 'category', 'status']),
      premiumEvents: adapterSource('revenuecat_premium_events', premiumEvents, ['id', 'eventType', 'type', 'productId', 'periodType', 'price', 'currency', 'createdAt', 'eventTimestampMs'], ['eventType', 'type', 'productId', 'periodType', 'currency']),
      shardTransactions: adapterSource('revenuecat_shard_transactions', shardTransactions, ['id', 'type', 'amount', 'productId', 'createdAt'], ['type', 'productId']),
      adminRewardHistory: adapterSource('users_shard_rewards', adminRewardHistory, ['id', 'ts', 'reason', 'amount', 'rewardType', 'label', 'adminEmail', 'comment'], ['reason', 'rewardType', 'label', 'comment']),
      ugcBuys: adapterSource('community_pack_purchases_buyer', ugcBuys, ['id', 'packId', 'packTitle', 'status', 'priceShards', 'price', 'createdAt'], ['packId', 'packTitle', 'status']),
      ugcSells: adapterSource('community_pack_purchases_seller', ugcSells, ['id', 'packId', 'packTitle', 'status', 'priceShards', 'price', 'createdAt'], ['packId', 'packTitle', 'status']),
      referrals: adapterSource('referral_attributions', referralsBy, ['id', 'status', 'createdAt', 'qualifiedAt', 'rewardedAt'], ['status']),
      invitedBy: invitedByRead.error || !invitedByRead.snap
        ? sourceResult('referral_attribution_owner', [], { limit: 1, error: invitedByRead.error || new Error('source unavailable') })
        : directSource('referral_attribution_owner', invitedByRead.snap, ['id', 'referrerStableId', 'status', 'createdAt']),
    };
    const sourceStates = Object.values(sources).map((source) => String(source.state));
    return {
      ok: true,
      state: sourceStates.some((state) => state === 'error' || state === 'partial') ? 'partial' : 'ready',
      fetchedAtMs: Date.now(),
      requestedUid,
      canonicalUid: uid,
      identity: { ...identity, aliases: [...users.keys()].filter((candidate) => candidate !== uid) },
      summary,
      sections: {
        identity: { summary, banned: banSnap?.exists === true, ban: banSnap?.exists ? projectRows([withId(banSnap)], ['id', 'reason', 'bannedAt', 'bannedBy'])[0] : null },
        learning,
        competition: { leaderboard: sources.leaderboard, arena: sources.arena, percentileStats: sources.percentileStats },
        money: { premiumEvents: sources.premiumEvents, shardTransactions: sources.shardTransactions, adminRewardHistory: sources.adminRewardHistory, referrals: sources.referrals, invitedBy: sources.invitedBy },
        community: { ugcBuys: sources.ugcBuys, ugcSells: sources.ugcSells },
        moderation: { errorReports: sources.errorReports, reportsAgainst: sources.reportsAgainst, reportsBy: sources.reportsBy },
        diagnostics: { sourceStates: sources },
      },
    };
  },
);
