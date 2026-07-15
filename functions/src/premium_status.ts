// ═══════════════════════════════════════════════════════════════════════════
// premium_status.ts — СЕРВЕРНЫЙ источник правды по премиум/VIP-доступу.
//
// Зачем: ИИ-функции (stats_insights / weekly_review / premium_dialog) раньше
// верили полю `isPremium` ИЗ ТЕЛА запроса. Клиент мог соврать `isPremium:true`
// и бесплатно получить платную фичу + в разы больший дневной лимит OpenAI.
// Теперь премиум вычисляется ТУТ из users/{stableId}.progress — того же
// документа, куда вебхуки RevenueCat/Telegram пишут факт оплаты по верному ID.
// Связку «оплата → правильный аккаунт» этот модуль НЕ трогает: он только ЧИТАЕТ.
//
// Семантика 1:1 портирована из app/premium_progress.ts (клиентский эталон),
// чтобы серверная проверка не отрезала легитимных платящих:
//   - premium_plan непустой + premium_expiry ('0' = бессрочный store-премиум,
//     иначе timestamp окончания) → store-премиум;
//   - admin_premium_override / plan==='admin_grant' → админский грант;
//   - vip_* (vip_active/vip_until/vip_admin_override) → VIP-доступ (рефералка,
//     опрос, ручная выдача).
// Премиум-доступ активен = любой из трёх активен.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';

export type ProgressLike = Record<string, unknown> | null | undefined;

function cleanStr(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanPlan(value: unknown): string {
  return cleanStr(value).toLowerCase();
}

function hasMeaningfulPlan(plan: string): boolean {
  return plan !== '' && plan !== 'null' && plan !== 'undefined';
}

function isStorePremiumPlan(plan: string): boolean {
  // 'lifetime' — non-consumable «навсегда»: premium_expiry='0' (бессрочный).
  // Без этой ветки сервер счёл бы синхронизированный premium_plan='lifetime'
  // не-store-планом и отрезал бы платящему доступ.
  return plan === 'monthly' || plan === 'yearly' || plan === 'annual' || plan === 'lifetime';
}

function isTruthyFlag(value: unknown): boolean {
  const v = cleanStr(value).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isFalsyFlag(value: unknown): boolean {
  const v = cleanStr(value).toLowerCase();
  return v === 'false' || v === '0' || v === 'no';
}

function cleanMs(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

/** Парсит premium_expiry/vip_until: строка, число или Firestore Timestamp-подобное. */
export function parseProgressMs(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'object') {
    const record = value as { toMillis?: () => number; seconds?: number };
    if (typeof record.toMillis === 'function') return cleanMs(record.toMillis());
    if (typeof record.seconds === 'number') return cleanMs(record.seconds * 1000);
  }
  return cleanMs(value);
}

/**
 * Запас после premium_rc_expiry_ms, прежде чем сервер перестаёт давать доступ.
 * ЗЕРКАЛО premium_expiry_cron.RC_GRACE_MS (72ч): покрывает billing retry и
 * опоздавший RENEWAL-вебхук. Держать в синхроне с кроном, чтобы окно «после
 * rc-срока, но до следующего sweep» трактовалось одинаково сервером и кроном.
 */
const SERVER_RC_GRACE_MS = 72 * 60 * 60 * 1000;

/** Store-премиум (RevenueCat monthly/yearly/annual/lifetime). expiry<=0 = бессрочный активный. */
function isStorePremiumActive(progress: ProgressLike, now: number): boolean {
  const data = progress ?? {};
  const plan = cleanPlan(data.premium_plan);
  const override = cleanStr(data.admin_premium_override).toLowerCase();
  const expiryMs = parseProgressMs(data.premium_expiry);
  const rcExpiryMs = parseProgressMs(data.premium_rc_expiry_ms);

  if (!hasMeaningfulPlan(plan)) return false;
  // admin_grant / override обрабатываются отдельной веткой (isAdminGrantActive).
  if (override === 'true' || plan === 'admin_grant' || !isStorePremiumPlan(plan)) return false;

  // premium_expiry='0' = «активна, срок ведёт вебхук». Авторитет — premium_rc_expiry_ms.
  // КРИТИЧНО (утечка дохода): без этой проверки потерянный EXPIRATION-вебхук оставляет
  // premium_expiry='0' навсегда → сервер вечно отдаёт платный OpenAI бесплатно.
  // rcExpiry<=0 (нет rc-срока) = бессрочный store-премиум (lifetime / ручная выдача) → активен.
  if (expiryMs <= 0) {
    if (rcExpiryMs > 0 && rcExpiryMs + SERVER_RC_GRACE_MS < now) return false;
    return true;
  }
  return expiryMs > now;
}

/** Админский грант премиума (admin_premium_override='true' или plan='admin_grant'). */
function isAdminGrantActive(progress: ProgressLike, now: number): boolean {
  const data = progress ?? {};
  const plan = cleanPlan(data.premium_plan);
  const override = cleanStr(data.admin_premium_override);
  const expiryMs = parseProgressMs(data.premium_expiry);
  const legacyAdminPlan = plan === 'admin_grant' && override !== 'false';
  const isAdminGrant = override === 'true' || legacyAdminPlan;
  if (!isAdminGrant) return false;
  return hasMeaningfulPlan(plan) && (expiryMs <= 0 || expiryMs > now);
}

/** VIP-доступ (рефералка / опрос / ручная выдача): vip_* поля. */
export function isVipActive(progress: ProgressLike, now: number = Date.now()): boolean {
  const data = progress ?? {};
  const vipPlanRaw = cleanPlan(data.vip_plan);
  const vipOverrideRaw = cleanStr(data.vip_admin_override);
  const vipActiveFlag = isTruthyFlag(data.vip_active);
  const vipRevoked = isFalsyFlag(data.vip_admin_override) || isFalsyFlag(data.vip_active);
  const vipFromMs = parseProgressMs(data.vip_from);
  const vipUntilMs = parseProgressMs(data.vip_until ?? data.vip_expiry);
  const vipGrantAt = cleanStr(data.vip_admin_grant_at ?? data.vip_grant_at) || null;
  const hasVipShape =
    hasMeaningfulPlan(vipPlanRaw) ||
    vipActiveFlag ||
    vipRevoked ||
    vipFromMs > 0 ||
    vipUntilMs > 0 ||
    !!vipGrantAt;

  if (hasVipShape) {
    const plan = hasMeaningfulPlan(vipPlanRaw) ? vipPlanRaw : 'admin_vip';
    const windowStarted = vipFromMs <= 0 || vipFromMs <= now;
    const windowOpen = vipUntilMs <= 0 || vipUntilMs > now;
    return !vipRevoked
      && (vipActiveFlag || isTruthyFlag(vipOverrideRaw) || hasMeaningfulPlan(plan))
      && windowStarted
      && windowOpen;
  }

  // Legacy: старый админский премиум засчитываем как VIP-доступ.
  return isAdminGrantActive(progress, now);
}

/**
 * Подарок 72ч (новичку «intro_full_access» или лояльности «loyalty_gift»):
 * раньше доступ давался ТОЛЬКО на клиенте через AsyncStorage → сервер о подарке
 * не знал, ИИ-функции отказывали платным фичам подаренного премиума. Теперь клиент
 * при выдаче пишет связанную пару *_granted_at_ms / *_until_ms в progress.
 * Одна дата окончания не является доказательством настоящей 72-часовой выдачи.
 */
const MAX_GIFT_ACCESS_WINDOW_MS = 72 * 60 * 60 * 1000;

function isValidGiftAccessWindow(grantedAt: unknown, until: unknown, now: number): boolean {
  const grantedAtMs = parseProgressMs(grantedAt);
  const untilMs = parseProgressMs(until);
  return grantedAtMs > 0
    && grantedAtMs <= now
    && untilMs > now
    && untilMs - grantedAtMs <= MAX_GIFT_ACCESS_WINDOW_MS;
}

export function isGiftAccessActive(progress: ProgressLike, now: number = Date.now()): boolean {
  const data = progress ?? {};
  return isValidGiftAccessWindow(
    data.intro_access_granted_at_ms,
    data.intro_access_until_ms,
    now,
  ) || isValidGiftAccessWindow(
    data.loyalty_gift_granted_at_ms,
    data.loyalty_gift_until_ms,
    now,
  );
}

const VIP_ENTITLEMENT_KEYS = [
  'vip_active',
  'vip_plan',
  'vip_from',
  'vip_until',
  'vip_expiry',
  'vip_admin_override',
  'vip_admin_grant_at',
  'vip_grant_at',
  // Legacy admin grants used premium_* fields. Their presence on the
  // canonical record (including an explicit revoke) is just as authoritative
  // as a vip_* block and must prevent stale alias inheritance.
  'admin_premium_override',
  'premium_plan',
  'premium_expiry',
] as const;

function hasVipEntitlementShape(progress: ProgressLike): boolean {
  const data = progress ?? {};
  return VIP_ENTITLEMENT_KEYS.some((key) => Object.prototype.hasOwnProperty.call(data, key));
}

function userDocOwnedByAuth(data: FirebaseFirestore.DocumentData, authUid: string): boolean {
  if (cleanStr(data.firebaseAuthUid) === authUid) return true;
  const linkedAuth = data.linkedAuth;
  return linkedAuth != null
    && typeof linkedAuth === 'object'
    && cleanStr((linkedAuth as { providerUid?: unknown }).providerUid) === authUid;
}

function isServerCanonicalizedAlias(data: FirebaseFirestore.DocumentData): boolean {
  return data.identityHidden === true
    && (
      parseProgressMs(data.identityMergedAt) > 0
      || parseProgressMs(data.identityCanonicalizedAt) > 0
    );
}

function hasServerAliasRecoveryEvidence(data: FirebaseFirestore.DocumentData): boolean {
  return parseProgressMs(data.identityMergedAt) > 0
    || parseProgressMs(data.identityCanonicalizedAt) > 0
    || parseProgressMs(data.identityCleanupAt) > 0;
}

interface OwnedUserRecord {
  id: string;
  data: FirebaseFirestore.DocumentData;
}

interface OwnedPremiumAuthority {
  primary: OwnedUserRecord | null;
  providerFallbackRecords: OwnedUserRecord[];
}

type OwnedUserRecordReader = (id: string) => Promise<OwnedUserRecord | null>;

async function readUserRecord(
  db: FirebaseFirestore.Firestore,
  id: string,
): Promise<OwnedUserRecord | null> {
  const snap = await db.collection('users').doc(id).get().catch(() => null);
  if (!snap?.exists) return null;
  return { id, data: snap.data() ?? {} };
}

/**
 * Resolves at most three server-canonicalized alias hops. Every target must
 * independently belong to the same Firebase identity; existence alone is
 * never authority. The depth cap also bounds Firestore cost for corrupted
 * or cyclic historical data.
 */
async function resolveOwnedCanonicalCandidate(
  db: FirebaseFirestore.Firestore,
  candidateId: string,
  authUid: string,
  authLinkedStableId: string,
  readRecord: OwnedUserRecordReader = (id) => readUserRecord(db, id),
): Promise<OwnedUserRecord | null> {
  let currentId = cleanStr(candidateId);
  const seen = new Set<string>();

  for (let depth = 0; currentId && depth < 3; depth += 1) {
    if (seen.has(currentId)) return null;
    seen.add(currentId);

    const record = await readRecord(currentId);
    if (!record) return null;
    const owned = currentId === authUid
      || currentId === authLinkedStableId
      || userDocOwnedByAuth(record.data, authUid);
    if (!owned) return null;
    if (record.data.identityHidden !== true) return record;
    if (!isServerCanonicalizedAlias(record.data)) return null;

    const nextId = cleanStr(record.data.canonicalStableId);
    if (!nextId || nextId === currentId) return null;
    currentId = nextId;
  }

  return null;
}

async function resolveOwnedPremiumAuthorityUncached(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  authUid: string,
): Promise<OwnedPremiumAuthority> {
  const linkSnap = await db.collection('auth_links').doc(authUid).get().catch(() => null);
  const authLinkedStableId = cleanStr(linkSnap?.data()?.stable_id);
  const recordReads = new Map<string, Promise<OwnedUserRecord | null>>();
  const readRecord: OwnedUserRecordReader = (id) => {
    const existing = recordReads.get(id);
    if (existing) return existing;
    const read = readUserRecord(db, id);
    recordReads.set(id, read);
    return read;
  };

  const candidates = [
    { id: authLinkedStableId, linkProof: authLinkedStableId },
    { id: cleanStr(stableUid), linkProof: '' },
    { id: authUid, linkProof: '' },
  ];
  const checked = new Set<string>();
  for (const candidate of candidates) {
    const candidateId = cleanStr(candidate.id);
    if (!candidateId) continue;
    if (checked.has(candidateId)) continue;
    checked.add(candidateId);
    const primary = await resolveOwnedCanonicalCandidate(
      db,
      candidateId,
      authUid,
      candidate.linkProof,
      readRecord,
    );
    if (primary) return { primary, providerFallbackRecords: [] };
  }

  // This is a recovery path only: a real direct authority, including a free or
  // revoked canonical record, must win over every provider-owned sibling.
  return {
    primary: null,
    providerFallbackRecords: await readOwnedVisibleProviderRecords(db, authUid),
  };
}

const ownedAuthorityInFlight = new WeakMap<
  FirebaseFirestore.Firestore,
  Map<string, Promise<OwnedPremiumAuthority>>
>();

function resolveOwnedPremiumAuthority(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  authUid: string,
): Promise<OwnedPremiumAuthority> {
  let byIdentity = ownedAuthorityInFlight.get(db);
  if (!byIdentity) {
    byIdentity = new Map<string, Promise<OwnedPremiumAuthority>>();
    ownedAuthorityInFlight.set(db, byIdentity);
  }

  const key = JSON.stringify([cleanStr(stableUid), authUid]);
  const existing = byIdentity.get(key);
  if (existing) return existing;

  const pending = resolveOwnedPremiumAuthorityUncached(db, stableUid, authUid);
  byIdentity.set(key, pending);
  const cleanup = () => {
    if (byIdentity?.get(key) !== pending) return;
    byIdentity.delete(key);
    if (byIdentity.size === 0) ownedAuthorityInFlight.delete(db);
  };
  void pending.then(cleanup, cleanup);
  return pending;
}

async function readOwnedVisibleProviderRecords(
  db: FirebaseFirestore.Firestore,
  authUid: string,
): Promise<OwnedUserRecord[]> {
  const byAuth = await db.collection('users')
    .where('firebaseAuthUid', '==', authUid)
    .limit(5)
    .get()
    .catch(() => null);

  return (byAuth?.docs ?? []).flatMap((doc) => {
    const data = doc.data() ?? {};
    if (data.identityHidden === true || !userDocOwnedByAuth(data, authUid)) return [];
    return [{ id: doc.id, data }];
  });
}

/**
 * Narrow fallback for a historical admin-grant delivery bug.
 *
 * Before admin writes were canonicalized, VIP could be written to a hidden
 * users/{alias} after auth_links had already moved to users/{canonical}. The
 * normal provider lookup is intentionally capped, so an account with many old
 * identities can omit that alias. Query the exact reverse pointer only when the
 * capped lookup was full, and accept it only when Firebase ownership still ties
 * the hidden alias to the currently authenticated user.
 */
async function resolveOwnedHiddenAliasMatch(
  db: FirebaseFirestore.Firestore,
  canonicalStableUid: string,
  authUid: string,
  predicate: (progress: Record<string, unknown>) => boolean,
): Promise<boolean> {
  const aliases = await db.collection('users')
    .where('canonicalStableId', '==', canonicalStableUid)
    .limit(20)
    .get()
    .catch(() => null);

  return aliases?.docs?.some((doc) => {
    const data = doc.data() ?? {};
    if (!isServerCanonicalizedAlias(data)) return false;
    if (cleanStr(data.canonicalStableId) !== canonicalStableUid) return false;
    if (!userDocOwnedByAuth(data, authUid)) return false;
    return predicate((data.progress ?? {}) as Record<string, unknown>);
  }) ?? false;
}

/** TRUE если у пользователя сейчас активен ЛЮБОЙ премиум-доступ (store / admin / VIP / подарок 72ч). */
export function isPremiumAccessActive(progress: ProgressLike, now: number = Date.now()): boolean {
  return isStorePremiumActive(progress, now)
    || isAdminGrantActive(progress, now)
    || isVipActive(progress, now)
    || isGiftAccessActive(progress, now);
}

/**
 * Читает users/{stableUid}.progress и возвращает реальный премиум-статус.
 * Источник правды для серверного гейтинга ИИ-фич. Никогда не доверяй телу запроса.
 */
export async function resolvePremiumAccess(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  now: number = Date.now(),
  authUid?: string,
): Promise<boolean> {
  if (!authUid) {
    const direct = await readUserRecord(db, cleanStr(stableUid));
    if (!direct || direct.data.identityHidden === true) return false;
    return isPremiumAccessActive(
      (direct.data.progress ?? {}) as Record<string, unknown>,
      now,
    );
  }

  const authority = await resolveOwnedPremiumAuthority(db, stableUid, authUid);
  const primary = authority.primary;
  if (primary) {
    const progress = (primary.data.progress ?? {}) as Record<string, unknown>;
    // Any explicit canonical entitlement block (active, expired, or revoked)
    // is final. A sibling must never resurrect a revoked canonical account.
    if (hasVipEntitlementShape(progress)) return isPremiumAccessActive(progress, now);
    if (isPremiumAccessActive(progress, now)) return true;
  }

  for (const record of authority.providerFallbackRecords) {
    const progress = (record.data.progress ?? {}) as Record<string, unknown>;
    if (isPremiumAccessActive(progress, now)) return true;
  }

  if (!primary) return false;
  const primaryProgress = (primary.data.progress ?? {}) as Record<string, unknown>;
  if (hasVipEntitlementShape(primaryProgress)) return false;
  if (!hasServerAliasRecoveryEvidence(primary.data)) return false;

  // Narrow recovery for a server-migrated hidden alias whose admin/VIP grant
  // predates transfer. Gift and store fields on aliases are intentionally not
  // accepted, and ordinary canonical accounts never pay for this query.
  return resolveOwnedHiddenAliasMatch(
    db,
    primary.id,
    authUid,
    (progress) => isVipActive(progress, now),
  );
}

/**
 * TRUE если у пользователя активна разовая покупка «Навсегда» (premium_plan==='lifetime').
 * Видимое имя такого доступа — «Pro» (в отличие от рекуррентного Plus / VIP). Требует,
 * чтобы store-премиум был реально активен (не истёкший), иначе истёкший lifetime не должен
 * давать «Pro»-плашку. VIP-гранты пишут vip_plan, а не premium_plan='lifetime' → не Pro.
 */
export function isLifetimePlanActive(progress: ProgressLike, now: number = Date.now()): boolean {
  const data = progress ?? {};
  const plan = cleanPlan(data.premium_plan);
  return plan === 'lifetime' && isStorePremiumActive(progress, now);
}

/**
 * Серверная резолюция Pro-плана: читает users/{stableUid}.progress (с тем же обходом
 * auth_links / firebaseAuthUid, что и resolvePremiumAccess) и возвращает, активна ли
 * покупка «Навсегда». Источник правды — сервер, тело запроса не доверяем.
 */
export async function resolveIsLifetimePlan(
  db: FirebaseFirestore.Firestore,
  stableUid: string,
  now: number = Date.now(),
  authUid?: string,
): Promise<boolean> {
  if (!authUid) {
    const direct = await readUserRecord(db, cleanStr(stableUid));
    if (!direct || direct.data.identityHidden === true) return false;
    return isLifetimePlanActive(
      (direct.data.progress ?? {}) as Record<string, unknown>,
      now,
    );
  }

  const authority = await resolveOwnedPremiumAuthority(db, stableUid, authUid);
  const primary = authority.primary;
  if (primary) {
    const progress = (primary.data.progress ?? {}) as Record<string, unknown>;
    // premium_plan on the canonical document is authoritative even when it is
    // monthly, expired, or otherwise not a current lifetime purchase.
    if (Object.prototype.hasOwnProperty.call(progress, 'premium_plan')) {
      return isLifetimePlanActive(progress, now);
    }
  }

  for (const record of authority.providerFallbackRecords) {
    const progress = (record.data.progress ?? {}) as Record<string, unknown>;
    if (isLifetimePlanActive(progress, now)) return true;
  }

  // Store purchases are transferred by the server merge itself. Reading a
  // hidden alias here would let stale or client-written store fields restore
  // lifetime status after the canonical record became authoritative.
  return false;
}
