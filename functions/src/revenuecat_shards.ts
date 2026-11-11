import * as admin from 'firebase-admin';
import { createHash, timingSafeEqual } from 'crypto';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';
import {
  classifyRevenueCatBillingCadence,
  normalizeRevenueCatFinancials,
} from './revenuecat_financial_normalization';
import {
  aggregatePremiumLineages,
  applyPremiumLineageEvent,
  normalizePremiumLineageEvent,
  receiptReplayDecision,
  boundPremiumOwnerCandidates,
  chooseAuthoritativePremiumLineageState,
  MAX_OWNER_LINEAGES,
  type PremiumLineageState,
} from './revenuecat_premium_lineage';
import {
  ACCOUNT_DELETE_AUTH_MARKERS,
  ACCOUNT_DELETE_PERMANENT_DENIALS,
  ACCOUNT_DELETE_TOMBSTONES,
  accountDeletePermanentDenialId,
} from './account_delete_job';
import { recordPaymentWebhookFailure } from './payment_webhook_alert';
import { markRefereeQualified } from './referral';
import { writeAccessProjection, writeAccessProjectionFromPatch } from './access_projection';
import { syncPublicProfilePlusAfterCommit } from './public_profile_plus_sync';
import {
  decidePremiumRestoreAuthority,
  decidePremiumRestoreTails,
  normalizeRawOriginalOwnerUid,
  type PremiumReducerProvenanceKind,
} from './revenuecat_restore_owner_policy';

const REGION = 'us-central1';
const REVENUECAT_WEBHOOK_AUTH = defineSecret('REVENUECAT_WEBHOOK_AUTH');

// зачем: D103/D139 (жемчуг) и D136 (MAX) — владелец 2026-10-01: код, который
// принимал деньги за эти товары, удалён целиком. Вебхук на такой товар больше
// ничего не начисляет и не списывает: только лог `[REVENUECAT] retired_product`
// и алерт владельцу на оплату (деньги списаны — владелец должен это видеть,
// а не узнать из жалобы). Plus/Pro — единственные товары, которые ведёт вебхук.
type RetiredProductFamily = 'pearl_pack' | 'max_voice_minutes' | 'max_subscription';

// Точные идентификаторы (без шаблонов), чтобы реестр PM-233 видел каждый снятый товар.
const RETIRED_PRODUCT_FAMILIES: ReadonlyMap<string, RetiredProductFamily> = new Map([
  ['phraseman_shards_30', 'pearl_pack'],
  ['phraseman_shards_80', 'pearl_pack'],
  ['phraseman_shards_180', 'pearl_pack'],
  ['phraseman_shards_420', 'pearl_pack'],
  ['phraseman_voice_minutes_30', 'max_voice_minutes'],
  ['phraseman_voice_minutes_120', 'max_voice_minutes'],
  ['phraseman_voice_minutes_300', 'max_voice_minutes'],
  ['phraseman_max_monthly_v1', 'max_subscription'],
  ['phraseman_max_monthly_v1:monthly-base', 'max_subscription'],
]);

// Покупка или продление — реальное списание денег за снятый товар.
const RETIRED_PRODUCT_CHARGE_EVENTS: ReadonlySet<string> = new Set([
  'INITIAL_PURCHASE',
  'NON_RENEWING_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
]);

const PREMIUM_ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'NON_RENEWING_PURCHASE', // lifetime / one-time non-consumable (e.g. phraseman_premium_lifetime_v1)
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'REFUND_REVERSED',
]);

const PREMIUM_KEEP_ACTIVE_EVENTS = new Set([
  'CANCELLATION',
  'BILLING_ISSUE',
]);

const PREMIUM_INACTIVE_EVENTS = new Set([
  'EXPIRATION',
  // REFUND: пользователь вернул деньги — Premium нужно деактивировать,
  // иначе сохраняется платный доступ без оплаты (прямая утечка дохода).
  'REFUND',
]);

type RevenueCatWebhookBody = {
  api_version?: string;
  event?: {
    app_id?: string;
    id?: string;
    type?: string;
    app_user_id?: string;
    original_app_user_id?: string;
    aliases?: unknown[];
    product_id?: string;
    transaction_id?: string;
    original_transaction_id?: string;
    store?: string;
    environment?: string;
    event_timestamp_ms?: number;
    purchased_at_ms?: number;
    expiration_at_ms?: number;
    period_type?: string;
    cancel_reason?: string;
    expiration_reason?: string;
    currency?: string;
    price?: number;
    price_in_purchased_currency?: number;
    tax_percentage?: number;
    commission_percentage?: number;
    renewal_number?: number;
    is_trial_conversion?: boolean;
    entitlement_id?: string;
    entitlement_ids?: unknown[];
    presented_offering_id?: string;
    subscriber_attributes?: Record<string, unknown>;
    // TRANSFER event: entitlements move between app_user_ids (anonymous → stable_id
    // after Purchases.logIn). RevenueCat sends the donor and recipient id lists.
    transferred_from?: unknown[];
    transferred_to?: unknown[];
  };
};

type RevenueCatEvent = NonNullable<RevenueCatWebhookBody['event']>;

declare const authenticatedWebhookProvenanceBrand: unique symbol;
type AuthenticatedWebhookProvenance = Readonly<{
  kind: 'authenticated_webhook';
  [authenticatedWebhookProvenanceBrand]: true;
}>;

export type PremiumReducerProvenance =
  | AuthenticatedWebhookProvenance
  | Readonly<{
      kind: 'synthetic_reconcile';
      requesterCanonicalUid: string;
      source: 'subscription' | 'lifetime';
    }>;

function authenticatedWebhookProvenance(): AuthenticatedWebhookProvenance {
  return Object.freeze({ kind: 'authenticated_webhook' }) as AuthenticatedWebhookProvenance;
}

function cleanId(raw: unknown): string {
  return String(raw ?? '').trim();
}

function normalizeLifecycleReason(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const reason = raw.trim().toUpperCase();
  return reason.length <= 64 && /^[A-Z][A-Z0-9_]*$/.test(reason) ? reason : '';
}

function revenueCatLifecycleReasonFields(
  event: RevenueCatEvent,
  eventType: string,
): { cancelReason?: string; expirationReason?: string } {
  if (eventType === 'CANCELLATION') {
    const cancelReason = normalizeLifecycleReason(event.cancel_reason);
    return cancelReason ? { cancelReason } : {};
  }
  if (eventType === 'EXPIRATION') {
    const expirationReason = normalizeLifecycleReason(event.expiration_reason);
    return expirationReason ? { expirationReason } : {};
  }
  return {};
}

function isRevenueCatAnonymousId(raw: unknown): boolean {
  const id = cleanId(raw);
  return id.startsWith('$RCAnonymousID:') || id.startsWith('$RCA');
}

function stableCandidateUserIds(candidates: string[]): string[] {
  return candidates.filter((id) => id && !isRevenueCatAnonymousId(id));
}

function prioritizeUserCandidates(candidates: string[]): string[] {
  const stable = stableCandidateUserIds(candidates);
  const anonymous = candidates.filter(isRevenueCatAnonymousId);
  return [...stable, ...anonymous];
}

function subscriberAttributeValue(raw: unknown): string {
  if (raw != null && typeof raw === 'object' && 'value' in raw) {
    return cleanId((raw as { value?: unknown }).value);
  }
  return cleanId(raw);
}

function addCandidate(out: Set<string>, raw: unknown): void {
  const id = cleanId(raw);
  if (id) out.add(id);
}

// зачем: аудит безопасности 2026-08-22 — сравнение секрета вебхука было через
// строковый ===, теоретический тайминг-сайдчаннел (соседи stripeWebhook и
// telegramPremiumWebhook уже используют timingSafeEqual). Длины буферов не
// совпадают почти всегда (случайный секрет) — timingSafeEqual бросает на
// разной длине, поэтому длину сверяем ДО вызова, как в web_checkout.ts.
function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf8');
  const bBuf = Buffer.from(b, 'utf8');
  return aBuf.length === bBuf.length && timingSafeEqual(aBuf, bBuf);
}

function authMatches(header: string | undefined, expected: string): boolean {
  const value = String(header ?? '').trim();
  if (!value) return false;
  const lowerValue = value.toLowerCase();
  const lowerBearerExpected = `bearer ${expected}`.toLowerCase();
  return safeEqual(value, expected) || safeEqual(lowerValue, lowerBearerExpected);
}

function candidateUserIds(event: RevenueCatEvent): string[] {
  const out = new Set<string>();
  const attrs = event.subscriber_attributes ?? {};
  for (const key of ['phraseman_uid', 'phraseman_stable_id', 'stable_id']) {
    addCandidate(out, subscriberAttributeValue(attrs[key]));
  }
  for (const raw of [event.app_user_id, event.original_app_user_id]) addCandidate(out, raw);
  for (const raw of Array.isArray(event.aliases) ? event.aliases : []) {
    addCandidate(out, raw);
  }
  return [...out];
}

function premiumAuthoritativeUserIds(event: RevenueCatEvent): string[] {
  const out = new Set<string>();
  for (const raw of [
    event.app_user_id,
    event.original_app_user_id,
    ...(Array.isArray(event.aliases) ? event.aliases : []),
  ]) {
    const candidate = cleanId(raw);
    if (candidate && !isRevenueCatAnonymousId(candidate)) out.add(candidate);
  }
  return [...out];
}

function entitlementIds(event: RevenueCatEvent): string[] {
  const out = new Set<string>();
  const one = cleanId(event.entitlement_id);
  if (one) out.add(one.toLowerCase());
  for (const raw of Array.isArray(event.entitlement_ids) ? event.entitlement_ids : []) {
    const id = cleanId(raw);
    if (id) out.add(id.toLowerCase());
  }
  return [...out];
}

export function isManagedPremiumProductId(rawProductId: unknown): boolean {
  const productId = cleanId(rawProductId).toLowerCase();
  return /^phraseman_premium_(monthly|yearly)(?:_[0-9]{1,6})?(?::[a-z0-9][a-z0-9-]*)?$/.test(productId)
    || productId === 'phraseman_premium_lifetime_v1';
}

function deriveAuthenticatedOriginalEvidence(event: RevenueCatEvent): Readonly<{
  rawOriginalOwnerUid: string;
  evidenceKind: 'authenticated_original_purchase_webhook_v1';
}> | null {
  const eventType = cleanId(event.type).toUpperCase();
  const environment = cleanId(event.environment).toUpperCase();
  const rawOriginalOwnerUid = normalizeRawOriginalOwnerUid(event.original_app_user_id);
  if (
    environment !== 'PRODUCTION'
    || (eventType !== 'INITIAL_PURCHASE' && eventType !== 'NON_RENEWING_PURCHASE')
    || !isManagedPremiumProductId(event.product_id)
    || !rawOriginalOwnerUid
  ) {
    return null;
  }
  return { rawOriginalOwnerUid, evidenceKind: 'authenticated_original_purchase_webhook_v1' };
}

function looksLikePremiumSubscription(event: RevenueCatEvent): boolean {
  const productId = cleanId(event.product_id).toLowerCase();
  const entitlements = entitlementIds(event);
  const legacyPremiumProducts = new Set([
    'premium_monthly',
    'premium_yearly',
    'premium_lifetime',
    'phraseman_premium_monthly',
    'phraseman_premium_yearly',
    'phraseman_premium_yearly_2399',
    'phraseman_premium_yearly_2999',
    'phraseman_premium_lifetime_v1',
  ]);
  if (entitlements.length === 0) return legacyPremiumProducts.has(productId);
  if (!entitlements.includes('premium')) return false;
  return isManagedPremiumProductId(productId);
}

export function retiredProductFamily(rawProductId: unknown): RetiredProductFamily | null {
  const productId = cleanId(rawProductId).toLowerCase();
  if (!productId) return null;
  return RETIRED_PRODUCT_FAMILIES.get(productId) ?? null;
}

function premiumPlanFromEvent(event: RevenueCatEvent): 'monthly' | 'yearly' | 'lifetime' {
  const productId = cleanId(event.product_id).toLowerCase();
  if (/lifetime|forever|one.?time|onetime|perpetual/.test(productId)) return 'lifetime';
  if (/year|yearly|annual|12.?month/.test(productId)) return 'yearly';
  return 'monthly';
}

export function paidAccessAchievementGrant(event: Readonly<{
  environment?: unknown;
  type?: unknown;
  period_type?: unknown;
  product_id?: unknown;
}>): { plus: boolean; pro: boolean } {
  const environment = cleanId(event.environment).toUpperCase();
  const eventType = cleanId(event.type).toUpperCase();
  const periodType = cleanId(event.period_type).toUpperCase();
  const productId = cleanId(event.product_id).toLowerCase();
  if (environment !== 'PRODUCTION') return { plus: false, pro: false };
  return {
    plus: eventType === 'INITIAL_PURCHASE'
      && periodType !== 'TRIAL'
      && /^phraseman_premium_(monthly|yearly)(?:_[0-9]{1,6})?(?::[a-z0-9][a-z0-9-]*)?$/.test(productId),
    pro: eventType === 'NON_RENEWING_PURCHASE'
      && productId === 'phraseman_premium_lifetime_v1',
  };
}

/**
 * Деактивировать ли Premium на «inactive»-событии (EXPIRATION / REFUND).
 *
 * REFUND — всегда да (вернули деньги, доступ снять даже у lifetime). EXPIRATION на
 * lifetime — НЕТ: non-renewing «Навсегда» не может законно истечь, и спурьёзный
 * EXPIRATION иначе молча даунгрейднул бы платящего lifetime-клиента до free (аудит #24).
 * Чистая функция — тестируемая в отрыве от Firestore-транзакции.
 */
export function shouldDeactivateOnInactiveEvent(eventType: string, plan: string): boolean {
  if (eventType === 'EXPIRATION' && plan === 'lifetime') return false;
  return true;
}

function eventMs(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

/**
 * Sandbox-события RevenueCat (TestFlight, sandbox-аккаунты App Store, Play Console
 * testing) НЕ должны писать реальный premium / осколки в production Firestore.
 * Иначе тестер получает пожизненный платный доступ на проде, а sandbox-покупка
 * лояльности зачисляет настоящие осколки.
 *
 * Фильтруем только ЯВНЫЙ SANDBOX (RC шлёт 'SANDBOX' для тестовых событий). Пустой
 * environment не блокируем — это сохраняет совместимость с legacy-вебхуками /
 * тестами, где поле не выставлено, и не превращает фильтр в fail-closed (когда RC
 * по какой-то причине не пришлёт environment вообще, реальные покупки продолжат
 * процессироваться).
 */
export function isSandboxEvent(event: RevenueCatEvent): boolean {
  return cleanId(event.environment).toUpperCase() === 'SANDBOX';
}

async function findExistingUserRef(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  candidates: string[],
): Promise<{ uid: string; ref: admin.firestore.DocumentReference; snap: admin.firestore.DocumentSnapshot } | null> {
  const orderedCandidates = prioritizeUserCandidates(candidates);
  if (orderedCandidates.length === 0) return null;

  const stableCandidates = stableCandidateUserIds(orderedCandidates);
  const searchCandidates = stableCandidates.length > 0 ? stableCandidates : orderedCandidates;

  let uid = searchCandidates[0];
  let ref = db.collection('users').doc(uid);
  let snap = await tx.get(ref);
  for (const candidate of searchCandidates.slice(1)) {
    if (snap.exists) break;
    uid = candidate;
    ref = db.collection('users').doc(uid);
    snap = await tx.get(ref);
  }
  if (!snap.exists) return null;
  return { uid, ref, snap };
}

type PremiumOwnerResolution =
  | {
    status: 'resolved';
    uid: string;
    ref: admin.firestore.DocumentReference;
    snap: admin.firestore.DocumentSnapshot;
  }
  | { status: 'missing'; reason: 'missing_canonical_owner' }
  | { status: 'ambiguous'; reason: 'conflicting_canonical_owners'; ownerUids: string[] };

async function resolvePremiumOwnerRef(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  candidates: string[],
): Promise<PremiumOwnerResolution> {
  const userSnapshots = new Map<string, admin.firestore.DocumentSnapshot>();
  const canonicalCandidates: string[] = [];
  const addCanonicalCandidate = (raw: unknown) => {
    const uid = cleanId(raw);
    if (uid && !uid.includes('/') && !canonicalCandidates.includes(uid)) canonicalCandidates.push(uid);
  };

  for (const candidate of candidates) {
    const userRef = db.collection('users').doc(candidate);
    const linkRef = db.collection('auth_links').doc(candidate);
    const ownerMapRef = db.collection('account_identity_owner_map').doc(candidate);
    const userSnap = await tx.get(userRef);
    const linkSnap = await tx.get(linkRef);
    const ownerMapSnap = await tx.get(ownerMapRef);
    userSnapshots.set(candidate, userSnap);
    if (userSnap.exists) {
      const userData = userSnap.data() ?? {};
      addCanonicalCandidate(userData.identityHidden === true
        ? userData.canonicalStableId
        : candidate);
    }
    if (linkSnap.exists) addCanonicalCandidate(linkSnap.data()?.stable_id);
    if (ownerMapSnap.exists) addCanonicalCandidate(ownerMapSnap.data()?.canonicalStableId);
  }

  const resolved = new Map<string, admin.firestore.DocumentSnapshot>();
  for (const initialUid of canonicalCandidates) {
    let uid = initialUid;
    const seen = new Set<string>();
    for (let depth = 0; depth <= MAX_OWNER_LINEAGES; depth += 1) {
      if (!uid || seen.has(uid)) break;
      seen.add(uid);
      const ownerMapSnap = await tx.get(db.collection('account_identity_owner_map').doc(uid));
      const mappedUid = cleanId(ownerMapSnap.data()?.canonicalStableId);
      if (ownerMapSnap.exists && mappedUid && mappedUid !== uid) {
        uid = mappedUid;
        continue;
      }
      let snap = userSnapshots.get(uid);
      if (!snap) {
        snap = await tx.get(db.collection('users').doc(uid));
        userSnapshots.set(uid, snap);
      }
      if (!snap.exists) break;
      const data = snap.data() ?? {};
      if (data.identityHidden !== true) {
        resolved.set(uid, snap);
        break;
      }
      uid = cleanId(data.canonicalStableId);
    }
  }

  const ownerUids = [...resolved.keys()];
  if (ownerUids.length === 0) return { status: 'missing', reason: 'missing_canonical_owner' };
  if (ownerUids.length > 1) {
    return { status: 'ambiguous', reason: 'conflicting_canonical_owners', ownerUids };
  }
  const uid = ownerUids[0];
  return {
    status: 'resolved',
    uid,
    ref: db.collection('users').doc(uid),
    snap: resolved.get(uid)!,
  };
}

type CanonicalDonorResolution =
  | { status: 'resolved'; uid: string }
  | {
    status: 'invalid';
    reason: 'donor_owner_map_cycle' | 'donor_owner_map_overflow' | 'donor_owner_map_invalid';
  };

async function resolveCanonicalDonorUid(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  sourceUid: string,
): Promise<CanonicalDonorResolution> {
  let uid = cleanId(sourceUid);
  const seen = new Set<string>();
  for (let depth = 0; depth <= MAX_OWNER_LINEAGES; depth += 1) {
    if (!uid || uid.includes('/')) return { status: 'invalid', reason: 'donor_owner_map_invalid' };
    if (seen.has(uid)) return { status: 'invalid', reason: 'donor_owner_map_cycle' };
    seen.add(uid);

    const ownerMapSnap = await tx.get(db.collection('account_identity_owner_map').doc(uid));
    if (!ownerMapSnap.exists) return { status: 'resolved', uid };
    const mappedUid = cleanId(ownerMapSnap.data()?.canonicalStableId);
    if (!mappedUid || mappedUid.includes('/')) {
      return { status: 'invalid', reason: 'donor_owner_map_invalid' };
    }
    if (mappedUid === uid) return { status: 'resolved', uid };
    if (depth === MAX_OWNER_LINEAGES) {
      return { status: 'invalid', reason: 'donor_owner_map_overflow' };
    }
    uid = mappedUid;
  }
  return { status: 'invalid', reason: 'donor_owner_map_overflow' };
}

function premiumReceiptDocId(eventId: string): string {
  return `evt_${createHash('sha256').update(eventId).digest('hex')}`;
}

function premiumLineageDocId(uid: string, lineageHash: string): string {
  const ownerHash = createHash('sha256').update(uid).digest('hex').slice(0, 32);
  return `lin_${ownerHash}_${lineageHash}`;
}

async function readPermanentDeletionDenials(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  identities: string[],
): Promise<FirebaseFirestore.DocumentSnapshot[]> {
  const unique = [...new Set(identities.map(cleanId).filter(Boolean))];
  const snapshots: FirebaseFirestore.DocumentSnapshot[] = [];
  for (const identity of unique) {
    snapshots.push(await tx.get(
      db.collection(ACCOUNT_DELETE_PERMANENT_DENIALS).doc(accountDeletePermanentDenialId(identity)),
    ));
  }
  return snapshots;
}

async function writePremiumDenialReceipt(
  event: RevenueCatEvent,
  denialId: string,
  reason: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  const db = admin.firestore();
  await db.collection('revenuecat_premium_denials').doc(denialId).set({
    reason,
    eventId: cleanId(event.id) || null,
    eventType: cleanId(event.type).toUpperCase() || null,
    ...details,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: false });
}

type RevenueCatLineageOwnerV1 = Readonly<{
  schemaVersion: 1;
  lineageHash: string;
  originalOwnerUid: string;
  canonicalOwnerUidAtCreation: string;
  status: 'verified_original';
  evidenceKind: 'authenticated_original_purchase_webhook_v1';
  evidenceEventIdHash: string;
  receiptFingerprint: string;
  createdAtMs: number;
}>;

type PremiumTransactionTailToken = Readonly<{
  decision: ReturnType<typeof decidePremiumRestoreAuthority>['decision'];
  targetOwnerUid: string | null;
  committed: boolean;
  projectionChanged: boolean;
  referralEligible: boolean;
  requesterDecision: 'owner' | 'not_requester' | 'webhook';
  progress: Record<string, unknown> | null;
}>;

function projectionPatchChanged(
  progress: Record<string, unknown>,
  patch: Record<string, unknown>,
): boolean {
  return Object.entries(patch).some(([key, value]) => cleanId(progress[key]) !== cleanId(value));
}

function lineageOwnerRecord(
  data: FirebaseFirestore.DocumentData | undefined,
  lineageHash: string,
): RevenueCatLineageOwnerV1 | null {
  if (
    data?.schemaVersion !== 1
    || data?.lineageHash !== lineageHash
    || data?.status !== 'verified_original'
    || data?.evidenceKind !== 'authenticated_original_purchase_webhook_v1'
    || !normalizeRawOriginalOwnerUid(data?.originalOwnerUid)
    || !normalizeRawOriginalOwnerUid(data?.canonicalOwnerUidAtCreation)
    || !cleanId(data?.evidenceEventIdHash)
    || !cleanId(data?.receiptFingerprint)
    || !Number.isSafeInteger(data?.createdAtMs)
    || data.createdAtMs <= 0
  ) {
    return null;
  }
  return data as RevenueCatLineageOwnerV1;
}

async function canonicalIdentityForAuthority(
  tx: admin.firestore.Transaction,
  db: admin.firestore.Firestore,
  rawUid: unknown,
): Promise<string | null> {
  const uid = cleanId(rawUid);
  if (!uid) return null;
  const resolution = await resolveCanonicalDonorUid(tx, db, uid);
  return resolution.status === 'resolved' ? resolution.uid : null;
}

export async function applyVerifiedPremiumSubscriptionEvent(
  rawEvent: Record<string, unknown>,
  eventType: string,
  productId: string,
  provenance: PremiumReducerProvenance,
): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  const event = rawEvent as RevenueCatEvent;
  const normalized = normalizePremiumLineageEvent(event as Record<string, unknown>);
  if (normalized.status === 'quarantine') {
    await writePremiumDenialReceipt(
      event,
      'quarantine_' + normalized.rawFingerprint,
      normalized.reason,
      { rawFingerprint: normalized.rawFingerprint },
    );
    return { statusCode: 202, body: { ok: true, kind: 'premium', quarantined: true, reason: normalized.reason } };
  }

  const canonicalEvent = normalized.event;
  const db = admin.firestore();
  const receiptId = premiumReceiptDocId(canonicalEvent.eventId);
  const processedReceiptRef = db.collection('revenuecat_premium_events').doc(receiptId);
  const denialRef = db.collection('revenuecat_premium_denials').doc(receiptId);
  const ownerRef = db.collection('revenuecat_premium_lineage_owners').doc(canonicalEvent.lineageHash);
  const ownerCreatedAtMs = Date.now();

  const out = await db.runTransaction(async (tx): Promise<{
    response: Record<string, unknown>;
    tail: PremiumTransactionTailToken;
  }> => {
    const processedSnap = await tx.get(processedReceiptRef);
    const denialSnap = await tx.get(denialRef);
    const ownerSnap = await tx.get(ownerRef);

    const zeroTail = (
      decision: PremiumTransactionTailToken['decision'],
      reason: string = decision,
    ) => ({
      response: { ok: true, kind: 'premium', updated: false, reason },
      tail: {
        decision,
        targetOwnerUid: null,
        committed: false,
        projectionChanged: false,
        referralEligible: false,
        requesterDecision: provenance.kind === 'authenticated_webhook' ? 'webhook' as const : 'not_requester' as const,
        progress: null,
      },
    });

    if (denialSnap.exists) return zeroTail('receipt_evidence_conflict', 'denied_receipt_exists');
    const auditCandidates = boundPremiumOwnerCandidates(premiumAuthoritativeUserIds(event));
    if (auditCandidates.status === 'quarantine') {
      return zeroTail('lineage_owner_unproven', auditCandidates.reason);
    }
    const earlyPermanentDenials = await readPermanentDeletionDenials(tx, db, auditCandidates.candidates);
    const earlyDeletionSnapshots: FirebaseFirestore.DocumentSnapshot[] = [];
    for (const identity of auditCandidates.candidates) {
      earlyDeletionSnapshots.push(await tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(identity)));
      earlyDeletionSnapshots.push(await tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(identity)));
    }
    if ([...earlyPermanentDenials, ...earlyDeletionSnapshots].some((snapshot) => snapshot.exists)) {
      if (!processedSnap.exists) {
        tx.set(denialRef, {
          reason: 'account_deletion_pending_or_tombstoned',
          eventId: canonicalEvent.eventId,
          fingerprint: canonicalEvent.fingerprint,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      return zeroTail('receipt_evidence_conflict', 'account_deletion_pending_or_tombstoned');
    }

    const historySnapshot = await tx.get(
      db.collection('revenuecat_premium_lineages')
        .where('lineageHash', '==', canonicalEvent.lineageHash)
        .limit(MAX_OWNER_LINEAGES + 1),
    );
    if (historySnapshot.docs.length > MAX_OWNER_LINEAGES) {
      return zeroTail('lineage_owner_conflict', 'lineage_history_overflow');
    }

    const evidence = provenance.kind === 'authenticated_webhook'
      ? deriveAuthenticatedOriginalEvidence(event)
      : null;
    let evidenceCanonicalOwnerUid: string | null = null;
    if (evidence) {
      const evidenceResolution = await resolvePremiumOwnerRef(tx, db, [evidence.rawOriginalOwnerUid]);
      if (evidenceResolution.status === 'resolved') evidenceCanonicalOwnerUid = evidenceResolution.uid;
    }
    const normalizedEvidence = evidence && evidenceCanonicalOwnerUid
      ? {
          ...evidence,
          evidenceCanonicalOwnerUid,
        }
      : null;
    const requesterCanonicalUid = provenance.kind === 'synthetic_reconcile'
      ? normalizeRawOriginalOwnerUid(provenance.requesterCanonicalUid)
      : null;

    const historyOwnerUids: string[] = [];
    for (const document of historySnapshot.docs) {
      const canonicalOwnerUid = await canonicalIdentityForAuthority(tx, db, document.data()?.ownerUid);
      if (!canonicalOwnerUid) return zeroTail('lineage_owner_conflict');
      if (!historyOwnerUids.includes(canonicalOwnerUid)) historyOwnerUids.push(canonicalOwnerUid);
    }

    let verifiedOwner: {
      originalOwnerUid: string;
      canonicalOwnerUidAtCreation: string;
      currentCanonicalOwnerUid: string;
    } | null = null;
    const storedOwner = ownerSnap.exists
      ? lineageOwnerRecord(ownerSnap.data(), canonicalEvent.lineageHash)
      : null;
    if (ownerSnap.exists && !storedOwner) return zeroTail('owner_lineage_inconsistent');
    if (storedOwner) {
      const currentCanonicalOwnerUid = await canonicalIdentityForAuthority(
        tx,
        db,
        storedOwner.canonicalOwnerUidAtCreation,
      );
      if (!currentCanonicalOwnerUid) return zeroTail('owner_lineage_inconsistent');
      verifiedOwner = {
        originalOwnerUid: storedOwner.originalOwnerUid,
        canonicalOwnerUidAtCreation: storedOwner.canonicalOwnerUidAtCreation,
        currentCanonicalOwnerUid,
      };
    }

    const receiptData = processedSnap.data() ?? {};
    const receiptTargetOwnerUid = processedSnap.exists
      ? await canonicalIdentityForAuthority(
          tx,
          db,
          receiptData.authorityTargetOwnerUid ?? receiptData.uid,
        )
      : null;
    const receiptRequesterUid = processedSnap.exists && receiptData.authorityRequesterCanonicalUid
      ? await canonicalIdentityForAuthority(tx, db, receiptData.authorityRequesterCanonicalUid)
      : null;
    const receiptEvidenceUid = processedSnap.exists && receiptData.authorityEvidenceCanonicalOwnerUid
      ? await canonicalIdentityForAuthority(tx, db, receiptData.authorityEvidenceCanonicalOwnerUid)
      : null;
    const receiptAuthority = processedSnap.exists ? {
      kind: receiptData.authoritySchemaVersion === 1 ? 's1' as const : 'legacy' as const,
      fingerprintMatches: receiptReplayDecision(receiptData, canonicalEvent) === 'duplicate',
      targetOwnerUid: receiptTargetOwnerUid,
      provenanceKind: receiptData.authorityProvenanceKind as PremiumReducerProvenanceKind | undefined,
      requesterCanonicalUid: receiptRequesterUid,
      evidenceKind: receiptData.authorityEvidenceKind as 'authenticated_original_purchase_webhook_v1' | 'none' | undefined,
      rawOriginalOwnerUid: cleanId(receiptData.authorityRawOriginalOwnerUid) || null,
      evidenceCanonicalOwnerUid: receiptEvidenceUid,
    } : null;

    const authority = decidePremiumRestoreAuthority({
      eventType,
      provenanceKind: provenance.kind,
      requesterCanonicalUid,
      rawOriginalOwnerUid: normalizedEvidence?.rawOriginalOwnerUid ?? null,
      evidenceCanonicalOwnerUid: normalizedEvidence?.evidenceCanonicalOwnerUid ?? null,
      verifiedOwner,
      historyOwnerUids,
      receipt: receiptAuthority,
    });
    if (!authority.targetOwnerUid) return zeroTail(authority.decision);

    const deletionIdentities = [
      authority.targetOwnerUid,
      evidence?.rawOriginalOwnerUid ?? '',
      evidenceCanonicalOwnerUid ?? '',
      requesterCanonicalUid ?? '',
    ];
    const permanentDenials = await readPermanentDeletionDenials(tx, db, deletionIdentities);
    const deletionSnapshots: FirebaseFirestore.DocumentSnapshot[] = [];
    for (const identity of [...new Set(deletionIdentities.filter(Boolean))]) {
      deletionSnapshots.push(await tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(identity)));
      deletionSnapshots.push(await tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(identity)));
    }
    if ([...permanentDenials, ...deletionSnapshots].some((snapshot) => snapshot.exists)) {
      if (!processedSnap.exists) {
        tx.set(denialRef, {
          reason: 'account_deletion_pending_or_tombstoned',
          eventId: canonicalEvent.eventId,
          fingerprint: canonicalEvent.fingerprint,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      return zeroTail('receipt_evidence_conflict', 'account_deletion_pending_or_tombstoned');
    }

    const targetUserRef = db.collection('users').doc(authority.targetOwnerUid);
    const targetUserSnap = await tx.get(targetUserRef);
    if (!targetUserSnap.exists) return zeroTail('lineage_owner_unproven');

    const makeOwnerRecord = (): RevenueCatLineageOwnerV1 => ({
      schemaVersion: 1,
      lineageHash: canonicalEvent.lineageHash,
      originalOwnerUid: normalizedEvidence!.rawOriginalOwnerUid,
      canonicalOwnerUidAtCreation: normalizedEvidence!.evidenceCanonicalOwnerUid,
      status: 'verified_original',
      evidenceKind: 'authenticated_original_purchase_webhook_v1',
      evidenceEventIdHash: hashAuditIdentity(canonicalEvent.eventId),
      receiptFingerprint: canonicalEvent.fingerprint,
      createdAtMs: ownerCreatedAtMs,
    });

    if (authority.paymentDuplicate) {
      if (authority.createOwner) tx.create(ownerRef, makeOwnerRecord());
      const storedReferralEligible = receiptData.referralEligible === true;
      return {
        response: {
          ok: true,
          kind: 'premium',
          updated: false,
          reason: authority.requesterDecision === 'not_requester' ? 'not_requester' : 'duplicate',
          ...(authority.decision === 'verify_matching_legacy_owner_duplicate'
            ? { ownerMetadataCreated: true }
            : {}),
        },
        tail: {
          decision: authority.decision,
          targetOwnerUid: authority.targetOwnerUid,
          committed: true,
          projectionChanged: false,
          referralEligible: storedReferralEligible,
          requesterDecision: authority.requesterDecision,
          progress: null,
        },
      };
    }

    const ownerLineageSnapshot = await tx.get(
      db.collection('revenuecat_premium_lineages')
        .where('ownerUid', '==', authority.targetOwnerUid)
        .limit(MAX_OWNER_LINEAGES + 1),
    );
    if (ownerLineageSnapshot.docs.length > MAX_OWNER_LINEAGES) {
      return zeroTail('lineage_owner_conflict', 'owner_lineage_limit');
    }
    const existingLineages = ownerLineageSnapshot.docs.map(
      (document) => document.data() as PremiumLineageState & { ownerUid?: string },
    );
    const currentLineage = existingLineages.find(
      (lineage) => lineage.lineageHash === canonicalEvent.lineageHash,
    ) ?? null;
    if (!currentLineage && existingLineages.length >= MAX_OWNER_LINEAGES) {
      return zeroTail('lineage_owner_conflict', 'owner_lineage_limit');
    }

    const reduced = applyPremiumLineageEvent(currentLineage, canonicalEvent);
    const progress = (targetUserSnap.data()?.progress ?? {}) as Record<string, unknown>;
    const projectedLineages = existingLineages
      .filter((lineage) => lineage.lineageHash !== reduced.state.lineageHash)
      .concat(reduced.state);
    const projectionNow = Date.now();
    const aggregate = aggregatePremiumLineages(projectedLineages, progress, projectionNow);
    const projectionChanged = reduced.status === 'applied'
      && projectionPatchChanged(progress, aggregate.progressPatch);
    const achievementGrant = paidAccessAchievementGrant(event);
    const referralEligible = reduced.status === 'applied'
      && (achievementGrant.plus || achievementGrant.pro);
    const evidenceKind = normalizedEvidence
      ? 'authenticated_original_purchase_webhook_v1' as const
      : 'none' as const;
    const processedRef = db.collection('revenuecat_premium_events').doc(receiptId);
    const receipt = {
      uid: authority.targetOwnerUid,
      productId,
      eventId: canonicalEvent.eventId,
      fingerprint: canonicalEvent.fingerprint,
      lineageHash: canonicalEvent.lineageHash,
      eventType,
      periodType: cleanId(event.period_type).toUpperCase(),
      store: canonicalEvent.store,
      environment: canonicalEvent.environment,
      transactionId: canonicalEvent.transactionId,
      originalTransactionId: canonicalEvent.originalTransactionId,
      purchasedAtMs: eventMs(event.purchased_at_ms),
      expirationAtMs: canonicalEvent.expirationAtMs,
      eventTimestampMs: canonicalEvent.eventTimeMs,
      billingCadence: classifyRevenueCatBillingCadence(event),
      ...normalizeRevenueCatFinancials(event),
      ...revenueCatLifecycleReasonFields(event, eventType),
      reduction: reduced.status,
      userDocExists: true,
      authoritySchemaVersion: 1,
      authorityProvenanceKind: provenance.kind,
      authorityRequesterCanonicalUid: requesterCanonicalUid,
      authorityEvidenceKind: evidenceKind,
      authorityRawOriginalOwnerUid: normalizedEvidence?.rawOriginalOwnerUid ?? null,
      authorityEvidenceCanonicalOwnerUid: normalizedEvidence?.evidenceCanonicalOwnerUid ?? null,
      authorityTargetOwnerUid: authority.targetOwnerUid,
      referralEligible,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (authority.createOwner) tx.create(ownerRef, makeOwnerRecord());
    tx.set(processedRef, receipt);
    if (reduced.status === 'applied') {
      const lineageRef = db.collection('revenuecat_premium_lineages')
        .doc(premiumLineageDocId(authority.targetOwnerUid, canonicalEvent.lineageHash));
      tx.set(lineageRef, {
        ownerUid: authority.targetOwnerUid,
        ...reduced.state,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: false });
      tx.set(targetUserRef, {
        progress: {
          ...aggregate.progressPatch,
          ...(achievementGrant.plus ? { achievement_access_plus_paid_v1: 'true' } : {}),
          ...(achievementGrant.pro ? { achievement_access_pro_paid_v1: 'true' } : {}),
        },
        updatedAt: projectionNow,
        last_active_at: projectionNow,
      }, { merge: true });
      writeAccessProjection(tx, targetUserRef, aggregate.progressPatch, projectionNow);
    }

    return {
      response: {
        ok: true,
        kind: 'premium',
        updated: reduced.status === 'applied',
        ...(authority.requesterDecision === 'not_requester'
          ? { reason: 'not_requester' }
          : reduced.status === 'stale'
            ? { reason: 'stale_event' }
            : {}),
        ...(authority.requesterDecision === 'owner'
          ? { active: aggregate.winnerLineageHash !== undefined }
          : {}),
      },
      tail: {
        decision: authority.decision,
        targetOwnerUid: authority.targetOwnerUid,
        committed: true,
        projectionChanged,
        referralEligible,
        requesterDecision: authority.requesterDecision,
        progress: projectionChanged ? { ...progress, ...aggregate.progressPatch } : null,
      },
    };
  });

  const tails = decidePremiumRestoreTails(out.tail);
  await qualifyReferralFromVerifiedPremiumOutcome(db, tails);
  if (tails.profileOwnerUid && out.tail.progress) {
    await syncPublicProfilePlusAfterCommit({
      db,
      stableUid: tails.profileOwnerUid,
      progress: out.tail.progress,
      nowMs: Date.now(),
      source: 'revenuecat_webhook',
    });
  }
  return { statusCode: 200, body: out.response };
}

async function qualifyReferralFromVerifiedPremiumOutcome(
  db: FirebaseFirestore.Firestore,
  outcome: Readonly<{ referralOwnerUid: string | null }>,
  qualify: (db: FirebaseFirestore.Firestore, uid: string) => Promise<unknown> = markRefereeQualified,
): Promise<boolean> {
  const uid = cleanId(outcome.referralOwnerUid);
  if (!uid) return false;
  await qualify(db, uid);
  return true;
}

async function handleRetiredProductEvent(
  event: RevenueCatEvent,
  eventType: string,
  productId: string,
  family: RetiredProductFamily,
  res: any,
): Promise<void> {
  const transactionId = cleanId(event.transaction_id || event.original_transaction_id || event.id);
  const charged = RETIRED_PRODUCT_CHARGE_EVENTS.has(eventType);
  const details = {
    family,
    eventType,
    productId,
    transactionId,
    eventId: cleanId(event.id),
    store: cleanId(event.store),
    environment: cleanId(event.environment),
    eventTimestampMs: eventMs(event.event_timestamp_ms),
    charged,
  };
  // Ранний выход по решению владельца: ничего не начисляем и не списываем.
  logger.warn('[REVENUECAT] retired_product', details);
  if (charged && !isSandboxEvent(event)) {
    // Деньги списаны за снятый товар — сигнал владельцу, а не тишина.
    try {
      await recordPaymentWebhookFailure(admin.firestore(), {
        hook: 'retired_product',
        message: `retired product charged: family=${family} product=${productId} event=${eventType} tx=${transactionId} store=${details.store} (D103/D136/D139: not credited)`,
        nowMs: Date.now(),
      });
    } catch (error) {
      logger.error('[REVENUECAT] retired_product_alert_failed', { ...details, error: String(error) });
    }
  }
  res.status(200).json({ ok: true, ignored: 'retired_product', family, eventType });
}

async function handlePremiumSubscriptionEvent(
  event: RevenueCatEvent,
  eventType: string,
  productId: string,
  provenance: AuthenticatedWebhookProvenance,
  res: any,
): Promise<void> {
  try {
    const outcome = await applyVerifiedPremiumSubscriptionEvent(
      event as Record<string, unknown>,
      eventType,
      productId,
      provenance,
    );
    res.status(outcome.statusCode).json(outcome.body);
  } catch (error) {
    logger.error('revenuecat_premium_lineage_webhook_failed', error);
    await recordPaymentWebhookFailure(admin.firestore(), {
      hook: 'premium_lineage',
      message: String(error),
      nowMs: Date.now(),
    });
    res.status(500).send('Internal error');
  }
}

// TRANSFER never establishes or changes Premium ownership. RevenueCat may report
// stable or anonymous donor/recipient ids, but S1 records only bounded hashes in
// the function log and returns one generic authenticated acknowledgement.
function idList(raw: unknown): string[] {
  const out = new Set<string>();
  for (const value of Array.isArray(raw) ? raw : []) {
    const id = cleanId(value);
    if (id) out.add(id);
  }
  return [...out];
}

export function transferTargetIds(event: RevenueCatEvent): string[] {
  return stableCandidateUserIds(idList(event.transferred_to));
}

export function transferSourceIds(event: RevenueCatEvent): string[] {
  return idList(event.transferred_from);
}

function hashAuditIdentity(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function handleTransferEvent(event: RevenueCatEvent, eventType: string, res: any): Promise<void> {
  const rawSources = idList(event.transferred_from);
  const rawTargets = idList(event.transferred_to);
  const boundedSources = boundPremiumOwnerCandidates(rawSources);
  const boundedTargets = boundPremiumOwnerCandidates(rawTargets);
  const eventId = cleanId(event.id);
  const validEventId = eventId.length > 0 && eventId.length <= 256 && !eventId.includes('/');
  const accepted = validEventId
    && boundedSources.status === 'ok'
    && boundedTargets.status === 'ok';

  logger.info('revenuecat_transfer_audit_only', {
    eventType,
    accepted,
    eventIdHash: validEventId ? hashAuditIdentity(eventId) : null,
    donorIdHashes: boundedSources.status === 'ok'
      ? boundedSources.candidates.map(hashAuditIdentity)
      : [],
    recipientIdHashes: boundedTargets.status === 'ok'
      ? boundedTargets.candidates.map(hashAuditIdentity)
      : [],
    donorCount: rawSources.length,
    recipientCount: rawTargets.length,
  });
  res.status(200).json({ ok: true, kind: 'transfer', accepted: true, auditOnly: true });
}

// Structural boundary for the connected deletion/no-resurrection contract.
// This type is internal and cannot construct or export authenticated provenance.
type AuthenticatedRevenueCatRoute = (
  event: RevenueCatEvent,
  provenance: AuthenticatedWebhookProvenance,
  eventType: string,
  productId: string,
  res: any,
) => Promise<void>;

async function routeAuthenticatedRevenueCatWebhook(
  event: RevenueCatEvent,
  provenance: AuthenticatedWebhookProvenance,
  eventType: string,
  productId: string,
  res: any,
): Promise<void> {
  const retiredFamily = retiredProductFamily(productId);
  if (retiredFamily) {
    await handleRetiredProductEvent(event, eventType, productId, retiredFamily, res);
    return;
  }

  if (isSandboxEvent(event)) {
    logger.info('revenuecat_webhook_sandbox_ignored', {
      eventType,
      productId,
      environment: cleanId(event.environment),
    });
    res.status(200).json({ ok: true, ignored: 'sandbox_environment', environment: cleanId(event.environment) });
    return;
  }

  if (eventType === 'TRANSFER') {
    await handleTransferEvent(event, eventType, res);
    return;
  }

  if (!looksLikePremiumSubscription(event)) {
    logger.info('[REVENUECAT] not_managed_product', { eventType, productId });
    res.status(200).json({ ok: true, ignored: 'not_managed_product' });
    return;
  }

  await handlePremiumSubscriptionEvent(event, eventType, productId, provenance, res);
}

async function dispatchAuthenticatedRevenueCatWebhook(
  req: any,
  res: any,
  expectedAuth: string,
): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }
  if (!expectedAuth || !authMatches(req.headers?.authorization, expectedAuth)) {
    res.status(401).send('Unauthorized');
    return;
  }

  const body = req.body as RevenueCatWebhookBody;
  const event = body?.event;
  const eventType = cleanId(event?.type).toUpperCase();
  const productId = cleanId(event?.product_id);
  if (!event || !eventType) {
    res.status(400).send('Bad request');
    return;
  }

  await routeAuthenticatedRevenueCatWebhook(
    event,
    authenticatedWebhookProvenance(),
    eventType,
    productId,
    res,
  );
}

export const revenueCatShardsWebhook = onRequest(
  { region: REGION, secrets: [REVENUECAT_WEBHOOK_AUTH] },
  async (req, res) => {
    await dispatchAuthenticatedRevenueCatWebhook(
      req,
      res,
      REVENUECAT_WEBHOOK_AUTH.value().trim(),
    );
  },
);

export const __revenueCatWebhookTestHooks = {
  candidateUserIds,
  premiumAuthoritativeUserIds,
  resolvePremiumOwnerRef,
  resolveCanonicalDonorUid,
  isRevenueCatAnonymousId,
  looksLikePremiumSubscription,
  premiumPlanFromEvent,
  paidAccessAchievementGrant,
  prioritizeUserCandidates,
  stableCandidateUserIds,
  transferTargetIds,
  transferSourceIds,
  revenueCatLifecycleReasonFields,
  handleTransferEvent,
  deriveAuthenticatedOriginalEvidence,
  // D103/D136/D139: снятые товары (жемчуг, минуты и подписка MAX) — только лог-отказ.
  retiredProductFamily,
  handleRetiredProductEvent,
  qualifyReferralFromVerifiedPremiumOutcome,
};
