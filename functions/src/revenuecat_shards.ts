import * as admin from 'firebase-admin';
import { createHash } from 'crypto';
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

const REGION = 'us-central1';
const REVENUECAT_WEBHOOK_AUTH = defineSecret('REVENUECAT_WEBHOOK_AUTH');

const SHARD_PACKS_BY_PRODUCT_ID: Record<string, { packId: string; shards: number }> = {
  phraseman_shards_30: { packId: 'starter', shards: 35 },
  phraseman_shards_80: { packId: 'popular', shards: 92 },
  phraseman_shards_180: { packId: 'value', shards: 210 },
  phraseman_shards_420: { packId: 'pro', shards: 500 },
};

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

function authMatches(header: string | undefined, expected: string): boolean {
  const value = String(header ?? '').trim();
  if (!value) return false;
  return value === expected || value.toLowerCase() === `bearer ${expected}`.toLowerCase();
}

function parseShards(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
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
  return /^phraseman_premium_(monthly|yearly)(?:_[0-9]{1,6})?$/.test(productId)
    || productId === 'phraseman_premium_lifetime_v1';
}

function premiumPlanFromEvent(event: RevenueCatEvent): 'monthly' | 'yearly' | 'lifetime' {
  const productId = cleanId(event.product_id).toLowerCase();
  if (/lifetime|forever|one.?time|onetime|perpetual/.test(productId)) return 'lifetime';
  if (/year|yearly|annual|12.?month/.test(productId)) return 'yearly';
  return 'monthly';
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

async function handlePremiumSubscriptionEvent(
  event: RevenueCatEvent,
  eventType: string,
  productId: string,
  res: any,
): Promise<void> {
  const normalized = normalizePremiumLineageEvent(event as Record<string, unknown>);
  if (normalized.status === 'quarantine') {
    try {
      await writePremiumDenialReceipt(
        event,
        `quarantine_${normalized.rawFingerprint}`,
        normalized.reason,
        { rawFingerprint: normalized.rawFingerprint },
      );
      res.status(202).json({ ok: true, kind: 'premium', quarantined: true, reason: normalized.reason });
    } catch (error) {
      logger.error('revenuecat_premium_quarantine_failed', error);
      res.status(500).send('Internal error');
    }
    return;
  }

  const canonicalEvent = normalized.event;
  const boundedCandidates = boundPremiumOwnerCandidates(premiumAuthoritativeUserIds(event));
  if (boundedCandidates.status === 'quarantine') {
    try {
      await writePremiumDenialReceipt(
        event,
        premiumReceiptDocId(canonicalEvent.eventId),
        boundedCandidates.reason,
        { fingerprint: canonicalEvent.fingerprint },
      );
      res.status(202).json({ ok: true, kind: 'premium', quarantined: true, reason: boundedCandidates.reason });
    } catch (error) {
      logger.error('revenuecat_premium_candidate_quarantine_failed', error);
      res.status(500).send('Internal error');
    }
    return;
  }
  const candidates = boundedCandidates.candidates;
  if (candidates.length === 0) {
    const hasAnonymousIdentity = [event.app_user_id, event.original_app_user_id]
      .some(isRevenueCatAnonymousId);
    const reason = hasAnonymousIdentity ? 'ambiguous_anonymous_owner' : 'missing_authoritative_owner';
    try {
      await writePremiumDenialReceipt(
        event,
        premiumReceiptDocId(canonicalEvent.eventId),
        reason,
        {
          fingerprint: canonicalEvent.fingerprint,
          evidenceCandidates: candidateUserIds(event),
        },
      );
      res.status(202).json({ ok: true, kind: 'premium', quarantined: true, reason });
    } catch (error) {
      logger.error('revenuecat_premium_owner_quarantine_failed', error);
      res.status(500).send('Internal error');
    }
    return;
  }
  const db = admin.firestore();
  const receiptId = premiumReceiptDocId(canonicalEvent.eventId);
  const processedRef = db.collection('revenuecat_premium_events').doc(receiptId);
  const denialRef = db.collection('revenuecat_premium_denials').doc(receiptId);

  try {
    const out = await db.runTransaction(async (tx) => {
      // All denial/idempotency/deletion reads happen before any user, lineage,
      // projection, or receipt write in this transaction.
      const processedSnap = await tx.get(processedRef);
      const denialSnap = await tx.get(denialRef);
      const permanentDenialSnapshots = await readPermanentDeletionDenials(tx, db, candidates);
      const deletionSnapshots: FirebaseFirestore.DocumentSnapshot[] = [];
      for (const candidate of candidates) {
        deletionSnapshots.push(await tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(candidate)));
        deletionSnapshots.push(await tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(candidate)));
      }

      if (denialSnap.exists) {
        return { updated: false, reason: 'denied_receipt_exists' as const };
      }
      if (processedSnap.exists) {
        const replay = receiptReplayDecision(processedSnap.data() ?? {}, canonicalEvent);
        if (replay === 'duplicate') return { updated: false, reason: 'duplicate' as const };
        tx.set(denialRef, {
          reason: 'event_id_fingerprint_conflict',
          eventId: canonicalEvent.eventId,
          fingerprint: canonicalEvent.fingerprint,
          existingFingerprint: cleanId(processedSnap.data()?.fingerprint),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { updated: false, reason: 'event_id_fingerprint_conflict' as const };
      }
      if ([...deletionSnapshots, ...permanentDenialSnapshots].some((snapshot) => snapshot.exists)) {
        tx.set(denialRef, {
          reason: 'account_deletion_pending_or_tombstoned',
          eventId: canonicalEvent.eventId,
          fingerprint: canonicalEvent.fingerprint,
          candidates,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { updated: false, reason: 'account_deletion_pending_or_tombstoned' as const };
      }
      if (candidates.length === 0) {
        tx.set(denialRef, {
          reason: 'missing_user_candidate',
          eventId: canonicalEvent.eventId,
          fingerprint: canonicalEvent.fingerprint,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { updated: false, reason: 'missing_user_candidate' as const };
      }

      const ownerResolution = await resolvePremiumOwnerRef(tx, db, candidates);
      if (ownerResolution.status !== 'resolved') {
        tx.set(denialRef, {
          reason: ownerResolution.reason,
          eventId: canonicalEvent.eventId,
          fingerprint: canonicalEvent.fingerprint,
          candidates,
          ...(ownerResolution.status === 'ambiguous' ? { ownerUids: ownerResolution.ownerUids } : {}),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { updated: false, reason: ownerResolution.reason };
      }

      const { uid, ref: userRef, snap: userSnap } = ownerResolution;
      const canonicalDeletionSnapshots = [
        await tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(uid)),
        await tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(uid)),
        ...(await readPermanentDeletionDenials(tx, db, [uid])),
      ];
      if (canonicalDeletionSnapshots.some((snapshot) => snapshot.exists)) {
        tx.set(denialRef, {
          reason: 'account_deletion_pending_or_tombstoned',
          eventId: canonicalEvent.eventId,
          fingerprint: canonicalEvent.fingerprint,
          candidates,
          ownerUid: uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { updated: false, reason: 'account_deletion_pending_or_tombstoned' as const };
      }
      const lineageQuery = db.collection('revenuecat_premium_lineages')
        .where('ownerUid', '==', uid)
        .limit(MAX_OWNER_LINEAGES + 1);
      const lineageSnapshot = await tx.get(lineageQuery);
      const existingLineages = lineageSnapshot.docs.map((doc) => doc.data() as PremiumLineageState & { ownerUid?: string });
      const currentLineage = existingLineages.find((lineage) => lineage.lineageHash === canonicalEvent.lineageHash) ?? null;
      if (!currentLineage && existingLineages.length >= MAX_OWNER_LINEAGES) {
        tx.set(denialRef, {
          reason: 'owner_lineage_limit',
          ownerUid: uid,
          eventId: canonicalEvent.eventId,
          fingerprint: canonicalEvent.fingerprint,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { updated: false, reason: 'owner_lineage_limit' as const };
      }

      const reduced = applyPremiumLineageEvent(currentLineage, canonicalEvent);
      const progress = (userSnap.data()?.progress ?? {}) as Record<string, unknown>;
      const receipt = {
        uid,
        candidates,
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
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const projectedLineages = existingLineages
        .filter((lineage) => lineage.lineageHash !== reduced.state.lineageHash)
        .concat(reduced.state);
      const aggregate = aggregatePremiumLineages(projectedLineages, progress, Date.now());
      const lineageRef = db.collection('revenuecat_premium_lineages')
        .doc(premiumLineageDocId(uid, canonicalEvent.lineageHash));
      tx.set(lineageRef, {
        ownerUid: uid,
        ...reduced.state,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: false });
      tx.set(processedRef, receipt);
      tx.set(userRef, {
        progress: aggregate.progressPatch,
        updatedAt: Date.now(),
        last_active_at: Date.now(),
      }, { merge: true });

      return {
        updated: reduced.status === 'applied',
        ...(reduced.status === 'stale' ? { reason: 'stale_event' as const } : {}),
        uid,
        active: aggregate.winnerLineageHash !== undefined,
        aggregateStatus: aggregate.status,
        winnerLineageHash: aggregate.winnerLineageHash ?? null,
      };
    });

    res.status(200).json({ ok: true, kind: 'premium', ...out });
  } catch (error) {
    logger.error('revenuecat_premium_lineage_webhook_failed', error);
    res.status(500).send('Internal error');
  }
}

async function handleShardPurchaseEvent(
  event: RevenueCatEvent,
  eventType: string,
  productId: string,
  pack: { packId: string; shards: number },
  res: any,
): Promise<void> {
  // REFUND consumable-покупки осколков обрабатывается отдельно: ищем оригинальную
  // транзакцию начисления и списываем ровно ту сумму, что была начислена (не из
  // pack — RC шлёт REFUND с тем же product_id, но идемпотентность ведём по
  // original_transaction_id оригинальной покупки).
  if (eventType === 'REFUND') {
    await handleShardRefundEvent(event, productId, res);
    return;
  }
  if (eventType !== 'NON_RENEWING_PURCHASE') {
    res.status(200).json({ ok: true, ignored: 'not_non_renewing_purchase' });
    return;
  }

  const transactionId = cleanId(event.transaction_id || event.original_transaction_id || event.id);
  const boundedCandidates = boundPremiumOwnerCandidates(candidateUserIds(event));
  if (boundedCandidates.status === 'quarantine') {
    res.status(202).json({ ok: true, kind: 'shards', quarantined: true, reason: boundedCandidates.reason });
    return;
  }
  const candidates = boundedCandidates.candidates;
  if (!transactionId || candidates.length === 0) {
    res.status(400).send('Missing transaction_id or app_user_id');
    return;
  }

  const db = admin.firestore();
  const processedRef = db.collection('revenuecat_shard_transactions').doc(transactionId);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  try {
    const out = await db.runTransaction(async (tx) => {
      const processedSnap = await tx.get(processedRef);
      const permanentDenialSnapshots = await readPermanentDeletionDenials(tx, db, candidates);
      const deletionSnapshots: FirebaseFirestore.DocumentSnapshot[] = [];
      for (const candidate of candidates) {
        deletionSnapshots.push(await tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(candidate)));
        deletionSnapshots.push(await tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(candidate)));
      }
      if (processedSnap.exists) {
        return { granted: false, reason: 'duplicate' as const };
      }
      if ([...deletionSnapshots, ...permanentDenialSnapshots].some((snapshot) => snapshot.exists)) {
        return { granted: false, reason: 'account_deletion_pending_or_permanent' as const };
      }

      const match = await resolvePremiumOwnerRef(tx, db, candidates);
      if (match.status !== 'resolved') {
        return {
          granted: false,
          reason: match.reason,
          retryable: match.status === 'missing',
        };
      }

      const { uid, ref: userRef, snap: userSnap } = match;
      const canonicalDeletionSnapshots = [
        await tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(uid)),
        await tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(uid)),
        ...(await readPermanentDeletionDenials(tx, db, [uid])),
      ];
      if (canonicalDeletionSnapshots.some((snapshot) => snapshot.exists)) {
        return { granted: false, reason: 'account_deletion_pending_or_permanent' as const };
      }
      const before = parseShards(userSnap.data()?.shards);
      const after = before + pack.shards;

      tx.set(processedRef, {
        uid,
        productId,
        packId: pack.packId,
        shards: pack.shards,
        eventId: cleanId(event.id),
        eventType,
        store: cleanId(event.store),
        environment: cleanId(event.environment),
        purchasedAtMs: eventMs(event.purchased_at_ms),
        eventTimestampMs: eventMs(event.event_timestamp_ms),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.update(userRef, {
        shards: after,
        shards_updated_at_ms: now,
        shards_updated_op: 'earn',
        shards_updated_reason: 'shards_store_purchase',
        updatedAt: now,
      });

      tx.set(userRef.collection('shard_log').doc(), {
        ts: nowIso,
        type: 'earn',
        amount: pack.shards,
        reason: 'shards_store_purchase',
        productId,
        packId: pack.packId,
        revenueCatTransactionId: transactionId,
        balanceBefore: before,
        balanceAfter: after,
      });

      return { granted: true, balanceAfter: after };
    });

    if (out.retryable) {
      res.status(503).json({ ok: false, kind: 'shards', ...out });
      return;
    }
    res.status(200).json({ ok: true, kind: 'shards', ...out });
  } catch (error) {
    logger.error('revenuecat_shards_webhook_failed', error);
    res.status(500).send('Internal error');
  }
}

/**
 * REFUND осколков (consumable). Раньше REFUND-вебхуки для shard-продуктов отдавали
 * 200 ignored — пользователь возвращал деньги, но осколки оставались. Прямая утечка
 * дохода: за возвращённую покупку он мог тратить осколки на премиум-наборы.
 *
 * Логика: идемпотентность по eventId; находим оригинальную транзакцию начисления
 * в `revenuecat_shard_transactions` по original_transaction_id (или transaction_id);
 * если уже размечена как рефанд — не списываем повторно; иначе уменьшаем баланс на
 * ту сумму, что была начислена (clamp на 0 — баланс не уходит в минус), пишем
 * `shards_refund_marker` и запись в shard_log.
 */
async function handleShardRefundEvent(
  event: RevenueCatEvent,
  productId: string,
  res: any,
): Promise<void> {
  const originalTxId = cleanId(event.original_transaction_id || event.transaction_id);
  const eventId = cleanId(event.id);
  const refundEventTimeMs = eventMs(event.event_timestamp_ms);
  if (!originalTxId || !eventId || refundEventTimeMs === null) {
    res.status(400).send('Missing immutable REFUND identity');
    return;
  }
  const db = admin.firestore();
  const refundRef = db.collection('revenuecat_shard_refunds').doc(eventId);
  const originalRef = db.collection('revenuecat_shard_transactions').doc(originalTxId);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();

  try {
    const out = await db.runTransaction(async (tx) => {
      const refundSnap = await tx.get(refundRef);
      if (refundSnap.exists) {
        return { refunded: false, reason: 'duplicate' as const };
      }

      const originalSnap = await tx.get(originalRef);
      if (!originalSnap.exists) {
        // Нет оригинала — невозможно знать, сколько списывать. Маркируем рефанд как
        // обработанный, чтобы повторные доставки не висели, и логируем для аудита.
        tx.set(refundRef, {
          eventId,
          originalTransactionId: originalTxId,
          productId,
          reason: 'original_not_found',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { refunded: false, reason: 'original_not_found' as const };
      }

      const original = originalSnap.data() ?? {};
      const refundedAlready = original.refundedAt != null;
      if (refundedAlready) {
        tx.set(refundRef, {
          eventId,
          originalTransactionId: originalTxId,
          productId,
          reason: 'already_refunded',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { refunded: false, reason: 'already_refunded' as const };
      }

      const uid = cleanId(original.uid);
      const grantedShards = parseShards(original.shards);
      if (!uid || grantedShards <= 0) {
        tx.set(refundRef, {
          eventId,
          originalTransactionId: originalTxId,
          productId,
          reason: 'invalid_original',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { refunded: false, reason: 'invalid_original' as const };
      }

      const ownerResolution = await resolvePremiumOwnerRef(tx, db, [uid]);
      if (ownerResolution.status !== 'resolved') {
        return { refunded: false, reason: ownerResolution.reason, retryable: true };
      }
      const { uid: canonicalUid, ref: userRef, snap: userSnap } = ownerResolution;
      const permanentDenialSnapshots = await readPermanentDeletionDenials(tx, db, [uid, canonicalUid]);
      const deletionSnapshots = [
        await tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(uid)),
        await tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(uid)),
        await tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(canonicalUid)),
        await tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(canonicalUid)),
      ];
      if ([...deletionSnapshots, ...permanentDenialSnapshots].some((snapshot) => snapshot.exists)) {
        tx.set(refundRef, {
          eventId,
          originalTransactionId: originalTxId,
          productId,
          uidHash: createHash('sha256').update(canonicalUid).digest('hex'),
          reason: 'account_deletion_pending_or_permanent',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { refunded: false, reason: 'account_deletion_pending_or_permanent' as const };
      }
      if (!userSnap.exists) {
        return { refunded: false, reason: 'missing_user_retryable' as const, retryable: true };
      }
      const before = parseShards(userSnap.data()?.shards);
      // Clamp на 0 — пользователь мог потратить часть/все осколки до рефанда.
      // Бухгалтерски корректнее иначе (минус-баланс), но в текущей системе
      // отрицательные осколки нигде не предусмотрены и поломают UI/гейты.
      const after = Math.max(0, before - grantedShards);
      const actuallyDeducted = before - after;

      tx.set(refundRef, {
        eventId,
        originalTransactionId: originalTxId,
        productId,
        uid: canonicalUid,
        sourceUid: uid,
        grantedShards,
        balanceBefore: before,
        balanceAfter: after,
        actuallyDeducted,
        environment: cleanId(event.environment),
        store: cleanId(event.store),
        eventTimestampMs: eventMs(event.event_timestamp_ms),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.update(originalRef, {
        uid: canonicalUid,
        refundedAt: now,
        refundEventId: eventId,
        refundedShards: actuallyDeducted,
      });

      tx.update(userRef, {
        shards: after,
        shards_updated_at_ms: now,
        shards_updated_op: 'spend',
        shards_updated_reason: 'shards_store_refund',
        updatedAt: now,
      });

      tx.set(userRef.collection('shard_log').doc(), {
        ts: nowIso,
        type: 'spend',
        amount: actuallyDeducted,
        reason: 'shards_store_refund',
        productId,
        revenueCatOriginalTransactionId: originalTxId,
        revenueCatRefundEventId: eventId,
        grantedShards,
        balanceBefore: before,
        balanceAfter: after,
      });

      return { refunded: true, deducted: actuallyDeducted, balanceAfter: after };
    });

    if (out.retryable) {
      res.status(503).json({ ok: false, kind: 'shards_refund', ...out });
      return;
    }
    res.status(200).json({ ok: true, kind: 'shards_refund', ...out });
  } catch (error) {
    logger.error('revenuecat_shards_refund_webhook_failed', error);
    res.status(500).send('Internal error');
  }
}

// ── TRANSFER: anonymous → stable_id entitlement move (closes the "premium written
//    to an anonymous RC id" gap, scenario #13). When a purchase happened before
//    Purchases.logIn(stable_id), premium landed on users/{$RCAnonymousID}. After
//    login RevenueCat fires TRANSFER with transferred_from (anon ids) → transferred_to
//    (the stable_id). We move any premium block to the recipient and deactivate the
//    donor, so the paying user sees premium on their real account. ────────────────

const PREMIUM_PROGRESS_KEYS = [
  'premium_plan',
  'premium_expiry',
  'premium_rc_product_id',
  'premium_rc_period_type',
  'premium_rc_store',
  'premium_rc_environment',
  'premium_rc_event_type',
  'premium_rc_updated_at',
  'premium_rc_expiry_ms',
  'premium_rc_purchased_at_ms',
  'premium_rc_cancelled_at',
  'had_premium_ever',
] as const;

function idList(raw: unknown): string[] {
  const out = new Set<string>();
  for (const v of Array.isArray(raw) ? raw : []) {
    const id = cleanId(v);
    if (id) out.add(id);
  }
  return [...out];
}

/** Recipients of a transfer: prefer stable (non-anonymous) ids. */
export function transferTargetIds(event: RevenueCatEvent): string[] {
  return stableCandidateUserIds(idList(event.transferred_to));
}

/** Donors of a transfer (the ids losing the entitlement). */
export function transferSourceIds(event: RevenueCatEvent): string[] {
  return idList(event.transferred_from);
}

/** Reads the active store-premium block from a donor doc, if any. */
function readDonorPremiumBlock(progress: Record<string, unknown>, now: number): Record<string, string> | null {
  const plan = cleanId(progress.premium_plan).toLowerCase();
  // Lifetime — это законный store-план (NON_RENEWING_PURCHASE phraseman_premium_lifetime_v1,
  // см. premiumPlanFromEvent). Без него TRANSFER от анонимного RC-id (купил «Навсегда»
  // до Purchases.logIn) возвращал null → доступ исчезал у реального аккаунта после логина.
  const isStorePlan = plan === 'monthly' || plan === 'yearly' || plan === 'annual' || plan === 'lifetime';
  if (!isStorePlan) return null;
  const expiryMs = eventMs(progress.premium_expiry);
  const rcExpiryMs = eventMs(progress.premium_rc_expiry_ms);
  // Lifetime по определению бессрочный (premium_expiry='0'), так что отдельный guard:
  // в общем случае активность = expiry открытый или ещё впереди.
  const active = plan === 'lifetime'
    || (expiryMs == null || expiryMs <= 0 || expiryMs > now)
    || (rcExpiryMs != null && rcExpiryMs > now);
  if (!active) return null;
  const block: Record<string, string> = {};
  for (const key of PREMIUM_PROGRESS_KEYS) {
    const v = cleanId(progress[key]);
    if (v) block[key] = v;
  }
  block.premium_plan = plan === 'annual' ? 'yearly' : plan;
  block.had_premium_ever = '1';
  return block;
}

function premiumProjectionStrength(progress: Record<string, unknown>): number {
  const plan = cleanId(progress.premium_plan).toLowerCase();
  if (plan === 'lifetime') return Number.POSITIVE_INFINITY;
  if (plan !== 'monthly' && plan !== 'yearly' && plan !== 'annual') return 0;
  const expiryMs = eventMs(progress.premium_expiry);
  const rcExpiryMs = eventMs(progress.premium_rc_expiry_ms);
  const finiteExpiry = Math.max(expiryMs ?? 0, rcExpiryMs ?? 0);
  return finiteExpiry > 0 ? finiteExpiry : Number.POSITIVE_INFINITY;
}

function preferredLegacyPremiumBlock(
  left: Record<string, string> | null,
  right: Record<string, string> | null,
): Record<string, string> | null {
  if (!left) return right;
  if (!right) return left;
  const leftStrength = premiumProjectionStrength(left);
  const rightStrength = premiumProjectionStrength(right);
  if (leftStrength !== rightStrength) return leftStrength > rightStrength ? left : right;
  return JSON.stringify(left) <= JSON.stringify(right) ? left : right;
}

async function handleTransferEvent(event: RevenueCatEvent, eventType: string, res: any): Promise<void> {
  const boundedTargets = boundPremiumOwnerCandidates(transferTargetIds(event));
  const boundedSources = boundPremiumOwnerCandidates(transferSourceIds(event));
  if (boundedTargets.status === 'quarantine' || boundedSources.status === 'quarantine') {
    res.status(202).json({ ok: true, kind: 'transfer', quarantined: true, reason: 'transfer_identity_overflow' });
    return;
  }
  const targets = boundedTargets.candidates;
  const sources = boundedSources.candidates;
  if (targets.length === 0 || sources.length === 0) {
    res.status(200).json({ ok: true, kind: 'transfer', ignored: 'missing_transfer_ids' });
    return;
  }

  const eventId = cleanId(event.id);
  const transferEventTimeMs = eventMs(event.event_timestamp_ms);
  if (!eventId || transferEventTimeMs === null) {
    res.status(400).send('Missing immutable TRANSFER identity');
    return;
  }
  if (eventId.length > 256 || eventId.includes('/')) {
    res.status(400).send('Missing immutable TRANSFER identity');
    return;
  }

  const db = admin.firestore();
  const now = Date.now();
  const processedRef = db.collection('revenuecat_premium_events').doc(eventId);
  const denialRef = db.collection('revenuecat_premium_denials').doc(`transfer_${createHash('sha256').update(eventId).digest('hex')}`);

  try {
    const out = await db.runTransaction(async (tx) => {
      const processedSnap = await tx.get(processedRef);
      const denialSnap = await tx.get(denialRef);
      if (processedSnap.exists) return { moved: false, reason: 'duplicate' as const };
      if (denialSnap.exists) return { moved: false, reason: 'denied_receipt_exists' as const };

      const canonicalSourceSet = new Set<string>();
      for (const sourceId of sources) {
        const canonicalSource = await resolveCanonicalDonorUid(tx, db, sourceId);
        if (canonicalSource.status !== 'resolved') {
          return { moved: false, reason: canonicalSource.reason, retryable: true };
        }
        canonicalSourceSet.add(canonicalSource.uid);
      }
      const canonicalSourceIds = [...canonicalSourceSet];
      const transferIdentities = [...new Set([...targets, ...sources, ...canonicalSourceIds])];
      const permanentDenialSnapshots = await readPermanentDeletionDenials(tx, db, transferIdentities);
      const operationalDeletionSnapshots: FirebaseFirestore.DocumentSnapshot[] = [];
      for (const identity of transferIdentities) {
        operationalDeletionSnapshots.push(await tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(identity)));
        operationalDeletionSnapshots.push(await tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(identity)));
      }
      if ([...permanentDenialSnapshots, ...operationalDeletionSnapshots].some((snapshot) => snapshot.exists)) {
        tx.set(denialRef, {
          reason: 'account_deletion_pending_or_permanent',
          eventId,
          eventType,
          identityHashes: transferIdentities.map((identity) => createHash('sha256').update(identity).digest('hex')),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { moved: false, reason: 'account_deletion_pending_or_permanent' as const, retryable: false };
      }

      const ownerResolution = await resolvePremiumOwnerRef(tx, db, targets);
      if (ownerResolution.status !== 'resolved') {
        return {
          moved: false,
          reason: ownerResolution.reason,
          retryable: true,
        };
      }
      const { uid: recipientId, ref: recipientRef, snap: recipientSnap } = ownerResolution;
      const canonicalDonorIds = canonicalSourceIds.filter((sourceId) => sourceId !== recipientId);
      const canonicalDeletionSnapshots = [
        await tx.get(db.collection(ACCOUNT_DELETE_TOMBSTONES).doc(recipientId)),
        await tx.get(db.collection(ACCOUNT_DELETE_AUTH_MARKERS).doc(recipientId)),
        ...(await readPermanentDeletionDenials(tx, db, [recipientId])),
      ];
      if (canonicalDeletionSnapshots.some((snapshot) => snapshot.exists)) {
        tx.set(denialRef, {
          reason: 'account_deletion_pending_or_permanent',
          eventId,
          eventType,
          ownerUidHash: createHash('sha256').update(recipientId).digest('hex'),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { moved: false, reason: 'account_deletion_pending_or_permanent' as const, retryable: false };
      }

      const recipientLineageQuery = db.collection('revenuecat_premium_lineages')
        .where('ownerUid', '==', recipientId)
        .limit(MAX_OWNER_LINEAGES + 1);
      const donorLineageDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
      if (canonicalDonorIds.length > 0) {
        const donorLineageQuery = db.collection('revenuecat_premium_lineages')
          .where('ownerUid', 'in', canonicalDonorIds)
          .limit(MAX_OWNER_LINEAGES + 1);
        const donorLineageSnapshot = await tx.get(donorLineageQuery);
        donorLineageDocs.push(...donorLineageSnapshot.docs);
      }
      const recipientLineageSnapshot = await tx.get(recipientLineageQuery);
      if (donorLineageDocs.length > MAX_OWNER_LINEAGES
        || recipientLineageSnapshot.docs.length > MAX_OWNER_LINEAGES) {
        tx.set(denialRef, {
          reason: 'transfer_lineage_limit',
          eventId,
          eventType,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { moved: false, reason: 'transfer_lineage_limit' as const, retryable: false };
      }

      const donorUsers: Array<{ id: string; ref: FirebaseFirestore.DocumentReference; snap: FirebaseFirestore.DocumentSnapshot }> = [];
      for (const sourceId of canonicalDonorIds) {
        const ref = db.collection('users').doc(sourceId);
        const snap = await tx.get(ref);
        if (snap.exists) donorUsers.push({ id: sourceId, ref, snap });
      }

      const recipientProgress = (recipientSnap.data()?.progress ?? {}) as Record<string, unknown>;
      const recipientLineageByHash = new Map<string, {
        targetRef: FirebaseFirestore.DocumentReference;
        state: PremiumLineageState;
        obsoleteRefs: FirebaseFirestore.DocumentReference[];
      }>();
      for (const lineage of recipientLineageSnapshot.docs) {
        const state = lineage.data() as PremiumLineageState & { ownerUid?: string };
        const targetRef = db.collection('revenuecat_premium_lineages')
          .doc(premiumLineageDocId(recipientId, state.lineageHash));
        const existing = recipientLineageByHash.get(state.lineageHash);
        recipientLineageByHash.set(state.lineageHash, {
          targetRef,
          state: existing ? chooseAuthoritativePremiumLineageState(existing.state, state) : state,
          obsoleteRefs: [
            ...(existing?.obsoleteRefs ?? []),
            ...(lineage.ref.path === targetRef.path ? [] : [lineage.ref]),
          ],
        });
      }
      for (const lineage of donorLineageDocs) {
        const state = lineage.data() as PremiumLineageState & { ownerUid?: string };
        const existing = recipientLineageByHash.get(state.lineageHash);
        const selected = existing ? chooseAuthoritativePremiumLineageState(existing.state, state) : state;
        const targetRef = existing?.targetRef ?? db.collection('revenuecat_premium_lineages')
          .doc(premiumLineageDocId(recipientId, state.lineageHash));
        recipientLineageByHash.set(state.lineageHash, {
          targetRef,
          state: selected,
          obsoleteRefs: [
            ...(existing?.obsoleteRefs ?? []),
            ...(lineage.ref.path === targetRef.path ? [] : [lineage.ref]),
          ],
        });
      }
      const recipientLineages = [...recipientLineageByHash.values()].map(({ state }) => state);
      if (recipientLineages.length > MAX_OWNER_LINEAGES) {
        tx.set(denialRef, {
          reason: 'owner_lineage_limit',
          eventId,
          eventType,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { moved: false, reason: 'owner_lineage_limit' as const, retryable: false };
      }

      const aggregate = aggregatePremiumLineages(recipientLineages, recipientProgress, now);
      let legacyPremiumBlock: Record<string, string> | null = null;
      for (const donor of donorUsers) {
        const donorProgress = (donor.snap.data()?.progress ?? {}) as Record<string, unknown>;
        legacyPremiumBlock = preferredLegacyPremiumBlock(
          legacyPremiumBlock,
          readDonorPremiumBlock(donorProgress, now),
        );
      }
      const movedPremium = donorLineageDocs.length > 0 || legacyPremiumBlock !== null;
      const targetLegacyPremium = readDonorPremiumBlock(recipientProgress, now);
      const aggregateStrength = premiumProjectionStrength(aggregate.progressPatch);
      const targetLegacyIsStronger = targetLegacyPremium !== null
        && premiumProjectionStrength(recipientProgress) >= aggregateStrength;
      const projectedProgress = targetLegacyIsStronger
        ? recipientProgress
        : recipientLineages.length > 0
        ? aggregate.progressPatch
        : !targetLegacyPremium && legacyPremiumBlock
          ? { ...recipientProgress, ...legacyPremiumBlock }
          : recipientProgress;

      tx.set(processedRef, {
        eventId,
        eventType,
        eventTimestampMs: transferEventTimeMs,
        transferredFrom: sources,
        transferredTo: targets,
        donorIds: donorUsers.map((donor) => donor.id),
        recipientId,
        movedPremium,
        movedLineages: donorLineageDocs.length,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      for (const lineage of recipientLineageByHash.values()) {
        tx.set(lineage.targetRef, {
          ...lineage.state,
          ownerUid: recipientId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: false });
        for (const obsoleteRef of lineage.obsoleteRefs) {
          tx.delete(obsoleteRef);
        }
      }
      tx.update(recipientRef, {
        progress: {
          ...projectedProgress,
          ...(movedPremium ? { premium_rc_event_type: 'TRANSFER', premium_rc_updated_at: String(now) } : {}),
        },
        updatedAt: now,
        last_active_at: now,
      });

      for (const donor of donorUsers) {
        if (donor.id === recipientId) continue;
        const donorProgress = (donor.snap.data()?.progress ?? {}) as Record<string, unknown>;
        if (!readDonorPremiumBlock(donorProgress, now)) continue;
        tx.update(donor.ref, {
          progress: {
            premium_plan: '',
            premium_expiry: String(now),
            premium_rc_active_lineage: '',
            premium_rc_event_type: 'TRANSFER_OUT',
            premium_rc_updated_at: String(now),
          },
          updatedAt: now,
        });
      }

      return {
        moved: movedPremium,
        ...(movedPremium ? {} : { reason: 'no_active_donor_premium' as const }),
        recipientId,
        donorIds: donorUsers.map((donor) => donor.id),
      };
    });

    if (out.retryable) {
      res.status(503).json({ ok: false, kind: 'transfer', ...out });
      return;
    }
    res.status(200).json({ ok: true, kind: 'transfer', ...out });
  } catch (error) {
    logger.error('revenuecat_transfer_webhook_failed', error);
    res.status(500).send('Internal error');
  }
}

export const revenueCatShardsWebhook = onRequest({ region: REGION, secrets: [REVENUECAT_WEBHOOK_AUTH] }, async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
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

  const expectedAuth = REVENUECAT_WEBHOOK_AUTH.value().trim();
  if (!expectedAuth || !authMatches(req.headers.authorization, expectedAuth)) {
    res.status(401).send('Unauthorized');
    return;
  }

  // Sandbox-события (TestFlight / sandbox App Store / Play Console testing) НЕ
  // должны изменять production Firestore: иначе тестер получает реальный premium
  // на бою, а sandbox-«покупка» осколков зачисляет настоящую валюту.
  if (isSandboxEvent(event)) {
    logger.info('revenuecat_webhook_sandbox_ignored', { eventType, productId, environment: cleanId(event.environment) });
    res.status(200).json({ ok: true, ignored: 'sandbox_environment', environment: cleanId(event.environment) });
    return;
  }

  // TRANSFER moves entitlements between app_user_ids (anonymous → stable_id after
  // login). It carries no product_id, so handle it before the premium/shard routing.
  if (eventType === 'TRANSFER') {
    await handleTransferEvent(event, eventType, res);
    return;
  }

  const pack = SHARD_PACKS_BY_PRODUCT_ID[productId];
  const premium = looksLikePremiumSubscription(event);
  if (!pack && !premium) {
    res.status(200).json({ ok: true, ignored: 'not_managed_product' });
    return;
  }

  if (premium) {
    await handlePremiumSubscriptionEvent(event, eventType, productId, res);
    return;
  }

  await handleShardPurchaseEvent(event, eventType, productId, pack, res);
});

export const __revenueCatWebhookTestHooks = {
  candidateUserIds,
  premiumAuthoritativeUserIds,
  resolvePremiumOwnerRef,
  resolveCanonicalDonorUid,
  isRevenueCatAnonymousId,
  looksLikePremiumSubscription,
  premiumPlanFromEvent,
  prioritizeUserCandidates,
  stableCandidateUserIds,
  transferTargetIds,
  transferSourceIds,
  revenueCatLifecycleReasonFields,
  handleTransferEvent,
  handlePremiumSubscriptionEvent,
  handleShardRefundEvent,
};
