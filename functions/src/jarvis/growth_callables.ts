import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission, type AdminPermission } from '../admin/permissions';
import { hasAdminRole, type AdminRole } from '../admin/roles';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { GROWTH_DAILY_COLLECTION } from '../growth_daily_aggregate';
import { fetchGrowthSource } from './growth_firestore_fetcher';
import { buildGrowthSnapshot, type GrowthFetcherMap } from './growth_snapshot';

/**
 * Callable для департамента «Рост» — панель в admin/v2/legacy.html.
 * users.read — та же роль, что уже открывает профили пользователей.
 */

const REGION = 'us-central1';
const REQUIRED_PERMISSION: AdminPermission = 'users.read';
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

function requireUsersRead(request: CallableRequest): void {
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

function firestoreFetchers(): GrowthFetcherMap {
  const db = admin.firestore();
  const nowMs = Date.now();
  return {
    users: () => fetchGrowthSource({
      sourceId: 'users',
      collection: db.collection('users'),
      dailyCollection: db.collection(GROWTH_DAILY_COLLECTION),
      nowMs,
    }),
  };
}

export const jarvisGetGrowthSnapshot = onCall(OPTIONS, async (request: CallableRequest) => {
  requireUsersRead(request);
  const question = parseQuestion(request.data);
  const snapshot = await buildGrowthSnapshot({
    fetchers: firestoreFetchers(),
    trigger: 'owner_request',
    question,
    nowMs: Date.now(),
  });
  return { ok: true, generatedAtMs: snapshot.generatedAtMs, decisions: snapshot.decisions };
});
