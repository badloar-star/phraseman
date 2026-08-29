import { createHash } from 'crypto';

const MAX_ID_LENGTH = 256;
export const MAX_OWNER_LINEAGES = 64;
export const MAX_OWNER_CANDIDATES = 16;
export const PREMIUM_RC_GRACE_MS = 72 * 60 * 60 * 1000;

export type PremiumPlan = 'monthly' | 'yearly' | 'lifetime';

export type PremiumLineageEvent = {
  eventId: string;
  eventType: string;
  eventTimeMs: number;
  appId: string;
  environment: string;
  store: string;
  originalTransactionId: string;
  transactionId: string | null;
  productId: string;
  plan: PremiumPlan;
  expirationAtMs: number | null;
  cancelReason: string;
  lineageHash: string;
  fingerprint: string;
};

export type PremiumLineageState = {
  lineageHash: string;
  appId: string;
  environment: string;
  store: string;
  originalTransactionId: string;
  productId: string;
  plan: PremiumPlan;
  revoked: boolean;
  activeThroughMs: number | null;
  lastEventId: string;
  lastEventType: string;
  lastEventTimeMs: number;
  lastEventRank: number;
  lastEventFingerprint: string;
  lastAccessEventId: string;
  lastAccessEventTimeMs: number;
  lastAccessEventRank: number;
  lastAccessEventTieValue: number;
  lastMetadataEventId: string;
  lastMetadataEventTimeMs: number;
  lastGrantEventId: string;
  lastGrantEventTimeMs: number;
  supportBoundMs: number | null;
  lastSupportEventId: string;
  lastSupportEventTimeMs: number;
};

export function chooseAuthoritativePremiumLineageState(
  left: PremiumLineageState,
  right: PremiumLineageState,
): PremiumLineageState {
  const numericAuthority: Array<keyof PremiumLineageState> = [
    'lastAccessEventTimeMs',
    'lastAccessEventRank',
    'lastAccessEventTieValue',
    'lastEventTimeMs',
    'lastEventRank',
  ];
  for (const field of numericAuthority) {
    const leftValue = Number(left[field]);
    const rightValue = Number(right[field]);
    if (leftValue !== rightValue) return leftValue > rightValue ? left : right;
  }
  for (const field of ['lastAccessEventId', 'lastEventId'] as const) {
    if (left[field] !== right[field]) return left[field] > right[field] ? left : right;
  }
  return left.lastEventFingerprint >= right.lastEventFingerprint ? left : right;
}

type NormalizedResult =
  | { status: 'ok'; event: PremiumLineageEvent }
  | { status: 'quarantine'; reason: string; rawFingerprint: string };

export type ApplyPremiumLineageResult = {
  status: 'applied' | 'stale';
  state: PremiumLineageState;
};

type ReceiptIdentity = { eventId?: unknown; fingerprint?: unknown };

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value: Record<string, unknown>): string {
  return JSON.stringify(Object.keys(value).sort().reduce<Record<string, unknown>>((out, key) => {
    out[key] = value[key];
    return out;
  }, {}));
}

function bounded(raw: unknown, normalizeCase = false): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value || value.length > MAX_ID_LENGTH) return null;
  return normalizeCase ? value.toUpperCase() : value;
}

function positiveSafeMs(raw: unknown): number | null {
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

function eventPlan(productId: string): PremiumPlan | null {
  const value = productId.toLowerCase();
  if (value === 'phraseman_premium_lifetime_v1') return 'lifetime';
  if (/^phraseman_premium_yearly(?:_[0-9]{1,6})?(?::[a-z0-9][a-z0-9-]*)?$/.test(value)) return 'yearly';
  if (/^phraseman_premium_monthly(?:_[0-9]{1,6})?(?::[a-z0-9][a-z0-9-]*)?$/.test(value)) return 'monthly';
  if (value === 'premium_lifetime') return 'lifetime';
  if (value === 'premium_yearly' || value === 'phraseman_premium_yearly') return 'yearly';
  if (value === 'premium_monthly' || value === 'phraseman_premium_monthly') return 'monthly';
  return null;
}

function canonicalLineageParts(raw: Record<string, unknown>): string[] | null {
  const appId = bounded(raw.app_id)?.toLowerCase();
  const environment = bounded(raw.environment, true);
  const store = bounded(raw.store, true);
  const originalTransactionId = bounded(raw.original_transaction_id);
  if (!appId || !environment || !store || !originalTransactionId) return null;
  return [appId, environment, store, originalTransactionId];
}

export function canonicalPremiumLineageHash(raw: Record<string, unknown>): string {
  const parts = canonicalLineageParts(raw);
  if (!parts) throw new Error('invalid_premium_lineage_identity');
  return sha256(parts.map((part) => `${part.length}:${part}`).join('|'));
}

export function normalizePremiumLineageEvent(raw: Record<string, unknown>): NormalizedResult {
  const rawFingerprint = sha256(stableJson(raw));
  const eventId = bounded(raw.id);
  const eventType = bounded(raw.type, true);
  const eventTimeMs = positiveSafeMs(raw.event_timestamp_ms);
  const parts = canonicalLineageParts(raw);
  if (!eventId) return { status: 'quarantine', reason: 'missing_or_invalid_event_id', rawFingerprint };
  if (!eventType) return { status: 'quarantine', reason: 'missing_or_invalid_event_type', rawFingerprint };
  if (eventTimeMs === null) return { status: 'quarantine', reason: 'missing_or_invalid_event_time', rawFingerprint };
  if (!parts) return { status: 'quarantine', reason: 'missing_or_invalid_lineage_identity', rawFingerprint };
  const [appId, environment, store, originalTransactionId] = parts;
  const productId = bounded(raw.product_id) ?? '';
  const plan = eventPlan(productId);
  if (plan === null) return { status: 'quarantine', reason: 'unmanaged_premium_product', rawFingerprint };
  const expirationAtMs = positiveSafeMs(raw.expiration_at_ms);
  const transactionId = bounded(raw.transaction_id);
  const cancelReason = bounded(raw.cancel_reason, true) ?? '';
  const activationEvent = new Set([
    'INITIAL_PURCHASE',
    'NON_RENEWING_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'SUBSCRIPTION_EXTENDED',
    'TEMPORARY_ENTITLEMENT_GRANT',
    'REFUND_REVERSED',
  ]).has(eventType);
  if (activationEvent && plan !== 'lifetime' && expirationAtMs === null) {
    return { status: 'quarantine', reason: 'missing_recurring_expiration', rawFingerprint };
  }
  const lineageHash = canonicalPremiumLineageHash(raw);
  const fingerprint = sha256(stableJson({
    eventId,
    eventType,
    eventTimeMs,
    appId,
    environment,
    store,
    originalTransactionId,
    transactionId,
    productId,
    expirationAtMs,
    cancelReason,
  }));
  return {
    status: 'ok',
    event: {
      eventId,
      eventType,
      eventTimeMs,
      appId,
      environment,
      store,
      originalTransactionId,
      transactionId,
      productId,
      plan,
      expirationAtMs,
      cancelReason,
      lineageHash,
      fingerprint,
    },
  };
}

export function receiptReplayDecision(
  receipt: ReceiptIdentity,
  event: PremiumLineageEvent,
): 'duplicate' | 'conflict' {
  return receipt.eventId === event.eventId && receipt.fingerprint === event.fingerprint
    ? 'duplicate'
    : 'conflict';
}

export function boundPremiumOwnerCandidates(
  rawCandidates: string[],
): { status: 'ok'; candidates: string[] } | { status: 'quarantine'; reason: string } {
  if (rawCandidates.length > MAX_OWNER_CANDIDATES) {
    return { status: 'quarantine', reason: 'owner_candidate_overflow' };
  }
  const candidates: string[] = [];
  for (const raw of rawCandidates) {
    const candidate = bounded(raw);
    if (!candidate || candidate.includes('/')) {
      return { status: 'quarantine', reason: 'invalid_owner_candidate' };
    }
    if (!candidates.includes(candidate)) candidates.push(candidate);
  }
  return { status: 'ok', candidates };
}

function semanticEventRank(eventType: string, cancelReason = ''): number {
  if (eventType === 'REFUND_REVERSED') return 70;
  if (eventType === 'REFUND') return 60;
  if (eventType === 'CANCELLATION' && cancelReason === 'CUSTOMER_SUPPORT') return 50;
  if (eventType === 'EXPIRATION') return 40;
  if (new Set([
    'INITIAL_PURCHASE',
    'NON_RENEWING_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'SUBSCRIPTION_EXTENDED',
    'TEMPORARY_ENTITLEMENT_GRANT',
    'REFUND_REVERSED',
  ]).has(eventType)) return 30;
  if (eventType === 'CANCELLATION' || eventType === 'BILLING_ISSUE') return 20;
  return 10;
}

function accessTransitionRank(
  event: PremiumLineageEvent,
  state: Pick<PremiumLineageState, 'plan' | 'revoked' | 'activeThroughMs'>,
): number | null {
  if (event.eventType === 'REFUND_REVERSED') return 110;
  if (event.eventType === 'REFUND') return 100;
  if (event.eventType === 'EXPIRATION') return state.plan === 'lifetime' ? null : 90;
  if (event.eventType === 'CANCELLATION' && event.cancelReason === 'CUSTOMER_SUPPORT') {
    if (state.plan === 'lifetime' || event.expirationAtMs === null || event.expirationAtMs <= event.eventTimeMs) return 80;
    return null;
  }
  if (new Set([
    'INITIAL_PURCHASE',
    'NON_RENEWING_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'SUBSCRIPTION_EXTENDED',
    'TEMPORARY_ENTITLEMENT_GRANT',
    'REFUND_REVERSED',
  ]).has(event.eventType)) return 50;
  return null;
}

function accessTransitionTieValue(event: PremiumLineageEvent, rank: number): number {
  if (rank === 50) return event.plan === 'lifetime'
    ? Number.MAX_SAFE_INTEGER
    : event.expirationAtMs ?? 0;
  return 0;
}

function isOlder(current: PremiumLineageState, event: PremiumLineageEvent): boolean {
  const eventAccessRank = accessTransitionRank(event, current);
  if (eventAccessRank === null) {
    if (event.eventType === 'CANCELLATION' && event.cancelReason === 'CUSTOMER_SUPPORT'
      && event.expirationAtMs !== null && event.expirationAtMs > event.eventTimeMs) {
      const supportTime = Number.isSafeInteger(current.lastSupportEventTimeMs) ? current.lastSupportEventTimeMs : 0;
      const supportId = current.lastSupportEventId || '';
      if (event.eventTimeMs !== supportTime) return event.eventTimeMs < supportTime;
      if (current.supportBoundMs !== null && event.expirationAtMs !== current.supportBoundMs) {
        return event.expirationAtMs > current.supportBoundMs;
      }
      return event.eventId <= supportId;
    }
    const metadataTime = Number.isSafeInteger(current.lastMetadataEventTimeMs)
      ? current.lastMetadataEventTimeMs
      : current.lastEventType === 'PRODUCT_CHANGE' ? current.lastEventTimeMs : 0;
    const metadataId = current.lastMetadataEventId || (current.lastEventType === 'PRODUCT_CHANGE' ? current.lastEventId : '');
    if (event.eventTimeMs !== metadataTime) return event.eventTimeMs < metadataTime;
    return event.eventId <= metadataId;
  }
  const accessTime = Number.isSafeInteger(current.lastAccessEventTimeMs)
    ? current.lastAccessEventTimeMs
    : current.lastEventType === 'PRODUCT_CHANGE' ? 0 : current.lastEventTimeMs;
  const accessId = current.lastAccessEventId || (current.lastEventType === 'PRODUCT_CHANGE' ? '' : current.lastEventId);
  if (event.eventTimeMs !== accessTime) return event.eventTimeMs < accessTime;
  const currentRank = Number.isSafeInteger(current.lastAccessEventRank)
    ? current.lastAccessEventRank
    : current.lastEventType === 'PRODUCT_CHANGE' ? 0 : semanticEventRank(current.lastEventType);
  if (eventAccessRank !== currentRank) return eventAccessRank < currentRank;
  const eventTie = accessTransitionTieValue(event, eventAccessRank);
  const currentTie = Number.isSafeInteger(current.lastAccessEventTieValue) ? current.lastAccessEventTieValue : 0;
  if (eventTie !== currentTie) return eventTie < currentTie;
  return event.eventId <= accessId;
}

function baseState(event: PremiumLineageEvent): PremiumLineageState {
  const initial = {
    lineageHash: event.lineageHash,
    appId: event.appId,
    environment: event.environment,
    store: event.store,
    originalTransactionId: event.originalTransactionId,
    productId: event.productId,
    plan: event.plan,
    revoked: true,
    activeThroughMs: null,
    lastEventId: event.eventId,
    lastEventType: event.eventType,
    lastEventTimeMs: event.eventTimeMs,
    lastEventRank: semanticEventRank(event.eventType, event.cancelReason),
    lastEventFingerprint: event.fingerprint,
    lastAccessEventId: '',
    lastAccessEventTimeMs: 0,
    lastAccessEventRank: 0,
    lastAccessEventTieValue: 0,
    lastMetadataEventId: event.eventId,
    lastMetadataEventTimeMs: event.eventTimeMs,
    lastGrantEventId: '',
    lastGrantEventTimeMs: 0,
    supportBoundMs: null,
    lastSupportEventId: '',
    lastSupportEventTimeMs: 0,
  } satisfies PremiumLineageState;
  const accessRank = accessTransitionRank(event, initial);
  return accessRank === null ? initial : {
    ...initial,
    lastAccessEventId: event.eventId,
    lastAccessEventTimeMs: event.eventTimeMs,
    lastAccessEventRank: accessRank,
    lastAccessEventTieValue: accessTransitionTieValue(event, accessRank),
  };
}

function withMetadata(state: PremiumLineageState, event: PremiumLineageEvent): PremiumLineageState {
  const metadataTime = Number.isSafeInteger(state.lastMetadataEventTimeMs) ? state.lastMetadataEventTimeMs : 0;
  const metadataId = state.lastMetadataEventId || '';
  const metadataIsNewer = event.eventTimeMs > metadataTime
    || (event.eventTimeMs === metadataTime && event.eventId > metadataId);
  const overallIsNewer = event.eventTimeMs > state.lastEventTimeMs
    || (event.eventTimeMs === state.lastEventTimeMs
      && semanticEventRank(event.eventType, event.cancelReason) >= state.lastEventRank);
  const accessRank = accessTransitionRank(event, state);
  const isAccessEvent = accessRank !== null;
  const futureSupport = event.eventType === 'CANCELLATION'
    && event.cancelReason === 'CUSTOMER_SUPPORT'
    && event.expirationAtMs !== null
    && event.expirationAtMs > event.eventTimeMs
    && state.plan !== 'lifetime';
  const supportIsNewer = futureSupport && (
    event.eventTimeMs >= state.lastAccessEventTimeMs
    && (event.eventTimeMs > state.lastSupportEventTimeMs
    || (event.eventTimeMs === state.lastSupportEventTimeMs
      && (state.supportBoundMs === null || event.expirationAtMs! < state.supportBoundMs)))
  );
  return {
    ...state,
    productId: metadataIsNewer && event.productId ? event.productId : state.productId,
    lastEventId: overallIsNewer ? event.eventId : state.lastEventId,
    lastEventType: overallIsNewer ? event.eventType : state.lastEventType,
    lastEventTimeMs: overallIsNewer ? event.eventTimeMs : state.lastEventTimeMs,
    lastEventRank: overallIsNewer ? semanticEventRank(event.eventType, event.cancelReason) : state.lastEventRank,
    lastEventFingerprint: overallIsNewer ? event.fingerprint : state.lastEventFingerprint,
    lastAccessEventId: isAccessEvent ? event.eventId : state.lastAccessEventId,
    lastAccessEventTimeMs: isAccessEvent ? event.eventTimeMs : state.lastAccessEventTimeMs,
    lastAccessEventRank: isAccessEvent ? accessRank : state.lastAccessEventRank,
    lastAccessEventTieValue: isAccessEvent && accessRank !== null
      ? accessTransitionTieValue(event, accessRank)
      : state.lastAccessEventTieValue,
    lastMetadataEventId: metadataIsNewer ? event.eventId : state.lastMetadataEventId,
    lastMetadataEventTimeMs: metadataIsNewer ? event.eventTimeMs : state.lastMetadataEventTimeMs,
    supportBoundMs: supportIsNewer ? event.expirationAtMs : state.supportBoundMs,
    lastSupportEventId: supportIsNewer ? event.eventId : state.lastSupportEventId,
    lastSupportEventTimeMs: supportIsNewer ? event.eventTimeMs : state.lastSupportEventTimeMs,
  };
}

function isActivationEvent(eventType: string): boolean {
  return new Set([
    'INITIAL_PURCHASE',
    'NON_RENEWING_PURCHASE',
    'RENEWAL',
    'UNCANCELLATION',
    'SUBSCRIPTION_EXTENDED',
    'TEMPORARY_ENTITLEMENT_GRANT',
    'REFUND_REVERSED',
  ]).has(eventType);
}

function recordGrantMetadata(state: PremiumLineageState, event: PremiumLineageEvent): PremiumLineageState {
  if (!isActivationEvent(event.eventType)) return state;
  const newer = event.eventTimeMs > state.lastGrantEventTimeMs
    || (event.eventTimeMs === state.lastGrantEventTimeMs && event.eventId > state.lastGrantEventId);
  return newer ? {
    ...state,
    plan: event.plan,
    lastGrantEventId: event.eventId,
    lastGrantEventTimeMs: event.eventTimeMs,
  } : state;
}

export function applyPremiumLineageEvent(
  current: PremiumLineageState | null,
  event: PremiumLineageEvent,
): ApplyPremiumLineageResult {
  if (current && current.lineageHash !== event.lineageHash) {
    throw new Error('premium_lineage_hash_mismatch');
  }
  if (current && isOlder(current, event)) {
    return { status: 'stale', state: recordGrantMetadata(current, event) };
  }
  const previous = current ?? baseState(event);
  let next = withMetadata(previous, event);
  const activation = isActivationEvent(event.eventType);

  if (event.eventType === 'PRODUCT_CHANGE') {
    return { status: 'applied', state: next };
  }
  if (activation) {
    const boundedBySupport = next.supportBoundMs !== null && next.lastSupportEventTimeMs >= event.eventTimeMs;
    const recurringExpiry = boundedBySupport && event.expirationAtMs !== null
      ? Math.min(event.expirationAtMs, next.supportBoundMs!)
      : event.expirationAtMs;
    next = {
      ...next,
      plan: event.plan,
      revoked: event.plan === 'lifetime' ? false : event.expirationAtMs === null,
      activeThroughMs: event.plan === 'lifetime' ? null : recurringExpiry,
      lastGrantEventId: event.eventId,
      lastGrantEventTimeMs: event.eventTimeMs,
    };
    return { status: 'applied', state: next };
  }
  if (event.eventType === 'REFUND') {
    return { status: 'applied', state: { ...next, revoked: true, activeThroughMs: event.expirationAtMs } };
  }
  if (event.eventType === 'EXPIRATION') {
    return previous.plan === 'lifetime'
      ? { status: 'applied', state: { ...next, plan: 'lifetime', revoked: previous.revoked, activeThroughMs: previous.activeThroughMs } }
      : { status: 'applied', state: { ...next, revoked: true, activeThroughMs: event.expirationAtMs } };
  }
  if (event.eventType === 'CANCELLATION' && event.cancelReason === 'CUSTOMER_SUPPORT') {
    if (event.expirationAtMs !== null && event.expirationAtMs > event.eventTimeMs
      && event.eventTimeMs < previous.lastAccessEventTimeMs) {
      return { status: 'applied', state: next };
    }
    if (previous.plan === 'lifetime' || event.expirationAtMs === null) {
      return { status: 'applied', state: { ...next, revoked: true, activeThroughMs: null } };
    }
    const boundedExpiry = previous.activeThroughMs === null
      ? event.expirationAtMs
      : Math.min(previous.activeThroughMs, event.expirationAtMs);
    return {
      status: 'applied',
      state: { ...next, revoked: previous.revoked || boundedExpiry <= event.eventTimeMs, activeThroughMs: boundedExpiry },
    };
  }
  // Ordinary unsubscribe/cancellation and billing issues do not revoke paid time.
  return { status: 'applied', state: next };
}

function hasLegacyRevenueCatProvenance(progress: Record<string, unknown>): boolean {
  return !!bounded(progress.premium_rc_product_id)
    && !!bounded(progress.premium_rc_store)
    && !!bounded(progress.premium_rc_event_type);
}

function activeLineage(lineage: PremiumLineageState, nowMs: number): boolean {
  return !lineage.revoked && (lineage.plan === 'lifetime'
    ? lineage.activeThroughMs === null
    : lineage.activeThroughMs !== null && lineage.activeThroughMs + PREMIUM_RC_GRACE_MS > nowMs);
}

const VIP_PROGRESS_KEYS = [
  'vip_active',
  'vip_plan',
  'vip_from',
  'vip_until',
  'vip_expiry',
  'vip_admin_override',
  'vip_admin_grant_at',
  'vip_grant_at',
] as const;

function progressMs(raw: unknown): number {
  if (raw == null || raw === '') return 0;
  if (typeof raw === 'object') {
    const value = raw as { toMillis?: () => number; seconds?: number };
    if (typeof value.toMillis === 'function') return progressMs(value.toMillis());
    if (typeof value.seconds === 'number') return progressMs(value.seconds * 1000);
  }
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

function legacyAdminMigrationPatch(
  progress: Record<string, unknown>,
  nowMs: number,
): Record<string, unknown> {
  const plan = String(progress.premium_plan ?? '').trim().toLowerCase();
  const override = String(progress.admin_premium_override ?? '').trim().toLowerCase();
  const explicitRevoke = override === 'false';
  const hasLegacyAuthority = override === 'true' || (plan === 'admin_grant' && !explicitRevoke);
  if (!hasLegacyAuthority && !(plan === 'admin_grant' && explicitRevoke)) return {};
  const patch: Record<string, unknown> = { admin_premium_override: 'false' };
  if (explicitRevoke) return patch;

  const hasMeaningfulPlan = plan !== '' && plan !== 'null' && plan !== 'undefined';
  const expiryMs = progressMs(progress.premium_expiry);
  const adminActive = hasMeaningfulPlan && (expiryMs === 0 || expiryMs > nowMs);
  const hasVipRepresentation = VIP_PROGRESS_KEYS.some(
    (key) => Object.prototype.hasOwnProperty.call(progress, key),
  );
  const vipRevoked = ['false', '0', 'no'].includes(String(progress.vip_active ?? '').trim().toLowerCase())
    || ['false', '0', 'no'].includes(String(progress.vip_admin_override ?? '').trim().toLowerCase());
  const vipFromMs = progressMs(progress.vip_from);
  const vipUntilMs = progressMs(progress.vip_until ?? progress.vip_expiry);
  const vipActive = hasVipRepresentation && !vipRevoked
    && vipFromMs <= nowMs
    && (vipUntilMs === 0 || vipUntilMs > nowMs);

  if (!adminActive) {
    if (hasVipRepresentation) return patch;
    return {
      ...patch,
      vip_active: 'false',
      vip_plan: '',
      vip_until: String(expiryMs),
      vip_admin_override: 'false',
    };
  }

  const existingVipIsAtLeastAsStrong = vipActive
    && (vipUntilMs === 0 || (expiryMs > 0 && vipUntilMs >= expiryMs));
  if (existingVipIsAtLeastAsStrong) return patch;

  const rawGrantAt = String(progress.premium_admin_grant_at ?? '').trim();
  const grantAt = rawGrantAt || String(nowMs);
  return {
    ...patch,
    vip_active: 'true',
    vip_plan: 'admin_vip',
    vip_from: grantAt,
    vip_until: String(expiryMs),
    vip_admin_override: 'true',
    vip_admin_grant_at: grantAt,
    vip_migrated_from_admin_grant_at: String(nowMs),
  };
}

export function aggregatePremiumLineages(
  lineages: PremiumLineageState[],
  existingProgress: Record<string, unknown>,
  nowMs: number,
): {
  status: 'project' | 'ambiguous';
  winnerLineageHash?: string;
  progressPatch: Record<string, unknown>;
} {
  const progressPatch: Record<string, unknown> = { ...existingProgress };
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0 || lineages.length > MAX_OWNER_LINEAGES) {
    return { status: 'ambiguous', progressPatch: { ...progressPatch, premium_rc_reconcile_needed: 'true' } };
  }
  const active = lineages.filter((lineage) => activeLineage(lineage, nowMs));
  active.sort((a, b) => {
    const lifetimeA = a.plan === 'lifetime' ? 1 : 0;
    const lifetimeB = b.plan === 'lifetime' ? 1 : 0;
    if (lifetimeA !== lifetimeB) return lifetimeB - lifetimeA;
    const expiryA = a.activeThroughMs ?? Number.MAX_SAFE_INTEGER;
    const expiryB = b.activeThroughMs ?? Number.MAX_SAFE_INTEGER;
    if (expiryA !== expiryB) return expiryB - expiryA;
    const planRank = (plan: PremiumPlan) => plan === 'yearly' ? 2 : plan === 'monthly' ? 1 : 3;
    if (planRank(a.plan) !== planRank(b.plan)) return planRank(b.plan) - planRank(a.plan);
    return a.lineageHash.localeCompare(b.lineageHash);
  });
  const winner = active[0];
  if (winner) {
    const adminMigration = legacyAdminMigrationPatch(existingProgress, nowMs);
    return {
      status: 'project',
      winnerLineageHash: winner.lineageHash,
      progressPatch: {
        ...progressPatch,
        ...adminMigration,
        premium_plan: winner.plan,
        premium_expiry: '0',
        premium_rc_expiry_ms: winner.plan === 'lifetime' ? '0' : String(winner.activeThroughMs),
        had_premium_ever: '1',
        premium_rc_product_id: winner.productId,
        premium_rc_store: winner.store,
        premium_rc_environment: winner.environment,
        premium_rc_event_type: winner.lastEventType,
        premium_rc_active_lineage: winner.lineageHash,
        premium_rc_reconcile_needed: 'false',
      },
    };
  }
  const legacyPlan = String(existingProgress.premium_plan ?? '').trim().toLowerCase();
  const looksLikeLegacyRc = legacyPlan === 'monthly' || legacyPlan === 'yearly'
    || legacyPlan === 'lifetime';
  const hasCanonicalAccessEvidence = lineages.some((lineage) => (
    (Number.isSafeInteger(lineage.lastAccessEventTimeMs) && lineage.lastAccessEventTimeMs > 0)
    || (Number.isSafeInteger(lineage.lastGrantEventTimeMs) && lineage.lastGrantEventTimeMs > 0)
  ));
  if (looksLikeLegacyRc && lineages.length > 0 && !hasCanonicalAccessEvidence) {
    return { status: 'ambiguous', progressPatch: { ...progressPatch, premium_rc_reconcile_needed: 'true' } };
  }
  if (looksLikeLegacyRc && !hasLegacyRevenueCatProvenance(existingProgress)) {
    return { status: 'ambiguous', progressPatch: { ...progressPatch, premium_rc_reconcile_needed: 'true' } };
  }
  if (looksLikeLegacyRc) {
    progressPatch.premium_plan = '';
    progressPatch.premium_expiry = String(nowMs);
  }
  progressPatch.premium_rc_active_lineage = '';
  progressPatch.premium_rc_reconcile_needed = 'false';
  return { status: 'project', progressPatch };
}
