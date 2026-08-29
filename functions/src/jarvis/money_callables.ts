import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission, type AdminPermission } from '../admin/permissions';
import { hasAdminRole, type AdminRole } from '../admin/roles';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { fetchMoneySource } from './money_firestore_fetcher';
import { buildMoneySnapshot, type MoneyFetcherMap } from './money_snapshot';

/**
 * Callable для департамента «Деньги» — панель в admin/v2/legacy.html.
 *
 * зачем: money.read — своя, более узкая роль, чем diagnostics.read у
 * «Качества» (owner/admin/analyst, не support) — деньги чувствительнее
 * жалоб на баги, поэтому не даём её той же широкой аудитории.
 */

const REGION = 'us-central1';
const REQUIRED_PERMISSION: AdminPermission = 'money.read';
const MAX_QUESTION_LEN = 300;

const OPTIONS = Object.freeze({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 20,
  memory: '256MiB' as const,
});

interface CallableRequest {
  readonly auth?: { readonly uid?: string; readonly token?: Record<string, unknown> } | null;
  readonly data?: unknown;
}

function requireMoneyRead(request: CallableRequest): void {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const claimedRole = request.auth.token.adminRole;
  if (!hasAdminRole(claimedRole)) throw new HttpsError('permission-denied', 'Valid adminRole required');
  const role: AdminRole = claimedRole;
  if (!hasPermission(role, REQUIRED_PERMISSION)) {
    throw new HttpsError('permission-denied', `Role cannot use ${REQUIRED_PERMISSION}`);
  }
}

function parseQuestion(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const question = (data as Record<string, unknown>).question;
  return typeof question === 'string' && question.trim() ? question.trim().slice(0, MAX_QUESTION_LEN) : undefined;
}

function firestoreFetchers(): MoneyFetcherMap {
  const db = admin.firestore();
  const nowMs = Date.now();
  return {
    revenuecat_premium_events: () => fetchMoneySource({ sourceId: 'revenuecat_premium_events', collection: db.collection('revenuecat_premium_events'), nowMs }),
    voice_minute_events: () => fetchMoneySource({ sourceId: 'voice_minute_events', collection: db.collection('voice_minute_events'), nowMs }),
    paywall_funnel: () => fetchMoneySource({ sourceId: 'paywall_funnel', collection: db.collection('paywall_funnel'), nowMs }),
    economy_daily_stats: () => fetchMoneySource({ sourceId: 'economy_daily_stats', collection: db.collection('economy_daily_stats'), nowMs }),
    external_economy_events: () => fetchMoneySource({ sourceId: 'external_economy_events', collection: db.collectionGroup('external_economy_events'), nowMs }),
  };
}

export const jarvisGetMoneySnapshot = onCall(OPTIONS, async (request: CallableRequest) => {
  requireMoneyRead(request);
  const question = parseQuestion(request.data);
  const snapshot = await buildMoneySnapshot({
    fetchers: firestoreFetchers(),
    trigger: 'owner_request',
    question,
    nowMs: Date.now(),
  });
  return { ok: true, generatedAtMs: snapshot.generatedAtMs, decisions: snapshot.decisions };
});
