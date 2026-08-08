import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission, type AdminPermission } from '../admin/permissions';
import { hasAdminRole, type AdminRole } from '../admin/roles';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { fetchQualitySource } from './quality_firestore_fetcher';
import { buildQualitySnapshot, type QualityFetcherMap } from './quality_snapshot';

/**
 * Callable Р2: панель в admin/v2/legacy.html читает департамент «Качество».
 *
 * зачем: владелец решил 2026-08-01 не заводить отдельную роль владельца на
 * этом шаге (approve/reject ещё не реализованы) — та же диагностика,
 * которую сейчас видит admin_reports_center.ts под diagnostics.read.
 * Каждый вызов панели — trigger: 'owner_request', никогда 'scheduled':
 * панель не заменяет суточный планировщик, только показывает по требованию.
 */

const REGION = 'us-central1';
const REQUIRED_PERMISSION: AdminPermission = 'diagnostics.read';
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

function requireDiagnosticsRead(request: CallableRequest): void {
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

function firestoreFetchers(): QualityFetcherMap {
  const db = admin.firestore();
  const nowMs = Date.now();
  return {
    error_reports: () => fetchQualitySource({ sourceId: 'error_reports', collection: db.collection('error_reports'), nowMs }),
    user_reports: () => fetchQualitySource({ sourceId: 'user_reports', collection: db.collection('user_reports'), nowMs }),
    app_errors: () => fetchQualitySource({ sourceId: 'app_errors', collection: db.collection('app_errors'), nowMs }),
  };
}

export const jarvisGetQualitySnapshot = onCall(OPTIONS, async (request: CallableRequest) => {
  requireDiagnosticsRead(request);
  const question = parseQuestion(request.data);
  const snapshot = await buildQualitySnapshot({
    fetchers: firestoreFetchers(),
    trigger: 'owner_request',
    question,
    nowMs: Date.now(),
  });
  return { ok: true, generatedAtMs: snapshot.generatedAtMs, decisions: snapshot.decisions };
});
