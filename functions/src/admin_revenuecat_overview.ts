import { defineSecret } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
const CACHE_TTL_MS = 60_000;
const REQUEST_TIMEOUT_MS = 8_000;

export const REVENUECAT_PROJECT_ID = 'proj6af7e8d5';
const REVENUECAT_OVERVIEW_URL =
  `https://api.revenuecat.com/v2/projects/${REVENUECAT_PROJECT_ID}/metrics/overview`;
const REVENUECAT_SECRET_API_KEY = defineSecret('REVENUECAT_SECRET_API_KEY');

interface RevenueCatMoneyMetric {
  readonly value: number;
  readonly currency: 'USD';
  readonly period: string;
}

export interface RevenueCatOverviewMetrics {
  readonly activeSubscriptions: number;
  readonly activeTrials: number;
  readonly mrr: RevenueCatMoneyMetric | null;
  readonly revenue: RevenueCatMoneyMetric | null;
}

export interface AdminRevenueCatOverviewResponse extends RevenueCatOverviewMetrics {
  readonly ok: true;
  readonly source: 'revenuecat_api_v2';
  readonly projectId: typeof REVENUECAT_PROJECT_ID;
  readonly fetchedAtMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function metricRows(payload: unknown): readonly Record<string, unknown>[] {
  if (!isRecord(payload) || !Array.isArray(payload.metrics)) return [];
  return payload.metrics.filter(isRecord);
}

function findMetric(rows: readonly Record<string, unknown>[], id: string): Record<string, unknown> | null {
  return rows.find((row) => row.id === id) ?? null;
}

function countMetric(rows: readonly Record<string, unknown>[], id: string, unavailableMessage: string): number {
  const value = Number(findMetric(rows, id)?.value);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(unavailableMessage);
  return value;
}

function moneyMetric(rows: readonly Record<string, unknown>[], id: string): RevenueCatMoneyMetric | null {
  const row = findMetric(rows, id);
  if (!row) return null;
  const value = Number(row.value);
  if (!Number.isFinite(value) || value < 0) return null;
  return {
    value,
    currency: 'USD',
    period: typeof row.period === 'string' ? row.period : '',
  };
}

export function parseRevenueCatOverview(payload: unknown): RevenueCatOverviewMetrics {
  const rows = metricRows(payload);
  return {
    activeSubscriptions: countMetric(
      rows,
      'active_subscriptions',
      'RevenueCat active subscription metric is unavailable',
    ),
    activeTrials: countMetric(rows, 'active_trials', 'RevenueCat active trial metric is unavailable'),
    mrr: moneyMetric(rows, 'mrr'),
    revenue: moneyMetric(rows, 'revenue'),
  };
}

function resolveRole(token: Record<string, unknown>): AdminRole | null {
  return hasAdminRole(token.adminRole) ? token.adminRole : null;
}

let cached: AdminRevenueCatOverviewResponse | null = null;

async function loadRevenueCatOverview(): Promise<AdminRevenueCatOverviewResponse> {
  const now = Date.now();
  if (cached && now - cached.fetchedAtMs < CACHE_TTL_MS) return cached;

  let response: Response;
  try {
    response = await fetch(REVENUECAT_OVERVIEW_URL, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY.value()}`,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new HttpsError('unavailable', 'RevenueCat metrics are temporarily unavailable');
  }

  if (!response.ok) {
    console.warn('RevenueCat overview request failed', { status: response.status });
    throw new HttpsError('unavailable', 'RevenueCat metrics are temporarily unavailable');
  }

  try {
    const metrics = parseRevenueCatOverview(await response.json());
    cached = {
      ok: true,
      source: 'revenuecat_api_v2',
      projectId: REVENUECAT_PROJECT_ID,
      fetchedAtMs: now,
      ...metrics,
    };
    return cached;
  } catch {
    throw new HttpsError('unavailable', 'RevenueCat metrics are temporarily unavailable');
  }
}

export const adminGetRevenueCatOverviewMetrics = onCall(
  {
    region: REGION,
    enforceAppCheck: ENFORCE_APP_CHECK,
    secrets: [REVENUECAT_SECRET_API_KEY],
    timeoutSeconds: 15,
    memory: '256MiB',
  },
  async (request): Promise<AdminRevenueCatOverviewResponse> => {
    if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
    const role = resolveRole(request.auth.token as Record<string, unknown>);
    if (!role || !hasPermission(role, 'money.read')) {
      throw new HttpsError('permission-denied', 'Role cannot read RevenueCat metrics');
    }
    return loadRevenueCatOverview();
  },
);
