import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { defineSecret } from 'firebase-functions/params';

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
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
  'TEMPORARY_ENTITLEMENT_GRANT',
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
  const offeringId = cleanId(event.presented_offering_id).toLowerCase();
  const entitlements = entitlementIds(event);

  if (entitlements.includes('premium')) return true;
  if (/premium|monthly|month|yearly|annual|subscription|sub/.test(productId)) return true;
  return /premium|subscription|sub/.test(offeringId);
}

function premiumPlanFromEvent(event: RevenueCatEvent): 'monthly' | 'yearly' {
  const productId = cleanId(event.product_id).toLowerCase();
  if (/year|yearly|annual|12.?month/.test(productId)) return 'yearly';
  return 'monthly';
}

function eventMs(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
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
  return { uid, ref, snap };
}

async function handlePremiumSubscriptionEvent(
  event: RevenueCatEvent,
  eventType: string,
  productId: string,
  res: any,
): Promise<void> {
  const candidates = candidateUserIds(event);
  if (candidates.length === 0) {
    res.status(400).send('Missing app_user_id');
    return;
  }

  const transactionId = cleanId(
    event.transaction_id ||
    event.original_transaction_id ||
    event.id ||
    `${eventType}_${event.event_timestamp_ms || Date.now()}_${candidates[0]}`,
  );
  // При RENEWAL event.id уникален для каждого события; если отсутствует —
  // добавляем timestamp чтобы разные RENEWAL одной подписки не коллизировали.
  const eventId = cleanId(event.id)
    || (eventType === 'RENEWAL' || eventType === 'INITIAL_PURCHASE'
        ? `${eventType}_${transactionId}_${event.event_timestamp_ms || Date.now()}`
        : transactionId);
  const expiryMs = eventMs(event.expiration_at_ms);
  const purchasedMs = eventMs(event.purchased_at_ms);
  const now = Date.now();
  const plan = premiumPlanFromEvent(event);
  const periodType = cleanId(event.period_type).toUpperCase();
  const db = admin.firestore();
  const processedRef = db.collection('revenuecat_premium_events').doc(eventId);

  try {
    const out = await db.runTransaction(async (tx) => {
      const processedSnap = await tx.get(processedRef);
      if (processedSnap.exists) {
        return { updated: false, reason: 'duplicate' as const };
      }

      const match = await findExistingUserRef(tx, db, candidates);
      if (!match) {
        return { updated: false, reason: 'missing_user_candidate' as const };
      }

      const { uid, ref: userRef, snap: userSnap } = match;
      const progress = (userSnap.data()?.progress ?? {}) as Record<string, unknown>;
      const progressPlan = cleanId(progress.premium_plan).toLowerCase();
      const adminOverrideValue = cleanId(progress.admin_premium_override).toLowerCase();
      const legacyAdminVip = adminOverrideValue === 'true' || (progressPlan === 'admin_grant' && adminOverrideValue !== 'false');
      const activeEvent = PREMIUM_ACTIVE_EVENTS.has(eventType);
      const keepActiveEvent = PREMIUM_KEEP_ACTIVE_EVENTS.has(eventType);
      const inactiveEvent = PREMIUM_INACTIVE_EVENTS.has(eventType);

      const progressPatch: Record<string, string> = {
        premium_rc_product_id: productId,
        premium_rc_period_type: periodType,
        premium_rc_store: cleanId(event.store).toUpperCase(),
        premium_rc_environment: cleanId(event.environment).toUpperCase(),
        premium_rc_event_type: eventType,
        premium_rc_updated_at: String(now),
      };
      if (expiryMs != null) progressPatch.premium_rc_expiry_ms = String(expiryMs);
      if (purchasedMs != null) progressPatch.premium_rc_purchased_at_ms = String(purchasedMs);

      if (legacyAdminVip) {
        const legacyExpiryMs = eventMs(progress.premium_expiry);
        const legacyGrantAt = cleanId(progress.premium_admin_grant_at) || String(now);
        const legacyActive = legacyExpiryMs == null || legacyExpiryMs > now;
        progressPatch.vip_active = legacyActive ? 'true' : 'false';
        progressPatch.vip_plan = legacyActive ? 'admin_vip' : '';
        progressPatch.vip_from = cleanId(progress.vip_from) || legacyGrantAt;
        progressPatch.vip_until = legacyExpiryMs == null ? '0' : String(legacyExpiryMs);
        progressPatch.vip_admin_override = legacyActive ? 'true' : 'false';
        progressPatch.vip_admin_grant_at = cleanId(progress.vip_admin_grant_at) || legacyGrantAt;
        progressPatch.vip_migrated_from_admin_grant_at = String(now);
        progressPatch.admin_premium_override = 'false';
      }

      if (activeEvent || keepActiveEvent) {
        progressPatch.premium_plan = plan;
        progressPatch.premium_expiry = '0';
        progressPatch.had_premium_ever = '1';
        if (keepActiveEvent) {
          progressPatch.premium_rc_cancelled_at = String(now);
        }
      } else if (inactiveEvent) {
        progressPatch.premium_plan = '';
        progressPatch.premium_expiry = String(expiryMs ?? now);
      }

      tx.set(processedRef, {
        uid,
        candidates,
        productId,
        eventId,
        eventType,
        periodType,
        store: cleanId(event.store),
        environment: cleanId(event.environment),
        transactionId,
        originalTransactionId: cleanId(event.original_transaction_id),
        purchasedAtMs: purchasedMs,
        expirationAtMs: expiryMs,
        eventTimestampMs: eventMs(event.event_timestamp_ms),
        userDocExists: userSnap.exists,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.set(userRef, {
        progress: progressPatch,
        updatedAt: now,
        last_active_at: now,
      }, { merge: true });

      return {
        updated: true,
        uid,
        userDocExists: userSnap.exists,
        active: activeEvent || keepActiveEvent,
        migratedLegacyAdminVip: legacyAdminVip,
      };
    });

    res.status(200).json({ ok: true, kind: 'premium', ...out });
  } catch (error) {
    logger.error('revenuecat_premium_webhook_failed', error);
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
  if (eventType !== 'NON_RENEWING_PURCHASE') {
    res.status(200).json({ ok: true, ignored: 'not_non_renewing_purchase' });
    return;
  }

  const transactionId = cleanId(event.transaction_id || event.original_transaction_id || event.id);
  const candidates = candidateUserIds(event);
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
      if (processedSnap.exists) {
        return { granted: false, reason: 'duplicate' as const };
      }

      const match = await findExistingUserRef(tx, db, candidates);
      if (!match) {
        return { granted: false, reason: 'missing_user_candidate' as const };
      }

      const { uid, ref: userRef, snap: userSnap } = match;
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

      tx.set(userRef, {
        shards: after,
        shards_updated_at_ms: now,
        shards_updated_op: 'earn',
        shards_updated_reason: 'shards_store_purchase',
        updatedAt: now,
      }, { merge: true });

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

    res.status(200).json({ ok: true, kind: 'shards', ...out });
  } catch (error) {
    logger.error('revenuecat_shards_webhook_failed', error);
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
  const isStorePlan = plan === 'monthly' || plan === 'yearly' || plan === 'annual';
  if (!isStorePlan) return null;
  const expiryMs = eventMs(progress.premium_expiry);
  const rcExpiryMs = eventMs(progress.premium_rc_expiry_ms);
  // Active = open-ended (expiry<=0 with rc tracking) or a future expiry.
  const active = (expiryMs == null || expiryMs <= 0 || expiryMs > now) || (rcExpiryMs != null && rcExpiryMs > now);
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

async function handleTransferEvent(event: RevenueCatEvent, eventType: string, res: any): Promise<void> {
  const targets = transferTargetIds(event);
  const sources = transferSourceIds(event);
  if (targets.length === 0 || sources.length === 0) {
    res.status(200).json({ ok: true, kind: 'transfer', ignored: 'missing_transfer_ids' });
    return;
  }

  const db = admin.firestore();
  const now = Date.now();
  const eventId = cleanId(event.id) || `TRANSFER_${event.event_timestamp_ms || now}_${targets[0]}`;
  const processedRef = db.collection('revenuecat_premium_events').doc(eventId);

  try {
    const out = await db.runTransaction(async (tx) => {
      const processedSnap = await tx.get(processedRef);
      if (processedSnap.exists) return { moved: false, reason: 'duplicate' as const };

      // Find a donor doc that actually holds active store premium.
      let premiumBlock: Record<string, string> | null = null;
      let donorId = '';
      for (const src of sources) {
        const snap = await tx.get(db.collection('users').doc(src));
        if (!snap.exists) continue;
        const progress = (snap.data()?.progress ?? {}) as Record<string, unknown>;
        const block = readDonorPremiumBlock(progress, now);
        if (block) { premiumBlock = block; donorId = src; break; }
      }

      // Recipient = first stable target that already has a user doc (the real account).
      let recipientId = '';
      for (const t of targets) {
        const snap = await tx.get(db.collection('users').doc(t));
        if (snap.exists) { recipientId = t; break; }
      }
      if (!recipientId) recipientId = targets[0];

      tx.set(processedRef, {
        eventId,
        eventType,
        transferredFrom: sources,
        transferredTo: targets,
        donorId,
        recipientId,
        movedPremium: !!premiumBlock,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      if (!premiumBlock) return { moved: false, reason: 'no_active_donor_premium' as const, recipientId };

      // Move premium to the recipient.
      tx.set(db.collection('users').doc(recipientId), {
        progress: { ...premiumBlock, premium_rc_event_type: 'TRANSFER', premium_rc_updated_at: String(now) },
        updatedAt: now,
        last_active_at: now,
      }, { merge: true });

      // Deactivate the donor (no dup premium across two docs).
      if (donorId && donorId !== recipientId) {
        tx.set(db.collection('users').doc(donorId), {
          progress: { premium_plan: '', premium_expiry: String(now), premium_rc_event_type: 'TRANSFER_OUT', premium_rc_updated_at: String(now) },
          updatedAt: now,
        }, { merge: true });
      }

      return { moved: true, recipientId, donorId };
    });

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
  isRevenueCatAnonymousId,
  looksLikePremiumSubscription,
  premiumPlanFromEvent,
  prioritizeUserCandidates,
  stableCandidateUserIds,
  transferTargetIds,
  transferSourceIds,
  handleTransferEvent,
};
