import { createHash } from 'crypto';
import type { Firestore, Transaction } from 'firebase-admin/firestore';

export const VOICE_MINUTE_EVENT_COLLECTION = 'voice_minute_events';
export const VOICE_MINUTE_WALLET_COLLECTION = 'voice_minute_wallets';

export const VOICE_MINUTE_PRODUCTS = Object.freeze({
  phraseman_voice_minutes_30: 30 * 60,
  phraseman_voice_minutes_120: 120 * 60,
  phraseman_voice_minutes_300: 300 * 60,
} as const);

export type VoiceMinuteProductId = keyof typeof VOICE_MINUTE_PRODUCTS;
export type VoiceMinuteAccessType = 'trial' | 'paid_minutes' | 'admin';
export type VoiceMinuteEventKind = 'purchase_grant' | 'purchase_refund' | 'admin_grant' | 'call_charge';

interface VoiceMinuteEventBase {
  schemaVersion: 1;
  eventId: string;
  sourceId: string;
  fingerprint: string;
  ownerStableId: string;
  kind: VoiceMinuteEventKind;
  seconds: number;
  occurredAtMs: number;
}

export interface VoiceMinutePurchaseEvent extends VoiceMinuteEventBase {
  kind: 'purchase_grant';
  productId: VoiceMinuteProductId;
  environment: string;
  store: string;
  revenueCatEventId: string;
  originalTransactionId: string;
}

export interface VoiceMinuteRefundEvent extends VoiceMinuteEventBase {
  kind: 'purchase_refund';
  originalEventId: string;
  environment: string;
  store: string;
  revenueCatEventId: string;
  originalTransactionId: string;
}

export interface VoiceMinuteCallChargeEvent extends VoiceMinuteEventBase {
  kind: 'call_charge';
  sessionId: string;
}

export interface VoiceMinuteAdminGrantEvent extends VoiceMinuteEventBase {
  kind: 'admin_grant';
  grantedMinutes: number;
  environment: 'ADMIN';
  actorUid: string;
  requestId: string;
  reason: string;
  comment: string;
}

export type VoiceMinuteEvent =
  | VoiceMinutePurchaseEvent
  | VoiceMinuteRefundEvent
  | VoiceMinuteAdminGrantEvent
  | VoiceMinuteCallChargeEvent;

export interface VoiceMinuteBalance {
  grantedSeconds: number;
  refundedSeconds: number;
  chargedSeconds: number;
  netSeconds: number;
  availableSeconds: number;
}

function cleanRequired(value: unknown, error: string): string {
  const cleaned = String(value ?? '').trim();
  if (!cleaned || cleaned.length > 256 || cleaned.includes('/')) throw new Error(error);
  return cleaned;
}

function cleanOptional(value: unknown): string {
  const cleaned = String(value ?? '').trim();
  if (cleaned.length > 256 || cleaned.includes('/')) throw new Error('voice_minute_metadata_invalid');
  return cleaned;
}

function boundedText(value: unknown, max: number, error: string, required: boolean): string {
  const cleaned = typeof value === 'string' ? value.trim() : '';
  if ((required && !cleaned) || cleaned.length > max) throw new Error(error);
  return cleaned;
}

function nonNegativeInteger(value: unknown, error: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error(error);
  return parsed;
}

function positiveInteger(value: unknown, error: string): number {
  const parsed = nonNegativeInteger(value, error);
  if (parsed <= 0) throw new Error(error);
  return parsed;
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function eventId(kind: VoiceMinuteEventKind, sourceId: string): string {
  return `vm_${kind}_${hash(sourceId).slice(0, 40)}`;
}

export function voiceMinutePurchaseEventId(sourceId: string): string {
  return eventId('purchase_grant', cleanRequired(sourceId, 'voice_minute_source_id_required'));
}

function fingerprintOf(fields: Record<string, string | number>): string {
  const canonical = Object.keys(fields).sort().map((key) => [key, fields[key]]);
  return hash(JSON.stringify(canonical));
}

export function voiceMinuteProductSeconds(productId: unknown): number {
  const id = String(productId ?? '').trim() as VoiceMinuteProductId;
  const seconds = VOICE_MINUTE_PRODUCTS[id];
  if (!seconds) throw new Error('voice_minute_product_unknown');
  return seconds;
}

export function createVoiceMinutePurchaseEvent(args: Readonly<{
  sourceId: string;
  ownerStableId: string;
  productId: string;
  occurredAtMs: number;
  environment?: string;
  store?: string;
  revenueCatEventId?: string;
  originalTransactionId?: string;
}>): VoiceMinutePurchaseEvent {
  const sourceId = cleanRequired(args.sourceId, 'voice_minute_source_id_required');
  const ownerStableId = cleanRequired(args.ownerStableId, 'voice_minute_owner_required');
  const productId = String(args.productId ?? '').trim() as VoiceMinuteProductId;
  const seconds = voiceMinuteProductSeconds(productId);
  const occurredAtMs = nonNegativeInteger(args.occurredAtMs, 'voice_minute_time_invalid');
  const environment = cleanOptional(args.environment).toUpperCase();
  const store = cleanOptional(args.store).toUpperCase();
  const revenueCatEventId = cleanOptional(args.revenueCatEventId);
  const originalTransactionId = cleanOptional(args.originalTransactionId);
  const immutable = {
    kind: 'purchase_grant', sourceId, ownerStableId, productId, seconds, occurredAtMs,
    environment, store, revenueCatEventId, originalTransactionId,
  } as const;
  return {
    schemaVersion: 1,
    eventId: voiceMinutePurchaseEventId(sourceId),
    fingerprint: fingerprintOf(immutable),
    ...immutable,
  };
}

export function createVoiceMinuteRefundEvent(args: Readonly<{
  sourceId: string;
  ownerStableId: string;
  originalEventId: string;
  reversedSeconds: number;
  occurredAtMs: number;
  environment?: string;
  store?: string;
  revenueCatEventId?: string;
  originalTransactionId?: string;
}>): VoiceMinuteRefundEvent {
  const sourceId = cleanRequired(args.sourceId, 'voice_minute_source_id_required');
  const ownerStableId = cleanRequired(args.ownerStableId, 'voice_minute_owner_required');
  const originalEventId = cleanRequired(args.originalEventId, 'voice_minute_original_event_required');
  const seconds = positiveInteger(args.reversedSeconds, 'voice_minute_seconds_invalid');
  const occurredAtMs = nonNegativeInteger(args.occurredAtMs, 'voice_minute_time_invalid');
  const environment = cleanOptional(args.environment).toUpperCase();
  const store = cleanOptional(args.store).toUpperCase();
  const revenueCatEventId = cleanOptional(args.revenueCatEventId);
  const originalTransactionId = cleanOptional(args.originalTransactionId);
  const immutable = {
    kind: 'purchase_refund', sourceId, ownerStableId, originalEventId, seconds, occurredAtMs,
    environment, store, revenueCatEventId, originalTransactionId,
  } as const;
  return {
    schemaVersion: 1,
    // One purchase can be reversed only once even if a provider emits multiple
    // refund event ids. A changed retry then becomes an immutable conflict.
    eventId: eventId('purchase_refund', originalEventId),
    fingerprint: fingerprintOf(immutable),
    ...immutable,
  };
}

export function createVoiceMinuteAdminGrantEvent(args: Readonly<{
  sourceId: string;
  ownerStableId: string;
  grantedMinutes: number;
  occurredAtMs: number;
  actorUid: string;
  requestId: string;
  reason: string;
  comment?: string;
}>): VoiceMinuteAdminGrantEvent {
  const sourceId = cleanRequired(args.sourceId, 'voice_minute_source_id_required');
  const ownerStableId = cleanRequired(args.ownerStableId, 'voice_minute_owner_required');
  const grantedMinutes = positiveInteger(args.grantedMinutes, 'voice_minute_minutes_invalid');
  if (grantedMinutes > 10_000) throw new Error('voice_minute_minutes_invalid');
  const seconds = grantedMinutes * 60;
  const occurredAtMs = nonNegativeInteger(args.occurredAtMs, 'voice_minute_time_invalid');
  const actorUid = cleanRequired(args.actorUid, 'voice_minute_admin_actor_required');
  const requestId = cleanRequired(args.requestId, 'voice_minute_request_id_required');
  const reason = boundedText(args.reason, 500, 'voice_minute_admin_reason_invalid', true);
  const comment = boundedText(args.comment ?? '', 200, 'voice_minute_admin_comment_invalid', false);
  const immutable = {
    kind: 'admin_grant', sourceId, ownerStableId, grantedMinutes, seconds, occurredAtMs,
    environment: 'ADMIN', actorUid, requestId, reason, comment,
  } as const;
  return {
    schemaVersion: 1,
    eventId: eventId('admin_grant', sourceId),
    fingerprint: fingerprintOf(immutable),
    ...immutable,
  };
}

export function createVoiceMinuteCallChargeEvent(args: Readonly<{
  sessionId: string;
  ownerStableId: string;
  chargedSeconds: number;
  occurredAtMs: number;
}>): VoiceMinuteCallChargeEvent {
  const sessionId = cleanRequired(args.sessionId, 'voice_minute_session_id_required');
  const ownerStableId = cleanRequired(args.ownerStableId, 'voice_minute_owner_required');
  const seconds = positiveInteger(args.chargedSeconds, 'voice_minute_seconds_invalid');
  const occurredAtMs = nonNegativeInteger(args.occurredAtMs, 'voice_minute_time_invalid');
  const immutable = { kind: 'call_charge', sourceId: sessionId, ownerStableId, sessionId, seconds, occurredAtMs } as const;
  return {
    schemaVersion: 1,
    eventId: eventId('call_charge', sessionId),
    fingerprint: fingerprintOf(immutable),
    ...immutable,
  };
}

export function validateVoiceMinuteEventReplay(
  existing: VoiceMinuteEvent,
  incoming: VoiceMinuteEvent,
): 'duplicate' {
  if (existing.eventId !== incoming.eventId || existing.fingerprint !== incoming.fingerprint) {
    throw new Error('voice_minute_event_fingerprint_conflict');
  }
  return 'duplicate';
}

export function reduceVoiceMinuteEvents(events: readonly VoiceMinuteEvent[]): VoiceMinuteBalance {
  const byId = new Map<string, VoiceMinuteEvent>();
  for (const event of events) {
    const existing = byId.get(event.eventId);
    if (existing) {
      validateVoiceMinuteEventReplay(existing, event);
      continue;
    }
    byId.set(event.eventId, event);
  }

  let grantedSeconds = 0;
  let refundedSeconds = 0;
  let chargedSeconds = 0;
  for (const event of byId.values()) {
    if (event.kind === 'purchase_grant' || event.kind === 'admin_grant') grantedSeconds += event.seconds;
    if (event.kind === 'purchase_refund') refundedSeconds += event.seconds;
    if (event.kind === 'call_charge') chargedSeconds += event.seconds;
  }
  const netSeconds = grantedSeconds - refundedSeconds - chargedSeconds;
  return {
    grantedSeconds,
    refundedSeconds,
    chargedSeconds,
    netSeconds,
    availableSeconds: Math.max(0, netSeconds),
  };
}

export interface VoiceMinuteWallet extends VoiceMinuteBalance {
  schemaVersion: 1;
  ownerStableId: string;
  reservedSeconds: number;
  eventCount: number;
  lastEventId: string | null;
  updatedAtMs: number;
  activeReservationSessionId: string | null;
  reservationRootSessionId: string | null;
  canonicalOwnerStableId: string | null;
  mergeOperationId: string | null;
}

export interface AppendVoiceMinuteEventResult {
  applied: boolean;
  reason?: 'duplicate';
  event: VoiceMinuteEvent;
  wallet: VoiceMinuteWallet;
}

function walletInteger(data: Record<string, unknown>, key: string): number {
  const value = Number(data[key]);
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

export function voiceMinuteWalletFromData(
  ownerStableId: string,
  raw: Record<string, unknown> | undefined,
): VoiceMinuteWallet {
  const data = raw ?? {};
  const grantedSeconds = walletInteger(data, 'grantedSeconds');
  const refundedSeconds = walletInteger(data, 'refundedSeconds');
  const chargedSeconds = walletInteger(data, 'chargedSeconds');
  const reservedSeconds = walletInteger(data, 'reservedSeconds');
  const netSeconds = grantedSeconds - refundedSeconds - chargedSeconds;
  return {
    schemaVersion: 1,
    ownerStableId,
    grantedSeconds,
    refundedSeconds,
    chargedSeconds,
    reservedSeconds,
    netSeconds,
    availableSeconds: Math.max(0, netSeconds - reservedSeconds),
    eventCount: walletInteger(data, 'eventCount'),
    lastEventId: typeof data.lastEventId === 'string' && data.lastEventId ? data.lastEventId : null,
    updatedAtMs: walletInteger(data, 'updatedAtMs'),
    activeReservationSessionId: typeof data.activeReservationSessionId === 'string'
      && data.activeReservationSessionId ? data.activeReservationSessionId : null,
    reservationRootSessionId: typeof data.reservationRootSessionId === 'string'
      && data.reservationRootSessionId ? data.reservationRootSessionId : null,
    canonicalOwnerStableId: typeof data.canonicalOwnerStableId === 'string'
      && data.canonicalOwnerStableId ? data.canonicalOwnerStableId : null,
    mergeOperationId: typeof data.mergeOperationId === 'string'
      && data.mergeOperationId ? data.mergeOperationId : null,
  };
}

export function mergeVoiceMinuteWalletProjections(args: Readonly<{
  winnerStableId: string;
  loserStableId: string;
  mergeOperationId: string;
  occurredAtMs: number;
  winner: Record<string, unknown> | undefined;
  loser: Record<string, unknown> | undefined;
}>): { winner: VoiceMinuteWallet; loser: VoiceMinuteWallet; applied: boolean } {
  const winnerStableId = cleanRequired(args.winnerStableId, 'voice_minute_owner_required');
  const loserStableId = cleanRequired(args.loserStableId, 'voice_minute_owner_required');
  const mergeOperationId = cleanRequired(args.mergeOperationId, 'voice_minute_merge_id_required');
  const occurredAtMs = nonNegativeInteger(args.occurredAtMs, 'voice_minute_time_invalid');
  if (winnerStableId === loserStableId) throw new Error('voice_minute_wallet_merge_conflict');
  const winner = voiceMinuteWalletFromData(winnerStableId, args.winner);
  const loser = voiceMinuteWalletFromData(loserStableId, args.loser);
  if (winner.canonicalOwnerStableId && winner.canonicalOwnerStableId !== winnerStableId) {
    throw new Error('voice_minute_wallet_merge_conflict');
  }
  if (loser.canonicalOwnerStableId) {
    if (loser.canonicalOwnerStableId !== winnerStableId || loser.mergeOperationId !== mergeOperationId) {
      throw new Error('voice_minute_wallet_merge_conflict');
    }
    return { winner, loser, applied: false };
  }
  if (winner.reservedSeconds > 0 || winner.activeReservationSessionId
    || loser.reservedSeconds > 0 || loser.activeReservationSessionId) {
    throw new Error('voice_minute_wallet_merge_active_reservation');
  }
  const grantedSeconds = winner.grantedSeconds + loser.grantedSeconds;
  const refundedSeconds = winner.refundedSeconds + loser.refundedSeconds;
  const chargedSeconds = winner.chargedSeconds + loser.chargedSeconds;
  const netSeconds = grantedSeconds - refundedSeconds - chargedSeconds;
  const mergedWinner: VoiceMinuteWallet = {
    ...winner,
    grantedSeconds,
    refundedSeconds,
    chargedSeconds,
    netSeconds,
    availableSeconds: Math.max(0, netSeconds),
    eventCount: winner.eventCount + loser.eventCount,
    lastEventId: loser.updatedAtMs > winner.updatedAtMs ? loser.lastEventId : winner.lastEventId,
    updatedAtMs: occurredAtMs,
  };
  const mergedLoser: VoiceMinuteWallet = {
    ...voiceMinuteWalletFromData(loserStableId, undefined),
    canonicalOwnerStableId: winnerStableId,
    mergeOperationId,
    updatedAtMs: occurredAtMs,
  };
  return { winner: mergedWinner, loser: mergedLoser, applied: true };
}

export async function mergeVoiceMinuteWalletsInTransaction(
  tx: Transaction,
  db: Firestore,
  args: Readonly<{
    winnerStableId: string;
    loserStableId: string;
    mergeOperationId: string;
    occurredAtMs: number;
  }>,
): Promise<{ applied: boolean; winner: VoiceMinuteWallet }> {
  const winnerRef = db.collection(VOICE_MINUTE_WALLET_COLLECTION).doc(args.winnerStableId);
  const loserRef = db.collection(VOICE_MINUTE_WALLET_COLLECTION).doc(args.loserStableId);
  const [winnerSnap, loserSnap] = await Promise.all([tx.get(winnerRef), tx.get(loserRef)]);
  const merged = mergeVoiceMinuteWalletProjections({
    ...args,
    winner: (winnerSnap.data() ?? {}) as Record<string, unknown>,
    loser: (loserSnap.data() ?? {}) as Record<string, unknown>,
  });
  if (merged.applied) {
    tx.set(winnerRef, merged.winner, { merge: false });
    tx.set(loserRef, merged.loser, { merge: false });
  }
  return { applied: merged.applied, winner: merged.winner };
}

function projectWallet(wallet: VoiceMinuteWallet, event: VoiceMinuteEvent): VoiceMinuteWallet {
  const grantedSeconds = wallet.grantedSeconds
    + (event.kind === 'purchase_grant' || event.kind === 'admin_grant' ? event.seconds : 0);
  const refundedSeconds = wallet.refundedSeconds + (event.kind === 'purchase_refund' ? event.seconds : 0);
  const chargedSeconds = wallet.chargedSeconds + (event.kind === 'call_charge' ? event.seconds : 0);
  const netSeconds = grantedSeconds - refundedSeconds - chargedSeconds;
  return {
    ...wallet,
    grantedSeconds,
    refundedSeconds,
    chargedSeconds,
    netSeconds,
    availableSeconds: Math.max(0, netSeconds - wallet.reservedSeconds),
    eventCount: wallet.eventCount + 1,
    lastEventId: event.eventId,
    updatedAtMs: event.occurredAtMs,
  };
}

function eventFromSnapshot(raw: Record<string, unknown>): VoiceMinuteEvent {
  return raw as unknown as VoiceMinuteEvent;
}

/**
 * Append an immutable event and update its rebuildable wallet projection using
 * the caller's transaction. The caller may combine this with owner/deletion
 * checks without opening a second transaction.
 */
export async function appendVoiceMinuteEventInTransaction(
  tx: Transaction,
  db: Firestore,
  event: VoiceMinuteEvent,
): Promise<AppendVoiceMinuteEventResult> {
  const eventRef = db.collection(VOICE_MINUTE_EVENT_COLLECTION).doc(event.eventId);
  const walletRef = db.collection(VOICE_MINUTE_WALLET_COLLECTION).doc(event.ownerStableId);
  const [existingSnap, walletSnap, originalSnap] = await Promise.all([
    tx.get(eventRef),
    tx.get(walletRef),
    event.kind === 'purchase_refund'
      ? tx.get(db.collection(VOICE_MINUTE_EVENT_COLLECTION).doc(event.originalEventId))
      : Promise.resolve(null),
  ]);
  const wallet = voiceMinuteWalletFromData(
    event.ownerStableId,
    (walletSnap.data() ?? {}) as Record<string, unknown>,
  );
  if (existingSnap.exists) {
    validateVoiceMinuteEventReplay(
      eventFromSnapshot((existingSnap.data() ?? {}) as Record<string, unknown>),
      event,
    );
    return { applied: false, reason: 'duplicate', event, wallet };
  }

  if (event.kind === 'purchase_refund') {
    if (!originalSnap?.exists) throw new Error('voice_minute_original_purchase_missing');
    const original = eventFromSnapshot((originalSnap.data() ?? {}) as Record<string, unknown>);
    let canonicalOriginalOwner = original.ownerStableId;
    const seenOwners = new Set<string>();
    for (let depth = 0; depth < 8 && canonicalOriginalOwner !== event.ownerStableId; depth += 1) {
      if (seenOwners.has(canonicalOriginalOwner)) throw new Error('voice_minute_refund_owner_cycle');
      seenOwners.add(canonicalOriginalOwner);
      const ownerMap = await tx.get(db.collection('account_identity_owner_map').doc(canonicalOriginalOwner));
      const next = typeof ownerMap.data()?.canonicalStableId === 'string'
        ? String(ownerMap.data()?.canonicalStableId).trim()
        : '';
      if (!ownerMap.exists || !next || next === canonicalOriginalOwner) break;
      canonicalOriginalOwner = next;
    }
    if (original.kind !== 'purchase_grant'
      || canonicalOriginalOwner !== event.ownerStableId
      || original.seconds !== event.seconds) {
      throw new Error('voice_minute_refund_original_mismatch');
    }
  }

  const nextWallet = projectWallet(wallet, event);
  tx.set(eventRef, event, { merge: false });
  tx.set(walletRef, nextWallet, { merge: false });
  return { applied: true, event, wallet: nextWallet };
}

export async function appendVoiceMinuteEvent(
  db: Firestore,
  event: VoiceMinuteEvent,
): Promise<AppendVoiceMinuteEventResult> {
  return db.runTransaction((tx) => appendVoiceMinuteEventInTransaction(tx, db, event));
}

export async function readVoiceMinuteWallet(
  db: Firestore,
  ownerStableId: string,
): Promise<VoiceMinuteWallet> {
  const owner = cleanRequired(ownerStableId, 'voice_minute_owner_required');
  const snap = await db.collection(VOICE_MINUTE_WALLET_COLLECTION).doc(owner).get();
  return voiceMinuteWalletFromData(owner, (snap.data() ?? {}) as Record<string, unknown>);
}

/**
 * Чистая проекция резерва: тот же расчёт, что reserveVoiceMinuteWalletInTransaction,
 * но без чтений/записей — для вызывающих, которым Firestore-правило «все чтения
 * до первой записи» не позволяет дать хелперу читать кошелёк самому (вытеснение
 * мёртвой платной сессии внутри reserveVoiceSeconds, аудит 2026-08-30).
 */
export function projectVoiceMinuteWalletReserve(
  wallet: VoiceMinuteWallet,
  args: Readonly<{
    sessionId: string;
    requestedSeconds: number;
    minimumSeconds: number;
    occurredAtMs: number;
  }>,
): { wallet: VoiceMinuteWallet; reservedSeconds: number; availableSeconds: number } {
  const sessionId = cleanRequired(args.sessionId, 'voice_minute_session_id_required');
  const requestedSeconds = positiveInteger(args.requestedSeconds, 'voice_minute_seconds_invalid');
  const minimumSeconds = positiveInteger(args.minimumSeconds, 'voice_minute_seconds_invalid');
  const occurredAtMs = nonNegativeInteger(args.occurredAtMs, 'voice_minute_time_invalid');
  if (wallet.reservedSeconds > 0 || wallet.activeReservationSessionId) {
    throw new Error('voice_minute_reservation_active');
  }
  const reservedSeconds = Math.min(requestedSeconds, wallet.availableSeconds);
  if (reservedSeconds < minimumSeconds) throw new Error('voice_minutes_insufficient');
  const next: VoiceMinuteWallet = {
    ...wallet,
    reservedSeconds,
    availableSeconds: Math.max(0, wallet.netSeconds - reservedSeconds),
    activeReservationSessionId: sessionId,
    reservationRootSessionId: sessionId,
    updatedAtMs: occurredAtMs,
  };
  return { wallet: next, reservedSeconds, availableSeconds: next.availableSeconds };
}

export async function reserveVoiceMinuteWalletInTransaction(
  tx: Transaction,
  db: Firestore,
  args: Readonly<{
    ownerStableId: string;
    sessionId: string;
    requestedSeconds: number;
    minimumSeconds: number;
    occurredAtMs: number;
  }>,
): Promise<{ reservedSeconds: number; availableSeconds: number }> {
  const ownerStableId = cleanRequired(args.ownerStableId, 'voice_minute_owner_required');
  const walletRef = db.collection(VOICE_MINUTE_WALLET_COLLECTION).doc(ownerStableId);
  const walletSnap = await tx.get(walletRef);
  const wallet = voiceMinuteWalletFromData(
    ownerStableId,
    (walletSnap.data() ?? {}) as Record<string, unknown>,
  );
  const projected = projectVoiceMinuteWalletReserve(wallet, args);
  tx.set(walletRef, projected.wallet, { merge: false });
  return { reservedSeconds: projected.reservedSeconds, availableSeconds: projected.availableSeconds };
}

export async function transferVoiceMinuteWalletReservationInTransaction(
  tx: Transaction,
  db: Firestore,
  args: Readonly<{
    ownerStableId: string;
    previousSessionId: string;
    newSessionId: string;
    occurredAtMs: number;
  }>,
): Promise<void> {
  const ownerStableId = cleanRequired(args.ownerStableId, 'voice_minute_owner_required');
  const previousSessionId = cleanRequired(args.previousSessionId, 'voice_minute_session_id_required');
  const newSessionId = cleanRequired(args.newSessionId, 'voice_minute_session_id_required');
  const occurredAtMs = nonNegativeInteger(args.occurredAtMs, 'voice_minute_time_invalid');
  const walletRef = db.collection(VOICE_MINUTE_WALLET_COLLECTION).doc(ownerStableId);
  const walletSnap = await tx.get(walletRef);
  const wallet = voiceMinuteWalletFromData(
    ownerStableId,
    (walletSnap.data() ?? {}) as Record<string, unknown>,
  );
  if (wallet.reservedSeconds <= 0 || wallet.activeReservationSessionId !== previousSessionId) {
    throw new Error('voice_minute_reservation_mismatch');
  }
  tx.set(walletRef, {
    ...wallet,
    activeReservationSessionId: newSessionId,
    updatedAtMs: occurredAtMs,
  }, { merge: false });
}

/**
 * Чистая проекция сеттлмента платной резервации: та же математика и валидации,
 * что settleVoiceMinuteWalletInTransaction, но без чтений/записей. Проверку
 * дубликата charge-события проекция сделать не может — её обязан выполнить
 * вызывающий (tx.get по chargeEvent.eventId + validateVoiceMinuteEventReplay)
 * ДО своих записей. Нужна вытеснению мёртвой платной сессии внутри
 * reserveVoiceSeconds (аудит 2026-08-30), где чтения и записи разнесены.
 */
export function projectVoiceMinuteWalletSettle(
  wallet: VoiceMinuteWallet,
  args: Readonly<{
    activeSessionId: string;
    rootSessionId: string;
    reservationTotalSeconds: number;
    chargedSeconds: number;
    occurredAtMs: number;
  }>,
): {
  wallet: VoiceMinuteWallet;
  chargeEvent: VoiceMinuteCallChargeEvent | null;
  chargedSeconds: number;
  refundedSeconds: number;
} {
  const activeSessionId = cleanRequired(args.activeSessionId, 'voice_minute_session_id_required');
  const rootSessionId = cleanRequired(args.rootSessionId, 'voice_minute_session_id_required');
  const reservationTotalSeconds = positiveInteger(
    args.reservationTotalSeconds,
    'voice_minute_seconds_invalid',
  );
  const chargedSeconds = Math.min(
    reservationTotalSeconds,
    nonNegativeInteger(args.chargedSeconds, 'voice_minute_seconds_invalid'),
  );
  const occurredAtMs = nonNegativeInteger(args.occurredAtMs, 'voice_minute_time_invalid');
  if (wallet.activeReservationSessionId !== activeSessionId
    || wallet.reservationRootSessionId !== rootSessionId
    || wallet.reservedSeconds !== reservationTotalSeconds) {
    throw new Error('voice_minute_reservation_mismatch');
  }

  const chargeEvent = chargedSeconds > 0
    ? createVoiceMinuteCallChargeEvent({
      sessionId: rootSessionId,
      ownerStableId: wallet.ownerStableId,
      chargedSeconds,
      occurredAtMs,
    })
    : null;

  const nextChargedSeconds = wallet.chargedSeconds + chargedSeconds;
  const netSeconds = wallet.grantedSeconds - wallet.refundedSeconds - nextChargedSeconds;
  const nextWallet: VoiceMinuteWallet = {
    ...wallet,
    chargedSeconds: nextChargedSeconds,
    reservedSeconds: 0,
    netSeconds,
    availableSeconds: Math.max(0, netSeconds),
    eventCount: wallet.eventCount + (chargeEvent ? 1 : 0),
    lastEventId: chargeEvent?.eventId ?? wallet.lastEventId,
    updatedAtMs: occurredAtMs,
    activeReservationSessionId: null,
    reservationRootSessionId: null,
  };
  return {
    wallet: nextWallet,
    chargeEvent,
    chargedSeconds,
    refundedSeconds: reservationTotalSeconds - chargedSeconds,
  };
}

export async function settleVoiceMinuteWalletInTransaction(
  tx: Transaction,
  db: Firestore,
  args: Readonly<{
    ownerStableId: string;
    activeSessionId: string;
    rootSessionId: string;
    reservationTotalSeconds: number;
    chargedSeconds: number;
    occurredAtMs: number;
  }>,
): Promise<{ chargedSeconds: number; refundedSeconds: number; wallet: VoiceMinuteWallet }> {
  const ownerStableId = cleanRequired(args.ownerStableId, 'voice_minute_owner_required');
  const walletRef = db.collection(VOICE_MINUTE_WALLET_COLLECTION).doc(ownerStableId);
  const walletSnap = await tx.get(walletRef);
  const wallet = voiceMinuteWalletFromData(
    ownerStableId,
    (walletSnap.data() ?? {}) as Record<string, unknown>,
  );
  const projected = projectVoiceMinuteWalletSettle(wallet, args);

  if (projected.chargeEvent) {
    const chargeEventRef = db.collection(VOICE_MINUTE_EVENT_COLLECTION).doc(projected.chargeEvent.eventId);
    const existingSnap = await tx.get(chargeEventRef);
    if (existingSnap.exists) {
      validateVoiceMinuteEventReplay(
        eventFromSnapshot((existingSnap.data() ?? {}) as Record<string, unknown>),
        projected.chargeEvent,
      );
      throw new Error('voice_minute_charge_already_applied');
    }
    tx.set(chargeEventRef, projected.chargeEvent, { merge: false });
  }
  tx.set(walletRef, projected.wallet, { merge: false });
  return {
    chargedSeconds: projected.chargedSeconds,
    refundedSeconds: projected.refundedSeconds,
    wallet: projected.wallet,
  };
}
