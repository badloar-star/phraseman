export const ANALYTICS_DEFINITION_VERSION = 'admin_v2_trustworthy_v1';
export const REVENUECAT_GRACE_MS = 72 * 60 * 60 * 1000;

export type AccessKind =
  | 'store_trial'
  | 'store_subscription'
  | 'store_lifetime'
  | 'gift'
  | 'admin_grant'
  | 'vip'
  | 'manual_or_unknown';

export interface AnalyticsUserRow {
  readonly id: string;
  readonly identityHidden?: boolean;
  readonly analyticsConsent?: unknown;
  readonly progress?: Record<string, unknown> | null;
}

export interface ClassifiedAccess {
  readonly kind: AccessKind;
  readonly storeBacked: boolean;
  readonly activeTrial: boolean;
}

export interface RevenueCatEventRow {
  readonly id?: string;
  readonly eventId?: unknown;
  readonly environment?: unknown;
  readonly eventType?: unknown;
  readonly periodType?: unknown;
}

export interface ShardTransactionRow {
  readonly id?: string;
  readonly eventId?: unknown;
  readonly transactionId?: unknown;
  readonly environment?: unknown;
}

export interface FunnelEventRow {
  readonly step?: unknown;
  readonly dev?: unknown;
}

export type FunnelIntegrityStatus = 'ready' | 'blocked' | 'unavailable';
export type FunnelIntegrityReason = 'aggregate_series_mismatch' | 'source_unavailable' | null;

export interface FunnelIntegrityInput {
  readonly aggregate: {
    readonly shown: number;
    readonly ctaClick: number;
    readonly trialStarted: number;
    readonly purchaseCompleted: number;
  };
  readonly series: {
    readonly shown: number | null;
    readonly ctaClick: number | null;
    readonly trialStarted: number | null;
    readonly purchaseCompleted: number | null;
  };
  readonly sourceState: string;
}

export interface FunnelIntegrityResult {
  readonly status: FunnelIntegrityStatus;
  readonly reason: FunnelIntegrityReason;
  readonly aggregateTotal: number;
  readonly seriesTotal: number | null;
}

export type PurchaseSignalReconciliationStatus = 'observational' | 'unavailable';
export type PurchaseSignalReconciliationReason = 'different_coverage_and_identity' | 'source_incomplete_or_unavailable';

export interface PurchaseSignalReconciliationInput {
  readonly clientPurchaseSignals: number;
  readonly confirmedPurchaseEvents: number;
  readonly clientSourceState: string;
  readonly storeSourceState: string;
}

export interface PurchaseSignalReconciliationResult {
  readonly status: PurchaseSignalReconciliationStatus;
  readonly reason: PurchaseSignalReconciliationReason;
  readonly clientPurchaseSignals: number;
  readonly confirmedPurchaseEvents: number;
  readonly exactAttributionAvailable: false;
  readonly conversionRate: null;
}

/**
 * These sources have intentionally different coverage: client funnel signals
 * require analytics consent, while RevenueCat events are store confirmations.
 * Keep both visible for delivery diagnostics, never turn their ratio into a
 * conversion or a purchase attribution claim.
 */
export function assessPurchaseSignalReconciliation(
  input: PurchaseSignalReconciliationInput,
): PurchaseSignalReconciliationResult {
  const sourceIncomplete = ['error', 'partial', 'unavailable'].includes(input.clientSourceState)
    || ['error', 'partial', 'unavailable'].includes(input.storeSourceState);
  return {
    status: sourceIncomplete ? 'unavailable' : 'observational',
    reason: sourceIncomplete ? 'source_incomplete_or_unavailable' : 'different_coverage_and_identity',
    clientPurchaseSignals: input.clientPurchaseSignals,
    confirmedPurchaseEvents: input.confirmedPurchaseEvents,
    exactAttributionAvailable: false,
    conversionRate: null,
  };
}

/**
 * Keeps an aggregate funnel and its day-series honest. The figures are only
 * decision-ready when they describe the same non-error source window.
 */
export function assessFunnelIntegrity(input: FunnelIntegrityInput): FunnelIntegrityResult {
  const aggregateTotal = input.aggregate.shown
    + input.aggregate.ctaClick
    + input.aggregate.trialStarted
    + input.aggregate.purchaseCompleted;
  const seriesValues = [
    input.series.shown,
    input.series.ctaClick,
    input.series.trialStarted,
    input.series.purchaseCompleted,
  ];
  const sourceUnavailable = input.sourceState === 'error'
    || input.sourceState === 'partial'
    || input.sourceState === 'unavailable'
    || seriesValues.some((value) => value === null);
  if (sourceUnavailable) {
    return { status: 'unavailable', reason: 'source_unavailable', aggregateTotal, seriesTotal: null };
  }
  const seriesTotal = seriesValues.reduce<number>((sum, value) => sum + (value ?? 0), 0);
  if (aggregateTotal !== seriesTotal) {
    return { status: 'blocked', reason: 'aggregate_series_mismatch', aggregateTotal, seriesTotal };
  }
  return { status: 'ready', reason: null, aggregateTotal, seriesTotal };
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function lower(value: unknown): string {
  return text(value).toLowerCase();
}

function upper(value: unknown): string {
  return text(value).toUpperCase();
}

function millis(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  if (typeof value === 'object') {
    const timestamp = value as { toMillis?: () => number; seconds?: number };
    if (typeof timestamp.toMillis === 'function') return Math.max(0, Math.floor(timestamp.toMillis() || 0));
    if (typeof timestamp.seconds === 'number') return Math.max(0, Math.floor(timestamp.seconds * 1000));
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function trueFlag(value: unknown): boolean {
  return ['true', '1', 'yes'].includes(lower(value));
}

function falseFlag(value: unknown): boolean {
  return ['false', '0', 'no'].includes(lower(value));
}

export function aggregateAnalyticsConsent(rows: readonly AnalyticsUserRow[]): {
  observedUsers: number;
  granted: number;
  denied: number;
  unset: number;
  grantedRate: number | null;
  hiddenUsersExcluded: number;
} {
  let granted = 0;
  let denied = 0;
  let unset = 0;
  let hiddenUsersExcluded = 0;
  for (const row of rows) {
    if (row.identityHidden === true) {
      hiddenUsersExcluded += 1;
      continue;
    }
    const consent = lower(row.analyticsConsent);
    if (consent === 'granted') granted += 1;
    else if (consent === 'denied') denied += 1;
    else unset += 1;
  }
  const observedUsers = granted + denied + unset;
  return {
    observedUsers,
    granted,
    denied,
    unset,
    grantedRate: observedUsers > 0 ? granted / observedUsers : null,
    hiddenUsersExcluded,
  };
}

function activeUntil(value: unknown, nowMs: number): boolean {
  const until = millis(value);
  return until <= 0 || until > nowMs;
}

function storePlan(plan: string): boolean {
  return ['monthly', 'yearly', 'annual', 'lifetime'].includes(plan);
}

function hasRevenueCatProvenance(progress: Record<string, unknown>): boolean {
  return Boolean(
    text(progress.premium_rc_product_id)
    || text(progress.premium_rc_store)
    || millis(progress.premium_rc_updated_at)
    || millis(progress.premium_rc_purchased_at_ms)
    || millis(progress.premium_rc_expiry_ms),
  );
}

function storeActive(progress: Record<string, unknown>, plan: string, nowMs: number): boolean {
  if (!storePlan(plan) || !hasRevenueCatProvenance(progress)) return false;
  const expiry = millis(progress.premium_expiry);
  if (expiry > 0) return expiry > nowMs;
  if (plan === 'lifetime') return true;
  const rcExpiry = millis(progress.premium_rc_expiry_ms);
  return rcExpiry > 0 && rcExpiry + REVENUECAT_GRACE_MS >= nowMs;
}

function giftActive(progress: Record<string, unknown>, nowMs: number): boolean {
  return millis(progress.intro_access_until_ms) > nowMs
    || millis(progress.loyalty_gift_until_ms) > nowMs;
}

function adminGrantActive(progress: Record<string, unknown>, plan: string, nowMs: number): boolean {
  const override = lower(progress.admin_premium_override);
  const grant = override === 'true' || (plan === 'admin_grant' && override !== 'false');
  return grant && Boolean(plan) && activeUntil(progress.premium_expiry, nowMs);
}

function vipActive(progress: Record<string, unknown>, nowMs: number): boolean {
  const plan = lower(progress.vip_plan);
  const active = trueFlag(progress.vip_active);
  const override = text(progress.vip_admin_override);
  const from = millis(progress.vip_from);
  const until = millis(progress.vip_until ?? progress.vip_expiry);
  const hasShape = Boolean(
    plan || active || override || from || until
    || text(progress.vip_admin_grant_at ?? progress.vip_grant_at),
  );
  if (!hasShape || falseFlag(progress.vip_active) || falseFlag(progress.vip_admin_override)) return false;
  if (!(active || trueFlag(progress.vip_admin_override) || plan)) return false;
  return (from <= 0 || from <= nowMs) && (until <= 0 || until > nowMs);
}

function manualAccessActive(progress: Record<string, unknown>, plan: string, nowMs: number): boolean {
  if (!plan || plan === 'null' || plan === 'undefined' || plan === 'admin_grant') return false;
  if (hasRevenueCatProvenance(progress)) return false;
  return activeUntil(progress.premium_expiry, nowMs);
}

export function classifyActiveAccess(row: AnalyticsUserRow, nowMs: number = Date.now()): ClassifiedAccess | null {
  if (row.identityHidden === true) return null;
  const progress = row.progress ?? {};
  const plan = lower(progress.premium_plan);

  if (storeActive(progress, plan, nowMs)) {
    if (upper(progress.premium_rc_period_type) === 'TRIAL') {
      return { kind: 'store_trial', storeBacked: true, activeTrial: true };
    }
    if (plan === 'lifetime') return { kind: 'store_lifetime', storeBacked: true, activeTrial: false };
    return { kind: 'store_subscription', storeBacked: true, activeTrial: false };
  }
  if (giftActive(progress, nowMs)) return { kind: 'gift', storeBacked: false, activeTrial: false };
  if (adminGrantActive(progress, plan, nowMs)) return { kind: 'admin_grant', storeBacked: false, activeTrial: false };
  if (vipActive(progress, nowMs)) return { kind: 'vip', storeBacked: false, activeTrial: false };
  if (manualAccessActive(progress, plan, nowMs)) return { kind: 'manual_or_unknown', storeBacked: false, activeTrial: false };
  return null;
}

export function aggregateActiveAccess(rows: readonly AnalyticsUserRow[], nowMs: number = Date.now()): {
  activeAccessTotal: number;
  storeBackedTotal: number;
  activeTrials: number;
  scannedUsers: number;
  hiddenUsersExcluded: number;
  byKind: Record<AccessKind, number>;
} {
  const byKind: Record<AccessKind, number> = {
    store_trial: 0,
    store_subscription: 0,
    store_lifetime: 0,
    gift: 0,
    admin_grant: 0,
    vip: 0,
    manual_or_unknown: 0,
  };
  let hiddenUsersExcluded = 0;
  for (const row of rows) {
    if (row.identityHidden === true) hiddenUsersExcluded += 1;
    const classified = classifyActiveAccess(row, nowMs);
    if (classified) byKind[classified.kind] += 1;
  }
  const activeAccessTotal = Object.values(byKind).reduce((sum, count) => sum + count, 0);
  return {
    activeAccessTotal,
    storeBackedTotal: byKind.store_trial + byKind.store_subscription + byKind.store_lifetime,
    activeTrials: byKind.store_trial,
    scannedUsers: rows.length,
    hiddenUsersExcluded,
    byKind,
  };
}

function eventIdentity(row: { id?: string; eventId?: unknown; transactionId?: unknown }, fallback: number): string {
  return text(row.eventId) || text(row.id) || text(row.transactionId) || `row:${fallback}`;
}

function productionEnvironment(value: unknown): 'production' | 'sandbox' | 'unknown' {
  const environment = upper(value);
  if (environment === 'PRODUCTION') return 'production';
  if (environment === 'SANDBOX') return 'sandbox';
  return 'unknown';
}

export function aggregateRevenueCatPeriod(rows: readonly RevenueCatEventRow[]): {
  productionEvents: number;
  newPurchases: number;
  initialSubscriptionEvents: number;
  nonRenewingPurchaseEvents: number;
  renewals: number;
  trialStarts: number;
  refunds: number;
  trialLifecycleEvents: number;
  byType: Record<string, number>;
  excluded: { sandbox: number; unknownEnvironment: number; duplicates: number };
} {
  const seen = new Set<string>();
  const byType: Record<string, number> = {};
  const excluded = { sandbox: 0, unknownEnvironment: 0, duplicates: 0 };
  let productionEvents = 0;
  let newPurchases = 0;
  let initialSubscriptionEvents = 0;
  let nonRenewingPurchaseEvents = 0;
  let renewals = 0;
  let trialStarts = 0;
  let refunds = 0;
  let trialLifecycleEvents = 0;
  rows.forEach((row, index) => {
    const id = eventIdentity(row, index);
    if (seen.has(id)) { excluded.duplicates += 1; return; }
    seen.add(id);
    const environment = productionEnvironment(row.environment);
    if (environment === 'sandbox') { excluded.sandbox += 1; return; }
    if (environment === 'unknown') { excluded.unknownEnvironment += 1; return; }
    productionEvents += 1;
    const eventType = upper(row.eventType) || 'UNKNOWN';
    const periodType = upper(row.periodType);
    byType[eventType] = (byType[eventType] ?? 0) + 1;
    if (eventType === 'INITIAL_PURCHASE') initialSubscriptionEvents += 1;
    if (eventType === 'NON_RENEWING_PURCHASE') nonRenewingPurchaseEvents += 1;
    if (eventType === 'INITIAL_PURCHASE' || eventType === 'NON_RENEWING_PURCHASE') newPurchases += 1;
    if (eventType === 'RENEWAL') renewals += 1;
    if (eventType === 'REFUND') refunds += 1;
    if (periodType === 'TRIAL') trialLifecycleEvents += 1;
    if (eventType === 'INITIAL_PURCHASE' && periodType === 'TRIAL') trialStarts += 1;
  });
  return {
    productionEvents,
    newPurchases,
    initialSubscriptionEvents,
    nonRenewingPurchaseEvents,
    renewals,
    trialStarts,
    refunds,
    trialLifecycleEvents,
    byType,
    excluded,
  };
}

export function aggregateShardPeriod(rows: readonly ShardTransactionRow[]): {
  productionPurchases: number;
  excluded: { sandbox: number; unknownEnvironment: number; duplicates: number };
} {
  const seen = new Set<string>();
  const excluded = { sandbox: 0, unknownEnvironment: 0, duplicates: 0 };
  let productionPurchases = 0;
  rows.forEach((row, index) => {
    const id = eventIdentity(row, index);
    if (seen.has(id)) { excluded.duplicates += 1; return; }
    seen.add(id);
    const environment = productionEnvironment(row.environment);
    if (environment === 'production') productionPurchases += 1;
    else if (environment === 'sandbox') excluded.sandbox += 1;
    else excluded.unknownEnvironment += 1;
  });
  return { productionPurchases, excluded };
}

export function aggregateFunnelSignals(rows: readonly FunnelEventRow[]): {
  totalEvents: number;
  events: { shown: number; ctaClick: number; trialStarted: number; purchaseCompleted: number; close: number; purchaseCancelled: number };
  purchaseSignalRate: number | null;
  excludedDevEvents: number;
} {
  const events = { shown: 0, ctaClick: 0, trialStarted: 0, purchaseCompleted: 0, close: 0, purchaseCancelled: 0 };
  let excludedDevEvents = 0;
  for (const row of rows) {
    if (row.dev === true) { excludedDevEvents += 1; continue; }
    const step = lower(row.step);
    if (step === 'shown') events.shown += 1;
    else if (step === 'cta_click') events.ctaClick += 1;
    else if (step === 'trial_started') events.trialStarted += 1;
    else if (step === 'purchase_completed') events.purchaseCompleted += 1;
    else if (step === 'close') events.close += 1;
    else if (step === 'purchase_cancelled') events.purchaseCancelled += 1;
  }
  const totalEvents = Object.values(events).reduce((sum, count) => sum + count, 0);
  return {
    totalEvents,
    events,
    purchaseSignalRate: events.shown > 0 ? events.purchaseCompleted / events.shown : null,
    excludedDevEvents,
  };
}
