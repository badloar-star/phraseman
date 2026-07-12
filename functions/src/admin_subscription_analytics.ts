import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasClaimedPermission } from './admin/permissions';
import {
  aggregateSubscriptionAnalytics,
  type SubscriptionAnalyticsRow,
} from './admin_subscription_analytics_core';

const REGION = 'us-central1';
const PAGE_SIZE = 500;
const DOCUMENT_CAP = 5000;
const SUPPORTED_DAYS = new Set([7, 28, 90]);
const SUPPORTED_STORES = new Set(['APP_STORE', 'PLAY_STORE', 'STRIPE', 'AMAZON', 'PROMOTIONAL']);

export function clampSubscriptionAnalyticsDays(value: unknown): number {
  const parsed = Math.round(Number(value));
  return SUPPORTED_DAYS.has(parsed) ? parsed : 28;
}

export function normalizeSubscriptionStore(value: unknown): string {
  const store = String(value ?? '').trim().toUpperCase();
  return SUPPORTED_STORES.has(store) ? store : 'all';
}

function normalizeProductId(value: unknown): string {
  return String(value ?? '').trim().slice(0, 120);
}

function firestoreTimestampMs(value: unknown): number | null {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis(): number }).toMillis();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

export const adminSubscriptionAnalytics = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 60,
  memory: '512MiB',
}, async (request) => {
  if (!hasClaimedPermission(request.auth?.token, 'money.read')) {
    throw new HttpsError('permission-denied', 'money.read permission required');
  }

  const rangeDays = clampSubscriptionAnalyticsDays(request.data?.rangeDays);
  const store = normalizeSubscriptionStore(request.data?.store);
  const productId = normalizeProductId(request.data?.productId);
  const fromMs = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
  const rows: SubscriptionAnalyticsRow[] = [];
  let cursor: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let reachedCap = false;

  while (rows.length < DOCUMENT_CAP) {
    let query: FirebaseFirestore.Query = admin.firestore()
      .collection('revenuecat_premium_events')
      .orderBy('createdAt', 'desc')
      .limit(Math.min(PAGE_SIZE, DOCUMENT_CAP - rows.length));
    if (cursor) query = query.startAfter(cursor);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    rows.push(...snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        eventId: doc.id,
        ...data,
        createdAtMs: firestoreTimestampMs(data.createdAt),
      };
    }));
    cursor = snapshot.docs[snapshot.docs.length - 1];
    if (snapshot.size < PAGE_SIZE) break;
    if (rows.length >= DOCUMENT_CAP) reachedCap = true;
  }

  const filtered = rows.filter((row) => {
    if (store !== 'all' && String(row.store ?? '').toUpperCase() !== store) return false;
    if (productId && String(row.productId ?? '') !== productId) return false;
    return true;
  });
  const metrics = aggregateSubscriptionAnalytics(filtered, reachedCap, { fromMs });

  return {
    cohortDefinition: 'revenuecat_production_webhook_events',
    rangeDays,
    store,
    productId: productId || 'all',
    metrics,
    limitations: [
      'reasons_available_for_new_webhook_events_only',
      'historical_cancel_reason_not_stored',
      'historical_expiration_reason_not_stored',
      'no_screen_subscription_join',
      'cancellation_is_not_entitlement_end',
    ],
    generatedAtMs: Date.now(),
    dataThroughMs: metrics.dataThroughMs,
  };
});
