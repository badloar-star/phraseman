import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission, type AdminPermission } from '../admin/permissions';
import { hasAdminRole, type AdminRole } from '../admin/roles';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { listPlans, setPlanStatus, deletePlan } from './jarvis_plans_store';
import type { JarvisPlanLifecycleStatus } from './jarvis_plans';

/**
 * Раздел «Планы» (владелец 2026-08-04): постоянный список находок Джарвиса
 * в админке, отдельно от Telegram. Те же права, что у остальных
 * jarvis-callables — доступ к своду не должен быть шире панели.
 */

const REGION = 'us-central1';
const REQUIRED_PERMISSIONS: readonly AdminPermission[] = ['diagnostics.read', 'money.read', 'users.read'];
const MAX_ID_LEN = 200;

export const PLAN_LIFECYCLE_STATUSES: readonly JarvisPlanLifecycleStatus[] = ['open', 'resolved', 'archived'];

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

function requirePlansAccess(request: CallableRequest): void {
  if (request.auth?.token?.admin !== true || !String(request.auth.uid ?? '').trim()) {
    throw new HttpsError('permission-denied', 'Admin only');
  }
  const claimedRole = request.auth.token.adminRole;
  if (!hasAdminRole(claimedRole)) throw new HttpsError('permission-denied', 'Valid adminRole required');
  const role: AdminRole = claimedRole;
  const missing = REQUIRED_PERMISSIONS.find((permission) => !hasPermission(role, permission));
  if (missing) throw new HttpsError('permission-denied', `Role cannot use ${missing}`);
}

export function parsePlanId(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const id = (data as Record<string, unknown>).id;
  return typeof id === 'string' && id.trim() ? id.trim().slice(0, MAX_ID_LEN) : null;
}

function isPlanStatus(value: unknown): value is JarvisPlanLifecycleStatus {
  return typeof value === 'string' && (PLAN_LIFECYCLE_STATUSES as readonly string[]).includes(value);
}

export interface PlanStatusUpdate {
  readonly id: string;
  readonly status: JarvisPlanLifecycleStatus;
}

/** Никогда не подставляет дефолт на неверный статус — отклоняет целиком. */
export function parsePlanStatusUpdate(data: unknown): PlanStatusUpdate | null {
  const id = parsePlanId(data);
  if (!id) return null;
  const status = (data as Record<string, unknown> | null)?.status;
  if (!isPlanStatus(status)) return null;
  return Object.freeze({ id, status });
}

/** Список планов для раздела «Планы» в админке. */
export const jarvisGetPlans = onCall(OPTIONS, async (request: CallableRequest) => {
  requirePlansAccess(request);
  const db = admin.firestore();
  const plans = await listPlans({ db });
  return { ok: true, plans };
});

/** Владелец меняет статус (resolved/archived/open) вручную. */
export const jarvisSetPlanStatus = onCall(OPTIONS, async (request: CallableRequest) => {
  requirePlansAccess(request);
  const update = parsePlanStatusUpdate(request.data);
  if (!update) throw new HttpsError('invalid-argument', 'id and a valid status are required');
  await setPlanStatus({ db: admin.firestore(), id: update.id, status: update.status, nowMs: Date.now() });
  return { ok: true };
});

/** Владелец удаляет план навсегда — например, ошибочную или неактуальную находку. */
export const jarvisDeletePlan = onCall(OPTIONS, async (request: CallableRequest) => {
  requirePlansAccess(request);
  const id = parsePlanId(request.data);
  if (!id) throw new HttpsError('invalid-argument', 'id is required');
  await deletePlan({ db: admin.firestore(), id });
  return { ok: true };
});
